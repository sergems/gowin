---
name: PawaPay Integration
description: Architecture decisions and key gotchas for the PawaPay mobile money gateway integration
---

## What was built

Full PawaPay mobile money integration for GoWin RDC covering deposits (collections), payouts (disbursements), the new `payment_clerk` role, multi-currency wallets (CDF + USD), and admin configuration.

## Key architecture decisions

### Multi-currency wallets
Each user can have multiple wallet rows — one per currency. The `wallets.currency` column (VARCHAR(3), default 'USD') differentiates them. Queries filter by `WHERE userId = ? AND currency = ?`. A CDF wallet is auto-created on first CDF deposit if none exists. Never convert between currencies in code.

### Deposit flow
1. User picks currency + operator + phone, POSTs `/api/pawapay/deposits`
2. Server generates UUID depositId, stores in `pawapay_deposits`, calls PawaPay `/deposits`
3. Frontend navigates to `/wallet/deposit/:depositId` which polls `/api/pawapay/deposits/:depositId` every 4s
4. On COMPLETED: wallet credited, `walletCredited=true` flag prevents double-credit
5. Webhook at `/api/pawapay/webhook` also handles completion (belt-and-suspenders)

### Withdrawal / Payment Clerk flow
- `pending` → admin approves → `approved` → payment clerk authorises → `processing` (PawaPay payout sent) → `completed` or `failed`
- Balance is deducted at withdrawal request time; refunded on `rejected` or `failed`
- Clerk cannot see pending withdrawals (only admin-approved ones)
- `requirePaymentClerk` middleware: allows `payment_clerk` OR `admin`

### PawaPay configuration
Stored in `settings` table via `getMetaSetting`/`setMetaSetting`. Keys: `pawapay_api_token` (sandbox), `pawapay_prod_api_token` (production), `pawapay_sandbox`, `pawapay_deposits_enabled`, `pawapay_withdrawals_enabled`, `pawapay_min/max_deposit/withdrawal`. Admin UI at Settings → PawaPay Mobile Money card. Separate token fields for sandbox vs production — `getPawapayConfig()` picks the right token based on mode.

### DRC operators
- `ORANGE_CD` — CDF + USD
- `AIRTEL_CD` — CDF only
- `VODACOM_CD` — CDF + USD (M-Pesa)
- `AFRICELL_CD` — CDF only

**Why:** PawaPay operator codes are uppercase, underscore-separated, country-suffixed. Frontend filters operators by selected currency.

### PawaPay API endpoints (v2)
- Sandbox: `https://api.sandbox.pawapay.io`
- Production: `https://api.pawapay.io`
- `POST /deposits` — initiate collection
- `GET /deposits/{depositId}` — poll status
- `POST /payouts` — initiate payout
- `GET /payouts/{payoutId}` — poll payout status
- Auth: `Authorization: Bearer {token}`

### DB schema additions
- `wallets.currency` VARCHAR(3) NOT NULL DEFAULT 'USD'
- `withdrawals`: currency, phone_number, operator, pawapay_payout_id, pawapay_status, pawapay_response (JSONB), clerk_id, clerk_note, clerk_actioned_at
- `withdrawal_status` enum extended: clerk_review, processing, completed, failed
- `user_role` enum extended: payment_clerk
- New table `pawapay_deposits`
- New table `webhook_logs`

### Routes added
- `GET /api/pawapay/config` — public config (no auth)
- `GET /api/pawapay/operators` — operator list (no auth)
- `POST /api/pawapay/deposits` — initiate deposit (requireAuth, blocks staff)
- `GET /api/pawapay/deposits/:depositId` — poll status (requireAuth, ownership check)
- `POST /api/pawapay/webhook` — webhook receiver (no auth, logged)
- `GET /api/clerk/withdrawals` — approved withdrawals (requirePaymentClerk)
- `POST /api/clerk/withdrawals/:id/authorize` — trigger payout (requirePaymentClerk)
- `POST /api/clerk/withdrawals/:id/reject` — refund + reject (requirePaymentClerk)
- `GET /api/clerk/withdrawals/:id/payout-status` — check PawaPay payout (requirePaymentClerk)
- `GET /api/admin/pawapay/settings` — (requireAdmin)
- `PUT /api/admin/pawapay/settings` — (requireAdmin)

## Frontend pages
- `/wallet` — Mobile Money tab (default), Voucher tab, Withdraw tab
- `/wallet/deposit/:depositId` — polling status page (auto-refreshes every 4s, stops after 5min)
- `/clerk` — clerk dashboard
- `/clerk/withdrawals` — approve/reject/check-status page
