import bcrypt from 'bcryptjs';
import crypto from 'node:crypto';
import jwt, { type SignOptions } from 'jsonwebtoken';
import { config } from '../config';
import { futureDateFromDuration } from './duration';
import type { AuthTokenPayload, RequestUser } from '../types/auth';

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12);
}

export async function verifyPassword(password: string, passwordHash: string): Promise<boolean> {
  return bcrypt.compare(password, passwordHash);
}

export function createAccessToken(user: RequestUser): string {
  const payload: AuthTokenPayload = {
    sub: user.id,
    email: user.email,
    roleKey: user.role.key,
    userDriverId: user.userDriverId,
  };

  return jwt.sign(payload, config.jwtSecret, {
    expiresIn: config.jwtExpiresIn as SignOptions['expiresIn'],
  });
}

export function verifyAccessToken(token: string): AuthTokenPayload {
  return jwt.verify(token, config.jwtSecret) as AuthTokenPayload;
}

export function generateRefreshToken(): { token: string; tokenHash: string; expiresAt: Date } {
  const token = crypto.randomBytes(48).toString('hex');

  return {
    token,
    tokenHash: hashToken(token),
    expiresAt: futureDateFromDuration(config.jwtRefreshExpiresIn),
  };
}

export function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}
