'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import Header from '@/components/Header';
import AddressInput from '@/components/AddressInput';
import ContractSummary from '@/components/ContractSummary';
import RiskPanel from '@/components/RiskPanel';
import FunctionList from '@/components/FunctionList';
import LoadingState from '@/components/LoadingState';
import ErrorDisplay from '@/components/ErrorDisplay';
import Footer from '@/components/Footer';
import { usePreferencesStore } from '@/lib/store';
import type { AIProvider, Language, AnalyzeResponse, APIError } from '@/lib/types';

interface ProviderOption {
  id: AIProvider;
  name: string;
  icon: string;
  available: boolean;
}

export default function HomePage() {
  const addHistory = usePreferencesStore((s) => s.addHistory);
  const [providers, setProviders] = useState<ProviderOption[]>([
    { id: 'anthropic', name: 'Claude (Anthropic)', icon: '🟣', available: true },
    { id: 'openai', name: 'GPT-4o (OpenAI)', icon: '🟢', available: false },
    { id: 'google', name: 'Gemini Pro (Google)', icon: '🔵', available: false },
  ]);
  // providersReady: true setelah API /api/analyze selesai (atau gagal)
  // Dipakai AddressInput agar fallback provider tidak jalan pakai default list
  const [providersReady, setProvidersReady] = useState(false);
  const [result, setResult] = useState<AnalyzeResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingStep, setLoadingStep] = useState(0);
  const [error, setError] = useState<{ message: string; code?: string; address?: string } | null>(null);
  const stepInterval = useRef<NodeJS.Timeout | null>(null);

  // Fetch available providers on mount
  useEffect(() => {
    fetch('/api/analyze')
      .then((res) => res.json())
      .then((data) => {
        if (data.providers) {
          setProviders(data.providers);
        }
      })
      .catch(() => {
        // Silently fail, use defaults
      })
      .finally(() => {
        setProvidersReady(true);
      });
  }, []);

  const handleAnalyze = useCallback(async (address: string, provider: AIProvider, language: Language) => {
    setLoading(true);
    setLoadingStep(0);
    setError(null);
    setResult(null);

    // Animate loading steps
    let step = 0;
    stepInterval.current = setInterval(() => {
      step = Math.min(step + 1, 4);
      setLoadingStep(step);
    }, 3000);

    try {
      const response = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ address, provider, language }),
      });

      const data = await response.json();

      if (!response.ok) {
        const apiError = data as APIError;
        setError({
          message: apiError.error || 'Analysis failed',
          code: apiError.code,
          address,
        });
        return;
      }

      const analyzed = data as AnalyzeResponse;
      setResult(analyzed);
      // Simpan ke history setelah analisis berhasil
      addHistory({
        address,
        contractName: analyzed.contract?.name || address,
        scannedAt: new Date().toISOString(),
      });
    } catch (err: any) {
      setError({
        message: err.message || 'Network error. Please check your connection.',
        address,
      });
    } finally {
      setLoading(false);
      if (stepInterval.current) clearInterval(stepInterval.current);
    }
  }, [addHistory]);

  const handleRetry = useCallback(() => {
    setError(null);
    setResult(null);
  }, []);

  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      <main className="flex-1 max-w-5xl mx-auto w-full px-4 sm:px-6 py-8 sm:py-12">
        {/* Hero section */}
        {!result && !loading && !error && (
          <div className="text-center mb-10 animate-fade-in">
            <div className="inline-flex items-center gap-2 text-[11px] font-mono text-base-blue bg-base-blue/5 border border-base-blue/15 rounded-full px-4 py-1.5 mb-6">
              <span className="w-1.5 h-1.5 rounded-full bg-base-blue animate-pulse" />
              Smart Contract Security for Everyone
            </div>
            <h1 className="font-display font-extrabold text-3xl sm:text-5xl text-white leading-tight mb-4 tracking-tight">
              Understand contracts
              <br />
              <span className="text-base-blue">before</span> you interact
            </h1>
            <p className="text-base-muted text-sm sm:text-base max-w-lg mx-auto leading-relaxed">
              Paste any verified Base contract address. Our AI explains every function,
              detects risks, and translates code into plain language.
            </p>
          </div>
        )}

        {/* Input - always visible when not showing results */}
        {!result && !loading && (
          <AddressInput
            onAnalyze={handleAnalyze}
            isLoading={loading}
            providers={providers}
            providersReady={providersReady}
          />
        )}

        {/* Loading */}
        {loading && <LoadingState step={loadingStep} />}

        {/* Error */}
        {error && (
          <ErrorDisplay
            error={error.message}
            code={error.code}
            address={error.address}
            onRetry={handleRetry}
          />
        )}

        {/* Results */}
        {result && (
          <div className="space-y-6">
            {/* Back button */}
            <button
              onClick={() => { setResult(null); setError(null); }}
              className="text-xs font-mono text-base-muted hover:text-base-blue transition-colors mb-2"
            >
              ← Analyze another contract
            </button>

            <ContractSummary
              contract={result.contract}
              summary={result.summary}
              provider={result.provider}
            />

            <RiskPanel
              riskLevel={result.riskLevel}
              risks={result.risks}
            />

            {result.functions.length > 0 && (
              <FunctionList functions={result.functions} />
            )}

            {/* Timestamp */}
            <div className="text-center pt-4">
              <span className="text-[10px] font-mono text-base-muted/40">
                Analyzed at {new Date(result.analyzedAt).toLocaleString()} · {result.provider}
              </span>
            </div>
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
}