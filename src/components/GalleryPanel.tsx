// GalleryPanel — SLIP ARCHIVE. One dotted-leader row per owned fortune,
// serial = slot; newest first; golden rows get gold-ink serial.
// DAS searchAssets on connect + after each draw (balance-refresh event, no polling).
// ponytail: DAS collection filter mint unknown until S5 — owner lookup first.
import { useCallback, useEffect, useState } from "react";
import { txUrl } from "../lib/rpc";
import * as libWallet from "../lib/wallet";

type Slip = { addr: string; fortune: string; golden: boolean; sig: string };

async function das(owner: string): Promise<Record<string, unknown>[]> {
  try {
    const res = await fetch("https://rpc.cookiescan.io", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "searchAssets", params: { ownerAddress: owner, limit: 64 } }),
    });
    const json = await res.json();
    return json?.result?.items ?? [];
  } catch {
    return [];
  }
}

function slipFromAsset(item: Record<string, unknown>): Slip | null {
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
  const [slips, setSlips] = useState<Slip[] | null>(null);

  const load = useCallback(async (owner: string) => {
    setSlips(null);
    const items = await das(owner);
    setSlips(items.map(slipFromAsset).filter((s): s is Slip => !!s).reverse()); // newest first
  }, []);

  useEffect(() => {
    const off = libWallet.onWalletEvent((e) => {
      if (e.type === "connected") load(e.address);
      if (e.type === "disconnected") setSlips(null);
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

  return (
    <section className="sec" aria-label="Collected fortunes">
      <h2>SLIP ARCHIVE</h2>
      <p className="hint">Every fortune you own · serial = slot</p>
      {slips === null ? (
        <p className="empty">READING THE ARCHIVE…</p>
      ) : slips.length === 0 ? (
        <p className="empty">NO SLIPS YET — THE PRINTER IS HUNGRY.</p>
      ) : (
        <div>
          {slips.map((s) => (
            <div key={s.addr} className={`stub${s.golden ? " gold" : ""}`}>
              <span className="sn">№{s.addr.slice(-2)}</span>
              <span className="fq">“{s.fortune}”</span>
              <a href={txUrl(s.sig)} target="_blank" rel="noopener">verify ↗</a>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
