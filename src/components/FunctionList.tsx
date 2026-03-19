'use client';

import { useState } from 'react';
import { ChevronDown, ChevronRight, Zap, Eye, Wallet, Code2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { FunctionExplanation } from '@/lib/types';

interface FunctionListProps {
  functions: FunctionExplanation[];
}

const MUTABILITY_CONFIG = {
  payable: { icon: Wallet, label: 'Payable', color: 'text-risk-high', hint: 'Accepts ETH' },
  nonpayable: { icon: Zap, label: 'Write', color: 'text-risk-medium', hint: 'Modifies state' },
  view: { icon: Eye, label: 'Read', color: 'text-risk-info', hint: 'Read only' },
  pure: { icon: Code2, label: 'Pure', color: 'text-base-muted', hint: 'No state access' },
};

function FunctionCard({ fn, index }: { fn: FunctionExplanation; index: number }) {
  const [expanded, setExpanded] = useState(false);
  const mutConfig = MUTABILITY_CONFIG[fn.mutability] || MUTABILITY_CONFIG.nonpayable;
  const MutIcon = mutConfig.icon;

  return (
    <div className={cn(
      'rounded-xl border transition-all duration-200',
      'bg-base-card/40 border-base-border/30',
      'hover:border-base-border/60',
      expanded && 'border-base-border/60 bg-base-card/60',
    )}>
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-3 p-4 text-left"
      >
        <div className={cn(
          'shrink-0 w-7 h-7 rounded-lg flex items-center justify-center',
          fn.mutability === 'payable' ? 'bg-risk-high/10' : 'bg-base-slate/50',
        )}>
          <MutIcon className={cn('w-3.5 h-3.5', mutConfig.color)} />
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <code className="font-mono text-sm text-white font-medium truncate">
              {fn.name}
            </code>
            <span className={cn(
              'shrink-0 text-[9px] font-mono px-1.5 py-0.5 rounded',
              'bg-base-slate/40 border border-base-border/30',
              mutConfig.color,
            )}>
              {mutConfig.label}
            </span>
            {fn.riskNote && (
              <span className="shrink-0 text-[9px] font-mono px-1.5 py-0.5 rounded bg-risk-high/10 text-risk-high border border-risk-high/20">
                ⚠
              </span>
            )}
          </div>
          <p className="text-xs text-base-muted mt-0.5 line-clamp-1">{fn.description}</p>
        </div>

        {expanded
          ? <ChevronDown className="w-4 h-4 text-base-muted shrink-0" />
          : <ChevronRight className="w-4 h-4 text-base-muted shrink-0" />
        }
      </button>

      {expanded && (
        <div className="px-4 pb-4 space-y-3 border-t border-base-border/20 pt-3 mx-4 mb-0">
          {/* Signature */}
          <div>
            <span className="text-[10px] font-mono text-base-muted uppercase tracking-wider">Signature</span>
            <code className="block mt-1 text-xs font-mono text-base-text/80 bg-base-slate/30 rounded-lg px-3 py-2 overflow-x-auto">
              {fn.signature}
            </code>
          </div>

          {/* Description */}
          <div>
            <span className="text-[10px] font-mono text-base-muted uppercase tracking-wider">What it does</span>
            <p className="mt-1 text-sm text-base-text/80 leading-relaxed">{fn.description}</p>
          </div>

          {/* Parameters */}
          {fn.parameters && fn.parameters.length > 0 && (
            <div>
              <span className="text-[10px] font-mono text-base-muted uppercase tracking-wider">Parameters</span>
              <div className="mt-1 space-y-1.5">
                {fn.parameters.map((param, i) => (
                  <div key={i} className="flex items-start gap-2 text-xs">
                    <code className="font-mono text-base-blue shrink-0">{param.name}</code>
                    <span className="font-mono text-base-muted shrink-0">({param.type})</span>
                    <span className="text-base-text/70">— {param.description}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Risk note */}
          {fn.riskNote && (
            <div className="bg-risk-high/5 border border-risk-high/15 rounded-lg p-3">
              <span className="text-[10px] font-mono text-risk-high uppercase tracking-wider">⚠ Risk Note</span>
              <p className="mt-1 text-sm text-risk-high/80">{fn.riskNote}</p>
            </div>
          )}

          {/* Metadata */}
          <div className="flex gap-3 text-[10px] font-mono text-base-muted">
            <span>Visibility: {fn.visibility}</span>
            <span>•</span>
            <span>{mutConfig.hint}</span>
          </div>
        </div>
      )}
    </div>
  );
}

export default function FunctionList({ functions }: FunctionListProps) {
  const [filter, setFilter] = useState<string>('all');

  const filtered = filter === 'all'
    ? functions
    : functions.filter((f) => f.mutability === filter);

  const counts = {
    all: functions.length,
    payable: functions.filter((f) => f.mutability === 'payable').length,
    nonpayable: functions.filter((f) => f.mutability === 'nonpayable').length,
    view: functions.filter((f) => f.mutability === 'view').length,
    pure: functions.filter((f) => f.mutability === 'pure').length,
  };

  return (
    <div className="animate-slide-up" style={{ animationDelay: '0.2s' }}>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
        <h3 className="font-display font-bold text-lg text-white">
          Functions ({functions.length})
        </h3>

        {/* Filter tabs */}
        <div className="flex gap-1 bg-base-slate/30 rounded-lg p-1">
          {(['all', 'payable', 'nonpayable', 'view', 'pure'] as const).map((key) => {
            if (key !== 'all' && counts[key] === 0) return null;
            const config = key === 'all' ? null : MUTABILITY_CONFIG[key];
            return (
              <button
                key={key}
                onClick={() => setFilter(key)}
                className={cn(
                  'text-[11px] font-mono px-2.5 py-1 rounded-md transition-colors',
                  filter === key
                    ? 'bg-base-blue/20 text-base-blue'
                    : 'text-base-muted hover:text-base-text',
                )}
              >
                {key === 'all' ? 'All' : config?.label} ({counts[key]})
              </button>
            );
          })}
        </div>
      </div>

      <div className="space-y-2 stagger-in">
        {filtered.map((fn, i) => (
          <FunctionCard key={`${fn.name}-${i}`} fn={fn} index={i} />
        ))}
        {filtered.length === 0 && (
          <div className="text-center py-8 text-base-muted text-sm">
            No functions match this filter.
          </div>
        )}
      </div>
    </div>
  );
}