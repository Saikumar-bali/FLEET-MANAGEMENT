# Windows Prisma Build Troubleshooting

## Cause

On Windows, a running backend Node or dev-server process can hold Prisma's generated
`query_engine-windows.dll.node` open. When `prisma generate` tries to replace that
DLL, Windows can reject the rename with `EPERM: operation not permitted`.

## Safe Fix Order

1. Stop the backend dev server.
2. Stop all Node processes only if necessary:

   ```powershell
   taskkill /F /IM node.exe
   ```

3. If the lock remains, delete only the generated Prisma client cache:

   ```powershell
   Remove-Item -Recurse -Force backend/node_modules/.prisma/client
   ```

4. Reinstall dependencies only if the generated client or dependencies are damaged:

   ```powershell
   npm install
   ```

5. Generate the Prisma client:

   ```powershell
   npm --prefix backend run prisma:generate
   ```

6. Run the complete backend build:

   ```powershell
   npm run backend:build
   ```

Do not delete `backend/.env`. Do not delete the database. Do not change the Prisma
schema or skip `prisma generate` just to bypass the issue. Do not rely on an old
`backend/dist` directory.

If `npm run backend:build` still fails, Phase 4 remains blocked.
