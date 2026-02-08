import { test, expect } from '@playwright/test';
import { loginAsTestUser } from './helpers/auth';

test.describe('Transcripts Filters', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsTestUser(page);
  });

  test('@smoke loads transcripts page and displays filters', async ({ page }) => {
    await page.goto('/transcripts');

    // Wait for filters to be visible
    await expect(
      page.locator('[data-testid="transcripts-filters"]')
    ).toBeVisible({ timeout: 10000 });

    // Wait for either transcript cards or empty state
    const firstCard = page.locator('[data-testid="transcript-card"]').first();
    const emptyState = page.locator('[data-testid="transcripts-empty"]');
    
    await expect(
      firstCard.or(emptyState)
    ).toBeVisible({ timeout: 10000 });

    // Check that at least 1 transcript card is visible (seeded data)
    const count = await page.locator('[data-testid="transcript-card"]').count();
    expect(count).toBeGreaterThanOrEqual(1);
  });

  test('filters ready shows only ready transcripts', async ({ page }) => {
    await page.goto('/transcripts');

    // Wait for page to load
    await expect(
      page.locator('[data-testid="transcripts-filters"]')
    ).toBeVisible({ timeout: 10000 });

    // Click on "ready" filter
    await page.locator('[data-testid="transcripts-filter-ready"]').click();

    // Wait for UI to stabilize - either cards with ready status or empty state
    const firstCard = page.locator('[data-testid="transcript-card"]').first();
    const emptyState = page.locator('[data-testid="transcripts-empty"]');
    
    await expect(
      firstCard.or(emptyState)
    ).toBeVisible({ timeout: 10000 });

    // If cards are visible, verify they all have data-status="ready"
    const cards = page.locator('[data-testid="transcript-card"]:visible');
    const cardCount = await cards.count();
    
    if (cardCount > 0) {
      // Verify all visible cards have ready status
      for (let i = 0; i < cardCount; i++) {
        const card = cards.nth(i);
        await expect(card).toHaveAttribute('data-status', 'ready');
      }
    }

    // Should have at least 1 ready transcript (from seed)
    expect(cardCount).toBeGreaterThanOrEqual(1);
  });

  test('filters uploaded shows only uploaded transcripts', async ({ page }) => {
    await page.goto('/transcripts');

    // Wait for page to load
    await expect(
      page.locator('[data-testid="transcripts-filters"]')
    ).toBeVisible({ timeout: 10000 });

    // Click on "uploaded" filter
    await page.locator('[data-testid="transcripts-filter-uploaded"]').click();

    // Wait for UI to stabilize - either cards with uploaded status or empty state
    const firstCard = page.locator('[data-testid="transcript-card"]').first();
    const emptyState = page.locator('[data-testid="transcripts-empty"]');
    
    await expect(
      firstCard.or(emptyState)
    ).toBeVisible({ timeout: 10000 });

    // If cards are visible, verify they all have data-status="uploaded"
    const cards = page.locator('[data-testid="transcript-card"]:visible');
    const cardCount = await cards.count();
    
    if (cardCount > 0) {
      // Verify all visible cards have uploaded status
      for (let i = 0; i < cardCount; i++) {
        const card = cards.nth(i);
        await expect(card).toHaveAttribute('data-status', 'uploaded');
      }
    }

    // Should have at least 1 uploaded transcript (from seed)
    expect(cardCount).toBeGreaterThanOrEqual(1);
  });

  test('switching filters does not crash', async ({ page }) => {
    await page.goto('/transcripts');

    // Wait for page to load
    await expect(
      page.locator('[data-testid="transcripts-filters"]')
    ).toBeVisible({ timeout: 10000 });

    // Click through all filters sequentially
    const filterIds = [
      'transcripts-filter-all',
      'transcripts-filter-ready',
      'transcripts-filter-uploaded',
      'transcripts-filter-failed',
      'transcripts-filter-all',
    ];

    for (const filterId of filterIds) {
      await page.locator(`[data-testid="${filterId}"]`).click();

      // Wait for UI to stabilize after each filter change
      const firstCard = page.locator('[data-testid="transcript-card"]').first();
      const emptyState = page.locator('[data-testid="transcripts-empty"]');
      
      await expect(
        firstCard.or(emptyState)
      ).toBeVisible({ timeout: 10000 });

      // Page should not crash - filters still visible
      await expect(
        page.locator('[data-testid="transcripts-filters"]')
      ).toBeVisible();
    }
  });
});
