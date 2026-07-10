# GoWin — Complete Deployment Guide
### Full database reset + code deploy · gowinrdc.com · 172.105.149.205

> **This is the authoritative deploy guide.** It covers a complete fresh deploy:
> all production tables are dropped, the database is rebuilt from **`btk.sql`**,
> and the latest app code is deployed. Nothing is left behind.
>
> **Most updates do not need this.** If you only changed app code (no new tables/columns),
> use the **code-only deploy** in "You're done" below — it's faster and doesn't touch data.
> Use this full guide for the *first* deploy, or whenever you want to wipe production
> data back to a known snapshot.

---

## What this deploy does

- Drops every table on the production Postgres instance and rebuilds from `btk.sql`
- Pushes all latest code to GitHub and pulls it onto the server
- Ensures the `slides` Docker volume is configured (banner images survive rebuilds)
- Rebuilds and restarts the app container

**Pipeline:**
```
Replit (dev)  →  GitHub (sergems/gowin)  →  Linode 172.105.149.205  →  gowinrdc.com
```

⚠️ **Warning:** Step 5 permanently deletes all production data and replaces it with the data in `btk.sql`. There is no undo. Take a backup first (Step 3).

---

## Latest schema update — Full Cash Out (2026-07-10)

The Full Cash Out feature was added this cycle: customers can cash out a pending bet early at a
live, server-computed offer. This shipped with:

- New `bets` columns: `cash_out_amount`, `cash_out_at`, `cash_out_margin_used`, `cash_out_fair_value`,
  `cash_out_probability`, `cash_out_odds_snapshot`, `cash_out_ip`, `cash_out_device`
- New `cashed_out` value on the `bet_status` enum, and `cash_out` on `transaction_type`
- New `cash_out_audit_log` table (every offer/accept is recorded for admin reporting)
- New Admin → Cash Out page (Settings / Reports / Audit Log tabs)
- `scripts/schema.sql` (the idempotent migration the app runs on every container start) and
  `btk.sql` (the full fresh-install dump) have both been **regenerated to include this and all
  other previously-undocumented schema drift** (`notifications`, `referral_rewards`, Win Bonus
  columns on `bets`, 1UP/2UP's `up_won` on `bet_selections`, PawaPay columns on `withdrawals`,
  bonus-wallet columns on `wallets`, referral columns on `users`) — a **code-only deploy now
  correctly picks up this schema change automatically**, no full reset required.

> If your production database was deployed before this update, a plain code-only deploy
> (see "You're done" below) is sufficient — `scripts/schema.sql` runs automatically on
> container start and will add the missing pieces without touching existing data.

---

## Step 1 — Push the latest code to GitHub

Open the **Shell** tab in Replit and run:

```bash
git add .
git commit -m "feat: full deploy — latest code + btk.sql database reset"
git push origin main
```

Confirm the commit appears at **https://github.com/sergems/gowin** before continuing.

---

## Step 2 — SSH into the server

```bash
ssh root@172.105.149.205
```

Enter the root password when prompted. All remaining steps run on the server.

---

## Step 3 — Back up the current database (safety net)

Before wiping anything, save a copy of what is currently on production:

```bash
cd /var/www/gowin
docker compose exec db pg_dump -U gowin gowindb > backup_$(date +%Y%m%d_%H%M%S).sql
ls -lh backup_*.sql
```

Confirm the file is non-zero in size. Keep it — if anything goes wrong you can restore from it.

---

## Step 4 — Pull the latest code (includes btk.sql)

```bash
cd /var/www/gowin
git pull
```

This brings down the latest code **and** the `btk.sql` file from GitHub.

Confirm `btk.sql` is present:

```bash
ls -lh btk.sql
```

---

## Step 5 — Drop all tables and restore from btk.sql

This is the full database reset. It connects directly to the running Postgres container,
drops every object in the `public` schema, then restores everything from `btk.sql`.

```bash
# Step 5a — Drop everything in the public schema
docker compose exec db psql -U gowin -d gowindb -c "DROP SCHEMA public CASCADE; CREATE SCHEMA public;"

# Step 5b — Restore all tables and data from btk.sql
docker compose exec -T db psql -U gowin -d gowindb < btk.sql
```

Verify the tables came back:

```bash
docker compose exec db psql -U gowin -d gowindb -c "\dt"
```

You should see all 23 tables listed. Also spot-check data:

```bash
docker compose exec db psql -U gowin -d gowindb -c "SELECT COUNT(*) FROM users;"
docker compose exec db psql -U gowin -d gowindb -c "SELECT COUNT(*) FROM fixtures;"
docker compose exec db psql -U gowin -d gowindb -c "SELECT COUNT(*) FROM odds;"
```

---

## Step 6 — Update docker-compose.yml

This ensures the `slides` named volume is configured so banner images persist across rebuilds.

```bash
nano /var/www/gowin/docker-compose.yml
```

**Delete the entire contents** and paste the following exactly:

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

Save and exit: **Ctrl+X → Y → Enter**

---

## Step 7 — Check the .env file

```bash
nano /var/www/gowin/.env
```

Make sure all of these variables are present:

```env
# ── Required ──────────────────────────────────────────────────────────────────
NODE_ENV=production
PORT=8080

# Postgres — must be identical in both lines
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

> **Note:** PawaPay credentials and the JWT secret are stored in the database `settings` table — they came in via `btk.sql` and do not go in `.env`.

Save and exit: **Ctrl+X → Y → Enter**

---

## Step 8 — Rebuild and restart the app

```bash
cd /var/www/gowin
docker compose up --build -d
```

This rebuilds the app container with the latest code and restarts everything.
First rebuild takes 5–10 minutes; subsequent rebuilds are faster due to Docker's layer cache.

---

## Step 9 — Watch the startup logs

```bash
docker compose logs -f app
```

You are looking for this exact sequence:

```
[entrypoint] Waiting for PostgreSQL to be ready...
[entrypoint] PostgreSQL is ready.
[entrypoint] Applying database schema...
[entrypoint] Schema applied.
[entrypoint] Starting API server...
{"msg":"WebSocket server attached on /ws"}
{"msg":"Server listening","port":8080}
{"msg":"Live sync workers started"}
```

Press **Ctrl+C** once you see the server is up.

---

## Step 10 — Verify the live site

Open **https://gowinrdc.com** and check every item in this list:

| What to check | Expected result |
|---|---|
| Home page | Loads without errors; banner slider shows |
| Sports / Fixtures | Fixtures with odds are listed |
| Sidebar (logged out) | "Download the Go Win RDC Official App" label above Google Play badge |
| Sidebar (logged in) | Same label + Google Play badge |
| Footer | Copyright · Privacy · Terms |
| Fixtures PDF link | Downloads a PDF coupon of upcoming matches |
| Login / Register | Auth works |
| Forgot password | OTP email sent; reset-password page works |
| Wallet | Deposit and withdrawal flows work |
| Admin → Settings | PawaPay config section present; USD/CDF rate controls visible |
| Admin → Slides | Can upload, reorder, and delete banner slides |
| Admin → Branches | Branch list shows; can create/edit branches |
| Admin → Users | Wallet balances shown; can reset passwords, credit/debit wallets |
| Live odds | Odds update in real time without page reload (WebSocket) |
| Notifications | Bell icon in header; bet settlement alerts appear |
| Cash Out (customer) | Place a pending bet on a live/upcoming fixture → History tab shows an amber "Cash Out" button with a live offer; accepting credits the wallet and moves the bet to the "Cashed Out" tab |
| Admin → Cash Out | Settings tab saves and version-increments; Reports tab shows totals; Audit Log lists offer/accept events |

---

## You're done ✓

Future code-only deploys (no database reset) use the short path:

```bash
# On Replit — push new code
git add . && git commit -m "your message" && git push origin main

# On the server — pull and rebuild
cd /var/www/gowin && git pull && docker compose up --build -d
```

For a future **database-only refresh** (new btk.sql, no code changes):
```bash
git pull   # get the new btk.sql
docker compose exec db psql -U gowin -d gowindb -c "DROP SCHEMA public CASCADE; CREATE SCHEMA public;"
docker compose exec -T db psql -U gowin -d gowindb < btk.sql
docker compose restart app
```

---

## Troubleshooting

**`DROP SCHEMA` fails with "other users are connected"**
→ The app container is connected to the DB. Stop it first, then drop:
```bash
docker compose stop app
docker compose exec db psql -U gowin -d gowindb -c "DROP SCHEMA public CASCADE; CREATE SCHEMA public;"
docker compose exec -T db psql -U gowin -d gowindb < btk.sql
docker compose up -d
```

**`btk.sql` restore prints errors about roles or extensions**
→ Ignore warnings about `postgres` role ownership — they are harmless on a single-user Postgres setup.
→ If you see `ERROR: relation already exists`, the drop did not complete cleanly. Re-run Step 5a.

**No fixtures showing after deploy**
→ The odds filter hides fixtures with no odds. The live sync refreshes odds every 10 minutes — wait and reload.
→ Check: `docker compose exec db psql -U gowin -d gowindb -c "SELECT COUNT(*) FROM odds;"`

**Slide images missing after rebuild**
→ The `slides` volume must be in `docker-compose.yml`. Re-upload images via Admin → Slides — they will now persist.

**502 Bad Gateway**
→ The app container is still starting. Wait 30 seconds and refresh.
→ Check: `docker compose ps` and `docker compose logs app`

**`payment_clerk` role error on startup**
→ The schema migration handles this automatically. Check: `docker compose logs app | grep entrypoint`

**SSL certificate expired**
→ Run: `certbot renew && certbot certificates`

**Out of disk space**
→ Clean old images (data volumes are safe): `docker system prune -af`

**`ERR_PNPM_IGNORED_BUILDS` during build**
→ Confirm `.npmrc` in the repo root contains: `only-built-dependencies[]=esbuild`

---

## Quick-reference commands

| Task | Command |
|---|---|
| Follow live app logs | `docker compose logs -f app` |
| Follow database logs | `docker compose logs -f db` |
| Restart app only (no rebuild) | `docker compose restart app` |
| Stop everything | `docker compose down` |
| Start after a server reboot | `cd /var/www/gowin && docker compose up -d` |
| Open a database shell | `docker compose exec db psql -U gowin -d gowindb` |
| Back up the database | `docker compose exec db pg_dump -U gowin gowindb > backup_$(date +%Y%m%d).sql` |
| Full DB reset from btk.sql | See Step 5 above |
| Rollback to a previous version | `git log --oneline -5` → `git checkout <hash>` → `docker compose up --build -d` |
| Renew SSL manually | `certbot renew` |
| Check disk usage | `df -h` |
| Check memory | `free -h` |
| Clean old Docker images | `docker system prune -af` |

---

*GoWin Sportsbook · gowinrdc.com · 172.105.149.205*
