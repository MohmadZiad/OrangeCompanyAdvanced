import { useAppStore } from "@/lib/store";
import { t } from "@/lib/i18n";
import { MessageCircle } from "lucide-react";
import { motion } from "framer-motion";

export function AssistantHint() {
  const { locale, setChatOpen, setActiveTab } = useAppStore();

  return (
    <motion.button
      type="button"
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.6, duration: 0.5, ease: "easeOut" }}
      onClick={() => {
        setChatOpen(true);
        setActiveTab("assistant");
        window.location.hash = "assistant";
      }}
      className="group fixed bottom-6 left-6 z-40 rounded-full bg-white/80 px-5 py-3 text-sm font-medium text-foreground shadow-[0_22px_45px_-28px_rgba(255,90,0,0.55)] backdrop-blur-xl transition hover:-translate-y-1 hover:bg-white/95 hover:shadow-[0_28px_60px_-30px_rgba(255,90,0,0.65)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60 focus-visible:ring-offset-2 focus-visible:ring-offset-background max-sm:bottom-24 max-sm:px-4 max-sm:py-2.5 max-sm:text-xs dark:bg-white/10"
      aria-label={t("assistant", locale)}
    >
      <span className="relative flex items-center gap-2">
        <MessageCircle className="h-4 w-4 text-primary transition group-hover:scale-110" />
        <span className="font-medium">
          {locale === "ar" ? "بحاجة لتلميح؟" : "Need a quick hint?"}
        </span>
      </span>
    </motion.button>
  );
}
