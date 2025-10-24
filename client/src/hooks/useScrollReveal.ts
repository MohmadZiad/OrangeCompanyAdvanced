import { useEffect } from "react";

interface Options {
  rootMargin?: string;
  threshold?: number;
}

export function useScrollReveal({
  rootMargin = "0px",
  threshold = 0.2,
}: Options = {}) {
  useEffect(() => {
    if (typeof window === "undefined") return;

    const elements = Array.from(
      document.querySelectorAll<HTMLElement>("[data-reveal]")
    );

    elements.forEach((element, index) => {
      element.style.transitionDelay = `${Math.min(index * 80, 320)}ms`;
    });

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("reveal-visible");
            observer.unobserve(entry.target);
          }
        });
      },
      { rootMargin, threshold }
    );

    elements.forEach((element) => observer.observe(element));

    return () => observer.disconnect();
  }, [rootMargin, threshold]);
}
