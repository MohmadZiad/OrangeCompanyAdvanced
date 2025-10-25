import { useEffect } from "react";

interface Options {
  rootMargin?: string;
  threshold?: number;
  persistRevealed?: boolean;
}

export function useScrollReveal({
  rootMargin = "0px",
  threshold = 0.2,
  persistRevealed = true,
}: Options = {}) {
  useEffect(() => {
    if (typeof window === "undefined") return;

    const STORAGE_KEY = "revealed-elements";

    // جيب كل العناصر اللي عليها data-reveal
    const elements = Array.from(
      document.querySelectorAll<HTMLElement>("[data-reveal]")
    );

    if (elements.length === 0) return;

    // جيب العناصر المحفوظة من قبل
    let revealedSet = new Set<string>();
    if (persistRevealed) {
      try {
        const stored = sessionStorage.getItem(STORAGE_KEY);
        if (stored) {
          revealedSet = new Set(JSON.parse(stored));
        }
      } catch (e) {
        console.warn("Failed to load revealed elements:", e);
      }
    }

    // حدد الـ transition delay لكل عنصر
    elements.forEach((element, index) => {
      const revealKey = element.getAttribute("data-reveal") || `el-${index}`;

      // إذا العنصر كان ظاهر قبل كده، اعرضه مباشرة
      if (revealedSet.has(revealKey)) {
        element.classList.add("reveal-visible");
        element.style.transitionDelay = "0ms";
      } else {
        // حدد delay للـ animation
        element.style.transitionDelay = `${Math.min(index * 80, 320)}ms`;
      }
    });

    // Observer للعناصر الجديدة
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const element = entry.target as HTMLElement;
            element.classList.add("reveal-visible");

            // احفظ في sessionStorage
            if (persistRevealed) {
              const revealKey =
                element.getAttribute("data-reveal") ||
                `el-${elements.indexOf(element)}`;

              try {
                const stored = sessionStorage.getItem(STORAGE_KEY);
                const revealed = stored ? JSON.parse(stored) : [];
                if (!revealed.includes(revealKey)) {
                  revealed.push(revealKey);
                  sessionStorage.setItem(STORAGE_KEY, JSON.stringify(revealed));
                }
              } catch (e) {
                console.warn("Failed to save revealed element:", e);
              }
            }

            // ما تشيل المراقبة - خليها تراقب
            // observer.unobserve(entry.target); // ❌ شيّل هاي السطر
          }
        });
      },
      { rootMargin, threshold }
    );

    // راقب العناصر اللي مش ظاهرة
    elements.forEach((element) => {
      // راقب حتى لو كان ظاهر (للحفاظ على التناسق)
      observer.observe(element);
    });

    return () => observer.disconnect();
  }, [rootMargin, threshold, persistRevealed]);
}
