const Wallet = require("../models/Wallet");

const SUPPORTED_CURRENCIES = new Set(["ngn", "usd", "btc", "eth"]);
const FIAT_CURRENCIES = new Set(["ngn", "usd"]);

const normalizeCurrency = (currency) => String(currency || "").toLowerCase();

const toCurrencyCode = (currency) => normalizeCurrency(currency).toUpperCase();

const parsePositiveAmount = (value) => {
  const amount = Number(value);
  return Number.isFinite(amount) && amount > 0 ? amount : null;
};

const getWalletBalance = (wallet, currency) => {
  return Number(wallet[`balance_${currency}`] || 0);
};

const handleControllerError = (res, error) => {
  console.error("Wallet controller error:", {
    message: error.message,
    code: error.code,
  });

  return res.status(500).json({ error: error.message });
};

/**
 * Return the authenticated user's wallet balances.
 *
 * @param {object} req - Express request with req.user.id from auth middleware.
 * @param {object} res - Express response used to return wallet balances.
 * @returns {Promise<object>} JSON response with supported currency balances.
 */
const getBalance = async (req, res) => {
  try {
    const userId = req.user.id;
    const wallet = await Wallet.getWalletByUserId(userId);

    if (!wallet) {
      return res.status(404).json({ error: "Wallet not found" });
    }

    return res.json({
      balance_ngn: wallet.balance_ngn,
      balance_usd: wallet.balance_usd,
      balance_btc: wallet.balance_btc,
      balance_eth: wallet.balance_eth,
    });
  } catch (error) {
    return handleControllerError(res, error);
  }
};

/**
 * Create a pending deposit transaction and return the next payment instruction.
 *
 * @param {object} req - Express request with amount and currency in req.body.
 * @param {object} res - Express response used to return payment details.
 * @returns {Promise<object>} JSON response with transaction id and payment data.
 */
const deposit = async (req, res) => {
  const { amount, currency } = req.body;
  const userId = req.user.id;
  const normalizedCurrency = normalizeCurrency(currency);
  const currencyCode = toCurrencyCode(currency);
  const numericAmount = parsePositiveAmount(amount);

  if (!numericAmount) {
    return res.status(400).json({ error: "Amount must be greater than 0" });
  }

  if (!SUPPORTED_CURRENCIES.has(normalizedCurrency)) {
    return res.status(400).json({ error: "Invalid currency" });
  }

  try {
    const transaction = await Wallet.createTransaction(
      userId,
      "DEPOSIT",
      numericAmount,
      currencyCode,
      "PENDING",
      null,
      "Deposit request"
    );

    if (FIAT_CURRENCIES.has(normalizedCurrency)) {
      return res.json({
        transaction_id: transaction.id,
        payment_url: "https://flutterwave.com/payment/...",
      });
    }

    return res.json({
      transaction_id: transaction.id,
      deposit_address: "bc1q...",
    });
  } catch (error) {
    return handleControllerError(res, error);
  }
};

/**
 * Submit a withdrawal request after deducting the requested amount.
 *
 * @param {object} req - Express request with amount, currency, and destination in req.body.
 * @param {object} res - Express response used to return withdrawal submission status.
 * @returns {Promise<object>} JSON response with transaction id and status message.
 */
const withdraw = async (req, res) => {
  const { amount, currency, destination } = req.body;
  const userId = req.user.id;
  const normalizedCurrency = normalizeCurrency(currency);
  const currencyCode = toCurrencyCode(currency);
  const numericAmount = parsePositiveAmount(amount);

  if (!numericAmount) {
    return res.status(400).json({ error: "Amount must be greater than 0" });
  }

  if (!SUPPORTED_CURRENCIES.has(normalizedCurrency)) {
    return res.status(400).json({ error: "Invalid currency" });
  }

  if (!destination) {
    return res.status(400).json({ error: "Withdrawal destination is required" });
  }

  try {
    const wallet = await Wallet.getWalletByUserId(userId);

    if (!wallet) {
      return res.status(404).json({ error: "Wallet not found" });
    }

    if (getWalletBalance(wallet, normalizedCurrency) < numericAmount) {
      return res.status(400).json({ error: "Insufficient balance" });
    }

    await Wallet.updateBalance(userId, normalizedCurrency, numericAmount, "subtract");

    const transaction = await Wallet.createTransaction(
      userId,
      "WITHDRAWAL",
      numericAmount,
      currencyCode,
      "PENDING",
      null,
      `Withdrawal to ${destination}`
    );

    return res.json({
      transaction_id: transaction.id,
      message: "Withdrawal request submitted",
    });
  } catch (error) {
    return handleControllerError(res, error);
  }
};

/**
 * Return recent wallet transactions for the authenticated user.
 *
 * @param {object} req - Express request with req.user.id and optional req.query.limit.
 * @param {object} res - Express response used to return transactions.
 * @returns {Promise<object>} JSON response with transaction history.
 */
const getTransactions = async (req, res) => {
  try {
    const userId = req.user.id;
    const { limit = 10 } = req.query;
    const transactions = await Wallet.getTransactions(userId, limit);

    return res.json({ transactions });
  } catch (error) {
    return handleControllerError(res, error);
  }
};

module.exports = {
  getBalance,
  deposit,
  withdraw,
  getTransactions,
};
