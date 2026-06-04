# Phase 6C: Crypto Payments + Wallet Infrastructure

/*********************************************************
 Author:                Philip Awazie Donvip
 Year Created:          2026
 Description:           Exchange-grade crypto payment plan for Lets Bet.
 Modified By:           Philip Awazie Donvip
 Modified Date:         2026-06-04
 Modification Notes:    Added deposit proof, treasury confirmation, risk controls, and implementation order.
*********************************************************/

## Goal

Build production-grade crypto deposits and withdrawals for Lets Bet with user-specific deposit wallets, admin/treasury wallet confirmation, immutable ledger records, and testnet-safe rollout.

## Supported Networks

| Network | Asset | Production Notes | Test Mode Notes |
| --- | --- | --- | --- |
| BNB Smart Chain | USDT BEP20 | EVM-compatible USDT deposits and withdrawals | Use BNB testnet or Base Sepolia mock USDT for early tests |
| Solana | USDT SPL | Solana token-account deposit tracking | Use devnet/test token during local testing |
| TON | USDT Jetton | Jetton transfer detection with memo/comment support where needed | Use TON testnet Jetton/mock flow |
| Base Sepolia | Mock USDT | Not production USDT; used for safer EVM test flow | Primary local/staging testnet |

## Upgraded Feature List

| # | Feature | Priority | Notes |
| --- | --- | --- | --- |
| 1 | Crypto Ledger System | Critical | Immutable records for deposits, withdrawals, fees, locked stakes, payouts, reversals, and admin adjustments |
| 2 | Deposit Confirmation Engine | Critical | States: `detected`, `confirming`, `credited`, `failed`, `manual_review` |
| 3 | Deposit Proof and Treasury Confirmation | Critical | Credit only after funds enter a platform/admin/treasury wallet and proof is stored |
| 4 | Hot Wallet + Treasury Sweeping | Important | Sweep user deposits into treasury/hot wallet and track sweep tx hash |
| 5 | Withdrawal Risk Controls | Critical | Limits, cooldowns, KYC tier checks, address risk flags, and large-withdrawal approval |
| 6 | Address Whitelisting | Important | Saved trusted addresses with optional delay for newly added addresses |
| 7 | Network Fee Estimator | Nice | Estimate BNB/SOL/TON fees and show platform fee before confirmation |
| 8 | Explorer Links | Important | Store tx hash and build explorer links for deposits, sweeps, and withdrawals |
| 9 | Idempotency + Double-Credit Protection | Critical | Process each chain transaction once using unique network + tx hash + log/index keys |
| 10 | Admin Crypto Dashboard | Important | Pending deposits, withdrawals, manual review, treasury balances, and failed transfers |
| 11 | Compliance Safety Layer | Critical | KYC limits, country restrictions, suspicious activity flags, and audit logs |
| 12 | Testnet Mode | Critical | `CRYPTO_MODE=testnet|mainnet`; block mainnet actions until env is explicitly configured |

## Deposit Confirmation Rule

When a user deposits crypto, the system must not credit the user's app wallet just because a transaction exists on-chain. The deposit is credited only after all of these are true:

1. The deposit transaction is detected on the correct network and token contract.
2. The receiving address belongs to the user or a valid platform-controlled deposit address.
3. The amount, asset, decimals, and network are normalized and verified.
4. Required confirmations/finality have passed for that network.
5. The same transaction has not already been processed.
6. Funds have entered a system-controlled wallet, admin wallet, hot wallet, or treasury wallet.
7. Proof is stored: tx hash, block/slot/lt, sender address, receiving address, amount, confirmations, explorer URL, detected timestamp, credited timestamp, and scanner source.
8. If sweeping is enabled, the sweep transaction to treasury is recorded. If sweep fails, the deposit may be credited only when policy allows it and the failure is visible in admin review.

## Implementation Order

### 1. Database and Ledger Foundation

- Add `crypto_wallets` table for user deposit addresses per network.
- Add `crypto_ledger_entries` table for immutable accounting movements.
- Add `crypto_deposits` table for deposit detection, confirmation state, proof fields, and idempotency keys.
- Add `crypto_withdrawals` table for withdrawal state, risk checks, tx hash, and approval details.
- Add `crypto_addresses` table for whitelisted withdrawal addresses.
- Add `crypto_audit_logs` table for admin actions, risk events, and scanner actions.

### 2. Backend Crypto Services

- Add network config service with `CRYPTO_MODE`, RPC URLs, token contracts, treasury addresses, and confirmation thresholds.
- Add wallet provisioning service for user deposit wallets.
- Add deposit scanner worker/service for BNB, Solana, TON, and Base Sepolia test mode.
- Add deposit confirmation service that transitions deposits through the full state machine.
- Add treasury sweeping service with retry and manual review fallback.
- Add idempotency guard around every detected transaction.

### 3. Backend API Routes

- `GET /crypto/wallets` returns user deposit addresses.
- `GET /crypto/deposits` returns deposit history and proof.
- `POST /crypto/withdrawals` requests withdrawal after risk checks.
- `GET /crypto/withdrawals` returns withdrawal history.
- `POST /crypto/addresses` adds whitelisted withdrawal address.
- `GET /crypto/fees` returns network and platform fee estimates.
- Admin routes for pending deposits, pending withdrawals, manual review, and treasury balances.

### 4. Withdrawal Controls

- Require authentication and KYC eligibility.
- Enforce per-transaction and daily limits by KYC tier.
- Add cooldown after signup, password change, or new withdrawal address.
- Require admin approval for large or suspicious withdrawals.
- Store risk score and reason codes.
- Ensure withdrawal ledger entry and blockchain tx are tied together.

### 5. Frontend User Experience

- Crypto wallet page with network tabs: BNB, Solana, TON, Base Sepolia test mode.
- Deposit address QR code and copy button.
- Deposit proof/history with states and explorer links.
- Withdrawal form with whitelisted addresses, fee preview, and confirmation summary.
- Clear testnet/mainnet badge.
- Notification integration for deposit credited, withdrawal approved, withdrawal sent, and manual review.

### 6. Admin Experience

- Crypto dashboard with pending deposits, sweep failures, withdrawal queue, and treasury balances.
- Manual review actions with required audit reason.
- User crypto wallet lookup.
- Network health indicators for scanner/RPC status.

### 7. Safety Rules

- Never store private keys in plaintext.
- Never log private keys, seed phrases, or signing payload secrets.
- Mainnet must require explicit env opt-in.
- Every balance mutation must go through the ledger.
- Every blockchain event must be idempotent.
- Every admin override must write an audit log.

## Suggested Phase Breakdown

| Subphase | Scope |
| --- | --- |
| 6C-1 | Database schema, ledger model, crypto config, and testnet mode |
| 6C-2 | User wallet provisioning and deposit-address API |
| 6C-3 | Base Sepolia/mock USDT deposit scanner and confirmation proof |
| 6C-4 | BNB/Solana/TON scanner adapters |
| 6C-5 | Treasury sweeping and deposit crediting |
| 6C-6 | Withdrawal requests, risk controls, and admin approvals |
| 6C-7 | Frontend crypto wallet UI and notification integration |
| 6C-8 | Admin crypto dashboard |

## Open Decisions Before Coding Mainnet

- Which wallet custody provider or key-management approach will be used?
- Which RPC providers will be used for BNB, Solana, TON, and Base Sepolia?
- What are the exact KYC tiers and withdrawal limits?
- Which treasury/admin wallet addresses are approved for each network?
- Should early testing use only Base Sepolia mock USDT before enabling BNB/SOL/TON test flows?
