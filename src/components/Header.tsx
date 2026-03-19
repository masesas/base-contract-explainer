'use client';

import { Shield } from 'lucide-react';

export default function Header() {
  return (
    <header className="border-b border-base-border/50 backdrop-blur-md bg-base-dark/80 sticky top-0 z-40">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
        {/* Logo */}
        <div className="flex items-center gap-3">
          <div className="relative w-9 h-9 rounded-lg bg-base-blue/10 border border-base-blue/20 flex items-center justify-center">
            <Shield className="w-5 h-5 text-base-blue" />
            <div className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-base-blue animate-pulse-slow" />
          </div>
          <div>
            <h1 className="font-display font-bold text-white text-base leading-none tracking-tight">
              ContractLens
            </h1>
            <p className="text-[10px] text-base-muted font-mono tracking-widest uppercase mt-0.5">
              Base Network
            </p>
          </div>
        </div>

        {/* Network Badge */}
        <div className="flex items-center gap-2">
          <div className="hidden sm:flex items-center gap-1.5 text-xs text-base-muted bg-base-slate/50 border border-base-border/50 rounded-full px-3 py-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-risk-low animate-pulse" />
            Base Mainnet
          </div>
          <a
            href="https://basescan.org"
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-base-muted hover:text-base-blue transition-colors font-mono"
          >
            BaseScan ↗
          </a>
        </div>
      </div>
    </header>
  );
}