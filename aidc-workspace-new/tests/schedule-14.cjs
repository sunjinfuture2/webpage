// WorkSpace (preview), fourteenth part (owner, 2026-11-23, the "seventeenth round"): what could be made but not changed or removed —
//  - a notice can be edited by its writer (or an admin);
//  - the image of a project card can be taken away;
//  - a section of the 자료실 goes to the trash with its cards (restoring a card brings it back), an empty one is simply removed;
//  - a research 구분 and a partner 구분 can be renamed everywhere at once.
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

  await ev(() => sharedFlush(true)); await sleep(1000);
  const errs = [...A.errs, ...B.errs];
  check('no script errors', errs.length === 0, errs);
  await browser.close(); done();
})().catch(e => { console.error(e); process.exit(1); });
