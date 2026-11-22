// Public holidays: red dates in the calendars, without their names (owner, 2026-11-20).
// Three sources, added up:
//  - what the page works out itself: the holidays with a fixed date, the lunar ones of the years in SCH_LUNAR (설날, 부처님오신날, 추석)
//    and the substitute days the regulation adds (설·추석: when one of the three days is a Sunday or another holiday; 3·1절, 어린이날,
//    부처님오신날, 광복절, 개천절, 한글날, 성탄절: when on a Saturday, a Sunday or another holiday);
//  - what the Worker finds for the year in a public calendar service (/api/holidays, looked up once a month and kept there);
//  - days set by hand in 설정 › 워크스페이스 › 일반 (SETTINGS.holidays: an election day, a temporary holiday).
const SCH_LUNAR={2024:['02-10','05-15','09-17'],2025:['01-29','05-05','10-06'],2026:['02-17','05-24','09-25'],2027:['02-07','05-13','09-15'],2028:['01-27','05-02','10-03'],2029:['02-13','05-20','09-22'],2030:['02-03','05-09','09-12']};
const SCH_HOL={}, SCH_HOLF={};
function schHolBuilt(y){ const D=AIDCSchedule.dates, out=new Set(), day=md=>y+'-'+md, dow=d=>new Date(d+'T00:00:00').getDay();
  const fixed=['01-01','03-01','05-05','06-06','08-15','10-03','10-09','12-25'].map(day); fixed.forEach(d=>out.add(d));
  const L=SCH_LUNAR[y], blocks=[]; let buddha='';
  if(L){ for(const md of [L[0],L[2]]){ const c=day(md), b=[D.addDays(c,-1),c,D.addDays(c,1)]; blocks.push(b); b.forEach(d=>out.add(d)); } buddha=day(L[1]); out.add(buddha); }
  const next=d=>{ let x=D.addDays(d,1); while(out.has(x)||dow(x)===0||dow(x)===6)x=D.addDays(x,1); return x; };
  for(const b of blocks)if(b.some(d=>dow(d)===0||fixed.includes(d)))out.add(next(b[2]));
  const singles=[...new Set(['03-01','05-05','08-15','10-03','10-09','12-25'].map(day).concat(buddha?[buddha]:[]))].sort();
  for(const d of singles){ if(blocks.some(b=>b.includes(d)))continue; if(dow(d)===6||dow(d)===0||(d===buddha&&fixed.includes(d)))out.add(next(d)); }
  return out; }
const schHolCache=y=>{ try{const c=JSON.parse(localStorage.getItem('aidc-hol:'+y)||'null'); return c&&Array.isArray(c.days)?c:null;}catch(e){return null;} };
function schHolidays(y){ if(!SCH_HOL[y]){ const s=schHolBuilt(y), c=schHolCache(y); if(c)for(const d of c.days)if(typeof d==='string'&&d.startsWith(y+'-'))s.add(d); SCH_HOL[y]=s; } schHolFetch(y); return SCH_HOL[y]; }
function schHolFetch(y){ if(SCH_HOLF[y]||typeof apiFetch!=='function'||typeof sharedReady==='undefined'||!sharedReady)return; const c=schHolCache(y); if(c&&Date.now()-c.at<7*864e5){SCH_HOLF[y]='cached';return;}
  SCH_HOLF[y]='loading'; apiFetch('/api/holidays?y='+y).then(r=>r.ok?r.json():null).then(d=>{ SCH_HOLF[y]='done'; if(!d||!Array.isArray(d.days))return;
    try{localStorage.setItem('aidc-hol:'+y,JSON.stringify({at:Date.now(),days:d.days}));}catch(e){} let n=0; for(const x of d.days)if(typeof x==='string'&&x.startsWith(y+'-')&&!SCH_HOL[y].has(x)){SCH_HOL[y].add(x);n++;} if(n&&typeof sharedRedraw==='function')sharedRedraw(); }).catch(()=>{SCH_HOLF[y]='failed';}); }
const schIsHoliday=d=>{ if(!schPreview()||!d||!window.AIDCSchedule)return false; return schHolidays(+d.slice(0,4)).has(d)||(Array.isArray(SETTINGS.holidays)&&SETTINGS.holidays.includes(d)); };
