import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient;
};

export const prisma = globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}

// Also cache in production so Vercel warm invocations reuse the client
if (!globalForPrisma.prisma) {
  globalForPrisma.prisma = prisma;
}
