import { Router } from "express";
import { testDatabaseConnection, switchDatabase, createDb } from "@workspace/db";
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

// GET /api/admin/database
router.get("/admin/database", requireAdmin, async (_req, res): Promise<void> => {
  const savedUrl = await getMetaSetting(CUSTOM_DB_KEY);
  const label = await getMetaSetting(CUSTOM_DB_LABEL_KEY);
  if (savedUrl) {
    res.json({ connected: true, maskedUrl: maskConnectionString(savedUrl), label: label ?? "" });
  } else {
    res.json({ connected: false, maskedUrl: null, label: null });
  }
});

// POST /api/admin/database/test
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

// POST /api/admin/database/connect
router.post("/admin/database/connect", requireAdmin, async (req: AuthRequest, res): Promise<void> => {
  const { url, username, password, label } = req.body as {
    url?: string; username?: string; password?: string; label?: string;
  };
  if (!url || typeof url !== "string" || !url.trim()) {
    res.status(400).json({ error: "Connection URL is required" });
    return;
  }
  const connStr = buildConnectionString(url.trim(), username?.trim(), password?.trim());

  const test = await testDatabaseConnection(connStr);
  if (!test.ok) {
    res.status(400).json({ error: `Connection failed: ${test.error}` });
    return;
  }

  await setMetaSetting(CUSTOM_DB_KEY, connStr);
  if (label?.trim()) {
    await setMetaSetting(CUSTOM_DB_LABEL_KEY, label.trim());
  } else {
    await deleteMetaSetting(CUSTOM_DB_LABEL_KEY);
  }
  switchDatabase(connStr);
  res.json({ ok: true, maskedUrl: maskConnectionString(connStr) });
});

// DELETE /api/admin/database/disconnect
router.delete("/admin/database/disconnect", requireAdmin, async (_req, res): Promise<void> => {
  await deleteMetaSetting(CUSTOM_DB_KEY);
  await deleteMetaSetting(CUSTOM_DB_LABEL_KEY);
  switchDatabase(process.env.DATABASE_URL!);
  res.json({ ok: true });
});

// POST /api/admin/database/import
// Runs a SQL file against a target DB.
// - If `url` is provided → runs against that URL (without switching the live connection).
//   Use this to seed a blank remote DB before switching to it.
// - If no `url` → runs against the currently active connection.
router.post("/admin/database/import", requireAdmin, async (req: AuthRequest, res): Promise<void> => {
  const { sql, url, username, password } = req.body as {
    sql?: string;
    url?: string;
    username?: string;
    password?: string;
  };

  if (!sql || typeof sql !== "string" || !sql.trim()) {
    res.status(400).json({ error: "SQL content is required" });
    return;
  }

  let targetConnStr: string | null = null;
  if (url?.trim()) {
    targetConnStr = buildConnectionString(url.trim(), username?.trim(), password?.trim());
    const test = await testDatabaseConnection(targetConnStr);
    if (!test.ok) {
      res.status(400).json({ error: `Cannot reach target database: ${test.error}` });
      return;
    }
  }

  // Use a fresh dedicated pool for the import so it doesn't interfere with the live connection
  const { pool: importPool } = targetConnStr
    ? createDb(targetConnStr)
    : createDb(
        (await getMetaSetting(CUSTOM_DB_KEY)) ?? process.env.DATABASE_URL!
      );

  let client: any;
  try {
    client = await importPool.connect();

    // Run entire SQL in a single transaction so a failure rolls back cleanly
    await client.query("BEGIN");
    try {
      await client.query(sql);
      await client.query("COMMIT");
    } catch (err: any) {
      await client.query("ROLLBACK");
      throw err;
    }

    res.json({ ok: true, message: "SQL imported successfully" });
  } catch (err: any) {
    res.status(500).json({ error: err.message ?? "Import failed" });
  } finally {
    if (client) client.release();
    importPool.end().catch(() => {});
  }
});

export default router;
