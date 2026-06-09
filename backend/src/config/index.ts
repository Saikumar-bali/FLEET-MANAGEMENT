import dotenv from 'dotenv';
dotenv.config();

const nodeEnv = process.env.NODE_ENV || 'development';
const isDeployedEnvironment = nodeEnv === 'production' || nodeEnv === 'staging';

if (!['development', 'test', 'staging', 'production'].includes(nodeEnv)) {
  throw new Error('NODE_ENV must be development, test, staging, or production');
}

function requiredInDeployedEnvironment(name: string, fallback = ''): string {
  const value = process.env[name]?.trim();

  if (isDeployedEnvironment && !value) {
    throw new Error(`${name} is required when NODE_ENV is ${nodeEnv}`);
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
    throw new Error(`${name} must be a valid URL`);
  }

  if (!protocols.includes(url.protocol)) {
    throw new Error(`${name} must use one of: ${protocols.join(', ')}`);
  }

  return value;
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
const jwtSecret = requiredInDeployedEnvironment('JWT_SECRET', 'development-only-secret');
const corsOrigin = validatedUrl(
  'CORS_ORIGIN',
  requiredInDeployedEnvironment('CORS_ORIGIN', 'http://localhost:5173'),
  ['http:', 'https:'],
);

if (isDeployedEnvironment && jwtSecret.length < 32) {
  throw new Error('JWT_SECRET must be at least 32 characters in deployed environments');
}

export const config = {
  port: positiveInteger('PORT', '4000'),
  nodeEnv,
  databaseUrl,
  directUrl,
  jwtSecret,
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '1d',
  jwtRefreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
  uploadDir: process.env.UPLOAD_DIR || 'uploads',
  maxFileSize: positiveInteger('MAX_FILE_SIZE', '5242880'),
  corsOrigin,
  adminEmail: process.env.ADMIN_EMAIL?.trim().toLowerCase() || '',
  adminPassword: process.env.ADMIN_PASSWORD?.trim() || '',
};
