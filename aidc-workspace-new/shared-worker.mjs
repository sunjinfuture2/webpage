import { movePartnerDescriptions } from './partner-description-migration.mjs';
import { ensureAIProject, aiProjectRoute } from './ai-project.mjs';
import seedText from './seed.json';
import { fetchHolidays } from './holiday-service.mjs';
import devReport from './devreport.mjs'; // the development review list (owner, 2026-11-24: "코드에 넣어"); never part of the page's own code
import { mergeUpdates } from 'yjs'; // editing one body together: the Worker only relays and merges the editors' updates
const seed = JSON.parse(seedText);
const toB64 = u8 => { let s = ''; for (let i = 0; i < u8.length; i += 0x8000) s += String.fromCharCode.apply(null, u8.subarray(i, i + 0x8000)); return btoa(s); };
const fromB64 = b => { const s = atob(b); const u = new Uint8Array(s.length); for (let i = 0; i < s.length; i++) u[i] = s.charCodeAt(i); return u; };

const MIN_CLIENT = 4;            // pages built before this version are asked to reload
const META_TITLES = { 'meta:notices': '공지사항', 'meta:settings': '워크스페이스 설정', 'meta:members': '멤버 역할·정보', 'meta:archive': '자료실 카드', 'meta:rows': '자료실 목록', 'meta:tabs': '자료실 탭', 'meta:roadmap': '업무 로드맵' };
const SESSION_MS = 14 * 864e5;   // default: a login stays valid for 14 days after its last request (설정 > 보안 can change it)
const Y_MAX = 4 * 1024 * 1024;     // a shared editing session is dropped by the Worker beyond this size
const VERSION_MERGE_MS = 60000;   // saves by the same member within a minute share one version (ticking boxes one after another)
const VERSION_KEEP = 100;         // versions kept per item
const PRESENCE_MS = 120000;      // a session counts as "online" (may hold edit locks) for 2 minutes after its last request
const LOCK_MS = 1800000;         // an edit lock lasts 30 minutes unless renewed
const MAX_FILE = 1887436;        // 1.8 MB per attachment (SQLite row limit)
const TRASH_DAYS = 30;           // trashed items are purged after this many days
const MAX_CHANGES = 5000;

const json = (v, status = 200, headers = {}) => Response.json(v, { status, headers: { 'Cache-Control': 'no-store', ...headers } });
// Downloads and inline images are plain browser navigations, so they authenticate with this cookie instead of the Bearer token.
// maxAge null: a cookie without an end date, forgotten with the browser (a login without 자동 로그인)
const fileCookie = (req, token, maxAge) => `aidc_file=${token}; Path=/api/file; HttpOnly; SameSite=Lax${maxAge == null ? '' : '; Max-Age=' + maxAge}${new URL(req.url).protocol === 'https:' ? '; Secure' : ''}`;
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
    if (new URL(req.url).pathname.startsWith('/api/')) {
      // an error that escapes the workspace object comes back as JSON the page can show, never as Cloudflare's HTML page
      try { return await env.WORKSPACE.get(env.WORKSPACE.idFromName('team')).fetch(req); }
      catch (e) { console.error('workspace request failed:', e && e.stack || e); return json({ error: '서버를 시작하지 못했습니다. 잠시 뒤 다시 시도해 주세요. (' + String(e && e.message || e).slice(0, 200) + ')', detail: String(e && e.message || e).slice(0, 500) }, 503); }
    }
    return env.ASSETS.fetch(req);
  }
};

export class Workspace {
  constructor(ctx, env) {
    this.env = env;
    this.ctx = ctx; this.sql = ctx.storage.sql; this.lastPurge = 0;
    // Nothing that goes wrong while the object starts may throw out of here: the Worker then only sees "Error 1101" and the
    // cause is lost. It is kept and every request is answered with it (503) until the object starts cleanly.
    try { this.start(); } catch (e) { this.startErr = e; console.error('workspace start failed:', e && e.stack || e); }
  }
  start() {
    this.sql.exec('CREATE TABLE IF NOT EXISTS records (id TEXT PRIMARY KEY, data TEXT NOT NULL)');
    this.sql.exec('CREATE TABLE IF NOT EXISTS users (employee TEXT PRIMARY KEY, name TEXT NOT NULL)');
    this.sql.exec('CREATE TABLE IF NOT EXISTS removed_users (employee TEXT PRIMARY KEY, name TEXT NOT NULL, at TEXT NOT NULL)');
    // live_sessions replaces the older active_sessions table, which allowed only one session per employee.
    this.sql.exec('CREATE TABLE IF NOT EXISTS live_sessions (token TEXT PRIMARY KEY, employee TEXT, expires INTEGER, seen INTEGER)');
    for (const col of ['created INTEGER', 'ua TEXT', 'sid TEXT', 'keep INTEGER']) { try { this.sql.exec('ALTER TABLE live_sessions ADD COLUMN ' + col); } catch { /* already there */ } }
    try { this.sql.exec("UPDATE live_sessions SET sid=lower(hex(randomblob(8))) WHERE sid IS NULL OR sid=''"); } catch { }
    this.sql.exec('CREATE TABLE IF NOT EXISTS edit_locks (id TEXT PRIMARY KEY, token TEXT, employee TEXT, expires INTEGER)');
    this.sql.exec('CREATE TABLE IF NOT EXISTS history (id INTEGER PRIMARY KEY AUTOINCREMENT, employee TEXT, changed TEXT, at TEXT)');
    this.sql.exec('CREATE TABLE IF NOT EXISTS files (id TEXT PRIMARY KEY, name TEXT NOT NULL, type TEXT, size INTEGER, item TEXT, employee TEXT, at TEXT, data BLOB)');
    this.sql.exec('CREATE TABLE IF NOT EXISTS versions (id INTEGER PRIMARY KEY AUTOINCREMENT, item TEXT, at TEXT, employee TEXT, title TEXT, body TEXT, ed INTEGER, kind TEXT)');
    this.sql.exec('CREATE INDEX IF NOT EXISTS versions_item ON versions (item, id)');
    // Editing an item together: the first editor holds the lock as before, the others are noted here; ydocs is the shared document of a running session.
    this.sql.exec('CREATE TABLE IF NOT EXISTS co_locks (id TEXT, token TEXT, employee TEXT, expires INTEGER, PRIMARY KEY (id, token))');
    this.sql.exec('CREATE TABLE IF NOT EXISTS ydocs (item TEXT PRIMARY KEY, state BLOB, at INTEGER)');
    this.sql.exec('CREATE TABLE IF NOT EXISTS holidays (year INTEGER PRIMARY KEY, days TEXT NOT NULL, at INTEGER)');
    // A number that moves with every write of a record (2026-11-26: the free plan's 5 million rows read a day ran out and the
    // workspace stopped — every open page read the whole records table every 15 seconds). /api/state?since=<that number>
    // answers {same:true} without reading the table when nothing changed. Kept by triggers, so every writer counts, the
    // modules of other changes too. If the database refuses triggers the number is left out and every state is whole again.
    try {
      this.sql.exec('CREATE TABLE IF NOT EXISTS rev (k INTEGER PRIMARY KEY, n INTEGER NOT NULL)');
      this.sql.exec('INSERT OR IGNORE INTO rev VALUES (1, 0)');
      for (const [name, when] of [['rev_ins', 'INSERT'], ['rev_upd', 'UPDATE'], ['rev_del', 'DELETE']])
        this.sql.exec(`CREATE TRIGGER IF NOT EXISTS ${name} AFTER ${when} ON records BEGIN UPDATE rev SET n = n + 1 WHERE k = 1; END`);
      this.revOk = true;
    } catch (e) { this.revOk = false; console.error('state number not available:', e && e.message || e); }
    if (!this.sql.exec('SELECT id FROM records LIMIT 1').toArray().length) { for (const [id, v] of Object.entries(seed)) this.put(id, v); }
    // One-time steps of other changes. Neither may keep the workspace from starting (2026-11-26: the live site answered every
    // request with Cloudflare's "Error 1101 Worker threw exception" — an uncaught error while this object starts); a step
    // that fails is logged (Workers Logs) and tried again the next time the object starts.
    for (const [name, step] of [['ensureAIProject', ensureAIProject], ['movePartnerDescriptions', movePartnerDescriptions]]) {
      try { step(this); } catch (e) { console.error('startup step failed:', name, e && e.stack || e); }
    }
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
  // When the first editor of an item leaves while others still edit along, the one who joined first takes the lock over.
  promote() {
    for (const r of this.sql.exec('SELECT rowid,id,token,employee,expires FROM co_locks WHERE id NOT IN (SELECT id FROM edit_locks) ORDER BY rowid').toArray()) {
      if (this.sql.exec('SELECT id FROM edit_locks WHERE id=?', r.id).toArray().length) continue;
      this.sql.exec('INSERT OR REPLACE INTO edit_locks VALUES (?,?,?,?)', r.id, r.token, r.employee, r.expires); this.sql.exec('DELETE FROM co_locks WHERE id=? AND token=?', r.id, r.token);
    }
  }
  mayEdit(id, token) { return !!this.sql.exec('SELECT id FROM edit_locks WHERE id=? AND token=? UNION SELECT id FROM co_locks WHERE id=? AND token=?', id, token, id, token).toArray().length; }
  // may this member read the item (and so its versions)? A draft is only its writer's.
  readable(id, me) { const v = this.get('item:' + id); return !!v && !this.privateDraft(v, me); }
  get(id) { const r = this.sql.exec('SELECT data FROM records WHERE id=?', id).toArray()[0]; return r ? JSON.parse(r.data) : null; }
  formerUsers() { return Object.fromEntries(this.sql.exec('SELECT employee,name FROM removed_users').toArray().map(u => [u.employee,u.name])); }
  users() { return Object.fromEntries(this.sql.exec('SELECT * FROM users').toArray().map(u => [u.employee, u.name])); }
  locks() {
    const now = Date.now();
    const out = Object.fromEntries(this.sql.exec('SELECT l.id,l.employee,u.name,l.expires FROM edit_locks l LEFT JOIN users u ON l.employee=u.employee WHERE l.expires>? AND l.token IN (SELECT token FROM live_sessions WHERE expires>? AND seen>?)', now, now, now - PRESENCE_MS).toArray().map(l => [l.id, l]));
    for (const c of this.sql.exec('SELECT c.id,c.employee,u.name FROM co_locks c LEFT JOIN users u ON c.employee=u.employee WHERE c.expires>? AND c.token IN (SELECT token FROM live_sessions WHERE expires>? AND seen>?)', now, now, now - PRESENCE_MS).toArray()) if (out[c.id]) (out[c.id].co ||= []).push({ employee: c.employee, name: c.name });
    return out;
  }
  broadcast(data) {
    for (const ws of this.ctx.getWebSockets()) {
      try {
        const a = ws.deserializeAttachment();
        if (a && this.sql.exec('SELECT token FROM live_sessions WHERE token=? AND expires>?', a.token, Date.now()).toArray().length) {
          let out = data;
          if (data.records) { const rec = {}; for (const [k, v] of Object.entries(data.records)) { if (!this.hidden(k, v, a.employee)) rec[k] = v; else if (k.startsWith('item:')) rec[k] = null; } out = { ...data, records: rec }; }   // another member's draft reads as "not there"
          ws.send(JSON.stringify(out));
        }
        else ws.close(4001, 'Session ended');
      } catch { }
    }
  }
  // Roles live in meta:members ({<사번>: {role, …}}). Until somebody is 소유자 everybody may manage (the page's long-standing rule,
  // owner decision 2026-11-12); from then on the Worker itself refuses what the page hides (my-page spec, 2026-11-19).
  roles() { const m = this.get('meta:members') || {}; const role = id => (m[id] && m[id].role) || '멤버'; const owners = Object.keys(m).filter(id => role(id) === '소유자');
    return { m, role, owners, hasOwner: owners.length > 0, admin: id => !owners.length || ['소유자', '관리자'].includes(role(id)), owner: id => !owners.length || role(id) === '소유자' }; }
  // What a member may be sent: not other members' inbox / personal records, not other members' drafts.
  // (Drafts of the demo data that the design lists — table / card / cal — are listed for everybody, as before.)
  privateDraft(v, me) { return !!v && !!v.authorId && v.authorId !== me && (v.status === 'draft' || (v.status === 'trash' && v.prevStatus === 'draft')); }   // whatever fixture flags it carries (a recovered draft copied them and was sent to everybody)
  hidden(key, v, me) { if (key.startsWith('meta:inbox:')) return key !== 'meta:inbox:' + me; return key.startsWith('item:') && this.privateDraft(v, me); }
  // A change this member may not make: returns the reason, or '' when it is fine.
  denied(c, old, me, R) {
    const id = String(c.id);
    if (id.startsWith('meta:inbox:')) return id === 'meta:inbox:' + me ? '' : '다른 멤버의 수신함은 바꿀 수 없습니다.';
    if (id.startsWith('item:')) {
      if (this.privateDraft(old, me)) return '다른 멤버의 초안입니다.';
      if (!c.field && c.after == null && old && !(old.status === 'draft' && (!old.authorId || old.authorId === me)) && !R.owner(me)) return '영구 삭제는 소유자만 할 수 있습니다.';
      return '';
    }
    if (id === 'meta:members') {
      const removed = this.formerUsers();
      if (c.field ? Object.hasOwn(removed,c.field) : Object.keys(c.after || {}).some(k => Object.hasOwn(removed,k))) return '삭제된 멤버의 정보는 변경할 수 없습니다.';
      if (!R.hasOwner) return '';
      const one = (who, before, after) => { const a = before || {}, b = after || {}, ra = a.role || '멤버', rb = b.role || '멤버';
        if (ra !== rb) { if (!R.owner(me)) return '역할은 소유자만 바꿀 수 있습니다.'; if (ra === '소유자' && R.owners.length <= 1 && R.owners[0] === who) return '마지막 소유자는 바꿀 수 없습니다. 다른 소유자를 먼저 지정하세요.'; }
        if (JSON.stringify(a.ws || []) !== JSON.stringify(b.ws || []) && !R.admin(me)) return '팀스페이스 소속은 소유자·관리자가 바꿉니다.';
        if (who !== me && !R.admin(me)) return '다른 멤버의 정보는 소유자·관리자만 바꿀 수 있습니다.';
        return ''; };
      if (c.field) return one(c.field, (old || {})[c.field], c.after);
      for (const who of new Set([...Object.keys(old || {}), ...Object.keys(c.after || {})])) { const why = one(who, (old || {})[who], (c.after || {})[who]); if (why) return why; }
      return '';
    }
    // Two fields of the settings record are every member's to write: the trash of projects (deleting a project) and the editor's shared templates.
    if (id === 'meta:settings') { if (c.field === 'projTrash' || c.field === 'templates' || R.admin(me)) return ''; return '워크스페이스 설정은 소유자·관리자만 바꿀 수 있습니다.'; }
    return '';
  }
  // Login lifetime chosen in 설정 > 보안 (7 / 14 / 30 / 90 days after the last request).
  sessionKept(token) { try { const r = this.sql.exec('SELECT keep FROM live_sessions WHERE token=?', token).toArray()[0]; return !r || r.keep !== 0; } catch { return true; } }
  sessionMs() { const days = +(this.get('meta:settings')?.security?.sessionDays); return [7, 14, 30, 90].includes(days) ? days * 864e5 : SESSION_MS; }
  cleanup() {
    const now = Date.now();
    this.sql.exec('DELETE FROM live_sessions WHERE expires<?', now);
    this.sql.exec('DELETE FROM edit_locks WHERE expires<? OR token NOT IN (SELECT token FROM live_sessions WHERE seen>?)', now, now - PRESENCE_MS);
    this.sql.exec('DELETE FROM co_locks WHERE expires<? OR token NOT IN (SELECT token FROM live_sessions WHERE seen>?)', now, now - PRESENCE_MS); this.promote();
    if (now - this.lastPurge > 3600000) { this.lastPurge = now; this.purgeTrash(); }
  }
  // Items that have sat in the trash for TRASH_DAYS are removed for good, together with their attachments.
  purgeTrash() {
    const limit = new Date(Date.now() - TRASH_DAYS * 864e5).toISOString(); const gone = {};
    for (const r of this.sql.exec(`SELECT id,data FROM records WHERE id LIKE 'item:%' AND data LIKE '%"status":"trash"%'`).toArray()) {
      let v; try { v = JSON.parse(r.data); } catch { continue; }
      if (v.status === 'trash' && v.trashedAt && v.trashedAt < limit) { this.sql.exec('DELETE FROM records WHERE id=?', r.id); this.sql.exec('DELETE FROM files WHERE item=?', r.id.slice(5)); this.sql.exec('DELETE FROM versions WHERE item=?', r.id.slice(5)); gone[r.id] = null; }
    }
    for (const r of this.sql.exec(`SELECT id,data FROM records WHERE id LIKE 'partner:%' AND data LIKE '%"trash":true%'`).toArray()) {
      let v; try { v = JSON.parse(r.data); } catch { continue; }
      if (v.trash && v.trashedAt && v.trashedAt < limit) { this.sql.exec('DELETE FROM records WHERE id=?', r.id); gone[r.id] = null; }
    }
    const arch = this.get('meta:archive');
    if (Array.isArray(arch)) { let ch = false; for (const s of arch) { if (!s || !Array.isArray(s.cards)) continue; const keep = s.cards.filter(c => !(c && c.trash && c.trashedAt && c.trashedAt < limit)); if (keep.length !== s.cards.length) { s.cards = keep; ch = true; } }
      // a section that was sent to the trash (`gone`) leaves once its cards have been purged
      for (let i = arch.length - 1; i >= 0; i--) { const s = arch[i]; if (s && s.gone && Array.isArray(s.cards) && !s.cards.length) { arch.splice(i, 1); ch = true; } }
      if (ch) { this.put('meta:archive', arch); gone['meta:archive'] = arch; } }
    const st = this.get('meta:settings');
    if (st && st.projTrash) { const keep = Object.fromEntries(Object.entries(st.projTrash).filter(([, t]) => !(t && t.at && t.at < limit))); if (Object.keys(keep).length !== Object.keys(st.projTrash).length) { for (const pid of Object.keys(st.projTrash)) if (!(pid in keep)) this.sql.exec('DELETE FROM files WHERE item=?', 'sched-src-' + pid);   /* the source plans a member uploaded for it (schedule/ui/82-upload.js) */ st.projTrash = keep; this.put('meta:settings', st); gone['meta:settings'] = st; } }
    if (Object.keys(gone).length) { this.sql.exec('INSERT INTO history(employee,changed,at) VALUES (?,?,?)', 'system', JSON.stringify({ event: 'auto-purge', title: Object.keys(gone).length + '건' }), new Date().toISOString()); this.broadcast({ records: gone }); }
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

  // Korean holiday dates and names: official KASI when configured, otherwise the existing public feed. Daily cache.
  // Nothing about the workspace or its members is sent, only the year. When the service cannot be reached the page uses its own rules.
  async holidays(y) {
    const row = this.sql.exec('SELECT days, at FROM holidays WHERE year=?', y).toArray()[0], now = Date.now(), kept = row ? JSON.parse(row.days) : null;
    const source = this.env?.KASI_SERVICE_KEY ? 'kasi' : 'nager';
    const cached = kept?.format === 2 ? kept : { year: y, days: Array.isArray(kept) ? kept : [], names: {} };
    if (row && kept?.format === 2 && kept.source === source && now - row.at < 864e5) return { ...cached, src: 'kept' };
    const tried = (this.holTried ||= {});
    if (tried[y] && now - tried[y] < 5 * 60e3) return { ...cached, src: kept ? 'stale' : 'none' };
    tried[y] = now;
    try {
      const data = await fetchHolidays(y, this.env?.KASI_SERVICE_KEY);
      this.sql.exec('INSERT INTO holidays (year, days, at) VALUES (?,?,?) ON CONFLICT(year) DO UPDATE SET days=excluded.days, at=excluded.at', y, JSON.stringify(data), now);
      return { ...data, src: 'fetched' };
    } catch (e) { return { ...cached, src: kept ? 'stale' : 'none' }; }
  }

  async fetch(req) {
    if (this.startErr) { try { this.start(); this.startErr = null; } catch (e) { this.startErr = e; } }
    if (this.startErr) return json({ error: '서버를 시작하지 못했습니다. 잠시 뒤 다시 시도해 주세요. (' + String(this.startErr.message || this.startErr).slice(0, 200) + ')', detail: String(this.startErr.stack || this.startErr).slice(0, 1500) }, 503);
    try {
      const url = new URL(req.url); const path = url.pathname;
      if (req.method === 'POST' && req.headers.get('Origin') && req.headers.get('Origin') !== url.origin) return json({ error: '요청 출처 오류' }, 403);
      const fileGet = path.startsWith('/api/file/') && req.method === 'GET';
      const version = +(req.headers.get('X-AIDC-Client') || url.searchParams.get('v') || 0);
      if (!fileGet && version < MIN_CLIENT) return json({ error: '새 버전이 배포되었습니다. 새로고침(Ctrl+F5)한 뒤 다시 로그인하세요.', reload: true }, 401);

      if (path === '/api/login' && req.method === 'POST') {
        const { employee, name, remember } = await req.json(); const id = String(employee || '').trim().normalize('NFKC').toUpperCase();
        if (!/^[A-Z0-9_-]{1,40}$/.test(id)) return json({ error: '사번은 영문·숫자·하이픈·밑줄로 입력하세요.' }, 400);
        if (this.sql.exec('SELECT employee FROM removed_users WHERE employee=?', id).toArray().length) return json({ error: '삭제된 멤버입니다. 관리자에게 문의하세요.' }, 403);
        this.cleanup();
        const saved = this.sql.exec('SELECT name FROM users WHERE employee=?', id).toArray()[0]; const display = String(saved?.name || name || '').trim();
        if (!display || display.length > 40) return json({ error: '처음 로그인할 때 이름을 입력하세요. (40자 이내)' }, 400);
        const token = crypto.randomUUID(); const now = Date.now();
        this.sql.exec('INSERT OR IGNORE INTO users VALUES (?,?)', id, display);
        this.sql.exec('INSERT INTO live_sessions (token,employee,expires,seen,created,ua,sid) VALUES (?,?,?,?,?,?,?)', token, id, now + this.sessionMs(), now, now, String(req.headers.get('User-Agent') || '').slice(0, 300), crypto.randomUUID().replace(/-/g, '').slice(0, 16));
        // 자동 로그인 (2026-11-26): a login without it gets a file cookie that ends with the browser; pages of an older build send nothing = kept
        const keep = remember === false ? 0 : 1; try { this.sql.exec('UPDATE live_sessions SET keep=? WHERE token=?', keep, token); } catch { }
        this.sql.exec('INSERT INTO history(employee,changed,at) VALUES (?,?,?)', id, JSON.stringify({ event: 'login' }), new Date().toISOString());
        this.broadcast({ users: this.users(), formerUsers: this.formerUsers() });
        return json({ employee: id, name: display, token }, 200, { 'Set-Cookie': fileCookie(req, token, keep ? this.sessionMs() / 1000 : null) });
      }

      const token = req.headers.get('Authorization')?.replace(/^Bearer /, '') || (path === '/api/live' ? url.searchParams.get('token') : '') || (fileGet ? ((req.headers.get('Cookie') || '').match(/(?:^|;\s*)aidc_file=([^;]+)/)?.[1] || '') : '');
      const now = Date.now();
      const session = this.sql.exec('SELECT employee FROM live_sessions WHERE token=? AND expires>?', token || '', now).toArray()[0];
      if (!session) return json({ error: '로그인이 필요합니다.' }, 401);
      this.sql.exec('UPDATE live_sessions SET expires=?, seen=? WHERE token=?', now + this.sessionMs(), now, token);
      const me = session.employee;
      if (path === '/api/state') { try { this.sql.exec("UPDATE live_sessions SET ua=? WHERE token=? AND (ua IS NULL OR ua='')", String(req.headers.get('User-Agent') || '').slice(0, 300), token); } catch { } }

      if (path.startsWith('/api/ai-project/')) return aiProjectRoute(this,req,me,token);
      if (path === '/api/logout') {
        this.sql.exec('DELETE FROM live_sessions WHERE token=?', token); this.sql.exec('DELETE FROM edit_locks WHERE token=?', token); this.sql.exec('DELETE FROM co_locks WHERE token=?', token); this.promote();
        this.broadcast({ locks: this.locks() });
        return json({ ok: true }, 200, { 'Set-Cookie': fileCookie(req, '', 0) });
      }
      if (path === '/api/unfurl' && req.method === 'GET') { // at most 30 look-ups a minute per member
        const t = Date.now(); const log = ((this.unfurls ||= new Map()).get(me) || []).filter(x => t - x < 60000);
        if (log.length >= 30) return json({ error: '잠시 후 다시 시도하세요.' }, 429);
        log.push(t); this.unfurls.set(me, log);
        return json(await unfurl(url.searchParams.get('url') || ''));
      }
      if (path === '/api/devreport' && req.method === 'GET') return json(devReport);   // the review list's data file, for a member who is logged in (the page applies it once: applyDevReportV1)
      if (path === '/api/holidays' && req.method === 'GET') { // the public holidays of one year: red dates in the calendars
        const y = Number(url.searchParams.get('y')); if (!Number.isInteger(y) || y < 2000 || y > 2100) return json({ error: '연도를 확인해주세요.' }, 400);
        return json(await this.holidays(y));
      }
      if (path === '/api/heartbeat') { this.cleanup(); return json({ locks: this.locks(), users: this.users(), formerUsers: this.formerUsers(), minClient: MIN_CLIENT }); }
      if (path === '/api/state') {
        let rev = null; if (this.revOk) { try { const r = this.sql.exec('SELECT n FROM rev WHERE k=1').toArray()[0]; rev = r ? String(r.n) : null; } catch { rev = null; } }
        if (rev !== null && url.searchParams.get('since') === rev) return json({ same: true, rev, users: this.users(), formerUsers: this.formerUsers(), locks: this.locks(), minClient: MIN_CLIENT });
        return json({ employee: me, name: this.users()[me], users: this.users(), formerUsers: this.formerUsers(), locks: this.locks(), minClient: MIN_CLIENT, rev,
          records: Object.fromEntries(this.sql.exec('SELECT * FROM records').toArray().map(r => [r.id, JSON.parse(r.data)]).filter(([k, v]) => !this.hidden(k, v, me))) },
          200, { 'Set-Cookie': fileCookie(req, token, this.sessionKept(token) ? this.sessionMs() / 1000 : null) });
      }
      if (path === '/api/live' && req.headers.get('Upgrade') === 'websocket') {
        const pair = new WebSocketPair(); this.ctx.acceptWebSocket(pair[1]); pair[1].serializeAttachment({ token, employee: me });
        return new Response(null, { status: 101, webSocket: pair[0] });
      }
      // My logins: where I am signed in, and ending one of them (or all the others). Tokens are never sent back; a login is named by its sid.
      if (path === '/api/sessions' && req.method === 'GET') {
        const mine = this.sql.exec('SELECT token,sid,created,seen,expires,ua FROM live_sessions WHERE employee=? AND expires>? ORDER BY seen DESC', me, now).toArray();
        const online = new Set(this.ctx.getWebSockets().map(w => { try { return w.deserializeAttachment()?.token; } catch { return ''; } }));
        return json({ sessions: mine.map(s => ({ id: s.sid, current: s.token === token, created: s.created || null, seen: s.seen, expires: s.expires, ua: s.ua || '', online: online.has(s.token) })), sessionDays: Math.round(this.sessionMs() / 864e5) });
      }
      if (path === '/api/session' && req.method === 'POST') {
        const b = await req.json(); const rows = this.sql.exec('SELECT token,sid FROM live_sessions WHERE employee=? AND token<>?', me, token).toArray().filter(s => b.others === true || s.sid === String(b.id || ''));
        for (const s of rows) { this.sql.exec('DELETE FROM live_sessions WHERE token=?', s.token); this.sql.exec('DELETE FROM edit_locks WHERE token=?', s.token); this.sql.exec('DELETE FROM co_locks WHERE token=?', s.token); }
        if (rows.length) { const gone = new Set(rows.map(s => s.token)); this.promote();
          for (const ws of this.ctx.getWebSockets()) { try { if (gone.has(ws.deserializeAttachment()?.token)) ws.close(4001, 'Session ended'); } catch { } }
          this.sql.exec('INSERT INTO history(employee,changed,at) VALUES (?,?,?)', me, JSON.stringify({ event: 'logout-other', title: rows.length + '개 기기' }), new Date().toISOString());
          this.broadcast({ locks: this.locks() }); }
        return json({ ended: rows.length });
      }
      if (path === '/api/me' && req.method === 'POST') { // change my own display name
        const name = String((await req.json()).name || '').trim();
        if (!name || name.length > 40 || /[\u0000-\u001f\u007f]/.test(name)) return json({ error: '이름은 1~40자로 입력하세요. (제어문자는 쓸 수 없습니다)' }, 400);
        this.sql.exec('UPDATE users SET name=? WHERE employee=?', name, me); this.broadcast({ users: this.users(), formerUsers: this.formerUsers() });
        return json({ name, users: this.users(), formerUsers: this.formerUsers() });
      }
      if (path === '/api/members/delete' && req.method === 'POST') {
        const b = await req.json();
        const R = this.roles();
        if (!R.admin(me)) return json({ error: '멤버 삭제는 소유자·관리자만 할 수 있습니다.' }, 403);
        if (!Array.isArray(b.ids) || !b.ids.length || b.ids.length > 1000 || b.ids.some(id => typeof id !== 'string')) return json({ error: '삭제할 사용자를 선택하세요.' }, 400);
        const ids = [...new Set(b.ids)], users = this.users();
        if (ids.some(id => !Object.hasOwn(users,id))) return json({ error: '멤버 목록이 변경되었습니다. 다시 선택하세요.' }, 409);
        if (ids.includes(me)) return json({ error: '현재 로그인한 사용자는 삭제할 수 없습니다.' }, 400);
        if (!R.owner(me) && ids.some(id => R.role(id) === '소유자')) return json({ error: '소유자는 소유자만 삭제할 수 있습니다.' }, 403);
        if (R.owners.length && R.owners.every(id => ids.includes(id))) return json({ error: '마지막 소유자는 삭제할 수 없습니다.' }, 400);
        const members = {...R.m}, at = new Date().toISOString();
        this.ctx.storage.transactionSync(() => {
          for (const id of ids) {
            this.sql.exec('INSERT OR REPLACE INTO removed_users VALUES (?,?,?)', id, users[id], at);
            this.sql.exec('DELETE FROM live_sessions WHERE employee=?', id);
            this.sql.exec('DELETE FROM edit_locks WHERE employee=?', id);
            this.sql.exec('DELETE FROM co_locks WHERE employee=?', id);
            this.sql.exec('DELETE FROM users WHERE employee=?', id);
            delete members[id];
          }
          this.put('meta:members', members);
          this.sql.exec('INSERT INTO history(employee,changed,at) VALUES (?,?,?)', me, JSON.stringify({event:'delete-members',title:ids.length+'명 삭제',ids}), at);
        });
        this.promote();
        const data = {deleted:ids, users:this.users(), formerUsers:this.formerUsers(), records:{'meta:members':members}, locks:this.locks()};
        this.broadcast(data);
        return json(data);
      }
      if (path === '/api/user' && req.method === 'POST') { // register a member ahead of their first login
        if (!this.roles().admin(me)) return json({ error: '멤버 추가는 소유자·관리자만 할 수 있습니다.' }, 403);
        const b = await req.json(); const id = String(b.employee || '').trim().normalize('NFKC').toUpperCase(); const name = String(b.name || '').trim();
        if (!/^[A-Z0-9_-]{1,40}$/.test(id)) return json({ error: '사번은 영문·숫자·하이픈·밑줄로 입력하세요.' }, 400);
        if (!name || name.length > 40) return json({ error: '이름은 1~40자로 입력하세요.' }, 400);
        if (this.sql.exec('SELECT employee FROM users WHERE employee=?', id).toArray().length) return json({ error: '이미 등록된 사번입니다.' }, 409);
        this.sql.exec('DELETE FROM removed_users WHERE employee=?', id);
        this.sql.exec('INSERT INTO users VALUES (?,?)', id, name); this.broadcast({ users: this.users(), formerUsers: this.formerUsers() });
        return json({ employee: id, name, users: this.users(), formerUsers: this.formerUsers() });
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
        if (url.searchParams.get('audit') === '1' && !this.roles().admin(me)) return json({ error: '감사 로그는 소유자·관리자만 볼 수 있습니다.' }, 403);
        const limit = Math.min(300, Math.max(1, +url.searchParams.get('limit') || 100));
        return json(this.feed(limit, +url.searchParams.get('before') || 0));
      }
      if (path === '/api/lock' && req.method === 'POST') {
        const { id, action } = await req.json(); if (!/^(item:|project:)/.test(id)) return json({ error: '잘못된 항목' }, 400);
        this.cleanup();
        const old = this.sql.exec('SELECT * FROM edit_locks WHERE id=?', id).toArray()[0]; const others = old && old.token !== token;
        const along = !!this.sql.exec('SELECT id FROM co_locks WHERE id=? AND token=?', id, token).toArray().length; let co = false;
        if (action === 'release') { this.sql.exec('DELETE FROM edit_locks WHERE id=? AND token=?', id, token); this.sql.exec('DELETE FROM co_locks WHERE id=? AND token=?', id, token); this.promote(); }
        else if (others && (along || (action === 'join' && id.startsWith('item:')))) { // editing along with the member who holds the lock
          if (!this.get(id)) return json({ error: '항목을 찾을 수 없습니다.' }, 404);
          this.sql.exec('INSERT OR REPLACE INTO co_locks VALUES (?,?,?,?)', id, token, me, Date.now() + LOCK_MS); co = true; }
        else if (others) return json({ error: (this.users()[old.employee] || old.employee) + '님이 수정 중입니다', locks: this.locks() }, 423);
        else { if (!this.get(id)) return json({ error: '항목을 찾을 수 없습니다.' }, 404); this.sql.exec('INSERT OR REPLACE INTO edit_locks VALUES (?,?,?,?)', id, token, me, Date.now() + LOCK_MS); }
        const locks = this.locks(); this.broadcast({ locks }); return json({ locks, record: this.get(id), co });
      }
      if (path === '/api/change' && req.method === 'POST') {
        let { changes, src } = await req.json(); if (!Array.isArray(changes) || changes.length > MAX_CHANGES) return json({ error: '잘못된 변경 요청' }, 400);
        src = typeof src === 'string' && /^[\w-]{8,48}$/.test(src) ? src : '';   // which open page saves this: handed on with the broadcast, so that page can tell its own save from somebody else's (older pages send none)
        const applied = {}; let conflict = null; const summary = []; const versioned = new Set(), seenFirst = new Map();
        this.cleanup();
        // What this member may not change. A whole record (or a delete) refuses the request; a single field is left out and the record is
        // handed back as it stands, so the page shows the server's value again instead of retrying.
        const refused = [];
        { const R = this.roles(); const keep = [];
          for (const c of changes) { if (!c || typeof c.id !== 'string') { keep.push(c); continue; } const why = this.denied(c, this.get(c.id), me, R);
            if (!why) { keep.push(c); continue; }
            if (!c.field) return json({ error: why, denied: [{ id: c.id, field: '', why }] }, 403);
            refused.push({ id: c.id, field: c.field, why }); }
          changes = keep; }
        for (const c of changes) {
          if (c.field === 'comments' && String(c.id).startsWith('item:')) continue; // commenting is allowed while someone else edits the item
          const lockId = c.id === 'meta:head' && c.field ? 'project:' + c.field : c.id;
          const lock = this.sql.exec('SELECT * FROM edit_locks WHERE id=?', lockId).toArray()[0];
          if (lock && lock.token !== token && !this.mayEdit(lockId, token)) return json({ error: (this.users()[lock.employee] || lock.employee) + '님이 수정 중입니다', locked: lockId, locks: this.locks() }, 423);
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
            else if (c.id.startsWith('meta:sched:')) entry.t = '프로젝트 일정';
            summary.push(entry);
          }
          // one version per item and request, taken once every field of the request is in (title, body and "ed" arrive as separate fields)
          for (const id of versioned) this.version(id.slice(5), seenFirst.get(id) || null, this.get(id), me);
          if (summary.length) this.sql.exec('INSERT INTO history(employee,changed,at) VALUES (?,?,?)', me, JSON.stringify(summary), new Date().toISOString());
        });
        if (conflict) return json({ error: '다른 사용자의 변경과 겹칩니다.', conflict }, 409);
        if (Object.keys(applied).length) this.broadcast({ records: applied, users: this.users(), formerUsers: this.formerUsers(), locks: this.locks(), ...(src ? { src } : {}) });
        if (!refused.length) return json({ records: applied });
        const back = { ...applied }; for (const d of refused) if (!(d.id in back)) back[d.id] = this.get(d.id) ?? null;
        return json({ records: back, denied: refused, error: refused[0].why });
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

  // Sockets that have the shared document of an item open (other than "but").
  ysubs(item, but) { return this.ctx.getWebSockets().filter(w => { if (w === but) return false; try { const a = w.deserializeAttachment(); return !!(a && a.ys && a.ys[item]); } catch { return false; } }); }
  ysend(list, data) { const s = JSON.stringify(data); for (const w of list) { try { w.send(s); } catch { } } }
  yleave(ws, a, item) { if (!a || !a.ys || !a.ys[item]) return; const cid = a.ys[item]; delete a.ys[item]; try { ws.serializeAttachment(a); } catch { }
    const rest = this.ysubs(item, ws); if (rest.length) this.ysend(rest, { y: 'left', item, cid }); else this.sql.exec('DELETE FROM ydocs WHERE item=?', item); } // the session ends with its last editor: the saved body is the document again
  ymessage(ws, d) {
    const a = ws.deserializeAttachment(); const item = String(d.item || ''); if (!a || !/^[\w-]{1,80}$/.test(item)) return;
    if (d.y === 'leave') { this.yleave(ws, a, item); return; }
    if (d.y === 'no') { // the member holding the lock cannot share this edit: tell those who asked to edit along
      const tokens = new Set(this.sql.exec('SELECT token FROM co_locks WHERE id=?', 'item:' + item).toArray().map(r => r.token));
      this.ysend(this.ctx.getWebSockets().filter(w => { try { return tokens.has(w.deserializeAttachment()?.token); } catch { return false; } }), { y: 'no', item }); return; }
    if (!this.mayEdit('item:' + item, a.token)) { this.ysend([ws], { y: 'denied', item }); return; }
    if (d.y === 'join') { a.ys = a.ys || {}; if (Object.keys(a.ys).length >= 4 && !a.ys[item]) return; a.ys[item] = String(d.cid || '').slice(0, 16) || 'x'; ws.serializeAttachment(a);
      const row = this.sql.exec('SELECT state FROM ydocs WHERE item=?', item).toArray()[0];
      this.ysend([ws], { y: 'state', item, u: row ? toB64(new Uint8Array(row.state)) : null, peers: this.ysubs(item, ws).length }); this.ysend(this.ysubs(item, ws), { y: 'hello', item }); return; }
    if (!a.ys || !a.ys[item]) return;
    if (d.y === 'aw' && typeof d.a === 'string' && d.a.length < 60000) { this.ysend(this.ysubs(item, ws), { y: 'aw', item, a: d.a }); return; }
    if (d.y === 'up' && typeof d.u === 'string' && d.u.length < 1400000) {
      let u; try { u = fromB64(d.u); } catch { return; }
      const row = this.sql.exec('SELECT state FROM ydocs WHERE item=?', item).toArray()[0];
      let state = u; if (row) { try { state = mergeUpdates([new Uint8Array(row.state), u]); } catch { return; } }
      if (state.byteLength <= Y_MAX) this.sql.exec('INSERT OR REPLACE INTO ydocs VALUES (?,?,?)', item, state, Date.now());
      this.ysend(this.ysubs(item, ws), { y: 'up', item, u: d.u });
    }
  }
  webSocketMessage(ws, message) {
    if (typeof message === 'string' && message.charCodeAt(0) === 123) { let d; try { d = JSON.parse(message); } catch { return; } if (d && d.y) { try { this.ymessage(ws, d); } catch { } } return; }
    if (message === 'ping') {
      const a = ws.deserializeAttachment(); const now = Date.now();
      if (a) this.sql.exec('UPDATE live_sessions SET seen=?, expires=? WHERE token=? AND expires>?', now, now + this.sessionMs(), a.token, now);
      ws.send('pong');
    }
  }
  webSocketClose(ws) {
    // When the last tab of a session closes, let its edit locks lapse after 15 seconds instead of 2 minutes.
    const a = ws.deserializeAttachment();
    if (a && a.ys) for (const item of Object.keys(a.ys)) { try { this.yleave(ws, a, item); } catch { } }
    if (a && !this.ctx.getWebSockets().some(other => other !== ws && other.deserializeAttachment()?.token === a.token)) this.sql.exec('UPDATE live_sessions SET seen=MIN(seen,?) WHERE token=?', Date.now() - PRESENCE_MS + 15000, a.token);
    ws.close();
  }
}
