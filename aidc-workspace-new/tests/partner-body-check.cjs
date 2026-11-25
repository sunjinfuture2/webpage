const assert=require('node:assert/strict');
const {chromium,newUser,waitApp}=require('./h.cjs');
(async()=>{
 const {movePartnerDescriptions}=await import('../partner-description-migration.mjs');
 const rows=new Map([['partner:a',{id:'a',desc:'기존 설명\n두번째 줄',body:'기존 본문'}],['partner:b',{id:'b',desc:'설명 B'}]]);
 const db={get:k=>rows.get(k),put:(k,v)=>rows.set(k,structuredClone(v)),ctx:{storage:{transactionSync:f=>f()}},sql:{exec:()=>({toArray:()=>[...rows].filter(([k])=>k.startsWith('partner:')).map(([id,p])=>({id,data:JSON.stringify(p)}))})};
 movePartnerDescriptions(db);assert.equal(rows.get('partner:a').body,'기존 본문\n\n기존 설명\n두번째 줄');assert.equal(rows.get('partner:b').desc,'');
 rows.get('partner:b').desc='새 짧은 설명';movePartnerDescriptions(db);assert.equal(rows.get('partner:b').desc,'새 짧은 설명');console.log('migration preserves body and is idempotent');
 const browser=await chromium.launch({headless:true});
 try{
 const {page:p}=await newUser(browser,'PARTNER_CHECK','검증',{url:'http://127.0.0.1:8787/'});
 const target=await p.evaluate(()=>PARTNERS.find(p=>!p.trash&&p.body));
 assert.ok(target);assert.equal(target.desc,'');
 await p.evaluate(id=>openPanel(id),target.id);
 await p.locator('#panel-pin .partner-body').waitFor();
 assert.equal(await p.locator('#panel-pin .partner-body-text').innerText(),target.body);
 const props=await p.locator('#panel-pin .props .pr .k').allTextContents();
 assert.deepEqual(props,['홈페이지','구분','설명','관련 미팅']);
 await p.locator('#panel-pin [data-ed="editpartner"]').click();
 await p.locator('#panel-pin [data-sk="body"]').fill(target.body+'\n본문 추가\n두 줄 유지');
 await p.locator('#panel-pin [data-sk="desc"]').fill('새 짧은 소개');
 await p.locator('#panel-pin [data-ed="savesimple"]').click();
 await p.evaluate(async()=>{await sharedFlush(true)});
 await p.reload();await waitApp(p);await p.evaluate(id=>openPanel(id),target.id);
 assert.equal(await p.locator('#panel-pin .partner-body-text').innerText(),target.body+'\n본문 추가\n두 줄 유지');
 const saved=await p.evaluate(id=>PARTNERS.find(x=>x.id===id),target.id);assert.equal(saved.desc,'새 짧은 소개');
 const layout=await p.evaluate(()=>{const pin=document.querySelector('#panel-pin');return {bottom:pin.querySelector('.props').getBoundingClientRect().bottom,top:pin.querySelector('.partner-body').getBoundingClientRect().top}});
 assert.ok(layout.top>layout.bottom);
 console.log('partner body editable, columns exact, multiline and short description persist after reload; no overlap');
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exit(1)});
