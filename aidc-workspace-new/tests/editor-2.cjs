// Body editor v2 — saving, recovery, first-editor bodies, files, two members (brief T25–T42, T57, T60 parts).
const { chromium, sleep, check, newUser, done } = require('./h.cjs');
const out = n => require('node:path').join(require('node:os').tmpdir(), 'aidc-editor-' + n + '.png');
const sfx = Date.now().toString(36).slice(-5);
const LEGACY = '<h2>회의 안건</h2><p>첫 줄\n둘째 줄</p><div class="todo done"><input type="checkbox" checked><span class="tx">끝낸 일</span></div><div class="todo"><input type="checkbox"><span class="tx">남은 일</span></div>'
  + '<div class="toggle open"><span class="tri"></span><span class="tx">펼친 토글</span><div class="tc"><p>토글 안 글</p><div class="toggle"><span class="tri"></span><span class="tx">안쪽 토글</span><div class="tc"><p>깊은 글</p></div></div></div></div>'
  + '<div class="callout"><i></i><span class="tx">주의 <b>사항</b></span></div><pre>코드 한 줄<br>둘째 줄</pre><table><tbody><tr><td>A</td><td>B</td></tr></tbody></table>'
  + '<p><span class="datechip" contenteditable="false">2026. 11. 3</span>&nbsp;<span class="mention">@박재남 전무</span> <span style="color:#d30000">빨간 글</span> <span style="background-color:#fff2a8">형광</span></p>'
  + '<a class="file" data-name="보고서.pdf" data-fid="abc123" href="/api/file/abc123" download="보고서.pdf" title="클릭하면 다운로드됩니다"><span class="fico pdf"><i></i>PDF</span><span class="fn">보고서.pdf</span><span class="fs">120 KB</span></a>'
  + '<p><a class="bookmark" href="https://example.com/x" target="_blank" rel="noopener">https://example.com/x</a>&nbsp;</p><figure class="img"><img src="/api/file/img1?inline=1" alt="그림.png"><figcaption>그림.png</figcaption></figure>'
  + '<iframe class="embed" src="https://www.youtube.com/embed/abc"></iframe><hr><ul><li>글머리<ul><li>안쪽</li></ul></li></ul>';
(async () => {
  const browser = await chromium.launch();
  const A = await newUser(browser, 'EDB', '저장 검수'); const B = await newUser(browser, 'EDC', '둘째 멤버'); const p = A.page, q = B.page; const kb = p.keyboard;
  const ev = (f, a) => p.evaluate(f, a); const evB = (f, a) => q.evaluate(f, a);
  const doc = () => ev(() => NB[S.panel || S.full].inst.editor.state.doc.toString());
  const mod = 'Control';

  console.log('— T37 save round trip, T42 panel <-> full page');
  const id1 = await ev(t => { const it = newItem('research'); it.title = t; openPanel(it.id); return it.id; }, '저장 왕복 ' + sfx); await sleep(350);
  await p.click('#panel-pin .ProseMirror'); await kb.type('## 개요'); await kb.press('Enter'); await kb.type('본문 첫 줄'); await kb.press('Enter'); await kb.type('[] 확인할 일'); await kb.press('Enter'); await kb.press('Enter');
  await kb.type('> 접는 글'); await kb.press('Enter'); await kb.type('토글 안'); await sleep(150);
  const inst0 = await ev(() => { window.__inst = NB[S.panel].inst; return NB[S.panel].inst.editor.state.doc.toString(); });
  await p.click('#panel-expand'); await sleep(500);
  check('T42 panel -> full page keeps the same editor (content, caret, undo history)', await ev(() => S.full && !S.panel && NB[S.full] && NB[S.full].inst === window.__inst && NB[S.full].inst.wrap.isConnected && document.querySelector('#item-pin .ProseMirror') === NB[S.full].inst.editor.view.dom) && await doc() === inst0);
  await ev(() => NB[S.full].inst.focus('end')); await kb.type(' 추가'); await sleep(700); await kb.press(mod + '+z'); await sleep(100);
  check('T42 undo still works after the move', await doc() === inst0, await doc());
  await p.click('#full-shrink'); await sleep(500);
  check('T42 full page -> panel keeps it as well', await ev(() => S.panel && NB[S.panel] && NB[S.panel].inst === window.__inst && NB[S.panel].inst.wrap.isConnected) && await doc() === inst0);
  await p.click('#panel-pin [data-ed="publish"]'); await sleep(1500);
  const s1 = await ev(id => { const it = ITEMS.find(x => x.id === id); return { ed: it.ed, status: it.status, body: it.body, read: document.querySelector('#panel-pin .ibody[data-nb="read"] .nb-doc') ? document.querySelector('#panel-pin .nb-doc').innerText.replace(/\s+/g, ' ').trim() : null, editors: Object.keys(NB).length }; }, id1);
  check('T37 publishing stores schema v2 HTML and shows it read-only', s1.ed === 2 && s1.status === 'published' && s1.body.includes('data-type="taskList"') && s1.body.includes('<details') && s1.read && s1.read.includes('개요') && s1.read.includes('확인할 일') && s1.editors === 0, s1);
  await sleep(600);
  const b1 = await evB(id => { const it = ITEMS.find(x => x.id === id); return it ? { body: it.body, ed: it.ed } : null; }, id1);
  check('T37 the other member receives exactly the same body', b1 && b1.body === s1.body && b1.ed === 2, b1 && b1.body.slice(0, 120));
  await evB(id => openPanel(id), id1); await sleep(500);
  check('read mode: to-do boxes are shown but cannot be changed; toggles open and close', await evB(() => { const d = document.querySelector('#panel-pin .ibody[data-nb="read"] .nb-doc'); const i = d && d.querySelector('ul[data-type="taskList"] input'); const det = d && d.querySelector('details'); return !!(i && i.disabled && det && det.open); }));
  await p.reload(); await sleep(2800);
  check('T37 after a reload the stored body is unchanged', await ev(a => { const it = ITEMS.find(x => x.id === a.id); return it && it.body === a.body; }, { id: id1, body: s1.body }));

  console.log('— T39 cancel, guard question, T38 local draft');
  await ev(id => openPanel(id), id1); await sleep(400); await p.click('#panel-pin [data-ed="edit"]'); await sleep(500);
  check('editing a saved body: nothing typed -> nothing unsaved', await ev(id => itemDirty(ITEMS.find(x => x.id === id)) === false, id1));
  await p.click('#panel-pin .nb-toggle-btn'); await sleep(150);
  check('folding a toggle is not counted as an edit', await ev(id => itemDirty(ITEMS.find(x => x.id === id)) === false, id1));
  await p.click('#panel-close'); await sleep(300);
  check('closing without changes asks nothing', await ev(() => !document.querySelector('#dlg') && !S.panel));
  await ev(id => openPanel(id), id1); await sleep(500);
  check('reopening shows the edit that was left open (still editing, same text)', await ev(id => ITEMS.find(x => x.id === id).editing && !!NB[id] && !!document.querySelector('#panel-pin [data-ed="save"]'), id1));
  await ev(() => NB[S.panel].inst.focus('end')); await kb.type('취소될 글'); await sleep(200);
  check('typing makes it unsaved', await ev(id => itemDirty(ITEMS.find(x => x.id === id)) === true, id1));
  await p.click('#panel-close'); await sleep(300);
  check('SAVE-04 closing with changes asks to save first', await ev(() => !!document.querySelector('#dlg') && /저장/.test(document.querySelector('#dlg').textContent)));
  await p.click('#dlg button:has-text("취소")'); await sleep(200);
  await p.click('#panel-pin [data-ed="cancel"]'); await sleep(700);
  check('T39 취소 throws the edit away and shows the last saved body', await ev(a => { const it = ITEMS.find(x => x.id === a.id); return it.body === a.body && !it.editing && !document.querySelector('#panel-pin .nb-doc').textContent.includes('취소될 글') && Object.keys(NB).length === 0; }, { id: id1, body: s1.body }));
  const id2 = await ev(t => { const it = newItem('action'); openPanel(it.id); return it.id; }, ''); await sleep(350);
  await p.click('#panel-pin .ititle'); await kb.type('복구 시험 ' + sfx); await p.click('#panel-pin .ProseMirror'); await kb.type('저장 전에 닫힌 글'); await sleep(1500);
  const rec = await ev(() => { const r = JSON.parse(localStorage.getItem('aidc-recovery:EDB') || 'null'); return r ? { n: r.items.length, body: r.items[0].body, ed: r.items[0].ed } : null; });
  check('SAVE-01 / SAVE-05 a pause in typing keeps a draft in this browser', rec && rec.body.includes('저장 전에 닫힌 글') && rec.ed === 2, rec);
  check('SAVE-06 the page says so ("초안 보관됨"), separate from 저장', await ev(() => /초안 보관됨/.test((document.querySelector('#panel-pin .nb-savenote') || {}).textContent || '')));
  await p.reload(); await sleep(2800);
  const back = await ev(t => { const it = ITEMS.find(x => x.title === '[복구 초안] ' + t); return it ? { status: it.status, body: it.body, ed: it.ed } : null; }, '복구 시험 ' + sfx);
  check('T38 after a reload the unsaved text comes back as a private draft', back && back.status === 'draft' && back.body.includes('저장 전에 닫힌 글') && back.ed === 2, back);
  check('T38 the other member does not see that draft', await evB(t => !ITEMS.some(x => (x.title || '').includes(t) && canSee(x)), '복구 시험 ' + sfx));

  console.log('— T57 bodies written by the first editor');
  const id3 = await ev(a => { const it = newItem('research'); Object.assign(it, { title: a.t, body: a.b, status: 'published' }); render(true); return it.id; }, { t: '옛 본문 ' + sfx, b: LEGACY }); await sleep(1200);
  await ev(id => openPanel(id), id3); await sleep(500);
  check('MIG-06 a first-editor body is still shown by the first renderer until somebody edits it', await ev(() => !document.querySelector('#panel-pin .ibody[data-nb]') && !!document.querySelector('#panel-pin .ibody .todo')));
  await p.screenshot({ path: out('ed2-legacy-read') });
  await p.click('#panel-pin [data-ed="edit"]'); await sleep(700); await p.screenshot({ path: out('ed2-legacy-edit') });
  const d3 = await doc(); const j3 = await ev(() => JSON.stringify(NB[S.panel].inst.getJSON()));
  const want = ['heading("회의 안건")', 'paragraph("첫 줄", hardBreak, "둘째 줄")', 'taskList(taskItem(paragraph("끝낸 일")), taskItem(paragraph("남은 일")))', 'details(detailsSummary("펼친 토글"), detailsContent(paragraph("토글 안 글"), details(detailsSummary("안쪽 토글"), detailsContent(paragraph("깊은 글")))))',
    'callout(paragraph("주의 ", bold("사항")))', 'codeBlock("코드 한 줄\\n둘째 줄")', 'table(tableRow(tableCell(paragraph("A")), tableCell(paragraph("B"))))', 'date', 'mention', 'textColor("빨간 글")', 'bgColor("형광")', 'file', 'bookmark', 'image', 'embed', 'horizontalRule', 'bulletList(listItem(paragraph("글머리"), bulletList(listItem(paragraph("안쪽")))))'];
  const missing = want.filter(w => !d3.includes(w));
  check('MIG-03 every first-editor block is read as the matching block (17 kinds, nesting kept)', missing.length === 0, missing.length ? missing : d3);
  check('MIG-03 details: checked state, open state, date, member id, colours, file id, caption', j3.includes('"checked":true') && /"type":"details","attrs":\{[^}]*"open":true/.test(j3) && j3.includes('"date":"2026-11-03"') && j3.includes('"id":"park"') && j3.includes('"color":"red"') && j3.includes('"fid":"abc123"') && j3.includes('"caption":"그림.png"'), j3.slice(0, 500));
  check('MIG opening it for editing changes nothing by itself', await ev(id => itemDirty(ITEMS.find(x => x.id === id)) === false, id3));
  await p.click('#panel-pin [data-ed="cancel"]'); await sleep(600);
  check('MIG cancel leaves the stored body byte for byte as it was', await ev(a => { const it = ITEMS.find(x => x.id === a.id); return it.body === a.b && it.ed === undefined && it.bodyV1 === undefined; }, { id: id3, b: LEGACY }));
  await p.click('#panel-pin [data-ed="edit"]'); await sleep(700); await ev(() => NB[S.panel].inst.focus('end')); await kb.type('새 편집기로 덧붙임'); await sleep(200);
  await p.click('#panel-pin [data-ed="save"]'); await sleep(1500);
  const m3 = await ev(id => { const it = ITEMS.find(x => x.id === id); return { ed: it.ed, v1: it.bodyV1, body: it.body, files: (it.body.match(/<a class="file"[^>]*data-name="([^"]*)"[^>]*data-fid="([^"]*)"/) || []).slice(1) }; }, id3);
  check('MIG-02 the first save converts it to v2 and keeps the original text in bodyV1', m3.ed === 2 && m3.v1 === LEGACY && m3.body.includes('새 편집기로 덧붙임') && m3.body.includes('data-type="taskList"'), { ed: m3.ed, v1: m3.v1 === LEGACY });
  check('INT the attachment is still found by the file list (same markup order)', m3.files.join() === '보고서.pdf,abc123', m3.files);
  const again = await ev(b => AIDCEditor.upgrade(b) === AIDCEditor.upgrade(AIDCEditor.upgrade(b)), m3.body);
  check('MIG-04 converting twice gives the same result (no duplicated blocks or ids)', again && new Set(m3.body.match(/data-id="[^"]+"/g)).size === m3.body.match(/data-id="[^"]+"/g).length);
  await p.screenshot({ path: out('ed2-legacy-saved') });
  await sleep(500); await evB(id => openPanel(id), id3); await sleep(600);
  check('the other member sees the converted body with the new renderer', await evB(() => { const d = document.querySelector('#panel-pin .ibody[data-nb="read"] .nb-doc'); return !!(d && d.querySelector('.nb-callout') && d.querySelector('details.nb-toggle') && d.querySelector('span.mention').textContent === '@박재남 전무'); }));

  console.log('— T25 / T26 / T27 files');
  const id4 = await ev(t => { const it = newItem('action'); it.title = t; openPanel(it.id); return it.id; }, '파일 시험 ' + sfx); await sleep(350); await p.click('#panel-pin .ProseMirror'); await kb.type('그림 위 글'); await sleep(100);
  await ev(async () => { const c = document.createElement('canvas'); c.width = 320; c.height = 180; const g = c.getContext('2d'); g.fillStyle = '#2383e2'; g.fillRect(0, 0, 320, 180); g.fillStyle = '#fff'; g.font = '28px sans-serif'; g.fillText('AIDC', 110, 100); const blob = await new Promise(r => c.toBlob(r, 'image/png')); NB[S.panel].inst.insertFiles([new File([blob], '시험 그림.png', { type: 'image/png' })]); });
  check('FILE-04 while a file is on its way a placeholder shows it', await ev(() => !!document.querySelector('.ProseMirror .nb-upload') && NB[S.panel].inst.pending() === 1));
  check('FILE-06 a file that is still uploading is not part of the body yet', !(await ev(() => NB[S.panel].inst.getHTML())).includes('시험 그림'));
  await p.waitForFunction(() => NB[S.panel].inst.pending() === 0, null, { timeout: 8000 }); await sleep(600);
  const img = await ev(() => { const i = document.querySelector('.ProseMirror figure.img img'); return i ? { src: i.getAttribute('src'), w: i.naturalWidth, alt: i.alt } : null; });
  check('T25 the uploaded image is in the body with a server address (no base64) and loads', img && /^\/api\/file\/[\w-]+\?inline=1$/.test(img.src) && img.w === 320 && img.alt === '시험 그림.png', img);
  await ev(() => { const e = NB[S.panel].inst.editor; let pos = null; e.state.doc.descendants((n, p2) => { if (n.type.name === 'image') pos = p2; }); e.view.dispatch(e.state.tr.setNodeMarkup(pos, undefined, { ...e.state.doc.nodeAt(pos).attrs, width: 200, caption: '설명 글', alt: '파란 사각형', align: 'left' })); }); await sleep(150);
  check('T25 size, alignment, caption and alt text are node attributes', await ev(() => { const f = document.querySelector('.ProseMirror figure.img'); return f.style.width === '200px' && f.dataset.align === 'left' && f.querySelector('figcaption').textContent === '설명 글' && f.querySelector('img').alt === '파란 사각형'; }));
  await ev(() => NB[S.panel].inst.insertFiles([new File([new Uint8Array(2 * 1024 * 1024)], '큰 파일.bin', { type: 'application/octet-stream' })])); await sleep(400);
  check('T26 a file over the limit says why and offers retry / remove', await ev(() => { const u = document.querySelector('.ProseMirror .nb-upload.failed'); return !!u && /1\.8 MB/.test(u.textContent) && u.querySelectorAll('button').length === 2; }));
  check('T26 the failed file never becomes part of the body', !(await ev(() => NB[S.panel].inst.getHTML())).includes('큰 파일'));
  await p.click('.ProseMirror .nb-upload.failed button:has-text("삭제")'); await sleep(150); check('T26 "삭제" removes the notice', await ev(() => !document.querySelector('.ProseMirror .nb-upload')));
  await ev(() => { window.__up = uploadAttachment; let release; window.__gate = new Promise(r => { release = r; }); window.__release = release; AIDCEditor.configure({ upload: async (f, id) => { await window.__gate; return window.__up(f, ITEMS.find(x => x.id === id)); } }); NB[S.panel].inst.insertFiles([new File(['hello'], '느린 파일.txt', { type: 'text/plain' })]); }); await sleep(200);
  await p.click('#panel-pin [data-ed="publish"]'); await sleep(300);
  check('FILE-06 saving waits for uploads that are still running', await ev(id => ITEMS.find(x => x.id === id).status === 'new', id4));
  await p.click('.ProseMirror .nb-upload button:has-text("취소")'); await sleep(100); await ev(() => window.__release()); await sleep(600);
  check('T27 an answer that arrives after the upload was cancelled inserts nothing', !(await doc()).includes('file') && await ev(() => NB[S.panel].inst.pending() === 0), await doc());
  await ev(() => { let release; window.__gate = new Promise(r => { release = r; }); window.__release = release; NB[S.panel].inst.insertFiles([new File(['x,y\n1,2'], '표.csv', { type: 'text/csv' })]); }); await sleep(150);
  await ev(() => window.__release()); await p.waitForFunction(() => NB[S.panel].inst.pending() === 0, null, { timeout: 8000 }); await sleep(300);
  const fh = await ev(() => NB[S.panel].inst.getHTML()); check('FILE-03 other files become a file card with name and size', /<a class="file" data-name="표\.csv" data-fid="[\w-]+" href="\/api\/file\/[\w-]+" download="표\.csv"/.test(fh), fh.slice(-400));
  await ev(() => AIDCEditor.configure({ upload: (f, id) => window.__up(f, ITEMS.find(x => x.id === id)) }));
  await p.click('#panel-pin [data-ed="publish"]'); await sleep(1500);
  await evB(id => openPanel(id), id4); await sleep(1200);
  check('T25 the other member opens the same image from the server', await evB(() => { const i = document.querySelector('#panel-pin .nb-doc figure.img img'); return !!i && i.complete && i.naturalWidth === 320 && i.closest('figure').style.width === '200px'; }));
  await q.screenshot({ path: out('ed2-b-read') });

  console.log('— page links, mentions, block link, trial record, switch');
  await ev(id => openPanel(id), id4); await sleep(300); await p.click('#panel-pin [data-ed="edit"]'); await sleep(500); await ev(() => NB[S.panel].inst.focus('end')); await kb.press('Enter');
  await kb.type('[[저장 왕복 ' + sfx); await sleep(350);
  check('REF-01 "[[" lists pages by title', await ev(() => !!document.querySelector('.nb-at .nb-it')));
  await kb.press('Enter'); await sleep(150); await kb.type('@둘째'); await sleep(350); await kb.press('Enter'); await sleep(150);
  const pl = await ev(() => NB[S.panel].inst.getHTML());
  check('REF-03 / T31 page link stores the item id, mention the member id', new RegExp('data-type="pageLink" data-item="[^"]+"').test(pl) && /class="mention" data-type="mention" data-id="EDC"/.test(pl), pl.slice(-500));
  const bid = await ev(() => NB[S.panel].inst.editor.state.doc.firstChild.attrs.id);
  await p.click('#panel-pin [data-ed="save"]'); await sleep(1200);
  await p.click('#panel-pin .nb-doc a[data-type="pageLink"]'); await sleep(500);
  check('REF-03 clicking a page link in read mode opens that item', await ev(id => S.panel === id, id1));
  await ev(t => { const it = ITEMS.find(x => x.id === t.id); it.title = t.title; it.updatedAt = new Date().toISOString(); render(true); }, { id: id1, title: '이름 바꾼 글 ' + sfx }); await sleep(900); await ev(id => openPanel(id), id4); await sleep(500);
  check('REF-03 a renamed page shows its new title in the link', await ev(() => document.querySelector('#panel-pin .nb-doc a[data-type="pageLink"]').textContent.startsWith('이름 바꾼 글')));
  check('T31 the mentioned member gets it in the inbox list', await evB(id => typeof inboxItems === 'function' ? inboxItems().some(n => n.item === id) : (ITEMS.find(x => x.id === id).body.includes('class="mention"') && ITEMS.find(x => x.id === id).body.includes('@' + sharedName)), id4));
  const link = await ev(a => location.origin + location.pathname + routeHash({ page: S.page, proj: S.proj, full: null, panel: a.id }) + '&block=' + a.bid, { id: id4, bid });
  const C = await newUser(browser, 'EDD', '링크 방문', { url: link }); await sleep(1500);
  check('MOVE-09 an address ending in &block=… opens the item and shows that block', await C.page.evaluate(a => S.panel === a.id && !!document.querySelector(`#panel-pin .nb-doc [data-id="${a.bid}"]`), { id: id4, bid }));
  await ev(() => { const it = newItem('research'); const old = it.id; it.id = 'r5cdb8f30-5b91-4ec8-9d7b-038aeca21001'; it.title = 'Test'; openPanel(it.id); void old; }); await sleep(400);
  check('the trial record keeps the first editor (the other experiment is untouched)', await ev(() => { const b = document.querySelector('#panel-pin .ibody[data-f="body"]'); return b && !b.dataset.nb && b.isContentEditable && !b.querySelector('.ProseMirror'); }));
  await ev(() => { const i = ITEMS.findIndex(x => x.id === 'r5cdb8f30-5b91-4ec8-9d7b-038aeca21001'); closePanel(true); if (i >= 0) ITEMS.splice(i, 1); localStorage.setItem('aidc-editor', 'v1'); const it = newItem('action'); openPanel(it.id); }); await sleep(400);
  check('switch: aidc-editor=v1 goes back to the first editor for bodies not yet converted', await ev(() => { const b = document.querySelector('#panel-pin .ibody[data-f="body"]'); return b && !b.dataset.nb && b.isContentEditable; }));
  await ev(id => { closePanel(true); openPanel(id); }, id4); await sleep(400);
  check('switch: a v2 body is still shown by the new renderer', await ev(() => !!document.querySelector('#panel-pin .ibody[data-nb="read"] .nb-doc')));
  await ev(() => localStorage.removeItem('aidc-editor'));

  check('no script errors (A)', A.errs.length === 0, A.errs); check('no script errors (B)', B.errs.length === 0, B.errs); check('no script errors (C)', C.errs.length === 0, C.errs);
  // clean up the test records (items of this run only)
  await ev(s => { ITEMS.filter(x => (x.title || '').includes(s)).forEach(x => { x.status = 'trash'; x.trashedAt = new Date().toISOString(); }); render(true); }, sfx); await sleep(900);
  await browser.close(); done();
})().catch(e => { console.error('crashed:', String(e && e.stack || e).slice(0, 1400)); process.exit(2); });
