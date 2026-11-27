const {chromium}=require('playwright'),ExcelJS=require('exceljs'),assert=require('node:assert/strict');
const {newUser}=require('./h.cjs');
const mime='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
async function file(rows,name='다른양식.xlsx',sheet='회사 일정표'){const b=new ExcelJS.Workbook();b.addWorksheet(sheet).addRows(rows);return {name,mimeType:mime,buffer:Buffer.from(await b.xlsx.writeBuffer())};}
(async()=>{
 const browser=await chromium.launch({headless:true});
 const {page:p,errs}=await newUser(browser,'UP2QA','업로드검증',{url:'http://127.0.0.1:8787/?v=2'});
 await p.evaluate(()=>go('project:pangyo'));await p.waitForFunction(()=>schReady('pangyo'));
 await p.locator('[data-upload2]').waitFor();
 assert.equal(await p.locator('[data-sch="upload"][data-k="act"]').count(),1);
 const tasks=await p.evaluate(()=>schModel('pangyo').plan.tasks.slice(0,3).map(t=>({id:t.id,wbs:t.wbs,name:t.name,start:t.plannedStart,end:t.plannedFinish})));
 const first=tasks[0],orig=await p.evaluate(()=>JSON.stringify(SCHED.pangyo||{}));
 const x=await file([['회사에서 보낸 수정본'],[],['종료예정일','업무명','번호','착수일','담당자'],
 [first.end,first.name+' 수정',first.wbs,first.start,''],
 ['2027년 5월 3일','신규 협의','A-01','2027년 5월 1일','']]);
 await p.locator('[data-upload2]').click();
 await p.locator('[data-u2file]').setInputFiles(x);
 await p.locator('[data-u2map="name"]').waitFor();
 assert.equal(await p.locator('[data-u2head]').inputValue(),'3');
 assert.equal(await p.locator('[data-u2map="plannedFinish"]').inputValue(),'0');
 await p.locator('[data-u2="review"]').click();
 assert.equal(await p.evaluate(()=>SCHUP2.preview.errors.length),0);
 assert.equal(await p.evaluate(()=>SCHUP2.preview.adds),1);
 assert.equal(await p.evaluate(()=>SCHUP2.preview.remove.length),0);
 assert.equal(await p.evaluate(()=>JSON.stringify(SCHED.pangyo||{})),orig);
 await p.locator('[data-u2choice][data-field="name"]').first().uncheck();
 assert.equal(await p.evaluate(()=>SCHUP2.preview.diff[0].t.name),first.name);
 await p.locator('[data-u2choice][data-field="name"]').first().check();
 const missing=await p.evaluate(()=>SCHUP2.preview.missing.length);assert.ok(missing>0);
 await p.locator('[data-u2="close"]').click();
 assert.equal(await p.evaluate(()=>JSON.stringify(SCHED.pangyo||{})),orig);
 console.log('PASS original upload retained; changed header/column order/date formats; preview/cancel no writes; missing tasks retained');
 // Reopen and apply; blank people must preserve existing assignment.
 await p.evaluate(id=>{schCommit('pangyo',d=>{d.tasks.find(t=>t.id===id).people=['UP2QA'];},'setup',true);},first.id);
 await p.evaluate(()=>sharedFlush(true));
 await p.locator('[data-upload2]').click();await p.locator('[data-u2file]').setInputFiles(x);
 await p.locator('[data-u2map="name"]').waitFor();await p.locator('[data-u2="review"]').click();
 await p.locator('[data-u2="apply"]').click();await p.locator('#dlg.sch-up2').waitFor({state:'detached'});
 assert.equal(await p.evaluate(id=>schTask('pangyo',id).name,first.id),first.name+' 수정');
 assert.deepEqual(await p.evaluate(id=>schTask('pangyo',id).people,first.id),['UP2QA']);
 const newId=await p.evaluate(()=>SCHED.pangyo.up2keys['a-01']);assert.ok(newId);
 assert.equal(await p.evaluate(()=>schModel('pangyo').plan.tasks.length),missing+2);
 await p.reload();await p.waitForFunction(()=>sharedReady&&schReady('pangyo'));
 assert.equal(await p.evaluate(id=>schTask('pangyo',id).name,first.id),first.name+' 수정');
 assert.equal(await p.evaluate(id=>schTask('pangyo',id).plannedStart,newId),'2027-05-01');
 console.log('PASS apply and reload persist; blank assignee preserved; arbitrary external number mapped to stable task ID');
 // Renumber same task: select existing ID; do not recreate body linkage.
 const y=await file([['번호','업무명','시작일','완료일'],['RENAMED-9',first.name+' 수정',first.start,first.end]]);
 await p.locator('[data-upload2]').click();await p.locator('[data-u2file]').setInputFiles(y);await p.locator('[data-u2map="name"]').waitFor();await p.locator('[data-u2="review"]').click();
 assert.equal(await p.evaluate(()=>SCHUP2.rows[0].target),'choose');
 await p.locator('[data-u2target]').selectOption(first.id);
 await p.locator('[data-u2="apply"]').click();await p.locator('#dlg.sch-up2').waitFor({state:'detached'});
 assert.equal(await p.evaluate(()=>SCHED.pangyo.up2keys['renamed-9']),first.id);
 assert.equal(await p.evaluate(id=>schTask('pangyo',id).wbs,first.id),first.wbs);
 await p.evaluate(()=>schUndo());await p.evaluate(()=>sharedFlush(true));
 assert.equal(await p.evaluate(()=>SCHED.pangyo.up2keys['renamed-9']),undefined);
 console.log('PASS manual linking retains task identity; mapping-only apply and undo');
 // Duplicate and invalid rows cannot silently pass.
 const z=await file([['番号','업무명','시작일','완료일'],['DUP','불량1','2027-02-30','2027-03-01'],['DUP','불량2','2027-03-01','2027-03-02']]);
 await p.locator('[data-upload2]').click();await p.locator('[data-u2file]').setInputFiles(z);await p.locator('[data-u2map="name"]').waitFor();
 await p.locator('[data-u2map="key"]').selectOption('0');await p.locator('[data-u2="review"]').click();
 assert.ok(await p.locator('[data-u2="apply"]').isDisabled());
 assert.ok((await p.locator('.u2-error').allTextContents()).join(' ').includes('중복 업무 번호'));
 await p.locator('[data-u2="close"]').click();
 const f=await file([['번호','업무명','시작일','완료일'],['F-1','수식 오류',{formula:'1/0',result:{error:'#DIV/0!'}},'2027-03-01']]);
 await p.locator('[data-upload2]').click();await p.locator('[data-u2file]').setInputFiles(f);await p.locator('[data-u2map="name"]').waitFor();await p.locator('[data-u2="review"]').click();
 assert.ok(await p.locator('[data-u2="apply"]').isDisabled());
 assert.ok((await p.locator('.u2-error').allTextContents()).join(' ').includes('셀 오류'));
 console.log('PASS duplicate IDs, invalid dates and formula errors blocked with row messages');
 await p.locator('[data-u2="close"]').click();
 // Concurrent modification rejects stale review.
 await p.locator('[data-upload2]').click();await p.locator('[data-u2file]').setInputFiles(x);await p.locator('[data-u2map="name"]').waitFor();await p.locator('[data-u2="review"]').click();
 await p.evaluate(id=>{schCommit('pangyo',d=>{d.tasks.find(t=>t.id===id).name='다른 사용자의 변경';},'concurrent',true,true);},first.id);
 await p.evaluate(()=>u2Apply());
 assert.ok((await p.locator('.u2-error').allTextContents()).join(' ').includes('검토 중 일정이 변경'));
 assert.equal(await p.evaluate(id=>schTask('pangyo',id).name,first.id),'다른 사용자의 변경');
 console.log('PASS stale preview blocks overwrite');
 
 await p.locator('[data-u2="close"]').click();
 const other=await p.evaluate(()=>Object.keys(PROJECTS).find(k=>k!=='pangyo'));
 await p.evaluate(id=>go('project:'+id),other);await p.waitForFunction(id=>schReady(id),other);
 const emptyFile=await file([['번호','업무명','시작일','완료일','개발단계'],['NEW-A','계약 업무','2027-05-01','2027-05-02','신규 계약단계'],['NEW-B','설계 업무','2027-05-03','2027-05-04','신규 설계단계']]);
 await p.locator('[data-upload2]').click();await p.locator('[data-u2file]').setInputFiles(emptyFile);await p.locator('[data-u2map="name"]').waitFor();await p.locator('[data-u2="review"]').click();
 assert.equal(await p.evaluate(()=>SCHUP2.preview.errors.length),0);
 await p.locator('[data-u2="apply"]').click();await p.locator('#dlg.sch-up2').waitFor({state:'detached'});
 const stages=await p.evaluate(id=>schModel(id).plan.tasks.filter(t=>t.name==='계약 업무'||t.name==='설계 업무').map(t=>t.phase),other);
 assert.equal(new Set(stages).size,2);
 await p.reload();await p.waitForFunction(id=>sharedReady&&schReady(id),other);
 assert.ok(await p.evaluate(id=>schModel(id).plan.tasks.some(t=>t.name==='계약 업무'),other));
 console.log('PASS per-field keep choice and new project upload with distinct stage groups and persistence');
 
 const large=await file([['업무명','시작일','완료일'],...Array.from({length:25},(_,i)=>['신규'+i,'2027-06-01','2027-06-02'])]);
 await p.locator('[data-upload2]').click();await p.locator('[data-u2file]').setInputFiles(large);await p.locator('[data-u2map="name"]').waitFor();await p.locator('[data-u2="review"]').click();
 assert.equal(await p.locator('.u2-row').count(),20);assert.equal(await p.evaluate(()=>SCHUP2.preview.adds),25);
 await p.locator('[data-u2="next"]').click();assert.equal(await p.locator('.u2-row').count(),5);
 await p.locator('[data-u2="close"]').click();console.log('PASS review pagination retains every row');
 const serious=errs.filter(e=>!e.includes('Failed to fetch'));assert.deepEqual(serious,[]);
 await browser.close();console.log('UPLOAD2 CHECKS PASSED');
})().catch(e=>{console.error(e);process.exit(1)});
