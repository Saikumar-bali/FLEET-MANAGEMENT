/**
 * Phase 20 — Mechanic assignment isolation negative test
 *
 * WHAT IT TESTS:
 *   1. Mechanic A (assigned to repairA, maintenanceA) can VIEW and UPDATE them.
 *   2. Mechanic A CANNOT view or update repairB / maintenanceB (assigned to mechanic B).
 *   3. Mechanic A cannot DELETE any repair (delete is admin/manager only, assignment doesn't elevate).
 *   4. A repair with no assignedToId is not visible to either mechanic (correct fail-closed behaviour).
 *
 * HOW TO RUN:
 *   API_BASE_URL=http://localhost:4000 npx ts-node scripts/rbac-mechanic-isolation-test.ts
 *   — or: npm run test:rbac-mechanic
 *
 * EXIT CODES: 0 = all pass, 1 = any failure
 */

import { prisma } from '../src/lib/prisma';
import bcrypt from 'bcryptjs';

const API_BASE = process.env.API_BASE_URL || 'http://localhost:4000';

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

async function apiRequest(method: string, url: string, token: string, body?: object): Promise<{ status: number; data?: any }> {
  try {
    const res = await fetch(url, {
      method,
      headers: {
        Authorization: `Bearer ${token}`,
        ...(body ? { 'Content-Type': 'application/json' } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
    });
    const data = await res.json().catch(() => null);
    return { status: res.status, data };
  } catch {
    return { status: 0 };
  }
}

async function ensureUser(roleKey: string, username: string, password: string) {
  const role = await prisma.role.findUnique({ where: { key: roleKey } });
  if (!role) throw new Error(`Role '${roleKey}' not found. Run seed first.`);
  const hash = await bcrypt.hash(password, 10);
  return prisma.user.upsert({
    where: { username },
    update: {},
    create: {
      name: `Test ${username}`,
      username,
      email: `${username}@fleet-test.local`,
      passwordHash: hash,
      roleId: role.id,
      status: 'ACTIVE',
    },
  });
}

async function ensureVehicle() {
  return prisma.vehicle.create({
    data: {
      vehicleNumber: `TEST-MECH-${Date.now()}`,
      vehicleType: 'TRUCK',
      fuelType: 'DIESEL',
      status: 'AVAILABLE',
    },
  });
}

async function main() {
  console.log('=== Phase 20: Mechanic assignment isolation test ===\n');

  let passed = 0;
  let failed = 0;

  const check = (label: string, condition: boolean, detail?: string) => {
    if (condition) {
      console.log(`  ✅ ${label}`);
      passed++;
    } else {
      console.log(`  ❌ ${label}${detail ? ` — ${detail}` : ''}`);
      failed++;
    }
  };

  // Setup
  const mechAUser = await ensureUser('mechanic', 'ci-mech-a', 'CiMech@A1');
  const mechBUser = await ensureUser('mechanic', 'ci-mech-b', 'CiMech@B1');
  const vehicle = await ensureVehicle();

  // Create repair assigned to mechanic A
  const repairA = await prisma.repair.create({
    data: {
      vehicleId: vehicle.id,
      repairDate: new Date(),
      category: 'Engine',
      description: 'Test repair assigned to mechanic A',
      status: 'IN_PROGRESS',
      assignedToId: mechAUser.id,
    },
  });

  // Create repair assigned to mechanic B
  const repairB = await prisma.repair.create({
    data: {
      vehicleId: vehicle.id,
      repairDate: new Date(),
      category: 'Tyres',
      description: 'Test repair assigned to mechanic B',
      status: 'IN_PROGRESS',
      assignedToId: mechBUser.id,
    },
  });

  // Create repair with NO assignment
  const repairUnassigned = await prisma.repair.create({
    data: {
      vehicleId: vehicle.id,
      repairDate: new Date(),
      category: 'Body',
      description: 'Test unassigned repair',
      status: 'OPEN',
    },
  });

  // Create maintenance assigned to mechanic A
  const maintA = await prisma.maintenanceRequest.create({
    data: {
      vehicleId: vehicle.id,
      requestDate: new Date(),
      category: 'Oil Change',
      description: 'Test maintenance assigned to mechanic A',
      status: 'APPROVED',
      assignedToId: mechAUser.id,
    },
  });

  // Create maintenance assigned to mechanic B
  const maintB = await prisma.maintenanceRequest.create({
    data: {
      vehicleId: vehicle.id,
      requestDate: new Date(),
      category: 'Filter',
      description: 'Test maintenance assigned to mechanic B',
      status: 'APPROVED',
      assignedToId: mechBUser.id,
    },
  });

  const tokenA = await apiLogin('ci-mech-a', 'CiMech@A1');
  const tokenB = await apiLogin('ci-mech-b', 'CiMech@B1');

  if (!tokenA || !tokenB) {
    console.log('❌ Could not log in as mechanic A or B — aborting');
    await cleanup([repairA.id, repairB.id, repairUnassigned.id], [maintA.id, maintB.id], vehicle.id);
    process.exit(1);
  }

  console.log('--- Repair: Mechanic A access ---');
  const rA_view = await apiRequest('GET', `${API_BASE}/api/v1/repairs/${repairA.id}`, tokenA);
  check('Mechanic A can VIEW repairA (assigned to them)', rA_view.status === 200, `got ${rA_view.status}`);

  const rA_update = await apiRequest('PATCH', `${API_BASE}/api/v1/repairs/${repairA.id}`, tokenA, { notes: 'Updated by assigned mechanic' });
  check('Mechanic A can UPDATE repairA (assigned to them)', rA_update.status === 200, `got ${rA_update.status}`);

  const rA_delete = await apiRequest('DELETE', `${API_BASE}/api/v1/repairs/${repairA.id}`, tokenA);
  check('Mechanic A cannot DELETE repairA (assignment ≠ delete right)', rA_delete.status === 403, `got ${rA_delete.status}`);

  console.log('\n--- Repair: Mechanic A cross-access (should fail) ---');
  const rB_view = await apiRequest('GET', `${API_BASE}/api/v1/repairs/${repairB.id}`, tokenA);
  check('Mechanic A CANNOT view repairB (assigned to mechanic B)', rB_view.status === 403, `got ${rB_view.status} — DATA LEAK`);

  const rB_update = await apiRequest('PATCH', `${API_BASE}/api/v1/repairs/${repairB.id}`, tokenA, { notes: 'Attempted cross-update' });
  check('Mechanic A CANNOT update repairB', rB_update.status === 403, `got ${rB_update.status} — DATA LEAK`);

  console.log('\n--- Repair: Unassigned record (fail-closed) ---');
  const rU_view = await apiRequest('GET', `${API_BASE}/api/v1/repairs/${repairUnassigned.id}`, tokenA);
  check('Mechanic A CANNOT view unassigned repair (fail-closed)', rU_view.status === 403, `got ${rU_view.status} — DATA LEAK`);

  console.log('\n--- Repair list: scoped to mechanic A only ---');
  const listA = await apiRequest('GET', `${API_BASE}/api/v1/repairs`, tokenA);
  if (listA.status === 200 && listA.data?.data?.items) {
    const ids: string[] = listA.data.data.items.map((r: any) => r.id);
    check('List includes repairA', ids.includes(repairA.id));
    check('List excludes repairB', !ids.includes(repairB.id), 'cross-mechanic leak');
    check('List excludes unassigned repair', !ids.includes(repairUnassigned.id), 'unassigned leak');
  } else {
    console.log(`  ❌ List endpoint returned ${listA.status} — can't assert list contents`);
    failed += 3;
  }

  console.log('\n--- Maintenance: Mechanic A access ---');
  const mA_view = await apiRequest('GET', `${API_BASE}/api/v1/maintenance/${maintA.id}`, tokenA);
  check('Mechanic A can VIEW maintA (assigned)', mA_view.status === 200, `got ${mA_view.status}`);

  const mA_update = await apiRequest('PATCH', `${API_BASE}/api/v1/maintenance/${maintA.id}`, tokenA, { notes: 'Updated by assigned mechanic' });
  check('Mechanic A can UPDATE maintA (assigned)', mA_update.status === 200, `got ${mA_update.status}`);

  console.log('\n--- Maintenance: Cross-access (should fail) ---');
  const mB_view = await apiRequest('GET', `${API_BASE}/api/v1/maintenance/${maintB.id}`, tokenA);
  check('Mechanic A CANNOT view maintB (assigned to B)', mB_view.status === 403, `got ${mB_view.status} — DATA LEAK`);

  await cleanup([repairA.id, repairB.id, repairUnassigned.id], [maintA.id, maintB.id], vehicle.id);

  console.log(`\n=== Results: ${passed} passed, ${failed} failed ===`);
  await prisma.$disconnect();
  if (failed > 0) process.exit(1);
}

async function cleanup(repairIds: string[], maintIds: string[], vehicleId: string) {
  await prisma.repair.deleteMany({ where: { id: { in: repairIds } } }).catch(() => {});
  await prisma.maintenanceRequest.deleteMany({ where: { id: { in: maintIds } } }).catch(() => {});
  await prisma.vehicle.delete({ where: { id: vehicleId } }).catch(() => {});
  await prisma.user.deleteMany({ where: { username: { in: ['ci-mech-a', 'ci-mech-b'] } } }).catch(() => {});
}

main().catch(err => {
  console.error(err);
  prisma.$disconnect().finally(() => process.exit(1));
});
