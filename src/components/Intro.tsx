// Orchestrated page-load intro (≤1.5s, skipped entirely under reduced motion):
// dark curtain + brand wordmark mask-reveal + cookie drop + curtain lift into hero.
// aria-hidden; hero content is behind it from first paint (no SEO/scroll jank).
import { useRef, useState } from "react";
import { gsap, useGSAP, splitChars } from "../lib/motion-g";

export function Intro({ onDone }: { onDone?: () => void }) {
  const ref = useRef<HTMLDivElement>(null);
  const [gone, setGone] = useState(false);

  useGSAP(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setGone(true);
      onDone?.();
      return;
    }
    const chars = splitChars(ref.current!.querySelector(".intro-word")!);
    const tl = gsap.timeline({ onComplete: () => { setGone(true); onDone?.(); } });
    tl.from(".intro-mark", { scale: 0.6, opacity: 0, rotate: -20, duration: 0.5, ease: "back.out(2)" })
      .from(chars, { yPercent: 120, stagger: 0.03, duration: 0.45, ease: "power4.out" }, "-=0.2")
      .to(ref.current, { yPercent: -100, duration: 0.7, ease: "power4.inOut" }, "+=0.15");
  }, { scope: ref });

  if (gone) return null;
  return (
    <div ref={ref} className="intro" aria-hidden>
      <div className="intro-inner">
        <img className="intro-mark" src={`${import.meta.env.BASE_URL}favicon.svg`} alt="" />
        <h2 className="intro-word" data-split>Cookie Fortune</h2>
        <p className="intro-sub">crack · reveal · collect</p>
      </div>
    </div>
  );
}
