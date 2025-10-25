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
// Docs & Chat Schemas
// ============================================================================

export const docEntrySchema = z.object({
  id: z.string(),
  title: z.string(),
  url: z.string(),
  tags: z.array(z.string()).optional(),
});

export type DocEntry = z.infer<typeof docEntrySchema>;

export const chatPayloadSchema = z.discriminatedUnion("kind", [
  z.object({
    kind: z.literal("prorata"),
    locale: z.enum(["en", "ar"]),
    data: z.object({
      period: z.string(),
      proDays: z.string(),
      percent: z.string(),
      monthlyNet: z.string(),
      prorataNet: z.string(),
      invoiceDate: z.string(),
      coverageUntil: z.string(),
      script: z.string(),
      fullInvoiceGross: z.number().optional(),
    }),
  }),
  z.object({
    kind: z.literal("navigate-doc"),
    locale: z.enum(["en", "ar"]),
    doc: docEntrySchema,
    note: z.string().optional(),
  }),
  z.object({
    kind: z.literal("docs-update"),
    locale: z.enum(["en", "ar"]),
    added: z.array(docEntrySchema).default([]),
    updated: z.array(docEntrySchema).default([]),
  }),
]);

export type ChatPayload = z.infer<typeof chatPayloadSchema>;

export const chatMessageSchema = z.object({
  id: z.string(),
  role: z.enum(["user", "assistant", "system"]),
  content: z.string(),
  timestamp: z.number(),
  payload: chatPayloadSchema.optional(),
});

export type ChatMessage = z.infer<typeof chatMessageSchema>;

export const chatRequestSchema = z.object({
  messages: z.array(chatMessageSchema),
  locale: z.enum(["en", "ar"]).optional(),
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
