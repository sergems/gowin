# GoWin — Deployment Guide
### gowinrdc.com · 172.105.149.205

**Pipeline:**
```
Replit (dev)  →  GitHub (sergems/gowin)  →  Linode 172.105.149.205  →  gowinrdc.com
```

---

## Which deploy path do you need?

| Situation | Path |
|---|---|
| Code change, new feature, schema tweak | **[Standard deploy](#standard-deploy)** — migrations run automatically |
| First-ever install on a fresh server | **[First install](#first-install-fresh-server)** |
| Want to wipe all production data and reload from `btk.sql` | **[Full reset](#full-database-reset)** — destructive, use with care |

---

## Standard deploy

Use this for all normal updates. Migrations are applied automatically when the container starts — no database drop needed.

### Step 1 — Push the latest code to GitHub

```bash
git add .
git commit -m "your message here"
git push origin main
```

Confirm the commit appears at **https://github.com/sergems/gowin** before continuing.

---

### Step 2 — SSH into the server

```bash
ssh root@172.105.149.205
```

Enter the root password when prompted. All remaining steps run on the server.

---

### Step 3 — Pull the latest code

```bash
cd /var/www/gowin
git pull
```

---

### Step 4 — Rebuild and restart the app

```bash
docker compose up --build -d
```

When the container starts, `scripts/schema.sql` runs automatically (via `docker-entrypoint.sh`).
It is fully idempotent — every `CREATE TABLE`, `ALTER TABLE ADD COLUMN`, and enum `ADD VALUE`
uses `IF NOT EXISTS`, so it safely adds new columns and tables without touching existing data.

First rebuild takes 5–10 minutes; subsequent rebuilds are faster.

---

### Step 5 — Copy slider images into the volume

The slider images are stored in a named Docker volume (`slides`). After a rebuild they need to
be synced from the git checkout into the running container:

```bash
docker compose cp artifacts/api-server/uploads/slides/. app:/app/uploads/slides/
```

This is safe to run even if the volume already has images — it only adds/overwrites files that
changed; it does not delete images that exist in the volume but not in git.

Confirm the images are present:

```bash
docker compose exec app ls /app/uploads/slides/
```

---

### Step 6 — Watch the startup logs

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

Press **Ctrl+C** once the server is up.

---

### Step 7 — Verify the live site

Open **https://gowinrdc.com** and check:

| What to check | Expected result |
|---|---|
| Home page | Loads without errors; banner slider shows images |
| Sports / Fixtures | Fixtures with odds are listed |
| Sidebar (logged out) | "Download the Go Win RDC Official App" label + Google Play badge |
| Footer | Copyright · Privacy · Terms |
| Login / Register | Auth works |
| Forgot password | OTP email sent; reset-password page works |
| Wallet | Deposit and withdrawal flows work |
| Admin → Settings | PawaPay config present; USD/CDF rate controls visible |
| Admin → Slides | Can upload, reorder, and delete banner slides |
| Admin → Branches | Branch list shows; can create/edit branches |
| Admin → Users | Wallet balances shown; can reset passwords, credit/debit wallets |
| Live odds | Odds update in real time without page reload (WebSocket) |
| Notifications | Bell icon in header; bet settlement alerts appear |
| Cash Out | Pending bet → History shows "Cash Out" button; accepting credits wallet |
| Admin → Cash Out | Settings / Reports / Audit Log tabs all work |

---

## First install (fresh server)

Use this only when setting up the server for the very first time.

### 1 — Push code and SSH in

```bash
# On Replit
git add . && git commit -m "initial deploy" && git push origin main

# On the server
ssh root@172.105.149.205
cd /var/www/gowin
git clone https://github.com/sergems/gowin .
```

### 2 — Create the .env file

```bash
nano /var/www/gowin/.env
```

Paste and fill in:

```env
NODE_ENV=production
PORT=8080

POSTGRES_USER=gowin
POSTGRES_PASSWORD=YOUR_STRONG_PASSWORD
POSTGRES_DB=gowindb
DATABASE_URL=postgresql://gowin:YOUR_STRONG_PASSWORD@db:5432/gowindb

# Email (password resets / OTP)
SMTP_HOST=mail.gowinrdc.com
SMTP_PORT=465
SMTP_SECURE=true
SMTP_USER=no-reply@gowinrdc.com
SMTP_PASS=YOUR_SMTP_PASSWORD
SMTP_FROM=GoWin <no-reply@gowinrdc.com>
APP_URL=https://gowinrdc.com
```

> **Note:** PawaPay credentials and the JWT secret live in the database `settings` table — they come in via the seed data in `schema.sql` and do not go in `.env`.

Save and exit: **Ctrl+X → Y → Enter**

### 3 — Check docker-compose.yml

```bash
cat /var/www/gowin/docker-compose.yml
```

It should contain a `slides` volume entry. If not, paste this:

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

### 4 — Build, start, copy slides

```bash
docker compose up --build -d

# Wait ~30 seconds for the DB to initialise and schema.sql to run, then copy slides
docker compose cp artifacts/api-server/uploads/slides/. app:/app/uploads/slides/
```

### 5 — Watch logs and verify

Follow [Step 6](#step-6--watch-the-startup-logs) and [Step 7](#step-7--verify-the-live-site) from the standard deploy above.

---

## Full database reset

> ⚠️ **Destructive.** This permanently deletes all production data and replaces it with the snapshot in `btk.sql`. Take a backup first.

Use only if you want to wipe production data back to a known snapshot (e.g. after major testing, or to sync prod with the dev seed).

### 1 — Back up the current database

```bash
cd /var/www/gowin
docker compose exec db pg_dump -U gowin gowindb > backup_$(date +%Y%m%d_%H%M%S).sql
ls -lh backup_*.sql
```

Confirm the file is non-zero in size before continuing.

### 2 — Pull the latest code (includes btk.sql)

```bash
git pull
ls -lh btk.sql
```

### 3 — Stop the app and drop all tables

```bash
docker compose stop app
docker compose exec db psql -U gowin -d gowindb -c "DROP SCHEMA public CASCADE; CREATE SCHEMA public;"
```

### 4 — Restore from btk.sql

```bash
docker compose exec -T db psql -U gowin -d gowindb < btk.sql
```

Verify:

```bash
docker compose exec db psql -U gowin -d gowindb -c "\dt"
docker compose exec db psql -U gowin -d gowindb -c "SELECT COUNT(*) FROM users;"
docker compose exec db psql -U gowin -d gowindb -c "SELECT COUNT(*) FROM fixtures;"
```

### 5 — Rebuild, start, copy slides

```bash
docker compose up --build -d
docker compose cp artifacts/api-server/uploads/slides/. app:/app/uploads/slides/
```

Then follow [Step 6](#step-6--watch-the-startup-logs) and [Step 7](#step-7--verify-the-live-site).

---

## Troubleshooting

**Schema migration not running / missing columns**
→ Check: `docker compose logs app | grep entrypoint`
→ The line `[entrypoint] Schema applied.` confirms it ran. If absent, the container exited before that point — check for earlier errors.

**Slide images missing after rebuild**
→ The `slides` Docker volume persists across rebuilds, but new images from git must be copied in manually.
→ Run: `docker compose cp artifacts/api-server/uploads/slides/. app:/app/uploads/slides/`

**`DROP SCHEMA` fails with "other users are connected"**
→ Stop the app container first:
```bash
docker compose stop app
docker compose exec db psql -U gowin -d gowindb -c "DROP SCHEMA public CASCADE; CREATE SCHEMA public;"
```

**`btk.sql` restore prints errors about roles or extensions**
→ Warnings about `postgres` role ownership are harmless on a single-user Postgres setup.
→ `ERROR: relation already exists` means the drop didn't complete — re-run Step 3 of the full reset.

**No fixtures showing after deploy**
→ The odds filter hides fixtures with no odds. Live sync refreshes every 10 minutes — wait and reload.
→ Check: `docker compose exec db psql -U gowin -d gowindb -c "SELECT COUNT(*) FROM odds;"`

**502 Bad Gateway**
→ The app container is still starting. Wait 30 seconds and refresh.
→ Check: `docker compose ps` and `docker compose logs app`

**`payment_clerk` role error on startup**
→ Handled automatically by `schema.sql`. Check: `docker compose logs app | grep entrypoint`

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
| Standard deploy (code + migration) | `git pull && docker compose up --build -d` |
| Copy slider images after rebuild | `docker compose cp artifacts/api-server/uploads/slides/. app:/app/uploads/slides/` |
| Follow live app logs | `docker compose logs -f app` |
| Follow database logs | `docker compose logs -f db` |
| Restart app only (no rebuild) | `docker compose restart app` |
| Stop everything | `docker compose down` |
| Start after a server reboot | `cd /var/www/gowin && docker compose up -d` |
| Open a database shell | `docker compose exec db psql -U gowin -d gowindb` |
| Back up the database | `docker compose exec db pg_dump -U gowin gowindb > backup_$(date +%Y%m%d).sql` |
| Full DB reset from btk.sql | See [Full database reset](#full-database-reset) above |
| Rollback to a previous version | `git log --oneline -5` → `git checkout <hash>` → `docker compose up --build -d` |
| Renew SSL manually | `certbot renew` |
| Check disk usage | `df -h` |
| Check memory | `free -h` |
| Clean old Docker images | `docker system prune -af` |

---

## How migrations work

Every time the app container starts, `scripts/docker-entrypoint.sh` runs:

```sh
psql "$DATABASE_URL" -f /app/scripts/schema.sql
```

`scripts/schema.sql` is fully idempotent:
- Tables use `CREATE TABLE IF NOT EXISTS`
- New columns use `ALTER TABLE … ADD COLUMN IF NOT EXISTS`
- New enum values use `ALTER TYPE … ADD VALUE IF NOT EXISTS` inside a `DO $$ BEGIN … EXCEPTION WHEN others THEN NULL; END $$` block

This means a `docker compose up --build -d` after a `git pull` is all that is needed to apply any schema change — no manual SQL, no database drop.

When you add a new column or table during development, update `scripts/schema.sql` with the appropriate idempotent statement so it is picked up automatically on the next server deploy.

---

*GoWin Sportsbook · gowinrdc.com · 172.105.149.205*
