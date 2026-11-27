const {chromium}=require('playwright');
const assert=require('node:assert/strict');
(async()=>{
const browser=await chromium.launch({headless:true});
const p=await browser.newPage({viewport:{width:1920,height:1080}});
await p.goto('http://127.0.0.1:8787/');
await p.waitForFunction(()=>typeof memPositionOpenPop==='function');
await p.evaluate(()=>{
 const el=document.createElement('div');el.id='qa-scroll';el.style='position:fixed;top:300px;left:100px;height:150px;width:200px;overflow:auto;z-index:99999';
 el.innerHTML='<button id="qa-anchor">filter</button><div style="height:1000px;width:1000px"></div>';document.body.append(el);
 openPop(document.querySelector('#qa-anchor'),'<div style="height:1000px">options</div>');
 popEl.style.maxHeight='120px';popEl.style.overflow='auto';popEl.dataset.keep='same-menu';
});
const pos=()=>p.evaluate(()=>({x:parseFloat(popEl.style.left),y:parseFloat(popEl.style.top),scroll:popEl.scrollTop,keep:popEl.dataset.keep}));
const start=await pos();
await p.evaluate(()=>popEl.scrollTop=60);await p.waitForTimeout(100);
assert.equal((await pos()).y,start.y);assert.equal((await pos()).scroll,60);
await p.evaluate(()=>document.querySelector('#qa-scroll').scrollTop=80);await p.waitForTimeout(100);
assert.equal((await pos()).y,start.y-80);assert.equal((await pos()).keep,'same-menu');
await p.evaluate(()=>document.querySelector('#qa-scroll').scrollLeft=40);await p.waitForTimeout(100);
assert.equal((await pos()).x,start.x-40);
await p.evaluate(()=>document.querySelector('#qa-scroll').scrollTop=500);await p.waitForTimeout(100);
assert.equal((await pos()).y,start.y-500);
await p.evaluate(()=>{document.querySelector('#qa-scroll').scrollTop=0;document.querySelector('#qa-scroll').scrollLeft=0;});await p.waitForTimeout(100);
assert.equal((await pos()).x,start.x);assert.equal((await pos()).y,start.y);assert.equal((await pos()).scroll,60);
console.log('PASS stays open, preserves option scroll, tracks vertical/horizontal anchor movement, does not stick to viewport edge, restores on scroll back');
await browser.close();
})().catch(e=>{console.error(e);process.exit(1)});
