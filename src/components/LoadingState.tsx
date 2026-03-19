'use client';

import { Shield, Loader2 } from 'lucide-react';

const STEPS = [
  { label: 'Verifying contract address...', labelId: 'Memverifikasi alamat kontrak...' },
  { label: 'Fetching source code from BaseScan...', labelId: 'Mengambil source code dari BaseScan...' },
  { label: 'Running static risk detection...', labelId: 'Menjalankan deteksi risiko statis...' },
  { label: 'AI is analyzing the contract...', labelId: 'AI sedang menganalisis kontrak...' },
  { label: 'Generating plain-language explanation...', labelId: 'Menghasilkan penjelasan bahasa sederhana...' },
];

interface LoadingStateProps {
  step?: number;
}

export default function LoadingState({ step = 0 }: LoadingStateProps) {
  return (
    <div className="max-w-lg mx-auto mt-12 animate-fade-in">
      <div className="bg-base-card/60 backdrop-blur-sm border border-base-border/40 rounded-2xl p-8 text-center relative overflow-hidden">
        {/* Scan line */}
        <div className="absolute inset-0 scan-line pointer-events-none" />

        {/* Icon */}
        <div className="relative inline-flex mb-6">
          <div className="w-16 h-16 rounded-2xl bg-base-blue/10 border border-base-blue/20 flex items-center justify-center">
            <Shield className="w-8 h-8 text-base-blue" />
          </div>
          <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-base-dark border-2 border-base-blue flex items-center justify-center">
            <Loader2 className="w-3 h-3 text-base-blue animate-spin" />
          </div>
        </div>

        <h3 className="font-display font-bold text-lg text-white mb-2">
          Analyzing Contract
        </h3>
        <p className="text-sm text-base-muted mb-6">
          This usually takes 10-30 seconds depending on contract complexity.
        </p>

        {/* Steps */}
        <div className="space-y-2 text-left max-w-xs mx-auto">
          {STEPS.map((s, i) => (
            <div
              key={i}
              className={`flex items-center gap-2.5 text-xs font-mono transition-all duration-500 ${
                i < step ? 'text-risk-low' :
                i === step ? 'text-base-blue' :
                'text-base-muted/30'
              }`}
            >
              {i < step ? (
                <span className="w-4 text-center">✓</span>
              ) : i === step ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin shrink-0" />
              ) : (
                <span className="w-4 text-center text-base-muted/20">○</span>
              )}
              <span>{s.label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}