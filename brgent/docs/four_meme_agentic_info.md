# Four.Meme Agentic Skill Integration

This document extracts the necessary information from Four.Meme's Agentic interface (`https://four.meme/agentic`) to detail how Brgent's autonomous liquidator agent can leverage Four.Meme's native AI infrastructure on the BNB Chain.

---

## 1. The `@four-meme/four-meme-ai` Skill

Four.Meme has built an official skill/CLI tailored for AI agents (like Claude, OpenClaw, Cursor, etc.) to natively interact with the Four.Meme ecosystem. We will use this library as the foundation for Brgent's liquidator bots.

### Installation
The foundation package can be installed globally or locally:
```bash
pnpm add -g @four-meme/four-meme-ai@latest
```
Agents can then use commands synchronously via the terminal: 
```bash
fourmeme <command>
```
Alternatively, for MCP environments, the skill can be installed via:
```bash
npx skills add four-meme-community/four-meme-ai
```

### Environment Configuration
Bots only require two fundamental environment variables in the project root's `.env`:
*   `PRIVATE_KEY=...` (The liquidator's operator wallet, used for signing if not using a Paymaster, or authorizing EIP-8004 actions).
*   `BSC_RPC_URL=...` (Optional, defaults to standard BNB Chain RPCs).

---

## 2. Core Capabilities for Brgent

The Four.Meme Agent API exposes several tools that Brgent will directly consume to run its Health Factor ZK engine and Atomic Liquidations:

### A. Market Data & Oracle Inputs
Before triggering a liquidation ZK-Proof, the agent must attest to the current market cap and price of the Four.Meme collateral.
*   **`toolTokenInfo` / `Token detail`**: Can be used to query the bounding curve status, on-chain price, and liquidity depth.
*   **`toolQuoteSell` / `Buy/sell quotes`**: Used to estimate the exact execution amount of USDC received when dumping the seized memecoin during atomic liquidation.

### B. Execution
*   **`toolSell` / `Execute sell`**: Once the Vault Contract initiates a liquidation action, if Brgent decides to handle the atomic swap off-chain or via the Four.Meme API explicitly, it can rapidly execute Market Sells through this tool.

### C. Agent Identity (EIP-8004)
Four.Meme supports on-chain identities for bots through EIP-8004 NFTs. Brgent liquidator agents can establish a verifiable on-chain footprint:
*   **`tool8004Register`**: Mints an identity NFT for your agent wallet, verifying its activity on the blockchain. 
*   **`tool8004Balance`**: Used by the Brgent protocol to verify if an interacting agent has been properly registered inside the ecosystem before paying out the 1% liquidation fee.

---

## 3. Automation Task Implementation

The Four.Meme agent architecture heavily supports robust, scheduled task execution, identical to our requirement for the Brgent Action Model scheduler.
It surfaces native tooling for:
*   `toolScheduleCustomScript`
*   `toolListScheduledTasks`
*   `toolGetScheduledTaskLogs`

**Integration into Brgent:**
Instead of rolling a custom typescript `while(true)` Action Scheduler for Brgent, we can simply write our Health Factor monitoring logic (scanning positions and computing Math) into a custom script and register it via Four.Meme's **`toolScheduleCustomScript`**. The Four.Meme Agent runner will ensure the script is continuously executed at interval checkpoints without fail.
