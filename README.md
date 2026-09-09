# Cookie Fortune

Crack a cookie. Keep the fortune. Every fortune is a real Cookie Chain transaction you can verify.

**Cookie Fortune is the first provably fair draw-and-collect game on Cookie Chain.** Every draw is a real, sub-second transaction; your fortune is derived from the confirmed slot — verifiable by anyone in Cookiescan. No oracle, no VRF service, no off-chain RNG, no trust needed. A daily golden-fortune raffle gives players a reason to come back every day.

- Live: https://blckr0se.github.io/cookie-fortune/
- Repo: https://github.com/BlckR0SE/cookie-fortune

## How it works

1. Connect your **Nightly** wallet.
2. `CRACK ONE` — sends **0.001 COOK** to the jar plus a `COOKIE_FORTUNE_DRAW:v1` memo, signed in Nightly.
3. The tx confirms in about one slot (sub-second). Your **fortune index = confirmed slot mod 64** — deterministic and provable from the chain alone.
4. The receipt UI prints your fortune as a slip, serial = slot, stamped `PAID` (or `GOLDEN №63` — a 1-in-64 foil golden ticket with confetti).
5. **GOLDEN JAR · DAILY** — 50% of the jar is paid to the daily winner. Every crack that day is one ticket; landing the golden ticket №63 (`slot % 64`) prints the foil slip.

## Bounty required features → where they live

| Required feature | Where |
|---|---|
| Wallet connection | Nightly connect in the receipt masthead |
| Display connected wallet address | `CUSTOMER` row — truncated address + live balance |
| Transaction execution | `CRACK ONE` — 0.001 COOK transfer + SPL Memo |
| Transaction confirmation handling | Status line types the real phases: `AWAITING SIGNATURE` → `CONFIRMING · SLOT n` (live slot) → `CONFIRMED ✓`; slip prints on confirm |
| Error handling and user feedback | `VOID` stamp banner: insufficient gas, user reject, blockhash expired (auto-retry once), RPC unreachable |

## Why the randomness is fair

Fortune index = confirmed slot mod 64. The slot is set by chain consensus at confirmation time — neither the player nor the app can pick or bias it. To verify any draw: open the tx in [Cookiescan](https://cookiescan.io), read the confirmed slot, compute slot mod 64, compare with the printed serial. There is no oracle program, no VRF provider, and no server-side draw anywhere in the flow.

## Screenshots

| Mobile idle (375) | Desktop crack (1440) | Golden reveal (1440) |
| --- | --- | --- |
| ![Mobile idle](docs/shots/mobile-375-idle.png) | ![Desktop crack](docs/shots/desktop-1440-crack.png) | ![Golden reveal](docs/shots/desktop-1440-golden.png) |

## Addresses

| What | Address |
|---|---|
| Draw jar — receives 0.001 COOK per crack, funds the daily golden draw | `JAR_ADDRESS_PENDING_S0_KEYGEN` |
| Program | none — plain System transfer + SPL Memo (no custom program deployed) |

## Run it (judges)

Requires **Node 22+**.

```
npm i
npm run dev      # http://localhost:5173/cookie-fortune/
npm run build    # type-checks, then outputs dist/
npm run preview  # serve the production build locally
```

Wallet setup:

1. Install the [Nightly](https://nightly.app) browser extension.
2. Switch Nightly to the **Cookie Chain** network (RPC: `https://rpc.cookiescan.io` · Explorer: `https://cookiescan.io`).
3. Fund the wallet with a small amount of COOK — a draw costs 0.001 COOK plus fees. There is no faucet yet; gas drips have been arranged in the [Cookie Chain Telegram](https://t.me/TheCookieNetChain).
4. Open the live URL (or localhost), connect, crack.

Verification harness: `node scripts/verify-receipt.mjs` builds with an e2e jar address and runs the full receipt-UI DOM probe suite (38 checks).

## Tech stack

- React 18 + TypeScript + Vite
- `@solana/web3.js` + `@solana/spl-memo` (no custom on-chain program)
- GSAP for motion keyed strictly to real tx events (never fake progress)
- Hand-rolled CSS on design tokens; DotGothic16 + IBM Plex Mono via CDN

## Disclosure

This app is AI-assisted: built with an autonomous agent (Hermes) driven by a human operator. All code and decisions were reviewed by the operator before submission.

## License

MIT
