# TablePulse OS — Production Architecture, Security & Handover Guide

## 1. Architecture & Tech Stack
- **Frontend**: React 19, TypeScript, Vite, Tailwind CSS (`Plus Jakarta Sans` + `IBM Plex Mono` tabular numerals), PWA Web App Manifest (`public/manifest.webmanifest`).
- **Authentication & Database**: Firebase Authentication (Email/Password + Google OAuth 2.0 Sign-In + Password Reset) and Cloud Firestore (`firebase-applet-config.json`), governed by Zero-Trust Attribute-Based Access Control rules (`firestore.rules`).
- **Backend Runtime (`server.ts`)**: Express 4 + Vite middleware server on port `3000` providing:
  - `GET /api/health`: Live configuration and external secret status.
  - `POST /api/ai/assistant`: Server-side `@google/genai` (`gemini-3.8-flash`) grounded strictly in the requesting organization's authorized ledger records.
  - `POST /api/ai/extract-receipt`: Structured OCR/invoice extraction into integer minor units with automatic arithmetic reconciliation (`validateAndReconcileReceiptExtraction`).
  - `POST /api/billing/create-checkout`: Official Lemon Squeezy Merchant of Record API integration (`https://api.lemonsqueezy.com/v1/checkouts`).
  - `POST /api/billing/webhook`: Idempotent `X-Signature` HMAC-SHA256 verified webhook handler using `crypto.timingSafeEqual`.

## 2. Multi-Tenant Security & Firestore Rules (`firestore.rules`)
- **Default-Deny Catch-All**: `match /{document=**} { allow read, write: if false; }`
- **PII Isolation**: `/users/{userId}` is accessible strictly to `request.auth.uid == userId` or the verified platform administrator (`yasserrajeb@gmail.com`).
- **The Master Gate (`isOrgMember(orgId)`)**: Every subcollection under `/organizations/{orgId}/**` verifies that the authenticated user is either the organization `ownerUid` or holds an `active` document in `/organizations/{orgId}/members/$(request.auth.uid)`.
- **Append-Only Ledgers**: `/organizations/{orgId}/movements/{movementId}` and `/organizations/{orgId}/auditLogs/{logId}` enforce `allow update, delete: if false;` so historical inventory and security records cannot be altered destructively.

## 3. Payment Provider Selection & Rizon Payout Verification
### Why Lemon Squeezy (Merchant of Record) was selected:
1. Direct Stripe merchant accounts are not generally available to standard domestic Moroccan entities without establishing an external legal entity (e.g., US LLC or UK Ltd).
2. **Lemon Squeezy** acts as a global Merchant of Record, handles international card processing and VAT/sales tax compliance automatically, and explicitly supports **Morocco** for merchant onboarding and payouts.

### Verified Rizon Account & Rizon Visa Card Payout Route:
- **Never treat a Visa card number as a bank payout account.** Customer cards are charged by Lemon Squeezy checkout.
- **Rizon** provides verified **USD (US ACH routing + account number)** and **EUR (SEPA IBAN)** virtual receiving bank accounts.
- Lemon Squeezy settles net subscription proceeds to the merchant's verified bank account (0% fee for US ACH USD accounts; 1% fee for international bank payouts). Once settled into the owner's Rizon USD/EUR receiving account, the balance is immediately spendable through the owner's **Rizon Visa card**.

## 4. Required External Setup for Live Activation
1. **Firebase Console**:
   - Google Sign-In is provisioned automatically. To enable Email/Password sign-up in production, open the Firebase Console (`hidden-autonomy-zk6kr` -> Authentication -> Sign-in method) and enable the **Email/Password** provider.
2. **Lemon Squeezy Live Billing**:
   - Complete merchant verification in Lemon Squeezy, create the Pro, Business, and Ultra subscription variants, configure your Rizon USD ACH or Moroccan IBAN payout destination, and add `LEMON_SQUEEZY_API_KEY`, `LEMON_SQUEEZY_STORE_ID`, and `LEMON_SQUEEZY_WEBHOOK_SECRET` in AI Studio Secrets.
3. **Backups & Quotas**:
   - Firestore runs on the provisioned AI Studio instance (`ai-studio-6e0b9d4a-0418-4f8f-894e-55d451c13e4b`). For automated daily Point-in-Time Recovery (PITR) backups in production, upgrade the GCP project to the Blaze plan and enable Firestore scheduled backups via `gcloud firestore backups schedules create`.

## 5. Verification & Test Commands
```bash
# Run pure domain calculation unit tests (9 suites)
./node_modules/.bin/tsx --test src/domain/calculations.test.ts

# Type-check and build production bundle
npm run lint
npm run build
```
