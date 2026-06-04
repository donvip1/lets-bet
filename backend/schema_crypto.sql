-- *********************************************************
-- Author:                Philip Awazie Donvip
-- Year Created:          2026
-- Description:           Exchange-grade crypto payment schema for Lets Bet.
-- Modified By:           Philip Awazie Donvip
-- Modified Date:         2026-06-04
-- Modification Notes:    Added crypto wallets, immutable ledger, deposit proofs, withdrawals, limits, and treasury sweep tables.
-- *********************************************************

-- ========================================================
-- Crypto database extensions, tables, indexes, and defaults
-- ========================================================

-- pgcrypto provides gen_random_uuid() for UUID primary keys.
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- User-controlled deposit wallets per supported crypto network.
CREATE TABLE IF NOT EXISTS crypto_wallets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  network VARCHAR(10) NOT NULL CHECK (network IN ('bnb', 'sol', 'ton', 'base')),
  wallet_address VARCHAR(255) UNIQUE NOT NULL,
  private_key_encrypted TEXT,
  wallet_type VARCHAR(20) DEFAULT 'USER' CHECK (
    wallet_type IN ('USER', 'HOT', 'TREASURY', 'COLD')
  ),
  balance DECIMAL(18,8) DEFAULT 0 CHECK (balance >= 0),
  currency VARCHAR(10) DEFAULT 'USDT',
  is_active BOOLEAN DEFAULT TRUE,
  last_swept_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id, network)
);

-- Append-only crypto accounting ledger for every balance-affecting movement.
CREATE TABLE IF NOT EXISTS crypto_ledger_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  entry_type VARCHAR(50) NOT NULL CHECK (
    entry_type IN (
      'DEPOSIT',
      'WITHDRAWAL',
      'FEE',
      'BET_LOCK',
      'PAYOUT',
      'ADJUSTMENT',
      'REVERSAL',
      'SWEEP_IN',
      'SWEEP_OUT'
    )
  ),
  direction VARCHAR(10) NOT NULL CHECK (direction IN ('IN', 'OUT')),
  amount DECIMAL(18,8) NOT NULL CHECK (amount >= 0),
  currency VARCHAR(10) NOT NULL CHECK (
    currency IN ('USDT', 'USDC', 'ETH', 'BNB', 'SOL', 'TON')
  ),
  network VARCHAR(10) CHECK (network IN ('bnb', 'sol', 'ton', 'base')),
  balance_before DECIMAL(18,8) NOT NULL CHECK (balance_before >= 0),
  balance_after DECIMAL(18,8) NOT NULL CHECK (balance_after >= 0),
  reference_type VARCHAR(50) CHECK (
    reference_type IN ('DEPOSIT', 'WITHDRAWAL', 'BET', 'ADMIN', 'SWEEP')
    OR reference_type IS NULL
  ),
  reference_id UUID,
  description TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  idempotency_key VARCHAR(255) UNIQUE,
  processed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Crypto deposit state machine with proof required before wallet crediting.
CREATE TABLE IF NOT EXISTS crypto_deposits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  tx_hash VARCHAR(255) UNIQUE NOT NULL,
  network VARCHAR(10) NOT NULL CHECK (network IN ('bnb', 'sol', 'ton', 'base')),
  token_type VARCHAR(20) NOT NULL CHECK (token_type IN ('USDT', 'USDC')),
  token_contract VARCHAR(255),
  amount DECIMAL(18,8) NOT NULL CHECK (amount > 0),
  decimals INTEGER DEFAULT 6 CHECK (decimals >= 0),
  from_address VARCHAR(255) NOT NULL,
  to_address VARCHAR(255) NOT NULL,
  status VARCHAR(50) DEFAULT 'DETECTED' CHECK (
    status IN (
      'DETECTED',
      'CONFIRMING',
      'TREASURY_PENDING',
      'TREASURY_CONFIRMED',
      'CREDITED',
      'FAILED',
      'MANUAL_REVIEW'
    )
  ),
  confirmations INTEGER DEFAULT 0 CHECK (confirmations >= 0),
  required_confirmations INTEGER DEFAULT 12 CHECK (required_confirmations >= 0),
  block_number BIGINT,
  block_hash VARCHAR(255),
  gas_used DECIMAL(18,8),
  gas_price DECIMAL(18,8),
  network_fee DECIMAL(18,8),
  platform_fee DECIMAL(18,8) DEFAULT 0 CHECK (platform_fee >= 0),
  net_amount DECIMAL(18,8) CHECK (net_amount >= 0),
  explorer_url VARCHAR(500),
  scanner_source VARCHAR(50),
  detected_at TIMESTAMP,
  confirmed_at TIMESTAMP,
  treasury_confirmed_at TIMESTAMP,
  credited_at TIMESTAMP,
  failed_at TIMESTAMP,
  failure_reason TEXT,
  reviewed_by UUID REFERENCES users(id),
  reviewed_at TIMESTAMP,
  review_notes TEXT,
  sweep_tx_hash VARCHAR(255),
  sweep_status VARCHAR(50) CHECK (
    sweep_status IN ('PENDING', 'COMPLETED', 'FAILED')
    OR sweep_status IS NULL
  ),
  proof_metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Crypto withdrawal state machine with risk controls and approval support.
CREATE TABLE IF NOT EXISTS crypto_withdrawals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  tx_hash VARCHAR(255),
  network VARCHAR(10) NOT NULL CHECK (network IN ('bnb', 'sol', 'ton', 'base')),
  token_type VARCHAR(20) NOT NULL CHECK (token_type IN ('USDT', 'USDC')),
  amount DECIMAL(18,8) NOT NULL CHECK (amount > 0),
  to_address VARCHAR(255) NOT NULL,
  from_address VARCHAR(255),
  status VARCHAR(50) DEFAULT 'PENDING' CHECK (
    status IN (
      'PENDING',
      'RISK_CHECK',
      'APPROVAL_REQUIRED',
      'PROCESSING',
      'SENT',
      'COMPLETED',
      'FAILED',
      'REJECTED'
    )
  ),
  risk_score INTEGER DEFAULT 0 CHECK (risk_score >= 0 AND risk_score <= 100),
  risk_flags TEXT[],
  requires_approval BOOLEAN DEFAULT FALSE,
  approved_by UUID REFERENCES users(id),
  approved_at TIMESTAMP,
  processing_at TIMESTAMP,
  sent_at TIMESTAMP,
  completed_at TIMESTAMP,
  failed_at TIMESTAMP,
  failure_reason TEXT,
  network_fee DECIMAL(18,8),
  platform_fee DECIMAL(18,8),
  total_fee DECIMAL(18,8),
  explorer_url VARCHAR(500),
  cooldown_bypassed BOOLEAN DEFAULT FALSE,
  two_factor_verified BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- User-saved withdrawal destinations that can be verified before use.
CREATE TABLE IF NOT EXISTS crypto_addresses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  network VARCHAR(10) NOT NULL CHECK (network IN ('bnb', 'sol', 'ton', 'base')),
  address VARCHAR(255) NOT NULL,
  label VARCHAR(100),
  is_verified BOOLEAN DEFAULT FALSE,
  verification_code VARCHAR(10),
  verified_at TIMESTAMP,
  is_active BOOLEAN DEFAULT TRUE,
  added_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  last_used_at TIMESTAMP,
  usage_count INTEGER DEFAULT 0 CHECK (usage_count >= 0),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id, network, address)
);

-- Security, compliance, scanner, and admin action audit trail.
CREATE TABLE IF NOT EXISTS crypto_audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  actor_id UUID REFERENCES users(id),
  action VARCHAR(100) NOT NULL,
  ip_address INET,
  user_agent TEXT,
  country_code VARCHAR(2),
  risk_score INTEGER DEFAULT 0 CHECK (risk_score >= 0 AND risk_score <= 100),
  flags TEXT[],
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Per-user KYC-tiered withdrawal limits and cooldown settings.
CREATE TABLE IF NOT EXISTS user_withdrawal_limits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE UNIQUE,
  kyc_tier VARCHAR(20) DEFAULT 'BASIC' CHECK (
    kyc_tier IN ('BASIC', 'VERIFIED', 'PREMIUM')
  ),
  daily_limit DECIMAL(18,8) DEFAULT 1000 CHECK (daily_limit >= 0),
  weekly_limit DECIMAL(18,8) DEFAULT 5000 CHECK (weekly_limit >= 0),
  monthly_limit DECIMAL(18,8) DEFAULT 20000 CHECK (monthly_limit >= 0),
  single_withdrawal_max DECIMAL(18,8) DEFAULT 1000 CHECK (
    single_withdrawal_max >= 0
  ),
  daily_withdrawn DECIMAL(18,8) DEFAULT 0 CHECK (daily_withdrawn >= 0),
  weekly_withdrawn DECIMAL(18,8) DEFAULT 0 CHECK (weekly_withdrawn >= 0),
  monthly_withdrawn DECIMAL(18,8) DEFAULT 0 CHECK (monthly_withdrawn >= 0),
  last_withdrawal_date DATE,
  cooldown_until TIMESTAMP,
  two_factor_enabled BOOLEAN DEFAULT FALSE,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Cached fee estimates used by frontend previews and withdrawal checks.
CREATE TABLE IF NOT EXISTS network_fees (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  network VARCHAR(10) UNIQUE NOT NULL CHECK (
    network IN ('bnb', 'sol', 'ton', 'base')
  ),
  token_type VARCHAR(20) NOT NULL CHECK (token_type IN ('USDT', 'USDC')),
  gas_price DECIMAL(18,8),
  estimated_gas INTEGER,
  estimated_fee DECIMAL(18,8),
  platform_fee_percent DECIMAL(5,2) DEFAULT 0.5 CHECK (
    platform_fee_percent >= 0
  ),
  min_fee DECIMAL(18,8),
  max_fee DECIMAL(18,8),
  last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Platform-controlled wallets for hot, treasury, and cold storage operations.
CREATE TABLE IF NOT EXISTS platform_wallets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  network VARCHAR(10) NOT NULL CHECK (network IN ('bnb', 'sol', 'ton', 'base')),
  wallet_type VARCHAR(20) NOT NULL CHECK (wallet_type IN ('HOT', 'TREASURY', 'COLD')),
  wallet_address VARCHAR(255) UNIQUE NOT NULL,
  private_key_encrypted TEXT,
  balance DECIMAL(18,8) DEFAULT 0 CHECK (balance >= 0),
  currency VARCHAR(10) DEFAULT 'USDT',
  is_active BOOLEAN DEFAULT TRUE,
  last_swept_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(network, wallet_type)
);

-- Sweep records from user deposit wallets into platform treasury wallets.
CREATE TABLE IF NOT EXISTS treasury_sweeps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_wallet_id UUID REFERENCES crypto_wallets(id),
  destination_wallet_id UUID REFERENCES platform_wallets(id),
  network VARCHAR(10) NOT NULL CHECK (network IN ('bnb', 'sol', 'ton', 'base')),
  amount DECIMAL(18,8) NOT NULL CHECK (amount > 0),
  currency VARCHAR(10) NOT NULL,
  tx_hash VARCHAR(255),
  status VARCHAR(50) DEFAULT 'PENDING' CHECK (
    status IN ('PENDING', 'COMPLETED', 'FAILED')
  ),
  gas_fee DECIMAL(18,8),
  executed_by UUID REFERENCES users(id),
  executed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ========================================================
-- Indexes for common user, scanner, admin, and ledger queries
-- ========================================================

CREATE INDEX IF NOT EXISTS idx_crypto_wallets_user_id
  ON crypto_wallets(user_id);
CREATE INDEX IF NOT EXISTS idx_crypto_wallets_network
  ON crypto_wallets(network);
CREATE INDEX IF NOT EXISTS idx_crypto_wallets_wallet_type
  ON crypto_wallets(wallet_type);

CREATE INDEX IF NOT EXISTS idx_crypto_ledger_entries_user_id
  ON crypto_ledger_entries(user_id);
CREATE INDEX IF NOT EXISTS idx_crypto_ledger_entries_entry_type
  ON crypto_ledger_entries(entry_type);
CREATE INDEX IF NOT EXISTS idx_crypto_ledger_entries_network
  ON crypto_ledger_entries(network);
CREATE INDEX IF NOT EXISTS idx_crypto_ledger_entries_idempotency_key
  ON crypto_ledger_entries(idempotency_key);
CREATE INDEX IF NOT EXISTS idx_crypto_ledger_entries_reference
  ON crypto_ledger_entries(reference_type, reference_id);

CREATE INDEX IF NOT EXISTS idx_crypto_deposits_user_id
  ON crypto_deposits(user_id);
CREATE INDEX IF NOT EXISTS idx_crypto_deposits_tx_hash
  ON crypto_deposits(tx_hash);
CREATE INDEX IF NOT EXISTS idx_crypto_deposits_status
  ON crypto_deposits(status);
CREATE INDEX IF NOT EXISTS idx_crypto_deposits_network
  ON crypto_deposits(network);
CREATE INDEX IF NOT EXISTS idx_crypto_deposits_sweep_status
  ON crypto_deposits(sweep_status);

CREATE INDEX IF NOT EXISTS idx_crypto_withdrawals_user_id
  ON crypto_withdrawals(user_id);
CREATE INDEX IF NOT EXISTS idx_crypto_withdrawals_tx_hash
  ON crypto_withdrawals(tx_hash);
CREATE INDEX IF NOT EXISTS idx_crypto_withdrawals_status
  ON crypto_withdrawals(status);
CREATE INDEX IF NOT EXISTS idx_crypto_withdrawals_network
  ON crypto_withdrawals(network);

CREATE INDEX IF NOT EXISTS idx_crypto_addresses_user_id
  ON crypto_addresses(user_id);
CREATE INDEX IF NOT EXISTS idx_crypto_addresses_network
  ON crypto_addresses(network);

CREATE INDEX IF NOT EXISTS idx_crypto_audit_logs_user_id
  ON crypto_audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_crypto_audit_logs_actor_id
  ON crypto_audit_logs(actor_id);
CREATE INDEX IF NOT EXISTS idx_crypto_audit_logs_action
  ON crypto_audit_logs(action);

CREATE INDEX IF NOT EXISTS idx_user_withdrawal_limits_user_id
  ON user_withdrawal_limits(user_id);
CREATE INDEX IF NOT EXISTS idx_user_withdrawal_limits_kyc_tier
  ON user_withdrawal_limits(kyc_tier);

CREATE INDEX IF NOT EXISTS idx_network_fees_network
  ON network_fees(network);

CREATE INDEX IF NOT EXISTS idx_platform_wallets_network
  ON platform_wallets(network);
CREATE INDEX IF NOT EXISTS idx_platform_wallets_wallet_type
  ON platform_wallets(wallet_type);

CREATE INDEX IF NOT EXISTS idx_treasury_sweeps_network
  ON treasury_sweeps(network);
CREATE INDEX IF NOT EXISTS idx_treasury_sweeps_tx_hash
  ON treasury_sweeps(tx_hash);
CREATE INDEX IF NOT EXISTS idx_treasury_sweeps_status
  ON treasury_sweeps(status);

-- ========================================================
-- Default cached network fee rows for testnet-first rollout
-- ========================================================

INSERT INTO network_fees (
  network,
  token_type,
  gas_price,
  estimated_gas,
  estimated_fee,
  platform_fee_percent,
  min_fee,
  max_fee
)
VALUES
  ('bnb', 'USDT', 3.00000000, 65000, 0.00065000, 0.50, 0.10000000, 10.00000000),
  ('sol', 'USDT', 0.00000500, 1, 0.00000500, 0.50, 0.05000000, 10.00000000),
  ('ton', 'USDT', 0.05000000, 1, 0.05000000, 0.50, 0.05000000, 10.00000000),
  ('base', 'USDT', 0.00000010, 65000, 0.00010000, 0.50, 0.05000000, 10.00000000)
ON CONFLICT (network) DO UPDATE SET
  token_type = EXCLUDED.token_type,
  gas_price = EXCLUDED.gas_price,
  estimated_gas = EXCLUDED.estimated_gas,
  estimated_fee = EXCLUDED.estimated_fee,
  platform_fee_percent = EXCLUDED.platform_fee_percent,
  min_fee = EXCLUDED.min_fee,
  max_fee = EXCLUDED.max_fee,
  last_updated = CURRENT_TIMESTAMP;
