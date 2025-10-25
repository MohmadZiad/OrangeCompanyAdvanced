// server/docs.ts
// -----------------------------------------------------------------------------
// Helper utilities to manage the shared docs.json file. The file is kept under
// the repository's ./shared/ directory so both the server and client can rely on
// the same source of truth.
// -----------------------------------------------------------------------------

import { promises as fs } from "fs";
import path from "path";
import { fileURLToPath } from "url";

import { docEntrySchema, type DocEntry } from "@shared/schema";

// Arabic to ASCII transliteration map. This keeps slug generation stable even
// if titles are updated frequently.
const ARABIC_TO_ASCII: Record<string, string> = {
  "أ": "a",
  "إ": "i",
  "آ": "a",
  "ا": "a",
  "ب": "b",
  "ت": "t",
  "ث": "th",
  "ج": "j",
  "ح": "h",
  "خ": "kh",
  "د": "d",
  "ذ": "dh",
  "ر": "r",
  "ز": "z",
  "س": "s",
  "ش": "sh",
  "ص": "s",
  "ض": "d",
  "ط": "t",
  "ظ": "z",
  "ع": "a",
  "غ": "gh",
  "ف": "f",
  "ق": "q",
  "ك": "k",
  "ل": "l",
  "م": "m",
  "ن": "n",
  "ه": "h",
  "و": "w",
  "ي": "y",
  "ء": "a",
  "ئ": "y",
  "ؤ": "w",
  "ة": "h",
  "ى": "a",
  "لا": "la",
  "ﻻ": "la",
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

const DOCS_FILE = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../shared/docs.json"
);

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

  if (!title) {
    return slugFallback(rawTitle);
  }

  const parts: string[] = [];
  for (let i = 0; i < title.length; i += 1) {
    const char = title[i];
    const nextPair = title.slice(i, i + 2);
    if (ARABIC_TO_ASCII[nextPair]) {
      parts.push(ARABIC_TO_ASCII[nextPair]);
      i += 1;
      continue;
    }
    if (ARABIC_TO_ASCII[char]) {
      parts.push(ARABIC_TO_ASCII[char]);
      continue;
    }
    if (/^[a-z0-9]$/i.test(char)) {
      parts.push(char.toLowerCase());
      continue;
    }
    if (/\s/.test(char)) {
      parts.push("-");
    }
  }

  const joined = parts.join("").replace(/-+/g, "-").replace(/^-|-$/g, "");
  return joined || slugFallback(rawTitle);
}

async function ensureDocsFile(): Promise<void> {
  try {
    await fs.access(DOCS_FILE);
  } catch {
    const seed = DOCS_SEED_TITLES.map((title) => ({
      id: slugifyTitle(title),
      title: normalizeWhitespace(title),
      url: "",
      tags: [/^[\p{Script=Arabic}]+/u.test(title) ? "ar" : "en"],
    }));
    await fs.mkdir(path.dirname(DOCS_FILE), { recursive: true });
    await fs.writeFile(DOCS_FILE, JSON.stringify(seed, null, 2), "utf-8");
  }
}

export async function readDocs(): Promise<DocEntry[]> {
  await ensureDocsFile();
  const raw = await fs.readFile(DOCS_FILE, "utf-8");
  const parsed = JSON.parse(raw);
  const docs = docEntrySchema.array().parse(parsed);
  return docs;
}

async function writeDocs(entries: DocEntry[]): Promise<void> {
  const sorted = [...entries].sort((a, b) => a.title.localeCompare(b.title, "ar"));
  await fs.writeFile(DOCS_FILE, JSON.stringify(sorted, null, 2), "utf-8");
}

function mergeDocs(existing: DocEntry[], incoming: DocEntry[]) {
  const map = new Map(existing.map((doc) => [doc.id, doc] as const));
  const added: DocEntry[] = [];
  const updated: DocEntry[] = [];

  for (const doc of incoming) {
    const prev = map.get(doc.id);
    if (!prev) {
      map.set(doc.id, doc);
      added.push(doc);
      continue;
    }

    const hasDiff =
      prev.title !== doc.title ||
      prev.url !== doc.url ||
      JSON.stringify(prev.tags ?? []) !== JSON.stringify(doc.tags ?? []);

    if (hasDiff) {
      const merged: DocEntry = {
        ...prev,
        ...doc,
        tags: doc.tags?.length ? doc.tags : prev.tags,
      };
      map.set(doc.id, merged);
      updated.push(merged);
    }
  }

  return {
    list: Array.from(map.values()),
    added,
    updated,
  };
}

function extractLineCandidates(message: string): string[] {
  const normalized = normalizeWhitespace(message);
  if (!normalized) return [];
  const candidates = normalized
    .split(/\n+|•+/)
    .map((line) => normalizeWhitespace(line))
    .filter((line) => line.length >= 2 && /[\p{L}0-9]/u.test(line));
  return candidates;
}

export async function upsertDocsFromTitles(
  titles: string[]
): Promise<{ added: DocEntry[]; updated: DocEntry[] }> {
  if (!titles.length) {
    return { added: [], updated: [] };
  }

  const docs = await readDocs();
  const incoming = titles.map((title) => {
    const slug = slugifyTitle(title);
    return {
      id: slug,
      title: normalizeWhitespace(title),
      url: docs.find((doc) => doc.id === slug)?.url ?? "",
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
  const candidates = extractLineCandidates(message);
  if (candidates.length < 3) {
    return { added: [], updated: [] };
  }
  return upsertDocsFromTitles(candidates);
}

export async function getDocsFilePath() {
  await ensureDocsFile();
  return DOCS_FILE;
}
