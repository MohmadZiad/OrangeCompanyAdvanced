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
    <div className="grid gap-6 lg:grid-cols-12">
      {/* Inputs */}
      <Card className="lg:col-span-5">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Receipt className="h-5 w-5 text-primary" />
            {L ? "المدخلات" : "Inputs"}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
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
          <div className="flex gap-2">
            <Button
              type="button"
              variant={mode === "gross" ? "default" : "outline"}
              className="flex-1 hover-elevate active-elevate-2"
              onClick={() => setMode("gross")}
            >
              {L ? "فاتورة كاملة (شامل الضريبة)" : "Full Invoice (with VAT)"}
            </Button>
            <Button
              type="button"
              variant={mode === "monthly" ? "default" : "outline"}
              className="flex-1 hover-elevate active-elevate-2"
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
      <Card className="lg:col-span-7">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Percent className="h-5 w-5 text-primary" />
            {L ? "النتائج" : "Results"}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {result ? (
            <>
              {/* KPIs */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="rounded-xl bg-muted p-4">
                  <div className="text-xs text-muted-foreground">
                    {L ? "الفترة" : "Period"}
                  </div>
                  <div className="mt-1 font-mono text-base">
                    {result.cycleRangeText}
                  </div>
                </div>
                <div className="rounded-xl bg-muted p-4">
                  <div className="text-xs text-muted-foreground">
                    {L ? "أيام البروراتا/الدورة" : "Pro-days / Cycle"}
                  </div>
                  <div className="mt-1 font-mono text-base">
                    {result.proDaysText}
                  </div>
                </div>
                <div className="rounded-xl bg-muted p-4">
                  <div className="text-xs text-muted-foreground">
                    {L ? "النسبة %" : "Percent"}
                  </div>
                  <div className="mt-1 font-mono text-base">
                    {result.pctText}
                  </div>
                </div>
                <div className="rounded-xl bg-muted p-4">
                  <div className="text-xs text-muted-foreground">
                    {L ? "الاشتراك الشهري" : "Monthly (net)"}
                  </div>
                  <div className="mt-1 font-mono text-base">
                    {result.monthlyNetText}
                  </div>
                </div>
              </div>

              {/* Values */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="rounded-xl border p-4">
                  <div className="text-xs text-muted-foreground">
                    {L ? "قيمة البروراتا" : "Pro-rata (net)"}
                  </div>
                  <div className="mt-1 font-mono text-xl">
                    {result.prorataNetText}
                  </div>
                </div>
                <div className="rounded-xl border p-4">
                  <div className="text-xs text-muted-foreground">
                    {L ? "تاريخ إصدار الفاتورة" : "Invoice Issue Date"}
                  </div>
                  <div className="mt-1 font-mono text-xl">
                    {ymd(result.cycleEndUTC)}
                  </div>
                </div>
              </div>

              {/* Script (old style) */}
              <div className="rounded-xl border p-4">
                <div className="flex items-center justify-between mb-2">
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
            <div className="text-center py-10 text-muted-foreground">
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
