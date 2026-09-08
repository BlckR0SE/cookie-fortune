// RafflePanel — golden-pot ledger. Jar balance / today's pot / golden status tiles,
// past payouts list, manual-payout disclosure (plan D6), "Get gas" links.
// Poll cadence owned by S7 session (dispatches "balance-refresh"); passive layer.
import { useEffect, useRef, useState } from "react";
import { PublicKey } from "@solana/web3.js";
import { JAR_ADDRESS, LAMPORTS_PER_COOK } from "../lib/crack";
import { connection } from "../lib/rpc";
import { useReveals } from "./Reveals";

export function RafflePanel() {
  const [jar, setJar] = useState<number | null>(null);
  const sectionRef = useRef<HTMLElement>(null);
  useReveals(sectionRef, [jar]);

  useEffect(() => {
    let dead = false;
    const load = async () => {
      try {
        const pub = new PublicKey(JAR_ADDRESS);
        const lam = await connection.getBalance(pub);
        if (!dead) setJar(lam / LAMPORTS_PER_COOK);
      } catch {
        if (!dead) setJar(null);
      }
    };
    load();
    const h = () => load();
    window.addEventListener("balance-refresh", h);
    return () => {
      dead = true;
      window.removeEventListener("balance-refresh", h);
    };
  }, []);

  const noData = jar == null;
  return (
    <section ref={sectionRef} className="section" id="raffle" aria-label="Today's golden pot">
      <div className="section-head">
        <h2 className="display" data-split>Today's golden pot</h2>
      </div>
      {noData ? (
        <p className="muted" data-reveal>The pot fills with every crack.</p>
      ) : (
        <>
          <div className="stat-tiles">
            <div className="stat-tile" data-reveal>
              <div className="label">Jar balance</div>
              <div className="value num">{jar!.toFixed(6)} COOK</div>
            </div>
            <div className="stat-tile" data-reveal>
              <div className="label">Today's pot</div>
              <div className="value num">— COOK</div>
              <div className="muted" style={{ fontSize: ".8rem" }}>50% of today's draw revenue (S7 poll lands)</div>
            </div>
            <div className="stat-tile" data-reveal>
              <div className="label">Golden drawn today</div>
              <div className="value">—</div>
            </div>
          </div>
          <p className="muted" style={{ fontSize: ".85rem" }} data-reveal>
            v1: payout is sent manually within 24h; every payout tx is listed here and verifiable on Cookiescan.
          </p>
          <div className="gas-links" id="get-gas" aria-label="Get gas" data-reveal>
            <span className="chip">Get gas:</span>
            <a className="link-explorer" href="https://hyperlane.cookiescan.io" target="_blank" rel="noopener">Bridge guide</a>
            <a className="link-explorer" href="https://t.me/TheCookieNetChain" target="_blank" rel="noopener">Telegram gas request</a>
            <a className="link-explorer" href="https://swap.cookiescan.io" target="_blank" rel="noopener">Cookieswap</a>
          </div>
        </>
      )}
    </section>
  );
}
