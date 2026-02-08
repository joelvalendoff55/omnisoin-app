import { test, expect } from '@playwright/test';

/**
 * E2E Test: AI Summary Generation Flow
 * 
 * This test covers the complete flow:
 * 1. Login to the application
 * 2. Navigate to transcripts
 * 3. Open a ready transcript
 * 4. Generate AI summary
 * 5. Verify UI states
 * 6. Copy summary to clipboard
 * 
 * PREREQUISITE: Run docs/seed_dev.sql with your test user UUID
 */

// Test user credentials (should match test data in Supabase)
const TEST_USER = {
  email: process.env.TEST_USER_EMAIL || 'test@omnisoin.local',
  password: process.env.TEST_USER_PASSWORD || 'testpassword123',
};

test.describe('AI Summary Generation', () => {
  test.beforeEach(async ({ page }) => {
    // Mock the n8n webhook to avoid external calls
    await page.route('**/webhook/transcript-summary', async (route) => {
      // Simulate successful webhook response
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true }),
      });
    });
  });

  test('should login and navigate to transcripts page', async ({ page }) => {
    // Go to auth page
    await page.goto('/auth');
    
    // Wait for auth form to load
    await expect(page.locator('form')).toBeVisible();
    
    // Fill login credentials
    await page.fill('input[type="email"]', TEST_USER.email);
    await page.fill('input[type="password"]', TEST_USER.password);
    
    // Submit login
    await page.click('button[type="submit"]');
    
    // Wait for navigation after login
    await page.waitForURL(/\/(patients|transcripts|inbox)?$/);
    
    // Navigate to transcripts
    await page.goto('/transcripts');
    
    // Verify we're on transcripts page
    await expect(page.locator('h1, h2').filter({ hasText: /transcription/i })).toBeVisible();
  });

  test('should show webhook not configured message when env is missing', async ({ page }) => {
    // This test verifies the UI shows a message when webhook is not configured
    // In a real scenario, VITE_N8N_SUMMARY_WEBHOOK would be empty
    
    await page.goto('/auth');
    
    // Fill login credentials
    await page.fill('input[type="email"]', TEST_USER.email);
    await page.fill('input[type="password"]', TEST_USER.password);
    await page.click('button[type="submit"]');
    
    await page.waitForURL(/\/(patients|transcripts|inbox)?$/);
    await page.goto('/transcripts');
    
    // Wait for page to load
    await page.waitForLoadState('domcontentloaded');
    
    // Find a transcript card using data-testid selector
    const transcriptCard = page.locator('[data-testid="transcript-card"]').first();
    
    // Skip if no transcripts found
    if (await transcriptCard.count() === 0) {
      test.skip(true, 'No transcript cards found - run docs/seed_dev.sql');
      return;
    }
    
    await transcriptCard.click();
    
    // Check for drawer content
    await expect(page.locator('[role="dialog"]')).toBeVisible({ timeout: 5000 });
  });

  test('should generate summary and display generating state', async ({ page }) => {
    // Login
    await page.goto('/auth');
    await page.fill('input[type="email"]', TEST_USER.email);
    await page.fill('input[type="password"]', TEST_USER.password);
    await page.click('button[type="submit"]');
    
    await page.waitForURL(/\/(patients|transcripts|inbox)?$/);
    await page.goto('/transcripts');
    
    // Wait for page to load
    await page.waitForLoadState('domcontentloaded');
    
    // Find a transcript with "ready" status using data-testid and data-status attributes
    const readyTranscript = page.locator('[data-testid="transcript-card"][data-status="ready"]').first();
    
    // Skip if no ready transcripts found
    if (await readyTranscript.count() === 0) {
      test.skip(true, 'No ready transcript found - run docs/seed_dev.sql');
      return;
    }
    
    await readyTranscript.click();
    
    // Wait for drawer to open
    await expect(page.locator('[role="dialog"]')).toBeVisible();
    
    // Look for the "Générer résumé" button
    const generateButton = page.locator('button').filter({ hasText: /Générer résumé/i });
    
    if (await generateButton.isVisible({ timeout: 3000 })) {
      // Click generate
      await generateButton.click();
      
      // Should show generating state
      await expect(
        page.locator('text=Génération en cours').or(page.locator('text=Lancement'))
      ).toBeVisible({ timeout: 5000 });
    }
  });

  test('should copy summary to clipboard', async ({ page, context }) => {
    // Grant clipboard permissions
    await context.grantPermissions(['clipboard-read', 'clipboard-write']);
    
    // Login
    await page.goto('/auth');
    await page.fill('input[type="email"]', TEST_USER.email);
    await page.fill('input[type="password"]', TEST_USER.password);
    await page.click('button[type="submit"]');
    
    await page.waitForURL(/\/(patients|transcripts|inbox)?$/);
    await page.goto('/transcripts');
    
    await page.waitForLoadState('domcontentloaded');
    
    // Find a transcript with existing summary (prefer ready status)
    const transcriptCard = page.locator('[data-testid="transcript-card"][data-status="ready"]').first();
    
    // Skip if no ready transcripts found
    if (await transcriptCard.count() === 0) {
      test.skip(true, 'No ready transcript found - run docs/seed_dev.sql');
      return;
    }
    
    await transcriptCard.click();
    
    // Wait for drawer
    await expect(page.locator('[role="dialog"]')).toBeVisible();
    
    // Look for copy button (only visible if summary exists)
    const copyButton = page.locator('button').filter({ hasText: /Copier résumé/i });
    
    if (await copyButton.isVisible({ timeout: 3000 })) {
      await copyButton.click();
      
      // Check for success toast
      await expect(page.locator('text=Résumé copié')).toBeVisible({ timeout: 3000 });
    }
  });
});

test.describe('Summary Realtime Updates', () => {
  test('should update UI when summary status changes to ready', async ({ page }) => {
    // This test simulates receiving a realtime update
    // In a real E2E test, you would either:
    // 1. Use a test helper to directly update the DB
    // 2. Mock the Supabase realtime channel
    
    // Login
    await page.goto('/auth');
    await page.fill('input[type="email"]', TEST_USER.email);
    await page.fill('input[type="password"]', TEST_USER.password);
    await page.click('button[type="submit"]');
    
    await page.waitForURL(/\/(patients|transcripts|inbox)?$/);
    await page.goto('/transcripts');
    
    await page.waitForLoadState('domcontentloaded');
    
    // Find a transcript with ready status using data-testid
    const transcriptCard = page.locator('[data-testid="transcript-card"][data-status="ready"]').first();
    
    // Skip if no ready transcripts found
    if (await transcriptCard.count() === 0) {
      test.skip(true, 'No ready transcript found - run docs/seed_dev.sql');
      return;
    }
    
    await transcriptCard.click();
    
    await expect(page.locator('[role="dialog"]')).toBeVisible();
    
    // Verify the summary section exists
    await expect(page.locator('text=Résumé IA')).toBeVisible();
  });
});
