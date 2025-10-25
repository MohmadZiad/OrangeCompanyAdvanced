// client/src/components/ProRataCalculator.tsx
// ---------------------------------------------------------------------------
// Premium-grade Pro-Rata calculator with bilingual / RTL-aware layout.
// Cards and typography mirror the production mockups shared by Orange.
// ---------------------------------------------------------------------------

import { useEffect, useMemo, useRef, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Copy, CalendarDays, Percent, Receipt, Sparkles } from "lucide-react";
import { useAppStore } from "@/lib/store";
import { computeProrata, buildScript } from "@/lib/proRata";
import { CopyButton } from "@/components/CopyButton";

const VAT_RATE = 0.16;
const ANCHOR_DAY = 15;

type Mode = "gross" | "monthly";
type ProRataResult = ReturnType<typeof computeProrata> | null;
type SetProRataResult = ((result: ProRataResult) => void) | undefined;

const formatDMY = (date: Date) =>
  `${String(date.getUTCDate()).padStart(2, "0")}-${String(
    date.getUTCMonth() + 1
  ).padStart(2, "0")}-${date.getUTCFullYear()}`;

export function ProRataCalculator() {
  const locale = useAppStore((s) => s.locale);
  const setProRataResult = useAppStore(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (s) => (s as any).setProRataResult as SetProRataResult
  );

  const isArabic = locale === "ar";

  const [activation, setActivation] = useState<string>("");
  const [mode, setMode] = useState<Mode>("gross");
  const [gross, setGross] = useState<string>("");
  const [monthly, setMonthly] = useState<string>("");

  const rootRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    rootRef.current?.classList.add("reveal-visible");
  }, []);

  const sanitizeNumber = (value: string) => (value.trim() === "" ? NaN : Number(value));
  const acceptNumber = (value: string) => /^\d*\.?\d*$/.test(value);

  const canCalculate =
    Boolean(activation) &&
    ((mode === "gross" && Number.isFinite(sanitizeNumber(gross))) ||
      (mode === "monthly" && Number.isFinite(sanitizeNumber(monthly))));

  const result = useMemo(() => {
    if (!canCalculate) return null;

    if (mode === "gross") {
      return computeProrata({
        mode: "gross",
        activationDate: activation,
        fullInvoiceGross: sanitizeNumber(gross),
        vatRate: VAT_RATE,
        anchorDay: ANCHOR_DAY,
      });
    }

    return computeProrata({
      mode: "monthly",
      activationDate: activation,
      monthlyNet: sanitizeNumber(monthly),
      vatRate: VAT_RATE,
      anchorDay: ANCHOR_DAY,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activation, gross, monthly, mode]);

  const script = useMemo(() => {
    if (!result) return "";
    return buildScript(result, isArabic ? "ar" : "en");
  }, [result, isArabic]);

  useEffect(() => {
    if (!setProRataResult) return;
    setProRataResult(result);
    return () => {
      if (result) setProRataResult(null);
    };
  }, [result, setProRataResult]);

  const totalNet = result ? result.prorataNet + result.monthlyNet : 0;

  return (
    <section ref={rootRef} dir={isArabic ? "rtl" : "ltr"} className="space-y-8">
      <header className="flex flex-col gap-2 rounded-[2.5rem] border border-white/50 bg-gradient-to-br from-[#FFE9D6]/90 via-[#FFE0C6]/85 to-[#FFD0AA]/90 px-8 py-6 shadow-[0_32px_90px_-45px_rgba(255,90,0,0.55)] backdrop-blur-xl dark:from-white/10 dark:via-white/10 dark:to-white/5">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <span className="flex h-16 w-16 items-center justify-center rounded-[1.75rem] bg-gradient-to-br from-[#FF7A00] via-[#FF5400] to-[#FF3C00] text-white shadow-[0_26px_64px_-34px_rgba(255,90,0,0.75)]">
              <Percent className="h-7 w-7" />
            </span>
            <div className="space-y-1">
              <h2 className="text-2xl font-semibold">
                {isArabic ? "حساب النسبة والتناسب حتى يوم 15" : "15-day pro-rata calculator"}
              </h2>
              <p className="text-sm text-muted-foreground">
                {isArabic
                  ? "أدخل تاريخ التفعيل واختر طريقة الحساب لإظهار قيم دقيقة باللغتين"
                  : "Choose how you bill the line and get precise bilingual breakdowns."}
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
            <div className="flex items-center gap-2 rounded-full bg-white/70 px-4 py-2 shadow-inner backdrop-blur">
              <CalendarDays className="h-4 w-4 text-primary" />
              <span>{isArabic ? "الدورة ثابتة يوم 15" : "Anchor day is always the 15th"}</span>
            </div>
            <div className="flex items-center gap-2 rounded-full bg-white/70 px-4 py-2 shadow-inner backdrop-blur">
              <Sparkles className="h-4 w-4 text-primary" />
              <span>{isArabic ? "الضريبة محسوبة تلقائيًا %16" : "VAT auto-applied at 16%"}</span>
            </div>
          </div>
        </div>
      </header>

      <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <Card className="border-white/60 bg-white/80 shadow-[0_28px_80px_-46px_rgba(255,90,0,0.55)] backdrop-blur-xl dark:bg-white/10">
          <CardHeader className="pb-0">
            <CardTitle className="flex items-center gap-3 text-lg">
              <span className="flex h-12 w-12 items-center justify-center rounded-[1.4rem] bg-gradient-to-br from-[#FF7A00] via-[#FF5400] to-[#FF3C00] text-white shadow-[0_22px_48px_-30px_rgba(255,90,0,0.75)]">
                <Receipt className="h-5 w-5" />
              </span>
              {isArabic ? "بيانات الاشتراك" : "Subscription details"}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-8 pt-6">
            <div className="grid gap-6 lg:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="activation" className="flex items-center gap-2 text-sm font-semibold">
                  <CalendarDays className="h-4 w-4 text-primary" />
                  {isArabic ? "تاريخ التفعيل" : "Activation date"}
                </Label>
                <Input
                  id="activation"
                  type="date"
                  value={activation}
                  onChange={(e) => setActivation(e.target.value)}
                  className="h-14 rounded-2xl border-white/70 bg-white/90 text-base shadow-inner focus-visible:ring-primary/40"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-semibold">
                  {isArabic ? "طريقة الحساب" : "Billing input"}
                </Label>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant={mode === "gross" ? "default" : "outline"}
                    className="flex-1 rounded-2xl border-white/70 bg-gradient-to-br from-[#FF7A00]/90 via-[#FF5C00]/85 to-[#FF3C00]/90 text-white shadow-[0_18px_42px_-28px_rgba(255,90,0,0.75)] transition-transform duration-200 hover:-translate-y-0.5"
                    onClick={() => setMode("gross")}
                  >
                    {isArabic ? "فاتورة كاملة (شامل الضريبة)" : "Full invoice (gross)"}
                  </Button>
                  <Button
                    type="button"
                    variant={mode === "monthly" ? "default" : "outline"}
                    className="flex-1 rounded-2xl border-white/70 bg-white/90 text-foreground shadow-inner transition-transform duration-200 hover:-translate-y-0.5"
                    onClick={() => setMode("monthly")}
                  >
                    {isArabic ? "اشتراك شهري (صافي)" : "Monthly net"}
                  </Button>
                </div>
              </div>
            </div>

            <div className="grid gap-6 lg:grid-cols-2">
              {mode === "gross" ? (
                <div className="space-y-2">
                  <Label htmlFor="gross" className="text-sm font-semibold">
                    {isArabic ? "قيمة الفاتورة (شامل الضريبة)" : "Invoice amount with VAT"}
                  </Label>
                  <Input
                    id="gross"
                    inputMode="decimal"
                    placeholder="0.000"
                    value={gross}
                    onChange={(e) => acceptNumber(e.target.value) && setGross(e.target.value)}
                    className="h-14 rounded-2xl border-white/70 bg-white/90 text-base shadow-inner focus-visible:ring-primary/40"
                  />
                </div>
              ) : (
                <div className="space-y-2">
                  <Label htmlFor="monthly" className="text-sm font-semibold">
                    {isArabic ? "قيمة الاشتراك الشهري (صافي)" : "Monthly subscription (net)"}
                  </Label>
                  <Input
                    id="monthly"
                    inputMode="decimal"
                    placeholder="0.000"
                    value={monthly}
                    onChange={(e) => acceptNumber(e.target.value) && setMonthly(e.target.value)}
                    className="h-14 rounded-2xl border-white/70 bg-white/90 text-base shadow-inner focus-visible:ring-primary/40"
                  />
                </div>
              )}

              <div className="flex flex-col justify-between rounded-[2rem] border border-dashed border-white/70 bg-gradient-to-br from-white/70 via-white/60 to-white/70 p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.7)]">
                <p className="text-sm text-muted-foreground">
                  {isArabic
                    ? "تأكد من إدخال قيمة واحدة فقط: إما الفاتورة الكاملة أو الاشتراك الشهري الصافي."
                    : "Provide either the full invoice (gross) or the monthly net. No need for both."}
                </p>
                <div className="mt-4 flex items-center gap-3 text-xs text-muted-foreground">
                  <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-[#FF7A00]/15 via-[#FF5400]/15 to-[#FF3C00]/15 text-primary">
                    <Percent className="h-4 w-4" />
                  </span>
                  <span>
                    {isArabic
                      ? "النسبة والتناسب يحسب الأيام المتبقية حتى يوم 15 القادم"
                      : "Pro-rata covers the remaining days up to the next 15th."}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-white/60 pt-4 text-xs text-muted-foreground">
              <div className="flex items-center gap-2">
                <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-[#FF7A00]/10 via-[#FF5400]/10 to-[#FF3C00]/10 text-primary">
                  <Percent className="h-3.5 w-3.5" />
                </span>
                <span>{isArabic ? "الضريبة 16% مضافة تلقائيًا" : "VAT 16% applied automatically."}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-[#FF7A00]/10 via-[#FF5400]/10 to-[#FF3C00]/10 text-primary">
                  <CalendarDays className="h-3.5 w-3.5" />
                </span>
                <span>{isArabic ? "مدة الدورة: 15 يومًا" : "Cycle length: 15 days."}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card className="border-white/60 bg-white/85 shadow-[0_28px_80px_-50px_rgba(255,90,0,0.55)] backdrop-blur-xl dark:bg-white/10">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-0">
              <CardTitle className="flex items-center gap-3 text-lg">
                <span className="flex h-12 w-12 items-center justify-center rounded-[1.4rem] bg-gradient-to-br from-[#FF7A00] via-[#FF5400] to-[#FF3C00] text-white shadow-[0_22px_48px_-30px_rgba(255,90,0,0.75)]">
                  <Sparkles className="h-5 w-5" />
                </span>
                {isArabic ? "النتائج التفصيلية" : "Detailed results"}
              </CardTitle>
              {result && (
                <span className="rounded-full bg-gradient-to-r from-[#FF7A00]/20 to-[#FF3C00]/20 px-4 py-1 text-xs font-semibold text-primary">
                  {isArabic ? "جاهز للمشاركة" : "Share-ready"}
                </span>
              )}
            </CardHeader>
            {result ? (
              <CardContent className="space-y-6 pt-6">
                <div className="rounded-[2rem] border border-white/65 bg-gradient-to-br from-[#FFE3CB]/75 via-[#FFEBD8]/80 to-[#FFE7D1]/80 p-6 shadow-inner">
                  <p className="text-xs uppercase tracking-[0.28em] text-muted-foreground">
                    {isArabic ? "النسبة المستخدمة" : "percentage used"}
                  </p>
                  <div className="mt-3 flex flex-wrap items-end justify-between gap-4">
                    <div>
                      <p className="text-4xl font-semibold text-primary">
                        {result.pctText}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {isArabic ? "من دورة ١٥ يومًا" : "of the 15-day cycle"}
                      </p>
                    </div>
                    <div className="rounded-2xl bg-white/75 px-4 py-3 text-sm shadow-sm backdrop-blur">
                      <span className="font-semibold">
                        {result.proDays} / {result.cycleDays}
                      </span>
                      <span className="ms-2 text-muted-foreground">
                        {isArabic ? "أيام محسوبة" : "days counted"}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <MetricChip
                    label={isArabic ? "الفترة" : "Period"}
                    value={`${formatDMY(result.cycleStartUTC)} → ${formatDMY(result.cycleEndUTC)}`}
                  />
                  <MetricChip
                    label={isArabic ? "قيمة البروراتا" : "Pro-rata (net)"}
                    value={result.prorataNetText}
                  />
                  <MetricChip
                    label={isArabic ? "الاشتراك الشهري" : "Monthly (net)"}
                    value={result.monthlyNetText}
                  />
                  <MetricChip
                    label={isArabic ? "الإجمالي الصافي" : "Total (net)"}
                    value={`JD ${totalNet.toFixed(3)}`}
                  />
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <MetricChip
                    label={isArabic ? "تاريخ إصدار الفاتورة" : "Invoice date"}
                    value={formatDMY(result.cycleEndUTC)}
                  />
                  <MetricChip
                    label={isArabic ? "التغطية حتى" : "Coverage until"}
                    value={formatDMY(result.nextCycleEndUTC)}
                  />
                  {typeof result.fullInvoiceGross === "number" && (
                    <MetricChip
                      label={isArabic ? "الاشتراك الشامل للضريبة" : "Full invoice (gross)"}
                      value={`JD ${result.fullInvoiceGross.toFixed(3)}`}
                    />
                  )}
                </div>
              </CardContent>
            ) : (
              <CardContent className="flex min-h-[320px] flex-col items-center justify-center gap-4 text-center text-muted-foreground">
                <span className="flex h-20 w-20 items-center justify-center rounded-[2rem] bg-gradient-to-br from-[#FF7A00]/15 via-[#FF5400]/15 to-[#FF3C00]/15">
                  <Percent className="h-10 w-10 text-primary" />
                </span>
                <p className="max-w-sm text-sm leading-6">
                  {isArabic
                    ? "أدخل تاريخ التفعيل والقيمة المطلوبة لعرض النتائج التفصيلية."
                    : "Add the activation date and amount to generate a full bilingual breakdown."}
                </p>
              </CardContent>
            )}
          </Card>

          <Card className="border-white/60 bg-white/85 shadow-[0_28px_80px_-54px_rgba(255,90,0,0.55)] backdrop-blur-xl dark:bg-white/10">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-0">
              <CardTitle className="text-lg font-semibold">
                {isArabic ? "النص الجاهز للنسخ" : "Ready-to-share script"}
              </CardTitle>
              <CopyButton
                text={script}
                label={isArabic ? "نسخ النص" : "Copy script"}
                variant="secondary"
                className="rounded-full bg-gradient-to-r from-[#FF7A00] via-[#FF5400] to-[#FF3C00] text-white shadow-[0_20px_50px_-30px_rgba(255,90,0,0.75)] hover:from-[#FF6A00] hover:to-[#FF3C00]"
              />
            </CardHeader>
            <CardContent className="pt-6">
              {result ? (
                <pre className="max-h-[360px] overflow-y-auto whitespace-pre-wrap rounded-[2.2rem] border border-white/70 bg-gradient-to-br from-white/90 via-white/85 to-white/90 px-6 py-5 text-sm leading-7 text-foreground shadow-inner backdrop-blur">
{script || (isArabic
                    ? "أدخل بيانات البروراتا لعرض السكربت الجاهز."
                    : "Fill in the pro-rata details to display the scripted response.")}
                </pre>
              ) : (
                <div className="flex min-h-[220px] flex-col items-center justify-center gap-3 rounded-[2.2rem] border border-dashed border-white/70 bg-white/60 px-6 py-5 text-center text-sm text-muted-foreground">
                  <Copy className="h-6 w-6" />
                  {isArabic
                    ? "سيظهر هنا نص جاهز باللغتين بمجرد إدخال البيانات وحساب البروراتا."
                    : "Once you calculate, a bilingual script will appear here ready to copy."}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </section>
  );
}

function MetricChip({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-[1.8rem] border border-white/65 bg-white/80 px-5 py-4 text-sm shadow-[0_18px_44px_-36px_rgba(255,90,0,0.4)] backdrop-blur">
      <p className="text-xs uppercase tracking-[0.25em] text-muted-foreground">{label}</p>
      <p className="mt-2 font-semibold text-foreground">{value}</p>
    </div>
  );
}
