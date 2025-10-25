import type { Locale, QuickReply } from "@shared/schema";

export const translations = {
  en: {
    // App header
    appTitle: "Orange Tools",
    help: "Help",
    
    // Tabs
    calculator: "Calculator",
    proRata: "Pro-Rata",
    assistant: "Assistant",
    
    // Calculator
    calcTitle: "Orange Price Calculator",
    calcSubtitle: "Calculate pricing variants for Orange services",
    basePrice: "Base Price",
    basePriceLabel: "Base (A)",
    nosB_NosLabel: "Nos + b + Nos",
    voiceCallsOnlyLabel: "Voice Calls Only",
    dataOnlyLabel: "Data Only",
    calculate: "Calculate",
    clear: "Clear",
    copy: "Copy",
    copied: "Copied!",
    fillExample: "Fill Example",
    formula: "Formula",
    
    // Pro-Rata
    proRataTitle: "Pro-Rata Calculator",
    proRataSubtitle: "Calculate prorated billing for 15-day cycle",
    activationDate: "Activation Date",
    invoiceIssueDate: "Invoice Issue Date",
    monthlySubscription: "Monthly Subscription Value",
    fullInvoiceAmount: "Full Invoice Amount (with tax)",
    endDateUntil: "End Date Until",
    fifteenDayCycle: "15-day cycle (single invoice)",
    daysInCycle: "Days in Cycle",
    daysUsed: "Days Used",
    percentageUsed: "Percentage Used",
    proratedAmount: "Prorated Amount",
    reset: "Reset",
    textToSpeech: "Read Aloud",
    copyText: "Copy Text",
    optional: "Optional",
    required: "Required",
    
    // Pro-Rata explanation
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
    
    // Chat
    chatTitle: "Orange Tools Assistant",
    chatPlaceholder: "Ask me anything about the calculators...",
    send: "Send",
    quickReplies: "Quick replies:",
    thinking: "Thinking...",
    
    // Themes
    themeOrange: "Orange",
    themeDark: "Dark",
    themeBlossom: "Blossom",
    themeMint: "Mint",
    
    // Languages
    english: "English",
    arabic: "Arabic",
    
    // Summary panel
    summary: "Summary",
    currentResults: "Current Results",
    noResults: "Enter values to see results",
    
    // Errors
    errorNegative: "Value must be non-negative",
    errorRequired: "This field is required",
    errorInvalidDate: "Please select a valid date",
  },
  ar: {
    // App header
    appTitle: "أدوات أورنج",
    help: "مساعدة",
    
    // Tabs
    calculator: "الحاسبة",
    proRata: "التقسيم النسبي",
    assistant: "المساعد",
    
    // Calculator
    calcTitle: "حاسبة أسعار أورنج",
    calcSubtitle: "احسب متغيرات الأسعار لخدمات أورنج",
    basePrice: "السعر الأساسي",
    basePriceLabel: "الأساسي (A)",
    nosB_NosLabel: "Nos + b + Nos",
    voiceCallsOnlyLabel: "المكالمات الصوتية فقط",
    dataOnlyLabel: "البيانات فقط",
    calculate: "احسب",
    clear: "مسح",
    copy: "نسخ",
    copied: "تم النسخ!",
    fillExample: "املأ مثال",
    formula: "الصيغة",
    
    // Pro-Rata
    proRataTitle: "حاسبة التقسيم النسبي",
    proRataSubtitle: "احسب الفوترة النسبية لدورة ١٥ يومًا",
    activationDate: "تاريخ التفعيل",
    invoiceIssueDate: "تاريخ إصدار الفاتورة",
    monthlySubscription: "قيمة الاشتراك الشهري",
    fullInvoiceAmount: "مبلغ الفاتورة الكامل (مع الضريبة)",
    endDateUntil: "تاريخ الانتهاء حتى",
    fifteenDayCycle: "دورة ١٥ يومًا (فاتورة واحدة)",
    daysInCycle: "أيام في الدورة",
    daysUsed: "الأيام المستخدمة",
    percentageUsed: "النسبة المئوية المستخدمة",
    proratedAmount: "المبلغ المقسم",
    reset: "إعادة تعيين",
    textToSpeech: "قراءة بصوت عالٍ",
    copyText: "نسخ النص",
    optional: "اختياري",
    required: "مطلوب",
    
    // Pro-Rata explanation
    proRataExplanation: `تفاصيل حساب الفوترة:
    
تاريخ التفعيل: {activationDate}
تاريخ الفاتورة الأولى: {invoiceDate}
الحساب حتى: {endDate}

دورة الفوترة: {cycleDays} يومًا
الأيام المستخدمة: {daysUsed} يومًا
النسبة المئوية: {percentage}%

الاشتراك الشهري: {monthlyValue}
المبلغ المقسم: {proratedAmount}
{fullInvoiceText}

يوضح هذا الحساب مبلغ الفوترة المقسم بناءً على أيام الخدمة الفعلية المستخدمة خلال دورة الفوترة البالغة {cycleDays} يومًا.`,
    fullInvoice: "مبلغ الفاتورة الكامل: {amount}",
    
    // Chat
    chatTitle: "مساعد أدوات أورنج",
    chatPlaceholder: "اسألني أي شيء عن الحاسبات...",
    send: "إرسال",
    quickReplies: "ردود سريعة:",
    thinking: "جارٍ التفكير...",
    
    // Themes
    themeOrange: "برتقالي",
    themeDark: "داكن",
    themeBlossom: "وردي",
    themeMint: "نعناع",
    
    // Languages
    english: "الإنجليزية",
    arabic: "العربية",
    
    // Summary panel
    summary: "ملخص",
    currentResults: "النتائج الحالية",
    noResults: "أدخل القيم لرؤية النتائج",
    
    // Errors
    errorNegative: "يجب أن تكون القيمة غير سالبة",
    errorRequired: "هذا الحقل مطلوب",
    errorInvalidDate: "يرجى تحديد تاريخ صحيح",
  },
};

export const quickReplies: QuickReply[] = [
  {
    id: "nos-formula",
    text: {
      en: "How to calculate Nos_b_Nos?",
      ar: "كيف أحسب Nos_b_Nos؟",
    },
  },
  {
    id: "prorata-explain",
    text: {
      en: "What is Pro-Rata?",
      ar: "ما هو التقسيم النسبي؟",
    },
  },
  {
    id: "help-calculator",
    text: {
      en: "Help me use the calculator",
      ar: "ساعدني في استخدام الحاسبة",
    },
  },
];

export function t(key: keyof typeof translations.en, locale: Locale): string {
  return translations[locale][key] || translations.en[key] || key;
}
