# Database Migration Safety Rules

## Forbidden Operations

### `prisma migrate reset`
**FORBIDDEN** except on a disposable local development database.
- This command drops all tables and re-creates the schema.
- It destroys all data in the target database.
- Never run on staging or production.
- Never run to "fix" test failures.

### `prisma db push --accept-data-loss`
**FORBIDDEN** on any database with real data.
- This command force-pushes schema changes and may drop columns/tables.
- It does not generate a migration file.
- It provides no rollback capability.

## Safe Operations by Environment

### Local Development
1. **Schema changes:**
   ```bash
   npx prisma validate
   npx prisma migrate dev --name <descriptive_name> --create-only
   # Inspect the generated SQL in prisma/migrations/<timestamp>_<name>/migration.sql
   # Apply only after reviewing the SQL
   ```
2. **Apply migration:** The `--create-only` flag creates the SQL without applying. Review it, then run `npx prisma migrate dev` to apply.
3. **If Prisma detects drift and asks to reset:** STOP. Report the exact drift/error. Do not continue.

### Staging / Production
1. **Always use:**
   ```bash
   npx prisma migrate deploy
   ```
2. This applies pending migrations in order without dropping anything.
3. If `migrate deploy` fails: STOP. Investigate the error. Never fall back to reset.

## Test Data Isolation Rules

1. All test data must use a unique prefix: `PH7_TEST_<timestamp>_` (or similar).
2. Every destructive cleanup must delete **only** records created by the test.
3. Never depend on wiping the whole database to make tests pass.
4. Tests must be idempotent where possible — re-running should not fail due to stale data from a previous run.

## Pre-Commit Checklist

- [ ] `npx prisma validate` passes
- [ ] Migration SQL reviewed (no unintended DROP/ALTER)
- [ ] No `prisma migrate reset` used
- [ ] No `prisma db push --accept-data-loss` used
- [ ] Test data uses unique prefixes
- [ ] Cleanup deletes only test-created records

## Emergency Recovery

If a migration goes wrong on staging/production:
1. STOP all writes.
2. Take a snapshot/backup immediately.
3. Review the migration SQL that was applied.
4. If data was lost, restore from backup.
5. Document the incident.
