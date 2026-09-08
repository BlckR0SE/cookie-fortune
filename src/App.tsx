import { WalletHeader } from "./components/WalletHeader";
import { CrackPanel } from "./components/CrackPanel";
import { GalleryPanel } from "./components/GalleryPanel";
import { RafflePanel } from "./components/RafflePanel";
import { ErrorPanel } from "./components/ErrorPanel";

export default function App() {
  return (
    <main className="app">
      <WalletHeader />
      <ErrorPanel />
      <CrackPanel />
      <GalleryPanel />
      <RafflePanel />
      <footer className="footer">
        fortunes are on-chain · verify every tx on{" "}
        <a href="https://cookiescan.io" target="_blank" rel="noreferrer">cookiescan.io</a>
      </footer>
    </main>
  );
}
