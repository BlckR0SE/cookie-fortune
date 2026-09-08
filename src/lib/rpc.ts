import { Connection } from "@solana/web3.js";

// RPC singleton — one Connection app-wide (plan risk table: rate-limit mitigation)
export const RPC_URL = "https://rpc.cookiescan.io";
export const connection = new Connection(RPC_URL, "confirmed");

export const EXPLORER = "https://cookiescan.io";
export const txUrl = (sig: string) => `${EXPLORER}/tx/${sig}`;
export const acctUrl = (addr: string) => `${EXPLORER}/account/${addr}`;
