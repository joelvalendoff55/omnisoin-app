import { Page, expect } from '@playwright/test';

/**
 * Login helper for E2E tests
 * 
 * Uses TEST_USER_EMAIL and TEST_USER_PASSWORD from environment variables.
 * Waits for successful navigation away from /auth.
 * 
 * @param page - Playwright Page object
 * @throws Error if credentials are missing or login fails
 */
export async function loginAsTestUser(page: Page): Promise<void> {
  const email = process.env.TEST_USER_EMAIL;
  const password = process.env.TEST_USER_PASSWORD;

  if (!email || !password) {
    throw new Error(
      'Missing TEST_USER_EMAIL or TEST_USER_PASSWORD environment variables. ' +
      'Set them in .env.test or export them before running tests.'
    );
  }

  // Navigate to auth page
  await page.goto('/auth', { waitUntil: 'domcontentloaded' });
  
  // Wait for form to be ready
  await page.locator('form').waitFor({ state: 'visible', timeout: 10_000 });
  
  // Fill credentials
  await page.locator('input[type="email"]').fill(email);
  await page.locator('input[type="password"]').fill(password);
  
  // Submit
  await page.locator('button[type="submit"]').click();
  
  // Wait for navigation away from auth
  await page.waitForURL(/\/(patients|transcripts|inbox|settings)?$/, { 
    timeout: 20_000 
  });
  
  // Verify we're not on auth page anymore
  await expect(page).not.toHaveURL(/\/auth/);
}

/**
 * Logout helper for E2E tests
 * 
 * Clicks the logout button/link and waits for redirect to auth.
 * 
 * @param page - Playwright Page object
 */
export async function logout(page: Page): Promise<void> {
  // Look for logout button in settings or sidebar
  const logoutButton = page.locator('button, a').filter({ hasText: /déconnexion|logout/i });
  
  if (await logoutButton.isVisible({ timeout: 3000 })) {
    await logoutButton.click();
    await page.waitForURL(/\/auth/, { timeout: 10_000 });
  }
}
