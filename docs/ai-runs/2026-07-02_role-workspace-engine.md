# AI Run: Role Workspace Engine

**Date:** 2026-07-02
**Objective:** Create a professional Role Workspace Engine so every role gets a simple dynamic UI based on effective permissions, profile links, data scopes, role key, and active workspace type.

## Summary

- Created `GET /api/v1/me/workspace` endpoint
- Created shared workspace types (backend + frontend)
- Created frontend WorkspaceContext and useWorkspace hook
- Replaced sidebar to use workspace.navigation (no hardcoded role checks)
- Created role-specific home pages (Driver, Finance, Manager, Mechanic, Viewer, Admin)
- Created dynamic action registry (`web/src/config/actions.ts`)
- Created role templates (6 templates: Driver Basic, Driver Pool Vehicle, Manager Operations, Finance Billing, Mechanic Maintenance, Viewer Read Only)
- Created workspace engine test (10 tests)
- Updated CI script
- Created documentation

## Files Created

### Backend
- `backend/src/constants/workspace-types.ts` — workspace type definitions, navigation registry, capabilities
- `backend/src/services/workspace.service.ts` — workspace engine (type determination, capability building, navigation/action filtering)
- `backend/src/modules/workspace/workspace.controller.ts` — controller for /me/workspace
- `backend/src/modules/workspace/workspace.routes.ts` — route registration
- `backend/src/constants/role-templates.ts` — 6 role templates
- `backend/scripts/workspace-engine-test.ts` — 10 integration tests

### Frontend
- `web/src/types/workspace.ts` — workspace types mirroring backend
- `web/src/context/WorkspaceContext.tsx` — workspace provider (fetches on auth change)
- `web/src/hooks/useWorkspace.ts` — convenience hook
- `web/src/config/actions.ts` — action registry with capability filtering
- `web/src/pages/workspace/WorkspaceHome.tsx` — role-specific home pages

### Modified
- `backend/src/app.ts` — registered workspace routes
- `backend/package.json` — added test:workspace-engine script
- `web/src/services/api.ts` — added getMyWorkspace()
- `web/src/components/Sidebar.tsx` — uses workspace.navigation instead of accessSummary
- `web/src/app/App.tsx` — added WorkspaceProvider, workspace home route

### Docs
- `docs/ROLE_WORKSPACE_ENGINE.md`
- `docs/ROLE_TEMPLATES_AND_SIMPLE_UX.md`
- `docs/ai-runs/2026-07-02_role-workspace-engine.md`

## Key Decisions

- Workspace navigation is defined on the backend (in workspace-types.ts) and returned to the frontend, so the sidebar has zero role/permission logic
- Capabilities are derived from effective permissions + profile types, never from hardcoded role keys
- My Access moved from WORKSPACE navigation section to SETTINGS section
- Role templates are seeds/constants only — no UI integration yet
- Workspace home at `/` replaces the old DashboardPage; old dashboard still accessible at `/dashboard`

## Pending

- Role template UI in UsersPage (apply template dropdown)
- Playwright e2e test for role workspace UX
- GitHub Actions CI workflow update (manual)
