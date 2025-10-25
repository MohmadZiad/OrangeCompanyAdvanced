// server/routes.ts
import type { Express } from "express";
import { createServer, type Server } from "http";
import { openai, SYSTEM_PROMPT } from "./openai";
import {
  chatRequestSchema,
  type ChatMessage,
  type DocEntry,
} from "@shared/schema";
import {
  extractAndStoreDocs,
  readDocs,
  slugifyTitle,
} from "./docs";
import { computeProrata, buildScript } from "../client/src/lib/proRata";

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

const ARABIC_DIGIT_MAP: Record<string, string> = {
  "٠": "0",
  "١": "1",
  "٢": "2",
  "٣": "3",
  "٤": "4",
  "٥": "5",
  "٦": "6",
  "٧": "7",
  "٨": "8",
  "٩": "9",
};

const NAVIGATION_TRIGGERS = /\b(افتح|فتح|افتحي|open|show|اذهب|navigate|شغل|عرض|روح)\b/iu;

const bilingual = (locale: "ar" | "en", ar: string, en: string) =>
  locale === "ar" ? `${ar}\n${en}` : `${en}\n${ar}`;

const DAY_MS = 24 * 60 * 60 * 1000;

const formatDMY = (date: Date) =>
  `${String(date.getUTCDate()).padStart(2, "0")}-${String(
    date.getUTCMonth() + 1
  ).padStart(2, "0")}-${date.getUTCFullYear()}`;

function normalizeDigits(input: string): string {
  return input
    .split("")
    .map((char) => ARABIC_DIGIT_MAP[char] ?? char)
    .join("");
}

function buildDocsUpdateNote(
  update: { added: DocEntry[]; updated: DocEntry[] },
  locale: "ar" | "en"
): string {
  const { added, updated } = update;
  const total = added.length + updated.length;
  if (!total) return "";

  const arSegments: string[] = [];
  const enSegments: string[] = [];

  if (added.length) {
    arSegments.push(`إضافة ${added.length} عنصر جديد`);
    enSegments.push(`added ${added.length} new title${added.length > 1 ? "s" : ""}`);
  }
  if (updated.length) {
    arSegments.push(`تحديث ${updated.length} عنصر`);
    enSegments.push(`updated ${updated.length} title${updated.length > 1 ? "s" : ""}`);
  }

  const ar = `تم تحديث قائمة المستندات (${arSegments.join(" و ")}).`;
  const en = `Docs list refreshed (${enSegments.join(" & ")}).`;
  return bilingual(locale, ar, en);
}

function combineText(
  locale: "ar" | "en",
  docNote: string,
  main: { ar: string; en: string }
): string {
  const primary = bilingual(locale, main.ar, main.en);
  return docNote ? `${docNote}\n${primary}` : primary;
}

interface ProrataIntent {
  mode: "gross" | "monthly";
  activationDate: string;
  fullInvoiceGross?: number;
  monthlyNet?: number;
}

interface VatIntent {
  amount: number;
  quantity: number;
}

function parseProrataIntent(message: string): ProrataIntent | null {
  const normalized = normalizeDigits(message).replace(/[،,]/g, " ");
  const dateMatch = normalized.match(/(20\d{2}-\d{2}-\d{2})/);
  if (!dateMatch) return null;

  const activationDate = dateMatch[1];

  const grossMatch = normalized.match(
    /(gross|فاتورة|invoice|كاملة|اجمالي|إجمالي)[^0-9]*([0-9]+(?:\.[0-9]+)?)/i
  );
  const monthlyMatch = normalized.match(
    /(monthly|شهري|اشتراك|net|صافي|شهرية)[^0-9]*([0-9]+(?:\.[0-9]+)?)/i
  );

  const parseAmount = (match: RegExpMatchArray | null) => {
    if (!match) return undefined;
    const value = Number.parseFloat(match[2]);
    return Number.isFinite(value) ? value : undefined;
  };

  const grossValue = parseAmount(grossMatch);
  const monthlyValue = parseAmount(monthlyMatch);

  if (grossValue == null && monthlyValue == null) {
    return null;
  }

  if (grossValue != null && (monthlyValue == null || (grossMatch?.index ?? 0) >= (monthlyMatch?.index ?? 0))) {
    return { mode: "gross", activationDate, fullInvoiceGross: grossValue };
  }

  if (monthlyValue != null) {
    return { mode: "monthly", activationDate, monthlyNet: monthlyValue };
  }

  return null;
}

const VAT_KEYWORDS = /(?:ضريبة|شامل|vat|ضريبه|tax|مع الضريبة|includes vat|include vat|with vat)/i;

function parseVatIntent(message: string): VatIntent | null {
  const normalized = normalizeDigits(message);
  if (!VAT_KEYWORDS.test(normalized)) return null;

  const numberMatches = Array.from(
    normalized.matchAll(/([0-9]+(?:\.[0-9]+)?)/g)
  );
  if (numberMatches.length === 0) return null;

  const amount = Number.parseFloat(numberMatches[0][1]);
  if (!Number.isFinite(amount) || amount <= 0) return null;

  let quantity = 1;
  const quantityPattern = normalized.match(
    /(?:عدد|qty|quantity|pieces|بطاقات|كروت|شرائح|lines|x|×)\s*([0-9]+(?:\.[0-9]+)?)/i
  );
  if (quantityPattern) {
    const parsedQty = Number.parseFloat(quantityPattern[1]);
    if (Number.isFinite(parsedQty) && parsedQty > 0) {
      quantity = parsedQty;
    }
  }

  return { amount, quantity };
}

function detectDocNavigation(
  message: string,
  docs: DocEntry[]
): { doc: DocEntry } | null {
  if (!NAVIGATION_TRIGGERS.test(message)) return null;

  const cleaned = normalizeDigits(message)
    .replace(NAVIGATION_TRIGGERS, " ")
    .replace(/["'،,؛:!?]/g, " ")
    .trim();

  const slug = slugifyTitle(cleaned || message);
  const tokens = slug.split(/-+/).filter(Boolean);

  let best: { doc: DocEntry; score: number } | null = null;

  for (const doc of docs) {
    const docSlug = doc.id || slugifyTitle(doc.title);
    const docTokens = docSlug.split(/-+/).filter(Boolean);

    const hitCount = tokens.reduce((acc, token) => {
      if (!token) return acc;
      const match = docTokens.some(
        (dt) => dt.startsWith(token) || token.startsWith(dt)
      );
      return match ? acc + 1 : acc;
    }, 0);

    const score = docTokens.length
      ? hitCount / Math.max(tokens.length, docTokens.length)
      : 0;

    if (score > 0.45 && (!best || score > best.score)) {
      best = { doc, score };
    }
  }

  return best ? { doc: best.doc } : null;
}

function buildAssistantMessage({
  locale: _locale,
  content,
  payload,
}: {
  locale: "ar" | "en";
  content: string;
  payload?: ChatMessage["payload"];
}): ChatMessage {
  return {
    id: Date.now().toString(),
    role: "assistant",
    content,
    timestamp: Date.now(),
    payload,
  };
}

export async function registerRoutes(app: Express): Promise<Server> {
  // صحة
  app.get("/health", (_req, res) => res.json({ ok: true }));

  app.get("/api/docs", async (_req, res) => {
    try {
      const docs = await readDocs();
      res.json({ docs });
    } catch (err: any) {
      res.status(500).json({
        error: "Failed to load docs",
        message: err?.message ?? "Unknown error",
      });
    }
  });

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

      const { messages, locale: requestedLocale } = parsed.data;

      const latestUserMessage = [...messages]
        .reverse()
        .find((msg) => msg.role === "user" && msg.content.trim());

      const docsBefore = await readDocs();

      const detectedLocale =
        requestedLocale ??
        (latestUserMessage && /[\p{Script=Arabic}]/u.test(latestUserMessage.content)
          ? "ar"
          : "en");

      const docUpdate = latestUserMessage
        ? await extractAndStoreDocs(latestUserMessage.content)
        : { added: [], updated: [] };

      const docs = docUpdate.added.length || docUpdate.updated.length
        ? await readDocs()
        : docsBefore;

      const docUpdateNote = buildDocsUpdateNote(docUpdate, detectedLocale);

      const prorataIntent = latestUserMessage
        ? parseProrataIntent(latestUserMessage.content)
        : null;

      if (prorataIntent) {
        const result = computeProrata({
          mode: prorataIntent.mode,
          activationDate: prorataIntent.activationDate,
          fullInvoiceGross: prorataIntent.fullInvoiceGross,
          monthlyNet: prorataIntent.monthlyNet,
          vatRate: 0.16,
          anchorDay: 15,
        });

        const script = buildScript(result, detectedLocale);

        const activationUTC = new Date(
          result.cycleEndUTC.getTime() - result.proDays * DAY_MS
        );
        const period = `${formatDMY(activationUTC)} → ${formatDMY(
          result.cycleEndUTC
        )}`;
        const coverageUntil = formatDMY(result.nextCycleEndUTC);
        const invoiceDate = formatDMY(result.cycleEndUTC);
        const message = buildAssistantMessage({
          locale: detectedLocale,
          content: combineText(detectedLocale, docUpdateNote, {
            ar: "تم حساب البروراتا.",
            en: "Pro-rata calculation ready.",
          }),
            payload: {
              kind: "prorata",
              locale: detectedLocale,
              data: {
                period,
                proDays: result.proDaysText,
                percent: result.pctText,
                monthlyNet: result.monthlyNetText,
                prorataNet: result.prorataNetText,
                invoiceDate,
                coverageUntil,
                script,
                fullInvoiceGross: result.fullInvoiceGross,
              },
            },
        });

        return res.json({ message });
      }

      const vatIntent = latestUserMessage
        ? parseVatIntent(latestUserMessage.content)
        : null;

      if (vatIntent) {
        const unitVat = vatIntent.amount * 0.16;
        const unitTotal = vatIntent.amount + unitVat;
        const subtotal = vatIntent.amount * vatIntent.quantity;
        const totalVat = unitVat * vatIntent.quantity;
        const totalDue = unitTotal * vatIntent.quantity;

        const ar = `القيمة مع ضريبة %16 هي JD ${unitTotal.toFixed(
          3
        )} لكل وحدة (الضريبة: JD ${unitVat.toFixed(3)}).\nالإجمالي لعدد ${
          vatIntent.quantity
        }: صافي JD ${subtotal.toFixed(3)} + ضريبة JD ${totalVat.toFixed(
          3
        )} = JD ${totalDue.toFixed(3)}.`;
        const en = `With 16% VAT, each unit is JD ${unitTotal.toFixed(
          3
        )} (VAT: JD ${unitVat.toFixed(3)}).\nTotal for ${vatIntent.quantity}: net JD ${subtotal.toFixed(
          3
        )} + VAT JD ${totalVat.toFixed(3)} = JD ${totalDue.toFixed(3)}.`;

        const message = buildAssistantMessage({
          locale: detectedLocale,
          content: combineText(detectedLocale, docUpdateNote, {
            ar,
            en,
          }),
        });

        return res.json({ message });
      }

      const docIntent = latestUserMessage
        ? detectDocNavigation(latestUserMessage.content, docs)
        : null;

      if (docIntent) {
        const message = buildAssistantMessage({
          locale: detectedLocale,
          content: combineText(detectedLocale, docUpdateNote, {
            ar: docIntent.doc.url
              ? `تم فتح "${docIntent.doc.title}".`
              : `أضف رابطًا لـ "${docIntent.doc.title}" ثم أعد المحاولة.`,
            en: docIntent.doc.url
              ? `Opening "${docIntent.doc.title}".`
              : `Add a link for "${docIntent.doc.title}" and try again.`,
          }),
          payload: {
            kind: "navigate-doc",
            locale: detectedLocale,
            doc: docIntent.doc,
            note: docUpdateNote || undefined,
          },
        });

        return res.json({ message });
      }

      if (
        docUpdateNote &&
        latestUserMessage &&
        !prorataIntent &&
        !docIntent
      ) {
        const lineCount = latestUserMessage.content
          .split(/\n+/)
          .map((line) => line.trim())
          .filter(Boolean).length;
        if (lineCount >= 3 && !/[?؟]/.test(latestUserMessage.content)) {
          const message = buildAssistantMessage({
            locale: detectedLocale,
            content: docUpdateNote,
            payload: {
              kind: "docs-update",
              locale: detectedLocale,
              added: docUpdate.added,
              updated: docUpdate.updated,
            },
          });
          return res.json({ message });
        }
      }

      // SSE headers
      res.setHeader("Content-Type", "text/event-stream");
      res.setHeader("Cache-Control", "no-cache");
      res.setHeader("Connection", "keep-alive");

      const keepAlive = setInterval(() => {
        try {
          res.write(`:\n\n`);
        } catch {}
      }, 25_000);

      const sanitizedMessages: ChatMessage[] = messages.map((m) => ({
        id: m.id,
        role: m.role,
        content: m.content,
        timestamp: m.timestamp,
      }));

      const composedMessages: { role: "system" | "user" | "assistant"; content: string }[] = [
        { role: "system", content: SYSTEM_PROMPT },
        {
          role: "system",
          content: `Docs available: ${docs
            .map((doc) => `${doc.title} (${doc.url || "pending"})`)
            .join(" | ")}`,
        },
        ...sanitizedMessages.map((m) => ({
          role: m.role as "user" | "assistant",
          content: m.content,
        })),
      ];

      const stream = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: composedMessages,
        max_completion_tokens: 1024,
        stream: true,
      });

      if (docUpdateNote) {
        res.write(`data: ${JSON.stringify({ content: `${docUpdateNote}\n` })}\n\n`);
      }

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
