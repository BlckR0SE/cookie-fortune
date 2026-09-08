// S3 fills this in: StandardWalletAdapter detection/connect/disconnect.
export function WalletHeader() {
  return (
    <header className="header">
      <span className="brand">🍪 Cookie Fortune</span>
      <button className="btn" disabled title="lands in S3">Connect Nightly</button>
    </header>
  );
}
