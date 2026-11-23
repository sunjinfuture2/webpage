// Calendar-only holiday labels. No changes to tasks, schedule arithmetic or workspace settings.
// Three sources, added up:
//  - what the page works out itself: the holidays with a fixed date, the lunar ones of the years in SCH_LUNAR (설날, 부처님오신날, 추석)
//    and the substitute days the regulation adds (설·추석: when one of the three days is a Sunday or another holiday; 3·1절, 어린이날,
//    부처님오신날, 광복절, 개천절, 한글날, 성탄절: when on a Saturday, a Sunday or another holiday);
//  - what the Worker finds for the year in a public calendar service (/api/holidays, looked up once a month and kept there);
//  - days set by hand in 설정 › 워크스페이스 › 일반 (SETTINGS.holidays: an election day, a temporary holiday).
const SCH_LUNAR={2024:['02-10','05-15','09-17'],2025:['01-29','05-05','10-06'],2026:['02-17','05-24','09-25'],2027:['02-07','05-13','09-15'],2028:['01-27','05-02','10-03'],2029:['02-13','05-20','09-22'],2030:['02-03','05-09','09-12']};
const SCH_HOL={}, SCH_HOLF={}, SCH_HOLN={};
function schHolBuilt(y){ const D=AIDCSchedule.dates, out=new Set(), day=md=>y+'-'+md, dow=d=>new Date(d+'T00:00:00').getDay();
  const names=SCH_HOLN[y]||={}, add=(d,name)=>{out.add(d);if(name)names[d]=[...new Set([...(names[d]||'').split(' · ').filter(Boolean),name])].join(' · ');}; SCH_HOLN[y]=names;
  const fixed=['01-01','03-01','05-05','06-06','08-15','10-03','10-09','12-25'].map(day); fixed.forEach((d,i)=>add(d,['신정','삼일절','어린이날','현충일','광복절','개천절','한글날','기독탄신일'][i]));
  const L=SCH_LUNAR[y], blocks=[]; let buddha='';
  if(L){ for(const [md,label] of [[L[0],'설날'],[L[2],'추석']]){ const c=day(md), b=[D.addDays(c,-1),c,D.addDays(c,1)]; blocks.push(b); b.forEach(d=>add(d,label)); } buddha=day(L[1]); add(buddha,'부처님오신날'); }
  const next=d=>{ let x=D.addDays(d,1); while(out.has(x)||dow(x)===0||dow(x)===6)x=D.addDays(x,1); return x; };
  for(const b of blocks)if(b.some(d=>dow(d)===0||fixed.includes(d)))add(next(b[2]),'대체공휴일');
  const singles=[...new Set(['03-01','05-05','08-15','10-03','10-09','12-25'].map(day).concat(buddha?[buddha]:[]))].sort();
  for(const d of singles){ if(blocks.some(b=>b.includes(d)))continue; if(dow(d)===6||dow(d)===0||(d===buddha&&fixed.includes(d)))add(next(d),'대체공휴일'); }
  return out; }
const schHolCache=y=>{ try{const c=JSON.parse(localStorage.getItem('aidc-hol-labels:'+y)||'null'); return c&&Array.isArray(c.days)?c:null;}catch(e){return null;} };
function schHolMerge(y,d){const s=SCH_HOL[y], names=SCH_HOLN[y];let changed=false;for(const date of d.days){if(typeof date!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(date)||!date.startsWith(y+'-'))continue;if(!s.has(date)){s.add(date);changed=true;}const label=d.names?.[date];if(typeof label==='string'&&label.trim()&&(d.source==='kasi'||!names[date])&&names[date]!==label){names[date]=label.slice(0,100);changed=true;}}return changed;}
function schHolidays(y){ if(!SCH_HOL[y]){ SCH_HOL[y]=schHolBuilt(y);const c=schHolCache(y);if(c)schHolMerge(y,c); } schHolFetch(y); return SCH_HOL[y]; }
function schHolFetch(y){ if(SCH_HOLF[y]||typeof apiFetch!=='function'||typeof sharedReady==='undefined'||!sharedReady)return; const c=schHolCache(y); if(c&&Date.now()-c.at<3600e3){SCH_HOLF[y]='cached';return;}
  SCH_HOLF[y]='loading'; apiFetch('/api/holidays?y='+y).then(r=>r.ok?r.json():null).then(d=>{ SCH_HOLF[y]='done'; if(!d||!Array.isArray(d.days))return;
    if(d.src!=='none'&&d.src!=='stale')try{localStorage.setItem('aidc-hol-labels:'+y,JSON.stringify({at:Date.now(),days:d.days,names:d.names||{},source:d.source}));}catch(e){} if(schHolMerge(y,d)&&typeof sharedRedraw==='function')sharedRedraw(); }).catch(()=>{SCH_HOLF[y]='failed';}); }
const schIsHoliday=d=>{ if(!schPreview()||!d||!window.AIDCSchedule)return false; return schHolidays(+d.slice(0,4)).has(d)||(Array.isArray(SETTINGS.holidays)&&SETTINGS.holidays.includes(d)); };
const schHolidayName=d=>schIsHoliday(d)?(SCH_HOLN[+d.slice(0,4)]?.[d]||'공휴일'):'';
function schHolidayDate(d,n,count){const name=schHolidayName(d);return name?`<span class="holiday-date${count?' has-count':''}"><span class="n">${n}</span><span class="holiday-name" title="${esc(name)}">${esc(name)}</span></span>`:`<span class="n">${n}</span>`;}
