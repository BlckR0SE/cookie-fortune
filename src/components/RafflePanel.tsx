// S7 fills this in: jar address + live balance + daily golden pot + payout list.
export const JAR_ADDRESS = "JAR_ADDRESS_PENDING_S0_KEYGEN";

export function RafflePanel() {
  return (
    <section className="panel">
      <h2>Golden raffle</h2>
      <p className="muted">
        50% of each day's draw revenue goes to one random drawer. v1: payout sent
        manually within 24h, tx listed here. Jar: <code>{JAR_ADDRESS}</code>
      </p>
    </section>
  );
}
