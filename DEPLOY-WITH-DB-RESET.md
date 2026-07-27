# GoWin — Deploy + Full Database Reset
### Push latest code to gowinrdc.com and replace production data with btk.sql

> ⚠️ **This wipes all production data permanently.** A backup is taken in Step 3 — do not skip it.

---

## Step 1 — Push the latest code to GitHub

Run these commands in the Replit shell:

```bash
git add .
git commit -m "deploy with db reset"
git push origin main
```

Then open **https://github.com/sergems/gowin** and confirm the new commit appears at the top before continuing.

---

## Step 2 — SSH into the server

```bash
ssh root@172.105.149.205
```

Enter the root password when prompted. All remaining steps run on the server.

---

## Step 3 — Pull the latest code (includes btk.sql)

```bash
cd /var/www/gowin
git pull
ls -lh btk.sql
```

Confirm `btk.sql` is listed and its size is around **12 MB** before continuing.

---

## Step 4 — Back up the current production database

```bash
docker compose exec db pg_dump -U gowin gowindb > backup_$(date +%Y%m%d_%H%M%S).sql
ls -lh backup_*.sql
```

Confirm the backup file is **non-zero in size**. If it is 0 bytes, do not continue — something is wrong with the database connection.

---

## Step 5 — Stop the app and wipe the database

```bash
docker compose stop app
docker compose exec db psql -U gowin -d gowindb -c "DROP SCHEMA public CASCADE; CREATE SCHEMA public;"
```

Expected output: `DROP SCHEMA` then `CREATE SCHEMA`. If you see "other users are connected", the `stop app` above may not have completed — wait a few seconds and retry.

---

## Step 6 — Restore from btk.sql

```bash
docker compose exec -T db psql -U gowin -d gowindb < btk.sql
```

This will take a minute. When it finishes, verify the data loaded correctly:

```bash
docker compose exec db psql -U gowin -d gowindb -c "\dt"
docker compose exec db psql -U gowin -d gowindb -c "SELECT COUNT(*) FROM users;"
docker compose exec db psql -U gowin -d gowindb -c "SELECT COUNT(*) FROM fixtures;"
```

You should see ~35 tables listed and non-zero row counts.

---

## Step 7 — Rebuild and start the app

```bash
docker compose up --build -d
```

The first rebuild takes **5–10 minutes**. The container will automatically apply `scripts/schema.sql` on startup (idempotent — safe to run on an already-seeded database).

---

## Step 8 — Copy slider images into the volume

```bash
docker compose cp artifacts/api-server/uploads/slides/. app:/app/uploads/slides/
```

Confirm the images are present:

```bash
docker compose exec app ls /app/uploads/slides/
```

---

## Step 9 — Watch the startup logs

```bash
docker compose logs -f app
```

Wait for this exact sequence:

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

## Step 10 — Verify the live site

Open **https://gowinrdc.com** and check:

| What to check | Expected result |
|---|---|
| Home page | Loads without errors; banner slider shows images |
| Sports / Fixtures | Fixtures with odds are listed |
| Login / Register | Auth works |
| Admin → Settings | PawaPay config present; USD/CDF rate visible |
| Admin → Users | User list from btk.sql is present |
| Live odds | Odds update without page reload (WebSocket) |

---

## Troubleshooting

**`btk.sql` restore prints warnings about roles or extensions**
→ Warnings about the `postgres` role are harmless. Ignore them.

**`ERROR: relation already exists` during restore**
→ The DROP SCHEMA in Step 5 did not complete. Re-run Step 5 then retry Step 6.

**Slide images missing**
→ Re-run Step 8.

**502 Bad Gateway after deploy**
→ The container is still starting. Wait 30 seconds and refresh. Check: `docker compose ps`

**Lottery games missing / Lucky Numbers empty**
→ The API server seeds lottery games on startup. Check logs for `"Lottery draw schedule: initial generation complete"`.

**No fixtures showing**
→ The odds filter hides fixtures with no odds. Live sync refreshes every 10–15 minutes — wait and reload. Check: `docker compose exec db psql -U gowin -d gowindb -c "SELECT COUNT(*) FROM odds;"`
