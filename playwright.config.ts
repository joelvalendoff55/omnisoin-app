import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright configuration for OmniSoin Assist E2E tests
 * @see https://playwright.dev/docs/test-configuration
 * 
 * Supports:
 * - @smoke tag for quick PR checks
 * - Full suite for main branch
 * - Retries in CI only
 */

const isCI = !!process.env.CI;

export default defineConfig({
  testDir: './tests/e2e',
  
  // Run tests in parallel locally, sequential in CI for stability
  fullyParallel: !isCI,
  
  // Fail the build on CI if you accidentally left test.only in the source code
  forbidOnly: isCI,
  
  // Retry only in CI for flaky test recovery
  retries: isCI ? 2 : 0,
  
  // Single worker in CI for stability, auto in local
  workers: isCI ? 1 : undefined,
  
  // Global timeout per test
  timeout: 60_000,
  
  // Reporter: list for console + HTML for detailed reports
  reporter: [
    ['list'],
    ['html', { open: 'never' }],
  ],
  
  // Global setup to verify test data
  globalSetup: './tests/e2e/global-setup.ts',
  
  use: {
    // Base URL from env or default to 8080
    baseURL: process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:8080',
    
    // Capture trace on failure for debugging
    trace: 'retain-on-failure',
    
    // Screenshot only on failure
    screenshot: 'only-on-failure',
    
    // Record video on failure for debugging
    video: 'retain-on-failure',
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],

  webServer: isCI ? undefined : {
    command: 'npm run dev',
    url: process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:8080',
    reuseExistingServer: true,
    timeout: 120 * 1000,
  },
});
