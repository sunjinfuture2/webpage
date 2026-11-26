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
    return {phase:'',title:'액션 일정',today:schToday(),op:m.res.operationDate||'',rows}; }
  const g=m.phases.find(x=>x.code===code); if(!g||!g.tasks.length)return null;
  for(const t of g.tasks){ const x=res(t); if(!x)continue;
    rows.push({k:t.kind==='milestone'?'ms':'t',label:`${schNo(t)}) ${t.name}`,s:x.start,e:x.finish,tone:P.isDone(t)?'done':schLate(m,t)?'late':x.criticality==='critical'?'cp':''}); }
  const pr=schProgress(m,g.tasks); return {phase:g.code,title:schPhaseLabel(g),n:g.tasks.length,pct:schPct(pr),today:schToday(),op:'',rows}; }
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
    else if(it.t==='l'){ c.save(); c.strokeStyle='#'+it.c; c.lineWidth=Math.max(1,it.pt/72*k); if(it.dash)c.setLineDash([0.04*k,0.03*k]); c.beginPath(); c.moveTo(it.x1*k,it.y1*k); c.lineTo(it.x2*k,it.y2*k); c.stroke(); c.restore(); }
    else if(it.t==='d'){ const h=it.s/2*k; c.beginPath(); c.moveTo(it.cx*k,it.cy*k-h); c.lineTo(it.cx*k+h,it.cy*k); c.lineTo(it.cx*k,it.cy*k+h); c.lineTo(it.cx*k-h,it.cy*k); c.closePath(); c.fillStyle='#'+it.fill; c.fill(); if(it.line){ c.strokeStyle='#'+it.line.c; c.lineWidth=it.line.pt/72*k; c.stroke(); } }
    else if(it.t==='x'){ c.font=`${WT[it.wt]||400} ${it.pt/72*k}px Pretendard,'Malgun Gothic',sans-serif`; c.fillStyle='#'+it.c; c.textBaseline=it.va==='t'?'top':'middle'; c.textAlign=it.al==='r'?'right':it.al==='c'?'center':'left';
      const x=it.al==='r'?(it.x+it.w)*k:it.al==='c'?(it.x+it.w/2)*k:it.x*k, y=it.va==='t'?it.y*k:(it.y+it.h/2)*k; c.fillText(it.s,x,y); } }
  return cv.toDataURL('image/png'); }
// a chart block as Word and the print window take it: the whole width of the sheet (SCH_DOC.text), as tall as its rows want
function schXGanttSrc(b){ if(b.src)return b.src; const G=b.gantt, n=(G.rows||[]).length, ph=!G.phase, W=SCH_DOC.text/1440, H=Math.min(9.2,0.9+n*(ph?0.32:0.2));
  const lay=schXGanttLayout(G,W,H,{rowMax:ph?0.32:0.2}); b.src=schXGanttPng(lay,200); b.lay=lay; return b.src; }
// the same charts for the slides (schedule/pptx.ts draws the items at the content width of the template, 10.0 in)
function schXGanttPpt(b){ const G=b.gantt; b.ppt=G.phase?{full:schXGanttLayout(G,10.0,5.5)}:{sum:schXGanttLayout(G,10.0,3.05),full:schXGanttLayout(G,10.0,5.5)}; return b; }
// the picture as bytes for Word (no fetch of a data address)
function schXGanttBytes(b){ const src=schXGanttSrc(b), m=/^data:image\/png;base64,(.*)$/.exec(src); if(!m)return null; const s=atob(m[1]), u=new Uint8Array(s.length); for(let i=0;i<s.length;i++)u[i]=s.charCodeAt(i);
  return {data:u,w:Math.ceil(b.lay.w*200),h:Math.ceil(b.lay.h*200),ext:'png'}; }
