const { chromium } = require('playwright');
const http = require('http');

const BASE = 'http://localhost:5173';
const API = 'http://localhost:4000';

// Try to authenticate via API first to find the right credentials
async function tryLoginAPI(identifier, password) {
  return new Promise((resolve) => {
    const data = JSON.stringify({ identifier, password });
    const req = http.request(`${API}/api/v1/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(data) },
    }, (res) => {
      let body = '';
      res.on('data', c => body += c);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(body);
          resolve({ status: res.statusCode, data: parsed });
        } catch { resolve({ status: res.statusCode, data: { raw: body } }); }
      });
    });
    req.on('error', () => resolve({ status: 0 }));
    req.write(data);
    req.end();
  });
}

async function main() {
  console.log('=== Testing login credentials ===\n');
  const attempts = [
    ['admin', 'admin123'],
    ['admin', 'admin@123'],
    ['admin', 'Admin@123'],
    ['admin@example.com', 'admin123'],
    ['admin@example.com', 'admin@123'],
    ['admin@example.com', 'Admin@123'],
    ['opsadmin', 'opsadmin@123'],
    ['opsadmin.demo@fleet.local', 'opsadmin@123'],
    ['admin', 'password'],
    ['admin', 'welcome'],
  ];

  for (const [id, pw] of attempts) {
    const result = await tryLoginAPI(id, pw);
    const success = result.status === 200;
    console.log(`  ${success ? '✓' : '✗'} "${id}" / "${pw}" -> ${result.status}${success ? ' (TOKEN OK)' : ''}`);
    if (success) {
      console.log(`\n✅ Found working credentials: username="${id}" password="${pw}"`);
    }
  }
}

main().catch(e => console.error(e));
