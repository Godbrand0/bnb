# Brgent x Four.Meme: The $BRGN Tokenomics Blueprint

This document details the exact tokenomic mathematics and emission schedules for the $BRGN token on Four.Meme. Use this in your whitepaper or hackathon pitch deck to show the judges you have deeply thought through the platform economics.

---

## 1. The Core Mechanics
**Yes.** The system uses a Dual-Incentive model. 
* **Lenders** who deposit BNB-chain USDC into the protocol so it can be lent out receive $BRGN emissions. 
* **Borrowers** who use Four.Meme tokens (memecoins) as collateral to borrow USDC pay an interest rate, but *also* receive $BRGN emissions as a subsidy.

## 2. Emission Rates & The Daily Distribution
For the first 6 months, the protocol emits exactly **1,000,000 $BRGN per day** to the active users. It is split as follows:
*   **70% to Lenders (700,000 $BRGN/day):** Lenders take the risk of providing stablecoin liquidity, receiving the vast majority of emissions.
*   **30% to Borrowers (300,000 $BRGN/day):** Borrowers are incentivized to collateralize their memecoins.

## 3. Borrowing Mechanics & Loan Term (How much USDC can you get?)
Brgent supports robust memecoin utility by providing generous leverage backed by real-time TWAP (Time-Weighted Average Price) from DEXs.
*   **Loan-To-Value (LTV):** Set at **50% - 60%**. If a user deposits $10,000 worth of a Four.Meme token, they can securely borrow up to $5,000 - $6,000 USDC.
*   **Loan Timeframes:** Loans have formalized term limits (e.g., 30 Days). Borrowers must manage their debt safely before the timeframe expires to avoid late penalties or forced settlement.
*   **Flexible Repayment (Self-Liquidation):** If health is good, a borrower can simply repay the borrowed USDC to unlock their memecoin. Alternatively, they can **repay using their collateral**! The protocol will automatically market-sell just enough of their locked memecoin into USDC to clear their debt, letting them instantly withdraw the remaining collateral.

## 4. Withdrawal mechanics (The 7-Day Vesting Lock)
To protect the price of the token and build long-term TVL, Brgent implements **Dynamic Epoch Claiming**:
*   **Rewards Lock:** $BRGN emissions accrue instantly but are strictly locked and released at the end of every **7-Day Epoch**.
*   This prevents users from farming and dumping instantly, actively protecting the Four.Meme bonding curve.

## 5. Instant Atomic Liquidations & Borrower Surplus Protection
When a memecoin dumps in price and drops below the **70% Liquidation Threshold**, the liquidation flow is instantaneous and fair:
1.  **AI Agents Trigger:** An autonomous agent detects the drop (e.g. collateral value drops below $7,000) and instantly triggers liquidation.
2.  **Market Sell:** Brgent executes an **Atomic Swap** directly against a DEX (like PancakeSwap), market-selling the seized memecoin to recover USDC instantly.
3.  **Surplus Sent to Borrower:** The protocol uses the swapped USDC to pay back the loan principal + interest to the lending pool (making lenders whole). **All excess surplus is automatically sent back to the borrower's wallet.** You do not lose everything—you are fairly liquidated.

## 6. Gasless Agent Execution & the $BRGN Staking Value Sink
*   **Paymaster Subsidized:** Agents triggering liquidations do NOT need to hold BNB for gas. The protocol natively integrates an ERC-4337 Paymaster, sponsoring the gas so agents can run completely unfunded!
*   **Trigger Fees (1% Cut):** When an agent successfully liquidates bad debt, the agent immediately receives a **1% fee** of the liquidated collateral.
*   **Staking Requirement:** To be legally whitelisted by the Smart Contract to trigger liquidations and earn the 1% bounty, the operator must purchase and lock a fixed **1,000,000 $BRGN** on the Four.Meme curve. This acts as the ultimate value-sink for the token!
