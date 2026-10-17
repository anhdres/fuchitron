// PWA integration tests, including migration from the supplied old src snapshot.
// PLAYWRIGHT_MODULE=/path/to/playwright-core OLD_SRC=/path/to/old/src node scripts/audit-pwa.cjs
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright-core');
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const current = path.resolve(__dirname, '../src');
const old = process.env.OLD_SRC;
const output = process.env.AUDIT_OUTPUT || '/tmp/fuchitron-audit-20261017';
const results=[];
let phase='current', browser;
const types={'.js':'text/javascript','.css':'text/css','.html':'text/html','.json':'application/json','.svg':'image/svg+xml','.png':'image/png','.woff2':'font/woff2'};
const server=http.createServer((req,res)=>{
  let pathname=new URL(req.url,'http://localhost').pathname;
  if(pathname==='/')pathname='/index.html';
  if(pathname.startsWith('/_vercel/')){res.writeHead(200,{'Content-Type':'text/javascript'});res.end('');return;}
  const file=path.join(phase==='old'?old:current,pathname);
  if(!fs.existsSync(file)||!fs.statSync(file).isFile()){res.writeHead(404);res.end('Not found');return;}
  let data=fs.readFileSync(file);
  if(phase==='update' && pathname==='/sw.js') data=Buffer.from(data.toString().replace('fuchitron-v12','fuchitron-v12-integration'));
  res.writeHead(200,{'Content-Type':types[path.extname(file)]||'application/octet-stream','Cache-Control':'no-store'});res.end(data);
});
async function check(name,fn){try{await fn();console.log('PASS',name);results.push({name,status:'passed'});}catch(e){console.error('FAIL',name,e.message);results.push({name,status:'failed',error:e.stack});}}
(async()=>{
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  const base=`http://127.0.0.1:${server.address().port}`;
  browser=await chromium.launch({channel:'chrome',headless:true});
  await check('Offline shell/fonts, query URL, scoring and reload; no Supabase',async()=>{
    phase='current';const c=await browser.newContext({locale:'es-AR',viewport:{width:375,height:812}});const p=await c.newPage();const requests=[],errors=[];
    p.on('request',r=>requests.push(r.url()));p.on('pageerror',e=>errors.push(e.message));
    await p.goto(base+'/?lang=es');await p.evaluate(()=>navigator.serviceWorker.ready);await p.waitForFunction(()=>navigator.serviceWorker.controller);
    await p.click('#startPause');await p.click('#plusA');
    await c.setOffline(true);await p.reload();await p.evaluate(()=>document.fonts.ready);
    assert.equal(await p.locator('#scoreA').textContent(),'1');
    assert.equal(await p.evaluate(()=>state.running),true);
    await p.click('#plusB');assert.equal(await p.locator('#scoreB').textContent(),'1');
    assert.equal(await p.locator('#offlineBanner').isVisible(),true);
    assert.ok(await p.evaluate(()=>document.fonts.check('24px "Material Symbols Outlined"')));
    await p.click('#shareBtn');await p.screenshot({path:path.join(output,'offline-share.png'),animations:'disabled'});
    assert.equal(requests.some(url=>/supabase|fonts\.google/.test(url)),false);
    assert.deepEqual(errors,[]);await c.close();
  });
  await check('Update waits for consent, preserves running match and unrelated caches',async()=>{
    phase='current';const c=await browser.newContext({locale:'es-AR'});const p=await c.newPage();
    await p.goto(base);await p.evaluate(()=>navigator.serviceWorker.ready);await p.waitForFunction(()=>navigator.serviceWorker.controller);
    await p.evaluate(()=>caches.open('unrelated-app-cache'));await p.click('#startPause');await p.click('#plusA');
    const navigations=[];p.on('framenavigated',f=>{if(f===p.mainFrame())navigations.push(f.url())});
    phase='update';await p.evaluate(async()=>{const r=await navigator.serviceWorker.getRegistration();await r.update()});
    await p.waitForFunction(async()=>!!(await navigator.serviceWorker.getRegistration()).waiting);
    assert.equal(navigations.length,0);await p.locator('#updateBanner').waitFor({state:'visible',timeout:5000});
    await Promise.all([p.waitForEvent('load'),p.click('#updateNow')]);
    assert.equal(await p.locator('#scoreA').textContent(),'1');assert.equal(await p.evaluate(()=>state.running),true);
    const keys=await p.evaluate(()=>caches.keys());assert.ok(keys.includes('unrelated-app-cache'));assert.ok(keys.includes('fuchitron-v12-integration'));assert.ok(!keys.includes('fuchitron-v12'));
    await c.close();
  });
  if(old)await check('Upgrade real v11 client without losing stored score/timer; retire live routes',async()=>{
    phase='old';const c=await browser.newContext({locale:'es-AR'});const p=await c.newPage();
    await p.goto(base);await p.waitForFunction(()=>navigator.serviceWorker.controller);await p.waitForLoadState('load');
    await p.evaluate(()=>document.fonts.ready);await p.click('#startPause');await p.click('#plusA');
    await p.evaluate(()=>{state.matchStartTS=Date.now()-120000;save()});
    phase='current';await p.evaluate(async()=>{const r=await navigator.serviceWorker.getRegistration();await r.update()});
    await p.waitForFunction(async()=>!!(await navigator.serviceWorker.getRegistration()).waiting);
    await p.waitForFunction(()=>!document.querySelector('#updateBanner').hidden);
    await Promise.all([p.waitForEvent('load'),p.click('#updateNow')]);
    await p.waitForFunction(()=>typeof DEFAULT_STATE!=='undefined');
    assert.equal(await p.locator('#scoreA').textContent(),'1');assert.equal(await p.evaluate(()=>state.running),true);
    assert.ok(await p.evaluate(()=>state.halfSeconds>=120));assert.equal(await p.locator('#createSpectateBtn').count(),0);
    assert.deepEqual(await p.evaluate(()=>caches.keys()),['fuchitron-v12']);
    await c.setOffline(true);await p.goto(base+'/live/ABCDEF');assert.equal(new URL(p.url()).pathname,'/');
    assert.equal(await p.locator('#scoreA').textContent(),'1');await c.close();
  });
  await browser.close();server.close();fs.writeFileSync(path.join(output,'pwa.json'),JSON.stringify(results,null,2));
  console.log(`${results.filter(r=>r.status==='passed').length}/${results.length} passed`);if(results.some(r=>r.status==='failed'))process.exitCode=1;
})().catch(async e=>{console.error(e);await browser?.close();server.close();process.exitCode=1});
