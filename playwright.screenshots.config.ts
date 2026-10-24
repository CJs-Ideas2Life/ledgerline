import { defineConfig } from '@playwright/test';

// Separate from e2e/. Captures README screenshots against the production build.
export default defineConfig({
  testDir: './scripts',
  testMatch: 'screenshots.ts',
  timeout: 180_000,
  retries: 0,
  reporter: [['list']],
  use: {
    baseURL: process.env.SCREENSHOT_BASE_URL ?? 'http://127.0.0.1:3211',
    headless: true,
    viewport: { width: 1360, height: 1100 },
    deviceScaleFactor: 1,
    colorScheme: 'light',
  },
  webServer: {
    command: 'npx next start -p 3211',
    url: 'http://127.0.0.1:3211',
    reuseExistingServer: false,
    timeout: 120_000,
  },
});
