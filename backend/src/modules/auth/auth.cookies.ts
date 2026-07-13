import type { Request, Response } from 'express';
import { config } from '../../config';

export const ACCESS_TOKEN_COOKIE = 'fleet_access_token';
export const REFRESH_TOKEN_COOKIE = 'fleet_refresh_token';

function parseCookies(req: Request): Record<string, string> {
  const header = req.headers.cookie;
  if (!header) return {};

  return header.split(';').reduce<Record<string, string>>((cookies, part) => {
    const separator = part.indexOf('=');
    if (separator < 0) return cookies;
    const name = part.slice(0, separator).trim();
    const value = part.slice(separator + 1).trim();
    if (name) cookies[name] = decodeURIComponent(value);
    return cookies;
  }, {});
}

export function readAuthCookie(req: Request, name: string): string | null {
  return parseCookies(req)[name] ?? null;
}

const baseCookieOptions = {
  httpOnly: true,
  secure: config.nodeEnv === 'production' || config.nodeEnv === 'staging',
  sameSite: 'lax' as const,
  path: '/',
};

export function setSessionCookies(res: Response, accessToken: string, refreshToken: string) {
  res.cookie(ACCESS_TOKEN_COOKIE, accessToken, { ...baseCookieOptions, maxAge: 24 * 60 * 60 * 1000 });
  res.cookie(REFRESH_TOKEN_COOKIE, refreshToken, { ...baseCookieOptions, maxAge: 7 * 24 * 60 * 60 * 1000 });
}

export function clearSessionCookies(res: Response) {
  res.clearCookie(ACCESS_TOKEN_COOKIE, baseCookieOptions);
  res.clearCookie(REFRESH_TOKEN_COOKIE, baseCookieOptions);
}
