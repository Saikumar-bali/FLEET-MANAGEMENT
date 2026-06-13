# Phase 4 Deployment Gate 4: Build, Redeploy, Smoke Test Plan

## Overview

This gate covers: build verification, Vercel redeployment, staging smoke test with URL normalization fix, and documentation.

## Current State

- Branch: `phase-4-deployment-gate-4-build-redeploy-smoke`
- Latest commit: `be959e293832e18acc4d5549f678bf5115068d34`
- `.vercel` files NOT tracked (correct)
- Backend deploy URL: `https://fleet-management-backend-staging.vercel.app`
- Web deploy URL: `https://fleet-management-web-staging.vercel.app`

---

## 1. normalizeApiBase() Function Implementation

**File:** `backend/scripts/staging-api-smoke-test.ts`

Add this function after the existing helper functions (after line 23, before `requestJson`):

```typescript
function normalizeApiBase(raw: string): string {
  let base = raw.trim().replace(/\/+$/, '');
  if (/\/api\/v1$/i.test(base)) {
    base = base.slice(0, -('/api/v1'.length));
  }
  return base;
}
```

**Behavior:**
- `https://host` → `https://host` (no change)
- `https://host/api/v1` → `https://host` (strips suffix)
- `https://host/api/v1/` → `https://host` (strips trailing slash + suffix)
- `https://host/` → `https://host` (strips trailing slash)

---

## 2. All Places in staging-api-smoke-test.ts That Need Updating

### Change 1: Add normalizeApiBase call in main() (line ~48)

**Current:**
```typescript
const apiBase = process.env.API_BASE_URL;
```

**New:**
```typescript
const rawBase = process.env.API_BASE_URL;
if (!rawBase) {
  console.error('FAIL: API_BASE_URL environment variable is required');
  process.exit(1);
}
const apiBase = normalizeApiBase(rawBase);
```

This replaces the existing null check at lines 49-52.

### Change 2: All endpoint URL constructions remain unchanged

Since `apiBase` now always returns a clean base (e.g., `https://host`), all existing `${apiBase}/api/v1/...` patterns work correctly. No changes needed to individual endpoint calls.

**Lines that use `${apiBase}/api/v1/...` (NO changes needed):**
- Line 41: `${apiBase}/api/v1/auth/login`
- Line 73: `${apiBase}/api/v1/health`
- Line 80: `${apiBase}/api/v1/docs`
- Line 87: `${apiBase}/api/v1/docs/openapi.json`
- Line 105: `${apiBase}/api/v1/auth/me`
- Line 112: `${apiBase}/api/v1/users`
- Line 119: `${apiBase}/api/v1/roles`
- Line 126: `${apiBase}/api/v1/permissions`
- Line 133: `${apiBase}/api/v1/vehicles`
- Line 140: `${apiBase}/api/v1/drivers`
- Line 147: `${apiBase}/api/v1/assets`
- Line 154: `${apiBase}/api/v1/assets/categories`
- Line 161: `${apiBase}/api/v1/documents`
- Line 168: `${apiBase}/api/v1/trips`
- Line 175: `${apiBase}/api/v1/users`
- Line 184: `${apiBase}/api/v1/vehicles` (POST)
- Line 198: `${apiBase}/api/v1/drivers` (POST)
- Line 211: `${apiBase}/api/v1/trips` (POST)
- Line 220: `${apiBase}/api/v1/trips/${trip.id}/schedule`
- Line 230: `${apiBase}/api/v1/trips/${trip.id}/start`
- Line 240: `${apiBase}/api/v1/trips/${trip.id}/complete`
- Line 251: `${apiBase}/api/v1/trips/${trip.id}/history`
- Line 264: `${apiBase}/api/v1/trips/${tripId}/cancel`
- Line 272: `${apiBase}/api/v1/vehicles/${vId}/status`
- Line 280: `${apiBase}/api/v1/drivers/${dId}/status`
- Line 291: `${apiBase}/api/v1/trips/${tripId}/cancel`

---

## 3. Step-by-Step Execution Order for Gate 4

### Step 1: Fix normalizeApiBase in staging-api-smoke-test.ts
1. Add `normalizeApiBase()` function
2. Update `main()` to use `normalizeApiBase(rawBase)`
3. Remove the duplicate null check (now handled in the new block)

### Step 2: Backend Build Verification
```bash
npm run backend:lint
npm run backend:build
```
- Note: `prisma generate` may fail on Windows (EPERM on `query_engine-windows.dll.node`)
- `tsc` compilation is the actual code correctness check
- Document the result honestly

### Step 3: Web Build Verification
```bash
npm run web:lint
npm run web:build
```

### Step 4: Local Smoke Test (Optional - if backend runs locally)
```bash
# Start backend locally
npm run backend:dev

# Run staging smoke test against local
API_BASE_URL=http://127.0.0.1:4000 E2E_ADMIN_IDENTIFIER=admin E2E_ADMIN_PASSWORD=<password> npx tsx backend/scripts/staging-api-smoke-test.ts
```

### Step 5: Vercel Backend Redeploy
```bash
cd backend
vercel --prod
```
- Wait for deployment to complete
- Note the deployment URL

### Step 6: Vercel Web Redeploy
```bash
cd web
vercel --prod
```
- Ensure `VITE_API_URL` is set to backend URL

### Step 7: Staging Smoke Test
```bash
API_BASE_URL=https://fleet-management-backend-staging.vercel.app \
E2E_ADMIN_IDENTIFIER=admin \
E2E_ADMIN_PASSWORD=<password> \
npx tsx backend/scripts/staging-api-smoke-test.ts
```

**Test both URL forms to verify normalization:**
```bash
# Form 1: with /api/v1 suffix (should be stripped)
API_BASE_URL=https://fleet-management-backend-staging.vercel.app/api/v1 ...

# Form 2: without suffix (should work as-is)
API_BASE_URL=https://fleet-management-backend-staging.vercel.app ...
```

### Step 8: Documentation
1. Create `docs/PHASE_4_DEPLOYMENT_GATE_4_EVIDENCE.md`
2. Update `progress.md` with Gate 4 completion
3. Update `tasks.md` if needed

### Step 9: Git Commit and PR
```bash
git add backend/scripts/staging-api-smoke-test.ts
git add docs/PHASE_4_DEPLOYMENT_GATE_4_EVIDENCE.md
git add progress.md
git commit -m "Phase 4 Deployment Gate 4: fix smoke test URL normalization, rebuild, redeploy"
git push origin phase-4-deployment-gate-4-build-redeploy-smoke
```

---

## 4. Documentation Files Content

### docs/PHASE_4_DEPLOYMENT_GATE_4_EVIDENCE.md

```markdown
# Phase 4 Deployment Gate 4 Evidence

## Summary

Gate 4 verifies: backend build, Vercel redeployment, staging smoke test with
URL normalization fix.

## Build Verification

### Backend

- `npm run backend:lint`: PASS/FAIL (exit code)
- `npm run backend:build`: PASS/FAIL (exit code)
- Note: `prisma generate` EPERM on Windows is a known environment issue, not code

### Web

- `npm run web:lint`: PASS/FAIL (exit code)
- `npm run web:build`: PASS/FAIL (exit code)

## URL Normalization Fix

**Problem:** If user passes `API_BASE_URL=https://host/api/v1`, the smoke test
constructs `https://host/api/v1/api/v1/health` (double `/api/v1`).

**Solution:** Added `normalizeApiBase()` that strips trailing `/api/v1` suffix.

**Verification:** Tested with both URL forms:
- `https://host/api/v1` → `https://host` ✓
- `https://host` → `https://host` ✓

## Vercel Redeployment

### Backend

- Deployment URL: `https://fleet-management-backend-staging.vercel.app`
- Deployment status: SUCCESS/FAILED
- Deployment timestamp: YYYY-MM-DD HH:MM UTC

### Web

- Deployment URL: `https://fleet-management-web-staging.vercel.app`
- Deployment status: SUCCESS/FAILED
- Deployment timestamp: YYYY-MM-DD HH:MM UTC

## Staging Smoke Test Results

**Command:**
\`\`\`bash
API_BASE_URL=https://fleet-management-backend-staging.vercel.app \
E2E_ADMIN_IDENTIFIER=admin \
E2E_ADMIN_PASSWORD=*** \
npx tsx backend/scripts/staging-api-smoke-test.ts
\`\`\`

**Results:**

| Check | Status | HTTP Status |
|-------|--------|-------------|
| GET /health | PASS/FAIL | 200 |
| GET /docs | PASS/FAIL | 200 |
| GET /docs/openapi.json | PASS/FAIL | 200 |
| POST /auth/login | PASS/FAIL | 200 |
| GET /auth/me | PASS/FAIL | 200 |
| GET /users | PASS/FAIL | 200 |
| GET /roles | PASS/FAIL | 200 |
| GET /permissions | PASS/FAIL | 200 |
| GET /vehicles | PASS/FAIL | 200 |
| GET /drivers | PASS/FAIL | 200 |
| GET /assets | PASS/FAIL | 200 |
| GET /assets/categories | PASS/FAIL | 200 |
| GET /documents | PASS/FAIL | 200/403 |
| GET /trips | PASS/FAIL | 200 |
| POST /vehicles (create) | PASS/FAIL | 201 |
| POST /drivers (create) | PASS/FAIL | 201 |
| POST /trips (create) | PASS/FAIL | 201 |
| POST /trips/:id/schedule | PASS/FAIL | 200 |
| POST /trips/:id/start | PASS/FAIL | 200 |
| POST /trips/:id/complete | PASS/FAIL | 200 |
| GET /trips/:id/history | PASS/FAIL | 200 |
| GET /users without token returns 401 | PASS/FAIL | 401 |

**Summary:** X passed, Y failed, Z skipped

## Cleanup

- All TEST-E2E vehicles reset to AVAILABLE
- All TEST-E2E drivers reset to AVAILABLE
- All started trips cancelled

## Conclusion

Gate 4: PASS/FAIL

- [ ] Backend build passes
- [ ] Web build passes
- [ ] Vercel backend redeployed
- [ ] Vercel web redeployed
- [ ] Staging smoke test passes
- [ ] URL normalization works correctly
- [ ] No secrets committed
```

### progress.md Update

Add to the Phase Progress table:

```markdown
| Phase 4 Deployment Gate 4 | Build, Redeploy, Smoke Test | Completed |
```

Add to Implementation Log:

```markdown
### YYYY-MM-DD (Phase 4 Deployment Gate 4 — Build, Redeploy, Smoke Test)

**URL normalization fix:**
- Added `normalizeApiBase()` to `staging-api-smoke-test.ts`
- Strips trailing `/api/v1` suffix from `API_BASE_URL`
- Prevents double `/api/v1/api/v1/...` when user passes full path

**Build verification:**
- `npm run backend:lint`: PASS/FAIL
- `npm run backend:build`: PASS/FAIL
- `npm run web:lint`: PASS/FAIL
- `npm run web:build`: PASS/FAIL

**Vercel redeployment:**
- Backend redeployed: SUCCESS/FAILED
- Web redeployed: SUCCESS/FAILED

**Staging smoke test:**
- X passed, Y failed, Z skipped
- All core endpoints verified
- Cleanup completed

**Verification:**
- No secrets committed
- `.vercel/` not tracked
- Mobile status: not modified
```

---

## 5. Key Implementation Notes

### normalizeApiBase Edge Cases

| Input | Output | Notes |
|-------|--------|-------|
| `https://host` | `https://host` | No change |
| `https://host/` | `https://host` | Strip trailing slash |
| `https://host/api/v1` | `https://host` | Strip suffix |
| `https://host/api/v1/` | `https://host` | Strip suffix + slash |
| `https://host/api/v1/extra` | `https://host/api/v1/extra` | No match, keep as-is |
| `https://HOST/API/V1` | `https://HOST` | Case-insensitive match |

### Windows Build Issue

The `prisma generate` EPERM error on Windows is a known environment issue:
- The `query_engine-windows.dll.node` file gets locked
- This is NOT a code issue
- `tsc` compilation is the actual correctness check
- Document honestly in evidence file

### Vercel Deployment

- `.vercel/` is in `.gitignore` (correct)
- Only `vercel.json` config files are tracked
- Use `vercel --prod` for production-like staging deploys
- Ensure environment variables are set in Vercel dashboard

---

## 6. Risk Mitigation

1. **URL normalization regression:** Test both URL forms explicitly
2. **Build failure:** Document honestly, note Windows EPERM is environment-specific
3. **Deployment failure:** Check Vercel logs, verify env vars
4. **Smoke test failure:** Check backend health first, verify DB connection

---

## 7. Success Criteria

- [ ] `normalizeApiBase()` added and works correctly
- [ ] Backend lint passes
- [ ] Backend build passes (tsc compiles)
- [ ] Web lint passes
- [ ] Web build passes
- [ ] Backend redeployed to Vercel
- [ ] Web redeployed to Vercel
- [ ] Staging smoke test passes (all core endpoints)
- [ ] URL normalization verified with both input forms
- [ ] Evidence documentation created
- [ ] progress.md updated
- [ ] No secrets committed
- [ ] `.vercel/` not tracked
