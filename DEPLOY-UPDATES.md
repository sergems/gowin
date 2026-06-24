# GoWin — Deploying Updates to Production

This guide covers how to push code changes to an **already-deployed** GoWin instance on Replit.
For the initial deployment setup, see the existing deployment guide in your project docs.

---

## What changed in this update

- **Fixtures PDF** — generated twice daily (08:00 & 13:00); only fixtures with at least one odd are included; 7-day window for all leagues; DD/MM date shown on every row; website updated to www.gowinrdc.com
- **Sidebar** — "Daily Fixtures PDF" link renamed to "Fixtures"

---

## How to deploy

### 1. Make sure the dev app is working

Open the preview pane and confirm the app loads, the sidebar shows "Fixtures", and clicking it downloads a PDF.

### 2. Click Publish / Redeploy

In Replit, click the **Deploy** button (top-right, looks like a rocket 🚀).  
If the project was already published, you will see a **Redeploy** button instead — click it.

Replit will:
1. Run the build command (`bash start.sh` / `pnpm build`)
2. Bundle and push the new code to the production VM
3. Restart the production server

This typically takes 1–3 minutes.

### 3. Verify production

Once redeployment finishes, visit your production URL (e.g. `https://gowin.replit.app`) and confirm:

- [ ] The sidebar shows **Fixtures** (not "Daily Fixtures PDF")
- [ ] Clicking **Fixtures** downloads a PDF
- [ ] The PDF cover page shows **www.gowinrdc.com**
- [ ] Every fixture row in the PDF has at least one odd value (no blank rows)
- [ ] The Time column shows the date (`DD/MM`) above the kick-off time

### 4. Force a fresh PDF on production

The production server generates the PDF automatically 10 seconds after startup and then at 08:00 and 13:00 daily. After a redeploy the server restarts, so the first PDF is regenerated automatically within 10 seconds.

If you ever need to regenerate immediately (admin-only, requires server access):

```
POST https://your-production-url/api/fixtures-pdf/regenerate
Authorization: Bearer <admin-jwt-token>
```

---

## Rollback

If something goes wrong after redeployment, use Replit **Checkpoints** to revert:

1. Open the project on Replit
2. Click the clock / history icon to see checkpoints
3. Select the last known-good checkpoint and click **Restore**
4. Redeploy again from the restored state

---

## Environment variables

No new environment variables were introduced in this update. The existing `DATABASE_URL` (and optional SMTP vars) are sufficient.

---

## Notes

- The PDF is cached on disk (`uploads/fixtures/daily-fixtures.pdf`). In production this file lives inside the VM's ephemeral storage and is regenerated on every server restart and at the two daily slots.
- PDF generation takes 30–90 seconds depending on the number of fixtures. The download endpoint waits for generation to complete on the first request after a restart.
