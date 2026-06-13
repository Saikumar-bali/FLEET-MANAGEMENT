# Windows Prisma DLL Lock Troubleshooting

## Symptom

`prisma generate` or `npm run backend:build` fails on Windows with an `EPERM` error while renaming:

```text
query_engine-windows.dll.node.tmp... -> query_engine-windows.dll.node
```

## Cause

A running Node, backend, Vite, or test process can keep Prisma's generated Windows query-engine DLL open. Windows then prevents Prisma from replacing the generated engine during `prisma generate`.

## Safe Cleanup

From the repository root:

```powershell
# Stop Node processes that may hold the generated Prisma engine.
taskkill /F /IM node.exe

cd backend

# Remove generated Prisma client/cache artifacts only.
Remove-Item -Recurse -Force .\node_modules\.prisma -ErrorAction SilentlyContinue
Remove-Item -Recurse -Force .\node_modules\@prisma\client -ErrorAction SilentlyContinue

npm install
npm run prisma:generate

cd ..
npm run backend:build
```

The backend build must still execute `prisma generate && tsc` and exit successfully.

## What Not To Do

- Do not remove `prisma generate` from the backend build.
- Do not skip Prisma generation.
- Do not delete `backend/.env`.
- Do not delete or reset database data.
- Do not change the Prisma schema only to avoid the lock.
- Do not report the build as PASS when Prisma generation fails.

