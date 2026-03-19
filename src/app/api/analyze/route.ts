// ===========================================
// POST /api/analyze - Contract Analysis Endpoint
// ===========================================

import { NextRequest, NextResponse } from 'next/server';
import { isValidAddress } from '@/lib/utils';
import { fetchContractSource, fetchEnrichedContractData } from '@/lib/basescan';
import { getContractOnChainInfo } from '@/lib/base-rpc';
import { analyzeContract, getAvailableProviders, getDefaultProvider } from '@/lib/ai-provider';
import { detectRiskPatterns, calculateOverallRisk } from '@/lib/risk-patterns';
import { checkRateLimit } from '@/lib/rate-limit';
import type { AnalyzeRequest, AnalyzeResponse, AIProvider, Language, ContractMetadata, RiskItem } from '@/lib/types';

export const maxDuration = 60; // Allow up to 60s for AI analysis

export async function POST(request: NextRequest) {
  try {
    // --- Rate Limiting ---
    const ip = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown';
    const rateLimit = checkRateLimit(ip);

    if (!rateLimit.allowed) {
      return NextResponse.json(
        {
          error: 'Rate limit exceeded',
          code: 'RATE_LIMITED',
          details: `Try again in ${Math.ceil((rateLimit.resetAt - Date.now()) / 1000)} seconds`,
        },
        {
          status: 429,
          headers: {
            'X-RateLimit-Limit': String(rateLimit.limit),
            'X-RateLimit-Remaining': '0',
            'X-RateLimit-Reset': String(Math.ceil(rateLimit.resetAt / 1000)),
          },
        }
      );
    }

    // --- Parse & Validate Request ---
    const body: AnalyzeRequest = await request.json();
    const { address, language = 'en', provider: requestedProvider } = body;

    if (!address || !isValidAddress(address)) {
      return NextResponse.json(
        { error: 'Invalid contract address', code: 'INVALID_ADDRESS' },
        { status: 400 }
      );
    }

    // --- Resolve AI Provider ---
    const availableProviders = getAvailableProviders();
    let provider: AIProvider;

    if (requestedProvider) {
      const providerConfig = availableProviders.find(
        (p) => p.id === requestedProvider && p.available
      );
      if (!providerConfig) {
        return NextResponse.json(
          {
            error: `Provider '${requestedProvider}' is not available. Available: ${availableProviders.filter(p => p.available).map(p => p.id).join(', ')}`,
            code: 'PROVIDER_UNAVAILABLE',
          },
          { status: 400 }
        );
      }
      provider = requestedProvider;
    } else {
      provider = getDefaultProvider();
    }

    // --- Fetch On-Chain Data + Enriched Data (paralel) ---
    const [onChainInfo, enrichedData] = await Promise.all([
      getContractOnChainInfo(address),
      fetchEnrichedContractData(address),
    ]);

    if (!onChainInfo.isContract) {
      return NextResponse.json(
        { error: 'Address is not a contract (EOA or empty)', code: 'NOT_CONTRACT' },
        { status: 400 }
      );
    }

    // --- Fetch Verified Source Code ---
    const contractSource = await fetchContractSource(address);
    
    if (!contractSource) {
      return NextResponse.json(
        {
          error: 'Contract source code is not verified on BaseScan. Only verified contracts can be analyzed.',
          code: 'NOT_VERIFIED',
        },
        { status: 404 }
      );
    }

    // --- Static Risk Detection (fast, rule-based) ---
    const staticRisks = detectRiskPatterns(contractSource.sourceCode, language);

    // --- AI Analysis ---
    const aiResult = await analyzeContract(
      contractSource.sourceCode,
      contractSource.contractName,
      language as Language,
      provider
    );

    // --- Merge Risks (static + AI, deduplicated) ---
    const aiRisks: RiskItem[] = (aiResult.risks || []).map((r, idx) => ({
      id: `ai-${idx}`,
      type: (r.type as any) || 'CUSTOM',
      severity: r.severity,
      title: r.title,
      description: r.description,
      location: r.location,
    }));

    // Deduplicate: prefer static risks for same type, add unique AI risks
    const staticTypes = new Set(staticRisks.map((r) => r.type));
    const uniqueAIRisks = aiRisks.filter((r) => !staticTypes.has(r.type));
    const mergedRisks = [...staticRisks, ...uniqueAIRisks];

    // Overall risk from merged set
    const overallRisk = calculateOverallRisk(mergedRisks);

    // --- Build Response ---
    const contractMeta: ContractMetadata = {
      address,
      name: contractSource.contractName,
      verified: true,
      compiler: contractSource.compilerVersion,
      optimization: contractSource.optimizationUsed,
      evmVersion: contractSource.evmVersion,
      license: contractSource.licenseType,
      balanceETH: onChainInfo.balanceETH,
      txCount: onChainInfo.txCount,
      creationDate: enrichedData.creation?.timestamp || null,
      creatorAddress: enrichedData.creation?.creator || null,
      creationTxHash: enrichedData.creation?.txHash || null,
      lastActivityDate: enrichedData.lastActivityDate,
      isProxy: contractSource.proxy,
      implementationAddress: contractSource.implementation || null,
      isToken: enrichedData.isToken,
      tokenSymbol: enrichedData.tokenInfo?.symbol || null,
      tokenType: enrichedData.tokenInfo?.tokenType || null,
    };

    const response: AnalyzeResponse = {
      contract: contractMeta,
      summary: aiResult.summary,
      riskLevel: overallRisk,
      risks: mergedRisks,
      functions: (aiResult.functions || []).map((f) => ({
        name: f.name,
        signature: f.signature,
        visibility: f.visibility as any,
        mutability: f.mutability as any,
        description: f.description,
        riskNote: f.riskNote || null,
        parameters: f.parameters || [],
      })),
      provider,
      analyzedAt: new Date().toISOString(),
    };

    return NextResponse.json(response, {
      headers: {
        'X-RateLimit-Limit': String(rateLimit.limit),
        'X-RateLimit-Remaining': String(rateLimit.remaining),
        'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600',
      },
    });
  } catch (error: any) {
    console.error('Analysis error:', error);

    // Specific error handling
    if (error.message?.includes('API key')) {
      return NextResponse.json(
        { error: 'AI provider configuration error', code: 'CONFIG_ERROR', details: error.message },
        { status: 500 }
      );
    }

    if (error.message?.includes('rate limit') || error.status === 429) {
      return NextResponse.json(
        { error: 'AI provider rate limit reached. Try again shortly.', code: 'PROVIDER_RATE_LIMITED' },
        { status: 429 }
      );
    }

    return NextResponse.json(
      { error: 'Analysis failed', code: 'INTERNAL_ERROR', details: error.message },
      { status: 500 }
    );
  }
}

// --- GET /api/analyze - Return available providers ---

export async function GET() {
  const providers = getAvailableProviders();
  return NextResponse.json({
    providers: providers.map(({ id, name, model, available, icon }) => ({
      id, name, model, available, icon,
    })),
  });
}