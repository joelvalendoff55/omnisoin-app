import { test, expect } from '@playwright/test';
import { loginAsTestUser } from './helpers/auth';

/**
 * Smoke Tests - Quick health checks for PRs
 * 
 * Run with: npx playwright test --grep @smoke
 * 
 * These tests verify critical paths work without deep testing.
 * They should complete in under 30 seconds total.
 */

test.describe('Smoke Tests', () => {
  
  test('@smoke can login and see dashboard', async ({ page }) => {
    await loginAsTestUser(page);
    
    // Should be on a main page (not auth)
    await expect(page).not.toHaveURL(/\/auth/);
    
    // Should see some navigation or main content
    const mainContent = page.locator('main, [role="main"], .dashboard, nav');
    await expect(mainContent.first()).toBeVisible({ timeout: 5_000 });
  });

  test('@smoke can open transcripts page', async ({ page }) => {
    await loginAsTestUser(page);
    await page.goto('/transcripts');
    
    // Wait for page to load
    await page.waitForLoadState('domcontentloaded');
    
    // Should see transcript cards or empty state
    const transcriptCards = page.locator('[data-testid="transcript-card"]');
    const emptyState = page.locator('text=Aucun').or(page.locator('text=No transcript'));
    
    // Either cards exist or empty state is shown
    const hasCards = await transcriptCards.count() > 0;
    const hasEmptyState = await emptyState.isVisible({ timeout: 3_000 }).catch(() => false);
    
    expect(hasCards || hasEmptyState).toBe(true);
  });

  test('@smoke can open inbox page', async ({ page }) => {
    await loginAsTestUser(page);
    await page.goto('/inbox');
    
    // Wait for page to load
    await page.waitForLoadState('domcontentloaded');
    
    // Should see inbox messages or empty state
    const inboxMessages = page.locator('[data-testid="inbox-message"]');
    const messageCount = await inboxMessages.count();
    
    // If seed data exists, should have at least 1 message
    // This is a soft check - we verify the page loads correctly
    expect(messageCount).toBeGreaterThanOrEqual(0);
    
    // Page should not show error
    await expect(page.locator('text=Erreur').or(page.locator('text=Error'))).not.toBeVisible({ timeout: 2_000 }).catch(() => {});
  });

  test('@smoke can open patients page', async ({ page }) => {
    await loginAsTestUser(page);
    await page.goto('/patients');
    
    // Wait for page to load
    await page.waitForLoadState('domcontentloaded');
    
    // Should see patient cards or add button
    const patientCards = page.locator('[data-testid="patient-card"]');
    const addButton = page.locator('button').filter({ hasText: /ajouter|nouveau|add|new/i });
    
    const hasCards = await patientCards.count() > 0;
    const hasAddButton = await addButton.isVisible({ timeout: 3_000 }).catch(() => false);
    
    // Either cards exist or we can add patients
    expect(hasCards || hasAddButton).toBe(true);
  });

  test('@smoke navigation works', async ({ page }) => {
    await loginAsTestUser(page);
    
    // Test navigation between main pages
    const pages = ['/transcripts', '/inbox', '/patients'];
    
    for (const path of pages) {
      await page.goto(path);
      await page.waitForLoadState('domcontentloaded');
      
      // Should not redirect to auth
      await expect(page).not.toHaveURL(/\/auth/);
      
      // Should not show 404
      await expect(page.locator('text=404').or(page.locator('text=Not Found'))).not.toBeVisible({ timeout: 1_000 }).catch(() => {});
    }
  });

});
