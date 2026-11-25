const assert=require('node:assert/strict');const{chromium,newUser}=require('./h.cjs');
(async()=>{const b=await chromium.launch();try{const{page:p}=await newUser(b,'test','test',{url:'https://sunjin-aidc-workspace-demo.sunjinfuture2.workers.dev/'});
const result=await p.evaluate(()=>{const pt=PARTNERS.find(x=>!x.trash&&x.body);const root=document.createElement('div');root.innerHTML=partnerTable([pt]);const heads=[...root.querySelectorAll('.hd span')].map(x=>x.textContent);const edit=document.createElement('div');edit.innerHTML=partnerHtml(pt,true);openPanel(pt.id);return {heads,editKeys:[...edit.querySelectorAll('[data-sk]')].map(x=>x.dataset.sk),body:pt.body}});
assert.deepEqual(result.heads,['이름','홈페이지','구분','관련 미팅']);assert.ok(!result.editKeys.includes('desc'));
assert.deepEqual(await p.locator('#panel-pin .props .k').allTextContents(),['홈페이지','구분','관련 미팅']);assert.equal(await p.locator('#panel-pin .partner-body-text').innerText(),result.body);
console.log('Live list four columns, preview three properties, no description editor; existing body intact.');
}finally{await b.close()}})().catch(e=>{console.error(e);process.exit(1)});
