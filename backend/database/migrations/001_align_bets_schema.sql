-- Align existing Railway databases with the current bets schema.
-- Safe to run more than once.

ALTER TABLE bets
  ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES users(id);

ALTER TABLE bets
  ADD COLUMN IF NOT EXISTS total_stakes DECIMAL(15,2) DEFAULT 0 CHECK (total_stakes >= 0);

ALTER TABLE bets
  ADD COLUMN IF NOT EXISTS result VARCHAR(1) NULL CHECK (result IN ('A', 'B') OR result IS NULL);

ALTER TABLE bets
  ADD COLUMN IF NOT EXISTS category VARCHAR(50) DEFAULT 'general';

ALTER TABLE bets
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;

CREATE TABLE IF NOT EXISTS bet_participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bet_id UUID REFERENCES bets(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  outcome VARCHAR(1) NOT NULL CHECK (outcome IN ('A', 'B')),
  stake_amount DECIMAL(15,2) NOT NULL CHECK (stake_amount > 0),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(bet_id, user_id)
);

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

CREATE INDEX IF NOT EXISTS idx_bets_status ON bets(status);
CREATE INDEX IF NOT EXISTS idx_bets_created_at ON bets(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_bet_participants_user_id
  ON bet_participants(user_id);
