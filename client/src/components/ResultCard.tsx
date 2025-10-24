import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CopyButton } from "./CopyButton";
import { HelpCircle } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { motion } from "framer-motion";
import { formatNumber } from "@/lib/format";
import { useAppStore } from "@/lib/store";

interface ResultCardProps {
  title: string;
  value: number;
  formula?: string;
  index?: number;
}

export function ResultCard({ title, value, formula, index = 0 }: ResultCardProps) {
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
        className="hover-elevate transition-all duration-300 border-transparent bg-gradient-to-br from-white/40 via-white/55 to-white/25 dark:from-white/10 dark:via-white/5 dark:to-white/10"
        data-testid={`result-card-${title.toLowerCase().replace(/\s+/g, '-')}`}
      >
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1">
          <CardTitle className="text-sm font-medium flex items-center gap-2 underline-animate">
            {title}
            {formula && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    className="text-muted-foreground hover:text-foreground transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:ring-offset-2 focus-visible:ring-offset-background rounded-full"
                    aria-label="Show formula"
                    data-testid={`tooltip-trigger-${title.toLowerCase().replace(/\s+/g, '-')}`}
                  >
                    <HelpCircle className="h-4 w-4" />
                  </button>
                </TooltipTrigger>
                <TooltipContent>
                  <p className="font-mono text-xs">{formula}</p>
                </TooltipContent>
              </Tooltip>
            )}
          </CardTitle>
          <CopyButton text={value.toString()} variant="ghost" size="icon" />
        </CardHeader>
        <CardContent className="pt-2">
          <div
            className="text-3xl font-bold font-mono tabular-nums drop-shadow-sm"
            data-testid={`text-result-${title.toLowerCase().replace(/\s+/g, '-')}`}
          >
            {formattedValue}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
