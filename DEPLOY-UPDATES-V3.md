# GoWin — Production Update Guide (v3 · July 2026)

Update the existing Linode server with all changes since V2.  
The server already has Docker, Nginx, and SSL configured.

---

## Pipeline

```
Replit → GitHub (sergems/gowin) → Linode (172.105.149.205) → gowinrdc.com
```

---

## Step 1 — Push from Replit to GitHub

```bash
git add .
git commit -m "feat: v3 — Lottery module, Win Bonus, Cash Out, 1UP/2UP, multi-sport, French i18n (July 2026)"
git push origin main
```

---

## Step 2 — SSH into the server

```bash
ssh root@172.105.149.205
```

---

## Step 3 — Back up the database

```bash
cd /var/www/gowin
docker compose exec db pg_dump -U gowin gowindb > backup_before_v3_$(date +%Y%m%d_%H%M).sql
ls -lh backup_before_v3_*.sql
```

Keep this file on the server. If anything goes wrong, see the Rollback section.

---

## Step 4 — Pull the latest code and rebuild

```bash
cd /var/www/gowin
git pull
docker compose up --build -d
```

The entrypoint script runs `schema.sql` automatically before the server starts.  
It is fully **idempotent** — no data is wiped, no manual SQL needed.

**Database changes applied automatically in V3:**

| Object | Change |
|--------|--------|
| `lottery_games` | New table — lottery game definitions |
| `lottery_draws` | New table — draw results (winning numbers, bonus, jackpot, status) |
| `lottery_tickets` | New table — player lottery bets |
| `scraper_logs` | New table — one row per scraper run |
| `settlement_logs` | New table — one row per settled draw |
| `cash_out_audit_log` | New table — immutable cash-out offer records |
| `bets.bonus_percentage` | New column — Win Bonus percentage on qualifying accumulators |
| `bets.bonus_payout` | New column — bonus amount credited on top of normal winnings |
| `bet_selections.up_won` | New column — 1UP/2UP settlement flag |
| `settings` rows | Seed values for `win_bonus_config`, `up_markets_config`, `cash_out_enabled` (skipped if already present) |
| `sports` rows | Basketball, Tennis, Cricket added alongside Football |

Watch logs while it starts:

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
{"msg":"WebSocket server attached on /ws"}
{"msg":"Server listening","port":8080}
{"msg":"Live sync workers started"}
{"msg":"Lottery scheduler started"}
{"msg":"Scraper manager started"}
```

> First rebuild takes 8–15 minutes. Subsequent rebuilds are faster (Docker layer cache).

---

## Step 5 — Verify

```bash
docker compose ps          # app and db should both show "running"
docker compose logs app    # no ERROR lines
```

Then open **https://gowinrdc.com** and confirm:

- Home page loads with banner slider
- Lucky Numbers tab shows lottery lobby with game cards
- Sports nav shows Football, Basketball, Tennis, Cricket
- Admin → Lottery shows game list and scraper status
- Admin → Settings shows Win Bonus and 1UP/2UP config sections
- Existing features (PawaPay, branches, PDF fixtures, slides) still work

---

## Rollback

```bash
cd /var/www/gowin

# Stop the app (leave DB running)
docker compose stop app

# Drop and recreate the database
docker compose exec db psql -U gowin -d postgres -c "DROP DATABASE gowindb;"
docker compose exec db psql -U gowin -d postgres -c "CREATE DATABASE gowindb;"

# Restore the backup
docker compose exec -T db psql -U gowin -d gowindb < backup_before_v3_YYYYMMDD_HHMM.sql

# Check out the previous commit
git log --oneline -10
git checkout <v2-commit-hash>

# Rebuild
docker compose up --build -d
```

---

## Troubleshooting

| Symptom | Fix |
|---------|-----|
| Lottery games table empty | `docker compose restart app` — seeder runs on startup |
| Lottery results not settling | Use Admin → Lottery → Manual Result to enter draw numbers |
| Win Bonus not applying | Set threshold and percentage in Admin → Settings → Win Bonus |
| 1UP/2UP not showing | Enable feature in Admin → Settings → 1UP/2UP |
| Lotto ball icon missing in mobile nav | Force full rebuild: `docker compose build --no-cache app && docker compose up -d` |
| 502 Bad Gateway | App still starting — wait 30 s, then check `docker compose logs app` |
| SSL expired | `certbot renew` |
| Out of disk space | `docker system prune -af` (volumes are safe) |

---

## Useful commands

| Task | Command |
|------|---------|
| Live app logs | `docker compose logs -f app` |
| Restart app only | `docker compose restart app` |
| Open DB shell | `docker compose exec db psql -U gowin -d gowindb` |
| Database backup | `docker compose exec db pg_dump -U gowin gowindb > backup_$(date +%Y%m%d).sql` |
| Database restore | `docker compose exec -T db psql -U gowin -d gowindb < backup.sql` |
| Check lottery games | `docker compose exec db psql -U gowin -d gowindb -c "SELECT slug, is_active FROM lottery_games ORDER BY id;"` |
| Check scraper logs | `docker compose exec db psql -U gowin -d gowindb -c "SELECT game_id, status, created_at FROM scraper_logs ORDER BY created_at DESC LIMIT 20;"` |
| Force full rebuild | `docker compose build --no-cache app && docker compose up -d` |
| Check disk | `df -h` |
| Clean old images | `docker system prune -af` |

---

*GoWin Sportsbook — gowinrdc.com · 172.105.149.205*
