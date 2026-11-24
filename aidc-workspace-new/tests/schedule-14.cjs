// WorkSpace (preview), fourteenth part (owner, 2026-11-23, the "seventeenth round"): what could be made but not changed or removed —
//  - a notice can be edited by its writer (or an admin);
//  - the image of a project card can be taken away;
//  - a section of the 자료실 goes to the trash with its cards (restoring a card brings it back), an empty one is simply removed;
//  - a research 구분 and a partner 구분 can be renamed everywhere at once;
//  - choosing a partner 구분 (or searching the partners) leaves the screen where it is (2026-11-24);
//  - the list beside the project calendar (short year in its rows) and one gap for the research cards (2026-11-24);
//  - the archive's column menus and room, a site card on one run, the finish of a pair of dates (2026-11-24).
// (The upload window with one master field and six rows is in tests/schedule-12.cjs.)
// Needs wrangler dev on 127.0.0.1:8787.
const { chromium, sleep, check, newUser, done } = require('./h.cjs');
const sfx = Date.now().toString(36).slice(-5);
const V2 = 'http://127.0.0.1:8787/?v=2';
(async () => {
  const browser = await chromium.launch();
  const A = await newUser(browser, 'RZA' + sfx, '열넷 일', { url: V2 }), a = A.page, kb = a.keyboard;
  const B = await newUser(browser, 'RZB' + sfx, '열넷 이', { url: V2 }), b = B.page;
  const ev = (f, x) => a.evaluate(f, x);
  const flush = async () => { await ev(() => sharedFlush(true)); await sleep(1600); };
  const toastText = () => ev(() => { const t = document.querySelector('#toast'); return t && t.classList.contains('on') ? t.textContent : ''; });
  const ask = async v => { await a.fill('#ask-in', v); await a.click('[data-ask="o"]'); await sleep(500); };
  const pops = () => ev(() => [...document.querySelectorAll('.pop .it')].map(x => x.textContent.trim()));

  console.log('— a notice can be edited');
  await a.click('#notice .msg'); await sleep(300); await a.click('#notice [data-nt="add"]'); await sleep(300);   // the + shows while the list is open
  await a.fill('#nt-title', '공지 시험 ' + sfx); await a.fill('#nt-body', '처음 내용'); await a.click('#notice [data-nt="save"]'); await sleep(500);
  const nid = await ev(s => (NOTICES.find(n => n.title === '공지 시험 ' + s) || {}).id, sfx);
  const row = `#notice li.nrow[data-id="${nid}"]`;
  const n0 = await ev(r => { const li = document.querySelector(r), e = li && li.querySelector('.nedit'); return { has: !!e, text: e && e.textContent, del: !!(li && li.querySelector('.ndel[data-ndel]')) }; }, row);
  check('the writer of a notice has 수정 beside its ×', !!nid && n0.has && n0.text === '수정' && n0.del, n0);
  await a.hover(row); await a.click(row + ' .nedit'); await sleep(300);
  const f0 = await ev(() => ({ title: (document.querySelector('#nt-title') || {}).value, body: (document.querySelector('#nt-body') || {}).value, btn: (document.querySelector('#notice [data-nt="save"]') || {}).textContent }));
  check('수정 opens the form with what the notice says, and the button reads 저장', f0.title === '공지 시험 ' + sfx && f0.body === '처음 내용' && f0.btn === '저장', f0);
  await a.fill('#nt-title', '공지 고침 ' + sfx); await a.fill('#nt-body', '고친 내용'); await a.click('#notice [data-nt="save"]'); await sleep(500);
  const n1 = await ev(([i, s]) => { const x = NOTICES.find(n => n.id === i); return x && { title: x.title, body: x.body, text: x.text, by: x.by === sharedUser, edited: !!x.editedAt, count: NOTICES.filter(n => / 시험 | 고침 /.test(n.title || '') && (n.title || '').endsWith(s)).length, shown: (document.querySelector(`#notice li.nrow[data-id="${i}"] .nt`) || {}).textContent }; }, [nid, sfx]);
  check('saved: the same notice carries the new title and text (no second one), and says so', n1 && n1.title === '공지 고침 ' + sfx && n1.body === '고친 내용' && /고침.* — 고친 내용/.test(n1.text) && n1.by && n1.edited && n1.count === 1 && /공지 고침/.test(n1.shown) && /공지사항을 수정했습니다/.test(await toastText()), n1);
  await flush();
  const bN = await b.evaluate(i => { const x = NOTICES.find(n => n.id === i); document.querySelector('#notice').click(); return x && { title: x.title, admin: canAdmin() }; }, nid); await sleep(400);
  const bEdit = await b.evaluate(i => !!document.querySelector(`#notice li.nrow[data-id="${i}"] .nedit`), nid);
  check('the other member reads the new title; only the writer (or an admin) has 수정', bN && bN.title === '공지 고침 ' + sfx && bEdit === bN.admin, { bN, bEdit });
  await b.keyboard.press('Escape'); await a.keyboard.press('Escape'); await sleep(200);
  await ev(i => { NOTICES = NOTICES.filter(n => n.id !== i); renderNotice(); }, nid); await sleep(300);

  console.log('— the image of a project card');
  await ev(() => go('main')); await sleep(500); await a.click('.new-proj'); await sleep(400); await a.fill('#np2-name', '이미지 시험 ' + sfx); await a.click('[data-np2="ok"]'); await sleep(900);
  if (await a.$('[data-editproj].on')) { await a.click('[data-editproj]'); await sleep(900); }
  const pid = await ev(() => S.proj); await ev(() => go('main')); await sleep(600);
  const btn = `.pcard [data-pimg="${pid}"]`;
  const [chooser] = await Promise.all([a.waitForEvent('filechooser', { timeout: 5000 }).catch(() => null), ev(s => document.querySelector(s).click(), btn)]);
  check('a card without an image: the button asks for a file at once', !!chooser && await ev(() => !document.querySelector('.pop')));
  await ev(p => { PROJECTS[p].img = PROJECTS.pangyo.img || '/favicon.ico'; PROJECTS[p].imgR = 1.5; render(true); }, pid); await sleep(400);
  await ev(s => document.querySelector(s).click(), btn); await sleep(300);
  const pm = await ev(() => [...document.querySelectorAll('.pop .it')].map(x => x.textContent.trim()));
  check('a card with an image: the button offers 이미지 교체 and 이미지 빼기', pm.join() === '이미지 교체,이미지 빼기', pm);
  await a.click('.pop .it:has-text("이미지 빼기")'); await sleep(500);
  const i1 = await ev(([p, s]) => ({ img: PROJECTS[p].img || '', r: PROJECTS[p].imgR || 0, photo: !!document.querySelector(`.pcard:has([data-pimg="${p}"]) img.photo`) }), [pid]);
  check('이미지 빼기: the card has no image any more, with 되돌리기', !i1.img && !i1.r && !i1.photo && /프로젝트 이미지를 뺐습니다.*되돌리기/.test(await toastText()), i1);
  await a.click('#toast button'); await sleep(500);
  const i2 = await ev(p => ({ img: !!PROJECTS[p].img, r: PROJECTS[p].imgR, photo: !!document.querySelector(`.pcard:has([data-pimg="${p}"]) img.photo`), toast: (document.querySelector('#toast') || {}).textContent }), pid);
  check('되돌리기 puts the image back', i2.img && i2.r === 1.5, i2);   // (whether the picture itself loads is not this test's matter)
  await ev(p => { if (PROJECTS[p]) trashProject(p); }, pid); await sleep(400);

  console.log('— a section of the 자료실 goes to the trash');
  await ev(() => { go('archive'); SCH_ARCH.view = 'sites'; renderArchive(); }); await sleep(700);   // the sections of link cards are the view "참고 사이트"
  const si = await ev(s => { ARCH_SECTIONS.push({ name: '시험 구분 ' + s, cards: [{ id: 'ta' + s, name: '시험 자료 가', url: 'https://example.com/a', desc: '시험용 자료.' }, { id: 'tb' + s, name: '시험 자료 나', url: 'https://example.com/b', desc: '시험용 자료.' }] }); ARCH_SECTIONS.push({ name: '빈 구분 ' + s, cards: [] }); renderArchive(); return ARCH_SECTIONS.length - 2; }, sfx); await sleep(500);
  const secs = () => ev(() => [...document.querySelectorAll('.asec .h .nm')].map(x => x.textContent));
  const menuOf = async name => { await ev(nm => { const h = [...document.querySelectorAll('.asec .h')].find(x => x.querySelector('.nm').textContent === nm); h.scrollIntoView({ block: 'center' }); h.querySelector('[data-secmenu]').click(); }, name); await sleep(300); };
  check('(setup) two new sections stand in the 자료실', (await secs()).includes('시험 구분 ' + sfx) && (await secs()).includes('빈 구분 ' + sfx));
  await menuOf('빈 구분 ' + sfx); await a.click('.pop .it:has-text("구분 삭제")'); await sleep(400);
  check('an empty section is removed at once (nothing to bring back)', await ev(s => !document.querySelector('#dlg') && !ARCH_SECTIONS.some(x => x.name === '빈 구분 ' + s), sfx));
  await menuOf('시험 구분 ' + sfx); await a.click('.pop .it:has-text("구분 삭제")'); await sleep(400);
  const dq = await ev(() => { const d = document.querySelector('#dlg'); return d ? { text: d.querySelector('.m').textContent, btn: d.querySelector('button.pri').textContent } : null; });
  check('a section with cards: the question says it goes to the trash and can be restored for 30 days', dq && /시험 구분 .* 구분과 그 안의 자료 2건을 휴지통으로 보낼까요\? 휴지통에서 30일 안에 복원할 수 있습니다/.test(dq.text) && dq.btn === '휴지통으로 보내기', dq);
  await a.click('#dlg button.pri'); await sleep(500);
  const g1 = await ev(([i, s]) => { const x = ARCH_SECTIONS[i]; return { gone: !!x.gone, trashed: x.cards.filter(c => c.trash && c.trashedAt).length, listed: trashList().filter(t => t.k === 'card' && /시험 자료/.test(t.t)).length, shown: [...document.querySelectorAll('.asec .h .nm')].some(n => n.textContent === '시험 구분 ' + s) }; }, [si, sfx]);
  check('sent: the section is out of sight, its two cards are in the trash', g1.gone && g1.trashed === 2 && g1.listed === 2 && !g1.shown && /구분을 휴지통으로 보냈습니다/.test(await toastText()), g1);
  await flush();
  check('the other member does not see the section either', await b.evaluate(s => { go('archive'); SCH_ARCH.view = 'sites'; renderArchive(); return ![...document.querySelectorAll('.asec .h .nm')].some(n => n.textContent === '시험 구분 ' + s) && ARCH_SECTIONS.some(x => x.name === '시험 구분 ' + s && x.gone); }, sfx));
  await ev(([i, s]) => { restoreOne('card', i + ':ta' + s); renderArchive(); }, [si, sfx]); await sleep(500);
  const g2 = await ev(([i, s]) => { const x = ARCH_SECTIONS[i], sec = [...document.querySelectorAll('.asec')].find(q => q.querySelector('.h .nm').textContent === '시험 구분 ' + s); return { gone: !!x.gone, live: x.cards.filter(c => !c.trash).map(c => c.name), shown: !!sec, cards: sec ? sec.textContent.includes('시험 자료 가') && !sec.textContent.includes('시험 자료 나') : false, left: trashList().filter(t => t.k === 'card' && /시험 자료/.test(t.t)).length }; }, [si, sfx]);
  check('restoring one of its cards brings the section back with that card; the other card stays in the trash', !g2.gone && g2.live.join() === '시험 자료 가' && g2.shown && g2.cards && g2.left === 1, g2);
  await menuOf('시험 구분 ' + sfx); await a.click('.pop .it:has-text("구분 삭제")'); await sleep(400); await a.click('#dlg button.pri'); await sleep(400); await a.click('#toast button'); await sleep(500);
  const g3 = await ev(([i, s]) => { const x = ARCH_SECTIONS[i]; return { gone: !!x.gone, live: x.cards.filter(c => !c.trash).length, shown: [...document.querySelectorAll('.asec .h .nm')].some(n => n.textContent === '시험 구분 ' + s) }; }, [si, sfx]);
  check('되돌리기 right after sending brings back the section and exactly the cards that went with it', !g3.gone && g3.live === 1 && g3.shown, g3);
  await ev(([i, s]) => { const j = ARCH_SECTIONS.findIndex(x => x.name === '시험 구분 ' + s); if (j >= 0) ARCH_SECTIONS.splice(j, 1); renderArchive(); }, [si, sfx]); await sleep(300);

  console.log('— a research 구분 renamed everywhere');
  const cat = '시험' + sfx.toUpperCase(), cat2 = '고침' + sfx.toUpperCase(), rids = [];   // a 구분 is kept in capitals (schTagNorm)
  for (const [t, c] of [['구분 리서치 하나', [cat]], ['구분 리서치 둘', [cat, '남는구분']], [`[${cat}] 제목에 붙은 구분`, null]]) {
    const id = await ev(() => { const it = newItem('research'); openPanel(it.id); return it.id; }); await sleep(350); rids.push(id);
    await a.click('#panel-pin .ititle'); await kb.type(t + ' ' + sfx); if (c) await ev(([i, l]) => { item(i).cats = l; }, [id, c]);
    await a.click('#panel-pin [data-ed="publish"]'); await sleep(700); await ev(() => closePanel(true)); await sleep(200); }
  await ev(i => openPanel(i), rids[0]); await sleep(400); await a.click('#panel-pin [data-ed="edit"]'); await sleep(600);
  await a.click('#panel-pin [data-pick="cats"]'); await sleep(300);
  const rowSel = `.pop.sch-multi .it[data-t="${cat}"]`;
  const rn0 = await ev(s => { const r = document.querySelector(s), b = r && r.querySelector('.rn'); return { has: !!b, hidden: b && getComputedStyle(b).visibility === 'hidden', n: r && (r.querySelector('.n') || {}).textContent }; }, rowSel);
  await a.hover(rowSel); await sleep(120); await a.click(rowSel + ' .rn'); await sleep(300);
  check('the list of 구분 offers 이름 바꾸기 on a row (shown under the pointer); it asks with the name as it is', rn0.has && rn0.hidden && rn0.n === '3' && await ev(c => document.querySelector('#ask-in').value === c, cat), rn0);
  await ask(cat2);
  const r1 = await ev(([ids, c, c2]) => ids.map(i => { const x = item(i); return { cats: (x.cats || []).join(), title: (x.title || '').split('\n')[0], tags: schResTagsOf(x).join() }; }), [rids, cat, cat2]);
  check('renamed in every note at once: in their lists and in the [..] of a title; other 구분 stay', r1[0].cats === cat2 && r1[1].cats === cat2 + ',남는구분' && r1[2].title.startsWith(`[${cat2}] 제목에 붙은 구분`) && r1.every(x => !x.tags.includes(cat)) && new RegExp(`구분 “${cat}”을\\(를\\) “${cat2}”\\(으\\)로 바꿨습니다 · 리서치 3건`).test(await toastText()), { r1, t: await toastText() });
  check('the note that is being edited shows the new name', await ev(c => [...document.querySelectorAll('#panel-pin .rc-tag')].some(x => x.textContent.trim() === c), cat2));
  await a.click('#toast button'); await sleep(500);
  const r2 = await ev(ids => ids.map(i => ({ cats: (item(i).cats || []).join(), title: (item(i).title || '').split('\n')[0] })), rids);
  check('되돌리기 puts every note back', r2[0].cats === cat && r2[1].cats === cat + ',남는구분' && r2[2].title.startsWith(`[${cat}]`), r2);
  await ev(async ids => { const cur = curItem(); if (cur && cur.editing) revertItem(cur); closePanel(true); for (const i of ids) { const it = item(i); if (it) await trashItem(it); } }, rids); await sleep(600);

  console.log('— a partner 구분 renamed everywhere');
  await ev(() => go('main')); await sleep(600);
  const pc = await ev(() => { const n = new Map(); for (const p of PARTNERS) if (!p.trash) for (const c of partnerCategories(p.cat)) n.set(c, (n.get(c) || 0) + 1); const top = [...n].sort((x, y) => y[1] - x[1])[0]; const first = PARTNERS.find(p => !p.trash && partnerCategories(p.cat).includes(top[0])); return { cat: top[0], n: top[1], id: first.id, was: PARTNERS.filter(p => !p.trash).map(p => [p.id, p.cat]) }; });
  await ev(i => openPanel(i), pc.id); await sleep(500); await a.click('#panel-pin [data-ed="editpartner"]'); await sleep(500);
  await a.click('#panel-pin .pc-input'); await sleep(300);
  const pm0 = await ev(c => { const m = document.querySelector('.pc-menu'), b = m && m.querySelector(`[data-pc-history-rename="${c}"]`); return { menu: !!m, has: !!b, title: b && b.title }; }, pc.cat);
  check('the list of partner 구분 has a ✎ on each entry', pm0.menu && pm0.has && /이름 바꾸기 \(모든 협력업체에 적용\)/.test(pm0.title), pm0);
  await a.click(`.pc-menu [data-pc-history-rename="${pc.cat}"]`); await sleep(300); await ask('고친 구분 ' + sfx);
  const p1 = await ev(([c, c2]) => ({ old: PARTNERS.filter(p => !p.trash && partnerCategories(p.cat).includes(c)).length, now: PARTNERS.filter(p => !p.trash && partnerCategories(p.cat).includes(c2)).length, token: [...document.querySelectorAll('#panel-pin .pc-token')].map(x => x.textContent.replace('×', '').trim()) }), [pc.cat, '고친 구분 ' + sfx]);
  check('renamed for every partner that carried it, the one being edited included', p1.old === 0 && p1.now === pc.n && p1.token.includes('고친 구분 ' + sfx) && new RegExp(`협력업체 ${pc.n}곳`).test(await toastText()), { p1, t: await toastText() });
  await a.click('#toast button'); await sleep(500);
  await ev(() => { S.editSimple = null; closePanel(true); render(true); }); await sleep(400);
  check('되돌리기 puts every partner back', await ev(was => JSON.stringify(PARTNERS.filter(p => !p.trash).map(p => [p.id, p.cat])) === JSON.stringify(was), pc.was));

  console.log('— the list beside the project calendar; the gaps of the research cards');
  // (owner, 2026-11-24: the assignee 3 px nearer, the date of a row as yy. mm. dd, the date above at the left; one gap for the cards.)
  await ev(() => go('project:pangyo')); await a.waitForFunction(() => schReady('pangyo'), null, { timeout: 20000 }); await sleep(800);
  const rl = await ev(() => { const l = document.querySelector('.page.on .rlist.sch'), z = LAYOUT.zoom || 1, X = e => e.getBoundingClientRect(), row = l.querySelector('.ra'), d = l.querySelector('.rdate'), ln = l.querySelector('.rline');
    return { date: d.textContent, left: Math.round((X(d).left - X(ln).left) / z), above: X(d).bottom <= X(ln).top, rows: l.querySelectorAll('.ra').length, dts: [...l.querySelectorAll('.ra .dt')].map(x => x.textContent), oneLine: [...l.querySelectorAll('.ra .dt')].every(x => X(x).height / z < 24), av: row ? Math.round((X(row.querySelector('.avstack')).left - X(row.querySelector('.tt')).right) / z) : null, end: row ? Math.round((X(ln).right - X(row.querySelector('.dt')).right) / z) : null }; });
  check('the date above the list is whole (yyyy. mm. dd) and stands at the left end of the line', /^\d{4}\. \d{2}\. \d{2} \(.\)$/.test(rl.date) && Math.abs(rl.left) <= 1 && rl.above, rl);
  check('a row writes its date as yy. mm. dd on one line, at the right end; the assignee is 7 from the title', rl.rows > 0 && rl.dts.every(x => /^\d{2}\. \d{2}\. \d{2}$/.test(x)) && rl.oneLine && rl.av === 7 && Math.abs(rl.end) <= 1, rl);
  await ev(() => go('main')); await sleep(700);
  const rg = await ev(() => { const g = document.querySelector('.page.on #sec-research .rgrid'), cs = [...g.querySelectorAll('.rcard')].map(c => c.getBoundingClientRect()), cols = new Set(cs.map(r => Math.round(r.left))).size, z = LAYOUT.zoom || 1;
    return { n: cs.length, cols, col: cs.slice(1, cols).map((r, i) => Math.round((r.left - cs[i].right) / z * 100) / 100), row: cs.length > cols ? Math.round((cs[cols].top - Math.max(...cs.slice(0, cols).map(r => r.bottom))) / z * 100) / 100 : null }; });
  check('research cards: the same gap between columns and between rows', rg.cols > 1 && rg.col.every(x => x === 15) && rg.row === 15, rg);

  console.log('— the archive: column menus, room, a site card on one run; the finish of a pair of dates');
  // (owner, 2026-11-24, the twentieth round.)
  await ev(() => go('archive')); await sleep(800); await ev(() => { SCH_ARCH.view = 'docs'; SCH_ARCH.q = ''; SCH_ARCH.col = {}; SCH_ARCH.sort = { k: '', dir: 1 }; S.archPage = 1; schArchBody(); }); await sleep(300);
  const ar = () => ev(() => { const pw = document.querySelector('#arch-pw'), rows = [...pw.querySelectorAll('.tbl.archive.pv .rw')]; return { cols: [...pw.querySelectorAll('.tbl.archive.pv .hd [data-arcol]')].map(x => x.dataset.arcol).join(), rows: rows.length, pris: [...new Set(rows.map(r => r.querySelector('.pr').textContent.trim()))], titles: rows.map(r => r.querySelector('.tx').textContent), chips: [...pw.querySelectorAll('.ar-chips .sch-chip')].map(x => x.firstChild.textContent), n: (pw.querySelector('.ar-chips .n') || {}).textContent || '', flt: [...pw.querySelectorAll('.hd span.flt')].map(x => x.textContent), sorted: [...pw.querySelectorAll('.hd span.sorted')].map(x => x.textContent), gap: getComputedStyle(pw.querySelector('.ar-top')).marginBottom }; });
  const ar0 = await ar();
  check('twice the room below 문서 목록 · 참고사이트 (116); every column title of the table is a menu', ar0.gap === '116px' && ar0.cols === 'name,who,due,pri,mod,dbx' && ar0.rows > 0 && !ar0.chips.length, ar0);
  await a.click('#arch-pw [data-arcol="pri"]'); await sleep(300); const am = await pops();
  await a.click('.pop .it:has-text("높음")'); await sleep(400); const ar1 = await ar();
  check('중요도 › 높음: only those rows, a tag above the table with the count, the title marked', am.join().includes('높은 순') && am.includes('전체') && ar1.rows > 0 && ar1.pris.join() === '높음' && ar1.chips.join() === '중요도: 높음' && /^\d+ \/ \d+건$/.test(ar1.n) && ar1.flt.join() === '중요도', { am, ar1 });
  await a.click('#arch-pw [data-arcol="name"]'); await sleep(300); await a.click('.pop .it:has-text("가나다 역순")'); await sleep(400); const ar2 = await ar();
  const desc = ar2.titles.every((t, i) => !i || ar2.titles[i - 1].toLowerCase().replace(/\s+/g, ' ').trim() >= t.toLowerCase().replace(/\s+/g, ' ').trim());
  check('제목 › 가나다 역순 orders what the filter left; the kinds of document keep it', desc && ar2.sorted.join() === '제목' && ar2.chips.length === 1 && await ev(() => { const t = ARCH_TABS[1]; if (!t) return true; document.querySelector(`#arch-pw .tabs [data-tab="${t}"]`).click(); return SCH_ARCH.col.pri === 'high' && SCH_ARCH.sort.k === 'name' && !!document.querySelector('#arch-pw .ar-chips .sch-chip'); }), ar2);
  await sleep(300); await a.click('#arch-pw [data-archip="pri"]'); await sleep(300); const ar3 = await ar();
  check('the tag taken off: every row again', !ar3.chips.length && !ar3.flt.length && ar3.sorted.join() === '제목', ar3);
  await ev(() => { SCH_ARCH.sort = { k: '', dir: 1 }; S.archTab = ARCH_TABS[0]; SCH_ARCH.view = 'sites'; schArchBody(); }); await sleep(400);
  const cardP = await ev(() => { const sec = ARCH_SECTIONS.find(x => !x.gone && x.cards.some(c => !c.trash)), c = sec.cards.find(x => !x.trash), was = c.desc; c.desc = '첫 줄 설명\n둘째 줄 설명'; schArchBody(); const p = document.querySelector(`#arch-pw .acard[data-acard$=":${c.id}"] p`), r = { text: p.textContent, ws: getComputedStyle(p).whiteSpace, kept: c.desc.includes('\n') }; c.desc = was; schArchBody(); return r; });
  check('a site card writes its description on one run (the description itself keeps its line break)', cardP.text === '첫 줄 설명 둘째 줄 설명' && cardP.ws === 'normal' && cardP.kept, cardP);
  await ev(() => { SCH_ARCH.view = 'docs'; go('project:pangyo'); }); await a.waitForFunction(() => schReady('pangyo'), null, { timeout: 20000 }); await sleep(700);
  await ev(() => { SCHU.tab = 'gantt'; SCHU.phase = ''; SCHU.q = ''; SCHU.open = schModel('pangyo').phases.map(g => g.code); schRefresh(); }); await sleep(700);
  const dp = await ev(() => { const m = schModel('pangyo'), rows = [...document.querySelectorAll('#sch-gantt .sg-left .sg-row.tk')], pick = same => m.plan.tasks.find(t => { const r = m.res.tasks[t.id]; return t.kind !== 'milestone' && (r.start.slice(0, 4) === r.finish.slice(0, 4)) === same && rows.some(x => x.dataset.row === t.id); });
    const txt = t => { const r = m.res.tasks[t.id], el = rows.find(x => x.dataset.row === t.id).querySelector('.rg'); return { start: r.start, finish: r.finish, parts: [...el.querySelectorAll('.sch-rg > span')].map(x => x.textContent) }; }, a1 = pick(true), b1 = pick(false);
    return { f: [schDto('2026-11-03', '2026-11-20'), schDto('2026-12-18', '2027-01-08'), schDto('', '2026-11-20'), schDto('2026-11-03', '')], same: a1 && txt(a1), other: b1 && txt(b1) }; });
  check('the finish of a pair of dates has its year only when it is another one than the start\'s', dp.f.join('|') === '11. 20|2027. 01. 08|2026. 11. 20|' && dp.same && dp.same.parts[0] === dp.same.start.replace(/-/g, '. ') && dp.same.parts[1] === dp.same.finish.slice(5).replace('-', '. ') && dp.other && dp.other.parts[1] === dp.other.finish.replace(/-/g, '. '), dp);
  await ev(() => { SCHU.open = []; schRefresh(); }); await sleep(300);

  console.log('— choosing a partner 구분 leaves the screen where it is');
  // (owner, 2026-11-24: the list's title was pulled to the very top of the screen, and a shorter list let the page slide.)
  const C = await newUser(browser, 'RZC' + sfx, '열넷 삼', { url: 'http://127.0.0.1:8787/?v=1' });
  for (const [tag, pg] of [['preview', a], ['without the preview', C.page]]) {
    const pe = (f, x) => pg.evaluate(f, x), CAT = '자리시험' + sfx;
    await pe(() => go('main')); await sleep(700);
    await pe(c => { PARTNERS.filter(p => !p.trash).filter((p, i) => i === 3 || i === 14 || i === 25).forEach(p => { p._was = p.cat; p.cat = c; }); render(true); }, CAT); await sleep(300);
    const at = () => pe(() => { const c = document.querySelector('#content'), s = document.querySelector('.page.on #sec-partners'), b = s.querySelector('[data-sec="partner"]');
      return { top: Math.round(c.scrollTop), sec: Math.round(s.getBoundingClientRect().top - c.getBoundingClientRect().top), rows: s.querySelectorAll('.rw[data-partner]').length, cat: S.partnerCat, hold: b.style.minHeight, end: Math.round(c.scrollHeight - c.clientHeight - c.scrollTop) }; });
    const put = y => pe(y => { const c = document.querySelector('#content'), s = document.querySelector('.page.on #sec-partners'); c.scrollTop += (s.getBoundingClientRect().top - c.getBoundingClientRect().top - y) / (LAYOUT.zoom || 1); }, y);
    const press = sel => pe(q => document.querySelector('.page.on #sec-partners ' + q).click(), sel);   // (not Playwright's click: it scrolls first)
    await put(180); await sleep(200); const p0 = await at();
    await press(`[data-cat="${CAT}"]`); await sleep(400); const p1 = await at();
    check(`${tag}: three partners are left and the list has not moved (the page keeps the room that takes)`, p0.rows === 10 && p1.rows === 3 && p1.cat === CAT && p1.sec === p0.sec && p1.top === p0.top && p0.sec > 100 && /px$/.test(p1.hold) && p1.end <= 1, { p0, p1 });
    await press('[data-catclear]'); await sleep(400); const p2 = await at();
    check(`${tag}: taken off again, it is where it was and holds nothing`, p2.rows === 10 && !p2.cat && p2.sec === p0.sec && p2.top === p0.top && p2.hold === '', p2);
    await pg.fill('.page.on #sec-partners input[data-q="partner"]', CAT); await sleep(400); const p3 = await at();
    const typing = await pe(() => document.activeElement && document.activeElement.dataset.q === 'partner');
    await pg.fill('.page.on #sec-partners input[data-q="partner"]', ''); await sleep(400); const p4 = await at();
    check(`${tag}: a search that leaves three does not move it either, and the box keeps the caret`, p3.rows === 3 && p3.sec === p0.sec && typing && p4.rows === 10 && p4.sec === p0.sec && p4.hold === '', { p3, p4, typing });
    // the head of the list above the screen: only then the screen moves, as far as the head
    await pe(() => { const c = document.querySelector('#content'); c.scrollTop = c.scrollHeight; }); await sleep(200); const p5 = await at();
    if (p5.sec < 0) { await press(`[data-cat="${CAT}"]`); await sleep(400); const p6 = await at();
      check(`${tag}: with the head of the list above the screen it comes down to the head, no further`, p6.rows === 3 && Math.abs(p6.sec) <= 1, { p5, p6 });
      await press('[data-catclear]'); await sleep(300); }
    await pe(() => { PARTNERS.forEach(p => { if ('_was' in p) { p.cat = p._was; delete p._was; } }); S.ptHold = 0; render(true); }); await sleep(500);
  }
  await C.page.evaluate(() => sharedFlush(true)); await sleep(800);

  await ev(() => sharedFlush(true)); await sleep(1000);
  const errs = [...A.errs, ...B.errs, ...C.errs];
  check('no script errors', errs.length === 0, errs);
  await browser.close(); done();
})().catch(e => { console.error(e); process.exit(1); });
