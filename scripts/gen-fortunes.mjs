// S4 content pack generator — stdlib only, deterministic (re-run = clean git diff).
// Generates public/fortunes/00..63.json + manifest.json (preloaded at idle).
// ponytail: SVG cards (64) not generated here yet — S4 session adds them;
// image paths point at fortunes/cards/<idx>.svg ahead of that.
// Upgrade path: extend this script with the card template renderer.
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const outDir = join(root, "public", "fortunes");
mkdirSync(outDir, { recursive: true });

const GOLDEN_IDX = 63;
const FORTUNES = [
  "A door marked 'exit' is also a door marked 'begin'.",
  "The slot you occupy was empty a moment ago. Luck notices.",
  "Small bets, warm bread, quiet heart.",
  "Your next good idea arrives during a transaction.",
  "The chain forgets nothing — forgive yourself anyway.",
  "Two roads diverge. Take the one with cookies.",
  "Patience is a validator that never sleeps.",
  "You will find what you seek in the last place you tx.",
  "A wise trader once bought high. We do not speak of him.",
  "Golden hour approaches. Do not sell the sunrise.",
  "Your bags are heavy because they carry tomorrow.",
  "The crumb you drop today feeds a whale tomorrow.",
  "Trust the block, verify the baker.",
  "Fees are small when the heart is large.",
  "An empty wallet is a future full of deposits.",
  "You are early. Everyone is early. Somebody is earliest.",
  "The oven rewards those who preheat.",
  "Beware of FUD wearing a friendly smile.",
  "Your patience will compound faster than your portfolio.",
  "A diamond hand once was a shaking hand.",
  "The best time to crack was yesterday. Second best: now.",
  "Somewhere, a whale envies your tiny position.",
  "Do not chase the pump. Let the pump notice you.",
  "Your signature is your word. Keep both clean.",
  "The jar fills one crumb at a time.",
  "Fortune favors the bold — and the ones who read memos.",
  "A dip is just the market taking a breath.",
  "What is rug-proof cannot be pulled.",
  "You will laugh at today's dip from tomorrow's rooftop.",
  "The busiest bakery has the warmest door.",
  "Not every candle is a signal. Some are just light.",
  "Your lag is someone else's lead. Breathe.",
  "Share your gains. Memory is the only ledger that matters.",
  "A cookie divided is a friendship multiplied.",
  "The slot decides. The heart interprets.",
  "Buy the rumor? The rumor is cookies.",
  "You are the default signer of your own story.",
  "One day your net worth matches your net optimism.",
  "The chain is public. Your intentions may stay private.",
  "Lucky is a habit dressed as an accident.",
  "Do not fear the fork. Fear the stale block.",
  "Your future self already said thank you.",
  "The pot remembers who stirred it.",
  "A closed position opens a mind.",
  "Crack boldly. The crumbs regrow.",
  "The moon is just a coin that made it.",
  "You will win an argument with a chart.",
  "Serenity now, serendipity next block.",
  "The best collateral is a kept promise.",
  "Your best trade is the one you almost made and didn't. Probably.",
  "Warm dough, cold hands, hot streak.",
  "The explorer shows your tx. Only you show your character.",
  "A golden ticket hides in an ordinary wrapper.",
  "Every jar was empty on day one.",
  "The wisest degen farms smiles.",
  "Your private key is safe. Your heart is another matter.",
  "Confusion is confirmation you are learning the chain.",
  "The oven is hot. So is your streak.",
  "What you seek is already in your wallet of memories.",
  "Small wins compound. So do small kindnesses.",
  "The finality you crave is one confirmation away.",
  "Someone somewhere is telling a friend about you. Bullish.",
  "Your luck is loading. Do not refresh.",
  "Half the pot is already yours — you just had to show up.",
];

if (FORTUNES.length !== 64) throw new Error(`need 64 fortunes, have ${FORTUNES.length}`);

const manifest = [];
FORTUNES.forEach((fortune, idx) => {
  const golden = idx === GOLDEN_IDX;
  const json = {
    name: golden ? "Golden Fortune" : `Fortune #${idx}`,
    fortune,
    image: `fortunes/cards/${idx}.svg`,
    attributes: [{ trait_type: "rarity", value: golden ? "golden" : "common" }],
  };
  writeFileSync(join(outDir, `${String(idx).padStart(2, "0")}.json`), JSON.stringify(json, null, 2) + "\n");
  manifest.push({ idx, ...json });
});
writeFileSync(join(outDir, "manifest.json"), JSON.stringify(manifest, null, 2) + "\n");
console.log(`wrote 64 fortune JSONs + manifest.json → public/fortunes/`);
