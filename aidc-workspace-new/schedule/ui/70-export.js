// Eighth round (owner, 2026-11-20): a content panel can be handed out as a Word file or as a PDF, laid out like the company's
// report sheet (the owner's sample): a grey line at the top right (who · Rev. Date), the title in bold with a rule below, numbered
// sections with their orange heading in a left column and the text in a right column, tables with a grey head and thin grey
// lines, the logo at the foot on the left and "page / pages" on the right.
// One model of the document (schExpModel) is written out twice: as a .docx (schExpDocx: WordprocessingML put into a zip by hand,
// nothing is loaded for it) and as a page for the browser's print window, where "PDF로 저장" makes the PDF (schExpPrint).
(function(){ const s=document.createElementNS('http://www.w3.org/2000/svg','svg'); s.setAttribute('style','position:absolute;width:0;height:0;overflow:hidden'); s.setAttribute('aria-hidden','true');
  s.innerHTML='<symbol id="i-sch-exp2" viewBox="0 0 24 24"><path d="M12 15.2V3.4M7.6 7.6L12 3.2l4.4 4.4M4.2 13.6v5.1a1.9 1.9 0 0 0 1.9 1.9h11.8a1.9 1.9 0 0 0 1.9-1.9v-5.1" fill="none" stroke="currentColor" stroke-width="1.65" stroke-linecap="round" stroke-linejoin="round"/></symbol>'
   +'<symbol id="i-sch-exp" viewBox="0 0 24 24"><path d="M12 15.2V3.4M7.6 7.6L12 3.2l4.4 4.4M4.2 13.6v5.1a1.9 1.9 0 0 0 1.9 1.9h11.8a1.9 1.9 0 0 0 1.9-1.9v-5.1" fill="none" stroke="currentColor" stroke-width="1.8"/></symbol>'
   +'<symbol id="i-sch-fup" viewBox="0 0 16 16"><path d="M2.8 1.6h6.8l3.6 3.6v9.2H2.8zM9.4 1.8v3.6H13M8 12.4V7.6M5.9 9.6L8 7.5l2.1 2.1" fill="none" stroke="currentColor" stroke-width="1.2"/></symbol>'
   +'<symbol id="i-sch-fdn" viewBox="0 0 16 16"><path d="M2.8 1.6h6.8l3.6 3.6v9.2H2.8zM9.4 1.8v3.6H13M8 7.6v4.8M5.9 10.4L8 12.5l2.1-2.1" fill="none" stroke="currentColor" stroke-width="1.2"/></symbol>'
   +'<symbol id="i-sch-xls" viewBox="0 0 16 16"><path d="M2.2 1.6h8.2l3.4 3.4v9.4H2.2zM10.2 1.8v3.4h3.4M5.2 8l3.6 4.4M8.8 8l-3.6 4.4" fill="none" stroke="currentColor" stroke-width="1.2"/></symbol>';
  document.body.appendChild(s); })();
const schExpBtn=()=>`<button type="button" class="iexp" data-ed="export" title="내보내기 (Word · PDF)" aria-label="내보내기" aria-haspopup="menu">${svg('i-sch-exp',24,24)}</button>`;
function schExportMenu(it,anchor){ menuPop(anchor,[{hd:'내보내기 · 보고서 양식'},{t:'Word 문서 (.docx)',k:'docx',fn:()=>schExport(it,'docx')},{t:'PDF (인쇄 창에서 ‘PDF로 저장’)',k:'pdf',fn:()=>schExport(it,'pdf')}]); }
async function schExport(it,kind){ try{ const doc=schExpModel(it); if(kind==='docx'){ toast('Word 문서를 만드는 중입니다…',8000); const blob=await schExpDocx(doc); schExpSave(doc.file+'.docx',blob); toast('Word 문서를 내려받았습니다.',2600); } else schExpPrint(doc); }
  catch(e){ toast('내보내지 못했습니다: '+String(e&&e.message||e),4200); } }
function schExpSave(name,blob){ const a=document.createElement('a'); a.href=URL.createObjectURL(blob); a.download=name; a.addEventListener('click',e=>e.stopPropagation()); document.body.appendChild(a); a.click(); a.remove(); setTimeout(()=>URL.revokeObjectURL(a.href),6000); }

/* ---------- the document as data ---------- */
// {file, head, title:[lines], label, sections:[{h, blocks:[{k:'p',runs:[{t,b,i,s,u}],ind} | {k:'tbl',head:[..],rows:[[..]],widths:[..]} | {k:'img',src,name}]}]}
function schExpModel(it){ const tab=archTabOf(it), p=PROJECTS[it.proj], own=typeof schOwn==='function'&&schOwn(it), names=l=>(l||[]).map(userName).filter(Boolean).join(', ');
  const title=String(it.title||'').split('\n').map(x=>x.trim()).filter(Boolean); if(!title.length)title.push('제목 없음'); if(title.length>2)title.splice(1,title.length-1,title.slice(1).join(' '));
  const md=modDate(it), rev=(md?localDate(md.toISOString()):'')||it.date||TODAY, rows=[], add=(k,v)=>{v=String(v==null?'':v).replace(/\s+/g,' ').trim(); if(v)rows.push([k,v]);};
  const D=d=>d?dateDot(d):'', range=(a,b)=>a?(b&&b>a?D(a)+' ~ '+D(b):D(a)):'', sections=[];
  if(it.type==='meeting'){ const mp=meetParts(it); add('사업명',p?p.full:''); add('일자 · 장소',[range(it.date,itemEnd(it)),meetTimeTxt(mp.time),mp.place].filter(Boolean).join(' · ')); add('주요안건',mp.agenda); add('협력업체',it.partner); add('참석자 (선진)',names(it.people)); add('상대 참여자',mp.guests);
    add(ACT,(it.actions||[]).map(id=>item(id)).filter(Boolean).map(x=>oneLine(x.title)).join(', ')); add('리서치',(it.research||[]).map(id=>item(id)).filter(Boolean).map(x=>oneLine(x.title)).join(', ')); add('URL',it.url); }
  else if(own){ const m=schModel(it.proj), t=m.byId.get(it.task), r=m.res.tasks[t.id], g=m.phases.find(x=>x.code===t.phase), ms=t.kind==='milestone';
    add('사업명',p?p.full:''); add('WBS',schNo(t)); add('개발 단계',g?schPhaseLabel(g):''); add('예상 기한',ms?D(r.start):range(r.start,r.finish)); add('관리일정',ms?D(t.plannedStart):range(t.plannedStart,t.plannedFinish)); add('실제 기한',range(t.actualStart,t.actualFinish));
    add('상태',schStatus(t)); add('중요도',priTxt[schPri(m,t)]); add('담당자',names(schPeople(t))||'미지정'); add('마일스톤',ms?'예':''); add('운영개시 여유',r.slack===null?'':r.slack+'일'); add('완료 기준',t.criteria); add('조건 · 확약',t.conditions); add('증빙',t.evidence); add('URL',t.url);
    const rel=[]; for(const e of m.pred.get(t.id)){const o=m.byId.get(e.from);rel.push(['선행',schTaskTitle(o),e.type,e.lag?e.lag+'일':'-',e.active?'':'미사용']);} for(const e of m.succ.get(t.id)){const o=m.byId.get(e.to);rel.push(['후행',schTaskTitle(o),e.type,e.lag?e.lag+'일':'-',e.active?'':'미사용']);}
    if(rel.length)sections.push({h:'선후 관계',blocks:[{k:'tbl',head:['구분','업무','유형','간격','비고'],rows:rel,widths:[800,4100,700,800,800]}]}); }
  else if(it.type==='action'){ const m=p&&schReady(it.proj)?schModel(it.proj):null, t=m&&it.task?m.byId.get(it.task):null, g=m?m.phases.find(x=>x.code===(t?t.phase:it.phase)):null;
    add('사업명',p?p.full:''); add('예상 기한',range(it.date,itemEnd(it))); add('실제 기한',range(it.actualStart,it.actualFinish)); add('개발 단계',[g?schPhaseLabel(g):'',t?schTaskTitle(t):''].filter(Boolean).join(' › ')); add('마일스톤',it.ms?'예':'');
    add('담당자',names(it.people)||'미지정'); add('상태',schItemSt(it)); add('중요도',priTxt[it.pri||'mid']); add('참고 자료',(it.refs||[]).map(id=>item(id)).filter(Boolean).map(x=>oneLine(x.title)).join(', ')); add('URL',it.url); }
  else { if(tab)add('자료실 구분',tab); add('날짜',range(it.date,itemEnd(it))); add('담당자',names(it.people)); add('상태',it.st==='done'?'완료':'진행'); add('중요도',priTxt[it.pri||'mid']); add(tab?'출처 URL':'URL',it.url); }
  add('최종 수정',md?fmtStamp(md):'');
  sections.unshift({h:'개요',blocks:[{k:'tbl',head:['항목','내용'],rows,widths:[1900,5300]}]});
  for(const s of schExpBody(bodyHtml(it)))sections.push(s);
  const cm=(it.comments||[]).filter(c=>c&&c.text); if(cm.length)sections.push({h:'댓글',blocks:[{k:'tbl',head:['작성자','내용','시각'],rows:cm.map(c=>[c.authorId?userName(c.authorId):(c.who||''),String(c.text||''),c.ts?fmtStamp(new Date(c.ts)):(c.at||'')]),widths:[1300,4500,1400]}]});
  sections.forEach((s,i)=>{s.h=`${i+1}. ${s.h}`;});
  const safe=oneLine(it.title).replace(/[\\/:*?"<>|]+/g,' ').replace(/\s+/g,' ').trim().slice(0,60)||'문서';
  return {file:`${safe}_${rev.replace(/-/g,'')}`,head:`${SETTINGS.org||SETTINGS.wsName||'AIDC WorkSpace'}  Rev. Date: ${D(rev)}`,title,label:[typeName(it),!freeResearch(it)&&p&&!tab?p.full:''].filter(Boolean).join('  |  '),sections}; }
// The body (what the editor stores, or an older plain text) as sections: a heading starts one; so does a short line that is nothing
// but a title in square brackets ("[구조]"). Lists, to-dos, quotes, code, tables, pictures and attached files are kept as what they are.
function schExpBody(html){ const root=document.createElement('div'); root.innerHTML=html||''; const out=[]; let cur=null; const sec=h=>{cur={h:h||'내용',blocks:[]};out.push(cur);return cur;}, blocks=()=>(cur||sec('내용')).blocks;
  const runsOf=node=>{ const rs=[]; const walk=(n,st)=>{ if(n.nodeType===3){ const t=n.nodeValue.replace(/[ \t\r\f]+/g,' '); if(t)for(const [i,part] of t.split('\n').entries()){ if(i)rs.push({br:1}); if(part)rs.push({t:part,...st}); } return; } if(n.nodeType!==1)return; const g=n.tagName;
      if(g==='BR'){rs.push({br:1});return;} if(g==='IMG'||g==='SVG'||g==='BUTTON'||g==='STYLE'||g==='SCRIPT')return; const s2={...st}; if(g==='B'||g==='STRONG')s2.b=1; if(g==='I'||g==='EM')s2.i=1; if(g==='S'||g==='DEL'||g==='STRIKE')s2.s=1; if(g==='U')s2.u=1; for(const ch of n.childNodes)walk(ch,s2); }; walk(node,{}); return rs; };
  const txt=rs=>rs.map(x=>x.t||'').join('').trim();
  const para=(rs,o={})=>{ let line=[]; const flush=()=>{ if(txt(line)){ const t=txt(line); if(!o.pre&&!o.ind&&/^\[[^\[\]]{1,30}\]$/.test(t)&&!o.mark){sec(t.slice(1,-1));} else blocks().push({k:'p',runs:(o.mark?[{t:o.mark}]:[]).concat(line),ind:o.ind||0,pre:o.pre,...(!o.mark&&!o.ind&&!o.pre?{_t:t,_b:line.length>0&&line.every(r=>r.b)}:{})}); o.mark=o.mark?'   ':''; } line=[]; }; for(const r of rs){ if(r.br)flush(); else line.push(r); } flush(); };
  const isBlock=n=>n.nodeType===1&&/^(P|DIV|H[1-6]|UL|OL|LI|TABLE|BLOCKQUOTE|PRE|HR|SECTION|ARTICLE|FIGURE|DETAILS|SUMMARY)$/.test(n.tagName);
  const cellText=td=>txt(runsOf(td))||td.textContent.replace(/\s+/g,' ').trim();
  const walk=(n,ind)=>{ if(n.nodeType===3){ if(n.nodeValue.trim())para(runsOf(n),{ind}); return; } if(n.nodeType!==1)return; const g=n.tagName;
    if(/^H[1-6]$/.test(g)){ const t=n.textContent.replace(/\s+/g,' ').trim(); if(t)sec(t); return; }
    if(g==='UL'||g==='OL'){ let k=0; for(const li of n.children){ if(li.tagName!=='LI')continue; k++; const todo=li.hasAttribute('data-checked')?(li.getAttribute('data-checked')==='true'?'☑ ':'☐ '):'', mark=todo||(g==='OL'?k+'. ':'• '); const inline=document.createElement('span'), nested=[];
          for(const ch of [...li.childNodes]){ if(ch.nodeType===1&&(ch.tagName==='UL'||ch.tagName==='OL'))nested.push(ch); else if(ch.nodeType===1&&ch.tagName==='LABEL')continue; else inline.appendChild(ch.cloneNode(true)); }
          para(runsOf(inline),{ind:ind+1,mark}); for(const sub of nested)walk(sub,ind+1); } return; }
    if(g==='TABLE'){ const trs=[...n.querySelectorAll('tr')].map(tr=>[...tr.children].filter(c=>c.tagName==='TD'||c.tagName==='TH')), cols=Math.max(0,...trs.map(r=>r.length)); if(!cols)return; const hasTh=trs[0].some(c=>c.tagName==='TH'), rows=trs.map(r=>{const a=r.map(cellText);while(a.length<cols)a.push('');return a;});
      blocks().push({k:'tbl',head:hasTh?rows.shift():null,rows,widths:Array(cols).fill(Math.floor(7200/cols))}); return; }
    if(g==='PRE'){ for(const line of n.textContent.replace(/\r/g,'').split('\n'))if(line.trim())blocks().push({k:'p',runs:[{t:line}],ind:ind+1,pre:1}); return; }
    if(g==='BLOCKQUOTE'){ for(const ch of n.childNodes)walk(ch,ind+1); return; }
    if(g==='IMG'){ const src=n.getAttribute('src')||''; if(src)blocks().push({k:'img',src,name:n.getAttribute('alt')||''}); return; }
    if(g==='A'&&(n.classList.contains('file')||n.hasAttribute('download'))){ const nm=n.getAttribute('data-name')||n.textContent.replace(/\s+/g,' ').trim(); if(nm)blocks().push({k:'p',runs:[{t:'첨부: '+nm}],ind}); return; }
    if(g==='HR'||g==='BUTTON'||g==='STYLE'||g==='SCRIPT'||g==='SVG')return;
    if([...n.childNodes].some(isBlock)||n.querySelector('img,table,a.file')){ for(const ch of n.childNodes)walk(ch,ind); return; }
    para(runsOf(n),{ind}); };
  for(const ch of root.childNodes)walk(ch,0);
  return schExpHeads(out).filter(s=>s.blocks.length); }
// Which lines are headings is read from the content (owner, 2026-11-23), not only from a marker. Besides a real heading of the
// editor and a line in square brackets, a short line that reads like a title starts a section: all bold, or ending in a colon, or
// starting with a heading mark or a number, or simply short and followed by a list, a table or a long paragraph. Never a line that
// ends like a sentence, a "name: value" line, a list line, or a line with nothing under it.
const SCH_EXP_MARK=/^(?:[■□▶▷◆◇●○▣◎★☆#]+\s*|제\s*\d+\s*[장절항]\s*|[ⅠⅡⅢⅣⅤⅥⅦⅧⅨⅩ]+[.)]\s*|\d{1,2}[.)]\s+|\(\d{1,2}\)\s*|[가나다라마바사아자차카타파하][.)]\s+)/;
const SCH_EXP_SENT=/[.!?。]$|(니다|한다|된다|있다|없다|이다|였다|했다|됐다|해요|예요|세요|까요)$/;
function schExpHeadScore(b,next){ const t=b&&b.k==='p'?b._t:''; if(!t||!next||t.length>32||/^[-•·※*–—>]/.test(t))return 0; const bare=t.replace(/[:：]$/,'');
  if(!b._b&&(SCH_EXP_SENT.test(bare)||/[:：]\s*\S/.test(t)||/[,，]$/.test(t)))return 0;
  let s=0; if(b._b)s+=2; if(/[:：]$/.test(t))s+=2; if(SCH_EXP_MARK.test(t))s+=1; if(t.length<=16)s+=1;
  if(next.k==='tbl'||(next.k==='p'&&(next.ind||next.pre||String(next._t||'').length>=40)))s+=1; return s; }
function schExpHeads(secs){ const res=[]; for(const s of secs){ let cur={h:s.h,blocks:[]}; res.push(cur);
    for(let i=0;i<s.blocks.length;i++){ const b=s.blocks[i], nx=s.blocks[i+1];
      if(schExpHeadScore(b,nx)>=2&&schExpHeadScore(nx,s.blocks[i+2])<2){ cur={h:b._t.replace(/[:：]$/,'').replace(/^[■□▶▷◆◇●○▣◎★☆#]+\s*/,'').trim()||b._t,blocks:[]}; res.push(cur); } else cur.blocks.push(b); } }
  return res; }

/* ---------- Word ---------- */
const schX=s=>String(s==null?'':s).replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\uFFFE\uFFFF]/g,'').replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const schCrcT=(()=>{const t=new Uint32Array(256);for(let n=0;n<256;n++){let c=n;for(let k=0;k<8;k++)c=c&1?0xEDB88320^(c>>>1):c>>>1;t[n]=c>>>0;}return t;})();
const schCrc=u=>{let c=0xFFFFFFFF;for(let i=0;i<u.length;i++)c=schCrcT[(c^u[i])&255]^(c>>>8);return (c^0xFFFFFFFF)>>>0;};
// a zip without compression (what a .docx is): local headers, the files, the central directory
function schZip(files,type){ const enc=new TextEncoder(), parts=[], cen=[]; let off=0;
  for(const f of files){ const nm=enc.encode(f.name), data=typeof f.data==='string'?enc.encode(f.data):f.data, crc=schCrc(data), n=data.length, lh=new DataView(new ArrayBuffer(30)), ch=new DataView(new ArrayBuffer(46));
    lh.setUint32(0,0x04034b50,true); lh.setUint16(4,20,true); lh.setUint16(6,0x0800,true); lh.setUint16(12,0x21,true); lh.setUint32(14,crc,true); lh.setUint32(18,n,true); lh.setUint32(22,n,true); lh.setUint16(26,nm.length,true);
    ch.setUint32(0,0x02014b50,true); ch.setUint16(4,20,true); ch.setUint16(6,20,true); ch.setUint16(8,0x0800,true); ch.setUint16(14,0x21,true); ch.setUint32(16,crc,true); ch.setUint32(20,n,true); ch.setUint32(24,n,true); ch.setUint16(28,nm.length,true); ch.setUint32(42,off,true);
    parts.push(new Uint8Array(lh.buffer),nm,data); cen.push(new Uint8Array(ch.buffer),nm); off+=30+nm.length+n; }
  const cs=cen.reduce((a,b)=>a+b.length,0), end=new DataView(new ArrayBuffer(22)); end.setUint32(0,0x06054b50,true); end.setUint16(8,files.length,true); end.setUint16(10,files.length,true); end.setUint32(12,cs,true); end.setUint32(16,off,true);
  return new Blob([...parts,...cen,new Uint8Array(end.buffer)],{type}); }
const SCH_DOC={w:9889,left:2689,right:7200,text:10319,orange:'E36C0A',line:'BFBFBF',head:'F2F2F2',ink:'222222',grey:'7F7F7F'};
// a picture of the body or the logo, as bytes with its size (png / jpeg / gif only; anything else is named in words)
async function schExpImage(src){ try{ const r=await fetch(src,{credentials:'same-origin'}); if(!r.ok)return null; const blob=await r.blob(), type=blob.type, ext=type==='image/png'?'png':type==='image/jpeg'?'jpeg':type==='image/gif'?'gif':''; if(!ext||blob.size>4e6)return null;
    const data=new Uint8Array(await blob.arrayBuffer()), u=URL.createObjectURL(blob), dim=await new Promise(ok=>{const im=new Image();im.onload=()=>ok([im.naturalWidth,im.naturalHeight]);im.onerror=()=>ok(null);im.src=u;}); URL.revokeObjectURL(u); return dim&&dim[0]?{data,ext,w:dim[0],h:dim[1]}:null; }catch(e){ return null; } }
async function schExpDocx(doc){ const C=SCH_DOC, media=[], rels=[]; let rid=10;
  const rpr=(o={})=>`<w:rPr>${o.b?'<w:b/><w:bCs/>':''}${o.i?'<w:i/><w:iCs/>':''}${o.s?'<w:strike/>':''}<w:color w:val="${o.color||C.ink}"/><w:sz w:val="${o.sz||20}"/><w:szCs w:val="${o.sz||20}"/>${o.u?'<w:u w:val="single"/>':''}</w:rPr>`;
  const run=(t,o)=>`<w:r>${rpr(o)}<w:t xml:space="preserve">${schX(t)}</w:t></w:r>`;
  const body=(runs,o={})=>`<w:p><w:pPr><w:snapToGrid w:val="0"/><w:spacing w:before="${o.cell?4:0}" w:after="${o.cell?4:0}" w:line="250" w:lineRule="exact"/>${o.ind?`<w:ind w:left="${o.ind*240}"/>`:''}<w:jc w:val="${o.center?'center':'both'}"/></w:pPr>${runs.map(r=>run(r.t,{b:r.b||o.b,i:r.i,s:r.s,u:r.u})).join('')}</w:p>`;
  const spacer=h=>`<w:p><w:pPr><w:snapToGrid w:val="0"/><w:spacing w:before="0" w:after="0" w:line="${h}" w:lineRule="exact"/><w:rPr><w:sz w:val="4"/><w:szCs w:val="4"/></w:rPr></w:pPr></w:p>`;
  const nil='<w:tblBorders><w:top w:val="nil"/><w:left w:val="nil"/><w:bottom w:val="nil"/><w:right w:val="nil"/><w:insideH w:val="nil"/><w:insideV w:val="nil"/></w:tblBorders>';
  const row2=(heading,inner)=>`<w:tbl><w:tblPr><w:tblW w:w="${C.w}" w:type="dxa"/>${nil}<w:tblLayout w:type="fixed"/><w:tblCellMar><w:left w:w="0" w:type="dxa"/><w:right w:w="0" w:type="dxa"/></w:tblCellMar></w:tblPr><w:tblGrid><w:gridCol w:w="${C.left}"/><w:gridCol w:w="${C.right}"/></w:tblGrid><w:tr><w:tc><w:tcPr><w:tcW w:w="${C.left}" w:type="dxa"/></w:tcPr><w:p><w:pPr><w:keepNext/><w:snapToGrid w:val="0"/><w:spacing w:line="264" w:lineRule="auto"/></w:pPr>${heading?run(heading,{b:1,color:C.orange,sz:21}):''}</w:p></w:tc><w:tc><w:tcPr><w:tcW w:w="${C.right}" w:type="dxa"/></w:tcPr>${inner||body([{t:''}])}</w:tc></w:tr></w:tbl>`;
  const bd=k=>`<w:${k} w:val="single" w:sz="4" w:space="0" w:color="${C.line}"/>`;
  const table=b=>{ const cols=Math.max(b.head?b.head.length:0,...b.rows.map(r=>r.length)); let ws=(b.widths||[]).slice(0,cols); while(ws.length<cols)ws.push(Math.floor(C.right/cols)); const sum=ws.reduce((a,x)=>a+x,0); ws=ws.map(x=>Math.round(x*C.right/sum));
    const cell=(t,i,hd)=>`<w:tc><w:tcPr><w:tcW w:w="${ws[i]}" w:type="dxa"/>${hd?`<w:shd w:val="clear" w:color="auto" w:fill="${C.head}"/>`:''}<w:vAlign w:val="center"/></w:tcPr>${String(t==null?'':t).split('\n').map(line=>body([{t:line}],{cell:1,center:hd,b:hd})).join('')}</w:tc>`;
    const tr=(r,hd)=>`<w:tr>${hd?'<w:trPr><w:tblHeader/></w:trPr>':''}${Array.from({length:cols},(_,i)=>cell(r[i],i,hd)).join('')}</w:tr>`;
    return `<w:tbl><w:tblPr><w:tblW w:w="${C.right}" w:type="dxa"/><w:tblInd w:w="${C.left}" w:type="dxa"/><w:tblBorders>${['top','left','bottom','right','insideH','insideV'].map(bd).join('')}</w:tblBorders><w:tblLayout w:type="fixed"/><w:tblCellMar><w:left w:w="70" w:type="dxa"/><w:right w:w="70" w:type="dxa"/></w:tblCellMar></w:tblPr><w:tblGrid>${ws.map(x=>`<w:gridCol w:w="${x}"/>`).join('')}</w:tblGrid>${b.head?tr(b.head,true):''}${b.rows.map(r=>tr(r,false)).join('')}</w:tbl>`; };
  const drawing=(id,name,cx,cy)=>`<w:r><w:drawing><wp:inline distT="0" distB="0" distL="0" distR="0"><wp:extent cx="${cx}" cy="${cy}"/><wp:docPr id="${rid}" name="${schX(name)}"/><a:graphic xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"><a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/picture"><pic:pic xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture"><pic:nvPicPr><pic:cNvPr id="${rid}" name="${schX(name)}"/><pic:cNvPicPr/></pic:nvPicPr><pic:blipFill><a:blip r:embed="${id}"/><a:stretch><a:fillRect/></a:stretch></pic:blipFill><pic:spPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="${cx}" cy="${cy}"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom></pic:spPr></pic:pic></a:graphicData></a:graphic></wp:inline></w:drawing></w:r>`;
  // sections: text goes into the right column of a two-column sheet without lines; a table stands below it at the same indent
  let xml=''; const T=doc.title;
  xml+=`<w:p><w:pPr><w:tabs><w:tab w:val="right" w:pos="${C.text}"/></w:tabs><w:snapToGrid w:val="0"/><w:spacing w:before="40" w:after="20"/></w:pPr>${run(T[0],{b:1,color:'000000',sz:30})}${doc.label?`<w:r><w:tab/></w:r>${run(doc.label,{color:'000000',sz:18,b:1})}`:''}</w:p>`;
  if(T[1])xml+=`<w:p><w:pPr><w:snapToGrid w:val="0"/><w:spacing w:before="40" w:after="20"/></w:pPr>${run(T[1],{b:1,color:'000000',sz:30})}</w:p>`;
  xml+=`<w:p><w:pPr><w:pBdr><w:bottom w:val="single" w:sz="6" w:space="1" w:color="${C.ink}"/></w:pBdr><w:snapToGrid w:val="0"/><w:spacing w:before="40" w:after="140"/></w:pPr></w:p>${spacer(160)}`;
  for(const s of doc.sections){ if(s.brk)xml+='<w:p><w:pPr><w:snapToGrid w:val="0"/><w:spacing w:before="0" w:after="0"/></w:pPr><w:r><w:br w:type="page"/></w:r></w:p>'; let heading=s.h, buf='', any=false; const flush=()=>{ if(buf||heading){ xml+=row2(heading,buf); heading=''; buf=''; any=true; } };
    for(const b of s.blocks){ if(b.k==='p')buf+=body(b.runs,{ind:b.ind});
      else if(b.k==='tbl'){ flush(); xml+=spacer(40)+table(b)+spacer(120); }
      else if(b.k==='brk'){ flush(); xml+='<w:p><w:pPr><w:snapToGrid w:val="0"/><w:spacing w:before="0" w:after="0"/></w:pPr><w:r><w:br w:type="page"/></w:r></w:p>'; }
      // a chart of the schedule (forty-ninth round): the whole width of the sheet, under what was written before it
      else if(b.k==='img'&&b.gantt){ flush(); const im=schXGanttBytes(b); if(!im)continue; const id='rId'+(++rid), cx=Math.round(b.lay.w*914400), cy=Math.round(cx*im.h/im.w);
        media.push({name:`word/media/img${rid}.png`,data:im.data}); rels.push(`<Relationship Id="${id}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="media/img${rid}.png"/>`);
        xml+=`<w:p><w:pPr><w:snapToGrid w:val="0"/><w:spacing w:before="60" w:after="160"/></w:pPr>${drawing(id,b.name||'chart',cx,cy)}</w:p>`; any=true; }
      else if(b.k==='img'){ const im=await schExpImage(b.src); if(!im){ buf+=body([{t:'[이미지'+(b.name?': '+b.name:'')+']'}]); continue; } const id='rId'+(++rid), max=4572000, cx=Math.min(max,im.w*9525), cy=Math.round(cx*im.h/im.w);
        media.push({name:`word/media/img${rid}.${im.ext}`,data:im.data}); rels.push(`<Relationship Id="${id}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="media/img${rid}.${im.ext}"/>`);
        buf+=`<w:p><w:pPr><w:snapToGrid w:val="0"/><w:spacing w:before="60" w:after="60"/></w:pPr>${drawing(id,b.name||'image',cx,cy)}</w:p>`; } }
    flush(); if(!any)xml+=row2(s.h,''); xml+=spacer(100); }
  const NS='xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing"', H='<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n';
  const logo=await schExpImage('/export/sunjin-logo.png'), logoRun=logo?drawing('rId1','logo',590550,Math.round(590550*logo.h/logo.w)):'';
  const fld=(code,o)=>`<w:r>${rpr(o)}<w:fldChar w:fldCharType="begin"/></w:r><w:r>${rpr(o)}<w:instrText xml:space="preserve"> ${code} </w:instrText></w:r><w:r>${rpr(o)}<w:fldChar w:fldCharType="separate"/></w:r><w:r>${rpr(o)}<w:t>1</w:t></w:r><w:r>${rpr(o)}<w:fldChar w:fldCharType="end"/></w:r>`;
  const files=[
    {name:'[Content_Types].xml',data:H+`<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Default Extension="png" ContentType="image/png"/><Default Extension="jpeg" ContentType="image/jpeg"/><Default Extension="gif" ContentType="image/gif"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/><Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/><Override PartName="/word/fontTable.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.fontTable+xml"/><Override PartName="/word/header1.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.header+xml"/><Override PartName="/word/footer1.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.footer+xml"/></Types>`},
    {name:'_rels/.rels',data:H+`<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>`},
    {name:'word/document.xml',data:H+`<w:document ${NS}><w:body>${xml}<w:sectPr><w:headerReference w:type="default" r:id="rId2"/><w:footerReference w:type="default" r:id="rId3"/><w:pgSz w:w="11906" w:h="16838"/><w:pgMar w:top="993" w:right="566" w:bottom="1021" w:left="1021" w:header="425" w:footer="510" w:gutter="0"/></w:sectPr></w:body></w:document>`},
    {name:'word/_rels/document.xml.rels',data:H+`<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/header" Target="header1.xml"/><Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/footer" Target="footer1.xml"/><Relationship Id="rIdFont" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/fontTable" Target="fontTable.xml"/>${rels.join('')}</Relationships>`},
    {name:'word/fontTable.xml',data:H+`<w:fonts xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:font w:name="Pretendard"><w:altName w:val="맑은 고딕"/><w:charset w:val="81"/><w:family w:val="swiss"/><w:pitch w:val="variable"/></w:font></w:fonts>`},   // every run is Pretendard; where it is not installed Word takes this one font for all of it
    {name:'word/styles.xml',data:H+`<w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:docDefaults><w:rPrDefault><w:rPr><w:rFonts w:ascii="Pretendard" w:eastAsia="Pretendard" w:hAnsi="Pretendard" w:cs="Pretendard"/><w:color w:val="${C.ink}"/><w:sz w:val="20"/><w:szCs w:val="20"/><w:lang w:val="en-US" w:eastAsia="ko-KR"/></w:rPr></w:rPrDefault><w:pPrDefault><w:pPr><w:spacing w:after="0" w:line="240" w:lineRule="auto"/></w:pPr></w:pPrDefault></w:docDefaults><w:style w:type="paragraph" w:default="1" w:styleId="a"><w:name w:val="Normal"/><w:qFormat/></w:style></w:styles>`},
    {name:'word/header1.xml',data:H+`<w:hdr ${NS}><w:p><w:pPr><w:snapToGrid w:val="0"/><w:jc w:val="right"/></w:pPr>${run(doc.head,{color:C.grey,sz:20})}</w:p></w:hdr>`},
    {name:'word/footer1.xml',data:H+`<w:ftr ${NS}><w:p><w:pPr><w:tabs><w:tab w:val="right" w:pos="${C.text}"/></w:tabs><w:snapToGrid w:val="0"/></w:pPr>${logoRun}<w:r><w:tab/></w:r>${fld('PAGE',{b:1})}${run(' / ',{color:C.grey})}${fld('NUMPAGES',{color:C.grey})}</w:p></w:ftr>`},
    ...(logo?[{name:'word/_rels/footer1.xml.rels',data:H+`<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="media/logo.png"/></Relationships>`},{name:'word/media/logo.png',data:logo.data}]:[]),
    ...media];
  return schZip(files,'application/vnd.openxmlformats-officedocument.wordprocessingml.document'); }

/* ---------- PDF: the same sheet as a page for the browser's print window ---------- */
function schExpHtml(doc,fontCss){ const e=schX, runs=rs=>rs.map(r=>{let t=e(r.t||''); if(r.b)t=`<b>${t}</b>`; if(r.i)t=`<i>${t}</i>`; if(r.s)t=`<s>${t}</s>`; if(r.u)t=`<u>${t}</u>`; return t;}).join('');
  const block=b=>b.k==='p'?`<p class="${b.pre?'pre':''}" style="${b.ind?`padding-left:${b.ind*4.2}mm`:''}">${runs(b.runs)}</p>`:b.k==='brk'?'<div class="brk"></div>':b.k==='img'&&b.gantt?`<div class="gx"><img src="${schXGanttSrc(b)}" alt="${e(b.name||'')}"></div>`:b.k==='img'?`<p class="im"><img src="${e(b.src)}" alt=""></p>`
    :`<table class="d">${b.widths?`<colgroup>${b.widths.map(w=>`<col style="width:${Math.round(w/b.widths.reduce((a,c)=>a+c,0)*1000)/10}%">`).join('')}</colgroup>`:''}${b.head?`<thead><tr>${b.head.map(h=>`<th>${e(h)}</th>`).join('')}</tr></thead>`:''}<tbody>${b.rows.map(r=>`<tr>${r.map(c=>`<td>${e(c).replace(/\n/g,'<br>')}</td>`).join('')}</tr>`).join('')}</tbody></table>`;
  return `<!doctype html><html lang="ko"><head><meta charset="utf-8"><title>${e(doc.file)}</title><style>${fontCss||''}
@page{size:A4;margin:17.5mm 10mm 19mm 18mm;@top-right{content:"${doc.head.replace(/["\\]/g,' ')}";font:10pt Pretendard,'Malgun Gothic',sans-serif;color:#7f7f7f;vertical-align:top;padding-top:7.5mm}@bottom-left{content:"";background:url(/export/sunjin-logo.png) no-repeat left center/15.6mm auto;width:40mm}@bottom-right{content:counter(page) " / " counter(pages);font:700 10pt Pretendard,'Malgun Gothic',sans-serif;color:#222}}
*{box-sizing:border-box}html,body{margin:0;padding:0}body{font:10pt/12.5pt Pretendard,'Malgun Gothic','Apple SD Gothic Neo',sans-serif;color:#222;-webkit-print-color-adjust:exact;print-color-adjust:exact}
h1{font-size:15pt;line-height:19pt;font-weight:700;color:#000;margin:2pt 0 1pt;display:flex;justify-content:space-between;align-items:baseline;gap:8mm}h1 small{font-size:9pt;font-weight:700;white-space:nowrap}
.rule{border-bottom:.75pt solid #222;margin:3pt 0 14pt}
.sec{display:grid;grid-template-columns:47.4mm 1fr;margin-bottom:6pt}.gx{margin:6pt 0 10pt -47.4mm;width:calc(100% + 47.4mm);break-inside:avoid}.sec>div>.gx:first-child{margin-top:20pt}.gx img{display:block;width:100%}.brk{break-before:page;page-break-before:always;height:0}.sec.brk{break-before:page;page-break-before:always}.sec>h2{font-size:10.5pt;line-height:14pt;font-weight:700;color:#E36C0A;margin:0;break-after:avoid}.sec>div{min-width:0}
p{margin:0;text-align:justify;word-break:keep-all;overflow-wrap:anywhere}p.pre{font-family:Pretendard,'Malgun Gothic','Apple SD Gothic Neo',sans-serif;font-size:9pt;white-space:pre-wrap;text-align:left}p.im{margin:3pt 0}p.im img{max-width:100%;max-height:120mm}
table.d{border-collapse:collapse;width:100%;margin:2pt 0 6pt;table-layout:fixed}table.d th,table.d td{border:.5pt solid #bfbfbf;padding:1.2pt 3.5pt;vertical-align:middle;text-align:left;word-break:keep-all;overflow-wrap:anywhere}table.d th{background:#f2f2f2;font-weight:700;text-align:center}table.d tr{break-inside:avoid}
@media screen{body{padding:14mm 12mm;max-width:210mm;margin:0 auto}}
<\/style><\/head><body><h1><span>${e(doc.title[0])}</span>${doc.label?`<small>${e(doc.label)}</small>`:''}</h1>${doc.title[1]?`<h1><span>${e(doc.title[1])}</span></h1>`:''}<div class="rule"></div>
${doc.sections.map(s=>`<section class="sec${s.brk?' brk':''}"><h2>${e(s.h)}</h2><div>${s.blocks.map(block).join('')}</div></section>`).join('')}<\/body><\/html>`; }   // (closing tags are written with a backslash here: the build looks for the page's own closing body tag)
function schExpPrint(doc){ let font=''; try{ for(const sh of document.styleSheets){ let rules; try{rules=sh.cssRules;}catch(e){continue;} for(const r of rules)if(r.type===5&&/Pretendard/.test(r.cssText)){font+=r.cssText;} if(font)break; } }catch(e){}
  const old=document.getElementById('sch-print'); if(old)old.remove(); const fr=document.createElement('iframe'); fr.id='sch-print'; fr.setAttribute('aria-hidden','true'); fr.style.cssText='position:fixed;right:0;bottom:0;width:0;height:0;border:0;visibility:hidden'; document.body.appendChild(fr);
  const d=fr.contentDocument; d.open(); d.write(schExpHtml(doc,font)); d.close(); toast('인쇄 창이 열립니다. 대상에서 ‘PDF로 저장’을 고르면 PDF 파일이 됩니다.',5200);
  const go=()=>{ try{ fr.contentWindow.focus(); fr.contentWindow.print(); }catch(e){ toast('인쇄 창을 열지 못했습니다.',3200); } };
  const imgs=[...d.images].filter(i=>!i.complete), ready=Promise.all([d.fonts&&d.fonts.ready?d.fonts.ready.catch(()=>{}):null,...imgs.map(i=>new Promise(ok=>{i.onload=i.onerror=ok;}))]);
  Promise.race([ready,new Promise(ok=>setTimeout(ok,2500))]).then(()=>setTimeout(go,60)); }
