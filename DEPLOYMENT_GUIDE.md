# GoWin Sportsbook — Deployment Guide
## Linode (Akamai Cloud) · Docker · gowinrdc.com

---

## Stack at a glance

| Layer | Version |
|-------|---------|
| Node.js | 24 (slim) |
| pnpm | **11.8.0** (Docker/production) · 10.26.1 (Replit dev — Node 20 constraint) |
| Express | 5.x |
| PostgreSQL | 16-alpine |
| Server | Linode — `172.105.149.205` |
| Domain | `gowinrdc.com` |

---

## What you will have at the end

- App live at **https://gowinrdc.com** (and www)
- PostgreSQL managed by Docker Compose with persistent volume
- Schema applied automatically on every deploy — no manual SQL
- Free auto-renewing SSL via Let's Encrypt / Certbot
- One-command redeploys: `git pull && docker compose up --build -d`

---

## PART 1 — Push latest code from Replit to GitHub

In the Replit **Shell** tab:

```bash
git add .
git commit -m "deploy: latest build"
git push origin main
```

Confirm the files are visible at **https://github.com/sergems/gowin**. ✅

---

## PART 2 — Point DNS to your Linode

At your domain registrar, make sure these DNS records exist:

| Type | Name | Value | TTL |
|------|------|-------|-----|
| A | `@` | `172.105.149.205` | 300 |
| A | `www` | `172.105.149.205` | 300 |

Check propagation at [dnschecker.org](https://dnschecker.org) before continuing — Certbot needs DNS live to issue the certificate. Usually takes 5–30 minutes.

---

## PART 3 — Connect to your Linode

```bash
ssh root@172.105.149.205
```

Type `yes` when prompted, then enter your root password.

---

## PART 4 — Install Docker & Nginx

```bash
apt update && apt upgrade -y

# Docker
curl -fsSL https://get.docker.com | sh
systemctl enable docker

# Docker Compose plugin
apt install -y docker-compose-plugin

# Nginx + Certbot
apt install -y nginx certbot python3-certbot-nginx

# Verify
docker --version
docker compose version
nginx -v
```

---

## PART 5 — Clone the repository

```bash
git clone https://github.com/sergems/gowin.git /var/www/gowin
cd /var/www/gowin
```

---

## PART 6 — Create the environment file

```bash
nano /var/www/gowin/.env
```

Paste the block below — replace both `CHOOSE_A_STRONG_PASSWORD` occurrences with the same strong password, and fill in your SMTP details if you want email (password resets, OTP):

```env
# ── Required ──────────────────────────────────────────
NODE_ENV=production
PORT=8080

# Postgres — use the same password in both lines
POSTGRES_USER=gowin
POSTGRES_PASSWORD=CHOOSE_A_STRONG_PASSWORD
POSTGRES_DB=gowindb
DATABASE_URL=postgresql://gowin:CHOOSE_A_STRONG_PASSWORD@db:5432/gowindb

# ── Optional: email (password resets / OTP) ───────────
SMTP_HOST=
SMTP_PORT=
SMTP_USER=
SMTP_PASS=
SMTP_FROM=
APP_URL=https://gowinrdc.com
```

Save: `Ctrl+X` → `Y` → `Enter`.

---

## PART 7 — Create docker-compose.yml

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
  pgdata:
```

Save: `Ctrl+X` → `Y` → `Enter`.

---

## PART 8 — Build and start the application

```bash
cd /var/www/gowin
docker compose up --build -d
```

This will:
1. Pull the Postgres 16 image and start the database
2. Build the GoWin image with **pnpm 11.8.0** on Node 24 — installs deps, compiles TypeScript, builds the React SPA
3. Start the Express 5 server — waits for Postgres, applies the schema automatically, then begins serving on port 8080

**First build takes 5–10 minutes.** Watch it live:

```bash
docker compose logs -f app
```

You should see:
```
[entrypoint] PostgreSQL is ready.
[entrypoint] Applying database schema...
[entrypoint] Schema applied.
[entrypoint] Starting API server...
Server listening  port: 8080
```

---

## PART 9 — Configure Nginx (HTTP first, for Certbot)

```bash
nano /etc/nginx/sites-available/gowin
```

Paste this initial HTTP-only config (Certbot will upgrade it to HTTPS in the next step):

```nginx
server {
    listen 80;
    server_name gowinrdc.com www.gowinrdc.com;

    location / {
        proxy_pass http://localhost:8080;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    location /api/ {
        proxy_pass http://localhost:8080;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    location /ws {
        proxy_pass http://localhost:8080;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "Upgrade";
        proxy_set_header Host $host;
    }

    location /slides-images/ {
        proxy_pass http://localhost:8080;
        proxy_set_header Host $host;
    }
}
```

Enable it and reload Nginx:

```bash
ln -s /etc/nginx/sites-available/gowin /etc/nginx/sites-enabled/
nginx -t          # must print "syntax is ok"
systemctl reload nginx
```

---

## PART 10 — Issue the SSL certificate

```bash
certbot --nginx -d gowinrdc.com -d www.gowinrdc.com
```

Certbot will:
- Verify domain ownership (requires DNS to be live — see Part 2)
- Obtain a free Let's Encrypt certificate
- Automatically rewrite the Nginx config to serve HTTPS and redirect HTTP → HTTPS
- Schedule auto-renewal via a systemd timer

After it finishes, your site is live at **https://gowinrdc.com**. ✅

Test renewal works without errors:

```bash
certbot renew --dry-run
```

---

## PART 11 — Verify everything works

Open **https://gowinrdc.com** in your browser. You should see the GoWin homepage with a valid padlock.

Try logging in, browsing fixtures, and placing a test bet. If anything looks wrong:

```bash
docker compose -f /var/www/gowin/docker-compose.yml logs -f app
```

---

## Day-to-day: deploying updates

Every time you push new code from Replit to GitHub, SSH into the server and run:

```bash
cd /var/www/gowin
git pull
docker compose up --build -d
```

Docker rebuilds only what changed, applies any schema updates automatically, and does a zero-downtime restart.

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
| Check disk usage | `df -h` |
| Check memory | `free -h` |
| Renew SSL manually | `certbot renew` |
| Check SSL expiry | `certbot certificates` |

---

## Auto-start after server reboot

All containers use `restart: always` and Docker is enabled on boot (`systemctl enable docker` — done in Part 4). No extra setup needed.

---

## Troubleshooting

**502 Bad Gateway**
→ App container isn't running. Check: `docker compose ps` and `docker compose logs app`.

**SSL certificate errors / Certbot fails**
→ DNS hasn't propagated yet. Check [dnschecker.org](https://dnschecker.org) for `gowinrdc.com` → `172.105.149.205`. Wait a few more minutes and retry.

**`ERR_PNPM_UNSUPPORTED_ENGINE` during build**
→ pnpm v11 requires Node.js ≥ 22.13. The Dockerfile uses `node:24-slim` which satisfies this. If you see this error, confirm the base image hasn't been changed to an older Node version.

**Express 5 middleware errors**
→ Express 5 drops some legacy APIs. All route handlers are written for Express 5 — do not downgrade to Express 4.

**Schema / table errors on startup**
→ The entrypoint applies the schema automatically. Check: `docker compose logs app | grep entrypoint`.

**Database connection refused**
→ The `db` container may still be initialising. Check: `docker compose logs db`.

**Out of disk space**
→ Clean old Docker images: `docker system prune -af`

---

*GoWin Sportsbook — gowinrdc.com · 172.105.149.205*
