import seedText from './seed.json';
const seed = JSON.parse(seedText);

const MIN_CLIENT = 3;            // pages built before this version are asked to reload
const META_TITLES = { 'meta:notices': '공지사항', 'meta:settings': '워크스페이스 설정', 'meta:members': '멤버 역할·정보', 'meta:archive': '자료실 카드', 'meta:rows': '자료실 목록', 'meta:tabs': '자료실 탭', 'meta:roadmap': '업무 로드맵' };
const SESSION_MS = 14 * 864e5;   // default: a login stays valid for 14 days after its last request (설정 > 보안 can change it)
const VERSION_MERGE_MS = 60000;   // saves by the same member within a minute share one version (ticking boxes one after another)
const VERSION_KEEP = 100;         // versions kept per item
const PRESENCE_MS = 120000;      // a session counts as "online" (may hold edit locks) for 2 minutes after its last request
const LOCK_MS = 1800000;         // an edit lock lasts 30 minutes unless renewed
const MAX_FILE = 1887436;        // 1.8 MB per attachment (SQLite row limit)
const TRASH_DAYS = 30;           // trashed items are purged after this many days
const MAX_CHANGES = 5000;

const json = (v, status = 200, headers = {}) => Response.json(v, { status, headers: { 'Cache-Control': 'no-store', ...headers } });
// Downloads and inline images are plain browser navigations, so they authenticate with this cookie instead of the Bearer token.
const fileCookie = (req, token, maxAge) => `aidc_file=${token}; Path=/api/file; HttpOnly; SameSite=Lax; Max-Age=${maxAge}${new URL(req.url).protocol === 'https:' ? '; Secure' : ''}`;
// Defence in depth for stored HTML bodies: the page sanitises again before rendering.
const cleanHtml = s => typeof s !== 'string' ? s : s
  .replace(/<\s*(script|style|object|embed|link|meta|base)\b[\s\S]*?(<\s*\/\s*\1\s*>|$)/gi, '')
  .replace(/\son[a-z]+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, '')
  .replace(/\b(href|src|action|formaction|xlink:href)\s*=\s*(["']?)\s*(javascript|vbscript|data:text\/html)[^"'>\s]*\2/gi, '$1="#"');
// Bookmark cards: title and description of a public web page. The address comes from a signed-in member, so it is
// checked before every request (also after each redirect): http(s) only, a public host name, no IP literals, no odd ports.
function publicUrl(raw) {
  let u; try { u = new URL(raw); } catch { return null; }
  if (!/^https?:$/.test(u.protocol) || u.username || u.password) return null;
  const h = u.hostname.toLowerCase();
  if (!h.includes('.') || /^[\d.]+$/.test(h) || h.includes(':') || /(^|\.)(localhost|local|internal|lan|home|corp|intranet)$/.test(h)) return null;
  if (u.port && u.port !== '80' && u.port !== '443') return null;
  return u;
}
const unescapeHtml = t => t.replace(/&(#x?[0-9a-f]+|amp|lt|gt|quot|apos|nbsp);/gi, (m, e) => { e = e.toLowerCase(); if (e[0] === '#') { const n = e[1] === 'x' ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10); return n > 0 && n < 0x110000 ? String.fromCodePoint(n) : ''; } return { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ' }[e]; });
async function unfurl(raw) {
  let u = publicUrl(raw); if (!u) return { ok: false };
  const ctl = new AbortController(); const timer = setTimeout(() => ctl.abort(), 4500);
  try {
    let res = null;
    for (let hop = 0; hop < 4; hop++) {
      res = await fetch(u.href, { redirect: 'manual', signal: ctl.signal, headers: { 'User-Agent': 'Mozilla/5.0 (compatible; AIDCWorkspaceBot/1.0)', Accept: 'text/html,application/xhtml+xml', 'Accept-Language': 'ko,en;q=0.8' } });
      const next = res.status >= 300 && res.status < 400 ? res.headers.get('Location') : '';
      if (!next) break;
      u = publicUrl(new URL(next, u).href); if (!u) return { ok: false }; res = null;
    }
    const type = res ? res.headers.get('Content-Type') || '' : '';
    if (!res || !res.ok || !res.body || !/text\/html|application\/xhtml/i.test(type)) return { ok: false };
    const reader = res.body.getReader(); const parts = []; let size = 0;
    while (size < 262144) { const { done, value } = await reader.read(); if (done) break; parts.push(value); size += value.length; }
    reader.cancel().catch(() => { });
    const bytes = new Uint8Array(size); let at = 0; for (const c of parts) { bytes.set(c.subarray(0, Math.min(c.length, size - at)), at); at += c.length; if (at >= size) break; }
    const ascii = new TextDecoder('latin1').decode(bytes.subarray(0, 4096));
    const charset = (/charset=["']?([\w-]+)/i.exec(type) || /<meta[^>]+charset=["']?([\w-]+)/i.exec(ascii) || [])[1] || 'utf-8';
    let html; try { html = new TextDecoder(charset).decode(bytes); } catch { html = new TextDecoder('utf-8').decode(bytes); }
    const meta = name => { const re = new RegExp(`<meta[^>]+(?:property|name)=["']${name}["'][^>]*>`, 'i'); const tag = (re.exec(html) || [])[0]; const c = tag && /content=(?:"([^"]*)"|'([^']*)')/i.exec(tag); return c ? (c[1] ?? c[2]) : ''; };
    const tidy = (t, n) => unescapeHtml(String(t || '').replace(/<[^>]*>/g, ' ')).replace(/\s+/g, ' ').trim().slice(0, n);
    const title = tidy(meta('og:title') || (/<title[^>]*>([\s\S]*?)<\/title>/i.exec(html) || [])[1], 200);
    const description = tidy(meta('og:description') || meta('description'), 300);
    return { ok: !!(title || description), title, description, site: tidy(meta('og:site_name'), 80) };
  } catch { return { ok: false }; } finally { clearTimeout(timer); }
}
// Only these types may be shown inside the page; everything else is always a download.
const INLINE_OK = /^(image\/(png|jpe?g|gif|webp|bmp|avif)|application\/pdf|video\/(mp4|webm|ogg|quicktime)|audio\/(mpeg|mp4|ogg|wav|webm|aac|x-m4a))$/i;

export default {
  async fetch(req, env) {
    if (new URL(req.url).pathname.startsWith('/api/')) return env.WORKSPACE.get(env.WORKSPACE.idFromName('team')).fetch(req);
    return env.ASSETS.fetch(req);
  }
};

export class Workspace {
  constructor(ctx) {
    this.ctx = ctx; this.sql = ctx.storage.sql; this.lastPurge = 0;
    this.sql.exec('CREATE TABLE IF NOT EXISTS records (id TEXT PRIMARY KEY, data TEXT NOT NULL)');
    this.sql.exec('CREATE TABLE IF NOT EXISTS users (employee TEXT PRIMARY KEY, name TEXT NOT NULL)');
    // live_sessions replaces the older active_sessions table, which allowed only one session per employee.
    this.sql.exec('CREATE TABLE IF NOT EXISTS live_sessions (token TEXT PRIMARY KEY, employee TEXT, expires INTEGER, seen INTEGER)');
    this.sql.exec('CREATE TABLE IF NOT EXISTS edit_locks (id TEXT PRIMARY KEY, token TEXT, employee TEXT, expires INTEGER)');
    this.sql.exec('CREATE TABLE IF NOT EXISTS history (id INTEGER PRIMARY KEY AUTOINCREMENT, employee TEXT, changed TEXT, at TEXT)');
    this.sql.exec('CREATE TABLE IF NOT EXISTS files (id TEXT PRIMARY KEY, name TEXT NOT NULL, type TEXT, size INTEGER, item TEXT, employee TEXT, at TEXT, data BLOB)');
    this.sql.exec('CREATE TABLE IF NOT EXISTS versions (id INTEGER PRIMARY KEY AUTOINCREMENT, item TEXT, at TEXT, employee TEXT, title TEXT, body TEXT, ed INTEGER, kind TEXT)');
    this.sql.exec('CREATE INDEX IF NOT EXISTS versions_item ON versions (item, id)');
    if (!this.sql.exec('SELECT id FROM records LIMIT 1').toArray().length) { for (const [id, v] of Object.entries(seed)) this.put(id, v); }
  }

  put(id, v) { this.sql.exec('INSERT OR REPLACE INTO records VALUES (?,?)', id, JSON.stringify(v)); }
  // Version history of an item's title and body (published items only: a draft is its writer's own business).
  // The first change also keeps what was there before; quick saves in a row by one member are one version.
  version(id, old, v, me) {
    if (!v || v.status === 'draft' || v.status === 'new' || v.status === 'trash') return;
    const body = typeof v.body === 'string' ? v.body : '', title = typeof v.title === 'string' ? v.title : '', ed = v.ed === 2 ? 2 : 0;
    const last = this.sql.exec('SELECT id,employee,at,title,body,kind FROM versions WHERE item=? ORDER BY id DESC LIMIT 1', id).toArray()[0];
    if (last && last.title === title && last.body === body) return;
    const now = new Date();
    if (!last && old && old.status !== 'draft' && old.status !== 'new' && (old.body || old.title) && (String(old.body || '') !== body || String(old.title || '') !== title))
      this.sql.exec('INSERT INTO versions(item,at,employee,title,body,ed,kind) VALUES (?,?,?,?,?,?,?)', id, old.updatedAt || now.toISOString(), old.updatedBy || old.authorId || '', String(old.title || ''), String(old.body || ''), old.ed === 2 ? 2 : 0, 'base');
    if (last && last.kind === 'save' && last.employee === me && now - new Date(last.at) < VERSION_MERGE_MS) { this.sql.exec('UPDATE versions SET at=?,title=?,body=?,ed=? WHERE id=?', now.toISOString(), title, body, ed, last.id); return; }
    this.sql.exec('INSERT INTO versions(item,at,employee,title,body,ed,kind) VALUES (?,?,?,?,?,?,?)', id, now.toISOString(), me, title, body, ed, 'save');
    this.sql.exec('DELETE FROM versions WHERE item=? AND id NOT IN (SELECT id FROM versions WHERE item=? ORDER BY id DESC LIMIT ?)', id, id, VERSION_KEEP);
  }
  // may this member read the item (and so its versions)? A draft is only its writer's.
  readable(id, me) { const v = this.get('item:' + id); return !!v && !(v.status === 'draft' && v.authorId && v.authorId !== me); }
  get(id) { const r = this.sql.exec('SELECT data FROM records WHERE id=?', id).toArray()[0]; return r ? JSON.parse(r.data) : null; }
  users() { return Object.fromEntries(this.sql.exec('SELECT * FROM users').toArray().map(u => [u.employee, u.name])); }
  locks() {
    const now = Date.now();
    return Object.fromEntries(this.sql.exec('SELECT l.id,l.employee,u.name,l.expires FROM edit_locks l LEFT JOIN users u ON l.employee=u.employee WHERE l.expires>? AND l.token IN (SELECT token FROM live_sessions WHERE expires>? AND seen>?)', now, now, now - PRESENCE_MS).toArray().map(l => [l.id, l]));
  }
  broadcast(data) {
    for (const ws of this.ctx.getWebSockets()) {
      try {
        const a = ws.deserializeAttachment();
        if (a && this.sql.exec('SELECT token FROM live_sessions WHERE token=? AND expires>?', a.token, Date.now()).toArray().length) ws.send(JSON.stringify(data));
        else ws.close(4001, 'Session ended');
      } catch { }
    }
  }
  // Login lifetime chosen in 설정 > 보안 (7 / 14 / 30 / 90 days after the last request).
  sessionMs() { const days = +(this.get('meta:settings')?.security?.sessionDays); return [7, 14, 30, 90].includes(days) ? days * 864e5 : SESSION_MS; }
  cleanup() {
    const now = Date.now();
    this.sql.exec('DELETE FROM live_sessions WHERE expires<?', now);
    this.sql.exec('DELETE FROM edit_locks WHERE expires<? OR token NOT IN (SELECT token FROM live_sessions WHERE seen>?)', now, now - PRESENCE_MS);
    if (now - this.lastPurge > 3600000) { this.lastPurge = now; this.purgeTrash(); }
  }
  // Items that have sat in the trash for TRASH_DAYS are removed for good, together with their attachments.
  purgeTrash() {
    const limit = new Date(Date.now() - TRASH_DAYS * 864e5).toISOString(); const gone = {};
    for (const r of this.sql.exec(`SELECT id,data FROM records WHERE id LIKE 'item:%' AND data LIKE '%"status":"trash"%'`).toArray()) {
      let v; try { v = JSON.parse(r.data); } catch { continue; }
      if (v.status === 'trash' && v.trashedAt && v.trashedAt < limit) { this.sql.exec('DELETE FROM records WHERE id=?', r.id); this.sql.exec('DELETE FROM files WHERE item=?', r.id.slice(5)); this.sql.exec('DELETE FROM versions WHERE item=?', r.id.slice(5)); gone[r.id] = null; }
    }
    if (Object.keys(gone).length) this.broadcast({ records: gone });
  }
  // One line per changed record for the 업데이트 / 감사 로그 screens. Older history rows hold the full changes; newer ones are already summarised.
  feed(limit, before) {
    const rows = this.sql.exec('SELECT * FROM history WHERE id<? ORDER BY id DESC LIMIT ?', before || 9e15, limit).toArray(); const names = this.users(); const out = [];
    const typeOf = id => id.startsWith('item:') ? 'item' : id.startsWith('project:') || id === 'meta:head' ? 'project' : id.startsWith('partner:') ? 'partner' : 'meta';
    for (const h of rows) {
      let ch; try { ch = JSON.parse(h.changed); } catch { continue; }
      const base = { hid: h.id, at: h.at, employee: h.employee, name: names[h.employee] || h.employee };
      if (!Array.isArray(ch)) { if (ch && ch.event) out.push({ ...base, kind: ch.event, rid: '', title: ch.title || '' }); continue; }
      const seen = new Set();
      for (const c of ch) {
        if (!c || !c.id) continue;
        const rid = c.id === 'meta:head' && c.field ? 'project:' + c.field : c.id;
        let kind = c.op;
        if (!kind) { // legacy row with before/after values
          if (c.field === 'comments') kind = 'comment';
          else if (!c.field && c.before == null) kind = 'create';
          else if (!c.field && c.after == null) kind = 'delete';
          else if (c.field === 'status') kind = c.after === 'trash' ? 'trash' : c.after === 'published' ? 'publish' : 'edit';
          else kind = 'edit';
        }
        const key = rid + '|' + (kind === 'comment' || kind === 'trash' || kind === 'publish' || kind === 'create' || kind === 'delete' ? kind : 'edit');
        if (seen.has(key)) continue; seen.add(key);
        if (typeOf(rid) === 'meta' && !c.t) continue; // internal bookkeeping (order, flags …) is not shown
        const cur = c.t === undefined ? this.get(rid) : null;
        out.push({ ...base, kind, rid, title: c.t !== undefined ? c.t : (cur ? (cur.title || cur.full || cur.name || '') : ''), type: typeOf(rid), sub: c.ty || (cur && cur.type) || '' });
      }
    }
    return { events: out, next: rows.length === limit ? rows[rows.length - 1].id : null };
  }

  async fetch(req) {
    try {
      const url = new URL(req.url); const path = url.pathname;
      if (req.method === 'POST' && req.headers.get('Origin') && req.headers.get('Origin') !== url.origin) return json({ error: '요청 출처 오류' }, 403);
      const fileGet = path.startsWith('/api/file/') && req.method === 'GET';
      const version = +(req.headers.get('X-AIDC-Client') || url.searchParams.get('v') || 0);
      if (!fileGet && version < MIN_CLIENT) return json({ error: '새 버전이 배포되었습니다. 새로고침(Ctrl+F5)한 뒤 다시 로그인하세요.', reload: true }, 401);

      if (path === '/api/login' && req.method === 'POST') {
        const { employee, name } = await req.json(); const id = String(employee || '').trim().normalize('NFKC').toUpperCase();
        if (!/^[A-Z0-9_-]{1,40}$/.test(id)) return json({ error: '사번은 영문·숫자·하이픈·밑줄로 입력하세요.' }, 400);
        this.cleanup();
        const saved = this.sql.exec('SELECT name FROM users WHERE employee=?', id).toArray()[0]; const display = String(saved?.name || name || '').trim();
        if (!display || display.length > 40) return json({ error: '처음 로그인할 때 이름을 입력하세요. (40자 이내)' }, 400);
        const token = crypto.randomUUID(); const now = Date.now();
        this.sql.exec('INSERT OR IGNORE INTO users VALUES (?,?)', id, display);
        this.sql.exec('INSERT INTO live_sessions VALUES (?,?,?,?)', token, id, now + this.sessionMs(), now);
        this.sql.exec('INSERT INTO history(employee,changed,at) VALUES (?,?,?)', id, JSON.stringify({ event: 'login' }), new Date().toISOString());
        this.broadcast({ users: this.users() });
        return json({ employee: id, name: display, token }, 200, { 'Set-Cookie': fileCookie(req, token, this.sessionMs() / 1000) });
      }

      const token = req.headers.get('Authorization')?.replace(/^Bearer /, '') || (path === '/api/live' ? url.searchParams.get('token') : '') || (fileGet ? ((req.headers.get('Cookie') || '').match(/(?:^|;\s*)aidc_file=([^;]+)/)?.[1] || '') : '');
      const now = Date.now();
      const session = this.sql.exec('SELECT employee FROM live_sessions WHERE token=? AND expires>?', token || '', now).toArray()[0];
      if (!session) return json({ error: '로그인이 필요합니다.' }, 401);
      this.sql.exec('UPDATE live_sessions SET expires=?, seen=? WHERE token=?', now + this.sessionMs(), now, token);
      const me = session.employee;

      if (path === '/api/logout') {
        this.sql.exec('DELETE FROM live_sessions WHERE token=?', token); this.sql.exec('DELETE FROM edit_locks WHERE token=?', token);
        this.broadcast({ locks: this.locks() });
        return json({ ok: true }, 200, { 'Set-Cookie': fileCookie(req, '', 0) });
      }
      if (path === '/api/unfurl' && req.method === 'GET') { // at most 30 look-ups a minute per member
        const t = Date.now(); const log = ((this.unfurls ||= new Map()).get(me) || []).filter(x => t - x < 60000);
        if (log.length >= 30) return json({ error: '잠시 후 다시 시도하세요.' }, 429);
        log.push(t); this.unfurls.set(me, log);
        return json(await unfurl(url.searchParams.get('url') || ''));
      }
      if (path === '/api/heartbeat') { this.cleanup(); return json({ locks: this.locks(), users: this.users(), minClient: MIN_CLIENT }); }
      if (path === '/api/state') {
        return json({ employee: me, name: this.users()[me], users: this.users(), locks: this.locks(), minClient: MIN_CLIENT,
          records: Object.fromEntries(this.sql.exec('SELECT * FROM records').toArray().map(r => [r.id, JSON.parse(r.data)])) },
          200, { 'Set-Cookie': fileCookie(req, token, this.sessionMs() / 1000) });
      }
      if (path === '/api/live' && req.headers.get('Upgrade') === 'websocket') {
        const pair = new WebSocketPair(); this.ctx.acceptWebSocket(pair[1]); pair[1].serializeAttachment({ token, employee: me });
        return new Response(null, { status: 101, webSocket: pair[0] });
      }
      if (path === '/api/me' && req.method === 'POST') { // change my own display name
        const name = String((await req.json()).name || '').trim();
        if (!name || name.length > 40) return json({ error: '이름은 1~40자로 입력하세요.' }, 400);
        this.sql.exec('UPDATE users SET name=? WHERE employee=?', name, me); this.broadcast({ users: this.users() });
        return json({ name, users: this.users() });
      }
      if (path === '/api/user' && req.method === 'POST') { // register a member ahead of their first login
        const b = await req.json(); const id = String(b.employee || '').trim().normalize('NFKC').toUpperCase(); const name = String(b.name || '').trim();
        if (!/^[A-Z0-9_-]{1,40}$/.test(id)) return json({ error: '사번은 영문·숫자·하이픈·밑줄로 입력하세요.' }, 400);
        if (!name || name.length > 40) return json({ error: '이름은 1~40자로 입력하세요.' }, 400);
        if (this.sql.exec('SELECT employee FROM users WHERE employee=?', id).toArray().length) return json({ error: '이미 등록된 사번입니다.' }, 409);
        this.sql.exec('INSERT INTO users VALUES (?,?)', id, name); this.broadcast({ users: this.users() });
        return json({ employee: id, name, users: this.users() });
      }
      if (path === '/api/versions' && req.method === 'GET') { // the list (no bodies), newest first
        const id = url.searchParams.get('item') || ''; if (!this.readable(id, me)) return json({ error: '항목을 찾을 수 없습니다.' }, 404);
        return json({ versions: this.sql.exec('SELECT id,at,employee,title,length(body) AS size,ed,kind FROM versions WHERE item=? ORDER BY id DESC', id).toArray() });
      }
      if (path === '/api/version' && req.method === 'GET') {
        const row = this.sql.exec('SELECT id,item,at,employee,title,body,ed,kind FROM versions WHERE id=?', +url.searchParams.get('id') || 0).toArray()[0];
        if (!row || !this.readable(row.item, me)) return json({ error: '버전을 찾을 수 없습니다.' }, 404);
        return json({ version: row });
      }
      if (path === '/api/history') {
        const limit = Math.min(300, Math.max(1, +url.searchParams.get('limit') || 100));
        return json(this.feed(limit, +url.searchParams.get('before') || 0));
      }
      if (path === '/api/lock' && req.method === 'POST') {
        const { id, action } = await req.json(); if (!/^(item:|project:)/.test(id)) return json({ error: '잘못된 항목' }, 400);
        this.cleanup();
        const old = this.sql.exec('SELECT * FROM edit_locks WHERE id=?', id).toArray()[0];
        if (old && old.token !== token) return json({ error: (this.users()[old.employee] || old.employee) + '님이 수정 중입니다', locks: this.locks() }, 423);
        if (action === 'release') this.sql.exec('DELETE FROM edit_locks WHERE id=? AND token=?', id, token);
        else { if (!this.get(id)) return json({ error: '항목을 찾을 수 없습니다.' }, 404); this.sql.exec('INSERT OR REPLACE INTO edit_locks VALUES (?,?,?,?)', id, token, me, Date.now() + LOCK_MS); }
        const locks = this.locks(); this.broadcast({ locks }); return json({ locks, record: this.get(id) });
      }
      if (path === '/api/change' && req.method === 'POST') {
        const { changes } = await req.json(); if (!Array.isArray(changes) || changes.length > MAX_CHANGES) return json({ error: '잘못된 변경 요청' }, 400);
        const applied = {}; let conflict = null; const summary = []; const versioned = new Set(), seenFirst = new Map();
        this.cleanup();
        for (const c of changes) {
          if (c.field === 'comments' && String(c.id).startsWith('item:')) continue; // commenting is allowed while someone else edits the item
          const lockId = c.id === 'meta:head' && c.field ? 'project:' + c.field : c.id;
          const lock = this.sql.exec('SELECT * FROM edit_locks WHERE id=?', lockId).toArray()[0];
          if (lock && lock.token !== token) return json({ error: (this.users()[lock.employee] || lock.employee) + '님이 수정 중입니다', locked: lockId, locks: this.locks() }, 423);
        }
        this.ctx.storage.transactionSync(() => {
          for (const c of changes) {
            if (!/^(item:|project:|partner:|meta:)/.test(c.id) || ['__proto__', 'constructor', 'prototype'].includes(c.field)) { conflict = '잘못된 항목'; break; }
            const old = this.get(c.id); const value = c.field ? (old || {})[c.field] : old;
            if (JSON.stringify(value ?? null) !== JSON.stringify(c.before ?? null) && JSON.stringify(value ?? null) !== JSON.stringify(c.after ?? null)) { conflict = c.id; break; }
          }
          if (conflict) return;
          for (const c of changes) {
            const old = this.get(c.id); let v = old;
            // "old" is changed in place below: what the item was before this request is noted first (for its version history)
            if (old && c.id.startsWith('item:') && !seenFirst.has(c.id)) seenFirst.set(c.id, { title: old.title, body: old.body, status: old.status, ed: old.ed, updatedAt: old.updatedAt, updatedBy: old.updatedBy, authorId: old.authorId });
            if (c.field) { v = v || {}; if (c.after == null) delete v[c.field]; else v[c.field] = c.field === 'body' ? cleanHtml(c.after) : c.after; }
            else { v = c.after ?? null; if (v && typeof v.body === 'string') v.body = cleanHtml(v.body); }
            const isItem = c.id.startsWith('item:');
            if (v && (isItem || c.id.startsWith('project:'))) {
              v.authorId = old?.authorId || me; v.authorName = this.users()[v.authorId] || old?.authorName || v.authorId;
              if (c.field !== 'comments' || !old) { v.updatedBy = me; v.updatedAt = new Date().toISOString(); } // a comment is not an edit of the item
              for (const k of ['editing', '_editOriginal', 'snap', 'dirty', 'sessionNew', '_recoverySignature']) delete v[k];
            }
            if (v === null) { this.sql.exec('DELETE FROM records WHERE id=?', c.id); if (isItem) { this.sql.exec('DELETE FROM files WHERE item=?', c.id.slice(5)); this.sql.exec('DELETE FROM versions WHERE item=?', c.id.slice(5)); } }
            else { this.put(c.id, v); if (isItem && (!c.field || c.field === 'body' || c.field === 'title' || c.field === 'status' || c.field === 'ed')) versioned.add(c.id); }
            applied[c.id] = v;
            // compact audit entry (no bodies)
            const op = c.field === 'comments' ? 'comment' : !c.field && old == null ? 'create' : !c.field && c.after == null ? 'delete'
              : c.field === 'status' ? (c.after === 'trash' ? 'trash' : c.after === 'published' ? 'publish' : 'edit') : 'edit';
            const ref = v || old || {};
            const entry = { id: c.id, op };
            if (c.field) entry.field = c.field;
            if (isItem || c.id.startsWith('project:') || c.id.startsWith('partner:')) { entry.t = ref.title || ref.full || ref.name || ''; if (ref.type) entry.ty = ref.type; }
            else if (META_TITLES[c.id]) entry.t = META_TITLES[c.id];
            summary.push(entry);
          }
          // one version per item and request, taken once every field of the request is in (title, body and "ed" arrive as separate fields)
          for (const id of versioned) this.version(id.slice(5), seenFirst.get(id) || null, this.get(id), me);
          this.sql.exec('INSERT INTO history(employee,changed,at) VALUES (?,?,?)', me, JSON.stringify(summary), new Date().toISOString());
        });
        if (conflict) return json({ error: '다른 사용자의 변경과 겹칩니다.', conflict }, 409);
        this.broadcast({ records: applied, users: this.users(), locks: this.locks() });
        return json({ records: applied });
      }
      if (path === '/api/file' && req.method === 'POST') {
        const { name, type, item, data } = await req.json(); const nm = String(name || '').trim().slice(0, 200); if (!nm || typeof data !== 'string') return json({ error: '잘못된 파일 요청' }, 400);
        let bytes; try { bytes = Uint8Array.from(atob(data), c => c.charCodeAt(0)); } catch { return json({ error: '파일 데이터를 읽지 못했습니다.' }, 400); }
        if (bytes.byteLength > MAX_FILE) return json({ error: '파일은 1.8MB까지 첨부할 수 있습니다. (' + nm + ')' }, 413);
        const id = crypto.randomUUID();
        this.sql.exec('INSERT INTO files VALUES (?,?,?,?,?,?,?,?)', id, nm, String(type || 'application/octet-stream').slice(0, 120), bytes.byteLength, String(item || '').slice(0, 120), me, new Date().toISOString(), bytes.buffer);
        return json({ id, name: nm, size: bytes.byteLength, type: String(type || '') });
      }
      if (path === '/api/files') return json({ files: this.sql.exec('SELECT id,name,type,size,item,employee,at FROM files ORDER BY at DESC').toArray() });
      if (path.startsWith('/api/file/')) {
        const id = path.slice(10); const r = this.sql.exec('SELECT * FROM files WHERE id=?', id).toArray()[0]; if (!r) return json({ error: '파일을 찾을 수 없습니다.' }, 404);
        if (req.method === 'DELETE') {
          if (r.employee !== me) return json({ error: '파일을 올린 사람만 삭제할 수 있습니다.' }, 403);
          this.sql.exec('DELETE FROM files WHERE id=?', id); return json({ ok: true });
        }
        const type = r.type || 'application/octet-stream'; const inline = url.searchParams.get('inline') === '1' && INLINE_OK.test(type);
        return new Response(r.data, { headers: {
          'Content-Type': inline ? type : (INLINE_OK.test(type) ? type : 'application/octet-stream'),
          'Content-Disposition': `${inline ? 'inline' : 'attachment'}; filename*=UTF-8''${encodeURIComponent(r.name)}`,
          'Content-Security-Policy': "default-src 'none'; img-src 'self' data:; media-src 'self'; style-src 'unsafe-inline'; object-src 'none'" + (/pdf$/i.test(type) ? '' : '; sandbox'),
          'Cache-Control': 'private, max-age=3600', 'X-Content-Type-Options': 'nosniff' } });
      }
      return json({ error: 'Not found' }, 404);
    } catch (e) { return json({ error: '서버 처리에 실패했습니다.' }, 500); }
  }

  webSocketMessage(ws, message) {
    if (message === 'ping') {
      const a = ws.deserializeAttachment(); const now = Date.now();
      if (a) this.sql.exec('UPDATE live_sessions SET seen=?, expires=? WHERE token=? AND expires>?', now, now + this.sessionMs(), a.token, now);
      ws.send('pong');
    }
  }
  webSocketClose(ws) {
    // When the last tab of a session closes, let its edit locks lapse after 15 seconds instead of 2 minutes.
    const a = ws.deserializeAttachment();
    if (a && !this.ctx.getWebSockets().some(other => other !== ws && other.deserializeAttachment()?.token === a.token)) this.sql.exec('UPDATE live_sessions SET seen=MIN(seen,?) WHERE token=?', Date.now() - PRESENCE_MS + 15000, a.token);
    ws.close();
  }
}
