const BASE = 'http://localhost:4000';

async function apiLogin(identifier, password) {
  const res = await fetch(`${BASE}/api/v1/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ identifier, password }),
  });
  const json = await res.json();
  return json.data.accessToken;
}

async function apiGet(token, path) {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), 15000);
  const res = await fetch(`${BASE}${path}`, { headers: { Authorization: `Bearer ${token}` }, signal: controller.signal });
  clearTimeout(id);
  const text = await res.text();
  try { return { status: res.status, json: JSON.parse(text) }; }
  catch { return { status: res.status, json: { raw: text } }; }
}

async function main() {
  const adminToken = await apiLogin('admin', 'admin@123');
  const vRes = await apiGet(adminToken, '/api/v1/vehicles?limit=1');
  console.log(JSON.stringify(vRes.json, null, 2).substring(0, 500));
}

main().catch(console.error);
