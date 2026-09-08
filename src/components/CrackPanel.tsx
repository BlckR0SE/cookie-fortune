// CrackPanel — THE hero moment. State machine keyed to REAL tx events:
// idle → signing (squeeze + pulse ring) → confirming (crumble shake, live slot)
// → revealing → revealed (fortune card flip-in; golden = confetti + gold wash).
// GSAP drives transforms only. Reduced motion: crossfade path, content identical.
import { PublicKey } from "@solana/web3.js";
import { useCallback, useEffect, useRef, useState } from "react";
import * as wallet from "../lib/wallet";
import { gsap, useGSAP } from "../lib/motion-g";
import { Magnetic } from "./Magnetic";
import { useReveals } from "./Reveals";
import {
  DRAW_COST_COOK,
  GOLDEN_IDX,
  confettiBurst,
  fortuneForSlot,
  prefersReducedMotion,
  preloadFortunes,
  runDraw,
  type Fortune,
} from "../lib/crack";
import { connection, txUrl } from "../lib/rpc";
import { insufficientGasError, mapWalletError, useSetError, type AppError } from "./ErrorPanel";

type Phase = "idle" | "signing" | "confirming" | "revealing" | "revealed";

export function CrackPanel({ onRevealed }: { onRevealed?: () => void }) {
  const [phase, setPhase] = useState<Phase>("idle");
  const [slot, setSlot] = useState<number | null>(null);
  const [result, setResult] = useState<{ sig: string; slot: number; idx: number; fortune: Fortune; golden: boolean } | null>(null);
  const [inlineErr, setInlineErr] = useState<AppError | null>(null);
  const [balance, setBalance] = useState<number | null>(null);
  const addr = useRef<string | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stageRef = useRef<HTMLElement>(null);
  const cookieRef = useRef<HTMLButtonElement>(null);
  const halvesRef = useRef<HTMLDivElement>(null);
  const paperRef = useRef<HTMLDivElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const setError = useSetError();

  useReveals(stageRef);

  // address via wallet event (no polling); preflight balance check
  useEffect(
    () =>
      wallet.onWalletEvent((e) => {
        if (e.type === "connected") {
          addr.current = e.address;
          connection.getBalance(new PublicKey(e.address)).then(setBalance).catch(() => setBalance(null));
        }
        if (e.type === "disconnected") {
          addr.current = null;
          setPhase("idle");
          setResult(null);
        }
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  // preload 64 fortune JSONs at idle — reveal is instant
  useEffect(() => {
    preloadFortunes().catch((e) => setError({
      variant: "rpc-unreachable", placement: "banner",
      proverb: "The bakery's phone line is busy.",
      truth: "(Fortune pack failed to load — retrying is safe.)",
      action: { label: "Retry now", onClick: () => preloadFortunes().catch(() => {}) },
      code: String(e),
    }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // idle: breathing cookie + cursor parallax (desktop). Subtle, transform-only.
  useGSAP(() => {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (!reduced && cookieRef.current) {
      gsap.to(cookieRef.current, { y: -10, duration: 2.2, ease: "sine.inOut", yoyo: true, repeat: -1 });
    }
    if (!reduced && stageRef.current && window.matchMedia("(hover: hover) and (pointer: fine)").matches) {
      const el = stageRef.current;
      const move = (e: PointerEvent) => {
        const r = el.getBoundingClientRect();
        const dx = (e.clientX - (r.left + r.width / 2)) / r.width;
        const dy = (e.clientY - (r.top + r.height / 2)) / r.height;
        gsap.to(".cookie-stage-wrap", { x: dx * 18, y: dy * 12, rotate: dx * 3, duration: 0.8, ease: "power3.out" });
      };
      el.addEventListener("pointermove", move, { passive: true });
      return () => el.removeEventListener("pointermove", move);
    }
  }, { scope: stageRef });

  const crack = useCallback(async () => {
    const address = addr.current;
    if (!address) {
      setError(mapWalletError(Object.assign(new Error("connect first"), { code: "not-installed" })));
      return;
    }
    // preflight: draw cost + fee buffer, BEFORE wallet prompt (plan S8)
    let bal: number | null = null;
    try {
      bal = await connection.getBalance(new PublicKey(address));
    } catch {
      setError(insufficientGasError(NaN, DRAW_COST_COOK));
      return;
    }
    setBalance(bal / 1e9);
    const need = DRAW_COST_COOK + 0.0001;
    if (bal / 1e9 < need) {
      setInlineErr(insufficientGasError(bal / 1e9, need));
      return;
    }
    setInlineErr(null);
    setResult(null);
    setSlot(null);
    setPhase("signing");
    try {
      const { sig, slot: confirmed } = await runDraw(
        address,
        (stage) => setPhase(stage),
        (s) => setSlot(s),
      );
      // confirmed callback → split ≤200ms (phase swap is sync here), reveal ≤900ms
      const { idx, fortune } = fortuneForSlot(await preloadFortunes(), confirmed);
      setPhase("revealing");
      setResult({ sig, slot: confirmed, idx, fortune, golden: idx === GOLDEN_IDX });
      requestAnimationFrame(() => paperRef.current?.classList.add("out"));
      window.setTimeout(() => {
        setPhase("revealed");
        if (idx === GOLDEN_IDX) canvasRef.current && confettiBurst(canvasRef.current);
        window.dispatchEvent(new Event("balance-refresh"));
        onRevealed?.();
      }, prefersReducedMotion() ? 150 : 750);
    } catch (e) {
      setPhase("idle"); // shake stops immediately, stage returns to idle after dismiss
      const err = e as { code?: string; message?: string };
      const msg = err?.message ?? String(e);
      if (err?.code === "user-reject" || /reject|denied|cancel/i.test(msg)) {
        setError(mapWalletError(e));
      } else if (err?.code === "confirm-timeout" || /blockhash/i.test(msg)) {
        setError({
          variant: "blockhash-expired", placement: "inline",
          proverb: "The dough went stale.",
          truth: "(Blockhash expired — retrying…)",
          action: { label: "Crack again" },
          code: msg,
        });
      } else {
        setError({
          variant: "rpc-unreachable", placement: "banner",
          proverb: "The bakery's phone line is busy.",
          truth: "(Draw failed — retrying is safe.)",
          action: { label: "Crack again" },
          code: msg,
        });
      }
    }
  }, [onRevealed, setError]);

  // ---- GSAP choreography, driven purely by `phase` (real tx events) ----
  useGSAP(() => {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced) return;
    const cookie = cookieRef.current;
    const paper = paperRef.current;
    const card = cardRef.current;
    const halves = halvesRef.current;
    const halo = stageRef.current?.querySelector(".cookie-halo") ?? null;

    if (phase === "signing" && cookie) {
      // squeeze: cookie compresses under pressure, halo pulses (anticipation)
      gsap.timeline()
        .to(cookie, { scale: 0.94, rotate: -2, duration: 0.25, ease: "power2.in" })
        .to(cookie, { scale: 0.96, rotate: 1.5, duration: 0.2, yoyo: true, repeat: -1, ease: "sine.inOut" });
      if (halo) gsap.fromTo(halo, { opacity: 0, scale: 0.85 }, { opacity: 0.5, scale: 1.15, duration: 0.9, repeat: -1, yoyo: true, ease: "sine.inOut" });
    }
    if (phase === "confirming" && cookie) {
      // crumble: violent micro-shake (slot confirmation = <1s of pure tension)
      gsap.killTweensOf([cookie, ...(halo ? [halo] : [])]);
      gsap.to(cookie, { x: "random(-4,4)", y: "random(-3,3)", rotate: "random(-3,3)", duration: 0.06, repeat: -1, ease: "none" });
      if (halo) gsap.to(halo, { opacity: 0.7, scale: 1.3, duration: 0.4 });
    }
    if (phase === "revealing" && halves) {
      // THE CRACK: snap apart + crumbs burst + paper slips out
      gsap.killTweensOf([cookie, ...(halo ? [halo] : [])]);
      gsap.timeline()
        .to(cookie ?? halves, { scale: 1.12, duration: 0.1, ease: "power4.in" })
        .to(halo ?? halves, { opacity: 0, scale: 1.6, duration: 0.3 }, "<")
        .fromTo(".half-l", { xPercent: 0, rotate: 0 }, { xPercent: -58, rotate: -16, y: 26, duration: 0.7, ease: "power3.out" }, "<")
        .fromTo(".half-r", { xPercent: 0, rotate: 0 }, { xPercent: 58, rotate: 16, y: 30, duration: 0.7, ease: "power3.out" }, "<")
        .fromTo(".crumb", { opacity: 0, scale: 0.3 }, {
          opacity: 1, scale: 1,
          x: (i) => (i % 2 ? 1 : -1) * (70 + (i % 5) * 34),
          y: (i) => -40 + (i % 4) * 44,
          rotate: () => gsap.utils.random(-160, 160),
          duration: 0.8, stagger: 0.015, ease: "power2.out",
        }, "<")
        .fromTo(paper ?? halves, { yPercent: 60, opacity: 0 }, { yPercent: 0, opacity: 1, duration: 0.5, ease: "back.out(1.6)" }, "-=0.35");
    }
    if (phase === "revealed" && card) {
      // fortune card: paper flip-in; golden gets a light-sweep
      gsap.fromTo(card,
        { rotateY: -70, opacity: 0, y: 30 },
        { rotateY: 0, opacity: 1, y: 0, duration: 0.7, ease: "power4.out" });
      if (result?.golden) {
        gsap.fromTo(".gold-sweep", { xPercent: -120 }, { xPercent: 120, duration: 1.1, ease: "power2.inOut" });
      }
    }
  }, { scope: stageRef, dependencies: [phase, result] });

  const busy = phase === "signing" || phase === "confirming" || phase === "revealing";
  const statusChip =
    phase === "signing" ? "Waiting for your signature…" :
    phase === "confirming" ? slot != null ? `Confirming · slot ${slot}` : "Confirming on Cookie Chain…" :
    phase === "revealing" ? "Confirmed — opening…" : null;

  const showingRevealed = phase === "revealed" && result != null;

  return (
    <section ref={stageRef} className="stage" id="stage" aria-label="Crack a cookie">
      <canvas ref={canvasRef} className="confetti-canvas" aria-hidden />
      {!showingRevealed ? (
        <>
          <div className="cookie-stage-wrap">
            <div className={`cookie-halo`} aria-hidden />
            <div className="cookie-wrap" ref={halvesRef}>
              <img src={`${import.meta.env.BASE_URL}steam.svg`} alt="" aria-hidden className="steam" />
              {result ? (
                <>
                  <img src={`${import.meta.env.BASE_URL}cookie-half-left.svg`} alt="" aria-hidden className="half-l" />
                  <img src={`${import.meta.env.BASE_URL}cookie-half-right.svg`} alt="" aria-hidden className="half-r" />
                  {[...Array(8)].map((_, i) => (
                    <img key={i} src={`${import.meta.env.BASE_URL}crumb.svg`} alt="" aria-hidden className={`crumb c${i + 1}`} />
                  ))}
                </>
              ) : (
                <Magnetic strength={0.25}>
                  <button
                    ref={cookieRef}
                    className="cookie-btn"
                    onClick={crack}
                    disabled={busy}
                    data-cursor="crack it"
                    aria-label="Crack a cookie for 0.001 COOK"
                  >
                    <img src={`${import.meta.env.BASE_URL}cookie-whole.svg`} alt="" aria-hidden className="cookie-whole" />
                  </button>
                </Magnetic>
              )}
              <div ref={paperRef} className="paper-slip" aria-hidden={phase !== "revealed"}>
                <img src={`${import.meta.env.BASE_URL}paper-slip.svg`} alt="" aria-hidden />
              </div>
            </div>
          </div>
          <p className="proverb" data-reveal>{result ? result.fortune.fortune : "Your fortune awaits."}</p>
          <div className="status-row" role="status" aria-live="polite">
            {statusChip && <span className="chip live">{statusChip}</span>}
            <span className="chip">Crack a cookie · {DRAW_COST_COOK} COOK</span>
            {balance != null && <span className="chip num">balance {balance.toFixed(4)} COOK</span>}
          </div>
        </>
      ) : (
        result && (
          <div className="on-paper reveal-wrap">
            <span className="gold-sweep" aria-hidden />
            <div ref={cardRef} className={`on-paper ${result.golden ? "card-golden" : "card-fortune"} reveal-in`} role="status">
              <p className="fortune-text">{result.fortune.fortune}</p>
              <div className="card-meta">
                <span className="num">Serial #{result.slot}</span>
                <span className="num">slot {result.slot} · idx {result.idx}</span>
                {result.golden && <span className="gold-badge">50% of today's pot is yours — payout within 24h, tx will appear here.</span>}
                <a className="link-explorer" href={txUrl(result.sig)} target="_blank" rel="noopener" data-cursor="verify">Draw tx on Cookiescan</a>
              </div>
              <div style={{ marginTop: 16 }}>
                <button className="btn-ghost" onClick={() => { setResult(null); setPhase("idle"); setSlot(null); }}>Crack another</button>
              </div>
            </div>
          </div>
        )
      )}
      {inlineErr && (
        <div className="error-inline" role="alert">
          <p className="error-proverb">{inlineErr.proverb}</p>
          <p className="error-truth">{inlineErr.truth}</p>
          <a className="link-explorer" href="#get-gas">Get gas ↓</a>
          {inlineErr.extraLinks?.map((l) => (
            <a key={l.href} className="link-explorer" href={l.href} target="_blank" rel="noopener">{l.label}</a>
          ))}
        </div>
      )}
    </section>
  );
}
