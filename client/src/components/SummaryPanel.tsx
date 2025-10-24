import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAppStore } from "@/lib/store";
import { t } from "@/lib/i18n";
import { TrendingUp } from "lucide-react";

export function SummaryPanel() {
  const { locale, activeTab } = useAppStore();

  return (
    <div className="sticky top-6 space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <TrendingUp className="h-5 w-5 text-primary" />
            {t("summary", locale)}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="text-sm text-muted-foreground text-center py-8">
              <p>{t("currentResults", locale)}</p>
              <p className="text-xs mt-2">{activeTab}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
