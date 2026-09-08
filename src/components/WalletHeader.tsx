import { useEffect, useState } from "react";
import * as wallet from "../lib/wallet";
import { mapWalletError, useError } from "./ErrorPanel";

// S3: Nightly connect via direct provider util (adapter path dead — spike 001).
export function WalletHeader() {
  const [addr, setAddr] = useState<string | null>(wallet.getPublicKey());
  const [busy, setBusy] = useState(false);
  const { setError } = useError();

  useEffect(
    () =>
      wallet.onWalletEvent((e) => {
        if (e.type === "connected") setAddr(e.address);
        if (e.type === "disconnected") setAddr(null);
        if (e.type === "error") setError(mapWalletError(e.error));
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

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

  const short = addr ? `${addr.slice(0, 4)}…${addr.slice(-4)}` : null;
  return (
    <header className="header">
      <span className="brand">🍪 Cookie Fortune</span>
      <button className="btn" onClick={toggle} disabled={busy}>
        {busy ? "…" : short ? `${short} · disconnect` : "Connect Nightly"}
      </button>
    </header>
  );
}
