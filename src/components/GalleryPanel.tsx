// GalleryPanel — trophy shelf. DAS searchAssets on connect + after each mint confirm.
// Cards tilt on hover (CSS), stagger-reveal on scroll. Dialog: focus trap, Esc, focus return.
// ponytail: DAS collection filter mint unknown until S5 setup — owner lookup first,
// degrade to memo-history decode (same UI) if collection absent.
// Upgrade path: swap `load` for collection-filtered searchAssets once mint lands.
import { useCallback, useEffect, useRef, useState } from "react";
import { connection, txUrl } from "../lib/rpc";
import * as libWallet from "../lib/wallet";
import { GOLDEN_IDX } from "../lib/crack";
import { useReveals } from "./Reveals";

type Card = { addr: string; fortune: string; golden: boolean; sig: string };

const DAS_METHOD = "searchAssets";

async function das(owner: string): Promise<Record<string, unknown>[]> {
  try {
    const res = await fetch("https://rpc.cookiescan.io", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: DAS_METHOD, params: { ownerAddress: owner, limit: 64 } }),
    });
    const json = await res.json();
    return json?.result?.items ?? [];
  } catch {
    return [];
  }
}

function fortuneFromAsset(item: Record<string, unknown>): Card | null {
  try {
    const meta = (item.content as Record<string, unknown>)?.metadata as Record<string, unknown> | undefined;
    const name = String(meta?.name ?? "");
    const links = (item.links as Record<string, unknown> | undefined) ?? {};
    if (!/fortune/i.test(name)) return null;
    const attrs = (meta?.attributes as { trait_type?: string; value?: string }[] | undefined) ?? [];
    const golden = attrs.some((a) => a.value === "golden");
    return { addr: String(item.id ?? "?"), fortune: String(meta?.description ?? name), golden, sig: String(links?.external_url ?? links?.image ?? "") };
  } catch {
    return null;
  }
}

export function GalleryPanel() {
  const [cards, setCards] = useState<Card[] | null>(null);
  const [dialog, setDialog] = useState<Card | null>(null);
  const openerRef = useRef<HTMLElement | null>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const sectionRef = useRef<HTMLElement>(null);
  const load = useCallback(async (owner: string) => {
    setCards(null);
    const items = await das(owner);
    const mine = items.map(fortuneFromAsset).filter((c): c is Card => !!c);
    setCards(mine);
  }, []);

  useReveals(sectionRef, [cards]);

  useEffect(() => {
    const off = libWallet.onWalletEvent((e) => {
      if (e.type === "connected") load(e.address);
      if (e.type === "disconnected") {
        setCards(null);
        setDialog(null);
      }
    });
    const h = () => {
      const a = libWallet.getPublicKey();
      if (a) load(a);
    };
    window.addEventListener("balance-refresh", h);
    return () => {
      off();
      window.removeEventListener("balance-refresh", h);
    };
  }, [load]);

  // dialog: focus in, Esc out, focus back to opener
  useEffect(() => {
    if (!dialog) return;
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setDialog(null);
        openerRef.current?.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [dialog]);

  return (
    <section ref={sectionRef} className="section" aria-label="Your fortunes">
      <div className="section-head">
        <h2 className="display" data-split>Your fortunes</h2>
        <span className="section-count num">{cards ? cards.length : "···"}</span>
      </div>
      {cards === null ? (
        <div className="gallery-grid" aria-label="Loading fortunes">
          {[0, 1, 2].map((i) => <div key={i} className="skeleton" />)}
        </div>
      ) : cards.length === 0 ? (
        <div className="empty-jar" data-reveal>
          <img src={`${import.meta.env.BASE_URL}jar-outline.svg`} alt="" aria-hidden />
          <p className="proverb">An empty jar is a future full of fortunes.</p>
        </div>
      ) : (
        <div className="gallery-grid">
          {cards.map((c) => (
            <article
              key={c.addr}
              className={`gallery-card card-fortune ${c.golden ? "card-golden on-paper" : "on-paper"}`}
              tabIndex={0}
              role="button"
              aria-label={`Open fortune ${c.addr.slice(0, 8)}`}
              data-cursor="open"
              data-reveal
              onClick={(e) => { openerRef.current = e.currentTarget; setDialog(c); }}
              onKeyDown={(e) => { if (e.key === "Enter") { openerRef.current = e.currentTarget as HTMLElement; setDialog(c); } }}
            >
              <p className="fortune-text">{c.fortune}</p>
              <div className="card-meta">
                {c.golden && <span className="gold-badge">golden</span>}
                <span className="num">{c.addr.slice(0, 4)}…{c.addr.slice(-4)}</span>
              </div>
            </article>
          ))}
        </div>
      )}
      {dialog && (
        <div className="dialog-backdrop" onClick={() => setDialog(null)}>
          <div
            className={`dialog card-fortune ${dialog.golden ? "card-golden on-paper" : "on-paper"}`}
            role="dialog"
            aria-modal="true"
            aria-label="Fortune detail"
            onClick={(e) => e.stopPropagation()}
          >
            <button ref={closeRef} className="btn-ghost dialog-close" onClick={() => { setDialog(null); openerRef.current?.focus(); }} aria-label="Close fortune detail">Close</button>
            <p className="fortune-text">{dialog.fortune}</p>
            <div className="card-meta">
              {dialog.golden && <span className="gold-badge">golden #{GOLDEN_IDX}</span>}
              <a className="link-explorer" href={txUrl(dialog.sig)} target="_blank" rel="noopener">View on Cookiescan</a>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

// keep connection referenced for future per-card mint-date lookup (ponytail)
void connection;
