// Map variant 5, "Joyce's wall": the stages are bulbs on a string of Christmas lights across her living room wall, the places
// are painted under them in black, and the party walks the runner on the floor and rests on the couch. Still layers are in
// v5_wall.ts and v5_art.ts; this file adds the blinking bulb, the token and the text. See map-variations.html.
import type { MapVariant, VarNode, VarView } from './types.ts';
import { Px } from '../px.ts';
import { hash2, rect } from '../canvas.ts';
import type { Ctx } from '../canvas.ts';
import type { ColorName } from '../palette.ts';
import { drawText } from '../font.ts';
import { drawPortrait } from '../ui.ts';
import { drawActorFrame } from '../actors.ts';
import type { Dir } from '../../core/types.ts';
import { BULB, FILLER, FLOOR_Y, asCanvas, bigBulb, bulbX, bulbY, haloSprite, poolSprite, smallBulb } from './v5_art.ts';
import { BAND_Y, buildWall, fillerPos } from './v5_wall.ts';
import type { Wall } from './v5_wall.ts';

const walls = new Map<string, Wall>();
function wallFor(nodes: VarNode[]): Wall {
  const key = nodes.map((n) => n.state).join(',');
  let w = walls.get(key);
  if (!w) { w = buildWall(nodes.map((n) => n.state), nodes.map((n) => n.place)); walls.set(key, w); }
  return w;
}

// ---------------------------------------------------------------- the top rail and the couch
const couches = new Map<number, HTMLCanvasElement>();
function couchLayer(n: number): HTMLCanvasElement {
  let c = couches.get(n);
  if (c) return c;
  const p = new Px(256, 224);
  // The top rail.
  p.rect(0, 0, 256, 1, 'soil2'); p.rect(0, 1, 256, 12, 'soil1'); p.rect(0, 13, 256, 1, 'soil0'); p.rect(0, 14, 256, 1, 'sand'); p.rect(0, 15, 256, 1, 'ink');
  // Arms, backrest cushions and the seat.
  const top = BAND_Y - 4, cw = Math.floor(238 / Math.max(1, n));
  p.rect(0, top + 2, 256, 1, 'ink');
  for (const [x0, x1] of [[0, 9], [247, 256]] as const) {
    p.rect(x0, top - 2, x1 - x0, 60, 'ink');
    p.rect(x0 + 1, top - 1, x1 - x0 - 2, 58, 'soil1');
    p.rect(x0 + 1, top - 1, x1 - x0 - 2, 1, 'soil3'); p.rect(x0 + (x0 ? 1 : 6), top, 2, 56, 'soil2');
  }
  for (let i = 0; i < n; i++) {
    const x0 = 9 + i * cw, w = i === n - 1 ? 247 - x0 : cw;
    p.rect(x0, top + 3, w, 31, 'ink');
    p.rect(x0 + 1, top + 4, w - 2, 29, 'soil2');
    p.rect(x0 + 3, top + 3, w - 6, 1, 'soil3'); p.rect(x0 + 1, top + 4, w - 2, 2, 'soil3'); p.rect(x0 + 1, top + 6, 1, 24, 'soil3');
    p.rect(x0 + w - 3, top + 6, 2, 27, 'soil1'); p.rect(x0 + 1, top + 29, w - 2, 4, 'soil1');
    for (let k = 0; k < 14; k++) p.set(x0 + 2 + (hash2(i, k, 5) % (w - 6)), top + 8 + (hash2(k, i, 9) % 20), 'soil1');
    p.rect(x0 + (w >> 1) - 1, top + 28, 3, 2, 'soil0'); p.set(x0 + (w >> 1), top + 28, 'soil3');
  }
  p.rect(9, top + 33, 238, 1, 'ink');
  p.rect(9, top + 34, 238, 24, 'soil1'); p.rect(9, top + 34, 238, 1, 'soil2');
  p.rect(9, top + 35, 238, 1, 'soil0');
  p.rect(9, top + 56, 238, 2, 'soil0');
  c = p.toCanvas();
  couches.set(n, c);
  return c;
}

function drawChrome(ctx: Ctx, v: VarView): void {
  const n = v.party.length;
  ctx.drawImage(couchLayer(n), 0, 0);
  drawText(ctx, v.chapter, 6, 4, 'sand', { shadow: true });
  drawText(ctx, v.stage, 250, 4, 'yellow', { align: 'right', shadow: true });
  const cw = Math.floor(238 / Math.max(1, n)), blockW = 24 + 4 + 12, top = BAND_Y - 4;
  v.party.forEach((m, i) => {
    const x0 = 9 + i * cw, w = i === n - 1 ? 247 - x0 : cw;
    const x = x0 + Math.round((w - blockW) / 2), y = top + 8;
    rect(ctx, x - 1, y - 1, 26, 26, 'sand');
    drawPortrait(ctx, m.id, 'neutral', x, y);
    drawText(ctx, 'LV', x + 28, y + 3, 'cream', { shadow: true });
    drawText(ctx, String(m.level), x + 28, y + 14, 'yellow', { shadow: true });
  });
  drawText(ctx, v.hint, 128, top + 40, 'cream', { align: 'center', shadow: true });
}

// ---------------------------------------------------------------- the bulb that is next
/** How brightly the open bulb burns: it blinks, or with Reduce flashing it breathes slowly. 1 dim, 2 lit, 3 burning. */
function openLevel(t: number, calm: boolean): number {
  if (!calm) return t % 54 < 30 ? 3 : 1;
  const ph = (t % 300) / 300, p = ph < 0.5 ? ph * 2 : 2 - ph * 2;
  return p < 0.25 ? 1 : p < 0.75 ? 2 : 3;
}

function drawOpen(ctx: Ctx, i: number, t: number, calm: boolean): void {
  const c = BULB[i] as ColorName, bx = bulbX(i), by = bulbY(i), lv = openLevel(t, calm);
  // Light on the floor and the wall.
  ctx.drawImage(asCanvas(poolSprite(c, lv === 3)), bx - 19, FLOOR_Y - 6);
  if (lv >= 2) ctx.drawImage(asCanvas(haloSprite(c, 15, lv === 3)), bx - 15, by - 7);
  else ctx.drawImage(asCanvas(haloSprite(c, 9, false)), bx - 9, by - 1);
  // The little bulbs of its swag chase each other.
  const beat = calm ? -1 : ((t / 7) | 0) % 8;
  for (let k = 0; k < 6; k++) {
    const f = fillerPos(i, k), fc = FILLER[(i * 2 + k) % 4] as ColorName;
    if (!calm || lv >= 2) ctx.drawImage(asCanvas(haloSprite(fc, 6, false)), f.x - 4, f.y - 3);
    ctx.drawImage(smallBulb(fc, k === beat || (calm && lv === 3) ? 3 : 2), f.x, f.y);
  }
  ctx.drawImage(bigBulb(c, lv), bx - 4, by - 1);
}

function brackets(ctx: Ctx, i: number, t: number, calm: boolean): void {
  const bx = bulbX(i), by = bulbY(i), grow = !calm && t % 40 >= 20 ? 1 : 0;
  const x0 = Math.max(1, bx - 22 - grow), x1 = Math.min(254, bx + 22 + grow), y0 = by - 13 - grow, y1 = by + 31 + grow, a = 5;
  for (const [x, y, sx, sy] of [[x0, y0, 1, 1], [x1, y0, -1, 1], [x0, y1, 1, -1], [x1, y1, -1, -1]] as const) {
    const hx = sx > 0 ? x : x - a + 1, vy = sy > 0 ? y : y - a + 1;
    rect(ctx, hx + 1, y + 1, a, 1, 'ink'); rect(ctx, x + 1, vy + 1, 1, a, 'ink');
    rect(ctx, hx, y, a, 1, 'white'); rect(ctx, x, vy, 1, a, 'white');
  }
}

// ---------------------------------------------------------------- the token
function drawToken(ctx: Ctx, v: VarView): void {
  const xs = (id: string): number => bulbX(Math.max(0, v.nodes.findIndex((n) => n.id === id)));
  let x = xs(v.selected), dir: Dir = 'down';
  if (v.walk) {
    const a = xs(v.walk.from), b = xs(v.walk.to);
    x = a + (b - a) * v.walk.k;
    dir = b >= a ? 'right' : 'left';
  }
  const px = Math.round(x);
  for (let i = -5; i <= 5; i++) if (((i + px) & 1) === 0 || Math.abs(i) < 4) rect(ctx, px + i, FLOOR_Y, 1, 1, 'ink');
  rect(ctx, px - 3, FLOOR_Y + 1, 7, 1, 'ink');
  drawActorFrame(ctx, v.lead, dir, v.walk ? 'walk' : 'idle', v.walk ? ((v.t / 7) | 0) & 3 : ((v.t / 30) | 0) & 1, px - 8, FLOOR_Y - 14);
}

export const V5: MapVariant = {
  id: 5,
  name: "Joyce's wall",
  blurb: 'Stages are bulbs on a string of Christmas lights across her living room wall, the places painted under them in black, dripping. The party walks the runner below and sits on the couch.',
  draw(ctx, v) {
    const w = wallFor(v.nodes);
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(w.under, 0, 0);
    const open = v.nodes.findIndex((n) => n.state === 'open');
    if (open >= 0) drawOpen(ctx, open, v.t, v.calm);
    ctx.drawImage(w.labels, 0, 0);
    const sel = v.nodes.findIndex((n) => n.id === v.selected);
    if (sel >= 0) brackets(ctx, sel, v.t, v.calm);
    drawToken(ctx, v);
    drawChrome(ctx, v);
  },
};
