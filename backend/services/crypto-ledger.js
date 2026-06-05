'use strict';

/*********************************************************
 Author:                Philip Awazie Donvip
 Year Created:          2026
 Description:           Immutable crypto ledger entry helpers.
 Modified By:           Philip Awazie Donvip
 Modified Date:         2026-06-05
 Modification Notes:    Added append-only ledger creation for crypto deposits and withdrawals.
*********************************************************/

// ========================================================
// Imports and ledger service setup
// ========================================================

const { pool } = require("../config/database");

const getUserCryptoBalance = async (client, userId, currency) => {
  const result = await client.query(
    `
      SELECT balance_after
      FROM crypto_ledger_entries
      WHERE user_id = $1 AND currency = $2
      ORDER BY created_at DESC, processed_at DESC
      LIMIT 1
    `,
    [userId, currency]
  );

  return result.rows[0] ? Number(result.rows[0].balance_after) : null;
};

const createEntry = async ({
  userId,
  entryType,
  direction,
  amount,
  currency,
  network,
  referenceType,
  referenceId,
  description,
  metadata = {},
  idempotencyKey,
  fallbackBalanceBefore,
}) => {
  const client = await pool.connect();
  const numericAmount = Number(amount);

  if (!Number.isFinite(numericAmount) || numericAmount < 0) {
    throw new Error("Ledger amount must be a non-negative number");
  }

  try {
    await client.query("BEGIN");

    const latestBalance = await getUserCryptoBalance(client, userId, currency);
    const fallbackBalance = Number(fallbackBalanceBefore || 0);
    const balanceBefore =
      latestBalance === null && Number.isFinite(fallbackBalance)
        ? fallbackBalance
        : latestBalance || 0;
    const balanceAfter =
      direction === "IN"
        ? balanceBefore + numericAmount
        : balanceBefore - numericAmount;

    if (balanceAfter < 0) {
      throw new Error("Insufficient crypto ledger balance");
    }

    const result = await client.query(
      `
        INSERT INTO crypto_ledger_entries (
          user_id,
          entry_type,
          direction,
          amount,
          currency,
          network,
          balance_before,
          balance_after,
          reference_type,
          reference_id,
          description,
          metadata,
          idempotency_key
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
        ON CONFLICT (idempotency_key) DO NOTHING
        RETURNING *
      `,
      [
        userId,
        entryType,
        direction,
        numericAmount,
        currency,
        network,
        balanceBefore,
        balanceAfter,
        referenceType,
        referenceId,
        description,
        metadata,
        idempotencyKey,
      ]
    );

    await client.query("COMMIT");

    return result.rows[0] || null;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
};

module.exports = {
  createEntry,
};
