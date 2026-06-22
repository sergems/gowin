# GoWin Sportsbook — Deployment Guide
## Hosting on Akamai Cloud (Linode) with domain gowinrdc.com

---

## What you will have at the end
- Your app running 24/7 on a Linode server
- Domain `gowinrdc.com` pointing to it
- HTTPS (green padlock) via Let's Encrypt
- PostgreSQL database running on the same server
- Your data imported from the Replit backup

---

## PART 1 — Push latest code to GitHub

> The repository already exists at **https://github.com/sergems/gowin**. Just make sure it's up to date before deploying.

In Replit's Shell tab, run:
```bash
git add .
git commit -m "deploy: latest build"
git push origin main
```

Verify you can see your latest files on GitHub at [github.com/sergems/gowin](https://github.com/sergems/gowin). ✅

---

## PART 2 — Create your Linode server

1. Log in at [cloud.linode.com](https://cloud.linode.com).

2. Click **Create** → **Linode**.

3. Choose:
   - **Image**: Ubuntu 22.04 LTS
   - **Region**: pick the one closest to your users (e.g. Frankfurt or Johannesburg)
   - **Plan**: Shared CPU → **Nanode 1 GB** (cheapest, works fine to start; upgrade later if needed)
   - **Root Password**: choose a strong password and **save it somewhere safe**
   - **SSH Keys**: optionally add your public key for easier login

4. Click **Create Linode**. Wait ~1 minute until it shows **Running**.

5. Copy the **IP address** shown (e.g. `45.79.10.123`).

---

## PART 3 — Connect to your server

On your computer, open a terminal (Mac/Linux) or PowerShell (Windows) and run:

```bash
ssh root@45.79.10.123
```

Replace `45.79.10.123` with your actual IP. Type `yes` when asked, then enter your root password.

You are now inside your server. 🎉

---

## PART 4 — Install system software

Run these commands one by one (copy and paste each block):

### 4.1 — Update the system
```bash
apt update && apt upgrade -y
```

### 4.2 — Install Node.js 22
```bash
curl -fsSL https://deb.nodesource.com/setup_22.x | bash -
apt install -y nodejs
node -v   # should print v22.x.x
```

### 4.3 — Install pnpm
```bash
npm install -g pnpm
pnpm -v   # should print a version number
```

### 4.4 — Install PostgreSQL
```bash
apt install -y postgresql postgresql-contrib
systemctl start postgresql
systemctl enable postgresql
```

### 4.5 — Install Nginx (web server / reverse proxy)
```bash
apt install -y nginx
systemctl start nginx
systemctl enable nginx
```

### 4.6 — Install Certbot (free HTTPS)
```bash
apt install -y certbot python3-certbot-nginx
```

### 4.7 — Install PM2 (keeps your app running forever)
```bash
npm install -g pm2
```

### 4.8 — Install Git
```bash
apt install -y git
```

---

## PART 5 — Set up the database

### 5.1 — Create a database user and database
```bash
sudo -u postgres psql
```

You are now in the PostgreSQL console. Run:
```sql
CREATE USER gowin WITH PASSWORD 'CHOOSE_A_STRONG_PASSWORD';
CREATE DATABASE gowindb OWNER gowin;
GRANT ALL PRIVILEGES ON DATABASE gowindb TO gowin;
\q
```
**Save this password — you will need it shortly.**

### 5.2 — Test the connection
```bash
psql -U gowin -d gowindb -h localhost
```
Type `\q` to exit.

---

## PART 6 — Clone your code on the server

```bash
cd /var/www
git clone https://github.com/sergems/gowin.git gowin
cd gowin
```

---

## PART 7 — Configure environment variables

Create the environment file:
```bash
nano /var/www/gowin/.env
```

Paste the following, filling in your values:
```env
NODE_ENV=production
DATABASE_URL=postgresql://gowin:CHOOSE_A_STRONG_PASSWORD@localhost:5432/gowindb
PORT=8080

# Optional — email (for password resets). Leave blank if not using email.
SMTP_HOST=
SMTP_PORT=
SMTP_USER=
SMTP_PASS=
SMTP_FROM=
```

Save: press `Ctrl+X`, then `Y`, then `Enter`.

---

## PART 8 — Install dependencies and build the app

```bash
cd /var/www/gowin
pnpm install --frozen-lockfile
pnpm --filter @workspace/api-server run build
pnpm --filter @workspace/gowin run build
```

This takes 2–5 minutes. At the end you will have:
- `artifacts/api-server/dist/index.mjs` — the backend
- `artifacts/gowin/dist/public/` — the frontend static files

---

## PART 9 — Push the database schema

```bash
cd /var/www/gowin
pnpm --filter @workspace/db run push
```

This creates all the tables in PostgreSQL.

---

## PART 10 — Import your data from the backup

`backup1.sql` is already included in the repository, so it was downloaded when you cloned in Part 6. Just run:

```bash
psql postgresql://gowin:CHOOSE_A_STRONG_PASSWORD@localhost:5432/gowindb -f /var/www/gowin/backup1.sql
```

Replace `CHOOSE_A_STRONG_PASSWORD` with the password you created in Part 5.

---

## PART 11 — Configure the API server to serve the frontend

Edit the api-server app to serve static files in production. Open:
```bash
nano /var/www/gowin/artifacts/api-server/src/app.ts
```

Find the line that says `export default app` (near the bottom) and add these lines **just before it**:

```typescript
// Serve frontend in production
if (process.env.NODE_ENV === "production") {
  const { default: serveStatic } = await import("serve-static");
  const frontendDist = path.join(__dirname, "../../gowin/dist/public");
  app.use(serveStatic(frontendDist));
  app.get("*", (_req, res) => {
    res.sendFile(path.join(frontendDist, "index.html"));
  });
}
```

Also make sure `path` is imported at the top if not already:
```typescript
import path from "path";
```

Then rebuild:
```bash
cd /var/www/gowin
pnpm --filter @workspace/api-server run build
```

**Alternative (simpler):** Use Nginx to serve the frontend directly (see Part 12 below) — this is the recommended approach and does NOT require changing app.ts.

---

## PART 12 — Configure Nginx

Create an Nginx config file:
```bash
nano /etc/nginx/sites-available/gowinrdc.com
```

Paste this entire block:
```nginx
server {
    listen 80;
    server_name gowinrdc.com www.gowinrdc.com;

    # Serve built frontend files
    root /var/www/gowin/artifacts/gowin/dist/public;
    index index.html;

    # Frontend routes — all go to index.html (React handles routing)
    location / {
        try_files $uri $uri/ /index.html;
    }

    # Proxy API requests to Node.js
    location /api/ {
        proxy_pass http://localhost:8080;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Proxy WebSocket
    location /ws {
        proxy_pass http://localhost:8080;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "Upgrade";
        proxy_set_header Host $host;
    }

    # Proxy slide images
    location /slides-images/ {
        proxy_pass http://localhost:8080;
        proxy_set_header Host $host;
    }
}
```

Save (`Ctrl+X`, `Y`, `Enter`), then enable the site:
```bash
ln -s /etc/nginx/sites-available/gowinrdc.com /etc/nginx/sites-enabled/
nginx -t        # test config — should say "syntax is ok"
systemctl reload nginx
```

---

## PART 13 — Point your domain to the server

Log in to wherever you bought `gowinrdc.com` (your domain registrar).

Find **DNS settings** and add/update:

| Type | Name | Value |
|------|------|-------|
| A | @ | 45.79.10.123 |
| A | www | 45.79.10.123 |

Replace `45.79.10.123` with your actual Linode IP.

DNS changes take 5–60 minutes to propagate worldwide.

---

## PART 14 — Enable HTTPS (free SSL certificate)

Once DNS has propagated (you can check at [dnschecker.org](https://dnschecker.org)):
```bash
certbot --nginx -d gowinrdc.com -d www.gowinrdc.com
```

Follow the prompts:
- Enter your email address
- Agree to terms: `A`
- Certbot will automatically update your Nginx config for HTTPS

Test automatic renewal:
```bash
certbot renew --dry-run
```

---

## PART 15 — Start the app with PM2

```bash
cd /var/www/gowin

# Load environment variables and start the API server
pm2 start artifacts/api-server/dist/index.mjs \
  --name gowin-api \
  --env-file .env

# Save so PM2 restarts the app after a reboot
pm2 save
pm2 startup
```

Run the command that `pm2 startup` prints (it looks like `systemctl enable pm2-root`).

Check it's running:
```bash
pm2 status
pm2 logs gowin-api
```

---

## PART 16 — Verify everything works

1. Open `https://gowinrdc.com` in your browser.
2. You should see the GoWin homepage with the green padlock.
3. Try registering and logging in.
4. Check PM2 logs for any errors: `pm2 logs gowin-api --lines 50`

---

## Useful commands (day-to-day)

| Task | Command |
|------|---------|
| View live logs | `pm2 logs gowin-api` |
| Restart the app | `pm2 restart gowin-api` |
| Pull latest code | `cd /var/www/gowin && git pull` |
| Rebuild after code changes | `pnpm --filter @workspace/api-server run build && pnpm --filter @workspace/gowin run build && pm2 restart gowin-api` |
| Check Nginx errors | `tail -f /var/log/nginx/error.log` |
| Database backup | `pg_dump -U gowin gowindb > backup_$(date +%Y%m%d).sql` |
| Database restore | `psql postgresql://gowin:PASSWORD@localhost:5432/gowindb -f backup.sql` |
| Server disk usage | `df -h` |
| Server memory | `free -h` |

---

## Troubleshooting

**App not loading (502 Bad Gateway)**
→ The Node.js server is not running. Check: `pm2 status` and `pm2 logs gowin-api`.

**Database connection error**
→ Check your `DATABASE_URL` in `.env` — password, username and database name must match what you created in Part 5.

**Domain not resolving**
→ DNS hasn't propagated yet. Wait 30 minutes and check again at [dnschecker.org](https://dnschecker.org).

**HTTPS not working**
→ Make sure DNS is pointing correctly first, then re-run Certbot.

---

*Guide prepared for GoWin Sportsbook — gowinrdc.com*
