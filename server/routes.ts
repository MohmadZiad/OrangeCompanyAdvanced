// server/routes.ts
import type { Express } from "express";
import { createServer, type Server } from "http";

// handlers الحقيقيّة من api/*
import docsHandler from "../api/docs";
import chatHandler from "../api/chat";

export async function registerRoutes(app: Express): Promise<Server> {
  // Body parser (لو موجود بمكان آخر، عادي يتكرر بدون ضرر)
  const bodyParser = await import("body-parser");
  app.use(bodyParser.json({ limit: "1mb" }));

  // Health check
  app.get("/health", (_req, res) => res.json({ ok: true }));

  // مرّر الطلبات مباشرة لهاندلرز api/*
  app.get("/api/docs", (req, res) => (docsHandler as any)(req, res));
  app.post("/api/chat", (req, res) => (chatHandler as any)(req, res));

  // لدمج السيرفر في index.ts
  const httpServer = createServer(app);
  return httpServer;
}
