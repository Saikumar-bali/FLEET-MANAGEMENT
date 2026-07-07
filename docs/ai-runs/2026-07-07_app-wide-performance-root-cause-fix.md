# AI Run: App-wide Performance Root Cause Fix

Date: 2026-07-07
Branch: `perf-root-cause-fix`

## Goal

Reduce app-wide API slowness caused by repeated global requests, notification polling, repeated permission reads, and dashboard aggregation pressure.

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
- `docs/APP_WIDE_PERFORMANCE_ROOT_CAUSE.md`

## Implemented

- Increased notification polling interval to 60 seconds.
- Added in-flight guard for global unread-count requests.
- Added stale-window protection for focus/click refetches.
- Lazy-loaded notification drawer data.
- Combined notification list and unread count in one backend response.
- Added notification service request dedupe.
- Added short effective-permissions cache.
- Added short per-actor dashboard overview cache.
- Added safe API timing middleware.
- Added database indexes for frequent notification, workspace, dashboard, and list filters.

## Verification

Not run in this connector environment. Run locally after pulling:

```bash
npm run backend:lint
npm run backend:build
npm run web:lint
npm run web:build
npm --prefix backend run test:api-docs
```

Then verify in browser DevTools:

- Login and navigate across multiple pages.
- Check that unread-count requests do not stack as pending.
- Check that `/me/notifications` returns both `items` and `unreadCount`.
- Check that repeated `/dashboard/overview` within the cache window is faster.

## Deployment

- Vercel deployment: NO
- Main branch push: NO
- New product feature work: NO
