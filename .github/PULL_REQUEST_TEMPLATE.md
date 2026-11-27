## Summary

<!-- Describe what this pull request changes and why. -->

## Related Issue

<!-- Closes # -->

## Verification Checklist

- [ ] `npm run lint` (`tsc --noEmit`) passes with zero errors
- [ ] `npm test` passes all domain & enhancement unit tests
- [ ] `npm run build` completes cleanly
- [ ] Monetary values use integer minor units (`src/domain/calculations.ts`)
- [ ] No secrets, `.env` files, or API keys are included in this commit
- [ ] Multi-tenant Firestore isolation (`isOrgMember`) and append-only ledger rules are preserved
