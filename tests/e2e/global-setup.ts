import { chromium, FullConfig } from '@playwright/test';

/**
 * Global Setup for E2E Tests
 * 
 * This setup runs before all tests to verify:
 * 1. Test user credentials are configured
 * 2. Test user can login
 * 3. Required seed data exists
 * 
 * CI Mode (process.env.CI):
 * - Strict validation: fails fast on missing data
 * 
 * Local Mode:
 * - Warnings only, tests can still run
 * 
 * The seed script (npm run e2e:seed) should be run before this.
 * In CI, the seed runs automatically before tests.
 */

interface ValidationResult {
  name: string;
  status: 'ok' | 'warn' | 'fail';
  message?: string;
}

async function globalSetup(config: FullConfig) {
  const baseURL = config.projects[0].use.baseURL || 'http://localhost:8080';
  const isStrict = !!process.env.CI;
  
  // Check for required environment variables
  const testEmail = process.env.TEST_USER_EMAIL;
  const testPassword = process.env.TEST_USER_PASSWORD;
  
  if (!testEmail || !testPassword) {
    throw new Error(`
╔══════════════════════════════════════════════════════════════════╗
║  ❌ MISSING TEST CREDENTIALS                                      ║
╠══════════════════════════════════════════════════════════════════╣
║  TEST_USER_EMAIL and TEST_USER_PASSWORD are required.            ║
║                                                                  ║
║  Set them as environment variables:                              ║
║    export TEST_USER_EMAIL=your-test@email.com                    ║
║    export TEST_USER_PASSWORD=yourpassword                        ║
╚══════════════════════════════════════════════════════════════════╝
`);
  }

  console.log('\n🔍 Running E2E global setup...');
  console.log(`   Base URL: ${baseURL}`);
  console.log(`   Test User: ${testEmail}`);
  console.log(`   Mode: ${isStrict ? 'STRICT (CI)' : 'LENIENT (local)'}`);

  const browser = await chromium.launch();
  const context = await browser.newContext();
  const page = await context.newPage();

  const results: ValidationResult[] = [];

  try {
    // Step 1: Navigate to auth page
    console.log('   → Navigating to /auth...');
    await page.goto(`${baseURL}/auth`, { timeout: 30000 });
    
    // Wait for form to be visible
    await page.waitForSelector('form', { timeout: 10000 });

    // Step 2: Login
    console.log('   → Logging in...');
    await page.fill('input[type="email"]', testEmail);
    await page.fill('input[type="password"]', testPassword);
    await page.click('button[type="submit"]');

    // Wait for navigation after login
    try {
      await page.waitForURL(/\/(patients|transcripts|inbox|settings)?$/, { timeout: 15000 });
      results.push({ name: 'Login', status: 'ok' });
    } catch (e) {
      // Check if there's an error message
      const errorVisible = await page.locator('text=incorrect').or(page.locator('text=invalide')).isVisible();
      if (errorVisible) {
        throw new Error(`
╔══════════════════════════════════════════════════════════════════╗
║  ❌ LOGIN FAILED: Invalid credentials                             ║
╠══════════════════════════════════════════════════════════════════╣
║  Please check TEST_USER_EMAIL and TEST_USER_PASSWORD.            ║
║                                                                  ║
║  Troubleshooting:                                                ║
║  1. Verify the user exists (signup via /auth)                    ║
║  2. Verify auto_confirm_email is enabled                         ║
║  3. Run: npm run e2e:seed                                        ║
╚══════════════════════════════════════════════════════════════════╝
`);
      }
      throw new Error(`
╔══════════════════════════════════════════════════════════════════╗
║  ❌ LOGIN FAILED: Navigation timeout                              ║
╠══════════════════════════════════════════════════════════════════╣
║  User may not exist or credentials are incorrect.                ║
║                                                                  ║
║  Troubleshooting:                                                ║
║  1. Create a test user via /auth (signup)                        ║
║  2. Run: npm run e2e:seed                                        ║
╚══════════════════════════════════════════════════════════════════╝
`);
    }

    // Step 3: Check transcripts data
    console.log('   → Checking transcripts data...');
    await page.goto(`${baseURL}/transcripts`, { timeout: 15000 });
    await page.waitForLoadState('networkidle');

    const readyTranscript = page.locator('[data-testid="transcript-card"][data-status="ready"]');
    const anyTranscript = page.locator('[data-testid="transcript-card"]');
    
    const hasReadyTranscript = await readyTranscript.count() > 0;
    const hasAnyTranscript = await anyTranscript.count() > 0;

    if (!hasAnyTranscript) {
      const msg = 'No transcript cards found. Run: npm run e2e:seed';
      results.push({ name: 'Transcripts', status: isStrict ? 'fail' : 'warn', message: msg });
    } else if (!hasReadyTranscript) {
      const msg = `No "ready" transcript found (${await anyTranscript.count()} exist)`;
      results.push({ name: 'Ready Transcript', status: isStrict ? 'fail' : 'warn', message: msg });
    } else {
      results.push({ name: 'Transcripts', status: 'ok' });
    }

    // Step 4: Check inbox data
    console.log('   → Checking inbox data...');
    await page.goto(`${baseURL}/inbox`, { waitUntil: 'domcontentloaded' });
    // Wait for either messages or empty state
    await page.waitForSelector('[data-testid="inbox-message"], :has-text("Aucun message")', { timeout: 5000 }).catch(() => {});

    const inboxMessage = page.locator('[data-testid="inbox-message"]');
    const hasInboxMessage = await inboxMessage.count() > 0;

    if (!hasInboxMessage) {
      const msg = 'No inbox messages found. Run: npm run e2e:seed';
      results.push({ name: 'Inbox Messages', status: isStrict ? 'fail' : 'warn', message: msg });
    } else {
      results.push({ name: 'Inbox Messages', status: 'ok' });
    }

    // Print summary
    console.log('\n📊 Validation Summary:');
    console.log('   ─────────────────────────────────');
    
    let okCount = 0;
    let warnCount = 0;
    let failCount = 0;
    
    for (const result of results) {
      const icon = result.status === 'ok' ? '✅' : result.status === 'warn' ? '⚠️' : '❌';
      console.log(`   ${icon} ${result.name}${result.message ? `: ${result.message}` : ''}`);
      
      if (result.status === 'ok') okCount++;
      else if (result.status === 'warn') warnCount++;
      else failCount++;
    }
    
    console.log('   ─────────────────────────────────');
    console.log(`   OK: ${okCount} | WARN: ${warnCount} | FAIL: ${failCount}`);

    // In strict mode, fail if any validation failed
    if (isStrict && failCount > 0) {
      throw new Error(`
╔══════════════════════════════════════════════════════════════════╗
║  ❌ CI STRICT MODE: Validation failed                             ║
╠══════════════════════════════════════════════════════════════════╣
║  ${failCount} validation(s) failed. Seed data is missing.              ║
║                                                                  ║
║  The CI pipeline requires all seed data to be present.           ║
║  Check that npm run e2e:seed ran successfully.                   ║
╚══════════════════════════════════════════════════════════════════╝
`);
    }

    if (warnCount > 0) {
      console.log('\n⚠️  Global setup completed with warnings.');
      console.log('   Some tests may fail or be skipped.');
      console.log('   To fix: npm run e2e:seed\n');
    } else {
      console.log('\n✅ Global setup complete! All seed data verified.\n');
    }

  } catch (error) {
    await context.close();
    await browser.close();
    throw error;
  } finally {
    await context.close();
    await browser.close();
  }
}

export default globalSetup;
