import express, { type Express } from "express";
import cors from "cors";
import pinoHttp from "pino-http";
import router from "./routes";
import { logger } from "./lib/logger";
import { join } from "path";
import { mkdirSync, existsSync } from "fs";

const SLIDES_DIR = join(process.cwd(), "uploads", "slides");
if (!existsSync(SLIDES_DIR)) mkdirSync(SLIDES_DIR, { recursive: true });

const app: Express = express();

app.use("/slides-images", express.static(SLIDES_DIR));

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
    app.get("*", (_req, res) => {
      res.sendFile(join(frontendDist, "index.html"));
    });
  }
}

export default app;
