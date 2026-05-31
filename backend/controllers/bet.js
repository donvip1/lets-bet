const Bet = require("../models/Bet");
const BetParticipant = require("../models/BetParticipant");
const Wallet = require("../models/Wallet");
const AIInsights = require("../services/ai-insights");

const SUPPORTED_CURRENCIES = new Set(["ngn", "usd", "btc", "eth"]);
const ACTIVE_STATUSES = new Set(["OPEN", "LOCKED"]);
const COMPLETED_STATUSES = new Set(["SETTLED", "CANCELLED"]);

const normalizeCurrency = (currency) => String(currency || "").toLowerCase();

const toCurrencyCode = (currency) => normalizeCurrency(currency).toUpperCase();

const parsePositiveAmount = (value) => {
  const amount = Number(value);
  return Number.isFinite(amount) && amount > 0 ? amount : null;
};

const getBalanceColumn = (currency) => `balance_${currency}`;

const getWalletBalance = (wallet, currency) => {
  return Number(wallet[getBalanceColumn(currency)] || 0);
};

const hasRequiredBetFields = ({
  topic,
  outcomeA,
  outcomeB,
  targetAmount,
  currency,
  deadline,
  category,
}) => {
  return Boolean(
    topic && outcomeA && outcomeB && targetAmount && currency && deadline && category
  );
};

const normalizeOutcome = (outcome) => String(outcome || "").toUpperCase();

const isValidOutcome = (outcome) => ["A", "B"].includes(normalizeOutcome(outcome));

const handleControllerError = (res, error) => {
  console.error("Bet controller error:", {
    message: error.message,
    code: error.code,
  });

  return res.status(500).json({ error: error.message });
};

/**
 * Create a new bet, deduct the creator's minimum stake, and join the creator.
 *
 * @param {object} req - Express request with bet details in req.body and req.user.id.
 * @param {object} res - Express response used to return the created bet.
 * @returns {Promise<object>} JSON response with the created bet.
 */
const createBet = async (req, res) => {
  const {
    topic,
    outcomeA,
    outcomeB,
    targetAmount,
    currency,
    deadline,
    category,
  } = req.body;
  const userId = req.user.id;
  const normalizedCurrency = normalizeCurrency(currency);
  const currencyCode = toCurrencyCode(currency);
  const numericTargetAmount = parsePositiveAmount(targetAmount);
  const deadlineDate = new Date(deadline);

  if (!hasRequiredBetFields(req.body)) {
    return res.status(400).json({ error: "All bet fields are required" });
  }

  if (!numericTargetAmount) {
    return res.status(400).json({ error: "Target amount must be greater than 0" });
  }

  if (!SUPPORTED_CURRENCIES.has(normalizedCurrency)) {
    return res.status(400).json({ error: "Invalid currency" });
  }

  if (Number.isNaN(deadlineDate.getTime()) || deadlineDate <= new Date()) {
    return res.status(400).json({ error: "Deadline must be in the future" });
  }

  const minStake = numericTargetAmount * 0.1;
  let stakeDeducted = false;

  try {
    const wallet = await Wallet.getWalletByUserId(userId);

    if (!wallet) {
      return res.status(404).json({ error: "Wallet not found" });
    }

    if (getWalletBalance(wallet, normalizedCurrency) < minStake) {
      return res.status(400).json({ error: "Insufficient balance" });
    }

    await Wallet.updateBalance(userId, normalizedCurrency, minStake, "subtract");
    stakeDeducted = true;

    const bet = await Bet.createBet(
      topic,
      outcomeA,
      outcomeB,
      userId,
      numericTargetAmount,
      currencyCode,
      deadlineDate,
      category
    );

    await BetParticipant.joinBet(bet.id, userId, "A", minStake);
    await Wallet.createTransaction(
      userId,
      "BET_STAKE",
      minStake,
      currencyCode,
      "COMPLETED",
      null,
      `Stake for bet: ${topic}`
    );

    return res.status(201).json({ bet });
  } catch (error) {
    // Refund the creator if a later bet creation step fails after wallet deduction.
    if (stakeDeducted) {
      try {
        await Wallet.updateBalance(userId, normalizedCurrency, minStake, "add");
      } catch (refundError) {
        console.error("Create bet stake refund failed:", refundError);
      }
    }

    return handleControllerError(res, error);
  }
};

/**
 * Join an open bet and deduct the user's stake from their wallet.
 *
 * @param {object} req - Express request with bet id in params, stake details in body, and req.user.id.
 * @param {object} res - Express response used to return the participant.
 * @returns {Promise<object>} JSON response with the created participant.
 */
const joinBet = async (req, res) => {
  const betId = req.params.id;
  const { outcome, stakeAmount } = req.body;
  const userId = req.user.id;
  const numericStakeAmount = parsePositiveAmount(stakeAmount);
  let stakeDeducted = false;
  let normalizedCurrency;

  if (!outcome || !numericStakeAmount) {
    return res
      .status(400)
      .json({ error: "Outcome and a positive stake amount are required" });
  }

  try {
    const bet = await Bet.findById(betId);

    if (!bet) {
      return res.status(404).json({ error: "Bet not found" });
    }

    if (bet.status !== "OPEN") {
      return res.status(400).json({ error: "Bet is not open for joining" });
    }

    if (!isValidOutcome(outcome)) {
      return res.status(400).json({ error: "Invalid bet outcome" });
    }

    normalizedCurrency = normalizeCurrency(bet.currency);
    const currencyCode = toCurrencyCode(bet.currency);

    const wallet = await Wallet.getWalletByUserId(userId);

    if (!wallet) {
      return res.status(404).json({ error: "Wallet not found" });
    }

    if (getWalletBalance(wallet, normalizedCurrency) < numericStakeAmount) {
      return res.status(400).json({ error: "Insufficient balance" });
    }

    await Wallet.updateBalance(
      userId,
      normalizedCurrency,
      numericStakeAmount,
      "subtract"
    );
    stakeDeducted = true;

    const participant = await BetParticipant.joinBet(
      betId,
      userId,
      normalizeOutcome(outcome),
      numericStakeAmount
    );

    await Wallet.createTransaction(
      userId,
      "BET_STAKE",
      numericStakeAmount,
      currencyCode,
      "COMPLETED",
      null,
      `Stake for bet: ${bet.topic}`
    );

    return res.status(201).json({ participant });
  } catch (error) {
    if (stakeDeducted) {
      try {
        await Wallet.updateBalance(
          userId,
          normalizedCurrency,
          numericStakeAmount,
          "add"
        );
      } catch (refundError) {
        console.error("Join bet stake refund failed:", refundError);
      }
    }

    if (error.message === "You already joined this bet") {
      return res.status(409).json({ error: error.message });
    }

    return handleControllerError(res, error);
  }
};

/**
 * Get a bet by id with all participants.
 *
 * @param {object} req - Express request with bet id in req.params.id.
 * @param {object} res - Express response used to return bet details.
 * @returns {Promise<object>} JSON response with bet and participants.
 */
const getBetById = async (req, res) => {
  try {
    const betId = req.params.id;
    const bet = await Bet.findById(betId);

    if (!bet) {
      return res.status(404).json({ error: "Bet not found" });
    }

    const participants = await BetParticipant.findByBetId(betId);

    return res.json({ bet, participants });
  } catch (error) {
    return handleControllerError(res, error);
  }
};

/**
 * Get currently open bets for the trending feed.
 *
 * @param {object} req - Express request object.
 * @param {object} res - Express response used to return open bets.
 * @returns {Promise<object>} JSON response with open bets.
 */
const getTrendingBets = async (req, res) => {
  try {
    const dbBets = await Bet.findByStatus("OPEN", 20);
    const aiSuggestions = await AIInsights.getTrendingBetsFromAI();

    const combinedBets = [
      ...dbBets.map((bet) => ({ ...bet, source: "database" })),
      ...aiSuggestions.map((suggestion) => ({
        id: `ai-${Math.random().toString(36).substr(2, 9)}`,
        topic: suggestion.topic,
        outcome_a: suggestion.outcome_a,
        outcome_b: suggestion.outcome_b,
        total_stakes: 0,
        currency: "NGN",
        status: "OPEN",
        category: suggestion.category,
        deadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        source: "ai",
        ai_confidence_score: suggestion.confidence_score,
      })),
    ];

    combinedBets.sort((a, b) => {
      if (a.source === "database" && b.source === "database") {
        return Number(b.total_stakes) - Number(a.total_stakes);
      }

      if (a.source === "ai" && b.source === "ai") {
        return (b.ai_confidence_score || 0) - (a.ai_confidence_score || 0);
      }

      return a.source === "database" ? -1 : 1;
    });

    return res.json({ bets: combinedBets.slice(0, 30) });
  } catch (error) {
    console.error("Error in getTrendingBets:", error);
    return res.status(500).json({ error: "Failed to fetch trending bets" });
  }
};

/**
 * Get the authenticated user's bets grouped into active and completed lists.
 *
 * @param {object} req - Express request with req.user.id from auth middleware.
 * @param {object} res - Express response used to return grouped bets.
 * @returns {Promise<object>} JSON response with active and completed arrays.
 */
const getMyBets = async (req, res) => {
  try {
    const userId = req.user.id;
    const bets = await BetParticipant.findByUserId(userId);

    const groupedBets = bets.reduce(
      (groups, bet) => {
        if (ACTIVE_STATUSES.has(bet.status)) {
          groups.active.push(bet);
        } else if (COMPLETED_STATUSES.has(bet.status)) {
          groups.completed.push(bet);
        }

        return groups;
      },
      { active: [], completed: [] }
    );

    return res.json(groupedBets);
  } catch (error) {
    return handleControllerError(res, error);
  }
};

/**
 * Settle a bet, pay the winner, and record payout/platform fee transactions.
 *
 * @param {object} req - Express request with bet id in params and result in body.
 * @param {object} res - Express response used to return settlement details.
 * @returns {Promise<object>} JSON response with settled bet, winner, and payout.
 */
const settleBet = async (req, res) => {
  const betId = req.params.id;
  const { result } = req.body;

  if (!["A", "B"].includes(result)) {
    return res.status(400).json({ error: "Result must be A or B" });
  }

  try {
    const currentBet = await Bet.findById(betId);

    if (!currentBet) {
      return res.status(404).json({ error: "Bet not found" });
    }

    const winner = await BetParticipant.getWinner(betId, result);

    if (!winner) {
      return res.status(400).json({ error: "No winner found" });
    }

    const bet = await Bet.setResult(betId, result);
    const totalStakes = Number(bet.total_stakes);
    const payout = totalStakes * 0.9;
    const fee = totalStakes * 0.1;
    const currency = normalizeCurrency(bet.currency);

    await Wallet.updateBalance(winner.user_id, currency, payout, "add");
    await Wallet.createTransaction(
      winner.user_id,
      "PAYOUT",
      payout,
      toCurrencyCode(currency),
      "COMPLETED",
      null,
      `Payout for bet: ${bet.topic}`
    );
    await Wallet.createTransaction(
      null,
      "FEE",
      fee,
      toCurrencyCode(currency),
      "COMPLETED",
      null,
      `Platform fee for bet: ${bet.topic}`
    );

    return res.json({ bet, winner, payout });
  } catch (error) {
    return handleControllerError(res, error);
  }
};

module.exports = {
  createBet,
  joinBet,
  getBetById,
  getTrendingBets,
  getMyBets,
  settleBet,
};
