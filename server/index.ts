import "dotenv/config"; // Loads .env at process start

import express, {
  type Request,
  type Response,
  type NextFunction,
} from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";

const app = express();

// Keep rawBody if you ever need signature verification
declare module "http" {
  interface IncomingMessage {
    rawBody: unknown;
  }
}

app.use(
  express.json({
    verify: (req, _res, buf) => {
      req.rawBody = buf;
    },
  })
);
app.use(express.urlencoded({ extended: false }));

/** Minimal API logger for /api responses with trimmed JSON */
app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: unknown | undefined;

  // Response.json signature takes a single body argument.
  // Bind and call it safely (fixes TS spread error).
  const originalJson = res.json.bind(res) as (body?: any) => typeof res;

  (res as any).json = (bodyJson?: any) => {
    capturedJsonResponse = bodyJson;
    return originalJson(bodyJson);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let line = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse !== undefined) {
        try {
          const s = JSON.stringify(capturedJsonResponse);
          line += ` :: ${s}`;
        } catch {
          /* ignore stringify errors */
        }
      }
      if (line.length > 80) line = line.slice(0, 79) + "…";
      log(line);
    }
  });

  next();
});

(async () => {
  const server = await registerRoutes(app);

  // Central error handler
  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err?.status || err?.statusCode || 500;
    const message = err?.message || "Internal Server Error";
    res.status(status).json({ message });
    throw err; // bubble to external logger if present
  });

  // Use Vite dev server in development, static assets in production
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  // Single allowed port (per your infra)
  const port = parseInt(process.env.PORT || "5000", 10);
  const host = process.env.HOST || "127.0.0.1";

  server.listen({ port, host }, () => {
    log(`serving on http://${host}:${port}`);
  });
})();
