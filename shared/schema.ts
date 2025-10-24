import { z } from "zod";

// ============================================================================
// Orange Price Calculator Schemas
// ============================================================================

export const calculatorInputSchema = z.object({
  basePrice: z.number().min(0, "Price must be non-negative").finite(),
});

export type CalculatorInput = z.infer<typeof calculatorInputSchema>;

export interface CalculatorResults {
  base: number;
  nosB_Nos: number;
  voiceCallsOnly: number;
  dataOnly: number;
}

// ============================================================================
// Pro-Rata Calculator Schemas
// ============================================================================

export const proRataInputSchema = z.object({
  activationDate: z.date({
    required_error: "Activation date is required",
  }),
  invoiceIssueDate: z.date({
    required_error: "Invoice issue date is required",
  }),
  monthlySubscriptionValue: z.number().min(0, "Monthly value must be non-negative").finite(),
  fullInvoiceAmount: z.number().min(0, "Invoice amount must be non-negative").finite().optional(),
  endDate: z.date().optional(),
  is15DayCycle: z.boolean().default(true),
});

export type ProRataInput = z.infer<typeof proRataInputSchema>;

export interface ProRataResults {
  cycleDays: number;
  daysUsed: number;
  percentageUsed: number;
  proratedAmount: number;
  monthlyValue: number;
  fullInvoiceAmount?: number;
  activationDate: Date;
  invoiceIssueDate: Date;
  endDate?: Date;
}

// ============================================================================
// Chat Message Schemas
// ============================================================================

export const chatMessageSchema = z.object({
  id: z.string(),
  role: z.enum(["user", "assistant", "system"]),
  content: z.string(),
  timestamp: z.number(),
});

export type ChatMessage = z.infer<typeof chatMessageSchema>;

export const chatRequestSchema = z.object({
  messages: z.array(chatMessageSchema),
});

export type ChatRequest = z.infer<typeof chatRequestSchema>;

// ============================================================================
// Theme & Locale Types
// ============================================================================

export type Theme = "orange" | "dark" | "blossom" | "mint";
export type Locale = "en" | "ar";

// ============================================================================
// Quick Reply Types
// ============================================================================

export interface QuickReply {
  id: string;
  text: {
    en: string;
    ar: string;
  };
}
