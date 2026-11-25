const assert=require('node:assert/strict');
const {chromium,newUser,sleep}=require('./h.cjs');
(async()=>{
 const browser=await chromium.launch();try{
 const {page:p}=await newUser(browser,'AITESTCI','AI 검증',{url:'http://127.0.0.1:8787/'});
 const ev=(f,a)=>p.evaluate(f,a);
 const api=async(action,body,project='ai-application-test')=>ev(async({action,body,project})=>{const r=await apiFetch('/api/ai-project/'+action+'?project='+project,body?{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)}:{});return {status:r.status,body:await r.json()};},{action,body,project});
 await p.waitForFunction(()=>!!PROJECTS['ai-application-test']);
 const baseline=await ev(async()=>await (await apiFetch('/api/state')).json());
 assert.equal((await api('status')).body.ready,false);
 assert.equal((await api('analyze',{kind:'text',name:'a.pptx',text:'test'})).status,503);
 assert.equal((await api('status',null,'pangyo')).status,403);
 await ev(()=>go('project:ai-application-test'));await p.waitForSelector('.ai-overview');
 const below=await ev(()=>{const h=document.querySelector('.ai-overview');return [...h.parentElement.children].filter(n=>n!==h).map(n=>n.outerHTML).join('');});
 await p.click('[data-ai-open="upload"]');await p.waitForFunction(()=>document.querySelector('[data-ai-status]').textContent.includes('API 키 미등록'));
 assert.ok(await p.locator('[data-ai-analyze]').isDisabled());await p.locator('[data-ai-close]').first().click();
 const {report}=await import('./ai-project.test.mjs');
 // Provider response is mocked only in this isolated test. Persistence uses the real local Worker.
 await p.route('**/api/ai-project/status?*',async route=>{
   const r=await route.fetch();const d=await r.json();d.ready=true;await route.fulfill({json:d});
 });
 await p.route('**/api/ai-project/analyze?*',route=>route.fulfill({json:{report,source:{name:'fixture.pdf',kind:'pdf'},usage:{input_tokens:100,output_tokens:200}}}));
 await p.click('[data-ai-open="upload"]');await p.waitForFunction(()=>document.querySelector('[data-ai-status]').textContent.includes('등록되어'));
 await p.locator('[data-ai-file]').setInputFiles({name:'fixture.pdf',mimeType:'application/pdf',buffer:Buffer.from('%PDF-1.4 test fixture')});
 await p.click('[data-ai-analyze]');await p.waitForSelector('.ai-preview .ai-report');
 assert.equal(await p.locator('.ai-preview .ai-section').count(),3);
 await p.click('.ai-edit>summary');await p.locator('[data-ai-field="summary"]').fill('사용자가 검토한 개요');
 await p.click('[data-ai-save]');await p.waitForSelector('.ai-dialog',{state:'detached'});await sleep(800);
 assert.ok((await p.locator('.ai-overview').textContent()).includes('사용자가 검토한 개요'));
 const saved=await api('status');assert.equal(saved.body.saved.revision,1);
 assert.equal((await api('save',{report,source:{name:'fixture.pdf',kind:'pdf'},revision:0})).status,409);
 const after=await ev(async()=>await (await apiFetch('/api/state')).json());
 for(const [id,val]of Object.entries(baseline.records)){if(id==='meta:head'){for(const [k,h]of Object.entries(val)){if(k!=='ai-application-test')assert.deepEqual(after.records[id][k],h,k);}}else assert.deepEqual(after.records[id],val,id);}
 const belowAfter=await ev(()=>{const h=document.querySelector('.ai-overview');return [...h.parentElement.children].filter(n=>n!==h).map(n=>n.outerHTML).join('');});
 assert.equal(belowAfter,below,'calendar and content below overview must remain identical');
 await p.reload();await p.waitForFunction(()=>!document.querySelector('#app').hidden);await sleep(1000);await ev(()=>go('project:ai-application-test'));await p.waitForSelector('.ai-overview');
 assert.ok((await p.locator('.ai-overview').textContent()).includes('사용자가 검토한 개요'));
 await p.click('[data-ai-open="edit"]');await p.waitForSelector('[data-ai-field="summary"]');assert.equal(await p.locator('[data-ai-field="summary"]').inputValue(),'사용자가 검토한 개요');
 await p.locator('[data-ai-close]').first().click();
 await ev(()=>go('project:pangyo'));await p.waitForSelector('.phead.rep');assert.equal(await p.locator('.ai-overview').count(),0);assert.ok(await p.locator('[data-schup]').count());
 // A malicious string stays text; never executable markup.
 await ev(()=>{const d=document.createElement('div');d.innerHTML=schAIReport({title:'<img src=x onerror=alert(1)>',summary:'text',sections:[],warnings:[]});if(d.querySelector('img'))throw Error('HTML injection');});
 // PPTX slide order follows relationships. Build a tiny valid text-only fixture.
 const JSZip=require('jszip');const z=new JSZip();
 z.file('ppt/presentation.xml','<p:presentation xmlns:p="urn:p" xmlns:r="urn:r"><p:sldIdLst><p:sldId r:id="r2"/><p:sldId r:id="r1"/></p:sldIdLst></p:presentation>');
 z.file('ppt/_rels/presentation.xml.rels','<Relationships><Relationship Id="r1" Target="slides/slide1.xml"/><Relationship Id="r2" Target="slides/slide2.xml"/></Relationships>');
 for(let i=1;i<=2;i++)z.file('ppt/slides/slide'+i+'.xml','<p:sld xmlns:p="urn:p" xmlns:a="urn:a"><a:p><a:r><a:t>Slide '+i+'</a:t></a:r></a:p></p:sld>');
 const bytes=[...await z.generateAsync({type:'uint8array'})];await p.addScriptTag({url:'http://127.0.0.1:8787/ai-documents.js'});
 const ppt=await ev(async bytes=>AIDCAIDocuments.read(new File([new Uint8Array(bytes)],'a.pptx')) ,bytes);
 assert.ok(ppt.text.indexOf('Slide 2')<ppt.text.indexOf('Slide 1'));
 console.log('PASS AI-only UI, upload/preview/edit/save/reload, CAS, other projects and calendar unchanged, missing-key behavior, XSS escaping, PPTX order');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exit(1);});
