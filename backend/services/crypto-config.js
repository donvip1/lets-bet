'use strict';

/*********************************************************
 Author:                Philip Awazie Donvip
 Year Created:          2026
 Description:           Crypto network, token, treasury, and safety configuration.
 Modified By:           Philip Awazie Donvip
 Modified Date:         2026-06-05
 Modification Notes:    Added testnet/mainnet configuration for Phase 6C crypto payments.
*********************************************************/

// ========================================================
// Imports, environment loading, and configuration helpers
// ========================================================

require("dotenv").config();

const normalizeMode = (mode) => {
  return mode === "mainnet" ? "mainnet" : "testnet";
};

const config = {
  // Mode: "testnet" or "mainnet"; mainnet requires explicit ALLOW_MAINNET=true.
  CRYPTO_MODE: normalizeMode(process.env.CRYPTO_MODE || "testnet"),

  // Network configurations used by scanners, wallet provisioning, and explorer links.
  NETWORKS: {
    bnb: {
      name: "BNB Smart Chain",
      rpcUrl: process.env.BNB_RPC_URL || "https://bsc-dataseed.binance.org/",
      testnetRpcUrl:
        process.env.BNB_TESTNET_RPC_URL ||
        "https://data-seed-prebsc-1-s1.binance.org:8545/",
      explorer: "https://bscscan.com/tx/",
      testnetExplorer: "https://testnet.bscscan.com/tx/",
      confirmations: 12,
      chainId: 56,
      testnetChainId: 97,
    },
    sol: {
      name: "Solana",
      rpcUrl: process.env.SOL_RPC_URL || "https://api.mainnet-beta.solana.com",
      testnetRpcUrl:
        process.env.SOL_TESTNET_RPC_URL || "https://api.devnet.solana.com",
      explorer: "https://solscan.io/tx/",
      testnetExplorer: "https://devnet.solscan.io/tx/",
      confirmations: 32,
      cluster: "mainnet-beta",
      testnetCluster: "devnet",
    },
    ton: {
      name: "TON",
      rpcUrl: process.env.TON_RPC_URL || "https://mainnet.tonhubapi.com",
      testnetRpcUrl:
        process.env.TON_TESTNET_RPC_URL || "https://testnet.tonhubapi.com",
      explorer: "https://tonscan.org/tx/",
      testnetExplorer: "https://testnet.tonscan.org/tx/",
      confirmations: 6,
    },
    base: {
      name: "Base Sepolia",
      rpcUrl: process.env.BASE_RPC_URL || "https://sepolia.base.org",
      testnetRpcUrl:
        process.env.BASE_TESTNET_RPC_URL ||
        process.env.BASE_RPC_URL ||
        "https://sepolia.base.org",
      explorer: "https://basescan.org/tx/",
      testnetExplorer: "https://sepolia.basescan.org/tx/",
      confirmations: 12,
      chainId: 84532,
      testnetChainId: 84532,
      isTestnet: true,
    },
  },

  // Token contracts; Base uses a mock USDT contract in testnet/staging.
  TOKENS: {
    bnb: {
      USDT: {
        contract:
          process.env.BNB_USDT_CONTRACT ||
          "0x55d398326f99059fF775485246999027B3197955",
        decimals: 18,
        testnetContract:
          process.env.BNB_TESTNET_USDT_CONTRACT ||
          "0x337610d27c682E347C9cD60BD4b3b107C9d34dDd",
      },
    },
    sol: {
      USDT: {
        contract:
          process.env.SOL_USDT_CONTRACT ||
          "Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB",
        decimals: 6,
        testnetContract: process.env.SOL_TESTNET_USDT_CONTRACT || "",
      },
    },
    ton: {
      USDT: {
        contract: process.env.TON_USDT_CONTRACT || "",
        decimals: 6,
        testnetContract: process.env.TON_TESTNET_USDT_CONTRACT || "",
        isJetton: true,
      },
    },
    base: {
      USDT: {
        contract: process.env.BASE_USDT_CONTRACT || "",
        decimals: 6,
        testnetContract:
          process.env.BASE_TESTNET_USDT_CONTRACT ||
          process.env.BASE_USDT_CONTRACT ||
          "",
        isTestnet: true,
      },
    },
  },

  // Platform-controlled treasury wallets receive confirmed/swept deposits.
  TREASURY: {
    bnb: process.env.TREASURY_BNB_ADDRESS || "",
    sol: process.env.TREASURY_SOL_ADDRESS || "",
    ton: process.env.TREASURY_TON_ADDRESS || "",
    base: process.env.TREASURY_BASE_ADDRESS || "",
  },

  // Hot wallets are used for fast approved withdrawals.
  HOT_WALLET: {
    bnb: process.env.HOT_WALLET_BNB_ADDRESS || "",
    sol: process.env.HOT_WALLET_SOL_ADDRESS || "",
    ton: process.env.HOT_WALLET_TON_ADDRESS || "",
    base: process.env.HOT_WALLET_BASE_ADDRESS || "",
  },

  // KYC-tiered withdrawal limits in USDT-equivalent values.
  WITHDRAWAL_LIMITS: {
    BASIC: {
      daily: 1000,
      weekly: 5000,
      monthly: 20000,
      single: 1000,
    },
    VERIFIED: {
      daily: 10000,
      weekly: 50000,
      monthly: 200000,
      single: 10000,
    },
    PREMIUM: {
      daily: 100000,
      weekly: 500000,
      monthly: 2000000,
      single: 100000,
    },
  },

  // Platform fees and safety limits.
  PLATFORM_FEE_PERCENT: 0.05,
  WITHDRAWAL_FEE_PERCENT: 0.005,
  MIN_DEPOSIT_USDT: 1.0,
  MAX_DEPOSIT_USDT: 100000.0,
  MIN_WITHDRAWAL_USDT: 1.0,
  MAX_WITHDRAWAL_USDT: 100000.0,

  isTestnetMode() {
    return this.CRYPTO_MODE === "testnet";
  },

  getNetwork(network) {
    const net = this.NETWORKS[network];

    if (!net) {
      throw new Error(`Unknown network: ${network}`);
    }

    return net;
  },

  getRpcUrl(network) {
    const net = this.getNetwork(network);

    return this.isTestnetMode() ? net.testnetRpcUrl || net.rpcUrl : net.rpcUrl;
  },

  getExplorerUrl(network, txHash) {
    const net = this.getNetwork(network);
    const baseUrl = this.isTestnetMode()
      ? net.testnetExplorer || net.explorer
      : net.explorer;

    return `${baseUrl}${txHash}`;
  },

  getConfirmations(network) {
    return this.getNetwork(network).confirmations;
  },

  getChainId(network) {
    const net = this.getNetwork(network);

    return this.isTestnetMode() ? net.testnetChainId || net.chainId : net.chainId;
  },

  getToken(network, symbol = "USDT") {
    const token = this.TOKENS[network]?.[symbol];

    if (!token) {
      throw new Error(`Unknown token ${symbol} for network: ${network}`);
    }

    return {
      ...token,
      contract: this.isTestnetMode()
        ? token.testnetContract || token.contract
        : token.contract,
    };
  },

  validateMainnetAccess() {
    if (!this.isTestnetMode() && process.env.ALLOW_MAINNET !== "true") {
      throw new Error(
        "Mainnet access blocked. Set ALLOW_MAINNET=true explicitly to enable."
      );
    }
  },
};

module.exports = config;
