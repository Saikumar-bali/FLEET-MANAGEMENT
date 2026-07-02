import { prisma } from '../src/lib/prisma';
import { ROLE_TEMPLATES } from '../src/constants/role-templates';

async function main() {
  console.log('Seeding role templates...\n');
  const allPermissions = await prisma.permission.findMany({ select: { key: true, id: true } });
  const permissionMap = new Map(allPermissions.map(p => [p.key, p.id]));

  for (const tmpl of ROLE_TEMPLATES) {
    console.log(`Template: ${tmpl.name} (${tmpl.key})`);
    console.log(`  ${tmpl.description}`);
    console.log(`  Permissions (${tmpl.permissions.length}):`);

    const missing: string[] = [];
    for (const perm of tmpl.permissions) {
      if (!permissionMap.has(perm)) {
        missing.push(perm);
      }
    }

    if (missing.length > 0) {
      console.log(`  MISSING from DB: ${missing.join(', ')}`);
    } else {
      console.log(`  All permissions exist in DB`);
    }
    console.log();
  }

  console.log(`Total templates: ${ROLE_TEMPLATES.length}`);
  console.log('Seed complete.');
}

main()
  .catch((err) => {
    console.error('Seed failed:', err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
