# GoWin — Deploying Updates to Production (v2 · June 2026)

This guide covers deploying the **June 2026 batch of updates** to the live Linode server at **gowinrdc.com** (`172.105.149.205`).  
For the initial server setup see `DEPLOYMENT_GUIDE.md`. For the previous update batch see `DEPLOY-UPDATES.md`.

---

## What changed in this update

| Area | Change |
|------|--------|
| **Odds filter — fixtures list** | `/api/fixtures?withMarkets=true` now uses a SQL `EXISTS` subquery to exclude any fixture that has no market with at least one odd. Pagination totals are also accurate. A secondary JS filter catches any edge cases. |
| **Odds filter — sidebar navigation** | `/api/football/countries` now only counts and returns leagues/countries that contain at least one upcoming fixture with odds. Leagues with zero bettable games no longer appear in the left-hand nav. |
| **Layout — floating header** | The top nav bar is now `position: absolute` (zero height). It floats over content instead of pushing it down. Controls (wallet balance, hamburger, bet slip) are still fully clickable via `pointer-events-auto`. |
| **Layout — full-bleed slider** | The home-page banner slider starts at pixel 0 — no gap above it. It uses negative margins (`-mt-14 -mx-4 md:-mx-5 lg:-mx-6`) to break out of the content wrapper's padding. All other pages retain `pt-14` clearance under the floating header. |
| **Download App — sidebar** | Google Play badge added to the sidebar: after **Wallet** for logged-in users; after **Fixtures PDF** for guests. Badge height `h-9` (≈ 36 px). |
| **Download App — mobile bottom nav** | Google Play badge added between Wallet and Bet Slip (logged-in) and between Results and Login (guest). Badge height `h-8` (≈ 32 px). |
| **Footer cleanup** | The "Download our official mobile app now" section and store-badge images are removed from the footer. The footer is now a single slim line: copyright · Privacy Policy · Terms of Service. |

---

## Files changed

```
artifacts/api-server/src/routes/sports.ts   ← odds filter (fixtures + countries)
artifacts/gowin/src/components/layout/Shell.tsx  ← header, footer, nav download badges
artifacts/gowin/src/pages/home.tsx          ← slider full-bleed layout
```

No new environment variables, no database schema changes, no new packages.

---

## Deployment steps

### Step 1 — Push from Replit to GitHub

In the Replit **Shell** tab:

```bash
git add .
git commit -m "feat: odds filter, full-bleed slider, nav download badges, slim footer"
git push origin main
```

Confirm the commits appear at **https://github.com/sergems/gowin**.

---

### Step 2 — SSH into the Linode server

```bash
ssh root@172.105.149.205
```

---

### Step 3 — Pull and rebuild

```bash
cd /var/www/gowin
git pull
docker compose up --build -d
```

Docker rebuilds only what changed (the API server bundle and the React SPA). The database is untouched — no schema migration needed for this update.

Watch the logs while it starts:

```bash
docker compose logs -f app
```

Expected output:

```
[entrypoint] PostgreSQL is ready.
[entrypoint] Applying database schema...
[entrypoint] Schema applied.
[entrypoint] Starting API server...
Server listening  port: 8080
```

---

### Step 4 — Verify

Open **https://gowinrdc.com** and check:

| What to check | Expected result |
|---------------|-----------------|
| Home page | Banner slider starts flush at the very top — no gap above it |
| Sidebar (logged out) | Google Play badge appears below the Fixtures PDF link |
| Sidebar (logged in) | Google Play badge appears below the Wallet link |
| Mobile bottom nav | Google Play badge visible between Wallet / Results and Bet Slip |
| Footer | Only shows copyright · Privacy · Terms (no store badges) |
| Sports / fixtures list | Only games that have at least one odd are shown |
| Country/league sidebar | Only leagues with bettable upcoming fixtures are listed |

---

## No database migration required

This update contains **no schema changes**. The `drizzle-kit push` step in the entrypoint will run and exit cleanly with no alterations.

---

## Rollback

If the update causes an issue, revert to the previous commit:

```bash
cd /var/www/gowin
git log --oneline -5          # copy the hash of the last known-good commit
git checkout <commit-hash>
docker compose up --build -d
```

---

## If something goes wrong

**Fixtures page shows no games after update**  
→ The odds filter is working as intended — your database may have no fixtures with odds yet. Check: `docker compose exec db psql -U gowin -d gowindb -c "SELECT COUNT(*) FROM odds;"`  
→ If the odds table is empty, the live sync will populate it within 10 minutes of server start.

**Slider has a gap at the top**  
→ Hard-refresh the browser (`Ctrl+Shift+R` / `Cmd+Shift+R`) to clear cached CSS.

**Google Play badge not showing in sidebar**  
→ Confirm `/store-badges/google-play.png` is served by the app: `curl -I https://gowinrdc.com/store-badges/google-play.png` should return `200 OK`.

**502 Bad Gateway after rebuild**  
→ App container may still be starting. Wait 30 seconds and refresh, or check: `docker compose ps` and `docker compose logs app`.

---

*GoWin Sportsbook — gowinrdc.com · 172.105.149.205*
