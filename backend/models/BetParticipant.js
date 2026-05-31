const { query } = require("../config/database");
const Bet = require("./Bet");

const normalizeOutcome = (outcome) => String(outcome || "").toUpperCase();

/**
 * Join a user to a bet, update the bet's total stakes, and lock it when fully staked.
 *
 * @param {number|string} betId - Bet id the user wants to join.
 * @param {number|string} userId - User id joining the bet.
 * @param {string} outcome - Outcome selected by the user.
 * @param {number|string} stakeAmount - Amount staked by the user.
 * @returns {Promise<object>} Created bet participant row.
 * @throws {Error} Throws when the user has already joined the bet.
 */
const joinBet = async (betId, userId, outcome, stakeAmount) => {
  const selectedOutcome = normalizeOutcome(outcome);

  if (!["A", "B"].includes(selectedOutcome)) {
    throw new Error("Invalid bet outcome");
  }

  try {
    const existingParticipant = await query(
      `
        SELECT *
        FROM bet_participants
        WHERE bet_id = $1 AND user_id = $2
      `,
      [betId, userId]
    );

    if (existingParticipant.rows[0]) {
      throw new Error("You already joined this bet");
    }

    // Store the user's selected outcome and stake before updating bet totals.
    const participantResult = await query(
      `
        INSERT INTO bet_participants (
          bet_id,
          user_id,
          outcome,
          stake_amount
        )
        VALUES ($1, $2, $3, $4)
        RETURNING *
      `,
      [betId, userId, selectedOutcome, stakeAmount]
    );

    const participant = participantResult.rows[0];

    await Bet.incrementTotalStakes(betId, stakeAmount);

    const isFullyStaked = await Bet.checkIfFullyStaked(betId);

    if (isFullyStaked) {
      await Bet.updateStatus(betId, "LOCKED");
    }

    return participant;
  } catch (err) {
    console.error("Join bet error:", {
      message: err.message,
      code: err.code,
    });
    throw err;
  }
};

/**
 * Get all participants for a bet with basic user profile information.
 *
 * @param {number|string} betId - Bet id whose participants should be returned.
 * @returns {Promise<object[]>} Participant rows with user name and email.
 */
const findByBetId = async (betId) => {
  try {
    const result = await query(
      `
        SELECT bp.*, u.name, u.email
        FROM bet_participants bp
        JOIN users u ON bp.user_id = u.id
        WHERE bp.bet_id = $1
      `,
      [betId]
    );

    return result.rows;
  } catch (err) {
    console.error("Find participants by bet id error:", {
      message: err.message,
      code: err.code,
    });
    throw err;
  }
};

/**
 * Get all bets joined by a user with the related bet summary fields.
 *
 * @param {number|string} userId - User id whose joined bets should be returned.
 * @returns {Promise<object[]>} Joined bet participant rows ordered newest first.
 */
const findByUserId = async (userId) => {
  try {
    const result = await query(
      `
        SELECT
          bp.*,
          b.topic,
          b.outcome_a,
          b.outcome_b,
          b.status,
          b.total_stakes,
          b.currency,
          b.deadline
        FROM bet_participants bp
        JOIN bets b ON bp.bet_id = b.id
        WHERE bp.user_id = $1
        ORDER BY bp.created_at DESC
      `,
      [userId]
    );

    return result.rows;
  } catch (err) {
    console.error("Find participants by user id error:", {
      message: err.message,
      code: err.code,
    });
    throw err;
  }
};

/**
 * Get the participant who selected the winning result for a bet.
 *
 * @param {number|string} betId - Bet id to inspect.
 * @param {string} result - Winning outcome/result value.
 * @returns {Promise<object|null>} Winning participant row, or null when no match exists.
 */
const getWinner = async (betId, result) => {
  try {
    const winnerResult = await query(
      `
        SELECT bp.*, u.name, u.email
        FROM bet_participants bp
        JOIN users u ON bp.user_id = u.id
        WHERE bp.bet_id = $1 AND bp.outcome = $2
        LIMIT 1
      `,
      [betId, normalizeOutcome(result)]
    );

    return winnerResult.rows[0] || null;
  } catch (err) {
    console.error("Get bet winner error:", {
      message: err.message,
      code: err.code,
    });
    throw err;
  }
};

module.exports = {
  joinBet,
  findByBetId,
  findByUserId,
  getWinner,
};
