# Spike 001 — Nightly ↔ Cookie Chain ↔ RPC round-trip

**Verdict: FALLBACK ACTIVE (adapter invalidated, direct provider primary)** — RPC/tx half fully validated headlessly; wallet-standard adapter path invalidated by browser run (getWallets(): 0 found); direct `window.nightly.solana` provider connect validated by browser run, sign/send path fixed per Nightly docs (browser re-run pending gas).

Per plan S1: "If gas not arrived: mock balance, verify signing only, note it." Gas has not arrived → mock-mode run recorded below.

## What was validated (headless node harness, 2026-09-08)

- RPC `https://rpc.cookiescan.io` live: `getVersion` → `solana-core 4.1.2`, `getSlot` → 23852525. Plan's chain-version assumption confirmed.
- `getLatestBlockhash` works (returned valid hash + `lastValidBlockHeight`).
- Tx shape builds + signs locally: `SystemProgram.transfer(0 lamports, self)` + SPL Memo v2 (`MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr`) data `"SPIKE"` → `tx.sign(kp)` → `tx.verifySignatures() === true`.
- Unfunded wallet: `simulateTransaction` → `err: AccountNotFound` (expected — fee payer has no rent). Chain-acceptance of the shape remains unproven until a funded tx lands.
- `@solana/web3.js@1.98.2` (the version the app will bundle) has **no** `MemoProgram` export — memo must come from `@solana/spl-memo` (`createMemoInstruction("...")`) or a raw `TransactionInstruction`. Spike `index.html` uses the raw instruction (zero extra dep).

## What was NOT validated (needs funded browser re-run)

- ~~`getWallets()` wallet-standard registration~~ → ANSWERED run 1: 0 found, adapter dead
- ~~`window.nightly?.solana` presence/shape~~ → ANSWERED run 1: present, feature-scoped
- ~~connect feature name~~ → ANSWERED run 1: legacy `provider.connect()` works; docs' `features['standard:connect']` path implemented as primary with legacy fallback
- ~~`features['solana:signTransaction']` acceptance of our serialize + `sendRawTransaction` round-trip on Cookie Chain~~ → key namespace corrected run 2 (`solana:*`, not `standard:*`); round-trip still needs funded browser re-run (pending gas)
- Real confirmation latency (< 1s gate) + `getTransaction` memo round-trip on a landed tx

**How to finish:** serve this folder (`npx serve spikes/001-nightly-connect` or open `index.html` directly), with Nightly installed + Cookie Chain RPC. The page prints every quirk candidate inline; paste its log below and flip verdict to VALIDATED/INVALIDATED.

## Observed quirks (browser run 1, 2026-09-08 + Nightly docs)

- **No wallet-standard registration**: `getWallets(): 0 found` → Nightly does NOT appear in wallet-standard enumeration on this setup → StandardWalletAdapter path dead. Fallback activated.
- **Direct provider present but feature-scoped**: `window.nightly?.solana` PRESENT pre-connect with `publicKey=11111111…` placeholder (do NOT trust pre-connect publicKey as address) and `isConnected=false`. `provider.connect()` (legacy direct method) WORKS → real address `Az8mAW247PdACftKJWWLoveWqzR8YYgzFf2C8RViu9rG`.
- **No Phantom-style provider methods**: `provider.signAndSendTransaction is not a function` (TypeError). Docs confirm Nightly's API surface is feature-scoped: https://docs.nightly.app/docs/solana/solana/sign_transaction —
  - sign: `provider.features['standard:signTransaction'].signTransaction({ account, transaction: Uint8Array })` → `Promise<[{ signedTransaction: Uint8Array }]>` (input is `SolanaSignTransactionInput` from `@wallet-standard/features`)
  - sign+send combined: `provider.features['standard:signAndSendTransaction'].signAndSendTransaction({ account, chain, transaction })` — NOTE: `chain` is REQUIRED on this feature per docs, and Cookie Chain's chain id is unknown/undocumented → we do NOT use this feature; we sign + `connection.sendRawTransaction` ourselves.
  - message: `provider.features['standard:signMessage'].signMessage({ account, message })` → `[{ signedMessage, signature, signatureType? }]` (https://docs.nightly.app/docs/solana/solana/sign_message)
  - disconnect: `provider.features['standard:disconnect'].disconnect()` (https://docs.nightly.app/docs/solana/solana/connect); docs also show legacy `provider.connect()` works — used as fallback if features missing.
- **Wallet-standard enumeration claim vs reality**: docs' detection page (https://docs.nightly.app/docs/solana/solana/detection) recommends `@wallet-standard/core getWallets()` — contradicted by run 1 (0 found). Detection therefore keys on `window.nightly?.solana` directly (also documented on that page).
- Send-then-confirm shape: wallet returns nothing sent-side; signature comes from OUR `sendRawTransaction` (base58 string) — no Nightly-specific signature decode needed. Confirmation latency gate (<1s) still unproven until funded run.

## Observed quirks (browser run 2, 2026-09-08, post-45fd22e)

- **Signing features are keyed `solana:*`, not `standard:*`**: provider.features AND account.features both list `solana:signTransaction` / `solana:signAndSendTransaction` / `solana:signMessage`; `standard:signTransaction`/`standard:signMessage` are absent. Run 1's docs-based `standard:` signing keys were a namespace slip — this contradicts https://docs.nightly.app/docs/solana/solana/sign_transaction for this Nightly build. Fix: lookups use `solana:*`, resolved from the connected account's advertised features first, provider.features fallback (wallet.ts + spike). `standard:connect`/`standard:disconnect` unaffected (present under `standard:`).
- **signAndSend probe wired (single attempt)**: page tries `features['solana:signAndSendTransaction']` once; on rejection (expected per docs — requires `chain` id, Cookie Chain id unknown) falls back to `solana:signTransaction` + `sendRawTransaction`. Which path won is printed by the page (`sent via …`) — record here after run 3.
- Run 3: page now prints `resolved signing keys: …` so the resolved source (account.features vs provider.features) is unambiguous.

## Gate decision (S1 → S2)

~~Proceed with **D5 (StandardWalletAdapter)** as planned~~ → **INVALIDATED by browser run 1** (`getWallets(): 0 found`). **FALLBACK ACTIVE: direct `window.nightly.solana` provider** via `src/lib/wallet.ts` (~180 lines, zero new deps, feature-scoped API per Nightly docs). Decision recorded 2026-09-08.

## Spike tx signature

(mock-mode — no tx landed; paste from browser run when gas arrives)

Explorer: https://cookiescan.io/tx/<signature>


## Browser log
log:
wallet-standard getWallets(): 0 found
[ok] window.nightly?.solana: PRESENT (publicKey=11111111…, isConnected=false)
[warn] no wallet-standard registration → use direct window.nightly.solana
[ok] connected (direct provider): Az8mAW247PdACftKJWWLoveWqzR8YYgzFf2C8RViu9rG
blockhash BMVJCckF7fK4… valid h=23411803
[err] sign/send error: TypeError provider.signAndSendTransaction is not a function

### run 2 (post-45fd22e)
wallet-standard getWallets(): 0 found
[ok] window.nightly?.solana: PRESENT
provider.features keys: standard:connect, standard:disconnect, standard:events, solana:signAndSendTransaction, solana:signTransaction, solana:signMessage, solana:signIn
[ok] standard:connect: present / standard:disconnect: present
[warn] standard:signTransaction: MISSING / standard:signAndSendTransaction: MISSING / standard:signMessage: MISSING
[ok] connected via features['standard:connect'] (1 accounts)
[ok] address: Az8mAW247PdACftKJWWLoveWqzR8YYgzFf2C8RViu9rG
account.features: solana:signAndSendTransaction, solana:signMessage, solana:signTransaction
blockhash Hh54AWy5MXvL… valid h=23415488
[err] sign/send error: Error features['standard:signTransaction'] missing — cannot sign