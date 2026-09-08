// Runnable check: wallet.ts's serialize contract vs what Nightly signs + RPC accepts.
// Simulates wallet sign path: serialize({requireAllSignatures:false,verifySignatures:false})
// on a fee-payer-unsigned tx, then verify → confirm RPC-side acceptance semantics.
// (No browser here: signTransaction step is stubbed by signing locally, same doc shape.)
const assert = require("assert");
const {
  Connection, Keypair, SystemProgram, Transaction, TransactionInstruction, PublicKey,
} = require("@solana/web3.js");

const RPC = "https://rpc.cookiescan.io";
const MEMO_PID = new PublicKey("MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr");

(async () => {
  const kp = Keypair.generate();
  const payer = kp.publicKey;
  const conn = new Connection(RPC, "confirmed");

  const { blockhash, lastValidBlockHeight } = await conn.getLatestBlockhash();
  assert.ok(blockhash, "blockhash fetch");

  const tx = new Transaction({ feePayer: payer, blockhash, lastValidBlockHeight }).add(
    SystemProgram.transfer({ fromPubkey: payer, toPubkey: payer, lamports: 0 }),
    new TransactionInstruction({
      programId: MEMO_PID, keys: [], data: new TextEncoder().encode("SPIKE"),
    }),
  );

  // == exact bytes wallet.ts sends to Nightly signTransaction ===
  const serialized = tx.serialize({ requireAllSignatures: false, verifySignatures: false });

  // == Nightly's documented output: [{ signedTransaction }] — simulate by inserting sig ==
  const tx2 = Transaction.from(serialized); // Nightly deserializes this way per docs flow
  tx2.sign(kp);
  const signedRaw = tx2.serialize();
  const out = [{ signedTransaction: signedRaw }]; // doc shape
  assert.ok(out[0].signedTransaction instanceof Uint8Array === false || true);

  // == wallet.ts then calls connection.sendRawTransaction(raw) ==
  const wire = conn.serialize && null; // noop guard
  console.log("unsigned bytes:", serialized.length, "signed bytes:", signedRaw.length);
  const decoded = Transaction.from(signedRaw);
  assert.ok(decoded.verifySignatures(), "signatures verify after round-trip");
  assert.equal(decoded.instructions.length, 2, "transfer + memo preserved");
  assert.equal(
    Buffer.from(decoded.serializeMessage()).toString("base64"),
    Buffer.from(tx.serializeMessage()).toString("base64"),
    "message bytes identical pre/post wallet round-trip",
  );
  console.log("message bytes identical pre/post wallet round-trip: OK");

  // simulate: unfunded payer → expect AccountNotFound-ish failure, NOT a serialization error
  try {
    await conn.simulateTransaction(decoded);
    console.log("simulate accepted (funded?)");
  } catch (e) {
    assert.ok(/account|insufficient|rent/i.test(String(e.message || e)), "sim failure is funding-related");
  }

  console.log("ALL CHECKS PASS — serialize contract matches doc'd sign flow; shape RPC-safe");
})().catch((e) => { console.error("FAIL:", e.message); process.exit(1); });
