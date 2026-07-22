# Backend test organization

Backend scenario tests are grouped by business domain under this directory.

```text
scripts/tests/
  finance/
  trips/
  driver-portal/
  rbac/
```

Existing root-level scripts remain supported while they are migrated incrementally. Package scripts are the stable public interface; workflows and developers should call `npm run ...` commands instead of depending on individual file locations.

Rules:

- Keep one scenario runner focused on one domain or invariant group.
- Use unique fixture identifiers and clean or isolate test data.
- Read credentials from environment variables; never print secrets.
- Integration runners must use a local CI database and local API unless explicitly named as a staging smoke test.
- Preserve compatibility package commands when moving a test file.
