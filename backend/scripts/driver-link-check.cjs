const BASE = 'http://localhost:4000';
async function main() {
  // Login as driver to get user id
  const dRes = await fetch(BASE+'/api/v1/auth/login', {method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({identifier:'aanand',password:'aanand@123'})});
  const dData = (await dRes.json()).data;
  
  // Login as admin
  const aRes = await fetch(BASE+'/api/v1/auth/login', {method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({identifier:'admin',password:'admin@123'})});
  const aToken = (await aRes.json()).data.accessToken;
  
  // Get driver profile via admin endpoint
  const r = await fetch(BASE+'/api/v1/drivers?search=aanand&limit=5', {headers:{Authorization:'Bearer '+aToken}});
  const j = await r.json();
  console.log('Drivers:', JSON.stringify(j.data?.items?.map(d => ({id:d.id,name:d.name})), null, 2));
}
main().catch(console.error);
