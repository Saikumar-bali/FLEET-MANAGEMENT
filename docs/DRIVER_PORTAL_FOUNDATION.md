# Driver Portal Foundation

**Phase**: 16 — Driver Portal Foundation API  
**Status**: Foundation Complete (no dashboard UI yet)  
**Date**: 2026-06-30

## Overview

Foundation API endpoints for the driver portal. These endpoints return data scoped to the currently authenticated user's linked driver profile only.

## Prerequisites

- User must have an active `UserProfileLink` with `profileType: DRIVER`
- If no driver link exists, endpoints return 404 with clear message

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
- No data from other drivers is exposed
- No `user_view` permission required
- Cross-driver data access is impossible by design

## Status

- [x] Foundation APIs complete
- [ ] Full driver dashboard UI (not started — per instructions)
- [ ] Mobile app (not started — per instructions)
- [ ] Full E2E testing (not done)
