import { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { CalendarDays, Coins, Percent } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

const DAY = 24 * 60 * 60 * 1000;

type ComputedResult = {
  activation: Date;
  nextInvoice: Date;
  previousInvoice: Date;
  coverageEnd: Date; // اليوم الأخير المشمول قبل يوم 15
  cycleDays: number; // أيام الدورة بين 15-الشهر السابق و15-الحالي/التالي
  usedDays: number;  // الأيام من تاريخ التفعيل حتى يوم 15 القادم
  percentage: number; // usedDays / cycleDays * 100
  invoiceValue: number; // قيمة الفاتورة الكاملة (شهر كامل)
  proratedValue: number; // قيمة النسبة والتناسب
  totalDue: number; // إجمالي المستحق الآن = اشتراك شهر كامل + prorated
};

function parseISODate(value: string) {
  if (!value) return null;
  const [y, m, d] = value.split("-").map(Number);
  if (!y || !m || !d) return null;
  // نستعمل UTC لتفادي انزياحات الوقت
  return new Date(Date.UTC(y, m - 1, d));
}

function nextAnchorDate(date: Date) {
  const sameMonthAnchor = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 15));
  if (date.getTime() <= sameMonthAnchor.getTime()) return sameMonthAnchor;
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 15));
}

function previousAnchorDate(date: Date) {
  const currentAnchor = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 15));
  if (date.getTime() <= currentAnchor.getTime()) {
    return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() - 1, 15));
  }
  return currentAnchor;
}

function calculateResult(invoiceValueRaw: string, activationRaw: string): ComputedResult | null {
  const invoiceValue =
    invoiceValueRaw.trim() === "" ? NaN : Number(invoiceValueRaw.replace(",", "."));
  const activationDate = parseISODate(activationRaw);

  if (!activationDate || !Number.isFinite(invoiceValue)) return null;

  const nextInvoice = nextAnchorDate(activationDate);
  const previousInvoice = previousAnchorDate(activationDate);

  const cycleMs = nextInvoice.getTime() - previousInvoice.getTime();
  const cycleDays = Math.max(1, Math.round(cycleMs / DAY));

  const usedMs = Math.max(0, nextInvoice.getTime() - activationDate.getTime());
  const rawUsedDays = Math.ceil(usedMs / DAY);
  const usedDays = Math.min(cycleDays, Math.max(0, rawUsedDays));

  const percentage = Math.min(100, Math.max(0, (usedDays / cycleDays) * 100));
  const proratedValue = (invoiceValue * percentage) / 100;

  // آخر يوم تغطية بروراتا (اليوم السابق ليوم 15 القادم)
  const coverageEnd = new Date(nextInvoice.getTime() - DAY);

  const totalDue = invoiceValue + proratedValue;

  return {
    activation: activationDate,
    nextInvoice,
    previousInvoice,
    coverageEnd,
    cycleDays,
    usedDays,
    percentage,
    invoiceValue,
    proratedValue,
    totalDue,
  };
}

const arabicDateFull = new Intl.DateTimeFormat("ar-JO", {
  day: "2-digit",
  month: "long",
  year: "numeric",
});
const arabicDateShort = new Intl.DateTimeFormat("ar-JO", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
});
const currencyJOD = new Intl.NumberFormat("ar-JO", {
  style: "currency",
  currency: "JOD",
  minimumFractionDigits: 3,
});

/**
 * ProRataCalculator
 * - يظهر الشرح النصي فقط إذا showExplanation=true (افتراضياً false حتى ما يطلع بالآلة).
 */
export function ProRataCalculator({ showExplanation = false }: { showExplanation?: boolean }) {
  const [invoiceValue, setInvoiceValue] = useState("");
  const [activationDate, setActivationDate] = useState("");

  const result = useMemo(
    () => calculateResult(invoiceValue, activationDate),
    [invoiceValue, activationDate]
  );

  const percentageDisplay = result ? result.percentage.toFixed(2) : "0.00";

  return (
    <section
      dir="rtl"
      className="space-y-8 rounded-[3rem] border border-white/60 bg-gradient-to-br from-[#FFF2E4]/90 via-[#FFE5D1]/90 to-[#FFD7BA]/85 p-6 sm:p-8 shadow-[0_40px_120px_-60px_rgba(255,120,50,0.5)] backdrop-blur-xl"
    >
      <header className="flex flex-col gap-3 text-right">
        <div className="inline-flex items-center gap-3 self-end rounded-[2rem] bg-white/70 px-5 py-2 text-sm font-medium text-primary shadow-inner">
          <Percent className="h-4 w-4" />
          <span>حساب النسبة والتناسب حتى يوم 15 (فاتورة واحدة)</span>
        </div>
        <h2 className="text-2xl font-semibold text-foreground sm:text-3xl">واجهة نظيفة ومبسطة</h2>
        <p className="max-w-3xl text-sm text-muted-foreground">
          أدخل قيمة الفاتورة الكاملة وتاريخ التفعيل فقط. نحسب لك تلقائيًا النسبة، الأيام، وتاريخ
          الفاتورة القادمة. كل الفواتير تصدر يوم 15 من كل شهر.
        </p>
      </header>

      <div className="grid gap-6 lg:grid-cols-2 lg:items-start">
        {/* النتائج التفصيلية / اليسار في RTL */}
        <motion.div
          layout
          className="order-2 flex flex-col gap-6 rounded-[2.5rem] border border-white/70 bg-white/85 p-6 shadow-[0_30px_90px_-50px_rgba(255,120,50,0.6)] transition-shadow duration-300 lg:order-1"
        >
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <span className="flex h-14 w-14 items-center justify-center rounded-[1.75rem] bg-gradient-to-br from-[#FF9A3D] via-[#FF7A3D] to-[#FF5E3D] text-white shadow-[0_24px_60px_-36px_rgba(255,122,0,0.8)]">
                <Percent className="h-6 w-6" />
              </span>
              <div>
                <p className="text-xs text-muted-foreground">النسبة المستخدمة من الدورة</p>
                <p className="text-3xl font-semibold text-foreground">{percentageDisplay}%</p>
              </div>
            </div>
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="cursor-help text-sm text-primary underline decoration-dotted underline-offset-4">
                  ما معنى النسبة؟
                </span>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="text-right text-sm">
                تمثل النسبة الجزء المحتسب من الدورة الحالية بين يوم 15 السابق ويوم 15 القادم.
              </TooltipContent>
            </Tooltip>
          </div>

          {/* Progress Bar */}
          <div className="space-y-3">
            <div className="flex items-center justify-between text-sm text-muted-foreground">
              <span>تقدّم الدورة</span>
              <span>{percentageDisplay}%</span>
            </div>
            <div className="relative h-3 w-full overflow-hidden rounded-full bg-[#FFEFE2]">
              <motion.div
                key={percentageDisplay}
                initial={{ width: 0 }}
                animate={{ width: `${result ? result.percentage : 0}%` }}
                transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
                className="absolute inset-y-0 right-0 rounded-full bg-gradient-to-l from-[#FF5E3D] via-[#FF7A3D] to-[#FFB36B] shadow-[0_16px_44px_-28px_rgba(255,120,60,0.7)]"
              />
            </div>
          </div>

          {/* بطاقات التفاصيل */}
          <AnimatePresence mode="wait">
            {result ? (
              <motion.div
                key={`${result.nextInvoice.getTime()}-${result.usedDays}`}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
                className="grid gap-4 text-sm text-muted-foreground sm:grid-cols-2"
              >
                <div className="rounded-2xl bg-[#FFF6EF] p-4 shadow-inner">
                  <p className="text-xs text-[#FF8A4C]">تاريخ الفاتورة القادمة</p>
                  <p className="mt-2 text-base font-semibold text-foreground">
                    {arabicDateFull.format(result.nextInvoice)}
                  </p>
                </div>

                <div className="rounded-2xl bg-[#FFF6EF] p-4 shadow-inner">
                  <p className="text-xs text-[#FF8A4C]">الفترة الجزئية المحتسبة</p>
                  <p className="mt-2 text-base font-semibold text-foreground">
                    {arabicDateShort.format(result.activation)} –{" "}
                    {arabicDateShort.format(result.coverageEnd)}
                  </p>
                </div>

                <div className="rounded-2xl bg-[#FFF6EF] p-4 shadow-inner">
                  <p className="text-xs text-[#FF8A4C]">عدد الأيام</p>
                  <p className="mt-2 text-base font-semibold text-foreground">
                    {result.usedDays} يوم من {result.cycleDays}
                  </p>
                </div>

                <div className="rounded-2xl bg-[#FFF6EF] p-4 shadow-inner">
                  <p className="text-xs text-[#FF8A4C]">قيمة النسبة والتناسب</p>
                  <p className="mt-2 text-base font-semibold text-foreground">
                    {currencyJOD.format(result.proratedValue)}
                  </p>
                </div>

                <div className="rounded-2xl bg-[#FFF6EF] p-4 shadow-inner">
                  <p className="text-xs text-[#FF8A4C]">إجمالي المستحق الآن</p>
                  <p className="mt-2 text-base font-semibold text-foreground">
                    {currencyJOD.format(result.totalDue)}
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
                ابدأ بإدخال قيمة الفاتورة وتاريخ التفعيل لعرض التفاصيل تلقائيًا.
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        {/* بيانات الاشتراك / اليمين في RTL */}
        <Card className="order-1 border-white/70 bg-white/85 p-2 shadow-[0_34px_100px_-58px_rgba(255,120,50,0.7)] transition-shadow duration-300 lg:order-2">
          <CardHeader className="pb-2 text-right">
            <CardTitle className="text-lg font-semibold text-foreground">بيانات الإدخال</CardTitle>
            <p className="text-sm text-muted-foreground">الفواتير تصدر تلقائيًا يوم 15 من كل شهر.</p>
          </CardHeader>
          <CardContent className="space-y-6 pt-4 text-right">
            <div className="space-y-2">
              <Label htmlFor="invoice" className="flex items-center justify-end gap-2 text-sm font-semibold">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span className="cursor-help text-primary underline decoration-dotted underline-offset-4">
                      قيمة الفاتورة الكاملة
                    </span>
                  </TooltipTrigger>
                  <TooltipContent side="bottom" className="text-right text-sm">
                    أدخل قيمة الاشتراك الشهري الكامل للحسبة.
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
                  onChange={(e) => {
                    const v = e.target.value;
                    if (/^\\d*(?:[.,]\\d{0,3})?$/.test(v)) setInvoiceValue(v.replace(",", "."));
                  }}
                  className="h-14 rounded-2xl border-white/70 bg-white/90 pr-12 text-base font-medium shadow-inner transition-shadow duration-300 focus-visible:ring-[#FF9A3D]/40 hover:shadow-[0_14px_36px_-28px_rgba(255,145,70,0.5)]"
                />
                <span className="pointer-events-none absolute inset-y-0 right-4 flex items-center text-sm text-muted-foreground">
                  د.أ
                </span>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="activation" className="flex items-center justify-end gap-2 text-sm font-semibold">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span className="cursor-help text-primary underline decoration-dotted underline-offset-4">
                      تاريخ التفعيل
                    </span>
                  </TooltipTrigger>
                  <TooltipContent side="bottom" className="text-right text-sm">
                    اليوم الذي بدأت فيه الخدمة فعليًا؛ نحتسب حتى أقرب يوم 15.
                  </TooltipContent>
                </Tooltip>
                <CalendarDays className="h-4 w-4 text-primary" />
              </Label>
              <Input
                id="activation"
                type="date"
                value={activationDate}
                onChange={(e) => setActivationDate(e.target.value)}
                className="h-14 cursor-pointer rounded-2xl border-white/70 bg-white/90 pr-6 text-base font-medium shadow-inner transition-shadow duration-300 focus-visible:ring-[#FF9A3D]/40 hover:shadow-[0_14px_36px_-28px_rgba(255,145,70,0.5)]"
              />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* الشرح النصي مخفي افتراضيًا حسب طلبك */}
      {showExplanation && result && (
        <motion.div
          key={`ex-${result.totalDue}`}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -14 }}
          transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          className="rounded-[2.5rem] border border-white/60 bg-white/80 p-6 sm:p-8 text-right text-base leading-loose text-foreground shadow-[0_28px_90px_-56px_rgba(255,120,50,0.6)]"
        >
          {`أوضح أن الفاتورة الحالية تشمل قيمة اشتراك شهري كامل (${currencyJOD.format(
            result.invoiceValue
          )}) بالإضافة إلى نسبة وتناسب لفترة من ${arabicDateFull.format(
            result.activation
          )} حتى ${arabicDateFull.format(result.coverageEnd)} بقيمة ${currencyJOD.format(
            result.proratedValue
          )}. إجمالي المستحق الآن: ${currencyJOD.format(result.totalDue)}. الفاتورة التالية تصدر يوم ${arabicDateFull.format(
            result.nextInvoice
          )}.`}
        </motion.div>
      )}
    </section>
  );
}
