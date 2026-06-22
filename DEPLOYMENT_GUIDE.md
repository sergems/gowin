# GoWin Sportsbook — Deployment Guide
## Linode (Akamai Cloud) · Docker · IP-first setup

---

## What you will have at the end
- App running 24/7 at **http://139.162.152.66**
- PostgreSQL database managed by Docker Compose
- Schema created automatically on every deploy — no manual SQL needed
- One-command deploys: `git pull && docker compose up --build -d`

> **Note:** HTTPS and a custom domain can be added later — see the last section of this guide.

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

## PART 2 — Connect to your server

```bash
ssh root@139.162.152.66
```

Type `yes` when prompted, then enter your root password.

---

## PART 3 — Install Docker & Nginx

Run these commands:

```bash
apt update && apt upgrade -y

# Install Docker
curl -fsSL https://get.docker.com | sh

# Install Docker Compose plugin
apt install -y docker-compose-plugin

# Install Nginx (reverse proxy)
apt install -y nginx

# Verify installs
docker --version
docker compose version
```

---

## PART 4 — Clone your repository

```bash
git clone https://github.com/sergems/gowin.git /var/www/gowin
cd /var/www/gowin
```

---

## PART 5 — Create the environment file

```bash
nano /var/www/gowin/.env
```

Paste this, replacing `CHOOSE_A_STRONG_PASSWORD` with a real password (use the same password in both places):

```env
# ── Required ─────────────────────────────────────────
NODE_ENV=production
PORT=8080

# Postgres — same password in both lines below
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
APP_URL=http://139.162.152.66
```

Save: `Ctrl+X` → `Y` → `Enter`.

---

## PART 6 — Create docker-compose.yml

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

## PART 7 — Build and start the application

```bash
cd /var/www/gowin
docker compose up --build -d
```

This will:
1. Pull the Postgres image and start the database
2. Build the GoWin image (installs dependencies, compiles TypeScript, builds React)
3. Start the app — waits for Postgres, applies the schema automatically, then starts the server

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

## PART 8 — Configure Nginx

```bash
nano /etc/nginx/sites-available/gowin
```

Paste:

```nginx
server {
    listen 80;
    server_name 139.162.152.66;

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

Enable it:

```bash
ln -s /etc/nginx/sites-available/gowin /etc/nginx/sites-enabled/
nginx -t          # should print "syntax is ok"
systemctl reload nginx
```

---

## PART 9 — Verify everything works

Open **http://139.162.152.66** in your browser. You should see the GoWin homepage.

Try logging in and navigating around. If anything looks wrong:

```bash
docker compose -f /var/www/gowin/docker-compose.yml logs -f app
```

---

## Deploying updates (day-to-day workflow)

Every time you push new code from Replit to GitHub, SSH into the server and run:

```bash
cd /var/www/gowin
git pull
docker compose up --build -d
```

Docker rebuilds only what changed, applies any schema updates automatically, and restarts the app.

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

The containers already restart automatically (`restart: always`). Make sure Docker itself starts on boot:

```bash
systemctl enable docker
```

---

## Troubleshooting

**502 Bad Gateway**
→ App container isn't running. Check: `docker compose ps` and `docker compose logs app`.

**Schema / table errors on startup**
→ The entrypoint applies the schema automatically. Check: `docker compose logs app | grep entrypoint`.

**Database connection refused**
→ The `db` container may still be starting up. Check: `docker compose logs db`.

**Out of disk space**
→ Clean old Docker images: `docker system prune -af`

---

## Later: switching to a custom domain + HTTPS

When you register a domain (e.g. `gowinrdc.com`), do the following:

**1. Point DNS to your server**

At your domain registrar, add:

| Type | Name | Value |
|------|------|-------|
| A | @ | `139.162.152.66` |
| A | www | `139.162.152.66` |

Wait 5–60 minutes for DNS to propagate ([dnschecker.org](https://dnschecker.org)).

**2. Install Certbot**

```bash
apt install -y certbot python3-certbot-nginx
```

**3. Update the Nginx config**

```bash
nano /etc/nginx/sites-available/gowin
```

Change the `server_name` line from:
```nginx
server_name 139.162.152.66;
```
to:
```nginx
server_name gowinrdc.com www.gowinrdc.com;
```

Save, then reload Nginx:
```bash
nginx -t && systemctl reload nginx
```

**4. Get the SSL certificate**

```bash
certbot --nginx -d gowinrdc.com -d www.gowinrdc.com
```

Follow the prompts. Certbot updates Nginx automatically — your site will now be at **https://gowinrdc.com**.

**5. Update APP_URL in .env**

```bash
nano /var/www/gowin/.env
```

Change:
```env
APP_URL=http://139.162.152.66
```
to:
```env
APP_URL=https://gowinrdc.com
```

Then restart the app:
```bash
docker compose restart app
```

---

*GoWin Sportsbook — 139.162.152.66*
