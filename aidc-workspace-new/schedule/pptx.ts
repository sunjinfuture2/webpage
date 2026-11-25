// The report as slides (owner, 2026-11-25, thirty-seventh round: "워드, ppt, 엑셀 같이 파일형식을 복수로 고를 수도 있게").
// PptxGenJS (MIT) writes the file; this module lays the one document model of schedule/ui/70-export.js
// ({file, head, title, label, sections:[{h, blocks:[{k:'p',runs,ind} | {k:'tbl',head,rows,widths}]}]}) out on 16:9 slides:
// a first slide with the title, then every section under its heading — paragraphs as text, tables as tables — and a new
// slide ("… (계속)") wherever the next block would not fit. What fits is estimated from the text (a Korean letter is a full
// square, a Latin one about half), a little on the safe side, because nothing is measured in a file.
// Bundled on its own (public/schedule-pptx.js) and fetched when a PPT is asked for.
import PptxGenJS from 'pptxgenjs';

type Run = { t?: string; b?: boolean };
type Block = { k: string; runs?: Run[]; ind?: number; head?: string[]; rows?: string[][]; widths?: number[] };
type Section = { h: string; blocks: Block[] };
type Doc = { file?: string; head?: string; title?: string[]; label?: string; sections: Section[] };
type Opt = { logo?: string; logoRatio?: number; font?: string };

const W = 13.333, H = 7.5, MX = 0.62, CW = W - MX * 2, TOP = 1.32, BOT = 6.78;
const INK = '1C1C1C', SOFT = '6F6F6F', PALE = '8E8E8E', LINE = 'D9D9D9', FILL = 'F2F2F1';

// how wide a text runs, in "letters of a full square"
const units = (s: string): number => { let n = 0; for (const ch of s) { const c = ch.codePointAt(0) || 0; n += c > 0x2e7f ? 1 : ch === ' ' ? 0.3 : /[A-Z0-9%@#&MW]/.test(ch) ? 0.64 : /[ilj.,:;'|!]/.test(ch) ? 0.3 : 0.54; } return n; };
// how many lines a text takes in a box that is `w` inches wide at `pt` points
const linesOf = (text: string, w: number, pt: number): number => { const per = Math.max(1, (w * 72) / pt / 1.06); let n = 0; for (const ln of String(text == null ? '' : text).split('\n')) n += Math.max(1, Math.ceil(units(ln) / per)); return n; };

export async function make(doc: Doc, opt: Opt = {}): Promise<ArrayBuffer> {
  const font = opt.font || 'Malgun Gothic', pptx = new PptxGenJS();
  pptx.layout = 'LAYOUT_WIDE'; pptx.title = (doc.title || []).join(' — ') || '보고서'; pptx.company = 'SUNJIN'; pptx.theme = { headFontFace: font, bodyFontFace: font };
  const foot = (doc.title || [])[0] || '';
  pptx.defineSlideMaster({ title: 'REPORT', background: { color: 'FFFFFF' }, margin: 0,
    objects: [
      { text: { text: doc.head || '', options: { x: W - MX - 6, y: 0.3, w: 6, h: 0.26, align: 'right', fontSize: 8.5, color: PALE, fontFace: font, margin: 0 } } },
      { line: { x: MX, y: 7.0, w: CW, h: 0, line: { color: LINE, width: 0.75 } } },
      { text: { text: foot, options: { x: MX, y: 7.07, w: 8, h: 0.24, fontSize: 8.5, color: PALE, fontFace: font, margin: 0 } } },
    ],
    slideNumber: { x: W - MX - 0.9, y: 7.07, w: 0.9, h: 0.24, align: 'right', fontSize: 8.5, color: SOFT, fontFace: font } });

  // the first slide: the title, what it is, the line that says which project
  { const s = pptx.addSlide(), t = doc.title || [];
    s.background = { color: 'FFFFFF' };
    s.addShape(pptx.ShapeType.rect, { x: MX, y: 2.55, w: 0.09, h: 1.25, fill: { color: INK }, line: { color: INK, width: 0 } });
    s.addText(t[0] || '보고서', { x: MX + 0.32, y: 2.45, w: CW - 0.4, h: 0.9, fontSize: 34, bold: true, color: INK, fontFace: font, margin: 0, valign: 'middle', fit: 'shrink' });
    if (t[1]) s.addText(t[1], { x: MX + 0.32, y: 3.32, w: CW - 0.4, h: 0.5, fontSize: 17, color: SOFT, fontFace: font, margin: 0, valign: 'middle' });
    if (doc.label) s.addText(doc.label, { x: MX + 0.32, y: 4.15, w: CW - 0.4, h: 0.34, fontSize: 12, color: SOFT, fontFace: font, margin: 0 });
    if (doc.head) s.addText(doc.head, { x: MX + 0.32, y: 4.5, w: CW - 0.4, h: 0.3, fontSize: 10.5, color: PALE, fontFace: font, margin: 0 });
    if (opt.logo) { const lw = 1.25, lh = lw * (opt.logoRatio || 0.3); s.addImage({ data: opt.logo, x: MX, y: 6.55 - lh, w: lw, h: lh }); } }

  for (const sec of doc.sections || []) {
    let slide: any = null, y = TOP, part = 0;
    const open = () => { slide = pptx.addSlide({ masterName: 'REPORT' }); part++; y = TOP;
      slide.addText(sec.h + (part > 1 ? ' (계속)' : ''), { x: MX, y: 0.52, w: CW, h: 0.5, fontSize: 21, bold: true, color: INK, fontFace: font, margin: 0, valign: 'middle', fit: 'shrink' });
      slide.addShape(pptx.ShapeType.line, { x: MX, y: 1.1, w: CW, h: 0, line: { color: INK, width: 1 } }); };
    const room = () => BOT - y;
    open();
    for (const b of sec.blocks || []) {
      if (b.k === 'p') { const text = (b.runs || []).map(r => r.t || '').join(''), bold = !!(b.runs || [])[0] && !!(b.runs || [])[0].b; if (!text.trim()) continue;
        const pt = bold ? 13 : 11.5, x = MX + (b.ind ? 0.24 * b.ind : 0), w = CW - (b.ind ? 0.24 * b.ind : 0), h = (linesOf(text, w, pt) * pt * 1.42) / 72 + 0.06, gapTop = bold && y > TOP ? 0.14 : 0;
        if (y + gapTop + h > BOT && y > TOP) open(); else y += gapTop;
        slide.addText(text, { x, y, w, h, fontSize: pt, bold, color: bold ? INK : '3D3D3D', fontFace: font, margin: 0, valign: 'top', lineSpacingMultiple: 1.18, paraSpaceAfter: 0 });
        y += h + (bold ? 0.08 : 0.07); continue; }
      if (b.k === 'tbl') { const head = b.head || [], rows = b.rows || [], n = Math.max(head.length, ...rows.map(r => r.length), 1);
        const ws = Array.from({ length: n }, (_, i) => (b.widths && b.widths[i]) || 1), sum = ws.reduce((a, c) => a + c, 0), colW = ws.map(v => (v / sum) * CW), pt = 10, padX = 0.16;
        const rowH = (cells: string[], bold: boolean) => Math.max(...Array.from({ length: n }, (_, i) => linesOf(cells[i] || '', Math.max(0.3, colW[i] - padX), pt + (bold ? 0.4 : 0)))) * pt * 1.34 / 72 + 0.13;
        const hH = head.length ? rowH(head, true) : 0, hs = rows.map(r => rowH(r, false));
        const cell = (t: string, o: any) => ({ text: String(t == null ? '' : t), options: Object.assign({ fontFace: font, fontSize: pt, color: '3D3D3D', valign: 'middle', margin: [3, 6, 3, 6] }, o) });
        let i = 0, first = true;
        // a table that fits on one slide is not cut in two: it starts on a new slide when what is left here is too little
        if (hH + hs.reduce((a, c) => a + c, 0) > room() && y > TOP && hH + hs.reduce((a, c) => a + c, 0) <= BOT - TOP) open();
        while (i < rows.length || first) {
          // a longer one: what is left of the slide must hold the head and at least three rows (or all that is left of the table)
          const need = hH + hs.slice(i, i + 3).reduce((a, c) => a + c, 0);
          if (need > room() && y > TOP) open();
          let used = hH, j = i; while (j < rows.length && (used + hs[j] <= room() || j === i)) { used += hs[j]; j++; }
          const out: any[] = [], heights: number[] = [];
          if (head.length) { out.push(head.concat(Array(n - head.length).fill('')).map(t => cell(t, { bold: true, color: INK, fill: { color: FILL } }))); heights.push(hH); }
          for (let k = i; k < j; k++) { out.push(Array.from({ length: n }, (_, c) => cell(rows[k][c] || '', {}))); heights.push(hs[k]); }
          if (out.length) slide.addTable(out, { x: MX, y, w: CW, colW, rowH: heights, border: { type: 'solid', pt: 0.5, color: LINE }, autoPage: false });
          y += used + 0.2; i = j; first = false;
          if (i < rows.length) open(); }
        continue; }
      // other blocks (pictures of a content panel) are not part of a report of this kind
    }
  }
  // Compressed: a table is some 200 KB of XML a slide otherwise. write() of this version (4.0.1, pinned) compresses only a
  // stream for Node — given an output type it stores, given none it takes the options for the type — so the method behind it
  // is called: without a type it hands back a compressed Blob.
  const out: any = await (pptx as any).exportPresentation({ compression: true });
  return out instanceof ArrayBuffer ? out : await new Blob([out]).arrayBuffer();
}

(globalThis as any).AIDCSchedulePptx = { make };
