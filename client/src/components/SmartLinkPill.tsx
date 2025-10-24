import { Badge } from "@/components/ui/badge";
import { ArrowUpRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { openSmartLink, type SmartLinkId } from "@/lib/smartLinks";
import { useAppStore } from "@/lib/store";
import { getSmartLinkLabel, getSmartLinkDescription } from "@shared/smartLinks";

interface SmartLinkPillProps {
  linkId: SmartLinkId;
  className?: string;
}

export function SmartLinkPill({ linkId, className }: SmartLinkPillProps) {
  const { locale } = useAppStore();
  return (
    <Badge
      variant="outline"
      className={cn(
        "flex cursor-pointer items-center gap-2 rounded-full border-primary/30 bg-white/70 px-3 py-2 text-xs font-medium text-foreground shadow-sm backdrop-blur transition hover:-translate-y-0.5 hover:border-primary/60 hover:text-primary dark:bg-white/10",
        className
      )}
      onClick={() => openSmartLink(linkId)}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          openSmartLink(linkId);
        }
      }}
      role="link"
      tabIndex={0}
      aria-label={getSmartLinkDescription(linkId, locale)}
      title={getSmartLinkDescription(linkId, locale)}
    >
      <span>{getSmartLinkLabel(linkId, locale)}</span>
      <ArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" />
    </Badge>
  );
}
