# GoWin — Deploying All Updates to Production (v2 · June 2026)

This is the **complete update guide** covering every feature and change built since the initial deployment.  
Use this when updating the existing Linode server. The server is already set up with Docker, Nginx, and SSL.  
For initial server setup from scratch, see `DEPLOYMENT_GUIDE.md`.

---

## How the pipeline works

```
Replit (dev)  →  GitHub (sergems/gowin)  →  Linode (172.105.149.205)  →  gowinrdc.com
```

---

## Step 1 — Push from Replit to GitHub

In the Replit **Shell** tab:

```bash
git add .
git commit -m "feat: full v2 update — all features current as of June 2026"
git push origin main
```

Confirm the commits are visible at **https://github.com/sergems/gowin**.

---

## Step 2 — SSH into the Linode server

```bash
ssh root@172.105.149.205
```

---

## Step 3 — Update docker-compose.yml (replace entire file)

This version adds a `slides` volume so uploaded banner images survive rebuilds. Replace the entire file:

```bash
nano /var/www/gowin/docker-compose.yml
```

Paste:

```yaml
services:

  db:
    image: postgres:16-alpine
    restart: always
    env_file: .env
    environment:
      POSTGRES_USER: ${POSTGRES_USER}
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
      POSTGRES_DB: ${POSTGRES_DB}
    volumes:
      - pgdata:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U ${POSTGRES_USER} -d ${POSTGRES_DB}"]
      interval: 5s
      timeout: 5s
      retries: 10

  app:
    build: .
    restart: always
    env_file: .env
    ports:
      - "8080:8080"
    depends_on:
      db:
        condition: service_healthy
    volumes:
      - slides:/app/uploads/slides

volumes:
  pgdata:
  slides:
```

Save: `Ctrl+X` → `Y` → `Enter`.

> **Why the `slides` volume:** Banner slide images uploaded via Admin → Slides are stored in `/app/uploads/slides` inside the container. Without a named volume they are wiped on every rebuild. The `pgdata` volume was already present for the database — this just adds `slides`.

---

## Step 4 — Update the .env file

```bash
nano /var/www/gowin/.env
```

Confirm the file contains all of the following (replace `YOUR_STRONG_PASSWORD` with whatever password you set during initial setup):

```env
# ── Required ─────────────────────────────────────────────────────────────────
NODE_ENV=production
PORT=8080

# Postgres — use the same password in both lines
POSTGRES_USER=gowin
POSTGRES_PASSWORD=YOUR_STRONG_PASSWORD
POSTGRES_DB=gowindb
DATABASE_URL=postgresql://gowin:YOUR_STRONG_PASSWORD@db:5432/gowindb

# ── Optional: email (password resets / OTP) ───────────────────────────────────
SMTP_HOST=mail.gowinrdc.com
SMTP_PORT=465
SMTP_SECURE=true
SMTP_USER=no-reply@gowinrdc.com
SMTP_PASS=YOUR_SMTP_PASSWORD
SMTP_FROM=GoWin <no-reply@gowinrdc.com>
APP_URL=https://gowinrdc.com
```

> **PawaPay credentials** (API token, environment, correspondent IDs) are managed through **Admin → Settings → PawaPay** in the app — they are stored in the database, not in `.env`.

> **JWT secret** is also managed through **Admin → Settings** in the app — stored in the database, not in `.env`.

Save: `Ctrl+X` → `Y` → `Enter`.

---

## Step 5 — Pull and rebuild

```bash
cd /var/www/gowin
git pull
docker compose up --build -d
```

The entrypoint script runs `schema.sql` automatically on every start — it is fully **idempotent** (safe to run on an existing database with data). This update adds or migrates:

- All enum types (`bet_status`, `user_role` with `payment_clerk`, `branch_status`, `withdrawal_status`, etc.)
- All tables with `CREATE TABLE IF NOT EXISTS` and `ALTER TABLE … ADD COLUMN IF NOT EXISTS`
- `wallets.currency` column (USD default)
- `pawapay_deposits` and `webhook_logs` tables
- `branch_float_allocations` and `cash_up_sessions` tables
- `notifications` table
- `bet_bookings` table
- Seed row for `usd_to_cdf_rate` in settings (if not already present)

No data is wiped. No manual SQL needed.

Watch the logs while it builds and starts:

```bash
docker compose logs -f app
```

Expected output:

```
[entrypoint] Waiting for PostgreSQL to be ready...
[entrypoint] PostgreSQL is ready.
[entrypoint] Applying database schema...
[entrypoint] Schema applied.
[entrypoint] Starting API server...
{"level":30,"msg":"WebSocket server attached on /ws"}
{"level":30,"msg":"Server listening","port":8080}
{"level":30,"msg":"Live sync workers started"}
```

First rebuild after changes takes 5–10 minutes. Subsequent rebuilds are faster (Docker layer cache).

---

## Step 6 — Verify

Open **https://gowinrdc.com** and check all of the following:

| What to check | Expected |
|---------------|----------|
| Home page | Banner slider starts flush at the top — no gap above it |
| Sports / Fixtures | Only fixtures with at least one active odd are listed |
| Country/league sidebar | Only leagues with bettable upcoming fixtures appear |
| Sidebar (logged out) | Google Play badge visible below the Fixtures PDF link |
| Sidebar (logged in) | Google Play badge visible below the Wallet link |
| Mobile bottom nav | Google Play badge between Wallet and Bet Slip |
| Footer | Single slim line: copyright · Privacy · Terms |
| Fixtures PDF | Sidebar link downloads a PDF coupon with upcoming matches |
| Login / Register | Auth flow works; 3 failed logins trigger forced password reset |
| Forgot password | OTP email sent; reset-password page works |
| Wallet | Deposit and withdrawal flows work |
| Admin → Settings | PawaPay config section present; Currency section shows USD/CDF rate + "Fetch live rate" button |
| Admin → Users | Wallet balances shown in selected currency |
| Admin → Withdrawals | Amounts shown in selected currency |
| Admin → Slides | Upload, reorder, and delete banner slides |
| Admin → Branches | Branch list, create/edit branches |
| WebSocket | Live odds update in real time without page reload |
| Notifications | Bell icon in header; bet settlement alerts delivered |

---

## Complete feature list (all sessions — current as of June 2026)

| Feature | Details |
|---------|---------|
| **Sports betting** | Browse fixtures by league/country; single and accumulator bets; real-time odds via WebSocket |
| **Odds filter** | Only fixtures with at least one available odd are shown in all lists and the sidebar |
| **Live bet sync** | Scores updated every 60 s; odds refreshed every 10 s from external API + DB |
| **Auto-settle** | Finished fixtures settled automatically every 5 min; winnings credited to wallets |
| **Wallet** | Deposit, withdraw, view full transaction history; balances in USD or CDF |
| **USD / CDF currency** | Admin sets exchange rate (manual entry or "Fetch live rate"); all amounts displayed in selected currency |
| **PawaPay integration** | Mobile money gateway for deposits; multi-currency wallets; `payment_clerk` role manages processing |
| **Payment clerk** | Dedicated role for processing PawaPay deposits; scoped clerk dashboard |
| **Password recovery** | Email OTP self-service reset; admin-issued temp password (1 hr, shown in UI + optional email); 3-failed-login → forced reset |
| **Admin panel** | Full management: users (roles, wallet credit/debit, block/unblock, reset passwords), fixtures, bets, withdrawals, vouchers, settings, slides, branches |
| **Branch management** | Branch admins, agents with commission rates, float allocation, cash-up sessions |
| **Agent routes** | Commission tracking, agent-placed bets on behalf of users |
| **Payout management** | Dedicated payout role and flows for cash payouts |
| **API sync** | Admin can trigger external fixture/odds sync manually; scheduled background sync |
| **Fixtures PDF** | Daily PDF coupon generated at 08:00 and 13:00; only fixtures with odds included; downloadable from sidebar |
| **Banner slider** | Admin uploads and reorders promotional slides; full-bleed display flush from top of viewport |
| **Bet booking** | Share a bet slip by code; recipient can load and place the same selections |
| **Results page** | Browse settled fixtures and final scores |
| **Notifications** | In-app notification bell; bet settlement and system alerts |
| **Database switcher** | Admin can point the app at a different Postgres instance via Admin → Settings |
| **JWT management** | JWT secret managed via Admin → Settings; stored in DB; auto-seeded on first boot |
| **Email** | nodemailer for OTP, temp passwords, lockout notices (gracefully skipped if SMTP not configured) |
| **Navigation** | Floating header (no layout height impact); Google Play download badge in sidebar and mobile bottom nav |

---

## Rollback

If the update causes a problem:

```bash
cd /var/www/gowin
git log --oneline -5          # find the last known-good commit hash
git checkout <commit-hash>
docker compose up --build -d
```

---

## Troubleshooting

**No fixtures showing after deploy**  
→ The odds filter is active. The live sync worker refreshes odds every 10 min. Wait and reload.  
→ Check: `docker compose exec db psql -U gowin -d gowindb -c "SELECT COUNT(*) FROM odds;"`

**Slide images missing after rebuild**  
→ The `slides` volume was missing from `docker-compose.yml`. Follow Step 3 above, then re-upload via Admin → Slides.

**502 Bad Gateway**  
→ App container still starting. Wait 30 s.  
→ Check: `docker compose ps` and `docker compose logs app`.

**`payment_clerk` role error**  
→ Schema migration adds it automatically via `ALTER TYPE … ADD VALUE IF NOT EXISTS`.  
→ Check: `docker compose logs app | grep entrypoint`.

**SSL certificate expired**  
→ `certbot renew` — or check: `certbot certificates`.

**Out of disk space**  
→ `docker system prune -af` (removes old images — data volumes are safe).

**`ERR_PNPM_IGNORED_BUILDS`**  
→ `onlyBuiltDependencies` must be in `pnpm-workspace.yaml` (already correct in this version). Confirm after `git pull`.

---

## Useful commands

| Task | Command |
|------|---------|
| View live app logs | `docker compose logs -f app` |
| View database logs | `docker compose logs -f db` |
| Restart app only | `docker compose restart app` |
| Stop everything | `docker compose down` |
| Start after reboot | `cd /var/www/gowin && docker compose up -d` |
| Open a DB shell | `docker compose exec db psql -U gowin -d gowindb` |
| Database backup | `docker compose exec db pg_dump -U gowin gowindb > backup_$(date +%Y%m%d).sql` |
| Database restore | `docker compose exec -T db psql -U gowin -d gowindb < backup.sql` |
| Renew SSL manually | `certbot renew` |
| Check SSL expiry | `certbot certificates` |
| Check disk usage | `df -h` |
| Check memory | `free -h` |
| Clean old images | `docker system prune -af` |

---

*GoWin Sportsbook — gowinrdc.com · 172.105.149.205*
