# Security Architecture & Payload-First TDD Specification (TablePulse OS)

## 1. Data Invariants
1. **Default-Deny Catch-All**: Any path not explicitly matched is denied for both `read` and `write`.
2. **Strict Tenant Isolation (The Master Gate)**: No user may read, list, create, update, or delete any document under `/organizations/{orgId}/**` unless they are either the `ownerUid` of `/organizations/{orgId}` OR have an active membership document at `/organizations/{orgId}/members/$(request.auth.uid)` with `status == 'active'`.
3. **PII Isolation**: `/users/{userId}` documents contain user email and active tenant context and can ONLY be read or written by `request.auth.uid == userId` (or platform admin). Blanket `isSignedIn()` reads on `/users` are strictly prohibited.
4. **Immutable Audit & Movement Ledgers**: Documents in `/organizations/{orgId}/movements/{movementId}` and `/organizations/{orgId}/auditLogs/{logId}` are append-only (`allow update, delete: if false;`). Corrections require creating a new movement or reversal entry.
5. **Path Variable Hardening**: Every `{userId}`, `{orgId}`, `{memberId}`, and `{docId}` path variable is validated via `isValidId(id)` (`id is string && id.size() <= 128 && id.matches('^[a-zA-Z0-9_\\-]+$')`).
6. **Shadow Field & Payload Size Protection**: Every create/update validates required keys (`hasAll`), allowed keys (`hasOnly`), string `.size()` bounds, and numeric types.

## 2. The "Dirty Dozen" Adversarial Payloads
1. **Cross-Tenant Read**: User from `org_alpha` requests `GET /organizations/org_bravo/ingredients/ing_1` -> `PERMISSION_DENIED`.
2. **Cross-Tenant List**: User from `org_alpha` requests `LIST /organizations/org_bravo/purchases` -> `PERMISSION_DENIED`.
3. **Unbounded User PII Scrape**: Authenticated user requests `GET /users/other_user_uid` -> `PERMISSION_DENIED`.
4. **Shadow Field Injection on Organization Create**: Payload includes `"isSuperAdmin": true` -> `PERMISSION_DENIED` (`hasOnly` check).
5. **Owner Spoofing on Organization Create**: Payload sets `"ownerUid": "victim_uid"` while `request.auth.uid == "attacker_uid"` -> `PERMISSION_DENIED`.
6. **Immutable Ledger Tampering (Inventory Movement Update)**: Manager tries `UPDATE /organizations/org_1/movements/mov_1` -> `PERMISSION_DENIED`.
7. **Immutable Audit Log Deletion**: Owner tries `DELETE /organizations/org_1/auditLogs/log_1` -> `PERMISSION_DENIED`.
8. **ID Poisoning Attack**: Document ID contains 200 characters or invalid characters (`$`, `/`, spaces) -> `PERMISSION_DENIED`.
9. **Denial-of-Wallet String Overflow**: Ingredient `name` is a 10,000-character string (`maxLength` is 120) -> `PERMISSION_DENIED`.
10. **Self-Privilege Escalation on Member Record**: Staff user tries to update their own `/members/{uid}` `role` from `'staff'` to `'owner'` -> `PERMISSION_DENIED` (only organization owner/admin can write member roles).
11. **Orphaned Subcollection Write**: User attempts to write `/organizations/non_existent_org/tasks/task_1` -> `PERMISSION_DENIED` (Master Gate checks parent organization existence & membership).
12. **Negative Monetary Injection on Purchase Order**: User attempts to create a PurchaseOrder with `totalMinor: -50000` -> `PERMISSION_DENIED`.
