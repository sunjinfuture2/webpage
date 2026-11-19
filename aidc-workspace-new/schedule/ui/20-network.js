// 관계도: the tasks around the selected one (or a whole phase), laid out by the Schedule app's network layout
// (schedule/core/network.ts: at most 120 tasks and 600 relations are drawn; nothing is dropped from the plan).
function schNetShell(pid,m){ return `<div class="sch-net" id="sch-net"><div class="sn-scroll"></div><div class="sn-tools"><span class="sn-info"></span><button class="sh-btn" data-sch="netzoom" data-k="-1" title="축소">−</button><button class="sh-btn" data-sch="netzoom" data-k="1" title="확대">+</button><button class="sh-btn sn-fit" data-sch="netfit" title="전체가 보이게 맞추기">${svg('i-sch-fit',18,18)}</button></div></div>`; }
function schNetFocus(m){ const sel=schTaskIdOf(S.panel)||SCHU.sel; if(sel&&m.byId.has(sel)&&(!SCHU.phase||SCHU.netMode==='focus'||m.byId.get(sel).phase===SCHU.phase))return sel;
  const list=schFiltered(m); const today=schToday(); const cur=list.find(t=>!AIDCSchedule.progress.isDone(t)&&m.res.tasks[t.id].finish>=today)||list[0]||m.plan.tasks[0]; return cur?cur.id:''; }
function schNetBuild(pid){ const host=$('#sch-net .sn-scroll'); if(!host)return; const m=schModel(pid); if(!m){host.innerHTML='';return;} const A=AIDCSchedule, P=A.progress;
  const focus=schNetFocus(m), all=SCHU.netMode==='all'; let plan=m.plan;
  if(all&&SCHU.phase){const ids=new Set(m.plan.tasks.filter(t=>t.phase===SCHU.phase).map(t=>t.id));plan={...m.plan,tasks:m.plan.tasks.filter(t=>ids.has(t.id)),dependencies:m.plan.dependencies.filter(e=>ids.has(e.from)&&ids.has(e.to))};}
  if(!focus||!plan.tasks.length){host.innerHTML='<div class="sch-empty" style="padding-left:24px">표시할 업무가 없습니다.</div>';return;}
  const lay=A.network(plan,m.res,{focusId:focus,depth:SCHU.netDepth,direction:SCHU.netDir,all,includeInactive:false,limit:120});
  // a layout smaller than the view is centred in it; a larger one scrolls
  const z=SCHU.netZoom||1, vw=host.clientWidth/z, vh=host.clientHeight/z, W=Math.max(lay.width,vw), H=Math.max(lay.height,vh), ox=Math.round((W-lay.width)/2), oy=Math.round((H-lay.height)/2); let h='', sv='';
  for(const r of lay.routes){const e=lay.edges.find(x=>x.id===r.edgeId), hot=e&&(e.from===focus||e.to===focus), p0=r.points[0];
    sv+=`<path class="${hot?'hot':''}" d="${r.path}" marker-end="url(#sn-arrow${hot?'-hot':''})"/><circle class="${hot?'hot':''}" cx="${p0.x}" cy="${p0.y}" r="2.6"/>`;
    if(e&&(e.type!=='FS'||e.lag))sv+=`<text x="${r.labelX}" y="${r.labelY-5}" text-anchor="middle">${e.type}${e.lag?(e.lag>0?' +':' ')+e.lag+'일':''}</text>`; }
  for(const n of lay.nodes){const t=n.task, x=m.res.tasks[t.id], done=P.isDone(t);
    h+=`<div class="sn-node ${t.id===focus?'sel':''} ${done?'done':''}" style="left:${n.x}px;top:${n.y}px;width:${A.NODE_W}px;height:${A.NODE_H}px" data-open="${schItemId(t.id)}" title="${esc(schTaskTitle(t))}"><div class="w">${t.kind==='milestone'?'<i class="sch-ms" style="margin-right:6px"></i>':''}${schWbs(t.wbs)})</div><div class="nm">${esc(t.name)}</div>
      <div class="rg">${t.kind==='milestone'?schD(x.start):schRange(x.start,x.finish)}</div><div class="ft">${done?schStIcon('완료'):schDdayHtml(x.finish,false)}<span class="who">${schPeople(t).length?avstack(schPeople(t),3):`<span class="sch-role">${esc(schRole(t))}</span>`}</span></div></div>`; }
  host.innerHTML=`<div class="sn-canvas" style="width:${W*z}px;height:${H*z}px"><div class="sn-zoom" style="width:${W}px;height:${H}px;transform:scale(${z})"><div style="position:absolute;left:${ox}px;top:${oy}px"><svg class="sn-links" width="${lay.width}" height="${lay.height}"><defs><marker id="sn-arrow" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="8" markerHeight="8" orient="auto"><path d="M1 1l6 3-6 3" fill="none" stroke="#8e8e8e" stroke-width="1.1"/></marker><marker id="sn-arrow-hot" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="8" markerHeight="8" orient="auto"><path d="M1 1l6 3-6 3" fill="none" stroke="#111" stroke-width="1.2"/></marker></defs>${sv}</svg>${h}</div></div></div>`;
  host._lay={w:lay.width,h:lay.height};
  const info=$('#sch-net .sn-info'); if(info)info.textContent=`업무 ${lay.nodes.length}${lay.omittedNodes?' / '+lay.relevantTotal:''}건 · 관계 ${lay.edges.length}건`+(lay.omittedNodes?` · 가까운 ${lay.nodes.length}건만 표시`:'');
  // keep the selected task in view
  const key=pid+'|'+focus+'|'+SCHU.netMode+'|'+SCHU.netDepth+'|'+SCHU.netDir+'|'+SCHU.phase+'|'+z; if(host._key!==key){host._key=key;const f=lay.nodes.find(n=>n.task.id===focus);if(f){host.scrollLeft=Math.max(0,(ox+f.x+A.NODE_W/2)*z-host.clientWidth/2);host.scrollTop=Math.max(0,(oy+f.y+A.NODE_H/2)*z-host.clientHeight/2);}} }
function schNetZoom(dir){ const host=$('#sch-net .sn-scroll'); if(!host||!host._lay)return; if(dir===0){SCHU.netZoom=Math.max(.25,Math.min(1,Math.min((host.clientWidth-8)/host._lay.w,(host.clientHeight-8)/host._lay.h)));}
  else SCHU.netZoom=Math.max(.25,Math.min(1.5,Math.round(((SCHU.netZoom||1)+dir*.15)*100)/100)); schNetBuild(S.proj); schUiSave(); }
