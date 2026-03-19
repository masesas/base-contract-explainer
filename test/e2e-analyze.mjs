/**
 * E2E Test: AI Contract Analysis
 *
 * Tests the full analyzeContract pipeline untuk memverifikasi:
 * 1. Response tidak terpotong (no "Unterminated string" JSON error)
 * 2. JSON valid dan complete
 * 3. Semua required fields ada
 *
 * Usage:
 *   node test/e2e-analyze.mjs [provider] [address]
 *   node test/e2e-analyze.mjs google 0x71F61b3BbD07c26655c8CdD09E577AC625479BA3
 *   node test/e2e-analyze.mjs anthropic 0x71F61b3BbD07c26655c8CdD09E577AC625479BA3
 */

import { readFileSync } from 'fs';
import { createRequire } from 'module';

// ─── Load .env.local ────────────────────────────────────────────────────────
const envPath = new URL('../.env.local', import.meta.url).pathname;
const envLines = readFileSync(envPath, 'utf8').split('\n');
for (const line of envLines) {
  const [key, ...rest] = line.split('=');
  if (key && rest.length) process.env[key.trim()] = rest.join('=').trim();
}

const require = createRequire(import.meta.url);

// ─── Config ─────────────────────────────────────────────────────────────────
const CONTRACT_ADDRESS = process.argv[3] || '0x71F61b3BbD07c26655c8CdD09E577AC625479BA3';
const PROVIDER        = process.argv[2] || 'google';
const LANGUAGE        = 'en';
const ETHERSCAN_KEY   = process.env.ETHERSCAN_API_KEY || process.env.BASESCAN_API_KEY;

// ANSI colors
const c = {
  reset: '\x1b[0m', bold: '\x1b[1m',
  green: '\x1b[32m', red: '\x1b[31m', yellow: '\x1b[33m',
  cyan: '\x1b[36m', gray: '\x1b[90m', blue: '\x1b[34m',
};

function pass(msg)  { console.log(`  ${c.green}✓${c.reset} ${msg}`); }
function fail(msg)  { console.log(`  ${c.red}✗${c.reset} ${c.red}${msg}${c.reset}`); }
function warn(msg)  { console.log(`  ${c.yellow}⚠${c.reset} ${msg}`); }
function info(msg)  { console.log(`  ${c.gray}→${c.reset} ${msg}`); }
function header(msg){ console.log(`\n${c.bold}${c.blue}${msg}${c.reset}`); }

// ─── Step 1: Fetch Contract Source ──────────────────────────────────────────
async function fetchSource(address) {
  const url = `https://api.etherscan.io/v2/api?chainid=8453&module=contract&action=getsourcecode&address=${address}&apikey=${ETHERSCAN_KEY}`;
  const res  = await fetch(url);
  const data = await res.json();

  if (data.status !== '1' || !data.result?.length) {
    throw new Error(`Etherscan error: ${data.message}`);
  }

  const r = data.result[0];
  if (!r.SourceCode || r.ABI === 'Contract source code not verified') {
    throw new Error('Contract not verified on BaseScan');
  }

  // Combine multi-file source
  let sourceCode = r.SourceCode;
  if (sourceCode.startsWith('{{') || sourceCode.startsWith('{')) {
    try {
      const cleaned = sourceCode.startsWith('{{') ? sourceCode.slice(1, -1) : sourceCode;
      const parsed  = JSON.parse(cleaned);
      if (parsed.sources) {
        sourceCode = Object.entries(parsed.sources)
          .map(([f, v]) => `// === File: ${f} ===\n${v.content || v}`)
          .join('\n\n');
      }
    } catch {}
  }

  return { sourceCode, contractName: r.ContractName };
}

// ─── Step 2: Sanitize (mirrors ai-provider.ts) ──────────────────────────────
function sanitizeSource(source) {
  const MAX = 60000;
  const s = source
    .replace(/```/g, '')
    .replace(/\[INST\]/gi, '')
    .replace(/\[\/INST\]/gi, '')
    .replace(/<\|im_start\|>/gi, '')
    .replace(/<\|im_end\|>/gi, '')
    .replace(/<\|system\|>/gi, '')
    .replace(/<\|user\|>/gi, '')
    .replace(/<\|assistant\|>/gi, '')
    .replace(/Human:/gi, '')
    .replace(/Assistant:/gi, '');
  return s.length > MAX ? s.slice(0, MAX) + '\n// ... [truncated for analysis]' : s;
}

// ─── Step 3: Call AI (mirrors analyzeContract) ───────────────────────────────
async function callAI(sourceCode, contractName) {
  const { createGoogleGenerativeAI }   = require('@ai-sdk/google');
  const { createAnthropic }            = require('@ai-sdk/anthropic');
  const { generateText }               = require('ai');

  let model;
  if (PROVIDER === 'google') {
    const g = createGoogleGenerativeAI({ apiKey: process.env.GOOGLE_GENERATIVE_AI_API_KEY });
    model = g('gemini-2.5-flash');
  } else if (PROVIDER === 'anthropic') {
    const a = createAnthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
    model = a('claude-sonnet-4-20250514');
  } else {
    throw new Error(`Unknown provider: ${PROVIDER}`);
  }

  const systemPrompt = `You are an expert smart contract security analyst specializing in the Base network (Ethereum L2).
Your job is to explain smart contracts to NON-TECHNICAL users in English.

OUTPUT FORMAT: Respond ONLY with a valid JSON object (no markdown fences, no preamble) matching this exact schema:
{
  "summary": "A 2-4 sentence plain-language overview",
  "overallRisk": "CRITICAL" | "HIGH" | "MEDIUM" | "LOW",
  "risks": [{ "type": "string", "severity": "string", "title": "string", "description": "string" }],
  "functions": [{ "name": "string", "signature": "string", "visibility": "string", "mutability": "string", "description": "string", "riskNote": null, "parameters": [] }]
}`;

  const sanitized = sanitizeSource(sourceCode);

  const startAt = Date.now();
  const { text } = await generateText({
    model,
    system: systemPrompt,
    prompt: `Analyze contract "${contractName}":\n\n${sanitized}`,
    maxOutputTokens: 16384,  // fix: dinaikkan dari 4096 agar JSON tidak terpotong
    temperature: 0.1,
  });
  const elapsed = Date.now() - startAt;

  return { text, elapsed, sanitizedLength: sanitized.length };
}

// ─── Step 4: Parse JSON (mirrors ai-provider.ts) ─────────────────────────────
function parseJSON(text) {
  const cleaned = text
    .replace(/```json\s*/g, '')
    .replace(/```\s*/g, '')
    .trim();

  try {
    return { result: JSON.parse(cleaned), raw: cleaned, error: null };
  } catch (e1) {
    const match = cleaned.match(/\{[\s\S]*\}/);
    if (match) {
      try {
        return { result: JSON.parse(match[0]), raw: match[0], error: null };
      } catch (e2) {
        return { result: null, raw: cleaned, error: e2 };
      }
    }
    return { result: null, raw: cleaned, error: e1 };
  }
}

// ─── Main Test Runner ────────────────────────────────────────────────────────
async function run() {
  console.log(`\n${c.bold}═══════════════════════════════════════════════════`);
  console.log(`  E2E Test: AI Contract Analysis`);
  console.log(`═══════════════════════════════════════════════════${c.reset}`);
  info(`Contract : ${CONTRACT_ADDRESS}`);
  info(`Provider : ${c.cyan}${PROVIDER}${c.reset}`);
  info(`Language : ${LANGUAGE}`);

  let passed = 0, failed = 0;

  // ── STEP 1: Fetch source ─────────────────────────────────────────────────
  header('STEP 1 — Fetch Contract Source');
  let sourceCode, contractName;
  try {
    ({ sourceCode, contractName } = await fetchSource(CONTRACT_ADDRESS));
    pass(`Fetched: ${c.cyan}${contractName}${c.reset}`);
    info(`Raw source: ${sourceCode.length.toLocaleString()} chars`);
    passed++;
  } catch (e) {
    fail(`Fetch failed: ${e.message}`); failed++;
    console.log(`\n${c.red}Cannot continue without source.${c.reset}\n`);
    process.exit(1);
  }

  // ── STEP 2: Sanitize ─────────────────────────────────────────────────────
  header('STEP 2 — Sanitize Source');
  const sanitized = sanitizeSource(sourceCode);
  const wasTruncated = sanitized.includes('[truncated for analysis]');
  info(`After sanitize: ${sanitized.length.toLocaleString()} chars (~${Math.round(sanitized.length/4).toLocaleString()} tokens)`);
  if (wasTruncated) {
    warn(`Source TRUNCATED at 60,000 chars (original: ${sourceCode.length.toLocaleString()})`);
  } else {
    pass('Source within limit (no truncation)');
  }
  passed++;

  // ── STEP 3: Call AI ───────────────────────────────────────────────────────
  header(`STEP 3 — AI Analysis (${PROVIDER} / maxOutputTokens: 16384)`);
  let rawText, elapsed;
  try {
    info('Calling AI... (may take 30-60s)');
    ({ text: rawText, elapsed } = await callAI(sourceCode, contractName));
    pass(`AI responded in ${(elapsed/1000).toFixed(1)}s`);
    info(`Raw response: ${rawText.length.toLocaleString()} chars`);

    // Check if response ends abruptly (sign of truncation)
    // Valid endings: "}" bare JSON, atau "```" markdown fence setelah closing brace
    const trimmed = rawText.trim();
    const endsCorrectly = trimmed.endsWith('}') || trimmed.endsWith('```');
    if (endsCorrectly) {
      pass('Response ends correctly (not truncated mid-JSON)');
    } else {
      fail(`Response TRUNCATED — ends with: "${trimmed.slice(-30).replace(/\n/g, '\\n')}"`);
      info(`Last 100 chars: ${trimmed.slice(-100)}`);
      failed++;
    }
    passed++;
  } catch (e) {
    fail(`AI call failed: ${e.message}`);
    failed++;
    console.log(`\n${c.red}Cannot continue without AI response.${c.reset}\n`);
    process.exit(1);
  }

  // ── STEP 4: Parse JSON ────────────────────────────────────────────────────
  header('STEP 4 — JSON Parsing');
  const { result, raw, error } = parseJSON(rawText);

  if (!error && result) {
    pass('JSON.parse() succeeded');
    passed++;
  } else {
    fail(`JSON.parse() FAILED: ${error?.message}`);
    // Pinpoint error location
    if (error?.message) {
      const posMatch = error.message.match(/position (\d+)/);
      if (posMatch) {
        const pos = parseInt(posMatch[1]);
        const around = raw.slice(Math.max(0, pos - 40), pos + 40);
        info(`Around position ${pos}: ...${JSON.stringify(around)}...`);
      }
    }
    info(`Raw cleaned length: ${raw.length} chars`);
    info(`Raw end: "${raw.slice(-80).replace(/\n/g,'\\n')}"`);
    failed++;
  }

  // ── STEP 5: Validate structure ────────────────────────────────────────────
  header('STEP 5 — Response Structure Validation');
  if (result) {
    const checks = [
      ['summary',     typeof result.summary === 'string' && result.summary.length > 0],
      ['overallRisk', ['CRITICAL','HIGH','MEDIUM','LOW'].includes(result.overallRisk)],
      ['risks[]',     Array.isArray(result.risks)],
      ['functions[]', Array.isArray(result.functions)],
    ];
    for (const [field, ok] of checks) {
      if (ok) { pass(`Field "${field}" present and valid`); passed++; }
      else     { fail(`Field "${field}" missing or invalid`); failed++; }
    }
    info(`Functions count: ${result.functions?.length ?? 0}`);
    info(`Risks count:     ${result.risks?.length ?? 0}`);
  } else {
    warn('Skipping structure validation (JSON parse failed)');
  }

  // ── Summary ───────────────────────────────────────────────────────────────
  console.log(`\n${c.bold}═══════════════════════════════════════════════════${c.reset}`);
  const total = passed + failed;
  if (failed === 0) {
    console.log(`${c.green}${c.bold}  ALL TESTS PASSED (${passed}/${total})${c.reset}`);
  } else {
    console.log(`${c.red}${c.bold}  ${failed} TEST(S) FAILED — ${passed}/${total} passed${c.reset}`);
  }
  console.log(`${c.bold}═══════════════════════════════════════════════════${c.reset}\n`);

  process.exit(failed > 0 ? 1 : 0);
}

run().catch(e => {
  console.error(`\n${c.red}Unhandled error: ${e.message}${c.reset}`);
  process.exit(1);
});
