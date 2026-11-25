const fs=require('node:fs'),assert=require('node:assert/strict');const {chromium,newUser}=require('./h.cjs');
(async()=>{const b=await chromium.launch();try{
const {page:p}=await newUser(b,'test','test',{url:'https://sunjin-aidc-workspace-demo.sunjinfuture2.workers.dev/'});
const api=()=>p.evaluate(async()=>await(await apiFetch('/api/ai-project/status?project=ai-application-test')).json());
await p.evaluate(()=>go('project:pangyo'));await p.waitForSelector('.phead.rep .rcols');await p.waitForTimeout(1000);
const geometry=()=>p.locator('.phead.rep').evaluate(el=>({gap:getComputedStyle(el.querySelector('.rcols')).columnGap,cols:getComputedStyle(el.querySelector('.rcols')).gridTemplateColumns,font:getComputedStyle(el.querySelector('.rtx')).fontSize,maps:el.querySelectorAll('.rmapbox').length}));
const legacy=await geometry();const baseline=await p.evaluate(async()=>await(await apiFetch('/api/state')).json());
const reports=[];const limit=Number(process.env.TRIAL_LIMIT||1);
for(let k=0;k<limit;k++){
 await p.evaluate(()=>go('project:ai-application-test'));await p.waitForSelector('.ai-overview');await p.click('[data-ai-open="upload"]');
 await p.waitForFunction(()=>document.querySelector('[data-ai-status]').textContent.includes('등록되어'),null,{timeout:90000});
 await p.locator('[data-ai-file]').setInputFiles({name:'판교AIDC_캡처전사_시험용.pdf',mimeType:'application/pdf',buffer:fs.readFileSync('test-results/capture/pangyo-capture-reconstructed.pdf')});
 await p.fill('[data-ai-hint]','판교 AIDC. 첨부된 캡처 내용을 전사한 시험용 PDF임. 원문에 있는 정보만 사용.');
 const waiting=p.waitForResponse(r=>r.url().includes('/api/ai-project/analyze')&&r.request().method()==='POST',{timeout:300000});await p.click('[data-ai-analyze]');
 const res=await waiting,d=await res.json();console.log('ANALYSIS',k+1,res.status(),JSON.stringify(d));
 if(!res.ok()){await p.waitForFunction(()=>!document.querySelector('[data-ai-analyze]').disabled);await p.locator('[data-ai-close]').first().click();reports.push({attempt:k+1,status:res.status(),error:d.error});continue;}
 assert.equal(d.model,'claude-fable-5-2');const r=d.report,z=n=>r.sections.filter(s=>s.zone===n);
 const checks={kpi:z('kpi').length,fin:z('fin').length,kpiCount:z('kpi').flatMap(s=>s.metrics).length,finCount:z('fin').flatMap(s=>s.metrics).length,main:z('main').map(s=>({title:s.title,type:s.type,cols:s.columns.length})),plan:z('plan').map(s=>({title:s.title,cols:s.columns.length,rows:s.rows.length})),right:z('right').map(s=>s.title),title:r.title,summary:r.summary};
 await p.waitForSelector('.ai-preview .ai-report');assert.equal(await p.locator('.ai-refs,[data-ai-field="warnings"]').count(),0);
 const saving=p.waitForResponse(r=>r.url().includes('/api/ai-project/save')&&r.request().method()==='POST',{timeout:90000});await p.click('[data-ai-save]');const sr=await saving;assert.equal(sr.status(),200);const sd=await sr.json();await p.waitForSelector('.ai-dialog',{state:'detached'});
 await p.reload();await p.waitForFunction(()=>!document.querySelector('#app').hidden,null,{timeout:90000});await p.evaluate(()=>go('project:ai-application-test'));await p.waitForSelector('.ai-overview');const reopened=await api();
 assert.deepEqual(reopened.saved.report,sd.saved.report);const g=await geometry();checks.geometry=g;checks.legacyGeometry=legacy;
 assert.equal(g.gap,legacy.gap);assert.equal(g.cols,legacy.cols);assert.equal(g.font,legacy.font);assert.equal(g.maps,legacy.maps);
 checks.noteLengths=r.sections.flatMap(s=>s.metrics).map(m=>m.note.length);checks.savedAfterReload=true;checks.mainBlocks=await p.locator('.ai-overview .rc1 > .rb').count();
 assert.equal(checks.mainBlocks,2);assert.equal(checks.kpiCount,5);assert.equal(checks.finCount,4);assert.equal(checks.plan[0].rows,6);
 const plain=JSON.stringify(r);for(const value of ['1,850','1,152','27.52','1.48','23.2','7.65'])assert.ok(plain.includes(value),value);
 await p.screenshot({path:'test-results/capture/trial-'+(k+1)+'.png',fullPage:true});
 await p.click('[data-ai-direct="edit"]');await p.waitForSelector('[data-ai-inline="summary"]');assert.equal(await p.locator('[data-ai-zone],[data-ai-action="column"],.ai-refs,[data-ai-inline="warnings"]').count(),0);
 const index=r.sections.findIndex(s=>s.type==='table');if(index>=0){const button=p.locator('[data-ai-action="row"][data-ai-index="'+index+'"]');assert.equal(await button.innerText(),'＋');await button.click();const added=await p.evaluate(i=>schAIDraft.report.sections[i],index);assert.equal(added.rows.length,r.sections[index].rows.length+1);assert.equal(added.columns.length,r.sections[index].columns.length);}
 await p.locator('[data-ai-direct="cancel"]').click();
 reports.push({attempt:k+1,status:200,checks,revision:reopened.saved.revision,usage:d.usage});console.log('RESULT',JSON.stringify(reports.at(-1)));
}
const after=await p.evaluate(async()=>await(await apiFetch('/api/state')).json());
const other=Object.keys({...baseline.records,...after.records}).filter(k=>{if(k==='meta:head'){const a={...baseline.records[k]},b={...after.records[k]};delete a['ai-application-test'];delete b['ai-application-test'];return JSON.stringify(a)!==JSON.stringify(b);}return JSON.stringify(baseline.records[k])!==JSON.stringify(after.records[k]);});
console.log('OTHER_RECORD_CHANGES',JSON.stringify(other));fs.writeFileSync('test-results/capture/results.json',JSON.stringify(reports,null,2));
}finally{await b.close();}})().catch(e=>{console.error(e);process.exit(1);});