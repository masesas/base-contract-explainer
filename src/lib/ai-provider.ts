// ===========================================
// AI Provider - Flexible Multi-Agent System
// ===========================================
// Supports: Anthropic (Claude), OpenAI (GPT-4), Google (Gemini)
// Uses Vercel AI SDK for unified interface

import { generateText } from 'ai';
import { createAnthropic } from '@ai-sdk/anthropic';
import { createOpenAI } from '@ai-sdk/openai';
import { createGoogleGenerativeAI } from '@ai-sdk/google';
import type { AIProvider, AIAnalysisResult, Language, ProviderConfig } from './types';

// --- Provider Registry ---

const PROVIDER_MODELS: Record<AIProvider, string> = {
  anthropic: 'claude-sonnet-4-20250514',
  openai: 'gpt-4o',
  google: 'gemini-2.5-flash',
};

function getProviderInstance(provider: AIProvider) {
  switch (provider) {
    case 'anthropic': {
      const anthropic = createAnthropic({
        apiKey: process.env.ANTHROPIC_API_KEY,
      });
      return anthropic(PROVIDER_MODELS.anthropic);
    }
    case 'openai': {
      const openai = createOpenAI({
        apiKey: process.env.OPENAI_API_KEY,
      });
      return openai(PROVIDER_MODELS.openai);
    }
    case 'google': {
      const google = createGoogleGenerativeAI({
        apiKey: process.env.GOOGLE_GENERATIVE_AI_API_KEY,
      });
      return google(PROVIDER_MODELS.google);
    }
    default:
      throw new Error(`Unsupported AI provider: ${provider}`);
  }
}

// --- Check Provider Availability ---

export function getAvailableProviders(): ProviderConfig[] {
  return [
    {
      id: 'anthropic',
      name: 'Claude (Anthropic)',
      model: PROVIDER_MODELS.anthropic,
      available: !!process.env.ANTHROPIC_API_KEY,
      icon: '🟣',
    },
    {
      id: 'openai',
      name: 'GPT-4o (OpenAI)',
      model: PROVIDER_MODELS.openai,
      available: !!process.env.OPENAI_API_KEY,
      icon: '🟢',
    },
    {
      id: 'google',
      name: 'Gemini Pro (Google)',
      model: PROVIDER_MODELS.google,
      available: !!process.env.GOOGLE_GENERATIVE_AI_API_KEY,
      icon: '🔵',
    },
  ];
}

export function getDefaultProvider(): AIProvider {
  if (process.env.ANTHROPIC_API_KEY) return 'anthropic';
  if (process.env.OPENAI_API_KEY) return 'openai';
  if (process.env.GOOGLE_GENERATIVE_AI_API_KEY) return 'google';
  throw new Error('No AI provider API key configured. Set at least one: ANTHROPIC_API_KEY, OPENAI_API_KEY, or GOOGLE_GENERATIVE_AI_API_KEY');
}

// --- System Prompt ---

function buildSystemPrompt(language: Language): string {
  const lang = language === 'id' ? 'Bahasa Indonesia' : 'English';

  return `You are an expert smart contract security analyst specializing in the Base network (Ethereum L2).
Your job is to explain smart contracts to NON-TECHNICAL users in ${lang}.

CRITICAL RULES:
1. Use simple, everyday language. Avoid jargon — if you must use a technical term, explain it immediately.
2. Explain EVERY public/external function in 1-2 sentences using real-world analogies.
3. Identify ALL security risks honestly and clearly.
4. Use analogies from everyday life (bank accounts, keys, locks, vending machines, etc.)
5. NEVER say a contract is "safe" — say "no known dangerous patterns were detected" if applicable.
6. Be honest about limitations of static analysis.
7. For risks, explain what could go wrong in practical terms the user would understand.
8. All explanations must be in ${lang}.

OUTPUT FORMAT: Respond ONLY with a valid JSON object (no markdown fences, no preamble) matching this exact schema:
{
  "summary": "A 2-4 sentence plain-language overview of what this contract does",
  "overallRisk": "CRITICAL" | "HIGH" | "MEDIUM" | "LOW",
  "risks": [
    {
      "type": "RISK_TYPE_ID",
      "severity": "CRITICAL" | "HIGH" | "MEDIUM" | "LOW" | "INFO",
      "title": "Short risk title",
      "description": "Plain-language explanation of the risk and its real-world impact",
      "location": "functionName or general area"
    }
  ],
  "functions": [
    {
      "name": "functionName",
      "signature": "function signature",
      "visibility": "public" | "external" | "internal" | "private",
      "mutability": "pure" | "view" | "payable" | "nonpayable",
      "description": "What this function does in plain language",
      "riskNote": "Any risk associated, or null",
      "parameters": [
        {
          "name": "param name",
          "type": "param solidity type",
          "description": "what this parameter represents"
        }
      ]
    }
  ]
}`;
}

// --- Sanitize Contract Source (prevent prompt injection) ---

function sanitizeSource(source: string): string {
  // Remove potential prompt injection markers
  const sanitized = source
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

  // Truncate very long contracts to stay within context limits
  const MAX_SOURCE_CHARS = 60000;
  if (sanitized.length > MAX_SOURCE_CHARS) {
    return sanitized.slice(0, MAX_SOURCE_CHARS) + '\n// ... [truncated for analysis]';
  }

  return sanitized;
}

// --- Main Analysis Function ---

export async function analyzeContract(
  sourceCode: string,
  contractName: string,
  language: Language,
  provider: AIProvider
): Promise<AIAnalysisResult> {
  const model = getProviderInstance(provider);
  const systemPrompt = buildSystemPrompt(language);
  const sanitizedSource = sanitizeSource(sourceCode);

  const userPrompt = `Analyze this Solidity smart contract deployed on Base network.

Contract Name: ${contractName}

Source Code:
${sanitizedSource}

Provide your analysis as the specified JSON format. Remember: explain for non-technical users in ${language === 'id' ? 'Bahasa Indonesia' : 'English'}.`;

  const { text } = await generateText({
    model,
    system: systemPrompt,
    prompt: userPrompt,
    maxOutputTokens: 16384, // ai@6: renamed dari maxTokens. Large contracts butuh ini agar JSON tidak terpotong
    temperature: 0.1, // Low temp for consistent analysis
  });

  console.log("generated text", text);
  

  // Parse the JSON response
  const cleaned = text
    .replace(/```json\s*/g, '')
    .replace(/```\s*/g, '')
    .trim();

  try {
    const result: AIAnalysisResult = JSON.parse(cleaned);
    return result;
  } catch (parseError) {
    // If JSON parsing fails, try to extract JSON from the response
    const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
    throw new Error(`Failed to parse AI response as JSON: ${parseError}`);
  }
}