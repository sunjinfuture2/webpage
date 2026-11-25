const assert=require('node:assert/strict');const {chromium,newUser}=require('./h.cjs');
(async()=>{const b=await chromium.launch();try{
const {page:p}=await newUser(b,'test','test',{url:'https://sunjin-aidc-workspace-demo.sunjinfuture2.workers.dev/'});
await p.evaluate(()=>go('project:pangyo'));await p.waitForSelector('.contract-section');
const order=await p.evaluate(()=>['.contract-section','#sch-actions','.meet','#sch-lower'].map(s=>document.querySelector(s).getBoundingClientRect().top));
assert.ok(order.every((v,i)=>!i||v>order[i-1]));assert.equal(await p.locator('.contract-table .rw').count(),0);
assert.deepEqual(await p.locator('.contract-table .hd em').allTextContents(),['계약서명','날짜','상태','중요도','담당자','관련 미팅']);
await p.click('.new-contract');await p.waitForSelector('#panel-pin [data-f="title"]');assert.equal(await p.evaluate(()=>curItem().type),'contract');
await p.evaluate(()=>closePanel());await p.reload();await p.waitForFunction(()=>!document.querySelector('#app').hidden);
await p.evaluate(()=>go('project:pangyo'));await p.waitForSelector('.contract-section');assert.equal(await p.locator('.contract-table .rw').count(),0);
console.log('PASS live section order, empty contract list, five properties and title, plus opens a contract page; no content published');
}finally{await b.close();}})().catch(e=>{console.error(e);process.exit(1);});
