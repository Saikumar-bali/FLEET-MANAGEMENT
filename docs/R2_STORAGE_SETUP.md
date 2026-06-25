# Cloudflare R2 Storage Setup

## Overview

FLEET-MANAGEMENT supports Cloudflare R2 for document storage in production. R2 is S3-compatible, so the backend uses the AWS S3 SDK to communicate with it.

## Architecture

- **Metadata** is stored in PostgreSQL (Document model).
- **File bytes** are stored in the storage provider (R2 in production, local filesystem in dev/CI).
- **Signed URLs** are generated on-demand for view/download — files are never served directly from the bucket.

## Required Environment Variables

### R2/Production

```
STORAGE_PROVIDER=r2
STORAGE_BUCKET=<your-r2-bucket-name>
STORAGE_REGION=auto
STORAGE_ENDPOINT=https://<your-account-id>.r2.cloudflarestorage.com
STORAGE_ACCESS_KEY_ID=<r2-access-key-id>
STORAGE_SECRET_ACCESS_KEY=<r2-secret-access-key>
STORAGE_PUBLIC_BASE_URL=                    # optional, for public access
STORAGE_SIGNED_URL_EXPIRES_SECONDS=900      # default 15 minutes
```

### Local Development

```
STORAGE_PROVIDER=local
STORAGE_LOCAL_PATH=.storage/uploads
```

### CI

```
STORAGE_PROVIDER=local
STORAGE_LOCAL_PATH=/tmp/fleet-ci-storage
```

## Setup Steps

### 1. Create R2 Bucket

Via Cloudflare Dashboard:
1. Go to R2 Object Storage
2. Click "Create bucket"
3. Name: `fleet-documents` (or your preferred name)
4. Location: Automatic
5. Storage class: Standard

Via Wrangler CLI:
```bash
npx wrangler r2 bucket create fleet-documents
```

### 2. Create R2 API Token

1. Go to Cloudflare Dashboard → R2 → Manage R2 API Tokens
2. Click "Create API token"
3. Permission: "Object Read & Write" (or "Object Read" for read-only)
4. Specify bucket: `fleet-documents` (or "All buckets")
5. Click "Create API Token"
6. Copy the Access Key ID and Secret Access Key

### 3. Configure Environment Variables

Add to your `.env` file (never commit this):
```
STORAGE_PROVIDER=r2
STORAGE_BUCKET=fleet-documents
STORAGE_REGION=auto
STORAGE_ENDPOINT=https://<your-account-id>.r2.cloudflarestorage.com
STORAGE_ACCESS_KEY_ID=<from-step-2>
STORAGE_SECRET_ACCESS_KEY=<from-step-2>
STORAGE_SIGNED_URL_EXPIRES_SECONDS=900
```

### 4. Vercel Deployment

Add the same variables in Vercel Dashboard → Settings → Environment Variables:
- `STORAGE_PROVIDER` = `r2`
- `STORAGE_BUCKET` = your bucket name
- `STORAGE_REGION` = `auto`
- `STORAGE_ENDPOINT` = your R2 endpoint URL
- `STORAGE_ACCESS_KEY_ID` = from API token
- `STORAGE_SECRET_ACCESS_KEY` = from API token

## Security Notes

- **Never commit** `.env` files, API tokens, or credentials to Git.
- **Never print** R2 credentials, tokens, secrets, bucket names, DATABASE_URL, JWT secrets, passwords, or emails in logs.
- The bucket should **not be public** by default. Files are accessed via signed URLs.
- Signed URLs expire after `STORAGE_SIGNED_URL_EXPIRES_SECONDS` (default 900s).
- RBAC is enforced before generating signed URLs — unauthorized users cannot access files.

### ⚠️ CRITICAL: If R2 Keys Were Committed

**If R2 access keys or secret keys were ever committed to the repository:**

1. **Immediately rotate/revoke** the exposed R2 API token in Cloudflare Dashboard → R2 → Manage R2 API Tokens
2. **Delete the compromised token** and create a new one
3. **Update `.env`** with the new credentials
4. **Check git history** — even if removed from HEAD, credentials remain in historical commits
5. **Consider re-issuing all API tokens** if the exposure duration is unknown
6. **Scan the repository** for any other potential credential leaks

Never re-use credentials that were exposed in version control.

## Bucket Structure

Files are stored with keys like:
```
documents/2026-06/DOC-20260625-A1B2.pdf
documents/2026-07/DOC-20260701-C3D4.jpg
```

## Provider Selection

| `STORAGE_PROVIDER` | Provider Used | Use Case |
|---|---|---|
| `local` (default) | LocalStorageProvider | Development, CI |
| `s3` | S3StorageProvider | AWS S3 or S3-compatible |
| `r2` | S3StorageProvider | Cloudflare R2 |

Both `s3` and `r2` use the same `S3StorageProvider` since R2 is S3-compatible.

## R2 Smoke Test

A safe smoke test script is available that reads credentials only from environment variables and never prints secrets:

```bash
# Set env vars first
export STORAGE_PROVIDER=r2
export STORAGE_BUCKET=...
export STORAGE_ENDPOINT=...
export STORAGE_ACCESS_KEY_ID=...
export STORAGE_SECRET_ACCESS_KEY=...
export STORAGE_REGION=auto

# Run smoke test (not in CI)
npx ts-node backend/scripts/r2-smoke-test.ts
```

Do NOT run this script in CI. CI uses local storage only.
