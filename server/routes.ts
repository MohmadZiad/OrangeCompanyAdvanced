import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { openai, SYSTEM_PROMPT } from "./openai";
import { chatRequestSchema } from "@shared/schema";

// Rate limiting map (simple in-memory)
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();
const RATE_LIMIT_WINDOW = 60000; // 1 minute
const RATE_LIMIT_MAX_REQUESTS = 10;

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const record = rateLimitMap.get(ip);

  if (!record || now > record.resetTime) {
    rateLimitMap.set(ip, { count: 1, resetTime: now + RATE_LIMIT_WINDOW });
    return true;
  }

  if (record.count >= RATE_LIMIT_MAX_REQUESTS) {
    return false;
  }

  record.count++;
  return true;
}

export async function registerRoutes(app: Express): Promise<Server> {
  // OpenAI Chat endpoint with streaming support
  app.post("/api/chat", async (req, res) => {
    try {
      // Rate limiting
      const clientIp = req.ip || "unknown";
      if (!checkRateLimit(clientIp)) {
        return res.status(429).json({ 
          error: "Too many requests. Please try again later." 
        });
      }

      // Validate request
      const validation = chatRequestSchema.safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({ 
          error: "Invalid request format",
          details: validation.error.errors 
        });
      }

      const { messages } = validation.data;

      // Set headers for Server-Sent Events streaming
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');

      // Call OpenAI with streaming enabled
      // the newest OpenAI model is "gpt-5" which was released August 7, 2025. do not change this unless explicitly requested by the user
      const stream = await openai.chat.completions.create({
        model: "gpt-5",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          ...messages.map(m => ({
            role: m.role as "user" | "assistant",
            content: m.content,
          })),
        ],
        max_completion_tokens: 2048,
        stream: true,
      });

      // Stream the response
      for await (const chunk of stream) {
        const content = chunk.choices[0]?.delta?.content || '';
        if (content) {
          res.write(`data: ${JSON.stringify({ content })}\n\n`);
        }
      }

      // Send the done signal
      res.write(`data: [DONE]\n\n`);
      res.end();
    } catch (error: any) {
      console.error("Chat API error:", error);
      // For streaming, we need to send error in SSE format if headers already sent
      if (res.headersSent) {
        res.write(`data: ${JSON.stringify({ error: error.message })}\n\n`);
        res.end();
      } else {
        res.status(500).json({ 
          error: "Failed to process chat request",
          message: error.message 
        });
      }
    }
  });

  const httpServer = createServer(app);

  return httpServer;
}
