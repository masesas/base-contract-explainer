'use client';

import { Shield, Github } from 'lucide-react';

export default function Footer() {
  return (
    <footer className="mt-auto border-t border-base-border/30 py-8">
      <div className="max-w-5xl mx-auto px-4 sm:px-6">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-base-muted">
          <div className="flex items-center gap-2">
            <Shield className="w-3.5 h-3.5" />
            <span>ContractLens — Educational tool, not a security audit.</span>
          </div>
          <div className="flex items-center gap-4">
            <span>Built for Base Network</span>
            <span className="text-base-border">|</span>
            <a
              href="https://base.org"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-base-blue transition-colors"
            >
              base.org ↗
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}