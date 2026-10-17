// Browser regression suite. Run against a local static server:
// PLAYWRIGHT_MODULE=/path/to/playwright-core node scripts/audit-regressions.cjs
// BASE_URL defaults to http://127.0.0.1:8766. Uses an isolated Chrome profile.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright-core');
const base = process.env.BASE_URL || 'http://127.0.0.1:8766';
const output = process.env.AUDIT_OUTPUT || '/tmp/fuchitron-audit-20261017';
fs.mkdirSync(output, { recursive: true });
const results = [];
let browser;
async function test(name, run) {
  if (process.env.AUDIT_FILTER && !name.includes(process.env.AUDIT_FILTER)) return;
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, serviceWorkers: 'block', locale: 'es-AR' });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  try {
    await page.goto(base);
    await page.waitForFunction(() => typeof state !== 'undefined' && document.querySelector('#tagA').textContent);
    await run(page, context);
    assert.deepEqual(errors, [], 'No uncaught errors');
    results.push({ name, status: 'passed' });
    console.log('PASS', name);
  } catch (error) {
    results.push({ name, status: 'failed', error: error.stack });
    console.error('FAIL', name, error.message);
    await page.screenshot({ path: path.join(output, `failure-${results.length}.png`), fullPage: true, animations: 'disabled' });
  } finally { await context.close(); }
}
async function confirm(page, selector, accept = true) {
  page.once('dialog', dialog => accept ? dialog.accept() : dialog.dismiss());
  await page.click(selector);
}
async function advance(page, seconds) {
  await page.evaluate(seconds => { state.matchStartTS = Date.now() - seconds * 1000; updateClock(); }, seconds);
}
(async () => {
  browser = await chromium.launch({ channel: 'chrome', headless: true });
  await test('Cancel period end preserves running clock', async p => {
    await p.clock.install(); await p.click('#startPause');
    await p.clock.runFor(3000); await confirm(p, '#nextPeriod', false);
    assert.equal(await p.evaluate(() => state.running), true);
    await p.clock.runFor(2000);
    assert.equal(await p.locator('#clock').textContent(), '00:05');
  });
  await test('Reload resumes running match immediately', async p => {
    await p.click('#startPause'); await advance(p, 65); await p.evaluate(() => save());
    await p.reload();
    assert.equal(await p.evaluate(() => state.running), true);
    assert.match(await p.locator('#clock').textContent(), /^01:0[5-9]$/);
    const before = await p.locator('#clock').textContent();
    await p.waitForFunction(value => document.querySelector('#clock').textContent !== value, before);
  });
  await test('Pause freezes goals, reload and period end', async p => {
    await p.clock.install(); await p.click('#startPause'); await advance(p, 120);
    await p.click('#startPause'); await p.clock.runFor(180000); await p.click('#plusA');
    assert.equal(await p.evaluate(() => state.goals[0].minute), 2);
    assert.equal(await p.locator('#clock').textContent(), '02:00');
    await p.reload();
    assert.equal(await p.locator('#clock').textContent(), '02:00');
    await confirm(p, '#nextPeriod');
    assert.equal(await p.evaluate(() => state.firstHalfEndSeconds), 120);
  });
  await test('Resume does not include pause duration', async p => {
    await p.clock.install(); await p.click('#startPause'); await p.clock.runFor(5000);
    await p.click('#startPause'); await p.clock.runFor(60000); await p.click('#startPause'); await p.clock.runFor(3000);
    assert.equal(await p.locator('#clock').textContent(), '00:08');
  });
  await test('Period guards and final state are coherent', async p => {
    assert.equal(await p.locator('#nextPeriod').isDisabled(), true);
    await p.click('#startPause'); await advance(p, 2700); await confirm(p, '#nextPeriod');
    assert.equal(await p.locator('#nextPeriod').isDisabled(), true);
    assert.equal(await p.locator('#clock').textContent(), '00:00');
    await p.click('#startPause'); await advance(p, 2700); await confirm(p, '#nextPeriod');
    assert.equal(await p.locator('#startPause').isDisabled(), true);
    assert.equal(await p.locator('#nextPeriod').isDisabled(), true);
    const text = await p.evaluate(() => buildShareText(false));
    assert.match(text, /Final del partido \(90'\)/);
    assert.equal(await p.evaluate(() => state.matchStartTS), null);
  });
  await test('Added-time goals and period boundaries agree in timeline/share', async p => {
    await p.click('#startPause'); await advance(p, 2760); await p.click('#plusA'); await confirm(p, '#nextPeriod');
    await p.click('#startPause'); await advance(p, 60); await p.click('#plusB');
    const minutes = await p.locator('#goalsList .event-minute').allTextContents();
    assert.deepEqual(minutes, ["0'", "45+1'", "45+1'", "46'"]);
    const text = await p.evaluate(() => buildShareText(false));
    assert.ok(text.includes("45+1'") && text.includes("46'") && text.includes('2T · 01:00'));
  });
  await test('Goal minute boundaries', async p => {
    await p.click('#startPause');
    for (const [seconds, minute] of [[0,1],[59,1],[60,1],[61,2],[119,2],[120,2],[2700,45],[2701,46]]) {
      await advance(p, seconds); assert.equal(await p.evaluate(() => goalMinute()), minute);
    }
  });
  await test('Team names are literal text and edits update existing goals', async p => {
    await p.click('#settingsBtn'); await p.fill('#teamA', '<b>unsafe</b>'); await p.click('#closeSettings'); await p.click('#plusA');
    assert.equal(await p.locator('#goalsList b').count(), 0);
    assert.ok((await p.locator('#goalsList').textContent()).includes('<B>UNSAFE</B>'));
    await p.click('#settingsBtn'); await p.fill('#teamA', 'Nuevo'); await p.click('#closeSettings');
    assert.ok((await p.locator('#goalsList').textContent()).includes('NUEVO'));
  });
  await test('Delete/undo cycles never duplicate goals; reset clears undo', async p => {
    await p.click('#plusA');
    for (let i=0; i<3; i++) { await p.click('.delete-goal'); await p.click('#snackbarAction'); assert.equal(await p.locator('#scoreA').textContent(), '1'); }
    await p.click('.delete-goal'); await confirm(p, '#resetTimer');
    assert.equal(await p.locator('#snackbar').isHidden(), true);
    await p.evaluate(() => document.querySelector('#snackbarAction').click());
    assert.equal(await p.evaluate(() => state.goals.length), 0);
  });
  await test('Corrupt storage is normalized without crashing', async p => {
    await p.evaluate(() => localStorage.setItem('fuchitron_v4', JSON.stringify({ teamA: {}, colorA1: 'bad', lang: 'toString', goals: [null, {}, {side:'A',half:1,minute:1,id:'x'}, {side:'A',half:1,minute:2,id:'x'}], periodMinutes:-5, halfSeconds: 'oops', wakeLock:{} })));
    await p.reload();
    const data = await p.evaluate(() => ({color:state.colorA1,lang:state.lang,seconds:state.halfSeconds,goals:state.goals}));
    assert.equal(data.color, '#C8102E'); assert.equal(data.lang, 'es'); assert.equal(data.seconds,0);
    assert.equal(data.goals.length, 2); assert.notEqual(data.goals[0].id, data.goals[1].id);
    await p.click('#startPause'); await p.click('#startPause');
    await p.evaluate(() => localStorage.setItem('fuchitron_v4', '{broken')); await p.reload();
    assert.equal(await p.locator('#scoreA').textContent(), '0');
  });
  await test('Blocked storage keeps scoreboard working and warns truthfully', async (p,c) => {
    await c.addInitScript(() => { Storage.prototype.setItem = () => { throw new DOMException('Blocked','SecurityError'); }; });
    await p.reload(); await p.click('#plusA');
    assert.equal(await p.locator('#scoreA').textContent(),'1');
    assert.equal(await p.locator('#storageBanner').isVisible(),true);
    assert.match(await p.locator('#storageBanner').textContent(),/No se pudo guardar/);
  });
  await test('Language choice updates document, aria labels and survives URL reload', async p => {
    await p.goto(base+'/?lang=en'); await p.click('#settingsBtn'); await p.click('#langGroup [data-value="de"]');
    assert.equal(await p.locator('html').getAttribute('lang'),'de');
    assert.equal(await p.locator('#shareBtn').getAttribute('aria-label'),'Teilen');
    await p.reload(); assert.equal(await p.locator('html').getAttribute('lang'),'de');
    const missing = await p.evaluate(() => Object.entries(I18N).flatMap(([lang,dict]) => Object.keys(I18N.es).filter(key => !(key in dict)).map(key => `${lang}:${key}`)));
    assert.deepEqual(missing, []);
  });
  await test('Duration cannot rewrite a match already underway', async p => {
    await p.click('#settingsBtn'); await p.click('#durationGroup [data-value="10"]'); await p.click('#closeSettings'); await p.click('#startPause');
    await p.click('#settingsBtn'); assert.equal(await p.locator('#durationGroup [data-value="45"]').isDisabled(),true);
    assert.equal(await p.evaluate(() => state.periodMinutes),10);
  });
  await test('Wake-lock setting takes effect immediately and survives reload', async (p,c) => {
    await c.addInitScript(() => {
      window.lockCalls={request:0,release:0};
      Object.defineProperty(navigator,'wakeLock',{configurable:true,value:{request:async()=>{window.lockCalls.request++;return {released:false,release:async()=>{window.lockCalls.release++},addEventListener:()=>{}}}}});
    });
    await p.reload(); await p.click('#startPause'); await p.click('#settingsBtn'); await p.locator('#keepScreenOn').check({force:true});
    assert.equal(await p.evaluate(() => lockCalls.request),1);
    await p.reload(); await p.click('#settingsBtn'); assert.equal(await p.locator('#keepScreenOn').isChecked(),true);
    await p.locator('#keepScreenOn').uncheck({force:true});
    assert.ok(await p.evaluate(() => lockCalls.release >= 1));
    assert.equal(await p.evaluate(() => JSON.parse(localStorage.getItem('fuchitron_v4')).wakeLock), undefined);
  });
  await test('Cancel native share does not open WhatsApp or download', async p => {
    await p.evaluate(() => {
      window.fallbacks=0;window.shareCalls=0;
      navigator.share=async()=>{window.shareCalls++;throw new DOMException('Cancelled','AbortError');};
      navigator.canShare=()=>true;window.open=()=>{window.fallbacks++};
    });
    let downloads=0;p.on('download',()=>downloads++);
    await p.click('#shareBtn'); await p.click('#shareTextBtn'); await p.click('#shareImageBtn');
    await p.waitForFunction(() => window.shareCalls===2);
    assert.equal(await p.evaluate(()=>window.fallbacks),0);assert.equal(downloads,0);
  });
  await test('Text and PNG downloads contain current score', async p => {
    await p.click('#plusA');await p.click('#plusB');await p.click('#plusB');await p.click('#shareBtn');
    const txtPromise=p.waitForEvent('download');await p.click('#downloadTxtBtn');const txt=await txtPromise;
    assert.match(fs.readFileSync(await txt.path(),'utf8'),/1 - 2/);
    const pngPromise=p.waitForEvent('download');await p.click('#downloadImageBtn');const png=await pngPromise;
    const data=fs.readFileSync(await png.path());assert.equal(data.subarray(1,4).toString(),'PNG');
    assert.equal(data.readUInt32BE(16),1080);assert.equal(data.readUInt32BE(20),1080);
    assert.equal(await p.locator('#createSpectateBtn').count(),0);
  });
  await test('Match date stays fixed when shared on another day', async p => {
    await p.clock.install({time:new Date('2026-10-17T12:00:00Z')});await p.click('#plusA');
    const date=await p.evaluate(()=>formatDate());await p.clock.setSystemTime(new Date('2026-10-19T12:00:00Z'));
    assert.equal(await p.evaluate(()=>formatDate()),date);
  });
  await test('Two tabs synchronize score and clock state without tick overwrites', async (p,c) => {
    const second=await c.newPage();await second.goto(base);
    await p.click('#plusA');await second.waitForFunction(()=>document.querySelector('#scoreA').textContent==='1');
    await second.click('#plusB');await p.waitForFunction(()=>document.querySelector('#scoreB').textContent==='1');
    await p.click('#startPause');await second.waitForFunction(()=>state.running);
    await second.click('#startPause');await p.waitForFunction(()=>!state.running);
    assert.equal(await p.evaluate(()=>state.goals.length),2);
  });
  await test('No horizontal overflow: 7 languages × 4 widths × main/settings/share', async p => {
    for (const width of [320,375,768,1280]) {
      await p.setViewportSize({width,height:844});
      for (const lang of ['es','en','de','pt','fr','it','zh']) {
        await p.goto(base+'/?lang='+lang);
        await p.evaluate(()=>{state.teamA='WWWWWWWWWWWWWWW';state.teamB='MMMMMMMMMMMMMMM';render()});
        await p.evaluate(()=>document.fonts.ready);
        for (const mode of ['main','settings','share']) {
          if(mode==='settings')await p.click('#settingsBtn');
          if(mode==='share')await p.click('#shareBtn');
          const overflow=await p.evaluate(()=>{
            const dialog=document.querySelector('dialog[open]');
            const root=dialog?.querySelector('.settings-dialog-body')||document.documentElement;
            return {client:root.clientWidth,scroll:root.scrollWidth};
          });
          assert.ok(overflow.scroll<=overflow.client+1,`${width}/${lang}/${mode}: ${JSON.stringify(overflow)}`);
          if(width===320 && lang==='de') await p.screenshot({path:path.join(output,`after-320-de-${mode}.png`),fullPage:true,animations:'disabled'});
          if(mode!=='main')await p.click(mode==='settings'?'#closeSettings':'#closeShare');
        }
      }
    }
  });
  await browser.close();
  fs.writeFileSync(path.join(output,'regressions.json'),JSON.stringify(results,null,2));
  console.log(`${results.filter(r=>r.status==='passed').length}/${results.length} passed`);
  if(results.some(r=>r.status==='failed'))process.exitCode=1;
})().catch(async error=>{console.error(error);await browser?.close();process.exitCode=1});
