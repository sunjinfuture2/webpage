// The report as slides, on the company's presentation template (owner, 2026-11-25, forty-first round: "내보내기에서 ppt
// 가이드는 이걸 사용해", then the owner's own corrections of the first draft, and "요약을 체크하면 항목당 한 페이지짜리로").
// PptxGenJS (MIT) writes the file. Nothing of the template file itself is in the repository: its rules are kept here as
// numbers, measured from it —
//   · the slide is 290 x 210 mm (11.417 x 8.267 in); the text keeps to 0.704 … 10.723 in; one typeface, Freesentation, in its
//     weights (it must be installed where the file is opened); every text box without inner margins;
//   · the INDEX AREA is fixed on every page — "자료 제목 I 현재 대목차" at the upper left, the title's start, the page number
//     at the lower right, the mark at the upper right of contents and dividers — only its words change;
//   · the one accent is the signature orange (245,130,32); lines are 0.5pt, on cover, contents and dividers 1pt;
//   · tables have no upright lines: 0.5pt above and below, heads and first column bold, text light 10pt.
// What it is handed (schXPptOf, schedule/ui/92-export.js): doc.ppt = {kind:'proj', proj (the overview as it is kept), parts,
// forms {part:'sum'|'full'}, full {part: blocks in FULL form}} or {kind:'main', projects, sheets}. A part in 요약 is ONE page
// (the overview: figures, texts, table, dates and risks together, set as small as it takes); a part in FULL runs on.
// Bundled on its own (public/schedule-pptx.js) and fetched when a PPT is asked for.
import PptxGenJS from 'pptxgenjs';
import JSZip from 'jszip';

const W = 11.417, HT = 8.267, L = 0.704, R = 10.723, CW = R - L, BOT = 7.62;
const F3 = 'Freesentation 3 Light', F4 = 'Freesentation 4 Regular', F5 = 'Freesentation 5 Medium', F6 = 'Freesentation 6 SemiBold', F7 = 'Freesentation 7 Bold';
const OR = 'F58220', K = '000000', G85 = '262626', G75 = '404040', GD = 'A6A6A6', BOX = 'D9D9D9', BAND = 'F2F2F2', LN = '0D0D0D', NUM = '2D2D2D', SUB = '595959', CHIP = '767171', CHIPLN = 'AEAAAA', RED = 'C00000';
const THIN = 0.5, THICK = 1, LH = 1.173;      // LH: a line of this typeface is 1.173 em tall before the spacing is applied
const DEF: Record<string, string> = { kpi: '핵심 지표', fin: '사업성 지표', main: '사업 개요', plan: '추진 일정', infra: '입지 및 전력 인프라', struct: '사업 구조 및 수익 모델', stat: '추진 현황 및 주요 특성', risk: '주요 리스크 및 검토사항', partners: '협력업체' };
const PART: Record<string, string[]> = { ov: ['프로젝트 상세', 'Project Detail'], state: ['진행 현황', 'Status Summary'], act: ['액션 일정', 'Schedule'], proc: ['외부설비 조달', 'Procurement'], gate: ['승인게이트', 'Approval Gates'], evid: ['근거 및 확약', 'Evidence & Commitments'], meet: ['미팅', 'Meetings'], part: ['협력업체', 'Partners'] };
const GROUPS: { parts: string[]; all: string[] }[] = [{ parts: ['ov'], all: PART.ov }, { parts: ['state', 'act'], all: ['진행 현황 및 일정', 'Status & Schedule'] }, { parts: ['proc', 'gate', 'evid'], all: ['조달 및 승인', 'Procurement & Approval'] }, { parts: ['meet', 'part'], all: ['미팅 및 협력업체', 'Meetings & Partners'] }];

// how wide a text runs (em): Hangul is nearly a full square, Latin and digits about half
const emOf = (t: any): number => { let n = 0; for (const c of String(t == null ? '' : t)) { const u = c.codePointAt(0) || 0; n += u > 0x2e80 ? 0.92 : c === ' ' ? 0.27 : /[.,:;·'()\[\]|\/!\-]/.test(c) ? 0.33 : /[A-Z0-9%$~+=m²]/.test(c) ? 0.6 : 0.52; } return n; };
// lines a text takes in a box `w` inches wide at `sz` points — wrapped at words, as PowerPoint wraps Korean
const linesOf = (t: any, w: number, sz: number): number => String(t == null ? '' : t).split('\n').reduce((a, p) => { const k = sz / 72 * 1.04, sp = 0.27 * k; let n = 1, x = 0; for (const word of p.split(' ')) { const ww = emOf(word) * k; if (x > 0 && x + sp + ww > w) { n++; x = 0; } if (ww > w) { n += Math.ceil(ww / w) - 1; x = ww % w; } else x += (x > 0 ? sp : 0) + ww; } return a + n; }, 0);
const hOf = (t: any, w: number, sz: number, ls = 1.2): number => linesOf(t, w, sz) * sz * ls * LH / 72;
const iso = (s: any): string => { const m = /(\d{4})\D+(\d{1,2})(?:\D+(\d{1,2}))?/.exec(String(s || '')); return m ? `${m[1]}-${m[2].padStart(2, '0')}-${(m[3] || '01').padStart(2, '0')}` : ''; };
const T = (d: string): number => Date.parse(d + 'T00:00:00Z');
const textOf = (b: any): string => (b.runs || []).map((r: any) => r.t || '').join('');
const one = (t: any): string => String(t == null ? '' : t).replace(/\s*\n\s*/g, ' ');

async function make(doc: any, opt: any = {}): Promise<ArrayBuffer> {
  const P: any = doc.ppt || { kind: 'doc' };
  const pptx: any = new PptxGenJS();
  pptx.defineLayout({ name: 'SUNJIN', width: W, height: HT }); pptx.layout = 'SUNJIN';
  pptx.title = String((doc.title || []).join(' ')).replace(/[&<>"']/g, ' ');     // (the library writes the properties unescaped)
  const ST = pptx.ShapeType;
  const DOC_TITLE = P.kind === 'proj' ? `${P.proj.name} 프로젝트 보고서` : P.kind === 'main' ? 'AIDC 프로젝트 개발검토 리스트' : String((doc.title || ['보고서'])[0]);
  const day = String(P.today || new Date().toISOString().slice(0, 10)), dayDot = day.replace(/-/g, '. ');

  /* ---------- small tools ---------- */
  const tx = (s: any, t: any, x: number, y: number, w: number, h: number, o: any = {}) => s.addText(Array.isArray(t) ? t.map((r: any) => ({ text: String(r.text == null ? '' : r.text), options: Object.assign({}, r.options || {}) })) : String(t == null ? '' : t), Object.assign({ x, y, w, h, margin: 0, fontFace: F3, fontSize: 13, color: K, valign: 'top', align: 'left', fit: 'none', wrap: true }, o));
  const line = (s: any, x: number, y: number, w: number, pt = THIN, color = LN) => s.addShape(ST.line, { x, y, w, h: 0, line: { color, width: pt } });
  const vline = (s: any, x: number, y: number, h: number, pt = THIN, color = LN) => s.addShape(ST.line, { x, y, w: 0, h, line: { color, width: pt } });
  const rect = (s: any, x: number, y: number, w: number, h: number, fill: string) => s.addShape(ST.rect, { x, y, w, h, fill: { color: fill }, line: { type: 'none' } });
  const dot = (s: any, cx: number, cy: number, d: number, fill: string, border?: string) => s.addShape(ST.ellipse, { x: cx - d / 2, y: cy - d / 2, w: d, h: d, fill: { color: fill }, line: border ? { color: border, width: 0.75 } : { type: 'none' } });
  const paras = (t: any, o: any = {}) => String(t == null ? '' : t).split('\n').map((p, i, a) => ({ text: p, options: Object.assign({}, o, { breakLine: i < a.length - 1 }) }));
  // "보완 필요", "자료 없음", "확인 필요" stand in the signature colour, as on the page
  const flag = (t: any) => { const m = /^(보완 필요|자료 없음|확인 필요)([\s\S]*)$/.exec(String(t == null ? '' : t)); return m ? [{ text: m[1], options: { color: OR, fontFace: F5 } }, { text: m[2], options: {} }] : String(t == null ? '' : t); };

  /* ---------- the index area ---------- */
  let pageNo = 0; const TOC: any[] = [];
  function page(section: string, o: any = {}) { const s = pptx.addSlide(); pageNo++; s.background = { color: 'FFFFFF' };
    if (!o.cover) tx(s, `${DOC_TITLE}  I  ${section || ''}`, L - 0.001, 0.359, 8, 0.173, { fontFace: F4, fontSize: 10, color: G75 });
    if (o.logo && opt.logoSmall) s.addImage({ data: opt.logoSmall, x: 10.135, y: 0.375, w: 0.614, h: 0.139 });
    if (!o.cover && !o.noNum) s.slideNumber = { x: 9.766, y: 7.743, w: 0.947, h: 0.339, fontFace: F4, fontSize: 10, color: NUM, align: 'right', margin: 0 };
    s._no = pageNo; return s; }
  const toc = (s: any, t: string) => { if (TOC.length) TOC[TOC.length - 1].subs.push([t, s._no]); };
  // a title in two parts: the heading in the signature colour and its English beside it; a line of description under it
  function headOv(s: any, ko: string, en: string, desc?: string) { tx(s, [{ text: ko, options: { color: OR } }, { text: en ? '  ' + en : '', options: { color: K } }], L, 0.855, 9.812, 0.396, { fontFace: F7, fontSize: 23.52 });
    if (desc) tx(s, desc, L, 1.264, 9.521, 0.269, { fontFace: F7, fontSize: 16, color: GD }); }
  // a title in black alone (the owner's page of figures), a quieter line beside it where there is one
  function headPlain(s: any, title: string, sub?: string) { tx(s, [{ text: title, options: { color: K } }, { text: sub ? '   ' + sub : '', options: { color: GD, fontSize: 14 } }], L, 0.855, 9.9, 0.396, { fontFace: F7, fontSize: 23.52 }); }
  // small grey tabs under a title: what the project is (No., group, stage, 집중 추진 in red, the day the figures are of)
  function chips(s: any, list: { t: string; red?: boolean }[], sz = 16) { const small = sz < 16; let x = L; for (const c of list) { if (!c.t) continue; const w = emOf(c.t) * sz / 72 * (small ? 1.08 : 1.1) + (small ? 0.16 : 0.2); if (x + w > R) break;
      s.addText(c.t, { shape: ST.rect, x, y: small ? 1.29 : 1.318, w, h: small ? 0.255 : 0.283, fill: { color: BAND }, line: { color: CHIPLN, width: THIN }, align: 'center', valign: 'middle', margin: 0, fontFace: F7, fontSize: sz, color: c.red ? RED : CHIP, fit: 'none' }); x += w + 0.085; } }
  const chipsOf = (H: any, withFirst?: boolean) => [{ t: H.no ? 'No. ' + H.no : '' }, { t: H.grp }, { t: H.stage }, { t: H.focus ? '집중 추진' : '', red: true }, { t: withFirst && H.first ? '최초자료 ' + H.first : '' }, { t: H.asof ? '기준일 ' + H.asof : '' }];
  // a small heading with a line under it
  function label(s: any, t: string, x: number, y: number, w: number, color = K, sz = 13) { tx(s, t, x, y, w, 0.219, { fontFace: F7, fontSize: sz, color }); line(s, x, y + 0.245, w); return y + 0.245; }
  const bodyTitle = (s: any, t: string, x: number, y: number, w: number, sz = 14) => tx(s, t, x, y, w, 0.258, { fontFace: F7, fontSize: sz });
  function tableTitle(s: any, t: string, x: number, y: number, w: number, left?: string, right?: string) { tx(s, '▶ ' + t, x - 0.036, y, w, 0.243, { fontFace: F7, fontSize: 13 });
    if (left) tx(s, '[' + left + ']', x - 0.01, y + 0.344, w * 0.7, 0.19, { fontSize: 10 }); if (right) tx(s, '[' + right + ']', x + w - 2.4, y + 0.344, 2.4, 0.19, { fontSize: 10, align: 'right' }); return y + (left || right ? 0.612 : 0.36); }
  // a table: rows are taken while they fit above o.maxY; says where it ended and how many rows it took
  function table(s: any, x: number, y: number, w: number, head: any[] | null, rows: any[][], colW: number[], o: any = {}) { const sum = colW.reduce((a, b) => a + b, 0), cw = colW.map(c => c / sum * w), rh = o.rowH || 0.37, sz = o.sz || 10, fsz = o.firstSz || 12, B = { pt: THIN, color: LN }, N = { type: 'none' }, bold1 = o.boldFirst !== false;
    const cell = (t: any, i: number, isHead: boolean) => ({ text: (o.flag && !isHead) ? flag(t) : String(t == null ? '' : t), options: { fontFace: isHead || (i === 0 && bold1) ? F7 : F3, fontSize: isHead ? (o.headSz || 12) : i === 0 && bold1 ? fsz : sz, color: K, align: (o.align || [])[i] || 'left', valign: 'middle', margin: [0, 0.05, 0, 0], border: [isHead ? B : N, N, B, N] } });
    const body: any[] = [], hs: number[] = []; let yy = y, n = 0;
    const lines = rows.map(r => Math.max(...r.map((t, i) => linesOf(t, (cw[i] - 0.06) * (o.wide || 1), i === 0 && bold1 ? fsz : sz)))), hOfRow = (k: number, pad: number, min: number) => Math.max(min, k * sz * (o.lead || 1.25) / 72 + pad);
    let pad = o.pad == null ? 0.14 : o.pad, min = rh; if (o.squeeze && o.maxY) for (const [p2, m2] of [[pad, rh], [0.11, Math.min(rh, 0.29)], [0.085, Math.min(rh, 0.26)]]) { pad = p2; min = m2; if (y + (head ? m2 : 0) + lines.reduce((a, k) => a + hOfRow(k, p2, m2), 0) <= o.maxY) break; }
    if (head) { body.push(head.map((t, i) => cell(t, i, true))); hs.push(min); yy += min; }
    rows.forEach((r, ri) => { if (n < ri) return; const h = hOfRow(lines[ri], pad, min); if (n > 0 && o.maxY && yy + h > o.maxY) return; body.push(r.map((t, i) => cell(t, i, false))); hs.push(h); yy += h; n++; });
    if (!head && body.length) body[0].forEach((c: any) => { c.options.border = [B, N, B, N]; });
    if (body.length && !o.measure) s.addTable(body, { x, y, w, colW: cw, rowH: hs, autoPage: false });
    return { y: yy, n }; }
  // steps over one line: a heading in the signature colour, a mark on the line, two lines of text
  function steps(s: any, y: number, items: any[]) { const n = items.length, gap = CW / Math.max(n, 4); line(s, L, y + 0.274, CW);
    items.forEach((it, i) => { const x = L + i * gap; tx(s, one(it.t), x, y, gap - 0.14, 0.243, { fontFace: F7, fontSize: Math.max(8, Math.min(13, Math.floor((gap - 0.16) / (emOf(one(it.t)) * 1.1) * 72 * 2) / 2)), color: OR, valign: 'bottom' });
      dot(s, x + 0.037, y + 0.274, it.mark === 'now' ? 0.11 : 0.073, it.mark === 'todo' ? 'FFFFFF' : OR, it.mark === 'todo' ? OR : undefined);
      tx(s, [{ text: it.h, options: { fontFace: F5, breakLine: true } }, ...paras(it.d || '', { fontFace: F3 })], x, y + 0.402, gap - 0.16, 0.9, { fontSize: 11.5, lineSpacingMultiple: 1.2 }); }); return y + 1.3; }
  function bullets(s: any, lines: string[], x: number, y: number, w: number, sz = 11, gap = 0.08) { for (const t of lines) { const h = hOf(t, w - 0.14, sz); tx(s, '•', x, y, 0.13, 0.22, { fontSize: sz + 1, color: OR, fontFace: F7 }); tx(s, t, x + 0.14, y, w - 0.14, h, { fontSize: sz, lineSpacingMultiple: 1.2 }); y += h + gap; } return y - gap; }
  const para = (s: any, t: string, x: number, y: number, w: number, sz = 11) => { const h = hOf(t, w, sz); tx(s, paras(t), x, y, w, h, { fontSize: sz, lineSpacingMultiple: 1.2 }); return y + h; };
  // a text of one line or of several: several are a list
  const blockH = (lines: string[], w: number, sz: number, gap = 0.08) => lines.length > 1 ? lines.reduce((a, t) => a + hOf(t, w - 0.14, sz) + gap, -gap) : hOf(lines[0] || '', w, sz);
  const blockDraw = (s: any, lines: string[], x: number, y: number, w: number, sz: number, gap = 0.08) => lines.length > 1 ? bullets(s, lines, x, y, w, sz, gap) : para(s, lines[0] || '', x, y, w, sz);
  // a description in brackets goes onto its own line rather than break inside the brackets
  const paren = (t: string, w: number, sz: number) => { const m = /^(.*\S)\s*(\([^()]*\))\s*$/.exec(t); return m && linesOf(t, w, sz) > 1 && linesOf(m[2], w, sz) === 1 && linesOf(m[1], w, sz) === 1 ? m[1] + '\n' + m[2] : t; };
  // a figure too long for its room has its units set smaller ("3.0MW / 3.6MW")
  const UNIT = /([A-Za-z가-힣²³µ]+)/;
  const figRuns = (fig: string, w: number, sz: number, small: number) => { const fits = (z: number) => emOf(fig) * z / 72 * 1.12 <= w; if (fits(sz) || !/^[\d(.]/.test(fig)) return { runs: [{ text: fig, options: {} }], sz: fits(sz) ? sz : Math.max(8, Math.floor(w / (emOf(fig) * 1.12) * 72 * 2) / 2) };
    const parts = fig.split(UNIT).filter(Boolean), wide = parts.reduce((a, p) => a + emOf(p) * (UNIT.test(p) && !/\d/.test(p) ? small : sz) / 72 * 1.12, 0), k = wide > w ? w / wide : 1;
    return { runs: parts.map(p => ({ text: p, options: UNIT.test(p) && !/\d/.test(p) ? { fontSize: Math.round(small * k * 2) / 2 } : {} })), sz: Math.round(sz * k * 2) / 2 }; };
  // a row of figures (no boxes): the figure in the signature colour, what it is under it
  function figs(s: any, y: number, list: any[][], big = 20) { const n = list.length, pitch = (CW + 0.075) / Math.max(n, 3), w = pitch - 0.38; const fz = list.every(c => emOf(c[0]) * big / 72 * 1.12 <= w) ? big : 17; let bottom = y;
    list.forEach((c, i) => { const x = L - 0.014 + i * pitch, f = figRuns(String(c[0]), w, fz, 13);
      tx(s, f.runs, x, y, w, 0.4, { fontFace: F7, fontSize: f.sz, color: OR, valign: 'bottom', lineSpacingMultiple: 0.95 });
      const lab = String(c[1] || '').split('\n').map(t => paren(t, w, 10.5)).join('\n'), h = hOf(lab, w, 10.5); tx(s, paras(lab), x, y + 0.47, w, h + 0.05, { fontSize: 10.5, lineSpacingMultiple: 1.2 }); bottom = Math.max(bottom, y + 0.47 + h); });
    return bottom; }
  const chunk = (a: any[], max: number) => { const rows = Math.ceil(a.length / max), per = Math.ceil(a.length / Math.max(rows, 1)), out: any[][] = []; for (let i = 0; i < a.length; i += per) out.push(a.slice(i, i + per)); return out; };
  // blocks one after the other under one title, onto as many pages as it takes ("… (계속)")
  function flow(SEC: string, ko: string, en: string, desc: string, blocks: any[], tocName?: string) { let s: any = null, y = 0, first = true, title = '';
    const open = () => { s = page(SEC); headOv(s, ko, en, first ? desc : (desc ? desc + '  ' : '') + '(계속)'); if (first && tocName) toc(s, tocName); first = false; y = 1.843; };
    open();
    for (const b of blocks) { if (b.k === 'p') { const t = textOf(b); if (!t) continue; if (b.runs && b.runs[0] && b.runs[0].b) { title = t; continue; } const h = hOf(t, CW, 11); if (y + h > BOT) open(); tx(s, t, L, y, CW, h, { fontSize: 11, lineSpacingMultiple: 1.2 }); y += h + 0.18; continue; }
      if (b.k !== 'tbl') continue; let rows: any[][] = b.rows || [], part = 0; const colW = b.widths && b.widths.length === b.head.length ? b.widths : b.head.map(() => 1);
      for (;;) { if (y + (title ? 0.36 : 0) + 0.31 * 3 > BOT) open();
        if (title) { tx(s, '▶ ' + title + (part ? ' (계속)' : ''), L - 0.027, y, CW, 0.243, { fontFace: F7, fontSize: 13 }); y += 0.36; }
        const r = table(s, L + 0.009, y, CW - 0.02, b.head, rows, colW, { rowH: 0.31, firstSz: 11, maxY: BOT }); rows = rows.slice(r.n); y = r.y + 0.3; part++; if (rows.length) open(); else break; }
      title = ''; } }
  // one table on one page; what did not fit is counted in the caption
  function oneTable(SEC: string, ko: string, en: string, desc: string, title: string, head: any[], rows: any[][], colW: number[], o: any = {}) { const s = page(SEC); headOv(s, ko, en, desc); toc(s, ko);
    const r = table(s, L + 0.009, 2.455, CW - 0.02, head, rows, colW, Object.assign({ rowH: 0.31, firstSz: 11, maxY: BOT, squeeze: true }, o)); tableTitle(s, title, L + 0.009, 1.843, CW - 0.02, r.n < rows.length ? `앞의 ${r.n}건 · 외 ${rows.length - r.n}건` : `${rows.length}건`, o.unit || ''); return s; }

  /* ---------- the overview of a project ---------- */
  const ttlOf = (H: any, k: string) => (H.ttl && H.ttl[k]) || DEF[k];
  const enOf = (H: any, k: string, en: string) => ttlOf(H, k) === DEF[k] ? en : '';
  const MARK: Record<string, string> = { '완료': 'done', '진행': 'now' };
  const texts = (H: any) => ['infra', 'struct', 'stat', 'risk'].filter(k => (H[k] || []).length).map(k => ({ k, t: ttlOf(H, k), lines: H[k] as string[] }));
  // 요약: everything on ONE page, in the owner's own design (forty-second round; the measures are those of the page the
  // owner drew). Three columns between two pale upright lines:
  //   the figures, one under the other  |  사업 개요 with its table right under the text, then 추진 일정  |  추진 현황, 입지,
  //   사업 구조, then 리스크 — and 추진 일정 and 리스크 begin on one line.
  // Titles 9.5pt bold with no line under them, body 8pt light, figures 13pt semibold, grey tabs 13pt; no sources, no note.
  // What a project does not have is left out and the rest closes up; what does not fit is set smaller (to 7pt), then the
  // common line of the second row is given up, then the blocks are shared out between the two columns by height.
  function ovOne(SEC: string, H: any, tocName?: string) { const s = page(SEC); headPlain(s, H.name, H.sub); chips(s, chipsOf(H, true), 13); if (tocName) toc(s, tocName);
    const Y0 = 1.94, YB = 7.57, AW = 1.62, BX = 2.86, BW = 3.66, CX = 7.10, CW3 = R - CX, TH = 0.23, GAP = 0.18; let ROW2 = 0.27;
    vline(s, 2.55, 1.97, YB - 1.97, THIN, BOX); vline(s, 6.81, 1.97, YB - 1.97, THIN, BOX);
    // ---- the figures
    const groups = ([[ttlOf(H, 'kpi'), H.kpi], [ttlOf(H, 'fin'), H.fin]] as any[]).filter(g => g[1].length); let A = [13, 8, 0.11, 0.33];
    const dH = (c: any[], dz: number) => Math.min(3, linesOf(c[1] || '', AW, dz)) * dz * 1.1 * LH / 72, tallA = ([fz, dz, gap, gg]: number[]) => groups.reduce((a, g) => a + 0.22 + g[1].reduce((b: number, c: any[]) => b + fz / 13 * 0.24 + 0.01 + dH(c, dz) + gap, -gap), (groups.length - 1) * gg);
    for (const t of [[13, 8, 0.11, 0.33], [13, 8, 0.07, 0.22], [12, 7.5, 0.06, 0.18], [11, 7, 0.04, 0.14], [10, 7, 0.02, 0.1]]) { A = t; if (Y0 + tallA(t) <= YB) break; }
    { const [fz, dz, gap, gg] = A, fh = fz / 13 * 0.24; let y = Y0; for (const [t, list] of groups) { tx(s, t, L, y, AW, 0.2, { fontFace: F7, fontSize: 9.5 }); y += 0.22;
        for (const c of list) { const f = figRuns(String(c[0]), AW * 0.92, fz, Math.min(10, fz - 2)), h = dH(c, dz); tx(s, f.runs, L, y, AW, fh, { fontFace: F6, fontSize: f.sz, color: OR, valign: 'middle' }); tx(s, String(c[1] || ''), L, y + fh + 0.01, AW, h, { fontSize: dz, color: SUB, lineSpacingMultiple: 1.1 }); y += fh + 0.01 + h + gap; }
        y += gg - gap; } }
    // ---- the two columns
    type Blk = { t?: string; lines?: string[]; rows?: any[][]; plan?: any[][] };
    const main: Blk | null = H.main || H.rows.length ? { t: ttlOf(H, 'main'), lines: H.main ? [H.main] : undefined, rows: H.rows.length ? H.rows : undefined } : null, plan: Blk | null = H.plan.length ? { t: ttlOf(H, 'plan'), plan: H.plan } : null;
    const tb = texts(H), pick = (k: string): Blk[] => tb.filter(b => b.k === k).map(b => ({ t: b.t, lines: b.lines }));
    // lines are counted as the owner's own page has them (the usual count keeps a twenty-fifth in hand, which costs a line here)
    const lh = (f: number) => f * 1.12 * LH / 72, ln = (t: any, w: number, z: number) => linesOf(t, w * 1.04, z);
    // a block drawn (or only measured) at x, y in a column w wide; says where it ends
    const put = (b: Blk, x: number, y: number, w: number, f: number, draw: boolean): number => { if (b.t) { if (draw) tx(s, b.t, x, y, w, 0.2, { fontFace: F7, fontSize: 9.5 }); y += TH; }
      if (b.lines && b.lines.length > 1) { for (const t of b.lines) { const h = ln(t, w - 0.03, f) * lh(f); if (draw) { tx(s, '•', x - 0.05, y, 0.1, 0.18, { fontSize: f + 1, color: OR, fontFace: F7 }); tx(s, t, x + 0.03, y, w - 0.03, h, { fontSize: f, lineSpacingMultiple: 1.12 }); } y += h + 0.04; } y -= 0.04; }
      else if (b.lines) { const h = ln(b.lines[0], w, f) * lh(f); if (draw) tx(s, b.lines[0], x, y, w, h, { fontSize: f, lineSpacingMultiple: 1.12 }); y += h; }
      if (b.rows) y = table(s, x, y + (b.lines ? 0.03 : 0), w - 0.03, null, b.rows, [0.97, 2.67], { rowH: 0.22 * f / 8, sz: f, firstSz: f, flag: true, lead: 1.1, pad: 0.03, wide: 1.04, measure: !draw }).y;
      if (b.plan) y = table(s, x, y, w, ['시기', '내용', '상태'], b.plan, [0.96, 1.99, 0.71], { rowH: 0.22 * f / 8, sz: f, firstSz: f, headSz: f, lead: 1.1, pad: 0.03, wide: 1.04, measure: !draw }).y;
      return y; };
    const stack = (list: Blk[], x: number, y: number, w: number, f: number, draw: boolean) => { list.forEach((b, i) => { y = put(b, x, y + (i ? GAP : 0), w, f, draw); }); return y; };
    let Bt: Blk[] = main ? [main] : [], Bb: Blk[] = plan ? [plan] : [], Ct: Blk[] = [...pick('stat'), ...pick('infra'), ...pick('struct')], Cb: Blk[] = pick('risk'), f = 8, y2 = -1;
    const tryAt = (z: number) => { const tB = stack(Bt, BX, Y0, BW, z, false), tC = stack(Ct, CX, Y0, CW3, z, false), row = Math.max(Bt.length ? tB : Y0 - ROW2, Ct.length ? tC : Y0 - ROW2) + ROW2;
      if (Math.max(stack(Bb, BX, row, BW, z, false), stack(Cb, CX, row, CW3, z, false)) <= YB) return row;                                    // the second row on one line
      const fB = stack(Bb, BX, Bt.length ? tB + ROW2 : Y0, BW, z, false), fC = stack(Cb, CX, Ct.length ? tC + ROW2 : Y0, CW3, z, false); return fB <= YB && fC <= YB ? 0 : -1; };   // each column for itself
    for (const [z, g2] of [[8, 0.27], [8, 0.2], [7.5, 0.27], [7.5, 0.2], [7, 0.2]]) { f = z; ROW2 = g2; y2 = tryAt(z); if (y2 >= 0) break; }   // the owner's 8pt first, the row's distance given up before the size
    if (y2 < 0) { // still too much: the blocks of both columns shared out by height, each column for itself
      const all = [...Bt, ...Bb, ...Ct, ...Cb], hs = all.map(b => put(b, BX, 0, BW, f, false)); let best = 0, bestH = 1e9;
      for (let m = 0; m < (1 << all.length); m++) { const side = (v: boolean) => hs.reduce((a, h, i) => !!(m >> i & 1) === v ? a + h + GAP : a, -GAP), h = Math.max(side(true), side(false)); if (h < bestH) { bestH = h; best = m; } }
      Bt = all.filter((_b, i) => !!(best >> i & 1)); Ct = all.filter((_b, i) => !(best >> i & 1)); Bb = []; Cb = []; y2 = 0; }
    const eB = stack(Bt, BX, Y0, BW, f, true), eC = stack(Ct, CX, Y0, CW3, f, true);
    stack(Bb, BX, y2 > 0 ? y2 : Bt.length ? eB + ROW2 : Y0, BW, f, true); stack(Cb, CX, y2 > 0 ? y2 : Ct.length ? eC + ROW2 : Y0, CW3, f, true);
    return s; }
  // FULL: the figures on their own page (the owner's design), the overview with its table and dates, the four texts
  function ovFull(SEC: string, H: any, tocOn: boolean) { const sub = tocOn ? H.sub : [H.name, H.sub].filter(Boolean).join('  ·  ');
    if (H.kpi.length || H.fin.length) { const s = page(SEC); if (tocOn) headPlain(s, ttlOf(H, 'kpi')); else headPlain(s, H.name, ttlOf(H, 'kpi')); chips(s, chipsOf(H)); if (tocOn) toc(s, [H.kpi.length ? ttlOf(H, 'kpi') : '', H.fin.length ? ttlOf(H, 'fin') : ''].filter(Boolean).join(' · '));
      const groups = [[ttlOf(H, 'kpi'), chunk(H.kpi, 5), 20], [ttlOf(H, 'fin'), chunk(H.fin, 5), 20]].filter(g => (g[1] as any[]).length) as any[], rowsN = groups.reduce((a, g) => a + g[1].length, 0), k = Math.min(1, (6.3 - 2.30) / (groups.length * 0.56 + rowsN * 1.54));
      let y = 2.30; for (const [t, rows, big] of groups) { label(s, t, L, y, CW); y += 0.56 * k; for (const r of rows) { figs(s, y, r, big); y += 1.54 * k; } }
      y = Math.max(y + 0.02, 6.47); if (H.finNote && y < BOT - 0.2) { tx(s, H.finNote, L, y, CW, 0.204, { fontSize: 11 }); y += 0.5; }
      if (H.src.length && y + 0.2 * H.src.length < BOT + 0.06) { tx(s, '자료 출처', L, y, 2, 0.2, { fontFace: F7, fontSize: 11 }); vline(s, L + 0.9, y + 0.02, 0.21 * H.src.length, THIN, BOX); tx(s, paras(H.src.join('\n')), L + 1.05, y, CW - 1.05, 0.22 * H.src.length, { fontSize: 10, lineSpacingMultiple: 1.25, color: SUB }); } }
    if (H.main || H.rows.length || H.plan.length || H.partners.length) { let s = page(SEC); const ko = ttlOf(H, 'main'), en = enOf(H, 'main', 'Project Overview'); headOv(s, ko, en, sub); if (tocOn) toc(s, [ko, H.plan.length ? ttlOf(H, 'plan') : ''].filter(Boolean).join(' · '));
      const lw = H.rows.length ? 3.95 : CW; let yL = 1.953;
      if (H.main) { bodyTitle(s, ko, L - 0.022, yL, lw); yL = para(s, H.main, L - 0.022, yL + 0.258, lw, 11) + 0.3; }
      if (H.partners.length) { bodyTitle(s, ttlOf(H, 'partners'), L - 0.022, yL, lw); yL = para(s, H.partners.join(' · '), L - 0.022, yL + 0.258, lw, 13) + 0.3; }
      let yT = 1.953; if (H.rows.length) { if (H.asof) tx(s, '[기준일: ' + H.asof + ']', 8.25, 1.98, 2.416, 0.19, { fontSize: 10, align: 'right' }); const n = H.rows.length, rh = Math.max(0.24, Math.min(0.318, (5.45 - 2.248) / n));
        const r = table(s, 5.031, 2.248, 5.635, null, H.rows, [1.43, 4.2], { rowH: rh, flag: true, firstSz: 11.5, maxY: BOT }); yT = r.y; if (r.n < n) flow(SEC, ko, en, sub, [{ k: 'tbl', head: ['구분', '내용'], rows: H.rows.slice(r.n), widths: [1.43, 4.2] }]); }
      if (H.plan.length) { const rows = chunk(H.plan, 8); let y = Math.max(5.72, Math.max(yL, yT + 0.3)); if (y + 0.4 + rows.length * 1.45 > BOT + 0.25) { s = page(SEC); headOv(s, ko, en, (sub ? sub + '  ' : '') + '(계속)'); y = 1.953; }
        bodyTitle(s, ttlOf(H, 'plan'), L - 0.022, y, 4); y += 0.4; for (const r of rows) { steps(s, y, r.map((p: any[]) => ({ t: p[0], h: p[2] || '', d: p[1] || '', mark: MARK[p[2]] || 'todo' }))); y += 1.45; } } }
    const tb = texts(H); if (tb.length) { const one1 = tb.length === 1, cw = one1 ? CW : 4.72, x2 = R - cw, rows = one1 ? [[tb[0]]] : chunk(tb, 2), top = 1.953, avail = BOT - top;
      let f = 9.5; const need = (z: number) => rows.reduce((a, r) => a + 0.36 + Math.max(...r.map((b: any) => blockH(b.lines, cw, z))), 0) + (rows.length - 1) * 0.5; for (const z of [11, 10.5, 10, 9.5]) { f = z; if (need(z) <= avail) break; }
      const split = need(f) > avail, drawRow = (s: any, r: any[], y: number, hRow: number) => { r.forEach((b: any, i: number) => { const x = i ? x2 : L - 0.022; bodyTitle(s, b.t, x, y, cw); blockDraw(s, b.lines, x, y + 0.36, cw, split ? 11 : f); }); if (r.length > 1) vline(s, (L + cw + x2) / 2, y + 0.04, Math.max(1.2, hRow + 0.3), THIN, BOX); };
      let s: any = null, y = top; rows.forEach((r, i) => { const hRow = Math.max(...r.map((b: any) => blockH(b.lines, cw, split ? 11 : f)));
        if (!s || split) { s = page(SEC); headOv(s, '사업 상세', tb.length === 4 ? 'Site · Structure · Status · Risk' : '', (sub || '') + (i && split ? '  (계속)' : '')); if (tocOn) toc(s, r.map((b: any) => b.t).join(' · ')); y = top; }
        else { line(s, L, y - 0.25, CW); if (tocOn) toc(s, r.map((b: any) => b.t).join(' · ')); }
        drawRow(s, r, y, hRow); y += 0.36 + hRow + 0.5; }); } }

  /* ---------- the parts of a project's report ---------- */
  const tblsOf = (blocks: any[]) => (blocks || []).filter(b => b.k === 'tbl');
  function statePage(SEC: string, blocks: any[]) { const st = tblsOf(blocks)[0] || { rows: [] }, rows: any[][] = st.rows, get = (k: string) => (rows.find(r => r[0] === k) || [])[1] || '', say = (blocks.find(b => b.k === 'p') ? textOf(blocks.find(b => b.k === 'p')) : '');
    const s = page(SEC); headOv(s, '진행 현황', 'Status Summary', '상태일 ' + dayDot); toc(s, '진행 현황 요약');
    const pick = ['추진 단계', '전체 진행률', '액션 현황', '운영개시 예상'].filter(k => get(k)); let y = 1.98;
    if (pick.length) { label(s, '한눈에 보기', L, y, CW); y = figs(s, y + 0.56, pick.map(k => { const v = String(get(k)), m = /^(.*?)\s*\((.*)\)$/.exec(v), late = k === '액션 현황' && /지연 (\d+)/.exec(v); return late ? ['지연 ' + late[1] + '건', k + '\n' + v.replace(/ · 지연 \d+/, '')] : [m ? m[1] : v, k + (m ? '\n' + m[2] : '')]; })) + 0.5; }
    if (say) { bodyTitle(s, '요약', L - 0.022, y, 4.3); para(s, say, L - 0.022, y + 0.28, 4.3, 11); }
    const rest = rows.filter(r => !pick.includes(r[0])); if (rest.length) { tx(s, '[진행 현황]', say ? 5.56 : L, y + 0.02, 2.5, 0.19, { fontSize: 10 }); tx(s, '[상태일: ' + dayDot + ']', 8.3, y + 0.02, 2.416, 0.19, { fontSize: 10, align: 'right' }); table(s, say ? 5.57 : L + 0.009, y + 0.28, say ? 5.15 : CW - 0.02, null, rest, [1.43, 3.7], { rowH: 0.33, firstSz: 11.5, maxY: BOT }); } }
  // the phases as the template draws a schedule: the years as bands, the months on one line, a line with two ends for each phase
  function phaseChart(s: any, rows: any[][], yBand: number, rh: number, small: boolean) { const ph = rows.map(r => { const [a, b] = String(r[4] || '').split('~'); return { name: String(r[0]), n: r[1], done: r[2], pct: r[3], s: iso(a), e: iso(b) }; }).filter(p => p.s && p.e); if (!ph.length) return yBand;
    const qf = (d: string) => { const m = Number(d.slice(5, 7)); return `${d.slice(0, 4)}-${String(m - (m - 1) % 3).padStart(2, '0')}-01`; }, addM = (d: string, k: number) => { const t = new Date(T(d)); t.setUTCMonth(t.getUTCMonth() + k); return t.toISOString().slice(0, 10); };
    const d0 = qf(ph.map(p => p.s).sort()[0]), ends = ph.map(p => p.e).sort(), far = ends[ends.length - 1], op = iso(P.op), d1cand = op && op > d0 ? addM(qf(op), 6) : addM(qf(far), 3), cap = addM(d0, 60), d1 = [d1cand, addM(qf(far), 3), cap].sort()[0];
    const t0 = T(d0), t1 = T(d1) - 864e5, X0 = 3.25, X1 = 10.63, X = (d: string) => X0 + (Math.min(Math.max(T(d), t0), t1) - t0) / (t1 - t0) * (X1 - X0), months = Math.round((t1 - t0) / 864e5 / 30.44), stepM = months <= 30 ? 3 : months <= 60 ? 6 : 12;
    for (let yy = Number(d0.slice(0, 4)); yy <= Number(d1.slice(0, 4)); yy++) { const a = [`${yy}-01-01`, d0].sort()[1], b = [`${yy}-12-31`, new Date(t1).toISOString().slice(0, 10)].sort()[0]; if (a > b) continue; const xa = X(a) + 0.03, xb = X(addM(b, 0)) - 0.03 + (b.endsWith('12-31') ? (X1 - X0) / (t1 - t0) * 864e5 : 0); if (xb - xa < 0.25) continue; rect(s, xa, yBand, Math.min(xb, X1) - xa, 0.222, BAND); tx(s, String(yy), xa, yBand, Math.min(xb, X1) - xa, 0.222, { fontFace: F5, fontSize: 10, align: 'center', valign: 'middle' }); }
    const ay = yBand + (small ? 0.52 : 0.66), cd = small ? 0.38 : 0.46; line(s, X0, ay, X1 - X0, 0.75, OR);
    for (let d = d0; T(d) <= t1; d = addM(d, stepM)) { const x = X(d); s.addText(Number(d.slice(5, 7)) + '월', { shape: ST.ellipse, x: x - cd / 2, y: ay - cd / 2, w: cd, h: cd, fill: { color: 'FFFFFF' }, line: { color: OR, width: 0.75 }, align: 'center', valign: 'middle', margin: 0, fontFace: F7, fontSize: small ? 8 : 9.5, color: OR }); }
    const my = ay + cd / 2 + 0.07; if (T(day) >= t0 && T(day) <= t1) { const xt = X(day); s.addShape(ST.triangle, { x: xt - 0.06, y: my, w: 0.123, h: 0.117, fill: { color: OR }, line: { type: 'none' }, flipV: true }); tx(s, '상태일 ' + day.slice(5).replace('-', '.'), xt + 0.1, my - 0.03, 1.2, 0.17, { fontFace: F4, fontSize: 9, color: OR }); }
    const y0 = my + 0.24; line(s, 0.745, y0, R - 0.745 + 0.02); let cutAny = false;
    ph.forEach((p, i) => { const y = y0 + i * rh, cy = y + rh / 2, stat = `업무 ${p.n}건 · 완료 ${p.done}건 · ${p.pct}`;
      if (small) { tx(s, p.name, 0.745, y, 1.55, rh, { fontFace: F7, fontSize: 10.5, valign: 'middle' }); tx(s, `${p.n}건 · ${p.pct}`, 2.2, y, 0.95, rh, { fontFace: F4, fontSize: 8.5, color: SUB, valign: 'middle', align: 'right' }); }
      else { tx(s, p.name, 0.745, y + 0.09, 2.3, 0.202, { fontFace: F7, fontSize: 12 }); tx(s, stat, 0.745, y + 0.3, 2.4, 0.17, { fontFace: F4, fontSize: 9.5, color: SUB }); }
      const xa = X(p.s), over = T(p.e) > t1, xb = over ? X1 : X(p.e); cutAny = cutAny || over; line(s, xa, cy, Math.max(0.02, xb - xa), 0.75, OR); dot(s, xa, cy, 0.073, OR); if (!over) dot(s, xb, cy, 0.073, OR);
      const txt = p.s.slice(2, 7).replace('-', '.') + ' ~ ' + p.e.slice(2, 7).replace('-', '.'), fs = small ? 8.5 : 9.5;
      if (over) tx(s, '* ' + txt, xb - 1.3, cy - (small ? 0.2 : 0.25), 1.3, 0.16, { fontFace: F4, fontSize: fs, align: 'right' }); else if (xb + 1.15 < X1 + 0.1) tx(s, txt, xb + 0.1, cy - 0.09, 1.1, 0.18, { fontFace: F4, fontSize: fs, color: SUB }); else tx(s, txt, xa - 1.2, cy - 0.09, 1.1, 0.18, { fontFace: F4, fontSize: fs, color: SUB, align: 'right' });
      line(s, 0.745, y + rh, R - 0.745 + 0.02); });
    let yEnd = y0 + ph.length * rh; if (cutAny) { tx(s, `* 표시 범위(${d0.slice(0, 7).replace('-', '. ')} ~ ${new Date(t1).toISOString().slice(0, 7).replace('-', '. ')}) 뒤로 이어지는 단계`, L, yEnd + 0.08, 8, 0.18, { fontSize: small ? 8.5 : 10, color: SUB }); yEnd += small ? 0.24 : 0.3; }
    return yEnd; }
  function actPages(SEC: string, blocks: any[], full: boolean) { const tb = tblsOf(blocks), ph = tb[0] || { rows: [] }, total = ph.rows.reduce((a: number, r: any[]) => a + Number(r[1] || 0), 0), desc = `개발 단계 ${ph.rows.length}개 · 업무 ${total}건`;
    const s = page(SEC); headOv(s, full ? '단계별 일정' : '액션 일정', full ? 'Phase Schedule' : 'Schedule', desc + (full ? '' : '  ·  상태일 ' + dayDot)); toc(s, full ? '단계별 일정' : '액션 일정');
    if (full) { phaseChart(s, ph.rows, 2.06, Math.min(0.515, 4.2 / Math.max(ph.rows.length, 1)), false); const rest = blocks.slice(blocks.indexOf(ph) + 1); if (rest.some(b => b.k === 'tbl')) flow(SEC, '액션 일정', 'Schedule', '상태일 ' + dayDot + ' 기준', rest, '업무 목록'); return; }
    // 요약: the phases, and under them the late work and what begins soon — as many rows as the page holds
    const rh = Math.min(0.3, 2.6 / Math.max(ph.rows.length, 1)); let y = phaseChart(s, ph.rows, 1.86, rh, true) + 0.22;
    const named = (re: RegExp) => { const i = blocks.findIndex(b => b.k === 'p' && re.test(textOf(b))); return i >= 0 && blocks[i + 1] && blocks[i + 1].k === 'tbl' ? { t: textOf(blocks[i]), b: blocks[i + 1] } : null; }, late = named(/^지연 업무/), soon = named(/시작하는 업무/);
    const room = BOT - y - 0.36; if (room < 0.31 * 2) return; const two = late && soon;
    const put = (g: any, x: number, w: number, cols: number[], pickCols: number[], title: string) => { const rows = g.b.rows.map((r: any[]) => pickCols.map(i => r[i])), yy = y + 0.36, r = table(s, x, yy, w, pickCols.map(i => g.b.head[i]), rows, cols, { rowH: 0.29, firstSz: 10, sz: 9.5, headSz: 10.5, maxY: BOT }); tx(s, '▶ ' + title + (r.n < rows.length ? `  (앞의 ${r.n}건)` : ''), x - 0.036, y, w, 0.243, { fontFace: F7, fontSize: 12 }); };
    if (late) put(late, L + 0.009, two ? 4.55 : CW - 0.02, [0.55, 2.45, 1.0, 0.55], [0, 1, 2, 3], late.t);
    if (soon) put(soon, two ? 5.57 : L + 0.009, two ? 5.15 : CW - 0.02, [0.5, 2.3, 0.95, 0.95, 0.6], [0, 1, 2, 3, 4], soon.t.replace('진행 중이거나 ', '')); }
  const packNo = (rows: any[][]) => rows.map(r => [String(r[0]).replace(/^설비\s*/, ''), ...r.slice(1)]);
  function procPages(SEC: string, blocks: any[], full: boolean) { const t = tblsOf(blocks)[0]; if (!t) return; const rows = packNo(t.rows);
    if (full) flow(SEC, '외부설비 조달', 'Procurement', `패키지 ${rows.length}건`, [{ k: 'p', runs: [{ t: '외부설비 조달 일정', b: true }] }, { k: 'tbl', head: t.head, rows, widths: [0.7, 3.2, 1.3, 1.4, 1.2, 2.2] }], '외부설비 조달');
    else oneTable(SEC, '외부설비 조달', 'Procurement', `패키지 ${rows.length}건`, '외부설비 조달 일정', t.head.slice(0, 5), rows.map(r => r.slice(0, 5)), [1.0, 4.4, 1.6, 1.6, 1.4], { rowH: 0.294 }); }
  function gatePage(SEC: string, blocks: any[]) { const t = tblsOf(blocks)[0]; if (!t) return; const rows: any[][] = t.rows, ok = rows.filter(r => r[4] === '승인').length, s = page(SEC);
    headOv(s, '승인게이트', 'Approval Gates', `승인 ${ok}건 / 전체 ${rows.length}건${rows.length - ok ? ` · 남은 게이트 ${rows.length - ok}건` : ''}`); toc(s, '승인게이트');
    bodyTitle(s, '승인 순서', L - 0.022, 1.953, 4); steps(s, 2.36, rows.slice(0, 8).map(r => ({ t: r[0], h: r[1], d: r[3], mark: r[4] === '승인' ? 'done' : 'todo' })));
    const y = tableTitle(s, '게이트별 승인 사항', L + 0.009, 4.02, CW - 0.02, '연결 업무는 WBS 번호', ''), r = table(s, L + 0.009, y, CW - 0.02, t.head, rows, [0.8, 4.6, 1.2, 1.6, 1.2], { rowH: 0.33, firstSz: 11, maxY: BOT });
    if (r.n < rows.length) flow(SEC, '승인게이트', 'Approval Gates', '', [{ k: 'p', runs: [{ t: '게이트별 승인 사항', b: true }] }, { k: 'tbl', head: t.head, rows: rows.slice(r.n), widths: [0.8, 4.6, 1.2, 1.6, 1.2] }]); }
  function evidPages(SEC: string, blocks: any[], full: boolean) { const t = tblsOf(blocks)[0]; if (!t) return; const rows: any[][] = t.rows, tot = rows.reduce((a, r) => a + Number(r[1] || 0), 0), open = rows.reduce((a, r) => a + Number(r[2] || 0), 0), s = page(SEC);
    headOv(s, '근거 및 확약', 'Evidence & Commitments', '상태일 ' + dayDot + ' 기준'); toc(s, '근거 및 확약');
    label(s, '한눈에 보기', L, 1.98, CW); const y = figs(s, 2.54, [[tot + '건', '전체'], [open + '건', '완료·확인 외'], [(tot - open) + '건', '완료·확인'], [rows.length + '개', '구분']]) + 0.55;
    table(s, L + 0.009, tableTitle(s, '구분별 건수', L + 0.009, y, CW - 0.02, '', '단위: 건'), CW - 0.02, t.head, rows, [5.2, 2.4, 2.4], { rowH: 0.33, firstSz: 11, align: ['left', 'right', 'right'], maxY: BOT });
    const rest = blocks.slice(blocks.indexOf(t) + 1); if (full && rest.some(b => b.k === 'tbl')) flow(SEC, '근거 및 확약', 'Evidence & Commitments', '구분별 목록', rest.map(b => b.k === 'tbl' ? Object.assign({}, b, { widths: [1.1, 6.2, 1.3, 1.4] }) : b), '구분별 목록'); }
  function listPages(SEC: string, k: string, blocks: any[], full: boolean) { const t = tblsOf(blocks)[0]; if (!t) return; const [ko, en] = PART[k], rows = t.rows.map((r: any[]) => r.map(one)), colW = k === 'meet' ? [1.25, 3.2, 3.2, 2.35] : [1.8, 1.6, 2.4, 4.2], title = k === 'meet' ? '미팅 기록' : '협력업체 목록', desc = k === 'meet' ? `최근 순 · ${rows.length}건` : `${rows.length}곳`;
    if (full) flow(SEC, ko, en, desc, [{ k: 'p', runs: [{ t: title, b: true }] }, { k: 'tbl', head: t.head, rows, widths: colW }], ko); else oneTable(SEC, ko, en, desc, title, t.head, rows, colW, { rowH: 0.4 }); }

  /* ---------- the deck ---------- */
  const person = [P.dept || '', P.author ? '작성자 ' + P.author : ''].filter(Boolean).join('  I  ');
  function cover(lines: string[], last?: boolean) { const s = page('', { cover: true }); tx(s, person, 0.700, 0.359, 6, 0.173, { fontFace: F4, fontSize: 10, color: G75 });
    if (opt.logoBig) s.addImage({ data: opt.logoBig, x: 9.546, y: 0.302, w: 1.208, h: 0.366 }); line(s, 0.703, 0.976, 10.020, THICK, K);
    if (!last) tx(s, day.slice(2).replace(/-/g, '.'), L, 1.044, 2, 0.267, { fontFace: F6, fontSize: 16, color: G85 });
    const fz = Math.max(28, Math.min(48.5, Math.floor(9.9 / (Math.max(...lines.map(emOf)) * 1.08) * 72 * 2) / 2)), h = lines.length * fz * 1.2 * LH / 72;
    tx(s, paras(lines.join('\n')), L - 0.004, 6.96 - h, 9.95, h, { fontFace: F7, fontSize: fz, color: G85 }); tx(s, 'SUNJIN Engineering & Architecture Co., Ltd.', 0.680, 7.735, 5, 0.173, { fontFace: F5, fontSize: 10, color: G75 }); }
  let sIndex: any = null;
  const openIndex = () => { sIndex = page('INDEX', { logo: true, noNum: true }); };
  const group = (ko: string, en: string, divider: boolean) => { const no = String(TOC.length + 1).padStart(2, '0'), SEC = `${no}. ${ko}`; TOC.push({ no, ko, subs: [] });
    if (divider) { const s = page(SEC, { logo: true }); line(s, 0.703, 1.286, 10.020, THICK, K); tx(s, SEC, 0.652, 1.574, 9.9, 0.757, { fontFace: F7, fontSize: 48.5, color: G75 }); tx(s, en, 0.663, 2.335, 9, 0.505, { fontFace: F6, fontSize: 30, color: G75 }); } return SEC; };
  function fillIndex() { const s = sIndex; if (!s) return; tx(s, 'INDEX', L, 0.739, 2, 0.303, { fontFace: F7, fontSize: 18 });
    const rowsN = TOC.reduce((a, t) => a + Math.max(1, t.subs.length), 0), room = BOT - 1.286 - TOC.length * 0.41, pitch = Math.min(0.253, room / Math.max(rowsN, 1)), sz = pitch >= 0.24 ? 13 : pitch >= 0.2 ? 11 : 9.5;
    let y = 1.286; for (const t of TOC) { line(s, 0.691, y, 10.026, THICK, K); tx(s, `${t.no}. ${t.ko}`, 0.691, y + 0.079, 5.4, 0.26, { fontFace: F6, fontSize: 15 });
      t.subs.forEach(([name, no]: any, i: number) => { tx(s, name, 0.691 + 5.63, y + 0.079 + i * pitch, 3.75, pitch, { fontFace: F5, fontSize: sz, color: G85 }); tx(s, String(no).padStart(2, '0'), 0.691 + 9.52, y + 0.079 + i * pitch, 0.47, pitch, { fontFace: F5, fontSize: sz, color: G85, align: 'right' }); });
      y += Math.max(0.71, 0.079 + Math.max(1, t.subs.length) * pitch + 0.33); }
    line(s, 0.691, y, 10.026, THICK, K); }

  if (P.kind === 'proj') { const H = P.proj, FULL = P.full || {}, isFull = (k: string) => (P.forms || {})[k] === 'full', ovHas = !!(H.kpi.length || H.fin.length || H.main || H.rows.length || H.plan.length || texts(H).length);
    const has = (k: string) => (P.parts || []).includes(k) && (k === 'ov' ? ovHas : !!(FULL[k] && FULL[k].length)), dividers = (P.parts || []).some((k: string) => has(k) && isFull(k));
    cover([H.name, '프로젝트 보고서']); openIndex();
    for (const g of GROUPS) { const ps = g.parts.filter(has); if (!ps.length) continue; const nm = ps.length > 1 ? g.all : PART[ps[0]], SEC = group(nm[0], nm[1], dividers);
      for (const k of ps) { const full = isFull(k), b = FULL[k];
        if (k === 'ov') { if (full) ovFull(SEC, H, true); else ovOne(SEC, H, '프로젝트 요약'); }
        else if (k === 'state') statePage(SEC, b); else if (k === 'act') actPages(SEC, b, full); else if (k === 'proc') procPages(SEC, b, full);
        else if (k === 'gate') gatePage(SEC, b); else if (k === 'evid') evidPages(SEC, b, full); else listPages(SEC, k, b, full); } } }
  else if (P.kind === 'main') { cover(['AIDC 프로젝트', '개발검토 리스트']); openIndex(); const list = (doc.sections || []).find((x: any) => !x.raw), full = P.sheets === 'full';
    if (list) { const SEC = group('프로젝트 목록', 'Project List', full); flow(SEC, '프로젝트 목록', 'Project List', [P.asof ? '기준일 ' + P.asof : '', `총 ${P.count || 0}건`].filter(Boolean).join('  ·  '), list.blocks, '프로젝트 목록'); }
    if ((P.projects || []).length) { const SEC = group(full ? '프로젝트 상세' : '프로젝트별 요약', full ? 'Project Detail' : 'Project Summaries', full);
      for (const H of P.projects) { const at = pageNo + 1; if (full) ovFull(SEC, H, false); else ovOne(SEC, H); if (pageNo >= at) TOC[TOC.length - 1].subs.push([(H.no ? H.no + '  ' : '') + H.name, at]); } } }
  else { cover((doc.title || ['보고서']).slice(0, 2)); openIndex(); for (const sec of doc.sections || []) { const ko = String(sec.h || '').replace(/^\d+\.\s*/, ''), SEC = group(ko, '', false); flow(SEC, ko, '', '', sec.blocks || [], ko); } }
  cover(['Thank you.'], true); fillIndex();

  // The library is asked for the file through exportPresentation: write() does not compress when a type is named.
  const out: any = await pptx.exportPresentation({ compression: true });
  // The library repeats a paragraph's properties before every run of it; they belong once, at the paragraph's head (a file
  // written otherwise opens in PowerPoint, but is not as the format says). The slides are put right here.
  const zip = await JSZip.loadAsync(out instanceof ArrayBuffer ? out : await new Blob([out]).arrayBuffer()), PPR = /<a:pPr\b[^>]*?(?:\/>|>[\s\S]*?<\/a:pPr>)/g;
  for (const name of Object.keys(zip.files)) { if (!/^ppt\/slides\/slide\d+\.xml$/.test(name)) continue; const xml = await zip.file(name)!.async('string');
    zip.file(name, xml.replace(/<a:p>([\s\S]*?)<\/a:p>/g, (_m, body: string) => '<a:p>' + body.replace(PPR, (p: string, at: number) => at === 0 ? p : '') + '</a:p>')); }
  return await zip.generateAsync({ type: 'arraybuffer', compression: 'DEFLATE', compressionOptions: { level: 6 } });
}

(globalThis as any).AIDCSchedulePptx = { make };
