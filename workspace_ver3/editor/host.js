// The only things the editor knows about the app around it. The app fills these in once (AIDCEditor.configure).
export const ctx = {
  dateText: null,                  // (Date) => the page's own way of writing a date, when it has one
  users: () => [],                 // [{id, name}]
  userName: (id, fallback) => fallback || id,
  userIdByName: () => null,
  pages: () => [],                 // [{id, title, kind}]
  pageTitle: (id, fallback) => fallback || '',
  fileKind: () => ({ cls: 'etc', lb: 'FILE' }),
  upload: null,                    // async (file, itemId) => {id, src}
  clean: h => h,                   // sanitiser for HTML the schema does not know
  toast: () => {},
  openItem: () => {},
  today: () => new Date().toISOString().slice(0, 10),
  zoom: () => 1,
};
export function configure(o) { Object.assign(ctx, o || {}); }

export const SCHEMA_VERSION = 2;
// data-type values the schema reads; anything else found in a stored body is kept as a raw block
export const KNOWN_TYPES = ['callout', 'image', 'file', 'bookmark', 'embed', 'columns', 'column', 'toc', 'raw', 'date', 'mention', 'pageLink', 'taskList', 'taskItem', 'detailsContent', 'details', 'math', 'mathBlock', 'button', 'synced', 'itemList'];
export const newId = () => 'b' + Math.random().toString(36).slice(2, 8) + Date.now().toString(36).slice(-4);
export const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

/* links and media addresses: only what the page may safely open */
export function safeHref(u) {
  u = String(u || '').trim(); if (!u) return '';
  if (/^(https?:|mailto:|tel:)/i.test(u)) return u;
  if (/^\/api\/file\/[\w-]+/.test(u) || u.startsWith('#')) return u;
  if (/^[a-z][a-z0-9+.-]*:/i.test(u)) return '';            // javascript:, data:, vbscript:, file: ...
  if (/^[\w-]+(\.[\w-]+)+(\/|$|\?|#|:\d)/.test(u)) return 'https://' + u; // "example.com/x" typed without a scheme
  return '';
}
export function safeSrc(u, allowData) {
  u = String(u || '').trim();
  if (/^https?:\/\//i.test(u) || /^\/api\/file\/[\w-]+/.test(u)) return u;
  if (allowData && /^data:image\/(png|jpe?g|gif|webp|bmp|avif);base64,/i.test(u)) return u;
  return '';
}

/* embeds: only services that are known to allow framing; everything else becomes a bookmark */
export function embedUrl(u) {
  let x; try { x = new URL(u); } catch { return null; }
  if (!/^https?:$/.test(x.protocol)) return null;
  const h = x.hostname.replace(/^www\./, '');
  let m;
  if (h === 'youtu.be' && x.pathname.length > 1) return { src: 'https://www.youtube.com/embed/' + x.pathname.slice(1).split('/')[0], kind: 'iframe', label: 'YouTube' };
  if (/(^|\.)youtube\.com$/.test(h)) {
    if (x.pathname === '/watch' && x.searchParams.get('v')) return { src: 'https://www.youtube.com/embed/' + x.searchParams.get('v'), kind: 'iframe', label: 'YouTube' };
    if ((m = /^\/(embed|shorts|live)\/([\w-]+)/.exec(x.pathname))) return { src: 'https://www.youtube.com/embed/' + m[2], kind: 'iframe', label: 'YouTube' };
  }
  if (h === 'vimeo.com' && (m = /^\/(\d+)/.exec(x.pathname))) return { src: 'https://player.vimeo.com/video/' + m[1], kind: 'iframe', label: 'Vimeo' };
  if (h === 'player.vimeo.com') return { src: u, kind: 'iframe', label: 'Vimeo' };
  if (/(^|\.)google\.[a-z.]+$/.test(h) && x.pathname.startsWith('/maps/embed')) return { src: u, kind: 'iframe', label: 'Google 지도' };
  if (h === 'figma.com' && /^\/(file|design|proto|board)\//.test(x.pathname)) return { src: 'https://www.figma.com/embed?embed_host=aidc&url=' + encodeURIComponent(u), kind: 'iframe', label: 'Figma' };
  if (h === 'docs.google.com' && /\/(pub|preview|embed)\b/.test(x.pathname)) return { src: u, kind: 'iframe', label: 'Google 문서' };
  // files shared from Google Drive ("링크가 있는 모든 사용자" or the viewer's own Google login): the preview page may be framed
  if (h === 'drive.google.com' && (m = /^\/file\/d\/([\w-]+)/.exec(x.pathname))) return { src: 'https://drive.google.com/file/d/' + m[1] + '/preview', kind: 'iframe', label: 'Google Drive' };
  if (h === 'docs.google.com' && (m = /^\/(document|spreadsheets|presentation)\/d\/([\w-]+)/.exec(x.pathname)) && m[2] !== 'e') return { src: `https://docs.google.com/${m[1]}/d/${m[2]}/preview`, kind: 'iframe', label: 'Google 문서' };
  if (/\.(mp4|webm|mov)(\?|$)/i.test(x.pathname)) return { src: u, kind: 'video', label: '동영상' };
  if (/\.(mp3|wav|m4a|ogg)(\?|$)/i.test(x.pathname)) return { src: u, kind: 'audio', label: '오디오' };
  return null;
}

/* colours are stored as names, never as raw CSS */
export const COLORS = ['gray', 'brown', 'orange', 'yellow', 'green', 'blue', 'purple', 'pink', 'red'];
export const COLOR_NAMES = { gray: '회색', brown: '갈색', orange: '주황', yellow: '노랑', green: '초록', blue: '파랑', purple: '보라', pink: '분홍', red: '빨강' };
const TEXT_RGB = { gray: [142, 142, 142], brown: [138, 90, 60], orange: [217, 115, 13], yellow: [181, 138, 0], green: [31, 142, 0], blue: [0, 104, 255], purple: [105, 64, 165], pink: [194, 24, 122], red: [211, 0, 0] };
const BG_RGB = { gray: [241, 241, 239], brown: [244, 238, 238], orange: [251, 236, 221], yellow: [255, 242, 168], green: [233, 244, 230], blue: [231, 243, 248], purple: [237, 236, 255], pink: [244, 230, 237], red: [253, 235, 236] };
function rgbOf(c) {
  c = String(c || '').trim().toLowerCase(); let m;
  if ((m = /^#([0-9a-f])([0-9a-f])([0-9a-f])$/.exec(c))) return [m[1], m[2], m[3]].map(x => parseInt(x + x, 16));
  if ((m = /^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})/.exec(c))) return [m[1], m[2], m[3]].map(x => parseInt(x, 16));
  if ((m = /^rgba?\(\s*(\d+)[,\s]+(\d+)[,\s]+(\d+)(?:[,\s/]+([\d.]+))?/.exec(c))) return m[4] !== undefined && +m[4] === 0 ? null : [+m[1], +m[2], +m[3]];
  return null;
}
// the colour name closest to a CSS colour; null when it is (nearly) the default ink or paper
export function colorToken(css, bg) {
  const c = rgbOf(css); if (!c) return null;
  const lum = (c[0] * 299 + c[1] * 587 + c[2] * 114) / 1000, spread = Math.max(...c) - Math.min(...c);
  if (!bg && lum < 70 && spread < 40) return null;       // black-ish text
  if (bg && lum > 250 && spread < 6) return null;        // white background
  const map = bg ? BG_RGB : TEXT_RGB; let best = null, bd = 1e9;
  for (const k of COLORS) { const t = map[k]; const d = (t[0] - c[0]) ** 2 + (t[1] - c[1]) ** 2 + (t[2] - c[2]) ** 2; if (d < bd) { bd = d; best = k; } }
  return best;
}

export const pad2 = n => String(n).padStart(2, '0');
export const fmtDate = d => { const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(d || ''); return m ? `${m[1]}. ${+m[2]}. ${+m[3]}` : (d || ''); };
export const fmtSize = n => n > 1048576 ? (n / 1048576).toFixed(1) + ' MB' : n > 1024 ? Math.round(n / 1024) + ' KB' : n + ' B';
