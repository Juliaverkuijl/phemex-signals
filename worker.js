// Read-only Phemex market-data proxy. No credentials or order endpoints.
const ORIGIN = 'https://juliaverkuijl.github.io';
const BASE = 'https://api.phemex.com';
const ALLOWED = new Set(['/public/products', '/exchange/public/md/v2/kline/list', '/md/v2/ticker/24hr', '/md/ticker/24hr']);
export default {
  async fetch(request) {
    const cors = { 'Access-Control-Allow-Origin': ORIGIN, 'Access-Control-Allow-Methods': 'GET, OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type', 'Vary': 'Origin' };
    const json = (data, status=200) => new Response(JSON.stringify(data), {status, headers:{...cors,'Content-Type':'application/json'}});
    if(request.method === 'OPTIONS') return new Response(null,{status:204,headers:cors});
    if(request.method !== 'GET') return json({error:'Only GET allowed'},405);
    const url = new URL(request.url);
    let path = url.pathname;
    if(path === '/api/products') path = '/public/products';
    if(path === '/api/kline') path = '/exchange/public/md/v2/kline/list';
    if(path === '/api/ticker') path = '/md/v2/ticker/24hr';
    if(path === '/health') return json({ok:true,service:'phemex-signals-api',mode:'read-only'});
    if(!ALLOWED.has(path)) return json({error:'Endpoint not allowed',path},404);
    const upstream = new URL(BASE + path);
    const symbol = url.searchParams.get('symbol');
    if(symbol && !/^[A-Za-z0-9]{2,30}$/.test(symbol)) return json({error:'Invalid symbol'},400);
    for(const [key,value] of url.searchParams){
      if(!['symbol','resolution','limit','from','to'].includes(key)) continue;
      if(key !== 'symbol' && !/^\d{1,12}$/.test(value)) return json({error:'Invalid '+key},400);
      upstream.searchParams.set(key,value);
    }
    try {
      const response = await fetch(upstream.toString(),{headers:{Accept:'application/json'},signal:AbortSignal.timeout(10000)});
      const body = await response.text();
      return new Response(body,{status:response.status,headers:{...cors,'Content-Type':response.headers.get('Content-Type')||'application/json','Cache-Control':'public, max-age=10'}});
    } catch(e){return json({error:'Phemex connection failed',detail:String(e.message||e)},502);}
  }
};
