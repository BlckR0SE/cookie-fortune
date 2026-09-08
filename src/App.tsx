import { WalletHeader } from "./components/WalletHeader";
import { CrackPanel } from "./components/CrackPanel";
import { GalleryPanel } from "./components/GalleryPanel";
import { RafflePanel } from "./components/RafflePanel";
import { ErrorPanel } from "./components/ErrorPanel";
import { Cursor } from "./components/Cursor";
import { SmoothScroll } from "./components/SmoothScroll";
import { Intro } from "./components/Intro";
import { useReveals } from "./components/Reveals";
import { useRef } from "react";

export default function App() {
  const appRef = useRef<HTMLElement>(null);
  useReveals(appRef);

  return (
    <>
      <SmoothScroll />
      <Cursor />
      <Intro />
      <div className="marquee" aria-hidden>
        <div className="marquee-track">
          {Array.from({ length: 6 }).map((_, i) => (
            <span key={i}>crack a cookie · keep the fortune · on-chain ·&nbsp;</span>
          ))}
        </div>
      </div>
      <main className="app" id="top">
        <WalletHeader />
        <ErrorPanel />
        <CrackPanel />
        <GalleryPanel />
        <RafflePanel />
        <footer className="footer" data-reveal>
          <nav aria-label="Footer">
            <a href="https://github.com/BlckR0SE/cookie-fortune" target="_blank" rel="noopener">repo</a>
            <a href="https://cookiescan.io" target="_blank" rel="noopener">explorer</a>
            <a href="#raffle">jar</a>
          </nav>
          fortunes are on-chain · verify every tx on cookiescan.io
        </footer>
      </main>
    </>
  );
}
