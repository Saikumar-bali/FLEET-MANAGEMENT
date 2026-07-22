# CI and test organization

## Purpose

Keep GitHub Actions simple while allowing the test suite to grow without placing every test runner in one flat directory.

GitHub workflow files remain directly under `.github/workflows/`. GitHub does not discover workflow YAML files inside nested subdirectories.

## Implemented structure

```text
.github/
  workflows/
    ci.yml
    deploy-vercel.yml
backend/
  scripts/
    tests/
      README.md
      finance/
        staff-finance-e2e.ts
web/
  e2e/
    README.md
    finance/
      staff-cash.scenarios.ts
```

## Stable commands

Backend:

- `npm run test:staff-finance-e2e`
- `npm run test:suite:finance`
- `npm run test:suite:driver-portal`
- `npm run test:suite:rbac`

Web:

- `npm run test:e2e`
- `npm run test:e2e:finance`
- `npm run test:e2e:headed`

CI and developers should call package scripts rather than depending on individual test-file paths.

## Compatibility approach

The existing finance test commands and root Playwright spec path remain valid. Compatibility entrypoints import the domain-organized scenarios, which avoids breaking CI evidence links while preventing Playwright from discovering the same suite twice.

Other test domains can be moved incrementally after their existing commands remain stable.

## Workflow policy

- Keep one pull-request CI orchestrator.
- Keep one final `Required quality gate` result.
- Do not create one workflow per scenario.
- Keep deployment separate and trigger it only after successful `main` CI.
- Keep partner-backend synchronization gated by successful `main` CI.
- Put future repeated setup in `.github/actions/<name>/action.yml`, but only when at least two jobs actually consume it.
