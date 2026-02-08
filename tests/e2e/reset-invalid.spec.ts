import { test, expect } from '@playwright/test';

test.describe('Reset Password - Invalid Link', () => {
  test('should show invalid link message when accessing reset without valid session', async ({ page }) => {
    // Navigate directly to reset page without valid tokens
    await page.goto('/auth?reset=1');

    // Wait for the invalid reset screen to appear
    await expect(page.getByTestId('reset-invalid')).toBeVisible({ timeout: 10000 });
    
    // Verify the title shows invalid/expired message
    await expect(page.getByTestId('reset-invalid-title')).toContainText('Lien invalide ou expiré');
    
    // Verify both action buttons are visible
    await expect(page.getByTestId('back-to-login')).toBeVisible();
    await expect(page.getByTestId('resend-reset-link')).toBeVisible();
  });

  test('should navigate back to login when clicking back button', async ({ page }) => {
    // Navigate to invalid reset page
    await page.goto('/auth?reset=1');

    // Wait for invalid screen
    await expect(page.getByTestId('reset-invalid')).toBeVisible({ timeout: 10000 });

    // Click back to login
    await page.getByTestId('back-to-login').click();

    // Verify we're back on the login page (without ?reset=1)
    await expect(page).toHaveURL(/\/auth(\?.*)?$/);
    
    // Verify login form is visible (stable selectors)
    await expect(page.locator('form')).toBeVisible();
    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(page.locator('input[type="password"]')).toBeVisible();
  });

  test('should open forgot password dialog when clicking resend link', async ({ page }) => {
    // Navigate to invalid reset page
    await page.goto('/auth?reset=1');

    // Wait for invalid screen
    await expect(page.getByTestId('reset-invalid')).toBeVisible({ timeout: 10000 });

    // Click resend reset link
    await page.getByTestId('resend-reset-link').click();

    // Verify forgot password dialog opens
    await expect(page.getByRole('dialog')).toBeVisible();
    await expect(page.getByText('Mot de passe oublié')).toBeVisible();
    
    // Verify email input is in the dialog (stable selector)
    await expect(page.getByTestId('forgot-password-email')).toBeVisible();
  });

  test('should not crash or loop on invalid reset page', async ({ page }) => {
    // Navigate to invalid reset page
    await page.goto('/auth?reset=1');

    // Wait for page to stabilize (avoid networkidle which can flake with Supabase realtime)
    await page.waitForLoadState('domcontentloaded');

    // Verify the page rendered correctly (no crash)
    await expect(page.getByTestId('reset-invalid')).toBeVisible({ timeout: 10000 });

    // Wait a bit to ensure no infinite loops
    await page.waitForTimeout(2000);

    // Page should still be stable
    await expect(page.getByTestId('reset-invalid')).toBeVisible();
    
    // No error alerts or crash indicators
    const errorAlerts = page.locator('[role="alert"]');
    await expect(errorAlerts).toHaveCount(0);
  });
});
