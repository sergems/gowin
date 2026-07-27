# GoWin — Deploying All Updates to Production (v3 · July 2026)

This is the **complete update guide** covering every feature and change built since the V2 deployment (June 2026).  
Use this when updating the existing Linode server. The server is already set up with Docker, Nginx, and SSL.  
For initial server setup from scratch, see `DEPLOYMENT_GUIDE.md`.

---

## What's new in V3

| Area | What changed |
|------|-------------|
| **Lucky Numbers (Lottery)** | Full lottery betting module — 20+ games (UK 49s, EuroMillions, Powerball, Mega Millions, Gosloto, French 5/49, Irish Lotto, and more); 7 play types (1–6 numbers + Bonus Ball Only); three bonus modes (Excluding / Including / With Bonus Ball); flexible stake, payout table, countdown to draw |
| **Lottery scraper engine** | Web-scraper pipeline auto-fetches and settles draw results every 5 min; `scraper_logs` and `settlement_logs` tables track every run; Admin → Lottery Scrapers shows status |
| **Lottery API sync** | APIVerve integration auto-settles Powerball, Mega Millions, and EuroMillions draws; requires `APIVERVE_KEY` env var |
| **Lottery draw scheduler** | `next_draw_at` advances automatically after each draw; UK 49s runs 4× daily; Gosloto advances every 10 min |
| **Win Bonus promotion** | Multi-bet Win Bonus: configurable bonus percentage paid on top of winnings for accumulators meeting a minimum-odds threshold; config stored in `settings` as `win_bonus_config` |
| **1UP / 2UP Markets** | Football 1X2 sub-markets; bettors can pick which half of the match to win; `up_won` column on `bet_selections` drives live settlement |
| **Full Cash Out** | Dynamic live cash-out engine; offer recalculated in real time via WebSocket; suspended automatically in the last 5 min of a match; `cash_out_audit_log` table |
| **Multi-sport sync** | Basketball, Tennis, and Cricket added alongside Football; sport nav items fetched dynamically from `/api/sports` |
| **French i18n** | Full French translation across all lottery pages, nav, betting card, admin, and auth flows; language toggle in site settings |
| **Mobile nav — Lotto icon** | Lotto ball image replaces generic icon in the mobile bottom nav; label corrected to "Lotto" |

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
git commit -m "feat: v3 update — Lottery module, Win Bonus, Cash Out, 1UP/2UP, multi-sport, French i18n (July 2026)"
git push origin main
```

Confirm the commits are visible at **https://github.com/sergems/gowin**.

---

## Step 2 — SSH into the Linode server

```bash
ssh root@172.105.149.205
```

---

## Step 3 — Back up the database (safety first)

Before touching anything, take a snapshot of the current production database:

```bash
cd /var/www/gowin
docker compose exec db pg_dump -U gowin gowindb > backup_before_v3_$(date +%Y%m%d_%H%M).sql
ls -lh backup_before_v3_*.sql   # confirm it was created and is non-zero
```

Keep this file on the server. If anything goes wrong you can restore it (see Rollback section).

---

## Step 4 — Update the .env file

```bash
nano /var/www/gowin/.env
```

**Add the following new variable** (required for Lottery auto-settlement of Powerball / Mega Millions / EuroMillions):

```env
APIVERVE_KEY=your_apiverve_api_key_here
```

> Get your key from **https://apiverve.com** → Dashboard → API Keys.  
> Without this key the app still works — lottery results for those three games will simply not auto-settle and will need manual settlement via Admin → Lottery.

The full `.env` should now look like this:

```env
# ── Required ─────────────────────────────────────────────────────────────────
NODE_ENV=production
PORT=8080

# Postgres — use the same password in both lines
POSTGRES_USER=gowin
POSTGRES_PASSWORD=YOUR_STRONG_PASSWORD
POSTGRES_DB=gowindb
DATABASE_URL=postgresql://gowin:YOUR_STRONG_PASSWORD@db:5432/gowindb

# ── Lottery API auto-settlement ───────────────────────────────────────────────
APIVERVE_KEY=your_apiverve_api_key_here

# ── Optional: email (password resets / OTP) ───────────────────────────────────
SMTP_HOST=mail.gowinrdc.com
SMTP_PORT=465
SMTP_SECURE=true
SMTP_USER=no-reply@gowinrdc.com
SMTP_PASS=YOUR_SMTP_PASSWORD
SMTP_FROM=GoWin <no-reply@gowinrdc.com>
APP_URL=https://gowinrdc.com
```

> **PawaPay credentials**, **JWT secret**, and all lottery game configs are managed through **Admin → Settings** in the app — stored in the database, not in `.env`.

Save: `Ctrl+X` → `Y` → `Enter`.

---

## Step 5 — Verify docker-compose.yml is still correct

The compose file does not change in V3. Confirm it still contains the `slides` volume from V2:

```bash
cat /var/www/gowin/docker-compose.yml
```

It should match exactly:

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

If it doesn't match (e.g. the `slides` volume was never added in V2), paste the content above using `nano /var/www/gowin/docker-compose.yml`.

---

## Step 6 — Pull and rebuild

```bash
cd /var/www/gowin
git pull
docker compose up --build -d
```

**What happens automatically on this step:**

The entrypoint script runs `scripts/schema.sql` against the database before the server starts. This migration is fully **idempotent** — safe to run on a live database with existing data. For V3 it adds:

| Object | What it does |
|--------|-------------|
| `lottery_games` table | Definitions for all lottery games (name, slug, country, number ranges, payout config, etc.) |
| `lottery_draws` table | Draw results with winning numbers, bonus numbers, jackpot, status |
| `lottery_tickets` table | Player lottery bets — play type, bonus mode, numbers, stake, payout |
| `scraper_logs` table | One row per scraper run (game, status, message, timestamp) |
| `settlement_logs` table | One row per settled draw (numbers drawn, tickets evaluated, payouts) |
| `cash_out_audit_log` table | Immutable record of every accepted cash-out offer |
| `bets.bonus_percentage` column | Win Bonus percentage applied to winning accumulators |
| `bets.bonus_payout` column | Bonus amount credited on top of normal winnings |
| `bet_selections.up_won` column | 1UP/2UP sub-market settlement flag (null / true / false) |
| `settings` seed rows | `win_bonus_config`, `up_markets_config`, `cash_out_enabled` default values (skipped if already present) |
| `sports` seed rows | Basketball, Tennis, Cricket added alongside Football |

No data is wiped. No manual SQL is needed.

Watch the logs while it builds and starts:

```bash
docker compose logs -f app
```

Expected output once running:

```
[entrypoint] Waiting for PostgreSQL to be ready...
[entrypoint] PostgreSQL is ready.
[entrypoint] Applying database schema...
[entrypoint] Schema applied.
[entrypoint] Starting API server...
{"level":30,"msg":"WebSocket server attached on /ws"}
{"level":30,"msg":"Server listening","port":8080}
{"level":30,"msg":"Live sync workers started"}
{"level":30,"msg":"Lottery scheduler started"}
{"level":30,"msg":"Scraper manager started"}
```

> First rebuild after these changes takes **8–15 minutes** (Docker layer cache mostly intact from V2, but the new deps add some time). Subsequent rebuilds are fast.

---

## Step 7 — Seed lottery games (first time only)

The lottery games are seeded automatically by the server on startup if the `lottery_games` table is empty. Check that they were created:

```bash
docker compose exec db psql -U gowin -d gowindb -c "SELECT slug, name, is_active FROM lottery_games ORDER BY id;"
```

You should see 20+ rows (UK 49s × 4 daily draws, EuroMillions, Powerball, Mega Millions, French 5/49, Irish Lotto, Gosloto, etc.).

If the table is empty after startup, trigger the seed manually via the Admin panel:

> **Admin → Lottery → Seed Games** (button at the bottom of the page)

---

## Step 8 — Configure lottery games in Admin

After the seed, visit **Admin → Lottery** and for each game:

1. **Set payout odds** — Edit each game and fill in the payout config (excluded bonus / included bonus / with bonus ball odds for 1–6 numbers). Pre-filled defaults are loaded from the seed.
2. **Enable play types** — Check which play types (1 Number, 2 Numbers, … Bonus Ball Only) are active for each game.
3. **Set min/max stake and max payout** — Defaults are $1 min / $100 max / $500 000 max payout.
4. **Configure Win Bonus** — Go to **Admin → Settings → Win Bonus** and set the minimum odds threshold and bonus percentage.
5. **Configure 1UP/2UP** — Go to **Admin → Settings → 1UP/2UP** and set which bet types are enabled.

---

## Step 9 — Verify

Open **https://gowinrdc.com** and check all of the following:

| What to check | Expected |
|---------------|----------|
| Home page | Loads, banner slider shows, no console errors |
| Lucky Numbers tab | Shows lottery lobby with game cards and countdown timers |
| Lottery game detail | Betting card with Play Type tabs, Bonus Mode selector, number grid, Quick Pick button |
| Lottery — French mode | Switch language to FR; all labels translate (TYPE DE JEU, MODE BONUS, Bonus exclu, etc.); Quick Pick stays in English |
| Mobile bottom nav | Lotto ball image shown; label reads "Lotto" (not "Loto") |
| Sports | Football, Basketball, Tennis, Cricket all appear in the sports nav |
| Football 1UP/2UP | 1UP and 2UP options visible on Football fixture detail pages |
| Multi-bet Win Bonus | Place an accumulator that meets the threshold; confirm bonus percentage shown in bet slip |
| Cash Out | Place a live bet; Cash Out button appears during the match with live offer |
| Admin → Lottery | Lottery game list visible; scraper status shown |
| Admin → Settings | Win Bonus config section present; 1UP/2UP config section present |
| All features from V2 | Branches, PawaPay, PDF fixtures, slides, notifications — all still working |

---

## Complete feature list (all sessions — current as of July 2026)

| Feature | Details |
|---------|---------|
| **Sports betting** | Football, Basketball, Tennis, Cricket — single and accumulator bets; real-time odds via WebSocket |
| **1UP / 2UP Markets** | Football 1X2 sub-markets; pick which half to bet on; settled live |
| **Win Bonus** | Multi-bet bonus percentage on qualifying accumulators; configurable threshold and rate |
| **Full Cash Out** | Dynamic live offer; WebSocket push; suspended in last 5 min; full audit log |
| **Live bet sync** | Scores every 60 s; odds every 10 s; auto-settle every 5 min |
| **Lucky Numbers (Lottery)** | 20+ games; 7 play markets (1–6 numbers + Bonus Ball Only); 3 bonus modes; flexible stake; payout table; countdown timers |
| **Lottery scraper engine** | Web scraper pipeline; 5-min cron; scraper_logs + settlement_logs; Admin status view |
| **Lottery API sync** | APIVerve for Powerball / Mega Millions / EuroMillions auto-settlement |
| **Lottery draw scheduler** | next_draw_at auto-advances; 4× daily for UK 49s; admin manual-result endpoint for blocked scrapers |
| **Multi-sport sync** | AllSportsAPI drives Football, Basketball, Tennis, Cricket fixture and odds sync |
| **French i18n** | Full French translation of all UI (lottery, betting, nav, admin, auth); language toggle |
| **Wallet** | Deposit, withdraw, transaction history; balances in USD or CDF |
| **USD / CDF currency** | Admin sets rate (manual or live fetch); all amounts in selected currency |
| **PawaPay integration** | Mobile money gateway; multi-currency; `payment_clerk` role |
| **Password recovery** | Email OTP; admin temp password; 3-failed-login → forced reset |
| **Admin panel** | Users, fixtures, bets, withdrawals, vouchers, lottery, settings, slides, branches |
| **Branch management** | Branch admins, agents, commission, float allocation, cash-up sessions |
| **Bet booking** | Share bet slip by code |
| **Fixtures PDF** | Daily PDF coupon at 08:00 and 13:00 |
| **Banner slider** | Admin uploads and reorders promotional slides |
| **Notifications** | In-app bell; bet settlement and system alerts |
| **Database switcher** | Admin can point app at a different Postgres instance |
| **JWT management** | JWT secret managed via Admin → Settings |
| **Email** | nodemailer for OTP and transactional emails |

---

## Rollback

If the update causes a problem, restore from the pre-V3 backup:

```bash
cd /var/www/gowin

# 1. Stop the app (leave the DB running)
docker compose stop app

# 2. Drop and recreate the database
docker compose exec db psql -U gowin -d postgres -c "DROP DATABASE gowindb;"
docker compose exec db psql -U gowin -d postgres -c "CREATE DATABASE gowindb;"

# 3. Restore the backup
docker compose exec -T db psql -U gowin -d gowindb < backup_before_v3_YYYYMMDD_HHMM.sql

# 4. Check out the last known-good commit
git log --oneline -10
git checkout <v2-commit-hash>

# 5. Rebuild and start
docker compose up --build -d
```

---

## Troubleshooting

**Lottery games not showing after deploy**  
→ Seed may not have run. Check: `docker compose exec db psql -U gowin -d gowindb -c "SELECT COUNT(*) FROM lottery_games;"`  
→ If 0, trigger seed via Admin → Lottery, or restart the app: `docker compose restart app`

**Lottery results not auto-settling**  
→ Check `APIVERVE_KEY` is set correctly in `.env`.  
→ Check scraper status in Admin → Lottery → Scrapers.  
→ Some scrapers (e.g. Gosloto) are blocked from Replit/Linode — use Admin → Lottery → Manual Result to enter the draw manually.

**Win Bonus not applying**  
→ Check that `win_bonus_config` is configured in Admin → Settings → Win Bonus (minimum odds threshold and bonus percentage must be > 0).

**1UP/2UP options not showing**  
→ Check `up_markets_config` in Admin → Settings → 1UP/2UP and confirm the feature is enabled.

**Cash Out button not appearing**  
→ Cash Out is suppressed in the last 5 min of a match. Check `cash_out_enabled` in Admin → Settings.  
→ Check: `docker compose exec db psql -U gowin -d gowindb -c "SELECT value FROM settings WHERE key = 'cash_out_enabled';"`

**Mobile nav shows old CircleDot icon (no lotto ball)**  
→ The lotto ball is a static asset baked into the frontend build (`artifacts/gowin/dist/public/assets/lotto-ball.png`).  
→ If it's missing, a Docker cache issue may have skipped the frontend build. Force a full rebuild:  
```bash
docker compose build --no-cache app
docker compose up -d
```

**`APIVERVE_KEY` not recognised**  
→ After editing `.env`, the app container must be restarted: `docker compose restart app`  
→ Confirm the key is in the container: `docker compose exec app printenv APIVERVE_KEY`

**No fixtures showing after deploy**  
→ The live sync worker refreshes every 10 min. Wait and reload.  
→ Check: `docker compose exec db psql -U gowin -d gowindb -c "SELECT COUNT(*) FROM odds;"`

**502 Bad Gateway**  
→ App container still starting. Wait 30 s.  
→ Check: `docker compose ps` and `docker compose logs app`

**SSL certificate expired**  
→ `certbot renew`

**Out of disk space**  
→ `docker system prune -af` (removes old images — data volumes are safe)

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
| Count lottery games | `docker compose exec db psql -U gowin -d gowindb -c "SELECT COUNT(*) FROM lottery_games;"` |
| Check scraper logs | `docker compose exec db psql -U gowin -d gowindb -c "SELECT game_id, status, created_at FROM scraper_logs ORDER BY created_at DESC LIMIT 20;"` |
| Check lottery tickets | `docker compose exec db psql -U gowin -d gowindb -c "SELECT COUNT(*), status FROM lottery_tickets GROUP BY status;"` |
| Check cash out log | `docker compose exec db psql -U gowin -d gowindb -c "SELECT COUNT(*) FROM cash_out_audit_log;"` |
| Force full rebuild | `docker compose build --no-cache app && docker compose up -d` |
| Renew SSL manually | `certbot renew` |
| Check SSL expiry | `certbot certificates` |
| Check disk usage | `df -h` |
| Check memory | `free -h` |
| Clean old images | `docker system prune -af` |

---

*GoWin Sportsbook — gowinrdc.com · 172.105.149.205*
