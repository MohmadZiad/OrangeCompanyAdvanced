import type { Locale } from "./schema";

export type SmartLinkId =
  | "plans-overview"
  | "recharge-options"
  | "support-contact"
  | "upgrade-card"
  | "pro-rata-faq";

export interface SmartLink {
  id: SmartLinkId;
  label: { en: string; ar: string };
  description: { en: string; ar: string };
  /**
   * Placeholder URL. Replace with the official Orange destination before launch.
   */
  href: string;
  keywords: string[];
  category: "plans" | "support" | "billing" | "upgrades";
}

export const SMART_LINKS: Record<SmartLinkId, SmartLink> = {
  "plans-overview": {
    id: "plans-overview",
    label: {
      en: "Explore mobile plans",
      ar: "استكشف الباقات",
    },
    description: {
      en: "Compare Orange mobile plans, allowances, and pricing tiers.",
      ar: "قارن باقات أورنج، السعات، وفئات الأسعار.",
    },
    href: "https://www.orange.jo/__REPLACE_PLANS__",
    keywords: ["plan", "plans", "packages", "bundle", "offer", "offers"],
    category: "plans",
  },
  "recharge-options": {
    id: "recharge-options",
    label: {
      en: "Recharge & top up",
      ar: "شحن الرصيد والدفع",
    },
    description: {
      en: "Find recharge channels, e-vouchers, and payment partners.",
      ar: "تعرف على طرق الشحن، القسائم الإلكترونية، وشركاء الدفع.",
    },
    href: "https://orange.jo/en/offers/quick-pay",
    keywords: ["recharge", "top up", "payment", "pay", "voucher", "top-up"],
    category: "billing",
  },
  "support-contact": {
    id: "support-contact",
    label: {
      en: "Contact support",
      ar: "تواصل مع الدعم",
    },
    description: {
      en: "Get help from Orange support channels and service points.",
      ar: "تواصل مع قنوات دعم أورنج ونقاط الخدمة.",
    },
    href: "https://www.orange.jo/__REPLACE_SUPPORT__",
    keywords: ["support", "help", "contact", "call center", "service", "agent"],
    category: "support",
  },
  "upgrade-card": {
    id: "upgrade-card",
    label: {
      en: "Upgrade my card",
      ar: "تحديث البطاقة",
    },
    description: {
      en: "Review device and SIM upgrade eligibility for your card.",
      ar: "اعرف أهلية تحديث الجهاز أو الشريحة للبطاقة الخاصة بك.",
    },
    href: "https://www.orange.jo/__REPLACE_UPGRADE__",
    keywords: ["upgrade", "card", "sim", "device", "replace"],
    category: "upgrades",
  },
  "pro-rata-faq": {
    id: "pro-rata-faq",
    label: {
      en: "Learn about pro-rata",
      ar: "تعرف على البروراتا",
    },
    description: {
      en: "Understand how Orange calculates 15-day prorated charges.",
      ar: "تعرف على كيفية احتساب أورنج للبروراتا لدورة ١٥ يومًا.",
    },
    href: "https://www.orange.jo/__REPLACE_PRORATA__",
    keywords: ["pro-rata", "billing", "invoice", "cycle", "prorate"],
    category: "billing",
  },
};

export function matchSmartLinks(query: string): SmartLink[] {
  const normalized = query.toLowerCase();
  return Object.values(SMART_LINKS).filter((link) =>
    link.keywords.some((keyword) => normalized.includes(keyword.toLowerCase()))
  );
}

export function getSmartLinkLabel(linkId: SmartLinkId, locale: Locale) {
  return SMART_LINKS[linkId]?.label[locale] ?? SMART_LINKS[linkId]?.label.en;
}

export function getSmartLinkDescription(linkId: SmartLinkId, locale: Locale) {
  return (
    SMART_LINKS[linkId]?.description[locale] ??
    SMART_LINKS[linkId]?.description.en ??
    ""
  );
}
