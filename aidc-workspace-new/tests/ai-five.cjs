const fs=require('node:fs'),assert=require('node:assert/strict'),PptxGenJS=require('pptxgenjs'),docx=require('docx');
const {chromium,newUser}=require('./h.cjs');
const D=require('./ai-five-data.json'),out='test-results/ai-five';
fs.mkdirSync(out,{recursive:true});
const sections=[['사업 개요',D.overview],['입지 및 전력 인프라',D.infra],['사업 구조 및 수익 모델',D.finance],['추진 현황 및 주요 특성',D.status],['주요 리스크 및 검토사항',D.risk]];
async function word(name,table){const {Document,Packer,Paragraph,TextRun,Table,TableRow,TableCell,HeadingLevel}=docx;
 const para=t=>new Paragraph({children:[new TextRun({text:t,font:'맑은 고딕',size:22})],spacing:{after:160}});
 const children=[new Paragraph({text:'판교 AIDC — 업로드 테스트',heading:HeadingLevel.TITLE})];
 if(table){children.push(para('검토 과제 및 현황'),new Table({rows:[...D.metrics,...D.schedule.map(r=>[r[0],r[1]+' ('+r[2]+')'])].map(r=>new TableRow({children:r.map(t=>new TableCell({children:[para(t)]}))})));}
 for(const [title,body]of table?[...sections].reverse():sections){children.push(new Paragraph({text:table?title.replace('추진 현황 및 주요 특성','현황 및 특성'):title,heading:HeadingLevel.HEADING_1}),para(body));}
 if(!table)children.push(...D.metrics.map(r=>para(r.join(': '))),...D.schedule.map(r=>para(r.join(' | '))));
 await fs.promises.writeFile(out+'/'+name,await Packer.toBuffer(new Document({sections:[{children}]})));}
function base(title){const p=new PptxGenJS();p.layout='LAYOUT_WIDE';p.author='Workspace QA';p.subject='사용자 제공 판교 AIDC 내용을 재배열한 시험용 문서';p.title=title;return p;}
function slide(p,title){let s=p.addSlide();s.background={color:'FFFFFF'};s.addText(title,{x:.4,y:.25,w:12.5,h:.6,fontFace:'Malgun Gothic',fontSize:24,bold:true,color:'26334D'});return s;}
function text(s,t,x=.45,y=1,w=12.3,h=5.9){s.addText(t,{x,y,w,h,fontFace:'Malgun Gothic',fontSize:16,breakLine:false,margin:8,fit:'shrink',color:'222222',valign:'top'});}
async function fixtures(){await word('01_Word_문단형.docx',false);await word('02_Word_표중심.docx',true);
 let p=base('지표 우선');let s=slide(p,'판교 AIDC | 핵심 지표');s.addTable(D.metrics,{x:.5,y:1,w:12.2,h:5.8,fontSize:18,fontFace:'Malgun Gothic',border:{pt:.5,color:'CCCCCC'},color:'222222'});
 for(const [title,body]of sections){s=slide(p,title);text(s,body);}
 s=slide(p,'추진 일정');s.addTable([['시기','내용','상태'],...D.schedule],{x:.5,y:1,w:12.2,h:5.6,fontSize:18,border:{pt:.5,color:'CCCCCC'}});
 await p.writeFile({fileName:out+'/03_PPT_지표우선.pptx'});
 p=base('위험과 일정 우선');
 for(const [title,body]of [['의사결정 전 확인할 사항',D.risk],['현황 및 특성',D.status],['사업성 및 조달',D.finance],['시설과 전원',D.infra],['프로젝트 소개',D.overview]]){s=slide(p,title);text(s,body);}
 s=slide(p,'마일스톤 / 지표');text(s,D.schedule.map(r=>r.join(' — ')).join('\n')+'\n\n'+D.metrics.map(r=>r.join(' : ')).join('\n'));
 await p.writeFile({fileName:out+'/04_PPT_역순_소제목변경.pptx'});
 p=base('다단 및 표 혼합');
 s=slide(p,'판교 AIDC | 입지 · 규모');text(s,D.overview+'\n\n'+D.infra,.4,1,6,6);s.addTable(D.metrics,{x:6.8,y:1,w:6,h:5.7,fontSize:15,border:{pt:.5,color:'CCCCCC'}});
 s=slide(p,'사업 구조 / 상태');text(s,D.finance,.4,1,6,6);text(s,D.status,6.8,1,6,6);
 s=slide(p,'확인 필요 사항 / 추진 일정');text(s,D.risk,.4,1,6,6);s.addTable([['시기','내용','상태'],...D.schedule],{x:6.8,y:1,w:6,h:5.7,fontSize:14,border:{pt:.5,color:'CCCCCC'}});
 await p.writeFile({fileName:out+'/05_PPT_다단_표혼합.pptx'});}
(async()=>{await fixtures();const browser=await chromium.launch();const results=[];try{
 const {page:p,errs}=await newUser(browser,'test','test',{url:'https://sunjin-aidc-workspace-demo.sunjinfuture2.workers.dev/'});
 const api=async(path)=>p.evaluate(async path=>await(await apiFetch(path)).json(),path);
 const initial=await api('/api/state');const original=await api('/api/ai-project/status?project=ai-application-test');
 assert.ok(original.ready,'API key required');
 for(const name of fs.readdirSync(out).filter(x=>/\.(docx|pptx)$/.test(x)).sort()){
  await p.evaluate(()=>go('project:ai-application-test'));await p.waitForSelector('.ai-overview');await p.click('[data-ai-open="upload"]');
  await p.waitForFunction(()=>document.querySelector('[data-ai-status]')?.textContent.includes('등록되어'),null,{timeout:90000});
  const result={file:name};
  await p.locator('[data-ai-file]').setInputFiles(out+'/'+name);
  if(name.endsWith('.docx')){
   result.status=await p.locator('[data-ai-status]').innerText();result.analyzeDisabled=await p.locator('[data-ai-analyze]').isDisabled();
   result.outcome='unsupported';await p.screenshot({path:out+'/'+name+'.png'});
   await p.locator('[data-ai-close]').first().click();results.push(result);console.log('ATTEMPT',JSON.stringify(result));continue;
  }
  await p.fill('[data-ai-hint]','판교 AIDC');
  const response=p.waitForResponse(r=>r.url().includes('/api/ai-project/analyze')&&r.request().method()==='POST',{timeout:170000});
  await p.click('[data-ai-analyze]');const res=await response;const payload=await res.json();result.http=res.status();result.usage=payload.usage;
  if(!res.ok()){result.outcome='analysis_error';result.error=payload.error;await p.waitForFunction(()=>!document.querySelector('[data-ai-analyze]').disabled);await p.locator('[data-ai-close]').first().click();results.push(result);console.log('ATTEMPT',JSON.stringify(result));continue;}
  await p.waitForSelector('.ai-preview .ai-report',{timeout:30000});fs.writeFileSync(out+'/'+name+'.report.json',JSON.stringify(payload,null,2));
  result.sections=payload.report.sections.map(s=>({title:s.title,type:s.type}));
  const flat=JSON.stringify(payload.report);result.numberChecks=Object.fromEntries(['3.0','3.6','1,850','1,152','1,460','27.52','1.48','1.2','2028','2.4','5MW'].map(n=>[n,flat.includes(n)]));
  result.uncertaintyMentioned=/미확정|미정|확인 필요/.test(flat);
  await p.screenshot({path:out+'/'+name+'.preview.png',fullPage:true});
  const savedResponse=p.waitForResponse(r=>r.url().includes('/api/ai-project/save')&&r.request().method()==='POST',{timeout:90000});
  await p.click('[data-ai-save]');const sr=await savedResponse;assert.ok(sr.ok(),'save failed');const sd=await sr.json();await p.waitForSelector('.ai-dialog',{state:'detached',timeout:30000});
  await p.reload();await p.waitForFunction(()=>!document.querySelector('#app').hidden,null,{timeout:90000});await p.evaluate(()=>go('project:ai-application-test'));await p.waitForSelector('.ai-overview');
  const reopened=await api('/api/ai-project/status?project=ai-application-test');
  result.persistenceEqual=JSON.stringify(reopened.saved.report)===JSON.stringify(sd.saved.report);result.revision=reopened.saved.revision;result.outcome='analyzed_saved_reopened';
  result.horizontalOverflow=await p.locator('.ai-overview').evaluate(el=>el.scrollWidth>el.clientWidth+2);
  await p.screenshot({path:out+'/'+name+'.saved.png',fullPage:true});results.push(result);console.log('ATTEMPT',JSON.stringify(result));
 }
 const after=await api('/api/state');
 const changed=Object.keys({...initial.records,...after.records}).filter(k=>{if(k==='meta:head'){const a={...initial.records[k]},b={...after.records[k]};delete a['ai-application-test'];delete b['ai-application-test'];return JSON.stringify(a)!==JSON.stringify(b);}return JSON.stringify(initial.records[k])!==JSON.stringify(after.records[k]);});
 console.log('OTHER_RECORD_CHANGES',JSON.stringify(changed));console.log('BROWSER_ERRORS',JSON.stringify(errs));
 fs.writeFileSync(out+'/results.json',JSON.stringify({results,otherRecordChanges:changed,browserErrors:errs},null,2));
 }finally{await browser.close();}})().catch(e=>{console.error(e);process.exit(1);});
