import { test, expect } from '@playwright/test';

test.describe('Reset Password - Valid Form UI', () => {
  /**
   * These tests use the dev_recovery=1 flag to bypass session checks.
   * This flag only works in development mode (import.meta.env.DEV).
   * 
   * IMPORTANT: This bypass is NEVER active in production builds.
   */

  test('should show reset form when dev_recovery=1 flag is set', async ({ page }) => {
    // Navigate to reset page with dev bypass
    await page.goto('/auth?reset=1&dev_recovery=1');

    // Wait for the valid reset form to appear
    await expect(page.getByTestId('reset-valid')).toBeVisible({ timeout: 10000 });
    
    // Verify the title
    await expect(page.getByTestId('reset-valid-title')).toContainText('Nouveau mot de passe');
  });

  test('should display all required form elements', async ({ page }) => {
    await page.goto('/auth?reset=1&dev_recovery=1');

    // Wait for form container
    await expect(page.getByTestId('reset-valid')).toBeVisible({ timeout: 10000 });

    // Verify password input is visible
    await expect(page.getByTestId('reset-password')).toBeVisible();
    
    // Verify confirm password input is visible
    await expect(page.getByTestId('reset-password-confirm')).toBeVisible();
    
    // Verify submit button is visible
    await expect(page.getByTestId('reset-submit')).toBeVisible();
    await expect(page.getByTestId('reset-submit')).toHaveText('Mettre à jour le mot de passe');
  });

  test('should allow typing in password fields', async ({ page }) => {
    await page.goto('/auth?reset=1&dev_recovery=1');

    await expect(page.getByTestId('reset-valid')).toBeVisible({ timeout: 10000 });

    // Type in password field
    const passwordInput = page.getByTestId('reset-password');
    await passwordInput.fill('mySecurePassword123');
    await expect(passwordInput).toHaveValue('mySecurePassword123');

    // Type in confirm password field
    const confirmInput = page.getByTestId('reset-password-confirm');
    await confirmInput.fill('mySecurePassword123');
    await expect(confirmInput).toHaveValue('mySecurePassword123');
  });

  test('should have password inputs with correct attributes', async ({ page }) => {
    await page.goto('/auth?reset=1&dev_recovery=1');

    await expect(page.getByTestId('reset-valid')).toBeVisible({ timeout: 10000 });

    // Verify password input has type="password"
    const passwordInput = page.getByTestId('reset-password');
    await expect(passwordInput).toHaveAttribute('type', 'password');
    await expect(passwordInput).toHaveAttribute('minlength', '10');

    // Verify confirm input has type="password"
    const confirmInput = page.getByTestId('reset-password-confirm');
    await expect(confirmInput).toHaveAttribute('type', 'password');
    await expect(confirmInput).toHaveAttribute('minlength', '10');
  });

  test('should show helper text about minimum characters', async ({ page }) => {
    await page.goto('/auth?reset=1&dev_recovery=1');

    await expect(page.getByTestId('reset-valid')).toBeVisible({ timeout: 10000 });

    // Verify helper text is shown
    await expect(page.getByText('Minimum 10 caractères')).toBeVisible();
  });

  test('should have back to login link', async ({ page }) => {
    await page.goto('/auth?reset=1&dev_recovery=1');

    await expect(page.getByTestId('reset-valid')).toBeVisible({ timeout: 10000 });

    // Verify "Retour à la connexion" link is visible
    await expect(page.getByText('Retour à la connexion')).toBeVisible();
  });
});

test.describe('Reset Password - Invalid Link (cross-check)', () => {
  test('should show invalid screen without dev_recovery flag', async ({ page }) => {
    // This confirms that WITHOUT the dev flag, we get the invalid screen
    await page.goto('/auth?reset=1');

    await expect(page.getByTestId('reset-invalid')).toBeVisible({ timeout: 10000 });
    await expect(page.getByTestId('reset-invalid-title')).toContainText('Lien invalide ou expiré');
  });
});
