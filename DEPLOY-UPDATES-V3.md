# GoWin — Production Update Guide (v3 · July 2026)

This guide updates the existing GoWin installation on the Linode server.
It assumes Docker, Docker Compose, Nginx, SSL, and the PostgreSQL volume are
already configured.

**Important:** A normal update does not drop or recreate the production
database. Always take a backup first. The repository contains `database.sql`
as a full database dump for a fresh install or an intentional full restore;
it is not an automatic, idempotent migration script.

If you see a command containing `< migrations/v3.sql` while following an older
copy of this guide, stop. That file is not included in this repository and the
command must not be run. Pull the latest guide from GitHub, then use the schema
check in Path A, Step 9.

## Deployment model

```text
Replit → GitHub (sergems/gowin) → Linode → https://gowinrdc.com
```

The production Docker image:

- builds the React frontend and API server from the repository;
- starts the API on port `8080`;
- serves the compiled frontend through the API server;
- persists uploaded slide images in the `slides` Docker volume;
- does not run destructive or implicit database migrations at container startup.

Database changes must be reviewed, backed up, and applied explicitly.

---

## Path A — Update an existing production server

Use this path for the current server. It preserves the existing database and
user data.

### Step 1 — Push the code from Replit to GitHub

Run this from the project checkout:

```bash
git status
git add Dockerfile .dockerignore DEPLOY-UPDATES-V3.md
git commit -m "fix: make v3 production deployment reproducible"
git push origin main
```

If there are other intentional application changes waiting to be pushed, review
them with `git status` before committing.

### Step 2 — Connect to the production server

```bash
ssh root@172.105.149.205
cd /var/www/gowin
```

Confirm that this is the correct checkout:

```bash
pwd
git remote -v
docker compose ps
```

### Step 3 — Back up the production database

Create the backup before pulling or rebuilding anything:

```bash
mkdir -p backups

docker compose exec -T db \
  pg_dump -U gowin -d gowindb \
  > "backups/backup_before_v3_$(date +%Y%m%d_%H%M%S).sql"

ls -lh backups/
```

Do not continue if the backup command fails or creates a zero-byte file.

Optional backup verification:

```bash
LATEST_BACKUP=$(ls -t backups/backup_before_v3_*.sql | head -n 1)
test -s "$LATEST_BACKUP"
grep -m 1 "PostgreSQL database dump" "$LATEST_BACKUP"
```

### Step 4 — Pull the fixed deployment files

```bash
git pull --ff-only origin main
```

Verify that the repository no longer references missing deployment files:

```bash
test -f Dockerfile
test -f .dockerignore
test -f DEPLOY-UPDATES-V3.md

! grep -q "COPY scripts/package.json" Dockerfile
! grep -q "scripts/docker-entrypoint.sh" Dockerfile
```

The last two commands should exit successfully without printing anything.

### Step 5 — Check the environment file

Open the production environment file:

```bash
nano .env
```

It must contain values equivalent to the following. Replace placeholders with
the values already used by this installation; do not change database passwords
during an application update.

```env
NODE_ENV=production
PORT=8080

POSTGRES_USER=gowin
POSTGRES_PASSWORD=REPLACE_WITH_EXISTING_DATABASE_PASSWORD
POSTGRES_DB=gowindb
DATABASE_URL=postgresql://gowin:REPLACE_WITH_EXISTING_DATABASE_PASSWORD@db:5432/gowindb

SMTP_HOST=mail.gowinrdc.com
SMTP_PORT=465
SMTP_SECURE=true
SMTP_USER=no-reply@gowinrdc.com
SMTP_PASS=REPLACE_WITH_SMTP_PASSWORD
SMTP_FROM=GoWin <no-reply@gowinrdc.com>
APP_URL=https://gowinrdc.com
```

The `DATABASE_URL` host must be `db` when the API runs in Docker Compose.
Do not use `localhost` in that value.

### Step 6 — Check the Compose file

The `app` service must expose port `8080`, depend on a healthy database, and
persist slides. A working Compose file has this structure:

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
      retries: 20

  app:
    build:
      context: .
      dockerfile: Dockerfile
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

Before starting, validate interpolation and the Compose model:

```bash
docker compose config >/tmp/gowin-compose-config.yml
```

If this command reports an unset variable or YAML error, fix that before
building.

### Step 7 — Build the image

Build from the repository root:

```bash
docker compose build app
```

The previous `COPY scripts/schema.sql` and
`COPY scripts/docker-entrypoint.sh` errors should no longer occur. The image
build does not need `scripts/package.json`.

If Docker is using a corrupted cache, retry once with:

```bash
docker compose build --no-cache app
```

Do not use `docker system prune -af` as the first response; it removes useful
cached layers and unrelated images.

### Step 8 — Start the updated app

```bash
docker compose up -d app
docker compose ps
```

The `db` and `app` services should show `running`. If `app` is restarting,
inspect its logs before making database changes:

```bash
docker compose logs --tail=200 app
```

Expected API startup messages include:

```text
WebSocket server attached on /ws
Server listening
Live sync workers started
```

### Step 9 — Apply database changes, only if needed

The application starts without running schema DDL. First inspect the current
database:

```bash
docker compose exec -T db psql -U gowin -d gowindb -c \
  "SELECT current_database(), current_user;"

docker compose exec -T db psql -U gowin -d gowindb -c \
  "SELECT count(*) AS tables
   FROM information_schema.tables
   WHERE table_schema = 'public';"
```

The current V3 application expects, among other objects:

- `lottery_games`, `lottery_draws`, and `lottery_tickets`;
- `scraper_logs` and `settlement_logs`;
- `cash_out_audit_log`;
- `notifications` and `referral_rewards`;
- `bets.bonus_percentage` and `bets.bonus_amount`;
- `bet_selections.up_won`.

If those objects already exist, do not run `database.sql`. The API startup
seeds missing lottery game rows without deleting existing data.

Run the following single check to identify any missing V3 objects or columns:

```bash
docker compose exec -T db psql -U gowin -d gowindb <<'SQL'
WITH required_objects(object_name) AS (
  VALUES
    ('lottery_games'),
    ('lottery_draws'),
    ('lottery_tickets'),
    ('scraper_logs'),
    ('settlement_logs'),
    ('cash_out_audit_log'),
    ('notifications'),
    ('referral_rewards')
)
SELECT r.object_name AS missing_table
FROM required_objects r
LEFT JOIN information_schema.tables t
  ON t.table_schema = 'public'
 AND t.table_name = r.object_name
WHERE t.table_name IS NULL
ORDER BY r.object_name;

SELECT 'bets.bonus_percentage' AS missing_column
WHERE NOT EXISTS (
  SELECT 1
  FROM information_schema.columns
  WHERE table_schema = 'public'
    AND table_name = 'bets'
    AND column_name = 'bonus_percentage'
);

SELECT 'bets.bonus_amount' AS missing_column
WHERE NOT EXISTS (
  SELECT 1
  FROM information_schema.columns
  WHERE table_schema = 'public'
    AND table_name = 'bets'
    AND column_name = 'bonus_amount'
);

SELECT 'bet_selections.up_won' AS missing_column
WHERE NOT EXISTS (
  SELECT 1
  FROM information_schema.columns
  WHERE table_schema = 'public'
    AND table_name = 'bet_selections'
    AND column_name = 'up_won'
);
SQL
```

If the command prints no rows in any result set, no V3 schema migration is
needed. Start or restart the app:

```bash
docker compose up -d app
docker compose logs --tail=200 app
```

If the check reports the five lottery/scraper tables above, the repository now
contains the reviewed idempotent migration `migrations/v3.sql`. Apply it after
confirming that your backup exists:

```bash
LATEST_BACKUP=$(ls -t backups/backup_before_v3_*.sql 2>/dev/null | head -n 1)
test -n "$LATEST_BACKUP" && test -s "$LATEST_BACKUP"

docker compose stop app

docker compose exec -T db psql -v ON_ERROR_STOP=1 -U gowin -d gowindb \
  < migrations/v3.sql

docker compose start app
docker compose logs --tail=200 app
```

The migration creates only missing tables, sequences, constraints, and foreign
keys. It does not import lottery seed data; the API seeds missing lottery game
rows at startup.

Verify the migration:

```bash
docker compose exec -T db psql -U gowin -d gowindb -c \
  "SELECT table_name
   FROM information_schema.tables
   WHERE table_schema = 'public'
     AND table_name IN (
       'lottery_games', 'lottery_draws', 'lottery_tickets',
       'scraper_logs', 'settlement_logs'
     )
   ORDER BY table_name;"
```

Do not copy the full `database.sql` dump into `migrations/v3.sql`.
`database.sql` is intended only for a fresh database or an intentional full
restore.

### Step 10 — Verify the deployment

Check the services:

```bash
docker compose ps
docker compose logs --tail=200 app
```

Check the local API port:

```bash
curl -i http://127.0.0.1:8080/
```

Then check the public site:

```bash
curl -I https://gowinrdc.com
```

Open `https://gowinrdc.com` and verify:

- the homepage loads;
- the banner slider displays;
- the sports navigation includes Football, Basketball, Tennis, and Cricket;
- Lucky Numbers opens;
- login and registration pages load;
- existing admin, wallet, PawaPay, branch, fixtures, and slide flows remain
  available.

Review the live app log for errors:

```bash
docker compose logs app | grep -iE "error|fatal|exception" || true
```

---

## Path B — Fresh install or intentional full database restore

Use this path only for a new server, an empty database, or a deliberate
restore. It replaces database contents and is destructive.

### Step 1 — Stop the app and make a backup if data exists

```bash
cd /var/www/gowin
docker compose stop app
mkdir -p backups
docker compose exec -T db pg_dump -U gowin -d gowindb \
  > "backups/before_full_restore_$(date +%Y%m%d_%H%M%S).sql"
```

### Step 2 — Confirm the dump is present

The full dump must be in the repository root:

```bash
test -s database.sql
head -n 8 database.sql
```

Do not proceed if this file is missing or is not the intended dump.

### Step 3 — Recreate the database

This permanently deletes the current `gowindb` database:

```bash
docker compose exec -T db psql -U gowin -d postgres -v ON_ERROR_STOP=1 \
  -c "SELECT pg_terminate_backend(pid)
      FROM pg_stat_activity
      WHERE datname = 'gowindb' AND pid <> pg_backend_pid();"

docker compose exec -T db psql -U gowin -d postgres -v ON_ERROR_STOP=1 \
  -c "DROP DATABASE IF EXISTS gowindb;"

docker compose exec -T db psql -U gowin -d postgres -v ON_ERROR_STOP=1 \
  -c "CREATE DATABASE gowindb;"
```

### Step 4 — Restore the dump

```bash
docker compose exec -T db psql -U gowin -d gowindb \
  -v ON_ERROR_STOP=1 < database.sql
```

Verify key tables:

```bash
docker compose exec -T db psql -U gowin -d gowindb -c \
  "SELECT table_name
   FROM information_schema.tables
   WHERE table_schema = 'public'
     AND table_name IN (
       'users', 'settings', 'fixtures', 'bets',
       'lottery_games', 'lottery_draws', 'lottery_tickets'
     )
   ORDER BY table_name;"
```

### Step 5 — Start and verify

```bash
docker compose up -d app
docker compose logs -f app
```

Press `Ctrl+C` after confirming startup, then complete the verification in
Path A, Step 10.

---

## Rollback

### Roll back application code while keeping the database

```bash
cd /var/www/gowin
docker compose stop app
git log --oneline -10
git checkout <known-good-commit>
docker compose build app
docker compose up -d app
docker compose logs --tail=200 app
```

### Restore the database backup

Use this only when database data must be reverted. It is destructive:

```bash
cd /var/www/gowin
docker compose stop app

docker compose exec -T db psql -U gowin -d postgres \
  -c "DROP DATABASE IF EXISTS gowindb;"
docker compose exec -T db psql -U gowin -d postgres \
  -c "CREATE DATABASE gowindb;"

docker compose exec -T db psql -U gowin -d gowindb \
  -v ON_ERROR_STOP=1 < backups/backup_before_v3_YYYYMMDD_HHMMSS.sql

docker compose up -d app
```

Replace the backup filename with the actual file in `backups/`.

---

## Troubleshooting

### `COPY scripts/schema.sql ... not found`

The server is using an old checkout or old Dockerfile. Run:

```bash
git pull --ff-only origin main
grep -n "scripts/schema.sql\|scripts/docker-entrypoint.sh\|scripts/package.json" Dockerfile
docker compose build --no-cache app
```

The `grep` command should return no matches after pulling the fixed Dockerfile.

### `docker compose build` cannot find a package or manifest

Build from the repository root, not from `artifacts/`:

```bash
cd /var/www/gowin
docker compose build --no-cache app
```

Check that these files exist:

```bash
test -f package.json
test -f pnpm-lock.yaml
test -f pnpm-workspace.yaml
test -f .npmrc
test -f pnpm.config.cjs
```

### `app` starts and immediately restarts

```bash
docker compose ps
docker compose logs --tail=300 app
docker compose logs --tail=100 db
```

Common causes are an incorrect `DATABASE_URL`, a database that is not healthy,
or a missing required environment variable. The database URL must use the
Compose service name `db`, not `localhost`.

### `502 Bad Gateway`

```bash
docker compose ps
docker compose logs --tail=200 app
curl -i http://127.0.0.1:8080/
```

If the local API responds but the domain returns 502, check the Nginx upstream
configuration and reload Nginx:

```bash
nginx -t
systemctl reload nginx
```

### Homepage slide images are missing

Uploaded slides are stored in the named `slides` volume. Check it:

```bash
docker compose exec app ls -la /app/uploads/slides
```

If slides are stored in the Git checkout, copy them into the volume:

```bash
docker compose cp artifacts/api-server/uploads/slides/. \
  app:/app/uploads/slides/
```

Do not delete the `slides` volume during a normal rebuild.

### Lottery games are missing

The API seeds default lottery games on startup:

```bash
docker compose restart app
docker compose logs --tail=200 app
docker compose exec -T db psql -U gowin -d gowindb -c \
  "SELECT slug, is_active FROM lottery_games ORDER BY id;"
```

### Out of disk space

Check first:

```bash
df -h
docker system df
```

Only after confirming that no needed images or volumes are being removed:

```bash
docker image prune -f
```

Avoid deleting volumes; the database and slide uploads may be stored there.

---

## Useful commands

| Task | Command |
|---|---|
| Follow app logs | `docker compose logs -f app` |
| Follow database logs | `docker compose logs -f db` |
| Restart app | `docker compose restart app` |
| Rebuild app | `docker compose build app && docker compose up -d app` |
| Force rebuild | `docker compose build --no-cache app && docker compose up -d app` |
| Check services | `docker compose ps` |
| Validate Compose | `docker compose config` |
| Open database shell | `docker compose exec db psql -U gowin -d gowindb` |
| Back up database | `docker compose exec -T db pg_dump -U gowin -d gowindb > backups/backup_$(date +%Y%m%d_%H%M%S).sql` |
| Check disk | `df -h && docker system df` |

---

*GoWin Sportsbook — gowinrdc.com*