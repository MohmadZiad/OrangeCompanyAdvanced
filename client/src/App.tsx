import { useEffect, useState } from "react";
import { Switch, Route } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import Home from "@/pages/Home";
import NotFound from "@/pages/not-found";
import { AmbientBackdrop } from "@/components/AmbientBackdrop";
import SplashScreen from "./components/SplashScreen";
import { useScrollReveal } from "@/hooks/useScrollReveal";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home}/>
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  const [showSplash, setShowSplash] = useState(true);

  useScrollReveal();

  useEffect(() => {
    const timeout = window.setTimeout(() => setShowSplash(false), 1100);
    return () => window.clearTimeout(timeout);
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <div className="relative min-h-screen overflow-hidden">
          <AmbientBackdrop />
          <AnimatePresence mode="wait">
            <motion.div
              key="router"
              className="relative z-10"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
            >
              <Router />
            </motion.div>
          </AnimatePresence>
          <SplashScreen visible={showSplash} />
        </div>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
