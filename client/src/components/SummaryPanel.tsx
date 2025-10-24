import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAppStore } from "@/lib/store";
import { t } from "@/lib/i18n";
import { TrendingUp } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";

export function SummaryPanel() {
  const { locale, activeTab } = useAppStore();
  const tabLabelMap: Record<string, string> = {
    calculator: t("calculator", locale),
    "pro-rata": t("proRata", locale),
    assistant: t("assistant", locale),
  };
  const activeLabel = tabLabelMap[activeTab] ?? activeTab;

  return (
    <motion.div
      className="sticky top-8 space-y-4"
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
          <p className="text-sm text-muted-foreground">
            {locale === "ar"
              ? "نلخّص لك أحدث النتائج والنصائح لكل أداة"
              : "A live digest of your latest results and assistant cues."}
          </p>
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ x: 32, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: -24, opacity: 0 }}
              transition={{ duration: 0.45, ease: [0.4, 0, 0.2, 1] }}
              className="rounded-3xl border border-white/50 bg-white/60 p-5 text-sm shadow-inner backdrop-blur-lg dark:bg-white/5"
            >
              <span className="text-xs uppercase tracking-[0.28em] text-primary">
                {t("currentResults", locale)}
              </span>
              <div className="mt-3 text-lg font-semibold">
                {activeLabel}
              </div>
              <p className="mt-2 text-muted-foreground">
                {locale === "ar"
                  ? "استمر بإدخال القيم لمشاهدة التغيرات الفورية في اللوحة الجانبية"
                  : "Continue refining inputs to watch the panel respond instantly."}
              </p>
            </motion.div>
          </AnimatePresence>
        </CardContent>
      </Card>
    </motion.div>
  );
}
