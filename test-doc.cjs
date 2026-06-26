const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  const apiCalls = [];
  page.on('response', async (response) => {
    const url = response.url();
    if (url.includes('/api/') || url.includes('.r2.cloudflarestorage.com')) {
      let body = '';
      try { body = (await response.text()).substring(0, 2000); } catch {}
      apiCalls.push({ 
        url, 
        status: response.status(), 
        contentType: response.headers()['content-type'],
        body,
        fromCache: response.fromCache()
      });
    }
  });
  page.on('request', (request) => {
    const url = request.url();
    if (url.includes('/api/') || url.includes('.r2.cloudflarestorage.com')) {
      console.log(`\n>>> ${request.method()} ${url}`);
      console.log('Headers:', JSON.stringify(request.headers(), null, 2));
    }
  });

  // Navigate and login
  await page.goto('https://web-virid-ten-53.vercel.app/login', { waitUntil: 'networkidle', timeout: 30000 });
  await page.waitForTimeout(1000);

  console.log('\n=== LOGGING IN ===');
  await page.fill('input[placeholder="admin"]', 'admin@example.com');
  await page.fill('input[placeholder="Enter your password"]', 'admin@123');
  await page.click('button:has-text("Sign in")');

  await page.waitForTimeout(5000);
  console.log('\nAfter login URL:', page.url());

  // Now navigate to a vehicle page  
  console.log('\n=== NAVIGATING TO VEHICLE ===');
  await page.goto('https://web-virid-ten-53.vercel.app/vehicles/cmqs2q04l00luu89ohexab72m', { waitUntil: 'networkidle', timeout: 30000 });
  await page.waitForTimeout(3000);

  // Look for documents section
  const pageText = await page.textContent('body');
  console.log('\nPage text (first 1000):', pageText.substring(0, 1000));

  // Try to find document-related button or link
  const docLinks = await page.locator('a, button, [role="tab"]').count();
  console.log(`\nTotal interactive elements: ${docLinks}`);
  
  for (let i = 0; i < Math.min(docLinks, 30); i++) {
    const el = page.locator('a, button, [role="tab"]').nth(i);
    const text = (await el.textContent())?.trim();
    if (text) console.log(`Element ${i}: "${text}"`);
  }

  console.log('\n=== ALL API CALLS ===');
  for (const call of apiCalls) {
    console.log(`\nURL: ${call.url}`);
    console.log(`Status: ${call.status} | Content-Type: ${call.contentType}`);
    console.log(`From cache: ${call.fromCache}`);
    console.log(`Body: ${call.body.substring(0, 1000)}`);
  }

  await browser.close();
})();
