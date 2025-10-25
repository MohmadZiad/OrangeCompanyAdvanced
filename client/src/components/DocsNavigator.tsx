import { useMemo, useState } from "react";
import type { DocEntry, Locale } from "@shared/schema";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ChevronsUpDown, ExternalLink } from "lucide-react";

interface DocsNavigatorProps {
  docs: DocEntry[];
  locale: Locale;
  onSelect: (doc: DocEntry) => void;
}

const normalize = (value: string) => value.replace(/\s+/g, " ").trim().toLowerCase();

export function DocsNavigator({ docs, locale, onSelect }: DocsNavigatorProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");

  const items = useMemo(() => {
    const normalizedQuery = normalize(query);
    if (!normalizedQuery) return docs;
    return docs.filter((doc) =>
      normalize(doc.title).includes(normalizedQuery) ||
      (doc.url ? normalize(doc.url).includes(normalizedQuery) : false)
    );
  }, [docs, query]);

  const label = locale === "ar" ? "المستندات" : "Docs";
  const searchPlaceholder = locale === "ar" ? "ابحث عن مستند..." : "Search docs...";
  const emptyLabel = locale === "ar" ? "لا توجد مستندات" : "No docs yet";
  const hintLabel = locale === "ar" ? "أضف الرابط لاحقًا" : "Add URL later";

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="min-w-[170px] justify-between rounded-full border-white/60 bg-white/80 px-5 text-sm font-medium text-foreground shadow-sm hover:bg-white dark:border-white/10 dark:bg-white/10"
        >
          <span className="truncate">{label}</span>
          <ChevronsUpDown className="ml-2 h-4 w-4 opacity-60" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align="end"
        sideOffset={8}
        dir={locale === "ar" ? "rtl" : "ltr"}
        className="w-72 rounded-3xl border bg-popover p-0 text-popover-foreground shadow-lg"
      >
        <Command>
          <CommandInput
            value={query}
            onValueChange={setQuery}
            placeholder={searchPlaceholder}
          />
          <CommandList>
            <CommandEmpty>{emptyLabel}</CommandEmpty>
            <CommandGroup>
              {items.map((doc) => (
                <CommandItem
                  key={String(doc.id)}
                  value={normalize(doc.title)}
                  onSelect={() => {
                    setOpen(false);
                    onSelect(doc);
                  }}
                  className="flex items-center justify-between gap-3"
                >
                  <div className="flex min-w-0 flex-col">
                    <span className="truncate font-medium text-foreground">
                      {doc.title}
                    </span>
                    <span className="truncate text-xs text-muted-foreground">
                      {doc.url || hintLabel}
                    </span>
                  </div>
                  {doc.url ? (
                    <ExternalLink
                      className="h-3.5 w-3.5 shrink-0 opacity-60"
                      aria-hidden="true"
                    />
                  ) : null}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
