const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  
  // 1. Login
  console.log('1. Login...');
  await page.goto('http://localhost:5173/login', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(2000);
  
  await page.locator('input[type="text"]').fill('admin@fleet.local');
  await page.locator('input[type="password"]').fill('admin@123');
  await page.locator('button[type="submit"]').click();
  await page.waitForTimeout(4000);
  console.log('   After login URL:', page.url());
  
  if (page.url().includes('login')) {
    const err = await page.locator('.error-banner').first().textContent().catch(() => 'unknown');
    console.log('   Login FAILED:', err);
    await browser.close();
    process.exit(1);
  }
  console.log('   Login SUCCESS');
  
  // 2. Navigate to trips
  console.log('2. Navigate to /trips...');
  await page.goto('http://localhost:5173/trips', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(3000);
  console.log('   URL:', page.url());
  
  // 3. Page checks
  const body = await page.textContent('body');
  const checks = {
    'Trips header': body.includes('Trips'),
    'Create Trip button': body.includes('Create Trip'),
    'No Route not found error': !body.includes('Route not found'),
    'Operations section': body.includes('Operations'),
    'Sidebar Trips link': body.includes('Trip and transfer workflow'),
  };
  
  console.log('3. Page checks:');
  for (const [k, v] of Object.entries(checks)) {
    console.log('   ' + k + ':', v ? 'PASS' : 'FAIL');
  }
  
  // 4. Screenshot
  await page.screenshot({ path: 'e2e/trips-local-test.png', fullPage: true });
  console.log('4. Screenshot saved');
  
  // 5. API test
  console.log('5. API...');
  const apiRes = await page.evaluate(async () => {
    const raw = localStorage.getItem('fleet-auth-session');
    const session = raw ? JSON.parse(raw) : null;
    const token = session?.accessToken;
    const res = await fetch('/api/v1/trips?page=1&limit=20', {
      headers: { Authorization: 'Bearer ' + token }
    });
    return { status: res.status, body: await res.json() };
  });
  console.log('   Status:', apiRes.status);
  console.log('   Success:', apiRes.body.success);
  console.log('   Items:', apiRes.body.data?.items?.length ?? 'N/A');
  console.log('   Pagination:', JSON.stringify(apiRes.body.data?.pagination));
  
  // 6. Create trip test
  console.log('6. Create trip...');
  const createRes = await page.evaluate(async () => {
    const raw = localStorage.getItem('fleet-auth-session');
    const session = raw ? JSON.parse(raw) : null;
    const token = session?.accessToken;
    
    const vehiclesRes = await fetch('/api/v1/vehicles?page=1&limit=1', {
      headers: { Authorization: 'Bearer ' + token }
    });
    const vehiclesData = await vehiclesRes.json();
    const vehicleId = vehiclesData.data?.items?.[0]?.id;
    
    if (!vehicleId) return { status: 0, body: { message: 'No vehicles found' } };
    
    const res = await fetch('/api/v1/trips', {
      method: 'POST',
      headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        tripType: 'TRANSFER',
        vehicleId: vehicleId,
        originName: 'Warehouse A',
        destinationName: 'Customer Site B',
        purpose: 'E2E test trip',
      })
    });
    return { status: res.status, body: await res.json() };
  });
  console.log('   Status:', createRes.status);
  console.log('   Success:', createRes.body.success);
  if (createRes.body.data) {
    console.log('   Trip:', createRes.body.data.tripNumber, createRes.body.data.status);
    const tripId = createRes.body.data.id;
    
    // Start trip
    console.log('7. Start trip...');
    const startRes = await page.evaluate(async (id) => {
      const raw = localStorage.getItem('fleet-auth-session');
      const session = raw ? JSON.parse(raw) : null;
      const token = session?.accessToken;
      const res = await fetch('/api/v1/trips/' + id + '/start', {
        method: 'POST',
        headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' },
        body: JSON.stringify({ startOdometer: 10000 })
      });
      return { status: res.status, body: await res.json() };
    }, tripId);
    console.log('   Status:', startRes.status);
    console.log('   Status after start:', startRes.body.data?.status);
    
    // Complete trip
    console.log('8. Complete trip...');
    const completeRes = await page.evaluate(async (id) => {
      const raw = localStorage.getItem('fleet-auth-session');
      const session = raw ? JSON.parse(raw) : null;
      const token = session?.accessToken;
      const res = await fetch('/api/v1/trips/' + id + '/complete', {
        method: 'POST',
        headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' },
        body: JSON.stringify({ endOdometer: 10150 })
      });
      return { status: res.status, body: await res.json() };
    }, tripId);
    console.log('   Status:', completeRes.status);
    console.log('   Status after complete:', completeRes.body.data?.status);
    console.log('   Distance:', completeRes.body.data?.distanceKm, 'km');
    
    // Trip history
    console.log('9. Trip history...');
    const histRes = await page.evaluate(async (id) => {
      const raw = localStorage.getItem('fleet-auth-session');
      const session = raw ? JSON.parse(raw) : null;
      const token = session?.accessToken;
      const res = await fetch('/api/v1/trips/' + id + '/history', {
        headers: { Authorization: 'Bearer ' + token }
      });
      return { status: res.status, body: await res.json() };
    }, tripId);
    console.log('   History entries:', histRes.body.data?.length);
    if (histRes.body.data) {
      for (const h of histRes.body.data) {
        console.log('   -', h.action, ':', h.fromStatus, '->', h.toStatus);
      }
    }
  } else {
    console.log('   Error:', createRes.body.message);
  }
  
  await browser.close();
  
  const allPass = checks['Trips header'] && checks['Create Trip button'] && checks['No Route not found error'] && apiRes.status === 200;
  console.log('\n=== LOCAL RESULT: ' + (allPass ? 'PASS' : 'FAIL') + ' ===');
})().catch(e => { console.error('FATAL:', e.message); process.exit(1); });
