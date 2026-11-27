# Security Policy

## Supported Versions

| Version | Supported | Notes |
| --- | --- | --- |
| `main` / `1.x` | Yes | Active security patches and dependency updates |
| `< 1.0` | No | Upgrade to `1.x` |

## Reporting a Vulnerability

Please **do not** open public GitHub issues for security vulnerabilities, authentication bypasses, cross-tenant Firestore rule issues, or credential leaks.

Instead, report vulnerabilities privately:
1. Use GitHub's **Private Vulnerability Reporting** (Security Advisories) if enabled on the repository, or
2. Email the maintainer directly at **`yasserrajeb@gmail.com`** with:
   - Affected component (`firestore.rules`, `server.ts`, `src/domain/`, or frontend module)
   - Minimal reproduction steps or proof of concept
   - Estimated impact (e.g., cross-tenant access, privilege escalation, webhook signature bypass)

We aim to acknowledge reports within **48 hours** and provide a remediation timeline within **5 business days**.

## Security Architecture Highlights

- **Multi-Tenant Isolation (`firestore.rules`)**: Default-deny catch-all rule; all organization collections enforce `isOrgMember(orgId)` and append-only invariants on `movements` and `auditLogs`.
- **Server-Side Secrets (`server.ts`)**: `GEMINI_API_KEY`, `LEMON_SQUEEZY_API_KEY`, and `LEMON_SQUEEZY_WEBHOOK_SECRET` are strictly confined to server-side environment variables.
- **Webhook Integrity**: Billing webhooks require HMAC-SHA256 verification using `crypto.timingSafeEqual`.
- **Financial Precision**: Monetary values use integer minor units (`toMinorUnits`) to prevent floating-point rounding manipulation.
