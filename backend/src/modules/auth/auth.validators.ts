import { z } from 'zod';

export const loginSchema = z.object({
  identifier: z.string().min(1, 'Username or email is required').transform((value) => value.trim().toLowerCase()),
  password: z.string().min(8, 'Password must be at least 8 characters'),
});

export const refreshSchema = z.object({
  refreshToken: z.string().min(1, 'Refresh token is required'),
});

export const logoutSchema = refreshSchema;
