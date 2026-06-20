# Branch Protection Required

## Why

Before branch protection was configured, any user with push access could bypass the CI Gate (PR review, required checks,
force pushes, direct pushes). This document records the required protection and verification status.

## Status: CONFIGURED AND VERIFIED

Branch protection is now configured on `main` with the following required check:
- `Hygiene, build, API, and Playwright`

Verification command:
```bash
gh api repos/Saikumar-bali/FLEET-MANAGEMENT/branches/main/protection
```

This returns a JSON response with `required_status_checks`, `required_pull_request_reviews`,
and `restrictions` (not `Branch not protected`).

## Required Configuration

Configure the following branch protection rule for `main` in the GitHub
repository settings under **Settings → Branches → Add branch protection rule**.

### Match pattern

```
main
```

### Rules to enable

| Setting | Value |
|---------|-------|
| Require a pull request before merging | ✅ |
| Require approvals | 1 |
| Dismiss stale pull request approvals when new commits are pushed | ✅ |
| Require review from Code Owners | Optional |
| Require status checks before merging | ✅ |
| Require branches to be up to date | ✅ |
| Status check(s) that must pass | `Hygiene, build, API, and Playwright` |
| Require conversation resolution before merging | ✅ (recommended) |
| Include administrators | ✅ (recommended for long-term safety) |
| Restrict who can push to matching branches | Optional |
| Allow force pushes | ❌ |
| Allow deletions | ❌ |
| Block force pushes | ✅ |
| Do not allow bypassing the above settings | ✅ |

### How to apply

1. Go to: `https://github.com/Saikumar-bali/FLEET-MANAGEMENT/settings/branches`
2. Click **Add branch protection rule**.
3. Enter `main` as the branch name pattern.
4. Check all boxes listed above.
5. In **Status checks that are required**, search for and select
   `Hygiene, build, API, and Playwright` (the job name from `.github/workflows/ci.yml`).
6. Click **Create**.

## Verification

After applying, run:

```bash
gh api repos/Saikumar-bali/FLEET-MANAGEMENT/branches/main/protection
```

Expected: a JSON response with `required_status_checks`, `required_pull_request_reviews`,
`restrictions`, etc. (not `Branch not protected`).
