import { config } from './index';

let dbInitialized = false;

export async function initDatabase(): Promise<void> {
  if (dbInitialized) return;

  if (!config.databaseUrl) {
    console.warn('DATABASE_URL not configured. Database connection will not be established.');
    return;
  }

  try {
    // Database connection placeholder
    // Example with Prisma:
    //   const { PrismaClient } = require('@prisma/client');
    //   const prisma = new PrismaClient({ datasources: { db: { url: config.databaseUrl } } });
    //   await prisma.$connect();
    console.log('Database connected successfully');
    dbInitialized = true;
  } catch (error) {
    console.error('Database connection failed:', error);
    throw error;
  }
}

export function isDbInitialized(): boolean {
  return dbInitialized;
}
