import { useAppStore } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { Languages } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { t } from "@/lib/i18n";
import type { Locale } from "@shared/schema";

export function LanguageToggle() {
  const { locale, setLocale } = useAppStore();

  const languages: { value: Locale; label: string }[] = [
    { value: "en", label: t("english", locale) },
    { value: "ar", label: t("arabic", locale) },
  ];

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button 
          variant="ghost" 
          size="icon"
          data-testid="button-language-toggle"
          aria-label="Toggle language"
          className="hover-elevate active-elevate-2"
        >
          <Languages className="h-5 w-5" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" data-testid="menu-languages">
        {languages.map((lang) => (
          <DropdownMenuItem
            key={lang.value}
            onClick={() => setLocale(lang.value)}
            className={locale === lang.value ? "bg-accent" : ""}
            data-testid={`menu-item-language-${lang.value}`}
          >
            <span className="flex items-center gap-2">
              {lang.label}
              {locale === lang.value && <span className="text-primary">✓</span>}
            </span>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
