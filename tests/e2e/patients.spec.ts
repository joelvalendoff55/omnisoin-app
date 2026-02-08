import { test, expect } from '@playwright/test';
import { loginAsTestUser } from './helpers/auth';

/**
 * E2E Tests: Patients Page
 * 
 * Tests:
 * a) loads patients page
 * b) displays seeded patients
 * c) opens patient detail page on click
 * d) displays patient info
 * e) shows patient transcripts list
 */

test.describe('Patients', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsTestUser(page);
  });

  test('@smoke loads patients page', async ({ page }) => {
    await page.goto('/patients');
    await expect(page.locator('h1').filter({ hasText: /patients?/i })).toBeVisible();
  });

  test('@smoke displays seeded patients', async ({ page }) => {
    await page.goto('/patients');
    
    const patientCards = page.locator('[data-testid="patient-card"]');
    
    // Wait for patients to load (either cards or empty state)
    await expect(
      patientCards.first().or(page.locator('[data-testid="patients-empty"]'))
    ).toBeVisible({ timeout: 10000 });
    
    const cardCount = await patientCards.count();
    
    if (cardCount === 0) {
      test.skip(true, 'No patients - run npm run e2e:seed');
    }
    
    expect(cardCount).toBeGreaterThan(0);
  });

  test('opens patient detail page on click', async ({ page }) => {
    await page.goto('/patients');
    
    const firstCard = page.locator('[data-testid="patient-card"]').first();
    
    await expect(
      firstCard.or(page.locator('[data-testid="patients-empty"]'))
    ).toBeVisible({ timeout: 10000 });
    
    if (!(await firstCard.isVisible())) {
      test.skip(true, 'No patients available');
    }
    
    await firstCard.click();
    
    // Should navigate to patient detail page
    await expect(page).toHaveURL(/\/patients\/[a-f0-9-]+/i, { timeout: 5000 });
  });

  test('displays patient info', async ({ page }) => {
    await page.goto('/patients');
    
    const firstCard = page.locator('[data-testid="patient-card"]').first();
    
    await expect(
      firstCard.or(page.locator('[data-testid="patients-empty"]'))
    ).toBeVisible({ timeout: 10000 });
    
    if (!(await firstCard.isVisible())) {
      test.skip(true, 'No patients available');
    }
    
    await firstCard.click();
    
    // Wait for detail page
    await expect(page).toHaveURL(/\/patients\/[a-f0-9-]+/i, { timeout: 5000 });
    
    // Verify patient name is displayed using the data-testid
    const patientName = page.locator('[data-testid="patient-name"]');
    await expect(patientName).toBeVisible({ timeout: 5000 });
    
    // Check for common patient info fields
    const pageContent = page.locator('main, [role="main"], .container');
    
    // At least the page should have loaded with content
    await expect(pageContent.first()).toBeVisible();
  });

  test('shows patient transcripts section', async ({ page }) => {
    await page.goto('/patients');
    
    const firstCard = page.locator('[data-testid="patient-card"]').first();
    
    await expect(
      firstCard.or(page.locator('[data-testid="patients-empty"]'))
    ).toBeVisible({ timeout: 10000 });
    
    if (!(await firstCard.isVisible())) {
      test.skip(true, 'No patients available');
    }
    
    await firstCard.click();
    
    await expect(page).toHaveURL(/\/patients\/[a-f0-9-]+/i, { timeout: 5000 });
    
    // Verify transcripts section is visible using stable data-testid
    await expect(
      page.locator('[data-testid="patient-transcripts-section"]').or(
        page.locator('[data-testid="patient-transcripts-empty"]')
      )
    ).toBeVisible({ timeout: 10000 });
  });

  test('clicks transcript row and opens drawer', async ({ page }) => {
    await page.goto('/patients');
    
    const firstCard = page.locator('[data-testid="patient-card"]').first();
    
    await expect(
      firstCard.or(page.locator('[data-testid="patients-empty"]'))
    ).toBeVisible({ timeout: 10000 });
    
    if (!(await firstCard.isVisible())) {
      test.skip(true, 'No patients available');
    }
    
    await firstCard.click();
    
    await expect(page).toHaveURL(/\/patients\/[a-f0-9-]+/i, { timeout: 5000 });
    
    // Wait for transcripts section
    const transcriptRow = page.locator('[data-testid="patient-transcript-row"]').first();
    const emptyState = page.locator('[data-testid="patient-transcripts-empty"]');
    
    await expect(
      transcriptRow.or(emptyState)
    ).toBeVisible({ timeout: 10000 });
    
    if (!(await transcriptRow.isVisible())) {
      test.skip(true, 'No transcripts for this patient');
    }
    
    // Click the transcript row
    await transcriptRow.click();
    
    // Assert drawer opens
    const drawer = page.locator('[role="dialog"]');
    await expect(drawer).toBeVisible({ timeout: 5000 });
    
    // Verify drawer contains transcript details
    await expect(drawer.locator('text=Détail transcription')).toBeVisible();
    
    // Close the drawer by pressing Escape or clicking outside
    await page.keyboard.press('Escape');
    
    // Assert drawer closed
    await expect(drawer).not.toBeVisible({ timeout: 3000 });
  });

  test('patient card shows basic info', async ({ page }) => {
    await page.goto('/patients');
    
    const firstCard = page.locator('[data-testid="patient-card"]').first();
    
    await expect(
      firstCard.or(page.locator('[data-testid="patients-empty"]'))
    ).toBeVisible({ timeout: 10000 });
    
    if (!(await firstCard.isVisible())) {
      test.skip(true, 'No patients available');
    }
    
    // Verify card has patient name
    const cardText = await firstCard.textContent();
    expect(cardText).toBeTruthy();
    expect(cardText!.length).toBeGreaterThan(0);
  });
});
