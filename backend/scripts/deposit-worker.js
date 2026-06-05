'use strict';

/*********************************************************
 Author:                Philip Awazie Donvip
 Year Created:          2026
 Description:           Background worker for scanning and confirming crypto deposits.
 Modified By:           Philip Awazie Donvip
 Modified Date:         2026-06-05
 Modification Notes:    Added Base Sepolia testnet scanner loop with pending deposit confirmation.
*********************************************************/

// ========================================================
// Imports and worker loop
// ========================================================

const {
  baseScanner,
  bnbScanner,
  solScanner,
  tonScanner,
} = require("../services/deposit-scanner");
const config = require("../services/crypto-config");
const { query, pool } = require("../config/database");

const getPendingDeposits = async (network) => {
  const result = await query(
    `
      SELECT id
      FROM crypto_deposits
      WHERE network = $1
        AND status IN ($2, $3)
      ORDER BY created_at ASC
      LIMIT 10
    `,
    [
      network,
      "DETECTED",
      "CONFIRMING",
    ]
  );

  return result.rows;
};

async function scanDeposits() {
  console.log("=== Starting Deposit Scan ===");

  const scanners = config.isTestnetMode()
    ? [baseScanner]
    : [bnbScanner, solScanner, tonScanner];

  for (const scanner of scanners) {
    try {
      const deposits = await scanner.scanForDeposits();
      console.log(
        `[${scanner.network.toUpperCase()}] Found ${deposits.length} new deposits`
      );

      const pendingDeposits = await getPendingDeposits(scanner.network);

      for (const deposit of pendingDeposits) {
        await scanner.confirmDeposit(deposit.id);
      }
    } catch (error) {
      console.error(`[${scanner.network.toUpperCase()}] Scan error:`, {
        message: error.message,
        code: error.code,
      });
    }
  }

  console.log("=== Deposit Scan Complete ===\n");
}

async function startWorker() {
  console.log(`Starting Deposit Scanner (Mode: ${config.CRYPTO_MODE})`);

  await scanDeposits();

  setInterval(async () => {
    await scanDeposits();
  }, 30000);
}

process.on("SIGINT", async () => {
  console.log("Shutting down deposit scanner...");
  await pool.end();
  process.exit(0);
});

startWorker().catch((error) => {
  console.error("Deposit scanner failed:", error);
  process.exit(1);
});
