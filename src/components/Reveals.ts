// Scroll reveals — batch section headers/cards via ScrollTrigger. One shared hook.
// No scroll-jack, no pins: reveals only, transform/opacity exclusively (60fps rule).
import { gsap, ScrollTrigger, useGSAP, splitChars } from "../lib/motion-g";

export function useReveals(scope: React.RefObject<HTMLElement>, deps: unknown[] = []) {
  useGSAP(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    // kinetic display headings: char rise, once
    document.querySelectorAll<HTMLElement>("[data-split]:not([data-split-done])").forEach((el) => {
      const chars = splitChars(el);
      el.setAttribute("data-split-done", "");
      gsap.from(chars, {
        yPercent: 110,
        stagger: 0.018,
        duration: 0.7,
        ease: "power4.out",
        scrollTrigger: { trigger: el, start: "top 85%", once: true },
      });
    });

    // batched card/section reveals
    ScrollTrigger.batch("[data-reveal]:not([data-reveal-done])", {
      start: "top 88%",
      once: true,
      onEnter: (els) => {
        els.forEach((el) => el.setAttribute("data-reveal-done", ""));
        gsap.from(els, { y: 40, opacity: 0, stagger: 0.08, duration: 0.8, ease: "power3.out" });
      },
    });
    ScrollTrigger.refresh();
  }, { scope, dependencies: deps });
}
