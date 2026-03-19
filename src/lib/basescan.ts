// ===========================================
// Etherscan API V2 Client — Base Network
// ===========================================
// Menggunakan Etherscan API V2 dengan chainid=8453 (Base Mainnet)
// Satu API key bisa query Base + 60+ EVM chains lain
// Docs: https://docs.etherscan.io/api-reference/endpoint/

import type { ContractSource } from './types';

// Base Mainnet chain ID untuk Etherscan V2
const BASE_CHAIN_ID = 8453;
const ETHERSCAN_V2_URL = 'https://api.etherscan.io/v2/api';

// Fallback ke basescan.org jika BASESCAN_API_KEY di-set
const BASESCAN_URL = 'https://api.basescan.org/api';

// --- API Key & URL Resolution ---

function getApiConfig(): { baseUrl: string; apiKey: string } {
  const etherscanKey = process.env.ETHERSCAN_API_KEY;
  const basescanKey = process.env.BASESCAN_API_KEY;

  if (etherscanKey) {
    return { baseUrl: ETHERSCAN_V2_URL, apiKey: etherscanKey };
  }
  if (basescanKey) {
    return { baseUrl: BASESCAN_URL, apiKey: basescanKey };
  }
  throw new Error(
    'API key tidak ditemukan. Set ETHERSCAN_API_KEY atau BASESCAN_API_KEY di .env.local'
  );
}

function buildUrl(module: string, action: string, params: Record<string, string>): string {
  const { baseUrl, apiKey } = getApiConfig();
  const searchParams = new URLSearchParams({
    module,
    action,
    apikey: apiKey,
    ...params,
  });

  // Etherscan V2 butuh chainid, basescan.org tidak
  if (baseUrl === ETHERSCAN_V2_URL) {
    searchParams.set('chainid', String(BASE_CHAIN_ID));
  }

  return `${baseUrl}?${searchParams.toString()}`;
}

// --- Generic Fetch Helper ---

interface EtherscanResponse<T> {
  status: string;
  message: string;
  result: T;
}

async function etherscanFetch<T>(
  module: string,
  action: string,
  params: Record<string, string>,
  cacheSeconds = 300
): Promise<EtherscanResponse<T>> {
  const url = buildUrl(module, action, params);
  const response = await fetch(url, {
    headers: { Accept: 'application/json' },
    next: { revalidate: cacheSeconds },
  });

  if (!response.ok) {
    throw new Error(`Etherscan API error: ${response.status} ${response.statusText}`);
  }

  return response.json();
}

// ===========================================
// CONTRACT MODULE
// ===========================================

interface EtherscanSourceResult {
  SourceCode: string;
  ABI: string;
  ContractName: string;
  CompilerVersion: string;
  OptimizationUsed: string;
  Runs: string;
  EVMVersion: string;
  LicenseType: string;
  Proxy: string;
  Implementation: string;
}

// --- Fetch Verified Source Code ---

export async function fetchContractSource(address: string): Promise<ContractSource | null> {
  const data = await etherscanFetch<EtherscanSourceResult[]>(
    'contract',
    'getsourcecode',
    { address }
  );

  if (data.status !== '1' || !data.result || data.result.length === 0) {
    return null;
  }

  const result = data.result[0];

  if (!result.SourceCode || result.ABI === 'Contract source code not verified') {
    return null;
  }

  // Handle multi-file source code (JSON format dari Etherscan-style APIs)
  let sourceCode = result.SourceCode;
  if (sourceCode.startsWith('{{') || sourceCode.startsWith('{')) {
    try {
      const cleaned = sourceCode.startsWith('{{') ? sourceCode.slice(1, -1) : sourceCode;
      const parsed = JSON.parse(cleaned);

      if (parsed.sources) {
        sourceCode = Object.entries(parsed.sources)
          .map(([filename, content]: [string, any]) => {
            return `// === File: ${filename} ===\n${content.content || content}`;
          })
          .join('\n\n');
      }
    } catch {
      // Jika parsing gagal, pakai as-is
    }
  }

  return {
    sourceCode,
    abi: result.ABI,
    contractName: result.ContractName,
    compilerVersion: result.CompilerVersion,
    optimizationUsed: result.OptimizationUsed === '1',
    runs: parseInt(result.Runs, 10) || 0,
    evmVersion: result.EVMVersion || 'default',
    licenseType: result.LicenseType || 'Unknown',
    proxy: result.Proxy === '1',
    implementation: result.Implementation || '',
  };
}

// --- Fetch Contract ABI Only ---

export async function fetchContractABI(address: string): Promise<string | null> {
  const data = await etherscanFetch<string>('contract', 'getabi', { address });
  if (data.status !== '1') return null;
  return data.result;
}

// --- Fetch Contract Creation Info + Creator + Timestamp ---

export interface ContractCreationInfo {
  creator: string;
  txHash: string;
  blockNumber: string;
  timestamp: string; // ISO date string
}

export async function fetchContractCreation(address: string): Promise<ContractCreationInfo | null> {
  const data = await etherscanFetch<
    Array<{ contractCreator: string; txHash: string; blockNumber?: string }>
  >('contract', 'getcontractcreation', { contractaddresses: address });

  if (data.status !== '1' || !data.result || data.result.length === 0) return null;

  const raw = data.result[0];

  // Ambil timestamp dari block menggunakan getblockreward
  let timestamp = '';
  if (raw.blockNumber) {
    try {
      const blockData = await etherscanFetch<{ timeStamp: string }>(
        'block',
        'getblockreward',
        { blockno: raw.blockNumber },
        600
      );
      if (blockData.status === '1' && blockData.result?.timeStamp) {
        const ts = parseInt(blockData.result.timeStamp, 10);
        timestamp = new Date(ts * 1000).toISOString();
      }
    } catch {
      // timestamp opsional, lanjutkan tanpa itu
    }
  }

  return {
    creator: raw.contractCreator,
    txHash: raw.txHash,
    blockNumber: raw.blockNumber || '',
    timestamp,
  };
}

// ===========================================
// ACCOUNT MODULE
// ===========================================

export interface TransactionSummary {
  hash: string;
  from: string;
  to: string;
  value: string; // in wei
  functionName: string;
  isError: boolean;
  timeStamp: string; // unix timestamp string
  blockNumber: string;
}

// --- Fetch Recent Transactions (untuk analisis aktivitas kontrak) ---

export async function fetchRecentTransactions(
  address: string,
  limit = 10
): Promise<TransactionSummary[]> {
  const data = await etherscanFetch<
    Array<{
      hash: string;
      from: string;
      to: string;
      value: string;
      functionName: string;
      isError: string;
      timeStamp: string;
      blockNumber: string;
    }>
  >('account', 'txlist', {
    address,
    startblock: '0',
    endblock: '99999999',
    page: '1',
    offset: String(limit),
    sort: 'desc',
  });

  if (data.status !== '1' || !Array.isArray(data.result)) return [];

  return data.result.map((tx) => ({
    hash: tx.hash,
    from: tx.from,
    to: tx.to,
    value: tx.value,
    functionName: tx.functionName || '',
    isError: tx.isError === '1',
    timeStamp: tx.timeStamp,
    blockNumber: tx.blockNumber,
  }));
}

// --- Fetch Internal Transactions (untuk deteksi pola withdraw/delegatecall) ---

export interface InternalTransaction {
  hash: string;
  from: string;
  to: string;
  value: string;
  type: string; // 'call', 'delegatecall', etc.
  isError: boolean;
}

export async function fetchInternalTransactions(
  address: string,
  limit = 10
): Promise<InternalTransaction[]> {
  const data = await etherscanFetch<
    Array<{
      hash: string;
      from: string;
      to: string;
      value: string;
      type: string;
      isError: string;
    }>
  >('account', 'txlistinternal', {
    address,
    startblock: '0',
    endblock: '99999999',
    page: '1',
    offset: String(limit),
    sort: 'desc',
  });

  if (data.status !== '1' || !Array.isArray(data.result)) return [];

  return data.result.map((tx) => ({
    hash: tx.hash,
    from: tx.from,
    to: tx.to,
    value: tx.value,
    type: tx.type,
    isError: tx.isError === '1',
  }));
}

// ===========================================
// TOKEN MODULE
// ===========================================

export interface TokenInfo {
  contractAddress: string;
  tokenName: string;
  symbol: string;
  divisor: string; // desimal
  tokenType: string; // 'ERC-20', 'ERC-721', 'ERC-1155'
  totalSupply: string;
  blueCheckmark: string;
  description: string;
  website: string;
}

// --- Fetch Token Info (jika kontrak adalah token ERC20/721/1155) ---

export async function fetchTokenInfo(address: string): Promise<TokenInfo | null> {
  const data = await etherscanFetch<TokenInfo>('token', 'tokeninfo', { contractaddress: address });

  if (data.status !== '1' || !data.result) return null;

  // Result bisa berupa array atau object tunggal
  const result = Array.isArray(data.result) ? data.result[0] : data.result;
  if (!result?.tokenName) return null;

  return result;
}

// --- Fetch Token Transfers (untuk analisis aktivitas token) ---

export interface TokenTransfer {
  hash: string;
  from: string;
  to: string;
  value: string;
  tokenName: string;
  tokenSymbol: string;
  tokenDecimal: string;
  timeStamp: string;
}

export async function fetchTokenTransfers(
  address: string,
  limit = 10
): Promise<TokenTransfer[]> {
  const data = await etherscanFetch<
    Array<{
      hash: string;
      from: string;
      to: string;
      value: string;
      tokenName: string;
      tokenSymbol: string;
      tokenDecimal: string;
      timeStamp: string;
    }>
  >('account', 'tokentx', {
    contractaddress: address,
    page: '1',
    offset: String(limit),
    sort: 'desc',
  });

  if (data.status !== '1' || !Array.isArray(data.result)) return [];

  return data.result;
}

// ===========================================
// LOGS MODULE
// ===========================================

export interface ContractLog {
  address: string;
  topics: string[];
  data: string;
  blockNumber: string;
  timeStamp: string;
  transactionHash: string;
  logIndex: string;
}

// --- Fetch Recent Event Logs (untuk analisis event yang diemit kontrak) ---

export async function fetchContractLogs(
  address: string,
  limit = 20
): Promise<ContractLog[]> {
  const data = await etherscanFetch<ContractLog[]>('logs', 'getLogs', {
    address,
    fromBlock: '0',
    toBlock: 'latest',
    page: '1',
    offset: String(limit),
  });

  if (data.status !== '1' || !Array.isArray(data.result)) return [];

  return data.result;
}

// ===========================================
// STATS MODULE
// ===========================================

// --- Fetch ETH Balance via Etherscan (alternatif RPC) ---

export async function fetchContractBalance(address: string): Promise<string> {
  const data = await etherscanFetch<string>('account', 'balance', {
    address,
    tag: 'latest',
  });

  if (data.status !== '1') return '0';
  return data.result; // dalam wei
}

// ===========================================
// UTILITY: Enriched Contract Data
// ===========================================

export interface EnrichedContractData {
  creation: ContractCreationInfo | null;
  recentTxCount: number;
  lastActivityDate: string | null;
  isToken: boolean;
  tokenInfo: TokenInfo | null;
  hasInternalTxs: boolean;
}

// --- Fetch semua data enrichment sekaligus (paralel) ---

export async function fetchEnrichedContractData(address: string): Promise<EnrichedContractData> {
  const [creation, recentTxs, internalTxs, tokenInfo] = await Promise.allSettled([
    fetchContractCreation(address),
    fetchRecentTransactions(address, 5),
    fetchInternalTransactions(address, 5),
    fetchTokenInfo(address),
  ]);

  const creationData = creation.status === 'fulfilled' ? creation.value : null;
  const txs = recentTxs.status === 'fulfilled' ? recentTxs.value : [];
  const internalTxData = internalTxs.status === 'fulfilled' ? internalTxs.value : [];
  const token = tokenInfo.status === 'fulfilled' ? tokenInfo.value : null;

  const lastTx = txs[0];
  const lastActivityDate = lastTx
    ? new Date(parseInt(lastTx.timeStamp, 10) * 1000).toISOString()
    : null;

  return {
    creation: creationData,
    recentTxCount: txs.length,
    lastActivityDate,
    isToken: !!token,
    tokenInfo: token,
    hasInternalTxs: internalTxData.length > 0,
  };
}
