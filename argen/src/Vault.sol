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
    uint256 public constant BORROW_INTEREST_RATE_BPS = 500; // 5% APR
    uint256 public constant SECONDS_PER_YEAR = 31536000;
    uint256 public constant REWARD_COOLDOWN_PERIOD = 7 days;

    struct Position {
        uint256 collateralAmount;
        uint256 borrowedUsdc;
        address collateralToken;
        uint256 lastUpdateTimestamp;
    }

    // borrower address => collateral token address => Position
    mapping(address => mapping(address => Position)) public positions;
    
    // Lending Pool State
    mapping(address => uint256) public lenderShares;
    uint256 public totalLenderShares;
    uint256 public totalReservesUsdc;

    // Reward State
    mapping(address => uint256) public accruedBrgn;
    mapping(address => uint256) public lastRewardClaimTime;
    
    event Deposited(address indexed user, address indexed collateralToken, uint256 amount);
    event UsdcDeposited(address indexed lender, uint256 usdcAmount, uint256 shares);
    event UsdcWithdrawn(address indexed lender, uint256 usdcAmount, uint256 shares);
    event Borrowed(address indexed user, address indexed collateralToken, uint256 usdcAmount);
    event Repaid(address indexed user, address indexed collateralToken, uint256 usdcAmount);
    event Liquidated(address indexed borrower, address indexed collateralToken, uint256 collateralSold, uint256 usdcRecovered, address indexed liquidator);
    event RewardsClaimed(address indexed user, uint256 amount);

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
     * @dev Lenders deposit USDC to provide liquidity and earn 5% APR + rewards.
     */
    function depositUSDC(uint256 amount) external {
        require(amount > 0, "Zero deposit");
        usdc.transferFrom(msg.sender, address(this), amount);
        
        uint256 shares = amount; // Simple 1:1 shares for mock. In production use share price.
        lenderShares[msg.sender] += shares;
        totalLenderShares += shares;
        totalReservesUsdc += amount;
        
        emit UsdcDeposited(msg.sender, amount, shares);
    }

    /**
     * @dev Lenders withdraw their USDC.
     */
    function withdrawUSDC(uint256 shares) external {
        require(lenderShares[msg.sender] >= shares, "Insufficient shares");
        uint256 amount = shares; // Simple 1:1
        
        lenderShares[msg.sender] -= shares;
        totalLenderShares -= shares;
        totalReservesUsdc -= amount;
        
        usdc.transfer(msg.sender, amount);
        emit UsdcWithdrawn(msg.sender, amount, shares);
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
        
        // Update interest before increasing debt
        _accrueInterest(msg.sender, collateralToken);
        
        pos.borrowedUsdc += usdcAmount;
        require(totalReservesUsdc >= usdcAmount, "Insufficient pool liquidity");
        totalReservesUsdc -= usdcAmount;
        
        usdc.transfer(msg.sender, usdcAmount);
        
        emit Borrowed(msg.sender, collateralToken, usdcAmount);
    }

    /**
     * @dev Internal helper to accrue interest on a position.
     */
    function _accrueInterest(address borrower, address collateralToken) internal {
        Position storage pos = positions[borrower][collateralToken];
        if (pos.borrowedUsdc == 0) {
            pos.lastUpdateTimestamp = block.timestamp;
            return;
        }

        uint256 timeElapsed = block.timestamp - pos.lastUpdateTimestamp;
        if (timeElapsed > 0) {
            uint256 interest = (pos.borrowedUsdc * BORROW_INTEREST_RATE_BPS * timeElapsed) / (10000 * SECONDS_PER_YEAR);
            pos.borrowedUsdc += interest;
            pos.lastUpdateTimestamp = block.timestamp;
            
            // In a real protocol, interest would be added to totalReservesUsdc (earned)
            // For now, we just track the debt.
        }
    }

    /**
     * @dev Traditional repay function where borrower supplies USDC to close debt.
     */
    function repay(address collateralToken, uint256 usdcAmount) external {
        _accrueInterest(msg.sender, collateralToken);
        Position storage pos = positions[msg.sender][collateralToken];
        require(pos.borrowedUsdc >= usdcAmount, "Over-repay");
        
        usdc.transferFrom(msg.sender, address(this), usdcAmount);
        pos.borrowedUsdc -= usdcAmount;
        totalReservesUsdc += usdcAmount;
        
        emit Repaid(msg.sender, collateralToken, usdcAmount);
    }

    /**
     * @dev Repay using collateral! Atomic DEX swap to cover debt.
     * Only sells enough collateral to cover the USDC debt.
     */
    function repayWithCollateral(address collateralToken, uint256 amountInMaxCollateral) external {
        _accrueInterest(msg.sender, collateralToken);
        Position storage pos = positions[msg.sender][collateralToken];
        uint256 totalDebt = pos.borrowedUsdc;
        require(totalDebt > 0, "No debt");

        // Approve router
        IERC20(collateralToken).approve(address(dexRouter), amountInMaxCollateral);

        address[] memory path = new address[](2);
        path[0] = collateralToken;
        path[1] = address(usdc);
        
        uint256[] memory amounts = dexRouter.swapTokensForExactTokens(
            totalDebt,
            amountInMaxCollateral,
            path,
            address(this),
            block.timestamp
        );

        uint256 collateralSwapped = amounts[0];
        pos.collateralAmount -= collateralSwapped;
        pos.borrowedUsdc = 0;
        totalReservesUsdc += totalDebt;

        emit Repaid(msg.sender, collateralToken, totalDebt);
    }

    /**
     * @dev Liquidator agent triggers this when LTV drops below 70% threshold.
     * Uses swapTokensForExactTokens to sell ONLY the needed collateral -> USDC.
     */
    function liquidate(
        address borrower,
        address collateralToken,
        uint256 amountInMaxCollateral // Slippage protection: max collateral agent allows to spend
    ) external onlyValidAgent {
        _accrueInterest(borrower, collateralToken);
        Position storage pos = positions[borrower][collateralToken];
        uint256 debtToRecover = pos.borrowedUsdc;
        require(debtToRecover > 0, "No debt");

        // Calculate reward for the agent (1% of debt recovered as a fee)
        uint256 agentFee = (debtToRecover * AGENT_REWARD_BPS) / 10000;
        uint256 totalUsdcRequired = debtToRecover + agentFee;

        // Approve router and perform atomic swap for EXACT USDC amount
        IERC20(collateralToken).approve(address(dexRouter), amountInMaxCollateral);

        address[] memory path = new address[](2);
        path[0] = collateralToken;
        path[1] = address(usdc);
        
        uint256[] memory amounts = dexRouter.swapTokensForExactTokens(
            totalUsdcRequired,
            amountInMaxCollateral,
            path,
            address(this),
            block.timestamp
        );

        uint256 collateralUsed = amounts[0];
        
        // Update position: debt is cleared, collateral is reduced by amountUsed
        pos.collateralAmount -= collateralUsed;
        pos.borrowedUsdc = 0;

        totalReservesUsdc += debtToRecover;
        
        // Transfer payouts
        usdc.transfer(msg.sender, agentFee);

        emit Liquidated(borrower, collateralToken, collateralUsed, totalUsdcRequired, msg.sender);
    }

    /**
     * @dev Distributed liquidity mining rewards.
     * In the real protocol, this distributes BRGN tokens based on time elapsed and usage.
     */
    function claimBRGNRewards() external {
        require(block.timestamp >= lastRewardClaimTime[msg.sender] + REWARD_COOLDOWN_PERIOD, "Cooldown active");
        
        uint256 rewardAmount = accruedBrgn[msg.sender];
        require(rewardAmount > 0, "No rewards accrued");
        
        accruedBrgn[msg.sender] = 0;
        lastRewardClaimTime[msg.sender] = block.timestamp;
        
        brgnToken.transfer(msg.sender, rewardAmount);
        emit RewardsClaimed(msg.sender, rewardAmount);
    }

    /**
     * @dev Mock reward distribution trigger.
     * In production, this would be updated on every interact (deposit/borrow/repay).
     */
    function updateRewards(address user, uint256 amount) external {
        // This is a placeholder for the daily distribution logic
        accruedBrgn[user] += amount;
    }
}
