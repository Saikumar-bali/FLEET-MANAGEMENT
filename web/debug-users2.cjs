const { chromium } = require('playwright');

const BASE = 'http://localhost:5173';

async function main() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

  await page.goto(`${BASE}/login`);
  await page.waitForTimeout(1000);
  await page.locator('input[placeholder="admin"]').fill('admin');
  await page.locator('input[placeholder="Enter your password"]').fill('admin@123');
  await page.click('button:has-text("Sign in")');
  await page.waitForSelector('.sidebar-account-chip', { timeout: 15000 });
  console.log('Logged in.');

  await page.goto(`${BASE}/users`);
  await page.waitForSelector('table', { timeout: 20000 });
  await page.waitForTimeout(1000);

  // Row 13 = Suresh Kumar (driver user)
  const row = page.locator('table tbody tr').nth(13);
  await row.scrollIntoViewIfNeeded();
  await page.waitForTimeout(500);

  // Print ALL elements in this row
  const allElements = await row.locator('*').all();
  console.log(`Row 13 has ${allElements.length} child elements`);
  
  const buttons = await row.locator('button').all();
  console.log(`Row 13 has ${buttons.length} buttons`);
  for (const b of buttons) {
    const text = await b.textContent();
    const cls = await b.getAttribute('class');
    const inner = await b.innerHTML();
    console.log(`  Button: "${text}" class="${cls}" inner="${inner.substring(0, 100)}"`);
  }

  const links = await row.locator('a').all();
  console.log(`Row 13 has ${links.length} links`);
  for (const l of links) {
    const text = await l.textContent();
    const href = await l.getAttribute('href');
    console.log(`  Link: "${text}" href="${href}"`);
  }

  // Click the View button
  if (buttons.length > 0) {
    const viewBtn = buttons.filter({ hasText: 'View' });
    if (await viewBtn.count() > 0) {
      console.log('Clicking View button...');
      await viewBtn.click();
      await page.waitForTimeout(2000);
      console.log('URL after click:', page.url());
    } else {
      // Try clicking the last button in the row
      console.log('No View button found, clicking last button');
      await buttons[buttons.length - 1].click();
      await page.waitForTimeout(2000);
      console.log('URL after click:', page.url());
    }
  }

  await page.screenshot({ path: 'screenshot-users.png', fullPage: true });
  console.log('Saved screenshot');

  await browser.close();
}

main().catch(e => { console.error(e); process.exit(1); });
