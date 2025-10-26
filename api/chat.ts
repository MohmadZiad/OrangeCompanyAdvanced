// api/chat.ts
import { openai, SYSTEM_PROMPT } from "../server/openai";
import {
  chatRequestSchema,
  type ChatMessage,
  type DocEntry,
} from "../shared/schema";
import { extractAndStoreDocs, readDocs, slugifyTitle } from "../server/docs";
// ملاحظة: يفضّل نقل هذا الملف إلى server/ أو shared/ لاحقًا
import { buildScript, computeProrata, ymd } from "../client/src/lib/proRata";

// --- نفس المتغيرات والدوال المساعدة عندك ---
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();
const RATE_LIMIT_WINDOW = 60_000;
const RATE_LIMIT_MAX_REQUESTS = 10;

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const rec = rateLimitMap.get(ip);
  if (!rec || now > rec.resetTime) {
    rateLimitMap.set(ip, { count: 1, resetTime: now + RATE_LIMIT_WINDOW });
    return true;
  }
  if (rec.count >= RATE_LIMIT_MAX_REQUESTS) return false;
  rec.count += 1;
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

const NAVIGATION_TRIGGERS =
  /\b(افتح|فتح|افتحي|open|show|اذهب|navigate|شغل|عرض|روح)\b/iu;

const bilingual = (locale: "ar" | "en", ar: string, en: string) =>
  locale === "ar" ? `${ar}\n${en}` : `${en}\n${ar}`;

function normalizeDigits(input: string): string {
  return input
    .split("")
    .map((c) => ARABIC_DIGIT_MAP[c] ?? c)
    .join("");
}

function buildDocsUpdateNote(
  update: { added: DocEntry[]; updated: DocEntry[] },
  locale: "ar" | "en"
): string {
  const { added, updated } = update;
  const total = added.length + updated.length;
  if (!total) return "";
  const ar: string[] = [];
  const en: string[] = [];
  if (added.length) {
    ar.push(`إضافة ${added.length} عنصر جديد`);
    en.push(`added ${added.length} new title${added.length > 1 ? "s" : ""}`);
  }
  if (updated.length) {
    ar.push(`تحديث ${updated.length} عنصر`);
    en.push(`updated ${updated.length} title${updated.length > 1 ? "s" : ""}`);
  }
  return bilingual(
    locale,
    `تم تحديث قائمة المستندات (${ar.join(" و ")}).`,
    `Docs list refreshed (${en.join(" & ")}).`
  );
}

function combineText(
  locale: "ar" | "en",
  docNote: string,
  main: { ar: string; en: string }
): string {
  const primary = bilingual(locale, main.ar, main.en);
  return docNote ? `${docNote}\n${primary}` : primary;
}

type ProrataIntent =
  | { mode: "gross"; activationDate: string; fullInvoiceGross: number }
  | { mode: "monthly"; activationDate: string; monthlyNet: number };

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
  const parseAmount = (m: RegExpMatchArray | null) =>
    m ? Number.parseFloat(m[2]) : NaN;
  const grossValue = parseAmount(grossMatch);
  const monthlyValue = parseAmount(monthlyMatch);
  const hasGross = Number.isFinite(grossValue);
  const hasMonthly = Number.isFinite(monthlyValue);
  if (!hasGross && !hasMonthly) return null;
  if (
    hasGross &&
    (!hasMonthly || (grossMatch?.index ?? 0) >= (monthlyMatch?.index ?? 0))
  ) {
    return {
      mode: "gross",
      activationDate,
      fullInvoiceGross: grossValue as number,
    };
  }
  return {
    mode: "monthly",
    activationDate,
    monthlyNet: monthlyValue as number,
  };
}

const VAT_KEYWORDS =
  /(?:ضريبة|شامل|vat|ضريبه|tax|مع الضريبة|includes vat|include vat|with vat)/i;
function parseVatIntent(message: string): VatIntent | null {
  const normalized = normalizeDigits(message);
  if (!VAT_KEYWORDS.test(normalized)) return null;
  const numbers = Array.from(normalized.matchAll(/([0-9]+(?:\.[0-9]+)?)/g));
  if (numbers.length === 0) return null;
  const amount = Number.parseFloat(numbers[0][1]);
  if (!Number.isFinite(amount) || amount <= 0) return null;
  let quantity = 1;
  const m = normalized.match(
    /(?:عدد|qty|quantity|pieces|بطاقات|كروت|شرائح|lines|x|×)\s*([0-9]+(?:\.[0-9]+)?)/i
  );
  if (m) {
    const q = Number.parseFloat(m[1]);
    if (Number.isFinite(q) && q > 0) quantity = q;
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
    const hit = tokens.reduce(
      (acc, t) =>
        acc +
        (docTokens.some((dt) => dt.startsWith(t) || t.startsWith(dt)) ? 1 : 0),
      0
    );
    const score = docTokens.length
      ? hit / Math.max(tokens.length, docTokens.length)
      : 0;
    if (score > 0.45 && (!best || score > best.score)) best = { doc, score };
  }
  return best ? { doc: best.doc } : null;
}

function buildAssistantMessage({
  locale,
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

// بدون @vercel/node
export default async function handler(req: any, res: any) {
  try {
    if (req.method !== "POST") {
      res.statusCode = 405;
      res.setHeader("Content-Type", "application/json");
      return res.end(JSON.stringify({ error: "Method not allowed" }));
    }

    const clientIp =
      (typeof req.headers["x-forwarded-for"] === "string"
        ? req.headers["x-forwarded-for"].split(",")[0]?.trim()
        : Array.isArray(req.headers["x-forwarded-for"])
        ? req.headers["x-forwarded-for"][0]
        : undefined) ||
      req.socket?.remoteAddress ||
      "unknown";

    if (!checkRateLimit(clientIp)) {
      res.statusCode = 429;
      res.setHeader("Content-Type", "application/json");
      return res.end(
        JSON.stringify({ error: "Too many requests. Please try again later." })
      );
    }

    const body = typeof req.body === "string" ? JSON.parse(req.body) : req.body;
    const parsed = chatRequestSchema.safeParse(body);
    if (!parsed.success) {
      res.statusCode = 400;
      res.setHeader("Content-Type", "application/json");
      return res.end(
        JSON.stringify({
          error: "Invalid request format",
          details: parsed.error.errors,
        })
      );
    }

    const { messages, locale: requestedLocale } = parsed.data;

    const latestUserMessage = [...messages]
      .reverse()
      .find((m) => m.role === "user" && m.content.trim());
    const docsBefore = await readDocs();

    const detectedLocale: "ar" | "en" =
      requestedLocale ||
      (latestUserMessage &&
      /[\p{Script=Arabic}]/u.test(latestUserMessage.content)
        ? "ar"
        : "en");

    const docUpdate = latestUserMessage
      ? await extractAndStoreDocs(latestUserMessage.content)
      : { added: [], updated: [] };
    const docs =
      docUpdate.added.length || docUpdate.updated.length
        ? await readDocs()
        : docsBefore;
    const docUpdateNote = buildDocsUpdateNote(docUpdate, detectedLocale);

    if (latestUserMessage) {
      const prorataIntent = parseProrataIntent(latestUserMessage.content);
      if (prorataIntent) {
        const base = {
          activationDate: prorataIntent.activationDate,
          vatRate: 0.16 as const,
          anchorDay: 15 as const,
        };
        const result =
          prorataIntent.mode === "gross"
            ? computeProrata({
                mode: "gross",
                ...base,
                fullInvoiceGross: prorataIntent.fullInvoiceGross,
              })
            : computeProrata({
                mode: "monthly",
                ...base,
                monthlyNet: prorataIntent.monthlyNet,
              });
        const script = buildScript(result, detectedLocale);
        const period = `${ymd(result.cycleStartUTC)} → ${ymd(
          result.cycleEndUTC
        )}`;
        const coverageUntil = ymd(result.nextCycleEndUTC);
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
              proDays: `${result.proDays} / ${result.cycleDays}`,
              percent: result.pctText,
              monthlyNet: result.monthlyNetText,
              prorataNet: result.prorataNetText,
              invoiceDate: ymd(result.cycleEndUTC),
              coverageUntil,
              script,
              fullInvoiceGross: result.fullInvoiceGross,
            },
          },
        });
        res.statusCode = 200;
        res.setHeader("Content-Type", "application/json");
        return res.end(JSON.stringify({ message }));
      }

      const vatIntent = parseVatIntent(latestUserMessage.content);
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
        )} (VAT: JD ${unitVat.toFixed(3)}).\nTotal for ${
          vatIntent.quantity
        }: net JD ${subtotal.toFixed(3)} + VAT JD ${totalVat.toFixed(
          3
        )} = JD ${totalDue.toFixed(3)}.`;
        const message = buildAssistantMessage({
          locale: detectedLocale,
          content: combineText(detectedLocale, docUpdateNote, { ar, en }),
        });
        res.statusCode = 200;
        res.setHeader("Content-Type", "application/json");
        return res.end(JSON.stringify({ message }));
      }

      const docIntent = detectDocNavigation(latestUserMessage.content, docs);
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
        res.statusCode = 200;
        res.setHeader("Content-Type", "application/json");
        return res.end(JSON.stringify({ message }));
      }

      if (docUpdateNote) {
        const lineCount = latestUserMessage.content
          .split(/\n+/)
          .map((l) => l.trim())
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
          res.statusCode = 200;
          res.setHeader("Content-Type", "application/json");
          return res.end(JSON.stringify({ message }));
        }
      }
    }

    // --- SSE streaming ---
    res.statusCode = 200;
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache, no-transform");
    res.setHeader("Connection", "keep-alive");

    const keepAlive = setInterval(() => {
      try {
        res.write(":\n\n");
      } catch {}
    }, 25_000);

    const sanitized: ChatMessage[] = messages.map((m) => ({
      id: m.id,
      role: m.role,
      content: m.content,
      timestamp: m.timestamp,
    }));
    const composed = [
      { role: "system", content: SYSTEM_PROMPT },
      {
        role: "system",
        content: `Docs available: ${(await readDocs())
          .map((d) => `${d.title} (${d.url || "pending"})`)
          .join(" | ")}`,
      },
      ...sanitized.map((m) => ({
        role: m.role as "user" | "assistant",
        content: m.content,
      })),
    ] as { role: "system" | "user" | "assistant"; content: string }[];

    const stream = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: composed,
      max_tokens: 1024,
      stream: true,
    });

    const prelude = docUpdateNote ? `${docUpdateNote}\n` : "";
    if (prelude) res.write(`data: ${JSON.stringify({ content: prelude })}\n\n`);

    for await (const chunk of stream) {
      const content = chunk.choices?.[0]?.delta?.content || "";
      if (content) res.write(`data: ${JSON.stringify({ content })}\n\n`);
    }

    clearInterval(keepAlive);
    res.write("data: [DONE]\n\n");
    res.end();
  } catch (e: any) {
    if (!res.headersSent) {
      res.statusCode = typeof e?.status === "number" ? e.status : 500;
      res.setHeader("Content-Type", "application/json");
      return res.end(JSON.stringify({ error: e?.message || "chat error" }));
    }
    try {
      res.write(
        `data: ${JSON.stringify({ error: e?.message || "chat error" })}\n\n`
      );
    } catch {}
    res.end();
  }
}
