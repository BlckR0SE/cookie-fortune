// WalletHeader — sticky 56px, brand left (Fraunces wordmark + cookie SVG),
// right: Connect Nightly (primary) / wallet-chip (truncated addr · copy · explorer · balance) · disconnect.
// Balance shown in COOK 6dp tabular. Triggers: wallet events only, no polling.
import { PublicKey } from "@solana/web3.js";
import { useCallback, useEffect, useState } from "react";
import { LAMPORTS_PER_COOK, connection } from "../lib/rpc";
import * as wallet from "../lib/wallet";
import { mapWalletError, useSetError } from "./ErrorPanel";

const EXPLORER = "https://cookiescan.io";

export function WalletHeader() {
  const [addr, setAddr] = useState<string | null>(wallet.getPublicKey());
  const [busy, setBusy] = useState(false);
  const [balance, setBalance] = useState<number | null>(null);
  const [copied, setCopied] = useState(false);
  const setError = useSetError();

  useEffect(
    () =>
      wallet.onWalletEvent((e) => {
        if (e.type === "connected") {
          setAddr(e.address);
          setBalance(null);
        }
        if (e.type === "disconnected") {
          setAddr(null);
          setBalance(null);
        }
        if (e.type === "error") setError(mapWalletError(e.error));
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  // balance on connect + after each draw (custom "balance-refresh" event, not a poll loop)
  useEffect(() => {
    if (!addr) return;
    let dead = false;
    const refresh = () =>
      connection
        .getBalance(new PublicKey(addr))
        .then((b) => !dead && setBalance(b / LAMPORTS_PER_COOK))
        .catch(() => null);
    refresh();
    window.addEventListener("balance-refresh", refresh);
    return () => {
      dead = true;
      window.removeEventListener("balance-refresh", refresh);
    };
  }, [addr]);

  const toggle = async () => {
    setBusy(true);
    try {
      if (addr) await wallet.disconnect();
      else await wallet.connect();
    } catch (e) {
      setError(mapWalletError(e));
    } finally {
      setBusy(false);
    }
  };

  const copy = useCallback(() => {
    if (!addr) return;
    navigator.clipboard.writeText(addr).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1200);
    });
  }, [addr]);

  const short = addr ? `${addr.slice(0, 4)}…${addr.slice(-4)}` : null;
  return (
    <header className="site-header">
      <a className="brand" href="#top" aria-label="Cookie Fortune home">
        <img src={`${import.meta.env.BASE_URL}favicon.svg`} alt="" aria-hidden />
        Cookie Fortune
      </a>
      <div className="header-right">
        {short ? (
          <>
            <span className="wallet-chip">
              <span title={addr!} aria-label={`Wallet ${addr}`}>{short}</span>
              <button className="chip-btn" onClick={copy} aria-label={copied ? "Address copied" : "Copy full wallet address"}>
                {copied ? "Copied" : "Copy"}
              </button>
              <a href={`${EXPLORER}/account/${addr}`} target="_blank" rel="noopener" aria-label="View wallet on Cookiescan">Explorer</a>
              {balance != null && <span className="balance num" aria-label="Wallet balance in COOK">{balance.toFixed(6)} COOK</span>}
            </span>
            <button className="btn-ghost" onClick={toggle} disabled={busy}>Disconnect</button>
          </>
        ) : (
          <button className="btn-primary" onClick={toggle} disabled={busy}>
            {busy ? "Connecting…" : "Connect Nightly"}
          </button>
        )}
      </div>
    </header>
  );
}
