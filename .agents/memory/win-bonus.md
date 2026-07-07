---
name: Win Bonus promotion
description: Architecture decisions for the Multi Bet Win Bonus feature
---

# Win Bonus Implementation

## Config storage
Stored as JSON in `settings` table under key `win_bonus_config`. Falls back to `DEFAULT_WIN_BONUS_CONFIG` in `winBonus.ts` if absent.

## Key files
- `artifacts/api-server/src/lib/winBonus.ts` — canonical calculation logic, config load/save
- `artifacts/api-server/src/routes/winBonus.ts` — GET /win-bonus (public), GET/PUT /admin/win-bonus, POST /bets/calculate
- DB columns added to `bets` table: `qualifying_selections`, `bonus_percentage`, `base_win`, `bonus_amount`, `max_win_applied`

## Business rules enforced on backend
- Bonus only on accumulators (≥2 selections)
- Qualifying odds: `> minQualifyingOdds` (strict greater-than, default 1.50)
- `maxSelections` enforced in POST /bets (returns 400 if exceeded)
- Bonus calculated at placement and stored; settlement uses stored `potentialWin` — never recalculated
- potentialWin = min(baseWin + bonusAmount, maxPayout)

## OpenAPI / codegen gotcha
`UserRole` enum in openapi.yaml must list ALL roles: `[user, admin, manager, branch_admin, agent, payout, payment_clerk]`. If only `[user, admin]` are present, orval codegen creates a union type that causes TypeScript comparison errors across App.tsx and Shell.tsx.

**Why:** The app uses role-based routing for 7 roles, but the old spec only enumerated 2. After any codegen run with the old spec, `UserRole` becomes `"user" | "admin"` and all comparisons like `role === "payment_clerk"` fail type-checking.
