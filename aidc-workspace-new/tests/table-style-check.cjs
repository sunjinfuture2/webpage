const {chromium}=require('playwright'),assert=require('node:assert/strict');
const {newUser}=require('./h.cjs');
(async()=>{
 const browser=await chromium.launch({headless:true});
 const {page:p,errs}=await newUser(browser,'TABLEQA','표디자인검증',{url:'http://127.0.0.1:8787/?v=2'});
 await p.evaluate(()=>{window.tableStyle=document.querySelector('#sch-style').textContent;schViewSet('proj','table');schViewSet('res','table');schViewSet('meet','table');SCHU.tab='list';go('project:pangyo');});
 await p.waitForFunction(()=>schReady('pangyo'));await p.evaluate(()=>render(true));
 async function capture(){return p.evaluate(()=>{
 const out=[];for(const table of document.querySelectorAll('.page.on .tbl,.page.on .rtb,#table-fixtures .mp-tbl,#table-fixtures .list')){
 const b=table.getBoundingClientRect();if(!b.width||!b.height)continue;
 const dims=e=>{const r=e.getBoundingClientRect(),s=getComputedStyle(e);return {width:r.width,height:r.height,grid:s.gridTemplateColumns,gap:s.columnGap,padding:s.padding};};
 out.push({cls:table.className,text:table.textContent,table:dims(table),rows:[...table.querySelectorAll(':scope > .hd,:scope > .rw,:scope > .r,:scope > .ft')].map(dims)});
 }return out;});}
 async function check(label){
 await p.evaluate(()=>{document.querySelector('#sch-style').textContent=window.tableStyle.replace(/\/\* TABLE_VISUAL_THEME_BEGIN[\s\S]*?\/\* TABLE_VISUAL_THEME_END \*\//,'');});
 const before=await capture(),oldSize=await p.locator('.page.on .sch-list .rw .action-state').first().evaluate(e=>parseFloat(getComputedStyle(e).fontSize)).catch(()=>null);
 await p.evaluate(()=>{document.querySelector('#sch-style').textContent=window.tableStyle;});
 const after=await capture();assert.ok(after.length>0);assert.deepEqual(after,before,label+' table geometry/content must be identical');
 const heads=await p.evaluate(()=>[...document.querySelectorAll('.page.on .tbl > .hd,#table-fixtures .mp-tbl > .hd,#table-fixtures .list > .hd')].filter(e=>e.getBoundingClientRect().width).map(e=>({bg:getComputedStyle(e).backgroundColor,shadow:getComputedStyle(e).boxShadow})));
 assert.ok(heads.every(h=>h.bg==='rgb(247, 247, 246)'&&h.shadow.includes('rgb(201, 201, 201)')),JSON.stringify(heads));
 if(oldSize!==null){const n=await p.locator('.page.on .sch-list .rw .action-state').first().evaluate(e=>parseFloat(getComputedStyle(e).fontSize));assert.equal(n,oldSize-1);}
 console.log('PASS '+label+': '+after.length+' tables retain exact size, row heights, grids, gaps, padding and content; unified header and action state -1px');
 }
 await p.evaluate(()=>{const d=document.createElement('div');d.id='table-fixtures';d.innerHTML='<div class="mp-tbl act"><div class="hd"><span>설정</span><span>일자</span></div><div class="rw"><span>테스트 내용</span><span>2026</span></div></div><div class="gset"><div class="list"><div class="hd"><span>항목</span><span>내용</span></div><div class="rw"><span>내용</span></div></div></div>';document.body.append(d);});
 await check('project desktop');
 await p.setViewportSize({width:1536,height:960});await check('project 1536px');
 await p.evaluate(()=>go('main'));await check('main');
 await p.setViewportSize({width:390,height:844});await check('main narrow');
 await p.evaluate(()=>document.documentElement.classList.add('dark'));await check('dark');
 assert.deepEqual(errs.filter(e=>!e.includes('Failed to fetch')),[]);
 await browser.close();
})().catch(e=>{console.error(e);process.exit(1)});
