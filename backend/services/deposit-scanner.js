'use strict';

/*********************************************************
 Author:                Philip Awazie Donvip
 Year Created:          2026
 Description:           Base Sepolia deposit scanner and confirmation service.
 Modified By:           Philip Awazie Donvip
 Modified Date:         2026-06-05
 Modification Notes:    Added ERC20 transfer scanning, deposit idempotency, treasury confirmation, and crediting.
*********************************************************/

// ========================================================
// Imports, ABI, and scanner setup
// ========================================================

const { ethers } = require("ethers");
const { query } = require("../config/database");
const config = require("./crypto-config");
const depositEngine = require("./deposit-engine");
const cryptoLedger = require("./crypto-ledger");
const { notifyDepositCompleted } = require("./notifications");

const USDT_ABI = [
  "function balanceOf(address account) view returns (uint256)",
  "function transferFrom(address from, address to, uint256 amount) returns (bool)",
  "event Transfer(address indexed from, address indexed to, uint256 value)",
];

const normalizeAddress = (address) => String(address || "").toLowerCase();

const parseNumeric = (value) => Number.parseFloat(String(value || "0"));

const maybeCreatePersistentNotification = async (userId, type, title, message) => {
  try {
    await query(
      `
        INSERT INTO notifications (user_id, type, title, message)
        VALUES ($1, $2, $3, $4)
      `,
      [userId, type, title, message]
    );
  } catch (error) {
    if (error.code !== "42P01") {
      console.error("Deposit notification insert failed:", error.message);
    }
  }
};

class DepositScanner {
  constructor(network) {
    this.network = network;
    this.rpcUrl = config.getRpcUrl(network);
    this.provider = new ethers.JsonRpcProvider(this.rpcUrl);
    this.isTestnet = config.isTestnetMode();
    this.lastScannedBlock = 0;
  }

  getUsdtToken() {
    return config.getToken(this.network, "USDT");
  }

  async scanForDeposits(startBlock = null) {
    console.log(
      `[${this.network.toUpperCase()}] Starting deposit scan from block ${
        startBlock || "latest"
      }`
    );

    const usdtContract = this.getUsdtToken();

    if (!usdtContract?.contract) {
      console.log(`[${this.network.toUpperCase()}] No USDT contract configured`);
      return [];
    }

    if (!this.isEvmNetwork()) {
      console.log(
        `[${this.network.toUpperCase()}] Scanner adapter not implemented yet`
      );
      return [];
    }

    const contract = new ethers.Contract(
      usdtContract.contract,
      USDT_ABI,
      this.provider
    );
    const currentBlock = await this.provider.getBlockNumber();
    const scanFrom =
      startBlock ||
      (this.lastScannedBlock > 0
        ? this.lastScannedBlock + 1
        : Math.max(0, currentBlock - 100));

    if (scanFrom > currentBlock) {
      return [];
    }

    console.log(
      `[${this.network.toUpperCase()}] Scanning blocks ${scanFrom} to ${currentBlock}`
    );

    const logs = await this.provider.getLogs({
      address: usdtContract.contract,
      fromBlock: scanFrom,
      toBlock: currentBlock,
      topics: [ethers.id("Transfer(address,address,uint256)")],
    });
    const deposits = [];

    console.log(
      `[${this.network.toUpperCase()}] Found ${logs.length} Transfer events`
    );

    for (const log of logs) {
      try {
        const parsedLog = contract.interface.parseLog({
          topics: log.topics,
          data: log.data,
        });

        if (!parsedLog) {
          continue;
        }

        const { from, to, value } = parsedLog.args;
        const amount = ethers.formatUnits(value, usdtContract.decimals);

        if (normalizeAddress(from) === normalizeAddress(ethers.ZeroAddress)) {
          continue;
        }

        const userWallet = await this.findUserWallet(to);

        if (!userWallet) {
          continue;
        }

        console.log(
          `[${this.network.toUpperCase()}] Deposit detected: ${amount} USDT to ${to} (User: ${userWallet.user_id})`
        );

        const deposit = await this.createDepositRecord({
          txHash: log.transactionHash,
          network: this.network,
          tokenType: "USDT",
          tokenContract: usdtContract.contract,
          amount: parseNumeric(amount),
          decimals: usdtContract.decimals,
          fromAddress: from,
          toAddress: to,
          userId: userWallet.user_id,
          blockNumber: log.blockNumber,
          blockHash: log.blockHash,
          scannerSource: `${this.network}-scanner`,
        });

        deposits.push(deposit);
      } catch (error) {
        console.error(
          `[${this.network.toUpperCase()}] Error parsing log:`,
          error.message
        );
      }
    }

    this.lastScannedBlock = currentBlock;

    return deposits;
  }

  isEvmNetwork() {
    return this.network === "base" || this.network === "bnb";
  }

  async findUserWallet(address) {
    const result = await query(
      `
        SELECT user_id, wallet_address, network
        FROM crypto_wallets
        WHERE lower(wallet_address) = lower($1)
          AND network = $2
          AND wallet_type = 'USER'
          AND is_active = TRUE
      `,
      [address, this.network]
    );

    return result.rows[0] || null;
  }

  async createDepositRecord(data) {
    const {
      txHash,
      network,
      tokenType,
      tokenContract,
      amount,
      decimals,
      fromAddress,
      toAddress,
      userId,
      blockNumber,
      blockHash,
      scannerSource,
    } = data;
    const existing = await query(
      "SELECT * FROM crypto_deposits WHERE tx_hash = $1",
      [txHash]
    );

    if (existing.rows.length > 0) {
      console.log(`[${network.toUpperCase()}] Duplicate deposit: ${txHash}`);
      return existing.rows[0];
    }

    const platformFee = Number((amount * config.PLATFORM_FEE_PERCENT).toFixed(8));
    const netAmount = Number((amount - platformFee).toFixed(8));
    const explorerUrl = config.getExplorerUrl(network, txHash);
    const result = await query(
      `
        INSERT INTO crypto_deposits (
          tx_hash,
          user_id,
          network,
          token_type,
          token_contract,
          amount,
          decimals,
          from_address,
          to_address,
          status,
          confirmations,
          required_confirmations,
          block_number,
          block_hash,
          platform_fee,
          net_amount,
          explorer_url,
          scanner_source,
          detected_at,
          proof_metadata
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20)
        RETURNING *
      `,
      [
        txHash,
        userId,
        network,
        tokenType,
        tokenContract,
        amount,
        decimals,
        fromAddress,
        toAddress,
        depositEngine.DEPOSIT_STATUS.DETECTED,
        0,
        config.getConfirmations(network),
        blockNumber,
        blockHash,
        platformFee,
        netAmount,
        explorerUrl,
        scannerSource,
        new Date(),
        {
          source: scannerSource,
          treasuryRequirement: "required_before_credit",
        },
      ]
    );

    return result.rows[0];
  }

  async confirmDeposit(depositId) {
    const depositResult = await query(
      "SELECT * FROM crypto_deposits WHERE id = $1",
      [depositId]
    );

    if (depositResult.rows.length === 0) {
      return null;
    }

    const deposit = depositResult.rows[0];

    if (
      deposit.status === depositEngine.DEPOSIT_STATUS.CREDITED ||
      deposit.status === depositEngine.DEPOSIT_STATUS.FAILED
    ) {
      return deposit;
    }

    const currentBlock = await this.provider.getBlockNumber();
    const confirmations = Math.max(0, currentBlock - Number(deposit.block_number));

    await depositEngine.markConfirming(depositId, confirmations);

    console.log(
      `[${this.network.toUpperCase()}] Deposit ${deposit.tx_hash} has ${confirmations}/${deposit.required_confirmations} confirmations`
    );

    if (confirmations >= Number(deposit.required_confirmations)) {
      await this.processTreasuryConfirmation({
        ...deposit,
        confirmations,
      });
    }

    return { ...deposit, confirmations };
  }

  async processTreasuryConfirmation(deposit) {
    console.log(
      `[${this.network.toUpperCase()}] Treasury confirmation for deposit ${deposit.tx_hash}`
    );

    // In Base Sepolia/testnet mode, treasury confirmation is automatic after
    // chain confirmations. Mainnet scanners will replace this with sweep proof.
    await depositEngine.markTreasuryConfirmed(deposit.id);

    return this.creditUserDeposit(deposit.id);
  }

  async creditUserDeposit(depositId) {
    const depositResult = await query(
      "SELECT * FROM crypto_deposits WHERE id = $1",
      [depositId]
    );
    const deposit = depositResult.rows[0];

    if (!deposit) {
      return { success: false, message: "Deposit not found" };
    }

    if (deposit.status === depositEngine.DEPOSIT_STATUS.CREDITED) {
      return { success: true, message: "Already credited" };
    }

    await cryptoLedger.createEntry({
      userId: deposit.user_id,
      entryType: "DEPOSIT",
      direction: "IN",
      amount: deposit.net_amount,
      currency: deposit.token_type,
      network: deposit.network,
      referenceType: "DEPOSIT",
      referenceId: depositId,
      description: `Crypto deposit confirmed: ${deposit.amount} ${deposit.token_type} on ${deposit.network}`,
      metadata: {
        txHash: deposit.tx_hash,
        platformFee: deposit.platform_fee,
        netAmount: deposit.net_amount,
        confirmations: deposit.confirmations,
        blockNumber: deposit.block_number,
      },
      idempotencyKey: `deposit_${deposit.tx_hash}`,
    });

    await query(
      `
        UPDATE wallets
        SET balance_usd = balance_usd + $1
        WHERE user_id = $2
      `,
      [deposit.net_amount, deposit.user_id]
    );

    await depositEngine.markCredited(depositId);

    await maybeCreatePersistentNotification(
      deposit.user_id,
      "deposit_success",
      "Deposit Successful",
      `You received ${deposit.net_amount} ${deposit.token_type} on ${deposit.network}`
    );

    notifyDepositCompleted(deposit.user_id, {
      amount: deposit.net_amount,
      currency: deposit.token_type,
      transactionId: deposit.id,
    });

    console.log(
      `[${this.network.toUpperCase()}] User ${deposit.user_id} credited with ${deposit.net_amount} ${deposit.token_type}`
    );

    return { success: true, message: "Deposit credited" };
  }

  async manualDepositProof(txHash, amount, fromAddress, toAddress, userId) {
    console.log(`[${this.network.toUpperCase()}] Manual deposit proof: ${amount} USDT`);

    // Manual proofs are user-triggered test credits, so duplicates must stop
    // before any status transition or balance update can run.
    const existing = await query(
      "SELECT id FROM crypto_deposits WHERE tx_hash = $1",
      [txHash]
    );

    if (existing.rows.length > 0) {
      const error = new Error("Deposit proof already exists for this txHash");
      error.code = "DUPLICATE_DEPOSIT_PROOF";
      throw error;
    }

    const token = this.getUsdtToken();
    const currentBlock = await this.provider.getBlockNumber();
    const deposit = await this.createDepositRecord({
      txHash,
      network: this.network,
      tokenType: "USDT",
      tokenContract: token.contract,
      amount: parseNumeric(amount),
      decimals: token.decimals,
      fromAddress,
      toAddress,
      userId,
      blockNumber: currentBlock,
      blockHash: `manual-${currentBlock}`,
      scannerSource: "manual",
    });

    await query(
      `
        UPDATE crypto_deposits
        SET confirmations = $1,
            status = $2,
            treasury_confirmed_at = CURRENT_TIMESTAMP,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = $3
      `,
      [
        config.getConfirmations(this.network),
        depositEngine.DEPOSIT_STATUS.TREASURY_CONFIRMED,
        deposit.id,
      ]
    );

    await this.creditUserDeposit(deposit.id);

    const finalDeposit = await query(
      "SELECT * FROM crypto_deposits WHERE id = $1",
      [deposit.id]
    );

    return finalDeposit.rows[0] || deposit;
  }
}

const bnbScanner = new DepositScanner("bnb");
const solScanner = new DepositScanner("sol");
const tonScanner = new DepositScanner("ton");
const baseScanner = new DepositScanner("base");

module.exports = {
  DepositScanner,
  bnbScanner,
  solScanner,
  tonScanner,
  baseScanner,
};
