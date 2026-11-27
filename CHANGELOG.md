# Changelog

All notable changes to **TablePulse OS** are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2026-11-27

### Added
- Open-source repository governance files: `LICENSE` (Apache-2.0), `SECURITY.md`, `CONTRIBUTING.md`, `CODE_OF_CONDUCT.md`, `.editorconfig`, `.github/CODEOWNERS`, `.github/dependabot.yml`, `.github/PULL_REQUEST_TEMPLATE.md`, and YAML issue templates.
- GitHub Actions CI pipeline (`.github/workflows/ci.yml`) with least-privilege token permissions verifying TypeScript lint, unit tests, and Vite production build.
- Pure, zero-dependency hospitality ledger barrel export (`src/domain/index.ts`) covering minor-unit currency math, unit conversion, stock weighted-average costing, recipe food-cost calculation, variance analysis, tip pooling, and plan entitlements.
- Full-stack multi-tenant restaurant operations platform: inventory movement ledger, purchasing/receiving separation, AI receipt OCR verification, team tip pools, shift meetings/tasks, CRM, reservations, reviews, website builder, Lemon Squeezy billing, and Zero-Trust Firestore rules.
