import { useEffect } from "react";
import { useAppStore } from "@/lib/store";
import { t } from "@/lib/i18n";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ThemeToggle } from "@/components/ThemeToggle";
import { LanguageToggle } from "@/components/LanguageToggle";
import { Chatbot } from "@/components/Chatbot";
import { OrangeCalculator } from "@/components/OrangeCalculator";
import { ProRataCalculator } from "@/components/ProRataCalculator";
import { SummaryPanel } from "@/components/SummaryPanel";
import { Button } from "@/components/ui/button";
import { MessageSquare } from "lucide-react";
import { motion } from "framer-motion";

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
    <div className="min-h-screen bg-background">
      {/* App Bar */}
      <header className="sticky top-0 z-40 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-16 items-center justify-between px-4 sm:px-6">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="flex items-center gap-3"
          >
            <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-primary text-primary-foreground font-bold text-lg">
              O
            </div>
            <h1 className="text-xl sm:text-2xl font-bold" data-testid="text-app-title">
              {t("appTitle", locale)}
            </h1>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
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
      <main className="container px-4 sm:px-6 py-8">
        <div className="grid gap-6 lg:grid-cols-12">
          {/* Main Content Area */}
          <div className="lg:col-span-8 xl:col-span-9">
            <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
              <TabsList className="grid w-full grid-cols-3 mb-8" data-testid="tabs-main">
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

              <TabsContent value="calculator" className="mt-0">
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3 }}
                >
                  <OrangeCalculator />
                </motion.div>
              </TabsContent>

              <TabsContent value="pro-rata" className="mt-0">
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3 }}
                >
                  <ProRataCalculator />
                </motion.div>
              </TabsContent>

              <TabsContent value="assistant" className="mt-0">
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
          </div>

          {/* Summary Panel (Desktop only) */}
          <aside className="hidden lg:block lg:col-span-4 xl:col-span-3">
            <SummaryPanel />
          </aside>
        </div>
      </main>

      {/* Chatbot */}
      <Chatbot />
    </div>
  );
}
