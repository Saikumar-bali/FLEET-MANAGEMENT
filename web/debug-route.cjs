const { chromium } = require('playwright');
const BASE = 'http://localhost:5173';

async function main() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();

  const errors = [];
  page.on('console', msg => { if (msg.type() === 'error') errors.push(msg.text()); });
  page.on('pageerror', err => errors.push(err.message));

  // Login
  await page.goto(`${BASE}/login`);
  await page.waitForTimeout(500);
  await page.locator('input[placeholder="admin"]').fill('admin');
  await page.locator('input[placeholder="Enter your password"]').fill('admin@123');
  await page.click('button:has-text("Sign in")');
  await page.waitForSelector('.sidebar-account-chip', { timeout: 15000 });
  console.log('Logged in.');

  // Navigate to /driver-submissions — wait for workspace to load
  await page.goto(`${BASE}/driver-submissions`);
  await page.waitForTimeout(5000);

  console.log('URL:', page.url());
  console.log('Title:', await page.title());

  const bodyText = await page.locator('body').textContent();
  console.log('Body text (first 500 chars):', bodyText?.substring(0, 500));

  // Check for specific elements
  const h2 = await page.locator('h2').allTextContents();
  console.log('H2 elements:', h2);

  const buttons = await page.locator('button').allTextContents();
  console.log('Buttons:', buttons.slice(0, 10));

  const links = await page.locator('a').allTextContents();
  console.log('Links:', links.slice(0, 10));

  // Check for error states
  const errorEl = await page.locator('.error, [class*="error"], [class*="Error"]').count();
  console.log('Error elements:', errorEl);

  if (errors.length > 0) {
    console.log('Console errors:', errors);
  }

  // Take screenshot
  await page.screenshot({ path: 'D:/FLEET-MANAGEMENT/web/debug-screenshot.png', fullPage: true });
  console.log('Screenshot saved to debug-screenshot.png');

  await browser.close();
}

main().catch(console.error);
