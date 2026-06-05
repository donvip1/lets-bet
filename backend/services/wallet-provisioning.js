'use strict';

/*********************************************************
 Author:                Philip Awazie Donvip
 Year Created:          2026
 Description:           User crypto wallet generation and deposit address provisioning.
 Modified By:           Philip Awazie Donvip
 Modified Date:         2026-06-05
 Modification Notes:    Added encrypted BNB, Solana, TON, and Base wallet provisioning.
*********************************************************/

// ========================================================
// Imports, encryption helpers, and service setup
// ========================================================

const { ethers } = require("ethers");
const TonWeb = require("tonweb");
const crypto = require("crypto");
const { query } = require("../config/database");
const config = require("./crypto-config");

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 16;
const SOLANA_LAMPORTS_PER_SOL = 1000000000;
const BASE58_ALPHABET =
  "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";

const getEncryptionKey = () => {
  const secret = process.env.ENCRYPTION_KEY || "dev-encryption-key-min-32-chars";

  // Hashing normalizes any provided secret to the 32 bytes AES-256-GCM requires.
  return crypto.createHash("sha256").update(secret, "utf8").digest();
};

function encryptPrivateKey(privateKey) {
  const key = getEncryptionKey();
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  const encrypted = Buffer.concat([
    cipher.update(privateKey, "utf8"),
    cipher.final(),
  ]);
  const authTag = cipher.getAuthTag();

  return JSON.stringify({
    iv: iv.toString("hex"),
    encrypted: encrypted.toString("hex"),
    tag: authTag.toString("hex"),
  });
}

function decryptPrivateKey(encryptedJson) {
  const { iv, encrypted, tag } = JSON.parse(encryptedJson);
  const key = getEncryptionKey();
  const ivBuffer = Buffer.from(iv, "hex");
  const encryptedBuffer = Buffer.from(encrypted, "hex");
  const authTag = Buffer.from(tag, "hex");
  const decipher = crypto.createDecipheriv(ALGORITHM, key, ivBuffer);

  decipher.setAuthTag(authTag);

  const decrypted = Buffer.concat([
    decipher.update(encryptedBuffer),
    decipher.final(),
  ]);

  return decrypted.toString("utf8");
}

const encodeBase58 = (buffer) => {
  let value = BigInt(`0x${Buffer.from(buffer).toString("hex")}`);
  let encoded = "";

  while (value > 0n) {
    const remainder = value % 58n;
    value /= 58n;
    encoded = BASE58_ALPHABET[Number(remainder)] + encoded;
  }

  for (const byte of buffer) {
    if (byte !== 0) {
      break;
    }

    encoded = `1${encoded}`;
  }

  return encoded || "1";
};

const postJsonRpc = async (rpcUrl, body) => {
  const response = await fetch(rpcUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    throw new Error(`RPC request failed with status ${response.status}`);
  }

  return response.json();
};

const toWalletResponse = (wallet) => ({
  network: wallet.network,
  wallet_address: wallet.wallet_address,
  balance: wallet.balance,
  currency: wallet.currency,
  is_active: wallet.is_active,
  created_at: wallet.created_at,
  explorerUrl: config.getExplorerUrl(wallet.network, wallet.wallet_address),
});

class WalletProvisioning {
  async generateBNBWallet() {
    const wallet = ethers.Wallet.createRandom();

    return {
      network: "bnb",
      address: wallet.address,
      privateKey: encryptPrivateKey(wallet.privateKey),
      mnemonic: wallet.mnemonic?.phrase,
      publicKey: wallet.publicKey,
    };
  }

  async generateSolanaWallet() {
    const keyPair = TonWeb.utils.nacl.sign.keyPair();

    return {
      network: "sol",
      address: encodeBase58(keyPair.publicKey),
      privateKey: encryptPrivateKey(Buffer.from(keyPair.secretKey).toString("hex")),
      publicKey: encodeBase58(keyPair.publicKey),
    };
  }

  async generateTONWallet() {
    const tonweb = new TonWeb();
    const seed = TonWeb.utils.newSeed();
    const keyPair = TonWeb.utils.keyPairFromSeed(seed);
    const WalletClass = tonweb.wallet.all.v4R2;
    const wallet = new WalletClass(tonweb.provider, {
      publicKey: keyPair.publicKey,
    });
    const address = await wallet.getAddress();

    return {
      network: "ton",
      address: address.toString(true, true, true),
      privateKey: encryptPrivateKey(Buffer.from(keyPair.secretKey).toString("hex")),
      publicKey: Buffer.from(keyPair.publicKey).toString("hex"),
    };
  }

  async generateBaseWallet() {
    const wallet = ethers.Wallet.createRandom();

    return {
      network: "base",
      address: wallet.address,
      privateKey: encryptPrivateKey(wallet.privateKey),
      mnemonic: wallet.mnemonic?.phrase,
      publicKey: wallet.publicKey,
      isTestnet: true,
    };
  }

  async generateWalletByNetwork(network) {
    switch (network) {
      case "bnb":
        return this.generateBNBWallet();
      case "sol":
        return this.generateSolanaWallet();
      case "ton":
        return this.generateTONWallet();
      case "base":
        return this.generateBaseWallet();
      default:
        throw new Error(`Unknown network: ${network}`);
    }
  }

  async generateAllUserWallets(userId) {
    const [bnb, sol, ton, base] = await Promise.all([
      this.generateBNBWallet(),
      this.generateSolanaWallet(),
      this.generateTONWallet(),
      this.generateBaseWallet(),
    ]);

    await Promise.all([
      this.saveUserWallet(userId, bnb),
      this.saveUserWallet(userId, sol),
      this.saveUserWallet(userId, ton),
      this.saveUserWallet(userId, base),
    ]);

    return { bnb, sol, ton, base };
  }

  async ensureUserWallet(userId, network) {
    const existingWallet = await this.getUserWalletByNetwork(userId, network);

    if (existingWallet) {
      return existingWallet;
    }

    const walletData = await this.generateWalletByNetwork(network);
    await this.saveUserWallet(userId, walletData);

    return this.getUserWalletByNetwork(userId, network);
  }

  async saveUserWallet(userId, walletData) {
    await query(
      `
        INSERT INTO crypto_wallets (
          user_id,
          network,
          wallet_address,
          private_key_encrypted,
          wallet_type,
          currency
        )
        VALUES ($1, $2, $3, $4, $5, $6)
        ON CONFLICT (user_id, network) DO NOTHING
      `,
      [
        userId,
        walletData.network,
        walletData.address,
        walletData.privateKey,
        "USER",
        "USDT",
      ]
    );

    return walletData;
  }

  async getUserWallets(userId) {
    const result = await query(
      `
        SELECT network, wallet_address, balance, currency, is_active, created_at
        FROM crypto_wallets
        WHERE user_id = $1 AND wallet_type = 'USER' AND is_active = TRUE
        ORDER BY network
      `,
      [userId]
    );

    return result.rows.map(toWalletResponse);
  }

  async getUserWalletByNetwork(userId, network) {
    const result = await query(
      `
        SELECT network, wallet_address, balance, currency, is_active, created_at
        FROM crypto_wallets
        WHERE user_id = $1
          AND network = $2
          AND wallet_type = 'USER'
          AND is_active = TRUE
      `,
      [userId, network]
    );

    return result.rows[0] ? toWalletResponse(result.rows[0]) : null;
  }

  async getNativeBalance(network, address) {
    const rpcUrl = config.getRpcUrl(network);

    if (network === "bnb" || network === "base") {
      const provider = new ethers.JsonRpcProvider(rpcUrl);
      const balance = await provider.getBalance(address);

      return ethers.formatEther(balance);
    }

    if (network === "sol") {
      const result = await postJsonRpc(rpcUrl, {
        jsonrpc: "2.0",
        id: 1,
        method: "getBalance",
        params: [address],
      });

      if (result.error) {
        throw new Error(result.error.message || "Solana balance request failed");
      }

      return Number(result.result?.value || 0) / SOLANA_LAMPORTS_PER_SOL;
    }

    if (network === "ton") {
      const provider = new TonWeb.HttpProvider(rpcUrl);
      const balance = await provider.getAddressBalance(address);

      return Number(balance) / 1e9;
    }

    throw new Error(`Unknown network: ${network}`);
  }

  async revokeWallet(userId, network) {
    await query(
      `
        UPDATE crypto_wallets
        SET is_active = FALSE
        WHERE user_id = $1 AND network = $2 AND wallet_type = 'USER'
      `,
      [userId, network]
    );
  }

  async autoProvisionOnSignup(userId) {
    try {
      console.log(`Auto-provisioning crypto wallets for user ${userId}`);
      const wallets = await this.generateAllUserWallets(userId);
      console.log(
        `Crypto wallets created for user ${userId}: BNB=${wallets.bnb.address}, SOL=${wallets.sol.address}, TON=${wallets.ton.address}, BASE=${wallets.base.address}`
      );

      return wallets;
    } catch (error) {
      console.error("Failed to auto-provision crypto wallets:", {
        userId,
        message: error.message,
      });
      throw error;
    }
  }
}

const walletProvisioning = new WalletProvisioning();
const autoProvisionOnSignup = walletProvisioning.autoProvisionOnSignup.bind(
  walletProvisioning
);

module.exports = walletProvisioning;
module.exports.encryptPrivateKey = encryptPrivateKey;
module.exports.decryptPrivateKey = decryptPrivateKey;
module.exports.autoProvisionOnSignup = autoProvisionOnSignup;
