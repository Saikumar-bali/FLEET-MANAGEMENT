const { chromium } = require('playwright');

const BASE = 'http://localhost:5173';

async function main() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

  // Login
  await page.goto(`${BASE}/login`);
  await page.waitForTimeout(1000);
  await page.locator('input[placeholder="admin"]').fill('admin');
  await page.locator('input[placeholder="Enter your password"]').fill('admin@123');
  await page.click('button:has-text("Sign in")');
  await page.waitForSelector('.sidebar-account-chip', { timeout: 15000 });
  console.log('Logged in.');

  // Go to Users
  await page.goto(`${BASE}/users`);
  console.log('Waiting for users page...');
  await page.waitForTimeout(5000);
  console.log('URL:', page.url());

  // Check current text
  const bodyText = await page.locator('body').textContent();
  console.log('Body text snippet:', bodyText?.substring(0, 300));

  // Wait for either table or loading to resolve
  try {
    await page.waitForSelector('table', { timeout: 15000 });
    console.log('Table found!');
  } catch {
    console.log('No table found, trying to wait more...');
    await page.waitForTimeout(5000);
  }

  await page.screenshot({ path: 'screenshot-01-users.png', fullPage: true });
  console.log('Saved screenshot');

  // Check row count
  const rows = page.locator('table tbody tr');
  const count = await rows.count();
  console.log(`Rows: ${count}`);

  // Click a View button for a driver user
  if (count > 0) {
    for (let i = 0; i < count; i++) {
      const row = rows.nth(i);
      const text = await row.textContent();
      console.log(`Row ${i}: ${text?.substring(0, 100)}`);
    }
  }

  await browser.close();
}

main().catch(e => { console.error(e); process.exit(1); });
