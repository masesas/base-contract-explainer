'use client';

import { AlertCircle, RotateCcw, ExternalLink } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ErrorDisplayProps {
  error: string;
  code?: string;
  address?: string;
  onRetry?: () => void;
}

const ERROR_HINTS: Record<string, { title: string; hint: string }> = {
  NOT_CONTRACT: {
    title: 'Not a Smart Contract',
    hint: 'This address is a regular wallet (EOA), not a smart contract. Double-check the address.',
  },
  NOT_VERIFIED: {
    title: 'Unverified Contract',
    hint: 'This contract\'s source code hasn\'t been verified on BaseScan. We can only analyze verified contracts for safety.',
  },
  INVALID_ADDRESS: {
    title: 'Invalid Address',
    hint: 'The address format is incorrect. It should start with 0x followed by 40 hexadecimal characters.',
  },
  RATE_LIMITED: {
    title: 'Too Many Requests',
    hint: 'You\'ve made too many requests. Please wait a moment and try again.',
  },
  PROVIDER_UNAVAILABLE: {
    title: 'AI Provider Unavailable',
    hint: 'The selected AI provider is not configured. Try a different provider.',
  },
  PROVIDER_RATE_LIMITED: {
    title: 'AI Rate Limited',
    hint: 'The AI provider is temporarily rate limited. Wait a moment and try again.',
  },
  CONFIG_ERROR: {
    title: 'Configuration Error',
    hint: 'There\'s a server configuration issue. Please contact the administrator.',
  },
};

export default function ErrorDisplay({ error, code, address, onRetry }: ErrorDisplayProps) {
  const errorInfo = code ? ERROR_HINTS[code] : null;

  return (
    <div className="max-w-lg mx-auto mt-8 animate-fade-in">
      <div className="bg-risk-critical/5 border border-risk-critical/20 rounded-2xl p-6">
        <div className="flex items-start gap-3">
          <div className="p-2 rounded-xl bg-risk-critical/10">
            <AlertCircle className="w-5 h-5 text-risk-critical" />
          </div>
          <div className="min-w-0">
            <h3 className="font-display font-bold text-white">
              {errorInfo?.title || 'Analysis Failed'}
            </h3>
            <p className="text-sm text-base-text/70 mt-1.5">
              {errorInfo?.hint || error}
            </p>

            {code === 'NOT_VERIFIED' && address && (
              <a
                href={`https://basescan.org/address/${address}#code`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 mt-3 text-xs text-base-blue hover:underline"
              >
                View on BaseScan <ExternalLink className="w-3 h-3" />
              </a>
            )}

            {onRetry && (
              <button
                onClick={onRetry}
                className={cn(
                  'inline-flex items-center gap-1.5 mt-4 px-4 py-2 rounded-lg text-xs font-mono',
                  'bg-base-slate/50 border border-base-border/40',
                  'text-base-text hover:text-white hover:border-base-border transition-colors',
                )}
              >
                <RotateCcw className="w-3 h-3" />
                Try Again
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}