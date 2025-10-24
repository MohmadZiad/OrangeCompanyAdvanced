import type { SmartLinkId } from "@shared/smartLinks";

export interface KnowledgeEntry {
  id: string;
  title: string;
  body: string;
  keywords: string[];
  linkId?: SmartLinkId;
}

export const KNOWLEDGE: KnowledgeEntry[] = [
  {
    id: "pricing-basics",
    title: "Orange Price Calculator formulas",
    body:
      "Base price is A. Nos_b_Nos = A × 1.3108 (legacy breakdown: A + (A/2 × 0.4616) + (A/2 × 0.16)). Voice Calls Only = A × 1.4616. Data Only = A × 1.16. Present all monetary values in Jordanian Dinars (JD) with two decimals unless the user needs more precision.",
    keywords: ["nos", "price", "calculator", "card", "base"],
    linkId: "plans-overview",
  },
  {
    id: "pricing-card-definition",
    title: "What is the Orange card value",
    body:
      "When a user asks for the card price, return the base price (A) as entered in the calculator. Highlight how Nos_b_Nos, Voice Calls Only, and Data Only differ from the base. Offer to compute them if the base value is known.",
    keywords: ["card", "card price", "how much", "cost"],
    linkId: "upgrade-card",
  },
  {
    id: "pro-rata-formula",
    title: "15-day pro-rata calculation",
    body:
      "Orange uses a fixed 15-day billing cycle. Days used = clamp(invoiceOrAnchorDate − activationDate, 0, 15). Pro-rata (net) = (Monthly Subscription Value × Days Used) / 15. Present the percentage as (Days Used ÷ 15) × 100. Always mention the cycle coverage dates and the invoice issue date (15th).",
    keywords: ["pro", "prorata", "pro-rata", "billing", "cycle", "15"],
    linkId: "pro-rata-faq",
  },
  {
    id: "pro-rata-guidance",
    title: "Explaining prorated invoices",
    body:
      "Explain that the first invoice covers service until the next 15th. Clarify that VAT is already baked into the full invoice amount if provided, but the pro-rata formula works on the net monthly value. Offer to guide the user to enter activation date and monthly value correctly.",
    keywords: ["invoice", "prorated", "vat", "tax", "explain"],
  },
  {
    id: "assistant-capabilities",
    title: "Assistant behaviour",
    body:
      "You are bilingual (Arabic and English). Answer in the user language. Provide concise, friendly explanations. Offer contextual quick tips, remind users about the hash tabs (#calculator, #pro-rata, #assistant), and suggest official resources when relevant by emitting link tokens like [[link:plans-overview]] or [[link:pro-rata-faq]].",
    keywords: ["assistant", "help", "what can you do", "chat"],
  },
  {
    id: "support-channels",
    title: "Support and payments",
    body:
      "For questions about paying invoices, recharging, or contacting Orange support, provide the relevant guidance and include the link token [[link:recharge-options]] or [[link:support-contact]] so the UI can open the official site.",
    keywords: ["support", "payment", "recharge", "top", "help"],
    linkId: "support-contact",
  },
];

export function retrieveKnowledge(query: string): KnowledgeEntry[] {
  const normalized = query.toLowerCase();
  return KNOWLEDGE.filter((entry) =>
    entry.keywords.some((keyword) => normalized.includes(keyword.toLowerCase()))
  );
}

export function buildKnowledgePrompt(snippets: KnowledgeEntry[]): string {
  if (snippets.length === 0) return "";
  const lines = snippets.map((entry) => `• ${entry.title}: ${entry.body}`);
  return `Reference knowledge to ground your answer:\n${lines.join("\n")}`;
}
