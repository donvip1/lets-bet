-- *********************************************************
-- Author:                Philip Awazie Donvip
-- Year Created:          2026
-- Description:           PostgreSQL schema for users, wallets, bets, participants, transactions, and KYC documents.
-- Modified By:           Philip Awazie Donvip
-- Modified Date:         2026-05-31
-- Modification Notes:    Added traceable comments for debugging, handoff, undo, and redo review.
-- *********************************************************

-- ========================================================
-- Database extensions, tables, constraints, and indexes
-- ========================================================

-- Lets Bet PostgreSQL schema.
-- pgcrypto provides gen_random_uuid() for UUID primary keys.
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Platform users and account state.
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  name VARCHAR(255) NOT NULL,
  kyc_status VARCHAR(20) DEFAULT 'pending' CHECK (
    kyc_status IN ('pending', 'verified', 'rejected')
  ),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP
);

-- Multi-currency balances owned by each user.
CREATE TABLE IF NOT EXISTS wallets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE UNIQUE,
  balance_ngn DECIMAL(15,2) DEFAULT 0 CHECK (balance_ngn >= 0),
  balance_usd DECIMAL(15,2) DEFAULT 0 CHECK (balance_usd >= 0),
  balance_btc DECIMAL(18,8) DEFAULT 0 CHECK (balance_btc >= 0),
  balance_eth DECIMAL(18,8) DEFAULT 0 CHECK (balance_eth >= 0),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Betting markets created by users.
CREATE TABLE IF NOT EXISTS bets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  topic TEXT NOT NULL,
  outcome_a VARCHAR(255) NOT NULL,
  outcome_b VARCHAR(255) NOT NULL,
  created_by UUID REFERENCES users(id),
  target_amount DECIMAL(15,2) NOT NULL CHECK (target_amount > 0),
  total_stakes DECIMAL(15,2) DEFAULT 0 CHECK (total_stakes >= 0),
  currency VARCHAR(10) DEFAULT 'NGN' CHECK (
    currency IN ('NGN', 'USD', 'BTC', 'ETH')
  ),
  status VARCHAR(20) DEFAULT 'OPEN' CHECK (
    status IN ('OPEN', 'LOCKED', 'SETTLED', 'CANCELLED')
  ),
  result VARCHAR(1) NULL CHECK (result IN ('A', 'B') OR result IS NULL),
  deadline TIMESTAMP NOT NULL,
  category VARCHAR(50) DEFAULT 'general',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Users who joined a bet and the outcome they backed.
CREATE TABLE IF NOT EXISTS bet_participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bet_id UUID REFERENCES bets(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  outcome VARCHAR(1) NOT NULL CHECK (outcome IN ('A', 'B')),
  stake_amount DECIMAL(15,2) NOT NULL CHECK (stake_amount > 0),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(bet_id, user_id)
);

-- Wallet ledger entries for deposits, withdrawals, stakes, payouts, and fees.
CREATE TABLE IF NOT EXISTS transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id),
  type VARCHAR(20) NOT NULL CHECK (
    type IN ('DEPOSIT', 'WITHDRAWAL', 'BET_STAKE', 'PAYOUT', 'FEE')
  ),
  amount DECIMAL(15,2) NOT NULL CHECK (amount > 0),
  currency VARCHAR(10) NOT NULL CHECK (
    currency IN ('NGN', 'USD', 'BTC', 'ETH')
  ),
  status VARCHAR(20) DEFAULT 'PENDING' CHECK (
    status IN ('PENDING', 'COMPLETED', 'FAILED')
  ),
  reference VARCHAR(255),
  description TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- KYC document metadata uploaded by users.
CREATE TABLE IF NOT EXISTS kyc_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  document_type VARCHAR(50) CHECK (
    document_type IN ('passport', 'driver_license', 'national_id')
  ),
  file_url VARCHAR(500),
  status VARCHAR(20) DEFAULT 'pending',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_bets_status ON bets(status);
CREATE INDEX IF NOT EXISTS idx_bets_created_at ON bets(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_bet_participants_user_id
  ON bet_participants(user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_user_id ON transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_created_at
  ON transactions(created_at DESC);
