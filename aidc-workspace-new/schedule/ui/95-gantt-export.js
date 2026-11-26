/* ---------- the schedule as a chart in the exports (forty-ninth round) ---------- */
// Owner, 2026-11-26: "ppt나 워드로 내보내기 했을떄 액션 일정 내보내기 하면 그래프도 같이 위에 나오게 해줘 디자인은 내가첨부한 가이드
// 대로 해서. 풀버전으로 하면 각 단계별로 그래프가 1장씩, 그 사이에 리스트가 나오는 형태". The chart is the gantt of the page (a bar
// per phase, the milestones under it, today as a line) drawn in the company template's manner: one typeface in its weights, grey
// bands for the years, 0.5pt lines, the signature orange only for what needs looking at (late work, today).
//   · schXGanttData(m, code)   what is drawn: the phases ('' = all of them), or the tasks of one phase
//   · schXGanttLayout(G, W, H) where it is drawn: a list of rectangles, lines, diamonds and texts in inches. ONE layout for every
//                              file: the PPT module draws the items as shapes (schedule/pptx.ts ganttDraw), Word and the print
//                              window get a picture of them (schXGanttPng). Change the look here, never in one of the files only.
const SCHG={bar:'404040',cp:'C00000',late:'F58220',done:'BFBFBF',grid:'E7E6E6',grid2:'BFBFBF',band:'F2F2F2',sub:'595959',ink:'262626',line:'0D0D0D',or:'F58220'};
const schGem=t=>{ let n=0; for(const c of String(t==null?'':t)){ const u=c.codePointAt(0)||0; n+=u>0x2e80?0.92:c===' '?0.28:/[.,:;·'()\[\]|\/!\-]/.test(c)?0.33:/[A-Z0-9%$~+=]/.test(c)?0.6:0.52; } return n; };
const schGw=(t,pt)=>schGem(t)*pt/72*1.04;   // inches a text takes at `pt`
const schGfit=(t,pt,w)=>{ t=String(t==null?'':t); if(schGw(t,pt)<=w)return t; while(t.length>1&&schGw(t+'…',pt)>w)t=t.slice(0,-1); return t+'…'; };
const schGday=(d,year)=>d?(year?d.slice(2):d.slice(5)).replace(/-/g,'.'):'';
function schXGanttData(m,code){ const P=AIDCSchedule.progress, res=t=>m.res.tasks[t.id], rows=[];
  const span=ts=>{ let a='9999',z=''; for(const t of ts){ const x=res(t); if(!x)continue; if(x.start<a)a=x.start; if(x.finish>z)z=x.finish; } return [a,z]; };
  if(!code){ for(const g of m.phases){ if(!g.tasks.length)continue; const [a,z]=span(g.tasks), pr=schProgress(m,g.tasks);
      rows.push({k:'ph',label:schPhaseLabel(g),n:g.tasks.length,pct:schPct(pr),s:a,e:z,ms:g.tasks.filter(t=>t.kind==='milestone').map(t=>res(t).start),late:g.tasks.filter(t=>schLate(m,t)).length}); }
    return {phase:'',title:'액션 일정',today:schToday(),sd:m.plan.statusDate||'',op:m.res.operationDate||'',rows}; }
  const g=m.phases.find(x=>x.code===code); if(!g||!g.tasks.length)return null;
  for(const t of g.tasks){ const x=res(t); if(!x)continue;
    rows.push({k:t.kind==='milestone'?'ms':'t',label:`${schNo(t)}) ${t.name}`,no:schNo(t),name:t.name,s:x.start,e:x.finish,tone:P.isDone(t)?'done':schLate(m,t)?'late':x.criticality==='critical'?'cp':''}); }
  const pr=schProgress(m,g.tasks); return {phase:g.code,title:schPhaseLabel(g),n:g.tasks.length,pct:schPct(pr),today:schToday(),sd:m.plan.statusDate||'',op:'',rows}; }
// W x H inches; o.rowMax caps a row's height. Returns {w, h (what was used), items}.
function schXGanttLayout(G,W,H,o={}){ const items=[], R=(G&&G.rows)||[], C=SCHG; if(!R.length)return {w:W,h:0,items};
  const isPh=!G.phase, T=d=>Date.parse(d+'T00:00:00Z'), mStart=d=>d.slice(0,8)+'01', addM=(d,k)=>{ const t=new Date(T(d)); t.setUTCMonth(t.getUTCMonth()+k); return t.toISOString().slice(0,10); };
  const first=R.map(r=>r.s).sort()[0], last=R.map(r=>r.e).sort().pop(), d0=mStart(first); let d1=addM(mStart(last),1);
  if(isPh&&G.op){ const c=addM(mStart(G.op),7); if(c<d1)d1=c; }      // the phase that runs years past the opening is cut there
  if(d1>addM(d0,48))d1=addM(d0,48);
  const t0=T(d0), t1=T(d1), labW=o.labW||Math.min(isPh?2.7:3.1,W*(isPh?0.29:0.34)), X0=labW+0.14, X1=W-0.06, X=d=>X0+(Math.min(Math.max(T(d),t0),t1)-t0)/(t1-t0)*(X1-X0);
  const topH=0.18, yrH=0.2, moH=0.19, y0=topH+yrH+moH+0.05, legH=0.26, n=R.length, rh=Math.max(0.05,Math.min(o.rowMax||(isPh?0.44:0.3),(H-y0-legH)/n)), yEnd=y0+rh*n;
  const rect=(x,y,w,h,fill,line)=>items.push({t:'r',x,y,w,h,fill,line}), ln=(x1,y1,x2,y2,c,pt,dash)=>items.push({t:'l',x1,y1,x2,y2,c,pt,dash:!!dash}), dia=(cx,cy,s,fill,line)=>items.push({t:'d',cx,cy,s,fill,line}), text=(s,x,y,w,h,pt,wt,c,al,va)=>items.push({t:'x',s,x,y,w,h,pt,wt,c,al:al||'l',va:va||'m'});
  // years as grey bands, the months under them (every month a faint line; a label every few months when they are close)
  for(let yy=+d0.slice(0,4); yy<=+d1.slice(0,4); yy++){ const a=[`${yy}-01-01`,d0].sort()[1], b=[`${yy+1}-01-01`,d1].sort()[0]; if(a>=b)continue; const xa=X(a), xb=X(b);
    rect(xa+0.008,topH,Math.max(0.01,xb-xa-0.016),yrH,C.band); if(xb-xa>0.34)text(String(yy),xa,topH,xb-xa,yrH,8,5,C.ink,'c'); }
  const months=Math.round((t1-t0)/864e5/30.44), mw=(X1-X0)/Math.max(1,months), step=[1,2,3,6,12].find(k=>mw*k>=0.2)||12;
  let i=0; for(let d=d0; d<d1; d=addM(d,1),i++){ const x=X(d), jan=d.slice(5,7)==='01';
    if(i&&(jan||mw>=0.045))ln(x,y0,x,yEnd,jan?C.grid2:C.grid,0.5);
    if(i%step===0&&x+0.05<X1)text(String(+d.slice(5,7)),x+0.02,topH+yrH,Math.min(mw*step,0.4),moH,6.5,4,C.sub,'l'); }
  ln(0,y0-0.02,W,y0-0.02,C.line,0.5); ln(0,yEnd,W,yEnd,C.line,0.5);
  let cut=false;
  R.forEach((r,ri)=>{ const y=y0+ri*rh, cy=y+rh/2;
    if(ri&&rh>=0.13)ln(0,y,W,y,C.grid,0.5);
    if(r.k==='ph'){ const pt=Math.max(7,Math.min(10.5,rh*72*0.36)), meta=`(${r.n})`, pw=0.42, room=labW-pw-0.42-schGw(meta,pt-1.5)-0.06, nm=schGfit(r.label,pt,room), nw=schGw(nm,pt);
      text(nm,0,y,nw+0.04,rh,pt,7,C.ink,'l'); text(meta,nw+0.06,y,schGw(meta,pt-1.5)+0.05,rh,pt-1.5,4,C.sub,'l');
      const bx=labW-pw-0.4; rect(bx,cy-0.018,pw,0.036,C.grid); if(r.pct>0)rect(bx,cy-0.018,Math.max(0.01,pw*Math.min(1,r.pct/100)),0.036,C.or); text(r.pct+'%',bx+pw+0.04,y,0.36,rh,pt-2,5,r.pct>0?C.or:C.sub,'l');
      const bh=Math.min(0.15,rh*0.32), hasMs=r.ms.length>0, by=cy-bh/2-(hasMs?Math.min(0.07,rh*0.13):0), xa=X(r.s), over=r.e>=d1, xb=over?X1:X(addM(r.e,0))+0.004;
      cut=cut||over; rect(xa,by,Math.max(0.03,xb-xa),bh,C.bar);
      const lab=(over?'→ ':'')+schGday(r.e,true), lpt=Math.max(5.5,Math.min(7.5,bh*72*0.62)), lw=schGw(lab,lpt)+0.08;
      if(xb-xa>lw+0.04)text(lab,xb-lw,by,lw-0.04,bh,lpt,5,'FFFFFF','r'); else if(xb+lw+0.02<X1)text(lab,xb+0.04,by,lw,bh,lpt,4,C.sub,'l'); else text(lab,xa-lw-0.04,by,lw,bh,lpt,4,C.sub,'r');
      const ds=Math.min(0.1,rh*0.24); if(hasMs){ const my=by+bh+ds/2+0.025; for(const d of r.ms)if(d>=d0&&d<d1)dia(X(d),my,ds,'FFFFFF',{c:C.bar,pt:0.75}); } }
    else { const pt=Math.max(4.5,Math.min(8.5,rh*72*0.5)); text(schGfit(r.label,pt,labW-0.04),0,y,labW-0.02,rh,pt,4,r.tone==='done'?C.sub:C.ink,'l');
      const col=r.tone==='done'?C.done:r.tone==='late'?C.late:r.tone==='cp'?C.cp:C.bar;
      if(r.k==='ms'){ const s=Math.max(0.05,Math.min(0.13,rh*0.62)); if(r.s>=d0&&r.s<d1)dia(X(r.s),cy,s,col); if(rh>=0.12&&X(r.s)+0.5<X1)text(schGday(r.s,true),X(r.s)+s/2+0.04,y,0.6,rh,Math.max(5,pt-1.5),4,C.sub,'l'); }
      else { const bh=Math.max(0.025,Math.min(0.12,rh*0.42)), xa=X(r.s), over=r.e>=d1, xb=over?X1:X(r.e)+Math.max(0.004,(X1-X0)/((t1-t0)/864e5)); cut=cut||over;
        rect(xa,cy-bh/2,Math.max(0.02,xb-xa),bh,col);
        if(rh>=0.12){ const lab=(over?'→ ':'')+schGday(r.e,true), lpt=Math.max(5,pt-1.5), lw=schGw(lab,lpt)+0.06; if(xb+lw+0.04<X1)text(lab,xb+0.04,y,lw,rh,lpt,4,C.sub,'l'); else if(xa-lw-0.04>X0)text(lab,xa-lw-0.04,y,lw,rh,lpt,4,C.sub,'r'); } } } });
  // today, and on the chart of all phases the opening: dashed lines with their words above the years
  const mark=(d,c,label,right)=>{ if(!d||d<d0||d>=d1)return; const x=X(d); ln(x,topH+yrH,x,yEnd,c,0.75,true); const w=schGw(label,6.5)+0.08; text(label,right?x+0.03:x-w-0.03,0,w,topH,6.5,6,c,right?'l':'r'); };
  if(isPh&&G.op)mark(G.op,C.sub,'운영개시 예상 '+schGday(G.op,true),G.today&&G.op<G.today);
  mark(G.today,C.or,'오늘 '+schGday(G.today,false),!(isPh&&G.op&&G.op<G.today));
  // the legend
  let lx=0; const ly=yEnd+0.08, lh=0.15, key=(draw,label)=>{ draw(lx,ly+lh/2); lx+=0.2; const w=schGw(label,6.5)+0.04; text(label,lx,ly,w,lh,6.5,4,C.sub,'l'); lx+=w+0.16; };
  const sw=(c)=>(x,cy)=>rect(x,cy-0.035,0.15,0.07,c);
  if(isPh){ key(sw(C.bar),'단계 기간'); key((x,cy)=>dia(x+0.07,cy,0.09,'FFFFFF',{c:C.bar,pt:0.75}),'마일스톤'); }
  else { key(sw(C.bar),'진행·예정'); key(sw(C.cp),'CP (운영개시 경로)'); key(sw(C.late),'지연'); key(sw(C.done),'완료'); key((x,cy)=>dia(x+0.07,cy,0.1,C.bar),'마일스톤'); }
  key((x,cy)=>ln(x+0.07,cy-0.07,x+0.07,cy+0.07,C.or,0.75,true),'오늘'); if(isPh&&G.op)key((x,cy)=>ln(x+0.07,cy-0.07,x+0.07,cy+0.07,C.sub,0.75,true),'운영개시 예상');
  if(cut)text(`→ 표시 범위(${d0.slice(0,7).replace('-','.')} ~ ${addM(d1,-1).slice(0,7).replace('-','.')}) 뒤로 이어짐`,lx,ly,Math.max(0.5,W-lx),lh,6.5,4,C.sub,'r');
  return {w:W,h:ly+lh+0.02,items}; }
// the layout as a picture (Word and the print window): Pretendard stands in for the template's typeface
function schXGanttPng(lay,dpi=200){ const k=dpi, cv=document.createElement('canvas'); cv.width=Math.ceil(lay.w*k); cv.height=Math.ceil(lay.h*k); const c=cv.getContext('2d');
  c.fillStyle='#fff'; c.fillRect(0,0,cv.width,cv.height); const WT={3:300,4:400,5:500,6:600,7:700};
  for(const it of lay.items){
    if(it.t==='r'){ c.fillStyle='#'+it.fill; c.fillRect(it.x*k,it.y*k,it.w*k,it.h*k); if(it.line){ c.strokeStyle='#'+it.line.c; c.lineWidth=it.line.pt/72*k; c.strokeRect(it.x*k,it.y*k,it.w*k,it.h*k); } }
    else if(it.t==='l'){ c.save(); c.strokeStyle='#'+it.c; c.lineWidth=Math.max(1,it.pt/72*k); if(it.dash)c.setLineDash((it.dp||[0.04,0.03]).map(v=>v*k)); c.beginPath(); c.moveTo(it.x1*k,it.y1*k); c.lineTo(it.x2*k,it.y2*k); c.stroke(); c.restore(); }
    else if(it.t==='d'){ const h=it.s/2*k; c.beginPath(); c.moveTo(it.cx*k,it.cy*k-h); c.lineTo(it.cx*k+h,it.cy*k); c.lineTo(it.cx*k,it.cy*k+h); c.lineTo(it.cx*k-h,it.cy*k); c.closePath(); c.fillStyle='#'+it.fill; c.fill(); if(it.line){ c.strokeStyle='#'+it.line.c; c.lineWidth=it.line.pt/72*k; c.stroke(); } }
    else if(it.t==='x'){ c.font=`${WT[it.wt]||400} ${it.pt/72*k}px Pretendard,'Malgun Gothic',sans-serif`; c.fillStyle='#'+it.c; c.textBaseline=it.va==='t'?'top':'middle'; c.textAlign=it.al==='r'?'right':it.al==='c'?'center':'left';
      const x=it.al==='r'?(it.x+it.w)*k:it.al==='c'?(it.x+it.w/2)*k:it.x*k, y=it.va==='t'?it.y*k:(it.y+it.h/2)*k; c.fillText(it.s,x,y); } }
  return cv.toDataURL('image/png'); }
// a chart block as Word and the print window take it (fiftieth round): the Word guide's chart (schXGanttDocLay below) across the
// width of the sheet's tables (SCH_DOC.w), as tall as its rows want, drawn at the guide's 320 dpi
function schXGanttSrc(b){ if(b.src)return b.src; const lay=schXGanttDocLay(b.gantt,SCH_DOC.w/1440); b.src=schXGanttPng(lay,320); b.lay=lay; return b.src; }
// the same charts for the slides (schedule/pptx.ts draws the items at the content width of the template, 10.0 in)
function schXGanttPpt(b){ const G=b.gantt; b.ppt=G.phase?{full:schXGanttLayout(G,10.0,5.5)}:{sum:schXGanttLayout(G,10.0,3.05),full:schXGanttLayout(G,10.0,5.5)}; return b; }
// the picture as bytes for Word (no fetch of a data address)
function schXGanttBytes(b){ const src=schXGanttSrc(b), m=/^data:image\/png;base64,(.*)$/.exec(src); if(!m)return null; const s=atob(m[1]), u=new Uint8Array(s.length); for(let i=0;i<s.length;i++)u[i]=s.charCodeAt(i);
  return {data:u,w:Math.ceil(b.lay.w*320),h:Math.ceil(b.lay.h*320),ext:'png'}; }

/* ---------- the chart of the Word guide (fiftieth round) ---------- */
// Owner, 2026-11-26: "내가 보내주는 파일들이 내보내기 할때 표준 가이드가 되는것들이야. 이것들을 기본가이드로 등록하고 써." The Word
// guide (요약 / 액션 일정 FULL) draws the schedule otherwise than the slides do, and each file keeps to its own guide: the PPT
// to the PPT guide (schXGanttLayout above, unchanged), Word and the print window to the Word guide (this one). Measured from the
// guide's pictures (2200 px wide at 320 dpi = the 9889 twips of the sheet's tables):
//   · 전체 단계 간트 (요약): 개발 단계 | 진행률 | 예상 일정; a row 0.256 in; a dark bar (494949) with its end date in white at its
//     end, the milestones as open diamonds under it; quarters on the axis (the first month and January as yy.mm, the others
//     "N월"); the date of the schedule (일정 기준일) a green dashed line; a phase that ends years after the others is drawn into a
//     short piece at the right, the years between left out ("// … 축 생략").
//   · 상세 간트 (FULL, a phase): WBS / 업무 | 예상 일정; months on the axis; a thin grey bar (777777) per task, a milestone an open
//     diamond; rows 0.334 in down to 0.197 in; more than 34 tasks stand in two columns side by side ("왼쪽 열에서 오른쪽 열 순서로").
// widths measured in the typeface the picture is drawn in (the slides keep schGw: PowerPoint lays their text out itself)
let schGcv=null; const schGmw=(t,pt,wt)=>{ try{ schGcv=schGcv||document.createElement('canvas').getContext('2d'); schGcv.font=`${({4:400,5:500,6:600,7:700})[wt]||400} ${pt*10}px Pretendard,'Malgun Gothic',sans-serif`; return schGcv.measureText(String(t==null?'':t)).width/720; }catch(e){ return schGw(t,pt); } };
const schGmfit=(t,pt,wt,w)=>{ t=String(t==null?'':t); if(schGmw(t,pt,wt)<=w)return t; while(t.length>1&&schGmw(t+'…',pt,wt)>w)t=t.slice(0,-1); return t+'…'; };
const SCHW={ink:'222222',lab:'333333',wbs:'272727',sub:'555555',mute:'666666',bar:'494949',tbar:'777777',ms:'4A4A4A',grid:'DEDEDE',row:'DDDDDD',axis:'777777',sd:'55934F',track:'EEEEEE',up:'1F8E00',div:'BCBCBC'};
function schXGanttDocLay(G,W){ const items=[], R=((G&&G.rows)||[]).filter(r=>r.s||r.e), C=SCHW; if(!R.length)return {w:W,h:0,items};
  const isPh=!G.phase, T=d=>Date.parse(d+'T00:00:00Z'), mStart=d=>d.slice(0,8)+'01', addM=(d,k)=>{ const t=new Date(T(d)); t.setUTCMonth(t.getUTCMonth()+k); return t.toISOString().slice(0,10); };
  const rect=(x,y,w,h,fill,line)=>items.push({t:'r',x,y,w,h,fill,line}), ln=(x1,y1,x2,y2,c,pt,dash,dp)=>items.push({t:'l',x1,y1,x2,y2,c,pt,dash:!!dash,dp}), dia=(cx,cy,s,fill,line)=>items.push({t:'d',cx,cy,s,fill,line}), text=(s,x,y,w,h,pt,wt,c,al,va)=>items.push({t:'x',s,x,y,w,h,pt,wt,c,al:al||'l',va:va||'m'});
  const day=d=>d?d.slice(2).replace(/-/g,'.'):'', dot=d=>d?d.replace(/-/g,'.'):'', ym=d=>d.slice(2,7).replace('-','.');
  // the range: the first start's month to the month after the last end; on the chart of the phases one phase that ends 18 months
  // or more after the next latest gets a short piece of its own at the right, the time between left out
  const starts=R.map(r=>r.s||r.e).sort(), ends=R.map(r=>r.e||r.s).sort(), d0=mStart(starts[0]); let d1=addM(mStart(ends[ends.length-1]),1), tail=null;
  if(isPh&&ends.length>1){ const lim=addM(mStart(ends[ends.length-2]),1), late=mStart(ends[ends.length-1]); if(addM(lim,18)<=late&&late>d0){ tail={a:late,b:addM(late,1),gap:[lim,addM(late,-1)]}; d1=lim; } }
  const split=!isPh&&R.length>34, k=split?Math.ceil(R.length/2):R.length;
  const rowH=isPh?0.256:split?(k<=40?0.2125:Math.max(0.12,8.5/k)):Math.max(0.197,Math.min(0.334,6.0/k)), pt=isPh?8:rowH>=0.3?8.5:rowH>=0.2?7.5:rowH>=0.16?7:6.5;
  const yAx=0.37, yEnd=yAx+rowH*k, half=split?W/2-0.09:W;
  // one chart: its axis, rows and bars between ox and ox+half
  const chart=(ox,rows)=>{ const X0=ox+(isPh?1.86:split?1.62:2.94), XE=ox+half, tw=tail?0.72:0, gw=tail?0.17:0, X1=XE-tw-gw, t0=T(d0), t1=T(d1);
    const X=d=>{ if(tail&&d>=tail.a)return XE-tw+(Math.min(T(d),T(tail.b))-T(tail.a))/(T(tail.b)-T(tail.a))*tw; if(tail&&d>=d1)return X1+gw/2; return X0+(Math.min(Math.max(T(d),t0),t1)-t0)/(t1-t0)*(X1-X0); };
    // the head: what the columns hold
    if(isPh){ text('개발 단계',ox+0.02,0.02,1.2,0.19,7.5,7,C.ink); text('진행률',ox+1.344,0.02,0.5,0.19,7.5,7,C.ink); }
    else { text('WBS / 업무',ox+0.0125,0.017,1.6,0.19,7,7,C.ink); }
    text('예상 일정',X0,isPh?0.02:0.017,1.2,0.19,isPh?7.5:7,7,C.ink);
    // the axis: the months (or every third / sixth / twelfth), the first and January as yy.mm, the others N월
    const months=Math.max(1,Math.round((t1-t0)/864e5/30.44)), mw=(X1-X0)/months, step=[1,3,6,12].find(s=>mw*s>=0.3)||12;
    let lastX=-9; const tick=(x,label)=>{ ln(x,yAx,x,yEnd,C.grid,0.5); if(label&&x-lastX>=0.2&&x+0.12<XE){ text(label,x+0.012,yAx-0.19,0.5,0.17,6,4,C.sub); lastX=x; } };
    tick(X0,ym(d0)); for(let d=addM(d0,1); d<d1; d=addM(d,1)){ const mo=+d.slice(5,7); if((mo-1)%step)continue; tick(X(d),mo===1?ym(d):mo+'월'); }
    if(tail){ tick(XE-tw,ym(tail.a)); text('//',X1,yAx-0.19,gw,0.17,6,4,C.sub,'c'); }
    ln(X0,yAx,XE,yAx,C.axis,0.5);
    rows.forEach((r,i)=>{ const y=yAx+i*rowH, cy=y+rowH/2; ln(ox,y+rowH,XE,y+rowH,C.row,0.25);
      if(isPh){ text(`${r.label} (${r.n})`,ox+0.02,y,1.3,rowH,pt,6,C.lab);
        const tx0=ox+1.344, tw0=0.19; rect(tx0,cy-0.0063,tw0,0.0125,C.track); if(r.pct>0)rect(tx0,cy-0.0063,Math.max(0.006,tw0*Math.min(1,r.pct/100)),0.0125,C.up);
        text(r.pct+'%',ox+1.5625,y,0.3,rowH,7,r.pct>0?6:4,r.pct>0?C.up:C.mute);
        const by=y+0.06, bh=0.0875, xa=X(r.s||r.e), xb=Math.max(xa+0.03,X(r.e||r.s)+0.004); rect(xa,by,xb-xa,bh,C.bar);
        if(tail&&(r.s||r.e)<d1&&(r.e||'')>=tail.a)for(const dx of [-0.018,0.012])ln(X1+gw/2+dx-0.012,by+bh+0.012,X1+gw/2+dx+0.012,by-0.012,'FFFFFF',1.6);
        const lab=day(r.e), lw=schGmw(lab,6,6); if(xb-xa>=lw+0.07)text(lab,xb-lw-0.035,by,lw+0.01,bh,6,6,'FFFFFF','r'); else if(xb+lw+0.06<XE)text(lab,xb+0.03,by,lw+0.02,bh,6,5,C.bar); else text(lab,xa-lw-0.05,by,lw+0.02,bh,6,5,C.bar,'r');
        for(const d of r.ms||[])if(d>=d0&&(d<d1||(tail&&d>=tail.a&&d<tail.b)))dia(X(d),y+0.19,0.05,'FFFFFF',{c:C.ms,pt:0.75}); }
      else { const nx=ox+(split?0.31:0.37), room=X0-nx-0.08; text(String(r.no||''),ox+0.0125,y,nx-ox-0.02,rowH,pt,7,C.wbs); text(schGmfit(r.name||r.label,pt,4,room),nx,y,room+0.04,rowH,pt,4,C.lab);
        if(r.k==='ms'||!r.s){ const d=r.s||r.e; if(r.k==='ms')dia(X(d),cy,Math.min(0.06,rowH*0.5),'FFFFFF',{c:C.ms,pt:0.75}); else { const x=X(d); rect(x,cy-0.03,0.008,0.06,C.ink); text('예상 완료',x+0.02,y,0.5,rowH,5.5,4,C.sub); } }
        else { const xa=X(r.s), xb=Math.max(xa+0.02,X(r.e)+Math.max(0.003,(X1-X0)/((t1-t0)/864e5))); rect(xa,cy-0.022,xb-xa,0.044,C.tbar); } } });
    // the date the schedule stands at: a green dashed line
    if(G.sd&&G.sd>=d0&&G.sd<d1){ const x=X(G.sd); ln(x,yAx,x,yEnd,C.sd,0.5,true,[0.02,0.012]); }
    return {sdIn:!!(G.sd&&G.sd>=d0&&G.sd<d1)}; };
  let info; if(split){ info=chart(0,R.slice(0,k)); chart(W/2+0.09,R.slice(k)); ln(W/2,0.03,W/2,yEnd,C.div,0.5); } else info=chart(0,R);
  if(tail)text(`${dot(tail.gap[0]).slice(0,7)}–${dot(tail.gap[1]).slice(0,7)} 축 생략`,W-2.4,0.02,2.4,0.19,6,4,C.mute,'r');
  // the legend under the chart
  let lx=0.01; const ly=yEnd+0.07, lh=0.17, key=(label,pre)=>{ if(pre)lx=pre(lx)||lx; const w=schGmw(label,6.5,4)+0.02; text(label,lx,ly,w,lh,6.5,4,C.sub); lx+=w+0.13; };
  const msKey=x=>{ dia(x+0.03,ly+lh/2,0.055,'FFFFFF',{c:C.ms,pt:0.75}); return x+0.085; };
  if(isPh){ key('마일스톤',msKey); if(info.sdIn)key(`녹색 점선  일정 기준일 ${dot(G.sd)}`); if(tail)key('//  시간축 생략'); return {w:W,h:ly+lh+0.03,items}; }
  key('막대  업무 기간'); key('마일스톤',msKey); if(info.sdIn)key('녹색 점선  일정 기준일'); if(R.some(r=>r.k!=='ms'&&!r.s))key('|  예상 완료일만 확인된 업무');
  text(split?'왼쪽 열에서 오른쪽 열 순서로 읽습니다. 업무 전체 이름과 날짜는 다음 목록에 기재했습니다.':'업무 전체 이름과 날짜는 다음 목록에 기재했습니다.',0,ly+lh+0.01,W,0.16,6.5,4,C.mute);
  return {w:W,h:ly+lh+0.2,items}; }
