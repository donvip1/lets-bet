const axios = require("axios");
require("dotenv").config();

const config = {
  baseUrl:
    process.env.FLUTTERWAVE_ENV === "live"
      ? "https://api.flutterwave.com/v3"
      : "https://api.flutterwave.com/v3",
  secretKey: process.env.FLUTTERWAVE_SECRET_KEY || "FLWSECK_TEST_KEY",
  // MOCK PAYMENT MODE: Keep this true until real Flutterwave keys/webhooks are ready.
  isMock: process.env.FLUTTERWAVE_ENV !== "live",
};

const createTxRef = (prefix = "mock") => {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
};

const flutterwaveClient = axios.create({
  baseURL: config.baseUrl,
  timeout: Number(process.env.FLUTTERWAVE_TIMEOUT_MS || 15000),
  headers: {
    Authorization: `Bearer ${config.secretKey}`,
    "Content-Type": "application/json",
  },
});

async function initializePayment(data) {
  try {
    const txRef = data.tx_ref || createTxRef(config.isMock ? "mock" : "letsbet");

    if (config.isMock) {
      console.log("MOCK MODE: initializePayment");
      return {
        link: `https://test-payments.letsbet.com/mock?tx_ref=${txRef}`,
        tx_ref: txRef,
      };
    }

    // LIVE PAYMENT MODE: Real Flutterwave hosted payment initialization.
    const response = await flutterwaveClient.post("/payments", {
      amount: data.amount,
      currency: data.currency,
      customer: {
        email: data.email,
        name: data.name,
      },
      redirect_url: data.redirect_url,
      tx_ref: txRef,
    });

    return {
      link: response.data?.data?.link || response.data?.link,
      tx_ref: txRef,
      raw: response.data,
    };
  } catch (error) {
    console.error("Flutterwave initializePayment error:", error.message);
    throw error;
  }
}

async function verifyPayment(txRef) {
  try {
    if (config.isMock) {
      console.log("MOCK MODE: verifyPayment");
      return {
        status: "successful",
        amount: 1000,
        currency: "NGN",
        customer: { email: "test@example.com" },
        meta: { payment_type: "card" },
        tx_ref: txRef,
      };
    }

    // LIVE PAYMENT MODE: Verify real Flutterwave transaction before crediting wallet.
    const response = await flutterwaveClient.get(`/transactions/${txRef}/verify`);
    return response.data;
  } catch (error) {
    console.error("Flutterwave verifyPayment error:", error.message);
    throw error;
  }
}

async function initiateTransfer(data) {
  try {
    if (config.isMock) {
      console.log("MOCK MODE: initiateTransfer");
      return {
        id: `mock_transfer_${Date.now()}`,
        status: "pending",
      };
    }

    // LIVE PAYMENT MODE: Real Flutterwave transfer/payout request.
    const response = await flutterwaveClient.post("/transfers", {
      account_bank: data.account_bank,
      account_number: data.account_number,
      amount: data.amount,
      currency: data.currency,
      narrative: data.narrative,
    });

    return response.data?.data?.id || response.data?.id;
  } catch (error) {
    console.error("Flutterwave initiateTransfer error:", error.message);
    throw error;
  }
}

async function verifyTransfer(transferId) {
  try {
    if (config.isMock) {
      console.log("MOCK MODE: verifyTransfer");
      return {
        status: "successful",
        amount: 1000,
        id: transferId,
      };
    }

    // LIVE PAYMENT MODE: Confirm real transfer status before final wallet state changes.
    const response = await flutterwaveClient.get(`/transfers/${transferId}`);
    return response.data;
  } catch (error) {
    console.error("Flutterwave verifyTransfer error:", error.message);
    throw error;
  }
}

async function getAccountDetails(bankCode, accountNumber) {
  try {
    if (config.isMock) {
      console.log("MOCK MODE: getAccountDetails");
      return {
        account_name: "Test User",
        account_number: accountNumber,
      };
    }

    // LIVE PAYMENT MODE: Resolve bank account details before initiating withdrawals.
    const response = await flutterwaveClient.post("/accounts/resolve", {
      account_bank: bankCode,
      account_number: accountNumber,
    });

    return response.data?.data || response.data;
  } catch (error) {
    console.error("Flutterwave getAccountDetails error:", error.message);
    throw error;
  }
}

module.exports = {
  initializePayment,
  verifyPayment,
  initiateTransfer,
  verifyTransfer,
  getAccountDetails,
};
