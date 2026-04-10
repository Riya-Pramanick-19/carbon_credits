"use client";

import {
  Networks,
  TransactionBuilder,
  Keypair,
  Address,
  nativeToScVal,
  scValToNative,
  rpc,
} from "@stellar/stellar-sdk";
import {
  isConnected,
  getAddress,
  signTransaction,
  setAllowed,
  isAllowed,
  requestAccess,
} from "@stellar/freighter-api";
import { Client as ContractClient } from "../packages/contract/src/index";

// ============================================================
// CONSTANTS — Carbon Credits Contract
// ============================================================

/** Your deployed Soroban contract ID */
export const CONTRACT_ADDRESS =
  "CDAVHOR3XCAPTU4NVU3TNSWRMW3GZ3OGHOP3IPUNRXXAC6J7MJV35LI5";

/** Network passphrase (testnet by default) */
export const NETWORK_PASSPHRASE = Networks.TESTNET;

/** Soroban RPC URL */
export const RPC_URL = "https://soroban-testnet.stellar.org";

/** Horizon URL */
export const HORIZON_URL = "https://horizon-testnet.stellar.org";

/** Network name for Freighter */
export const NETWORK = "TESTNET";

// ============================================================
// RPC Server Instance
// ============================================================

const server = new rpc.Server(RPC_URL);

// ============================================================
// Wallet Helpers
// ============================================================

export async function checkConnection(): Promise<boolean> {
  const result = await isConnected();
  return result.isConnected;
}

export async function connectWallet(): Promise<string> {
  const connResult = await isConnected();
  if (!connResult.isConnected) {
    throw new Error("Freighter extension is not installed or not available.");
  }

  const allowedResult = await isAllowed();
  if (!allowedResult.isAllowed) {
    await setAllowed();
    await requestAccess();
  }

  const { address } = await getAddress();
  if (!address) {
    throw new Error("Could not retrieve wallet address from Freighter.");
  }
  return address;
}

export async function getWalletAddress(): Promise<string | null> {
  try {
    const connResult = await isConnected();
    if (!connResult.isConnected) return null;

    const allowedResult = await isAllowed();
    if (!allowedResult.isAllowed) return null;

    const { address } = await getAddress();
    return address || null;
  } catch {
    return null;
  }
}

// ============================================================
// Contract Interaction Helpers using Generated Bindings
// ============================================================

const clientOptions = {
  contractId: CONTRACT_ADDRESS,
  networkPassphrase: NETWORK_PASSPHRASE,
  rpcUrl: RPC_URL,
};

/**
 * Sign and send a transaction using the generated contract client.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function signAndSend(tx: any) {
  // Get the transaction XDR
  const txXdr = tx.raw().toXDR();

  // Sign with Freighter
  const { signedTxXdr } = await signTransaction(txXdr, {
    networkPassphrase: NETWORK_PASSPHRASE,
  });

  // Submit transaction
  const txToSubmit = TransactionBuilder.fromXDR(
    signedTxXdr,
    NETWORK_PASSPHRASE
  );

  const result = await server.sendTransaction(txToSubmit);

  if (result.status === "ERROR") {
    throw new Error(`Transaction submission failed: ${result.status}`);
  }

  // Poll for confirmation
  let getResult = await server.getTransaction(result.hash);
  while (getResult.status === "NOT_FOUND") {
    await new Promise((resolve) => setTimeout(resolve, 1000));
    getResult = await server.getTransaction(result.hash);
  }

  if (getResult.status === "FAILED") {
    throw new Error("Transaction failed on chain.");
  }

  return getResult;
}

// ============================================================
// Carbon Credits — Contract Methods
// ============================================================

/**
 * Mint carbon credits to a user.
 * Calls: mint(to: Address, amount: i128)
 */
export async function mintCarbonCredits(
  caller: string,
  to: string,
  amount: bigint
) {
  const client = new ContractClient(clientOptions);

  const tx = await client.mint({ to, amount });
  await signAndSend(tx);
}

/**
 * Transfer carbon credits between users.
 * Calls: transfer(from: Address, to: Address, amount: i128)
 */
export async function transferCarbonCredits(
  caller: string,
  to: string,
  amount: bigint
) {
  const client = new ContractClient(clientOptions);

  const tx = await client.transfer({ from: caller, to, amount });
  await signAndSend(tx);
}

/**
 * Check carbon credit balance (read-only).
 * Calls: balance(user: Address) -> i128
 */
export async function getBalance(user: string): Promise<bigint> {
  const client = new ContractClient(clientOptions);

  const result = await client.balance({ user });
  return result.result;
}

export { nativeToScVal, scValToNative, Address, rpc };