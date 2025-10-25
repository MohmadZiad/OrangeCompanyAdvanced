import { useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { CalendarDays, Coins, Percent } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useAppStore } from "@/lib/store";

const DAY = 24 * 60 * 60 * 1000;

type ComputedResult = {
  activation: Date;
  nextInvoice: Date;
  previousInvoice: Date;
  followingInvoice: Date;
  nextCycleEnd: Date;
  cycleDays: number;
  usedDays: number;
  percentage: number;
  invoiceValue: number;
  proratedValue: number;
  totalDue: number;
};

function parseISODate(value: string) {
  if (!value) return null;
  const [y, m, d] = value.split("-").map(Number);
  if (!y || !m || !d) return null;
  return new Date(Date.UTC(y, m - 1, d));
}

function anchorOnFifteenth(year: number, month: number) {
  return new Date(Date.UTC(year, month, 15));
}

function nextInvoiceDate(activation: Date) {
  const sameMonthAnchor = anchorOnFifteenth(
    activation.getUTCFullYear(),
    activation.getUTCMonth()
  );
  if (activation.getTime() < sameMonthAnchor.getTime()) {
    return sameMonthAnchor;
  }
  return anchorOnFifteenth(
    activation.getUTCFullYear(),
    activation.getUTCMonth() + 1
  );
}

function addMonthsToFifteenth(base: Date, months: number) {
  return anchorOnFifteenth(base.getUTCFullYear(), base.getUTCMonth() + months);
}

function calculateResult(invoiceValueRaw: string, activationRaw: string) {
  const invoiceValue = invoiceValueRaw.trim() === "" ? NaN : Number(invoiceValueRaw);
  const activationDate = parseISODate(activationRaw);

  if (!activationDate || !Number.isFinite(invoiceValue)) {
    return null;
  }

  const nextInvoice = nextInvoiceDate(activationDate);
  const followingInvoice = addMonthsToFifteenth(nextInvoice, 1);
  const nextCycleEnd = addMonthsToFifteenth(followingInvoice, 1);
  const previousInvoice = addMonthsToFifteenth(nextInvoice, -1);

  const cycleDays = Math.max(
    1,
    Math.round((nextInvoice.getTime() - previousInvoice.getTime()) / DAY)
  );

  const usedMs = Math.max(0, nextInvoice.getTime() - activationDate.getTime());
  const usedDays = Math.min(cycleDays, Math.max(1, Math.ceil(usedMs / DAY)));
  const percentage = Math.min(100, (usedDays / cycleDays) * 100);
  const proratedValue = (invoiceValue * usedDays) / cycleDays;
  const totalDue = invoiceValue + proratedValue;

  return {
    activation: activationDate,
    nextInvoice,
    previousInvoice,
    followingInvoice,
    nextCycleEnd,
    cycleDays,
    usedDays,
    percentage,
    invoiceValue,
    proratedValue,
    totalDue,
  } satisfies ComputedResult;
}

type Formatters = ReturnType<typeof createFormatters>;

type Locale = "ar" | "en";

function createFormatters(locale: Locale) {
  const displayLocale = locale === "ar" ? "ar-JO" : "en-GB";
  return {
    displayFull: new Intl.DateTimeFormat(displayLocale, {
      day: "2-digit",
      month: "long",
      year: "numeric",
    }),
    displayShort: new Intl.DateTimeFormat(displayLocale, {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    }),
    englishFull: new Intl.DateTimeFormat("en-GB", {
      day: "2-digit",
      month: "long",
      year: "numeric",
    }),
    englishShort: new Intl.DateTimeFormat("en-GB", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    }),
    currency: new Intl.NumberFormat(locale === "ar" ? "ar-JO" : "en-GB", {
      style: "currency",
      currency: "JOD",
      minimumFractionDigits: 3,
    }),
    percent: new Intl.NumberFormat(locale === "ar" ? "ar-JO" : "en-GB", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }),
  };
}

function buildExplanation(
  result: ComputedResult,
  formatters: Formatters,
  locale: Locale
) {
  const isArabic = locale === "ar";

  const activationText = formatters.englishFull.format(result.activation);
  const nextInvoiceText = formatters.englishFull.format(result.nextInvoice);
  const followingInvoiceText = formatters.englishFull.format(result.followingInvoice);
  const nextCycleEndText = formatters.englishFull.format(result.nextCycleEnd);

  const monthlyValue = formatters.currency.format(result.invoiceValue);
  const proratedValue = formatters.currency.format(result.proratedValue);
  const totalDue = formatters.currency.format(result.totalDue);

  const usedDaysLabel = isArabic
    ? result.usedDays === 1
      ? "يوم واحد"
      : `${result.usedDays} يوم`
    : result.usedDays === 1
    ? "1 day"
    : `${result.usedDays} days`;

  if (isArabic) {
    return (
      `أوضح لحضرتك أن الفاتورة صدرت بنسبة وتناسب من تاريخ التفعيل ${activationText} حتى ${nextInvoiceText} (${usedDaysLabel}). ` +
      `وفي نفس الوقت تم احتساب الاشتراك الشهري للفترة من ${nextInvoiceText} حتى ${followingInvoiceText}.\n\n` +
      `• قيمة الاشتراك الشهري: ${monthlyValue}.\n` +
      `• قيمة النسبة والتناسب عن ${usedDaysLabel}: ${proratedValue}.\n` +
      `• إجمالي قيمة الفاتورة المستحقة: ${totalDue}.\n\n` +
      `يتم إصدار الفاتورة التالية بتاريخ ${followingInvoiceText} وتبقي الخدمة فعالة حتى ${nextCycleEndText}.`
    );
  }

  return (
    `Your invoice includes a pro-rata charge from ${activationText} through ${nextInvoiceText} (${usedDaysLabel}). ` +
    `The full monthly subscription covers ${nextInvoiceText} through ${followingInvoiceText}.\n\n` +
    `• Monthly subscription amount: ${monthlyValue}.\n` +
    `• Pro-rata charge for ${usedDaysLabel}: ${proratedValue}.\n` +
    `• Total amount due now: ${totalDue}.\n\n` +
    `The next invoice will be issued on ${followingInvoiceText} and keeps the service active until ${nextCycleEndText}.`
  );
}

export function ProRataCalculator() {
  const [invoiceValue, setInvoiceValue] = useState("");
  const [activationDate, setActivationDate] = useState("");
  const { locale } = useAppStore();
  const currentLocale = (locale ?? "ar") as Locale;
  const isArabic = currentLocale === "ar";

  const formatters = useMemo(() => createFormatters(currentLocale), [currentLocale]);

  const result = useMemo(
    () => calculateResult(invoiceValue, activationDate),
    [invoiceValue, activationDate]
  );

  const explanation = useMemo(() => {
    if (!result) return "";
    return buildExplanation(result, formatters, currentLocale);
  }, [result, formatters, currentLocale]);

  const percentageDisplay = formatters.percent.format(result ? result.percentage : 0);
  const proratedDisplay = result
    ? formatters.currency.format(result.proratedValue)
    : formatters.currency.format(0);

  const totalDueDisplay = result
    ? formatters.currency.format(result.totalDue)
    : formatters.currency.format(0);

  const usedDaysText = result
    ? isArabic
      ? result.usedDays === 1
        ? "يوم واحد"
        : `${result.usedDays} يوم`
      : result.usedDays === 1
      ? "1 day"
      : `${result.usedDays} days`
    : isArabic
    ? "0 يوم"
    : "0 days";

  const cycleDaysText = result
    ? isArabic
      ? `${result.cycleDays} يوم`
      : `${result.cycleDays} days`
    : isArabic
    ? "0 يوم"
    : "0 days";

  return (
    <section
      dir={isArabic ? "rtl" : "ltr"}
      className="space-y-8 rounded-[3rem] border border-white/60 bg-gradient-to-br from-[#FFF4EB]/95 via-[#FFE7D3]/90 to-[#FFDCC0]/85 p-6 sm:p-8 shadow-[0_40px_120px_-60px_rgba(255,128,64,0.45)] backdrop-blur-xl"
    >
      <header className={isArabic ? "text-right" : "text-left"}>
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="inline-flex items-center gap-3 rounded-[2rem] bg-white/70 px-5 py-2 text-sm font-medium text-primary shadow-inner">
            <Percent className="h-4 w-4" />
            <span>
              {isArabic
                ? "حساب النسبة والتناسب حتى يوم 15"
                : "Pro-rata billing until the 15th"}
            </span>
          </div>
          <div className="text-xs text-muted-foreground opacity-80">
            {isArabic
              ? "تحديث مباشر بمجرد تغيير المدخلات"
              : "Updates instantly as you adjust the inputs"}
          </div>
        </div>
        <h2 className="mt-4 text-2xl font-semibold text-foreground sm:text-3xl">
          {isArabic
            ? "نسبة وتناسب فاتورة واحدة بطريقة فاخرة"
            : "Elegant single-invoice pro-rata calculator"}
        </h2>
        <p className="mt-2 text-sm text-muted-foreground sm:max-w-3xl">
          {isArabic
            ? "أدخل قيمة الفاتورة الشهرية وتاريخ التفعيل ليحسب النظام الفترة الجزئية، ونسبة الاستخدام، ومجموع المستحقات حتى يوم 15 المقبل بشكل تلقائي."
            : "Provide the monthly invoice value and the activation date. We will calculate the prorated window, usage percentage, and total amount due through the next 15th automatically."}
        </p>
      </header>

      <div className="grid gap-6 lg:grid-cols-2 lg:items-start">
        <motion.div
          layout
          className="order-2 flex flex-col gap-6 rounded-[2.6rem] border border-white/70 bg-white/85 p-6 shadow-[0_32px_90px_-50px_rgba(255,120,60,0.55)] transition-shadow duration-300 lg:order-1"
        >
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <span className="flex h-14 w-14 items-center justify-center rounded-[1.75rem] bg-gradient-to-br from-[#FF9D4B] via-[#FF7B41] to-[#FF5A3C] text-white shadow-[0_24px_60px_-36px_rgba(255,122,0,0.65)]">
                <Percent className="h-6 w-6" />
              </span>
              <div className={isArabic ? "text-right" : "text-left"}>
                <p className="text-xs text-muted-foreground">
                  {isArabic ? "النسبة المستخدمة" : "Cycle used"}
                </p>
                <p className="text-3xl font-semibold text-foreground">
                  {percentageDisplay}%
                </p>
              </div>
            </div>
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="cursor-help text-sm text-primary underline decoration-dotted underline-offset-4">
                  {isArabic ? "ما معنى النسبة؟" : "What does this mean?"}
                </span>
              </TooltipTrigger>
              <TooltipContent
                side="bottom"
                className={`text-sm ${isArabic ? "text-right" : "text-left"}`}
              >
                {isArabic
                  ? "تمثل هذه النسبة الجزء المحتسب من الدورة الحالية بين فاتورة يوم 15 السابقة والفاتورة التالية."
                  : "This percentage shows how much of the current cycle between the previous and upcoming 15th has been used."}
              </TooltipContent>
            </Tooltip>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between text-sm text-muted-foreground">
              <span>{isArabic ? "تقدّم الدورة" : "Cycle progress"}</span>
              <span>{percentageDisplay}%</span>
            </div>
            <div className="relative h-3 w-full overflow-hidden rounded-full bg-[#FFEFE2]">
              <motion.div
                key={percentageDisplay}
                initial={{ width: 0 }}
                animate={{ width: `${result ? result.percentage : 0}%` }}
                transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
                className="absolute inset-y-0 right-0 rounded-full bg-gradient-to-l from-[#FF5A3C] via-[#FF7B41] to-[#FFB56F] shadow-[0_16px_44px_-28px_rgba(255,120,60,0.55)]"
              />
            </div>
          </div>

          <AnimatePresence mode="wait">
            {result ? (
              <motion.div
                key={`${result.nextInvoice.getTime()}-${currentLocale}`}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
                className="grid gap-4 text-sm text-muted-foreground sm:grid-cols-2"
              >
                <div className="rounded-2xl bg-[#FFF6EF] p-4 shadow-inner">
                  <p className="text-xs text-[#FF8A4C]">
                    {isArabic ? "تاريخ الفاتورة القادمة" : "Next invoice date"}
                  </p>
                  <p className="mt-2 text-base font-semibold text-foreground">
                    {formatters.displayFull.format(result.nextInvoice)}
                  </p>
                </div>
                <div className="rounded-2xl bg-[#FFF6EF] p-4 shadow-inner">
                  <p className="text-xs text-[#FF8A4C]">
                    {isArabic
                      ? "الفترة الجزئية المحسوبة"
                      : "Prorated coverage"}
                  </p>
                  <p className="mt-2 text-base font-semibold text-foreground">
                    {formatters.displayShort.format(result.activation)}
                    {isArabic ? " – " : " – "}
                    {formatters.displayShort.format(result.nextInvoice)}
                  </p>
                </div>
                <div className="rounded-2xl bg-[#FFF6EF] p-4 shadow-inner">
                  <p className="text-xs text-[#FF8A4C]">
                    {isArabic ? "أيام الفوترة المحتسبة" : "Prorated days"}
                  </p>
                  <p className="mt-2 text-base font-semibold text-foreground">
                    {usedDaysText}
                    {isArabic ? " من " : " of "}
                    {cycleDaysText}
                  </p>
                </div>
                <div className="rounded-2xl bg-[#FFF6EF] p-4 shadow-inner">
                  <p className="text-xs text-[#FF8A4C]">
                    {isArabic ? "الدورة الشهرية التالية" : "Next monthly cycle"}
                  </p>
                  <p className="mt-2 text-base font-semibold text-foreground">
                    {formatters.displayShort.format(result.nextInvoice)}
                    {isArabic ? " – " : " – "}
                    {formatters.displayShort.format(result.followingInvoice)}
                  </p>
                </div>
                <div className="rounded-2xl bg-[#FFF6EF] p-4 shadow-inner">
                  <p className="text-xs text-[#FF8A4C]">
                    {isArabic ? "قيمة النسبة والتناسب" : "Pro-rata amount"}
                  </p>
                  <p className="mt-2 text-base font-semibold text-foreground">
                    {proratedDisplay}
                  </p>
                </div>
                <div className="rounded-2xl bg-[#FFF6EF] p-4 shadow-inner">
                  <p className="text-xs text-[#FF8A4C]">
                    {isArabic ? "إجمالي المستحق الآن" : "Total due now"}
                  </p>
                  <p className="mt-2 text-base font-semibold text-foreground">
                    {totalDueDisplay}
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
                className="rounded-2xl bg-[#FFF6EF] p-6 text-sm text-muted-foreground shadow-inner"
              >
                {isArabic
                  ? "ابدأ بإدخال قيمة الفاتورة وتاريخ التفعيل لعرض تفاصيل الدورة تلقائيًا."
                  : "Enter the invoice value and activation date to preview the prorated cycle automatically."}
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        <Card className="order-1 border-white/70 bg-white/90 p-2 shadow-[0_34px_100px_-58px_rgba(255,120,50,0.48)] transition-shadow duration-300 hover:shadow-[0_40px_110px_-55px_rgba(255,120,60,0.58)] lg:order-2">
          <CardHeader className={`${isArabic ? "text-right" : "text-left"} pb-2`}>
            <CardTitle className="text-lg font-semibold text-foreground">
              {isArabic ? "بيانات الإدخال" : "Input details"}
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              {isArabic
                ? "تصدر جميع الفواتير في يوم 15 من كل شهر تلقائيًا."
                : "All invoices are always issued on the 15th of each month."}
            </p>
          </CardHeader>
          <CardContent className={`space-y-6 pt-4 ${isArabic ? "text-right" : "text-left"}`}>
            <div className="space-y-2">
              <Label
                htmlFor="invoice"
                className="flex items-center justify-between gap-2 text-sm font-semibold"
              >
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span className="cursor-help text-primary underline decoration-dotted underline-offset-4">
                      {isArabic ? "قيمة الفاتورة الكاملة" : "Monthly invoice value"}
                    </span>
                  </TooltipTrigger>
                  <TooltipContent
                    side="bottom"
                    className={`text-sm ${isArabic ? "text-right" : "text-left"}`}
                  >
                    {isArabic
                      ? "أدخل قيمة الاشتراك الشهري الكامل ليتم احتساب الجزء المستحق تلقائيًا."
                      : "Enter the full monthly subscription amount to calculate the prorated charge."}
                  </TooltipContent>
                </Tooltip>
                <Coins className="h-4 w-4 text-primary" />
              </Label>
              <div className="relative">
                <Input
                  id="invoice"
                  inputMode="decimal"
                  placeholder="0.000"
                  value={invoiceValue}
                  onChange={(event) => {
                    const value = event.target.value;
                    if (/^\d*(?:[.,]\d{0,3})?$/.test(value)) {
                      setInvoiceValue(value.replace(",", "."));
                    }
                  }}
                  className="h-14 rounded-2xl border-white/70 bg-white/95 pr-12 text-base font-medium shadow-inner transition-shadow duration-300 focus-visible:ring-[#FF9A3D]/40 hover:shadow-[0_14px_36px_-28px_rgba(255,145,70,0.35)]"
                />
                <span className="pointer-events-none absolute inset-y-0 right-4 flex items-center text-sm text-muted-foreground">
                  {isArabic ? "د.أ" : "JOD"}
                </span>
              </div>
            </div>

            <div className="space-y-2">
              <Label
                htmlFor="activation"
                className="flex items-center justify-between gap-2 text-sm font-semibold"
              >
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span className="cursor-help text-primary underline decoration-dotted underline-offset-4">
                      {isArabic ? "تاريخ التفعيل" : "Activation date"}
                    </span>
                  </TooltipTrigger>
                  <TooltipContent
                    side="bottom"
                    className={`text-sm ${isArabic ? "text-right" : "text-left"}`}
                  >
                    {isArabic
                      ? "اختر اليوم الذي بدأ فيه الاشتراك فعليًا ليتم احتساب الدورة حتى أقرب يوم 15."
                      : "Pick the day the service started so we can calculate the period up to the next 15th."}
                  </TooltipContent>
                </Tooltip>
                <CalendarDays className="h-4 w-4 text-primary" />
              </Label>
              <Input
                id="activation"
                type="date"
                value={activationDate}
                onChange={(event) => setActivationDate(event.target.value)}
                className="h-14 cursor-pointer rounded-2xl border-white/70 bg-white/95 pr-6 text-base font-medium shadow-inner transition-shadow duration-300 focus-visible:ring-[#FF9A3D]/40 hover:shadow-[0_14px_36px_-28px_rgba(255,145,70,0.35)]"
              />
            </div>
          </CardContent>
        </Card>
      </div>

      <AnimatePresence mode="wait">
        {result ? (
          <motion.div
            key={`${result.totalDue}-${currentLocale}`}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -14 }}
            transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
            className="rounded-[2.6rem] border border-white/60 bg-white/85 p-6 sm:p-8 text-base leading-loose text-foreground shadow-[0_28px_90px_-56px_rgba(255,120,50,0.45)] whitespace-pre-line"
          >
            {explanation}
          </motion.div>
        ) : (
          <motion.div
            key="placeholder"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
            className="rounded-[2.6rem] border border-dashed border-white/50 bg-white/55 p-6 sm:p-8 text-base text-muted-foreground"
          >
            {isArabic
              ? "سيتم توليد شرح تفصيلي باللغة العربية بمجرد إدخال البيانات المطلوبة."
              : "A detailed English explanation will appear as soon as you fill in the required inputs."}
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}
