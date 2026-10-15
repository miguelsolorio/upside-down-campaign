// One image per variation sheet, for the chapter 4 review: the page's cards stacked in one column, each under a caption with
// its number and name in the game's 5x7 font, the sheet's title on top, the whole thing blown up a whole number of times so the
// pixels stay square. save() posts it to the dev server's /__snap sink, which writes docs/screenshots/<name>.png.
import type { Ctx } from '../canvas.ts';
import { drawText } from '../font.ts';
import { PAL } from '../palette.ts';

export interface SheetItem { num: number; name: string; canvas: HTMLCanvasElement }

const PAD = 8, CAP = 14, TITLE = 22;

/** All the cards in one canvas at k times. */
export function sheetImage(title: string, items: SheetItem[], k = 2): HTMLCanvasElement {
  const w = PAD * 2 + Math.max(...items.map((it) => it.canvas.width));
  const h = TITLE + items.reduce((n, it) => n + CAP + it.canvas.height + PAD, 0) + PAD;
  const one = document.createElement('canvas');
  one.width = w; one.height = h;
  const g = one.getContext('2d') as Ctx;
  g.imageSmoothingEnabled = false;
  g.fillStyle = PAL.ink;
  g.fillRect(0, 0, w, h);
  drawText(g, title.toUpperCase(), PAD, 8, 'hot');
  let y = TITLE;
  for (const it of items) {
    g.fillStyle = PAL.amber;
    g.fillRect(PAD, y + 1, 11, 9);
    drawText(g, String(it.num), PAD + 3, y + 2, 'ink');
    drawText(g, it.name.toUpperCase(), PAD + 16, y + 2, 'cream');
    y += CAP;
    g.drawImage(it.canvas, PAD, y);
    y += it.canvas.height + PAD;
  }
  const out = document.createElement('canvas');
  out.width = w * k; out.height = h * k;
  const o = out.getContext('2d') as Ctx;
  o.imageSmoothingEnabled = false;
  o.drawImage(one, 0, 0, w * k, h * k);
  return out;
}

/** Writes the image to docs/screenshots/<name>.png through the dev server and returns the path it wrote. */
export async function saveSheet(name: string, c: HTMLCanvasElement): Promise<string> {
  const res = await fetch(`/__snap?name=${encodeURIComponent(name)}`, { method: 'POST', body: c.toDataURL('image/png') });
  const j = (await res.json()) as { file: string };
  return j.file;
}
