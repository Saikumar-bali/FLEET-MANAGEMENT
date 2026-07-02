# AI Run: User Profile Linking + Driver Portal Foundation

**Date**: 2026-06-30  
**Phase**: 16  
**Status**: Security-Hardened

## Summary

Implemented generic user-to-business-profile linking system and driver portal foundation APIs. Security hardening applied to remove unsafe self-create endpoint and enforce scope validation.

## What Was Built

### 1. UserProfileLink Model
- New Prisma model with enums (ProfileType, UserProfileLinkStatus)
- Supports 7 profile types: DRIVER, MECHANIC, EMPLOYEE, FINANCE, COLLECTOR, VENDOR_CONTACT, CUSTOMER_CONTACT
- Unique constraints prevent duplicate active links
- Primary link behavior per profile type

### 2. Backend Service
- Full CRUD operations for profile links
- Validation: user exists, profile exists, no duplicates, primary behavior
- Admin API (permission-gated) — self-create removed for security
- Audit logging for all mutations

### 3. Scope Validation (NEW)
- `user-profile-links.scope-validation.ts` — Validates actor scope for DRIVER link creation
- Actor must have `profile_link_create` permission AND DRIVER UPDATE/MANAGE scope
- super_admin bypasses scope checks
- GLOBAL/MANAGE data scope bypasses scope checks
- Non-DRIVER profile types restricted to super_admin (fail-closed)

### 4. Permissions
- profile_link_view, profile_link_create, profile_link_update, profile_link_delete, profile_link_revoke
- Granted to super_admin (all), admin (all), viewer (view only)

### 5. Driver Portal Foundation
- 6 API endpoints under /me/driver-*
- All scoped to linked driver profile only
- No cross-driver data access possible

### 6. My Access Integration
- /me/summary now includes profileLinks, primaryDriverProfile, profileTypes
- MyAccessPage displays linked profiles and primary driver

### 7. Scripts
- diagnose: Reports driver link status
- repair: Dry-run by default, idempotent, no auto user creation
- test (service-level): 21 test cases covering all scenarios
- test (API-level): 11 API endpoint tests for security validation

## Security Fixes Applied

### Critical Blocker Resolved
**Before**: Normal authenticated user could call `POST /api/v1/user-profile-links/me/profile-links` and self-link to any DRIVER profile, leaking other drivers' data through `/me/driver-*` APIs.

**After**:
1. **Self-create endpoint removed**: `POST /me/profile-links` returns 404
2. **User-scoped admin aliases added**: `POST /api/v1/users/:userId/profile-links`
3. **Actor/scope validation enforced**: DRIVER links require DRIVER UPDATE/MANAGE scope
4. **Cross-driver leak tested**: 11 API-level tests prove isolation

### Link Creation Authorization
- super_admin: can create any link (bypasses scope)
- Admin with GLOBAL/MANAGE scope: can create any link
- Admin with DRIVER scope: can create links for scoped drivers
- Admin without scope: CANNOT create DRIVER links
- Normal user: CANNOT self-create any links

## Safety Guarantees

- **No auto user creation**: Repair script only links existing users
- **No password generation**: Never generates or prints passwords
- **No secret printing**: All credentials handled securely
- **Dry-run repair**: Requires DRIVER_PROFILE_LINK_REPAIR_APPLY=true
- **No cross-driver data**: Driver portal APIs are isolated by design
- **Fail-closed**: Non-DRIVER profile types restricted to super_admin

## Test Results

| Check | Result |
|-------|--------|
| Backend build | PASS |
| Web build | PASS |
| API docs (126) | PASS |
| Account scope | PASS |
| Access smoke | PASS |
| Access diagnose | PASS |
| Module scope | PASS |
| Module scope API | PASS |
| User profile link (21) | PASS |
| User profile link API (11) | PASS |
| Profile link diagnose | PASS |

## Files Changed

### New Files
- backend/prisma/migrations/20260630000000_add_user_profile_links/migration.sql
- backend/src/modules/user-profile-links/user-profile-links.types.ts
- backend/src/modules/user-profile-links/user-profile-links.service.ts
- backend/src/modules/user-profile-links/user-profile-links.controller.ts
- backend/src/modules/user-profile-links/user-profile-links.routes.ts
- backend/src/modules/user-profile-links/user-profile-links-user-aliases.routes.ts
- backend/src/modules/user-profile-links/user-profile-links.scope-validation.ts
- backend/src/modules/user-profile-links/driver-portal.controller.ts
- backend/src/modules/user-profile-links/driver-portal.routes.ts
- backend/scripts/driver-profile-link-diagnose.ts
- backend/scripts/driver-profile-link-repair.ts
- backend/scripts/user-profile-link-test.ts
- backend/scripts/user-profile-link-api-test.ts
- docs/USER_PROFILE_LINKING.md
- docs/DRIVER_PORTAL_FOUNDATION.md
- docs/ai-runs/2026-06-30_user-profile-linking-driver-foundation.md

### Modified Files
- backend/prisma/schema.prisma (UserProfileLink model + enums)
- backend/src/constants/rbac.ts (permissions + role assignments)
- backend/src/app.ts (route registration + user-alias routes)
- backend/src/modules/access/access-permissions.controller.ts (profile links in summary)
- backend/src/docs/openapi.ts (API docs — removed self-create, added user aliases)
- backend/src/types/auth.ts (ProfileLinkRecord type)
- backend/package.json (test scripts)
- web/src/pages/MyAccessPage.tsx (profile links UI)
- web/src/types/auth.ts (ProfileLinkRecord type)

## Security Status Checklist

- Unsafe self-create endpoint removed: **YES**
- Normal users cannot self-link to drivers: **YES**
- /api/v1/users/:userId/profile-links aliases added: **YES**
- Actor/scope validation on profile link create: **YES**
- Admin without driver scope blocked: **YES**
- super_admin link allowed: **YES**
- Revoked link blocks /me/driver-profile: **YES**
- Driver portal cross-driver leak test: **YES**
- full E2E: **NO**
- deploy: **NO**
