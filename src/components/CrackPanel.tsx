// CrackPanel — the hero. State machine keyed to REAL tx events (design.md):
// idle → signing (squeeze) → confirming (crumble shake, live slot) → revealing → revealed.
// Confirmed → split starts ≤200ms, reveal ≤900ms. Reduced motion: crossfade only.
import { PublicKey } from "@solana/web3.js";
import { useCallback, useEffect, useRef, useState } from "react";
import * as wallet from "../lib/wallet";
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
  const paperRef = useRef<HTMLDivElement>(null);
  const setError = useSetError();

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
      // paper slides up 300ms after split (CSS transition-delay handles timing)
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

  const busy = phase === "signing" || phase === "confirming" || phase === "revealing";
  const statusChip =
    phase === "signing" ? "Waiting for your signature…" :
    phase === "confirming" ? slot != null ? `Confirming · slot ${slot}` : "Confirming on Cookie Chain…" :
    phase === "revealing" ? "Confirmed — opening…" : null;

  const showingRevealed = phase === "revealed" && result != null;

  return (
    <section className="stage" id="stage" aria-label="Crack a cookie">
      <canvas ref={canvasRef} className="confetti-canvas" aria-hidden />
      {!showingRevealed ? (
        <>
          <div className={`cookie-wrap ${phase === "confirming" ? "shaking" : ""} ${result ? "split" : ""}`}>
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
              <button
                className={`cookie-btn ${phase === "signing" ? "squeezing" : ""}`}
                onClick={crack}
                disabled={busy}
                aria-label="Crack a cookie for 0.001 COOK"
              >
                <img src={`${import.meta.env.BASE_URL}cookie-whole.svg`} alt="" aria-hidden className="cookie-whole" />
              </button>
            )}
            <div ref={paperRef} className="paper-slip" aria-hidden={phase !== "revealed"}>
              <img src={`${import.meta.env.BASE_URL}paper-slip.svg`} alt="" aria-hidden />
            </div>
          </div>
          <p className="proverb">{result ? result.fortune.fortune : "Your fortune awaits."}</p>
          <div className="status-row" role="status" aria-live="polite">
            {statusChip && <span className="chip">{statusChip}</span>}
            <span className="chip">Crack a cookie · {DRAW_COST_COOK} COOK</span>
            {balance != null && <span className="chip num">balance {balance.toFixed(4)} COOK</span>}
          </div>
        </>
      ) : (
        result && (
          <div className={`on-paper ${result.golden ? "card-golden" : "card-fortune"} reveal-in`} role="status">
            <p className="fortune-text">{result.fortune.fortune}</p>
            <div className="card-meta">
              <span className="num">Serial #{result.slot}</span>
              <span className="num">slot {result.slot} · idx {result.idx}</span>
              {result.golden && <span className="gold-badge">50% of today's pot is yours — payout within 24h, tx will appear here.</span>}
              <a className="link-explorer" href={txUrl(result.sig)} target="_blank" rel="noopener">Draw tx on Cookiescan</a>
            </div>
            <div style={{ marginTop: 16 }}>
              <button className="btn-ghost" onClick={() => { setResult(null); setPhase("idle"); setSlot(null); }}>Crack another</button>
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
