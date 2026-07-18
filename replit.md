# GoWin RDC Sportsbook

A full-stack sports betting platform targeting the DRC (Democratic Republic of Congo) market, supporting football, basketball, tennis, and cricket. Features live in-play odds, PawaPay mobile money integration, multi-currency wallets, and a multi-language UI (English/French).

## Stack

- **Frontend**: React + Vite (`artifacts/gowin`) — served on port 5000
- **API Server**: Node.js/Fastify + Drizzle ORM (`artifacts/api-server`) — served on port 8080
- **Database**: PostgreSQL (Replit-managed, `DATABASE_URL` env var)
- **Monorepo**: pnpm workspaces

## How to run

Both workflows start automatically:

- `artifacts/gowin: web` — React frontend on port 5000
- `artifacts/api-server: API Server` — builds from `src/` via esbuild then runs `dist/index.mjs`

After any API server source change, the workflow must be restarted (it runs the dist bundle, not source directly).

## Database

Connection is via `DATABASE_URL` environment variable (PostgreSQL).

To reset/reimport the database from scratch:
```bash
psql $DATABASE_URL -c "DROP SCHEMA public CASCADE; CREATE SCHEMA public;"
psql $DATABASE_URL -f btk.sql
```

`btk.sql` (repo root) is the canonical full pg_dump — use it instead of `scripts/schema.sql` (which is stale).

## Key features

- Multi-sport betting: Football, Basketball, Tennis, Cricket (AllSportsAPI sync)
- Live in-play odds with WebSocket updates
- Full Cash Out with dynamic live engine
- PawaPay mobile money (deposits/withdrawals/clerk flow)
- Multi Bet Win Bonus (up to 1250%)
- 1UP/2UP football sub-markets
- Referral rewards system
- Admin panel with financial reporting

## User preferences

- Keep existing project structure and stack
