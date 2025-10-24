// client/src/components/OrangeCalculator.tsx
// ----------------------------------------------------------------------------
// Production-ready calculator widget. Uses numeric inputs, keypad, and
// shows live results. Results are numbers; formatting happens in ResultCard.
// ----------------------------------------------------------------------------

import { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
  const { locale } = useAppStore();

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
      } catch {
        setResults(null);
      }
    } else {
      setResults(null);
    }
  }, [basePrice]);

  return (
    <div className="space-y-6">
      {/* Title / Subtitle */}
      <div className="flex items-center gap-3">
        <div className="flex items-center justify-center w-12 h-12 rounded-2xl bg-primary text-primary-foreground">
          <Calculator className="h-6 w-6" />
        </div>
        <div>
          <h2 className="text-2xl font-bold" data-testid="text-calc-title">
            {t("calcTitle", locale)}
          </h2>
          <p className="text-sm text-muted-foreground">
            {t("calcSubtitle", locale)}
          </p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Input Section */}
        <Card>
          <CardHeader>
            <CardTitle>{t("basePrice", locale)}</CardTitle>
            <CardDescription>{t("formula", locale)}: A</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
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
            />

            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={handleFullClear}
                className="flex-1 hover-elevate active-elevate-2"
                data-testid="button-clear"
              >
                {t("clear", locale)}
              </Button>
              <Button
                variant="secondary"
                onClick={handleFillExample}
                className="flex-1 hover-elevate active-elevate-2"
                data-testid="button-fill-example"
              >
                {t("fillExample", locale)}
              </Button>
            </div>

            {/* Textual formulae for transparency/help */}
            <div className="text-xs text-muted-foreground font-mono space-y-1 pt-2 border-t">
              <p className="font-semibold">{t("formula", locale)}:</p>
              <p>Nos_b_Nos: {CALCULATOR_FORMULAS.nosB_Nos}</p>
              <p>Voice Calls: {CALCULATOR_FORMULAS.voiceCallsOnly}</p>
              <p>Data Only: {CALCULATOR_FORMULAS.dataOnly}</p>
            </div>
          </CardContent>
        </Card>

        {/* Results Section */}
        <div className="space-y-4">
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
            <Card className="h-full flex items-center justify-center min-h-[400px]">
              <CardContent className="text-center">
                <Calculator className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
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
