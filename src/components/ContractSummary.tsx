'use client';

import { ExternalLink, Copy, Check, FileCode, Cpu, Coins, Activity } from 'lucide-react';
import { useState } from 'react';
import { cn, truncateAddress, formatETH, formatNumber } from '@/lib/utils';
import type { ContractMetadata } from '@/lib/types';

interface ContractSummaryProps {
  contract: ContractMetadata;
  summary: string;
  provider: string;
}

export default function ContractSummary({ contract, summary, provider }: ContractSummaryProps) {
  const [copied, setCopied] = useState(false);

  const copyAddress = async () => {
    await navigator.clipboard.writeText(contract.address);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const stats = [
    { icon: Coins, label: 'Balance', value: formatETH(contract.balanceETH) },
    { icon: Activity, label: 'Transactions', value: formatNumber(contract.txCount) },
    { icon: Cpu, label: 'Compiler', value: contract.compiler?.replace('v', '') || 'Unknown' },
    { icon: FileCode, label: 'License', value: contract.license || 'None' },
  ];

  return (
    <div className="animate-slide-up">
      {/* Contract header */}
      <div className="bg-base-card/80 backdrop-blur-sm border border-base-border/60 rounded-2xl p-5 sm:p-6 glow-border">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 mb-5">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <h2 className="font-display font-bold text-xl text-white">
                {contract.name}
              </h2>
              {contract.isProxy && (
                <span className="text-[10px] font-mono bg-risk-medium/10 text-risk-medium border border-risk-medium/20 px-2 py-0.5 rounded-full">
                  PROXY
                </span>
              )}
              {contract.verified && (
                <span className="text-[10px] font-mono bg-risk-low/10 text-risk-low border border-risk-low/20 px-2 py-0.5 rounded-full">
                  VERIFIED ✓
                </span>
              )}
            </div>

            <div className="flex items-center gap-2 mt-2">
              <code className="text-xs sm:text-sm font-mono text-base-muted">
                {truncateAddress(contract.address, 8)}
              </code>
              <button
                onClick={copyAddress}
                className="text-base-muted hover:text-white transition-colors"
                title="Copy address"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-risk-low" /> : <Copy className="w-3.5 h-3.5" />}
              </button>
              <a
                href={`https://basescan.org/address/${contract.address}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-base-muted hover:text-base-blue transition-colors"
                title="View on BaseScan"
              >
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
          </div>

          <div className="text-[10px] font-mono text-base-muted/60 bg-base-slate/40 px-2.5 py-1 rounded-md self-start">
            Analyzed with {provider}
          </div>
        </div>

        {/* Stats grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
          {stats.map(({ icon: Icon, label, value }) => (
            <div
              key={label}
              className="bg-base-slate/30 rounded-xl px-3 py-2.5 border border-base-border/20"
            >
              <div className="flex items-center gap-1.5 mb-1">
                <Icon className="w-3 h-3 text-base-muted" />
                <span className="text-[10px] text-base-muted font-mono uppercase tracking-wider">{label}</span>
              </div>
              <div className="text-sm font-mono text-white truncate">{value}</div>
            </div>
          ))}
        </div>

        {/* AI Summary */}
        <div className="bg-base-blue/5 border border-base-blue/10 rounded-xl p-4">
          <h3 className="text-[11px] font-mono text-base-blue uppercase tracking-wider mb-2">
            Summary
          </h3>
          <p className="text-sm text-base-text/90 leading-relaxed font-body">
            {summary}
          </p>
        </div>
      </div>
    </div>
  );
}