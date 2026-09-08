// Lenis smooth scroll, wired into GSAP ticker + ScrollTrigger.update (skill pattern).
// Skips itself under reduced motion (native scroll stays).
import { useEffect } from "react";
import Lenis from "lenis";
import { gsap, ScrollTrigger } from "../lib/gsap";

export function SmoothScroll() {
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const lenis = new Lenis({ lerp: 0.1, smoothWheel: true });
    lenis.on("scroll", ScrollTrigger.update);
    const raf = (time: number) => lenis.raf(time * 1000);
    gsap.ticker.add(raf);
    gsap.ticker.lagSmoothing(0);
    // anchor links (#raffle, #get-gas) route through Lenis
    const click = (e: MouseEvent) => {
      const a = (e.target as HTMLElement).closest<HTMLAnchorElement>('a[href^="#"]');
      const id = a?.getAttribute("href")?.slice(1);
      if (!id) return;
      const el = document.getElementById(id);
      if (el) {
        e.preventDefault();
        lenis.scrollTo(el, { offset: -64 });
      }
    };
    document.addEventListener("click", click);
    return () => {
      document.removeEventListener("click", click);
      gsap.ticker.remove(raf);
      lenis.destroy();
    };
  }, []);
  return null;
}
