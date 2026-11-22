// Main page while the preview is on: one table for the action items of every project and, of the projects that have a
// schedule, the tasks that are under way or due within 30 days (owner, 2026-11-19: not all of them).
// Sixth round (2026-11-20): the table is the project page's list (same columns, the same menus on the column titles to order and
// filter by), with the project in front; what is filtered shows as small tags between the title and the table.
function schMainTasks(pid){ const m=schModel(pid); if(!m)return []; const P=AIDCSchedule.progress, today=schToday(), D=AIDCSchedule.dates, red=schNotices(pid).red;
  return m.plan.tasks.filter(t=>{ if(red.has(schItemId(t.id)))return true;   // a change on a task of mine is shown whatever its dates are
    if(P.isDone(t)||P.isExcluded(t))return false; const r=m.res.tasks[t.id]; return P.isStarted(t)||(r.start<=today&&r.finish>=today)||D.diffDays(r.finish,today)<=30; })
    .map(t=>{const r=m.res.tasks[t.id], it=ITEMS.find(x=>x.id===schItemId(t.id)); return {id:schItemId(t.id),proj:pid,wbs:schWbs(t.wbs),ms:t.kind==='milestone',title:t.name,ppl:schPeople(t),role:'미지정',start:r.start,end:r.finish,ps:t.plannedStart,pf:t.plannedFinish,done:P.isDone(t),st:schStatus(t),pri:schPri(m,t),auto:!t.pri,url:t.url||'',mod:it?modDate(it):null,order:t.order};}); }
function schMainRows(){ const q=S.q.action, out=[];
  for(const i of liveItems('action')){ if(i.own)continue; const m=i.task&&schHas(i.proj)?schModel(i.proj):null, t=m&&m.byId.get(i.task), end=itemEnd(i);
    out.push({id:i.id,proj:i.proj,wbs:t?schWbs(t.wbs):'',ms:!!i.ms,title:(i.title||'(제목 없음)').split('\n').join(' '),ppl:i.people||[],role:'미지정',start:i.date,end,ps:i.date,pf:end,done:i.st==='done',st:schItemSt(i),pri:i.pri||'mid',auto:false,url:i.url||'',mod:modDate(i),item:i,order:t?t.order+.5:1e9}); }
  for(const pid of schPids())out.push(...schMainTasks(pid));
  return out.filter(r=>matchQ(q,r.title,r.wbs,proj(r.proj).tag,proj(r.proj).full,...r.ppl.map(userName))); }
// what the column titles of the main table filter by
const schMf=()=>S.mf||(S.mf={});
function schMainTest(r){ const c=schMf();
  if(c.proj&&r.proj!==c.proj)return false; if(c.kind&&(c.kind==='ms')!==r.ms)return false; if(c.pri&&r.pri!==c.pri)return false; if(c.st&&r.st!==c.st)return false;
  if(c.who&&(c.who==='none'?r.ppl.length>0:!r.ppl.includes(c.who)))return false; if(c.url&&(c.url==='y')!==!!urlHref(r.url))return false;
  return schSpanTest(c,r.ps||'',r.pf||r.ps||'')&&schDueTest(c,r.end,r.done); }
const SCH_MSORT={proj:r=>pname(proj(r.proj)),wbs:r=>r.order,name:r=>norm(r.title),plan:r=>(r.ps||'')+(r.pf||''),pri:r=>({high:0,mid:1,low:2})[r.pri]??9,st:r=>SCH_STATUSES.indexOf(r.st),who:r=>userName(r.ppl[0])||'~',due:r=>r.end||'9'};
const SCH_MF_NAMES={...SCH_CF_NAMES};
function schMainChips(){ const c=schMf(), out=[], chip=(k,label,col)=>out.push(`<button class="sch-chip" data-mchip="${k}" title="이 조건 지우기" ${col?`style="color:${esc(col)}"`:''}>${esc(label)}<i>✕</i></button>`);
  if(c.proj)chip('proj','프로젝트: '+(pname(proj(c.proj))||c.proj),proj(c.proj).color); if(c.who)chip('who','담당자: '+(c.who==='none'?'미지정':userName(c.who)));
  for(const k of ['kind','plan','pri','st','due','url']){ if(!c[k])continue; const d=SCH_MF_NAMES[k]; chip(k,d[0]+': '+(d[1]?d[1][c[k]]||c[k]:c[k])); }
  return out.join(''); }
// The width the project column needs: the widest tag among the projects (measured once per set of names), within reason.
function schPillW(){ const names=orderedProjects().map(k=>pname(PROJECTS[k])).join('|'); if(schPillW.k===names)return schPillW.w; const box=document.createElement('div'); box.style.cssText='position:absolute;visibility:hidden;left:-9999px;top:0;white-space:nowrap';
  box.innerHTML=orderedProjects().map(k=>pill(PROJECTS[k],'nosq')).join('<br>'); $('#app').appendChild(box); let w=0; for(const p of box.querySelectorAll('.pill'))w=Math.max(w,p.offsetWidth); box.remove(); schPillW.k=names; return schPillW.w=Math.max(106,Math.min(230,Math.ceil(w)+18)); }
function schMainActions(){ const all=schMainRows(), rows=all.filter(schMainTest), c=schMf(), k=S.sort.k, dir=S.sort.dir||1, notes={};
  for(const r of rows){ const n=notes[r.proj]||(notes[r.proj]=schNotices(r.proj)); r.red=n.red.has(r.id); r.green=n.green.has(r.id); r.dots=schDotsHtml(n,r.id); }
  const key=SCH_MSORT[k];
  // without a chosen order: changed ones (red), those that start today (green), then what is not finished, nearest deadline first
  rows.sort(key?(a,b)=>{const x=key(a),y=key(b);return (x<y?-1:x>y?1:0)*dir||(a.end||'').localeCompare(b.end||'');}:(a,b)=>(b.red-a.red)||(b.green-a.green)||(a.done-b.done)||(a.end||'9').localeCompare(b.end||'9')||a.order-b.order);
  const total=Math.max(1,Math.ceil(rows.length/S.actPer)); S.actPage=Math.min(Math.max(1,S.actPage),total); const page=rows.slice((S.actPage-1)*S.actPer,S.actPage*S.actPer);
  const on={proj:!!c.proj,name:!!c.kind,plan:!!c.plan,pri:!!c.pri,st:!!c.st,who:!!c.who,due:!!c.due,url:!!c.url};
  const th=(kk,t)=>`<span data-mcol="${kk}" class="${k===kk?'sorted':''} ${k===kk&&dir<0?'up':''} ${on[kk]?'flt':''}" title="눌러서 정렬 · 조건 선택">${t}${svg('i-chev-d',8,4)}</span>`;
  const urlCell=schUrlCell;
  let h=`<div class="sch-chipwrap"><div class="sch-chiprow" data-chips="main">${schMainChips()}</div></div>
    <div class="sch-filters sch-all"><div class="sf per" data-per title="한 쪽에 보이는 줄 수"><span>${S.actPer}개씩 보기</span>${svg('i-chev-d',9,4.6)}</div></div>
    <div class="tbl sch-list sch-all" style="--pjw:${schPillW()}px"><div class="hd">${th('proj','프로젝트')}${th('wbs','WBS')}${th('name','업무명')}${th('plan','관리일정')}${th('pri','중요도')}${th('st','상태')}${th('who','담당자')}${th('due','기한')}${th('url','URL')}</div>`;
  for(const r of page){ const p=proj(r.proj);
    h+=`<div class="rw ${S.panel===r.id?'sel':''}" data-open="${esc(r.id)}"><div class="pj">${pill(p,'nosq')}</div><div class="w">${esc(r.wbs||'-')}</div><div class="nm"><span class="gut">${r.ms?'<i class="sch-ms" style="margin:0"></i>':''}</span><span class="tx">${r.dots}${esc(r.title)}</span></div>
      <div class="rg">${r.ms?schD(r.ps):(r.pf&&r.pf>r.ps?schRange(r.ps,r.pf):schD(r.ps||r.pf))}</div><div><span class="pri pri-${r.pri}">${priTxt[r.pri]}</span></div><div>${schStIcon(r.st)}</div>
      <div class="who">${r.ppl.length?r.ppl.slice(0,2).map(u=>`<span>${av()}${esc(userName(u))}</span>`).join(''):'<span class="sch-role none">미지정</span>'}</div><div class="dd">${r.done?'':schDdayHtml(r.end,false)}</div><div class="url">${urlCell(r.url)}</div></div>`; }
  if(!page.length)h+=`<div class="none">${S.q.action||Object.keys(c).length?'조건에 맞는 액션이 없습니다.':'등록된 액션이 없습니다.'}</div>`;
  return h+`<div class="ft"></div></div>${pager(S.actPage,total,'pg-act').replace('class="pager','style="margin-top:32px" class="pager')}`; }
// A picker of the row of filters (the look of the project page's: a word, a line below, a chevron).
const schSf2=(attr,k,label,set)=>`<div class="sf ${set?'set':''}" data-${attr}="${k}"><span>${esc(label)}</span>${svg('i-chev-d',9,4.6)}</div>`;
// The menu of a column title of the main table: how to order by that column and what to keep.
function schMainColMenu(el,v,only){ const c=schMf(), go=()=>{S.actPage=1;refreshSec('action');};
  const srt=(label,dir)=>({t:label,sel:S.sort.k===v&&(S.sort.dir||1)===dir,fn:()=>{S.sort={k:v,dir};go();}});
  const fl=(key,val,item)=>({...item,sel:(c[key]||'')===val,fn:()=>{if(val)c[key]=val;else delete c[key];go();}});
  const rows=schMainRows(); let items=[];
  const projs=[fl('proj','',{t:'전체 프로젝트'}),...orderedProjects().filter(p=>rows.some(r=>r.proj===p)).map(p=>fl('proj',p,{t:pname(proj(p)),html:pill(proj(p),'nosq')}))];
  const ppl=[...new Set(rows.flatMap(r=>r.ppl))].sort((x,y)=>userName(x).localeCompare(userName(y)));
  const who=[fl('who','',{t:'전체 담당자'}),...ppl.map(u=>fl('who',u,{t:userName(u)+(u===sharedUser?' (나)':''),ico:av('av15')})),fl('who','none',{t:'미지정',html:'<span class="sch-role none">미지정</span>'})];
  if(v==='proj')items=only?projs:[{hd:'정렬'},srt('이름 순',1),srt('이름 역순',-1),'-',{hd:'프로젝트'},...projs];
  else if(v==='wbs')items=[{hd:'정렬'},srt('번호 순',1),srt('번호 역순',-1)];
  else if(v==='name')items=[{hd:'정렬'},srt('가나다 순',1),srt('가나다 역순',-1),'-',{hd:'종류'},fl('kind','',{t:'전체'}),fl('kind','task',{t:'일반 업무'}),fl('kind','ms',{t:'마일스톤',ico:'<i class="sch-ms" style="margin:0 8px 1px 1px"></i>'})];
  else if(v==='plan')items=[{hd:'정렬'},srt('시작이 빠른 순',1),srt('시작이 늦은 순',-1),'-',{hd:'기간'},fl('plan','',{t:'전체 기간'}),fl('plan','now',{t:'오늘 진행 중'}),fl('plan','month',{t:'이번 달에 걸친 일정'}),fl('plan','next',{t:'앞으로 시작'}),fl('plan','past',{t:'지난 일정'})];
  else if(v==='pri')items=[{hd:'정렬'},srt('높은 순',1),srt('낮은 순',-1),'-',{hd:'중요도'},fl('pri','',{t:'전체'}),...['high','mid','low'].map(p=>fl('pri',p,{t:priTxt[p],html:`<span class="pri pri-${p}">${priTxt[p]}</span>`}))];
  else if(v==='st')items=[{hd:'정렬'},srt('상태 순',1),srt('상태 역순',-1),'-',{hd:'상태'},fl('st','',{t:'전체'}),...SCH_STATUSES.map(x=>fl('st',x,{t:x,html:schStIcon(x)}))];
  else if(v==='who')items=only?who:[{hd:'정렬'},srt('이름 순',1),srt('이름 역순',-1),'-',{hd:'담당자'},...who];
  else if(v==='due')items=[{hd:'정렬'},srt('가까운 순',1),srt('먼 순',-1),'-',{hd:'기한'},fl('due','',{t:'전체'}),fl('due','late',{t:'지연',html:'<span class="sch-dd hot">지연</span>'}),fl('due','7',{t:'7일 안에 마감'}),fl('due','30',{t:'30일 안에 마감'})];
  else if(v==='url')items=[{hd:'URL'},fl('url','',{t:'전체'}),fl('url','y',{t:'주소 있음'}),fl('url','n',{t:'주소 없음'})];
  if(S.sort.k===v&&!only)items.splice(3,0,{t:'기본 순서로',fn:()=>{S.sort={k:'',dir:1};go();}});
  menuPop(el,items.map((x,i)=>x==='-'||x.hd?x:{...x,k:String(i)}),{cls:'sch-colmenu'}); }
