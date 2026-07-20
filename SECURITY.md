# Security Policy

## Supported Versions

The `main` branch is the only actively maintained version. Security fixes are
applied to `main` and released through the standard CI/CD pipeline.

| Version | Supported |
| ------- | --------- |
| main    | ✅        |

## Reporting a Vulnerability

If you discover a security vulnerability, please **do not** open a public issue.

Instead, report it privately:

1. Use GitHub's private vulnerability reporting: go to the
   **Security** tab of this repository, then **Report a vulnerability**.
2. If private reporting is unavailable, email the maintainer directly with
   details and a minimal reproduction.

Please include:

- A description of the vulnerability and its impact
- Steps to reproduce (or a proof-of-concept)
- Affected file(s) / component(s)
- Suggested remediation, if any

We aim to acknowledge reports within 72 hours and provide a remediation plan
or fix timeline within 7 days for confirmed vulnerabilities.

## Security Practices

- Secrets are sourced from environment variables; committed `.env` files are
  git-ignored. No live credentials are stored in the repository.
- CI runs CodeQL (JavaScript/TypeScript) and Gitleaks secret scanning on every
  pull request to `main`.
- All database queries use parameterized statements (Prisma). Dynamic SQL
  fragments are built from a fixed allow-list of column names; scalar values
  are passed as bound parameters.
- File storage keys are validated to prevent path traversal.
- Dependency updates are handled by Dependabot.
