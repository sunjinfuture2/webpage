// Main page while the preview is on: one table for the action items of every project and, of the projects that have a
// schedule, the tasks that are under way or due within 30 days (owner, 2026-11-19: not all of them).
function schMainTasks(pid){ const m=schModel(pid); if(!m)return []; const P=AIDCSchedule.progress, today=schToday(), D=AIDCSchedule.dates, red=schNotices(pid).red;
  return m.plan.tasks.filter(t=>{ if(red.has(schItemId(t.id)))return true;   // a change on a task of mine is shown whatever its dates are
    if(P.isDone(t)||P.isExcluded(t))return false; const r=m.res.tasks[t.id]; return P.isStarted(t)||(r.start<=today&&r.finish>=today)||D.diffDays(r.finish,today)<=30; })
    .map(t=>{const r=m.res.tasks[t.id], it=ITEMS.find(x=>x.id===schItemId(t.id)); return {id:schItemId(t.id),proj:pid,wbs:schWbs(t.wbs),ms:t.kind==='milestone',title:t.name,ppl:schPeople(t),role:'미지정',start:r.start,end:r.finish,done:P.isDone(t),st:schStatus(t),pri:schPri(m,t),auto:!t.pri,mod:it?modDate(it):null,order:t.order};}); }
function schMainRows(){ const q=S.q.action, out=[];
  for(const i of liveItems('action')){ if(i.own)continue; const m=i.task&&schHas(i.proj)?schModel(i.proj):null, t=m&&m.byId.get(i.task);
    out.push({id:i.id,proj:i.proj,wbs:t?schWbs(t.wbs):'',ms:false,title:(i.title||'(제목 없음)').split('\n').join(' '),ppl:i.people||[],role:'미지정',start:i.date,end:itemEnd(i),done:i.st==='done',st:i.st==='done'?'완료':'진행',pri:i.pri||'mid',auto:false,mod:modDate(i),item:i,order:0}); }
  for(const pid of Object.keys(SCH_SOURCES))if(schHas(pid))out.push(...schMainTasks(pid));
  return out.filter(r=>matchQ(q,r.title,r.wbs,proj(r.proj).tag,...r.ppl.map(userName))); }
function schMainActions(){ const rows=schMainRows(), k=S.sort.k, dir=S.sort.dir||1, notes={};
  for(const r of rows){ const n=notes[r.proj]||(notes[r.proj]=schNotices(r.proj)); r.red=n.red.has(r.id); r.green=n.green.has(r.id); r.dots=schDotsHtml(n,r.id); }
  const key={proj:r=>proj(r.proj).tag,who:r=>userName(r.ppl[0])||'~',title:r=>norm(r.title),date:r=>r.end||'',pri:r=>({high:0,mid:1,low:2})[r.pri]??9,st:r=>r.done?1:0,mod:r=>r.mod?r.mod.getTime():0}[k];
  // without a chosen order: changed ones (red), those that start today (green), then what is not finished, nearest deadline first
  rows.sort(key?(a,b)=>{const x=key(a),y=key(b);return (x<y?-1:x>y?1:0)*dir||(a.end||'').localeCompare(b.end||'');}:(a,b)=>(b.red-a.red)||(b.green-a.green)||(a.done-b.done)||(a.end||'9').localeCompare(b.end||'9')||a.order-b.order);
  const total=Math.max(1,Math.ceil(rows.length/S.actPer)); S.actPage=Math.min(Math.max(1,S.actPage),total); const page=rows.slice((S.actPage-1)*S.actPer,S.actPage*S.actPer);
  const th=(kk,t)=>`<span data-sort="${kk}" class="${k===kk?'sorted':''}" title="눌러서 정렬"><em>${t}${k===kk?`<i class="sa">${dir>0?'▲':'▼'}</i>`:''}</em></span>`;
  let h=`<div class="view-wrap" style="margin-top:28.5px"><div class="tbl actions sch-main"><div class="hd">${th('proj','프로젝트')}${th('who','담당자')}${th('title','제목')}${th('date','기한')}${th('st','상태')}${th('pri','중요도')}${th('mod','최종수정일자')}</div>`;
  for(const r of page){ const p=proj(r.proj);
    h+=`<div class="rw" data-open="${esc(r.id)}"><div>${pill(p,'nosq')}</div><div class="who" style="margin-left:-1.3px">${r.ppl.length?r.ppl.slice(0,2).map(u=>`<span>${av()}${esc(userName(u))}</span>`).join(''):(r.role?`<span class="sch-role">${esc(r.role)}</span>`:'')}</div>
      <div class="ttl" style="margin-left:-0.4px"><span class="gut">${r.ms?'<i class="sch-ms" style="margin:0"></i>':''}</span><span class="tx">${r.dots}${r.wbs?`<span class="wb">${esc(r.wbs)})</span>`:''}${esc(r.title)}</span><span class="acts"><button class="sh-btn" data-act="open" data-id="${esc(r.id)}">열기</button>${r.item&&hasFiles(r.item)?`<button class="sh-btn" data-act="dl" data-id="${esc(r.id)}">다운로드 ${svg('i-dl',10,11,'color:#4f4f4f;margin-top:1px')}</button>`:''}</span></div>
      <div class="due">${r.done?'<span class="sch-dd"></span>':(schDdayHtml(r.end,false)||'<span class="sch-dd"></span>')}${r.end&&r.end>r.start?schRange(r.start,r.end):`<span>${schD(r.end||r.start)}</span>`}</div><div class="stt">${schStIcon(r.st)}</div><div class="pri pri-${r.pri} ${r.auto?'auto':''}">${priTxt[r.pri]}</div>
      <div class="mod">${r.mod?esc(fmtStampShort(r.mod)):'-'}</div></div>`; }
  if(!page.length)h+=`<div class="none">${S.q.action?'검색 결과가 없습니다.':'등록된 액션이 없습니다.'}</div>`;
  return h+`<div class="ft"></div></div></div>${pager(S.actPage,total,'pg-act').replace('class="pager','style="margin-top:59px" class="pager')}`; }
