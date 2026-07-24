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

To import the database from the included dump:
```bash
sed '5d' database.sql | psql $DATABASE_URL
```

The `database.sql` file at the repo root is the canonical pg_dump (the 5th line contains a non-standard `\restrict` directive that must be stripped before import). `scripts/schema.sql` is stale — do not use it.

To reset and re-import from scratch:
```bash
psql $DATABASE_URL -c "DROP SCHEMA public CASCADE; CREATE SCHEMA public;"
sed '5d' database.sql | psql $DATABASE_URL
```

## Key features

- Multi-sport betting: Football, Basketball, Tennis, Cricket (AllSportsAPI sync)
- Live in-play odds with WebSocket updates
- Full Cash Out with dynamic live engine
- PawaPay mobile money (deposits/withdrawals/clerk flow)
- Multi Bet Win Bonus (up to 1250%)
- 1UP/2UP football sub-markets
- Referral rewards system
- Admin panel with financial reporting

## Replit setup (first-time)

On a fresh clone/import, run these steps before starting the workflows:

1. **Install dependencies**
   ```bash
   pnpm install
   ```

2. **Import the database** (`DATABASE_URL` is provided automatically by Replit)
   ```bash
   sed '5d' database.sql | psql $DATABASE_URL
   ```

3. **Start both workflows** — they will start automatically, or restart them from the Replit UI.

The following environment variables/secrets are required for full functionality:

| Secret | Purpose | Required? |
|--------|---------|-----------|
| `DATABASE_URL` | PostgreSQL connection (auto-provided by Replit) | ✅ Always |
| `SESSION_SECRET` | JWT fallback secret | ✅ Always |
| `ALLSPORTS_API_KEY` | Live fixture/odds sync (AllSportsAPI) | For live betting |
| `PAWAPAY_API_KEY` | PawaPay mobile money gateway | For payments |
| `PAWAPAY_BASE_URL` | PawaPay base URL (sandbox or prod) | For payments |
| `APIVERVE_KEY` | Lottery draw results sync | For lottery |

## User preferences

- Keep existing project structure and stack
