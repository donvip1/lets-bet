const { query } = require("../config/database");

// Keep bet list queries bounded so API responses stay predictable.
const DEFAULT_BET_LIMIT = 50;
const MAX_BET_LIMIT = 100;

const normalizeLimit = (limit) => {
  const parsedLimit = Number.parseInt(limit, 10);

  if (!Number.isFinite(parsedLimit) || parsedLimit < 1) {
    return DEFAULT_BET_LIMIT;
  }

  return Math.min(parsedLimit, MAX_BET_LIMIT);
};

/**
 * Create a new betting market.
 *
 * @param {string} topic - Public title or question for the bet.
 * @param {string} outcomeA - First possible outcome.
 * @param {string} outcomeB - Second possible outcome.
 * @param {number|string} createdBy - User id of the bet creator.
 * @param {number|string} targetAmount - Total stake target for the bet.
 * @param {string} currency - Currency used for stakes.
 * @param {Date|string} deadline - Deadline for accepting stakes.
 * @param {string} category - Bet category.
 * @returns {Promise<object>} Created bet row.
 */
const createBet = async (
  topic,
  outcomeA,
  outcomeB,
  createdBy,
  targetAmount,
  currency,
  deadline,
  category
) => {
  try {
    const result = await query(
      `
        INSERT INTO bets (
          topic,
          outcome_a,
          outcome_b,
          created_by,
          target_amount,
          currency,
          deadline,
          category
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING *
      `,
      [
        topic,
        outcomeA,
        outcomeB,
        createdBy,
        targetAmount,
        currency,
        deadline,
        category,
      ]
    );

    return result.rows[0];
  } catch (err) {
    console.error("Create bet error:", {
      message: err.message,
      code: err.code,
    });
    throw err;
  }
};

/**
 * Find a bet by id and include creator display details.
 *
 * @param {number|string} betId - Bet id to search for.
 * @returns {Promise<object|null>} Matching bet row with creator fields, or null.
 */
const findById = async (betId) => {
  try {
    const result = await query(
      `
        SELECT
          b.*,
          u.name AS creator_name,
          u.email AS creator_email
        FROM bets b
        JOIN users u ON b.created_by = u.id
        WHERE b.id = $1
      `,
      [betId]
    );

    return result.rows[0] || null;
  } catch (err) {
    console.error("Find bet by id error:", {
      message: err.message,
      code: err.code,
    });
    throw err;
  }
};

/**
 * Find bets by status ordered from newest to oldest.
 *
 * @param {string} status - Bet status to filter by.
 * @param {number|string} [limit=50] - Maximum number of bets to return.
 * @returns {Promise<object[]>} Array of matching bet rows.
 */
const findByStatus = async (status, limit = DEFAULT_BET_LIMIT) => {
  try {
    const result = await query(
      `
        SELECT *
        FROM bets
        WHERE status = $1
        ORDER BY created_at DESC
        LIMIT $2
      `,
      [status, normalizeLimit(limit)]
    );

    return result.rows;
  } catch (err) {
    console.error("Find bets by status error:", {
      message: err.message,
      code: err.code,
    });
    throw err;
  }
};

/**
 * Update a bet status.
 *
 * @param {number|string} betId - Bet id to update.
 * @param {string} status - New bet status.
 * @returns {Promise<object|null>} Updated bet row, or null when no bet exists.
 */
const updateStatus = async (betId, status) => {
  try {
    const result = await query(
      `
        UPDATE bets
        SET status = $1
        WHERE id = $2
        RETURNING *
      `,
      [status, betId]
    );

    return result.rows[0] || null;
  } catch (err) {
    console.error("Update bet status error:", {
      message: err.message,
      code: err.code,
    });
    throw err;
  }
};

/**
 * Set a bet result and mark it settled.
 *
 * @param {number|string} betId - Bet id to settle.
 * @param {string} result - Winning result value.
 * @returns {Promise<object|null>} Settled bet row, or null when no bet exists.
 */
const setResult = async (betId, result) => {
  try {
    const updateResult = await query(
      `
        UPDATE bets
        SET result = $1, status = 'SETTLED'
        WHERE id = $2
        RETURNING *
      `,
      [result, betId]
    );

    return updateResult.rows[0] || null;
  } catch (err) {
    console.error("Set bet result error:", {
      message: err.message,
      code: err.code,
    });
    throw err;
  }
};

/**
 * Increase the total amount staked on a bet.
 *
 * @param {number|string} betId - Bet id to update.
 * @param {number|string} amount - Stake amount to add.
 * @returns {Promise<object|null>} Updated bet row, or null when no bet exists.
 */
const incrementTotalStakes = async (betId, amount) => {
  try {
    const result = await query(
      `
        UPDATE bets
        SET total_stakes = total_stakes + $1
        WHERE id = $2
        RETURNING *
      `,
      [amount, betId]
    );

    return result.rows[0] || null;
  } catch (err) {
    console.error("Increment total stakes error:", {
      message: err.message,
      code: err.code,
    });
    throw err;
  }
};

/**
 * Check whether a bet has reached or exceeded its target stake amount.
 *
 * @param {number|string} betId - Bet id to inspect.
 * @returns {Promise<boolean>} True when total_stakes is greater than or equal to target_amount.
 */
const checkIfFullyStaked = async (betId) => {
  try {
    const result = await query(
      `
        SELECT id, target_amount, total_stakes
        FROM bets
        WHERE id = $1
      `,
      [betId]
    );

    const bet = result.rows[0];

    if (!bet) {
      return false;
    }

    return Number(bet.total_stakes) >= Number(bet.target_amount);
  } catch (err) {
    console.error("Check fully staked error:", {
      message: err.message,
      code: err.code,
    });
    throw err;
  }
};

module.exports = {
  createBet,
  findById,
  findByStatus,
  updateStatus,
  setResult,
  incrementTotalStakes,
  checkIfFullyStaked,
};
