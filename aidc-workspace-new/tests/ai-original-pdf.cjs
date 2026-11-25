const fs=require('node:fs');const assert=require('node:assert/strict');const {chromium,newUser}=require('./h.cjs');
(async()=>{const b=await chromium.launch();try{
 const {page:p}=await newUser(b,'test','test',{url:'https://sunjin-aidc-workspace-demo.sunjinfuture2.workers.dev/'});
 const result=await p.evaluate(async()=>{const r=await apiFetch('/api/files');const d=await r.json();return {status:r.status,files:(d.files||[]).filter(f=>f.name==='AIDC_프로젝트_요약보고서_261124.pdf')};});console.log('MATCHING_PDF',JSON.stringify(result));
 if(result.status!==200||!result.files.length){console.log('PDF_NOT_AVAILABLE_NO_CONTENT_CHANGED');return;}
 if(result.files.length!==1){console.log('MULTIPLE_PDF_COPIES_NO_CONTENT_CHANGED');return;}
 const f=result.files[0];if(f.size>10*1024*1024){console.log('PDF_TOO_LARGE_NO_CONTENT_CHANGED');return;}
 const bytes=await p.evaluate(async id=>{const r=await apiFetch('/api/file/'+id);if(!r.ok)throw Error('PDF download failed '+r.status);return Array.from(new Uint8Array(await r.arrayBuffer()));},f.id);
 const buf=Buffer.from(bytes);assert.equal(buf.subarray(0,5).toString(),'%PDF-');fs.mkdirSync('test-results/pdf-original',{recursive:true});
 await p.evaluate(()=>go('project:ai-application-test'));await p.waitForSelector('.ai-overview');await p.click('[data-ai-open="upload"]');await p.waitForFunction(()=>document.querySelector('[data-ai-status]').textContent.includes('등록되어'),null,{timeout:90000});
 await p.locator('[data-ai-file]').setInputFiles({name:f.name,mimeType:'application/pdf',buffer:buf});await p.fill('[data-ai-hint]','판교 AIDC — 다른 프로젝트의 내용과 수치를 섞지 말고 판교 사업만 정리');
 const response=p.waitForResponse(r=>r.url().includes('/api/ai-project/analyze')&&r.request().method()==='POST',{timeout:300000});await p.click('[data-ai-analyze]');const res=await response;const d=await res.json();console.log('PDF_ANALYSIS',JSON.stringify(d));assert.equal(res.status(),200);
 await p.waitForSelector('.ai-preview .ai-report');const save=p.waitForResponse(r=>r.url().includes('/api/ai-project/save')&&r.request().method()==='POST',{timeout:90000});await p.click('[data-ai-save]');const sr=await save;const saved=await sr.json();assert.equal(sr.status(),200);await p.waitForSelector('.ai-dialog',{state:'detached'});
 await p.reload();await p.waitForFunction(()=>!document.querySelector('#app').hidden,null,{timeout:90000});await p.evaluate(()=>go('project:ai-application-test'));await p.waitForSelector('.ai-overview');
 const reopened=await p.evaluate(async()=>await(await apiFetch('/api/ai-project/status?project=ai-application-test')).json());assert.deepEqual(reopened.saved.report,saved.saved.report);assert.equal(reopened.saved.source.name,f.name);
 console.log('PDF_SAVED_REOPENED',reopened.saved.revision);await p.screenshot({path:'test-results/pdf-original/saved.png',fullPage:true});
 }finally{await b.close();}})().catch(e=>{console.error(e);process.exit(1);});