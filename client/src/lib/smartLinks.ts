import { SMART_LINKS, type SmartLinkId, matchSmartLinks } from "@shared/smartLinks";
import type { Locale } from "@shared/schema";

export function openSmartLink(id: SmartLinkId) {
  const link = SMART_LINKS[id];
  if (!link) return;
  if (typeof window !== "undefined") {
    const target = link.href.includes("__REPLACE")
      ? "https://www.orange.jo/"
      : link.href || "https://www.orange.jo/";
    window.open(target, "_blank", "noopener,noreferrer");
  }
}

export function getSmartLinkCandidates(text: string) {
  if (!text.trim()) return [];
  return matchSmartLinks(text);
}

export function listSmartLinks() {
  return Object.values(SMART_LINKS);
}

export type { SmartLinkId };

export function getLocalizedSmartLinkLabel(
  id: SmartLinkId,
  locale: Locale
): string {
  return SMART_LINKS[id]?.label[locale] ?? SMART_LINKS[id]?.label.en;
}

export function getLocalizedSmartLinkDescription(
  id: SmartLinkId,
  locale: Locale
): string {
  return (
    SMART_LINKS[id]?.description[locale] ??
    SMART_LINKS[id]?.description.en ??
    ""
  );
}
