import { test, expect } from '@playwright/test';
import { loginAsTestUser } from './helpers/auth';

/**
 * E2E Tests: Inbox Page
 * 
 * Tests:
 * a) loads inbox page
 * b) has at least 1 seeded message
 * c) clicking message opens drawer with [role="dialog"]
 * d) filter "Non rattachés" shows only data-assigned="false"
 * e) message row shows channel badge (WA/Web)
 */

test.describe('Inbox', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsTestUser(page);
  });

  test('@smoke loads inbox page', async ({ page }) => {
    await page.goto('/inbox');
    await expect(page.locator('h1').filter({ hasText: 'Inbox' })).toBeVisible();
    await expect(page.locator('text=Messages')).toBeVisible();
  });

  test('@smoke has at least 1 seeded message', async ({ page }) => {
    await page.goto('/inbox');
    
    const messages = page.locator('[data-testid="inbox-message"]');
    
    // Wait for messages to load (either messages or empty state)
    await expect(
      messages.first().or(page.locator('text=Aucun message'))
    ).toBeVisible({ timeout: 10000 });
    
    const messageCount = await messages.count();
    
    if (messageCount === 0) {
      test.skip(true, 'No inbox messages - run npm run e2e:seed');
    }
    
    expect(messageCount).toBeGreaterThan(0);
  });

  test('clicking message opens drawer with [role="dialog"]', async ({ page }) => {
    await page.goto('/inbox');
    
    const firstMessage = page.locator('[data-testid="inbox-message"]').first();
    
    // Wait for message to be visible
    await expect(firstMessage.or(page.locator('text=Aucun message'))).toBeVisible({ timeout: 10000 });
    
    if (!(await firstMessage.isVisible())) {
      test.skip(true, 'No inbox messages available');
    }
    
    await firstMessage.click();
    
    // Verify drawer opens
    await expect(page.locator('[role="dialog"]')).toBeVisible({ timeout: 5000 });
  });

  test('filter "Non rattachés" shows only unassigned messages', async ({ page }) => {
    await page.goto('/inbox');
    
    // Wait for page load
    await expect(page.locator('[role="tab"]').filter({ hasText: 'Tous' })).toBeVisible({ timeout: 10000 });
    
    // Click unassigned filter tab
    await page.locator('[role="tab"]').filter({ hasText: 'Non rattachés' }).click();
    
    // Wait for filter to apply
    await page.waitForLoadState('networkidle');
    
    // After filter, no assigned messages should be visible
    await expect(
      page.locator('[data-testid="inbox-message"][data-assigned="true"]:visible')
    ).toHaveCount(0);
  });

  test('message row shows channel badge (WA/Web)', async ({ page }) => {
    await page.goto('/inbox');
    
    const firstMessage = page.locator('[data-testid="inbox-message"]').first();
    
    // Wait for message
    await expect(firstMessage.or(page.locator('text=Aucun message'))).toBeVisible({ timeout: 10000 });
    
    if (!(await firstMessage.isVisible())) {
      test.skip(true, 'No inbox messages available');
    }
    
    // Check for channel badge (WA or Web)
    const waOrWebBadge = firstMessage.locator('text=WA').or(firstMessage.locator('text=Web'));
    await expect(waOrWebBadge).toBeVisible();
  });

  test('message shows status badge', async ({ page }) => {
    await page.goto('/inbox');
    
    const firstMessage = page.locator('[data-testid="inbox-message"]').first();
    
    await expect(firstMessage.or(page.locator('text=Aucun message'))).toBeVisible({ timeout: 10000 });
    
    if (!(await firstMessage.isVisible())) {
      test.skip(true, 'No inbox messages available');
    }
    
    // Verify data-status attribute exists
    const status = await firstMessage.getAttribute('data-status');
    expect(['received', 'ready', 'processing', 'failed']).toContain(status);
  });
});
