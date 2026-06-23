import express, { type Express, type Request, type Response, type NextFunction } from "express";
import cors from "cors";
import pinoHttp from "pino-http";
import router from "./routes";
import { logger } from "./lib/logger";

const app: Express = express();

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

// Restrict CORS to known origins in production; allow all in dev
const allowedOrigins = process.env["REPLIT_DOMAINS"]
  ? process.env["REPLIT_DOMAINS"].split(",").map(d => `https://${d.trim()}`)
  : [];

app.use(cors({
  origin: (origin, cb) => {
    // Allow requests with no origin (curl, server-to-server, SSE)
    if (!origin) return cb(null, true);
    // In dev (no REPLIT_DOMAINS set), allow all origins
    if (allowedOrigins.length === 0) return cb(null, true);
    // In production, allow known Replit domains and localhost
    const allowed =
      allowedOrigins.some(o => origin.startsWith(o)) ||
      origin.startsWith("http://localhost");
    // Pass false (not an error) — browser will enforce the block client-side
    cb(null, allowed);
  },
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use("/api", router);

// JSON 404 handler — must come after all routes
app.use((_req: Request, res: Response) => {
  res.status(404).json({ error: "Not found" });
});

// JSON error handler
app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  logger.error({ err }, "Unhandled error");
  res.status(500).json({ error: "Internal server error" });
});

export default app;
