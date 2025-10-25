// client/src/components/ProRataCalculator.tsx
import { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Percent } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  prorate,
  ymd,
  addMonthsUTC,
  formatProrataOutput,
  type Lang,
  type FormatMode,
} from "@/lib/proRata";
import { useAppStore } from "@/lib/store";

/** Small metric pill used in the summary grid */
function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-[#FFF6EF] p-4 shadow-inner">
      <p className="text-xs text-[#FF8A4C]">{label}</p>
      <p className="mt-2 font-mono text-base font-semibold text-foreground">
        {value}
      </p>
    </div>
  );
}

/**
 * ProRataCalculator
 * - Computes pro-rata from Activation → first anchor (day 15).
 * - Shows 3 views: Script, Totals, VAT.
 * - Bilingual based on global store locale (ar/en).
 */
export default function ProRataCalculator() {
  const { locale } = useAppStore();
  const lang = (locale === "ar" ? "ar" : "en") as Lang;

  const [monthlyRaw, setMonthlyRaw] = useState("");
  const [dateRaw, setDateRaw] = useState("");
  const [view, setView] = useState<FormatMode>("script");

  // Orange bills on a fixed anchor day = 15
  const anchorDay = 15;

  // Parse monthly value (accepts up to 3 decimals)
  const monthly = useMemo(() => {
    const n = Number(monthlyRaw);
    return Number.isFinite(n) && n > 0 ? n : 0;
  }, [monthlyRaw]);

  // Parse activation date (YYYY-MM-DD) → UTC midnight
  const activation = useMemo(() => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dateRaw)) return null;
    const [y, m, d] = dateRaw.split("-").map(Number);
    return new Date(Date.UTC(y, m - 1, d));
  }, [dateRaw]);

  /**
   * Core proration:
   * - We want remaining days in the cycle that contains the activation date,
   *   where cycle end = first 15th *after* activation.
   */
  const result = useMemo(() => {
    if (!activation || monthly <= 0) return null;
    return prorate(monthly, activation, anchorDay, "remaining");
  }, [activation, monthly]);

  // Coverage end: the next 15th after the invoice date (advance billing coverage)
  const coverageUntil = useMemo(() => {
    if (!result) return null;
    return addMonthsUTC(result.end, 1, anchorDay);
  }, [result]);

  const percent = result ? (result.ratio * 100).toFixed(2) : "0.00";

  /**
   * Text block (Script / Totals / VAT):
   * - For Script view we want the period = Activation → First 15 (not cycle start).
   * - So we override "start" with the activation date while keeping end from result.
   */
  const script = useMemo(() => {
    if (!result || !activation) return "";
    const scriptInput = {
      start: activation,
      end: result.end,
      usedDays: result.usedDays,
      days: result.days,
      ratio: result.ratio,
      value: result.value,
    };
    return formatProrataOutput(lang, view, monthly, scriptInput);
  }, [activation, result, lang, view, monthly]);

  // UI strings (bilingual)
  const L = {
    title: lang === "ar" ? "حاسبة التقسيم النسبي" : "Pro-Rata Calculator",
    tip:
      lang === "ar"
        ? "تتم الفوترة دائمًا في يوم 15 من كل شهر."
        : "Invoices are always issued on day 15 of each month.",
    monthly: lang === "ar" ? "قيمة الاشتراك الشهري" : "Monthly value",
    actDate: lang === "ar" ? "تاريخ التفعيل" : "Activation date",
    usedPct: lang === "ar" ? "النسبة المستخدمة" : "Used %",
    progress: lang === "ar" ? "تقدم الدورة" : "Cycle progress",
    period: lang === "ar" ? "فترة البروراتا" : "Pro-rata period",
    counted: lang === "ar" ? "الأيام المحتسبة" : "Counted days",
    proAmount: lang === "ar" ? "قيمة البروراتا" : "Pro-rata amount",
    monthlyLbl: lang === "ar" ? "الاشتراك الشهري" : "Monthly",
    nextInv: lang === "ar" ? "تاريخ إصدار الفاتورة" : "Invoice date",
    coverage: lang === "ar" ? "تغطية حتى" : "Coverage until",
    viewLbl: lang === "ar" ? "طريقة العرض" : "View",
    mScript: lang === "ar" ? "السكربت" : "Script",
    mTotals: lang === "ar" ? "الإجمالي" : "Totals",
    mVat: lang === "ar" ? "الضريبة" : "VAT",
    badge: lang === "ar" ? "حساب حتى يوم 15 القادم" : "Prorate to next day 15",
    empty:
      lang === "ar"
        ? "أدخل القيم لعرض التفاصيل."
        : "Enter values to see details.",
    placeholder:
      lang === "ar"
        ? "سيظهر هنا السكربت أو الإجمالي أو الضريبة بعد إدخال البيانات."
        : "Script / totals / VAT text will appear here once you enter data.",
  };

  return (
    <section
      dir={lang === "ar" ? "rtl" : "ltr"}
      className="space-y-8 rounded-[3rem] border border-white/60 bg-gradient-to-br from-[#FFF2E4]/90 via-[#FFE5D1]/90 to-[#FFD7BA]/85 p-8 shadow-[0_40px_120px_-60px_rgba(255,120,50,0.8)] backdrop-blur-xl"
    >
      {/* Header */}
      <header className="flex flex-col gap-3 text-right">
        <div className="inline-flex items-center gap-3 self-end rounded-[2rem] bg-white/70 px-5 py-2 text-sm font-medium text-primary shadow-inner">
          <Percent className="h-4 w-4" />
          <span>{L.badge}</span>
        </div>
        <h2 className="text-2xl font-semibold text-foreground sm:text-3xl">
          {L.title}
        </h2>
        <p className="max-w-3xl text-sm text-muted-foreground">{L.tip}</p>
      </header>

      <div className="grid gap-6 lg:grid-cols-2 lg:items-start">
        {/* Summary / meters */}
        <div className="order-2 flex flex-col gap-6 rounded-[2.5rem] border border-white/70 bg-white/80 p-8 shadow-[0_30px_90px_-50px_rgba(255,120,50,0.75)] lg:order-1">
          {/* Top row: percentage + view switch */}
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <span className="flex h-14 w-14 items-center justify-center rounded-[1.75rem] bg-gradient-to-br from-[#FF9A3D] via-[#FF7A3D] to-[#FF5E3D] text-white shadow-[0_24px_60px_-36px_rgba(255,122,0,0.85)]">
                <Percent className="h-6 w-6" />
              </span>
              <div>
                <p className="text-xs text-muted-foreground">{L.usedPct}</p>
                <p className="text-3xl font-semibold text-foreground">
                  {percent}%
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 text-sm">
              <span>{L.viewLbl}:</span>
              <select
                value={view}
                onChange={(e) => setView(e.target.value as FormatMode)}
                className="rounded-full border px-3 py-1.5"
              >
                <option value="script">{L.mScript}</option>
                <option value="totals">{L.mTotals}</option>
                <option value="vat">{L.mVat}</option>
              </select>
            </div>
          </div>

          {/* Progress bar */}
          <div className="space-y-3">
            <div className="flex items-center justify-between text-sm text-muted-foreground">
              <span>{L.progress}</span>
              <span>{percent}%</span>
            </div>
            <div className="relative h-3 w-full overflow-hidden rounded-full bg-[#FFEFE2]">
              <motion.div
                key={percent}
                initial={{ width: 0 }}
                animate={{ width: `${result ? result.ratio * 100 : 0}%` }}
                transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
                className="absolute inset-y-0 right-0 rounded-full bg-gradient-to-l from-[#FF5E3D] via-[#FF7A3D] to-[#FFB36B] shadow-[0_16px_44px_-28px_rgba(255,120,60,0.9)]"
              />
            </div>
          </div>

          {/* Metrics grid */}
          <AnimatePresence mode="wait">
            {result && activation ? (
              <motion.div
                key="have"
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
                className="grid gap-4 text-sm sm:grid-cols-2"
              >
                {/* Pro-rata period = Activation → first 15 */}
                <Metric
                  label={L.period}
                  value={`${ymd(activation)} → ${ymd(result.end)}`}
                />
                <Metric
                  label={L.counted}
                  value={`${result.usedDays} / ${result.days}`}
                />
                <Metric
                  label={L.proAmount}
                  value={`JD ${result.value.toFixed(3)}`}
                />
                <Metric
                  label={L.monthlyLbl}
                  value={`JD ${monthly.toFixed(3)}`}
                />
                <Metric label={L.nextInv} value={ymd(result.end)} />
                {coverageUntil && (
                  <Metric label={L.coverage} value={ymd(coverageUntil)} />
                )}
              </motion.div>
            ) : (
              <motion.div
                key="empty"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -12 }}
                transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
                className="rounded-2xl bg-[#FFF6EF] p-6 text-sm text-muted-foreground shadow-inner"
              >
                {L.empty}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Inputs */}
        <Card className="order-1 border-white/70 bg-white/85 p-2 shadow-[0_34px_100px_-58px_rgba(255,120,50,0.78)] lg:order-2">
          <CardHeader className="pb-2 text-right">
            <CardTitle className="text-lg font-semibold text-foreground">
              {lang === "ar" ? "بيانات الإدخال" : "Inputs"}
            </CardTitle>
            <p className="text-sm text-muted-foreground">{L.tip}</p>
          </CardHeader>
          <CardContent className="space-y-6 pt-4 text-right">
            {/* Monthly value */}
            <div className="space-y-2">
              <Label htmlFor="monthly" className="text-sm font-semibold">
                {L.monthly}
              </Label>
              <div className="relative">
                <Input
                  id="monthly"
                  inputMode="decimal"
                  placeholder="0.000"
                  value={monthlyRaw}
                  onChange={(e) => {
                    const v = e.target.value.replace(",", ".");
                    if (/^\d*(?:\.\d{0,3})?$/.test(v)) setMonthlyRaw(v);
                  }}
                  className="h-14 rounded-2xl border-white/70 bg-white/90 pr-12 text-base font-medium shadow-inner"
                />
                <span className="pointer-events-none absolute inset-y-0 right-4 flex items-center text-sm text-muted-foreground">
                  {lang === "ar" ? "د.أ" : "JD"}
                </span>
              </div>
            </div>

            {/* Activation date */}
            <div className="space-y-2">
              <Label htmlFor="activation" className="text-sm font-semibold">
                {L.actDate}
              </Label>
              <Input
                id="activation"
                type="date"
                value={dateRaw}
                onChange={(e) => setDateRaw(e.target.value)}
                className="h-14 cursor-pointer rounded-2xl border-white/70 bg-white/90 pr-6 text-base font-medium shadow-inner"
              />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Script / Totals / VAT text block */}
      <AnimatePresence mode="wait">
        {result ? (
          <motion.div
            key="script"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -14 }}
            transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
            className="rounded-[2.5rem] border border-white/60 bg-white/80 p-8 text-right text-base leading-loose text-foreground shadow-[0_28px_90px_-56px_rgba(255,120,50,0.7)]"
          >
            <pre
              className="whitespace-pre-wrap"
              dir={lang === "ar" ? "rtl" : "ltr"}
            >
              {script}
            </pre>
          </motion.div>
        ) : (
          <motion.div
            key="placeholder"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
            className="rounded-[2.5rem] border border-dashed border-white/50 bg-white/50 p-8 text-right text-base text-muted-foreground"
          >
            {L.placeholder}
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}
