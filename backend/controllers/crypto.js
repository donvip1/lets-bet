'use strict';

/*********************************************************
 Author:                Philip Awazie Donvip
 Year Created:          2026
 Description:           Crypto wallet, deposit, withdrawal, fee, and address controller.
 Modified By:           Philip Awazie Donvip
 Modified Date:         2026-06-05
 Modification Notes:    Added protected crypto wallet provisioning and withdrawal APIs.
*********************************************************/

// ========================================================
// Imports, validation helpers, and controller setup
// ========================================================

const walletProvisioning = require("../services/wallet-provisioning");
const config = require("../services/crypto-config");
const cryptoLedger = require("../services/crypto-ledger");
const withdrawalRisks = require("../services/withdrawal-risks");
const { baseScanner } = require("../services/deposit-scanner");
const { query } = require("../config/database");

const SUPPORTED_NETWORKS = new Set(["bnb", "sol", "ton", "base"]);

const parseLimit = (value, fallback = 20) => {
  const parsed = Number.parseInt(value, 10);

  if (!Number.isFinite(parsed) || parsed <= 0) {
    return fallback;
  }

  return Math.min(parsed, 100);
};

const parseAmount = (value) => {
  const amount = Number(value);

  return Number.isFinite(amount) ? amount : null;
};

const isValidNetwork = (network) => SUPPORTED_NETWORKS.has(network);

const handleControllerError = (res, error) => {
  console.error("Crypto controller error:", {
    message: error.message,
    code: error.code,
  });

  return res.status(500).json({
    success: false,
    error: "Crypto request failed",
  });
};

const maybeCreateNotification = async (userId, type, title, message) => {
  try {
    await query(
      `
        INSERT INTO notifications (user_id, type, title, message)
        VALUES ($1, $2, $3, $4)
      `,
      [userId, type, title, message]
    );
  } catch (error) {
    // The current schema may not have persistent notifications yet; realtime still works.
    if (error.code !== "42P01") {
      console.error("Crypto notification insert failed:", error.message);
    }
  }
};

const getUserWallets = async (req, res) => {
  try {
    const userId = req.user.id;
    let wallets = await walletProvisioning.getUserWallets(userId);

    if (wallets.length === 0) {
      await walletProvisioning.generateAllUserWallets(userId);
      wallets = await walletProvisioning.getUserWallets(userId);
    }

    return res.json({
      success: true,
      mode: config.CRYPTO_MODE,
      wallets,
    });
  } catch (error) {
    return handleControllerError(res, error);
  }
};

const getWalletByNetwork = async (req, res) => {
  try {
    const userId = req.user.id;
    const { network } = req.params;

    if (!isValidNetwork(network)) {
      return res.status(400).json({
        success: false,
        error: "Invalid network",
      });
    }

    const wallet = await walletProvisioning.ensureUserWallet(userId, network);

    return res.json({ success: true, wallet });
  } catch (error) {
    return handleControllerError(res, error);
  }
};

const getDepositHistory = async (req, res) => {
  try {
    const userId = req.user.id;
    const limit = parseLimit(req.query.limit);
    const deposits = await query(
      `
        SELECT cd.*, cw.wallet_address
        FROM crypto_deposits cd
        LEFT JOIN crypto_wallets cw
          ON cd.user_id = cw.user_id
         AND cd.network = cw.network
        WHERE cd.user_id = $1
        ORDER BY cd.created_at DESC
        LIMIT $2
      `,
      [userId, limit]
    );

    return res.json({ success: true, deposits: deposits.rows });
  } catch (error) {
    return handleControllerError(res, error);
  }
};

const requestWithdrawal = async (req, res) => {
  try {
    const userId = req.user.id;
    const { network, toAddress } = req.body;
    const amount = parseAmount(req.body.amount);

    if (!isValidNetwork(network)) {
      return res.status(400).json({ success: false, error: "Invalid network" });
    }

    if (!toAddress) {
      return res.status(400).json({
        success: false,
        error: "Withdrawal address is required",
      });
    }

    if (!amount || amount < config.MIN_WITHDRAWAL_USDT) {
      return res.status(400).json({
        success: false,
        error: `Minimum withdrawal is ${config.MIN_WITHDRAWAL_USDT} USDT`,
      });
    }

    if (amount > config.MAX_WITHDRAWAL_USDT) {
      return res.status(400).json({
        success: false,
        error: `Maximum withdrawal is ${config.MAX_WITHDRAWAL_USDT} USDT`,
      });
    }

    const riskCheck = await withdrawalRisks.checkWithdrawalAllowed(
      userId,
      amount,
      toAddress
    );

    if (!riskCheck.allowed) {
      return res.status(403).json({
        success: false,
        error: "Withdrawal not allowed",
        reason: riskCheck.riskFlags.join(", "),
        riskScore: riskCheck.riskScore,
        requiresApproval: riskCheck.requiresApproval,
        twoFactorRequired: riskCheck.twoFactorRequired,
      });
    }

    const walletResult = await query(
      "SELECT balance_usd FROM wallets WHERE user_id = $1",
      [userId]
    );
    const wallet = walletResult.rows[0];

    if (!wallet) {
      return res.status(404).json({ success: false, error: "Wallet not found" });
    }

    const platformFee = Number((amount * config.WITHDRAWAL_FEE_PERCENT).toFixed(8));
    const totalAmount = Number((amount + platformFee).toFixed(8));

    if (Number(wallet.balance_usd) < totalAmount) {
      return res.status(400).json({
        success: false,
        error: "Insufficient balance",
      });
    }

    const withdrawal = await query(
      `
        INSERT INTO crypto_withdrawals (
          user_id,
          network,
          token_type,
          amount,
          to_address,
          status,
          risk_score,
          risk_flags,
          requires_approval,
          platform_fee,
          total_fee
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
        RETURNING *
      `,
      [
        userId,
        network,
        "USDT",
        amount,
        toAddress,
        riskCheck.requiresApproval ? "APPROVAL_REQUIRED" : "PENDING",
        riskCheck.riskScore,
        riskCheck.riskFlags,
        riskCheck.requiresApproval,
        platformFee,
        platformFee,
      ]
    );

    await cryptoLedger.createEntry({
      userId,
      entryType: "WITHDRAWAL",
      direction: "OUT",
      amount: totalAmount,
      currency: "USDT",
      network,
      referenceType: "WITHDRAWAL",
      referenceId: withdrawal.rows[0].id,
      description: `Withdrawal request to ${toAddress}`,
      metadata: { toAddress, network, platformFee },
      idempotencyKey: `withdrawal_${userId}_${withdrawal.rows[0].id}`,
      fallbackBalanceBefore: Number(wallet.balance_usd),
    });

    await query(
      "UPDATE wallets SET balance_usd = balance_usd - $1 WHERE user_id = $2",
      [totalAmount, userId]
    );

    await withdrawalRisks.updateWithdrawalLimits(userId, amount);

    await maybeCreateNotification(
      userId,
      "withdrawal_requested",
      "Withdrawal Requested",
      `Your withdrawal of ${amount} USDT is ${
        riskCheck.requiresApproval ? "pending approval" : "processing"
      }`
    );

    return res.json({
      success: true,
      message: riskCheck.requiresApproval
        ? "Withdrawal pending admin approval"
        : "Withdrawal initiated",
      withdrawal: withdrawal.rows[0],
    });
  } catch (error) {
    return handleControllerError(res, error);
  }
};

const getWithdrawalHistory = async (req, res) => {
  try {
    const withdrawals = await query(
      `
        SELECT *
        FROM crypto_withdrawals
        WHERE user_id = $1
        ORDER BY created_at DESC
        LIMIT 20
      `,
      [req.user.id]
    );

    return res.json({ success: true, withdrawals: withdrawals.rows });
  } catch (error) {
    return handleControllerError(res, error);
  }
};

const getWithdrawalFees = async (req, res) => {
  try {
    const { network = "base" } = req.query;

    if (!isValidNetwork(network)) {
      return res.status(400).json({ success: false, error: "Invalid network" });
    }

    const fees = await query("SELECT * FROM network_fees WHERE network = $1", [
      network,
    ]);

    return res.json({
      success: true,
      fees:
        fees.rows[0] || {
          network,
          token_type: "USDT",
          platform_fee_percent: config.WITHDRAWAL_FEE_PERCENT * 100,
        },
      platformFeePercent: `${config.WITHDRAWAL_FEE_PERCENT * 100}%`,
    });
  } catch (error) {
    return handleControllerError(res, error);
  }
};

const whitelistAddress = async (req, res) => {
  try {
    const userId = req.user.id;
    const { network, address, label } = req.body;

    if (!isValidNetwork(network)) {
      return res.status(400).json({ success: false, error: "Invalid network" });
    }

    if (!address) {
      return res.status(400).json({
        success: false,
        error: "Address is required",
      });
    }

    const result = await withdrawalRisks.whitelistAddress(
      userId,
      network,
      address,
      label
    );

    return res.json({
      success: true,
      message: "Address added to whitelist. Verification code sent to your email.",
      verificationCode: result.verificationCode,
    });
  } catch (error) {
    return handleControllerError(res, error);
  }
};

const getWhitelistedAddresses = async (req, res) => {
  try {
    const addresses = await withdrawalRisks.getWhitelistedAddresses(req.user.id);

    return res.json({ success: true, addresses });
  } catch (error) {
    return handleControllerError(res, error);
  }
};

const manualDepositProof = async (req, res) => {
  try {
    const userId = req.user.id;
    const { txHash, fromAddress } = req.body;
    const network = req.body.network || "base";
    const amount = parseAmount(req.body.amount);

    // Manual deposits are a testnet-only shortcut; real deposits are scanner-led.
    if (!config.isTestnetMode()) {
      return res.status(403).json({
        success: false,
        error: "Manual deposits only allowed in testnet mode",
      });
    }

    if (network !== "base") {
      return res.status(400).json({
        success: false,
        error: "Manual deposit proof currently supports Base Sepolia only",
      });
    }

    if (!txHash || !fromAddress) {
      return res.status(400).json({
        success: false,
        error: "txHash and fromAddress are required",
      });
    }

    if (!amount || amount < config.MIN_DEPOSIT_USDT) {
      return res.status(400).json({
        success: false,
        error: `Minimum manual deposit is ${config.MIN_DEPOSIT_USDT} USDT`,
      });
    }

    if (amount > config.MAX_DEPOSIT_USDT) {
      return res.status(400).json({
        success: false,
        error: `Maximum manual deposit is ${config.MAX_DEPOSIT_USDT} USDT`,
      });
    }

    const wallet = await walletProvisioning.getUserWalletByNetwork(
      userId,
      network
    );

    if (!wallet) {
      return res.status(404).json({
        success: false,
        error: "Wallet not found for this network",
      });
    }

    const deposit = await baseScanner.manualDepositProof(
      txHash,
      amount,
      fromAddress,
      wallet.wallet_address,
      userId
    );

    return res.json({
      success: true,
      message: "Deposit proof recorded and credited",
      deposit,
    });
  } catch (error) {
    if (error.code === "23505" || error.code === "DUPLICATE_DEPOSIT_PROOF") {
      return res.status(409).json({
        success: false,
        error: "Deposit proof already exists for this txHash",
      });
    }

    return handleControllerError(res, error);
  }
};

module.exports = {
  getUserWallets,
  getWalletByNetwork,
  getDepositHistory,
  requestWithdrawal,
  getWithdrawalHistory,
  getWithdrawalFees,
  whitelistAddress,
  getWhitelistedAddresses,
  manualDepositProof,
};
