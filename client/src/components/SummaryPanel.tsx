import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAppStore } from "@/lib/store";
import { t } from "@/lib/i18n";
import { TrendingUp, MessageSquare, Percent } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { formatCurrency, formatNumber } from "@/lib/format";
import { SmartLinkPill } from "@/components/SmartLinkPill";
import { getSmartLinkCandidates, type SmartLinkId } from "@/lib/smartLinks";
import { Badge } from "@/components/ui/badge";
import { ymd } from "@/lib/proRata";

function SummaryContent() {
  const {
    locale,
    activeTab,
    calculatorResults,
    prorataResult,
    chatMessages,
  } = useAppStore();

  const tabLabelMap: Record<string, string> = {
    calculator: t("calculator", locale),
    "pro-rata": t("proRata", locale),
    assistant: t("assistant", locale),
  };

  const lastUserMessage = [...chatMessages]
    .reverse()
    .find((msg) => msg.role === "user" && msg.content.trim());

  const dynamicSmartLinks = lastUserMessage
    ? getSmartLinkCandidates(lastUserMessage.content).map((link) => link.id)
    : [];

  const tabSmartLinks: Record<string, SmartLinkId[]> = {
    calculator: ["plans-overview", "upgrade-card"],
    "pro-rata": ["pro-rata-faq", "recharge-options"],
    assistant: ["support-contact", "plans-overview"],
  };

  const suggestedLinks = Array.from(
    new Set([...(tabSmartLinks[activeTab] ?? []), ...dynamicSmartLinks])
  );

  const lastAssistantMessage = [...chatMessages]
    .reverse()
    .find((msg) => msg.role === "assistant" && msg.content.trim());

  const calculatorSummary = calculatorResults ? (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <MetricTile
          label={t("basePriceLabel", locale)}
          value={formatCurrency(calculatorResults.base, locale)}
        />
        <MetricTile
          label={t("nosB_NosLabel", locale)}
          value={formatCurrency(calculatorResults.nosB_Nos, locale)}
        />
        <MetricTile
          label={t("voiceCallsOnlyLabel", locale)}
          value={formatCurrency(calculatorResults.voiceCallsOnly, locale)}
        />
        <MetricTile
          label={t("dataOnlyLabel", locale)}
          value={formatCurrency(calculatorResults.dataOnly, locale)}
        />
      </div>
      <Badge variant="outline" className="inline-flex items-center gap-2 text-xs">
        <CalculatorIcon />
        {locale === "ar"
          ? "تتحدث هذه النتائج مباشرة مع الحاسبة الرئيسية"
          : "These values stay in sync with your calculator inputs."}
      </Badge>
    </div>
  ) : (
    <EmptyState locale={locale} tab="calculator" />
  );

  const proRataSummary = prorataResult ? (
    <div className="space-y-4">
      <div className="rounded-3xl bg-white/80 p-5 shadow-[0_18px_44px_-32px_rgba(255,90,0,0.45)] backdrop-blur dark:bg-white/10">
        <div className="flex items-center gap-3">
          <Percent className="h-5 w-5 text-primary" />
          <div className="text-3xl font-semibold">
            {formatNumber(prorataResult.ratio * 100, locale, {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}
            %
          </div>
        </div>
        <p className="mt-2 text-sm text-muted-foreground">
          {locale === "ar"
            ? "النسبة المستخدمة من دورة ١٥ يومًا"
            : "Percentage of the 15-day cycle already used."}
        </p>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <MetricTile
          label={locale === "ar" ? "قيمة البروراتا" : "Pro-rata"}
          value={formatCurrency(prorataResult.prorataNet, locale)}
        />
        <MetricTile
          label={locale === "ar" ? "الاشتراك الشهري" : "Monthly value"}
          value={formatCurrency(prorataResult.monthlyNet, locale)}
        />
        <MetricTile
          label={locale === "ar" ? "الأيام المحتسبة" : "Days counted"}
          value={`${prorataResult.proDays} / ${prorataResult.cycleDays}`}
        />
        <MetricTile
          label={locale === "ar" ? "تاريخ الفاتورة" : "Invoice date"}
          value={ymd(prorataResult.cycleEndUTC)}
        />
      </div>
    </div>
  ) : (
    <EmptyState locale={locale} tab="pro-rata" />
  );

  const assistantSummary = lastAssistantMessage ? (
    <div className="space-y-3">
      <div className="rounded-3xl border border-white/60 bg-white/70 p-4 shadow-inner backdrop-blur dark:bg-white/10">
        <p className="text-xs uppercase tracking-[0.28em] text-primary">
          {locale === "ar" ? "آخر رد" : "Latest reply"}
        </p>
        <p className="mt-2 text-sm leading-6 text-foreground">
          {truncate(lastAssistantMessage.content, 220)}
        </p>
        <p className="mt-3 text-xs text-muted-foreground">
          {new Date(lastAssistantMessage.timestamp).toLocaleString(
            locale === "ar" ? "ar-JO" : "en-US",
            { hour: "numeric", minute: "numeric" }
          )}
        </p>
      </div>
      <Badge variant="outline" className="inline-flex items-center gap-2 text-xs">
        <MessageSquare className="h-4 w-4" />
        {locale === "ar"
          ? "المحادثة محفوظة محليًا"
          : "Conversation stays on this device."}
      </Badge>
    </div>
  ) : (
    <EmptyState locale={locale} tab="assistant" />
  );

  const body = (() => {
    switch (activeTab) {
      case "calculator":
        return calculatorSummary;
      case "pro-rata":
        return proRataSummary;
      case "assistant":
      default:
        return assistantSummary;
    }
  })();

  return (
    <>
      <p className="text-sm text-muted-foreground">
        {locale === "ar"
          ? "موجز مباشر لآخر النتائج والاقتراحات"
          : "A live digest of your latest results and helpful next steps."}
      </p>
      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          initial={{ x: 32, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: -24, opacity: 0 }}
          transition={{ duration: 0.45, ease: [0.4, 0, 0.2, 1] }}
          className="space-y-5 rounded-3xl border border-white/55 bg-white/65 p-5 text-sm shadow-[0_26px_48px_-36px_rgba(255,90,0,0.45)] backdrop-blur-xl dark:bg-white/10"
        >
          <span className="text-xs uppercase tracking-[0.28em] text-primary">
            {t("currentResults", locale)} · {tabLabelMap[activeTab] ?? activeTab}
          </span>
          {body}
          {suggestedLinks.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-semibold text-muted-foreground">
                {locale === "ar"
                  ? "روابط رسمية مقترحة"
                  : "Suggested official links"}
              </p>
              <div className="flex flex-wrap gap-2">
                {suggestedLinks.map((linkId) => (
                  <SmartLinkPill key={linkId} linkId={linkId} />
                ))}
              </div>
            </div>
          )}
        </motion.div>
      </AnimatePresence>
    </>
  );
}

function MetricTile({
  label,
  value,
}: {
  label: string;
  value: string | number;
}) {
  return (
    <div className="rounded-3xl border border-white/60 bg-white/80 p-4 text-left shadow-[inset_0_1px_0_rgba(255,255,255,0.7)] backdrop-blur dark:bg-white/10">
      <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
        {label}
      </p>
      <p className="mt-2 font-mono text-lg font-semibold text-foreground">
        {value}
      </p>
    </div>
  );
}

function EmptyState({
  locale,
  tab,
}: {
  locale: string;
  tab: "calculator" | "pro-rata" | "assistant";
}) {
  const copy: Record<typeof tab, { title: string; description: string }> = {
    calculator: {
      title: locale === "ar" ? "لا توجد نتائج بعد" : "No results yet",
      description:
        locale === "ar"
          ? "أدخل سعرًا أساسيًا أو استخدم لوحة الأرقام لرؤية البطاقات تتحدث فورًا."
          : "Enter a base price or use the keypad to watch the cards populate instantly.",
    },
    "pro-rata": {
      title: locale === "ar" ? "ابدأ بالحساب" : "Start a calculation",
      description:
        locale === "ar"
          ? "اختر تاريخ التفعيل والمبلغ الشهري لتحصل على قيمة البروراتا لدورة ١٥ يومًا."
          : "Pick an activation date and monthly value to compute the 15-day pro-rata amount.",
    },
    assistant: {
      title: locale === "ar" ? "لا رسائل محفوظة" : "No conversation yet",
      description:
        locale === "ar"
          ? "ابدأ الدردشة مع المساعد لطلب الصيغ، الروابط الرسمية، أو شرح النتائج."
          : "Chat with the assistant to request formulas, official links, or result explanations.",
    },
  };

  return (
    <div className="rounded-3xl border border-dashed border-white/60 bg-white/55 p-6 text-center text-sm text-muted-foreground backdrop-blur dark:bg-white/5">
      <p className="font-semibold text-foreground">{copy[tab].title}</p>
      <p className="mt-2 text-xs leading-5">{copy[tab].description}</p>
    </div>
  );
}

function CalculatorIcon() {
  return (
    <svg
      className="h-4 w-4"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <rect x="4" y="2" width="16" height="20" rx="3" ry="3" />
      <path d="M8 6h8" />
      <path d="M9 14h.01" />
      <path d="M9 18h.01" />
      <path d="M12 16h.01" />
      <path d="M15 14h.01" />
      <path d="M15 18h.01" />
    </svg>
  );
}

function truncate(text: string, maxLength: number) {
  if (text.length <= maxLength) return text;
  return `${text.slice(0, maxLength)}…`;
}

export function SummaryPanel() {
  const { locale } = useAppStore();

  return (
    <motion.div
      className="sticky top-8 space-y-5"
      initial={{ opacity: 0, x: 60 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
    >
      <Card className="overflow-hidden">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-lg">
            <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-[#FF7A00] via-[#FF5400] to-[#FF3C00] text-white shadow-[0_18px_36px_-24px_rgba(255,90,0,0.7)]">
              <TrendingUp className="h-5 w-5" />
            </span>
            <span>{t("summary", locale)}</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6 pt-0">
          <SummaryContent />
        </CardContent>
      </Card>
    </motion.div>
  );
}

export function SummaryPanelMobile() {
  const { locale } = useAppStore();

  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-[#FF7A00] via-[#FF5400] to-[#FF3C00] text-white shadow-[0_18px_36px_-24px_rgba(255,90,0,0.7)]">
            <TrendingUp className="h-5 w-5" />
          </span>
          <span>{t("summary", locale)}</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6 pt-0">
        <SummaryContent />
      </CardContent>
    </Card>
  );
}
