import { create } from "zustand";
import type { Theme, Locale, ChatMessage } from "@shared/schema";

interface AppState {
  theme: Theme | "neon" | "sunset";
  setTheme: (theme: Theme | "neon" | "sunset") => void;
  locale: Locale;
  setLocale: (locale: Locale) => void;
  chatMessages: ChatMessage[];
  addChatMessage: (m: ChatMessage) => void;
  clearChatMessages: () => void;
  isChatOpen: boolean;
  setChatOpen: (open: boolean) => void;
  activeTab: string;
  setActiveTab: (tab: string) => void;
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

export const useAppStore = create<AppState>((set) => {
  const stored = loadFromStorage(STORAGE_KEY, {
    theme: "orange" as Theme,
    locale: (typeof navigator !== "undefined" &&
    navigator.language.startsWith("ar")
      ? "ar"
      : "en") as Locale,
    chatMessages: [] as ChatMessage[],
  });

  return {
    theme: stored.theme as Theme | "neon" | "sunset",
    setTheme: (theme) => {
      set({ theme });
      saveToStorage(STORAGE_KEY, { ...stored, theme });
      document.documentElement.classList.remove(
        "dark",
        "orange",
        "blossom",
        "mint",
        "neon",
        "sunset"
      );
      if (theme === "dark") document.documentElement.classList.add("dark");
      else document.documentElement.classList.add(theme as string);
    },
    locale: stored.locale,
    setLocale: (locale) => {
      set({ locale });
      saveToStorage(STORAGE_KEY, { ...stored, locale });
      document.documentElement.lang = locale;
      document.documentElement.dir = locale === "ar" ? "rtl" : "ltr";
    },
    chatMessages: stored.chatMessages,
    addChatMessage: (message) =>
      set((s) => {
        const msgs = [...s.chatMessages, message];
        saveToStorage(STORAGE_KEY, { ...stored, chatMessages: msgs });
        return { chatMessages: msgs };
      }),
    clearChatMessages: () => {
      set({ chatMessages: [] });
      saveToStorage(STORAGE_KEY, { ...stored, chatMessages: [] });
    },
    isChatOpen: false,
    setChatOpen: (open) => set({ isChatOpen: open }),
    activeTab: "calculator",
    setActiveTab: (tab) => set({ activeTab: tab }),
  };
});
