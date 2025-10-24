// server/routes.ts
import type { Express } from "express";
import { createServer, type Server } from "http";
import { openai, SYSTEM_PROMPT } from "./openai";
import { chatRequestSchema } from "@shared/schema";

// Rate limiting (ذاكرة مؤقتة بسيطة)
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();
const RATE_LIMIT_WINDOW = 60_000; // 1 دقيقة
const RATE_LIMIT_MAX_REQUESTS = 10;

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const rec = rateLimitMap.get(ip);
  if (!rec || now > rec.resetTime) {
    rateLimitMap.set(ip, { count: 1, resetTime: now + RATE_LIMIT_WINDOW });
    return true;
  }
  if (rec.count >= RATE_LIMIT_MAX_REQUESTS) return false;
  rec.count++;
  return true;
}

export async function registerRoutes(app: Express): Promise<Server> {
  // صحة
  app.get("/health", (_req, res) => res.json({ ok: true }));

  // دردشة OpenAI مع بث SSE
  app.post("/api/chat", async (req, res) => {
    try {
      // Rate limit
      const clientIp =
        (req.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim() ||
        (req.socket?.remoteAddress ?? "unknown");
      if (!checkRateLimit(clientIp)) {
        return res
          .status(429)
          .json({ error: "Too many requests. Please try again later." });
      }

      // Validate body
      const parsed = chatRequestSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({
          error: "Invalid request format",
          details: parsed.error.errors,
        });
      }

      const { messages } = parsed.data;

      // SSE headers
      res.setHeader("Content-Type", "text/event-stream");
      res.setHeader("Cache-Control", "no-cache");
      res.setHeader("Connection", "keep-alive");

      // اختياري: نبضات للحفاظ على الاتصال
      const keepAlive = setInterval(() => {
        try {
          res.write(`:\n\n`);
        } catch {}
      }, 25_000);

      // استدعاء OpenAI مع البث
      // ملاحظة: حسب طلبك، نستخدم gpt-5 ولا نغيره
      const stream = await openai.chat.completions.create({
        model: "gpt-5",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          ...messages.map((m) => ({
            role: m.role as "user" | "assistant",
            content: m.content,
          })),
        ],
        max_completion_tokens: 2048,
        stream: true,
      });

      for await (const chunk of stream) {
        const content = chunk.choices?.[0]?.delta?.content || "";
        if (content) {
          res.write(`data: ${JSON.stringify({ content })}\n\n`);
        }
      }

      clearInterval(keepAlive);
      res.write(`data: [DONE]\n\n`);
      res.end();
    } catch (err: any) {
      // إن حصل خطأ أثناء البث
      if (res.headersSent) {
        try {
          res.write(
            `data: ${JSON.stringify({
              error: err?.message || "Stream error",
            })}\n\n`
          );
        } catch {}
        res.end();
      } else {
        res.status(500).json({
          error: "Failed to process chat request",
          message: err?.message || String(err),
        });
      }
    }
  });

  // نعيد HTTP server لتكامل Vite في index.ts
  const httpServer = createServer(app);
  return httpServer;
}
