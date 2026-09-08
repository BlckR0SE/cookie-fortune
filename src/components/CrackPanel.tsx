// S5 fills this in: draw tx (jar payment + memo), confirmation poll, slot-mod reveal.
export function CrackPanel() {
  return (
    <section className="panel">
      <h2>Crack a cookie</h2>
      <p className="muted">0.001 COOK to the jar · fortune = confirmed slot mod 64</p>
      <button className="btn big" disabled title="lands in S5">Crack</button>
    </section>
  );
}
