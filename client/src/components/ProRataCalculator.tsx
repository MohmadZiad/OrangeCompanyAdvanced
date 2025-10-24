// client/src/components/ProRataCalculator.tsx
// ---------------------------------------------------------------------------
// Production UI (old behavior & layout):
// - Fixed cycle on the 15th.
// - Inputs: Activation Date + either Full Invoice (gross, with VAT) OR Monthly (net).
// - Results: KPIs + script (AR/EN) identical to the old app style.
// ---------------------------------------------------------------------------

import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Copy, Receipt, CalendarDays, Percent } from "lucide-react";
import { useAppStore } from "@/lib/store";
import { computeProrata, buildScript, ymd } from "@/lib/proRata";

type Mode = "gross" | "monthly";

export function ProRataCalculator() {
  const { locale } = useAppStore();
  const L = locale === "ar";

  // UI state
  const [activation, setActivation] = useState<string>("");
  const [mode, setMode] = useState<Mode>("gross");
  const [gross, setGross] = useState<string>("");
  const [monthly, setMonthly] = useState<string>("");

  const vatRate = 0.16;
  const anchorDay = 15;

  const toNum = (s: string) => (s.trim() === "" ? NaN : Number(s));
  const numOK = (v: string) => /^\d*\.?\d*$/.test(v);

  const canCalc =
    !!activation &&
    ((mode === "gross" && Number.isFinite(toNum(gross))) ||
      (mode === "monthly" && Number.isFinite(toNum(monthly))));

  const result = useMemo(() => {
    if (!canCalc) return null;
    if (mode === "gross") {
      return computeProrata({
        mode: "gross",
        activationDate: activation,
        fullInvoiceGross: toNum(gross),
        vatRate,
        anchorDay,
      });
    }
    return computeProrata({
      mode: "monthly",
      activationDate: activation,
      monthlyNet: toNum(monthly),
      vatRate,
      anchorDay,
    });
  }, [activation, gross, monthly, mode]);

  const script = useMemo(() => {
    if (!result) return "";
    return buildScript(result, L ? "ar" : "en");
  }, [result, L]);

  const copyText = async () => {
    try {
      await navigator.clipboard.writeText(script);
      // silent success (no toast dependency)
    } catch {
      // ignore
    }
  };

  return (
    <div className="grid gap-8 lg:grid-cols-12" data-reveal>
      {/* Inputs */}
      <Card className="lg:col-span-5 border-white/60 bg-white/70 dark:bg-white/10">
        <CardHeader>
          <CardTitle className="flex items-center gap-3 text-lg">
            <span className="flex h-12 w-12 items-center justify-center rounded-3xl bg-gradient-to-br from-[#FF7A00] via-[#FF5400] to-[#FF3C00] text-white shadow-[0_22px_48px_-30px_rgba(255,90,0,0.75)]">
              <Receipt className="h-5 w-5" />
            </span>
            {L ? "المدخلات" : "Inputs"}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Activation */}
          <div className="space-y-2">
            <Label htmlFor="activation" className="flex items-center gap-2">
              <CalendarDays className="h-4 w-4" />
              {L ? "تاريخ التفعيل" : "Activation Date"}
            </Label>
            <Input
              id="activation"
              type="date"
              value={activation}
              onChange={(e) => setActivation(e.target.value)}
            />
          </div>

          {/* Mode */}
          <div className="flex flex-col gap-2 sm:flex-row">
            <Button
              type="button"
              variant={mode === "gross" ? "default" : "outline"}
              className="flex-1"
              onClick={() => setMode("gross")}
            >
              {L ? "فاتورة كاملة (شامل الضريبة)" : "Full Invoice (with VAT)"}
            </Button>
            <Button
              type="button"
              variant={mode === "monthly" ? "default" : "outline"}
              className="flex-1"
              onClick={() => setMode("monthly")}
            >
              {L ? "اشتراك شهري (صافي)" : "Monthly (net)"}
            </Button>
          </div>

          {/* Amount */}
          {mode === "gross" ? (
            <div className="space-y-2">
              <Label htmlFor="gross">
                {L
                  ? "قيمة الفاتورة (شامل الضريبة)"
                  : "Full Invoice Amount (with VAT)"}
              </Label>
              <Input
                id="gross"
                inputMode="decimal"
                placeholder="0.00"
                value={gross}
                onChange={(e) =>
                  numOK(e.target.value) && setGross(e.target.value)
                }
              />
              <p className="text-xs text-muted-foreground">
                {L
                  ? "الدورة ثابتة يوم 15، والضريبة مفترضة 16%"
                  : "Cycle fixed on the 15th; VAT assumed 16%."}
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              <Label htmlFor="monthly">
                {L
                  ? "قيمة الاشتراك الشهري (صافي)"
                  : "Monthly Subscription (net)"}
              </Label>
              <Input
                id="monthly"
                inputMode="decimal"
                placeholder="0.00"
                value={monthly}
                onChange={(e) =>
                  numOK(e.target.value) && setMonthly(e.target.value)
                }
              />
              <p className="text-xs text-muted-foreground">
                {L ? "الدورة ثابتة يوم 15" : "Cycle fixed on the 15th."}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Results */}
      <Card className="lg:col-span-7 border-white/60 bg-white/70 dark:bg-white/10">
        <CardHeader>
          <CardTitle className="flex items-center gap-3 text-lg">
            <span className="flex h-12 w-12 items-center justify-center rounded-3xl bg-gradient-to-br from-[#FF7A00] via-[#FF5400] to-[#FF3C00] text-white shadow-[0_22px_48px_-30px_rgba(255,90,0,0.75)]">
              <Percent className="h-5 w-5" />
            </span>
            {L ? "النتائج" : "Results"}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {result ? (
            <>
              {/* KPIs */}
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                <div className="rounded-3xl border border-white/50 bg-white/70 p-4 shadow-inner backdrop-blur dark:bg-white/5">
                  <div className="text-xs text-muted-foreground">
                    {L ? "الفترة" : "Period"}
                  </div>
                  <div className="mt-1 font-mono text-base">
                    {result.cycleRangeText}
                  </div>
                </div>
                <div className="rounded-3xl border border-white/50 bg-white/70 p-4 shadow-inner backdrop-blur dark:bg-white/5">
                  <div className="text-xs text-muted-foreground">
                    {L ? "أيام البروراتا/الدورة" : "Pro-days / Cycle"}
                  </div>
                  <div className="mt-1 font-mono text-base">
                    {result.proDaysText}
                  </div>
                </div>
                <div className="rounded-3xl border border-white/50 bg-white/70 p-4 shadow-inner backdrop-blur dark:bg-white/5">
                  <div className="text-xs text-muted-foreground">
                    {L ? "النسبة %" : "Percent"}
                  </div>
                  <div className="mt-1 font-mono text-base">
                    {result.pctText}
                  </div>
                </div>
                <div className="rounded-3xl border border-white/50 bg-white/70 p-4 shadow-inner backdrop-blur dark:bg-white/5">
                  <div className="text-xs text-muted-foreground">
                    {L ? "الاشتراك الشهري" : "Monthly (net)"}
                  </div>
                  <div className="mt-1 font-mono text-base">
                    {result.monthlyNetText}
                  </div>
                </div>
              </div>

              {/* Values */}
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="rounded-3xl border border-white/60 bg-white/80 p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.6)] backdrop-blur dark:bg-white/10">
                  <div className="text-xs text-muted-foreground">
                    {L ? "قيمة البروراتا" : "Pro-rata (net)"}
                  </div>
                  <div className="mt-1 font-mono text-xl">
                    {result.prorataNetText}
                  </div>
                </div>
                <div className="rounded-3xl border border-white/60 bg-white/80 p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.6)] backdrop-blur dark:bg-white/10">
                  <div className="text-xs text-muted-foreground">
                    {L ? "تاريخ إصدار الفاتورة" : "Invoice Issue Date"}
                  </div>
                  <div className="mt-1 font-mono text-xl">
                    {ymd(result.cycleEndUTC)}
                  </div>
                </div>
              </div>

              {/* Script (old style) */}
              <div className="rounded-3xl border border-white/60 bg-white/80 p-5 shadow-[0_22px_48px_-32px_rgba(255,90,0,0.35)] backdrop-blur dark:bg-white/10">
                <div className="mb-2 flex items-center justify-between">
                  <div className="text-sm font-medium">
                    {L ? "السكربت" : "Script"}
                  </div>
                  <Button
                    type="button"
                    size="sm"
                    variant="secondary"
                    onClick={copyText}
                  >
                    <Copy className="h-4 w-4 mr-1" />
                    {L ? "نسخ" : "Copy"}
                  </Button>
                </div>
                <pre className="whitespace-pre-wrap text-sm font-mono leading-6">
                  {script}
                </pre>
              </div>
            </>
          ) : (
            <div className="rounded-3xl border border-dashed border-white/60 bg-white/50 py-10 text-center text-muted-foreground backdrop-blur dark:bg-white/5">
              {L
                ? "أدخل تاريخ التفعيل والمبلغ لعرض النتائج"
                : "Enter activation date and amount to see results."}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
