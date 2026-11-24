// Thirty-third round (owner, 2026-11-24): a document — a PDF or an Excel file — fills the overview of a project.
//   "가이드에 맞는 문서를 업로드하면 그걸 베이스로 프로젝트 개요를 생성 … 디자인 달라져도 내용이 같으면 감지해서"
// The document is read by what it SAYS, not by where things stand: the titles of the review list's sheet (핵심 지표, 사업성 지표,
// 사업 개요, 입지 및 전력 인프라, 사업 구조 및 수익 모델, 추진 현황 및 주요 특성, 주요 리스크 및 검토사항, 추진 일정, 출처) and the head of
// its list (NO. · 프로젝트 · 위치 · 사업주체 …). What is read becomes the same data a data file holds (kind "aidc-dev-report"), so
// making and updating projects is the one routine there was (schRepPlan / schRepApply in 88-report.js).
//   - schDocRead(file): a PDF through pdf.js (Apache-2.0, /pdf/, fetched on demand; the text and where it stands on the page),
//     an .xlsx through the Excel bundle (readCells: the cells as text), a .json data file as it is.
//   - schDocToReport(doc): {kind, v, asof, projects:[…], found:{…}} or an error that says what is missing.
// Nothing here calls a service: reading is rules. A scanned PDF (pictures of pages), a free text without these titles, or
// "write me the summary" would need a language model behind the Worker; schDocToReport is the one place such a reader would stand.
let schPdfLoading=null;
function schPdfLib(){ return schPdfLoading||(schPdfLoading=import('/pdf/pdf.min.mjs?v=__PDF_V__').then(m=>{ m.GlobalWorkerOptions.workerSrc='/pdf/pdf.worker.min.mjs?v=__PDF_V__'; return m; }).catch(e=>{ schPdfLoading=null; throw new Error('PDF를 읽는 기능을 불러오지 못했습니다. 연결을 확인하고 다시 시도해주세요.'); })); }
// a few signs come out of some PDFs as other characters (a font without a proper table): the ones the review list's PDF has
const SCH_DOC_FIX=[[/㏙/g,'('],[/㏚/g,')'],[/㒯/g,'㈜'],[/㒎/g,'m²'],[/㚕/g,'~'],[/㛳/g,'→'],[/㎿/g,'-'],[/㚠/g,'%'],[/㙌/g,'$'],[/㚉/g,'+'],[/㚋/g,'×'],[/㏇/g,'_'],[/㖈/g,'&'],[/㚒/g,'≤'],[/㚓/g,'≥'],[/㑄/g,"'"],[/㖞/g,'°C'],[/㖐/g,'°'],[/㏝/g,'['],[/㏞/g,']'],[/㏧/g,'「'],[/㏨/g,'」'],[/㜹/g,''],[/ /g,' ']];
const schDocFix=s=>{ s=String(s==null?'':s); for(const [a,b] of SCH_DOC_FIX)s=s.replace(a,b); return s; };
const schDocSq=s=>String(s==null?'':s).replace(/\s+/g,'');
// the titles of a sheet -> the field they fill (squashed; a few other spellings)
const SCH_DOC_HEADS={'핵심지표':'kpi','사업성지표':'fin','사업개요':'ov','사업개요표':'rows','입지및전력인프라':'infra','입지및전력':'infra','사업구조및수익모델':'model','사업구조':'model','추진현황및주요특성':'stat','추진현황':'stat',
  '주요리스크및검토사항':'risk','주요리스크':'risk','리스크및검토사항':'risk','추진일정':'plan','출처':'src'};
const SCH_DOC_STATES=['완료','진행','예정','목표'];
const SCH_DOCR_MAX=25*1024*1024;

async function schDocRead(file){ const name=file.name||'', ext=((name.match(/\.([a-z0-9]+)$/i)||[])[1]||'').toLowerCase();
  if(file.size>SCH_DOCR_MAX)throw new Error('25MB 이하의 파일을 선택해주세요.');
  if(ext==='pdf'||file.type==='application/pdf'){ const lib=await schPdfLib(), data=new Uint8Array(await file.arrayBuffer()); let doc;
    try{ doc=await lib.getDocument({data,cMapUrl:'/pdf/cmaps/',cMapPacked:true,isEvalSupported:false}).promise; }catch(e){ throw new Error('PDF를 열지 못했습니다. 암호가 걸렸거나 손상된 파일일 수 있습니다.'); }
    const pages=[]; for(let n=1;n<=Math.min(doc.numPages,150);n++){ const pg=await doc.getPage(n), vp=pg.getViewport({scale:1}), tc=await pg.getTextContent();
      pages.push({w:vp.width,h:vp.height,items:tc.items.filter(i=>i.str&&i.str.trim()).map(i=>({s:schDocFix(i.str).trim(),x:i.transform[4],y:vp.height-i.transform[5],h:i.height||Math.abs(i.transform[3])||0,w:i.width||0})).filter(i=>i.s)}); }
    try{ doc.destroy(); }catch(e){}
    return {name,kind:'pdf',pages}; }
  if(ext==='xlsx'){ const X=await schXlsx(), r=await X.readCells(file); return {name,kind:'xlsx',sheets:r.sheets.map(sh=>({name:sh.name,rows:sh.rows.map(r=>r.map(schDocFix))}))}; }
  if(ext==='json'){ let data=null; try{ data=JSON.parse(await file.text()); }catch(e){ data=null; } return {name,kind:'json',data}; }
  throw new Error('PDF 또는 엑셀(.xlsx) 파일만 올릴 수 있습니다.'); }

/* ---------- a page of a PDF ---------- */
// items that stand on one line, left to right, as one text: a gap is a space, pieces that touch are one word
function schDocJoin(items){ const a=[...items].sort((p,q)=>p.x-q.x); let out=''; a.forEach((it,i)=>{ if(i){ const pv=a[i-1], gap=it.x-(pv.x+pv.w); if(gap>Math.max(1,(it.h||8)*.2)&&!/^[,.:;)\]%]/.test(it.s)&&!/[(\[]$/.test(out))out+=' '; } out+=it.s; }); return out.replace(/\s+/g,' ').trim(); }
const schDocLines=items=>{ const a=[...items].sort((p,q)=>p.y-q.y||p.x-q.x), lines=[]; for(const it of a){ const L=lines[lines.length-1]; if(L&&Math.abs(L.y-it.y)<=Math.max(3,(it.h||8)*.38))L.it.push(it); else lines.push({y:it.y,it:[it]}); } for(const L of lines)L.it.sort((p,q)=>p.x-q.x); return lines; };
// items in several lines that belong to one cell, as one text
const schDocCell=items=>schDocLines(items).map(L=>schDocJoin(L.it)).join(' ').replace(/\s+/g,' ').replace(/\( /g,'(').replace(/ \)/g,')').trim();
// the list of the first pages: every table that has the list's head on this page -> rows
function schDocPdfList(pg){ const rows=[], lines=schDocLines(pg.items), heads=lines.filter(L=>{ const t=L.it.map(i=>schDocSq(i.s)); return t.includes('프로젝트')&&(t.includes('위치')||t.includes('사업주체'))&&t.some(x=>/^NO\.?$/i.test(x)); });
  if(!heads.length)return rows;
  const grpOf=s=>/^SmallAIDC/i.test(schDocSq(s))?'Small AIDC':/^AIDC프로젝트/i.test(schDocSq(s))?'AIDC':null;
  heads.forEach((H,hi)=>{ const y0=H.y+2, nextHead=heads[hi+1], cols=H.it.map(i=>({k:schDocSq(i.s),c:i.x+i.w/2,min:Infinity}));
    // where the table ends: the next head (less the title of its group above it), a note that starts with "*", or the page's foot
    let y1=pg.h; for(const L of lines){ if(L.y<=y0)continue; if(nextHead&&L.y>=nextHead.y-2){y1=Math.min(y1,nextHead.y-2);break;} if(grpOf(schDocJoin(L.it))!==null&&L.it.length<=2){y1=Math.min(y1,L.y-2);break;} if(/^\*/.test(L.it[0].s)){y1=Math.min(y1,L.y-2);break;} }
    let grp=''; for(const L of lines){ if(L.y>=H.y-1)break; const g=grpOf(schDocJoin(L.it)); if(g!==null&&H.y-L.y<60)grp=g; }
    const raw=pg.items.filter(i=>i.y>y0&&i.y<y1), no=cols.findIndex(c=>/^NO\.?$/i.test(c.k)); if(no<0)return;
    const near=x=>{ let b=0; cols.forEach((c,i)=>{ if(Math.abs(c.c-x)<Math.abs(cols[b].c-x))b=i; }); return b; };
    // a row is where a number stands under "NO."; what is further than a row's height below the last number is not the table's (the page's foot)
    const anchors=raw.filter(i=>near(i.x+i.w/2)===no&&/^\d{1,3}$/.test(i.s)).sort((p,q)=>p.y-q.y); if(!anchors.length)return;
    const cells=raw.filter(i=>i.y<=anchors[anchors.length-1].y+34);
    for(const it of cells){ const c=cols[near(it.x+it.w/2)]; c.min=Math.min(c.min,it.x); }
    // a column begins where its leftmost cell begins (a column that is written from the left reaches under the head before it)
    const bound=cols.map((c,i)=>i?Math.min((cols[i-1].c+c.c)/2,c.min-2):-Infinity), colOf=x=>{ let b=0; bound.forEach((v,i)=>{ if(x>=v)b=i; }); return b; };
    const R=anchors.map(a=>({y:a.y,c:cols.map(()=>[])}));
    for(const it of cells){ let b=0; R.forEach((r,i)=>{ if(Math.abs(r.y-it.y)<Math.abs(R[b].y-it.y))b=i; }); if(Math.abs(R[b].y-it.y)>34)continue; R[b].c[colOf(it.x)].push(it); }
    for(const r of R){ const v={}; cols.forEach((c,i)=>{ v[c.k]=schDocCell(r.c[i]); }); const g=k=>{ const key=Object.keys(v).find(x=>x.startsWith(k)); return key?v[key]:''; };
      const name=g('프로젝트'); if(!name)continue;
      rows.push({name,grp,stage:schDocSq(g('추진단계')),first:g('최초자료일'),list:{site:g('위치'),dev:g('사업주체'),area:g('대지면적'),gfa:g('연면적'),load:g('ITLOAD'),memo:g('비고')}}); } });
  return rows; }
// one page that is the sheet of a project -> an entry (or null when the page has none of the sheet's titles)
function schDocPdfSheet(pg){ const heads=pg.items.filter(i=>SCH_DOC_HEADS[schDocSq(i.s)]&&i.s.length<16); if(heads.length<3)return null;
  // columns: where the titles stand (titles less than 40 apart are one column)
  const xs=[...new Set(heads.map(h=>Math.round(h.x)))].sort((a,b)=>a-b), cl=[]; for(const x of xs){ const c=cl[cl.length-1]; if(c&&x-c.max<=40)c.max=x; else cl.push({min:x,max:x}); }
  const bound=cl.map((c,i)=>i?c.min-12:-Infinity), colOf=x=>{ let b=0; bound.forEach((v,i)=>{ if(x>=v)b=i; }); return b; };
  const top=Math.min(...heads.map(h=>h.y)), over=pg.items.filter(i=>i.y<top-4), foot=pg.h-24;
  const blocks=[]; cl.forEach((c,ci)=>{ const mine=pg.items.filter(i=>i.y>=top-4&&i.y<foot&&colOf(i.x)===ci); let cur=null;
    for(const L of schDocLines(mine)){ const h=L.it.find(i=>heads.includes(i));
      if(h){ cur={k:SCH_DOC_HEADS[schDocSq(h.s)],x:h.x,size:h.h,items:L.it.filter(i=>i!==h&&i.x>h.x)}; blocks.push(cur); }
      else if(cur)cur.items.push(...L.it); } });
  const e={name:'',sub:'',stage:'',first:'',asof:'',focus:false,kpi:[],fin:[],finNote:'',ov:'',infra:[],model:'',stat:'',rows:[],plan:[],risk:[],src:[]};
  // the head of the page: the largest words are the name, the smaller ones beside it the sub title; a stage; two dates; 집중 추진
  if(over.length){ const big=[...over].sort((a,b)=>b.h-a.h)[0]; if(big&&big.h>=12){ const line=over.filter(i=>Math.abs(i.y-big.y)<=8); e.name=schDocJoin(line.filter(i=>i.h>=big.h*.92));
      e.sub=schDocJoin(line.filter(i=>i.h<big.h*.92&&i.x>big.x&&!PSTATUS[schDocSq(i.s)])); const st=over.find(i=>PSTATUS[schDocSq(i.s)]); if(st)e.stage=schDocSq(st.s); }
    const flat=schDocSq(over.filter(i=>!big||Math.abs(i.y-big.y)>8).map(i=>i.s).join('')), d=/(\d{4}\.\d{1,2}(?:\.\d{1,2})?)/;
    const f=flat.match(new RegExp('최초자료일?:?'+d.source)), a=flat.match(new RegExp('기준일:?'+d.source)); if(f)e.first=f[1]; if(a)e.asof=a[1]; e.focus=/집중추진/.test(flat); }
  const text=(items,list)=>{ const out=[]; let cur=null; for(const L of schDocLines(items)){ const first=L.it[0].s, bul=/^[•·▪■◦\-–]$/.test(first)||/^[•▪■◦]\s*\S/.test(first), t=schDocJoin(bul&&/^[•·▪■◦\-–]$/.test(first)?L.it.slice(1):L.it).replace(/^[•▪■◦]\s*/,'');
      if(!t)continue; if(bul||cur===null){ cur=t; out.push(cur); } else { cur=out[out.length-1]=(out[out.length-1]+' '+t).replace(/\s+/g,' '); } }
    return list?out:out.join(out.length>1&&list!==false?'\n':' '); };
  const tiles=(items,key)=>{ const all=schDocLines(items).map(l=>({h:Math.max(...l.it.map(i=>i.h)),t:schDocJoin(l.it)})).filter(l=>l.t), cnt={}, out=[]; let note='';
    // a note ("* …") ends the block: it and the lines after it are the note
    const ni=all.findIndex(l=>/^\*/.test(l.t)), L=ni<0?all:all.slice(0,ni); if(ni>=0)note=all.slice(ni).map(l=>l.t).join(' ');
    // a tile is a figure in large type with its caption below in small type: the size most lines have (the smaller on a tie) is the caption's
    for(const l of L){ const h=Math.round(l.h); cnt[h]=(cnt[h]||0)+1; }
    const med=+Object.keys(cnt).sort((p,q)=>cnt[q]-cnt[p]||p-q)[0]||8;
    for(const l of L){ if(l.h>=med*1.3)out.push([l.t,'']); else if(out.length)out[out.length-1][1]=(out[out.length-1][1]+' '+l.t).trim(); }
    if(note&&key==='fin')e.finNote=note; return out; };
  const table=items=>{ const body=items.filter(i=>!['구분','내용'].includes(schDocSq(i.s))||i.h<1), lx=Math.min(...body.map(i=>i.x)), labels=body.filter(i=>i.x<=lx+6).sort((a,b)=>a.y-b.y), vals=body.filter(i=>i.x>lx+6); if(!labels.length)return [];
      // labels that stand right under each other with nothing between them are one label in two lines
      const rows=[]; for(const l of labels){ const p=rows[rows.length-1]; if(p&&l.y-p.y1<=Math.max(11,l.h*1.35)&&!vals.some(v=>v.y>p.y1+1&&v.y<l.y-1)&&p.lone){ p.l.push(l); p.y1=l.y; p.y=(p.y0+p.y1)/2; } else rows.push({l:[l],y:l.y,y0:l.y,y1:l.y,v:[],lone:false}); }
      for(const v of vals){ let b=0; rows.forEach((r,i)=>{ if(Math.abs(r.y-v.y)<Math.abs(rows[b].y-v.y))b=i; }); rows[b].v.push(v); }
      return rows.map(r=>[schDocCell(r.l),schDocCell(r.v)]).filter(r=>r[0]); };
  const plan=items=>{ const body=items.filter(i=>!['시기','내용','상태'].includes(schDocSq(i.s))); if(!body.length)return [];
      // three columns: what happens is written from one left edge (the edge most lines share); the time stands before it, the state far behind it
      const cnt={}; for(const i of body){ const x=Math.round(i.x/2)*2; cnt[x]=(cnt[x]||0)+1; } const lx=Math.min(...body.map(i=>i.x));
      const wx=+Object.keys(cnt).filter(x=>+x>lx+18).sort((p,q)=>cnt[q]-cnt[p]||p-q)[0]||lx+40;
      const whens=body.filter(i=>i.x<wx-4).sort((p,q)=>p.y-q.y), rest=body.filter(i=>i.x>=wx-4), rows=[];
      const open=t=>/[\/~(,]$/.test(t)||(t.match(/\(/g)||[]).length>(t.match(/\)/g)||[]).length;   // "확인 필요 (2025.01 /" goes on in the next line
      for(const w of whens){ const p=rows[rows.length-1]; if(p&&Math.abs(w.y-p.y1)<=3){ p.w.push(w); continue; }
        if(p&&w.y-p.y1<=Math.max(12,w.h*1.5)&&(open(schDocCell(p.w))||/^[(\/~]/.test(w.s))){ p.w.push(w); p.y1=w.y; p.y=(p.y0+p.y1)/2; } else rows.push({w:[w],y:w.y,y0:w.y,y1:w.y,v:[],s:''}); }
      if(!rows.length)return [];
      for(const v of rest){ let b=0; rows.forEach((r,i)=>{ if(Math.abs(r.y-v.y)<Math.abs(rows[b].y-v.y))b=i; }); if(SCH_DOC_STATES.includes(schDocSq(v.s))&&v.x>wx+60)rows[b].s=schDocSq(v.s); else rows[b].v.push(v); }
      return rows.map(r=>[schDocCell(r.w),schDocCell(r.v),r.s||'예정']).filter(r=>r[0]||r[1]); };
  for(const b of blocks){ if(!b.items.length&&b.k!=='src')continue;
    if(b.k==='kpi'||b.k==='fin'){ const t=tiles(b.items,b.k); if(t.length)e[b.k]=t; }
    else if(b.k==='ov'){ if(b.items.some(i=>schDocSq(i.s)==='구분')&&b.items.some(i=>schDocSq(i.s)==='내용')||b.k==='rows'){ const r=table(b.items); if(r.length)e.rows=r; } else if(!e.ov)e.ov=text(b.items,false); else { const r=table(b.items); if(r.length&&!e.rows.length)e.rows=r; } }
    else if(b.k==='rows'){ const r=table(b.items); if(r.length)e.rows=r; }
    else if(b.k==='plan'){ const r=plan(b.items); if(r.length)e.plan=r; }
    else if(b.k==='src'){ const t=text(b.items,false); e.src=t.split(/\s+\/\s+/).map(x=>x.trim()).filter(Boolean); }
    else if(b.k==='model')e.model=text(b.items,false);
    else if(b.k==='stat'){ const t=text(b.items,true); e.stat=t.length>1?t:t.join(' '); }
    else e[b.k]=text(b.items,true); }
  return e; }

/* ---------- a sheet of an Excel file ---------- */
const SCH_DOC_META={'프로젝트':'name','프로젝트명':'name','사업명':'name','부제':'sub','구분':'grp','추진단계':'stage','집중추진':'focus','최초자료일':'first','기준일':'asof','비고':'memo','담당자':'owner',
  '위치(목록)':'site','사업주체(목록)':'dev','대지면적(목록)':'area','연면적(목록)':'gfa','ITLOAD(목록)':'load'};
const schDocYes=v=>{ const s=schDocSq(v).toLowerCase(); return !!s&&!['-','x','n','no','false','아니오','아님','0'].includes(s); };
// a table that has the list's head -> rows (as from a PDF)
function schDocXlsList(rows){ const out=[]; let hr=-1; for(let r=0;r<Math.min(rows.length,40);r++){ const t=rows[r].map(schDocSq); if(t.some(x=>['프로젝트','프로젝트명','사업명'].includes(x))&&t.some(x=>['위치','사업주체','추진단계'].includes(x))){hr=r;break;} } if(hr<0)return out;
  const H=rows[hr].map(schDocSq), col=(...ks)=>H.findIndex(h=>ks.some(k=>h===k||h.startsWith(k))), C={name:col('프로젝트','사업명'),grp:col('구분'),sub:col('부제'),site:col('위치'),dev:col('사업주체'),area:col('대지면적'),gfa:col('연면적'),load:col('ITLOAD'),stage:col('추진단계'),focus:col('집중추진'),first:col('최초자료일'),asof:col('기준일'),memo:col('비고'),owner:col('담당자')};
  let grp=''; for(let r=hr+1;r<rows.length;r++){ const g=i=>i>=0?String(rows[r][i]||'').trim():'', name=g(C.name), filled=rows[r].filter(x=>String(x||'').trim());
    if(filled.length===1&&!name){ const s=schDocSq(filled[0]); grp=/^SmallAIDC/i.test(s)?'Small AIDC':/^AIDC/i.test(s)?'AIDC':grp; continue; }
    if(!name)continue;
    out.push({name,grp:REP_GRPS.includes(g(C.grp))?g(C.grp):grp,sub:g(C.sub),stage:schDocSq(g(C.stage)),focus:C.focus>=0?schDocYes(g(C.focus)):undefined,first:g(C.first),asof:g(C.asof),owner:g(C.owner),list:{site:g(C.site),dev:g(C.dev),area:g(C.area),gfa:g(C.gfa),load:g(C.load),memo:g(C.memo)}}); }
  return out; }
// a sheet that is written downwards: "label | value" lines, then the sheet's titles with their lines below
function schDocXlsSheet(sh){ const e={name:'',sub:'',grp:'',stage:'',first:'',asof:'',owner:'',focus:undefined,list:{},kpi:[],fin:[],finNote:'',ov:'',infra:[],model:'',stat:'',rows:[],plan:[],risk:[],src:[]}; let cur='', seen=0; const ovL=[], modL=[], statL=[];
  for(const row of sh.rows){ const c=row.map(x=>String(x==null?'':x).trim()), f=c.filter(Boolean); if(!f.length)continue; const k0=schDocSq(f[0]);
    if(f.length===1&&SCH_DOC_HEADS[k0]){ cur=SCH_DOC_HEADS[k0]; seen++; continue; }
    if(!cur||SCH_DOC_META[k0]&&f.length<=2&&cur===''){ const m=SCH_DOC_META[k0]; if(m){ const v=f[1]||''; if(m==='focus')e.focus=schDocYes(v); else if(['site','dev','area','gfa','load'].includes(m))e.list[m]=v; else if(m==='memo')e.list.memo=v; else if(m==='stage')e.stage=schDocSq(v); else e[m]=v; } continue; }
    if(cur==='kpi'||cur==='fin'){ if(/^\*/.test(f[0])){ if(cur==='fin')e.finNote=f.join(' '); } else if(!(k0==='값'||k0==='지표'))e[cur].push([f[0],f[1]||'']); }
    else if(cur==='rows'){ if(!(k0==='구분'&&schDocSq(f[1])==='내용'))e.rows.push([f[0],f.slice(1).join(' ')]); }
    else if(cur==='plan'){ if(!(k0==='시기'&&schDocSq(f[1])==='내용')){ const st=f.find(x=>SCH_DOC_STATES.includes(schDocSq(x))); e.plan.push([f[0],f.slice(1).filter(x=>x!==st).join(' '),st?schDocSq(st):'예정']); } }
    else if(cur==='ov')ovL.push(f.join(' ')); else if(cur==='model')modL.push(f.join(' ')); else if(cur==='stat')statL.push(f.join(' '));
    else if(Array.isArray(e[cur]))e[cur].push(f.join(' ').replace(/^[•▪■◦\-–]\s*/,'')); }
  e.ov=ovL.join(' '); e.model=modL.join(' '); e.stat=statL.length>1?statL:statL.join(' ');
  if(!e.name&&seen>=2)e.name=sh.name; return seen>=2||e.name&&(e.kpi.length||e.rows.length)?e:null; }

/* ---------- a document -> the data of the list ---------- */
function schDocToReport(doc){ if(doc.kind==='json'){ const d=doc.data; if(!d||d.kind!==REP_KIND||!Array.isArray(d.projects)||!d.projects.length)return {error:'개발검토 리스트 자료 파일이 아닙니다.'}; return Object.assign({},d,{found:{projects:d.projects.length}}); }
  const list=[], sheets=[]; let asof='';
  if(doc.kind==='pdf'){ let text=0; for(const pg of doc.pages){ text+=pg.items.length; const rows=schDocPdfList(pg); if(rows.length){ list.push(...rows); const flat=schDocSq(pg.items.filter(i=>i.y<60).map(i=>i.s).join('')), a=flat.match(/기준일:?(\d{4}\.\d{1,2}\.\d{1,2})/); if(a&&!asof)asof=a[1]; continue; } const e=schDocPdfSheet(pg); if(e&&e.name)sheets.push(e); }
    if(!text)return {error:'이 PDF에는 글자가 없습니다 (스캔한 그림으로 보입니다). 글자를 선택할 수 있는 PDF나 엑셀 파일을 올려주세요.'}; }
  else for(const sh of doc.sheets){ const rows=schDocXlsList(sh.rows); if(rows.length){ list.push(...rows); continue; } const e=schDocXlsSheet(sh); if(e&&e.name)sheets.push(e); }
  if(!list.length&&!sheets.length)return {error:'문서에서 프로젝트 개요를 찾지 못했습니다. 제목(핵심 지표 · 사업 개요 · 추진 일정 등)이나 목록 표의 머리글(NO. · 프로젝트 · 위치 …)이 그대로 있는 문서여야 합니다.'};
  // one entry per project: the list's row and the project's own sheet, found by the name
  const by=new Map(), key=n=>norm(n).replace(/\s+/g,''), order=[];
  for(const r of list){ const k=key(r.name); if(!by.has(k)){ by.set(k,{name:r.name.replace(/\s+/g,' ').trim()}); order.push(k); } const t=by.get(k); Object.assign(t,{grp:r.grp||t.grp||'',stage:r.stage||t.stage||'',first:r.first||t.first||'',list:Object.assign({},t.list,r.list)}); if(r.sub)t.sub=r.sub; if(r.asof)t.asof=r.asof; if(r.owner)t.owner=r.owner; if(r.focus!==undefined)t.focus=r.focus; }
  for(const s of sheets){ const k=key(s.name); if(!by.has(k)){ by.set(k,{name:s.name.replace(/\s+/g,' ').trim()}); order.push(k); } const t=by.get(k), l=Object.assign({},t.list); for(const [a,b] of Object.entries(s.list||{}))if(b)l[a]=b;
    for(const f of ['sub','asof','owner','finNote','ov','model'])if(s[f])t[f]=s[f]; if(s.first&&!t.first)t.first=s.first; if(s.grp&&REP_GRPS.includes(s.grp))t.grp=s.grp; if(s.stage)t.stage=s.stage; if(s.focus!==undefined)t.focus=!!s.focus||!!t.focus; t.list=l;   // (최초자료일: the list's own cell first — it may say "수신")
    for(const f of ['kpi','fin','rows','plan','infra','risk','src'])if(s[f]&&s[f].length)t[f]=s[f]; if(s.stat&&s.stat.length)t.stat=s.stat; t.sheet=true; }
  const projects=order.map(k=>by.get(k)).map(t=>Object.assign({grp:'',focus:false,sub:'',stage:'',first:'',asof:'',list:{},kpi:[],fin:[],finNote:'',ov:'',infra:[],model:'',stat:'',rows:[],plan:[],risk:[],src:[]},t,{stage:PSTATUS[t.stage]?t.stage:''}));
  return {kind:REP_KIND,v:1,asof,projects,noRest:true,found:{projects:projects.length,list:list.length,sheets:sheets.length}}; }
// what one entry holds, in a few words (for the windows)
function schDocSays(p){ const a=[]; if(p.kpi&&p.kpi.length)a.push(`핵심 지표 ${p.kpi.length}`); if(p.fin&&p.fin.length)a.push(`사업성 지표 ${p.fin.length}`); const tx=['ov','infra','model','stat','risk'].filter(k=>p[k]&&p[k].length).length; if(tx)a.push(`본문 ${tx}개 항목`);
  if(p.rows&&p.rows.length)a.push(`개요 표 ${p.rows.length}행`); if(p.plan&&p.plan.length)a.push(`추진 일정 ${p.plan.length}건`); const l=p.list||{}, n=['site','dev','area','gfa','load','memo'].filter(k=>l[k]).length; if(n)a.push(`목록 값 ${n}칸`); return a.join(' · ')||'이름만'; }

/* ---------- the field a file is let go on (the look of the Excel upload window) ---------- */
// One field: {file, reading, doc, rep, err}. host is the element the field is drawn in; change() is called whenever it changed.
function schDocField(host,state,change,hint){ const draw=()=>{ const f=state.file, r=state.rep;
    host.innerHTML=`<label class="up-drop ${f?'has':''} ${state.err?'bad':''}" data-docdrop tabindex="0"><input type="file" data-docfile accept=".pdf,.xlsx,.json,application/pdf,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" hidden>${f?`<span class="up-top">${svg('i-sch-fup',14,14)}<span class="nm" title="${esc(f.name)}">${esc(f.name)}</span><span class="sz">${fmtSize(f.size)}</span>${state.reading?'<span class="rd">읽는 중…</span>':''}<button type="button" class="rm" data-docrm title="이 파일 빼기" aria-label="이 파일 빼기">${svg('i-x',9,9)}</button></span>${r&&!r.error?`<span class="up-tags"><span>프로젝트<b>${r.projects.length}</b></span>${r.projects.length===1?`<span>${esc(schDocSays(r.projects[0]))}</span>`:''}</span>`:''}`
      :`${schUpFolder(64,50)}<span>${esc(hint||'PDF 또는 엑셀 문서를 여기에 끌어다 놓거나 눌러서 선택')}</span>`}</label>${state.err?`<div class="up-nt err">${esc(state.err)}</div>`:''}`; };
  const take=async f=>{ if(!f)return; const run=state.run=(state.run||0)+1; Object.assign(state,{file:f,reading:true,doc:null,rep:null,err:''}); draw(); change();
    try{ const doc=await schDocRead(f); if(state.run!==run)return; const rep=schDocToReport(doc); state.doc=doc; if(rep.error){ state.err=rep.error; state.rep=null; } else state.rep=rep; }
    catch(e){ if(state.run!==run)return; state.err=String(e&&e.message||e); }
    state.reading=false; draw(); change(); };
  host.addEventListener('change',e=>{ const t=e.target; if(t&&t.matches&&t.matches('[data-docfile]')){ const f=t.files&&t.files[0]; t.value=''; take(f); } });
  host.addEventListener('click',e=>{ const x=e.target.closest&&e.target.closest('[data-docrm]'); if(!x)return; e.preventDefault(); e.stopPropagation(); state.run=(state.run||0)+1; Object.assign(state,{file:null,reading:false,doc:null,rep:null,err:''}); draw(); change(); });
  host.addEventListener('keydown',e=>{ if(e.key==='Enter'&&e.target&&e.target.matches&&e.target.matches('[data-docdrop]')){ e.preventDefault(); e.target.click(); } });
  const over=on=>{ const z=host.querySelector('[data-docdrop]'); if(z)z.classList.toggle('over',on); };
  host.addEventListener('dragover',e=>{ e.preventDefault(); over(true); }); host.addEventListener('dragleave',()=>over(false));
  host.addEventListener('drop',e=>{ e.preventDefault(); over(false); const f=e.dataTransfer&&e.dataTransfer.files&&e.dataTransfer.files[0]; take(f); });
  draw(); return {draw,take}; }

/* ---------- "개요 업로드" on a project page: the document fills this project's overview ---------- */
// What the document has goes in; what it does not say stays as it is. The project keeps its name, its schedule, its people.
function schDocApplyTo(pid,entry){ const x=schRepNorm(entry), p=PROJECTS[pid], h=headOf(pid), before={head:copy(PHEAD[pid]),proj:copy(p)}, has=v=>Array.isArray(v)?v.length>0:typeof v==='string'?!!v.trim():false; let n=0;
  for(const [k,v] of Object.entries(x.head)){ if(k==='focus'){ if(v&&!h.focus){h.focus=true;n++;} continue; } if(has(v)){ if(JSON.stringify(h[k])!==JSON.stringify(v))n++; h[k]=copy(v); } }
  if(x.stage&&PSTATUS[x.stage]&&normStatus(p.status)!==x.stage){ applyProjectStatus(pid,x.stage); n++; }
  schRepMirror(h,p); if(has(x.head.lgfa)){ p.area=h.lgfa; } if(has(x.head.lload))p.it=h.lload; p.site=h.loc||p.site; p.cost=h.cost||p.cost;
  return {n,undo:()=>{ PHEAD[pid]=before.head; Object.assign(PROJECTS[pid],before.proj); render(true); }}; }
function schDocOpen(pid){ if(!PROJECTS[pid]||$('#dlg'))return; if(S.editProj){ toast('사업개요를 수정하는 중에는 올릴 수 없습니다. 먼저 저장하거나 취소해 주세요.',4200); return; }
  closePop(); const d=document.createElement('div'); d.id='dlg'; d.className='dlg sch-dlg sch-up sch-docup'; const st={}; let pick=0;
  d.innerHTML=`<div class="box" role="dialog" aria-modal="true" aria-label="개요 업로드"><h3 class="up-ttl">개요 업로드</h3><p class="up-sub">PDF 또는 엑셀 문서의 내용으로 이 프로젝트의 사업개요를 채웁니다 · 처음 채울 때와 고칠 때 모두 씁니다</p><div data-docfield></div><div data-docres></div>
    <div class="bt"><button data-doc="x">닫기</button><button data-doc="ok" class="pri" disabled>적용</button></div></div>`;
  document.body.appendChild(d); const res=d.querySelector('[data-docres]'), ok=d.querySelector('[data-doc="ok"]');
  const chosen=()=>st.rep&&st.rep.projects[pick];
  const change=()=>{ const r=st.rep; if(!r){ res.innerHTML=''; ok.disabled=true; return; } const me=norm(PROJECTS[pid].full).replace(/\s+/g,''), i=r.projects.findIndex(p=>norm(p.name).replace(/\s+/g,'')===me); if(i>=0&&!st.picked)pick=i; if(pick>=r.projects.length)pick=0;
    const p=r.projects[pick], other=norm(p.name).replace(/\s+/g,'')!==me;
    res.innerHTML=`<div class="up-res"><h4>이 프로젝트에 반영되는 내용</h4>${r.projects.length>1?`<div class="up-row"><span>문서의 프로젝트</span><b></b><em><select data-docpick>${r.projects.map((q,j)=>`<option value="${j}" ${j===pick?'selected':''}>${esc(q.name)}</option>`).join('')}</select></em></div>`:''}
      <div class="up-row"><span>읽은 내용</span><b></b><em>${esc(schDocSays(p))}</em></div>${p.stage?`<div class="up-row"><span>추진 단계</span><b></b><em>${esc(p.stage)}</em></div>`:''}
      ${other?`<p class="up-wn">문서의 사업명은 “${esc(p.name)}”입니다. 이 프로젝트의 이름(${esc(PROJECTS[pid].full)})은 그대로 둡니다.</p>`:''}<p class="up-ft">문서에 있는 항목만 바뀝니다. 문서에 없는 항목, 일정 · 액션 · 미팅 · 담당자 · 협력업체는 그대로 둡니다. 적용한 뒤에도 되돌릴 수 있습니다.</p></div>`;
    ok.disabled=!!st.reading; };
  schDocField(d.querySelector('[data-docfield]'),st,change);
  const close=()=>{ st.run=(st.run||0)+1; d.remove(); };
  d.addEventListener('change',e=>{ const s=e.target.closest&&e.target.closest('[data-docpick]'); if(s){ pick=+s.value||0; st.picked=true; change(); } });
  d.addEventListener('click',e=>{ const a=e.target.closest&&e.target.closest('[data-doc]'); if(e.target===d||(a&&a.dataset.doc==='x')){ e.stopPropagation(); close(); return; } if(!a||a.dataset.doc!=='ok')return; e.stopPropagation(); const p=chosen(); if(!p||!PROJECTS[pid])return;
    const r=schDocApplyTo(pid,p); close(); render(true); toast(r.n?`문서 내용을 사업개요에 반영했습니다 · ${schDocSays(p)}`:'문서 내용이 지금 사업개요와 같습니다. 바뀐 것이 없습니다.',6000,r.n?{t:'되돌리기',fn:r.undo,keep:true}:undefined); });
  d.addEventListener('keydown',e=>{ if(e.key==='Escape'){ e.stopPropagation(); close(); } }); }
