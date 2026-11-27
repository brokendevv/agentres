# Contributing to TablePulse OS

Thank you for contributing to **TablePulse OS**! We welcome external contributors across pure financial/inventory ledger logic, UI accessibility, localization, and security testing.

## Local Development Setup

1. **Prerequisites**: Node.js `>= 20` and `npm`.
2. **Install dependencies**:
   ```bash
   npm ci
   ```
3. **Configure environment**:
   ```bash
   cp .env.example .env
   ```
   Never commit `.env` files or API keys. All secrets remain server-side.
4. **Run the development server**:
   ```bash
   npm run dev
   ```

## Required Verification Before Opening a Pull Request

Every pull request must pass all checks locally and in GitHub Actions CI:

```bash
# 1. TypeScript type-check
npm run lint

# 2. Pure domain & enhancement unit tests (node:test via tsx)
npm test

# 3. Production Vite build
npm run build
```

## Architectural & Domain Rules

1. **Integer Minor Units Only**: Never store or calculate currency using floating-point major units. Use `toMinorUnits` and `formatMinorCurrency` from `src/domain/calculations.ts`.
2. **Pure Domain Modules (`src/domain/`)**: Keep business logic (`calculations.ts`, `enhancements.ts`, `types.ts`) framework-agnostic and covered by `*.test.ts` unit tests.
3. **Strict Multi-Tenant Isolation**: Never bypass `isOrgMember(orgId)` or expose cross-tenant paths. Keep `movements` and `auditLogs` append-only.
4. **No Fake Data or Placeholder Integrations**: External integrations (Gemini AI, Lemon Squeezy, Firebase) must handle unconfigured states cleanly without simulating fake payment success.

## Good Areas for External Contributors

- Adding unit tests for currency conversions, unit conversions, and recipe food-cost edge cases in `src/domain/calculations.test.ts`
- Improving keyboard navigation and ARIA coverage in UI modules
- Adding multi-language hospitality templates (FR / AR / EN / ES)
- Extending CSV / ledger export schemas and report tests
