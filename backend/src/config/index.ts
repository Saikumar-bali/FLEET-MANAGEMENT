import dotenv from 'dotenv';
dotenv.config();

const nodeEnv = process.env.NODE_ENV || 'development';
const isDeployedEnvironment = nodeEnv === 'production' || nodeEnv === 'staging';
const enableDemoUsers = process.env.ENABLE_DEMO_USERS === 'true';

if (!['development', 'test', 'staging', 'production'].includes(nodeEnv)) {
  throw new Error('NODE_ENV must be development, test, staging, or production');
}

if (nodeEnv === 'production' && enableDemoUsers) {
  throw new Error('ENABLE_DEMO_USERS=true is not allowed when NODE_ENV is production');
}

function requiredInDeployedEnvironment(name: string, fallback = ''): string {
  const value = process.env[name]?.trim();

  if (isDeployedEnvironment && !value) {
    console.error(`🚨 WARNING: [ENV ERROR] ${name} is required when NODE_ENV is ${nodeEnv}. Please set it in Settings -> Environment Variables.`);
    return fallback;
  }

  return value || fallback;
}

function positiveInteger(name: string, fallback: string): number {
  const value = Number.parseInt(process.env[name] || fallback, 10);

  if (!Number.isInteger(value) || value <= 0) {
    throw new Error(`${name} must be a positive integer`);
  }

  return value;
}

function validatedUrl(name: string, value: string, protocols: string[]): string {
  if (!value) {
    return value;
  }

  let url: URL;

  try {
    url = new URL(value);
  } catch {
    console.error(`🚨 WARNING: [ENV ERROR] ${name} must be a valid URL, but got "${value}"`);
    return value;
  }

  if (!protocols.includes(url.protocol)) {
    console.error(`🚨 WARNING: [ENV ERROR] ${name} must use one of: ${protocols.join(', ')}`);
  }

  return value;
}

function validatedUrls(name: string, value: string, protocols: string[]): string[] {
  if (!value) {
    return [];
  }

  return value
    .split(',')
    .map((v) => v.trim())
    .filter(Boolean)
    .map((v) => validatedUrl(name, v, protocols));
}

const databaseUrl = validatedUrl(
  'DATABASE_URL',
  requiredInDeployedEnvironment('DATABASE_URL'),
  ['postgres:', 'postgresql:'],
);
const directUrl = validatedUrl(
  'DIRECT_URL',
  requiredInDeployedEnvironment('DIRECT_URL'),
  ['postgres:', 'postgresql:'],
);
const jwtSecret = requiredInDeployedEnvironment('JWT_SECRET');
const corsOrigins = validatedUrls(
  'CORS_ORIGIN',
  requiredInDeployedEnvironment('CORS_ORIGIN', 'http://localhost:5173,http://localhost:5174'),
  ['http:', 'https:'],
);

if (isDeployedEnvironment && jwtSecret.length < 32) {
  console.error('🚨 WARNING: [ENV ERROR] JWT_SECRET must be at least 32 characters in deployed environments');
}

export const config = {
  port: positiveInteger('PORT', '4000'),
  nodeEnv,
  enableDemoUsers,
  databaseUrl,
  directUrl,
  jwtSecret,
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '1d',
  jwtRefreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
  uploadDir: process.env.UPLOAD_DIR || 'uploads',
  maxFileSize: positiveInteger('MAX_FILE_SIZE', '5242880'),
  corsOrigins,
  adminEmail: process.env.ADMIN_EMAIL?.trim().toLowerCase() || '',
  adminUsername: process.env.ADMIN_USERNAME?.trim().toLowerCase() || '',
  adminPassword: process.env.ADMIN_PASSWORD?.trim() || '',
};
