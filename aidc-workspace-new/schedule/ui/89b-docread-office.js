/* ---------- Word (.docx) and PowerPoint (.pptx) documents for 개요 업로드 (fiftieth round) ---------- */
// Owner, 2026-11-26: "개요 업로드에서 pdf나 ppt, 워드, 엑셀을 각각 업로드할때 내용만 맞으면 그대로 프로젝트 페이지에 개요 업로드가 돼?"
// — "ㅇㅇ 그렇게 진행해줘", and the six report files of that day are the standard guides. A Word or PowerPoint file is a zip of
// XML: its words and tables are read as they stand (no service, no language model) and turned into the same entry a sheet of
// the Excel file gives (schDocToReport), by the titles of the overview (SCH_DOC_HEADS) and the heads of its tables
// (핵심 지표 | 값, 구분 | 내용, 시기 | … | 상태). The app's own report files (Word: the Word guide; PPT: the one page of 요약
// and the three pages of FULL; the main page's list) come back as they went out; another document is read as far as it has
// these titles.
//   · schUnzip(bytes)        the files of a zip (DecompressionStream 'deflate-raw', no library)
//   · schDocDocxFlow(xml)    a Word body -> blocks: {k:'p', t} and {k:'tbl', rows:[{c:[cells], hd}], lead}
//   · schDocPptxSlides(z)    the slides -> text boxes and tables with where they stand (inches) and their type size
//   · schDocFlowEntry(flow)  blocks of one project -> the entry of schDocToReport
async function schUnzip(buf){ const u=buf instanceof Uint8Array?buf:new Uint8Array(buf), dv=new DataView(u.buffer,u.byteOffset,u.byteLength);
  let e=-1; for(let i=u.length-22;i>=Math.max(0,u.length-65558);i--){ if(dv.getUint32(i,true)===0x06054b50){ e=i; break; } } if(e<0)throw new Error('파일을 열지 못했습니다 (zip 형식이 아닙니다).');
  const n=dv.getUint16(e+10,true); let p=dv.getUint32(e+16,true); const map=new Map(), dec=new TextDecoder();
  for(let k=0;k<n&&p+46<=u.length;k++){ if(dv.getUint32(p,true)!==0x02014b50)break; const meth=dv.getUint16(p+10,true), csz=dv.getUint32(p+20,true), nl=dv.getUint16(p+28,true), xl=dv.getUint16(p+30,true), cl=dv.getUint16(p+32,true), off=dv.getUint32(p+42,true);
    map.set(dec.decode(u.subarray(p+46,p+46+nl)),{meth,csz,off}); p+=46+nl+xl+cl; }
  const bytes=async name=>{ const f=map.get(name); if(!f)return null; const h=f.off, start=h+30+dv.getUint16(h+26,true)+dv.getUint16(h+28,true), raw=u.subarray(start,start+f.csz);
    if(f.meth===0)return raw; if(f.meth!==8||typeof DecompressionStream!=='function')throw new Error('이 브라우저에서는 이 파일을 풀 수 없습니다.');
    return new Uint8Array(await new Response(new Blob([raw]).stream().pipeThrough(new DecompressionStream('deflate-raw'))).arrayBuffer()); };
  return {names:[...map.keys()],bytes,text:async name=>{ const b=await bytes(name); return b?dec.decode(b):null; }}; }
const schXmlDoc=t=>{ const d=new DOMParser().parseFromString(t,'application/xml'); if(d.getElementsByTagName('parsererror').length)throw new Error('문서의 내용을 읽지 못했습니다 (손상된 파일일 수 있습니다).'); return d; };
const schKids=(el,n)=>[...el.childNodes].filter(c=>c.localName===n);

/* ---------- Word ---------- */
function schDocDocxFlow(xml){ const doc=schXmlDoc(xml), body=doc.getElementsByTagNameNS('*','body')[0]; if(!body)return [];
  const pText=p=>{ let t=''; const walk=el=>{ for(const c of el.childNodes){ const n=c.localName; if(!n)continue; if(n==='t')t+=c.textContent; else if(n==='tab')t+='\t'; else if(n==='br'||n==='cr')t+='\n'; else if(n==='delText'||n==='instrText'||n==='pPr'||n==='rPr')continue; else walk(c); } }; walk(p); return t; };
  const cellParas=tc=>{ const out=[]; const walk=el=>{ for(const c of el.childNodes){ if(c.localName==='p')out.push(pText(c)); else if(c.localName==='tbl')for(const tr of schKids(c,'tr'))for(const td of schKids(tr,'tc'))out.push(...cellParas(td)); else if(c.localName==='sdt'||c.localName==='sdtContent'||c.localName==='customXml')walk(c); } }; walk(tc); return out; };
  const flow=[]; const walk=el=>{ for(const c of el.childNodes){ const n=c.localName;
    if(n==='p')flow.push({k:'p',t:pText(c)});
    else if(n==='tbl'){ const rows=schKids(c,'tr').map((tr,i)=>{ const trPr=schKids(tr,'trPr')[0]; return {c:schKids(tr,'tc').map(cellParas),hd:i===0||!!(trPr&&schKids(trPr,'tblHeader').length)}; }).filter(r=>r.c.length);
      // the sheet's first column without lines (the section's title, or nothing): every row after the first leaves it empty
      const txt=ps=>ps.join('\n').trim(), lead=rows.length===1?rows[0].c.length===2:rows.length>1&&rows.slice(1).every(r=>r.c.length>=2&&!txt(r.c[0]));
      flow.push({k:'tbl',lead,rows:rows.map(r=>({c:r.c,hd:r.hd}))}); }
    else if(n==='sdt'||n==='sdtContent'||n==='customXml')walk(c); } };
  walk(body); return flow; }
// the blocks of a Word report -> its projects (and the rows of a list table): the head line of the report, then its numbered
// sections — 진행 현황 and 사업 개요 are read, the others (schedule, gates …) are not the overview; on the main page's report every
// project's sheet is a section titled with its name
function schDocWordSheets(flow){ const sheets=[], list=[]; let cur={flow:[]}, sec='', main=false, skip=false; sheets.push(cur);
  const T=s=>String(s==null?'':s).replace(/ /g,' ').trim(), heading=t=>{ const m=/^(\d{1,2})\.\s+(\S.*)$/.exec(t); return m?{num:true,t:m[2].trim()}:{num:false,t:t.replace(/^\d{1,3}\s{2,}/,'').trim()}; };
  const open=h=>{ if(h.num){ sec=schDocSq(h.t); skip=!['진행현황','진행현황요약','사업개요','프로젝트상세'].includes(sec)&&sec!=='프로젝트목록'; return; }
    cur={flow:[],name:h.t}; sheets.push(cur); sec='sheet'; skip=false; };
  flow.forEach((b,bi)=>{
    if(b.k==='h'){ const h=heading(T(b.t)); if(h.num||main)open(h); return; }
    if(b.k==='p'){ const t=T(b.t); if(!t)return;
      // the first line: "name ⇥ No. n | group | stage" (a project's report) or "AIDC 프로젝트 개발검토 리스트 ⇥ 기준일 … | 총 n건"
      if(bi<3&&!sec&&/\t/.test(b.t)){ const [a,lab]=b.t.split('\t').map(T); if(/개발검토\s*리스트/.test(a)){ main=true; const m=/기준일\s*([\d.]+)/.exec(lab||''); if(m)cur.asof=m[1]; } else { cur.name=a; for(const x of String(lab||'').split('|').map(T)){ if(REP_GRPS.includes(x))cur.grp=x; else if(PSTATUS[schDocSq(x)])cur.stage=schDocSq(x); } } return; }
      if(/^프로젝트\s*보고서/.test(t)&&!sec)return;
      const sh=/^(\d{1,2}\.\s+[^\t]+)\t/.exec(b.t); if(sh){ open(heading(T(sh[1]))); return; }
      if(!skip)cur.flow.push({k:'p',t}); return; }
    if(b.k!=='tbl')return;
    for(const r of b.rows){ let c=r.c.map(ps=>ps.map(T)); if(b.lead){ const h=c[0].join(' ').trim(); if(h)open(heading(h)); c=c.slice(1); }
      if(!c.length)continue;
      // a row of one cell is text (the right column of the sheet): its paragraphs one after the other
      if(c.length===1){ if(!skip)for(const t of c[0])if(t)cur.flow.push({k:'p',t}); continue; }
      const cells=c.map(ps=>ps.filter(Boolean).join('\n'));
      if(sec==='프로젝트목록'||(r.hd&&cells.some(x=>schDocSq(x)==='프로젝트')&&cells.some(x=>['위치','사업주체'].includes(schDocSq(x))))){ list.push(cells); continue; }
      if(!skip)cur.flow.push({k:'row',c:cells,hd:r.hd}); } });
  return {sheets:sheets.filter(s=>s.name||s.flow.length),list,main}; }

/* ---------- PowerPoint ---------- */
async function schDocPptxSlides(z){ const pres=schXmlDoc(await z.text('ppt/presentation.xml')||'<x/>'), rels=schXmlDoc(await z.text('ppt/_rels/presentation.xml.rels')||'<x/>'), E=914400;
  const target={}; for(const r of rels.getElementsByTagName('Relationship'))target[r.getAttribute('Id')]=r.getAttribute('Target');
  let order=[...pres.getElementsByTagNameNS('*','sldId')].map(s=>target[s.getAttributeNS('http://schemas.openxmlformats.org/officeDocument/2006/relationships','id')||s.getAttribute('r:id')]).filter(Boolean).map(t=>'ppt/'+t.replace(/^\/?(ppt\/)?/,''));
  if(!order.length)order=z.names.filter(n=>/^ppt\/slides\/slide\d+\.xml$/.test(n)).sort((a,b)=>parseInt(a.slice(16))-parseInt(b.slice(16)));
  const slides=[]; for(const name of order){ const x=await z.text(name); if(!x)continue; const d=schXmlDoc(x), els=[];
    const geo=el=>{ const off=el.getElementsByTagNameNS('*','off')[0], ext=el.getElementsByTagNameNS('*','ext')[0]; return off&&ext?{x:+off.getAttribute('x')/E,y:+off.getAttribute('y')/E,w:+ext.getAttribute('cx')/E,h:+ext.getAttribute('cy')/E}:null; };
    const paras=tx=>schKids(tx,'p').map(p=>{ let t='', sz=0; for(const c of p.getElementsByTagNameNS('*','*')){ if(c.localName==='t'&&c.parentNode.localName==='r'){ t+=c.textContent; const rp=c.parentNode.getElementsByTagNameNS('*','rPr')[0]; if(rp&&rp.getAttribute('sz'))sz=Math.max(sz,+rp.getAttribute('sz')/100); } else if(c.localName==='br')t+='\n'; }
      if(!sz){ const d=p.getElementsByTagNameNS('*','defRPr')[0]||p.getElementsByTagNameNS('*','endParaRPr')[0]; if(d&&d.getAttribute('sz'))sz=+d.getAttribute('sz')/100; } return {t,sz}; });
    const runs=tx=>{ const out=[]; for(const r of tx.getElementsByTagNameNS('*','r')){ const t=(r.getElementsByTagNameNS('*','t')[0]||{}).textContent||'', rp=r.getElementsByTagNameNS('*','rPr')[0], clr=rp&&rp.getElementsByTagNameNS('*','srgbClr')[0]; out.push({t,sz:rp&&rp.getAttribute('sz')?+rp.getAttribute('sz')/100:0,col:clr?clr.getAttribute('val'):''}); } return out; };
    for(const sp of d.getElementsByTagNameNS('*','sp')){ const g=geo(sp), tx=sp.getElementsByTagNameNS('*','txBody')[0]; if(!g||!tx)continue; const ps=paras(tx), t=ps.map(p=>p.t).join('\n').trim(); if(!t)continue;
      const rs=runs(tx); els.push(Object.assign(g,{k:'t',t,sz:Math.max(0,...ps.map(p=>p.sz)),runs:rs,col:(rs[0]||{}).col||''})); }
    for(const gf of d.getElementsByTagNameNS('*','graphicFrame')){ const tb=gf.getElementsByTagNameNS('*','tbl')[0]; if(!tb)continue; const xf=gf.getElementsByTagNameNS('*','xfrm')[0], g=xf?geo(xf):geo(gf); if(!g)continue;
      const rows=schKids(tb,'tr').map(tr=>schKids(tr,'tc').map(tc=>{ const t=tc.getElementsByTagNameNS('*','txBody')[0]; return t?paras(t).map(p=>p.t).join('\n').trim():''; }));
      els.push(Object.assign(g,{k:'tbl',rows})); }
    slides.push(els); }
  return slides; }
// the slides -> projects: a page's title line names the project ("판교 AIDC 프로젝트 보고서  I  …", or the name in large type on the
// one page of 요약); the overview's titles in smaller type head the blocks under them; what stands under a title (overlapping it
// from side to side, below it, nearer than any other title) is its content
const SCH_PPT_HEADS=Object.assign({},SCH_DOC_HEADS,{'자료출처':'src','협력업체':'partners'});
function schDocPptSheets(slides){ const sheets=[], list=[]; let cur=null, deckName='', listAsof='';
  const chip=(t,s)=>{ const q=schDocSq(t); if(/^No\.\d+$/i.test(q))return true; if(REP_GRPS.includes(t)){ s.grp=t; return true; } if(PSTATUS[q]){ s.stage=q; return true; } if(q==='집중추진'){ s.focus=true; return true; }
    let m=/^최초자료일?\s*(.+)$/.exec(t); if(m){ s.first=m[1].trim(); return true; } m=/^기준일\s*(.+)$/.exec(t); if(m){ s.asof=m[1].trim(); return true; } return false; };
  const get=name=>{ const k=schDocSq(name); let s=sheets.find(x=>schDocSq(x.name)===k); if(!s){ s={name,flow:[]}; sheets.push(s); } return s; };
  slides.forEach((els,si)=>{
    // the cover: the name and "프로젝트 보고서" in two lines
    const idx=els.find(e=>e.k==='t'&&e.y<0.6&&/\s+I\s+/.test(e.t)), cover=els.find(e=>e.k==='t'&&/\n\s*프로젝트\s*보고서\s*$/.test(e.t));
    if(cover&&!deckName)deckName=cover.t.split('\n')[0].trim();
    let name=''; if(idx){ const m=/^(.*?)\s*프로젝트\s*보고서/.exec(idx.t); if(m)name=m[1].trim(); else if(/개발검토\s*리스트/.test(idx.t))name=''; }
    // a table with the list's head
    for(const t of els.filter(e=>e.k==='tbl')){ const h=(t.rows[0]||[]).map(schDocSq); if(h.includes('프로젝트')&&(h.includes('위치')||h.includes('사업주체'))){ list.push(...t.rows); } }
    for(const e of els.filter(e=>e.k==='t'&&e.y<1.4&&e.sz>=14&&/기준일\s*[\d.]+\s*·\s*총/.test(e.t))){ const m=/기준일\s*([\d.]+)/.exec(e.t); if(m)listAsof=m[1]; }
    const heads=els.filter(e=>e.k==='t'&&e.sz<20&&e.y>1.0&&SCH_PPT_HEADS[schDocSq(e.t)]&&e.t.length<20);
    // the title in large type: the one page of 요약 writes the name and its sub line in it; other pages their own title
    const big=els.find(e=>e.k==='t'&&e.sz>=20&&e.y>0.6&&e.y<1.2), first=big&&big.runs.length?big.runs[0].t.trim():'';
    if(!heads.length)return;
    if(!name){ if(big&&!SCH_PPT_HEADS[schDocSq(first)]&&!/Project|Overview|Site|Status|Risk/.test(big.t))name=first; else name=cur?cur.name:deckName; }
    if(!name)return; cur=get(name);
    if(big&&schDocSq(first)===schDocSq(name)&&big.runs.length>1){ const sub=big.runs.slice(1).map(r=>r.t).join('').trim(); if(sub&&!SCH_PPT_HEADS[schDocSq(sub)])cur.sub=sub; }   // (a page of figures names its block beside the name)
    // between the title and the first block: the grey tabs (No. · 구분 · 추진 단계 · 집중 추진 · 최초자료 · 기준일) and, under the title
    // of the overview's page, its sub line
    const used=new Set([idx,big,...heads].filter(Boolean)), firstY=Math.min(...heads.map(h=>h.y));
    for(const e of els){ if(e.k!=='t'||used.has(e)||e.y<0.6||e.y>=firstY-0.05)continue; if(chip(e.t.trim(),cur)){ used.add(e); continue; }
      if(big&&SCH_PPT_HEADS[schDocSq(first)]==='ov'&&e.sz>=13&&e.sz<20&&e.w>3){ if(!cur.sub)cur.sub=e.t.trim(); used.add(e); } }
    // every element under its title: beside it on its line, else the nearest title above that it stands under, else the nearest title
    // above it at all (a row of steps wider than its title)
    const own=new Map(heads.map(h=>[h,[]]));
    for(const e of els){ if(used.has(e)||e.y<0.6||(e.k==='t'&&/^\d+$/.test(e.t)&&e.y>7.5))continue; let best=null;
      const asof=e.k==='t'&&/^\[기준일[:：]?\s*([^\]]+)\]$/.exec(e.t.trim()); if(asof){ cur.asof=asof[1].trim(); continue; }
      for(const h of heads){ if(Math.abs(h.y-e.y)<=0.08&&e.x>=h.x+0.05&&(!best||h.x>best.x))best=h; }
      if(!best)for(const h of heads){ if(h.y>=e.y-0.02)continue; const a=Math.max(h.x-0.12,e.x), b=Math.min(h.x+Math.max(h.w,0.5),e.x+e.w); if(b<=a)continue; if(!best||h.y>best.y)best=h; }
      if(!best)for(const h of heads){ if(h.y>=e.y-0.02||e.y-h.y>1.2)continue; if(!best||h.y>best.y)best=h; }
      if(best)own.get(best).push(e); else if(e.k==='tbl'&&e.rows.length&&e.rows[0].length===2)cur.flow.push({k:'tbl',kind:'rows',rows:e.rows}); }
    for(const h of heads){ const key=SCH_PPT_HEADS[schDocSq(h.t)], mine=own.get(h).sort((a,b)=>a.y-b.y||a.x-b.x); if(key==='partners')continue;
      cur.flow.push({k:'p',t:h.t.trim(),title:1});
      if(key==='kpi'||key==='fin'){ const tx=mine.filter(e=>e.k==='t'), notes=tx.filter(e=>/^\*/.test(e.t)), rest=tx.filter(e=>!/^\*/.test(e.t)), top=Math.max(0,...rest.map(e=>e.sz));
        // a figure is in large type and in the colour of the largest one (a long figure is set smaller, its colour stays)
        const fc=(rest.find(e=>e.sz===top)||{}).col, isFig=e=>e.sz>=top*0.85||!!(fc&&e.col===fc), figs=rest.filter(isFig), caps=rest.filter(e=>!isFig(e));
        // a caption belongs to the figure right above it; "(…)" on a line of its own was set there for the room (paren in pptx.ts)
        const pairs=figs.sort((a,b)=>Math.round((a.y-b.y)*8)||a.x-b.x).map(f=>({f,c:[]}));
        for(const c of caps){ let b=null; for(const p of pairs){ if(p.f.y>c.y)continue; if(Math.min(p.f.x+p.f.w,c.x+c.w)-Math.max(p.f.x,c.x)<=0)continue; if(!b||p.f.y>b.f.y)b=p; } if(b)b.c.push(c); }
        for(const p of pairs){ const cap=p.c.sort((a,b)=>a.y-b.y).map(c=>c.t).join('\n').replace(/\n(\([^()\n]*\))$/,' $1'); cur.flow.push({k:'fig',v:p.f.t.replace(/\s*\n\s*/g,' ').trim(),c:cap}); }
        for(const n of notes)cur.flow.push({k:'p',t:n.t}); continue; }
      if(key==='plan'){ const tb=mine.find(e=>e.k==='tbl'); if(tb){ cur.flow.push({k:'tbl',kind:'plan',rows:tb.rows}); continue; }
        // the steps of FULL: a date in a box, the state and what happens in the box under it
        const tx=mine.filter(e=>e.k==='t'), top=Math.max(0,...tx.map(e=>e.sz)), dates=tx.filter(e=>e.sz>=top-0.5&&!/\n/.test(e.t)).sort((a,b)=>a.x-b.x||a.y-b.y), rows=[];
        for(const dt of dates){ const box=tx.filter(e=>e!==dt&&!dates.includes(e)&&e.y>dt.y&&Math.min(dt.x+dt.w,e.x+e.w)-Math.max(dt.x,e.x)>0).sort((a,b)=>a.y-b.y)[0]; if(!box)continue; const ls=box.t.split('\n'), st=SCH_DOC_STATES.includes(schDocSq(ls[0]))?schDocSq(ls.shift()):'예정';
          rows.push([dt.t.trim(),ls.join(' ').trim(),st]); }
        if(rows.length)cur.flow.push({k:'tbl',kind:'plan',rows:[['시기','내용','상태'],...rows]}); continue; }
      if(key==='ov'){ for(const e of mine){ if(e.k==='tbl')cur.flow.push({k:'tbl',kind:e.rows.length&&e.rows[0].length===2?'rows':'',rows:e.rows}); else cur.flow.push({k:'p',t:e.t}); } continue; }
      // a list: the bullets are boxes of their own beside the text
      for(const e of mine){ if(e.k!=='t'||/^[•·▪■◦]$/.test(e.t))continue; cur.flow.push({k:'p',t:e.t}); } } });
  return {sheets,list,listAsof}; }

/* ---------- blocks -> the entry ---------- */
function schDocFlowEntry(s){ const e={name:s.name||'',sub:s.sub||'',grp:s.grp||'',stage:s.stage||'',first:s.first||'',asof:s.asof||'',owner:s.owner||'',focus:s.focus,list:{},kpi:[],fin:[],finNote:'',ov:[],infra:[],model:[],stat:[],rows:[],plan:[],risk:[],src:[]};
  let cur='', mode=''; const sq=schDocSq, unb=t=>t.replace(/^[•▪■◦]\s*/,'');
  const meta=(l,v)=>{ const m=SCH_DOC_META[sq(l)]; if(!m||!v)return; if(m==='focus')e.focus=schDocYes(v); else if(['site','dev','area','gfa','load','memo'].includes(m))e.list[m]=v; else if(m==='stage'){ if(PSTATUS[sq(v)])e.stage=sq(v); } else if(m==='name'){ if(!e.name)e.name=v; } else e[m]=v; };
  // a line under the name of a project on the main page's report: "AIDC · 사업계획 · 집중 추진 · 최초자료일 … · 기준일 … · 담당자 …"
  const metaLine=t=>{ const parts=t.split(/\s+·\s+/); if(parts.length<2)return false; let n=0; for(const x of parts){ const q=sq(x); let m;
      if(REP_GRPS.includes(x)){ e.grp=x; n++; } else if(PSTATUS[q]){ e.stage=q; n++; } else if(q==='집중추진'){ e.focus=true; n++; } else if(q==='단계미정')n++;
      else if(m=/^최초자료일?\s*(.+)$/.exec(x)){ e.first=m[1]; n++; } else if(m=/^기준일\s*(.+)$/.exec(x)){ e.asof=m[1]; n++; } else if(m=/^담당자\s*(.+)$/.exec(x)){ e.owner=m[1]; n++; } }
    return n>=2&&n===parts.length; };
  for(const b of s.flow){
    if(b.k==='p'){ const t=String(b.t||'').trim(); if(!t)continue; const key=SCH_PPT_HEADS[sq(t)];
      if(key&&t.length<24){ cur=key; mode=''; continue; }
      if(!cur){ metaLine(t); continue; }
      if(cur==='fin'||cur==='kpi'){ if(/^\*/.test(t)&&cur==='fin')e.finNote=t; continue; }
      if(cur==='partners'||cur==='rows'||cur==='plan')continue;
      if(cur==='src'){ e.src.push(...t.split(/\s+\/\s+/).map(x=>x.trim()).filter(Boolean)); continue; }
      e[cur].push(unb(t)); continue; }
    if(b.k==='fig'){ if(cur==='kpi'||cur==='fin')e[cur].push([b.v,b.c||'']); continue; }
    const rows=b.k==='row'?[b.c]:b.k==='tbl'?b.rows:[]; if(b.k==='tbl'&&b.kind){ mode=b.kind; }
    rows.forEach((r,ri)=>{ const c=r.map(x=>String(x==null?'':x).trim()), q=c.map(sq);
      // the head of a table says what it holds
      if(c.length>=2&&q[1]==='값'&&(b.hd||b.k==='tbl'&&ri===0||b.k==='row')){ const k=SCH_DOC_HEADS[q[0]]; mode=k==='fin'||k==='kpi'?k:e.kpi.length?'fin':'kpi'; return; }
      if(q[0]==='구분'&&q[1]==='내용'){ mode='rows'; return; }
      if(q[0]==='시기'&&c.length>=3&&q[c.length-1]==='상태'){ mode='plan'; return; }
      if(q[0]==='항목'&&q[1]==='내용'){ mode='meta'; return; }
      if((b.k==='row'&&b.hd)||(b.k==='tbl'&&ri===0&&!b.kind)){ mode='skip'; return; }
      if(mode==='kpi'||mode==='fin'){ if(c[0]||c[1])e[mode].push([c[1]||'',c[0]||'']); return; }
      if(mode==='rows'){ if(q[0]==='비고')e.list.memo=c.slice(1).join(' '); else if(c[0]||c[1])e.rows.push([c[0],c.slice(1).join(' ')]); return; }
      if(mode==='plan'){ if(c[0]||c[1])e.plan.push([c[0],c[1]||'',c[2]||'']); return; }
      if(mode==='meta'||!cur&&c.length===2)meta(c[0],c[1]); });
    if(b.k==='tbl')mode=''; }
  const out=Object.assign(e,{ov:e.ov.join('\n'),model:e.model.join('\n'),stat:e.stat.length>1?e.stat:e.stat.join('')});
  const has=out.kpi.length||out.fin.length||out.rows.length||out.plan.length||out.ov||out.infra.length||out.model||out.stat.length||out.risk.length;
  return out.name&&has?out:null; }

/* ---------- the app's report as a PDF (the print window's sheet) ---------- */
// The print window lays the report out as Word does: the title and its label over a rule, the sections' titles in a column at the
// left, text and tables at the right. The tables are found by their rules (schDocPdfRules in 89-docread.js): every upright rule
// bounds a cell from its top to its bottom, so a row is the cells that share top and bottom, and a cell's words are those inside
// it, however many lines they take. What is outside the tables is text, a paragraph running on until a bullet, a title or a gap.
// The result is the blocks the Word reader makes, read by the same rules. Only a PDF that has a report's head line is read so.
function schDocPdfFlow(pages){ const p0=pages[0]; if(!p0)return null;
  const rule0=(p0.rules.hs||[]).filter(h=>h.x1-h.x0>p0.w*0.6).sort((a,b)=>a.y-b.y)[0]; if(!rule0||rule0.y>p0.h*0.3)return null;
  const top=p0.items.filter(i=>i.y<rule0.y), big=Math.max(0,...top.map(i=>i.h)); if(big<12)return null;
  const line1=top.filter(i=>Math.abs(i.y-top.find(t=>t.h===big).y)<=4), name=schDocJoin(line1.filter(i=>i.h>=big*0.9)), label=schDocJoin(line1.filter(i=>i.h<big*0.9));
  const flat=schDocSq(top.map(i=>i.s).join('')); if(!/프로젝트보고서|개발검토리스트/.test(flat))return null;
  const main=/개발검토리스트/.test(flat), flow=[{k:'p',t:name+'\t'+label}];
  const r1=v=>Math.round(v*2)/2;
  for(const pg of pages){ const R=pg.rules||{hs:[],vs:[]}, used=new Set(), blocks=[];
    // rows: upright rules that share top and bottom; the cells between them
    const bands=new Map(); for(const v of R.vs){ const k=r1(v.y0)+':'+r1(v.y1); if(!bands.has(k))bands.set(k,{y0:v.y0,y1:v.y1,xs:[]}); bands.get(k).xs.push(v.x); }
    const rows=[...bands.values()].map(b=>({y0:b.y0,y1:b.y1,xs:[...new Set(b.xs.map(r1))].sort((a,b)=>a-b)})).filter(b=>b.xs.length>=2&&b.y1-b.y0>=6).sort((a,b)=>a.y0-b.y0);
    // a cell's lines go on with a space, unless the line before was ONE word that ran to the cell's edge and was broken inside
    // (the sheet keeps Korean words whole and breaks a word only where it is longer than the cell): Korean on both sides, or a
    // number cut after a point; a sign that closes ("." ")" ",") never takes a space before it
    const H=/[\uac00-\ud7a3]/, cellText=(its,x1)=>{ let t='', prev='', right=0; for(const L of schDocLines(its)){ const s=schDocJoin(L.it); if(!s)continue;
        const cut=prev&&(/\S·$/.test(prev)&&!/^\s/.test(s)||right>=x1-9&&!/\s/.test(prev)&&(H.test(prev.slice(-1))&&H.test(s[0])||/[\d.\-\/·]$/.test(prev)&&/^\d/.test(s)||prev.length>=8&&/^[A-Za-z0-9]/.test(s)));
        t+=(t?(cut||/^[.,:;)\]%]/.test(s)?'':' '):'')+s; prev=s; right=Math.max(...L.it.map(i=>i.x+i.w)); } return t.replace(/\s+/g,' ').trim(); };
    let tbl=null; for(const b of rows){ const cells=b.xs.slice(0,-1).map((x,i)=>{ const its=pg.items.filter(it=>{ const cx=it.x+Math.min(it.w,8)/2, cy=it.y-it.h*0.35; return cx>=x&&cx<b.xs[i+1]&&cy>=b.y0&&cy<=b.y1; }); its.forEach(it=>used.add(it)); return cellText(its,b.xs[i+1]); });
      if(tbl&&Math.abs(b.y0-tbl.y1)<=2.5&&Math.abs(b.xs[0]-tbl.x)<=2){ tbl.rows.push({c:cells.map(t=>[t]),hd:false}); tbl.y1=b.y1; }
      else { tbl={k:'tbl',lead:false,y:b.y0,y1:b.y1,x:b.xs[0],rows:[{c:cells.map(t=>[t]),hd:true}]}; blocks.push(tbl); } }
    // the rest: the head line and the page's number and head are not the report's content
    const rest=pg.items.filter(i=>!used.has(i)&&i.y>44&&i.y<pg.h-40&&!(pg===p0&&i.y<=rule0.y+2)), left=Math.min(...blocks.map(b=>b.x),185)-12;
    // (a line's place is its top — a table's is the top of its first row — so a title stands before the table it heads)
    let para=null; for(const L of schDocLines(rest)){ const lt=L.it.filter(i=>i.x<left), rt=L.it.filter(i=>i.x>=left), top=L.y-Math.max(...L.it.map(i=>i.h))*0.85;
      if(lt.length){ blocks.push({k:'h',y:top-6,t:schDocJoin(lt).replace(main?/^\d{1,3}\s+(?=\S)/:/^$/,'')}); para=null; }
      if(!rt.length)continue; const t=schDocJoin(rt), h=Math.max(...rt.map(i=>i.h)), key=SCH_DOC_HEADS[schDocSq(t)]&&t.length<24;
      if(para&&!key&&!para.key&&!/^[•▪■◦]/.test(t)&&L.y-para.y1<=h*1.75&&!lt.length){ para.t+=' '+t; para.y1=L.y; continue; }
      para={k:'p',y:top,y1:L.y,t,key}; blocks.push(para); }
    blocks.sort((a,b)=>a.y-b.y); for(const b of blocks)flow.push(b.k==='tbl'?{k:'tbl',lead:false,rows:b.rows}:b.k==='h'?{k:'h',t:b.t}:{k:'p',t:b.t}); }
  return {flow,main}; }

