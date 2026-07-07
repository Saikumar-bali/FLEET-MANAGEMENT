# App-wide Performance Root Cause Fix

## Problem

Chrome DevTools showed slow API calls across the application, not only one page. Requests such as `/dashboard/overview` and `/me/notifications/unread-count` were taking many seconds, and repeated unread-count requests stayed pending together.

## Root cause

The slow behavior was caused by a combination of global request pressure and backend/database work:

1. The app layout polled notification unread count every 12 seconds on every protected page.
2. Notification UI could request notification list and unread count back-to-back.
3. Repeated React effects and user focus/click actions could start duplicate in-flight API requests.
4. Dashboard overview performs many count, aggregate, groupBy, and recent-record reads in one endpoint.
5. RBAC effective-permission calculation was recomputed repeatedly in authenticated request flows.
6. High-frequency notification, workspace, and dashboard queries were missing targeted indexes.

## Changes made

### Frontend request pressure

- Increased global alert-count polling from 12 seconds to 60 seconds.
- Added an in-flight guard to `AppLayout` so unread-count cannot stack pending requests.
- Added a stale window so focus/click events do not refetch immediately after a recent count.
- Changed `NotificationBell` to lazy-load notifications only when opened.
- Changed `NotificationBell` to use `/me/notifications` for both list and unread count.
- Added in-flight request dedupe inside `web/src/services/notifications.ts`.

### Backend notification optimization

- `/me/notifications` now returns `items` and `unreadCount` together.
- The unread-count query is centralized so the list endpoint and count endpoint share one implementation.
- Added partial indexes for unread and unarchived notification lookups.

### Backend request visibility

- Added safe API request timing middleware.
- Logs method, path, status, and duration only.
- Does not log Authorization headers, tokens, passwords, request bodies, or query params.
- In production, timing logs require `API_TIMING_LOGS=true`.

### RBAC optimization

- Added a short in-memory cache for effective permissions.
- Cache is keyed by user id and bypassed in test mode.
- This reduces repeated permission database reads during normal authenticated navigation.

### Dashboard optimization

- Added a short per-actor dashboard overview cache.
- Cache key includes user id, role key, effective permissions, and data scopes so scoped users do not share dashboard data.
- Cache is bypassed in test mode.

### Database indexes

Added migration:

`backend/prisma/migrations/20260707000000_app_wide_performance_indexes/migration.sql`

Indexes target high-frequency filters used by:

- notifications
- workspace/profile links
- user data scopes
- dashboard counts and aggregates
- trips
- vehicles
- drivers
- fuel
- expenses
- maintenance
- repairs
- documents
- compliance documents

## Files changed

- `web/src/layouts/AppLayout.tsx`
- `web/src/components/notifications/NotificationBell.tsx`
- `web/src/services/notifications.ts`
- `backend/src/modules/notifications/notifications.service.ts`
- `backend/src/modules/access/effective-permissions.service.ts`
- `backend/src/modules/dashboard/dashboard.service.ts`
- `backend/src/middlewares/requestTiming.ts`
- `backend/src/app.ts`
- `backend/prisma/migrations/20260707000000_app_wide_performance_indexes/migration.sql`

## How to verify

Run backend and web locally, then use Chrome DevTools Network tab:

1. Login.
2. Navigate across multiple pages.
3. Confirm `/me/notifications/unread-count` does not stack multiple pending requests.
4. Confirm `/me/notifications` returns both `items` and `unreadCount`.
5. Confirm repeated `/dashboard/overview` calls within the cache window are faster.
6. Watch backend logs for `[api]` slow route timing.

Recommended commands:

```bash
npm run backend:lint
npm run backend:build
npm run web:lint
npm run web:build
npm --prefix backend run test:api-docs
```

## Remaining bottlenecks

This fix reduces app-wide request storms and repeated backend work. If first-load `/dashboard/overview` is still slow, the next step is to split dashboard into:

- fast summary cards
- lazy finance summary
- lazy document summary
- lazy compliance summary
- lazy recent activity

That split is larger UI/API work and should be a separate performance phase after this branch is tested.
