const assert=require('node:assert/strict');const{chromium,newUser}=require('./h.cjs');
(async()=>{const b=await chromium.launch();try{const{page:p}=await newUser(b,'test','test',{url:'https://sunjin-aidc-workspace-demo.sunjinfuture2.workers.dev/'});
const x=await p.evaluate(()=>{const pt=PARTNERS.find(x=>!x.trash&&schPartnerProjects(x).length);openPanel(pt.id);return pt.id;});
const delta=await p.locator('#panel-pin .pr:has(.pt-projects)').evaluate(n=>{const a=n.querySelector('.k').getBoundingClientRect(),b=n.querySelector('.pt-project-tag').getBoundingClientRect();return Math.abs((a.top+a.bottom-b.top-b.bottom)/2)});assert.ok(delta<3);
await p.locator('#panel-pin [data-pt-project-pick]').first().click();assert.ok(await p.locator('.pt-project-options .pill.nosq').count());
const info=await p.evaluate(async()=>{const rows=sortResearch(liveItems('research')),i=rows.findIndex(x=>!schResTagsOf(x).includes('REF'));if(i>=0&&rows.slice(i).some(x=>schResTagsOf(x).includes('REF')))throw Error('REF not pinned');
const target=rows.find(x=>/Data Center Map in South Korea/i.test(x.title));let priorRef=null;if(target&&!schResTagsOf(target).includes('REF')){const response=await apiFetch('/api/versions?item='+encodeURIComponent(target.id));if(response.ok){const d=await response.json();priorRef=JSON.stringify(d).includes('[REF]');}}
return {deltaExpected:true,picker:typeof schPartnerNamePick==='function',target:target?{id:target.id,title:target.title,cats:target.cats,ref:schResTagsOf(target).includes('REF'),position:rows.indexOf(target)}:null,priorRef};});
assert.ok(info.picker);console.log('LIVE READ ONLY:',JSON.stringify(info));
}finally{await b.close()}})().catch(e=>{console.error(e);process.exit(1)});
