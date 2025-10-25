// client/src/lib/proRata.ts
// ---------------------------------------------------------------------------
// Pro-rata math helpers (fixed 15th anchor).
// Inputs:
//   A) mode: "gross"  -> activationDate + fullInvoiceGross (incl. VAT)
//   B) mode: "monthly"-> activationDate + monthlyNet (before VAT)
// VAT defaults to 16%.
// All dates are computed in UTC to avoid TZ issues.
// ---------------------------------------------------------------------------

export type ProrataInput =
  | {
      mode: "gross";
      activationDate: string | Date; // YYYY-MM-DD or Date
      fullInvoiceGross: number; // with VAT included
      vatRate?: number; // default 0.16
      anchorDay?: number; // default 15
    }
  | {
      mode: "monthly";
      activationDate: string | Date; // YYYY-MM-DD or Date
      monthlyNet: number; // before VAT
      vatRate?: number; // default 0.16
      anchorDay?: number; // default 15
    };

export interface ProrataOutput {
  // core numbers
  cycleDays: number;
  proDays: number;
  ratio: number; // 0..1
  prorataNet: number; // JD net
  monthlyNet: number; // JD net
  vatRate: number; // e.g. 0.16

  // dates
  cycleStartUTC: Date;
  cycleEndUTC: Date; // first 15 after activation
  nextCycleEndUTC: Date; // the 15 after invoice issue date (coverage end)

  // formatted convenience
  pctText: string; // "46.67%"
  prorataNetText: string; // "JD 7.000"
  monthlyNetText: string; // "JD 15.000"
  cycleRangeText: string; // "2025-09-15 → 2025-10-15"
  proDaysText: string; // "14 / 15"

  // optional echo (if user gave gross)
  fullInvoiceGross?: number;
}

const DAY = 24 * 60 * 60 * 1000;

const toUTC = (d: string | Date) =>
  typeof d === "string" ? new Date(d + "T00:00:00.000Z") : d;

export const ymd = (d: Date) =>
  `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(
    2,
    "0"
  )}-${String(d.getUTCDate()).padStart(2, "0")}`;

function firstAnchorAfter(dUTC: Date, anchorDay = 15) {
  const same = new Date(
    Date.UTC(dUTC.getUTCFullYear(), dUTC.getUTCMonth(), anchorDay)
  );
  return dUTC.getTime() >= same.getTime()
    ? new Date(
        Date.UTC(dUTC.getUTCFullYear(), dUTC.getUTCMonth() + 1, anchorDay)
      )
    : same;
}

function cycleFromAnchor(endUTC: Date, anchorDay = 15) {
  const startUTC = new Date(
    Date.UTC(endUTC.getUTCFullYear(), endUTC.getUTCMonth() - 1, anchorDay)
  );
  const cycleDays = Math.max(
    1,
    Math.round((endUTC.getTime() - startUTC.getTime()) / DAY)
  );
  return { startUTC, endUTC, cycleDays };
}

const jd3 = (n: number) => `JD ${Number(n).toFixed(3)}`;

export function computeProrata(input: ProrataInput): ProrataOutput {
  const vatRate = input.vatRate ?? 0.16;
  const anchorDay = input.anchorDay ?? 15;

  const act = toUTC(input.activationDate);
  const end = firstAnchorAfter(act, anchorDay);

  const cycleDays = 15;
  const startUTC = new Date(end.getTime() - cycleDays * DAY);

  const used = Math.max(0, Math.round((end.getTime() - act.getTime()) / DAY));
  const proDays = Math.min(used, cycleDays);
  const ratio = cycleDays ? proDays / cycleDays : 0;

  const monthlyNet =
    input.mode === "gross"
      ? input.fullInvoiceGross / (1 + vatRate)
      : input.monthlyNet;

  const prorataNet = monthlyNet * ratio;

  const nextEnd = new Date(end.getTime() + cycleDays * DAY);

  return {
    cycleDays,
    proDays,
    ratio,
    prorataNet,
    monthlyNet,
    vatRate,
    cycleStartUTC: startUTC,
    cycleEndUTC: end,
    nextCycleEndUTC: nextEnd,
    pctText: `${(ratio * 100).toFixed(2)}%`,
    prorataNetText: jd3(prorataNet),
    monthlyNetText: jd3(monthlyNet),
    cycleRangeText: `${ymd(startUTC)} \u2192 ${ymd(end)}`,
    proDaysText: `${proDays} / ${cycleDays}`,
    ...(input.mode === "gross"
      ? { fullInvoiceGross: input.fullInvoiceGross }
      : {}),
  };
}

/**
 * Build the old-style verbose script (AR/EN) with bullet points and exact order.
 * Matches screenshots: shows period, days/percent, pro-rata, monthly, invoice date,
 * coverage until next 15, and full invoice if provided.
 */
export function buildScript(o: ProrataOutput, locale: "ar" | "en") {
  const DAY_MS = 24 * 60 * 60 * 1000;
  const activationUTC = new Date(o.cycleEndUTC.getTime() - o.proDays * DAY_MS);
  const start = `${String(activationUTC.getUTCDate()).padStart(2, "0")}-${String(
    activationUTC.getUTCMonth() + 1
  ).padStart(2, "0")}-${activationUTC.getUTCFullYear()}`;
  const end = `${String(o.cycleEndUTC.getUTCDate()).padStart(2, "0")}-${String(
    o.cycleEndUTC.getUTCMonth() + 1
  ).padStart(2, "0")}-${o.cycleEndUTC.getUTCFullYear()}`;
  const next = `${String(o.nextCycleEndUTC.getUTCDate()).padStart(2, "0")}-${String(
    o.nextCycleEndUTC.getUTCMonth() + 1
  ).padStart(2, "0")}-${o.nextCycleEndUTC.getUTCFullYear()}`;

  const monthly = `JD ${o.monthlyNet.toFixed(3)}`;
  const prorata = `JD ${o.prorataNet.toFixed(3)}`;
  const totalNet = `JD ${(o.monthlyNet + o.prorataNet).toFixed(3)}`;
  const totalInvoice =
    o.fullInvoiceGross != null
      ? `JD ${Number(o.fullInvoiceGross).toFixed(3)}`
      : totalNet;

  if (locale === "ar") {
    const intro = `بحب أوضح لحضرتك أن الفاتورة صُدرت بنسبة وتناسب من تاريخ التفعيل ${start} حتى يوم ${end}.`;
    const intro2 = `وفي نفس الفاتورة تم احتساب قيمة الاشتراك الشهري مقدّمًا من ${end} حتى ${next}.`;
    const lines = [
      intro,
      intro2,
      "",
      `• قيمة الاشتراك الشهري: ${monthly}`,
      `• قيمة النسبة والتناسب حتى يوم 15: ${prorata}`,
      `• قيمة الفاتورة الكلية: ${totalInvoice}`,
      `• تاريخ إصدار الفاتورة: ${end}، وتغطي الخدمة مقدّمًا حتى ${next}.`,
    ];
    return lines.join("\n");
  }

  const intro = `Just to clarify, the invoice prorates the service from ${start} through ${end}.`;
  const intro2 = `The same invoice bills the monthly subscription in advance from ${end} until ${next}.`;
  const lines = [
    intro,
    intro2,
    "",
    `• Monthly subscription value: ${monthly}`,
    `• Pro-rata amount up to day 15: ${prorata}`,
    `• Total invoice amount: ${totalInvoice}`,
    `• Invoice issue date: ${end}, covering service in advance until ${next}.`,
  ];
  return lines.join("\n");
}
