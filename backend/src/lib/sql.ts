import { PrismaClient } from '@prisma/client';

type DbClient = Pick<PrismaClient, '$queryRawUnsafe' | '$executeRawUnsafe'>;

/**
 * Raw SQL execution helpers.
 *
 * SECURITY CONTRACT: every user-controlled value passed to these helpers MUST be
 * supplied as a bound parameter (the `...params` arguments), never interpolated into
 * the `sql` string. Prisma sends bound parameters to Postgres as prepared-statement
 * arguments, which prevents SQL injection. Concatenating request data into `sql` is
 * forbidden and will be caught in code review / CodeQL.
 *
 * These wrap Prisma's `*RawUnsafe` API because several call sites build dynamic
 * WHERE/ORDER clauses from request query objects. The clauses themselves are derived
 * from a fixed allow-list of column names (never raw user input); only scalar values
 * are bound. See `addFilter` in driver-advances.service.ts for the canonical pattern.
 */
export function rawQuery<T = unknown>(db: DbClient, sql: string, ...params: unknown[]): Promise<T> {
  return db.$queryRawUnsafe<T>(sql, ...params);
}

export function rawExec(db: DbClient, sql: string, ...params: unknown[]): Promise<number> {
  return db.$executeRawUnsafe(sql, ...params);
}
