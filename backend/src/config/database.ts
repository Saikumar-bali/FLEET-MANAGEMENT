import { config } from './index';
import { prisma } from '../lib/prisma';

export async function initDatabase(): Promise<void> {
  if (!config.databaseUrl) {
    throw new Error('DATABASE_URL is required to initialize the database');
  }

  try {
    await prisma.$queryRaw`SELECT 1`;
    console.log('Database connected successfully');
  } catch (error) {
    console.error('Database connection failed:', error);
    throw error;
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
