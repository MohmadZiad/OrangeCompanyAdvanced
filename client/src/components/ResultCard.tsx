import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CopyButton } from "./CopyButton";
import { motion } from "framer-motion";
import { formatNumber } from "@/lib/format";
import { useAppStore } from "@/lib/store";

interface ResultCardProps {
  title: string;
  value: number;
  index?: number;
}

export function ResultCard({ title, value, index = 0 }: ResultCardProps) {
  const { locale } = useAppStore();
  const formattedValue = formatNumber(value, locale);

  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.08, type: "spring", stiffness: 120, damping: 16 }}
      whileHover={{ y: -6, scale: 1.01 }}
    >
      <Card
        className="hover-elevate transition-all duration-300 border-transparent bg-gradient-to-br from-white/60 via-white/70 to-white/50 shadow-[0_28px_60px_-40px_rgba(255,90,0,0.55)] dark:from-white/10 dark:via-white/5 dark:to-white/10"
        data-testid={`result-card-${title.toLowerCase().replace(/\s+/g, '-')}`}
      >
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-semibold tracking-tight">
            {title}
          </CardTitle>
          <CopyButton text={value.toString()} variant="ghost" size="icon" className="rounded-full bg-white/60 text-foreground hover:bg-white/80" />
        </CardHeader>
        <CardContent className="pt-2">
          <p className="text-xs uppercase tracking-[0.28em] text-muted-foreground">
            {locale === "ar" ? "القيمة" : "value"}
          </p>
          <div className="mt-1 text-3xl font-bold font-mono tabular-nums drop-shadow-sm" data-testid={`text-result-${title.toLowerCase().replace(/\s+/g, '-')}`}>
            {formattedValue}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
