# GoWin — Step-by-Step Deployment Guide
### Updating the live server at gowinrdc.com · 172.105.149.205

> **This guide is for updating an existing server.**
> The server already has Docker, Nginx, PostgreSQL, and SSL configured.
> If you are setting up a brand-new server from scratch, follow `DEPLOYMENT_GUIDE.md` first, then come back here.

---

## Before you start — what this deploy does

- Pushes all code changes from Replit to GitHub, then pulls them onto the server
- Adds a `slides` Docker volume so uploaded banner images survive future rebuilds
- Rebuilds the app container with the latest code
- Runs schema migrations automatically on startup (no manual SQL needed)
- Zero data loss — the `pgdata` and `slides` volumes are never touched by a rebuild

**Pipeline:**
```
Replit (dev)  →  GitHub (sergems/gowin)  →  Linode 172.105.149.205  →  gowinrdc.com
```

---

## Step 1 — Push code from Replit to GitHub

Open the **Shell** tab in Replit and run:

```bash
git add .
git commit -m "feat: full v2 update — all features current as of July 2026"
git push origin main
```

Then open **https://github.com/sergems/gowin** in your browser and confirm your latest commit is there before continuing.

---

## Step 2 — SSH into the server

From any terminal (or the Replit Shell):

```bash
ssh root@172.105.149.205
```

Enter your root password when prompted.

---

## Step 3 — Update docker-compose.yml

This step adds a `slides` named volume so banner images uploaded via Admin → Slides are not wiped on every rebuild.

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

## Step 4 — Check the .env file

```bash
nano /var/www/gowin/.env
```

Make sure all of these variables are present. Replace `YOUR_STRONG_PASSWORD` with the same password you used during the initial setup, and fill in `YOUR_SMTP_PASSWORD` if you have it:

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

> **Note:** PawaPay credentials and the JWT secret are **not** stored in `.env` — they live in the database and are managed through **Admin → Settings** in the app.

Save and exit: **Ctrl+X → Y → Enter**

---

## Step 5 — Pull the latest code and rebuild

```bash
cd /var/www/gowin
git pull
docker compose up --build -d
```

This will:
1. Pull the latest code from GitHub
2. Rebuild the app container (first rebuild: 5–10 min; subsequent rebuilds are faster thanks to Docker's layer cache)
3. Apply all database schema changes automatically — no manual SQL needed
4. Restart the app and database containers

---

## Step 6 — Watch the startup logs

In the same SSH session, tail the logs while the app starts:

```bash
docker compose logs -f app
```

You are looking for this sequence — it means everything started correctly:

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

Press **Ctrl+C** to stop following logs once you see the server is up.

---

## Step 7 — Verify the live site

Open **https://gowinrdc.com** in your browser and check everything in this list:

| What to check | Expected result |
|---|---|
| Home page | Loads without errors; banner slider shows |
| Sports / Fixtures | Fixtures with odds are listed |
| Sidebar (logged out) | Google Play badge visible |
| Footer | Single slim line: copyright · Privacy · Terms |
| Fixtures PDF link | Downloads a PDF coupon of upcoming matches |
| Login / Register | Auth works; 3 failed logins trigger forced password reset |
| Forgot password | OTP email sent; reset-password page works |
| Wallet | Deposit and withdrawal flows work |
| Admin → Settings | PawaPay config section present; USD/CDF rate controls visible |
| Admin → Slides | Can upload, reorder, and delete banner slides |
| Admin → Branches | Branch list shows; can create/edit branches |
| Admin → Users | Wallet balances shown; can reset passwords, credit/debit wallets |
| Live odds | Odds update in real time without page reload (WebSocket) |
| Notifications | Bell icon in header; bet settlement alerts appear |

---

## You're done ✓

The site is updated and running. Future deploys follow the same pattern:

```bash
# On Replit — push new code
git add . && git commit -m "your message" && git push origin main

# On the server — pull and rebuild
cd /var/www/gowin && git pull && docker compose up --build -d
```

---

## Troubleshooting

**No fixtures showing after deploy**
→ The odds filter hides fixtures with no odds. The live sync refreshes odds every 10 minutes — wait and reload.
→ To check: `docker compose exec db psql -U gowin -d gowindb -c "SELECT COUNT(*) FROM odds;"`

**Slide images missing after rebuild**
→ The `slides` volume was not in `docker-compose.yml` before this deploy. Re-upload images via Admin → Slides — they will now persist.

**502 Bad Gateway**
→ The app container is still starting. Wait 30 seconds and refresh.
→ Check: `docker compose ps` and `docker compose logs app`

**`payment_clerk` role error on startup**
→ The schema migration handles this automatically. Check: `docker compose logs app | grep entrypoint`

**SSL certificate expired**
→ Run: `certbot renew`
→ Check expiry: `certbot certificates`

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
| Restore a backup | `docker compose exec -T db psql -U gowin -d gowindb < backup.sql` |
| Rollback to a previous version | `git log --oneline -5` → `git checkout <hash>` → `docker compose up --build -d` |
| Renew SSL manually | `certbot renew` |
| Check disk usage | `df -h` |
| Check memory | `free -h` |
| Clean old Docker images | `docker system prune -af` |

---

*GoWin Sportsbook · gowinrdc.com · 172.105.149.205*
