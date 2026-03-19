// ===========================================
// Base Network RPC Client (viem)
// ===========================================

import { createPublicClient, http, formatEther, type Address } from 'viem';
import { base } from 'viem/chains';

// --- Create Client ---

function getClient() {
  const rpcUrl = process.env.BASE_RPC_URL || 'https://mainnet.base.org';
  return createPublicClient({
    chain: base,
    transport: http(rpcUrl),
  });
}

// --- Check if Address is a Contract ---

export async function isContract(address: string): Promise<boolean> {
  const client = getClient();
  const code = await client.getCode({ address: address as Address });
  return !!code && code !== '0x';
}

// --- Get Contract Balance ---

export async function getBalance(address: string): Promise<string> {
  const client = getClient();
  const balance = await client.getBalance({ address: address as Address });
  return formatEther(balance);
}

// --- Get Transaction Count ---

export async function getTransactionCount(address: string): Promise<number> {
  const client = getClient();
  const count = await client.getTransactionCount({ address: address as Address });
  return count;
}

// --- Get Block Number (for health check) ---

export async function getBlockNumber(): Promise<bigint> {
  const client = getClient();
  return client.getBlockNumber();
}

// --- Get Full Contract Info ---

export async function getContractOnChainInfo(address: string) {
  const client = getClient();

  const [code, balance, txCount] = await Promise.all([
    client.getCode({ address: address as Address }),
    client.getBalance({ address: address as Address }),
    client.getTransactionCount({ address: address as Address }),
  ]);

  return {
    isContract: !!code && code !== '0x',
    balanceETH: formatEther(balance),
    txCount,
    bytecodeSize: code ? (code.length - 2) / 2 : 0, // remove 0x, each byte = 2 hex chars
  };
}