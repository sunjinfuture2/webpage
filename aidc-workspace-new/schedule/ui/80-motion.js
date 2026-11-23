// Small movements (owner, 2026-11-23: "부담스럽지 않은 수준에서"). Preview only; all of them are short (0.12 – 0.26 s), none bounces, and
// nothing moves while something is being pulled. "화면 움직임 줄이기" (html.mp-calm) and the system's own setting turn them off.
// Most parts of the page are drawn again as HTML when something changes, so a CSS transition has nothing to run on: a movement is a
// class that is put on what was just drawn (j-in, j-fade, j-tab, sg-j-*), set off by the press that caused the draw.
//  - gantt: a phase opens / closes (its rows come in, what is below slides to its place, the arrow turns); after a change of dates is
//    saved the bars slide from where they stood
//  - recent items and the notice bar open
//  - tabs: the line under the chosen tab grows from the side of the tab that was left, what the tab shows fades in
//  - menus, small windows, the member card, tips come down a little; a window that asks (relation, dates, delete) grows a little
//  - the calendar moves the way the month goes; light <-> dark crosses over
const schCalm=()=>(typeof myPref==='function'&&!!myPref('calm'))||!!(window.matchMedia&&matchMedia('(prefers-reduced-motion: reduce)').matches);
const schJ=(el,cls,ms)=>{ if(!el)return; el.classList.remove(cls); void el.offsetWidth; el.classList.add(cls); setTimeout(()=>{ if(el.isConnected)el.classList.remove(cls); },ms||320); };

/* ---------- gantt: a phase opens and closes ---------- */
function schFoldParts(code){ const h=$('#sch-gantt .sg-scroll'), row=h&&[...h.querySelectorAll('.sg-left > .sg-row.ph')].find(r=>r.dataset.k===code); if(!row)return null;
  // its rows: from the first task row below it to the next phase (the rows are placed by `top`; a phase row is a little higher than the step to its first task)
  const top=parseFloat(row.style.top), tops=q=>[...h.querySelectorAll(q)].map(r=>parseFloat(r.style.top)).filter(t=>t>top+.5).sort((a,b)=>a-b), next=tops('.sg-left > .sg-row.ph, .sg-left > .sg-row.add')[0], y1=next===undefined?Infinity:next, first=tops('.sg-left > .sg-row.tk')[0];
  return {h,row,y0:first===undefined||first>=y1?y1:first,y1}; }
function schFoldEach(h,fn){ for(const box of [h.querySelector('.sg-left'),h.querySelector('.sg-right')]){ if(!box)continue; for(const el of box.children){ if(el.tagName.toLowerCase()==='svg'||el.classList.contains('now')||el.classList.contains('sg-split')||el.classList.contains('sg-band'))continue; const t=parseFloat(el.style.top); if(!isNaN(t))fn(el,t); } } }
function schFold(code){ const flip=()=>{ const i=SCHU.open.indexOf(code); if(i>=0)SCHU.open.splice(i,1); else SCHU.open.push(code); schRefresh(); };
  if(schCalm()||SCHU.tab!=='gantt'||schFold.busy){ if(!schFold.busy)flip(); return; }
  const lines=h=>h.querySelectorAll('.sg-links,.sg-dots').forEach(s=>schJ(s,'j-fade',300)), was=schFoldParts(code); if(!was){flip();return;}
  // how far what is below moves: where the next phase stood before and where it stands after
  const below=(n,d)=>{ if(!d||n.y1===Infinity)return; schFoldEach(n.h,(el,t)=>{ if(t>=n.y1-.5){ el.style.setProperty('--dy',d+'px'); el.classList.add('sg-j-shift'); } }); };
  if(!SCHU.open.includes(code)){ flip(); const g=schFoldParts(code); if(!g)return;   // opening: drawn first, then moved in
    schFoldEach(g.h,(el,t)=>{ if(t>=g.y0-.5&&t<g.y1-.5)el.classList.add('sg-j-in'); }); below(g,was.y1===Infinity?0:was.y1-g.y1); g.row.classList.add('j-open'); lines(g.h); return; }
  schFoldEach(was.h,(el,t)=>{ if(t>=was.y0-.5&&t<was.y1-.5)el.classList.add('sg-j-out'); }); was.row.classList.remove('open'); schFold.busy=true;   // closing: its rows go first, then it is drawn again and what was below comes up
  setTimeout(()=>{ schFold.busy=false; flip(); const n=schFoldParts(code); if(!n)return; below(n,was.y1===Infinity?0:was.y1-n.y1); lines(n.h); },120); }
// after a change of dates was saved: the bars slide from where they stood to where they stand now. Called by schGhostsDraw on every
// draw of the chart while the outlines show: it starts on the first draw that has the bars at their new places (G.slideAt) and, when the
// chart is drawn again before the 0.26 s are over (the save answering), goes on from where the bars were by then.
function schBarSlide(G){ if(schCalm()||!G)return; const T=260, t=G.slideAt?(Date.now()-G.slideAt)/T:0; if(t>=1)return; const host=$('#sch-gantt .sg-scroll'), right=host&&host.querySelector('.sg-right'); if(!right||!host._px||host._o===undefined)return;
  const D=AIDCSchedule.dates, px=host._px, X=d=>(D.dayNumber(d)-host._o)*px, k=1-Math.pow(1-t,3), left=Math.max(40,Math.round(T*(1-t))); let any=false;
  for(const x of G.list||[]){ const bar=right.querySelector(`.sg-bar[data-bar="${x.id}"]`); if(!bar)continue; const L=parseFloat(bar.style.left), W=parseFloat(bar.style.width); if(isNaN(L)||isNaN(W))continue; const oL=X(x.a[0]), oW=Math.max(4,X(x.a[1])+px-oL); if(Math.abs(oL-L)<1&&Math.abs(oW-W)<1)continue;
    bar.style.transition='none'; bar.style.left=(oL+(L-oL)*k)+'px'; bar.style.width=(oW+(W-oW)*k)+'px'; void bar.offsetWidth; bar.style.transition=`left ${left}ms cubic-bezier(.2,.8,.2,1),width ${left}ms cubic-bezier(.2,.8,.2,1)`; bar.style.left=L+'px'; bar.style.width=W+'px'; any=true; setTimeout(()=>{ if(bar.isConnected)bar.style.transition=''; },left+80); }
  if(any&&!G.slideAt){ G.slideAt=Date.now(); right.querySelectorAll('.sg-links,.sg-dots').forEach(s=>schJ(s,'j-fade',360)); } }   // the lines are already where they will be: they come in while the bars arrive

/* ---------- what a press sets off ---------- */
const SCH_TABS=[['#sch-actions','.sch-tabs','button','[data-sec="sch-act"]'],['#sch-lower','.sch-tabs','button','#sch-lower [data-sec="sch-low"]'],['#panel-pin','.sp-tabs','button','#panel-pin .sch-props .sp-grid, #panel-pin .sch-props .sp-links'],
  ['#item-pin','.sp-tabs','button','#item-pin .sch-props .sp-grid, #item-pin .sch-props .sp-links'],['#arch-pw','.ar-views','button','#ar-body'],['#arch-pw','.tabs','li','#ar-body .tbl.archive']];
document.addEventListener('click',e=>{ if(!schPreview()||schCalm()||!e.target.closest)return; const T=e.target;
  for(const [host,strip,kid,body] of SCH_TABS){ const s=T.closest(host+' '+strip), b=s&&T.closest(kid); if(!b||!s.contains(b)||b.classList.contains('on'))continue; const kids=[...s.querySelectorAll(kid)], was=kids.findIndex(x=>x.classList.contains('on')), to=kids.indexOf(b); if(to<0)break;
    setTimeout(()=>{ const s2=$(host+' '+strip), on=s2&&[...s2.querySelectorAll(kid)].find(x=>x.classList.contains('on')); if(!on)return;
      if(strip==='.tabs'){ const ink=s2.querySelector('.bar i'), n=kids.length; if(ink&&was>=0){ ink.style.transition='none'; ink.style.left=`calc(100%/${n}*${was})`; void ink.offsetWidth; ink.style.transition=''; ink.style.left=`calc(100%/${n}*${to})`; } }
      else { on.classList.toggle('j-r',was>to); schJ(on,'j-tab',300); }
      $$(body).forEach(x=>schJ(x,'j-fade',300)); },0); break; }
  const cal=T.closest('[data-cal="prev"],[data-cal="next"]'); if(cal){ const fwd=cal.dataset.cal==='next'; setTimeout(()=>schJ($('.page.on .cal .rows'),fwd?'j-cal-n':'j-cal-p',300),0); }
  const rec=T.closest('#sb-recent [data-rec]'); if(rec&&rec.getAttribute('aria-expanded')==='false'){ const k=rec.dataset.rec; setTimeout(()=>{ const row=[...document.querySelectorAll('#sb-recent [data-rec]')].find(x=>x.dataset.rec===k); for(let n=row&&row.nextElementSibling;n&&n.classList.contains('r2');n=n.nextElementSibling)schJ(n,'j-in',300); },0); }
  if(T.closest('#notice .head'))setTimeout(()=>{ const n=$('#notice'); if(n&&n.classList.contains('open'))schJ(n.querySelector('.list'),'j-in',300); },0);
},true);

/* ---------- what appears: menus, windows that ask, the member card, tips ---------- */
{ const kind=n=>['pop','dlg','ucard','sch-daypop','sch-tip'].find(c=>n.classList&&n.classList.contains(c)), gone={};
  new MutationObserver(list=>{ if(!schPreview()||schCalm())return; for(const m of list){ for(const n of m.removedNodes){ const k=n.nodeType===1&&kind(n); if(k)gone[k]=Date.now(); }
      for(const n of m.addedNodes){ const k=n.nodeType===1&&kind(n); if(k&&Date.now()-(gone[k]||0)>90)n.classList.add('j-in'); } } }).observe(document.body,{childList:true}); }   // drawn again in place (a menu after a choice): not again
