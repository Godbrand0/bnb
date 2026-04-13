# Argent to Brgent: Architecture Extraction & Migration Guide

This document distills the essential parts of the original **Argent (LiquidMind)** protocol on Stellar, and maps them to the requirements for building **Brgent** on the BNB Chain using the Four.Meme ecosystem.

---

## 1. Core Architecture Primitives

**Migration Strategy:**
*   **Soroban (Rust) -> EVM (Solidity)**: Smart contracts ported to Solidity for BNB Chain.
*   **Tokens**: USDC (on BNB) serves as the lending stablecoin, and Four.Meme altcoins serve as the collateral.
*   **Mechanism Redesign**: The complex Dutch Auction logic in Argent is being completely stripped out for Brgent. We are replacing it with direct DEX integrations (Market Selling) to execute liquidations instantly, fairly, and predictably.

---

## 2. Smart Contract Layer (Vault.sol)

### Lending & Borrowing
*   **Lender Functions**: `deposit(usdcAmount)`, `withdraw(usdcAmount)`. Lenders deposit USDC to the pool to receive yield and $BRGN rewards.
*   **Borrower Functions**: `deposit_collateral(memeToken, amount)`, `borrow(usdcAmount)`. 
*   **Collateral Parameters**: 
    *   **LTV (Loan To Value)**: 50% to 60%.
    *   **Liquidation Threshold**: 70%. (e.g. If $10,000 collateral drops below $7,000, it becomes eligible for liquidation).
*   **Loan Timeframes**: Implementing a timestamp mechanic when opening a borrow position so that loans have an expiration/timeframe (e.g. 30 days).

### Flexible Repayment
*   **`repay(usdcAmount)`**: Standard repayment returning USDC.
*   **`repayWithCollateral()`**: A highly requested UX feature. The contract calls the DEX Router to sell the exact amount of the borrower's locked memecoin needed to cover the USDC debt. The borrower's debt is cleared, and they keep the remaining memecoins without needing to source arbitrary USDC just to unlock their collateral.

### Instant Liquidation & the Surplus Refund
The slow Dutch Auction mechanism from Argent is **deleted**.
*   **`trigger_liquidation(positionId)`**: When an agent detects a HF (Health Factor) drop below 1.0 (70% Liquidation Threshold breached), they call this.
*   **Atomic Swap**: The Vault contract immediately calls a DEX Router (like PancakeSwap) and performs a `swapExactTokensForTokens` to dump the memecoin collateral directly into USDC.
*   **Lenders Made Whole**: The resulting USDC pays back the pool's principal and interest. 
*   **Borrower Preserved**: Because we no longer punish the borrower with total confiscation, **all remaining surplus USDC is sent back to the borrower.** 

---

## 3. ZK Proofs (Circom Circuits) & Agent Rewards

*   **HealthFactorProof**: Proves the HF dropped below 1.0 based on public DEX weights, without pushing heavy math on-chain.
*   *(REMOVED)*: `AuctionPriceProof` is deleted, as we no longer utilize Dutch Auctions.
*   **Agent Execution**: The Liquidator Bot uses an **ERC-4337 Paymaster** so the bot does not need a gas balance natively. It evaluates the Health Factor ZK proof and submits the payload gas-free.
*   **Agent Reward**: The Smart Contract cuts exactly **1% of the liquidated collateral's value** instantly to the Agent operating the trigger.
*   **Staking Check (`1,000,000 $BRGN`)**: Before allowing the agent to submit the `trigger_liquidation` proof, the EVM contract requires `require(BRGN.balanceOf(msg.sender) >= 1_000_000 * 10**18, "Unwhitelisted Agent");`.

---

## 4. Off-Chain Autonomous Agent Stack

**Upgrades for Brgent (EVM / BNB Chain):**
*   **Chain Interface Replacement**: Replace Stellar SDK with `ethers.js` or `viem` to interact with the BNB Chain RPCs.
*   **Simplified Model**: The agent drops the "Auction Watcher" and "Bidder" logic. It strictly monitors the Health Factors via Off-chain ZK computations, and submits `trigger_liquidation` directly to the Vault.

---

## 5. Frontend Dashboard

*   **Wallet Integration**: Connect via `Wagmi` / `RainbowKit`.
*   **Dashboard Features**:
    *   Pool Stats & Reserve Status.
    *   Deposit/Borrow interfaces (LTV Gauges displaying 50-60% Max).
    *   Repayment interface with a **"Repay with Collateral"** switch.
    *   Real-time position monitoring displaying the **70% Threshold marker**.
