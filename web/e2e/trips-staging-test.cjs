const { chromium } = require('playwright');

const BASE = 'https://fleet-management-web-staging.vercel.app';
const API = 'https://fleet-management-backend-staging.vercel.app';

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  
  console.log('1. Login on staging...');
  await page.goto(BASE + '/login', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(2000);
  
  await page.locator('input[type="text"]').first().fill('admin@fleet.local');
  await page.locator('input[type="password"]').first().fill('admin@123');
  await page.locator('button[type="submit"]').click();
  await page.waitForTimeout(5000);
  console.log('   After login URL:', page.url());
  
  if (page.url().includes('login')) {
    console.log('   Login FAILED');
    const err = await page.locator('.error-banner').first().textContent().catch(() => 'unknown');
    console.log('   Error:', err);
    await browser.close();
    process.exit(1);
  }
  console.log('   Login SUCCESS');
  
  console.log('2. Navigate to /trips...');
  await page.goto(BASE + '/trips', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(3000);
  console.log('   URL:', page.url());
  
  const body = await page.textContent('body');
  const checks = {
    'Trips header': body.includes('Trips'),
    'Create Trip button': body.includes('Create Trip'),
    'No Route not found error': !body.includes('Route not found'),
  };
  
  console.log('3. Page checks:');
  for (const [k, v] of Object.entries(checks)) {
    console.log('   ' + k + ':', v ? 'PASS' : 'FAIL');
  }
  
  await page.screenshot({ path: 'e2e/staging-trips.png', fullPage: true });
  
  console.log('4. API GET /trips...');
  const apiRes = await page.evaluate(async (apiBase) => {
    const raw = localStorage.getItem('fleet-auth-session');
    const session = raw ? JSON.parse(raw) : null;
    const token = session?.accessToken;
    const res = await fetch(apiBase + '/api/v1/trips?page=1&limit=20', {
      headers: { Authorization: 'Bearer ' + token }
    });
    return { status: res.status, body: await res.json() };
  }, API);
  console.log('   Status:', apiRes.status);
  console.log('   Success:', apiRes.body.success);
  console.log('   Items:', apiRes.body.data?.items?.length ?? 'N/A');
  
  console.log('5. Create + lifecycle...');
  const lcRes = await page.evaluate(async (apiBase) => {
    const raw = localStorage.getItem('fleet-auth-session');
    const session = raw ? JSON.parse(raw) : null;
    const token = session?.accessToken;
    const h = { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' };
    
    const vRes = await fetch(apiBase + '/api/v1/vehicles?page=1&limit=1', { headers: h });
    const vData = await vRes.json();
    const vehicleId = vData.data?.items?.[0]?.id;
    if (!vehicleId) return { step: 'vehicle', error: 'No vehicles', vehicles: vData };
    
    const cRes = await fetch(apiBase + '/api/v1/trips', {
      method: 'POST', headers: h,
      body: JSON.stringify({ tripType: 'DELIVERY', vehicleId, originName: 'Depot', destinationName: 'Client' })
    });
    const cData = await cRes.json();
    if (!cData.success) return { step: 'create', error: cData.message };
    
    const sRes = await fetch(apiBase + '/api/v1/trips/' + cData.data.id + '/start', {
      method: 'POST', headers: h,
      body: JSON.stringify({ startOdometer: 5000 })
    });
    const sData = await sRes.json();
    
    const compRes = await fetch(apiBase + '/api/v1/trips/' + cData.data.id + '/complete', {
      method: 'POST', headers: h,
      body: JSON.stringify({ endOdometer: 5200 })
    });
    const compData = await compRes.json();
    
    const histRes = await fetch(apiBase + '/api/v1/trips/' + cData.data.id + '/history', { headers: h });
    const histData = await histRes.json();
    
    return {
      created: cData.data.tripNumber,
      started: sData.data?.status,
      completed: compData.data?.status,
      distance: compData.data?.distanceKm,
      historyCount: histData.data?.length,
    };
  }, API);
  
  console.log('   Created:', lcRes.created);
  console.log('   After start:', lcRes.started);
  console.log('   After complete:', lcRes.completed);
  console.log('   Distance:', lcRes.distance, 'km');
  console.log('   History entries:', lcRes.historyCount);
  
  await browser.close();
  
  const allPass = checks['Trips header'] && checks['Create Trip button'] && checks['No Route not found error'] && apiRes.status === 200 && lcRes.completed === 'COMPLETED';
  console.log('\n=== STAGING RESULT: ' + (allPass ? 'PASS' : 'FAIL') + ' ===');
})().catch(e => { console.error('FATAL:', e.message); process.exit(1); });
