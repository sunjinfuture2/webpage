// Regression for horizontally clipped record lists. Check each actual row and its text, including after a partial redraw.
const { chromium, newUser, check, done } = require('./h.cjs');
const url = 'http://127.0.0.1:8787/?v=2#page=project&proj=pangyo';

async function inspectTable(page, selector, allowEmpty=false) {
  const table = page.locator(selector).first();
  await table.waitFor({ state: 'visible' });
  return table.evaluate((t, allowEmpty) => {
    const bounds=t.getBoundingClientRect(), failures=[];
    const rows=Array.from(t.querySelectorAll(':scope > .rw'));
    if(!t.classList.contains('mob-records') || (!rows.length && !(allowEmpty && t.querySelector('.none'))))failures.push('missing records or empty state');
    if(t.scrollWidth>t.clientWidth+1 || bounds.left < -1 || bounds.right>innerWidth+1)failures.push('table bounds');
    for(const row of rows){
      const r=row.getBoundingClientRect(), title=row.querySelector('.mob-record-title');
      if(Math.abs(r.width-bounds.width)>1 || row.scrollWidth>row.clientWidth+1 || !title)failures.push('row width or title');
      if(!title)continue;
      const range=document.createRange();
      range.selectNodeContents(title.querySelector('.tx,.e') || title);
      const name=title.getBoundingClientRect();
      if([...range.getClientRects()].some(rect=>rect.width && (rect.right>name.right+1 || rect.left<name.left-1)))failures.push('clipped name');
      const toggle=row.querySelector('.mob-record-more');
      if(toggle){
        const box=toggle.getBoundingClientRect();
        if(box.width<44 || box.height<44 || box.left<name.right-1)failures.push('toggle overlaps title');
        const collapsed=toggle.getAttribute('aria-expanded')==='false';
        if(collapsed)toggle.click();
        const fields=row.querySelectorAll('.mob-detail-field > :last-child');
        if(row.scrollWidth>row.clientWidth+1 || [...fields].some(f=>f.getBoundingClientRect().right>bounds.right+1 || (f.clientWidth>0 && f.scrollWidth>f.clientWidth+1)))failures.push('clipped expanded field');
        if(collapsed)toggle.click();
      }
    }
    return failures;
  },allowEmpty);
}

async function flow(browser, width, height) {
  const { ctx, page, errs }=await newUser(browser,'ui'+width+Date.now(),'모바일 회귀',{url,viewport:{width,height},isMobile:true,hasTouch:true});
  page.setDefaultTimeout(7000);
  const on=s=>page.locator('.page.on '+s);
  const problems=[];
  const inspect=async (s,allowEmpty=false)=>{
    const issues=await inspectTable(page,'.page.on '+s,allowEmpty);
    problems.push(...issues.map(issue=>s+' '+issue));
  };
  await page.waitForFunction(()=>schReady('pangyo'));
  await on('[data-vt="res:table"]').tap();
  await inspect('.vt-res');
  const tools=await on('.sec-title:has([data-vt="res:table"])').evaluate(h=>['.plus-btn','.lib','[data-vt="res:cards"]','[data-vt="res:table"]','.srch.box'].every(sel=>{
    const r=h.querySelector(sel).getBoundingClientRect();return r.width>0 && r.left>=0 && r.right<=innerWidth+1;
  }));
  check(width+' research controls fit',tools);
  const search=on('input[data-q="research"]');
  await search.fill('ZZZ_자료가없는검색어_123');
  await on('.vt-res > .none').waitFor();
  check(width+' empty research search stays readable',await on('.vt-res > .none').isVisible());
  await search.fill('');
  await on('.vt-res .rw').first().waitFor();
  await inspect('.vt-res');
  const nextPage=on('.pg-res [data-pg="next"]:enabled');
  if(await nextPage.count()){
    const firstId=await on('.vt-res .rw').first().getAttribute('data-open');
    await nextPage.tap();
    check(width+' research pagination opens a different page of readable rows',firstId!==await on('.vt-res .rw').first().getAttribute('data-open'));
    await inspect('.vt-res');
  }
  await on('[data-vt="meet:table"]').tap();
  await inspect('.vt-meet');
  const meeting=on('.vt-meet .rw:has(.more-n)').first();
  if(await meeting.count()){
    await meeting.locator('.mob-record-more').tap();
    check(width+' complete meeting roster is accessible by touch',await meeting.locator('.mob-record-details').innerText().then(s=>s.includes('전체 참석자')) && !await page.evaluate(()=>S.panel));
  }
  await on('.vt-meet .mob-column-toggle').tap();
  await on('[data-vcol="meet:name"]').tap();
  await page.locator('.pop .it').filter({hasText:'제목 순'}).last().tap();
  await inspect('.vt-meet');
  check(width+' meeting column sort survives redraw',await page.evaluate(()=>S.mtf?.sort==='name') && await on('.vt-meet .mob-column-toggle').getAttribute('aria-expanded')==='true');
  await on('#sch-lower [data-k="evid"]').tap();
  await inspect('.sch-ev');
  const ev=on('.sch-ev .rw').first(), disclosure=ev.locator('.mob-record-more');
  await disclosure.tap();
  check(width+' evidence title, deadline and full text can be read together',await ev.locator('.du').isVisible() && await ev.locator('.bd').isVisible() && Boolean((await ev.locator('.bd').innerText()).trim()));
  const task=ev.locator('.lk [data-open]').first(), taskId=await task.getAttribute('data-open');
  await task.tap();
  await page.waitForFunction(id=>S.panel===id,taskId);
  await page.locator('#panel-close').tap();
  await disclosure.focus();
  await disclosure.press('Space');
  check(width+' linked task opens, then keyboard closes the original disclosure',await disclosure.getAttribute('aria-expanded')==='false' && !await page.evaluate(()=>S.panel));
  await ev.locator('[data-schc="estate"]').tap();
  check(width+' inline status opens its menu', await page.locator('.pop .it').first().isVisible() && !await page.evaluate(()=>S.panel));
  await page.evaluate(()=>closePop());
  await on('#sch-lower [data-k="proc"]').tap();
  await inspect('#sch-lower .sch-proc');
  if(width<=390){
    const original=await page.evaluate(()=>{
      const model=schModel('pangyo'), task=model.byWbs.get('W1.12'), D=AIDCSchedule.dates;
      schProposeDates('pangyo',{task:task.id,title:'기간 변경',mutate:d=>{
        const changed=d.tasks.find(t=>t.id===task.id), was=model.res.tasks[task.id];
        changed.plannedStart=D.addDays(was.start,21);changed.plannedFinish=D.addDays(was.finish,21);
      }});
      return task.plannedStart;
    });
    const impact=await page.locator('#dlg .box').evaluate(el=>{
      const rows=Array.from(el.querySelectorAll('.pp-tbl .rw')), chart=el.querySelector('.pp-chart');
      return el.scrollTop===0 && el.scrollWidth<=el.clientWidth+1 && chart.clientWidth<=el.clientWidth && rows.length>0 &&
        rows.every(r=>r.scrollWidth<=r.clientWidth+1 && r.querySelector('.nm').getBoundingClientRect().width>100);
    });
    await page.locator('#dlg [data-pp="x"]').tap();
    check(width+' impact preview displays tasks and ranges together and cancel preserves the plan',impact &&
      original===await page.evaluate(()=>schModel('pangyo').byWbs.get('W1.12').plannedStart));
  }
  await on('#sch-actions [data-sch="tab"][data-k="list"]').tap();
  await inspect('#sch-actions .sch-list');
  await inspect('.contract-table',true);
  await page.evaluate(()=>go('main'));
  await on('[data-vt="proj:table"]').tap();
  await inspect('.vt-rep');
  await inspect('.vt-res');
  await inspect('.tbl.partners');
  await inspect('.sch-all.tbl');
  const pj=on('.vt-rep .rw').first(), dest=(await pj.getAttribute('data-go')).split(':')[1];
  await pj.locator('.mob-record-title').press('Enter');
  await page.waitForFunction(pid=>S.page==='project'&&S.proj===pid,dest);
  await page.evaluate(()=>go('archive'));
  await on('[data-arview="docs"]').tap();
  await inspect('.tbl.archive',true);
  await inspect('.tbl.partners');
  await on('.tbl.archive .mob-column-toggle').tap();
  await on('[data-arcol="who"]').tap();
  check(width+' archive sort and filter controls work',await page.locator('.pop .it').first().isVisible());
  await page.evaluate(()=>closePop());
  // A real title without word boundaries must wrap even at the smallest device width.
  const longName=await page.evaluate(()=>{
    const fixture=document.createElement('div');document.querySelector('.page.on .pw').append(fixture);
    const title='판교AIDC'.repeat(40);
    fixture.innerHTML=schResTable([{id:'ui-long-name',title,type:'research',people:[],date:'2026-11-02'}]);
    schMobTables(fixture);
    const node=fixture.querySelector('.mob-record-title .e'), range=document.createRange();
    range.selectNodeContents(node);const lines=[...range.getClientRects()], parent=node.closest('.mob-record-title').getBoundingClientRect();
    const wraps=node.textContent===title && lines.length>1 && lines.every(r=>r.right<=parent.right+1);
    fixture.remove();return wraps;
  });
  check(width+' unbroken long title wraps in full',longName);
  if(width===360){
    const admin=await page.evaluate(()=>canAdmin());
    for(const key of ['members','teamspace','updates',...(admin?['security','audit','analytics']:[])]){
      await page.evaluate(k=>mpOpen('settings.'+k),key);
      const dim=await page.locator('#mbody').evaluate(b=>[b.clientWidth,b.scrollWidth,mpKey()]);
      check('settings '+key+' fits its phone pane',dim[2]==='settings.'+key && dim[1]<=dim[0]+1,dim);
    }
    await page.evaluate(()=>closeModal());
  }
  check(width+' × '+height+' record bounds',!problems.length,problems);
  check(width+' no application errors',!errs.length,errs);
  await ctx.close();
}
(async()=>{
  const browser=await chromium.launch({headless:true});
  try{
    for(const [w,h] of [[320,700],[360,800],[390,844],[412,915],[430,932],[844,390]])await flow(browser,w,h);
    const {ctx,page,errs}=await newUser(browser,'uiwide'+Date.now(),'넓은 화면',{url,viewport:{width:1440,height:960}});
    await page.locator('.page.on [data-vt="res:table"]').click();
    for(const w of [1440,768]){
      await page.setViewportSize({width:w,height:960});
      const grid=await page.locator('.page.on .vt-res .rw').first().evaluate(r=>[getComputedStyle(r).display,r.children.length,document.documentElement.classList.contains('mob')]);
      check('desktop table at '+w,grid[0]==='grid' && grid[1]===6 && !grid[2],grid);
    }
    check('desktop has no application errors',!errs.length,errs);
    await ctx.close();
  }finally{await browser.close();}
  done();
})().catch(err=>{console.error(err);process.exitCode=1;});
