// RafflePanel — GOLDEN JAR · DAILY as a full-measure bottom strip (jar-strip).
// Jar amount row + hand-tally marks (5th struck) + rules fine print.
// Jar balance via one getBalance; refresh on balance-refresh event.
// ponytail: "tickets today" count needs the S7 draw-index program; until then the
// tally counts this session's confirmed cracks (real tx events, not fake data).
import { useEffect, useState } from "react";
import { PublicKey } from "@solana/web3.js";
import { JAR_ADDRESS, LAMPORTS_PER_COOK } from "../lib/crack";
import { connection } from "../lib/rpc";

export function RafflePanel() {
  const [jar, setJar] = useState<number | null>(null);
  const [cracks, setCracks] = useState(0);

  useEffect(() => {
    let dead = false;
    const load = async () => {
      try {
        const lam = await connection.getBalance(new PublicKey(JAR_ADDRESS));
        if (!dead) setJar(lam / LAMPORTS_PER_COOK);
      } catch {
        if (!dead) setJar(null);
      }
    };
    load();
    const h = () => {
      load();
      setCracks((c) => c + 1);
    };
    window.addEventListener("balance-refresh", h);
    return () => {
      dead = true;
      window.removeEventListener("balance-refresh", h);
    };
  }, []);

  let marks = "";
  for (let i = 1; i <= Math.min(cracks, 60); i++) marks += i % 5 === 0 ? "̶ " : "|";

  return (
    <section className="sec jar-strip" id="jar" aria-label="Daily golden raffle">
      <div className="jar-main">
        <h2>GOLDEN JAR · DAILY</h2>
        <p className="hint">Golden ticket № 63 · drawn at midnight UTC</p>
        <div className="row"><span className="k">JAR TODAY</span><span className="dots" /><span className="v">{jar != null ? `${jar.toFixed(4)} COOK` : "—"}</span></div>
        <p className="tally" aria-label="tickets today">{marks || "—"}</p>
      </div>
      <p className="raffle-note">
        GOLDEN DRAW TAKES 50% OF THE JAR.<br />
        EVERY CRACK ADDS 0.001 · WINNER PAID ≤ 24H.<br />
        TALLY = TICKETS TODAY. NO TICKET, NO WHINING.
      </p>
    </section>
  );
}
