// ===========================================
// Utility Functions
// ===========================================

import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

// --- Tailwind CN helper ---

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// --- Address Validation ---

export function isValidAddress(address: string): boolean {
  return /^0x[a-fA-F0-9]{40}$/.test(address);
}

// --- Format Address ---

export function truncateAddress(address: string, chars = 6): string {
  return `${address.slice(0, chars + 2)}...${address.slice(-chars)}`;
}

// --- Format ETH Balance ---

export function formatETH(value: string): string {
  const num = parseFloat(value);
  if (num === 0) return '0 ETH';
  if (num < 0.0001) return '<0.0001 ETH';
  return `${num.toFixed(4)} ETH`;
}

// --- Format Number ---

export function formatNumber(num: number): string {
  return new Intl.NumberFormat().format(num);
}

// --- Risk Level Color ---

export function getRiskColor(level: string): string {
  switch (level) {
    case 'CRITICAL': return 'text-risk-critical';
    case 'HIGH': return 'text-risk-high';
    case 'MEDIUM': return 'text-risk-medium';
    case 'LOW': return 'text-low';
    case 'INFO': return 'text-risk-info';
    default: return 'text-base-muted';
  }
}

export function getRiskBgColor(level: string): string {
  switch (level) {
    case 'CRITICAL': return 'bg-risk-critical/10 border-risk-critical/30';
    case 'HIGH': return 'bg-risk-high/10 border-risk-high/30';
    case 'MEDIUM': return 'bg-risk-medium/10 border-risk-medium/30';
    case 'LOW': return 'bg-risk-low/10 border-risk-low/30';
    case 'INFO': return 'bg-risk-info/10 border-risk-info/30';
    default: return 'bg-base-card border-base-border';
  }
}

// --- Sanitize string for display (prevent XSS) ---

export function sanitizeDisplay(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}