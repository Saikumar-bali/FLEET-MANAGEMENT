# CLI-AI Execution Guide

This file defines how CLI-AI must work on this repository.

## Core Rules

CLI-AI must behave like a senior full-stack engineer.

It must:

- Read `README.md`
- Read `tasks.md`
- Read `progress.md`
- Read all relevant docs before coding
- Complete only the requested phase
- Never jump to future phases
- Keep code clean and typed
- Run tests/build/lint where available
- Update `progress.md`
- Add a short implementation summary after each phase

## Strict Execution Rules

1. Do not start the next phase until the current phase passes review.
2. Do not add unnecessary features.
3. Do not rewrite unrelated files.
4. Do not remove existing working code unless required.
5. Do not commit secrets.
6. Do not hardcode API URLs.
7. Do not skip validation.
8. Do not skip permissions.
9. Do not leave fake TODO logic in completed modules.
10. Do not create UI without loading/error/empty states.

## Required Output From CLI-AI

After each phase, CLI-AI must report:

```text
Completed:
- item 1
- item 2

Files changed:
- path/file

Verification:
- npm run build: pass/fail
- npm run lint: pass/fail
- tests: pass/fail

Risks:
- risk 1

Next recommended phase:
- Phase X
```

## Branching

Recommended branch format:

```text
phase-1-auth-rbac
phase-2-masters
phase-3-assets
phase-4-trips
```

## Commit Message Format

```text
phase 1: implement auth and permission foundation
phase 2: add vehicle driver asset masters
phase 3: implement asset assignment history
```

## Review Standard

A phase is accepted only if:

- Feature works
- Code is clean
- Permissions are applied
- Validation exists
- UI states exist
- Progress is updated
