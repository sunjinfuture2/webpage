const assert=require('node:assert/strict');
const {chromium,newUser,sleep}=require('./h.cjs');
(async()=>{
 const browser=await chromium.launch();
 try{
  const {page:p}=await newUser(browser,'INDENTCI','들여쓰기 검수',{url:'http://127.0.0.1:8787/'});
  const ev=(f,a)=>p.evaluate(f,a);
  const id=await ev(()=>{const it=newItem('research');it.title='들여쓰기 자동 검증';openPanel(it.id);return it.id;});
  await p.waitForSelector('#panel-pin .ProseMirror');
  await ev(()=>{const e=NB[S.panel].inst.editor;e.commands.setContent('<p>A. 핵심 주장</p><h2>B. 소제목</h2><p>· 전력 검토</p>');e.commands.setTextSelection({from:1,to:e.state.doc.content.size-1});e.view.focus();});
  await p.keyboard.press('Tab');
  const before=await ev(()=>NB[S.panel].inst.getHTML());
  assert.equal((before.match(/data-indent="1"/g)||[]).length,3);
  await p.click('#panel-pin [data-ed="publish"]');await sleep(1400);
  assert.equal(await ev(id=>ITEMS.find(x=>x.id===id).body,id),before);
  await p.reload();await p.waitForFunction(()=>!document.querySelector('#app').hidden);await sleep(1500);
  assert.equal(await ev(id=>ITEMS.find(x=>x.id===id).body,id),before);
  await ev(id=>openPanel(id),id);await p.waitForSelector('#panel-pin [data-ed="edit"]');
  assert.equal(await p.locator('#panel-pin .nb-doc [data-indent="1"]').count(),3);
  await p.click('#panel-pin [data-ed="edit"]');await p.waitForSelector('#panel-pin .ProseMirror');
  assert.equal(await ev(()=>NB[S.panel].inst.getHTML()),before);
  console.log('PASS full app publish, reload, detail display, reopen preserve indentation');
  // Run the reported sequence with all app-wide keyboard and input listeners active.
  await ev(()=>{const e=NB[S.panel].inst.editor;e.commands.setContent('<p data-indent="2">2. test</p>');e.commands.focus('end');});
  await p.keyboard.press('Enter');await p.keyboard.type('3.');await p.keyboard.press('Space');await sleep(500);
  const html=await ev(()=>NB[S.panel].inst.getHTML());
  assert.ok(html.length<2500&&(html.match(/<li\b/g)||[]).length<=3,html);
  console.log('PASS full app numbering sequence: '+html);
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exit(1);});
