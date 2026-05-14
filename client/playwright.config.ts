import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  timeout: 90_000,
  retries: 0,
  use: {
    baseURL: 'http://localhost:5173',
    headless: true,
    viewport: { width: 1280, height: 720 },
    screenshot: 'only-on-failure',
    video: 'off',
    trace: 'off',
  },
});
