// ErrorPanel — VOID-stamp receipt banner (design_v2 §5e). Stamp glyph VOID, then
// the standard proverb + truth + action triple. Placement: `inline` renders inside
// the crack deck (draw errors), `banner` at page top (RPC/wallet). Raw code never hidden.
import { createContext, useCallback, useContext, useState } from "react";

export type ErrVariant = "insufficient-gas" | "user-rejected" | "blockhash-expired" | "rpc-unreachable" | "mint-failed" | "wallet";

export type AppError = {
  variant: ErrVariant;
  placement: "inline" | "banner";
  proverb: string;
  truth: string;
  action: { label: string; onClick?: () => void; href?: string };
  extraLinks?: { label: string; href: string }[];
  code?: string;
};

const ErrorContext = createContext<{ error: AppError | null; setError: (e: AppError | null) => void }>({
  error: null,
  setError: () => {},
});

export function ErrorProvider({ children }: { children: React.ReactNode }) {
  const [error, setError] = useState<AppError | null>(null);
  return <ErrorContext.Provider value={{ error, setError }}>{children}</ErrorContext.Provider>;
}

export const useError = () => useContext(ErrorContext);
export const useSetError = () => useContext(ErrorContext).setError;

const GAS_LINKS = [
  { label: "BRIDGE COOK", href: "https://hyperlane.cookiescan.io" },
  { label: "TELEGRAM GAS REQUEST", href: "https://t.me/TheCookieNetChain" },
  { label: "COOKIESWAP", href: "https://swap.cookiescan.io" },
];

export function insufficientGasError(have: number, need: number): AppError {
  return {
    variant: "insufficient-gas",
    placement: "inline",
    proverb: "The jar is out of reach.",
    truth: `Need ${need.toFixed(4)} COOK, you have ${have.toFixed(4)}.`,
    action: { label: "GET GAS ↓", href: "#jar" },
    extraLinks: GAS_LINKS,
  };
}

export function mapWalletError(e: unknown): AppError {
  const err = e as { code?: string; message?: string };
  const code = err?.code;
  const raw = err?.message ?? String(e);
  if (code === "user-reject")
    return {
      variant: "user-rejected",
      placement: "banner",
      proverb: "You walked away from the counter.",
      truth: "(You cancelled the signature. Nothing was spent.)",
      action: { label: "TRY AGAIN" },
      code: raw,
    };
  if (code === "not-installed")
    return {
      variant: "wallet",
      placement: "banner",
      proverb: "The printer jammed.",
      truth: "(Nightly wallet not detected. Connect a wallet to be served.)",
      action: { label: "NIGHTLY DOCS", href: "https://docs.nightly.app/docs/solana/solana/detection" },
      code: raw,
    };
  if (code === "wrong-network")
    return {
      variant: "rpc-unreachable",
      placement: "banner",
      proverb: "The bakery's phone line is busy.",
      truth: "(Nightly is not on the Cookie Chain network — switch network and retry.)",
      action: { label: "RETRY NOW" },
      code: raw,
    };
  return {
    variant: "rpc-unreachable",
    placement: "banner",
    proverb: "The bakery's phone line is busy.",
    truth: "(RPC unreachable — retrying is safe.)",
    action: { label: "RETRY NOW" },
    code: raw,
  };
}

export function rpcDownError(detail: string): AppError {
  return {
    variant: "rpc-unreachable",
    placement: "banner",
    proverb: "The bakery's phone line is busy.",
    truth: "(RPC unreachable — retrying in 5s.)",
    action: { label: "RETRY NOW" },
    code: detail,
  };
}

// Receipt voice map for blockhash/inline errors (proverbs per design_v2 §7)
export function blockhashError(msg: string): AppError {
  return {
    variant: "blockhash-expired",
    placement: "inline",
    proverb: "The dough went stale.",
    truth: "(Blockhash expired — retrying is safe.)",
    action: { label: "CRACK AGAIN" },
    code: msg,
  };
}

export function ErrorPanel() {
  const { error, setError } = useError();
  const dismiss = useCallback(() => setError(null), [setError]);
  if (!error) return null;
  const act = () => {
    error.action.onClick?.();
    if (!error.action.href) dismiss();
  };
  return (
    <div className="err on" role="alert">
      <span className="stamp on">VOID</span>
      <p className="proverb">{error.proverb}</p>
      <p className="truth">{error.truth}</p>
      {error.action.href ? (
        <a className="btn btn-ghosty" href={error.action.href} target={error.action.href.startsWith("http") ? "_blank" : undefined} rel="noopener" onClick={act}>
          {error.action.label}
        </a>
      ) : (
        <button className="btn btn-ghosty" onClick={act}>{error.action.label}</button>
      )}
      {error.extraLinks?.map((l) => (
        <a key={l.href} className="err-link" href={l.href} target="_blank" rel="noopener">{l.label}</a>
      ))}
      {error.code && <div className="truth">(code: {error.code})</div>}
    </div>
  );
}
