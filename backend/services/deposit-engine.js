'use strict';

/*********************************************************
 Author:                Philip Awazie Donvip
 Year Created:          2026
 Description:           Deposit confirmation engine helpers for crypto scanners.
 Modified By:           Philip Awazie Donvip
 Modified Date:         2026-06-05
 Modification Notes:    Added state transition helpers for detected, confirming, treasury confirmed, and credited deposits.
*********************************************************/

// ========================================================
// Imports and deposit state helpers
// ========================================================

const { query } = require("../config/database");

const DEPOSIT_STATUS = Object.freeze({
  DETECTED: "DETECTED",
  CONFIRMING: "CONFIRMING",
  TREASURY_PENDING: "TREASURY_PENDING",
  TREASURY_CONFIRMED: "TREASURY_CONFIRMED",
  CREDITED: "CREDITED",
  FAILED: "FAILED",
  MANUAL_REVIEW: "MANUAL_REVIEW",
});

const updateDepositStatus = async (depositId, status, extraFields = {}) => {
  const allowedFields = {
    confirmations: "confirmations",
    confirmedAt: "confirmed_at",
    treasuryConfirmedAt: "treasury_confirmed_at",
    creditedAt: "credited_at",
    failedAt: "failed_at",
    failureReason: "failure_reason",
    sweepStatus: "sweep_status",
    sweepTxHash: "sweep_tx_hash",
  };
  const assignments = ["status = $1", "updated_at = CURRENT_TIMESTAMP"];
  const values = [status];

  Object.entries(extraFields).forEach(([key, value]) => {
    const column = allowedFields[key];

    if (!column) {
      return;
    }

    values.push(value);
    assignments.push(`${column} = $${values.length}`);
  });

  values.push(depositId);

  const result = await query(
    `
      UPDATE crypto_deposits
      SET ${assignments.join(", ")}
      WHERE id = $${values.length}
      RETURNING *
    `,
    values
  );

  return result.rows[0] || null;
};

const markConfirming = async (depositId, confirmations) => {
  return updateDepositStatus(depositId, DEPOSIT_STATUS.CONFIRMING, {
    confirmations,
  });
};

const markTreasuryConfirmed = async (depositId) => {
  return updateDepositStatus(depositId, DEPOSIT_STATUS.TREASURY_CONFIRMED, {
    treasuryConfirmedAt: new Date(),
  });
};

const markCredited = async (depositId) => {
  return updateDepositStatus(depositId, DEPOSIT_STATUS.CREDITED, {
    creditedAt: new Date(),
  });
};

const markFailed = async (depositId, failureReason) => {
  return updateDepositStatus(depositId, DEPOSIT_STATUS.FAILED, {
    failedAt: new Date(),
    failureReason,
  });
};

module.exports = {
  DEPOSIT_STATUS,
  updateDepositStatus,
  markConfirming,
  markTreasuryConfirmed,
  markCredited,
  markFailed,
};
