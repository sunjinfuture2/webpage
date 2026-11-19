// 관계도: the tasks around the selected one, or a whole phase, as cards in columns.
// The picture follows the design file (page 10, measured on a 4x render): cards 271 x 128.5 in columns 89 apart and rows 33.5
// apart; a relation leaves the earlier card at the middle of its right edge (a dot), runs to a vertical line 38 to the right
// of that card and from there into the later card's left edge, with round turns and an open arrow. One card's relations
// share their start, so several later tasks read as one branching line. Only relations between neighbouring columns are
// drawn in the "selected task" view; whatever else connects the shown tasks is counted below the map.
const SN={w:271,h:128.5,gx:89,gy:33.5,trunk:38,pad:60,port:24};
function schNetShell(pid,m){ return `<div class="sch-net" id="sch-net"><div class="sn-scroll"></div><div class="sn-tools"><button class="sh-btn sn-fit" data-sch="netfit" title="전체가 보이게 맞추기 · 다시 누르면 원래 크기 (Ctrl + 휠로 확대·축소)">${svg('i-sch-fit',20,20)}</button></div><span class="sn-info"></span></div>`; }
function schNetFocus(m){ const sel=schTaskIdOf(S.panel)||SCHU.sel; if(sel&&m.byId.has(sel)&&(!SCHU.phase||SCHU.netMode==='focus'||m.byId.get(sel).phase===SCHU.phase))return sel;
  const list=schFiltered(m); const today=schToday(); const cur=list.find(t=>!AIDCSchedule.progress.isDone(t)&&m.res.tasks[t.id].finish>=today)||list[0]||m.plan.tasks[0]; return cur?cur.id:''; }
// Columns for the "selected task" view: the task in the middle, what must come before it to the left, what follows to the right.
function schNetFocusLayout(m,focus){ const depth=SCHU.netDepth, dir=SCHU.netDir, col=new Map([[focus,0]]), cols=new Map([[0,[focus]]]), edges=[];
  const walk=(next,sign)=>{ let frontier=[focus]; for(let k=1;k<=depth&&frontier.length;k++){ const found=[]; for(const id of frontier)for(const e of next(id)){ if(!e.active)continue; const o=sign>0?e.to:e.from; if(!col.has(o)){col.set(o,sign*k);found.push(o);} if(col.get(o)===sign*k)edges.push(e); } cols.set(sign*k,found); frontier=found; } };
  if(dir!=='after')walk(id=>m.pred.get(id)||[],-1); if(dir!=='before')walk(id=>m.succ.get(id)||[],1);
  return {col,cols,edges}; }
// Columns for the "whole phase" view: every task one column after the last task it waits for.
function schNetAllLayout(m,focus){ let ids=schFiltered(m).map(t=>t.id); if(SCHU.phase)ids=ids.filter(id=>m.byId.get(id).phase===SCHU.phase);
  if(ids.length>120){ // the nearest 120 to the selected task
    const dist=new Map([[focus,0]]), q=[focus]; for(let i=0;i<q.length;i++)for(const e of [...(m.pred.get(q[i])||[]),...(m.succ.get(q[i])||[])]){const o=e.from===q[i]?e.to:e.from;if(!dist.has(o)){dist.set(o,dist.get(q[i])+1);q.push(o);}}
    ids=ids.slice().sort((a,b)=>(dist.get(a)??1e9)-(dist.get(b)??1e9)||m.byId.get(a).order-m.byId.get(b).order).slice(0,120); }
  const set=new Set(ids), edges=m.plan.dependencies.filter(e=>e.active&&set.has(e.from)&&set.has(e.to)), col=new Map(), order=m.res.order.filter(id=>set.has(id));
  for(const id of order){let c=0;for(const e of m.pred.get(id)||[])if(e.active&&col.has(e.from))c=Math.max(c,col.get(e.from)+1);col.set(id,c);}
  const cols=new Map(); for(const id of order){const c=col.get(id);if(!cols.has(c))cols.set(c,[]);cols.get(c).push(id);}
  return {col,cols,edges,total:schFiltered(m).filter(t=>!SCHU.phase||t.phase===SCHU.phase).length}; }
function schNetBuild(pid){ const host=$('#sch-net .sn-scroll'); if(!host)return; const m=schModel(pid); if(!m){host.innerHTML='';return;} const A=AIDCSchedule, P=A.progress;
  const focus=schNetFocus(m), all=SCHU.netMode==='all'; if(!focus){host.innerHTML='<div class="sch-empty" style="padding-left:24px">표시할 업무가 없습니다.</div>';return;}
  const lay=all?schNetAllLayout(m,focus):schNetFocusLayout(m,focus), keys=[...lay.cols.keys()].sort((a,b)=>a-b), minC=keys[0];
  // rows: a column is ordered by where its neighbours on the side of the selected task stand, and centred on the tallest column
  const row=new Map(), by=id=>m.byId.get(id).order, colsOrdered=all?keys:[0,...keys.filter(k=>k>0),...keys.filter(k=>k<0).sort((a,b)=>b-a)];
  const maxLen=Math.max(...keys.map(k=>lay.cols.get(k).length));
  for(const k of colsOrdered){ const ids=lay.cols.get(k); const anchor=id=>{const ys=lay.edges.filter(e=>(k>0||all?e.to===id:e.from===id)).map(e=>row.get(k>0||all?e.from:e.to)).filter(v=>v!==undefined);return ys.length?ys.reduce((a,b)=>a+b,0)/ys.length:null;};
    const want=new Map(ids.map(id=>[id,anchor(id)])); ids.sort((a,b)=>((want.get(a)??1e6)-(want.get(b)??1e6))||by(a)-by(b));
    if(all){ let prev=-1; for(const id of ids){const w=want.get(id);const r=Math.max(prev+1,w===null?prev+1:Math.round(w));row.set(id,r);prev=r;} }
    else{ const off=(maxLen-ids.length)/2; ids.forEach((id,i)=>row.set(id,off+i)); } }
  const rows=[...row.values()], minR=Math.min(...rows), maxR=Math.max(...rows), px=id=>SN.pad+(lay.col.get(id)-minC)*(SN.w+SN.gx), py=id=>SN.pad+(row.get(id)-minR)*(SN.h+SN.gy);
  const LW=SN.pad*2+(keys.length-1)*(SN.w+SN.gx)+SN.w, LH=SN.pad*2+(maxR-minR)*(SN.h+SN.gy)+SN.h;
  // relations
  const z=SCHU.netZoom||1, vw=host.clientWidth/z, vh=host.clientHeight/z, W=Math.max(LW,vw), H=Math.max(LH,vh), ox=Math.round((W-LW)/2), oy=Math.round((H-LH)/2); let sv='', hot='', hidden=0;
  const starts=new Map(); // one trunk per earlier card; cards of one column that all branch get trunks a little apart
  for(const k of keys){ let n=0; for(const id of lay.cols.get(k).slice().sort((a,b)=>row.get(a)-row.get(b))){ const out=lay.edges.filter(e=>e.from===id&&lay.col.get(e.to)===k+1); if(!out.length)continue; starts.set(id,px(id)+SN.w+SN.trunk+(out.length>1||n?Math.min(n,4)*7:0)); if(out.length>1)n++; } }
  const arrow=(x,y)=>`M${x-6},${y-5.2} L${x},${y} L${x-6},${y+5.2}`;
  for(const e of lay.edges){ const ca=lay.col.get(e.from), cb=lay.col.get(e.to); if(cb!==ca+1){hidden++;continue;}
    // out of the earlier card's right edge and into the later card's left edge, both 24 below the top (the design's title line): cards of one row are joined by a straight line
    const x1=px(e.from)+SN.w, y1=py(e.from)+SN.port, x2=px(e.to)-6, same=Math.abs(py(e.to)-py(e.from))<1, y2=py(e.to)+SN.port, tx=Math.min(starts.get(e.from)||x1+SN.trunk,x2-22), s=y2>y1?1:-1, dy=Math.abs(y2-y1);
    const r1=Math.min(26,dy/2,tx-x1-4), r2=Math.min(30,dy/2,x2-tx-4);
    const d=same?`M${x1},${y1} L${x2},${y2}`:`M${x1},${y1} L${tx-r1},${y1} Q${tx},${y1} ${tx},${y1+s*r1} L${tx},${y2-s*r2} Q${tx},${y2} ${tx+r2},${y2} L${x2},${y2}`;
    const isHot=e.from===focus||e.to===focus, g=`<g class="${isHot?'hot':''}" data-a="${e.from}" data-b="${e.to}"><path d="${d}"/><path d="${arrow(x2,y2)}"/><circle cx="${x1}" cy="${y1}" r="${isHot?3:2.4}"/>${e.type!=='FS'||e.lag?`<text x="${(tx+x2)/2+4}" y="${y2-6}" text-anchor="middle">${e.type}${e.lag?(e.lag>0?' +':' ')+e.lag+'일':''}</text>`:''}</g>`;
    if(isHot)hot+=g; else sv+=g; }
  let h='';
  for(const id of row.keys()){ const t=m.byId.get(id), x=m.res.tasks[id], done=P.isDone(t), ppl=schPeople(t);
    h+=`<div class="sn-node ${id===focus?'sel':''} ${done?'done':''}" style="left:${px(id)}px;top:${py(id)}px" data-sch="pickrow" data-k="${id}" title="${esc(schTaskTitle(t)+(id===focus?'\n한 번 더 누르면 상세가 열립니다':''))}"><div class="w">${t.kind==='milestone'?'<i class="sch-ms"></i>':''}${schWbs(t.wbs)})</div><div class="nm">${esc(t.name)}</div>
      <div class="rg">${t.kind==='milestone'?schD(x.start):schRange(x.start,x.finish)}</div><div class="dd">${done?schStIcon('완료'):schDdayHtml(x.finish,false)}</div><div class="who">${ppl.length?avstack(ppl,3):'<span class="sch-role none">미지정</span>'}</div></div>`; }
  // the dots of the ground belong to the drawing: they scroll with it and grow and shrink with it
  host.innerHTML=`<div class="sn-canvas" style="width:${W*z}px;height:${H*z}px;background-image:radial-gradient(circle,#eaeaea ${1.5*z}px,transparent ${1.9*z}px);background-size:${30*z}px ${28.5*z}px;background-position:${9*z}px ${9*z}px"><div class="sn-zoom" style="width:${W}px;height:${H}px;transform:scale(${z})"><div style="position:absolute;left:${ox}px;top:${oy}px;width:${LW}px;height:${LH}px"><svg class="sn-links" width="${LW}" height="${LH}">${sv}${hot}</svg>${h}</div></div></div>`;
  host._lay={w:LW,h:LH};
  const info=$('#sch-net .sn-info'); if(info)info.textContent=`업무 ${row.size}${lay.total&&lay.total>row.size?' / '+lay.total:''}건 · 관계 ${lay.edges.length-hidden}건`+(hidden?` · 이웃 열이 아닌 관계 ${hidden}건은 숨김`:'');
  // keep the selected task in view
  const key=pid+'|'+focus+'|'+SCHU.netMode+'|'+SCHU.netDepth+'|'+SCHU.netDir+'|'+SCHU.phase+'|'+z; if(host._key!==key){ host._key=key; if(SCH.ns&&SCH.ns.key===key){host.scrollLeft=SCH.ns.x;host.scrollTop=SCH.ns.y;} else{host.scrollLeft=Math.max(0,(ox+px(focus)+SN.w/2)*z-host.clientWidth/2);host.scrollTop=Math.max(0,(oy+py(focus)+SN.h/2)*z-host.clientHeight/2);} }
  if(!host._keep){host._keep=true;host.addEventListener('scroll',()=>{if(host._key)SCH.ns={key:host._key,x:host.scrollLeft,y:host.scrollTop};},{passive:true});} }
function schNetZoom(dir){ const host=$('#sch-net .sn-scroll'); if(!host||!host._lay)return; if(dir===0){SCHU.netZoom=Math.max(.25,Math.min(1,Math.min((host.clientWidth-8)/host._lay.w,(host.clientHeight-8)/host._lay.h)));}
  else SCHU.netZoom=Math.max(.25,Math.min(1.5,Math.round(((SCHU.netZoom||1)+dir*.15)*100)/100)); schNetBuild(S.proj); schUiSave(); }
