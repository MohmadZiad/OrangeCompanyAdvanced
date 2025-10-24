import type { CalculatorInput, CalculatorResults } from "@shared/schema";

/**
 * Orange Price Calculator formulas
 * 
 * Given base price A:
 * - Base: A
 * - Nos_b_Nos: A + (A/2 × 0.4616) + (A/2 × 0.16)
 * - Voice_Calls_Only: A × 1.4616
 * - Data_Only: A × 1.16
 */

export function calculateOrangePricing(input: CalculatorInput): CalculatorResults {
  const { basePrice } = input;
  
  if (basePrice < 0 || !isFinite(basePrice)) {
    throw new Error("Base price must be a non-negative finite number");
  }

  const base = basePrice;
  const nosB_Nos = base + (base / 2 * 0.4616) + (base / 2 * 0.16);
  const voiceCallsOnly = base * 1.4616;
  const dataOnly = base * 1.16;

  return {
    base: Number(base.toFixed(2)),
    nosB_Nos: Number(nosB_Nos.toFixed(2)),
    voiceCallsOnly: Number(voiceCallsOnly.toFixed(2)),
    dataOnly: Number(dataOnly.toFixed(2)),
  };
}

export const CALCULATOR_FORMULAS = {
  base: "A",
  nosB_Nos: "A + (A/2 × 0.4616) + (A/2 × 0.16)",
  voiceCallsOnly: "A × 1.4616",
  dataOnly: "A × 1.16",
} as const;
