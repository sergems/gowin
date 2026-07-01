import { Router } from "express";
import { generateFixturesPdf, getPdfPath, pdfExists } from "../lib/pdfGenerator";
import { logger } from "../lib/logger";

const router = Router();

router.get("/fixtures-pdf/download", async (req, res): Promise<void> => {
  try {
    if (!pdfExists()) {
      logger.info("PDF not found — generating on demand");
      await generateFixturesPdf();
    }
    res.download(getPdfPath(), "gowin-daily-fixtures.pdf");
  } catch (err) {
    logger.error({ err, message: err instanceof Error ? err.message : String(err), stack: err instanceof Error ? err.stack : undefined }, "Failed to serve fixtures PDF");
    res.status(503).json({ error: "PDF is not available yet. Please try again shortly." });
  }
});

router.post("/fixtures-pdf/regenerate", async (req, res): Promise<void> => {
  try {
    await generateFixturesPdf();
    res.json({ ok: true, message: "PDF regenerated successfully" });
  } catch (err) {
    logger.error({ err }, "Failed to regenerate fixtures PDF");
    res.status(500).json({ error: "Failed to regenerate PDF" });
  }
});

export default router;
