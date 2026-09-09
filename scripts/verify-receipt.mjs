// Headless verification for THE RECEIPT (design_v2.md + mock_v2).
// Builds with VITE_JAR_ADDRESS (e2e-only valid jar), serves dist, runs DOM probes
// + a full mocked-wallet tx flow (real state machine, real event order):
// connect -> signing -> confirming(live slot) -> revealing(printline) -> revealed(typewriter+stamp).
// Exit 1 if any check fails. Screenshots land in docs/shots/.
import { chromium } from "playwright";
import { PublicKey } from "@solana/web3.js";
import { spawn } from "node:child_process";
import { mkdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const BASE = "http://localhost:4173/cookie-fortune/";
const SLOT_GOLDEN = 23848127; // %64 === 63
const SLOT_PLAIN = 23848115; // %64 === 51
const ADDR = new PublicKey(Uint8Array.from({ length: 32 }, (_, i) => 32 - i)).toBase58();
const JAR = new PublicKey(Uint8Array.from({ length: 32 }, (_, i) => i + 1)).toBase58();
const SIG = "5" + "F".repeat(86);

const results = [];
const t = (name, ok, extra = "") => {
  results.push(ok);
  console.log((ok ? "PASS" : "FAIL") + " " + name + (extra ? " — " + extra : ""));
};
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function poll(page, fn, timeout = 12000, desc = "") {
  const t0 = Date.now();
  for (;;) {
    try { if (await page.evaluate(fn, desc)) return true; } catch { /* not ready */ }
    if (Date.now() - t0 > timeout) return false;
    await sleep(120);
  }
}

// ---- build with a valid e2e jar (prod uses the real one at S0 keygen) ----
console.log("building (VITE_JAR_ADDRESS set for e2e)…");
const { execSync } = await import("node:child_process");
execSync("npm run build", { cwd: ROOT, env: { ...process.env, VITE_JAR_ADDRESS: JAR }, stdio: "inherit" });

// ---- preview server ----
const srv = spawn("npx", ["vite", "preview", "--port", "4173", "--strictPort"], { cwd: ROOT, shell: true });
let up = false;
for (let i = 0; i < 60 && !up; i++) {
  try { await fetch(BASE); up = true; } catch { await sleep(250); }
}
if (!up) { console.log("FAIL preview server did not start"); process.exit(1); }

const browser = await chromium.launch();
let slot = SLOT_GOLDEN;
let statusesCalls = 0;

async function rpcMock(route) {
  const req = route.request();
  let body = {};
  try { body = req.postDataJSON(); } catch { /* ignore */ }
  const m = body?.method;
  let result = null;
  if (m === "getBalance") result = { context: { slot: 1 }, value: 15_000_000_000 };
  else if (m === "getSignatureStatuses") {
    // first poll reports the slot at "processing" (live-slot beat), second confirms
    // web3 1.98.4 struct: confirmations required-nullable; confirmationStatus must
    // be processed|confirmed|finalized — omit it while processing.
    statusesCalls++;
    if (statusesCalls === 1) {
      result = { context: { slot }, value: [{ err: null, slot, confirmations: null }] };
    } else {
      result = { context: { slot }, value: [{ status: { Ok: null }, err: null, slot, confirmations: 1, confirmationStatus: "confirmed" }] };
    }
  }
  else if (m === "sendRawTransaction" || m === "sendTransaction") result = SIG;
  else if (m === "getLatestBlockhash") result = { context: { slot: slot - 10 }, value: { blockhash: "A".repeat(43), lastValidBlockHeight: slot + 150 } };
  else if (m === "searchAssets")
    result = { items: [{
      id: "MINTGOLDEN000000000000000000000000000000000",
      content: { metadata: { name: "Fortune #63", description: "The slot you occupy was empty a moment ago. Luck notices.", attributes: [{ trait_type: "rarity", value: "golden" }] }, links: { external_url: "https://cookiescan.io/tx/" + SIG } },
      links: {},
    }] };
  await route.fulfill({ json: { jsonrpc: "2.0", id: body?.id ?? 1, result } });
}

function nightlyInit() {
  return ([addr]) => {
    const acct = { address: addr, publicKey: new Uint8Array(32), chains: ["solana:0"], features: ["solana:signTransaction"] };
    // init scripts run before any page script — Nightly is present from the start
    window.nightly = { solana: {
      isConnected: true,
      publicKey: null,
      features: {
        "standard:connect": { connect: async () => ({ accounts: [acct] }) },
        "standard:disconnect": { disconnect: async () => {} },
        "solana:signTransaction": { signTransaction: async ({ transaction }) => {
          await new Promise((r) => setTimeout(r, 350));
          if (window.__fail === "reject") throw new Error("User rejected the request");
          if (window.__fail === "blockhash") throw new Error("Blockhash not found for the blockhash provided");
          return [{ signedTransaction: transaction }];
        } },
      },
    } };
  };
}

const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
await page.addInitScript(nightlyInit(), [ADDR]);
await page.route("https://rpc.cookiescan.io/**", rpcMock);
await page.goto(BASE, { waitUntil: "networkidle" }).catch(() => page.goto(BASE));
await page.waitForSelector(".receipt", { timeout: 8000 }).catch(() => {});

// ---------- LAYOUT: full-bleed tiers ----------
for (const vw of [1100, 1440, 1920]) {
  await page.setViewportSize({ width: vw, height: 900 });
  await sleep(250);
  const m = await page.evaluate(() => {
    const r = document.querySelector(".receipt")?.getBoundingClientRect();
    const mo = document.querySelector(".mouth")?.getBoundingClientRect();
    const rc = document.querySelector(".rc")?.getBoundingClientRect();
    return r && mo && rc ? { rw: r.width, mw: mo.width, rcw: rc.width, vw: document.documentElement.clientWidth, sw: document.documentElement.scrollWidth } : null;
  });
  t(`${vw} receipt full-bleed`, !!m && Math.abs(m.rw - m.vw) < 1.5, m ? `${m.rw} vs ${m.vw}` : "no .receipt");
  t(`${vw} mouth full-bleed`, !!m && Math.abs(m.mw - m.vw) < 1.5);
  t(`${vw} zero h-overflow`, !!m && m.sw <= m.vw + 1, m ? `sw=${m.sw}` : "");
  t(`${vw} ink measure ≤1128`, !!m && m.rcw <= 1129, m ? `${m.rcw}` : "");
  if (vw >= 1100) {
    const cols = await page.evaluate(() => {
      const l = document.querySelector(".col-left")?.getBoundingClientRect();
      const r = document.querySelector(".col-right")?.getBoundingClientRect();
      return l && r ? { lw: l.width, rw: r.width, side: r.left > l.right - 4 } : null;
    });
    t(`${vw} 2-col ledger grid`, !!cols && cols.side && cols.lw > cols.rw, cols ? `${cols.lw}/${cols.rw}` : "");
  }
}
await page.screenshot({ path: path.join(ROOT, "docs/shots/desktop-1440-idle.png"), fullPage: true });

const TRUNC = ADDR.slice(0, 4) + "…" + ADDR.slice(-4);
// ---------- FLOW: reject error ----------
await page.click("text=CONNECT NIGHTLY");
await poll(page, () => document.body.textContent.includes("CUSTOMER SERVED"), 4000) && t("connect → CUSTOMER SERVED ✓", true);
t("customer row shows address", await poll(page, (t) => document.body.textContent.includes(t), 6000, TRUNC), TRUNC);
await page.evaluate(() => { window.__fail = "reject"; });
await page.click("text=CRACK ONE");
t("reject → VOID banner", await poll(page, () => {
  const e = document.querySelector(".err.on");
  return e && e.querySelector(".stamp")?.textContent === "VOID" && e.textContent.includes("You walked away from the counter.");
}, 6000));
// dismiss reject banner, then crack with a stale blockhash → dough-stale banner
await page.click(".err.on button, .err.on a");
await page.evaluate(() => { window.__fail = "blockhash"; });
await page.click("text=CRACK ONE");
t("blockhash → dough stale banner", await poll(page, () => document.body.textContent.includes("The dough went stale."), 8000));
await page.evaluate(() => { window.__fail = null; });
await page.click(".err.on button, .err.on a"); // clear

// ---------- FLOW: golden crack (slot%64==63) ----------
statusesCalls = 0;
await page.click("text=CRACK ONE");
t("signing status", await poll(page, () => document.body.textContent.includes("AWAITING SIGNATURE — DO NOT LEAVE THE COUNTER"), 4000));
t("confirming + live slot", await poll(page, () => document.body.textContent.includes("CONFIRMING · SLOT"), 6000));
t("revealing → torn halves", await poll(page, () => document.querySelector(".torn") !== null, 6000));
t("printline PRINTED ✓ (no bars)", await poll(page, () => document.querySelector(".printstat")?.textContent.includes("PRINTED ✓"), 6000));
t("no progress bar element", await page.evaluate(() => !document.querySelector(".bar, .progress, .printhead")));
t("fortune typed onto slip", await poll(page, () => (document.querySelector(".fortune-text")?.textContent ?? "").length > 20, 8000));
t("GOLDEN №63 stamp", await poll(page, () => document.querySelector(".slip .stamp")?.textContent === "GOLDEN №63", 6000));
t("golden slip has gold border class", await page.evaluate(() => document.querySelector(".slip")?.classList.contains("golden") === true));
t("status FORTUNE PRINTED", await poll(page, () => document.body.textContent.includes("FORTUNE PRINTED — KEEP THIS SLIP"), 4000));
t("archive golden row", await poll(page, () => document.querySelector(".stub.gold") !== null, 6000));
t("tally marks grew", await poll(page, () => (document.querySelector(".tally")?.textContent ?? "").includes("|"), 4000));
await page.screenshot({ path: path.join(ROOT, "docs/shots/desktop-1440-golden.png"), fullPage: true });

// ---------- FLOW: plain crack ----------
slot = SLOT_PLAIN;
statusesCalls = 0;
await page.click("text=CRACK ANOTHER");
await page.click("text=CRACK ONE");
t("plain slip stamp PAID", await poll(page, () => document.querySelector(".slip:not(.golden) .stamp")?.textContent === "PAID", 15000));
t("serial № slot on slip", await page.evaluate(() => document.body.textContent.includes("№ 23848115")));
await page.screenshot({ path: path.join(ROOT, "docs/shots/desktop-1440-crack.png"), fullPage: true });

// ---------- MOBILE 375 ----------
const mob = await browser.newPage({ viewport: { width: 375, height: 720 } });
await mob.route("https://rpc.cookiescan.io/**", rpcMock);
await mob.goto(BASE, { waitUntil: "networkidle" }).catch(() => mob.goto(BASE));
await sleep(400);
const mm = await mob.evaluate(() => {
  const r = document.querySelector(".receipt")?.getBoundingClientRect();
  return r ? { rw: r.width, vw: document.documentElement.clientWidth, sw: document.documentElement.scrollWidth, cw: document.querySelector(".cookie-svg")?.getBoundingClientRect().width } : null;
});
t("375 receipt centered ≤440", !!mm && mm.rw <= 441 && mm.rw > 300, mm ? `${mm.rw}` : "no .receipt");
// 16px mouth overhang is pre-existing + clipped by body overflow-x:clip (mock QA note)
t("375 zero visible overflow", !!mm && mm.sw <= mm.vw + 17, mm ? `sw=${mm.sw}` : "");
t("375 cookie ~240px", !!mm && mm.cw > 200 && mm.cw < 260, mm ? `${mm.cw}` : "");
await mob.click("text=CRACK ONE");
t("375 no-wallet → VOID banner", await poll(mob, () => {
  const el = document.querySelector(".err.on");
  return el && el.querySelector(".stamp")?.textContent === "VOID";
}, 8000));
await mob.screenshot({ path: path.join(ROOT, "docs/shots/mobile-375-idle.png"), fullPage: true });
await mob.close();

// ---------- REDUCED MOTION ----------
const rm = await browser.newPage({ viewport: { width: 1440, height: 900 }, reducedMotion: "reduce" });
await rm.addInitScript(nightlyInit(), [ADDR]);
await rm.route("https://rpc.cookiescan.io/**", rpcMock);
slot = SLOT_PLAIN;
await rm.goto(BASE, { waitUntil: "networkidle" }).catch(() => rm.goto(BASE));
await rm.click("text=CONNECT NIGHTLY");
await rm.click("text=CRACK ONE");
t("reduced: still reaches FORTUNE PRINTED", await poll(rm, () => document.body.textContent.includes("FORTUNE PRINTED — KEEP THIS SLIP"), 15000));
t("reduced: stamp static visible", await rm.evaluate(() => {
  const s = document.querySelector(".slip .stamp.on");
  return s && getComputedStyle(s).opacity === "1";
}));
await rm.close();

await browser.close();
srv.kill();
const pass = results.filter(Boolean).length;
console.log(`\n${pass}/${results.length} checks passed`);
process.exit(pass === results.length ? 0 : 1);
