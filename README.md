# ContractLens — Base Smart Contract Explainer

> AI-powered smart contract analysis for non-technical users on Base network.

Paste any verified Base contract address and get plain-language explanations of every function, a security risk assessment, and actionable insights — powered by your choice of AI (Claude, GPT-4o, or Gemini).

---

## Demo
https://base-contract-explainer.vercel.app/

## Features

- **Multi-AI Provider** — Switch between Anthropic Claude, OpenAI GPT-4o, and Google Gemini
- **Plain-Language Explanations** — Every public function explained in simple terms
- **Risk Assessment** — Static pattern detection + AI analysis combined
- **Bilingual** — English and Bahasa Indonesia support
- **Base Network Native** — Built specifically for Base Mainnet contracts
- **Production Ready** — Rate limiting, input sanitization, error handling

---

## Architecture

```
User Input (address)
       │
       ▼
┌─────────────────────┐
│   Next.js API Route  │
│                      │
│  1. Validate address │
│  2. Check rate limit │
│  3. Fetch on-chain   │──→ Base RPC (viem)
│  4. Fetch source     │──→ BaseScan API
│  5. Static analysis  │──→ Risk Patterns
│  6. AI analysis      │──→ Claude / GPT-4o / Gemini
│  7. Merge & respond  │    (via Vercel AI SDK)
└─────────┬───────────┘
          ▼
    JSON Response → React Frontend
```

---

## Quick Start

### 1. Clone & Install

```bash
git clone <your-repo>
cd base-contract-explainer
npm install
```

### 2. Configure Environment

```bash
cp .env.example .env.local
```

Edit `.env.local` with your API keys:

```env
# At least one AI provider is required
ANTHROPIC_API_KEY=sk-ant-xxxxx      # Claude
OPENAI_API_KEY=sk-xxxxx             # GPT-4o
GOOGLE_GENERATIVE_AI_API_KEY=xxxxx  # Gemini

# Required
BASESCAN_API_KEY=xxxxx              # From basescan.org

# Optional (defaults shown)
BASE_RPC_URL=https://mainnet.base.org
RATE_LIMIT_MAX_PER_MINUTE=10
```

### 3. Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

---

## Getting API Keys

| Service | URL | Free Tier |
|---------|-----|-----------|
| BaseScan | https://basescan.org/apis | 5 calls/sec |
| Anthropic | https://console.anthropic.com | Pay-per-use |
| OpenAI | https://platform.openai.com | Pay-per-use |
| Google AI | https://aistudio.google.com | Free tier available |
| Alchemy (RPC) | https://www.alchemy.com | 300M compute/month free |

---

## Deploy to Production

### Vercel (Recommended)

```bash
npm i -g vercel
vercel
```

Set environment variables in Vercel Dashboard → Settings → Environment Variables.

### Docker

```dockerfile
FROM node:22-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:22-alpine AS runner
WORKDIR /app
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public

ENV NODE_ENV=production
EXPOSE 3000
CMD ["node", "server.js"]
```

### VPS

```bash
npm run build
npm run start  # Runs on port 3000
```

Use Nginx/Caddy as reverse proxy with SSL.

---

## Adding a New AI Provider

The system is designed for easy provider extension:

1. Install the Vercel AI SDK adapter:
```bash
npm install @ai-sdk/your-provider
```

2. Add to `src/lib/ai-provider.ts`:
```typescript
// In PROVIDER_MODELS
newprovider: 'model-name',

// In getProviderInstance()
case 'newprovider': {
  const provider = createNewProvider({ apiKey: process.env.NEW_API_KEY });
  return provider(PROVIDER_MODELS.newprovider);
}

// In getAvailableProviders()
{ id: 'newprovider', name: 'New AI', model: '...', available: !!process.env.NEW_API_KEY, icon: '🔴' },
```

3. Add the type to `src/lib/types.ts`:
```typescript
export type AIProvider = 'anthropic' | 'openai' | 'google' | 'newprovider';
```

4. Add `NEW_API_KEY` to your environment.

---

## Adding New Risk Patterns

Edit `src/lib/risk-patterns.ts`:

```typescript
{
  id: 'my-pattern',
  type: 'CUSTOM',
  severity: 'HIGH',
  title: 'My Pattern',
  titleId: 'Pola Saya',
  description: 'English description',
  descriptionId: 'Deskripsi Bahasa Indonesia',
  pattern: /myRegexPattern/gi,
  contextCheck: (source, match) => {
    // Optional: return true if the match is a real risk
    return true;
  },
},
```

---

## Project Structure

```
src/
├── app/
│   ├── layout.tsx          # Root layout, fonts, metadata
│   ├── page.tsx            # Main page (client component)
│   ├── globals.css         # Tailwind + custom styles
│   └── api/
│       └── analyze/
│           └── route.ts    # POST: analyze, GET: providers
├── components/
│   ├── Header.tsx          # Top nav with Base branding
│   ├── AddressInput.tsx    # Input + provider selector + language
│   ├── ContractSummary.tsx # Contract metadata + AI summary
│   ├── RiskPanel.tsx       # Risk level banner + risk items
│   ├── FunctionList.tsx    # Expandable function explanations
│   ├── LoadingState.tsx    # Animated scanning state
│   ├── ErrorDisplay.tsx    # Contextual error messages
│   └── Footer.tsx          # Footer with disclaimer
└── lib/
    ├── types.ts            # All TypeScript types
    ├── ai-provider.ts      # Multi-AI abstraction (Vercel AI SDK)
    ├── basescan.ts         # BaseScan API client
    ├── base-rpc.ts         # Base RPC via viem
    ├── risk-patterns.ts    # Static risk detection rules
    ├── rate-limit.ts       # In-memory rate limiter
    └── utils.ts            # Helpers (cn, validation, formatting)
```

---

## Security Considerations

- **Prompt Injection**: Contract source is sanitized before sending to AI
- **Rate Limiting**: Per-IP, configurable (default 10/min)
- **XSS Prevention**: All dynamic content sanitized for display
- **API Keys**: Server-side only, never exposed to client
- **Input Validation**: Strict hex address validation
- **Cost Control**: Max token limits per AI request

---

## Limitations

- Only analyzes **verified** contracts (source code must be on BaseScan)
- AI analysis is **not** a substitute for a professional security audit
- Static patterns may produce false positives
- Very large contracts may be truncated for AI analysis
- Analysis results should be verified independently

---

## License

MIT