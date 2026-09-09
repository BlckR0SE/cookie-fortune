// App — THE RECEIPT (design_v2 §12): printer mouth (sticky) → receipt sheet.
// ≥1100px: full-bleed 2-col ledger grid (.main-cols: crack deck left, archive
// right) + GOLDEN JAR bottom strip; single column below. Native scroll — no Lenis.
import { WalletHeader } from "./components/WalletHeader";
import { CrackPanel } from "./components/CrackPanel";
import { GalleryPanel } from "./components/GalleryPanel";
import { RafflePanel } from "./components/RafflePanel";
import { ErrorPanel } from "./components/ErrorPanel";

const TICKER = "CRACK A COOKIE · KEEP THE FORTUNE · ON-CHAIN · 0.001 COOK · GOLDEN JAR DAILY · ";

export default function App() {
  return (
    <>
      <main className="receipt" id="top">
        <div className="mouth" aria-hidden="true">
          <div className="mouth-row">
            <span className="led" />
            <span className="mouth-model">CF-RECEIPT·9000</span>
            <div className="slit">
              <div className="slit-track">
                <span>{TICKER.repeat(4)}</span>
                <span>{TICKER.repeat(4)}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="rc main-cols">
          <div className="col-left">
            <WalletHeader />
            <ErrorPanel />
            <div className="perf"><span className="lbl">CRACK DECK</span></div>
            <CrackPanel />
          </div>
          <div className="col-right">
            <GalleryPanel />
          </div>
        </div>

        <div className="perf"><span className="lbl">GOLDEN JAR</span></div>
        <RafflePanel />

        <footer className="rc-foot">
          <div className="barcode" aria-hidden="true" />
          <p className="fine">FORTUNES ARE ON-CHAIN · VERIFY EVERY CRUMB</p>
          <nav className="foot-links" aria-label="Footer">
            <a href="https://github.com/BlckR0SE/cookie-fortune" target="_blank" rel="noopener">REPO</a>
            <a href="https://cookiescan.io" target="_blank" rel="noopener">COOKIESCAN</a>
            <a href="#jar">THE JAR</a>
          </nav>
        </footer>
        <div className="zigzag" aria-hidden="true" />
      </main>
    </>
  );
}
