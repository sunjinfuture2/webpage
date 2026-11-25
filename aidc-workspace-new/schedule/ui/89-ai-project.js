// Only the report above the existing calendar of the explicit trial project.
const AI_PROJECT_ID='ai-application-test';
let schAILib;
const schAIEndpoint=action=>'/api/ai-project/'+action+'?project='+AI_PROJECT_ID;
const schAIRefs=s=>(s.refs||[]).length?'<details class="ai-refs"><summary>원문 근거</summary>'+s.refs.map(r=>'<p><b>'+r.page+'페이지/슬라이드</b> '+esc(r.quote)+'</p>').join('')+'</details>':'';
function schAIReport(r){
 if(!r)return '<div class="ai-empty"><b>문서에서 프로젝트 개요를 구성해보세요</b><p>필수 컬럼이나 고정된 소제목 없이 사업의 핵심에 맞춰 섹션을 구성합니다.</p></div>';
 const sections=r.sections||[];
 return '<div class="ai-report"><h2>'+esc(r.title)+'</h2><p class="ai-summary">'+esc(r.summary)+'</p><div class="ai-sections">'+sections.map(s=>{
 let body='';
 if(s.type==='paragraphs')body=(s.paragraphs||[]).map(t=>'<p>'+esc(t)+'</p>').join('');
 if(s.type==='bullets')body='<ul>'+(s.bullets||[]).map(t=>'<li>'+esc(t)+'</li>').join('')+'</ul>';
 if(s.type==='metrics')body='<div class="ai-metrics">'+(s.metrics||[]).map(m=>'<div><small>'+esc(m.label)+'</small><strong>'+esc(m.value)+'</strong><p>'+esc(m.note)+'</p></div>').join('')+'</div>';
 if(s.type==='table')body='<div class="ai-table"><table><thead><tr>'+(s.columns||[]).map(c=>'<th>'+esc(c)+'</th>').join('')+'</tr></thead><tbody>'+(s.rows||[]).map(row=>'<tr>'+row.map(c=>'<td>'+esc(c)+'</td>').join('')+'</tr>').join('')+'</tbody></table></div>';
 return '<section class="ai-section '+(s.type==='table'||s.type==='metrics'?'wide':'')+'"><h3>'+esc(s.title)+'</h3>'+body+schAIRefs(s)+'</section>';
 }).join('')+'</div>'+((r.warnings||[]).length?'<aside class="ai-warnings"><b>확인할 내용</b><ul>'+r.warnings.map(x=>'<li>'+esc(x)+'</li>').join('')+'</ul></aside>':'')+'</div>';
}
function schAIHead(pid){
 const p=PROJECTS[pid], saved=PHEAD[pid]?.aiOverview;
 return '<div class="phead rep ai-overview"><div class="ttl"><h1>'+esc(p.full)+'</h1><span class="ai-badge">AI 문서 개요 · 테스트</span></div><div class="ai-actions"><button type="button" data-ai-open="upload">문서로 개요 구성</button>'+(saved?'<button type="button" data-ai-open="edit">내용 수정</button>':'')+'</div>'+schAIReport(saved?.report)+(saved?'<p class="ai-source">분석 원본: '+esc(saved.source?.name||'')+' · 저장: '+esc(saved.at.slice(0,16).replace('T',' '))+' UTC</p>':'')+'<div class="hr bt"></div></div>';
}
async function schAICall(action,body){
 const r=await apiFetch(schAIEndpoint(action),body?{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)}:{});
 let d;try{d=await r.json();}catch{throw Error('서버 응답을 읽지 못했습니다.');}if(!r.ok)throw Error(d.error||'요청에 실패했습니다.');return d;
}
function schAIEditForm(r){
 const inp=(path,val,area=false)=>area?'<textarea data-ai-field="'+path+'">'+esc(val)+'</textarea>':'<input data-ai-field="'+path+'" value="'+esc(val)+'">';
 return '<label>문서 제목'+inp('title',r.title)+'</label><label>핵심 요약'+inp('summary',r.summary,true)+'</label>'+r.sections.map((s,i)=>{
 const pre='sections.'+i;let inner='';
 if(s.type==='paragraphs'||s.type==='bullets')inner='<label>'+(s.type==='paragraphs'?'문단 (빈 줄로 구분)':'항목 (한 줄에 하나)')+inp(pre+'.'+s.type,s[s.type].join(s.type==='paragraphs'?'\n\n':'\n'),true)+'</label>';
 if(s.type==='metrics')inner=s.metrics.map((m,j)=>'<div class="ai-metric-edit">'+['label','value','note'].map((k,n)=>'<label>'+['지표 이름','값·단위','조건·가정'][n]+inp(pre+'.metrics.'+j+'.'+k,m[k])+'</label>').join('')+'</div>').join('');
 if(s.type==='table')inner='<label>열 제목 (탭으로 구분)'+inp(pre+'.columns',s.columns.join('\t'),true)+'</label><label>표 내용 (행은 줄바꿈, 셀은 탭으로 구분)'+inp(pre+'.rows',s.rows.map(row=>row.join('\t')).join('\n'),true)+'</label>';
 return '<fieldset><legend>섹션 '+(i+1)+'</legend>'+inp(pre+'.title',s.title)+inner+schAIRefs(s)+'<button type="button" data-ai-remove="'+i+'">이 섹션 제외</button></fieldset>';
 }).join('')+'<label>확인할 내용 (한 줄에 하나)'+inp('warnings',r.warnings.join('\n'),true)+'</label>';
}
async function schAIOpen(mode){
 if(S.proj!==AI_PROJECT_ID||document.getElementById('dlg'))return;
 const dialog=document.createElement('div');dialog.id='dlg';dialog.className='dlg ai-dialog';
 dialog.innerHTML='<div class="box" role="dialog" aria-modal="true" aria-label="AI 프로젝트 개요"><header><h3>AI 프로젝트 개요</h3><button type="button" data-ai-close aria-label="닫기">✕</button></header><div class="ai-scroll"><p data-ai-status role="status">설정을 확인하고 있습니다…</p><div data-ai-upload><label class="ai-drop">PDF / PPTX 선택 또는 끌어놓기 · 최대 10MB<input type="file" accept=".pdf,.pptx" data-ai-file></label><p data-ai-filename></p><p class="ai-note">PDF는 페이지 전체를, PPTX는 텍스트를 분석합니다. 그림·차트가 중요한 PPT는 PDF로 저장해 올려주세요. 분석할 때 Claude API로 전송되며 원본 파일은 이 기능에서 서버에 보관하지 않습니다.</p><label>대상 사업 또는 중점 사항 (선택)<input data-ai-hint placeholder="여러 사업이 있는 보고서라면 대상 사업명을 적어주세요"></label><details><summary>분석 프롬프트 확인 · 추가 지침</summary><pre data-ai-prompt></pre><textarea data-ai-instruction placeholder="예: 투자 의사결정에 중요한 조건을 우선 정리"></textarea></details><button type="button" data-ai-analyze disabled>AI로 개요 구성</button></div><div data-ai-result></div></div><footer><button type="button" data-ai-close>닫기</button><button type="button" data-ai-save disabled>이 개요 적용</button></footer></div>';
 document.body.append(dialog);
 let ready=false,busy=false,report=null,source=null,revision=0,file=null,alive=true;
 const find=s=>dialog.querySelector(s), status=t=>{if(alive)find('[data-ai-status]').textContent=t;};
 const close=()=>{if(busy){status('처리 중입니다. 완료된 뒤 닫아주세요.');return;}alive=false;dialog.remove();};
 const draw=()=>{find('[data-ai-result]').innerHTML=report?'<h3>결과 확인 · 수정</h3><div class="ai-preview">'+schAIReport(report)+'</div><details class="ai-edit"><summary>내용 수정</summary>'+schAIEditForm(report)+'</details>':'';find('[data-ai-save]').disabled=!report||busy;};
 const take=f=>{if(!f||busy)return;if(f.size>10*1024*1024||!(/\.(pdf|pptx)$/i.test(f.name))){status('10MB 이하의 PDF 또는 PPTX를 선택해주세요. .ppt는 PPTX 또는 PDF로 저장해주세요.');return;}file=f;report=null;draw();find('[data-ai-filename]').textContent=f.name;find('[data-ai-analyze]').disabled=!ready;status(ready?'문서를 선택했습니다. 분석 버튼을 눌러주세요.':'API 키 등록 후 이 창을 다시 열어주세요.');};
 dialog.addEventListener('change',e=>{if(e.target.matches('[data-ai-file]'))take(e.target.files[0]);});
 const drop=find('.ai-drop');drop.addEventListener('dragover',e=>e.preventDefault());drop.addEventListener('drop',e=>{e.preventDefault();e.stopPropagation();take(e.dataTransfer.files[0]);});
 dialog.addEventListener('input',e=>{const path=e.target.dataset.aiField;if(!path||!report)return;const keys=path.split('.');let node=report;for(const k of keys.slice(0,-1))node=node[k];const key=keys.at(-1),v=e.target.value;
  node[key]=key==='rows'?v.split('\n').filter(Boolean).map(x=>x.split('\t')):key==='columns'?v.split('\t'):key==='paragraphs'?v.split(/\n\s*\n/).filter(Boolean):['bullets','warnings'].includes(key)?v.split('\n').filter(Boolean):v;
  const preview=find('.ai-preview');if(preview)preview.innerHTML=schAIReport(report);
 });
 dialog.addEventListener('click',async e=>{
  const btn=e.target.closest('button');if(!btn)return;
  if(btn.hasAttribute('data-ai-close')){close();return;}
  if(btn.hasAttribute('data-ai-remove')){report.sections.splice(+btn.dataset.aiRemove,1);draw();return;}
  if(btn.hasAttribute('data-ai-analyze')){
   if(!file||!ready||busy)return;busy=true;btn.disabled=true;find('[data-ai-save]').disabled=true;status('문서 분석 중… 분량에 따라 최대 2분 정도 걸릴 수 있습니다.');
   try{
    let input;
    if(/\.pdf$/i.test(file.name)){const data=await new Promise((resolve,reject)=>{const fr=new FileReader();fr.onload=()=>resolve(String(fr.result).split(',')[1]);fr.onerror=()=>reject(Error('파일을 읽지 못했습니다.'));fr.readAsDataURL(file);});input={kind:'pdf',name:file.name,data};}
    else {if(!window.AIDCAIDocuments){schAILib||=new Promise((resolve,reject)=>{const s=document.createElement('script');s.src='/ai-documents.js?v=1';s.onload=resolve;s.onerror=()=>{schAILib=null;reject(Error('PPTX 읽기 기능을 불러오지 못했습니다.'));};document.head.append(s);});await schAILib;}input=await window.AIDCAIDocuments.read(file);}
    const d=await schAICall('analyze',{...input,hint:find('[data-ai-hint]').value,instruction:find('[data-ai-instruction]').value});
    report=d.report;source=d.source;if(input.notice)report.warnings.push(input.notice);
    status('분석 완료 · 입력 '+d.usage.input_tokens+' / 출력 '+d.usage.output_tokens+' 토큰. 원문과 비교한 뒤 적용해주세요.');
   }catch(err){status(err.message);}finally{busy=false;btn.disabled=!ready;draw();}return;
  }
  if(btn.hasAttribute('data-ai-save')){
   if(!report||busy)return;busy=true;btn.disabled=true;status('개요를 저장하고 있습니다…');
   try{const d=await schAICall('save',{report,source,revision});sharedApply(d.records);render(true);busy=false;close();toast('AI적용테스트 개요를 저장했습니다.');}
   catch(err){status(err.message);busy=false;btn.disabled=false;}return;
  }
 });
 dialog.addEventListener('keydown',e=>{if(e.key==='Escape'){e.preventDefault();e.stopPropagation();close();}});
 try{const d=await schAICall('status');if(!alive)return;ready=d.ready;revision=d.saved?.revision||0;find('[data-ai-prompt]').textContent=d.prompt;
  status(ready?'Claude 연결 설정이 등록되어 있습니다.': 'API 키 미등록: Cloudflare → sunjin-aidc-workspace-demo → Settings → Variables and Secrets → Secret ANTHROPIC_API_KEY 추가 후 Deploy. 키는 이 화면에 입력하지 않습니다.');
  if(mode==='edit'&&d.saved){report=copy(d.saved.report);source=d.saved.source;find('[data-ai-upload]').hidden=true;draw();find('.ai-edit').open=true;}
 }catch(err){status(err.message);}
}
document.addEventListener('click',e=>{const b=e.target.closest('[data-ai-open]');if(b&&S.proj===AI_PROJECT_ID){e.preventDefault();e.stopPropagation();schAIOpen(b.dataset.aiOpen);}});
const aiStyle=document.createElement('style');aiStyle.textContent=`
.ai-overview{--ai-accent:#375cdb}.ai-overview .ttl{display:flex;align-items:center;gap:16px}.ai-badge{font-size:12px;color:#667085}.ai-actions{display:flex;gap:8px;margin:14px 0 24px}.ai-overview button,.ai-dialog button{border:1px solid #d6dce5;background:white;border-radius:6px;padding:9px 14px;cursor:pointer;font:inherit}.ai-overview button:hover,.ai-dialog button:hover{background:#eef3ff}.ai-dialog button:disabled{opacity:.45;cursor:default}.ai-report{color:inherit}.ai-report h2{font-size:22px;margin:0 0 14px}.ai-summary{line-height:1.85;white-space:pre-wrap;margin-bottom:24px}.ai-sections{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:24px}.ai-section{min-width:0}.ai-section.wide{grid-column:1/-1}.ai-section h3{border-bottom:1px solid #d9dee6;border-left:3px solid #375cdb;padding:2px 0 8px 10px;font-size:16px}.ai-section p,.ai-section li{font-size:14px;line-height:1.8;white-space:pre-wrap;overflow-wrap:anywhere}.ai-section ul{padding-left:20px}.ai-metrics{display:grid;grid-template-columns:repeat(auto-fit,minmax(170px,1fr));gap:14px}.ai-metrics>div{background:#f2f5f8;padding:16px;border-radius:6px}.ai-metrics strong{display:block;color:#375cdb;font-size:24px;margin:8px 0;overflow-wrap:anywhere}.ai-metrics small{font-size:13px}.ai-metrics p{margin:0;font-size:12px}.ai-table{overflow:auto}.ai-table table{width:100%;border-collapse:collapse;font-size:13px}.ai-table th,.ai-table td{padding:10px;border-bottom:1px solid #e2e5e9;text-align:left;white-space:pre-wrap;overflow-wrap:anywhere;min-width:90px}.ai-table th{background:#eef1f5}.ai-refs{margin:10px 0;color:#687482;font-size:12px}.ai-refs p{font-size:12px}.ai-warnings{background:#fff7e6;border-radius:6px;padding:16px;margin:20px 0;line-height:1.7}.ai-source,.ai-note{font-size:12px;color:#687482;line-height:1.7}.ai-empty{padding:36px;background:#f5f7fa;border-radius:8px}.ai-dialog{z-index:12000}.ai-dialog .box{width:min(1100px,94vw);max-height:90vh;display:flex;flex-direction:column;padding:0;overflow:hidden}.ai-dialog header,.ai-dialog footer{padding:16px 24px;display:flex;align-items:center;justify-content:space-between;border-bottom:1px solid #e2e5e9}.ai-dialog footer{border-top:1px solid #e2e5e9;border-bottom:0;justify-content:flex-end;gap:10px}.ai-scroll{padding:20px 24px;overflow:auto;min-height:0}.ai-dialog label{display:block;margin:14px 0;font-size:14px}.ai-dialog input,.ai-dialog textarea{display:block;width:100%;box-sizing:border-box;margin-top:6px;padding:10px;border:1px solid #d6dce5;border-radius:5px;font:inherit}.ai-dialog textarea{min-height:90px;resize:vertical}.ai-dialog pre{white-space:pre-wrap;font:12px/1.7 sans-serif;max-height:220px;overflow:auto}.ai-drop{padding:24px;border:1px dashed #a8b8d4;background:#f6f8fc;border-radius:8px}.ai-dialog fieldset{border:1px solid #e1e5eb;border-radius:6px;margin:16px 0;padding:14px}.ai-metric-edit{display:grid;grid-template-columns:1fr 1fr 2fr;gap:10px}.ai-preview{padding:20px 0}.ai-edit{margin:12px 0}.ai-dialog [data-ai-status]{white-space:pre-wrap;line-height:1.7}@media(max-width:700px){.ai-sections{grid-template-columns:1fr}.ai-metric-edit{grid-template-columns:1fr}.ai-dialog .box{width:96vw}.ai-overview .ttl{flex-wrap:wrap}}
`;document.head.append(aiStyle);
