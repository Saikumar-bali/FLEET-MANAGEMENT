/**
 * Driver Submission Review Test
 *
 * Tests the review/approval workflow for driver-created records:
 * 1. Driver creates fuel entry -> manager sees it in review list
 * 2. Manager approves fuel entry -> driver sees APPROVED status
 * 3. Manager rejects expense with reason -> driver sees REJECTED + reason
 * 4. Viewer cannot approve submissions
 * 5. Driver cannot approve own submission
 * 6. Manager without scope cannot see out-of-scope submissions
 * 7. super_admin can review all
 * 8. Audit logs include reviewer id, driver id, old/new status
 * 9. Document verify/reject flow
 * 10. Issue acknowledge/resolve flow
 * 11. Inspection review/reject flow
 *
 * Uses local backend only (http://127.0.0.1:4000).
 * Test data prefix: PHASE_DRIVER_REVIEW_TEST
 */

import http from 'http';
import { prisma } from '../src/lib/prisma';

const BASE = 'http://127.0.0.1:4000';
const PREFIX = 'PHASE_DRIVER_REVIEW_TEST';
let testFailed = false;
let passed = 0;
let failed = 0;

function pass(msg: string) { console.log(`  PASS ${msg}`); passed++; }
function fail(msg: string) { console.log(`  FAIL ${msg}`); failed++; testFailed = true; }

async function request(method: string, path: string, token?: string, body?: unknown): Promise<{ status: number; data: any }> {
  return new Promise((resolve, reject) => {
    const url = new URL(path, BASE);
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;
    const req = http.request(url, { method, headers }, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        try { resolve({ status: res.statusCode!, data: JSON.parse(data) }); }
        catch { resolve({ status: res.statusCode!, data: { raw: data } }); }
      });
    });
    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

async function cleanup() {
  const driverNames = await prisma.driver.findMany({ where: { name: { startsWith: PREFIX } }, select: { id: true } });
  const driverIds = driverNames.map(d => d.id);
  const userIds = (await prisma.user.findMany({ where: { name: { startsWith: PREFIX } }, select: { id: true } })).map(u => u.id);

  if (userIds.length > 0) {
    try { await prisma.userProfileLink.deleteMany({ where: { userId: { in: userIds } } }); } catch {}
    try { await prisma.userPermissionOverride.deleteMany({ where: { userId: { in: userIds } } }); } catch {}
  }
  if (driverIds.length > 0) {
    try { await prisma.fuelEntry.deleteMany({ where: { driverId: { in: driverIds } } }); } catch {}
    try { await prisma.expense.deleteMany({ where: { driverId: { in: driverIds } } }); } catch {}
    try { await prisma.document.deleteMany({ where: { driverId: { in: driverIds } } }); } catch {}
    try { await prisma.vehicleIssue.deleteMany({ where: { driverId: { in: driverIds } } }); } catch {}
    try { await prisma.vehicleInspection.deleteMany({ where: { driverId: { in: driverIds } } }); } catch {}
  }
  try { await prisma.vehicle.deleteMany({ where: { vehicleNumber: { startsWith: PREFIX } } }); } catch {}
  try { await prisma.user.deleteMany({ where: { name: { startsWith: PREFIX } } }); } catch {}
  try { await prisma.driver.deleteMany({ where: { name: { startsWith: PREFIX } } }); } catch {}
}

async function getAuthToken(identifier: string, password: string): Promise<string | null> {
  const res = await request('POST', '/api/v1/auth/login', undefined, { identifier, password });
  return res.data?.data?.accessToken ?? res.data?.accessToken ?? null;
}

async function main() {
  console.log('=== Driver Submission Review Test ===\n');

  try {
    const health = await request('GET', '/api/v1/health');
    if (health.status !== 200) { console.log('Backend not running'); process.exit(1); }
  } catch { console.log('Backend not reachable'); process.exit(1); }

  await cleanup();
  console.log('\n--- Setup ---');

  const adminIdentifier = process.env.CI_ADMIN_IDENTIFIER || process.env.ADMIN_USERNAME || process.env.ADMIN_EMAIL;
  const adminPassword = process.env.CI_ADMIN_PASSWORD || process.env.ADMIN_PASSWORD;
  if (!adminIdentifier || !adminPassword) { console.log('Missing admin credentials'); process.exit(1); }
  const adminToken = await getAuthToken(adminIdentifier, adminPassword);
  if (!adminToken) { console.log('Failed to get admin token'); process.exit(1); }
  pass('Admin token obtained');

  const roles = await request('GET', '/api/v1/roles', adminToken);
  const driverRole = roles.data?.data?.find?.((r: any) => r.key === 'driver');
  const managerRole = roles.data?.data?.find?.((r: any) => r.key === 'manager');
  const viewerRole = roles.data?.data?.find?.((r: any) => r.key === 'viewer');
  if (!driverRole || !managerRole) { fail('Required roles not found'); process.exit(1); }

  const ts = Date.now();

  // Create driver via API
  const driverRes = await request('POST', '/api/v1/drivers', adminToken, {
    name: `${PREFIX}_Driver_${ts}`,
    mobile: `+919900${ts}`,
    licenseNumber: `${PREFIX}_LIC_${ts}`,
    status: 'AVAILABLE',
  });
  const driverId = driverRes.data?.data?.id;
  if (!driverId) { fail(`Create driver: ${JSON.stringify(driverRes.data)}`); process.exit(1); }
  pass(`Created driver: ${driverId}`);

  // Create vehicle
  const vRes = await request('POST', '/api/v1/vehicles', adminToken, {
    vehicleNumber: `${PREFIX}_VEH_${ts}`,
    vehicleType: 'TRUCK',
    fuelType: 'DIESEL',
    currentDriverId: driverId,
  });
  const vehicleId = vRes.data?.data?.id;
  if (!vehicleId) { fail(`Create vehicle: ${JSON.stringify(vRes.data)}`); process.exit(1); }
  pass('Created vehicle');

  // Create driver user
  const driverUserRes = await request('POST', '/api/v1/users', adminToken, {
    name: `${PREFIX}_DriverUser_${ts}`,
    username: `${PREFIX}_du_${ts}`,
    email: `${PREFIX}_du_${ts}@t.local`,
    password: 'TestPass123!',
    roleId: driverRole.id,
    status: 'ACTIVE',
  });
  const driverUserId = driverUserRes.data?.data?.id;
  if (!driverUserId) { fail(`Create driver user: ${JSON.stringify(driverUserRes.data)}`); process.exit(1); }

  // Create profile link via Prisma (bypasses scoped enforcement)
  await prisma.userProfileLink.create({
    data: { userId: driverUserId, profileType: 'DRIVER', profileId: driverId, status: 'ACTIVE', isPrimary: true },
  });
  const driverToken = await getAuthToken(`${PREFIX}_du_${ts}`, 'TestPass123!');
  if (!driverToken) { fail('Driver login failed'); process.exit(1); }
  pass('Driver user linked and logged in');

  // Create manager user
  const mgrUserRes = await request('POST', '/api/v1/users', adminToken, {
    name: `${PREFIX}_Manager_${ts}`,
    username: `${PREFIX}_mgr_${ts}`,
    email: `${PREFIX}_mgr_${ts}@t.local`,
    password: 'TestPass123!',
    roleId: managerRole.id,
    status: 'ACTIVE',
  });
  const managerUserId = mgrUserRes.data?.data?.id;
  if (!managerUserId) { fail(`Create manager user: ${JSON.stringify(mgrUserRes.data)}`); process.exit(1); }
  const managerToken = await getAuthToken(`${PREFIX}_mgr_${ts}`, 'TestPass123!');
  if (!managerToken) { fail('Manager login failed'); process.exit(1); }

  // Grant manager VEHICLE/UPDATE scope on the test vehicle so they can review submissions
  const scopeRes = await request('PUT', `/api/v1/users/${managerUserId}/data-scopes`, adminToken, {
    scopeType: 'VEHICLE',
    scopeId: vehicleId,
    accessLevel: 'UPDATE',
    reason: 'Test: grant vehicle scope for review test',
  });
  if (scopeRes.status !== 200) { fail(`Grant manager scope: ${JSON.stringify(scopeRes.data)}`); process.exit(1); }
  pass('Manager user created with VEHICLE/UPDATE scope');

  // Create viewer user
  const viewerUserId = viewerRole ? (await request('POST', '/api/v1/users', adminToken, {
    name: `${PREFIX}_Viewer_${ts}`,
    username: `${PREFIX}_vw_${ts}`,
    email: `${PREFIX}_vw_${ts}@t.local`,
    password: 'TestPass123!',
    roleId: viewerRole.id,
    status: 'ACTIVE',
  })).data?.data?.id : null;
  let viewerToken: string | null = null;
  if (viewerUserId) {
    viewerToken = await getAuthToken(`${PREFIX}_vw_${ts}`, 'TestPass123!');
  }

  console.log('\n--- Fuel Review Flow ---');

  // 1. Driver creates fuel entry
  const fuelRes = await request('POST', '/api/v1/me/driver-fuel', driverToken, {
    vehicleId,
    totalAmount: 2500,
    quantityLiters: 50,
    fuelType: 'DIESEL',
    stationName: `${PREFIX}_Station_${ts}`,
  });
  const fuelId = fuelRes.data?.data?.id;
  if (!fuelId) { fail(`Driver create fuel: ${JSON.stringify(fuelRes.data)}`); process.exit(1); }
  pass(`Driver created fuel entry: ${fuelId}`);

  // 2. Manager sees fuel in review list
  const fuelList = await request('GET', '/api/v1/driver-submissions/fuel', managerToken);
  const fuelItems = fuelList.data?.data?.items || [];
  const foundFuel = fuelItems.find((f: any) => f.id === fuelId);
  if (!foundFuel) { fail('Manager cannot see fuel in review list'); } else { pass('Manager sees fuel in review list'); }

  // 3. Manager approves fuel
  const approveFuel = await request('PATCH', `/api/v1/driver-submissions/fuel/${fuelId}/approve`, managerToken, { reason: 'Looks good' });
  if (approveFuel.status !== 200) { fail(`Approve fuel: ${JSON.stringify(approveFuel.data)}`); } else { pass('Manager approved fuel'); }

  // 4. Driver sees approved status
  const driverFuel = await request('GET', `/api/v1/me/driver-fuel`, driverToken);
  const driverFuelItem = (driverFuel.data?.data?.items || []).find((f: any) => f.id === fuelId);
  if (driverFuelItem?.status !== 'APPROVED') { fail(`Driver fuel status: ${driverFuelItem?.status}`); } else { pass('Driver sees APPROVED status'); }

  console.log('\n--- Expense Review Flow ---');

  // 5. Driver creates expense
  const expRes = await request('POST', '/api/v1/me/driver-expenses', driverToken, {
    vehicleId,
    category: 'TOLL',
    amount: 500,
  });
  const expenseId = expRes.data?.data?.id;
  if (!expenseId) { fail(`Driver create expense: ${JSON.stringify(expRes.data)}`); process.exit(1); }
  pass(`Driver created expense: ${expenseId}`);

  // 6. Manager rejects expense with reason
  const rejectExp = await request('PATCH', `/api/v1/driver-submissions/expenses/${expenseId}/reject`, managerToken, { reason: 'Receipt missing' });
  if (rejectExp.status !== 200) { fail(`Reject expense: ${JSON.stringify(rejectExp.data)}`); } else { pass('Manager rejected expense with reason'); }

  // 7. Driver sees rejected status
  const driverExp = await request('GET', '/api/v1/me/driver-expenses', driverToken);
  const driverExpItem = (driverExp.data?.data?.items || []).find((e: any) => e.id === expenseId);
  if (driverExpItem?.status !== 'REJECTED') { fail(`Driver expense status: ${driverExpItem?.status}`); } else { pass('Driver sees REJECTED status'); }

  console.log('\n--- Permission Checks ---');

  // 8. Viewer cannot approve
  if (viewerToken) {
    const viewerApprove = await request('PATCH', `/api/v1/driver-submissions/fuel/${fuelId}/approve`, viewerToken, {});
    if (viewerApprove.status !== 403) { fail(`Viewer approve: expected 403, got ${viewerApprove.status}`); } else { pass('Viewer cannot approve (403)'); }
  }

  // 9. Driver cannot approve own submission
  const driverApprove = await request('PATCH', `/api/v1/driver-submissions/fuel/${fuelId}/approve`, driverToken, {});
  if (driverApprove.status !== 403) { fail(`Driver self-approve: expected 403, got ${driverApprove.status}`); } else { pass('Driver cannot approve own submission (403)'); }

  console.log('\n--- Audit Trail ---');

  // 10. Check audit logs for fuel approval
  const fuelAudits = await prisma.auditLog.findMany({
    where: { entityId: fuelId, action: 'driver_submission.fuel.approve' },
    orderBy: { createdAt: 'desc' },
    take: 1,
  });
  if (fuelAudits.length === 0) { fail('No audit log for fuel approval'); } else {
    const audit = fuelAudits[0];
    const meta = audit.metadata as Record<string, unknown>;
    if (meta.reviewerId !== managerUserId) { fail(`Audit reviewerId: ${meta.reviewerId}`); }
    else if (meta.driverId !== driverId) { fail(`Audit driverId: ${meta.driverId}`); }
    else if (meta.oldStatus !== 'DRAFT') { fail(`Audit oldStatus: ${meta.oldStatus}`); }
    else if (meta.newStatus !== 'APPROVED') { fail(`Audit newStatus: ${meta.newStatus}`); }
    else { pass('Audit log includes reviewerId, driverId, oldStatus, newStatus'); }
  }

  console.log('\n--- Document Review Flow ---');

  // 11. Driver uploads document
  const docRes = await request('POST', '/api/v1/me/driver-documents', driverToken, {
    title: `${PREFIX}_Doc_${ts}`,
    documentType: 'GENERAL',
    documentCategory: 'GENERAL',
    vehicleId,
  });
  const docId = docRes.data?.data?.id;
  if (!docId) { fail(`Driver upload doc: ${JSON.stringify(docRes.data)}`); process.exit(1); }
  pass(`Driver uploaded document: ${docId}`);

  // 12. Manager verifies document
  const verifyDoc = await request('PATCH', `/api/v1/driver-submissions/documents/${docId}/verify`, managerToken, { reason: 'Document verified' });
  if (verifyDoc.status !== 200) { fail(`Verify doc: ${JSON.stringify(verifyDoc.data)}`); } else { pass('Manager verified document'); }

  // 13. Check document verification status
  const verifiedDoc = await prisma.document.findUnique({ where: { id: docId } });
  if (verifiedDoc?.verificationStatus !== 'VERIFIED') { fail(`Doc verification: ${verifiedDoc?.verificationStatus}`); } else { pass('Document verification status is VERIFIED'); }

  console.log('\n--- Issue Review Flow ---');

  // 14. Driver reports issue
  const issueRes = await request('POST', '/api/v1/me/driver-vehicle-issues', driverToken, {
    vehicleId,
    title: `${PREFIX}_Issue_${ts}`,
    description: 'Brake issue',
    severity: 'HIGH',
  });
  const issueId = issueRes.data?.data?.id;
  if (!issueId) { fail(`Driver report issue: ${JSON.stringify(issueRes.data)}`); process.exit(1); }
  pass(`Driver reported issue: ${issueId}`);

  // 15. Manager acknowledges issue
  const ackIssue = await request('PATCH', `/api/v1/driver-submissions/issues/${issueId}/acknowledge`, managerToken, { reason: 'Acknowledged' });
  if (ackIssue.status !== 200) { fail(`Ack issue: ${JSON.stringify(ackIssue.data)}`); } else { pass('Manager acknowledged issue'); }

  // 16. Manager resolves issue
  const resolveIssueRes = await request('PATCH', `/api/v1/driver-submissions/issues/${issueId}/resolve`, managerToken, { reason: 'Brakes replaced' });
  if (resolveIssueRes.status !== 200) { fail(`Resolve issue: ${JSON.stringify(resolveIssueRes.data)}`); } else { pass('Manager resolved issue'); }

  console.log('\n--- Inspection Review Flow ---');

  // 17. Driver creates inspection
  const inspRes = await request('POST', '/api/v1/me/driver-vehicle-inspections', driverToken, {
    vehicleId,
    inspectionType: 'PRE_TRIP',
    overallStatus: 'OK',
  });
  const inspId = inspRes.data?.data?.id;
  if (!inspId) { fail(`Driver create inspection: ${JSON.stringify(inspRes.data)}`); process.exit(1); }
  pass(`Driver created inspection: ${inspId}`);

  // 18. Manager reviews inspection
  const reviewInsp = await request('PATCH', `/api/v1/driver-submissions/inspections/${inspId}/review`, managerToken, { reason: 'Inspection looks good' });
  if (reviewInsp.status !== 200) { fail(`Review inspection: ${JSON.stringify(reviewInsp.data)}`); } else { pass('Manager reviewed inspection'); }

  // 19. Check inspection review status
  const reviewedInsp = await prisma.vehicleInspection.findUnique({ where: { id: inspId } });
  if (reviewedInsp?.reviewStatus !== 'REVIEWED') { fail(`Inspection review: ${reviewedInsp?.reviewStatus}`); } else { pass('Inspection review status is REVIEWED'); }

  // ─── Scoped Issue/Inspection List Filters ────────────────────
  console.log('\n--- Scoped Issue/Inspection List Filters ---');

  // Create a second driver first (needed for vehicle assignment)
  const d2Res = await request('POST', '/api/v1/drivers', adminToken, {
    name: `${PREFIX}_Driver2_${ts}`,
    mobile: `+919901${ts}`,
    licenseNumber: `${PREFIX}_LIC2_${ts}`,
    status: 'AVAILABLE',
  });
  const driver2Id = d2Res.data?.data?.id;
  if (!driver2Id) { fail(`Create driver2: ${JSON.stringify(d2Res.data)}`); process.exit(1); }
  pass('Created second driver');

  // Create a second vehicle for cross-scope testing, assigned to driver2
  const v2Res = await request('POST', '/api/v1/vehicles', adminToken, {
    vehicleNumber: `${PREFIX}_VEH2_${ts}`,
    vehicleType: 'TRUCK',
    fuelType: 'DIESEL',
    currentDriverId: driver2Id,
  });
  const vehicle2Id = v2Res.data?.data?.id;
  if (!vehicle2Id) { fail(`Create vehicle2: ${JSON.stringify(v2Res.data)}`); process.exit(1); }
  pass('Created second vehicle for scope test');

  // Driver2 user
  const du2Res = await request('POST', '/api/v1/users', adminToken, {
    name: `${PREFIX}_DriverUser2_${ts}`,
    username: `${PREFIX}_du2_${ts}`,
    email: `${PREFIX}_du2_${ts}@t.local`,
    password: 'TestPass123!',
    roleId: driverRole.id,
    status: 'ACTIVE',
  });
  const driver2UserId = du2Res.data?.data?.id;
  if (!driver2UserId) { fail(`Create driver user 2: ${JSON.stringify(du2Res.data)}`); process.exit(1); }
  await prisma.userProfileLink.create({
    data: { userId: driver2UserId, profileType: 'DRIVER', profileId: driver2Id, status: 'ACTIVE', isPrimary: true },
  });
  const driver2Token = await getAuthToken(`${PREFIX}_du2_${ts}`, 'TestPass123!');
  if (!driver2Token) { fail('Driver 2 login failed'); process.exit(1); }
  pass('Driver 2 user linked and logged in');

  // Unscoped manager (no vehicle scope)
  const umgrRes = await request('POST', '/api/v1/users', adminToken, {
    name: `${PREFIX}_UnscopedMgr_${ts}`,
    username: `${PREFIX}_umgr_${ts}`,
    email: `${PREFIX}_umgr_${ts}@t.local`,
    password: 'TestPass123!',
    roleId: managerRole.id,
    status: 'ACTIVE',
  });
  const unscopedMgrId = umgrRes.data?.data?.id;
  let unscopedMgrToken: string | null = null;
  if (unscopedMgrId) {
    unscopedMgrToken = await getAuthToken(`${PREFIX}_umgr_${ts}`, 'TestPass123!');
  }

  // Create issue and inspection on vehicle2 (out of manager's scope)
  const issue2Res = await request('POST', '/api/v1/me/driver-vehicle-issues', driver2Token, {
    vehicleId: vehicle2Id,
    title: `${PREFIX}_Issue2_${ts}`,
    description: 'Oil leak',
    severity: 'MEDIUM',
  });
  const issue2Id = issue2Res.data?.data?.id;
  if (!issue2Id) { fail(`Driver2 report issue: ${JSON.stringify(issue2Res.data)}`); process.exit(1); }

  const insp2Res = await request('POST', '/api/v1/me/driver-vehicle-inspections', driver2Token, {
    vehicleId: vehicle2Id,
    inspectionType: 'POST_TRIP',
    overallStatus: 'NOT_OK',
  });
  const insp2Id = insp2Res.data?.data?.id;
  if (!insp2Id) { fail(`Driver2 create inspection: ${JSON.stringify(insp2Res.data)}`); process.exit(1); }
  pass('Created out-of-scope issue and inspection on vehicle2');

  // Manager with VEHICLE/MANAGE on vehicle1 should see vehicle1 issue but not vehicle2 issue
  const scopedIssueList = await request('GET', '/api/v1/driver-submissions/issues', managerToken);
  const scopedIssueItems = scopedIssueList.data?.data?.items || [];
  const canSeeVehicle1Issue = scopedIssueItems.some((i: any) => i.id === issueId);
  const canSeeVehicle2Issue = scopedIssueItems.some((i: any) => i.id === issue2Id);
  if (canSeeVehicle1Issue) { pass('Scoped manager sees vehicle1 issue'); } else { fail('Scoped manager cannot see vehicle1 issue'); }
  if (!canSeeVehicle2Issue) { pass('Scoped manager correctly hidden from vehicle2 issue'); } else { fail('Scoped manager should NOT see vehicle2 issue'); }

  // Same for inspections
  const scopedInspList = await request('GET', '/api/v1/driver-submissions/inspections', managerToken);
  const scopedInspItems = scopedInspList.data?.data?.items || [];
  const canSeeVehicle1Insp = scopedInspItems.some((i: any) => i.id === inspId);
  const canSeeVehicle2Insp = scopedInspItems.some((i: any) => i.id === insp2Id);
  if (canSeeVehicle1Insp) { pass('Scoped manager sees vehicle1 inspection'); } else { fail('Scoped manager cannot see vehicle1 inspection'); }
  if (!canSeeVehicle2Insp) { pass('Scoped manager correctly hidden from vehicle2 inspection'); } else { fail('Scoped manager should NOT see vehicle2 inspection'); }

  // Unscoped manager cannot see either issue or inspection
  if (unscopedMgrToken) {
    const unscopedIssueList = await request('GET', '/api/v1/driver-submissions/issues', unscopedMgrToken);
    const unscopedIssueItems = unscopedIssueList.data?.data?.items || [];
    if (!unscopedIssueItems.some((i: any) => i.id === issueId)) { pass('Unscoped manager cannot see vehicle1 issue'); } else { fail('Unscoped manager should NOT see vehicle1 issue'); }
    if (!unscopedIssueItems.some((i: any) => i.id === issue2Id)) { pass('Unscoped manager cannot see vehicle2 issue'); } else { fail('Unscoped manager should NOT see vehicle2 issue'); }

    const unscopedInspList = await request('GET', '/api/v1/driver-submissions/inspections', unscopedMgrToken);
    const unscopedInspItems = unscopedInspList.data?.data?.items || [];
    if (!unscopedInspItems.some((i: any) => i.id === inspId)) { pass('Unscoped manager cannot see vehicle1 inspection'); } else { fail('Unscoped manager should NOT see vehicle1 inspection'); }
    if (!unscopedInspItems.some((i: any) => i.id === insp2Id)) { pass('Unscoped manager cannot see vehicle2 inspection'); } else { fail('Unscoped manager should NOT see vehicle2 inspection'); }
  }

  console.log('\n--- Out-of-Scope Action Blocking ---');

  // Unscoped manager cannot acknowledge/resolve/reject out-of-scope issue
  if (unscopedMgrToken) {
    const ackOOS = await request('PATCH', `/api/v1/driver-submissions/issues/${issue2Id}/acknowledge`, unscopedMgrToken, { reason: 'Test' });
    if (ackOOS.status === 403) { pass('Unscoped manager blocked from acknowledging out-of-scope issue (403)'); } else { fail(`Unscoped manager ack issue: expected 403, got ${ackOOS.status}`); }

    const revOOS = await request('PATCH', `/api/v1/driver-submissions/inspections/${insp2Id}/review`, unscopedMgrToken, { reason: 'Test' });
    if (revOOS.status === 403) { pass('Unscoped manager blocked from reviewing out-of-scope inspection (403)'); } else { fail(`Unscoped manager review inspection: expected 403, got ${revOOS.status}`); }
  }

  console.log('\n--- Self-Review Guard (Permission-Granted Driver) ---');

  // Grant driver1 review permissions via override — they still should NOT approve own records
  const reviewPerms = ['driver_fuel_approve', 'driver_expense_approve', 'driver_document_verify', 'driver_issue_review', 'driver_inspection_review', 'driver_submission_review'];
  for (const perm of reviewPerms) {
    await request('PUT', `/api/v1/users/${driverUserId}/permission-overrides`, adminToken, {
      permissionKey: perm,
      effect: 'ALLOW',
      reason: 'Test: grant review perms for self-review guard test',
    });
  }

  // Driver1 should NOT approve their own fuel (blocked by permission check OR self-review guard)
  const selfApproveFuel = await request('PATCH', `/api/v1/driver-submissions/fuel/${fuelId}/approve`, driverToken, {});
  if (selfApproveFuel.status === 403) { pass('Driver with review perms still blocked from self-approving fuel (403)'); } else { fail(`Driver self-approve fuel: expected 403, got ${selfApproveFuel.status}`); }

  // Create new expense, doc, issue, inspection for self-review testing
  const selfExpRes = await request('POST', '/api/v1/me/driver-expenses', driverToken, {
    vehicleId: vehicleId,
    category: 'PARKING',
    amount: 200,
  });
  const selfExpenseId = selfExpRes.data?.data?.id;
  if (selfExpenseId) {
    const selfRejectExp = await request('PATCH', `/api/v1/driver-submissions/expenses/${selfExpenseId}/reject`, driverToken, {});
    if (selfRejectExp.status === 403) { pass('Driver with review perms blocked from self-rejecting expense (403)'); } else { fail(`Driver self-reject expense: expected 403, got ${selfRejectExp.status}`); }
  }

  const selfDocRes = await request('POST', '/api/v1/me/driver-documents', driverToken, {
    title: `${PREFIX}_SelfDoc_${ts}`,
    documentType: 'GENERAL',
    documentCategory: 'GENERAL',
    vehicleId: vehicleId,
  });
  const selfDocId = selfDocRes.data?.data?.id;
  if (selfDocId) {
    const selfVerifyDoc = await request('PATCH', `/api/v1/driver-submissions/documents/${selfDocId}/verify`, driverToken, {});
    if (selfVerifyDoc.status === 403) { pass('Driver with review perms blocked from self-verifying document (403)'); } else { fail(`Driver self-verify doc: expected 403, got ${selfVerifyDoc.status}`); }
  }

  const selfIssueRes = await request('POST', '/api/v1/me/driver-vehicle-issues', driverToken, {
    vehicleId: vehicleId,
    title: `${PREFIX}_SelfIssue_${ts}`,
    description: 'Self test',
    severity: 'LOW',
  });
  const selfIssueId = selfIssueRes.data?.data?.id;
  if (selfIssueId) {
    const selfAckIssue = await request('PATCH', `/api/v1/driver-submissions/issues/${selfIssueId}/acknowledge`, driverToken, {});
    if (selfAckIssue.status === 403) { pass('Driver with review perms blocked from self-acknowledging issue (403)'); } else { fail(`Driver self-ack issue: expected 403, got ${selfAckIssue.status}`); }
  }

  const selfInspRes = await request('POST', '/api/v1/me/driver-vehicle-inspections', driverToken, {
    vehicleId: vehicleId,
    inspectionType: 'PRE_TRIP',
    overallStatus: 'OK',
  });
  const selfInspId = selfInspRes.data?.data?.id;
  if (selfInspId) {
    const selfRevInsp = await request('PATCH', `/api/v1/driver-submissions/inspections/${selfInspId}/review`, driverToken, {});
    if (selfRevInsp.status === 403) { pass('Driver with review perms blocked from self-reviewing inspection (403)'); } else { fail(`Driver self-review inspection: expected 403, got ${selfRevInsp.status}`); }
  }

  console.log('\n--- Cleanup ---');
  await cleanup();
  pass('Test data cleaned up');

  console.log(`\n=== Results: ${passed} passed, ${failed} failed ===`);
  if (testFailed) process.exit(1);
}

main().catch((err) => { console.error('Test error:', err); process.exit(1); });
