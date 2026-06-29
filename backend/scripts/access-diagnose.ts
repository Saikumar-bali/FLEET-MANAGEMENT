import { prisma } from '../src/lib/prisma';

async function main() {
  console.log('=== Access Diagnosis ===\n');

  const [userCount, roleCount, permissionCount] = await Promise.all([
    prisma.user.count(),
    prisma.role.count(),
    prisma.permission.count(),
  ]);

  console.log(`Users: ${userCount}`);
  console.log(`Roles: ${roleCount}`);
  console.log(`Permissions: ${permissionCount}\n`);

  const users = await prisma.user.findMany({
    include: {
      role: true,
      permissionOverrides: { where: { OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }] } },
      dataScopes: { where: { OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }] } },
    },
    orderBy: { createdAt: 'asc' },
  });

  for (const user of users) {
    const rolePermCount = await prisma.rolePermission.count({ where: { roleId: user.roleId } });
    console.log(`  ${user.name} (${user.email})`);
    console.log(`    Role: ${user.role.name} (${user.role.key}) | Status: ${user.status}`);
    console.log(`    Role perms: ${rolePermCount} | Overrides: ${user.permissionOverrides.length} | Scopes: ${user.dataScopes.length}`);
    console.log(`    Last login: ${user.lastLoginAt?.toISOString() ?? 'Never'}\n`);
  }

  const noRole = users.filter(u => !u.roleId);
  if (noRole.length > 0) {
    console.log(`Accounts with no role: ${noRole.length}`);
    noRole.forEach(u => console.log(`  - ${u.name} (${u.email})`));
  }

  const inactive = users.filter(u => u.status !== 'ACTIVE' || u.role.status !== 'ACTIVE');
  if (inactive.length > 0) {
    console.log(`\nInactive accounts: ${inactive.length}`);
    inactive.forEach(u => console.log(`  - ${u.name} (${u.email}) - User: ${u.status}, Role: ${u.role.status}`));
  }

  const neverLoggedIn = users.filter(u => !u.lastLoginAt);
  if (neverLoggedIn.length > 0) {
    console.log(`\nAccounts that never logged in: ${neverLoggedIn.length}`);
    neverLoggedIn.forEach(u => console.log(`  - ${u.name} (${u.email})`));
  }

  const nonGlobalNoScopes = users.filter(u =>
    u.role.key !== 'super_admin' && u.role.key !== 'admin' && u.dataScopes.length === 0
  );
  if (nonGlobalNoScopes.length > 0) {
    console.log(`\nNon-global accounts with no data scopes: ${nonGlobalNoScopes.length}`);
    nonGlobalNoScopes.forEach(u => console.log(`  - ${u.name} (${u.email}) - Role: ${u.role.key}`));
  }

  console.log('\n=== Diagnosis Complete ===');
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error('Diagnosis failed:', e);
  process.exit(1);
});
