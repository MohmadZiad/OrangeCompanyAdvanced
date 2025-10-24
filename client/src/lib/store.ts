import { create } from "zustand";
import type { Theme, Locale, ChatMessage } from "@shared/schema";

interface AppState {
  // Theme management
  theme: Theme;
  setTheme: (theme: Theme) => void;
  
  // Locale management
  locale: Locale;
  setLocale: (locale: Locale) => void;
  
  // Chat messages
  chatMessages: ChatMessage[];
  addChatMessage: (message: ChatMessage) => void;
  clearChatMessages: () => void;
  
  // UI state
  isChatOpen: boolean;
  setChatOpen: (open: boolean) => void;
  
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

// Simple localStorage helpers
const loadFromStorage = <T,>(key: string, defaultValue: T): T => {
  if (typeof window === "undefined") return defaultValue;
  try {
    const item = window.localStorage.getItem(key);
    return item ? JSON.parse(item) : defaultValue;
  } catch {
    return defaultValue;
  }
};

const saveToStorage = <T,>(key: string, value: T) => {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Ignore storage errors
  }
};

const STORAGE_KEY = "orange-tools-storage";

export const useAppStore = create<AppState>((set) => {
  // Load initial state from localStorage
  const stored = loadFromStorage(STORAGE_KEY, {
    theme: "orange" as Theme,
    locale: (typeof navigator !== "undefined" && navigator.language.startsWith("ar") ? "ar" : "en") as Locale,
    chatMessages: [] as ChatMessage[],
  });

  return {
    // Theme
    theme: stored.theme,
    setTheme: (theme) => {
      set({ theme });
      saveToStorage(STORAGE_KEY, { ...stored, theme });
      // Update document classes
      document.documentElement.classList.remove("dark", "orange", "blossom", "mint");
      if (theme === "dark") {
        document.documentElement.classList.add("dark");
      } else {
        document.documentElement.classList.add(theme);
      }
    },
    
    // Locale
    locale: stored.locale,
    setLocale: (locale) => {
      set({ locale });
      saveToStorage(STORAGE_KEY, { ...stored, locale });
      // Update HTML attributes for RTL support
      document.documentElement.lang = locale;
      document.documentElement.dir = locale === "ar" ? "rtl" : "ltr";
    },
    
    // Chat
    chatMessages: stored.chatMessages,
    addChatMessage: (message) => {
      set((state) => {
        const newMessages = [...state.chatMessages, message];
        saveToStorage(STORAGE_KEY, { ...stored, chatMessages: newMessages });
        return { chatMessages: newMessages };
      });
    },
    clearChatMessages: () => {
      set({ chatMessages: [] });
      saveToStorage(STORAGE_KEY, { ...stored, chatMessages: [] });
    },
    
    // UI
    isChatOpen: false,
    setChatOpen: (open) => set({ isChatOpen: open }),
    
    activeTab: "calculator",
    setActiveTab: (tab) => set({ activeTab: tab }),
  };
});
