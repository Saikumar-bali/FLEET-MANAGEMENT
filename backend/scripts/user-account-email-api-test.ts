/**
 * API scenario test for editing a user's account email.
 *
 * Creates isolated test users, verifies validation/normalization/uniqueness and
 * persistence through PATCH /users/:id, then removes only its own test data.
 */

import http from 'node:http';
import { prisma } from '../src/lib/prisma';
import { createAccessToken } from '../src/utils/auth';

const PREFIX = 'USER_ACCOUNT_EMAIL_TEST';
const API_PORT = Number(process.env.PORT) || 4000;
const API_BASE = `http://127.0.0.1:${API_PORT}`;

let passed = 0;
let failed = 0;

function pass(message: string) {
  console.log(`  PASS ${message}`);
  passed += 1;
}

function fail(message: string) {
  console.error(`  FAIL ${message}`);
  failed += 1;
}

async function apiCall(
  method: string,
  path: string,
  token: string,
  body?: unknown,
): Promise<{ status: number; data: any }> {
  return new Promise((resolve, reject) => {
    const request = http.request(new URL(path, API_BASE), {
      method,
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    }, (response) => {
      let raw = '';
      response.on('data', (chunk) => { raw += chunk; });
      response.on('end', () => {
        try {
          resolve({ status: response.statusCode ?? 0, data: JSON.parse(raw) });
        } catch {
          resolve({ status: response.statusCode ?? 0, data: { raw } });
        }
      });
    });

    request.on('error', reject);
    if (body !== undefined) request.write(JSON.stringify(body));
    request.end();
  });
}

async function cleanup() {
  const users = await prisma.user.findMany({
    where: { name: { startsWith: PREFIX } },
    select: { id: true },
  });
  const userIds = users.map((user) => user.id);

  if (userIds.length > 0) {
    await prisma.auditLog.deleteMany({
      where: { entityType: 'user', entityId: { in: userIds } },
    });
    await prisma.user.deleteMany({ where: { id: { in: userIds } } });
  }
}

async function main() {
  console.log('=== User Account Email API Test ===\n');
  await cleanup();

  try {
    const actor = await prisma.user.findFirst({
      where: { status: 'ACTIVE', role: { key: 'super_admin', status: 'ACTIVE' } },
      include: { role: true },
    });
    if (!actor) throw new Error('No active super_admin is available for the test.');

    const targetRole = await prisma.role.findFirst({ where: { status: 'ACTIVE' } });
    if (!targetRole) throw new Error('No active role is available for the test users.');

    const target = await prisma.user.create({
      data: {
        name: `${PREFIX}_TARGET`,
        username: `${PREFIX.toLowerCase()}_target`,
        email: `${PREFIX.toLowerCase()}_target@test.local`,
        passwordHash: 'test-only-not-a-login-password',
        roleId: targetRole.id,
        status: 'ACTIVE',
      },
    });
    const conflict = await prisma.user.create({
      data: {
        name: `${PREFIX}_CONFLICT`,
        username: `${PREFIX.toLowerCase()}_conflict`,
        email: `${PREFIX.toLowerCase()}_conflict@test.local`,
        passwordHash: 'test-only-not-a-login-password',
        roleId: targetRole.id,
        status: 'ACTIVE',
      },
    });

    const token = createAccessToken({
      id: actor.id,
      name: actor.name,
      username: actor.username,
      email: actor.email,
      mobile: actor.mobile,
      status: actor.status,
      role: {
        id: actor.role.id,
        name: actor.role.name,
        key: actor.role.key,
        status: actor.role.status,
      },
    });

    const updatedEmail = `${PREFIX.toLowerCase()}_updated@test.local`;
    const updateResponse = await apiCall('PATCH', `/api/v1/users/${target.id}`, token, {
      email: updatedEmail.toUpperCase(),
    });
    if (updateResponse.status === 200 && updateResponse.data?.data?.email === updatedEmail) {
      pass('PATCH accepts and normalizes a valid email address');
    } else {
      fail(`valid email update returned ${updateResponse.status}: ${JSON.stringify(updateResponse.data)}`);
    }

    const getResponse = await apiCall('GET', `/api/v1/users/${target.id}`, token);
    if (getResponse.status === 200 && getResponse.data?.data?.email === updatedEmail) {
      pass('updated email persists and is returned by GET /users/:id');
    } else {
      fail(`persisted email was not returned: ${JSON.stringify(getResponse.data)}`);
    }

    const unchangedResponse = await apiCall('PATCH', `/api/v1/users/${target.id}`, token, {
      email: updatedEmail,
    });
    if (unchangedResponse.status === 200) {
      pass('saving the current email does not trigger a false uniqueness conflict');
    } else {
      fail(`unchanged email returned ${unchangedResponse.status}`);
    }

    const duplicateResponse = await apiCall('PATCH', `/api/v1/users/${target.id}`, token, {
      email: conflict.email,
    });
    if (duplicateResponse.status === 400 && duplicateResponse.data?.message === 'Email address is already in use') {
      pass('duplicate email is rejected without overwriting the account');
    } else {
      fail(`duplicate email returned ${duplicateResponse.status}: ${JSON.stringify(duplicateResponse.data)}`);
    }

    const invalidResponse = await apiCall('PATCH', `/api/v1/users/${target.id}`, token, {
      email: 'not-an-email',
    });
    if (invalidResponse.status === 422) {
      pass('invalid email is rejected by request validation');
    } else {
      fail(`invalid email returned ${invalidResponse.status}`);
    }

    const persisted = await prisma.user.findUnique({ where: { id: target.id } });
    if (persisted?.email === updatedEmail) {
      pass('failed updates leave the last valid email unchanged');
    } else {
      fail(`email changed after a rejected update: ${persisted?.email ?? 'missing user'}`);
    }

    const audit = await prisma.auditLog.findFirst({
      where: { action: 'user.update', entityType: 'user', entityId: target.id },
      orderBy: { createdAt: 'desc' },
    });
    const metadata = audit?.metadata as { email?: string } | null;
    if (metadata?.email === updatedEmail) {
      pass('user.update audit metadata records the resulting email');
    } else {
      fail('user.update audit metadata did not record the resulting email');
    }
  } finally {
    await cleanup();
    await prisma.$disconnect();
  }

  console.log(`\nResult: ${passed} passed, ${failed} failed`);
  if (failed > 0) process.exit(1);
}

main().catch(async (error) => {
  console.error(error);
  await cleanup().catch(() => undefined);
  await prisma.$disconnect().catch(() => undefined);
  process.exit(1);
});
