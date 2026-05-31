const Bet = require("../models/Bet");
const BetParticipant = require("../models/BetParticipant");
const User = require("../models/User");
const Wallet = require("../models/Wallet");

const normalizeResult = (result) => String(result || "").toUpperCase();

const handleAdminError = (res, error) => {
  console.error("Admin controller error:", {
    message: error.message,
    code: error.code,
  });

  return res.status(500).json({ error: error.message });
};

/**
 * Settle a locked bet, pay the winning participant, and record platform fee.
 *
 * @param {object} req - Express request with bet id in params and result in body.
 * @param {object} res - Express response used to return settlement details.
 * @returns {Promise<object>} Settlement response.
 */
const settleBet = async (req, res) => {
  const betId = req.params.id;
  const result = normalizeResult(req.body.result);

  if (!["A", "B"].includes(result)) {
    return res.status(400).json({ error: "Result must be A or B" });
  }

  try {
    const bet = await Bet.findById(betId);

    if (!bet) {
      return res.status(404).json({ error: "Bet not found" });
    }

    if (bet.status !== "LOCKED") {
      return res.status(400).json({ error: "Bet is not locked yet" });
    }

    const winner = await BetParticipant.getWinner(betId, result);

    if (!winner) {
      return res.status(400).json({ error: "No winner found for this outcome" });
    }

    const totalStakes = Number(bet.total_stakes);
    const payout = totalStakes * 0.9;
    const fee = totalStakes * 0.1;

    const updatedBet = await Bet.setResult(betId, result);
    const winnerUser = await User.findById(winner.user_id);

    await Wallet.updateBalance(winner.user_id, bet.currency, payout, "add");
    await Wallet.createTransaction(
      winner.user_id,
      "PAYOUT",
      payout,
      bet.currency,
      "COMPLETED",
      null,
      `Payout for bet: ${bet.topic}`
    );
    await Wallet.createTransaction(
      winner.user_id,
      "FEE",
      fee,
      bet.currency,
      "COMPLETED",
      null,
      `Platform fee for bet: ${bet.topic}`
    );

    return res.json({
      message: "Bet settled successfully",
      bet: updatedBet,
      winner: {
        user_id: winner.user_id,
        name: winner.user?.name || winnerUser?.name,
        payout,
      },
      platform_fee: fee,
    });
  } catch (error) {
    return handleAdminError(res, error);
  }
};

/**
 * Get bets for admin review, optionally filtered by status.
 *
 * @param {object} req - Express request with optional status query parameter.
 * @param {object} res - Express response used to return bets.
 * @returns {Promise<object>} JSON response with matching bets.
 */
const getAllBets = async (req, res) => {
  const { status } = req.query;

  try {
    const bets = status
      ? await Bet.findByStatus(status, 100)
      : await Bet.findByStatus("OPEN", 100);

    return res.json({ bets });
  } catch (error) {
    return handleAdminError(res, error);
  }
};

/**
 * Get a user and wallet by user id for admin review.
 *
 * @param {object} req - Express request with user id in params.
 * @param {object} res - Express response used to return user and wallet data.
 * @returns {Promise<object>} JSON response with user and wallet.
 */
const getUser = async (req, res) => {
  const userId = req.params.id;

  try {
    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    const wallet = await Wallet.getWalletByUserId(userId);

    return res.json({ user, wallet });
  } catch (error) {
    return handleAdminError(res, error);
  }
};

module.exports = {
  settleBet,
  getAllBets,
  getUser,
};
