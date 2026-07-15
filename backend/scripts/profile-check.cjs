const BASE = 'http://localhost:4000';
async function main() {
  const res = await fetch(BASE+'/api/v1/auth/login', {method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({identifier:'aanand',password:'aanand@123'})});
  const tok = (await res.json()).data.accessToken;
  
  // Check profile links via auth endpoint
  const r = await fetch(BASE+'/api/v1/auth/me', {headers:{Authorization:'Bearer '+tok}});
  const j = await r.json();
  console.log(JSON.stringify(j, null, 2).substring(0, 2000));
}
main().catch(console.error);
