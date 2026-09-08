// Magnetic hover wrapper — desktop only. Element drifts toward cursor (strength 0.3),
// springs back on leave. zero-config: wraps children in a span.
import { useRef } from "react";
import { gsap, useGSAP, finePointer } from "../lib/motion-g";

export function Magnetic({ children, strength = 0.3 }: { children: React.ReactNode; strength?: number }) {
  const ref = useRef<HTMLSpanElement>(null);

  useGSAP(() => {
    if (!finePointer()) return;
    const el = ref.current!;
    const xTo = gsap.quickTo(el, "x", { duration: 0.4, ease: "power3" });
    const yTo = gsap.quickTo(el, "y", { duration: 0.4, ease: "power3" });
    const move = (e: PointerEvent) => {
      const r = el.getBoundingClientRect();
      xTo((e.clientX - (r.left + r.width / 2)) * strength);
      yTo((e.clientY - (r.top + r.height / 2)) * strength);
    };
    const leave = () => { xTo(0); yTo(0); };
    el.addEventListener("pointermove", move);
    el.addEventListener("pointerleave", leave);
    return () => {
      el.removeEventListener("pointermove", move);
      el.removeEventListener("pointerleave", leave);
    };
  }, { scope: ref });

  return <span ref={ref} className="magnetic">{children}</span>;
}
