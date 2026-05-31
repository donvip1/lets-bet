const Wallet = require("../models/Wallet");
const User = require("../models/User");
const flutterwave = require("../services/flutterwave");

const SUPPORTED_CURRENCIES = new Set(["NGN", "USD", "BTC", "ETH"]);
const FIAT_CURRENCIES = new Set(["NGN", "USD"]);
const CRYPTO_CURRENCIES = new Set(["BTC", "ETH"]);
const isMockPaymentMode = process.env.FLUTTERWAVE_ENV !== "live";

const normalizeCurrency = (currency) => String(currency || "").toUpperCase();

const parsePositiveAmount = (amount) => {
  const numericAmount = Number(amount);
  return Number.isFinite(numericAmount) && numericAmount > 0
    ? numericAmount
    : null;
};

const getWalletBalance = (wallet, currency) => {
  return Number(wallet[`balance_${currency.toLowerCase()}`] || 0);
};

const extractBankCode = (destination) => {
  if (typeof destination === "object" && destination !== null) {
    return destination.bank_code || destination.account_bank || "MOCK_BANK";
  }

  return "MOCK_BANK";
};

const extractAccountNumber = (destination) => {
  if (typeof destination === "object" && destination !== null) {
    return destination.account_number || destination.accountNumber || "";
  }

  return String(destination || "");
};

const isValidDestination = (destination) => {
  const accountNumber = extractAccountNumber(destination);
  return accountNumber.trim().length >= 5;
};

const isValidWalletAddress = (address) => {
  return typeof address === "string" && address.trim().length >= 10;
};

const completeTransactionLater = (transactionId, reference = null) => {
  if (!isMockPaymentMode) {
    return;
  }

  // MOCK PAYMENT MODE: Simulate processor settlement after a short delay.
  setTimeout(async () => {
    try {
      await Wallet.updateTransactionStatus(transactionId, "COMPLETED", reference);
    } catch (error) {
      console.error("Mock transaction completion failed:", error.message);
    }
  }, 5000);
};

const handlePaymentError = (res, error) => {
  console.error("Payment controller error:", {
    message: error.message,
    code: error.code,
  });

  return res.status(500).json({ error: error.message });
};

async function initiateDeposit(req, res) {
  const userId = req.user.id;
  const { amount, currency } = req.body;
  const numericAmount = parsePositiveAmount(amount);
  const currencyCode = normalizeCurrency(currency);

  if (!numericAmount) {
    return res.status(400).json({ error: "Amount must be greater than 0" });
  }

  if (!SUPPORTED_CURRENCIES.has(currencyCode)) {
    return res.status(400).json({ error: "Invalid currency" });
  }

  try {
    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    const txRef = `deposit_${userId}_${Date.now()}`;
    const transaction = await Wallet.createTransaction(
      userId,
      "DEPOSIT",
      numericAmount,
      currencyCode,
      "PENDING",
      txRef,
      `Deposit request via ${CRYPTO_CURRENCIES.has(currencyCode) ? "crypto" : "card"}`
    );

    if (CRYPTO_CURRENCIES.has(currencyCode)) {
      // MOCK PAYMENT MODE: Replace this with a real crypto processor invoice/address.
      return res.json({
        transaction_id: transaction.id,
        payment_url: null,
        wallet_address: `mock_crypto_address_${currencyCode.toLowerCase()}`,
        qr_code: null,
        tx_ref: txRef,
      });
    }

    const response = await flutterwave.initializePayment({
      amount: numericAmount,
      currency: currencyCode,
      email: user.email,
      name: user.name,
      redirect_url: "http://localhost:3000/wallet",
      tx_ref: txRef,
    });

    return res.json({
      transaction_id: transaction.id,
      payment_url: response.link,
      tx_ref: response.tx_ref || txRef,
    });
  } catch (error) {
    return handlePaymentError(res, error);
  }
}

async function verifyDeposit(req, res) {
  const userId = req.user.id;
  const txRef = req.body.tx_ref || req.query.tx_ref;

  if (!txRef) {
    return res.status(400).json({ error: "tx_ref is required" });
  }

  try {
    const payment = await flutterwave.verifyPayment(txRef);
    const transaction = await Wallet.findTransactionByReference(userId, txRef);

    if (payment.status !== "successful") {
      if (transaction) {
        await Wallet.updateTransactionStatus(transaction.id, "FAILED");
      }

      return res.json({ success: false, message: "Payment failed" });
    }

    const amount = transaction ? Number(transaction.amount) : Number(payment.amount);
    const currency = transaction
      ? normalizeCurrency(transaction.currency)
      : normalizeCurrency(payment.currency);

    if (!SUPPORTED_CURRENCIES.has(currency) || !amount) {
      return res.status(400).json({ error: "Invalid payment verification data" });
    }

    if (transaction?.status === "COMPLETED") {
      return res.json({
        success: true,
        message: "Deposit already verified",
        amount,
        currency,
      });
    }

    await Wallet.updateBalance(userId, currency.toLowerCase(), amount, "add");

    if (transaction) {
      await Wallet.updateTransactionStatus(transaction.id, "COMPLETED");
    } else {
      await Wallet.createTransaction(
        userId,
        "DEPOSIT",
        amount,
        currency,
        "COMPLETED",
        txRef,
        "Verified deposit"
      );
    }

    return res.json({
      success: true,
      message: "Deposit successful",
      amount,
      currency,
    });
  } catch (error) {
    return handlePaymentError(res, error);
  }
}

async function initiateWithdrawal(req, res) {
  const userId = req.user.id;
  const { amount, currency, destination } = req.body;
  const numericAmount = parsePositiveAmount(amount);
  const currencyCode = normalizeCurrency(currency);

  if (!numericAmount) {
    return res.status(400).json({ error: "Amount must be greater than 0" });
  }

  if (!FIAT_CURRENCIES.has(currencyCode)) {
    return res.status(400).json({ error: "Invalid withdrawal currency" });
  }

  if (!isValidDestination(destination)) {
    return res.status(400).json({ error: "Valid withdrawal destination is required" });
  }

  try {
    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    // MOCK PAYMENT MODE: Allow withdrawal testing before real KYC verification exists.
    // LIVE PAYMENT MODE: Keep KYC enforcement before allowing real money payouts.
    if (!isMockPaymentMode && user.kyc_status !== "verified") {
      return res.status(403).json({ error: "KYC verification required" });
    }

    const wallet = await Wallet.getWalletByUserId(userId);

    if (!wallet) {
      return res.status(404).json({ error: "Wallet not found" });
    }

    if (getWalletBalance(wallet, currencyCode) < numericAmount) {
      return res.status(400).json({ error: "Insufficient balance" });
    }

    await Wallet.updateBalance(
      userId,
      currencyCode.toLowerCase(),
      numericAmount,
      "subtract"
    );

    const transaction = await Wallet.createTransaction(
      userId,
      "WITHDRAWAL",
      numericAmount,
      currencyCode,
      "PENDING",
      null,
      `Bank withdrawal to ${extractAccountNumber(destination)}`
    );

    const transfer = await flutterwave.initiateTransfer({
      account_bank: extractBankCode(destination),
      account_number: extractAccountNumber(destination),
      amount: numericAmount,
      currency: currencyCode,
      narrative: "Withdrawal from Lets Bet",
    });

    const transferId = transfer.id || transfer;
    await Wallet.updateTransactionStatus(transaction.id, "PENDING", transferId);
    completeTransactionLater(transaction.id, transferId);

    return res.json({
      success: true,
      message: "Withdrawal initiated",
      transfer_id: transferId,
    });
  } catch (error) {
    return handlePaymentError(res, error);
  }
}

async function withdrawCrypto(req, res) {
  const userId = req.user.id;
  const { amount, currency, wallet_address: walletAddress } = req.body;
  const numericAmount = parsePositiveAmount(amount);
  const currencyCode = normalizeCurrency(currency);

  if (!numericAmount) {
    return res.status(400).json({ error: "Amount must be greater than 0" });
  }

  if (!CRYPTO_CURRENCIES.has(currencyCode)) {
    return res.status(400).json({ error: "Invalid crypto withdrawal currency" });
  }

  if (!isValidWalletAddress(walletAddress)) {
    return res.status(400).json({ error: "Valid wallet address is required" });
  }

  try {
    const wallet = await Wallet.getWalletByUserId(userId);

    if (!wallet) {
      return res.status(404).json({ error: "Wallet not found" });
    }

    if (getWalletBalance(wallet, currencyCode) < numericAmount) {
      return res.status(400).json({ error: "Insufficient balance" });
    }

    await Wallet.updateBalance(
      userId,
      currencyCode.toLowerCase(),
      numericAmount,
      "subtract"
    );

    const txHash = `mock_tx_hash_${Date.now()}`;
    const transaction = await Wallet.createTransaction(
      userId,
      "WITHDRAWAL",
      numericAmount,
      currencyCode,
      "PENDING",
      txHash,
      `Crypto withdrawal to ${walletAddress}`
    );

    if (isMockPaymentMode) {
      // MOCK PAYMENT MODE: Replace with real crypto processor transaction status.
      completeTransactionLater(transaction.id, txHash);
      return res.json({
        success: true,
        message: "Crypto withdrawal initiated",
        tx_hash: txHash,
      });
    }

    // LIVE PAYMENT MODE: Call a crypto payment processor here before returning.
    return res.json({
      success: true,
      message: "Crypto withdrawal submitted to processor",
      tx_hash: txHash,
    });
  } catch (error) {
    return handlePaymentError(res, error);
  }
}

async function getWithdrawalMethods(req, res) {
  return res.json({
    methods: [
      {
        id: "bank",
        name: "Bank Transfer",
        currencies: ["NGN", "USD"],
        fee: "1%",
        min: 1000,
        max: 500000,
      },
      {
        id: "crypto",
        name: "Cryptocurrency",
        currencies: ["BTC", "ETH", "USDT"],
        fee: "0.5%",
        min: 0.001,
        max: 10,
      },
    ],
  });
}

module.exports = {
  initiateDeposit,
  verifyDeposit,
  initiateWithdrawal,
  withdrawCrypto,
  getWithdrawalMethods,
};
