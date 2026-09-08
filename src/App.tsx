import { WalletHeader } from "./components/WalletHeader";
import { CrackPanel } from "./components/CrackPanel";
import { GalleryPanel } from "./components/GalleryPanel";
import { RafflePanel } from "./components/RafflePanel";
import { ErrorPanel } from "./components/ErrorPanel";

export default function App() {
  return (
    <main className="app" id="top">
      <WalletHeader />
      <ErrorPanel />
      <CrackPanel />
      <GalleryPanel />
      <RafflePanel />
      <footer className="footer">
        <nav aria-label="Footer">
          <a href="https://github.com/BlckR0SE/cookie-fortune" target="_blank" rel="noopener">repo</a>
          <a href="https://cookiescan.io" target="_blank" rel="noopener">explorer</a>
          <a href="#raffle">jar</a>
        </nav>
        fortunes are on-chain · verify every tx on cookiescan.io
      </footer>
    </main>
  );
}
