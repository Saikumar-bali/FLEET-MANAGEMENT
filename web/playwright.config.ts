import { defineConfig } from '@playwright/test';

const externalBaseUrl = process.env.E2E_BASE_URL?.trim();

export default defineConfig({
  testDir: './e2e',
  timeout: 30000,
  retries: 1,
  use: {
    baseURL: externalBaseUrl || 'http://localhost:5173',
    screenshot: 'only-on-failure',
  },
  webServer: externalBaseUrl
    ? undefined
    : [
        {
          command: 'node -r ../backend/node_modules/dotenv/config ../backend/dist/src/server.js',
          port: 4000,
          timeout: 30000,
          reuseExistingServer: true,
          env: {
            DOTENV_CONFIG_PATH: '../backend/.env',
          },
        },
        {
          command: 'npm run dev -- --host 127.0.0.1',
          port: 5173,
          timeout: 30000,
          reuseExistingServer: true,
        },
      ],
});
