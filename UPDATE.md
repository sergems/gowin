# GoWin — Update Production Server
### Deploy latest code and apply database migrations without wiping data

> This procedure keeps all production data intact. Use [DEPLOY-WITH-DB-RESET.md](DEPLOY-WITH-DB-RESET.md) only when you need a full database replacement.

---

## Step 1 — Push the latest code to GitHub

Run these commands in the Replit shell:

```bash
git add .
git commit -m "update: <brief description of changes>"
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

## Step 3 — Pull the latest code

```bash
cd /var/www/gowin
git pull
```

Confirm the output shows your latest commit being pulled (not `Already up to date` if you expect changes).

---

## Step 4 — Back up the database

Always back up before applying migrations or rebuilding — even for routine updates.

```bash
docker compose exec db pg_dump -U gowin gowindb > backup_$(date +%Y%m%d_%H%M%S).sql
ls -lh backup_*.sql
```

Confirm the backup file is **non-zero in size** before continuing.

---

## Step 5 — Apply schema migrations (if any)

> Skip this step if this update contains **no database schema changes** (new tables, new columns, dropped columns, new indexes, etc.). Go straight to Step 6.

The production container does **not** auto-migrate on startup — schema changes must be applied manually.

### How to know if there are schema changes

Check the git diff for any changes inside `lib/db/src/schema/`:

```bash
git diff HEAD~1 HEAD -- lib/db/src/schema/
```

If the output is empty, skip to Step 6.

### Applying the migration

Write the required SQL as `ALTER TABLE` / `CREATE TABLE` / `CREATE INDEX` statements. Do **not** use `DROP` unless you are intentionally removing data.

Example — adding a new column:

```bash
docker compose exec db psql -U gowin -d gowindb -c \
  "ALTER TABLE some_table ADD COLUMN IF NOT EXISTS new_column TEXT;"
```

Example — running a multi-statement migration file:

```bash
# Copy the file to the server first, then:
docker compose exec -T db psql -U gowin -d gowindb < migration.sql
```

Verify the change was applied:

```bash
docker compose exec db psql -U gowin -d gowindb -c "\d some_table"
```

---

## Step 6 — Rebuild and restart the app

```bash
docker compose up --build -d
```

The first rebuild after dependency changes takes **5–10 minutes**. A code-only rebuild (no `pnpm-lock.yaml` change) takes **2–4 minutes**.

---

## Step 7 — Copy new slider images (if any were added)

> Skip this step if no new images were added to `artifacts/api-server/uploads/slides/`.

```bash
docker compose cp artifacts/api-server/uploads/slides/. app:/app/uploads/slides/
```

Confirm the images are present:

```bash
docker compose exec app ls /app/uploads/slides/
```

---

## Step 8 — Watch the startup logs

```bash
docker compose logs -f app
```

Wait for this sequence:

```
{"msg":"WebSocket server attached on /ws"}
{"msg":"Server listening","port":8080}
{"msg":"Live sync workers started"}
```

Press **Ctrl+C** once the server is up. If the container crashes instead, see Troubleshooting below.

---

## Step 9 — Verify the live site

Open **https://gowinrdc.com** and spot-check the areas affected by the update:

| What to check | Expected result |
|---|---|
| Home page | Loads without errors |
| Login / Register | Auth still works |
| Admin → Settings | Config values intact |
| Admin → Users | No data loss |
| Feature you just updated | Behaves as expected |

---

## Troubleshooting

**`git pull` shows merge conflict**
→ Resolve the conflict in the Replit shell first (`git pull` → edit conflicting files → `git add` → `git commit`), then push again before returning to Step 3.

**`docker compose up --build` fails with a build error**
→ Read the error carefully — it is almost always a TypeScript/lint error. Fix in Replit, push, then re-pull and rebuild on the server.

**502 Bad Gateway after rebuild**
→ The container is still starting. Wait 30 seconds and refresh. Check: `docker compose ps`

**Container keeps restarting (`Restarting` in `docker compose ps`)**
→ Check logs: `docker compose logs app --tail 50`. Common causes: missing environment variable, port conflict, database connection refused.

**Database migration error: `column already exists`**
→ The column was already present. Use `ADD COLUMN IF NOT EXISTS` in future migration statements.

**Database migration error: `relation does not exist`**
→ The table name in the migration SQL does not match the actual table name. Check with:
```bash
docker compose exec db psql -U gowin -d gowindb -c "\dt"
```

**Slide images missing after update**
→ The volume is persistent — images should survive rebuilds. If missing, re-run Step 7.

**Lottery games missing after update**
→ The API server seeds draw schedules on startup. Check logs for `"Lottery draw schedule: initial generation complete"`.

**No fixtures showing after update**
→ Live sync refreshes every 10–15 minutes. Wait and reload. Check:
```bash
docker compose exec db psql -U gowin -d gowindb -c "SELECT COUNT(*) FROM odds;"
```
