# GoWin — Deploying All Updates to Production (v2 · June 2026)

This is the **comprehensive update guide** covering every feature and change built since the initial deployment.  
Use this when updating an existing Linode server, or when setting up a fresh server with the full current codebase.  
For the very first server setup (Docker, Nginx, SSL), see `DEPLOYMENT_GUIDE.md`.

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
git commit -m "feat: full update — odds filter, pawapay, currency, layout, nav badges"
git push origin main
```

Confirm the commits are visible at **https://github.com/sergems/gowin**.

---

## Step 2 — SSH into the Linode server

```bash
ssh root@172.105.149.205
```

---

## Step 3 — Update docker-compose.yml (one-time — add slides volume)

If this is your first update after the initial deploy, the `slides` volume entry is not in your server's `docker-compose.yml` yet. Add it now so uploaded banner images survive container rebuilds:

```bash
nano /var/www/gowin/docker-compose.yml
```

Replace the entire file with:

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

> **Why:** Banner slide images uploaded through Admin → Slides are stored in `/app/uploads/slides` inside the container. Without a named volume, they are wiped on every `docker compose up --build -d`. The `pgdata` volume was already there for the database.

---

## Step 4 — Update the .env file (if needed)

Open the env file on the server and confirm/add any missing values:

```bash
nano /var/www/gowin/.env
```

The full required `.env` for this version:

```env
# ── Required ───────────────────────────────────────────────────────────
NODE_ENV=production
PORT=8080

# Postgres — use the same password in both lines
POSTGRES_USER=gowin
POSTGRES_PASSWORD=YOUR_STRONG_PASSWORD
POSTGRES_DB=gowindb
DATABASE_URL=postgresql://gowin:YOUR_STRONG_PASSWORD@db:5432/gowindb

# ── Optional: email (password resets / OTP) ────────────────────────────
SMTP_HOST=
SMTP_PORT=
SMTP_USER=
SMTP_PASS=
SMTP_FROM=
APP_URL=https://gowinrdc.com
```

> **Note:** PawaPay API credentials (token, environment, correspondent IDs) are managed through **Admin → Settings → PawaPay** in the app — they are stored in the database, not in `.env`.

Save: `Ctrl+X` → `Y` → `Enter`.

---

## Step 5 — Pull and rebuild

```bash
cd /var/www/gowin
git pull
docker compose up --build -d
```

The entrypoint script runs `schema.sql` automatically on every start — it is fully idempotent and safe to run on an existing database. This update adds:
- `payment_clerk` to the `user_role` enum (if not already present)
- `wallets.currency` column (if not already present)
- `pawapay_deposits` and `webhook_logs` tables (if not already present)
- `usd_to_cdf_rate` seed value in settings (if not already present)

Watch the logs:

```bash
docker compose logs -f app
```

Expected:

```
[entrypoint] PostgreSQL is ready.
[entrypoint] Applying database schema...
[entrypoint] Schema applied.
[entrypoint] Starting API server...
Server listening  port: 8080
```

---

## Step 6 — Verify

Open **https://gowinrdc.com** and check the items below:

| What to check | Expected |
|---------------|----------|
| Home page | Banner slider starts flush at the top — no gap above it |
| Sports / fixtures | Only games with at least one odd are listed |
| Country/league sidebar | Only leagues that have bettable upcoming fixtures appear |
| Sidebar (logged out) | Google Play badge below the Fixtures PDF link |
| Sidebar (logged in) | Google Play badge below the Wallet link |
| Mobile bottom nav | Google Play badge between Wallet and Bet Slip |
| Footer | One slim line: copyright · Privacy · Terms (no store badges) |
| Admin → Settings | Currency section shows USD/CDF exchange rate input and "Fetch live rate" button |
| Admin → Users | Wallet balances display in the selected currency |
| Admin → Withdrawals | Amounts display in the selected currency |
| Password reset | Forgot-password flow works; 3 failed logins trigger forced reset |
| Fixtures PDF | Sidebar link downloads a PDF coupon with upcoming matches |

---

## Complete feature list (all sessions)

| Feature | Details |
|---------|---------|
| **Sports betting** | Browse fixtures by league/country; place single and accumulator bets; real-time odds updates via WebSocket |
| **Odds filter** | Only fixtures with at least one available odd are shown in lists and the sidebar nav |
| **Wallet** | Deposit, withdraw, view transaction history; balances shown in USD or CDF |
| **USD / CDF currency** | Admin sets exchange rate (manual or "Fetch live rate" from API); all amounts displayed in selected currency |
| **PawaPay integration** | Mobile money gateway for deposits; `payment_clerk` role manages deposit processing; multi-currency wallets |
| **Password recovery** | Email OTP self-service reset; admin-issued temp password (1 hr, shown in UI + optional email); 3 failed logins → forced reset |
| **Admin panel** | Users (roles, wallet credit/debit, block/unblock, reset passwords), Fixtures, Bets, Withdrawals, Vouchers, Settings, Slides |
| **Branch management** | Branch admins, agents, float allocation, cash-up sessions |
| **Fixtures PDF** | Daily PDF coupon generated at 08:00 and 13:00; only fixtures with odds included; downloadable from sidebar |
| **Banner slider** | Admin uploads and reorders promotional slides; full-bleed display from the top of the viewport |
| **Navigation** | Floating header (no height impact); Google Play download badge in sidebar and mobile bottom nav |
| **Notifications** | In-app notification bell for users; bet settlement alerts |
| **Bet booking** | Share a bet slip by code; recipient can load and place the same selections |
| **Results page** | Browse settled fixtures and outcomes |
| **Email** | nodemailer for OTP, temp passwords, lockout notices (optional — skipped if SMTP not configured) |

---

## Rollback

If the update causes a problem:

```bash
cd /var/www/gowin
git log --oneline -5          # find the last known-good commit
git checkout <commit-hash>
docker compose up --build -d
```

---

## Troubleshooting

**No fixtures showing after deploy**  
→ The odds filter is working. Odds are refreshed every 10 minutes by the live sync worker. Wait a few minutes and reload. Check: `docker compose exec db psql -U gowin -d gowindb -c "SELECT COUNT(*) FROM odds;"`

**Slide images missing after rebuild**  
→ The `slides` volume was not in `docker-compose.yml`. Follow Step 3 above, then restore images through Admin → Slides.

**502 Bad Gateway**  
→ App container still starting. Wait 30 s. Check: `docker compose ps` and `docker compose logs app`.

**`payment_clerk` role error on startup**  
→ Schema migration adds it automatically. Check: `docker compose logs app | grep entrypoint`.

**SSL certificate expired**  
→ `certbot renew` — or check: `certbot certificates`.

**Out of disk space**  
→ `docker system prune -af` (removes old images — data volumes are safe).

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
