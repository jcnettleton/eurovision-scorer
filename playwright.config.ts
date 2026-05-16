import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: 0,
  workers: 1,
  reporter: 'list',
  use: {
    baseURL: 'http://localhost:5173',
    trace: 'on-first-retry',
    headless: true,
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  // Start the Express server first, then Vite (which proxies /api to Express)
  webServer: [
    {
      command: 'node server.js',
      url: 'http://localhost:3001/api/state',
      timeout: 10000,
      reuseExistingServer: true,
    },
    {
      command: 'npm run dev',
      url: 'http://localhost:5173',
      timeout: 15000,
      reuseExistingServer: true,
    },
  ],
});
