// Shared helpers for the local verification scripts (Playwright against wrangler dev on 127.0.0.1:8787).
const { chromium } = require('playwright');
const sleep = ms => new Promise(r => setTimeout(r, ms));
// Since 2026-11-24 the combined page is what everybody gets. A suite that does not say which page it wants gets the page as it was
// before (?v=1): the editor, leave and panel suites were written against that one. A suite of the combined page passes ?v=2.
const URL0 = 'http://127.0.0.1:8787/?v=1';
let passed = 0, failed = 0;
function check(name, ok, detail) {
  if (ok) { passed++; console.log('  ok   ' + name); }
  else { failed++; console.log('  FAIL ' + name + (detail !== undefined ? '  -> ' + (typeof detail === 'string' ? detail : JSON.stringify(detail)) : '')); }
}
async function newUser(browser, id, name, opt = {}) {
  const ctx = await browser.newContext({ viewport: opt.viewport || { width: 1920, height: 1080 }, acceptDownloads: true, hasTouch: !!opt.hasTouch, isMobile: !!opt.isMobile });
  await ctx.grantPermissions(['clipboard-read', 'clipboard-write']).catch(() => { });
  const page = await ctx.newPage(); const errs = [];
  page.on('pageerror', e => errs.push(String(e).slice(0, 300)));
  page.on('console', m => { if (m.type() === 'error' && !/Failed to load resource|maps\.google|net::ERR/.test(m.text())) errs.push('console: ' + m.text().slice(0, 200)); });
  await page.goto(opt.url || URL0);
  await page.waitForSelector('#lg-id', { state: 'visible' });
  await page.fill('#lg-id', id); await page.fill('#lg-name', name); await page.click('#lg-btn');
  await page.waitForFunction(() => !document.querySelector('#app').hidden, null, { timeout: 90000 });
  await sleep(900);
  return { ctx, page, errs };
}
const waitApp = async page => { await page.waitForFunction(() => !document.querySelector('#app').hidden, null, { timeout: 90000 }); await sleep(900); };
function done(extra) { console.log(`\n${passed} passed, ${failed} failed${extra ? ' · ' + extra : ''}`); process.exit(failed ? 1 : 0); }
module.exports = { chromium, sleep, check, newUser, waitApp, done, URL0 };
