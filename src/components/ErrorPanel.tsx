// ErrorPanel — variants per design.md Microcopy table: proverb (Nunito 700) →
// plain truth (muted) → exactly ONE recovery action. Raw code never hidden.
// Placement: `inline` under the stage (draw errors), `banner` page-top sticky (RPC/wallet).
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
  { label: "Bridge COOK", href: "https://hyperlane.cookiescan.io" },
  { label: "Telegram gas request", href: "https://t.me/TheCookieNetChain" },
  { label: "Cookieswap", href: "https://swap.cookiescan.io" },
];

export function insufficientGasError(have: number, need: number): AppError {
  return {
    variant: "insufficient-gas",
    placement: "inline",
    proverb: "A cookie cannot crack an empty jar.",
    truth: `Need ${need.toFixed(4)} COOK, you have ${have.toFixed(4)}.`,
    action: { label: "Get gas ↓", href: "#get-gas" },
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
      placement: "inline",
      proverb: "The cookie chose to stay whole.",
      truth: "(You cancelled the signature.)",
      action: { label: "Try again" },
      code: raw,
    };
  if (code === "not-installed")
    return {
      variant: "wallet",
      placement: "banner",
      proverb: "Your fortune awaits a wallet.",
      truth: "Nightly wallet not detected. Install it and add the Cookie Chain RPC.",
      action: { label: "Nightly docs", href: "https://docs.nightly.app/docs/solana/solana/detection" },
      code: raw,
    };
  if (code === "wrong-network")
    return {
      variant: "rpc-unreachable",
      placement: "banner",
      proverb: "The bakery's phone line is busy.",
      truth: "(Nightly is not on the Cookie Chain network — switch network and retry.)",
      action: { label: "Retry now" },
      code: raw,
    };
  return {
    variant: "rpc-unreachable",
    placement: "banner",
    proverb: "The bakery's phone line is busy.",
    truth: "(RPC unreachable — retrying is safe.)",
    action: { label: "Retry now" },
    code: raw,
  };
}

export function rpcDownError(detail: string): AppError {
  return {
    variant: "rpc-unreachable",
    placement: "banner",
    proverb: "The bakery's phone line is busy.",
    truth: "(RPC unreachable — retrying in 5s.)",
    action: { label: "Retry now" },
    code: detail,
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
    <div className={error.placement === "banner" ? "error-banner" : "error-inline"} role="alert">
      <p className="error-proverb">{error.proverb}</p>
      <p className="error-truth">{error.truth}</p>
      {error.action.href ? (
        <a className="link-explorer" href={error.action.href} target={error.action.href.startsWith("http") ? "_blank" : undefined} rel="noopener" onClick={act}>
          {error.action.label}
        </a>
      ) : (
        <button className="btn-ghost" onClick={act}>{error.action.label}</button>
      )}
      {error.extraLinks?.map((l) => (
        <a key={l.href} className="link-explorer" href={l.href} target="_blank" rel="noopener">{l.label}</a>
      ))}
      {error.code && <div className="error-code"> (code: {error.code})</div>}
    </div>
  );
}
