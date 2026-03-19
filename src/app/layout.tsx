import './globals.css';

import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Base Contract Explainer — Understand Smart Contracts Before You Interact',
  description:
    'Analyze and understand Base network smart contracts in plain language. AI-powered security analysis for non-technical users.',
  keywords: ['Base', 'smart contract', 'security', 'blockchain', 'explainer', 'audit'],
  openGraph: {
    title: 'Base Contract Explainer',
    description: 'Understand smart contracts before you interact. AI-powered analysis in plain language.',
    type: 'website',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className="min-h-screen bg-base-dark text-base-text noise-overlay">
        <div className="relative z-10 bg-grid min-h-screen">
          {children}
        </div>
      </body>
    </html>
  );
}