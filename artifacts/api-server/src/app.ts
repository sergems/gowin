import express, { type Express } from "express";
import cors from "cors";
import pinoHttp from "pino-http";
import router from "./routes";
import { logger } from "./lib/logger";
import { join, dirname } from "path";
import { mkdirSync, existsSync } from "fs";
import { fileURLToPath } from "url";

const SLIDES_DIR = join(process.cwd(), "uploads", "slides");
if (!existsSync(SLIDES_DIR)) mkdirSync(SLIDES_DIR, { recursive: true });

const app: Express = express();

app.use("/slides-images", express.static(SLIDES_DIR));

// Serve gowin public assets (APK, store badges, etc.) from the API server so they
// are accessible in both dev (port 8080) and production (API serves the whole app).
// Resolve from the compiled file location (dist/index.mjs → ../../.. = workspace root)
// so this works regardless of process.cwd() in any environment.
const __filename = fileURLToPath(import.meta.url);
const __dir = dirname(__filename);
const gowinPublic = join(__dir, "../../../artifacts/gowin/public");
if (existsSync(gowinPublic)) {
  app.use(express.static(gowinPublic));
}

app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return {
          id: req.id,
          method: req.method,
          url: req.url?.split("?")[0],
        };
      },
      res(res) {
        return {
          statusCode: res.statusCode,
        };
      },
    },
  }),
);
app.use(cors());
app.use(express.json({ limit: "100mb" }));
app.use(express.urlencoded({ extended: true, limit: "100mb" }));

app.use("/api", router);

// In production (Docker), serve the built frontend and handle SPA routing
if (process.env.NODE_ENV === "production") {
  const frontendDist = join(process.cwd(), "artifacts/gowin/dist/public");
  if (existsSync(frontendDist)) {
    app.use(express.static(frontendDist));
    app.get("/{*path}", (_req, res) => {
      res.sendFile(join(frontendDist, "index.html"));
    });
  }
}

export default app;
