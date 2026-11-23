// Owner, 2026-11-23 ("노션처럼"): something that carries my red mark, when pressed, opens at the place that concerns me, and that
// place lights up for a moment: the comment that calls me, or (from a notice of the inbox) exactly the comment or the mention the
// notice is about. Preview only; the page's own handlers call mineOpen instead of openPanel where an entry is pressed.
//  - an entry with a red mark (calendar chip, list row, card, the list beside the calendar): the first unseen comment that calls me;
//    else my name in its text; else the first unseen comment of somebody else on what is mine.
//  - a notice of the inbox: its own comment; a notice about my name in the text: that mention.
// The red mark of an entry while the preview is on: something in it concerns me and I have not seen it yet — a comment that calls
// me, a comment of somebody else on what is mine (I wrote it or am assigned), my name in its text. It goes once the item was opened
// (mineOpen marks those notices read), as in the inbox. The fixtures' own red marks stay. One pass over the notices per draw.
let mineMemo=null;
function mineRedSet(){ if(!mineMemo){ mineMemo=new Set(unreadNotes().filter(n=>n.kind!=='remind').map(n=>n.item)); setTimeout(()=>{mineMemo=null;},0); } return mineMemo; }
const mineRed=it=>!!it&&((it.dots||[]).includes('r')||mineRedSet().has(it.id));
const mineNotes=id=>unreadNotes().filter(n=>n.item===id&&n.kind!=='remind');
function mineTarget(it,note){ if(!it||!sharedUser)return null; const cs=it.comments||[], cid=(c,ci)=>it.id+':'+(c.id||'c'+ci);
  if(note){ if(note.kind==='body')return {kind:'body'}; if(note.kind!=='mention'&&note.kind!=='comment')return null; const ci=cs.findIndex((c,i)=>cid(c,i)===note.id); return ci>=0?{kind:'comment',ci}:null; }
  const ns=mineNotes(it.id); if(!ns.length)return null; const first=k=>{ const ids=new Set(ns.filter(n=>n.kind===k).map(n=>n.id)); return ids.size?cs.findIndex((c,i)=>ids.has(cid(c,i))):-1; };
  // where I am called comes first: the first unseen comment that calls me, then my name in the text, then the first unseen comment on what is mine
  let ci=first('mention'); if(ci>=0)return {kind:'comment',ci}; if(ns.some(n=>n.kind==='body'))return {kind:'body'}; ci=first('comment'); return ci>=0?{kind:'comment',ci}:null; }
function mineJump(id,target,tries){ tries=tries||0; if(!target)return; const pin=[$('#panel-pin'),$('#item-pin')].find(p=>p&&p.dataset.id===id&&p.offsetParent); let el=null;
  if(pin){ if(target.kind==='comment')el=pin.querySelector(`.cmt-list .c[data-ci="${target.ci}"]`);
    else { const ms=[...pin.querySelectorAll('.ibody .mention')]; el=ms.find(m=>m.dataset.id===sharedUser)||ms.find(m=>m.textContent.trim()==='@'+sharedName)||null; } }
  if(!el){ if(tries<16)setTimeout(()=>mineJump(id,target,tries+1),150); return; }   // the panel (and its editor) is still being put up
  SCH.mine={id,target,until:Date.now()+2600}; mineMark(el,true); }
// The mark is kept as data for its 2.6 seconds, so that a redraw of the panel (a save arriving, the editor mounting) does not put it out.
function mineMark(el,scroll){ if(scroll)el.scrollIntoView({block:'center',behavior:typeof myPref==='function'&&myPref('calm')?'auto':'smooth'}); el.classList.remove('mine-hit'); void el.offsetWidth; el.classList.add('mine-hit');
  clearTimeout(mineMark.t); mineMark.t=setTimeout(()=>{ SCH.mine=null; $$('.mine-hit').forEach(x=>x.classList.remove('mine-hit')); },Math.max(200,(SCH.mine?SCH.mine.until:0)-Date.now())); }
function mineKeep(){ const M=SCH.mine; if(!M||Date.now()>M.until)return; const pin=[$('#panel-pin'),$('#item-pin')].find(p=>p&&p.dataset.id===M.id&&p.offsetParent); if(!pin||pin.querySelector('.mine-hit'))return;
  const el=M.target.kind==='comment'?pin.querySelector(`.cmt-list .c[data-ci="${M.target.ci}"]`):[...pin.querySelectorAll('.ibody .mention')].find(m=>m.dataset.id===sharedUser||m.textContent.trim()==='@'+sharedName); if(el){ el.classList.add('mine-hit'); el.style.animationDelay=(M.until-2600-Date.now())+'ms'; } }
// opens an item the way openPanel does and then goes to my place in it, if it has one
function mineOpen(id,note){ const pv=schPreview(), it=item(id), target=pv?mineTarget(it,note||null):null, seen=pv&&it?mineNotes(id).map(n=>n.id):[]; openPanel(id); if(S.panel!==id)return;
  if(seen.length){ markRead(seen); mineMemo=null; updateBadges(); render(true); }   // seen now: its red marks go (list, calendar, inbox count)
  if(target)setTimeout(()=>mineJump(id,target),380); }
new MutationObserver(()=>{ if(SCH.mine)mineKeep(); }).observe(document.documentElement,{childList:true,subtree:true});
