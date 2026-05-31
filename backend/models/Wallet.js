const { pool, query } = require("../config/database");

// Only these wallet balance columns can be updated through updateBalance.
const BALANCE_COLUMNS = {
  ngn: "balance_ngn",
  usd: "balance_usd",
  btc: "balance_btc",
  eth: "balance_eth",
};

// Limit transaction history queries to a reasonable range for API responses.
const DEFAULT_TRANSACTION_LIMIT = 10;
const MAX_TRANSACTION_LIMIT = 100;

const normalizeCurrency = (currency) => String(currency || "").toLowerCase();

const normalizeOperation = (operation) => String(operation || "").toLowerCase();

const normalizeLimit = (limit) => {
  const parsedLimit = Number.parseInt(limit, 10);

  if (!Number.isFinite(parsedLimit) || parsedLimit < 1) {
    return DEFAULT_TRANSACTION_LIMIT;
  }

  return Math.min(parsedLimit, MAX_TRANSACTION_LIMIT);
};

/**
 * Get a wallet by the owning user id.
 *
 * @param {number|string} userId - User id attached to the wallet.
 * @returns {Promise<object|null>} Wallet row when found, otherwise null.
 */
const getWalletByUserId = async (userId) => {
  try {
    const result = await query(
      `
        SELECT *
        FROM wallets
        WHERE user_id = $1
      `,
      [userId]
    );

    return result.rows[0] || null;
  } catch (err) {
    console.error("Get wallet error:", {
      message: err.message,
      code: err.code,
    });
    throw err;
  }
};

/**
 * Add to or subtract from a user's wallet balance for a supported currency.
 *
 * @param {number|string} userId - User id attached to the wallet.
 * @param {"ngn"|"usd"|"btc"|"eth"} currency - Balance currency to update.
 * @param {number|string} amount - Amount to add or subtract.
 * @param {"add"|"subtract"} operation - Balance operation to apply.
 * @returns {Promise<object|null>} Updated wallet row, or null when no wallet exists.
 */
const updateBalance = async (userId, currency, amount, operation) => {
  const normalizedCurrency = normalizeCurrency(currency);
  const balanceColumn = BALANCE_COLUMNS[normalizedCurrency];
  const normalizedOperation = normalizeOperation(operation);

  if (!balanceColumn) {
    throw new Error("Invalid wallet currency");
  }

  if (!["add", "subtract"].includes(normalizedOperation)) {
    throw new Error("Invalid wallet operation");
  }

  const numericAmount = Number(amount);

  if (!Number.isFinite(numericAmount) || numericAmount < 0) {
    throw new Error("Invalid wallet amount");
  }

  const operator = normalizedOperation === "add" ? "+" : "-";
  const client = await pool.connect();

  try {
    await client.query(`BEGIN`);

    // The column name is whitelisted above; amount and userId remain parameterized.
    const result = await client.query(
      `
        UPDATE wallets
        SET ${balanceColumn} = ${balanceColumn} ${operator} $1
        WHERE user_id = $2
        RETURNING *
      `,
      [amount, userId]
    );

    await client.query(`COMMIT`);

    return result.rows[0] || null;
  } catch (err) {
    try {
      await client.query(`ROLLBACK`);
    } catch (rollbackErr) {
      console.error("Wallet balance rollback failed:", rollbackErr);
    }

    console.error("Update wallet balance error:", {
      message: err.message,
      code: err.code,
    });
    throw err;
  } finally {
    client.release();
  }
};

/**
 * Create a wallet transaction record for deposits, withdrawals, bets, or payouts.
 *
 * @param {number|string} userId - User id that owns the transaction.
 * @param {string} type - Transaction type such as deposit, withdrawal, bet, or payout.
 * @param {number|string} amount - Transaction amount.
 * @param {string} currency - Transaction currency.
 * @param {string} status - Processing status for the transaction.
 * @param {string} reference - External or internal transaction reference.
 * @param {string} description - Human-readable transaction description.
 * @returns {Promise<object>} Created transaction row.
 */
const createTransaction = async (
  userId,
  type,
  amount,
  currency,
  status,
  reference,
  description
) => {
  try {
    const result = await query(
      `
        INSERT INTO transactions (
          user_id,
          type,
          amount,
          currency,
          status,
          reference,
          description
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING *
      `,
      [userId, type, amount, currency, status, reference, description]
    );

    return result.rows[0];
  } catch (err) {
    console.error("Create transaction error:", {
      message: err.message,
      code: err.code,
    });
    throw err;
  }
};

/**
 * Find one transaction for a user by external/internal reference.
 *
 * @param {number|string} userId - User id that owns the transaction.
 * @param {string} reference - Transaction reference to look up.
 * @returns {Promise<object|null>} Matching transaction row, or null.
 */
const findTransactionByReference = async (userId, reference) => {
  try {
    const result = await query(
      `
        SELECT *
        FROM transactions
        WHERE user_id = $1 AND reference = $2
        ORDER BY created_at DESC
        LIMIT 1
      `,
      [userId, reference]
    );

    return result.rows[0] || null;
  } catch (err) {
    console.error("Find transaction by reference error:", {
      message: err.message,
      code: err.code,
    });
    throw err;
  }
};

/**
 * Update a transaction status and optional reference after mock/live processing.
 *
 * @param {number|string} transactionId - Transaction id to update.
 * @param {string} status - New transaction status.
 * @param {string|null} reference - Optional updated reference.
 * @returns {Promise<object|null>} Updated transaction row, or null.
 */
const updateTransactionStatus = async (
  transactionId,
  status,
  reference = null
) => {
  try {
    const result = await query(
      `
        UPDATE transactions
        SET
          status = $1,
          reference = COALESCE($2, reference)
        WHERE id = $3
        RETURNING *
      `,
      [status, reference, transactionId]
    );

    return result.rows[0] || null;
  } catch (err) {
    console.error("Update transaction status error:", {
      message: err.message,
      code: err.code,
    });
    throw err;
  }
};

/**
 * Get recent wallet transactions for a user.
 *
 * @param {number|string} userId - User id whose transactions should be returned.
 * @param {number|string} [limit=10] - Maximum number of transactions to return.
 * @returns {Promise<object[]>} Transaction rows ordered from newest to oldest.
 */
const getTransactions = async (userId, limit = DEFAULT_TRANSACTION_LIMIT) => {
  try {
    const result = await query(
      `
        SELECT *
        FROM transactions
        WHERE user_id = $1
        ORDER BY created_at DESC
        LIMIT $2
      `,
      [userId, normalizeLimit(limit)]
    );

    return result.rows;
  } catch (err) {
    console.error("Get transactions error:", {
      message: err.message,
      code: err.code,
    });
    throw err;
  }
};

module.exports = {
  getWalletByUserId,
  updateBalance,
  createTransaction,
  findTransactionByReference,
  updateTransactionStatus,
  getTransactions,
};
