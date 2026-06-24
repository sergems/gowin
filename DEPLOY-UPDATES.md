# GoWin — Pushing Updates to Production (Linode)

This guide covers the day-to-day process of deploying code changes from Replit to the live site at **gowinrdc.com** (Linode `172.105.149.205`).  
For the initial server setup (Docker, Nginx, SSL, database), see **DEPLOYMENT_GUIDE.md**.

---

## How the pipeline works

```
Replit (dev)  →  GitHub (sergems/gowin)  →  Linode server  →  gowinrdc.com
```

---

## Step 1 — Push from Replit to GitHub

In the Replit **Shell** tab:

```bash
git add .
git commit -m "feat: describe what changed"
git push origin main
```

Confirm the changes appear at **https://github.com/sergems/gowin**.

---

## Step 2 — SSH into the Linode server

```bash
ssh root@172.105.149.205
```

---

## Step 3 — Pull and rebuild

```bash
cd /var/www/gowin
git pull
docker compose up --build -d
```

Docker rebuilds only the layers that changed (subsequent builds are much faster than the first), applies any schema changes automatically, and restarts the container with zero manual steps.

Watch the logs while it starts:

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

## Step 4 — Verify

Open **https://gowinrdc.com** and confirm the update is live.

---

## What changed in the latest update (June 2026)

| Area | Change |
|------|--------|
| **Fixtures PDF** | New "Fixtures" link in sidebar — downloads a PDF coupon with all upcoming matches for 7 days, generated at 08:00 and 13:00 daily. Only fixtures with at least one odd are included. Cover page shows date, fixture count, slogan, and www.gowinrdc.com. |
| **Password reset** | Forgot-password and reset-password pages are now fully translated into French when the site language is set to French. |
| **Odds filter** | Fixtures with no odds are excluded from the public fixtures list and the PDF. |

---

## If something goes wrong

**Rollback to the previous working commit:**

```bash
cd /var/www/gowin
git log --oneline -5          # find the last good commit hash
git checkout <commit-hash>
docker compose up --build -d
```

**View live error logs:**

```bash
docker compose logs -f app
```

**Restart without rebuilding (e.g. after an env var change):**

```bash
docker compose restart app
```

---

## Updating environment variables on the server

If you need to add or change a setting (e.g. SMTP credentials):

```bash
nano /var/www/gowin/.env      # edit the value
docker compose restart app    # apply without rebuild
```

The `.env` file is **not** committed to Git — it stays on the server only.

---

*GoWin Sportsbook — gowinrdc.com · 172.105.149.205*
