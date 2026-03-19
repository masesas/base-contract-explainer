// ===========================================
// Static Risk Pattern Detection
// ===========================================
// Rule-based detection BEFORE AI analysis
// Catches known dangerous patterns quickly

import type { RiskItem, RiskLevel, RiskPatternType } from './types';

interface PatternRule {
  id: string;
  type: RiskPatternType;
  severity: RiskLevel;
  title: string;
  titleId: string;
  description: string;
  descriptionId: string;
  pattern: RegExp;
  contextCheck?: (source: string, match: RegExpMatchArray) => boolean;
}

// --- Pattern Rules ---

const RISK_PATTERNS: PatternRule[] = [
  {
    id: 'selfdestruct',
    type: 'SELFDESTRUCT',
    severity: 'CRITICAL',
    title: 'Self-Destruct Capability',
    titleId: 'Kemampuan Self-Destruct',
    description: 'This contract can destroy itself, permanently removing all code and sending remaining funds to a specified address. Any funds you deposit could be lost.',
    descriptionId: 'Kontrak ini bisa menghancurkan dirinya sendiri, menghapus semua kode secara permanen dan mengirim sisa dana ke alamat tertentu. Dana yang Anda setorkan bisa hilang.',
    pattern: /selfdestruct\s*\(|suicide\s*\(/gi,
  },
  {
    id: 'delegatecall-dynamic',
    type: 'DELEGATECALL',
    severity: 'CRITICAL',
    title: 'Dynamic Delegate Call',
    titleId: 'Delegate Call Dinamis',
    description: 'This contract can execute arbitrary code from another address in its own context. This means the contract behavior could change without warning.',
    descriptionId: 'Kontrak ini bisa menjalankan kode dari alamat lain dalam konteksnya sendiri. Artinya perilaku kontrak bisa berubah tanpa pemberitahuan.',
    pattern: /\.delegatecall\s*\(/gi,
    contextCheck: (source, match) => {
      // More critical if target is a variable, not hardcoded
      const idx = match.index || 0;
      const surrounding = source.slice(Math.max(0, idx - 100), idx);
      return !surrounding.includes('address(this)');
    },
  },
  {
    id: 'unlimited-approval',
    type: 'UNLIMITED_APPROVAL',
    severity: 'HIGH',
    title: 'Unlimited Token Approval Pattern',
    titleId: 'Pola Approval Token Tanpa Batas',
    description: 'This contract may request unlimited spending permission for your tokens. This means it could transfer all your tokens at any time.',
    descriptionId: 'Kontrak ini mungkin meminta izin pengeluaran tanpa batas untuk token Anda. Artinya kontrak bisa mentransfer semua token Anda kapan saja.',
    pattern: /type\(uint256\)\.max|2\s*\*\*\s*256\s*-\s*1|0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff|MAX_UINT/gi,
  },
  {
    id: 'owner-withdraw',
    type: 'OWNER_WITHDRAW',
    severity: 'HIGH',
    title: 'Owner-Only Withdrawal',
    titleId: 'Penarikan Hanya Oleh Owner',
    description: 'The contract owner can withdraw all funds. If the owner is malicious or compromised, all deposited funds could be taken.',
    descriptionId: 'Owner kontrak bisa menarik semua dana. Jika owner jahat atau dikompromikan, semua dana yang disetorkan bisa diambil.',
    pattern: /function\s+withdraw\s*\([^)]*\)[^{]*onlyOwner/gi,
  },
  {
    id: 'hidden-mint',
    type: 'HIDDEN_MINT',
    severity: 'HIGH',
    title: 'Minting Capability',
    titleId: 'Kemampuan Minting',
    description: 'The contract allows creating new tokens. If unrestricted, this could dilute your holdings by flooding the supply.',
    descriptionId: 'Kontrak ini memungkinkan pembuatan token baru. Jika tidak dibatasi, ini bisa mendilusi kepemilikan Anda dengan membanjiri supply.',
    pattern: /function\s+mint\s*\([^)]*\)[^{]*(onlyOwner|onlyMinter|onlyRole)/gi,
  },
  {
    id: 'proxy-upgradeable',
    type: 'PROXY_UPGRADEABLE',
    severity: 'HIGH',
    title: 'Upgradeable Proxy Contract',
    titleId: 'Kontrak Proxy yang Bisa Di-upgrade',
    description: 'This contract can be upgraded, meaning its behavior could completely change after you interact with it. The code you see now may not be the code running tomorrow.',
    descriptionId: 'Kontrak ini bisa di-upgrade, artinya perilakunya bisa berubah total setelah Anda berinteraksi. Kode yang Anda lihat sekarang mungkin bukan kode yang berjalan besok.',
    pattern: /upgradeTo\s*\(|upgradeToAndCall\s*\(|_upgradeTo\s*\(|UUPSUpgradeable|TransparentUpgradeableProxy|BeaconProxy/gi,
  },
  {
    id: 'hardcoded-address',
    type: 'HARDCODED_ADDRESS',
    severity: 'MEDIUM',
    title: 'Hardcoded External Address',
    titleId: 'Alamat Eksternal Hardcoded',
    description: 'Funds may be routed to a specific fixed address. Verify this address is legitimate before interacting.',
    descriptionId: 'Dana mungkin diarahkan ke alamat tetap tertentu. Verifikasi alamat ini sah sebelum berinteraksi.',
    pattern: /address\s*\(\s*0x[a-fA-F0-9]{40}\s*\)/gi,
  },
  {
    id: 'reentrancy-risk',
    type: 'REENTRANCY_RISK',
    severity: 'HIGH',
    title: 'Potential Reentrancy Vulnerability',
    titleId: 'Potensi Kerentanan Reentrancy',
    description: 'The contract makes external calls before updating its state. An attacker could exploit this to drain funds through repeated calls.',
    descriptionId: 'Kontrak melakukan panggilan eksternal sebelum memperbarui state. Penyerang bisa mengeksploitasi ini untuk menguras dana melalui panggilan berulang.',
    pattern: /\.call\{value:|\.transfer\(|\.send\(/gi,
    contextCheck: (source, match) => {
      // Check if there's no reentrancy guard
      return !source.includes('nonReentrant') && !source.includes('ReentrancyGuard');
    },
  },
  {
    id: 'tx-origin-auth',
    type: 'TX_ORIGIN_AUTH',
    severity: 'HIGH',
    title: 'tx.origin Authentication',
    titleId: 'Autentikasi tx.origin',
    description: 'Uses tx.origin for authorization, which can be manipulated through phishing attacks. A malicious contract could trick you into authorizing transactions.',
    descriptionId: 'Menggunakan tx.origin untuk otorisasi, yang bisa dimanipulasi melalui serangan phishing. Kontrak jahat bisa menipu Anda untuk mengotorisasi transaksi.',
    pattern: /tx\.origin/gi,
    contextCheck: (source, match) => {
      const idx = match.index || 0;
      const line = source.slice(Math.max(0, idx - 50), idx + 50);
      return line.includes('require') || line.includes('==') || line.includes('!=');
    },
  },
  {
    id: 'missing-events',
    type: 'MISSING_EVENTS',
    severity: 'LOW',
    title: 'Missing Event Emissions',
    titleId: 'Tidak Ada Emisi Event',
    description: 'Important state changes may not emit events, making it harder to track what the contract does on-chain.',
    descriptionId: 'Perubahan state penting mungkin tidak mengeluarkan event, mempersulit pelacakan apa yang dilakukan kontrak di on-chain.',
    pattern: /function\s+set\w+\s*\([^)]*\)[^}]*\{[^}]*\}/gi,
    contextCheck: (source, match) => {
      const fnBody = match[0];
      return !fnBody.includes('emit ');
    },
  },
  {
    id: 'no-renounce',
    type: 'NO_RENOUNCE_OWNERSHIP',
    severity: 'LOW',
    title: 'Ownership Cannot Be Renounced',
    titleId: 'Kepemilikan Tidak Bisa Dilepas',
    description: 'The contract uses ownership controls but may not include the ability to renounce ownership, meaning one address always has special privileges.',
    descriptionId: 'Kontrak menggunakan kontrol kepemilikan tapi mungkin tidak menyertakan kemampuan untuk melepas kepemilikan, artinya satu alamat selalu punya hak istimewa.',
    pattern: /Ownable|onlyOwner/gi,
    contextCheck: (source) => {
      return !source.includes('renounceOwnership');
    },
  },
  {
    id: 'unprotected-initialize',
    type: 'UNPROTECTED_INITIALIZE',
    severity: 'CRITICAL',
    title: 'Unprotected Initializer',
    titleId: 'Initializer Tidak Terlindungi',
    description: 'The initialize function may be callable by anyone, allowing an attacker to take control of the contract.',
    descriptionId: 'Fungsi initialize mungkin bisa dipanggil siapa saja, memungkinkan penyerang mengambil alih kontrol kontrak.',
    pattern: /function\s+initialize\s*\(/gi,
    contextCheck: (source) => {
      return !source.includes('initializer') && !source.includes('Initializable');
    },
  },
];

// --- Run Static Analysis ---

export function detectRiskPatterns(
  sourceCode: string,
  language: 'id' | 'en' = 'en'
): RiskItem[] {
  const risks: RiskItem[] = [];

  for (const rule of RISK_PATTERNS) {
    const regex = new RegExp(rule.pattern.source, rule.pattern.flags);
    const matches = [...sourceCode.matchAll(regex)];

    if (matches.length === 0) continue;

    // If there's a context check, validate at least one match passes
    let validMatch = true;
    if (rule.contextCheck) {
      validMatch = matches.some((match) => rule.contextCheck!(sourceCode, match));
    }

    if (validMatch) {
      risks.push({
        id: rule.id,
        type: rule.type,
        severity: rule.severity,
        title: language === 'id' ? rule.titleId : rule.title,
        description: language === 'id' ? rule.descriptionId : rule.description,
        location: matches[0]?.index
          ? `Character ${matches[0].index}`
          : undefined,
      });
    }
  }

  return risks;
}

// --- Calculate Overall Risk Level ---

export function calculateOverallRisk(risks: RiskItem[]): import('./types').RiskLevel {
  if (risks.some((r) => r.severity === 'CRITICAL')) return 'CRITICAL';
  if (risks.some((r) => r.severity === 'HIGH')) return 'HIGH';
  if (risks.some((r) => r.severity === 'MEDIUM')) return 'MEDIUM';
  return 'LOW';
}