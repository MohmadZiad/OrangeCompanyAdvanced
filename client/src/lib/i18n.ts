// i18n.ts
import type { Lang } from "./proRata";

export type Locale = "ar" | "en";

export const translations = {
  en: {
    appTitle: "Orange Tools",
    help: "Help",
    calculator: "Calculator",
    proRata: "Pro-Rata",
    assistant: "Assistant",
    calcTitle: "Orange Price Calculator",
    calcSubtitle: "Calculate pricing variants for Orange services",
    basePrice: "Base Price",
    basePriceLabel: "Base (A)",
    nosB_NosLabel: "Nos + \u200Eb\u200E + Nos",
    voiceCallsOnlyLabel: "Voice Calls Only",
    dataOnlyLabel: "Data Only",
    calculate: "Calculate",
    clear: "Clear",
    copy: "Copy",
    copied: "Copied!",
    fillExample: "Fill Example",
    formula: "Formula",

    proRataTitle: "Pro-Rata Calculator",
    proRataSubtitle: "Calculate prorated billing for 15→15 cycle",
    activationDate: "Activation Date",
    invoiceIssueDate: "Invoice Issue Date",
    monthlySubscription: "Monthly Subscription Value",
    fullInvoiceAmount: "Full Invoice Amount (with tax)",
    endDateUntil: "Covers until",
    fifteenDayCycle: "15th cycle (single invoice)",
    daysInCycle: "Days in Cycle",
    daysUsed: "Days Used",
    percentageUsed: "Percentage Used",
    proratedAmount: "Prorated Amount",
    reset: "Reset",
    textToSpeech: "Read Aloud",
    copyText: "Copy Text",
    optional: "Optional",
    required: "Required",

    proRataExplanation: `Billing Calculation Details:

Activation Date: {activationDate}
First Invoice Date: {invoiceDate}
Calculation Until: {endDate}

Billing Cycle: {cycleDays} days
Days Used: {daysUsed} days
Percentage: {percentage}%

Monthly Subscription: {monthlyValue}
Prorated Amount: {proratedAmount}
{fullInvoiceText}

This calculation shows the prorated billing amount based on the actual days of service used during the {cycleDays}-day billing cycle.`,
    fullInvoice: "Full Invoice Amount: {amount}",

    chatTitle: "Orange Tools Assistant",
    chatPlaceholder: "Ask me anything about the calculators...",
    send: "Send",
    quickReplies: "Quick replies:",
    thinking: "Thinking...",

    themeOrange: "Orange",
    themeDark: "Dark",
    themeBlossom: "Blossom",
    themeMint: "Mint",

    english: "English",
    arabic: "Arabic",

    summary: "Summary",
    currentResults: "Current Results",
    noResults: "Enter values to see results",

    errorNegative: "Value must be non-negative",
    errorRequired: "This field is required",
    errorInvalidDate: "Please select a valid date",
  },
  ar: {
    appTitle: "أدوات أورنج",
    help: "مساعدة",
    calculator: "الحاسبة",
    proRata: "التقسيم النسبي",
    assistant: "المساعد",

    calcTitle: "حاسبة أسعار أورنج",
    calcSubtitle: "احسب متغيرات الأسعار لخدمات أورنج",
    basePrice: "السعر الأساسي",
    basePriceLabel: "الأساسي (A)",
    nosB_NosLabel: "Nos + \u200Eb\u200E + Nos",
    voiceCallsOnlyLabel: "المكالمات الصوتية فقط",
    dataOnlyLabel: "البيانات فقط",
    calculate: "احسب",
    clear: "مسح",
    copy: "نسخ",
    copied: "تم النسخ!",
    fillExample: "املأ مثال",
    formula: "الصيغة",

    proRataTitle: "حاسبة التقسيم النسبي",
    proRataSubtitle: "احسب الفوترة النسبية لدورة ١٥→١٥",
    activationDate: "تاريخ التفعيل",
    invoiceIssueDate: "تاريخ إصدار الفاتورة",
    monthlySubscription: "قيمة الاشتراك الشهري",
    fullInvoiceAmount: "مبلغ الفاتورة الكامل (مع الضريبة)",
    endDateUntil: "يغطي حتى",
    fifteenDayCycle: "دورة ١٥ يومًا (فاتورة واحدة)",
    daysInCycle: "أيام في الدورة",
    daysUsed: "الأيام المستخدمة",
    percentageUsed: "النسبة المئوية",
    proratedAmount: "المبلغ المقسّم",
    reset: "إعادة تعيين",
    textToSpeech: "قراءة بصوت عالٍ",
    copyText: "نسخ النص",
    optional: "اختياري",
    required: "مطلوب",

    proRataExplanation: `تفاصيل حساب الفوترة:

تاريخ التفعيل: {activationDate}
تاريخ الفاتورة الأولى: {invoiceDate}
الحساب حتى: {endDate}

دورة الفوترة: {cycleDays} يومًا
الأيام المستخدمة: {daysUsed} يومًا
النسبة المئوية: {percentage}%

الاشتراك الشهري: {monthlyValue}
المبلغ المقسّم: {proratedAmount}
{fullInvoiceText}

يوضح هذا الحساب مبلغ الفوترة المقسّم بناءً على أيام الخدمة الفعلية المستخدمة خلال دورة الفوترة البالغة {cycleDays} يومًا.`,
    fullInvoice: "مبلغ الفاتورة الكامل: {amount}",

    chatTitle: "مساعد أدوات أورنج",
    chatPlaceholder: "اسألني أي شيء عن الحاسبات...",
    send: "إرسال",
    quickReplies: "ردود سريعة:",
    thinking: "جارٍ التفكير...",

    themeOrange: "برتقالي",
    themeDark: "داكن",
    themeBlossom: "وردي",
    themeMint: "نعناع",

    english: "الإنجليزية",
    arabic: "العربية",

    summary: "ملخص",
    currentResults: "النتائج الحالية",
    noResults: "أدخل القيم لرؤية النتائج",

    errorNegative: "يجب أن تكون القيمة غير سالبة",
    errorRequired: "هذا الحقل مطلوب",
    errorInvalidDate: "يرجى تحديد تاريخ صحيح",
  },
} as const;

export type QuickReply = { id: string; text: { en: string; ar: string } };

export const quickReplies: QuickReply[] = [
  {
    id: "nos-formula",
    text: { en: "How to calculate Nos_b_Nos?", ar: "كيف أحسب Nos_b_Nos؟" },
  },
  {
    id: "prorata-explain",
    text: { en: "What is Pro-Rata?", ar: "ما هو التقسيم النسبي؟" },
  },
  {
    id: "help-calculator",
    text: { en: "Help me use the calculator", ar: "ساعدني في استخدام الحاسبة" },
  },
];

export function t<K extends keyof typeof translations.en>(
  key: K,
  locale: Locale
): string {
  return (
    (translations as any)[locale]?.[key] ??
    (translations as any).en?.[key] ??
    String(key)
  );
}
