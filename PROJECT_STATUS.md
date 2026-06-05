# Lets Bet Project Status Tracker

/*********************************************************
 Author:                Philip Awazie Donvip
 Year Created:          2026
 Description:           Living status, caveat, and follow-up tracker for Lets Bet.
 Modified By:           Philip Awazie Donvip
 Modified Date:         2026-06-05
 Modification Notes:    Created tracker for completed work, open caveats, and pending checks.
*********************************************************/

## Update Rule

Update this file whenever code, infrastructure, environment variables, database schema, or deployment behavior changes. Before each commit, check this file and move items between `Open Caveats`, `Next Actions`, and `Completed` so pending work is not forgotten.

When a caveat is fully fixed and verified:

- Move it to `Completed`.
- Add the date, commit hash when available, and verification command/result.
- Remove it from `Open Caveats` or `Next Actions`.

## Current Snapshot

| Area | Status | Notes |
| --- | --- | --- |
| Backend API | Working locally | Auth/register fixed after crypto wallet provisioning changes. |
| Railway backend | Deploys from `origin/main` | Last pushed backend crypto deposit work is `ce56f2f`. |
| Crypto Phase 6C-1 | Complete | Schema, ledger foundation, crypto config, and testnet mode are in place. |
| Crypto Phase 6C-2 | Complete with caveats | User crypto wallets auto-provision on signup; frontend crypto wallet UI is still pending. |
| Crypto Phase 6C-3 | Implemented for testnet/manual testing | Scanner, worker, confirmation engine, idempotency, and manual deposit proof API are in place. |

## Open Caveats

| ID | Area | Caveat | Impact | Needed Fix | Status |
| --- | --- | --- | --- | --- | --- |
| CAV-001 | Crypto scanning | `BASE_USDT_CONTRACT` / `BASE_TESTNET_USDT_CONTRACT` is not configured yet. | Real Base Sepolia USDT transfer scanning logs `No USDT contract configured`. Manual deposit proof still works. | Add a deployed Base Sepolia mock USDT contract address to local backend `.env` and Railway env vars. | Open |
| CAV-002 | Treasury confirmation | Testnet treasury confirmation is currently automatic after confirmations/manual proof. | Good for testnet, but not production-grade treasury proof yet. | Build treasury sweep verification with sweep tx hash, treasury wallet balance/proof checks, retry, and manual review fallback. | Open |
| CAV-003 | Worker deployment | `scripts/deposit-worker.js` runs only when started as a separate process. | Deposits will not be scanned continuously unless the worker is running. | Add Railway worker service/process configuration for the deposit worker. | Open |
| CAV-004 | Crypto frontend | Users cannot see crypto wallets in the frontend yet. | Backend APIs exist, but customers cannot test crypto deposit addresses from UI. | Build crypto wallet page, network tabs, copy address, QR code, deposit history, and withdrawal UI. | Open |
| CAV-005 | Persistent notifications table | Some backend notification writes are optional because `notifications` table may not exist in all environments. | Realtime notifications work, but durable notification history may be incomplete. | Add or verify persistent `notifications` schema and migration. | Open |
| CAV-006 | SOL/TON/BNB scanners | Non-Base scanner adapters are placeholders/not fully implemented. | Mainnet or multi-network scanning is not ready. | Build BNB, Solana, and TON scanner adapters with network-specific idempotency keys. | Open |

## Next Actions

| Priority | Task | Depends On | Notes |
| --- | --- | --- | --- |
| High | Configure Base Sepolia mock USDT contract env vars. | Deployed/mock token address. | Required before real scanner can detect ERC20 transfers. |
| High | Add Railway worker service for deposit scanner. | Worker command and Railway service/process setup. | Command: `node scripts/deposit-worker.js`. |
| High | Build treasury sweeping/proof service. | Platform wallet env vars. | Must verify funds entered system/admin/treasury wallet before production crediting. |
| High | Build frontend crypto wallet UI. | Backend `/crypto/*` APIs. | Needed for clients to test crypto wallets visually. |
| Medium | Add admin crypto dashboard. | Deposit/withdrawal data and admin auth. | Needed for manual review and treasury visibility. |
| Medium | Add persistent notification schema if missing. | DB migration. | Required for notification history beyond WebSocket delivery. |

## Completed

| Date | Item | Commit | Verification |
| --- | --- | --- | --- |
| 2026-06-05 | Added Phase 6C crypto database schema and applied it to Railway PostgreSQL. | Earlier Phase 6C commits | Verified crypto tables and `network_fees` existed in Railway DB. |
| 2026-06-05 | Added crypto config, ledger service, withdrawal risk service, crypto routes, and wallet provisioning APIs. | `3f33755` and related commits | Backend import checks and API registration tests passed. |
| 2026-06-05 | Auto-provisioned crypto wallets on signup and fixed Railway crypto startup crash. | `2e55afd`, `dbbef64`, `8e038ba` | Local `/auth/register` returned `201 Created`; Railway crash caused by Solana dependency was removed. |
| 2026-06-05 | Added Base deposit scanner, deposit confirmation engine, manual deposit proof API, and deposit worker. | `ce56f2f` | `node --check`, import checks, `git diff --check`, and worker startup scan passed. |

## Verification Commands

Use these when touching the crypto backend:

```bash
node --check backend/controllers/crypto.js backend/routes/crypto.js backend/services/deposit-engine.js backend/services/deposit-scanner.js backend/scripts/deposit-worker.js
node -e "require('./backend/controllers/crypto'); require('./backend/routes/crypto'); require('./backend/services/deposit-scanner'); console.log('crypto deposit imports ok')"
git diff --check
```

Use this to run the deposit worker locally:

```bash
cd "Lets Bet/backend"
node scripts/deposit-worker.js
```

Expected current worker behavior without a Base mock USDT contract:

```text
Starting Deposit Scanner (Mode: testnet)
=== Starting Deposit Scan ===
[BASE] Starting deposit scan from block latest
[BASE] No USDT contract configured
[BASE] Found 0 new deposits
=== Deposit Scan Complete ===
```

## Manual Test Deposit API

Endpoint:

```http
POST /crypto/manual-deposit
Authorization: Bearer <token>
Content-Type: application/json
```

Body:

```json
{
  "network": "base",
  "amount": 100,
  "txHash": "manual-test-unique-001",
  "fromAddress": "0x1111111111111111111111111111111111111111"
}
```

Notes:

- Testnet mode only.
- Base Sepolia only for now.
- Use a unique `txHash` every time.
- Duplicate `txHash` returns `409` and must not double-credit the wallet.
