/**
 * Self-contained prorating helpers with bilingual formatting utilities.
 * All dates are handled in UTC to avoid DST inconsistencies.
 */

export type Lang = "ar" | "en";
export type FormatMode = "script" | "totals" | "vat";
export type ProrateMode = "remaining" | "elapsed";

export interface ProrateResult {
  start: Date;
  end: Date;
  days: number;
  usedDays: number;
  ratio: number;
  value: number;
}

export interface ActivationProrataSummary {
  period: string;
  proDays: number;
  days: number;
  pct: string;
  proAmount: string;
  monthly: string;
  anchor: number;
  activation: string;
}

/** Arabic/English dictionary for pure-text rendering. */
export const STR = {
  script: {
    en: {
      period: "Period",
      proratedDays: "Prorated days",
      prorataAmount: "Pro-rata amount",
      monthly: "Monthly",
    },
    ar: {
      period: "الفترة",
      proratedDays: "أيام البروراتا",
      prorataAmount: "قيمة البروراتا",
      monthly: "الاشتراك الشهري",
    },
  },
  totals: {
    en: {
      monthly: "Monthly",
      prorata: "Pro-rata",
    },
    ar: {
      monthly: "شهري",
      prorata: "بروراتا",
    },
  },
  vat: {
    en: {
      net: "Net",
      vat: "VAT (16%)",
      gross: "Gross",
    },
    ar: {
      net: "الصافي",
      vat: "ضريبة 16%",
      gross: "الإجمالي",
    },
  },
  currency: {
    en: "JD",
    ar: "دينار",
  },
} as const satisfies Record<string, Record<Lang, Record<string, string>> | Record<Lang, string>>;

/** Financial display helper. */
export const fmt3 = (n: number): string => n.toFixed(3);

const VAT_RATE = 0.16;

/** Normalize a date to UTC midnight (00:00:00). */
export function toUtcMidnight(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

/** Returns the inclusive day count difference in UTC (whole days). */
export function daysBetween(a: Date, b: Date): number {
  const utcA = toUtcMidnight(a).getTime();
  const utcB = toUtcMidnight(b).getTime();
  const diff = utcB - utcA;
  return Math.round(diff / (24 * 60 * 60 * 1000));
}

function clampAnchorDay(year: number, month: number, anchorDay: number): number {
  const lastDay = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  return Math.max(1, Math.min(anchorDay, lastDay));
}

function anchorDate(base: Date, anchorDay: number): Date {
  const year = base.getUTCFullYear();
  const month = base.getUTCMonth();
  const day = clampAnchorDay(year, month, anchorDay);
  return new Date(Date.UTC(year, month, day));
}

function shiftMonth(date: Date, months: number): Date {
  const year = date.getUTCFullYear();
  const month = date.getUTCMonth();
  const shifted = new Date(Date.UTC(year, month + months, 1));
  return new Date(
    Date.UTC(
      shifted.getUTCFullYear(),
      shifted.getUTCMonth(),
      clampAnchorDay(shifted.getUTCFullYear(), shifted.getUTCMonth(), date.getUTCDate())
    )
  );
}

/** Determine the anchor-based billing cycle surrounding the pivot date. */
export function anchorCycle(
  date: Date,
  anchorDay = 15
): { start: Date; end: Date; days: number } {
  const pivot = toUtcMidnight(date);
  const currentAnchor = anchorDate(pivot, anchorDay);

  const compare = pivot.getTime() - currentAnchor.getTime();
  let start: Date;
  let end: Date;

  if (compare < 0) {
    const prevMonth = shiftMonth(currentAnchor, -1);
    start = anchorDate(prevMonth, anchorDay);
    end = currentAnchor;
  } else {
    start = currentAnchor;
    const nextMonth = shiftMonth(currentAnchor, 1);
    end = anchorDate(nextMonth, anchorDay);
  }

  const days = Math.max(0, daysBetween(start, end));
  return { start, end, days };
}

/**
 * Calculates prorated amount for the given monthly price and pivot date.
 */
export function prorate(
  monthly: number,
  pivot: Date,
  anchorDay = 15,
  mode: ProrateMode = "remaining"
): ProrateResult {
  const cycle = anchorCycle(pivot, anchorDay);
  const start = cycle.start;
  const end = cycle.end;
  const days = cycle.days;

  let usedDays: number;
  if (mode === "elapsed") {
    usedDays = Math.max(0, Math.min(days, daysBetween(start, pivot)));
  } else {
    usedDays = Math.max(0, Math.min(days, daysBetween(pivot, end)));
  }

  const ratio = days === 0 ? 0 : usedDays / days;
  const value = monthly * ratio;
  return { start, end, days, usedDays, ratio, value };
}

/**
 * First billing anchor strictly after or on activation date.
 */
export function firstAnchorAfterActivation(act: Date, anchorDay = 15): Date {
  const activation = toUtcMidnight(act);
  const sameMonthAnchor = anchorDate(activation, anchorDay);
  if (activation.getTime() >= sameMonthAnchor.getTime()) {
    const nextMonth = shiftMonth(sameMonthAnchor, 1);
    return anchorDate(nextMonth, anchorDay);
  }
  return sameMonthAnchor;
}

/**
 * Given an anchor end date, derive the previous anchor and cycle data.
 */
export function cycleFromAnchor(
  end: Date,
  anchorDay = 15
): { start: Date; end: Date; days: number } {
  const normalizedEnd = toUtcMidnight(end);
  const prevAnchor = shiftMonth(normalizedEnd, -1);
  const start = anchorDate(prevAnchor, anchorDay);
  const days = Math.max(0, daysBetween(start, normalizedEnd));
  return { start, end: normalizedEnd, days };
}

/**
 * Computes the activation prorata single-invoice data for first cycle.
 */
export function computeActivationProrata(
  monthly: number,
  activation: Date,
  anchorDay = 15
): ActivationProrataSummary {
  const firstAnchor = firstAnchorAfterActivation(activation, anchorDay);
  const cycle = cycleFromAnchor(firstAnchor, anchorDay);
  const proDays = Math.max(0, daysBetween(activation, firstAnchor));
  const ratio = cycle.days === 0 ? 0 : proDays / cycle.days;
  const proAmountRaw = monthly * ratio;

  return {
    period: `${formatDateIso(activation)} → ${formatDateIso(firstAnchor)}`,
    proDays,
    days: cycle.days,
    pct: `${(ratio * 100).toFixed(2)}%`,
    proAmount: `JD ${fmt3(proAmountRaw)}`,
    monthly: `JD ${fmt3(monthly)}`,
    anchor: anchorDay,
    activation: formatDateIso(activation),
  };
}

function formatDateIso(date: Date): string {
  return toUtcMidnight(date).toISOString().slice(0, 10);
}

function formatCurrency(lang: Lang, value: number): string {
  const currency = STR.currency[lang];
  const amount = fmt3(value);
  return lang === "ar" ? `${currency} ${amount}` : `${currency} ${amount}`;
}

/**
 * Render localized scripts for different presentation needs.
 */
export function formatProrataOutput(
  lang: Lang,
  mode: FormatMode,
  monthly: number,
  result: ProrateResult
): string {
  const start = formatDateIso(result.start);
  const end = formatDateIso(result.end);
  const ratioPct = (result.ratio * 100).toFixed(2);
  const usedDays = result.usedDays;
  const days = result.days;
  const value = result.value;

  switch (mode) {
    case "script":
      return lang === "ar"
        ? `${start} → ${end}\n${STR.script.ar.proratedDays}: ${usedDays} من ${days} (${ratioPct}%)\n${STR.script.ar.prorataAmount}: JD ${fmt3(
            value
          )}\n${STR.script.ar.monthly}: JD ${fmt3(monthly)}`
        : `${start} → ${end}\n${STR.script.en.proratedDays}: ${usedDays} of ${days} (${ratioPct}%)\n${STR.script.en.prorataAmount}: JD ${fmt3(
            value
          )}\n${STR.script.en.monthly}: JD ${fmt3(monthly)}`;
    case "totals":
      return lang === "ar"
        ? `${STR.totals.ar.monthly}: ${formatCurrency(lang, monthly)}\n${STR.totals.ar.prorata}: ${formatCurrency(
            lang,
            value
          )}`
        : `${STR.totals.en.monthly}: ${formatCurrency(lang, monthly)}\n${STR.totals.en.prorata}: ${formatCurrency(
            lang,
            value
          )}`;
    case "vat": {
      const net = monthly + value;
      const vat = net * VAT_RATE;
      const gross = net + vat;
      if (lang === "ar") {
        return `${STR.vat.ar.net}: ${formatCurrency(lang, net)}\n${STR.vat.ar.vat}: ${formatCurrency(
          lang,
          vat
        )}\n${STR.vat.ar.gross}: ${formatCurrency(lang, gross)}`;
      }
      return `${STR.vat.en.net}: ${formatCurrency(lang, net)}\n${STR.vat.en.vat}: ${formatCurrency(
        lang,
        vat
      )}\n${STR.vat.en.gross}: ${formatCurrency(lang, gross)}`;
    }
    default:
      return "";
  }
}

/**
 * Deterministic examples useful for unit tests.
 */
export const EXAMPLES = {
  activationA: (() => {
    const activation = new Date("2025-10-14T00:00:00Z");
    const anchor = firstAnchorAfterActivation(activation, 15);
    const cycle = cycleFromAnchor(anchor, 15);
    const proDays = daysBetween(activation, anchor);
    const ratio = cycle.days === 0 ? 0 : proDays / cycle.days;
    return {
      activation: formatDateIso(activation),
      anchor: formatDateIso(anchor),
      cycleStart: formatDateIso(cycle.start),
      cycleEnd: formatDateIso(cycle.end),
      days: cycle.days,
      proDays,
      ratio,
      monthly30: fmt3(30),
      proratedFor30: fmt3(30 * ratio),
    };
  })(),
  elapsedExample: (() => {
    const pivot = new Date("2024-02-20T00:00:00Z");
    const res = prorate(100, pivot, 10, "elapsed");
    return {
      start: formatDateIso(res.start),
      end: formatDateIso(res.end),
      usedDays: res.usedDays,
      days: res.days,
      value: fmt3(res.value),
    };
  })(),
  leapYearAnchor: (() => {
    const pivot = new Date("2024-02-29T00:00:00Z");
    const cycle = anchorCycle(pivot, 29);
    return {
      start: formatDateIso(cycle.start),
      end: formatDateIso(cycle.end),
      days: cycle.days,
    };
  })(),
};

/**
 * Example request handler snippet (framework-agnostic).
 */
export const exampleHandlerUsage = `async function handleProrataRequest(req, res) {
  const body = await parseJson(req); // { monthly, start, anchorDay, mode, formMode, lang }
  const monthly = Number(body.monthly);
  if (!Number.isFinite(monthly) || monthly <= 0) {
    return res.status(400).json({ error: "monthly must be greater than 0" });
  }
  const anchorDay = Number.isInteger(body.anchorDay) ? body.anchorDay : 15;
  const mode = body.mode === "elapsed" ? "elapsed" : "remaining";
  const lang = body.lang === "en" ? "en" : "ar";
  const pivot = body.start ? new Date(body.start) : new Date();
  const result = prorate(monthly, pivot, anchorDay, mode);
  if (body.formMode) {
    const formatted = formatProrataOutput(lang, body.formMode, monthly, result);
    return res.json({ result, formatted });
  }
  return res.json({ result });
}`;

export default {
  daysBetween,
  anchorCycle,
  prorate,
  toUtcMidnight,
  fmt3,
  firstAnchorAfterActivation,
  cycleFromAnchor,
  computeActivationProrata,
  formatProrataOutput,
  STR,
  EXAMPLES,
  exampleHandlerUsage,
};
