// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Test, console} from "forge-std/Test.sol";
import {Vault} from "../src/Vault.sol";
import {MockERC20} from "./mocks/MockERC20.sol";
import {MockERC721} from "./mocks/MockERC721.sol";
import {MockRouter} from "./mocks/MockRouter.sol";

contract VaultTest is Test {
    Vault public vault;
    MockERC20 public usdc;
    MockERC20 public brgn;
    MockERC20 public collateral;
    MockERC721 public nft;
    MockRouter public router;

    address public lender = address(0x1);
    address public borrower = address(0x2);
    address public agent = address(0x3);

    uint256 public constant INITIAL_USDC_BALANCE = 10000 * 10**6; // 10,000 USDC
    uint256 public constant INITIAL_COLLATERAL_BALANCE = 1000000 * 10**18; // 1M Memecoins

    function setUp() public {
        usdc = new MockERC20("USDC", "USDC", 6);
        brgn = new MockERC20("BRGN", "BRGN", 18);
        collateral = new MockERC20("MEME", "MEME", 18);
        nft = new MockERC721("AgentNFT", "ANFT");
        
        // Initial price ratio: 1 MEME = 0.01 USDC (100 MEME = 1 USDC)
        // Scaled by 1e18: (0.01 * 1e18) / 10**12 (matching 18 vs 6 decimals)
        // Wait, for simplicity let's assume router handles scale or use 1e18 consistently in mock
        router = new MockRouter(0.01 * 1e18); 

        vault = new Vault(
            address(usdc),
            address(brgn),
            address(nft),
            address(router)
        );

        // Fund lender
        usdc.mint(lender, INITIAL_USDC_BALANCE);
        vm.prank(lender);
        usdc.approve(address(vault), type(uint256).max);

        // Fund borrower
        collateral.mint(borrower, INITIAL_COLLATERAL_BALANCE);
        vm.prank(borrower);
        collateral.approve(address(vault), type(uint256).max);

        // Setup Agent
        nft.mint(agent);
        brgn.mint(agent, 1000000 * 10**18); // 1M BRGN stake
        vm.prank(agent);
        brgn.approve(address(vault), type(uint256).max);

        // Fund vault for rewards
        brgn.mint(address(vault), 1000000 * 10**18);

        // Warp to some time to allow immediate reward claim
        vm.warp(block.timestamp + 30 days);
    }

    function test_DepositAndWithdrawUSDC() public {
        uint256 depositAmount = 5000 * 10**6;
        
        vm.prank(lender);
        vault.depositUSDC(depositAmount);
        
        assertEq(vault.totalReservesUsdc(), depositAmount);
        assertEq(vault.lenderShares(lender), depositAmount);
        
        vm.prank(lender);
        vault.withdrawUSDC(depositAmount);
        
        assertEq(vault.totalReservesUsdc(), 0);
        assertEq(usdc.balanceOf(lender), INITIAL_USDC_BALANCE);
    }

    function test_BorrowAgainstCollateral() public {
        // Lender deposits liquidity
        vm.prank(lender);
        vault.depositUSDC(5000 * 10**6);

        // Borrower deposits collateral
        uint256 collateralAmount = 100000 * 10**18;
        vm.prank(borrower);
        vault.depositCollateral(address(collateral), collateralAmount);

        // Borrow 100 USDC (LTV should be fine)
        uint256 borrowAmount = 100 * 10**6;
        vm.prank(borrower);
        vault.borrow(address(collateral), borrowAmount);

        (uint256 posCollateral, uint256 posBorrowed,,) = vault.positions(borrower, address(collateral));
        assertEq(posCollateral, collateralAmount);
        assertEq(posBorrowed, borrowAmount);
        assertEq(usdc.balanceOf(borrower), borrowAmount);
    }

    function test_InterestAccrual() public {
        vm.prank(lender);
        vault.depositUSDC(5000 * 10**6);

        vm.prank(borrower);
        vault.depositCollateral(address(collateral), 100000 * 10**18);

        uint256 borrowAmount = 100 * 10**6;
        vm.prank(borrower);
        vault.borrow(address(collateral), borrowAmount);

        // Advance time by 1 year (31536000 seconds)
        vm.warp(block.timestamp + 31536000);

        // Repay something to trigger accrual (or check view if we had a preview function)
        // Here we'll call repay(0) or just check with another borrow
        vm.prank(borrower);
        vault.borrow(address(collateral), 0); // Trigger _accrueInterest

        (, uint256 debtAfterYear,,) = vault.positions(borrower, address(collateral));
        
        // 5% interest on 100 USDC is 5 USDC.
        assertEq(debtAfterYear, 105 * 10**6);
    }

    function test_RepayWithCollateral() public {
        vm.prank(lender);
        vault.depositUSDC(5000 * 10**6);

        uint256 collAmount = 100000 * 10**18; // 100,000 MEME
        vm.prank(borrower);
        vault.depositCollateral(address(collateral), collAmount);

        vm.prank(borrower);
        vault.borrow(address(collateral), 500 * 10**6);

        // Price is 0.01 USDC per MEME. 100,000 MEME = 1,000 USDC.
        // Debt is 500 USDC. Repay with collateral should work.
        
        vm.prank(borrower);
        collateral.approve(address(router), type(uint256).max); // Mock router needs approval to take tokens from sender (vault)
        // Wait, in Vault.sol, vault approves router. 
        
        vm.prank(borrower);
        vault.repayWithCollateral(address(collateral), 0); // No slippage protection for test

        (uint256 posColl, uint256 posDebt,,) = vault.positions(borrower, address(collateral));
        assertEq(posColl, 0);
        assertEq(posDebt, 0);
        
        // Total reserve should be back to 5000 (after lending -500 + repaying 500)
        assertEq(vault.totalReservesUsdc(), 5000 * 10**6);
        
        // Surplus: 1000 USDC worth - 500 USDC debt = 500 USDC refund.
        // Total borrower balance: 500 (initial borrow) + 500 (surplus) = 1000 USDC.
        assertEq(usdc.balanceOf(borrower), 1000 * 10**6);
    }

    function test_LiquidationFlow() public {
        vm.prank(lender);
        vault.depositUSDC(5000 * 10**6);

        uint256 collAmount = 100000 * 10**18; // 1,000 USDC value
        vm.prank(borrower);
        vault.depositCollateral(address(collateral), collAmount);

        vm.prank(borrower);
        vault.borrow(address(collateral), 600 * 10**6); // 60% LTV

        // MEME Price drops to 0.008 USDC per token. 
        // 100,000 MEME = 800 USDC value.
        // Liquidation Threshold 70% of 800 = 560 USDC. 
        // Debt (600) > 560. Position is ELIGIBLE.
        router.setPriceRatio(0.008 * 1e18);

        vm.prank(agent);
        vault.liquidate(borrower, address(collateral), 0);

        (uint256 posColl, uint256 posDebt,,) = vault.positions(borrower, address(collateral));
        assertEq(posColl, 0);
        assertEq(posDebt, 0);

        // Agent gets 1% of the liquidated collateral value.
        // Collateral value was 800 USDC. 1% is 8 USDC.
        assertEq(usdc.balanceOf(agent), 8 * 10**6);

        // Surplus: 800 (value) - 600 (debt) - 8 (fee) = 192 USDC refund.
        // Total borrower balance: 600 (from original borrow) + 192 = 792 USDC.
        assertEq(usdc.balanceOf(borrower), 792 * 10**6);
    }

    function test_RewardsCooldown() public {
        // Mock earning some rewards
        vault.updateRewards(borrower, 100 * 10**18);
        
        vm.prank(borrower);
        vault.claimBRGNRewards();
        assertEq(brgn.balanceOf(borrower), 100 * 10**18);
        uint256 firstClaimTime = block.timestamp;

        // Try to claim again immediately
        vault.updateRewards(borrower, 50 * 10**18);
        vm.expectRevert("Cooldown active");
        vm.prank(borrower);
        vault.claimBRGNRewards();

        // Advance 7 days
        vm.warp(firstClaimTime + 7 days + 1); 
        
        vm.prank(borrower);
        vault.claimBRGNRewards();
        assertEq(brgn.balanceOf(borrower), 150 * 10**18);
    }
}
