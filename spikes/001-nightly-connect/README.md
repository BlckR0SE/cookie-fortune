# Spike 001 — Nightly ↔ Cookie Chain ↔ RPC round-trip

**Verdict: PARTIAL** — RPC/tx half fully validated headlessly; wallet half (Nightly extension) requires a browser with Nightly + Cookie Chain RPC configured → human step, runnable via `index.html` (open in browser, click 1→2→3→4, paste log back here).

Per plan S1: "If gas not arrived: mock balance, verify signing only, note it." Gas has not arrived → mock-mode run recorded below.

## What was validated (headless node harness, 2026-09-08)

- RPC `https://rpc.cookiescan.io` live: `getVersion` → `solana-core 4.1.2`, `getSlot` → 23852525. Plan's chain-version assumption confirmed.
- `getLatestBlockhash` works (returned valid hash + `lastValidBlockHeight`).
- Tx shape builds + signs locally: `SystemProgram.transfer(0 lamports, self)` + SPL Memo v2 (`MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr`) data `"SPIKE"` → `tx.sign(kp)` → `tx.verifySignatures() === true`.
- Unfunded wallet: `simulateTransaction` → `err: AccountNotFound` (expected — fee payer has no rent). Chain-acceptance of the shape remains unproven until a funded tx lands.
- `@solana/web3.js@1.98.2` (the version the app will bundle) has **no** `MemoProgram` export — memo must come from `@solana/spl-memo` (`createMemoInstruction("...")`) or a raw `TransactionInstruction`. Spike `index.html` uses the raw instruction (zero extra dep).

## What was NOT validated (needs human + Nightly)

- `getWallets()` wallet-standard registration for Nightly (does Nightly register on Cookie Chain RPC config?)
- `window.nightly?.solana` presence/shape
- connect feature name (`standard:connect` vs custom)
- `standard:signAndSendTransaction` acceptance of our serialized message (chain id gating?)
- Real confirmation latency (< 1s gate) + `getTransaction` memo round-trip on a landed tx

**How to finish:** serve this folder (`npx serve spikes/001-nightly-connect` or open `index.html` directly), with Nightly installed + Cookie Chain RPC. The page prints every quirk candidate inline; paste its log below and flip verdict to VALIDATED/INVALIDATED.

## Observed quirks (fill from browser run)

- (none yet — headless run cannot observe wallet quirks)

## Gate decision (S1 → S2)

Proceed with **D5 (StandardWalletAdapter)** as planned — nothing invalidated it; the adapter's `standard:signAndSendTransaction` path matches what web3.js produces. Direct `window.nightly.solana` provider (~50 lines) stays the pre-committed fallback if the browser run shows unfixable adapter quirks. Decision recorded before S2 per plan.

## Spike tx signature

(mock-mode — no tx landed; paste from browser run when gas arrives)

Explorer: https://cookiescan.io/tx/<signature>
