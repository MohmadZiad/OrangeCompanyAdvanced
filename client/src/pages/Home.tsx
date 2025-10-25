import { useEffect } from "react";
import { useAppStore } from "@/lib/store";
import { t } from "@/lib/i18n";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ThemeToggle } from "@/components/ThemeToggle";
import { LanguageToggle } from "@/components/LanguageToggle";
import { Chatbot } from "@/components/Chatbot";
import { OrangeCalculator } from "@/components/OrangeCalculator";
import ProRataCalculator from "@/components/ProRataCalculator";
import { SummaryPanel, SummaryPanelMobile } from "@/components/SummaryPanel";
import { Button } from "@/components/ui/button";
import { MessageSquare } from "lucide-react";
import { motion } from "framer-motion";
import { AssistantHint } from "@/components/AssistantHint";

export default function Home() {
  const { theme, setTheme, locale, setLocale, activeTab, setActiveTab, setChatOpen } = useAppStore();

  useEffect(() => {
    // Initialize theme and locale from store
    const html = document.documentElement;
    html.classList.remove("dark", "orange", "blossom", "mint");
    if (theme === "dark") {
      html.classList.add("dark");
    } else {
      html.classList.add(theme);
    }
    html.lang = locale;
    html.dir = locale === "ar" ? "rtl" : "ltr";
  }, [theme, locale]);

  useEffect(() => {
    // Handle hash-based navigation
    const hash = window.location.hash.slice(1);
    if (hash && ["calculator", "pro-rata", "assistant"].includes(hash)) {
      setActiveTab(hash);
      if (hash === "assistant") {
        setChatOpen(true);
      }
    }

    const handleHashChange = () => {
      const newHash = window.location.hash.slice(1);
      if (newHash && ["calculator", "pro-rata", "assistant"].includes(newHash)) {
        setActiveTab(newHash);
        if (newHash === "assistant") {
          setChatOpen(true);
        }
      }
    };

    window.addEventListener("hashchange", handleHashChange);
    return () => window.removeEventListener("hashchange", handleHashChange);
  }, [setActiveTab, setChatOpen]);

  const handleTabChange = (value: string) => {
    setActiveTab(value);
    window.location.hash = value;
    if (value === "assistant") {
      setChatOpen(true);
    }
  };

  return (
    <div className="relative z-10 flex min-h-screen flex-col">
      {/* App Bar */}
      <header className="sticky top-0 z-40 w-full border-b border-white/50 bg-white/65 shadow-[0_18px_48px_-32px_rgba(255,90,0,0.55)] backdrop-blur-xl supports-[backdrop-filter]:bg-white/60 dark:bg-black/40 dark:border-white/10">
        <div className="container flex h-20 items-center justify-between px-4 sm:px-6">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
            className="flex items-center gap-4"
          >
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-[#FF7A00] via-[#FF5400] to-[#FF3C00] text-xl font-bold text-white shadow-[0_20px_40px_-30px_rgba(255,90,0,0.85)]">
              O
            </div>
            <div>
              <motion.h1
                className="text-2xl font-semibold sm:text-3xl"
                data-testid="text-app-title"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2, duration: 0.6, ease: "easeOut" }}
              >
                {t("appTitle", locale)}
              </motion.h1>
              <motion.p
                className="text-sm text-muted-foreground"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.32, duration: 0.6, ease: "easeOut" }}
              >
                {locale === "ar"
                  ? "منصة ذكية لحسابات دقيقة وتجربة فاخرة"
                  : "Premium calculators & assistance for faster, sharper decisions."}
              </motion.p>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
            className="flex items-center gap-2"
          >
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setChatOpen(true);
                setActiveTab("assistant");
                window.location.hash = "assistant";
              }}
              className="hidden sm:flex hover-elevate active-elevate-2"
              data-testid="button-help"
            >
              <MessageSquare className="h-4 w-4 mr-2" />
              {t("help", locale)}
            </Button>
            <ThemeToggle />
            <LanguageToggle />
          </motion.div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container relative z-10 flex-1 px-4 py-10 sm:px-6 sm:py-12">
        <div className="grid gap-8 lg:grid-cols-[1.618fr_minmax(0,1fr)] xl:grid-cols-[1.75fr_minmax(0,1fr)]">
          {/* Main Content Area */}
          <div data-reveal>
            <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full space-y-8">
              <TabsList className="grid w-full grid-cols-3" data-testid="tabs-main">
                <TabsTrigger value="calculator" data-testid="tab-calculator">
                  {t("calculator", locale)}
                </TabsTrigger>
                <TabsTrigger value="pro-rata" data-testid="tab-pro-rata">
                  {t("proRata", locale)}
                </TabsTrigger>
                <TabsTrigger value="assistant" data-testid="tab-assistant">
                  {t("assistant", locale)}
                </TabsTrigger>
              </TabsList>

              <TabsContent value="calculator" className="mt-0" data-reveal>
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3 }}
                >
                  <OrangeCalculator />
                </motion.div>
              </TabsContent>

              <TabsContent value="pro-rata" className="mt-0" data-reveal>
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3 }}
                >
                  <ProRataCalculator />
                </motion.div>
              </TabsContent>

              <TabsContent value="assistant" className="mt-0" data-reveal>
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3 }}
                  className="text-center py-12"
                >
                  <MessageSquare className="h-16 w-16 text-primary mx-auto mb-4" />
                  <h3 className="text-2xl font-bold mb-2">
                    {t("chatTitle", locale)}
                  </h3>
                  <p className="text-muted-foreground mb-6">
                    {t("chatPlaceholder", locale)}
                  </p>
                  <Button
                    onClick={() => setChatOpen(true)}
                    size="lg"
                    data-testid="button-open-assistant"
                  >
                    <MessageSquare className="h-5 w-5 mr-2" />
                    {t("help", locale)}
                  </Button>
                </motion.div>
              </TabsContent>
            </Tabs>
            <div className="mt-8 lg:hidden" data-reveal>
              <SummaryPanelMobile />
            </div>
          </div>

          {/* Summary Panel (Desktop only) */}
          <aside className="hidden lg:block" data-reveal>
            <SummaryPanel />
          </aside>
        </div>
      </main>

      {/* Chatbot */}
      <Chatbot />
      <AssistantHint />
    </div>
  );
}
