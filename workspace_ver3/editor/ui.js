// Floating pieces of the editor: one menu component (used by the slash menu, block menu, mention list, colour and table menus)
// and small helpers. Everything is attached to <body>, positioned in viewport coordinates and closed with Esc / outside click.
import { esc } from './host.js';

export const el = (tag, attrs, ...kids) => { const n = document.createElement(tag); if (attrs) for (const k in attrs) { const v = attrs[k]; if (v == null || v === false) continue; if (k === 'class') n.className = v; else if (k === 'text') n.textContent = v; else if (k === 'html') n.innerHTML = v; else if (k.startsWith('on')) n.addEventListener(k.slice(2), v); else n.setAttribute(k, v === true ? '' : v); } kids.flat().forEach(c => c != null && n.append(c)); return n; };

// Put a floating element next to a rectangle: below by default, above when there is no room, never off screen.
export function place(node, rect, opt = {}) {
  const gap = opt.gap == null ? 6 : opt.gap; node.style.maxHeight = ''; const vw = window.innerWidth, vh = window.innerHeight;
  const w = node.offsetWidth, h = node.offsetHeight; let x, y;
  if (opt.side === 'right') { x = rect.right + gap; y = rect.top - 6; if (x + w > vw - 8) x = Math.max(8, rect.left - gap - w); }
  else { x = opt.center ? rect.left + rect.width / 2 - w / 2 : rect.left; y = rect.bottom + gap;
    if (opt.above || y + h > vh - 8) { const up = rect.top - gap - h; if (up >= 8 || opt.above) y = Math.max(8, up); else if (rect.top > vh - rect.bottom) { node.style.maxHeight = Math.max(120, rect.top - gap - 8) + 'px'; y = 8; } else node.style.maxHeight = Math.max(120, vh - y - 8) + 'px'; } }
  if (y + node.offsetHeight > vh - 8) y = Math.max(8, vh - 8 - node.offsetHeight);
  node.style.left = Math.round(Math.max(8, Math.min(x, vw - w - 8))) + 'px'; node.style.top = Math.round(y) + 'px';
}

const open = new Set();
export function closeAllMenus() { [...open].forEach(m => m.close()); }
export const anyMenuOpen = () => open.size > 0;

/* items: {label, hint, icon, kbd, run, children, danger, checked, disabled} | {sep:true} | {header:'…'} | {custom: HTMLElement}
   opt: rect (anchor), side, takeFocus (the menu handles its own keys), onClose, cls, empty (text when there is nothing) */
export function openMenu(items, opt = {}) {
  const box = el('div', { class: 'nb-pop nb-menu ' + (opt.cls || ''), role: 'menu', tabindex: '-1' });
  let rows = [], sel = -1, child = null, closed = false;
  const api = {
    el: box, parent: opt.parent || null,
    setItems(list) { items = list; draw(); if (opt.rect) place(box, typeof opt.rect === 'function' ? opt.rect() : opt.rect, opt); },
    move(d) { if (!rows.length) return; sel = (sel + d + rows.length) % rows.length; mark(true); },
    choose() { if (sel >= 0 && rows[sel]) pick(rows[sel].it, rows[sel].node); else if (rows[0]) pick(rows[0].it, rows[0].node); return rows.length > 0; },
    get count() { return rows.length; },
    key(e) { // returns true when the key was used
      if (e.isComposing || e.keyCode === 229) return false;
      if (child) { if (child.key(e)) return true; }
      if (e.key === 'ArrowDown') { api.move(1); return true; } if (e.key === 'ArrowUp') { api.move(-1); return true; }
      if (e.key === 'Enter' || (e.key === 'Tab' && !opt.takeFocus)) { return api.choose(); }
      if (e.key === 'ArrowRight' && sel >= 0 && rows[sel].it.children) { pick(rows[sel].it, rows[sel].node, true); return true; }
      if (e.key === 'ArrowLeft' && api.parent) { api.close(); return true; }
      if (e.key === 'Escape') { api.close(true); return true; }
      return false; },
    close(byEsc) { if (closed) return; closed = true; if (child) child.close(); open.delete(api); box.remove(); document.removeEventListener('mousedown', outside, true); window.removeEventListener('resize', onResize); opt.onClose && opt.onClose(byEsc); },
  };
  const mark = scroll => { rows.forEach((r, i) => { r.node.classList.toggle('sel', i === sel); r.node.setAttribute('aria-selected', String(i === sel)); }); if (scroll && rows[sel]) rows[sel].node.scrollIntoView({ block: 'nearest' }); if (rows[sel]) box.setAttribute('aria-activedescendant', rows[sel].node.id); };
  const pick = (it, node, viaKey) => { if (it.disabled) return;
    if (it.children) { if (child) child.close(); const kids = typeof it.children === 'function' ? it.children() : it.children; child = openMenu(kids, { rect: node.getBoundingClientRect(), side: 'right', parent: api, cls: opt.cls, onClose: () => { child = null; } }); void viaKey; return; }
    const root = (() => { let m = api; while (m.parent) m = m.parent; return m; })();
    if (!it.keepOpen) root.close(); it.run && it.run(); };
  function draw() { box.textContent = ''; rows = [];
    items.forEach(it => { if (!it) return;
      if (it.sep) { box.append(el('div', { class: 'nb-sep', role: 'separator' })); return; }
      if (it.header) { box.append(el('div', { class: 'nb-hd', text: it.header })); return; }
      if (it.custom) { box.append(it.custom); return; }
      const node = el('div', { class: 'nb-it' + (it.danger ? ' danger' : '') + (it.disabled ? ' off' : ''), role: 'menuitem', id: 'nbm' + Math.random().toString(36).slice(2, 9), 'aria-disabled': it.disabled ? 'true' : null, 'data-k': it.k || null },
        it.icon != null ? el('span', { class: 'nb-ic', html: it.icon, 'aria-hidden': 'true' }) : null,
        el('span', { class: 'nb-lb' }, el('b', { text: it.label }), it.hint ? el('small', { text: it.hint }) : null),
        it.kbd ? el('kbd', { text: it.kbd }) : null, it.checked ? el('span', { class: 'nb-ck', text: '✓', 'aria-hidden': 'true' }) : null, it.children ? el('span', { class: 'nb-ar', text: '›', 'aria-hidden': 'true' }) : null);
      if (it.children) node.setAttribute('aria-haspopup', 'menu');
      const i = rows.length; node.addEventListener('mousemove', () => { if (sel !== i) { sel = i; mark(false); } }); node.addEventListener('mousedown', e => { e.preventDefault(); e.stopPropagation(); }); node.addEventListener('click', e => { e.preventDefault(); e.stopPropagation(); pick(it, node); });
      rows.push({ it, node }); box.append(node); });
    if (!rows.length && opt.empty) box.append(el('div', { class: 'nb-empty', text: opt.empty }));
    sel = opt.takeFocus || opt.noPreselect ? -1 : (rows.length ? 0 : -1); mark(false); }
  const outside = e => { if (box.contains(e.target) || (child && child.el.contains(e.target))) return; let p = api.parent; while (p) { if (p.el.contains(e.target)) return; p = p.parent; } if (opt.keep && opt.keep(e.target)) return; api.close(); };
  const onResize = () => api.close();
  ['mousedown', 'click', 'mouseup', 'keyup'].forEach(t => box.addEventListener(t, e => e.stopPropagation())); // never reaches the app's own handlers (panel closing and so on)
  box.addEventListener('keydown', e => { e.stopPropagation(); if (api.key(e)) e.preventDefault(); });
  document.body.append(box); draw(); if (opt.rect) place(box, typeof opt.rect === 'function' ? opt.rect() : opt.rect, opt);
  open.add(api); setTimeout(() => { if (!closed) { document.addEventListener('mousedown', outside, true); window.addEventListener('resize', onResize); } }, 0);
  if (opt.takeFocus) box.focus({ preventScroll: true });
  return api;
}

/* a one-line question next to a rectangle (link address, caption, embed address) */
export function askLine(opt) {
  const input = el('input', { class: 'nb-in', type: 'text', value: opt.value || '', placeholder: opt.placeholder || '', 'aria-label': opt.label || opt.placeholder || '' });
  const ok = el('button', { type: 'button', class: 'nb-btn pri', text: opt.ok || '확인' });
  const box = el('div', { class: 'nb-pop nb-ask', role: 'dialog', 'aria-label': opt.label || '' }, opt.label ? el('div', { class: 'nb-hd', text: opt.label }) : null, el('div', { class: 'nb-ask-row' }, input, ok),
    opt.extra ? el('div', { class: 'nb-ask-x' }, opt.extra.map(x => el('button', { type: 'button', class: 'nb-btn' + (x.danger ? ' danger' : ''), text: x.label, onclick: e => { e.preventDefault(); done(null); x.run(); } }))) : null);
  let closed = false;
  const done = v => { if (closed) return; closed = true; box.remove(); document.removeEventListener('mousedown', outside, true); if (v != null) opt.onOk && opt.onOk(v); else opt.onCancel && opt.onCancel(); };
  const outside = e => { if (!box.contains(e.target)) done(null); };
  ['mousedown', 'click', 'mouseup', 'keyup', 'keydown'].forEach(t => box.addEventListener(t, e => e.stopPropagation()));
  input.addEventListener('keydown', e => { if (e.isComposing || e.keyCode === 229) return; if (e.key === 'Enter') { e.preventDefault(); done(input.value.trim()); } if (e.key === 'Escape') { e.preventDefault(); done(null); } });
  ok.addEventListener('click', e => { e.preventDefault(); done(input.value.trim()); });
  document.body.append(box); place(box, opt.rect, opt); input.focus(); input.select(); setTimeout(() => { if (!closed) document.addEventListener('mousedown', outside, true); }, 0);
  return { close: () => done(null), el: box };
}

/* a small floating box with any content (equation editor, version list …). onClose gets 'esc', 'outside' or what close() was given */
export function openBox(content, opt = {}) {
  const box = el('div', { class: 'nb-pop nb-box ' + (opt.cls || ''), role: 'dialog', 'aria-label': opt.label || '' }, content); let closed = false;
  const api = { el: box, close(why) { if (closed) return; closed = true; open.delete(api); box.remove(); document.removeEventListener('mousedown', outside, true); opt.onClose && opt.onClose(why === true ? 'esc' : why); } };
  const outside = e => { if (!box.contains(e.target) && !(opt.keep && opt.keep(e.target))) api.close('outside'); };
  ['mousedown', 'click', 'mouseup', 'keyup'].forEach(t => box.addEventListener(t, e => e.stopPropagation()));
  box.addEventListener('keydown', e => { e.stopPropagation(); if (e.key === 'Escape' && !e.isComposing && e.keyCode !== 229) { e.preventDefault(); api.close('esc'); } });
  document.body.append(box); if (opt.rect) place(box, opt.rect, opt); open.add(api); setTimeout(() => { if (!closed) document.addEventListener('mousedown', outside, true); }, 0);
  return api;
}

export const swatch =(kind, name) => `<span class="nb-sw ${kind}" data-c="${esc(name || 'default')}">${kind === 'tx' ? 'A' : ''}</span>`;
