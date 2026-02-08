import { test, expect } from '@playwright/test';
import { loginAsTestUser } from './helpers/auth';

test.describe('Inbox Filters', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsTestUser(page);
    await page.goto('/inbox');
  });

  test('@smoke loads inbox page and displays filters', async ({ page }) => {
    // Attendre chargement stable
    const firstMessage = page.locator('[data-testid="inbox-message"]').first();
    await expect(
      firstMessage.or(page.locator('[data-testid="inbox-empty"]'))
    ).toBeVisible({ timeout: 10000 });

    // Vérifier présence filtres (tabs ou boutons)
    const allFilter = page.locator('[role="tab"]', { hasText: /tous/i }).or(
      page.locator('button', { hasText: /tous/i })
    );
    await expect(allFilter.first()).toBeVisible();
  });

  test('filters "Non rattachés" shows only unassigned messages', async ({ page }) => {
    // Clic filtre Non rattachés
    const unassignedFilter = page.locator('[role="tab"]', { hasText: /non rattachés/i }).or(
      page.locator('button', { hasText: /non rattachés/i })
    );
    await unassignedFilter.first().click();

    // Attendre stabilisation UI
    const firstMessage = page.locator('[data-testid="inbox-message"]:visible').first();
    await expect(
      firstMessage.or(page.locator('[data-testid="inbox-empty"]'))
    ).toBeVisible({ timeout: 10000 });

    // Vérifier tous messages visibles sont non rattachés
    const messages = page.locator('[data-testid="inbox-message"]:visible');
    const messageCount = await messages.count();
    
    if (messageCount > 0) {
      for (let i = 0; i < messageCount; i++) {
        const msg = messages.nth(i);
        await expect(msg).toHaveAttribute('data-assigned', 'false');
      }
    }
  });

  test('filters "Rattachés" shows only assigned messages', async ({ page }) => {
    // Clic filtre Rattachés (si existe)
    const assignedFilter = page.locator('[role="tab"]', { hasText: /rattachés/i }).or(
      page.locator('button', { hasText: /rattachés/i })
    );
    
    // Si filtre n'existe pas, skip test
    if (await assignedFilter.count() === 0) {
      test.skip(true, 'No "Rattachés" filter found');
      return;
    }

    await assignedFilter.first().click();

    // Attendre stabilisation UI
    const firstMessage = page.locator('[data-testid="inbox-message"]:visible').first();
    await expect(
      firstMessage.or(page.locator('[data-testid="inbox-empty"]'))
    ).toBeVisible({ timeout: 10000 });

    // Vérifier tous messages visibles sont rattachés
    const messages = page.locator('[data-testid="inbox-message"]:visible');
    const messageCount = await messages.count();
    
    if (messageCount > 0) {
      for (let i = 0; i < messageCount; i++) {
        const msg = messages.nth(i);
        await expect(msg).toHaveAttribute('data-assigned', 'true');
      }
    }
  });

  test('switching filters does not crash', async ({ page }) => {
    // Tester tous les filtres séquentiellement
    const allFilter = page.locator('[role="tab"]', { hasText: /tous/i }).or(
      page.locator('button', { hasText: /tous/i })
    ).first();
    
    const unassignedFilter = page.locator('[role="tab"]', { hasText: /non rattachés/i }).or(
      page.locator('button', { hasText: /non rattachés/i })
    ).first();

    // Clic séquentiel
    await unassignedFilter.click();
    await expect(
      page.locator('[data-testid="inbox-message"]:visible').first()
        .or(page.locator('[data-testid="inbox-empty"]'))
    ).toBeVisible({ timeout: 10000 });

    await allFilter.click();
    await expect(
      page.locator('[data-testid="inbox-message"]:visible').first()
        .or(page.locator('[data-testid="inbox-empty"]'))
    ).toBeVisible({ timeout: 10000 });

    // Pas de crash = succès
    expect(true).toBe(true);
  });
});
