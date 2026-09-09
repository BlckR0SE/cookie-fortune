// WalletHeader — receipt masthead + ledger. CUSTOMER row flips NOT SERVED →
// address on connect; CONNECT NIGHTLY button becomes CUSTOMER SERVED ✓ (disabled).
// Wallet events only, no polling (balance-refresh event after each draw).
import { PublicKey } from "@solana/web3.js";
import { useEffect, useState } from "react";
import { LAMPORTS_PER_COOK, connection } from "../lib/rpc";
import * as wallet from "../lib/wallet";
import { mapWalletError, useSetError } from "./ErrorPanel";

const SHORT = (a: string) => `${a.slice(0, 4)}…${a.slice(-4)}`;
const fmt = (d: Date) =>
  `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(d.getUTCDate()).padStart(2, "0")} ` +
  `${String(d.getUTCHours()).padStart(2, "0")}:${String(d.getUTCMinutes()).padStart(2, "0")} UTC`;

export function WalletHeader() {
  const [addr, setAddr] = useState<string | null>(wallet.getPublicKey());
  const [busy, setBusy] = useState(false);
  const [balance, setBalance] = useState<number | null>(null);
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
      await wallet.connect();
    } catch (e) {
      setError(mapWalletError(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <header>
      <div className="mast">
        <h1>COOKIE FORTUNE</h1>
        <p className="sub">On-chain bakery · Cookie Chain · Est. slot 0</p>
      </div>
      <hr className="rule" />
      <div className="ledger-cols">
        <div>
          <div className="row"><span className="k">RECEIPT</span><span className="dots" /><span className="v">№ CF-000417</span></div>
          <div className="row"><span className="k">DATE</span><span className="dots" /><span className="v">{fmt(new Date())}</span></div>
        </div>
        <div>
          <div className="row">
            <span className="k">CUSTOMER</span><span className="dots" />
            <span className="v">{addr ? <span title={addr}>{SHORT(addr)}</span> : "NOT SERVED"}</span>
          </div>
          <div className="row">
            <span className="k">BALANCE</span><span className="dots" />
            <span className="v">{balance != null ? `${balance.toFixed(4)} COOK` : "—"}</span>
          </div>
        </div>
      </div>
      <button className="btn btn-block" onClick={toggle} disabled={busy || !!addr} aria-label="Connect Nightly wallet">
        {addr ? "CUSTOMER SERVED ✓" : busy ? "CONNECTING…" : "CONNECT NIGHTLY"}
      </button>
    </header>
  );
}
