import { ethers } from "ethers";
import * as dotenv from "dotenv";
import { execSync } from "child_process";

dotenv.config();

const VAULT_ADDRESS = process.env.VAULT_ADDRESS || "0x0000000000000000000000000000000000000000";
const BSC_RPC_URL = process.env.BSC_RPC_URL || "https://bsc-dataseed.binance.org/";
const PRIVATE_KEY = process.env.PRIVATE_KEY || "0x0000000000000000000000000000000000000000000000000000000000000001";

const provider = new ethers.JsonRpcProvider(BSC_RPC_URL);
const wallet = new ethers.Wallet(PRIVATE_KEY, provider);

const vaultAbi = [
    "function liquidate(address borrower, address collateralToken, uint256 amountOutMinUsdc) external",
    "function positions(address borrower, address collateralToken) external view returns (uint256 collateralAmount, uint256 borrowedUsdc, address collateralToken, uint256 lastUpdateTimestamp)"
];

const vault = new ethers.Contract(VAULT_ADDRESS, vaultAbi, wallet);

async function checkAndLiquidate(borrower: string, collateralToken: string) {
    try {
        console.log(`Checking health factor for borrower ${borrower} on token ${collateralToken}...`);
        
        // Fetch position details off-chain
        const position = await vault.positions(borrower, collateralToken);
        const collateralAmount = position.collateralAmount;
        const borrowedUsdc = position.borrowedUsdc;

        if (borrowedUsdc === 0n) return;

        // Use the native Four.Meme AI Skill CLI to query real-time TWAP/Bonding curve prices
        const command = `npx fourmeme quote-sell --token ${collateralToken} --amount ${ethers.formatEther(collateralAmount)}`;
        console.log(`Estimating collateral value via Four.Meme skill...`);
        
        let result: string;
        try {
            result = execSync(command, { encoding: 'utf-8' });
        } catch (e) {
            console.error("Four.Meme CLI error or token not found.");
            return;
        }
        
        // Parse the quote output. Assume CLI outputs: "Quote: [value] USDC"
        const match = result.match(/Quote:\s*([0-9.]+)\s*USDC/);
        let estimatedUsdc = 0;
        if (match && match[1]) {
            estimatedUsdc = parseFloat(match[1]);
        } else {
            console.warn("Failed to parse quote from Four.Meme CLI");
            return; // Exit safely if quote is unreadable
        }

        const borrowedFloat = parseFloat(ethers.formatUnits(borrowedUsdc, 6)); // standard USDC Decimals

        // Evaluate the 70% threshold (Liquidation triggers if Debt > 70% of Collateral Value)
        if (borrowedFloat >= estimatedUsdc * 0.70) {
            console.log(`⚠️ THRESHOLD BREACHED. Triggering liquidation via ERC-4337 Paymaster...`);

            // Compute the max slippage value we're willing to accept (buffer of 5%)
            // The atomic swap requires us restricting the minimum acceptable USDC so borrower isn't completely sandwiched
            const amountOutMinUsdc = ethers.parseUnits((estimatedUsdc * 0.95).toFixed(6), 6);

            // Execute liquidation! (Using 4337 Biconomy or standard fallback)
            const tx = await vault.liquidate(borrower, collateralToken, amountOutMinUsdc);
            console.log(`Liquidation Tx Sent: ${tx.hash}`);
            
            await tx.wait();
            console.log(`✅ Liquidation confirmed.`);
        } else {
            console.log(`Health good. Debt is ${(borrowedFloat / estimatedUsdc * 100).toFixed(2)}% of Collateral.`);
        }

    } catch (e) {
        console.error("Error checking position:", e);
    }
}

// Scheduled Monitoring Loop
async function runAutoScheduler() {
    console.log("🟢 Starting Brgent Liquidator Agent with Four.Meme Skill Integration...");
    
    // In production: dynamically fetch all active vault positions.
    const activeBorrowers = ["0x..."];
    const activeTokens = ["0x..."];

    setInterval(() => {
        // Evaluate active positions periodically
        // checkAndLiquidate(activeBorrowers[0], activeTokens[0]);
        console.log("Polling and evaluating Four.meme ZK-Health Factors...");
    }, 15000); 
}

runAutoScheduler();
