# Brgent: Agentic Lending Protocol on BNB Chain

**Brgent** is a next-generation decentralized lending protocol designed specifically for the Four.Meme ecosystem on BNB Chain. It leverages autonomous AI agents to manage collateral risk through **Scam-Wick Protected Liquidations** and **Partial Collateral Preservation**.

---

## 🚀 The Vision
Lending against memecoins is traditionally high-risk due to extreme volatility and "scam-wicks" (temporary price crashes triggered by manipulation). Brgent solves this by replacing dumb liquidation scripts with **Intelligent Autonomous Agents** that use on-chain reasoning to decide when to liquidate.

## 🛠️ Key Features & Mitigations

### 1. Partial Liquidation (Exact-Out)
Unlike standard protocols that wipe out a user's entire position, Brgent uses the **Partial Liquidation** strategy.
- **Mitigation**: Prevents total loss of collateral for borrowers.
- **Implementation**: The `Vault.sol` contract uses `swapTokensForExactTokens` to sell only the amount of memecoin needed to cover the USDC debt and agent reward. The remaining collateral stays in the user's position, preserving their upside if the price recovers.

### 2. Scam-Wick Protection (3-Block Grace)
To avoid unfair liquidations caused by flash-crashes, the Brgent Agent follows a "confirm-then-kill" logic.
- **Mitigation**: Filters out temporary price manipulation and flash-loan dumps.
- **Implementation**: If the Health Factor drops below 1.0, the agent enters a **3-block grace period (approx. 9 seconds)**. It re-verifies the price after the wait; if the price recovers, the liquidation is cancelled.

### 3. Emergency "Fast-Path" Protection
Protocol safety is paramount. The agent monitors the **velocity** of a dump.
- **Mitigation**: Prevents "Bad Debt" during a real, sustained crash.
- **Implementation**: If the Health Factor drops below a critical threshold (e.g., **0.92**), the agent bypasses the grace period and executes an **instant liquidation** to protect USDC lenders.

### 4. Agentic Identity (EIP-8004)
Brgent agents are not just bots—they are verifiable identities on the BNB Chain.
- **Implementation**: Agents must hold an EIP-8004 identity NFT. The `Vault` contract verifies this identity before authorizing liquidation rewards.

---

## 📁 Repository Structure

- **/agent**: The autonomous liquidator built with TypeScript and Four.Meme AI Skills.
- **/argen**: Core smart contracts (Foundry/Solidity) including `Vault.sol`.
- **/frontend**: A premium dashboard built with Next.js (Tailwind v4), wagmi, and viem.
- **/brgent/docs**: Detailed technical specifications and Four.Meme ecosystem info.

## 🔧 Technical Stack
- **Protocol**: Solidity (Foundry), IPancakeRouter (PancakeSwap V2).
- **Agent**: Node.js, ethers.js, `@four-meme/four-meme-ai` Skills.
- **UI**: Next.js, Tailwind v4, wagmi/viem.

---

## 🚦 How to Run

### Autonomous Agent
1. Register identity: `npx fourmeme 8004-register "Agent Name"`
2. Start monitoring: `npm start` (in `/agent`)

### Frontend
1. Install dependencies: `pnpm install`
2. Run locally: `npm run dev` (in `/frontend`)

---

## 🏆 Hackathon Submission Status
- [x] **BNB Chain Deployment Ready**
- [x] **Four.Meme SDK Integration**
- [x] **Partial Liquidation Logic Verified**
- [x] **Agentic Scam-Wick Protection Implemented**
