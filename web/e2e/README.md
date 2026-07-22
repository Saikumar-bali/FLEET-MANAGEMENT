# Browser test organization

Playwright scenarios are grouped by business domain:

```text
e2e/
  auth/
  finance/
  trips/
  helpers/
```

Compatibility `*.spec.ts` entrypoints may remain at the `e2e/` root while suites are moved incrementally. Domain scenario modules should not use the `*.spec.ts` suffix when they are imported by a compatibility entrypoint; this prevents Playwright from discovering and running the same tests twice.

Use package scripts as the stable interface:

- `npm run test:e2e` — complete browser suite
- `npm run test:e2e:finance` — finance browser suite
- `npm run test:e2e:headed` — interactive local verification
