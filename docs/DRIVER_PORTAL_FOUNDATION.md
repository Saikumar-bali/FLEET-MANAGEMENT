# Driver Portal Foundation

**Phase**: 16 — Driver Portal Foundation API  
**Status**: Security-Hardened Foundation (no dashboard UI yet)  
**Date**: 2026-06-30

## Overview

Foundation API endpoints for the driver portal. These endpoints return data scoped to the currently authenticated user's linked driver profile only.

## Prerequisites

- User must have an active `UserProfileLink` with `profileType: DRIVER`
- Link must have been created by an authorized admin (NOT self-created)
- If no driver link exists, endpoints return 404 with clear message
- If link is revoked, endpoints return 404

## Endpoints

### GET /api/v1/me/driver-profile
Returns the linked driver profile.

**Response**: Driver object with name, mobile, status, etc.

### GET /api/v1/me/driver-trips
Returns trips assigned to the linked driver.

**Query params**: `page`, `limit`  
**Response**: Paginated trips with vehicle and driver info.

### GET /api/v1/me/driver-vehicles
Returns vehicles associated with the linked driver (current assignment + historical trips).

**Response**: Array of vehicles.

### GET /api/v1/me/driver-documents
Returns active documents linked to the linked driver.

**Query params**: `page`, `limit`  
**Response**: Paginated documents.

### GET /api/v1/me/driver-fuel
Returns fuel entries for the linked driver.

**Query params**: `page`, `limit`  
**Response**: Paginated fuel entries with vehicle info.

### GET /api/v1/me/driver-expenses
Returns expenses for the linked driver.

**Query params**: `page`, `limit`  
**Response**: Paginated expenses with vehicle info.

## Security

- All endpoints require authentication (JWT)
- All endpoints use `getDriverIdForUser()` to resolve the linked driver
- Data depends on active `UserProfileLink` with `profileType: DRIVER`
- Revoked links stop access (returns 404)
- No data from other drivers is exposed
- No `user_view` permission required
- Cross-driver data access prevented by:
  - Removing self-create endpoint (users cannot self-link)
  - Admin scope validation (admins need DRIVER scope)
  - Link resolution uses only the authenticated user's active links
  - Revoked links immediately block portal access

## Cross-Driver Leak Prevention

The following attack vectors have been tested and blocked:

1. **Normal user self-linking**: `POST /api/v1/user-profile-links/me/profile-links` removed (404)
2. **Forged link via self-create**: Impossible — endpoint removed
3. **Cross-driver data via portal**: `/me/driver-*` APIs only return data for linked driver
4. **Revoked link access**: `/me/driver-profile` returns 404 when all links revoked
5. **Admin without scope**: Admins without DRIVER data scope cannot create links

## Status

- [x] Foundation APIs complete
- [x] Security: self-create endpoint removed
- [x] Security: admin scope validation enforced
- [x] Security: cross-driver leak tested
- [ ] Full driver dashboard UI (not started — per instructions)
- [ ] Mobile app (not started — per instructions)
- [ ] Full E2E testing (not done)
