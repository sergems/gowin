# GoWin Sportsbook — Deployment Guide
## Linode (Akamai Cloud) · Docker · gowinrdc.com

---

## What you will have at the end
- App running 24/7 on a Linode server behind HTTPS
- Domain `gowinrdc.com` with a free SSL certificate (Let's Encrypt)
- PostgreSQL database managed by Docker Compose
- Schema created automatically on every deploy — no manual SQL needed
- One-command deploys: `git pull && docker compose up --build -d`

---

## PART 1 — Push latest code from Replit to GitHub

In the Replit **Shell** tab:

```bash
git add .
git commit -m "deploy: latest build"
git push origin main
```

Confirm you can see the files at **https://github.com/sergems/gowin**. ✅

---

## PART 2 — Create your Linode server

1. Log in at [cloud.linode.com](https://cloud.linode.com).
2. Click **Create → Linode**.
3. Choose:
   - **Image**: Ubuntu 22.04 LTS
   - **Region**: closest to your users (e.g. Johannesburg or Frankfurt)
   - **Plan**: Shared CPU → **Linode 2 GB** (recommended minimum for Docker builds)
   - **Root Password**: choose a strong password and save it
4. Click **Create Linode** and wait until it shows **Running**.
5. Note the **IP address** (e.g. `45.79.10.123`).

---

## PART 3 — Connect to your server

```bash
ssh root@45.79.10.123
```

Replace `45.79.10.123` with your actual IP. Type `yes` when prompted, then enter your root password.

---

## PART 4 — Install Docker & Docker Compose

Run the following in one go:

```bash
apt update && apt upgrade -y

# Install Docker
curl -fsSL https://get.docker.com | sh

# Install Docker Compose plugin
apt install -y docker-compose-plugin

# Install Nginx and Certbot
apt install -y nginx certbot python3-certbot-nginx

# Verify
docker --version
docker compose version
```

---

## PART 5 — Clone your repository

```bash
git clone https://github.com/sergems/gowin.git /var/www/gowin
cd /var/www/gowin
```

---

## PART 6 — Create the environment file

```bash
nano /var/www/gowin/.env
```

Paste this, filling in your values:

```env
# ── Required ─────────────────────────────────────────
NODE_ENV=production
PORT=8080

# Postgres credentials — must match the values in docker-compose.yml below
POSTGRES_USER=gowin
POSTGRES_PASSWORD=CHOOSE_A_STRONG_PASSWORD
POSTGRES_DB=gowindb
DATABASE_URL=postgresql://gowin:CHOOSE_A_STRONG_PASSWORD@db:5432/gowindb

# ── Optional: email (for password resets) ─────────────
SMTP_HOST=
SMTP_PORT=
SMTP_USER=
SMTP_PASS=
SMTP_FROM=
APP_URL=https://gowinrdc.com
```

> ⚠️ Replace `CHOOSE_A_STRONG_PASSWORD` with a real password (same in both `POSTGRES_PASSWORD` and `DATABASE_URL`).

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
1. Pull the Postgres image and start the database
2. Build the GoWin image (installs dependencies, compiles TypeScript, builds React)
3. Start the app container — which waits for Postgres, applies the schema automatically, then starts the server

**First build takes 5–10 minutes.** Watch the logs:

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

## PART 9 — Configure Nginx (reverse proxy)

```bash
nano /etc/nginx/sites-available/gowinrdc.com
```

Paste:

```nginx
server {
    listen 80;
    server_name gowinrdc.com www.gowinrdc.com;

    # Frontend static files (built inside Docker, served by the API server)
    location / {
        proxy_pass http://localhost:8080;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # API
    location /api/ {
        proxy_pass http://localhost:8080;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # WebSocket
    location /ws {
        proxy_pass http://localhost:8080;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "Upgrade";
        proxy_set_header Host $host;
    }

    # Slide images
    location /slides-images/ {
        proxy_pass http://localhost:8080;
        proxy_set_header Host $host;
    }
}
```

Enable it:

```bash
ln -s /etc/nginx/sites-available/gowinrdc.com /etc/nginx/sites-enabled/
nginx -t          # should print "syntax is ok"
systemctl reload nginx
```

---

## PART 10 — Point your domain to the server

Log in to your domain registrar and set these DNS records:

| Type | Name | Value |
|------|------|-------|
| A | @ | `45.79.10.123` |
| A | www | `45.79.10.123` |

Replace `45.79.10.123` with your actual Linode IP.

DNS can take 5–60 minutes to propagate. Check at [dnschecker.org](https://dnschecker.org).

---

## PART 11 — Enable HTTPS (free SSL)

Once DNS is pointing correctly:

```bash
certbot --nginx -d gowinrdc.com -d www.gowinrdc.com
```

- Enter your email, agree to terms, and Certbot will update Nginx automatically.

Test auto-renewal:

```bash
certbot renew --dry-run
```

---

## PART 12 — Verify everything works

1. Open `https://gowinrdc.com` — you should see the GoWin homepage with the green padlock.
2. Try logging in.
3. Check logs if anything looks wrong: `docker compose -f /var/www/gowin/docker-compose.yml logs -f app`

---

## Deploying updates (day-to-day workflow)

Every time you push new code from Replit to GitHub, run this on the server:

```bash
cd /var/www/gowin
git pull
docker compose up --build -d
```

Docker rebuilds only what changed, applies any schema updates automatically, and restarts the app with zero downtime for the database.

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

---

## Auto-start after server reboot

Docker is already configured to restart containers automatically (`restart: always` in `docker-compose.yml`). To make sure Docker itself starts on boot:

```bash
systemctl enable docker
```

---

## Troubleshooting

**502 Bad Gateway**
→ The app container isn't running. Check: `docker compose ps` and `docker compose logs app`.

**Schema / table errors on startup**
→ The entrypoint script applies `scripts/schema.sql` automatically. If it fails, check: `docker compose logs app | grep entrypoint`.

**Database connection refused**
→ The `db` container may still be starting. The app waits for it automatically via the healthcheck — if it keeps failing, check: `docker compose logs db`.

**Domain not resolving**
→ DNS hasn't propagated yet. Wait 30 minutes and try [dnschecker.org](https://dnschecker.org).

**HTTPS not working**
→ DNS must be pointing correctly before running Certbot. Verify DNS first, then re-run `certbot --nginx`.

**Out of disk space**
→ Clean old Docker images: `docker system prune -af`

---

*GoWin Sportsbook — gowinrdc.com*
