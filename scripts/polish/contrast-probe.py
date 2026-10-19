# Temporary text-contrast probe: python3 scripts/polish/contrast-probe.py <a COPY of the tree>. Patches font.ts and main.ts in place, so never run it on the real tree. It records where every text is drawn and, at the end of the frame, reads the
# finished picture once and scores each text by the contrast between its color and the pixels touching its glyphs.
import sys
root = sys.argv[1]
p = root + '/src/gfx/font.ts'
s = open(p).read()
if '__ctFrame' not in s:
    probe = r'''
// ---- CONTRAST PROBE v2 (temporary, not committed)
import { PAL } from './palette.ts';
const lumOf = (r: number, g: number, b: number): number => {
  const l = (v: number): number => { const s = v / 255; return s <= 0.04045 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4); };
  return 0.2126 * l(r) + 0.7152 * l(g) + 0.0722 * l(b);
};
const ratioOf = (a: number, b: number): number => (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
interface TextRect { x: number; y: number; w: number; h: number; color: ColorName; text: string; cv: HTMLCanvasElement }
const frameRects: TextRect[] = [];
function probe(ctx: Ctx, text: string, x: number, y: number, color: ColorName, h: number, advance: number): void {
  const w0 = window as unknown as { __ct?: Record<string, unknown> };
  if (!w0.__ct || !text.trim() || color === 'ink') return;
  const m = ctx.getTransform();
  frameRects.push({ x: Math.round(x * m.a + m.e), y: Math.round(y * m.d + m.f), w: Math.max(1, Math.round(text.length * advance * m.a)), h: Math.max(1, Math.round(h * m.d)), color, text, cv: ctx.canvas as HTMLCanvasElement });
}
(window as unknown as Record<string, unknown>).__ctFrame = (ctx: Ctx): void => {
  const store = (window as unknown as { __ct?: Record<string, any> }).__ct;
  if (!store) { frameRects.length = 0; return; }
  const W = ctx.canvas.width, H = ctx.canvas.height;
  const img = ctx.getImageData(0, 0, W, H).data;
  const tag = (window as unknown as { __ctTag?: string }).__ctTag ?? '?';
  for (const r of frameRects) {
    if (r.cv !== ctx.canvas) continue;
    const hex = PAL[r.color];
    const tr = parseInt(hex.slice(1, 3), 16), tg = parseInt(hex.slice(3, 5), 16), tb = parseInt(hex.slice(5, 7), 16);
    const tl = lumOf(tr, tg, tb);
    const x0 = Math.max(0, r.x - 1), y0 = Math.max(0, r.y - 1), x1 = Math.min(W, r.x + r.w + 1), y1 = Math.min(H, r.y + r.h + 1);
    const isText = (px: number, py: number): boolean => {
      if (px < x0 || py < y0 || px >= x1 || py >= y1) return false;
      const i = (py * W + px) * 4;
      return img[i] === tr && img[i + 1] === tg && img[i + 2] === tb;
    };
    const ratios: number[] = [];
    let glyph = 0;
    for (let py = y0; py < y1; py++) for (let px = x0; px < x1; px++) {
      if (!isText(px, py)) continue;
      glyph++;
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]] as const) {
        const nx = px + dx, ny = py + dy;
        if (nx < 0 || ny < 0 || nx >= W || ny >= H || isText(nx, ny)) continue;
        const i = (ny * W + nx) * 4;
        ratios.push(ratioOf(tl, lumOf(img[i] as number, img[i + 1] as number, img[i + 2] as number)));
      }
    }
    if (glyph < 3 || ratios.length === 0) continue;
    ratios.sort((a, b) => a - b);
    const p25 = ratios[Math.floor(ratios.length * 0.25)] as number;
    const below3 = ratios.filter((v) => v < 3).length / ratios.length;
    const key = tag + '|' + r.text + '|' + r.color;
    const o = store[key];
    if (!o) store[key] = { tag, text: r.text, color: r.color, p25, min: ratios[0], below3, n: 1 };
    else { o.n++; if (p25 < o.p25) o.p25 = p25; if ((ratios[0] as number) < o.min) o.min = ratios[0]; if (below3 > o.below3) o.below3 = below3; }
  }
  frameRects.length = 0;
};
'''
    s = s.replace("import type { Ctx } from './canvas.ts';\n", "import type { Ctx } from './canvas.ts';\n" + probe, 1)
    s = s.replace("  const y0 = Math.round(y);\n  if (opts.shadow)", "  const y0 = Math.round(y);\n  probe(ctx, text, x0, y0, color, GLYPH_H, ADVANCE);\n  if (opts.shadow)", 1)
    s = s.replace("  const x0 = Math.round(x), y0 = Math.round(y);\n  for (let i = 0; i < text.length; i++) {\n    const ch", "  const x0 = Math.round(x), y0 = Math.round(y);\n  probe(ctx, text, x0, y0, color, TINY_H, TINY_ADVANCE);\n  for (let i = 0; i < text.length; i++) {\n    const ch", 1)
    open(p, 'w').write(s)
p = root + '/src/main.ts'
s = open(p).read()
if '__ctFrame' not in s:
    s = s.replace("    toast.draw(ctx);\n", "    toast.draw(ctx);\n    (window as unknown as { __ctFrame?: (c: CanvasRenderingContext2D) => void }).__ctFrame?.(ctx);\n", 1)
    open(p, 'w').write(s)
