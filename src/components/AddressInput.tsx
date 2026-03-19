'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { Search, Loader2, ChevronDown, Globe, Clock, X, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { usePreferencesStore } from '@/lib/store';
import type { AIProvider, Language } from '@/lib/types';

interface ProviderOption {
  id: AIProvider;
  name: string;
  icon: string;
  available: boolean;
}

interface AddressInputProps {
  onAnalyze: (address: string, provider: AIProvider, language: Language) => void;
  isLoading: boolean;
  providers: ProviderOption[];
  // true setelah GET /api/analyze selesai — providers list sudah final dari server
  providersReady: boolean;
}

const EXAMPLE_CONTRACTS = [
  { name: 'USDC (Base)', address: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913' },
  { name: 'Wrapped ETH', address: '0x4200000000000000000000000000000000000006' },
  { name: 'Base Bridge', address: '0x4200000000000000000000000000000000000010' },
];

function formatAddress(addr: string) {
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
}

function formatDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) +
    ' ' + d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
}

export default function AddressInput({ onAnalyze, isLoading, providers, providersReady }: AddressInputProps) {
  const [address, setAddress] = useState('');
  const [showProviders, setShowProviders] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [error, setError] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const historyRef = useRef<HTMLDivElement>(null);

  const {
    provider, language, history, _hasHydrated,
    setProvider, setLanguage, removeHistory, clearHistory,
  } = usePreferencesStore();

  // Guard: hanya fallback provider jika Zustand & API providers sudah siap
  useEffect(() => {
    if (!_hasHydrated || !providersReady) return;
    const isStoredAvailable = providers.find((p) => p.id === provider && p.available);
    if (!isStoredAvailable) {
      const firstAvailable = providers.find((p) => p.available);
      if (firstAvailable) setProvider(firstAvailable.id);
    }
  }, [_hasHydrated, providersReady, providers, provider, setProvider]);

  // Tutup history dropdown saat klik di luar
  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (historyRef.current && !historyRef.current.contains(e.target as Node)) {
        setShowHistory(false);
      }
    }
    if (showHistory) document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, [showHistory]);

  const validate = useCallback((addr: string) => {
    if (!addr) return 'Enter a contract address';
    if (!/^0x[a-fA-F0-9]{40}$/.test(addr)) return 'Invalid address format (must be 0x + 40 hex chars)';
    return '';
  }, []);

  const handleSubmit = () => {
    const err = validate(address);
    if (err) { setError(err); return; }
    setError('');
    setShowHistory(false);
    onAnalyze(address.trim(), provider, language);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !isLoading) handleSubmit();
    if (e.key === 'Escape') setShowHistory(false);
  };

  const handleFocus = () => {
    if (history.length > 0) setShowHistory(true);
  };

  const handleSelectHistory = (addr: string) => {
    setAddress(addr);
    setError('');
    setShowHistory(false);
    inputRef.current?.focus();
  };

  const handleRemoveHistory = (e: React.MouseEvent, addr: string) => {
    e.stopPropagation();
    removeHistory(addr);
    if (history.length <= 1) setShowHistory(false);
  };

  const selectedProvider = providers.find((p) => p.id === provider);

  return (
    <div className="w-full max-w-2xl mx-auto">
      {/* Main input + history dropdown */}
      <div className="relative" ref={historyRef}>
        <div className={cn(
          'flex items-center rounded-2xl border transition-all duration-300',
          'bg-base-slate/60 backdrop-blur-sm',
          error
            ? 'border-risk-critical/50'
            : showHistory
              ? 'border-base-blue/50 glow-blue rounded-b-none border-b-transparent'
              : 'border-base-border/60 focus-within:border-base-blue/50 focus-within:glow-blue',
        )}>
          <div className="pl-4 pr-2">
            <Search className={cn('w-5 h-5 transition-colors', isLoading ? 'text-base-blue' : 'text-base-muted')} />
          </div>
          <input
            ref={inputRef}
            type="text"
            value={address}
            onChange={(e) => { setAddress(e.target.value); setError(''); }}
            onKeyDown={handleKeyDown}
            onFocus={handleFocus}
            placeholder="Paste Base contract address (0x...)"
            disabled={isLoading}
            className={cn(
              'flex-1 bg-transparent py-4 pr-2 text-sm sm:text-base font-mono',
              'text-white placeholder:text-base-muted/60',
              'focus:outline-none disabled:opacity-50',
            )}
            spellCheck={false}
            autoComplete="off"
          />
          <button
            onClick={handleSubmit}
            disabled={isLoading || !address}
            className={cn(
              'mr-2 px-5 py-2.5 rounded-xl font-display font-semibold text-sm transition-all duration-200',
              'bg-base-blue text-white',
              'hover:bg-blue-600 active:scale-95',
              'disabled:opacity-40 disabled:cursor-not-allowed disabled:active:scale-100',
            )}
          >
            {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Analyze'}
          </button>
        </div>

        {error && (
          <p className="mt-2 ml-4 text-xs text-risk-critical font-mono">{error}</p>
        )}

        {/* History dropdown */}
        {showHistory && history.length > 0 && (
          <div className={cn(
            'absolute left-0 right-0 z-30',
            'bg-base-slate/95 backdrop-blur-sm',
            'border border-base-blue/50 border-t-0',
            'rounded-b-2xl shadow-2xl overflow-hidden',
          )}>
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-2 border-b border-base-border/30">
              <div className="flex items-center gap-1.5">
                <Clock className="w-3 h-3 text-base-muted" />
                <span className="text-[11px] font-mono text-base-muted">Recent scans</span>
              </div>
              <button
                onClick={() => { clearHistory(); setShowHistory(false); }}
                className="flex items-center gap-1 text-[10px] font-mono text-base-muted/60 hover:text-risk-critical transition-colors px-1.5 py-0.5 rounded"
              >
                <Trash2 className="w-3 h-3" />
                Clear all
              </button>
            </div>

            {/* History items */}
            <div className="max-h-60 overflow-y-auto">
              {history.map((entry) => (
                <button
                  key={entry.address}
                  onClick={() => handleSelectHistory(entry.address)}
                  className={cn(
                    'w-full flex items-center gap-3 px-4 py-2.5 text-left',
                    'hover:bg-base-blue/8 transition-colors group',
                    address.toLowerCase() === entry.address.toLowerCase() && 'bg-base-blue/10',
                  )}
                >
                  {/* Icon */}
                  <div className="w-6 h-6 rounded-full bg-base-blue/10 flex items-center justify-center flex-shrink-0">
                    <Clock className="w-3 h-3 text-base-blue/60" />
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-medium text-base-text truncate">
                      {entry.contractName}
                    </div>
                    <div className="text-[10px] font-mono text-base-muted/60 mt-0.5">
                      {formatAddress(entry.address)}
                      <span className="mx-1.5 opacity-40">·</span>
                      {formatDate(entry.scannedAt)}
                    </div>
                  </div>

                  {/* Delete button */}
                  <button
                    onClick={(e) => handleRemoveHistory(e, entry.address)}
                    className={cn(
                      'p-1 rounded opacity-0 group-hover:opacity-100 transition-opacity',
                      'text-base-muted/40 hover:text-risk-critical hover:bg-risk-critical/10',
                    )}
                    title="Remove from history"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Controls row */}
      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 px-1">
        {/* Provider selector */}
        <div className="relative">
          <button
            onClick={() => setShowProviders(!showProviders)}
            className={cn(
              'flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-mono',
              'bg-base-slate/40 border border-base-border/40',
              'hover:border-base-border transition-colors',
            )}
          >
            <span>{selectedProvider?.icon}</span>
            <span className="text-base-text/80">{selectedProvider?.name || 'Select AI'}</span>
            <ChevronDown className="w-3 h-3 text-base-muted" />
          </button>

          {showProviders && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setShowProviders(false)} />
              <div className="absolute top-full mt-1 left-0 z-20 w-56 bg-base-slate border border-base-border rounded-xl shadow-2xl overflow-hidden">
                {providers.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => { if (p.available) { setProvider(p.id); setShowProviders(false); } }}
                    disabled={!p.available}
                    className={cn(
                      'w-full flex items-center gap-2.5 px-4 py-3 text-left text-xs transition-colors',
                      p.available
                        ? 'hover:bg-base-blue/10 text-base-text'
                        : 'opacity-30 cursor-not-allowed text-base-muted',
                      provider === p.id && p.available && 'bg-base-blue/10 text-base-blue',
                    )}
                  >
                    <span className="text-base">{p.icon}</span>
                    <div>
                      <div className="font-medium">{p.name}</div>
                      {!p.available && <div className="text-[10px] text-base-muted mt-0.5">API key not configured</div>}
                    </div>
                  </button>
                ))}
              </div>
            </>
          )}
        </div>

        {/* Language toggle */}
        <button
          onClick={() => setLanguage(language === 'en' ? 'id' : 'en')}
          className={cn(
            'flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-mono',
            'bg-base-slate/40 border border-base-border/40',
            'hover:border-base-border transition-colors',
          )}
        >
          <Globe className="w-3.5 h-3.5 text-base-muted" />
          <span className="text-base-text/80">
            {language === 'en' ? 'English' : 'Bahasa Indonesia'}
          </span>
        </button>
      </div>

      {/* Example contracts */}
      <div className="mt-5 flex flex-wrap items-center gap-2 px-1">
        <span className="text-[11px] text-base-muted/60 font-mono">Try:</span>
        {EXAMPLE_CONTRACTS.map((ex) => (
          <button
            key={ex.address}
            onClick={() => { setAddress(ex.address); setError(''); setShowHistory(false); }}
            disabled={isLoading}
            className={cn(
              'text-[11px] font-mono px-2.5 py-1 rounded-md',
              'text-base-muted/80 bg-base-slate/30 border border-base-border/30',
              'hover:text-base-blue hover:border-base-blue/30 transition-colors',
              'disabled:opacity-50',
            )}
          >
            {ex.name}
          </button>
        ))}
      </div>
    </div>
  );
}
