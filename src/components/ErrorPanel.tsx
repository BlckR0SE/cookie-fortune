// S8 fills in preflight balance check; mapping below done for wallet paths (S3).
import { createContext, useContext, useState } from "react";

type Err = { message: string; action?: string } | null;
const ErrorContext = createContext<{ error: Err; setError: (e: Err) => void }>({
  error: null,
  setError: () => {},
});

export function ErrorProvider({ children }: { children: React.ReactNode }) {
  const [error, setError] = useState<Err>(null);
  return <ErrorContext.Provider value={{ error, setError }}>{children}</ErrorContext.Provider>;
}

export const useError = () => useContext(ErrorContext);

// Map wallet.ts coded errors onto user-facing copy (ErrorPanel contract:
// not-installed / user-reject / wrong-network / send-failure).
export function mapWalletError(e: unknown): NonNullable<Err> {
  const code = (e as { code?: string })?.code;
  switch (code) {
    case "not-installed":
      return { message: "Nightly wallet not detected.", action: "install Nightly, add the Cookie Chain RPC, reload" };
    case "user-reject":
      return { message: "Request rejected in Nightly.", action: "retry when ready" };
    case "wrong-network":
      return { message: "Nightly is not on the Cookie Chain network.", action: "switch Nightly network (RPC check) and retry" };
    default:
      return { message: e instanceof Error ? e.message : String(e), action: "try again or check RPC status" };
  }
}

export function ErrorPanel() {
  const { error, setError } = useError();
  if (!error) return null;
  return (
    <div className="error-banner" role="alert">
      <span>{error.message}</span>
      {error.action && <span className="muted"> → {error.action}</span>}
      <button className="btn small" onClick={() => setError(null)}>dismiss</button>
    </div>
  );
}
