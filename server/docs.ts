// server/docs.ts
// -----------------------------------------------------------------------------
// Robust docs loader: Read-only on Vercel (production), FS + seeding in dev.
// -----------------------------------------------------------------------------

import fs from "fs";
import { promises as fsp } from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { docEntrySchema, type DocEntry } from "@shared/schema";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const isProd =
  process.env.VERCEL === "1" || process.env.NODE_ENV === "production";

// -----------------------------------------------------------------------------
// Slug helpers (كما هي)
// -----------------------------------------------------------------------------
const ARABIC_TO_ASCII: Record<string, string> = {
  أ: "a",
  إ: "i",
  آ: "a",
  ا: "a",
  ب: "b",
  ت: "t",
  ث: "th",
  ج: "j",
  ح: "h",
  خ: "kh",
  د: "d",
  ذ: "dh",
  ر: "r",
  ز: "z",
  س: "s",
  ش: "sh",
  ص: "s",
  ض: "d",
  ط: "t",
  ظ: "z",
  ع: "a",
  غ: "gh",
  ف: "f",
  ق: "q",
  ك: "k",
  ل: "l",
  م: "m",
  ن: "n",
  ه: "h",
  و: "w",
  ي: "y",
  ء: "a",
  ئ: "y",
  ؤ: "w",
  ة: "h",
  ى: "a",
  لا: "la",
  ﻻ: "la",
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

const slugFallback = (title: string) =>
  `doc-${Buffer.from(title).toString("base64url").slice(0, 8)}`;

const normalizeWhitespace = (input: string) =>
  input
    .replace(/[\u064B-\u065F]/g, "")
    .replace(/[\s\u200f\u200e]+/g, " ")
    .trim();

export function slugifyTitle(rawTitle: string): string {
  const title = normalizeWhitespace(rawTitle)
    .replace(/[_~`^،؟!?,.;:\-]+/g, " ")
    .toLowerCase();

  if (!title) return slugFallback(rawTitle);

  const parts: string[] = [];
  for (let i = 0; i < title.length; i += 1) {
    const ch = title[i];
    const pair = title.slice(i, i + 2);
    if (ARABIC_TO_ASCII[pair]) {
      parts.push(ARABIC_TO_ASCII[pair]);
      i += 1;
      continue;
    }
    if (ARABIC_TO_ASCII[ch]) {
      parts.push(ARABIC_TO_ASCII[ch]);
      continue;
    }
    if (/^[a-z0-9]$/i.test(ch)) {
      parts.push(ch.toLowerCase());
      continue;
    }
    if (/\s/.test(ch)) parts.push("-");
  }
  const joined = parts.join("").replace(/-+/g, "-").replace(/^-|-$/g, "");
  return joined || slugFallback(rawTitle);
}

// -----------------------------------------------------------------------------
// مسارات محتملة للقراءة من FS (dev)
// -----------------------------------------------------------------------------
const DOCS_FILE_CANDIDATES = [
  path.join(process.cwd(), "shared", "docs.json"),
  path.join(process.cwd(), "dist", "shared", "docs.json"),
  path.join(__dirname, "..", "shared", "docs.json"),
  path.join(__dirname, "..", "..", "shared", "docs.json"),
  path.resolve("shared/docs.json"),
];

// seeding titles (dev only)
const DOCS_SEED_TITLES: string[] = [
  "عروض حماية الوطن",
  "نت وين مكان عروض 4",
  "Max It",
  "خطوط انترنت",
  "حماة الوطن مدفوع ماكس",
  "خطوط الزوار",
  "الانترنت الامن",
  "تواصل",
  "عروض معاك",
  "امل اورنج",
  "طرق الشحن !",
  "رموز اورنج",
  "E-shop",
  "tod + OSN",
  "تقسيط",
  "اكاديمية اورنج + وظيفه",
  "zte 6600",
  "KARTI",
];

// ابحث عن أول ملف docs.json موجود (dev)
function findExistingDocsFile(): string | null {
  for (const p of DOCS_FILE_CANDIDATES) {
    if (fs.existsSync(p)) return p;
  }
  return null;
}

async function ensureDocsFileDev(): Promise<string> {
  let file = findExistingDocsFile();
  if (file) return file;

  // أنشئ shared/docs.json في المشروع المحلي
  const target = path.join(process.cwd(), "shared", "docs.json");
  await fsp.mkdir(path.dirname(target), { recursive: true });

  const seed: DocEntry[] = DOCS_SEED_TITLES.map((title) => ({
    id: slugifyTitle(title),
    title: normalizeWhitespace(title),
    url: "",
    tags: [/^[\p{Script=Arabic}]+/u.test(title) ? "ar" : "en"],
  }));

  await fsp.writeFile(target, JSON.stringify(seed, null, 2), "utf-8");
  return target;
}

// -----------------------------------------------------------------------------
// القراءة
// -----------------------------------------------------------------------------
export async function readDocs(): Promise<DocEntry[]> {
  if (isProd) {
    // قراءة read-only بالـ import (الأكثر أمانًا على Vercel)
    try {
      // محاولة import مع/بدون assertion (لتوافق الباندلر)
      const mod: any =
        (await import("../shared/docs.json", {
          assert: { type: "json" },
        } as any)) || (await import("../shared/docs.json"));

      const data = mod?.default ?? mod;
      const docs = docEntrySchema.array().parse(data);
      return docs;
    } catch {
      // لو فشل الـ import لأي سبب، جرّب FS fallback (قراءة فقط)
      for (const p of DOCS_FILE_CANDIDATES) {
        try {
          const raw = await fsp.readFile(p, "utf-8");
          const docs = docEntrySchema.array().parse(JSON.parse(raw));
          return docs;
        } catch {}
      }
      return []; // آخر علاج: رجّع فاضي بدل ما تكسر /api/docs
    }
  }

  // dev: read + seed + writable
  const file = await ensureDocsFileDev();
  const raw = await fsp.readFile(file, "utf-8");
  const docs = docEntrySchema.array().parse(JSON.parse(raw));
  return docs;
}

// -----------------------------------------------------------------------------
// الكتابة (dev فقط). على Vercel (prod) نرجّع no-op.
// -----------------------------------------------------------------------------
async function writeDocs(entries: DocEntry[]): Promise<void> {
  if (isProd) return; // read-only in production
  const file = await ensureDocsFileDev();
  const sorted = [...entries].sort((a, b) =>
    a.title.localeCompare(b.title, "ar")
  );
  await fsp.writeFile(file, JSON.stringify(sorted, null, 2), "utf-8");
}

function mergeDocs(existing: DocEntry[], incoming: DocEntry[]) {
  const map = new Map(existing.map((d) => [d.id, d] as const));
  const added: DocEntry[] = [];
  const updated: DocEntry[] = [];

  for (const doc of incoming) {
    const prev = map.get(doc.id);
    if (!prev) {
      map.set(doc.id, doc);
      added.push(doc);
      continue;
    }
    const changed =
      prev.title !== doc.title ||
      prev.url !== doc.url ||
      JSON.stringify(prev.tags ?? []) !== JSON.stringify(doc.tags ?? []);
    if (changed) {
      const merged: DocEntry = {
        ...prev,
        ...doc,
        tags: doc.tags?.length ? doc.tags : prev.tags,
      };
      map.set(doc.id, merged);
      updated.push(merged);
    }
  }

  return { list: Array.from(map.values()), added, updated };
}

function extractLineCandidates(message: string): string[] {
  const normalized = normalizeWhitespace(message);
  if (!normalized) return [];
  return normalized
    .split(/\n+|•+/)
    .map((l) => normalizeWhitespace(l))
    .filter((l) => l.length >= 2 && /[\p{L}0-9]/u.test(l));
}

export async function upsertDocsFromTitles(
  titles: string[]
): Promise<{ added: DocEntry[]; updated: DocEntry[] }> {
  if (isProd) return { added: [], updated: [] }; // no-op في الإنتاج
  if (!titles.length) return { added: [], updated: [] };

  const docs = await readDocs();
  const incoming = titles.map((title) => {
    const id = slugifyTitle(title);
    return {
      id,
      title: normalizeWhitespace(title),
      url: docs.find((d) => d.id === id)?.url ?? "",
      tags: [/^[\p{Script=Arabic}]+/u.test(title) ? "ar" : "en"],
    } satisfies DocEntry;
  });

  const merged = mergeDocs(docs, incoming);
  await writeDocs(merged.list);
  return { added: merged.added, updated: merged.updated };
}

export async function extractAndStoreDocs(
  message: string
): Promise<{ added: DocEntry[]; updated: DocEntry[] }> {
  if (isProd) return { added: [], updated: [] }; // no-op في الإنتاج
  const candidates = extractLineCandidates(message);
  if (candidates.length < 3) return { added: [], updated: [] };
  return upsertDocsFromTitles(candidates);
}

export async function getDocsFilePath(): Promise<string | null> {
  if (isProd) return null;
  return ensureDocsFileDev();
}
