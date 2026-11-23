import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { normalizeHolidays, fetchHolidays } from '../holiday-service.mjs';

function client() {
  const source=fs.readFileSync(new URL('../schedule/ui/52-holidays.js',import.meta.url),'utf8');
  const ctx=vm.createContext({Date,Set,JSON,SETTINGS:{},sharedReady:false,window:{AIDCSchedule:true},schPreview:()=>true,
    localStorage:{getItem:()=>null},esc:s=>s.replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('"','&quot;'),
    AIDCSchedule:{dates:{addDays:(s,n)=>{const d=new Date(s+'T00:00:00Z');d.setUTCDate(d.getUTCDate()+n);return d.toISOString().slice(0,10);}}}});
  vm.runInContext(source,ctx);return expression=>vm.runInContext(expression,ctx);
}
test('fixed, lunar and substitute days have names; ordinary dates do not',()=>{
  const run=client();
  for(const [date,name] of [['2026-12-25','기독탄신일'],['2026-02-16','설날'],['2026-02-17','설날'],['2026-09-25','추석'],['2026-03-02','대체공휴일'],['2026-05-25','대체공휴일'],['2026-08-17','대체공휴일'],['2026-10-05','대체공휴일']]) assert.equal(run(`schHolidayName('${date}')`),name);
  assert.equal(run("schHolidayName('2026-11-23')"),'');
  assert.equal(run("schHolidayName('2026-09-28')"),'');
  assert.match(run("schHolidayDate('2026-03-02',2,true)"),/holiday-date has-count/);
  assert.equal(run("schHolidayDate('2026-11-23',23,false)"),'<span class="n">23</span>');
});
test('named API updates merge into an already-rendered year and escape labels',()=>{
  const run=client();run('schHolidays(2026)');
  assert.equal(run(`schHolMerge(2026,{days:['2026-06-03'],names:{'2026-06-03':'전국동시지방선거'},source:'kasi'})`),true);
  assert.equal(run("schHolidayName('2026-06-03')"),'전국동시지방선거');
  run(`schHolMerge(2026,{days:['2026-06-03'],names:{'2026-06-03':'<img>'},source:'kasi'})`);
  assert.ok(!run("schHolidayDate('2026-06-03',3,false)").includes('<img>'));
  run('schPreview=()=>false');assert.equal(run("schHolidayName('2026-12-25')"),'');
});
test('official responses exclude non-holidays, foreign years and merge duplicate dates',()=>{
  const result=normalizeHolidays([{locdate:20260505,dateName:'어린이날',isHoliday:'Y'},{locdate:20260505,dateName:'다른 이름',isHoliday:'Y'},{locdate:20260508,dateName:'어버이날',isHoliday:'N'},{locdate:20270505,dateName:'어린이날',isHoliday:'Y'}],2026,'kasi');
  assert.deepEqual(result.days,['2026-05-05']);assert.equal(result.names['2026-05-05'],'어린이날 · 다른 이름');
});
test('official key encoded once and invalid official response rejected',async()=>{
  let observed;
  const out=await fetchHolidays(2026,'abc%2Bdef%3D',async u=>{observed=u;return Response.json({response:{header:{resultCode:'00'},body:{items:{item:{locdate:20260302,dateName:'대체공휴일',isHoliday:'Y'}}}}});});
  assert.equal(observed.searchParams.get('serviceKey'),'abc+def=');assert.equal(out.source,'kasi');
  await assert.rejects(fetchHolidays(2026,'bad',async()=>Response.json({response:{header:{resultCode:'30'}}})));
});
