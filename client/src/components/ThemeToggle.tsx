import { useAppStore } from "@/lib/store";
import { Button } from "@/components/ui/button";
import type { Theme } from "@shared/schema";
import { Palette } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { t } from "@/lib/i18n";

export function ThemeToggle() {
  const { theme, setTheme, locale } = useAppStore();
  const themes: { value: Theme | "neon" | "sunset"; label: string }[] = [
    { value: "orange", label: t("themeOrange", locale) },
    { value: "dark", label: t("themeDark", locale) },
    { value: "blossom", label: t("themeBlossom", locale) },
    { value: "mint", label: t("themeMint", locale) },
    { value: "neon", label: "Neon ⚡" },
    { value: "sunset", label: "Sunset 🌆" },
  ];

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          data-testid="button-theme-toggle"
          aria-label="Toggle theme"
          className="hover-elevate active-elevate-2"
        >
          <Palette className="h-5 w-5" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" data-testid="menu-themes">
        {themes.map((t) => (
          <DropdownMenuItem
            key={t.value}
            onClick={() => setTheme(t.value)}
            className={theme === t.value ? "bg-accent" : ""}
            data-testid={`menu-item-theme-${t.value}`}
          >
            <span className="flex items-center gap-2">
              {t.label}
              {theme === t.value && <span className="text-primary">✓</span>}
            </span>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
