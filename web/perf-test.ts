import { chromium } from 'playwright';

const DEPLOYED_URL = 'https://web-virid-ten-53.vercel.app';

(async () => {
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext();
  const page = await context.newPage();

  // Collect all network requests with timing
  const requests: Array<{
    url: string;
    status: number;
    duration: number;
    startTime: number;
    type: string;
  }> = [];

  const navStart = Date.now();

  page.on('request', (req) => {
    (req as any)._startTime = Date.now();
  });

  page.on('response', async (res) => {
    const req = res.request();
    const startTime = (req as any)._startTime || Date.now();
    const duration = Date.now() - startTime;
    const url = req.url();
    // Skip static assets
    if (url.includes('.js') || url.includes('.css') || url.includes('.svg') || url.includes('.png') || url.includes('.woff')) return;
    requests.push({
      url: url.replace(DEPLOYED_URL, ''),
      status: res.status(),
      duration,
      startTime: startTime - navStart,
      type: req.resourceType(),
    });
  });

  // Step 1: Navigate to deployed site
  console.log(`\n${'='.repeat(60)}`);
  console.log(`PERFORMANCE TEST — ${DEPLOYED_URL}`);
  console.log(`${'='.repeat(60)}\n`);

  const t0 = Date.now();
  await page.goto(DEPLOYED_URL, { waitUntil: 'domcontentloaded' });
  const domReady = Date.now() - t0;
  console.log(`[T+${domReady}ms] DOM content loaded`);

  // Step 2: Wait for login page to appear
  try {
    await page.waitForSelector('input[type="text"], input[name="username"], input[placeholder*="sername"], input[placeholder*="mail"]', { timeout: 15000 });
    const loginVisible = Date.now() - t0;
    console.log(`[T+${loginVisible}ms] Login form visible`);
  } catch {
    console.log(`[T+${Date.now() - t0}ms] Login form NOT found — checking page content...`);
    console.log(`  URL: ${page.url()}`);
    console.log(`  Title: ${await page.title()}`);
    const bodyText = await page.textContent('body').catch(() => '');
    console.log(`  Body preview: ${bodyText?.substring(0, 300)}`);
  }

  // Step 3: Fill and submit login
  const usernameInput = await page.$('input[type="text"], input[name="username"], input[placeholder*="sername"]');
  const passwordInput = await page.$('input[type="password"]');

  if (usernameInput && passwordInput) {
    await usernameInput.fill(process.env.E2E_ADMIN_IDENTIFIER || process.env.ADMIN_USERNAME || 'admin');
    await passwordInput.fill(process.env.E2E_ADMIN_PASSWORD || process.env.ADMIN_PASSWORD || '');
    console.log(`[T+${Date.now() - t0}ms] Credentials filled`);

    // Find and click submit button
    const submitBtn = await page.$('button[type="submit"]');
    if (submitBtn) {
      await submitBtn.click();
      console.log(`[T+${Date.now() - t0}ms] Login submitted`);
    } else {
      await passwordInput.press('Enter');
      console.log(`[T+${Date.now() - t0}ms] Login submitted (Enter key)`);
    }
  } else {
    console.log('Could not find login inputs. Trying URL-based approach...');
  }

  // Step 4: Wait for navigation after login (dashboard or home)
  try {
    await page.waitForURL((url) => {
      const p = url.pathname;
      return p === '/' || p === '/dashboard' || p.includes('/vehicles') || p.includes('/home');
    }, { timeout: 20000 });
    const loggedIn = Date.now() - t0;
    console.log(`[T+${loggedIn}ms] Navigated to: ${page.url().pathname}`);
  } catch {
    console.log(`[T+${Date.now() - t0}ms] Navigation timeout. Current URL: ${page.url()}`);
  }

  // Step 5: Wait for page to be fully idle
  try {
    await page.waitForLoadState('networkidle', { timeout: 15000 });
  } catch {
    console.log(`[T+${Date.now() - t0}ms] networkidle timeout`);
  }

  const totalTime = Date.now() - t0;
  console.log(`\n[T+${totalTime}ms] Total time to interactive\n`);

  // Print network waterfall
  console.log(`${'='.repeat(60)}`);
  console.log('NETWORK WATERFALL (API calls only)');
  console.log(`${'='.repeat(60)}`);
  console.log(`${'Start'.padEnd(10)} ${'Duration'.padEnd(10)} ${'Status'.padEnd(8)} URL`);
  console.log(`${'-'.repeat(10)} ${'-'.repeat(10)} ${'-'.repeat(8)} ${'-'.repeat(40)}`);

  requests
    .filter(r => r.url.includes('/api/'))
    .sort((a, b) => a.startTime - b.startTime)
    .forEach(r => {
      const start = `+${r.startTime}ms`.padEnd(10);
      const dur = `${r.duration}ms`.padEnd(10);
      const status = `${r.status}`.padEnd(8);
      const shortUrl = r.url.length > 60 ? r.url.substring(0, 57) + '...' : r.url;
      console.log(`${start} ${dur} ${status} ${shortUrl}`);
    });

  // Summary
  const apiCalls = requests.filter(r => r.url.includes('/api/'));
  const slowestCalls = apiCalls.sort((a, b) => b.duration - a.duration).slice(0, 5);

  console.log(`\n${'='.repeat(60)}`);
  console.log('SUMMARY');
  console.log(`${'='.repeat(60)}`);
  console.log(`Total API calls: ${apiCalls.length}`);
  console.log(`Total time: ${totalTime}ms`);
  console.log(`\nSlowest API calls:`);
  slowestCalls.forEach(r => {
    console.log(`  ${r.duration}ms — ${r.url} (${r.status})`);
  });

  // Take screenshot
  await page.screenshot({ path: 'perf-test-screenshot.png', fullPage: false });
  console.log(`\nScreenshot saved: perf-test-screenshot.png`);

  await browser.close();
})();
