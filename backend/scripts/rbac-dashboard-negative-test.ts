/**
 * Phase 20 — Dashboard access-control negative test
 *
 * WHAT IT TESTS:
 *   • GET /api/v1/dashboard/overview now requires dashboard_view permission.
 *   • Roles that should NOT have it: driver, mechanic, collector, assistant_driver.
 *   • Roles that SHOULD have it: admin, manager, supervisor, viewer.
 *   • Unauthenticated request must return 401.
 *
 * HOW TO RUN (after `npx prisma migrate deploy` and server running):
 *   API_BASE_URL=http://localhost:4000 npx ts-node -e "require('./scripts/rbac-dashboard-negative-test.ts')"
 *   — or via the package.json script: npm run test:rbac-dashboard
 *
 * EXIT CODES:
 *   0 = all assertions passed
 *   1 = one or more failures (details printed to stdout)
 */

import { prisma } from '../src/lib/prisma';
import bcrypt from 'bcryptjs';

const API_BASE = process.env.API_BASE_URL || 'http://localhost:4000';
const DASHBOARD_ENDPOINT = `${API_BASE}/api/v1/dashboard/overview`;

async function apiLogin(identifier: string, password: string): Promise<string | null> {
  try {
    const res = await fetch(`${API_BASE}/api/v1/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ identifier, password }),
    });
    if (!res.ok) return null;
    const json = await res.json() as { data?: { accessToken?: string } };
    return json.data?.accessToken ?? null;
  } catch {
    return null;
  }
}

async function apiGet(url: string, token: string | null): Promise<number> {
  const headers: Record<string, string> = {};
  if (token) headers['Authorization'] = `Bearer ${token}`;
  try {
    const res = await fetch(url, { headers });
    return res.status;
  } catch {
    return 0;
  }
}

async function ensureUser(roleKey: string, username: string, password: string) {
  const role = await prisma.role.findUnique({ where: { key: roleKey } });
  if (!role) throw new Error(`Role '${roleKey}' not found in DB. Run seed first.`);
  const hash = await bcrypt.hash(password, 10);
  return prisma.user.upsert({
    where: { username },
    update: {},
    create: {
      name: `Test ${roleKey}`,
      username,
      email: `test-${username}@fleet-test.local`,
      passwordHash: hash,
      roleId: role.id,
      status: 'ACTIVE',
    },
  });
}

async function main() {
  console.log('=== Phase 20: Dashboard permission gate test ===\n');

  // Users that must be DENIED (403)
  const shouldBeDenied = [
    { roleKey: 'driver',           username: 'ci-dash-driver',    password: 'CiDash@driver1' },
    { roleKey: 'assistant_driver', username: 'ci-dash-asst',      password: 'CiDash@asst1' },
    { roleKey: 'mechanic',         username: 'ci-dash-mechanic',   password: 'CiDash@mech1' },
    { roleKey: 'collector',        username: 'ci-dash-collector',  password: 'CiDash@coll1' },
  ];

  // Users that must be ALLOWED (200)
  const shouldBeAllowed = [
    { roleKey: 'admin',      username: 'ci-dash-admin',   password: 'CiDash@admin1' },
    { roleKey: 'manager',    username: 'ci-dash-manager',  password: 'CiDash@mgr1' },
    { roleKey: 'supervisor', username: 'ci-dash-super',    password: 'CiDash@sup1' },
    { roleKey: 'viewer',     username: 'ci-dash-viewer',   password: 'CiDash@view1' },
  ];

  let passed = 0;
  let failed = 0;

  // 1. Unauthenticated
  const unauthStatus = await apiGet(DASHBOARD_ENDPOINT, null);
  if (unauthStatus === 401) {
    console.log(`  ✅ Unauthenticated → 401`);
    passed++;
  } else {
    console.log(`  ❌ Unauthenticated → expected 401, got ${unauthStatus}`);
    failed++;
  }

  // 2. Roles that must be blocked
  for (const u of shouldBeDenied) {
    await ensureUser(u.roleKey, u.username, u.password);
    const token = await apiLogin(u.username, u.password);
    if (!token) {
      console.log(`  ❌ [${u.roleKey}] Could not log in`);
      failed++;
      continue;
    }
    const status = await apiGet(DASHBOARD_ENDPOINT, token);
    if (status === 403) {
      console.log(`  ✅ [${u.roleKey}] dashboard_view DENIED → 403 (correct)`);
      passed++;
    } else {
      console.log(`  ❌ [${u.roleKey}] dashboard_view DENIED expected 403, got ${status} — DATA LEAK`);
      failed++;
    }
  }

  // 3. Roles that must be allowed
  for (const u of shouldBeAllowed) {
    await ensureUser(u.roleKey, u.username, u.password);
    const token = await apiLogin(u.username, u.password);
    if (!token) {
      console.log(`  ❌ [${u.roleKey}] Could not log in`);
      failed++;
      continue;
    }
    const status = await apiGet(DASHBOARD_ENDPOINT, token);
    if (status === 200) {
      console.log(`  ✅ [${u.roleKey}] dashboard_view ALLOWED → 200 (correct)`);
      passed++;
    } else {
      console.log(`  ❌ [${u.roleKey}] dashboard_view ALLOWED expected 200, got ${status} — OVER-BLOCKED`);
      failed++;
    }
  }

  console.log(`\n=== Results: ${passed} passed, ${failed} failed ===`);

  // Cleanup test users
  const testUsernames = [...shouldBeDenied, ...shouldBeAllowed].map(u => u.username);
  await prisma.user.deleteMany({ where: { username: { in: testUsernames } } });

  await prisma.$disconnect();
  if (failed > 0) process.exit(1);
}

main().catch(err => {
  console.error(err);
  prisma.$disconnect().finally(() => process.exit(1));
});
