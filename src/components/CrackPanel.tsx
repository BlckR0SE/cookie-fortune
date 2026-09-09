// CrackPanel — THE RECEIPT hero. State machine keyed to REAL tx events
// (idle → signing → confirming → revealing → revealed, via runDraw(onStage,onSlot)):
//   signing    squeeze pulse + typed status
//   confirming micro-shake + live slot digits
//   revealing  shared-contour tear (halves ±58px/∓9°), crumbs, slip prints out,
//              printline fills dot-by-dot → PRINTED ✓ (never a progress bar)
//   revealed   typewriter fortune (26ms/char), stamp slam, golden = gold ink
//              + GOLDEN №63 stamp + confetti. Reduced motion: state swaps only.
import { PublicKey } from "@solana/web3.js";
import { useCallback, useEffect, useRef, useState } from "react";
import * as wallet from "../lib/wallet";
import { gsap, useGSAP } from "../lib/motion-g";
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

// Tear contour: defined ONCE (8-segment polyline, §12.3); the right clip-path is
// the SAME point list mirrored (240−x) with x pulled 2px inward → 2px overlap along
// the seam fills the anti-alias hairline without a visible double-jag.
const TEAR_L = "M0 0 H120 L110 30 L122 58 L108 88 L120 118 L110 148 L122 178 L110 208 L119 240 H0 Z";
const TEAR_R = "M240 0 H120 L112 30 L124 58 L110 88 L122 118 L112 148 L124 178 L112 208 L121 240 H240 Z";

export function CrackPanel({ onRevealed }: { onRevealed?: () => void }) {
  const [phase, setPhase] = useState<Phase>("idle");
  const [slot, setSlot] = useState<number | null>(null);
  const [result, setResult] = useState<{ sig: string; slot: number; idx: number; fortune: Fortune; golden: boolean } | null>(null);
  const [inlineErr, setInlineErr] = useState<AppError | null>(null);
  const addr = useRef<string | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const zoneRef = useRef<HTMLElement>(null);
  const cookieRef = useRef<HTMLButtonElement>(null);
  const setError = useSetError();

  // address via wallet event (no polling); balance cache for preflight display
  useEffect(
    () =>
      wallet.onWalletEvent((e) => {
        if (e.type === "connected") {
          addr.current = e.address;
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
    preloadFortunes().catch((e) =>
      setError({
        variant: "rpc-unreachable",
        placement: "banner",
        proverb: "The bakery's phone line is busy.",
        truth: "(Fortune pack failed to load — retrying is safe.)",
        action: { label: "Retry now", onClick: () => preloadFortunes().catch(() => {}) },
        code: String(e),
      }),
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const crack = useCallback(async () => {
    const address = addr.current;
    if (!address) {
      setError(mapWalletError(Object.assign(new Error("connect first"), { code: "not-installed" })));
      return;
    }
    // preflight: draw cost + fee buffer, BEFORE wallet prompt
    let bal: number;
    try {
      bal = await connection.getBalance(new PublicKey(address));
    } catch {
      setError(insufficientGasError(NaN, DRAW_COST_COOK));
      return;
    }
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
      const { idx, fortune } = fortuneForSlot(await preloadFortunes(), confirmed);
      setPhase("revealing");
      setResult({ sig, slot: confirmed, idx, fortune, golden: idx === GOLDEN_IDX });
      window.setTimeout(() => {
        setPhase("revealed");
        if (idx === GOLDEN_IDX && canvasRef.current) confettiBurst(canvasRef.current);
        window.dispatchEvent(new Event("balance-refresh"));
        onRevealed?.();
      }, prefersReducedMotion() ? 150 : 2050); // tear 700ms + slip-in 450ms + printline ~1s
    } catch (e) {
      setPhase("idle"); // shake stops immediately
      const err = e as { code?: string; message?: string };
      const msg = err?.message ?? String(e);
      if (err?.code === "user-reject" || /reject|denied|cancel/i.test(msg)) {
        setError(mapWalletError(e));
      } else if (err?.code === "confirm-timeout" || /blockhash/i.test(msg)) {
        setError({
          variant: "blockhash-expired",
          placement: "inline",
          proverb: "The dough went stale.",
          truth: "(Blockhash expired — retrying is safe.)",
          action: { label: "Crack again" },
          code: msg,
        });
      } else {
        setError({
          variant: "rpc-unreachable",
          placement: "banner",
          proverb: "The bakery's phone line is busy.",
          truth: "(Draw failed — retrying is safe.)",
          action: { label: "Retry now" },
          code: msg,
        });
      }
    }
  }, [onRevealed, setError]);

  // ---- GSAP choreography, driven purely by `phase` (real tx events) ----
  useGSAP(
    () => {
      if (prefersReducedMotion()) return;
      const cookie = cookieRef.current;
      if (phase === "signing" && cookie) {
        // squeeze: cookie compresses under pressure (anticipation)
        gsap.killTweensOf(cookie);
        gsap
          .timeline()
          .to(cookie, { scale: 0.94, duration: 0.25, ease: "power2.in" })
          .to(cookie, { scale: 0.96, duration: 0.2, yoyo: true, repeat: -1, ease: "sine.inOut" });
      }
      if (phase === "confirming" && cookie) {
        // micro-shake ±3px/60ms — sub-second chain = sub-second shake
        gsap.killTweensOf(cookie);
        gsap.to(cookie, { x: "random(-3,3)", y: "random(-3,3)", duration: 0.06, repeat: -1, ease: "none" });
      }
      if (phase === "revealing" && cookie) {
        gsap.killTweensOf(cookie);
        gsap.set(cookie, { scale: 1, x: 0, y: 0, rotate: 0 });
      }
      if (phase === "revealed" && result?.golden && zoneRef.current) {
        // golden: nothing extra in GSAP — confetti (canvas) + gold ink + stamp carry it
      }
    },
    { scope: zoneRef, dependencies: [phase] },
  );

  const busy = phase === "signing" || phase === "confirming" || phase === "revealing";
  const status =
    phase === "signing" ? "AWAITING SIGNATURE — DO NOT LEAVE THE COUNTER" :
    phase === "confirming" ? slot != null ? `CONFIRMING · SLOT ${slot.toLocaleString()}` : "CONFIRMING" :
    phase === "revealing" ? "CONFIRMED ✓ — TEARING…" :
    phase === "revealed" ? "FORTUNE PRINTED — KEEP THIS SLIP" :
    "FEED ME A COOKIE";
  const cursorOn = phase === "idle" || phase === "signing" || phase === "confirming";

  const showingSlip = (phase === "revealing" || phase === "revealed") && result != null;

  return (
    <section ref={zoneRef} className={`crack${phase === "revealing" || phase === "revealed" ? " torn" : ""}`} id="crack" aria-label="Crack a cookie">
      <canvas ref={canvasRef} className="confetti-canvas" aria-hidden />
      <p className="status" role="status" aria-live="polite">
        {status}
        {cursorOn && <span className="cur">█</span>}
      </p>

      <div className="cookie-wrap" aria-hidden={showingSlip || undefined}>
        <svg className="cookie-svg" viewBox="0 0 240 240" aria-hidden="true">
          <defs>
            <pattern id="dts" width="6" height="6" patternUnits="userSpaceOnUse">
              <circle cx="1.6" cy="1.6" r="1.15" fill="var(--paper)" />
            </pattern>
            <clipPath id="cL"><path d={TEAR_L} /></clipPath>
            <clipPath id="cR"><path d={TEAR_R} /></clipPath>
            <g id="cookieBody">
              <circle cx="120" cy="120" r="102" fill="var(--ink)" />
              <circle cx="120" cy="120" r="102" fill="url(#dts)" />
              <circle cx="88" cy="86" r="9" fill="var(--paper)" />
              <circle cx="150" cy="72" r="7" fill="var(--paper)" />
              <circle cx="170" cy="132" r="10" fill="var(--paper)" />
              <circle cx="102" cy="152" r="8" fill="var(--paper)" />
              <circle cx="136" cy="178" r="6" fill="var(--paper)" />
              <circle cx="66" cy="122" r="6" fill="var(--paper)" />
              <path d="M120 18 L120 222" stroke="var(--paper)" strokeWidth="2" strokeDasharray="5 6" opacity=".55" />
            </g>
          </defs>
          {!showingSlip ? (
            <g className="cookie-whole"><use href="#cookieBody" /></g>
          ) : (
            <>
              <g className="half half-l" clipPath="url(#cL)"><use href="#cookieBody" /></g>
              <g className="half half-r" clipPath="url(#cR)"><use href="#cookieBody" /></g>
              <g fill="var(--ink)">
                <circle className="crumb" style={{ "--cx": "-70px", "--cy": "34px", "--cr": "-140deg" } as React.CSSProperties} cx="60" cy="150" r="5" />
                <circle className="crumb" style={{ "--cx": "-96px", "--cy": "8px", "--cr": "80deg" } as React.CSSProperties} cx="96" cy="176" r="4" />
                <circle className="crumb" style={{ "--cx": "-58px", "--cy": "66px", "--cr": "40deg" } as React.CSSProperties} cx="80" cy="120" r="3.4" />
                <circle className="crumb" style={{ "--cx": "66px", "--cy": "22px", "--cr": "120deg" } as React.CSSProperties} cx="176" cy="160" r="5" />
                <circle className="crumb" style={{ "--cx": "96px", "--cy": "52px", "--cr": "-60deg" } as React.CSSProperties} cx="160" cy="190" r="4" />
                <circle className="crumb" style={{ "--cx": "74px", "--cy": "78px", "--cr": "160deg" } as React.CSSProperties} cx="150" cy="108" r="3.2" />
              </g>
            </>
          )}
        </svg>
      </div>

      <div className="crack-actions">
        <button className="btn crack-btn" onClick={crack} disabled={busy} aria-label="Crack a cookie for 0.001 COOK">
          {result ? "CRACK ONE" : "CRACK ONE"}
        </button>
        {result && phase === "revealed" && (
          <button className="btn btn-ghosty again on" onClick={() => { setResult(null); setPhase("idle"); setSlot(null); }}>
            CRACK ANOTHER
          </button>
        )}
      </div>
      <p className="price-note">1 × FORTUNE ····· {DRAW_COST_COOK} COOK</p>

      {result && (
        <div className={`slip printing${result.golden ? " golden" : ""}`}>
          <Printstat done={phase === "revealed"} />
          <div className="row"><span className="k">ITEM</span><span className="dots" /><span className="v">1 × FORTUNE</span></div>
          <div className="row"><span className="k">PAID</span><span className="dots" /><span className="v">{DRAW_COST_COOK} COOK</span></div>
          <div className="row"><span className="k">SERIAL</span><span className="dots" /><span className="v">№ {result.slot}</span></div>
          <FortuneText text={result.fortune.fortune} type={phase === "revealed"} />
          <div className="row"><span className="k">CUSTODY</span><span className="dots" /><span className="v">YOURS · ON-CHAIN</span></div>
          <p className="verify">
            <a href={txUrl(result.sig)} target="_blank" rel="noopener">
              {result.golden ? "VERIFY GOLDEN DRAW ON COOKIESCAN ↗" : "VERIFY DRAW TX ON COOKIESCAN ↗"}
            </a>
          </p>
          <span className={`stamp on${result.golden ? " gold" : ""}`}>{result.golden ? "GOLDEN №63" : "PAID"}</span>
        </div>
      )}

      {inlineErr && (
        <div className="err on" role="alert">
          <span className="stamp on">VOID</span>
          <p className="proverb">{inlineErr.proverb}</p>
          <p className="truth">{inlineErr.truth}</p>
          <a className="btn btn-ghosty" href="#jar">
            Get gas ↓
          </a>
          {inlineErr.extraLinks?.map((l) => (
            <a key={l.href} className="err-link" href={l.href} target="_blank" rel="noopener">{l.label}</a>
          ))}
        </div>
      )}
    </section>
  );
}

// Printline driver (~25 lines, mirrors the typewriter pattern): PRINTING + dots
// fill char-by-char (55ms) + blinking cursor → PRINTING ····· ··· PRINTED ✓,
// then stays printed. Reduced motion: PRINTED ✓ immediately.
function Printstat({ done }: { done: boolean }) {
  const ref = useRef<HTMLParagraphElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (prefersReducedMotion()) {
      el.textContent = "PRINTED ✓";
      el.classList.add("done");
      return;
    }
    let i = 0;
    el.innerHTML = `PRINTING <span class="cur">█</span>`;
    const iv = window.setInterval(() => {
      i++;
      if (i >= 26) {
        window.clearInterval(iv);
        el.textContent = "PRINTING ····· ··· PRINTED ✓";
        el.classList.add("done");
      } else {
        el.innerHTML = `PRINTING ${"·".repeat(i)}<span class="cur">█</span>`;
      }
    }, 55);
    return () => window.clearInterval(iv);
  }, []);
  useEffect(() => {
    if (done) ref.current?.classList.add("done");
  }, [done]);
  return <p ref={ref} className="printstat" aria-live="polite" />;
}

// Typewriter: 26ms/char once `type` flips true; reduced motion prints instantly.
function FortuneText({ text, type }: { text: string; type: boolean }) {
  const ref = useRef<HTMLParagraphElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (!type || prefersReducedMotion()) {
      el.textContent = text;
      return;
    }
    let i = 0;
    el.textContent = "";
    const iv = window.setInterval(() => {
      el.textContent = text.slice(0, ++i);
      if (i >= text.length) window.clearInterval(iv);
    }, 26);
    return () => window.clearInterval(iv);
  }, [text, type]);
  return <p ref={ref} className="fortune-text" />;
}
