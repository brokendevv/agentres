# TablePulse OS

[![License](https://img.shields.io/badge/License-Apache_2.0-176B58.svg)](./LICENSE)
[![Node.js](https://img.shields.io/badge/Node.js-%3E%3D20-176B58.svg)](./package.json)
[![TypeScript](https://img.shields.io/badge/TypeScript-Strict-176B58.svg)](./tsconfig.json)

**TablePulse OS** is an open-source, multi-tenant restaurant operations platform built with React 19, TypeScript, Express, Tailwind CSS, Cloud Firestore, and server-side Gemini AI. It enforces integer minor-unit financial accounting, strict separation between purchase orders and verified stock receipts, role-scoped tenant isolation, and human-in-the-loop AI workflows.

## Quick Start

### Prerequisites
- Node.js `>= 20.0.0`
- `npm`

### 1. Clone and install
```bash
git clone https://github.com/yasserrajeb/tablepulse-os.git
cd tablepulse-os
npm install
```

### 2. Configure environment variables
```bash
cp .env.example .env
```
Edit `.env` with any optional integration keys (the workspace and deterministic grounded fallback engines work locally even without external API keys):
- `GEMINI_API_KEY`: Enables live Gemini AI operations assistant & receipt OCR extraction (`server.ts`).
- `LEMON_SQUEEZY_API_KEY`, `LEMON_SQUEEZY_STORE_ID`, `LEMON_SQUEEZY_WEBHOOK_SECRET`: Enables live Lemon Squeezy checkout & HMAC-SHA256 webhook verification.

### 3. Start local development
```bash
npm run dev
```
Open `http://localhost:3000` (or `http://localhost:3000/?autostart=1` to inspect the workspace directly).

### 4. Run full verification suite
```bash
npm run verify
```
This runs `npm run lint` (`tsc --noEmit`), `npm test` (19 deterministic `node:test` suites via `tsx`), and `npm run build` (`vite build`).

## Architecture & Repository Layout

| Path | Purpose |
| --- | --- |
| `src/domain/index.ts` | Zero-dependency hospitality ledger & accounting core (`toMinorUnits`, unit conversion, weighted-average stock receipt, recipe food cost, variance, tip pools, entitlements) |
| `src/domain/enhancements.ts` | Role-based navigation permissions, tenant-scoped global search, UTM consent sanitization, announcement lifecycle |
| `src/components/` | Modular UI suites (`InventoryPurchasingModule`, `TeamOperationsModule`, `GrowthExperienceModule`, `IntelligenceGovernanceModule`, `MarketingLanding`) |
| `server.ts` | Express 4 + Vite server (`GET /api/health`, `POST /api/ai/assistant`, `POST /api/ai/extract-receipt`, `POST /api/billing/create-checkout`, `POST /api/billing/webhook`, `/api/support/tickets`) |
| `firestore.rules` | Default-deny Zero-Trust multi-tenant Firestore security rules with `isOrgMember(orgId)` and append-only `movements` & `auditLogs` |
| `firebase-blueprint.json` | Canonical Firestore schema blueprint |

## Using the Pure Domain Core (`src/domain`)

All financial, inventory, and recipe-costing primitives live in `src/domain/index.ts` with zero browser or database dependencies:

```ts
import {
  toMinorUnits,
  formatMinorCurrency,
  calculatePurchaseTotalMinor,
  calculateRecipeCostMetrics,
} from './src/domain/index';

const po = calculatePurchaseTotalMinor({
  quantity: 10,
  unitPriceMinor: toMinorUnits(15.0),
  taxMinor: 1500,
  discountMinor: 500,
});

console.log(formatMinorCurrency(po.totalMinor, 'MAD')); // "160.00 MAD"
```

## Multi-Tenant Security & Firebase Setup

- **Default-Deny Catch-All**: `firestore.rules` rejects all reads and writes by default (`match /{document=**} { allow read, write: if false; }`).
- **Master Gate (`isOrgMember(orgId)`)**: Organization subcollections require authenticated ownership (`ownerUid`) or an `active` member record in `/organizations/{orgId}/members/{uid}`.
- **Append-Only Ledgers**: `/movements/{movementId}` and `/auditLogs/{logId}` prohibit `update` and `delete`.
- **Firebase Authentication**: To use your own Firebase project, update `firebase-applet-config.json`, deploy `firestore.rules`, and enable Google Sign-In and Email/Password providers in the Firebase Console.

## Billing & Payout Architecture (Lemon Squeezy + Rizon)

- **Merchant of Record**: Uses the official Lemon Squeezy Checkouts API (`https://api.lemonsqueezy.com/v1/checkouts`) and verifies webhooks via HMAC-SHA256 (`crypto.timingSafeEqual`).
- **Morocco-Friendly Payouts**: Lemon Squeezy supports Moroccan merchants and settles net USD ACH / EUR SEPA payouts to virtual receiving accounts (such as Rizon) or local Moroccan bank IBANs.

## Contributing & Community

Contributions are welcome! Please read:
- [`CONTRIBUTING.md`](./CONTRIBUTING.md) for local setup, coding invariants, and PR verification rules
- [`CODE_OF_CONDUCT.md`](./CODE_OF_CONDUCT.md) for community expectations
- [`SECURITY.md`](./SECURITY.md) for private vulnerability disclosure
- [`CHANGELOG.md`](./CHANGELOG.md) for release history

## License

Licensed under the [Apache License 2.0](./LICENSE).
