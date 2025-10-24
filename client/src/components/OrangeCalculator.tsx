// client/src/components/OrangeCalculator.tsx
// ----------------------------------------------------------------------------
// Production-ready calculator widget. Uses numeric inputs, keypad, and
// shows live results. Results are numbers; formatting happens in ResultCard.
// ----------------------------------------------------------------------------

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { NumericKeypad } from "./NumericKeypad";
import { ResultCard } from "./ResultCard";
import { calculateOrangePricing, CALCULATOR_FORMULAS } from "@/lib/calc";
import { useAppStore } from "@/lib/store";
import { t } from "@/lib/i18n";
import { Calculator } from "lucide-react";
import type { CalculatorResults } from "@shared/schema";

export function OrangeCalculator() {
  const [basePrice, setBasePrice] = useState<string>("");
  const [results, setResults] = useState<CalculatorResults | null>(null);
  const { locale, setCalculatorResults } = useAppStore();

  // Append keypad digits (keep single dot)
  const handleNumberClick = (num: string) => {
    if (num === "." && basePrice.includes(".")) return;
    setBasePrice((prev) => prev + num);
  };

  const handleClear = () => {
    if (basePrice.length > 0) setBasePrice((prev) => prev.slice(0, -1));
  };

  const handleFullClear = () => {
    setBasePrice("");
    setResults(null);
  };

  const handleFillExample = () => setBasePrice("100");

  // Manual typing guard: allow only numbers + one dot
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    if (/^\d*\.?\d*$/.test(value)) setBasePrice(value);
  };

  /** Recalculate on every input change (numbers in/out; no formatting here) */
  useEffect(() => {
    const n = parseFloat(basePrice);
    if (basePrice && !Number.isNaN(n)) {
      try {
        const out = calculateOrangePricing({ basePrice: n });
        const result: CalculatorResults = {
          base: out.base,
          nosB_Nos: out.nosB_Nos,
          voiceCallsOnly: out.voiceCallsOnly,
          dataOnly: out.dataOnly,
        };
        setResults(result);
        setCalculatorResults(result);
      } catch {
        setResults(null);
        setCalculatorResults(null);
      }
    } else {
      setResults(null);
      setCalculatorResults(null);
    }
  }, [basePrice, setCalculatorResults]);

  return (
    <div className="space-y-8">
      {/* Title / Subtitle */}
      <div className="flex flex-wrap items-center gap-4 rounded-3xl border border-white/60 bg-white/60 px-6 py-5 shadow-[0_20px_45px_-32px_rgba(255,90,0,0.45)] backdrop-blur-xl dark:bg-white/10">
        <div className="flex h-14 w-14 items-center justify-center rounded-3xl bg-gradient-to-br from-[#FF7A00] via-[#FF5400] to-[#FF3C00] text-white shadow-[0_24px_60px_-34px_rgba(255,90,0,0.75)]">
          <Calculator className="h-6 w-6" />
        </div>
        <div className="flex-1 min-w-[220px]">
          <h2 className="text-2xl font-semibold" data-testid="text-calc-title">
            {t("calcTitle", locale)}
          </h2>
          <p className="text-sm text-muted-foreground">
            {t("calcSubtitle", locale)}
          </p>
        </div>
      </div>

      <div className="grid gap-8 lg:grid-cols-2">
        {/* Input Section */}
        <Card className="border-white/60 bg-white/70 dark:bg-white/10">
          <CardHeader>
            <CardTitle className="flex items-center justify-between text-lg">
              <span>{t("basePrice", locale)}</span>
              <span className="rounded-full bg-white/60 px-3 py-1 text-xs font-medium text-muted-foreground backdrop-blur-sm dark:bg-white/10">
                {t("formula", locale)}: A
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="base-price-input">{t("basePrice", locale)}</Label>
              <Input
                id="base-price-input"
                type="text"
                inputMode="decimal"
                value={basePrice}
                onChange={handleInputChange}
                placeholder="0.00"
                className="text-2xl font-mono h-14"
                data-testid="input-base-price"
                aria-label="Base price input"
              />
            </div>

            <NumericKeypad
              onNumberClick={handleNumberClick}
              onClear={handleClear}
              className="pt-1"
            />

            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={handleFullClear}
                className="flex-1"
                data-testid="button-clear"
              >
                {t("clear", locale)}
              </Button>
              <Button
                variant="secondary"
                onClick={handleFillExample}
                className="flex-1"
                data-testid="button-fill-example"
              >
                {t("fillExample", locale)}
              </Button>
            </div>

            {/* Textual formulae for transparency/help */}
            <div className="neumorph-soft rounded-3xl border border-white/60 p-4 text-xs font-mono text-muted-foreground backdrop-blur dark:bg-white/5">
              <p className="font-semibold">{t("formula", locale)}:</p>
              <p>Nos_b_Nos: {CALCULATOR_FORMULAS.nosB_Nos}</p>
              <p>Voice Calls: {CALCULATOR_FORMULAS.voiceCallsOnly}</p>
              <p>Data Only: {CALCULATOR_FORMULAS.dataOnly}</p>
            </div>
          </CardContent>
        </Card>

        {/* Results Section */}
        <div className="space-y-4" data-reveal>
          {results ? (
            <>
              <ResultCard
                title={t("basePriceLabel", locale)}
                value={results.base}
                formula={CALCULATOR_FORMULAS.base}
                index={0}
              />
              <ResultCard
                title={t("nosB_NosLabel", locale)}
                value={results.nosB_Nos}
                formula={CALCULATOR_FORMULAS.nosB_Nos}
                index={1}
              />
              <ResultCard
                title={t("voiceCallsOnlyLabel", locale)}
                value={results.voiceCallsOnly}
                formula={CALCULATOR_FORMULAS.voiceCallsOnly}
                index={2}
              />
              <ResultCard
                title={t("dataOnlyLabel", locale)}
                value={results.dataOnly}
                formula={CALCULATOR_FORMULAS.dataOnly}
                index={3}
              />
            </>
            ) : (
            <Card className="flex min-h-[400px] items-center justify-center border-dashed border-white/50 bg-white/60 text-center shadow-none backdrop-blur-xl dark:bg-white/5">
              <CardContent className="space-y-4 text-center">
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl bg-gradient-to-br from-[#FF7A00]/30 to-[#FF3C00]/30">
                  <Calculator className="h-8 w-8 text-primary" />
                </div>
                <p className="text-muted-foreground">
                  {t("noResults", locale)}
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
