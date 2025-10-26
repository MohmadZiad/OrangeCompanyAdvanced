import { create } from "zustand";
import type {
  AppTheme,
  Locale,
  ChatMessage,
  CalculatorResults,
} from "@shared/schema";
import type { ProrataOutput } from "@/lib/proRata";

type ThemeOption = AppTheme | "neon" | "sunset";

interface AppState {
  theme: ThemeOption;
  setTheme: (theme: ThemeOption) => void;
  locale: Locale;
  setLocale: (locale: Locale) => void;
  chatMessages: ChatMessage[];
  addChatMessage: (m: ChatMessage) => void;
  clearChatMessages: () => void;
  isChatOpen: boolean;
  setChatOpen: (open: boolean) => void;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  calculatorResults: CalculatorResults | null;
  setCalculatorResults: (results: CalculatorResults | null) => void;
  prorataResult: ProrataOutput | null;
  setProrataResult: (result: ProrataOutput | null) => void;
}

const loadFromStorage = <T>(key: string, def: T): T => {
  if (typeof window === "undefined") return def;
  try {
    const i = window.localStorage.getItem(key);
    return i ? JSON.parse(i) : def;
  } catch {
    return def;
  }
};

const saveToStorage = <T>(key: string, v: T) => {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(key, JSON.stringify(v));
  } catch {}
};

const STORAGE_KEY = "orange-tools-storage";

export const useAppStore = create<AppState>((set, get) => {
  const stored = loadFromStorage(STORAGE_KEY, {
    theme: "orange" as ThemeOption,
    locale: (typeof navigator !== "undefined" &&
    navigator.language.startsWith("ar")
      ? "ar"
      : "en") as Locale,
    chatMessages: [] as ChatMessage[],
  });

  const syncDocumentTheme = (theme: ThemeOption) => {
    if (typeof document === "undefined") return;
    document.documentElement.classList.remove(
      "dark",
      "orange",
      "blossom",
      "mint",
      "neon",
      "sunset"
    );
    if (theme === "dark") document.documentElement.classList.add("dark");
    else document.documentElement.classList.add(theme);
  };

  const persist = () => {
    const { theme, locale, chatMessages } = get();
    saveToStorage(STORAGE_KEY, { theme, locale, chatMessages });
  };

  return {
    theme: stored.theme,
    setTheme: (theme) => {
      set({ theme });
      syncDocumentTheme(theme);
      persist();
    },
    locale: stored.locale,
    setLocale: (locale) => {
      set({ locale });
      if (typeof document !== "undefined") {
        document.documentElement.lang = locale;
        document.documentElement.dir = locale === "ar" ? "rtl" : "ltr";
      }
      persist();
    },
    chatMessages: stored.chatMessages,
    addChatMessage: (message) => {
      set((s) => ({ chatMessages: [...s.chatMessages, message] }));
      persist();
    },
    clearChatMessages: () => {
      set({ chatMessages: [] });
      persist();
    },
    isChatOpen: false,
    setChatOpen: (open) => set({ isChatOpen: open }),
    activeTab: "calculator",
    setActiveTab: (tab) => set({ activeTab: tab }),
    calculatorResults: null,
    setCalculatorResults: (results) => set({ calculatorResults: results }),
    prorataResult: null,
    setProrataResult: (result) => set({ prorataResult: result }),
  };
});
