import { Router } from "express";
import { testDatabaseConnection, switchDatabase } from "@workspace/db";
import { requireAdmin, type AuthRequest } from "../middlewares/auth";
import {
  CUSTOM_DB_KEY,
  CUSTOM_DB_LABEL_KEY,
  getMetaSetting,
  setMetaSetting,
  deleteMetaSetting,
} from "../lib/metaDb";

const router = Router();

function buildConnectionString(url: string, username?: string, password?: string): string {
  try {
    const parsed = new URL(url);
    if (username) parsed.username = encodeURIComponent(username);
    if (password) parsed.password = encodeURIComponent(password);
    return parsed.toString();
  } catch {
    return url;
  }
}

function maskConnectionString(url: string): string {
  try {
    const parsed = new URL(url);
    if (parsed.password) parsed.password = "••••••••";
    return parsed.toString();
  } catch {
    return url;
  }
}

// GET /api/admin/database — current connection status
router.get("/admin/database", requireAdmin, async (_req, res): Promise<void> => {
  const savedUrl = await getMetaSetting(CUSTOM_DB_KEY);
  const label = await getMetaSetting(CUSTOM_DB_LABEL_KEY);
  if (savedUrl) {
    res.json({ connected: true, maskedUrl: maskConnectionString(savedUrl), label: label ?? "" });
  } else {
    res.json({ connected: false, maskedUrl: null, label: null });
  }
});

// POST /api/admin/database/test — test a connection without saving
router.post("/admin/database/test", requireAdmin, async (req: AuthRequest, res): Promise<void> => {
  const { url, username, password } = req.body as { url?: string; username?: string; password?: string };
  if (!url || typeof url !== "string" || !url.trim()) {
    res.status(400).json({ error: "Connection URL is required" });
    return;
  }
  const connStr = buildConnectionString(url.trim(), username?.trim(), password?.trim());
  const result = await testDatabaseConnection(connStr);
  res.json(result);
});

// POST /api/admin/database/connect — connect to a new DB and save
router.post("/admin/database/connect", requireAdmin, async (req: AuthRequest, res): Promise<void> => {
  const { url, username, password, label } = req.body as {
    url?: string;
    username?: string;
    password?: string;
    label?: string;
  };
  if (!url || typeof url !== "string" || !url.trim()) {
    res.status(400).json({ error: "Connection URL is required" });
    return;
  }
  const connStr = buildConnectionString(url.trim(), username?.trim(), password?.trim());

  // Test first
  const test = await testDatabaseConnection(connStr);
  if (!test.ok) {
    res.status(400).json({ error: `Connection failed: ${test.error}` });
    return;
  }

  // Save and switch
  await setMetaSetting(CUSTOM_DB_KEY, connStr);
  if (label?.trim()) {
    await setMetaSetting(CUSTOM_DB_LABEL_KEY, label.trim());
  } else {
    await deleteMetaSetting(CUSTOM_DB_LABEL_KEY);
  }
  switchDatabase(connStr);

  res.json({ ok: true, maskedUrl: maskConnectionString(connStr) });
});

// DELETE /api/admin/database/disconnect — switch back to default DB
router.delete("/admin/database/disconnect", requireAdmin, async (_req, res): Promise<void> => {
  await deleteMetaSetting(CUSTOM_DB_KEY);
  await deleteMetaSetting(CUSTOM_DB_LABEL_KEY);
  switchDatabase(process.env.DATABASE_URL!);
  res.json({ ok: true });
});

export default router;
