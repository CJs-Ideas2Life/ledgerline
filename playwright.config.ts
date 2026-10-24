import { defineConfig } from '@playwright/test';

const ci = !!process.env.CI;

export default defineConfig({
  testDir: './e2e',
  timeout: 120_000,
  reporter: [['list']],
  use: {
    baseURL: process.env.BASE_URL ?? 'http://localhost:3210',
    ...(ci ? {} : { channel: 'chrome' }),
    headless: true,
    viewport: { width: 1360, height: 900 },
  },
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3210',
    reuseExistingServer: !ci,
    timeout: 120_000,
  },
});
