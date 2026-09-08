// Shared crack-arc utils: fortunes preload, reduced-motion, hand-rolled confetti, draw tx runner.
// Design budget: fonts via CDN only, zero animation libs, zero icon packs.
import { PublicKey, SystemProgram, Transaction } from "@solana/web3.js";
import { createMemoInstruction } from "@solana/spl-memo";
import { connection } from "./rpc";
import * as wallet from "./wallet";

export const GOLDEN_IDX = 63;

// Jar system wallet (plan D6) — keypair held off-repo; address set at S0 keygen.
export const JAR_ADDRESS = "JAR_ADDRESS_PENDING_S0_KEYGEN";
export const DRAW_COST_COOK = 0.001;
export const LAMPORTS_PER_COOK = 1_000_000_000;

export type Fortune = { name: string; fortune: string; image: string };

// Preload all 64 fortune JSONs at idle (text only, ~108K); fortune content instant at reveal.
let cache: Fortune[] | null = null;
export async function preloadFortunes(base = import.meta.env.BASE_URL): Promise<Fortune[]> {
  if (cache) return cache;
  const res = await fetch(`${base}fortunes/manifest.json`);
  if (!res.ok) throw new Error(`fortune preload failed: ${res.status}`);
  cache = (await res.json()) as Fortune[];
  return cache;
}
export const fortuneForSlot = (fortunes: Fortune[], slot: number): { idx: number; fortune: Fortune } => {
  const idx = Number(slot) % fortunes.length;
  return { idx, fortune: fortunes[idx] };
};

export const prefersReducedMotion = (): boolean =>
  typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

// ~60-line Canvas confetti burst (gold/amber/cream, gravity, 1.2s). Golden draws only.
export function confettiBurst(canvas: HTMLCanvasElement): void {
  if (prefersReducedMotion()) return;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const w = (canvas.width = canvas.offsetWidth * dpr);
  const h = (canvas.height = canvas.offsetHeight * dpr);
  const colors = ["#FFC83D", "#E8A25C", "#F6ECD4"];
  const parts = Array.from({ length: 120 }, () => ({
    x: w / 2 + (Math.random() - 0.5) * w * 0.2,
    y: h * 0.35,
    vx: (Math.random() - 0.5) * 9 * dpr,
    vy: (-Math.random() * 7 - 2) * dpr,
    s: (Math.random() * 5 + 3) * dpr,
    c: colors[(Math.random() * colors.length) | 0],
    r: Math.random() * Math.PI,
    vr: (Math.random() - 0.5) * 0.3,
    round: Math.random() < 0.4,
  }));
  const start = performance.now();
  const tick = (now: number) => {
    const t = now - start;
    ctx.clearRect(0, 0, w, h);
    for (const p of parts) {
      p.vy += 0.28 * dpr;
      p.x += p.vx;
      p.y += p.vy;
      p.r += p.vr;
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.r);
      ctx.fillStyle = p.c;
      ctx.globalAlpha = Math.max(0, 1 - t / 1200);
      if (p.round) {
        ctx.beginPath();
        ctx.arc(0, 0, p.s / 2, 0, Math.PI * 2);
        ctx.fill();
      } else {
        ctx.fillRect(-p.s / 2, -p.s / 3, p.s, p.s * 0.66);
      }
      ctx.restore();
    }
    if (t < 1200) requestAnimationFrame(tick);
    else ctx.clearRect(0, 0, w, h);
  };
  requestAnimationFrame(tick);
}

export function buildDrawTx(payer: string, jar: string): Transaction {
  const tx = new Transaction();
  tx.add(
    SystemProgram.transfer({
      fromPubkey: new PublicKey(payer),
      toPubkey: new PublicKey(jar),
      lamports: Math.round(DRAW_COST_COOK * LAMPORTS_PER_COOK),
    }),
  );
  tx.add(createMemoInstruction("COOKIE_FORTUNE_DRAW:v1", [new PublicKey(payer)]));
  return tx;
}

type Coded = Error & { code: string };
const coded = (code: string, message: string): Coded => Object.assign(new Error(message), { code });

export type DrawResult = { sig: string; slot: number };

// Draw flow keyed to REAL tx events (design.md interaction contract):
// signing (wallet prompt in flight) → confirming (raw tx sent; poll statuses, live slot
// surfaces as soon as the block processes) → resolve on confirmed. Blockhash expiry
// auto-retries ONCE with a fresh blockhash (plan S8). Never fakes progress.
export async function runDraw(
  address: string,
  onStage: (stage: "signing" | "confirming") => void,
  onSlot: (slot: number | null) => void,
): Promise<DrawResult> {
  let attempt = 0;
  for (;;) {
    let sig: string;
    try {
      onStage("signing");
      sig = await wallet.signAndSend(buildDrawTx(address, JAR_ADDRESS));
    } catch (e) {
      const err = e as { code?: string; message?: string };
      if (/blockhash|expired/i.test(err?.message ?? "") && attempt++ === 0) {
        coded("blockhash-expired", "Blockhash expired — retrying once").message = "blockhash expired";
        continue; // fresh tx picks up a fresh recent blockhash
      }
      throw e;
    }
    onStage("confirming");
    onSlot(null);
    const start = Date.now();
    for (;;) {
      const { value } = await connection.getSignatureStatuses([sig], { searchTransactionHistory: false });
      const s = value[0];
      if (s?.err) throw coded("draw-failed", `Draw transaction failed on chain: ${JSON.stringify(s.err)}`);
      if (s?.slot) onSlot(s.slot);
      if (s && (s.confirmationStatus === "confirmed" || s.confirmationStatus === "finalized"))
        return { sig, slot: s.slot };
      if (Date.now() - start > 15_000) throw coded("confirm-timeout", "Confirmation timed out after 15s");
      await new Promise((r) => setTimeout(r, 180));
    }
  }
}
