# User Profile Linking

**Phase**: 16 — Generic User/Profile Linking  
**Status**: Completed  
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
- Actor must have permission and scope to link

## API Endpoints

### Self API (authentication only)
- `GET /api/v1/me/profile-links` — List current user's profile links
- `POST /api/v1/me/profile-links` — Create profile link for current user

### Admin API (requires profile_link_* permissions)
- `GET /api/v1/user-profile-links` — List all profile links
- `GET /api/v1/user-profile-links/:id` — Get profile link by ID
- `GET /api/v1/user-profile-links/user/:userId` — Get links for a user
- `POST /api/v1/user-profile-links` — Create profile link
- `PATCH /api/v1/user-profile-links/:id` — Update profile link
- `PATCH /api/v1/user-profile-links/:id/revoke` — Revoke profile link
- `DELETE /api/v1/user-profile-links/:id` — Delete profile link

### Access Summary
- `GET /api/v1/access/me/summary` now includes:
  - `profileLinks` — All active profile links for current user
  - `primaryDriverProfile` — Primary driver profile details (if linked)
  - `profileTypes` — List of linked profile types

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

## Security

- No automatic user creation
- No password generation
- No secret printing
- Self API requires only authentication
- Admin APIs require specific permissions
- Audit logged for every create/update/revoke
