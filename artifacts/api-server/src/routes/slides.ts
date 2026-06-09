import { Router } from "express";
import { db } from "@workspace/db";
import { slidesTable } from "@workspace/db";
import { requireAdmin } from "../middlewares/auth";
import { eq, asc } from "drizzle-orm";
import { writeFileSync, mkdirSync, existsSync, unlinkSync } from "fs";
import { join } from "path";

const router = Router();

const SLIDES_DIR = join(process.cwd(), "uploads", "slides");

if (!existsSync(SLIDES_DIR)) {
  mkdirSync(SLIDES_DIR, { recursive: true });
}

router.get("/slides", async (_req, res): Promise<void> => {
  const slides = await db
    .select()
    .from(slidesTable)
    .where(eq(slidesTable.active, true))
    .orderBy(asc(slidesTable.sortOrder), asc(slidesTable.createdAt));

  res.json(
    slides.map((s) => ({
      id: s.id,
      url: `/slides-images/${s.filename}`,
      sortOrder: s.sortOrder,
    })),
  );
});

router.get("/admin/slides", requireAdmin, async (_req, res): Promise<void> => {
  const slides = await db
    .select()
    .from(slidesTable)
    .orderBy(asc(slidesTable.sortOrder), asc(slidesTable.createdAt));

  res.json(
    slides.map((s) => ({
      id: s.id,
      filename: s.filename,
      url: `/slides-images/${s.filename}`,
      sortOrder: s.sortOrder,
      active: s.active,
      createdAt: s.createdAt,
    })),
  );
});

router.post("/admin/slides", requireAdmin, async (req, res): Promise<void> => {
  const { dataUrl, name } = req.body as { dataUrl?: string; name?: string };

  if (!dataUrl || !name) {
    res.status(400).json({ error: "dataUrl and name are required" });
    return;
  }

  const match = dataUrl.match(/^data:([^;]+);base64,(.+)$/s);
  if (!match) {
    res.status(400).json({ error: "Invalid dataUrl format" });
    return;
  }

  const safeName = name.replace(/[^a-z0-9._-]/gi, "_").toLowerCase();
  const filename = `${Date.now()}-${safeName}`;
  const buffer = Buffer.from(match[2], "base64");

  writeFileSync(join(SLIDES_DIR, filename), buffer);

  const [slide] = await db
    .insert(slidesTable)
    .values({ filename, sortOrder: 0, active: true })
    .returning();

  res.json({ id: slide.id, url: `/slides-images/${filename}` });
});

router.patch("/admin/slides/:id", requireAdmin, async (req, res): Promise<void> => {
  const id = parseInt(req.params.id, 10);
  const { active, sortOrder } = req.body as { active?: boolean; sortOrder?: number };

  const update: Partial<typeof slidesTable.$inferInsert> = {};
  if (active !== undefined) update.active = active;
  if (sortOrder !== undefined) update.sortOrder = sortOrder;

  await db.update(slidesTable).set(update).where(eq(slidesTable.id, id));
  res.json({ ok: true });
});

router.delete("/admin/slides/:id", requireAdmin, async (req, res): Promise<void> => {
  const id = parseInt(req.params.id, 10);

  const [slide] = await db
    .select()
    .from(slidesTable)
    .where(eq(slidesTable.id, id));

  if (!slide) {
    res.status(404).json({ error: "Not found" });
    return;
  }

  try {
    unlinkSync(join(SLIDES_DIR, slide.filename));
  } catch {
    // ignore missing file
  }

  await db.delete(slidesTable).where(eq(slidesTable.id, id));
  res.json({ ok: true });
});

export default router;
