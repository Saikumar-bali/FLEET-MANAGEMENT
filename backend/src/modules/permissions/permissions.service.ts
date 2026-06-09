import { prisma } from '../../lib/prisma';

export async function listPermissions() {
  return prisma.permission.findMany({
    orderBy: [
      { module: 'asc' },
      { action: 'asc' },
    ],
  });
}
