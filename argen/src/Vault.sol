// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {IERC20} from "openzeppelin-contracts/contracts/token/ERC20/IERC20.sol";
import {IERC721} from "openzeppelin-contracts/contracts/token/ERC721/IERC721.sol";
import {IPancakeRouter} from "./interfaces/IPancakeRouter.sol";

contract Vault {
    IERC20 public immutable usdc;
    IERC20 public immutable brgnToken;
    IERC721 public immutable eip8004Nft;
    IPancakeRouter public immutable dexRouter;

    uint256 public constant LIQUIDATION_THRESHOLD = 70; // 70% threshold
    uint256 public constant MAX_LTV = 60; // 60% max LTV
    uint256 public constant AGENT_REWARD_BPS = 100; // 1% of liquidated collateral
    uint256 public constant REQUIRED_AGENT_STAKE = 1_000_000 * 10**18; // 1M BRGN

    struct Position {
        uint256 collateralAmount;
        uint256 borrowedUsdc;
        address collateralToken;
        uint256 lastUpdateTimestamp;
    }

    // borrower address => collateral token address => Position
    mapping(address => mapping(address => Position)) public positions;
    
    event Deposited(address indexed user, address indexed collateralToken, uint256 amount);
    event Borrowed(address indexed user, address indexed collateralToken, uint256 usdcAmount);
    event Repaid(address indexed user, address indexed collateralToken, uint256 usdcAmount);
    event Liquidated(address indexed borrower, address indexed collateralToken, uint256 collateralSold, uint256 usdcRecovered, address indexed liquidator);

    constructor(
        address _usdc,
        address _brgnToken,
        address _eip8004Nft,
        address _dexRouter
    ) {
        usdc = IERC20(_usdc);
        brgnToken = IERC20(_brgnToken);
        eip8004Nft = IERC721(_eip8004Nft);
        dexRouter = IPancakeRouter(_dexRouter);
    }

    modifier onlyValidAgent() {
        require(eip8004Nft.balanceOf(msg.sender) > 0, "Agent lacks EIP-8004 NFT");
        require(brgnToken.balanceOf(msg.sender) >= REQUIRED_AGENT_STAKE, "Agent lacks BRGN stake");
        _;
    }

    /**
     * @dev User deposits memecoin collateral.
     */
    function depositCollateral(address collateralToken, uint256 amount) external {
        require(amount > 0, "Zero deposit");
        IERC20(collateralToken).transferFrom(msg.sender, address(this), amount);
        
        Position storage pos = positions[msg.sender][collateralToken];
        pos.collateralAmount += amount;
        pos.collateralToken = collateralToken;
        pos.lastUpdateTimestamp = block.timestamp;
        
        emit Deposited(msg.sender, collateralToken, amount);
    }

    /**
     * @dev User borrows USDC against their deposited collateral.
     * Note: In a full production setup, this requires an oracle (or ZK Proof) to verify 
     * the price meets the 50-60% LTV requirement. 
     */
    function borrow(address collateralToken, uint256 usdcAmount) external {
        Position storage pos = positions[msg.sender][collateralToken];
        require(pos.collateralAmount > 0, "No collateral");
        
        // Oracle LTV check would go here. For hackathon scope, we mock/assume it's checked offchain via ZK or simple oracle mapping
        pos.borrowedUsdc += usdcAmount;
        usdc.transfer(msg.sender, usdcAmount);
        
        emit Borrowed(msg.sender, collateralToken, usdcAmount);
    }

    /**
     * @dev Traditional repay function where borrower supplies USDC to close debt.
     */
    function repay(address collateralToken, uint256 usdcAmount) external {
        Position storage pos = positions[msg.sender][collateralToken];
        require(pos.borrowedUsdc >= usdcAmount, "Over-repay");
        
        usdc.transferFrom(msg.sender, address(this), usdcAmount);
        pos.borrowedUsdc -= usdcAmount;
        
        emit Repaid(msg.sender, collateralToken, usdcAmount);
    }

    /**
     * @dev Liquidator agent triggers this when LTV drops below 70% threshold.
     * Uses atomic DEX swap to sell collateral -> USDC, repays debt, pays agent 1%, refunds remaining.
     */
    function liquidate(
        address borrower,
        address collateralToken,
        uint256 amountOutMinUsdc // Slippage protection provided by the agent
    ) external onlyValidAgent {
        Position storage pos = positions[borrower][collateralToken];
        require(pos.borrowedUsdc > 0, "No debt");

        // Here an oracle/ZK verification should assert the health factor is < 70%.
        
        uint256 collateralToLiquidate = pos.collateralAmount;
        uint256 debtToRecover = pos.borrowedUsdc; // plus accrued interest ideally

        // Reset position manually before external calls to prevent reentrancy
        pos.collateralAmount = 0;
        pos.borrowedUsdc = 0;

        // Approve router and perform atomic swap
        IERC20(collateralToken).approve(address(dexRouter), collateralToLiquidate);

        address[] memory path = new address[](2);
        path[0] = collateralToken;
        path[1] = address(usdc);
        
        uint256[] memory amounts = dexRouter.swapExactTokensForTokens(
            collateralToLiquidate,
            amountOutMinUsdc,
            path,
            address(this),
            block.timestamp
        );

        uint256 usdcReceived = amounts[1];
        require(usdcReceived >= debtToRecover, "Bad debt: insufficient liquidity");

        // Calculate surplus and fees
        uint256 surplus = usdcReceived - debtToRecover;
        uint256 agentFee = (usdcReceived * AGENT_REWARD_BPS) / 10000;

        require(surplus >= agentFee, "Not enough surplus for agent fee");
        uint256 borrowerRefund = surplus - agentFee;

        // Transfer payouts
        usdc.transfer(msg.sender, agentFee);
        if (borrowerRefund > 0) {
            usdc.transfer(borrower, borrowerRefund);
        }

        emit Liquidated(borrower, collateralToken, collateralToLiquidate, usdcReceived, msg.sender);
    }

    /**
     * @dev Distributed liquidity mining rewards.
     * In the real protocol, this distributes BRGN tokens based on time elapsed and usage.
     */
    function claimBRGNRewards(address user) external {
        // Mock distribution logic based on emission schedule
        uint256 rewardAmount = 100 * 10**18;
        brgnToken.transfer(user, rewardAmount);
    }
}
