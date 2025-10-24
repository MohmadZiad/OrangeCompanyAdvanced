// client/src/lib/calc.ts
// ----------------------------------------------------------------------------
// Core pricing & prorata helpers. Keep pure and framework-agnostic.
// Numbers IN  -> Numbers OUT. Formatting belongs to the UI layer.
// ----------------------------------------------------------------------------

export const MULT = { nos: 1.3108, voice: 1.4616, data: 1.16 } as const;
export const MS = 24 * 60 * 60 * 1000;

/** Keep only digits and a single dot (used by the classic keypad input). */
export function sanitizeRaw(raw: string) {
  let r = String(raw ?? "").replace(/[^\d.]/g, "");
  const i = r.indexOf(".");
  if (i !== -1) r = r.slice(0, i + 1) + r.slice(i + 1).replace(/\./g, "");
  return r;
}

/** Group thousands for display, but DO NOT use in math. */
export function groupNumberString(s: string) {
  if (!s) return "";
  const neg = s.startsWith("-");
  if (neg) s = s.slice(1);
  const parts = s.split(".");
  parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  return (neg ? "-" : "") + parts.join(".");
}

export const fmt2 = (n: number) =>
  isFinite(n) ? Number(n).toFixed(2) : "0.00";
export const fmt3 = (n: number) =>
  isFinite(n) ? Number(n).toFixed(3) : "0.000";

export const ymdUTC = (d: Date) =>
  `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(
    2,
    "0"
  )}-${String(d.getUTCDate()).padStart(2, "0")}`;

export const toUTC = (s: string) => new Date(s + "T00:00:00Z");

/** Billing cycle = 15th previous month → 15th current month (UTC). */
export function cycleFromAnchor(anchor15UTC: Date) {
  const start = new Date(
    Date.UTC(anchor15UTC.getUTCFullYear(), anchor15UTC.getUTCMonth() - 1, 15)
  );
  const end = new Date(
    Date.UTC(anchor15UTC.getUTCFullYear(), anchor15UTC.getUTCMonth(), 15)
  );
  return {
    start,
    end,
    days: Math.round((end.getTime() - start.getTime()) / MS),
  };
}

/** First 15th after activation (UTC). If d<=15 => same month 15th; else next month 15th. */
export function first15AfterActivation(aUTC: Date) {
  const y = aUTC.getUTCFullYear();
  const m = aUTC.getUTCMonth() + 1;
  const d = aUTC.getUTCDate();
  return d <= 15
    ? new Date(Date.UTC(y, m - 1, 15))
    : new Date(Date.UTC(y, m, 15));
}

/* ========================= Expression (RPN) mini-engine ==================== */
export type Vars = Record<string, number>;
type Tok = { t: "num" | "var" | "op" | "lp" | "rp"; v: string };
const prec: Record<string, number> = {
  "^": 4,
  "*": 3,
  "/": 3,
  "%": 3,
  "+": 2,
  "-": 2,
};
const rightAssoc = new Set(["^"]);
const OPS = ["+", "-", "*", "/", "%", "^"];
const isOp = (c: string) => OPS.includes(c);

export function tokenize(expr: string): Tok[] {
  const out: Tok[] = [];
  let i = 0;
  const isWS = (ch: string) => /\s/.test(ch);
  const isAlpha = (ch: string) => /[A-Za-z_]/.test(ch);
  const isDigit = (ch: string) => /[0-9.]/.test(ch);
  while (i < expr.length) {
    const ch = expr[i];
    if (isWS(ch)) {
      i++;
      continue;
    }
    if (ch === "(") {
      out.push({ t: "lp", v: ch });
      i++;
      continue;
    }
    if (ch === ")") {
      out.push({ t: "rp", v: ch });
      i++;
      continue;
    }
    if (isOp(ch)) {
      out.push({ t: "op", v: ch });
      i++;
      continue;
    }
    if (isDigit(ch)) {
      let j = i,
        dot = false;
      while (j < expr.length && /[0-9.]/.test(expr[j])) {
        if (expr[j] === ".") {
          if (dot) break;
          dot = true;
        }
        j++;
      }
      out.push({ t: "num", v: expr.slice(i, j) });
      i = j;
      continue;
    }
    if (isAlpha(ch)) {
      let j = i;
      while (j < expr.length && /[A-Za-z0-9_]/.test(expr[j])) j++;
      out.push({ t: "var", v: expr.slice(i, j) });
      i = j;
      continue;
    }
    throw new Error(`Unexpected '${ch}'`);
  }
  return out;
}

export function toRPN(tokens: Tok[]): Tok[] {
  const out: Tok[] = [];
  const st: Tok[] = [];
  for (const t of tokens) {
    if (t.t === "num" || t.t === "var") {
      out.push(t);
      continue;
    }
    if (t.t === "op") {
      while (st.length) {
        const top = st[st.length - 1];
        if (top.t !== "op") break;
        const pt = prec[top.v],
          pc = prec[t.v];
        if (pt > pc || (pt === pc && !rightAssoc.has(t.v))) out.push(st.pop()!);
        else break;
      }
      st.push(t);
      continue;
    }
    if (t.t === "lp") {
      st.push(t);
      continue;
    }
    if (t.t === "rp") {
      let ok = false;
      while (st.length) {
        const x = st.pop()!;
        if (x.t === "lp") {
          ok = true;
          break;
        }
        out.push(x);
      }
      if (!ok) throw new Error("Unbalanced");
    }
  }
  while (st.length) {
    const x = st.pop()!;
    if (x.t === "lp" || x.t === "rp") throw new Error("Unbalanced");
    out.push(x);
  }
  return out;
}

export function evaluate(expr: string, vars: Vars): number {
  const st: number[] = [];
  for (const t of toRPN(tokenize(expr))) {
    if (t.t === "num") {
      st.push(parseFloat(t.v));
      continue;
    }
    if (t.t === "var") {
      const v = vars[t.v];
      if (typeof v !== "number" || Number.isNaN(v))
        throw new Error(`Missing var ${t.v}`);
      st.push(v);
      continue;
    }
    if (t.t === "op") {
      const b = st.pop();
      const a = st.pop();
      if (a === undefined || b === undefined) throw new Error("Bad expr");
      switch (t.v) {
        case "+":
          st.push(a + b);
          break;
        case "-":
          st.push(a - b);
          break;
        case "*":
          st.push(a * b);
          break;
        case "/":
          st.push(b === 0 ? NaN : a / b);
          break;
        case "%":
          st.push(a % b);
          break;
        case "^":
          st.push(Math.pow(a, b));
          break;
      }
    }
  }
  if (st.length !== 1) throw new Error("Bad expr");
  return st[0];
}

/* ============================ Pro-rata helpers ============================= */
export function daysBetween(a: Date, b: Date) {
  const aa = new Date(a.getFullYear(), a.getMonth(), a.getDate());
  const bb = new Date(b.getFullYear(), b.getMonth(), b.getDate());
  return Math.max(0, Math.round((bb.getTime() - aa.getTime()) / 86400000));
}

export function anchorCycle(date: Date, anchorDay = 15) {
  const y = date.getFullYear();
  const m = date.getMonth();
  const aThis = new Date(y, m, anchorDay, 0, 0, 0, 0);
  const aNext = new Date(y, m + 1, anchorDay, 0, 0, 0, 0);
  if (date < aThis) {
    const aPrev = new Date(y, m - 1, anchorDay, 0, 0, 0, 0);
    return { start: aPrev, end: aThis, days: daysBetween(aPrev, aThis) };
  }
  return { start: aThis, end: aNext, days: daysBetween(aThis, aNext) };
}

export function prorate(
  monthly: number,
  pivot: Date,
  anchorDay = 15,
  mode: "remaining" | "elapsed" = "remaining"
) {
  const c = anchorCycle(pivot, anchorDay);
  const used =
    mode === "elapsed"
      ? daysBetween(c.start, pivot)
      : daysBetween(pivot, c.end);
  const ratio = c.days === 0 ? 0 : used / c.days;
  const value = monthly * ratio;
  return { ...c, usedDays: used, ratio, value };
}

/* ==================== Calculator API (numbers in/out) ===================== */

/**
 * Classic Orange pricing logic:
 * A (base), Nos_b_Nos = A * 1.3108, Voice = A * 1.4616, Data = A * 1.16
 * Return plain numbers; the UI is responsible for formatting.
 */
export function calculateOrangePricing(input: number | { basePrice: number }): {
  base: number;
  nosB_Nos: number;
  voiceCallsOnly: number;
  dataOnly: number;
} {
  const base = typeof input === "number" ? input : input.basePrice;
  const A = Number.isFinite(base) ? base : 0;
  return {
    base: A,
    nosB_Nos: A * MULT.nos,
    voiceCallsOnly: A * MULT.voice,
    dataOnly: A * MULT.data,
  };
}

/** Textual formulae shown in the UI (for tooltips/help); not used in math. */
export const CALCULATOR_FORMULAS = {
  base: "A",
  nosB_Nos: "A × 1.3108   (Nos_b_Nos)",
  voiceCallsOnly: "A × 1.4616  (Voice Calls Only)",
  dataOnly: "A × 1.16     (Data Only)",
  // verbose reference of the legacy expression:
  nos_verbose: "A + (A/2 × 0.4616) + (A/2 × 0.16)",
} as const;
