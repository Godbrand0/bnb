import { ethers } from "ethers";
import * as dotenv from "dotenv";
import { execSync } from "child_process";

dotenv.config();

const VAULT_ADDRESS = process.env.VAULT_ADDRESS || "0x0000000000000000000000000000000000000000";
const BSC_RPC_URL = process.env.BSC_RPC_URL || "https://bsc-dataseed.binance.org/";
const PRIVATE_KEY = process.env.PRIVATE_KEY || "0x0000000000000000000000000000000000000000000000000000000000000001";

const BORROW_INTEREST_RATE_BPS = 500n; // 5% APR
const AGENT_REWARD_BPS = 100n; // 1%
const SECONDS_PER_YEAR = 31536000n;

const provider = new ethers.JsonRpcProvider(BSC_RPC_URL);
const wallet = new ethers.Wallet(PRIVATE_KEY, provider);

const vaultAbi = [
    "function liquidate(address borrower, address collateralToken, uint256 amountInMaxCollateral) external",
    "function positions(address borrower, address collateralToken) external view returns (uint256 collateralAmount, uint256 borrowedUsdc, address collateralToken, uint256 lastUpdateTimestamp)",
    "event Borrowed(address indexed user, address indexed collateralToken, uint256 usdcAmount)",
    "event Deposited(address indexed user, address indexed collateralToken, uint256 amount)"
];

const vault = new ethers.Contract(VAULT_ADDRESS, vaultAbi, wallet);

/**
 * @dev Computes the interest accrued off-chain for accurate health factor monitoring.
 */
function computeAccruedDebt(borrowedUsdc: bigint, lastUpdateTimestamp: bigint): bigint {
    const now = BigInt(Math.floor(Date.now() / 1000));
    const timeElapsed = now - lastUpdateTimestamp;
    if (timeElapsed <= 0n || borrowedUsdc === 0n) return borrowedUsdc;

    const interest = (borrowedUsdc * BORROW_INTEREST_RATE_BPS * timeElapsed) / (10000n * SECONDS_PER_YEAR);
    return borrowedUsdc + interest;
}

async function verifyIdentity() {
    console.log("🕵️ Verifying Agent Identity (EIP-8004)...");
    try {
        const result = execSync(`npx fourmeme 8004-balance ${wallet.address}`, { encoding: 'utf-8' });
        if (result.includes("Balance: 0") || result.includes("No identity found")) {
            console.warn("⚠️ WARNING: Agent is not registered with EIP-8004. Liquidations will fail.");
            console.log("👉 Run: npx fourmeme 8004-register 'Brgent Guardian' to register.");
        } else {
            console.log("✅ Identity verified.");
        }
    } catch (e) {
        console.warn("Could not verify identity via Four.Meme CLI. Proceeding with caution.");
    }
}

async function checkAndLiquidate(borrower: string, collateralToken: string) {
    try {
        console.log(`\n🔍 Scanning Position [Borrower: ${borrower} | Collateral: ${collateralToken}]`);
        
        const position = await vault.positions(borrower, collateralToken);
        const collateralAmount = position.collateralAmount;
        const borrowedUsdc = position.borrowedUsdc;
        const lastUpdate = position.lastUpdateTimestamp;

        if (borrowedUsdc === 0n) {
            console.log("Empty debt. Skipping.");
            return;
        }

        const currentDebt = computeAccruedDebt(borrowedUsdc, lastUpdate);
        const totalUsdcNeeded = currentDebt + (currentDebt * AGENT_REWARD_BPS / 10000n);
        const debtFloat = parseFloat(ethers.formatUnits(currentDebt, 6));

        // Get market quote for the WHOLE collateral to estimate HF
        const quoteCmd = `npx fourmeme quote-sell --token ${collateralToken} --amount ${ethers.formatEther(collateralAmount)}`;
        console.log(`📡 Fetching market quote from Four.Meme...`);
        
        let result: string;
        try {
            result = execSync(quoteCmd, { encoding: 'utf-8' });
        } catch (e) {
            console.error("Four.Meme CLI error: Token might lack liquidity.");
            return;
        }
        
        const match = result.match(/Quote:\s*([0-9.]+)\s*USDC/);
        let totalCollateralValueUsdc = 0;
        if (match && match[1]) {
            totalCollateralValueUsdc = parseFloat(match[1]);
        } else {
            console.warn("Failed to parse quote.");
            return;
        }

        const healthFactor = totalCollateralValueUsdc > 0 ? (debtFloat / (totalCollateralValueUsdc * 0.70)) : Infinity;
        console.log(`📊 Health Status: Debt $${debtFloat.toFixed(2)} | Total Collateral Value $${totalCollateralValueUsdc.toFixed(2)} | HF: ${healthFactor.toFixed(4)}`);

        if (healthFactor < 1.0) {
            // "Emergency" Check: If dumping so fast it hits 0.92, kill it immediately to protect the protocol.
            if (healthFactor < 0.92) {
                console.log(`🧨 EMERGENCY: Health Factor ${healthFactor.toFixed(4)} is critical (< 0.92). Skipping grace period!`);
            } else {
                console.log(`⚠️ WARNING: Health Factor ${healthFactor.toFixed(4)} < 1.0. Entering 3-block grace period (9s)...`);
                
                // Wait for ~3 blocks (approx 9 seconds on BNB Chain) to confirm it's not a scam wick.
                await new Promise(resolve => setTimeout(resolve, 9000));
                
                console.log(`📡 Grace period ended. Re-checking market status for ${borrower}...`);
                const recheckedPosition = await vault.positions(borrower, collateralToken);
                const reDebt = computeAccruedDebt(recheckedPosition.borrowedUsdc, recheckedPosition.lastUpdateTimestamp);
                
                const reQuoteCmd = `npx fourmeme quote-sell --token ${collateralToken} --amount ${ethers.formatEther(recheckedPosition.collateralAmount)}`;
                const reResult = execSync(reQuoteCmd, { encoding: 'utf-8' });
                const reMatch = reResult.match(/Quote:\s*([0-9.]+)\s*USDC/);
                
                if (reMatch && reMatch[1]) {
                    const reVal = parseFloat(reMatch[1]);
                    const reDebtFloat = parseFloat(ethers.formatUnits(reDebt, 6));
                    const reHF = reVal > 0 ? (reDebtFloat / (reVal * 0.70)) : Infinity;
                    
                    if (reHF >= 1.0) {
                        console.log(`🛡️ RECOVERY: Position stabilized (HF: ${reHF.toFixed(4)}). Liquidation cancelled.`);
                        return;
                    } else {
                        console.log(`💀 SUSTAINED BREACH: Position still unhealthy (HF: ${reHF.toFixed(4)}). Executing...`);
                    }
                }
            }

            // Estimate how much collateral is needed for EXACT USDC repayment
            const estimatedCollateralNeeded = (collateralAmount * totalUsdcNeeded) / ethers.parseUnits(totalCollateralValueUsdc.toString(), 6);
            const amountInMax = (estimatedCollateralNeeded * 110n) / 100n; // 10% buffer

            const tx = await vault.liquidate(borrower, collateralToken, amountInMax);
            console.log(`🚀 Transaction broadcasted: ${tx.hash}`);
            
            await tx.wait();
            console.log(`✅ Liquidation successfully executed. Remaining collateral preserved for user.`);
        } else {
            console.log(`🟢 Status: Healthy (HF: ${healthFactor.toFixed(4)})`);
        }

    } catch (e: any) {
        console.error("Error monitoring position:", e?.message || e);
    }
}

async function runAutoScheduler() {
    console.log("------------------------------------------------------------------");
    console.log("🟢 BRGENT AUTONOMOUS LIQUIDATOR ACTIVE");
    console.log(`🏢 Vault: ${VAULT_ADDRESS}`);
    console.log(`⚖️ Strategy: Partial Liquidation (Exact Debt Coverage)`);
    console.log("------------------------------------------------------------------");
    
    await verifyIdentity();

    const fetchPositions = async () => {
        const filter = vault.filters.Borrowed();
        const events = await vault.queryFilter(filter, -1000); // Scan last 1k blocks
        const users = [...new Set(events.map(e => (e as any).args.user))];
        const tokens = [...new Set(events.map(e => (e as any).args.collateralToken))];

        for (const user of users) {
            for (const token of tokens) {
                await checkAndLiquidate(user, token);
            }
        }
    };

    fetchPositions();
    setInterval(fetchPositions, 30000); 
}

runAutoScheduler();
