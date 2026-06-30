# User Profile Linking

**Phase**: 16 — Generic User/Profile Linking  
**Status**: Security-Hardened  
**Date**: 2026-06-30

## Overview

A generic, safe link between login accounts (User) and business profiles. This is **not driver-only** — Driver is only the first proof of the concept.

## Model

`UserProfileLink` connects a `User` to any business profile type:

| Field | Type | Description |
|-------|------|-------------|
| userId | String | References User |
| profileType | ProfileType | DRIVER, MECHANIC, EMPLOYEE, FINANCE, COLLECTOR, VENDOR_CONTACT, CUSTOMER_CONTACT |
| profileId | String | ID of the business profile |
| isPrimary | Boolean | Whether this is the primary link for this profile type |
| status | UserProfileLinkStatus | ACTIVE, INACTIVE, REVOKED |
| linkedById | String? | Who created the link |
| linkedAt | DateTime | When the link was created |
| unlinkedAt | DateTime? | When the link was revoked |
| metadata | Json? | Arbitrary metadata |

## Constraints

- **Unique active link**: One active link per userId + profileType + profileId
- **Primary per type**: Only one primary active link per userId + profileType
- **No duplicates**: Prevented at database level via unique constraint

## Validation Rules

- User must exist and be ACTIVE
- Profile must exist based on profileType/profileId mapping
- Cannot link to inactive profiles
- Duplicate active links rejected
- Setting isPrimary=true unsets previous primary for same userId/profileType
- **Actor must have permission and DRIVER scope to create DRIVER links**
- super_admin bypasses scope checks
- GLOBAL/MANAGE scope bypasses scope checks
- Non-DRIVER profile types restricted to super_admin until scope validation is implemented

## API Endpoints

### Self API (authentication only, read-only)
- `GET /api/v1/user-profile-links/me/profile-links` — List current user's profile links

**Note**: Self-create endpoint (`POST /api/v1/user-profile-links/me/profile-links`) has been REMOVED for security. Normal users cannot self-link to driver profiles.

### Admin API (requires profile_link_* permissions)
- `GET /api/v1/user-profile-links` — List all profile links (admin, requires profile_link_view)
- `GET /api/v1/user-profile-links/:id` — Get profile link by ID (admin, requires profile_link_view)
- `GET /api/v1/user-profile-links/user/:userId` — Get links for a user (admin, requires profile_link_view)
- `POST /api/v1/user-profile-links` — Create profile link (admin, requires profile_link_create)
- `PATCH /api/v1/user-profile-links/:id` — Update profile link (admin, requires profile_link_update)
- `PATCH /api/v1/user-profile-links/:id/revoke` — Revoke profile link (admin, requires profile_link_revoke)
- `DELETE /api/v1/user-profile-links/:id` — Delete profile link (admin, requires profile_link_delete)

### User-Scoped Admin Aliases
- `GET /api/v1/users/:userId/profile-links` — Get links for a user (requires profile_link_view)
- `POST /api/v1/users/:userId/profile-links` — Create link for a user (requires profile_link_create + scope)

### Access Summary
- `GET /api/v1/access/me/summary` now includes:
  - `profileLinks` — All active profile links for current user
  - `primaryDriverProfile` — Primary driver profile details (if linked)
  - `profileTypes` — List of linked profile types

## Security Model

### Link Creation Authorization
For DRIVER profile links, the actor must satisfy ALL of:
1. Have `profile_link_create` permission
2. Have DRIVER data scope (UPDATE or MANAGE level) on the target driver
3. OR be super_admin (bypasses all scope checks)
4. OR have GLOBAL/MANAGE data scope (bypasses all scope checks)

For non-DRIVER profile types:
- Restricted to super_admin only until scope validation is implemented
- Fail-closed approach: throws 403 for non-super_admin actors

### Cross-Driver Leak Prevention
- Normal users CANNOT self-create links to any profile
- Only authorized admins can create links
- Admins without DRIVER scope CANNOT link to drivers they don't have access to
- Driver portal APIs only return data for the ACTIVELY linked driver
- Revoked links immediately block portal access

## Permissions

| Key | Module | Action | Description |
|-----|--------|--------|-------------|
| profile_link_view | profile_link | view | View profile links |
| profile_link_create | profile_link | create | Create profile links |
| profile_link_update | profile_link | update | Update profile links |
| profile_link_delete | profile_link | delete | Delete profile links |
| profile_link_revoke | profile_link | revoke | Revoke profile links |

Granted to: super_admin (all), admin (all), viewer (view only)

## Diagnose Script

```bash
npm run profile-link:diagnose
```

Reports:
- Total drivers, users, and profile links
- Drivers with/without linked accounts
- Users linked to drivers
- Duplicate active links
- Broken links (missing driver or user)

## Repair Script

```bash
npm run profile-link:repair                    # Dry-run (default)
DRIVER_PROFILE_LINK_REPAIR_APPLY=true npm run profile-link:repair  # Apply
```

- Idempotent
- Only links existing users to existing drivers
- Matching by email/mobile/username only if clearly deterministic
- Does NOT create new users
- Does NOT generate passwords
- Does NOT print secrets
- Dry-run by default

## Tests

### Service-Level Tests (`test:user-profile-link`)
- Create, duplicate rejection, primary behavior, user isolation
- Revoked link blocks driver access
- Self-create endpoint removed (verified via source inspection)
- Scope validation module loads correctly

### API-Level Tests (`test:user-profile-link-api`)
- GET /me/profile-links returns only own links
- POST /me/profile-links returns 404 (unsafe endpoint removed)
- POST /users/:userId/profile-links requires permission
- Admin without DRIVER scope blocked from creating DRIVER link
- super_admin can link
- /me/driver-profile returns only linked driver
- /me/driver-trips does not return another driver's trips
- Revoked link blocks /me/driver-profile
- Duplicate active link rejected
- Primary link behavior works

## Security Status

- Unsafe self-create endpoint removed: **YES**
- Normal users cannot self-link to drivers: **YES**
- Admin link creation enforces DRIVER scope: **YES**
- Driver portal cross-driver leak tested: **YES**
