// Direct Nightly provider util — plan's pre-committed fallback (adapter path dead:
// spike browser log showed getWallets()=0, Nightly not wallet-standard registered).
// Method names from https://docs.nightly.app/docs/solana/solana/{detection,connect,sign_transaction,sign_message}
// — everything lives on provider.features['standard:*'], NOT on the provider itself
// (spike log: provider.signAndSendTransaction is not a function).
// ponytail: signTransaction input is tx.serialize() (all signatures, like adapter's
// legacy path) because setSignatures-based partial serialize broke Nightly in spike 002.
// Upgrade path: switch to requireAllSignatures:false + fee-payer pre-sign if Nightly hardens.
import { PublicKey, Transaction } from "@solana/web3.js";
import { connection } from "./rpc";

interface NightlyAccount {
  address: string;
  publicKey: Uint8Array;
  chains: readonly string[];
  features: readonly string[];
}
interface NightlySignTxInput {
  account: NightlyAccount;
  transaction: Uint8Array;
  chain?: `${string}:${string}`; // optional per docs — Cookie Chain id unknown, omit
}
interface NightlySignTxOutput {
  signedTransaction: Uint8Array;
}
interface NightlySignMessageInput {
  account: NightlyAccount;
  message: Uint8Array;
}
interface NightlySignMessageOutput {
  signedMessage: Uint8Array;
  signature: Uint8Array;
  signatureType?: "ed25519";
}
interface NightlyFeatures {
  "standard:connect"?: { connect(input?: { silent?: boolean }): Promise<{ accounts: readonly NightlyAccount[] }> };
  "standard:disconnect"?: { disconnect(): Promise<void> };
  "standard:signTransaction"?: {
    signTransaction(...inputs: readonly NightlySignTxInput[]): Promise<readonly NightlySignTxOutput[]>;
  };
  "standard:signMessage"?: {
    signMessage(...inputs: readonly NightlySignMessageInput[]): Promise<readonly NightlySignMessageOutput[]>;
  };
}
export interface NightlyProvider {
  publicKey?: Uint8Array | string | null; // pre-connect placeholder 11111111… — never trust before connect
  isConnected?: boolean;
  features?: NightlyFeatures;
  connect?: () => Promise<void>; // legacy direct method — proven working in spike 001 browser log
  disconnect?: () => Promise<void>;
  on?: (event: string, handler: (args: unknown) => void) => void;
  removeListener?: (event: string, handler: (args: unknown) => void) => void;
}

type Coded = Error & { code: string };
const coded = (code: string, message: string): Coded => Object.assign(new Error(message), { code });

export function detect(): NightlyProvider | null {
  return (window as unknown as { nightly?: { solana?: NightlyProvider } }).nightly?.solana ?? null;
}

// ---- typed events ----
export type WalletEvent =
  | { type: "connected"; address: string }
  | { type: "disconnected" }
  | { type: "error"; error: Coded };
type Listener = (e: WalletEvent) => void;
const listeners = new Set<Listener>();
export const onWalletEvent = (fn: Listener): (() => void) => {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
};
const emit = (e: WalletEvent) => listeners.forEach((fn) => fn(e));

let provider: NightlyProvider | null = null;
let account: NightlyAccount | null = null;

export const isInstalled = (): boolean => detect() !== null;
export const getPublicKey = (): string | null => account?.address ?? null;

export async function connect(): Promise<string> {
  provider = detect();
  if (!provider) throw coded("not-installed", "Nightly wallet not detected");
  try {
    // Doc flow: features['standard:connect'].connect(silent) → { accounts }.
    // Spike 001 proved legacy provider.connect() also works; features first, legacy fallback.
    const out = provider.features?.["standard:connect"]
      ? await provider.features["standard:connect"].connect({ silent: false })
      : await provider.connect?.().then(() => ({ accounts: [] as NightlyAccount[] }));
    account = out?.accounts?.[0] ?? null;
    const addr = account?.address ?? normalizeKey(provider.publicKey);
    if (!addr) throw new Error("connected but no account address returned");
    emit({ type: "connected", address: addr });
    return addr;
  } catch (e) {
    throw tag(e);
  }
}

function normalizeKey(k: NightlyProvider["publicKey"]): string | null {
  if (!k) return null;
  if (typeof k === "string") return k;
  return new PublicKey(k).toBase58();
}

// Map unknown wallet errors onto ErrorPanel's four cases. Nightly error shapes are
// undocumented, so classify by message text (rejections say reject/denied/close).
function tag(e: unknown): Coded {
  const err = e instanceof Error ? e : new Error(String(e));
  const codedErr = err as Coded;
  if (codedErr.code) return codedErr;
  const m = (err.message || "").toLowerCase();
  codedErr.code = /reject|denied|close|cancel/.test(m)
    ? "user-reject"
    : /blockhash|block|chain|cluster|network|networkversion/.test(m)
      ? "wrong-network"
      : "send-failure";
  return codedErr;
}

export async function disconnect(): Promise<void> {
  try {
    await (provider?.features?.["standard:disconnect"]
      ? provider.features["standard:disconnect"].disconnect()
      : provider?.disconnect?.());
  } finally {
    account = null;
    emit({ type: "disconnected" });
  }
}

// Nightly has no provider-level signAndSendTransaction (spike 001 TypeError). Doc flow:
// sign via features['standard:signTransaction'], then sendRawTransaction ourselves.
export async function signAndSend(tx: Transaction): Promise<string> {
  if (!provider || !account) throw coded("send-failure", "wallet not connected");
  const signTx = provider.features?.["standard:signTransaction"];
  if (!signTx) throw coded("send-failure", "Nightly signTransaction feature unavailable");
  try {
    const outputs = await signTx.signTransaction({ account, transaction: tx.serialize() });
    const raw = outputs?.[0]?.signedTransaction;
    if (!raw) throw new Error("Nightly returned no signed transaction");
    return await connection.sendRawTransaction(raw, { skipPreflight: false });
  } catch (e) {
    throw tag(e);
  }
}

export async function signMessage(message: Uint8Array): Promise<Uint8Array> {
  if (!provider || !account) throw coded("send-failure", "wallet not connected");
  const signMsg = provider.features?.["standard:signMessage"];
  if (!signMsg) throw coded("send-failure", "Nightly signMessage feature unavailable");
  const out = await signMsg.signMessage({ account, message });
  return out?.[0]?.signature ?? new Uint8Array();
}
