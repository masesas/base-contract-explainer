'use client';

import { AlertTriangle, ShieldAlert, ShieldCheck, Info, ShieldX } from 'lucide-react';
import { cn, getRiskBgColor } from '@/lib/utils';
import type { RiskItem, RiskLevel } from '@/lib/types';

interface RiskPanelProps {
  riskLevel: RiskLevel;
  risks: RiskItem[];
}

const RISK_CONFIG: Record<RiskLevel, {
  icon: typeof AlertTriangle;
  label: string;
  labelId: string;
  color: string;
  bgClass: string;
  description: string;
  descriptionId: string;
}> = {
  CRITICAL: {
    icon: ShieldX,
    label: 'Critical Risk',
    labelId: 'Risiko Kritis',
    color: 'text-risk-critical',
    bgClass: 'bg-risk-critical/10 border-risk-critical/30',
    description: 'Severe vulnerabilities detected. Strongly consider NOT interacting with this contract.',
    descriptionId: 'Kerentanan parah terdeteksi. Sangat disarankan TIDAK berinteraksi dengan kontrak ini.',
  },
  HIGH: {
    icon: ShieldAlert,
    label: 'High Risk',
    labelId: 'Risiko Tinggi',
    color: 'text-risk-high',
    bgClass: 'bg-risk-high/10 border-risk-high/30',
    description: 'Significant risks found. Proceed with extreme caution and verify thoroughly.',
    descriptionId: 'Risiko signifikan ditemukan. Lanjutkan dengan sangat hati-hati dan verifikasi secara menyeluruh.',
  },
  MEDIUM: {
    icon: AlertTriangle,
    label: 'Medium Risk',
    labelId: 'Risiko Sedang',
    color: 'text-risk-medium',
    bgClass: 'bg-risk-medium/10 border-risk-medium/30',
    description: 'Some concerns identified. Review the details before interacting.',
    descriptionId: 'Beberapa kekhawatiran teridentifikasi. Tinjau detail sebelum berinteraksi.',
  },
  LOW: {
    icon: ShieldCheck,
    label: 'Low Risk',
    labelId: 'Risiko Rendah',
    color: 'text-risk-low',
    bgClass: 'bg-risk-low/10 border-risk-low/30',
    description: 'No major known dangerous patterns detected. Standard caution still recommended.',
    descriptionId: 'Tidak ada pola berbahaya utama yang terdeteksi. Kehati-hatian standar tetap disarankan.',
  },
  INFO: {
    icon: Info,
    label: 'Informational',
    labelId: 'Informasi',
    color: 'text-risk-info',
    bgClass: 'bg-risk-info/10 border-risk-info/30',
    description: 'Observations noted for your awareness.',
    descriptionId: 'Observasi dicatat untuk kesadaran Anda.',
  },
};

const SEVERITY_ORDER: RiskLevel[] = ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW', 'INFO'];

export default function RiskPanel({ riskLevel, risks }: RiskPanelProps) {
  const config = RISK_CONFIG[riskLevel];
  const Icon = config.icon;

  const sortedRisks = [...risks].sort(
    (a, b) => SEVERITY_ORDER.indexOf(a.severity) - SEVERITY_ORDER.indexOf(b.severity)
  );

  return (
    <div className="animate-slide-up" style={{ animationDelay: '0.1s' }}>
      {/* Overall risk banner */}
      <div className={cn(
        'rounded-2xl border p-5 sm:p-6 mb-4',
        config.bgClass,
      )}>
        <div className="flex items-start gap-3">
          <div className={cn('p-2 rounded-xl', config.bgClass)}>
            <Icon className={cn('w-6 h-6', config.color)} />
          </div>
          <div>
            <h3 className={cn('font-display font-bold text-lg', config.color)}>
              {config.label}
            </h3>
            <p className="text-sm text-base-text/70 mt-1">
              {config.description}
            </p>
          </div>
        </div>
      </div>

      {/* Risk items */}
      {sortedRisks.length > 0 && (
        <div className="space-y-3 stagger-in">
          <h3 className="text-[11px] font-mono text-base-muted uppercase tracking-wider px-1">
            Detected Issues ({sortedRisks.length})
          </h3>
          {sortedRisks.map((risk) => {
            const riskConf = RISK_CONFIG[risk.severity];
            const RiskIcon = riskConf.icon;

            return (
              <div
                key={risk.id}
                className={cn(
                  'rounded-xl border p-4 transition-colors',
                  'bg-base-card/50 border-base-border/40',
                  'hover:border-base-border/60',
                )}
              >
                <div className="flex items-start gap-3">
                  <RiskIcon className={cn('w-4 h-4 mt-0.5 shrink-0', riskConf.color)} />
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-1.5">
                      <span className="font-display font-semibold text-sm text-white">
                        {risk.title}
                      </span>
                      <span className={cn(
                        'text-[10px] font-mono px-1.5 py-0.5 rounded',
                        getRiskBgColor(risk.severity),
                        riskConf.color,
                      )}>
                        {risk.severity}
                      </span>
                    </div>
                    <p className="text-sm text-base-text/70 leading-relaxed">
                      {risk.description}
                    </p>
                    {risk.location && (
                      <span className="inline-block mt-2 text-[10px] font-mono text-base-muted bg-base-slate/40 px-2 py-0.5 rounded">
                        📍 {risk.location}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Disclaimer */}
      <div className="mt-4 px-4 py-3 bg-base-slate/20 border border-base-border/20 rounded-xl">
        <p className="text-[11px] text-base-muted/70 leading-relaxed">
          ⚠️ This analysis is for educational purposes only and does not constitute a security audit.
          AI analysis may miss vulnerabilities. Always verify independently and consult professionals
          before interacting with significant funds.
        </p>
      </div>
    </div>
  );
}