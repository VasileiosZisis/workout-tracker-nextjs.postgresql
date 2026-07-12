"use client";

import { useEffect } from "react";

export function HomeRevealController() {
  useEffect(() => {
    const root = document.querySelector<HTMLElement>(".home");

    if (!root) {
      return;
    }

    const targets = Array.from(
      root.querySelectorAll<HTMLElement>("[data-reveal]"),
    );

    if (!("IntersectionObserver" in window)) {
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) {
            return;
          }

          entry.target.classList.add("is-visible");
          observer.unobserve(entry.target);
        });
      },
      {
        rootMargin: "0px 0px -10% 0px",
        threshold: 0.1,
      },
    );

    targets.forEach((target) => {
      const bounds = target.getBoundingClientRect();
      const alreadyVisible =
        bounds.top < window.innerHeight * 0.9 && bounds.bottom > 0;

      if (alreadyVisible) {
        target.classList.add("is-visible");
        return;
      }

      observer.observe(target);
    });

    root.classList.add("home-motion-ready");

    return () => {
      observer.disconnect();
      root.classList.remove("home-motion-ready");
    };
  }, []);

  return null;
}
