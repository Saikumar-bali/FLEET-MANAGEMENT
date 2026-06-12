import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  timeout: 30000,
  retries: 1,
  use: {
    baseURL: process.env.E2E_BASE_URL || 'http://127.0.0.1:5173',
    screenshot: 'only-on-failure',
  },
  webServer: [
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
