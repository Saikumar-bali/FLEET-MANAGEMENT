import { NextFunction, Request, Response } from 'express';

const SLOW_REQUEST_MS = Number.parseInt(process.env.SLOW_REQUEST_MS || '500', 10);

function timingEnabled() {
  if (process.env.NODE_ENV === 'test') return false;
  if (process.env.NODE_ENV === 'production') return process.env.API_TIMING_LOGS === 'true';
  return true;
}

export function requestTiming(req: Request, res: Response, next: NextFunction) {
  if (!timingEnabled()) {
    next();
    return;
  }

  const start = process.hrtime.bigint();

  res.on('finish', () => {
    const ms = Number(process.hrtime.bigint() - start) / 1_000_000;
    const path = (req.originalUrl || req.url).split('?')[0];
    const message = `[api] ${req.method} ${path} ${res.statusCode} ${Math.round(ms)}ms`;

    if (ms >= SLOW_REQUEST_MS) {
      console.warn(`${message} slow`);
    } else {
      console.info(message);
    }
  });

  next();
}
