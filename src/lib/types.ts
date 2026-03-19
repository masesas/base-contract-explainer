// ===========================================
// Core Types - Base Contract Explainer
// ===========================================

export type AIProvider = 'anthropic' | 'openai' | 'google';

export type RiskLevel = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | 'INFO';

export type Language = 'id' | 'en';

// --- Request / Response ---

export interface AnalyzeRequest {
  address: string;
  language: Language;
  provider: AIProvider;
}

export interface AnalyzeResponse {
  contract: ContractMetadata;
  summary: string;
  riskLevel: RiskLevel;
  risks: RiskItem[];
  functions: FunctionExplanation[];
  provider: AIProvider;
  analyzedAt: string;
}

// --- Contract Data ---

export interface ContractMetadata {
  address: string;
  name: string;
  verified: boolean;
  compiler: string | null;
  optimization: boolean;
  evmVersion: string | null;
  license: string | null;
  balanceETH: string;
  txCount: number;
  creationDate: string | null;
  creatorAddress: string | null;
  creationTxHash: string | null;
  lastActivityDate: string | null;
  isProxy: boolean;
  implementationAddress: string | null;
  isToken: boolean;
  tokenSymbol: string | null;
  tokenType: string | null;
}

export interface ContractSource {
  sourceCode: string;
  abi: string;
  contractName: string;
  compilerVersion: string;
  optimizationUsed: boolean;
  runs: number;
  evmVersion: string;
  licenseType: string;
  proxy: boolean;
  implementation: string;
}

// --- Risk Assessment ---

export interface RiskItem {
  id: string;
  type: RiskPatternType;
  severity: RiskLevel;
  title: string;
  description: string;
  location?: string; // function or line reference
}

export type RiskPatternType =
  | 'SELFDESTRUCT'
  | 'DELEGATECALL'
  | 'UNLIMITED_APPROVAL'
  | 'OWNER_WITHDRAW'
  | 'HIDDEN_MINT'
  | 'PROXY_UPGRADEABLE'
  | 'HARDCODED_ADDRESS'
  | 'REENTRANCY_RISK'
  | 'MISSING_EVENTS'
  | 'NO_RENOUNCE_OWNERSHIP'
  | 'EXTERNAL_CALL_UNCHECKED'
  | 'TIMESTAMP_DEPENDENCY'
  | 'TX_ORIGIN_AUTH'
  | 'UNPROTECTED_INITIALIZE'
  | 'CUSTOM';

// --- Function Explanation ---

export interface FunctionExplanation {
  name: string;
  signature: string;
  visibility: 'public' | 'external' | 'internal' | 'private';
  mutability: 'pure' | 'view' | 'payable' | 'nonpayable';
  description: string;
  riskNote: string | null;
  parameters: ParameterInfo[];
}

export interface ParameterInfo {
  name: string;
  type: string;
  description: string;
}

// --- AI Analysis Result (from LLM) ---

export interface AIAnalysisResult {
  summary: string;
  overallRisk: RiskLevel;
  risks: Array<{
    type: string;
    severity: RiskLevel;
    title: string;
    description: string;
    location?: string;
  }>;
  functions: Array<{
    name: string;
    signature: string;
    visibility: string;
    mutability: string;
    description: string;
    riskNote: string | null;
    parameters: Array<{
      name: string;
      type: string;
      description: string;
    }>;
  }>;
}

// --- API Error ---

export interface APIError {
  error: string;
  code: string;
  details?: string;
}

// --- Provider Config ---

export interface ProviderConfig {
  id: AIProvider;
  name: string;
  model: string;
  available: boolean;
  icon: string;
}