"use client";

import React, { useEffect, useMemo } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";

export type SplashScreenProps = {
  /** Controls visibility */
  visible: boolean;
  /** Big letter or logo element shown in the tile */
  logo?: React.ReactNode;
  /** Subtitle/brand line under the tile */
  subtitle?: string;
  /** Called after exit animation completes or user skips */
  onFinish?: () => void;
  /** Auto hide after N ms (runs on mount while visible) */
  autoHideAfter?: number;
  /** 0..100 to show a progress bar; omit to hide */
  progress?: number;
  /** Optional tips that rotate while loading */
  tips?: string[];
  /** Allow user to skip via button / ESC */
  allowSkip?: boolean;
  /** Customize accent color (Tailwind color or hex) */
  accent?: string; // e.g. "#FF7A00" or "orange-500"
  /** Extra class on the outer overlay */
  className?: string;
};

/**
 * Production‑ready Splash Screen
 * - Accessible (role="status", aria-busy, ESC to skip)
 * - Respects prefers‑reduced‑motion
 * - Optional auto-hide & onFinish callback
 * - Optional progress bar & rotating tips
 * - Theming through the `accent` prop (uses CSS vars)
 */
export default function SplashScreen({
  visible,
  logo = (
    <span className="text-4xl font-black text-white tracking-tight">O</span>
  ),
  subtitle = "Orange Tools",
  onFinish,
  autoHideAfter,
  progress,
  tips,
  allowSkip = true,
  accent = "#FF7A00",
  className,
}: SplashScreenProps) {
  const prefersReducedMotion = useReducedMotion();

  // Auto hide timer
  useEffect(() => {
    if (!visible || !autoHideAfter) return;
    const id = setTimeout(() => {
      onFinish?.();
    }, autoHideAfter);
    return () => clearTimeout(id);
  }, [visible, autoHideAfter, onFinish]);

  // ESC to skip
  useEffect(() => {
    if (!visible || !allowSkip) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onFinish?.();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [visible, allowSkip, onFinish]);

  const tip = useMemo(() => {
    if (!tips?.length) return null;
    const i = Math.floor((Date.now() / 3000) % tips.length);
    return tips[i];
  }, [tips, visible]);

  const overlayVariants = {
    initial: { opacity: 0 },
    animate: { opacity: 1 },
    exit: { opacity: 0 },
  } as const;

  const tileVariants = prefersReducedMotion
    ? {
        initial: { opacity: 0.9 },
        animate: { opacity: 1 },
        exit: { opacity: 0.9 },
      }
    : {
        initial: { scale: 0.8, opacity: 0 },
        animate: {
          scale: 1,
          opacity: 1,
          transition: { duration: 0.6, ease: [0.19, 1, 0.22, 1] },
        },
        exit: { scale: 0.98, opacity: 0, transition: { duration: 0.35 } },
      };

  const ringVariants = prefersReducedMotion
    ? { animate: { opacity: 0.35 } }
    : {
        animate: { scale: [1, 1.06, 1], opacity: [0.5, 0.9, 0.5] },
        transition: { duration: 2.2, repeat: Infinity },
      };

  // Accent color via CSS var so gradients & shadows can reference it
  const accentStyle: React.CSSProperties = {
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    "--accent": accent,
  } as React.CSSProperties;

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          key="splash"
          role="status"
          aria-busy={true}
          aria-live="polite"
          className={[
            "fixed inset-0 z-[80] flex items-center justify-center bg-[rgba(255,244,234,0.92)] backdrop-blur-xl",
            "dark:bg-[rgba(15,10,6,0.9)]",
            className ?? "",
          ].join(" ")}
          variants={overlayVariants}
          initial="initial"
          animate="animate"
          exit="exit"
          transition={{ duration: 0.35 }}
          style={accentStyle}
        >
          <motion.div
            className="relative flex h-36 w-36 items-center justify-center rounded-[2.2rem]"
            variants={tileVariants}
          >
            {/* Gradient tile */}
            <div className="absolute inset-0 rounded-[2.2rem] bg-[radial-gradient(120%_120%_at_0%_0%,_var(--accent),_#ff5a00_40%,_#ff3c00_80%)] shadow-[0_32px_80px_-30px_rgba(255,90,0,0.7)] ring-1 ring-white/20 dark:ring-black/20" />

            {/* Glow pulse */}
            <motion.div
              className="absolute inset-[-6px] rounded-[2.5rem] blur-2xl opacity-60"
              style={{
                background:
                  "radial-gradient(75% 75% at 50% 50%, var(--accent), transparent)",
              }}
              {...ringVariants}
            />

            {/* Logo */}
            <motion.div
              initial={
                prefersReducedMotion ? { opacity: 1 } : { y: 10, opacity: 0 }
              }
              animate={{
                y: 0,
                opacity: 1,
                transition: { delay: 0.15, duration: 0.45 },
              }}
              className="relative z-10 select-none"
            >
              {logo}
            </motion.div>
          </motion.div>

          {/* Subtitle */}
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{
              opacity: 1,
              y: 0,
              transition: { delay: 0.28, duration: 0.4 },
            }}
            className="absolute mt-32 text-center"
          >
            <div className="text-base font-semibold tracking-tight text-[color:var(--accent)] drop-shadow-[0_1px_0_rgba(255,255,255,0.25)] dark:drop-shadow-none">
              {subtitle}
            </div>

            {/* Progress bar */}
            {typeof progress === "number" && (
              <div className="mt-4 h-2 w-64 overflow-hidden rounded-full bg-black/10 dark:bg-white/10">
                <motion.div
                  className="h-full bg-[color:var(--accent)]"
                  initial={{ width: 0 }}
                  animate={{
                    width: `${Math.max(0, Math.min(100, progress))}%`,
                  }}
                  transition={{ type: "tween", duration: 0.25 }}
                />
              </div>
            )}

            {/* Tip line */}
            {tip && (
              <div className="mt-3 text-xs text-black/60 dark:text-white/60">
                {tip}
              </div>
            )}
          </motion.div>

          {/* Skip button (visually subtle) */}
          {allowSkip && (
            <button
              type="button"
              onClick={() => onFinish?.()}
              className="absolute bottom-6 right-6 rounded-full border border-black/10 bg-white/60 px-3 py-1.5 text-xs font-medium text-black/70 backdrop-blur-md transition hover:bg-white hover:text-black dark:border-white/10 dark:bg-white/10 dark:text-white/80 dark:hover:bg-white/20"
              aria-label="Skip splash screen"
            >
              تخطي
            </button>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
