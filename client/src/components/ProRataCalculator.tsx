import { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { CalendarDays, Coins, Percent } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

const DAY = 24 * 60 * 60 * 1000;

type Lang = "ar" | "en";

interface ComputedResult {
  activation: Date;
  nextInvoice: Date; // أول 15 بعد التفعيل (تاريخ إصدار الفاتورة)
  previousInvoice: Date; // يوم 15 السابق
  coverageEndProrata: Date; // اليوم السابق ليوم 15 (نهاية فترة النسبة والتناسب)
  coverageEndAdvance: Date; // يوم 15 التالي التالي (نهاية التغطية مقدماً)
  cycleDays: number; // عدد أيام الدورة من 15 إلى 15
  usedDays: number; // الأيام من التفعيل حتى قبل يوم 15
  percentage: number; // usedDays / cycleDays
  monthlyValue: number; // قيمة الاشتراك الشهري (المدخل)
  proratedValue: number; // قيمة النسبة والتناسب
  totalInvoice: number; // الإجمالي = monthlyValue + proratedValue
}

/** Helpers: Anchors are always the 15th of month (UTC-safe) */
function makeUTC(y: number, m: number, d: number) {
  return new Date(Date.UTC(y, m, d));
}
function parseISODate(value: string) {
  if (!value) return null;
  const [y, m, d] = value.split("-").map(Number);
  if (!y || !m || !d) return null;
  return makeUTC(y, m - 1, d);
}
function anchor15(date: Date) {
  return makeUTC(date.getUTCFullYear(), date.getUTCMonth(), 15);
}
function nextAnchorDate(date: Date) {
  const sameMonth15 = anchor15(date);
  return date.getTime() < sameMonth15.getTime()
    ? sameMonth15
    : makeUTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 15);
}
function previousAnchorDate(date: Date) {
  const cur15 = anchor15(date);
  return date.getTime() <= cur15.getTime()
    ? makeUTC(date.getUTCFullYear(), date.getUTCMonth() - 1, 15)
    : cur15;
}
function addOneMonthKeep15(date: Date) {
  return makeUTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 15);
}

/** Formatters (dates must be shown in English month names) */
function makeDateFormatter() {
  // English months even if text is Arabic
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}
function makeShortDateFormatter() {
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}
/** Currency: JOD with 3 decimals */
function makeCurrencyFormatter(lang: Lang) {
  // Use English digits/format for currency consistency
  const locale = "en-GB";
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency: "JOD",
    minimumFractionDigits: 3,
    maximumFractionDigits: 3,
  });
}

/** i18n */
const T = {
  ar: {
    title: "نسبة وتناسب فاتورة واحدة بطريقة مبسطة",
    subtitle:
      "أدخل قيمة الاشتراك الشهري وتاريخ تفعيل الخدمة. سيحسب النظام النسبة والتناسب حتى أقرب يوم 15، ثم يضيف الاشتراك الشهري مقدّمًا حتى يوم 15 التالي.",
    labelFullInvoice: "قيمة الاشتراك الشهري",
    labelActivation: "تاريخ التفعيل",
    hintFullInvoice:
      "أدخل قيمة الاشتراك الشهري لدورة كاملة ليتم احتساب النسبة والتناسب تلقائيًا.",
    hintActivation: "اليوم الذي بدأت فيه الخدمة فعليًا.",
    invoicesAlways15: "يتم إصدار الفواتير دائمًا في يوم 15 من كل شهر.",
    whatIsPercent: "ما معنى النسبة؟",
    percentTip:
      "هذه النسبة توضّح الجزء المستهلك من الدورة الحالية بين يوم 15 السابق ويوم 15 القادم.",
    courseProgress: "تقدّم الدورة",
    nextInvoiceDate: "تاريخ إصدار الفاتورة",
    coveragePeriod: "فترتا التغطية",
    daysCount: "عدد الأيام المحتسبة",
    amountDue: "المبلغ المستحق (نسبة وتناسب)",
    startTyping: "ابدأ بإدخال قيمة الاشتراك وتاريخ التفعيل لعرض التفاصيل.",
    // statement block (exact phrasing you requested)
    statement: ({
      activation,
      nextInvoice,
      advanceEnd,
      monthlyValue,
      prorataValue,
      total,
    }: {
      activation: string;
      nextInvoice: string;
      advanceEnd: string;
      monthlyValue: string;
      prorataValue: string;
      total: string;
    }) =>
      `أوضّح لحضرتك أن الفاتورة صدرت بنسبة وتناسب من تاريخ التفعيل ${activation} حتى يوم (${nextInvoice}).
وفي نفس الفاتورة تم احتساب قيمة الاشتراك الشهري مقدماً من ${nextInvoice} حتى ${advanceEnd}.
• قيمة الاشتراك الشهري: ${monthlyValue}
• قيمة النسبة والتناسب حتى يوم 15: ${prorataValue}
• قيمة الفاتورة الكليّة: ${total}
تاريخ إصدار الفاتورة: ${nextInvoice}، وتغطي الخدمة مقدماً حتى ${advanceEnd}.`,
  },
  en: {
    title: "Single-Invoice Proration (Simple)",
    subtitle:
      "Enter the monthly subscription amount and the activation date. The system prorates up to the next 15th, then adds one full month in advance until the following 15th.",
    labelFullInvoice: "Monthly subscription amount",
    labelActivation: "Activation date",
    hintFullInvoice:
      "Enter the full monthly price; the prorated amount will be calculated automatically.",
    hintActivation: "The day the service actually started.",
    invoicesAlways15: "Invoices are always issued on the 15th of each month.",
    whatIsPercent: "What does the percentage mean?",
    percentTip:
      "It shows the consumed portion of the current cycle between the previous 15th and the next 15th.",
    courseProgress: "Cycle progress",
    nextInvoiceDate: "Invoice issue date",
    coveragePeriod: "Coverage periods",
    daysCount: "Counted days",
    amountDue: "Prorated amount (due)",
    startTyping:
      "Start by entering the monthly amount and activation date to see details.",
    statement: ({
      activation,
      nextInvoice,
      advanceEnd,
      monthlyValue,
      prorataValue,
      total,
    }: {
      activation: string;
      nextInvoice: string;
      advanceEnd: string;
      monthlyValue: string;
      prorataValue: string;
      total: string;
    }) =>
      `The invoice was issued prorated from the activation date ${activation} up to (${nextInvoice}).
In the same invoice, the monthly subscription was charged in advance from ${nextInvoice} through ${advanceEnd}.
• Monthly subscription: ${monthlyValue}
• Proration up to the 15th: ${prorataValue}
• Total invoice amount: ${total}
Invoice issue date: ${nextInvoice}, and the service is covered in advance until ${advanceEnd}.`,
  },
} as const;

/** Core calculation following your rule:
 * - nextInvoice = first 15th ON/AFTER activation
 * - prorata covers [activation .. nextInvoice - 1 day]
 * - advance month covers [nextInvoice .. nextInvoice+1month)
 * - prorata denominator = days between previous 15th and next 15th
 */
function calculate(
  activationRaw: string,
  monthlyRaw: string
): ComputedResult | null {
  const monthlyValue =
    monthlyRaw.trim() === "" ? NaN : Number(monthlyRaw.replace(",", "."));
  const activation = parseISODate(activationRaw);
  if (!activation || !Number.isFinite(monthlyValue)) return null;

  const nextInv = nextAnchorDate(activation);
  const prevInv = previousAnchorDate(activation);

  const cycleDays = Math.max(
    1,
    Math.round((nextInv.getTime() - prevInv.getTime()) / DAY)
  );

  // days used from activation up to the day before nextInv
  const rawUsedDays = Math.ceil(
    Math.max(0, nextInv.getTime() - activation.getTime()) / DAY
  );
  const usedDays = Math.min(cycleDays, rawUsedDays);

  const percentage = Math.min(100, Math.max(0, (usedDays / cycleDays) * 100));
  const proratedValue = (monthlyValue * usedDays) / cycleDays;

  const coverageEndProrata = new Date(nextInv.getTime() - DAY); // end of usage part
  const coverageEndAdvance = addOneMonthKeep15(nextInv); // end of advance part (the next 15th)

  return {
    activation,
    nextInvoice: nextInv,
    previousInvoice: prevInv,
    coverageEndProrata,
    coverageEndAdvance,
    cycleDays,
    usedDays,
    percentage,
    monthlyValue,
    proratedValue,
    totalInvoice: monthlyValue + proratedValue,
  };
}

/** Main Component */
export function ProRataCalculator({ lang = "ar" as Lang }: { lang?: Lang }) {
  const i18n = T[lang];
  const dateFmt = makeDateFormatter();
  const shortFmt = makeShortDateFormatter();
  const moneyFmt = makeCurrencyFormatter(lang);

  const [amount, setAmount] = useState("");
  const [activationDate, setActivationDate] = useState("");

  const result = useMemo(
    () => calculate(activationDate, amount),
    [activationDate, amount]
  );

  const percentText = result ? result.percentage.toFixed(2) : "0.00";

  const dir = lang === "ar" ? "rtl" : "ltr";
  const align = lang === "ar" ? "text-right" : "text-left";
  const revFlex = lang === "ar" ? "justify-end" : "justify-start";

  return (
    <section
      dir={dir}
      className="space-y-8 rounded-[3rem] border border-white/60 bg-gradient-to-br from-[#FFF2E4]/90 via-[#FFE5D1]/90 to-[#FFD7BA]/85 p-8 shadow-[0_40px_120px_-60px_rgba(255,120,50,0.8)] backdrop-blur-xl"
    >
      <header className={`flex flex-col gap-3 ${align}`}>
        <div
          className={`inline-flex items-center gap-3 self-${
            lang === "ar" ? "end" : "start"
          } rounded-[2rem] bg-white/70 px-5 py-2 text-sm font-medium text-primary shadow-inner`}
        >
          <Percent className="h-4 w-4" />
          <span>
            {lang === "ar"
              ? "حساب النسبة والتناسب حتى يوم 15"
              : "Proration up to the 15th"}
          </span>
        </div>
        <h2 className="text-2xl font-semibold text-foreground sm:text-3xl">
          {i18n.title}
        </h2>
        <p className="max-w-3xl text-sm text-muted-foreground">
          {i18n.subtitle}
        </p>
      </header>

      <div className="grid gap-6 lg:grid-cols-2 lg:items-start">
        {/* Left card: results */}
        <motion.div
          layout
          className="order-2 flex flex-col gap-6 rounded-[2.5rem] border border-white/70 bg-white/80 p-8 shadow-[0_30px_90px_-50px_rgba(255,120,50,0.75)] transition-shadow duration-300 lg:order-1"
        >
          <div className="flex flex-col gap-6">
            <div className={`flex flex-wrap items-center ${revFlex} gap-4`}>
              <div className="flex items-center gap-3">
                <span className="flex h-14 w-14 items-center justify-center rounded-[1.75rem] bg-gradient-to-br from-[#FF9A3D] via-[#FF7A3D] to-[#FF5E3D] text-white shadow-[0_24px_60px_-36px_rgba(255,122,0,0.85)]">
                  <Percent className="h-6 w-6" />
                </span>
                <div className={align}>
                  <p className="text-xs text-muted-foreground">
                    {lang === "ar" ? "النسبة المستخدمة" : "Used percentage"}
                  </p>
                  <p className="text-3xl font-semibold text-foreground">
                    {percentText}%
                  </p>
                </div>
              </div>
              <Tooltip>
                <TooltipTrigger asChild>
                  <span className="cursor-help text-sm text-primary underline decoration-dotted underline-offset-4">
                    {i18n.whatIsPercent}
                  </span>
                </TooltipTrigger>
                <TooltipContent side="bottom" className={`text-sm ${align}`}>
                  {i18n.percentTip}
                </TooltipContent>
              </Tooltip>
            </div>

            <div className="space-y-3">
              <div
                className={`flex items-center ${revFlex} justify-between text-sm text-muted-foreground`}
              >
                <span>{i18n.courseProgress}</span>
                <span>{percentText}%</span>
              </div>
              <div className="relative h-3 w-full overflow-hidden rounded-full bg-[#FFEFE2]">
                <motion.div
                  key={percentText}
                  initial={{ width: 0 }}
                  animate={{ width: `${result ? result.percentage : 0}%` }}
                  transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
                  className="absolute inset-y-0 right-0 rounded-full bg-gradient-to-l from-[#FF5E3D] via-[#FF7A3D] to-[#FFB36B] shadow-[0_16px_44px_-28px_rgba(255,120,60,0.9)]"
                />
              </div>
            </div>

            <AnimatePresence mode="wait">
              {result ? (
                <motion.div
                  key={`${result.nextInvoice.getTime()}-${result.usedDays}`}
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
                  className={`grid gap-4 text-sm text-muted-foreground sm:grid-cols-2 ${align}`}
                >
                  <div className="rounded-2xl bg-[#FFF6EF] p-4 shadow-inner">
                    <p className="text-xs text-[#FF8A4C]">
                      {i18n.nextInvoiceDate}
                    </p>
                    <p className="mt-2 text-base font-semibold text-foreground">
                      {dateFmt.format(result.nextInvoice)}
                    </p>
                  </div>

                  <div className="rounded-2xl bg-[#FFF6EF] p-4 shadow-inner">
                    <p className="text-xs text-[#FF8A4C]">
                      {i18n.coveragePeriod}
                    </p>
                    <p className="mt-2 text-base font-semibold text-foreground">
                      {/* فترة النسبة والتناسب */}
                      {shortFmt.format(result.activation)} –{" "}
                      {shortFmt.format(result.coverageEndProrata)}
                      <br />
                      {/* فترة التغطية مقدّماً */}
                      {shortFmt.format(result.nextInvoice)} –{" "}
                      {shortFmt.format(result.coverageEndAdvance)}
                    </p>
                  </div>

                  <div className="rounded-2xl bg-[#FFF6EF] p-4 shadow-inner">
                    <p className="text-xs text-[#FF8A4C]">{i18n.daysCount}</p>
                    <p className="mt-2 text-base font-semibold text-foreground">
                      {result.usedDays} / {result.cycleDays}
                    </p>
                  </div>

                  <div className="rounded-2xl bg-[#FFF6EF] p-4 shadow-inner">
                    <p className="text-xs text-[#FF8A4C]">{i18n.amountDue}</p>
                    <p className="mt-2 text-base font-semibold text-foreground">
                      {moneyFmt.format(result.proratedValue)}
                    </p>
                  </div>
                </motion.div>
              ) : (
                <motion.div
                  key="empty"
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -12 }}
                  transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
                  className={`rounded-2xl bg-[#FFF6EF] p-6 text-sm text-muted-foreground shadow-inner ${align}`}
                >
                  {i18n.startTyping}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </motion.div>

        {/* Right card: inputs */}
        <Card className="order-1 border-white/70 bg-white/85 p-2 shadow-[0_34px_100px_-58px_rgba(255,120,50,0.78)] transition-shadow duration-300 hover:shadow-[0_40px_110px_-55px_rgba(255,120,60,0.88)] lg:order-2">
          <CardHeader className={`pb-2 ${align}`}>
            <CardTitle className="text-lg font-semibold text-foreground">
              {lang === "ar" ? "بيانات الإدخال" : "Input data"}
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              {i18n.invoicesAlways15}
            </p>
          </CardHeader>
          <CardContent className={`space-y-6 pt-4 ${align}`}>
            <div className="space-y-2">
              <Label
                htmlFor="amount"
                className={`flex items-center ${revFlex} gap-2 text-sm font-semibold`}
              >
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span className="cursor-help text-primary underline decoration-dotted underline-offset-4">
                      {i18n.labelFullInvoice}
                    </span>
                  </TooltipTrigger>
                  <TooltipContent side="bottom" className={`text-sm ${align}`}>
                    {i18n.hintFullInvoice}
                  </TooltipContent>
                </Tooltip>
                <Coins className="h-4 w-4 text-primary" />
              </Label>
              <div className="relative">
                <Input
                  id="amount"
                  inputMode="decimal"
                  placeholder="0.000"
                  value={amount}
                  onChange={(e) => {
                    const v = e.target.value;
                    if (/^\d*(?:[.,]\d{0,3})?$/.test(v)) {
                      setAmount(v.replace(",", "."));
                    }
                  }}
                  className={`h-14 rounded-2xl border-white/70 bg-white/90 ${
                    lang === "ar" ? "pr-12" : "pl-12"
                  } text-base font-medium shadow-inner transition-shadow duration-300 focus-visible:ring-[#FF9A3D]/40 hover:shadow-[0_14px_36px_-28px_rgba(255,145,70,0.6)]`}
                />
                <span
                  className={`pointer-events-none absolute inset-y-0 ${
                    lang === "ar" ? "right-4" : "left-4"
                  } flex items-center text-sm text-muted-foreground`}
                >
                  JD
                </span>
              </div>
            </div>

            <div className="space-y-2">
              <Label
                htmlFor="activation"
                className={`flex items-center ${revFlex} gap-2 text-sm font-semibold`}
              >
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span className="cursor-help text-primary underline decoration-dotted underline-offset-4">
                      {i18n.labelActivation}
                    </span>
                  </TooltipTrigger>
                  <TooltipContent side="bottom" className={`text-sm ${align}`}>
                    {i18n.hintActivation}
                  </TooltipContent>
                </Tooltip>
                <CalendarDays className="h-4 w-4 text-primary" />
              </Label>
              <Input
                id="activation"
                type="date"
                value={activationDate}
                onChange={(e) => setActivationDate(e.target.value)}
                className="h-14 cursor-pointer rounded-2xl border-white/70 bg-white/90 pr-6 text-base font-medium shadow-inner transition-shadow duration-300 focus-visible:ring-[#FF9A3D]/40 hover:shadow-[0_14px_36px_-28px_rgba(255,145,70,0.6)]"
              />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Statement block */}
      <AnimatePresence mode="wait">
        {result ? (
          <motion.div
            key={`stmt-${result.nextInvoice.getTime()}`}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -14 }}
            transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
            className={`rounded-[2.5rem] border border-white/60 bg-white/80 p-8 text-base leading-loose text-foreground shadow-[0_28px_90px_-56px_rgba(255,120,50,0.7)] ${align}`}
          >
            {T[lang].statement({
              activation: dateFmt.format(result.activation),
              nextInvoice: dateFmt.format(result.nextInvoice),
              advanceEnd: dateFmt.format(result.coverageEndAdvance),
              monthlyValue: makeCurrencyFormatter("en").format(
                result.monthlyValue
              ),
              prorataValue: makeCurrencyFormatter("en").format(
                result.proratedValue
              ),
              total: makeCurrencyFormatter("en").format(result.totalInvoice),
            })}
          </motion.div>
        ) : (
          <motion.div
            key="placeholder"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
            className={`rounded-[2.5rem] border border-dashed border-white/50 bg-white/50 p-8 text-base text-muted-foreground ${align}`}
          >
            {i18n.startTyping}
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}
