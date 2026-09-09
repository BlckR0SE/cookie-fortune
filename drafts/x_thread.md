# X thread draft — post manually, in order. Do not edit the positioning lines.

Positioning rules (binding, from edge_validation.md):
- NEVER claim "no raffle exists on Cookie Chain" — Baked Bazaar's Grail Pot is a raffle.
- The edge is: first PROVABLY FAIR draw-and-collect game; oracle-free slot-hash randomness; daily loop.
- Pre-empt Collector Crypt comparison with the oracle-free verifiability bullet (T3).

---

## Tweet 1 — hook + what it is

Introducing Cookie Fortune — crack a cookie on Cookie Chain, keep the fortune.

Every fortune is a real, sub-second transaction whose randomness is verifiable on-chain — no oracle, no trust needed. The first provably fair draw-and-collect game on Cookie Chain.

[SCREENSHOT: desktop crack (docs/shots/desktop-1440-crack.png)]

## Tweet 2 — how to play

How to play:

1. Install Nightly → add the Cookie Chain network (RPC: https://rpc.cookiescan.io)
2. Open https://blckr0se.github.io/cookie-fortune/ and connect
3. CRACK ONE — 0.001 COOK to the jar
4. The receipt prints. Your fortune = confirmed slot mod 64.

That's the whole game. One cookie, one tx, one slip.

[GIF: connect → crack → receipt printing, ~10s screen recording]

## Tweet 3 — the on-chain proof beat

Here's the part judges like: the draw isn't a dice roll in our backend.

Your fortune index = confirmed slot mod 64. The slot is set by consensus at confirmation time — nobody can bias it. Open any draw tx on Cookiescan, read the slot, compute mod 64. It matches. Every time.

Tx confirms in about one slot. The reveal IS the receipt.

No oracle. No VRF service. No trust.

(Coming from Solana? Bridge COOK via https://hyperlane.cookiescan.io where relevant.)

[SCREENSHOT: a real tx on Cookiescan showing slot + memo]

## Tweet 4 — repo + daily raffle hook

Open source, live now:
 Repo: https://github.com/BlckR0SE/cookie-fortune
 Live: https://blckr0se.github.io/cookie-fortune/

And the reason to come back tomorrow: GOLDEN JAR · DAILY. 50% of the jar pays the daily winner — every crack today is one ticket. Land golden ticket №63 (slot mod 64) and the foil slip prints with confetti.

[SCREENSHOT: golden reveal (docs/shots/desktop-1440-golden.png)]
