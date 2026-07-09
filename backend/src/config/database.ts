import { config } from './index';
import { prisma } from '../lib/prisma';

export async function initDatabase(): Promise<void> {
  if (!config.databaseUrl) {
    console.error('WARNING: DATABASE_URL is missing. Set it in your Vercel/Railway environment variables.');
    return;
  }

  try {
    await prisma.$queryRaw`SELECT 1`;
    console.log('Database connected successfully');
  } catch (error) {
    console.error('Database connection failed:', error);
  }
}

export async function checkDatabaseConnection(): Promise<boolean> {
  if (!config.databaseUrl) {
    return false;
  }

  try {
    await prisma.$queryRaw`SELECT 1`;
    return true;
  } catch {
    return false;
  }
}
