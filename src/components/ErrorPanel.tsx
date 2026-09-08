// S8 fills this in: preflight balance check + mapped runtime errors.
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
