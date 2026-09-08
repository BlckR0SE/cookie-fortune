// Custom cursor — desktop only (fine pointer), hidden on touch. Dot + trailing ring,
// magnetic hover states via [data-cursor] labels. Disabled under reduced motion.
import { useEffect, useRef } from "react";
import { gsap, finePointer } from "../lib/motion-g";

export function Cursor() {
  const dotRef = useRef<HTMLDivElement>(null);
  const ringRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!finePointer() || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    document.body.classList.add("has-cursor");
    const dot = dotRef.current!;
    const ring = ringRef.current!;
    gsap.set([dot, ring], { xPercent: -50, yPercent: -50, x: -100, y: -100 });
    const xTo = gsap.quickTo(ring, "x", { duration: 0.35, ease: "power3" });
    const yTo = gsap.quickTo(ring, "y", { duration: 0.35, ease: "power3" });
    const dxTo = gsap.quickTo(dot, "x", { duration: 0.12, ease: "power3" });
    const dyTo = gsap.quickTo(dot, "y", { duration: 0.12, ease: "power3" });
    const move = (e: PointerEvent) => {
      xTo(e.clientX); yTo(e.clientY); dxTo(e.clientX); dyTo(e.clientY);
    };
    const over = (e: PointerEvent) => {
      const t = (e.target as HTMLElement).closest("[data-cursor]");
      const label = t?.getAttribute("data-cursor") ?? "";
      ring.classList.toggle("cursor-label", !!label);
      const lbl = ring.querySelector(".cursor-label-text");
      if (lbl) lbl.textContent = label;
      ring.classList.toggle("cursor-hover", !!t && !label);
    };
    window.addEventListener("pointermove", move, { passive: true });
    window.addEventListener("pointerover", over, { passive: true });
    return () => {
      document.body.classList.remove("has-cursor");
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerover", over);
    };
  }, []);

  return (
    <>
      <div ref={dotRef} className="cursor-dot" aria-hidden />
      <div ref={ringRef} className="cursor-ring" aria-hidden>
        <span className="cursor-label-text" aria-hidden />
      </div>
    </>
  );
}
