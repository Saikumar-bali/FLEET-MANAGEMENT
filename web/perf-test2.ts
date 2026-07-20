import { chromium } from 'playwright';

const DEPLOYED_URL = 'https://web-virid-ten-53.vercel.app';
const BACKEND_URL = 'https://backend-alpha-ten-24.vercel.app';

(async () => {
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext();
  const page = await context.newPage();

  const allRequests: Array<{
    url: string;
    status: number | null;
    duration: number;
    startTime: number;
    method: string;
    failed: boolean;
    errorText?: string;
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
    if (!url.includes('/api/')) return;
    allRequests.push({
      url: url.replace(BACKEND_URL, '[BE]').replace(DEPLOYED_URL, '[FE]'),
      status: res.status(),
      duration,
      startTime: startTime - navStart,
      method: req.method(),
      failed: false,
    });
  });

  page.on('requestfailed', (req) => {
    const startTime = (req as any)._startTime || Date.now();
    const url = req.url();
    if (!url.includes('/api/')) return;
    allRequests.push({
      url: url.replace(BACKEND_URL, '[BE]').replace(DEPLOYED_URL, '[FE]'),
      status: null,
      duration: Date.now() - startTime,
      startTime: startTime - navStart,
      method: req.method(),
      failed: true,
      errorText: req.failure()?.errorText,
    });
  });

  console.log(`\n${'='.repeat(70)}`);
  console.log(`DETAILED PERFORMANCE TEST — ${DEPLOYED_URL}`);
  console.log(`${'='.repeat(70)}\n`);

  // Step 1: Navigate
  const t0 = Date.now();
  await page.goto(DEPLOYED_URL, { waitUntil: 'domcontentloaded' });
  console.log(`[+${Date.now() - t0}ms] DOM loaded`);

  // Step 2: Wait for login form
  await page.waitForSelector('input', { timeout: 10000 });
  console.log(`[+${Date.now() - t0}ms] Login form ready`);

  // Step 3: Login
  await page.fill('input[type="text"], input[name="username"]', process.env.E2E_ADMIN_IDENTIFIER || process.env.ADMIN_USERNAME || 'admin');
  await page.fill('input[type="password"]', process.env.E2E_ADMIN_PASSWORD || process.env.ADMIN_PASSWORD || '');
  await page.click('button[type="submit"]');
  console.log(`[+${Date.now() - t0}ms] Login submitted`);

  // Step 4: Wait for post-login navigation
  await page.waitForURL((url) => !url.pathname.includes('/login'), { timeout: 30000 }).catch(() => {
    console.log(`[+${Date.now() - t0}ms] Still on login page after 30s`);
  });
  console.log(`[+${Date.now() - t0}ms] URL: ${page.url().pathname}`);

  // Step 5: Wait a full 30 seconds for all API calls to settle
  console.log(`[+${Date.now() - t0}ms] Waiting 30s for API calls to settle...`);
  await new Promise(r => setTimeout(r, 30000));

  const totalTime = Date.now() - t0;
  console.log(`[+${totalTime}ms] Test complete\n`);

  // Print waterfall
  console.log(`${'='.repeat(70)}`);
  console.log('FULL API WATERFALL');
  console.log(`${'='.repeat(70)}`);
  console.log(`${'Start'.padEnd(12)} ${'Duration'.padEnd(12)} ${'Status'.padEnd(8)} ${'Method'.padEnd(7)} URL`);
  console.log(`${'-'.repeat(12)} ${'-'.repeat(12)} ${'-'.repeat(8)} ${'-'.repeat(7)} ${'-'.repeat(40)}`);

  allRequests
    .sort((a, b) => a.startTime - b.startTime)
    .forEach(r => {
      const start = `+${r.startTime}ms`.padEnd(12);
      const dur = `${r.duration}ms`.padEnd(12);
      const status = r.failed ? 'FAIL'.padEnd(8) : `${r.status}`.padEnd(8);
      const method = r.method.padEnd(7);
      const errNote = r.errorText ? ` [${r.errorText}]` : '';
      const shortUrl = r.url.length > 50 ? r.url.substring(0, 47) + '...' : r.url;
      console.log(`${start} ${dur} ${status} ${method} ${shortUrl}${errNote}`);
    });

  // Summary
  const apiCalls = allRequests.filter(r => r.url.includes('/api/'));
  const failed = apiCalls.filter(r => r.failed || (r.status && r.status >= 400));
  const slowest = [...apiCalls].sort((a, b) => b.duration - a.duration).slice(0, 8);

  console.log(`\n${'='.repeat(70)}`);
  console.log('SUMMARY');
  console.log(`${'='.repeat(70)}`);
  console.log(`Total API calls: ${apiCalls.length}`);
  console.log(`Failed/error calls: ${failed.length}`);
  console.log(`Total test time: ${totalTime}ms`);
  console.log(`\nSlowest calls:`);
  slowest.forEach(r => {
    const note = r.failed ? ` FAILED: ${r.errorText}` : '';
    console.log(`  ${r.duration}ms  ${r.method} ${r.url} (${r.status ?? 'N/A'})${note}`);
  });

  if (failed.length > 0) {
    console.log(`\nFailed calls:`);
    failed.forEach(r => {
      console.log(`  ${r.method} ${r.url} — ${r.errorText || `HTTP ${r.status}`}`);
    });
  }

  await page.screenshot({ path: 'perf-test-final.png', fullPage: false });
  console.log(`\nFinal screenshot: perf-test-final.png`);
  await browser.close();
})();
