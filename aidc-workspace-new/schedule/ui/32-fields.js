// Eighth round (owner, 2026-11-20): one panel for every action, and the fields of a meeting's three lines.
// An ordinary action (one that is not a task of the schedule) shows the same block as a task: the same rows in the same places and
// the same pickers. Its values are the item's own fields and are saved with 저장 like the rest of the item:
//   date / end (예상 기한), actualStart / actualFinish (실제 기한), phase / task (개발 단계), ms (마일스톤), refs (참고 자료),
//   people, st + stx (상태: st stays 'prog' | 'done' for everything that already reads it, stx names one of the other marks), pri, url.
const schItemSt=i=>i.st==='done'?'완료':(SCH_STATUSES.includes(i.stx)&&i.stx!=='완료'?i.stx:'진행');
function schActionProps(it,E,full,h){ const pid=PROJECTS[it.proj]?it.proj:'', m=pid&&schReady(pid)?schModel(pid):null, t=m&&it.task?m.byId.get(it.task):null, g=m?m.phases.find(x=>x.code===(t?t.phase:it.phase)):null;
  const V=(k,inner,cls='')=>`<div class="pr"><span class="k">${k}</span><span class="v sch-v ${cls}">${inner}</span></div>`, none=x=>`<span class="plain" style="color:#c4c4c4">${x}</span>`;
  const f=(k,inner,title='')=>E?`<span class="sf-e" data-pick="${k}" ${title?`title="${esc(title)}"`:''}>${inner}</span>`:`<span class="sf-r">${inner}</span>`, ph=x=>`<i>${E?x:'-'}</i>`;
  const arrow=svg('i-sch-arr',11,8,'color:#4f4f4f;margin:0 2px'), end=itemEnd(it), ms=!!it.ms, links=SCHP.tab==='links';
  const tabs=`<div class="sp-tabs"><button class="${links?'':'on'}" data-schp="atab" data-k="info">정보</button><button class="${links?'on':''}" data-schp="atab" data-k="links">연결된 액션<small>${t?(m.pred.get(t.id).length+m.succ.get(t.id).length||''):''}</small></button></div>`;
  if(links)return `<div class="props sch-props act-props ${E?'ed':''}"><div class="rcol" hidden></div>${tabs}${t?schLinksHtml(pid,m,t,full,false):'<div class="sp-links"><div class="sl-none on">일정의 업무에 연결하면 그 업무의 선후 관계가 여기에 보입니다. 정보 › 개발 단계에서 단계와 업무를 고릅니다.</div></div>'}</div>`;
  const dates=ms?f('date',schD(it.date),'날짜 변경'):`<span class="sch-pair">${f('date',schD(it.date),'시작일 변경')}${arrow}${f('end',end>it.date?schDto(it.date,end):ph('종료일'),'종료일 변경')}</span>`;
  const stage=!pid?none(E?'사업명을 먼저 고르세요':'일정 미연결')
    :E?schStageEdit(m,g,t,it)
    :(g?`<span class="sch-stage ro"><span>${esc(schPhaseLabel(g))}</span>${t?`<a data-open="${schItemId(t.id)}" title="이 업무 열기">${esc(schTaskTitle(t))}</a>`:''}</span>`:none('일정 미연결'));
  const refs=(it.refs||[]).map(id=>item(id)).filter(x=>x&&ITEMS.includes(x)&&isLive(x));
  const L=[V('사업명',h.projV),V('예상 기한'+schInfo('dates'),dates+(it.st==='done'?'':schWhyMark(schDdayHtml(end,false,schLateWhyItem(it)),E,'pick'))),
    V('실제 기한',!E&&!it.actualStart&&!it.actualFinish?none('-'):`<span class="sch-pair">${f('actualStart',it.actualStart?schD(it.actualStart):ph('시작일'),'실제 시작일')}${ms?'':arrow+f('actualFinish',it.actualFinish?schDto(it.actualStart,it.actualFinish):ph('완료일'),'실제 완료일')}</span>`),
    ...(it.why?[V('지연 사유',f('why',`<span class="plain wrap">${esc(it.why)}</span>`,'지연 사유'),'wide')]:[]),
    V('개발 단계',stage),V('마일스톤',f('ms',`<span class="plain">${ms?'<i class="sch-ms" style="margin:0 7px 1px 1px"></i>예':'아니오'}</span>`,'마일스톤 여부')),
    V('참고 자료',`<span class="chips sl-refs">${refs.map(x=>`<span class="sl-ref">${chipFull(x)}${E?`<button data-pick="unref" data-k="${esc(x.id)}" title="연결 해제">${svg('i-x',7,7)}</button>`:''}</span>`).join('')}${E?'<span class="chip add" data-pick="addref">+ 미팅 · 리서치 연결</span>':(refs.length?'':none('없음'))}</span>`)];
  const R=[V('담당자',`<span class="people" ${h.pk('people')}>${h.who(it.people)}</span>`),V('상태'+schInfo('status'),f('stx',schStIcon(schItemSt(it)),'상태 변경')),V('중요도',f('pri',`<span class="pri pri-${it.pri||'mid'}">${priTxt[it.pri||'mid']}</span>`,'중요도 변경')),V('URL',urlField(it,E,'margin-left:0'))];
  let more=''; if(SCHP.more){ const txt=(k,label)=>V(label,f(k,it[k]?`<span class="plain wrap">${esc(it[k])}</span>`:ph('입력'),label),'wide');
    more=`<div class="sp-more"><div>${V('운영개시 여유',none(g&&!t?'WBS 번호를 받으면 계산됩니다':'개발 단계를 고르면 계산됩니다'))}${V('역할',none('-'))}</div><div class="rc">${txt('criteria','완료 기준')}${txt('conditions','조건·확약')}${txt('evidence','증빙')}</div></div>`; }
  return `<div class="props sch-props act-props ${E?'ed':''}">${tabs}<div class="sp-grid"><div>${L.join('')}</div><div class="rcol">${R.join('')}</div></div><button class="sp-toggle" data-schp="more">${SCHP.more?'일정 상세 접기':'일정 상세'} ${svg('i-chev-d',8,4,SCHP.more?'transform:rotate(180deg)':'')}</button>${more}</div>`; }

// (thirty-eighth round, owner 2026-11-25: "세부사항들 수정을 누르면 팝업이 한번 더 뜨는데 이런식 말고 다른거처럼 바로 수정할수 있는 식으로")
// A meeting's place, agenda and guests are typed in place while its panel is edited: the fields `.mt-in` (data-f mplace /
// magenda / mguests, drawn by itemHtml). What is typed goes into the item when the field is left — before whatever is pressed
// next can redraw the panel — and once more through readUrl before a save. One line: Enter leaves the field, a paste comes in
// as plain text. The time is still picked from its list.
const SCH_MT_IN={mplace:'place',magenda:'agenda',mguests:'guests'};
function schMeetInRead(it,root){ if(!it||it.type!=='meeting'||!root)return; for(const el of root.querySelectorAll('.mt-in[data-f]')){ const key=SCH_MT_IN[el.dataset.f]; if(!key||!el.isContentEditable)continue;
    const v=(el.textContent||'').replace(/\s+/g,' ').trim(); if(v!==(meetParts(it)[key]||'')){ meetWrite(it,{[key]:v}); it.dirty=true; } } }
document.addEventListener('focusout',e=>{ const el=e.target&&e.target.closest&&e.target.closest('.mt-in[data-f]'); if(!el)return; const pin=el.closest('#panel-pin,#item-pin'), it=pin&&item(pin.dataset.id); if(it)schMeetInRead(it,pin); });
document.addEventListener('keydown',e=>{ if(e.key!=='Enter'||e.isComposing)return; const el=e.target&&e.target.closest&&e.target.closest('.mt-in[data-f]'); if(!el)return; e.preventDefault(); el.blur(); },true);
document.addEventListener('paste',e=>{ const el=e.target&&e.target.closest&&e.target.closest('.mt-in[data-f]'); if(!el)return; e.preventDefault(); document.execCommand('insertText',false,((e.clipboardData&&e.clipboardData.getData('text/plain'))||'').replace(/\s+/g,' ')); });

// A value pressed while the panel is being edited (called first by the page's own handler of data-pick). true: taken care of here.
function schPick(el,it,k){ const again=()=>{it.dirty=true;rerenderItem(it.id);};
  const ask=(title,val,phd,done)=>{ const p=openPop(el,`<div class="hd">${esc(title)}</div><div class="msg" style="padding-top:0"><input id="pk-txt" value="${esc(val||'')}" placeholder="${esc(phd)}"><div style="display:flex;justify-content:flex-end;gap:8px;margin-top:10px"><button class="it" data-pk="cancel">취소</button><button class="it" data-pk="ok" style="background:#0f0f0f;color:#fff">확인</button></div></div>`), inp=p.querySelector('#pk-txt'); inp.focus(); inp.select();
    const ok=()=>{const v=inp.value.replace(/\s+/g,' ').trim();closePop();done(v);}; p.querySelector('[data-pk="ok"]').onclick=ok; p.querySelector('[data-pk="cancel"]').onclick=closePop; inp.addEventListener('keydown',e=>{ if(e.key==='Enter'&&!e.isComposing){e.preventDefault();ok();} }); };
  if(it.type==='meeting'){
    if(k==='mtime'){ const cur=meetParts(it).time, opts=[]; for(let h=7;h<=21;h++)for(const mi of [0,30])opts.push(String(h).padStart(2,'0')+':'+(mi?'30':'00'));
      const p=menuPop(el,[{t:'시간 없음',k:'none',sel:!cur,fn:()=>{meetWrite(it,{time:''});again();}},'-'].concat(opts.map(v=>({t:meetTimeTxt(v),k:v,sel:cur===v,fn:()=>{meetWrite(it,{time:v});again();}}))),{cls:'sch-colmenu mt-time'}); const s=p.querySelector('.it.sel'); if(s)s.scrollIntoView({block:'center'}); return true; }
    return false; }
  if(it.type==='research'&&k==='cats'){ schCatsPick(el,it); return true; }
  if(it.type==='research'&&k==='uncat'){ const l=schResCats(it).filter(x=>x!==el.dataset.k); if(l.length)it.cats=l; else delete it.cats; it.dirty=true; const box=$('.rc-tags',pinOf(it)); if(box)box.outerHTML=schCatsField(it,true); return true; }
  if(it.type!=='action'||schOwn(it))return false;
  if(k==='criteria'||k==='conditions'||k==='evidence'){ const lb={criteria:'완료 기준',conditions:'조건·확약',evidence:'증빙'}[k]; askInput(lb,it[k]||'',v=>{ v=(v||'').trim(); if(v)it[k]=v; else delete it[k]; again(); }); return true; }
  if(k==='stx'){ menuPop(el,SCH_STATUSES.map((s,i)=>({t:s,html:schStIcon(s),k:'s'+i,sel:schItemSt(it)===s,fn:()=>{ if(s==='완료'){it.st='done';delete it.stx;} else{it.st='prog';if(s==='진행')delete it.stx;else it.stx=s;} again(); }})),{cls:'sch-colmenu'}); return true; }
  if(k==='why'){ ask('지연 사유',it.why||'','예: 발주처 회신 지연',v=>{ if(v)it.why=v; else delete it.why; again(); }); return true; }
  if(k==='ms'){ menuPop(el,[{t:'아니오 (기간이 있는 업무)',k:'n',sel:!it.ms,fn:()=>{delete it.ms;again();}},{t:'예 (하루짜리 기준점)',k:'y',ico:'<i class="sch-ms" style="margin:0 8px 1px 1px"></i>',sel:!!it.ms,fn:()=>{it.ms=true;delete it.end;if(it.actualStart)it.actualFinish=it.actualStart;again();}}]); return true; }
  if(k==='actualStart'){ datePick(el,it.actualStart||it.date||TODAY,v=>{ if(v){it.actualStart=v;if(it.ms)it.actualFinish=v;else if(it.actualFinish&&it.actualFinish<v)it.actualFinish=v;} else{delete it.actualStart;delete it.actualFinish;} again(); },{clear:'실제 시작 없음'}); return true; }
  if(k==='actualFinish'){ datePick(el,it.actualFinish||TODAY,v=>{ if(v){it.actualFinish=v;if(!it.actualStart||it.actualStart>v)it.actualStart=v;} else delete it.actualFinish; again(); },{min:it.actualStart||undefined,clear:'실제 완료 없음'}); return true; }
  if(k==='unref'){ it.refs=(it.refs||[]).filter(x=>x!==el.dataset.k); if(!it.refs.length)delete it.refs; again(); return true; }
  if(k==='addref'){ const cur=it.refs||[], all=ITEMS.filter(i=>(i.type==='meeting'||i.type==='research')&&isLive(i)&&!cur.includes(i.id)).sort(newestFirst), short=x=>{x=oneLine(x)||'제목 없음';return x.length>38?x.slice(0,38)+'…':x;};
    const p=openPop(el,`<div style="padding:6px 6px 4px"><input id="sch-rf-q" placeholder="미팅 · 리서치 검색"></div><div class="hd">미팅 · 리서치 연결</div><div class="sch-tm"></div>`,{cls:'link'}), box=p.querySelector('.sch-tm'), inp=p.querySelector('#sch-rf-q');
    const draw=()=>{const q=inp.value.trim();box.innerHTML=all.filter(i=>!q||matchQ(q,i.title)).slice(0,60).map(i=>`<div class="it" data-r="${esc(i.id)}"><b style="font-weight:600;min-width:46px;color:#8e8e8e">${i.type==='meeting'?'미팅':'리서치'}</b>${esc(short(i.title))}</div>`).join('')||'<div class="msg">맞는 자료가 없습니다.</div>';};
    draw(); inp.oninput=draw; inp.focus(); p.addEventListener('click',e=>{const x=e.target.closest('.it[data-r]');if(!x)return;e.stopPropagation();closePop();it.refs=cur.concat(x.dataset.r);again();}); return true; }
  return false; }
