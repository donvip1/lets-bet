'use strict';

/*********************************************************
 Author:                Philip Awazie Donvip
 Year Created:          2026
 Description:           Withdrawal risk checks, limits, cooldowns, and address whitelisting.
 Modified By:           Philip Awazie Donvip
 Modified Date:         2026-06-05
 Modification Notes:    Added KYC-tiered withdrawal controls for crypto withdrawals.
*********************************************************/

// ========================================================
// Imports and risk service setup
// ========================================================

const crypto = require("crypto");
const { query } = require("../config/database");
const config = require("./crypto-config");

const DEFAULT_TIER = "BASIC";
const HIGH_RISK_SCORE = 70;
const APPROVAL_SCORE = 50;

const getOrCreateLimits = async (userId) => {
  const existing = await query(
    `
      SELECT *
      FROM user_withdrawal_limits
      WHERE user_id = $1
    `,
    [userId]
  );

  if (existing.rows[0]) {
    return existing.rows[0];
  }

  const limits = config.WITHDRAWAL_LIMITS[DEFAULT_TIER];
  const created = await query(
    `
      INSERT INTO user_withdrawal_limits (
        user_id,
        kyc_tier,
        daily_limit,
        weekly_limit,
        monthly_limit,
        single_withdrawal_max
      )
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `,
    [
      userId,
      DEFAULT_TIER,
      limits.daily,
      limits.weekly,
      limits.monthly,
      limits.single,
    ]
  );

  return created.rows[0];
};

const createUserLimits = async (userId, kycTier = DEFAULT_TIER) => {
  const tier = config.WITHDRAWAL_LIMITS[kycTier] ? kycTier : DEFAULT_TIER;
  const limits = config.WITHDRAWAL_LIMITS[tier];
  const result = await query(
    `
      INSERT INTO user_withdrawal_limits (
        user_id,
        kyc_tier,
        daily_limit,
        weekly_limit,
        monthly_limit,
        single_withdrawal_max
      )
      VALUES ($1, $2, $3, $4, $5, $6)
      ON CONFLICT (user_id) DO UPDATE SET
        kyc_tier = EXCLUDED.kyc_tier,
        daily_limit = EXCLUDED.daily_limit,
        weekly_limit = EXCLUDED.weekly_limit,
        monthly_limit = EXCLUDED.monthly_limit,
        single_withdrawal_max = EXCLUDED.single_withdrawal_max,
        updated_at = CURRENT_TIMESTAMP
      RETURNING *
    `,
    [
      userId,
      tier,
      limits.daily,
      limits.weekly,
      limits.monthly,
      limits.single,
    ]
  );

  return result.rows[0];
};

const isAddressWhitelisted = async (userId, toAddress) => {
  const result = await query(
    `
      SELECT id
      FROM crypto_addresses
      WHERE user_id = $1
        AND lower(address) = lower($2)
        AND is_active = TRUE
    `,
    [userId, toAddress]
  );

  return result.rows.length > 0;
};

const checkWithdrawalAllowed = async (userId, amount, toAddress) => {
  const numericAmount = Number(amount);
  const limits = await getOrCreateLimits(userId);
  const riskFlags = [];
  let riskScore = 0;

  if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
    riskFlags.push("invalid_amount");
    riskScore += 100;
  }

  if (numericAmount > Number(limits.single_withdrawal_max)) {
    riskFlags.push("single_limit_exceeded");
    riskScore += 40;
  }

  if (Number(limits.daily_withdrawn) + numericAmount > Number(limits.daily_limit)) {
    riskFlags.push("daily_limit_exceeded");
    riskScore += 50;
  }

  if (Number(limits.weekly_withdrawn) + numericAmount > Number(limits.weekly_limit)) {
    riskFlags.push("weekly_limit_exceeded");
    riskScore += 60;
  }

  if (Number(limits.monthly_withdrawn) + numericAmount > Number(limits.monthly_limit)) {
    riskFlags.push("monthly_limit_exceeded");
    riskScore += 70;
  }

  if (limits.cooldown_until && new Date(limits.cooldown_until) > new Date()) {
    riskFlags.push("cooldown_active");
    riskScore += 35;
  }

  const whitelisted = await isAddressWhitelisted(userId, toAddress);

  if (!whitelisted) {
    riskFlags.push("new_address");
    riskScore += 25;
  }

  const requiresApproval = riskScore >= APPROVAL_SCORE;
  const twoFactorRequired = !limits.two_factor_enabled || riskScore >= APPROVAL_SCORE;

  return {
    allowed: riskScore < HIGH_RISK_SCORE,
    riskScore,
    riskFlags,
    requiresApproval,
    twoFactorRequired,
    limits,
  };
};

const updateWithdrawalLimits = async (userId, amount) => {
  await getOrCreateLimits(userId);

  await query(
    `
      UPDATE user_withdrawal_limits
      SET daily_withdrawn = daily_withdrawn + $1,
          weekly_withdrawn = weekly_withdrawn + $1,
          monthly_withdrawn = monthly_withdrawn + $1,
          last_withdrawal_date = CURRENT_DATE,
          updated_at = CURRENT_TIMESTAMP
      WHERE user_id = $2
    `,
    [amount, userId]
  );
};

const whitelistAddress = async (userId, network, address, label) => {
  const verificationCode = crypto.randomInt(100000, 999999).toString();
  const result = await query(
    `
      INSERT INTO crypto_addresses (
        user_id,
        network,
        address,
        label,
        verification_code
      )
      VALUES ($1, $2, $3, $4, $5)
      ON CONFLICT (user_id, network, address)
      DO UPDATE SET
        label = EXCLUDED.label,
        verification_code = EXCLUDED.verification_code,
        is_active = TRUE
      RETURNING id, network, address, label, verification_code
    `,
    [userId, network, address, label || null, verificationCode]
  );

  return {
    ...result.rows[0],
    verificationCode,
  };
};

const getWhitelistedAddresses = async (userId) => {
  const result = await query(
    `
      SELECT
        id,
        network,
        address,
        label,
        is_verified,
        verified_at,
        is_active,
        added_at,
        last_used_at,
        usage_count
      FROM crypto_addresses
      WHERE user_id = $1 AND is_active = TRUE
      ORDER BY added_at DESC
    `,
    [userId]
  );

  return result.rows;
};

module.exports = {
  createUserLimits,
  checkWithdrawalAllowed,
  updateWithdrawalLimits,
  whitelistAddress,
  getWhitelistedAddresses,
};
