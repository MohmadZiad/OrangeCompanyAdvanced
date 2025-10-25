// client/src/lib/proRata.ts
// ============================================================================
// Pro-rata billing utilities — UTC-safe, configurable anchorDay, bilingual AR/EN
// Public API kept stable: ymd, computeProrata, buildScript
// Plus helpers: daysBetween, anchorCycle, prorate, etc.
// ============================================================================

/* =========================
 * Types
 * =======================*/
export type Lang = "ar" | "en";
export type ProrationMode = "remaining" | "elapsed";
export type FormatMode = "script" | "totals" | "vat";

export interface Cycle {
  start: Date; // inclusive UTC midnight
  end: Date;   // exclusive UTC midnight
  days: number;
}

export interface ProrationResult extends Cycle {
  usedDays: number;
  ratio: number;
  value: number;
}

/** Backward-compat types used by the existing UI */
export type ProrataInput =
  | {
      mode: "gross";
      activationDate: string | Date;
      fullInvoiceGross: number; // includes VAT
      vatRate?: number; // default 0.16
      anchorDay?: number; // default 15
    }
  | {
      mode: "monthly";
      activationDate: string | Date;
      monthlyNet: number; // before VAT
      vatRate?: number; // default 0.16
      anchorDay?: number; // default 15
    };

export interface ProrataOutput {
  cycleDays: number;
  proDays: number;
  ratio: number; // 0..1
  prorataNet: number; // JD net
  monthlyNet: number; // JD net
  vatRate: number;

  cycleStartUTC: Date;
  cycleEndUTC: Date;    // first anchor after activation
  nextCycleEndUTC: Date;

  pctText: string;         // "46.67%"
  prorataNetText: string;  // "JD 7.000"
  monthlyNetText: string;  // "JD 15.000"
  cycleRangeText: string;  // "2025-09-15 → 2025-10-15"
  proDaysText: string;     // "14 / 30"

  fullInvoiceGross?: number; // echo for mode=gross
}

/* =========================
 * i18n (minimal & extendable)
 * =======================*/
export const STR = {
  en: {
    rangeArrow: "→",
    proratedDays: "Prorated days",
    of: "of",
    proAmount: "Pro-rata amount",
    monthly: "Monthly",
    currency: (n: number) => `JD ${fmt3(n)}`,
    vatHeader: "VAT breakdown (16%)",
    net: "Net",
    vat: "VAT",
    gross: "Gross",
  },
  ar: {
    rangeArrow: "→",
    proratedDays: "أيام البروراتا",
    of: "من",
    proAmount: "قيمة البروراتا",
    monthly: "الاشتراك الشهري",
    currency: (n: number) => `JD ${fmt3(n)}`,
    vatHeader: "تفصيل الضريبة (٪16)",
    net: "الصافي",
    vat: "الضريبة",
    gross: "الإجمالي",
  },
} as const;

/* =========================
 * UTC / Date helpers
 * =======================*/
const DAY_MS = 24 * 60 * 60 * 1000;
const LRM = "\u200E"; // Left-to-Right Mark to stabilise punctuation in RTL around numbers

export function toUtcMidnight(d: Date): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

export function utcDate(y: number, mZeroBased: number, d: number): Date {
  return new Date(Date.UTC(y, mZeroBased, d));
}

export function lastDayOfMonth(y: number, mZeroBased: number): number {
  return new Date(Date.UTC(y, mZeroBased + 1, 0)).getUTCDate();
}

export function clampDay(y: number, mZeroBased: number, day: number): number {
  const last = lastDayOfMonth(y, mZeroBased);
  return Math.max(1, Math.min(day, last));
}

export function addMonthsUTC(base: Date, months: number, keepDay?: number): Date {
  const y = base.getUTCFullYear();
  const m = base.getUTCMonth();
  const d = keepDay ?? base.getUTCDate();
  const targetMonth = m + months;
  const targetYear = y + Math.floor(targetMonth / 12);
  const normalizedMonth = ((targetMonth % 12) + 12) % 12;
  const targetDay = clampDay(targetYear, normalizedMonth, d);
  return utcDate(targetYear, normalizedMonth, targetDay);
}

export function ymd(d: Date): string {
  const y = d.getUTCFullYear();
  const m = `${d.getUTCMonth() + 1}`.padStart(2, "0");
  const day = `${d.getUTCDate()}`.padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function dmy(d: Date): string {
  const y = d.getUTCFullYear();
  const m = `${d.getUTCMonth() + 1}`.padStart(2, "0");
  const day = `${d.getUTCDate()}`.padStart(2, "0");
  return `${day}-${m}-${y}`;
}

/** whole-day diff after normalizing to UTC midnight */
export function daysBetween(a: Date, b: Date): number {
  const A = toUtcMidnight(a).getTime();
  const B = toUtcMidnight(b).getTime();
  return Math.round((B - A) / DAY_MS);
}

/* =========================
 * Anchor helpers & cycles
 * =======================*/
export function monthAnchorUTC(y: number, mZeroBased: number, anchorDay = 15): Date {
  return utcDate(y, mZeroBased, clampDay(y, mZeroBased, anchorDay));
}

/** If pivot < anchor(YYYY-MM-anchorDay) → [prevAnchor,thisAnchor) else [thisAnchor,nextAnchor) */
export function anchorCycle(date: Date, anchorDay = 15): Cycle {
  const pivot = toUtcMidnight(date);
  const y = pivot.getUTCFullYear();
  const m = pivot.getUTCMonth();
  const thisAnchor = monthAnchorUTC(y, m, anchorDay);
  let start: Date, end: Date;
  if (pivot < thisAnchor) {
    start = addMonthsUTC(thisAnchor, -1, anchorDay);
    end = thisAnchor;
  } else {
    start = thisAnchor;
    end = addMonthsUTC(thisAnchor, 1, anchorDay);
  }
  const days = Math.max(0, daysBetween(start, end));
  return { start, end, days };
}

/* =========================
 * Proration core
 * =======================*/
export function fmt3(n: number): string {
  return n.toFixed(3);
}

/** mode === "elapsed" → usedDays = start→pivot | "remaining" → pivot→end */
export function prorate(
  monthly: number,
  pivot: Date,
  anchorDay = 15,
  mode: ProrationMode = "remaining",
): ProrationResult {
  if (!Number.isFinite(monthly) || monthly <= 0) {
    throw new Error("monthly must be a positive number");
  }
  const cyc = anchorCycle(pivot, anchorDay);
  const p = toUtcMidnight(pivot);
  const usedDays =
    mode === "elapsed"
      ? Math.max(0, Math.min(cyc.days, daysBetween(cyc.start, p)))
      : Math.max(0, Math.min(cyc.days, daysBetween(p, cyc.end)));
  const ratio = cyc.days === 0 ? 0 : usedDays / cyc.days;
  const value = monthly * ratio;
  return { ...cyc, usedDays, ratio, value };
}

/* =========================
 * Activation → first anchor (single-invoice)
 * =======================*/
export function firstAnchorAfterActivation(act: Date, anchorDay = 15): Date {
  const A = toUtcMidnight(act);
  const y = A.getUTCFullYear();
  const m = A.getUTCMonth();
  const thisAnchor = monthAnchorUTC(y, m, anchorDay);
  return A.getUTCDate() >= clampDay(y, m, anchorDay)
    ? addMonthsUTC(thisAnchor, 1, anchorDay)
    : thisAnchor;
}

export function cycleFromAnchor(end: Date, anchorDay = 15): Cycle {
  const E = toUtcMidnight(end);
  const prev = addMonthsUTC(E, -1, anchorDay);
  return { start: prev, end: E, days: Math.max(0, daysBetween(prev, E)) };
}

export function computeActivationProrata(monthly: number, activation: Date, anchorDay = 15) {
  if (!Number.isFinite(monthly) || monthly <= 0) {
    throw new Error("monthly must be a positive number");
  }
  const act = toUtcMidnight(activation);
  const fa = firstAnchorAfterActivation(act, anchorDay);
  const cyc = cycleFromAnchor(fa, anchorDay);
  const proDays = Math.max(0, Math.min(cyc.days, daysBetween(act, fa)));
  const ratio = cyc.days === 0 ? 0 : proDays / cyc.days;
  const proAmount = monthly * ratio;
  return {
    period: `${ymd(act)} ${STR.en.rangeArrow} ${ymd(fa)}`,
    proDays,
    days: cyc.days,
    pct: `${(ratio * 100).toFixed(2)}%`,
    proAmount: `JD ${fmt3(proAmount)}`,
    monthly: `JD ${fmt3(monthly)}`,
    anchor: anchorDay,
    activation: ymd(act),
  };
}

/* =========================
 * Localized presentation
 * =======================*/
export function formatProrataOutput(
  lang: Lang,
  mode: FormatMode,
  monthly: number,
  result: { usedDays: number; days: number; ratio: number; value: number; start: Date; end: Date },
): string {
  const L = STR[lang];
  const startText = dmy(result.start);
  const endText = dmy(result.end);
  const pct = (result.ratio * 100).toFixed(2) + "%";
  const monthlyLine = `${L.monthly}: ${L.currency(monthly)}`;
  const proLine = `${L.proAmount}: ${L.currency(result.value)}`;

  if (mode === "script") {
    return [
      `${startText} ${L.rangeArrow} ${endText}`,
      `${L.proratedDays}: ${result.usedDays} ${L.of} ${result.days} (${pct})`,
      `${L.proAmount}: JD ${fmt3(result.value)}`,
      `${L.monthly}: JD ${fmt3(monthly)}`,
    ].join("\n");
  }

  if (mode === "totals") return [monthlyLine, proLine].join("\n");

  // VAT = 16% of (monthly + prorata) net
  const VAT_RATE = 0.16;
  const net = monthly + result.value;
  const vat = net * VAT_RATE;
  const gross = net + vat;
  return [
    `${L.vatHeader}`,
    `${L.net}: ${L.currency(net)}`,
    `${L.vat}: ${L.currency(vat)}`,
    `${L.gross}: ${L.currency(gross)}`,
  ].join("\n");
}

/* =========================
 * Backward-compat computeProrata (kept for existing UI)
 * =======================*/
const jd3 = (n: number) => `JD ${fmt3(n)}`;

function parseUTC(d: string | Date): Date {
  if (d instanceof Date) return toUtcMidnight(d);
  // Accept "YYYY-MM-DD"
  const [y, m, day] = d.split("-").map(Number);
  return utcDate(y, (m || 1) - 1, day || 1);
}

export function computeProrata(input: ProrataInput): ProrataOutput {
  const vatRate = input.vatRate ?? 0.16;
  const anchorDay = input.anchorDay ?? 15;

  const activation = parseUTC(input.activationDate);

  // Monthly net amount (if user provided gross, convert to net)
  const monthlyNet =
    input.mode === "gross" ? input.fullInvoiceGross / (1 + vatRate) : input.monthlyNet;

  // Proper anchor math (not fixed 15 days)
  const cyc = anchorCycle(activation, anchorDay);
  const proDays = Math.max(0, Math.min(cyc.days, daysBetween(activation, cyc.end)));
  const ratio = cyc.days === 0 ? 0 : proDays / cyc.days;
  const prorataNet = monthlyNet * ratio;

  const nextEnd = addMonthsUTC(cyc.end, 1, anchorDay);

  return {
    cycleDays: cyc.days,
    proDays,
    ratio,
    prorataNet,
    monthlyNet,
    vatRate,
    cycleStartUTC: cyc.start,
    cycleEndUTC: cyc.end,
    nextCycleEndUTC: nextEnd,
    pctText: `${(ratio * 100).toFixed(2)}%`,
    prorataNetText: jd3(prorataNet),
    monthlyNetText: jd3(monthlyNet),
    cycleRangeText: `${ymd(cyc.start)} \u2192 ${ymd(cyc.end)}`,
    proDaysText: `${proDays} / ${cyc.days}`,
    ...(input.mode === "gross" ? { fullInvoiceGross: input.fullInvoiceGross } : {}),
  };
}

/* =========================
 * Script builder (single-paragraph client-facing script)
 * =======================*/
export function buildScript(o: ProrataOutput, locale: Lang) {
  // Activation date = end - proDays (UTC-safe)
  const activationUTC = new Date(o.cycleEndUTC.getTime() - o.proDays * DAY_MS);
  const start = dmy(activationUTC);
  const end = dmy(o.cycleEndUTC);
  const next = dmy(o.nextCycleEndUTC);

  // Add LRM after numbers/currency to avoid colon flip in RTL blocks
  const monthly = `JD ${fmt3(o.monthlyNet)}${LRM}`;
  const prorata = `JD ${fmt3(o.prorataNet)}${LRM}`;
  const totalNet = `JD ${fmt3(o.monthlyNet + o.prorataNet)}${LRM}`;

  if (locale === "ar") {
    return `أوضّح لحضرتك أن الفاتورة صدرت بنسبة وتناسب من تاريخ التفعيل ${start} حتى يوم ${end}، وفي نفس الفاتورة تم احتساب قيمة الاشتراك الشهري مقدماً من ${end} حتى ${next}. قيمة الاشتراك الشهري: ${monthly}، وقيمة النسبة والتناسب: ${prorata}، وبالتالي قيمة الفاتورة الكليّة (الصافي قبل الضريبة): ${totalNet}. تاريخ إصدار الفاتورة ${end} وتغطي الخدمة مقدماً حتى ${next}.`;
  }

  return `Just to clarify, the invoice prorates the service from ${start} through ${end}, and on the same invoice bills the monthly subscription in advance from ${end} until ${next}. Monthly subscription: ${monthly}, pro-rata amount: ${prorata}, so the total (net before VAT) is ${totalNet}. The invoice is issued on ${end} and covers the service in advance until ${next}.`;
}

/* =========================
 * Deterministic examples (for tests)
 * =======================*/
export function __exampleA() {
  const activation = utcDate(2025, 9, 14);
  const fa = firstAnchorAfterActivation(activation, 15);
  const cyc = cycleFromAnchor(fa, 15);
  const proDays = daysBetween(activation, fa);
  const ratio = cyc.days ? proDays / cyc.days : 0;
  const monthly = 30;
  const proAmount = monthly * ratio;
  return {
    firstAnchor: ymd(fa),       // "2025-10-15"
    cycleStart: ymd(cyc.start), // "2025-09-15"
    cycleEnd: ymd(cyc.end),     // "2025-10-15"
    days: cyc.days,             // 30
    proDays,                    // 1
    proAmount: fmt3(proAmount), // "1.000"
    totalNoVat: fmt3(monthly + proAmount), // "31.000"
  };
}

export function __exampleB() {
  const pivot = utcDate(2025, 0, 20);
  const resElapsed = prorate(100, pivot, 15, "elapsed");
  const resRemaining = prorate(100, pivot, 15, "remaining");
  return {
    cycle: {
      start: ymd(resElapsed.start),
      end: ymd(resElapsed.end),
      days: resElapsed.days,
    },
    elapsed: {
      usedDays: resElapsed.usedDays,
      ratio: resElapsed.ratio,
      value: Number(fmt3(resElapsed.value)),
    },
    remaining: {
      usedDays: resRemaining.usedDays,
      ratio: resRemaining.ratio,
      value: Number(fmt3(resRemaining.value)),
    },
  };
}

export function __exampleC() {
  const dLeap = utcDate(2024, 1, 10); // Feb 2024 (leap Feb = 29)
  const cycLeap = anchorCycle(dLeap, 31); // clamps to 29
  const dNon = utcDate(2025, 1, 10); // Feb 2025 (28)
  const cycNon = anchorCycle(dNon, 31); // clamps to 28
  return {
    leap: {
      start: ymd(cycLeap.start),
      end: ymd(cycLeap.end),
      days: cycLeap.days,
    },
    nonLeap: {
      start: ymd(cycNon.start),
      end: ymd(cycNon.end),
      days: cycNon.days,
    },
  };
}
