// Map variant 1, "Board game": a Super Mario Bros. 3 style world map. A saturated green field with a two-tone hatch sits
// in a thick black frame with rounded corners. A wide sandy path runs on a square grid between 16 px stage panels, with a
// chunky landmark beside each. The land is painted once per set of node states and cached; each frame adds the pulse on
// the open panel, the selection brackets, the token, and the bars.
import type { MapVariant, VarNode, VarView } from './types.ts';
import type { Dir } from '../../core/types.ts';
import { PAL } from '../palette.ts';
import type { ColorName } from '../palette.ts';
import { Px } from '../px.ts';
import { ctx2d, hash2, px32 } from '../canvas.ts';
import type { Ctx } from '../canvas.ts';
import { drawText, drawTinyText, textWidth, tinyWidth } from '../font.ts';
import { drawPortrait } from '../ui.ts';
import { drawActorFrame } from '../actors.ts';
import { bush, gourd, hole, lab, pine, pond, pumpkin, rift, rock, school } from './v1_art.ts';

const FX = 8, FY = 24, FW = 240, FH = 144;

/** Panel centers, and the route as right-angle vertices. Each node sits on one of the vertices. */
const NODE_XY: Record<string, [number, number]> = {
  '1.1': [32, 144], '1.2': [80, 96], '1.3': [144, 96], '2.1': [192, 144], '2.2': [192, 96], '2.3': [216, 64],
};
const ROUTE: [number, number][] = [[32, 144], [80, 144], [80, 96], [144, 96], [144, 144], [192, 144], [192, 96], [192, 64], [216, 64]];
const NODE_VERT: Record<string, number> = { '1.1': 0, '1.2': 2, '1.3': 3, '2.1': 5, '2.2': 6, '2.3': 8 };

// ---------------------------------------------------------------- the land
const INS = [3, 2, 1, 1, 0];
function roundRect(p: Px, x: number, y: number, w: number, h: number, c: ColorName): void {
  for (let j = 0; j < h; j++) {
    const edge = Math.min(j, h - 1 - j);
    const ins = edge < INS.length ? (INS[edge] as number) : 0;
    p.rect(x + ins, y + j, w - ins * 2, 1, c);
  }
}

/** The sprite with every other pixel blacked out: a locked place, half in the dark. */
function dimmed(src: Px): Px {
  const out = new Px(src.w, src.h), black = px32('black');
  for (let y = 0; y < src.h; y++) for (let x = 0; x < src.w; x++) {
    const v = src.d[y * src.w + x] as number;
    if (v) out.d[y * src.w + x] = (x + y) & 1 ? black : v;
  }
  return out;
}

interface Rect { x: number; y: number; w: number; h: number }
const hits = (a: Rect, b: Rect): boolean => a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;

function paintPath(p: Px, nodes: VarNode[]): void {
  const open = (vi: number): boolean => {
    const j = nodes.findIndex((n) => (NODE_VERT[n.id] as number) > vi);
    return j < 0 || (nodes[j] as VarNode).state !== 'locked';
  };
  const segs = ROUTE.slice(1).map((b, i) => {
    const a = ROUTE[i] as [number, number];
    return { x: Math.min(a[0], b[0]) - 4, y: Math.min(a[1], b[1]) - 4, w: Math.abs(a[0] - b[0]) + 8, h: Math.abs(a[1] - b[1]) + 8, open: open(i) };
  });
  for (const pass of [0, 1]) for (const want of [false, true]) for (const s of segs) {
    if (s.open !== want) continue;
    if (pass === 0) p.rect(s.x - 1, s.y - 1, s.w + 2, s.h + 2, want ? 'soil2' : 'soil0');
    else p.rect(s.x, s.y, s.w, s.h, want ? 'sand' : 'soil2');
  }
  const sand = px32('sand'), dirt = px32('soil2');
  for (let y = FY; y < FY + FH; y++) for (let x = FX; x < FX + FW; x++) {
    const v = p.get(x, y), h = hash2(x, y, 5) % 19;
    if (v === sand && h === 0) p.set(x, y, 'soil3');
    else if (v === sand && h === 1 && (x & 1)) p.set(x, y, 'cream');
    else if (v === dirt && h < 2) p.set(x, y, 'soil1');
  }
}

/** The flag of a cleared panel. */
const FLAG = ['kkk...', 'krrrr.', 'khhrr.', 'krrr..', 'k.....', 'k.....', 'k.....'];
const LOCK = ['..gggg..', '.g....g.', '.g....g.', 'gggggggg', 'gmmmmmmg', 'gmmkkmmg', 'gmmkkmmg', 'gggggggg'];

/** A stage panel: 16 by 16, a black rim, a bevel and its state's mark. The open panel is drawn live (see openPanel). */
function paintPanel(p: Px, cx: number, cy: number, state: VarNode['state']): void {
  const x = cx - 8, y = cy - 8;
  p.rect(x + 2, y + 16, 16, 2, 'pine1');
  p.rect(x + 16, y + 2, 2, 14, 'pine1');
  p.rect(x, y, 16, 16, 'black');
  if (state === 'cleared') {
    p.rect(x + 1, y + 1, 14, 14, 'amber').rect(x + 1, y + 1, 14, 1, 'cream').rect(x + 1, y + 1, 1, 14, 'cream');
    p.rect(x + 1, y + 14, 14, 1, 'orange').rect(x + 14, y + 2, 1, 13, 'orange');
    p.art(FLAG, { k: 'black', r: 'red', h: 'red' }, x + 5, y + 2);
  } else if (state === 'locked') {
    p.rect(x + 1, y + 1, 14, 14, 'grey1').rect(x + 1, y + 1, 14, 1, 'grey2').rect(x + 1, y + 1, 1, 14, 'grey2');
    p.rect(x + 1, y + 14, 14, 1, 'black').rect(x + 14, y + 2, 1, 13, 'black');
    p.art(LOCK, { g: 'grey3', m: 'grey2', k: 'black' }, x + 4, y + 1);
  }
}

function buildLand(v: VarView): HTMLCanvasElement {
  const p = new Px(256, 224).fill('black');
  roundRect(p, FX - 1, FY - 1, FW + 2, FH + 2, 'grey1');
  roundRect(p, FX, FY, FW, FH, 'pine3');
  const green = px32('pine3');
  for (let y = FY; y < FY + FH; y++) for (let x = FX; x < FX + FW; x++) if (((x + y) & 3) === 0 && p.get(x, y) === green) p.set(x, y, 'pine2');
  paintPath(p, v.nodes);
  const lockedAt = (id: string): boolean => (v.nodes.find((n) => n.id === id)?.state ?? 'locked') === 'locked';

  // Landmarks. Each is a rect to keep the scenery off it.
  const solid: Rect[] = [];
  const put = (sprite: Px, x: number, y: number, locked: boolean): void => {
    p.blit(locked ? dimmed(sprite) : sprite, x, y);
    solid.push({ x, y, w: sprite.w, h: sprite.h });
  };
  const tree = pine();
  const woods: [number, number][] = [
    [9, 104], [23, 104], [37, 104], [51, 104], [16, 111], [30, 111], [44, 111], [58, 111],
    [9, 118], [23, 118], [37, 118], [51, 118], [58, 118], [9, 135],
  ];
  for (const [x, y] of woods) put(tree, x, y, lockedAt('1.1'));
  put(lab(), 40, 73, lockedAt('1.2'));
  put(school(), 121, 56, lockedAt('1.3'));
  put(pumpkin(), 205, 127, lockedAt('2.1'));
  put(gourd(), 236, 133, lockedAt('2.1'));
  put(gourd(), 237, 144, lockedAt('2.1'));
  put(hole(), 202, 78, lockedAt('2.2'));
  put(rift(), 228, 29, lockedAt('2.3'));
  put(pond(), 26, 38, false);

  // Scenery in the gaps: bushes, a few lone pines and rocks, placed by hash and kept off the path, the panels and the landmarks.
  const keep: Rect[] = [...solid];
  for (let i = 1; i < ROUTE.length; i++) {
    const a = ROUTE[i - 1] as [number, number], b = ROUTE[i] as [number, number];
    keep.push({ x: Math.min(a[0], b[0]) - 9, y: Math.min(a[1], b[1]) - 9, w: Math.abs(a[0] - b[0]) + 18, h: Math.abs(a[1] - b[1]) + 18 });
  }
  const kinds = [bush(), tree, bush(), bush(), rock(), tree, bush(), bush(), tree, rock(), bush(), bush(), tree, bush(), rock(), bush(), tree, bush(), bush(), rock()];
  let placed = 0;
  for (let n = 0; n < 400 && placed < kinds.length; n++) {
    const s = kinds[placed] as Px;
    const x = FX + 6 + (hash2(n, 3, 17) % (FW - 12 - s.w)), y = FY + 6 + (hash2(n, 9, 17) % (FH - 12 - s.h));
    const r = { x: x - 2, y: y - 2, w: s.w + 4, h: s.h + 4 };
    if (keep.some((k) => hits(k, r))) continue;
    p.blit(s, x, y);
    keep.push(r);
    placed++;
  }
  for (const n of v.nodes) {
    const xy = NODE_XY[n.id];
    if (xy) paintPanel(p, xy[0], xy[1], n.state);
  }

  // The bottom band: a black plate with a thin rounded rim.
  roundRect(p, 4, 178, 248, 44, 'dusk');
  roundRect(p, 5, 179, 246, 42, 'black');

  const c = p.toCanvas();
  const g = ctx2d(c);
  for (const n of v.nodes) {
    const xy = NODE_XY[n.id];
    if (xy && n.state !== 'open') label(g, n.id, xy[0], xy[1] + 1, n.state === 'locked' ? 'grey2' : 'black');
  }
  return c;
}

const lands = new Map<string, HTMLCanvasElement>();
function landFor(v: VarView): HTMLCanvasElement {
  const key = v.nodes.map((n) => n.state[0]).join('');
  let c = lands.get(key);
  if (!c) { c = buildLand(v); lands.set(key, c); }
  return c;
}

// ---------------------------------------------------------------- live parts
const rect = (ctx: Ctx, x: number, y: number, w: number, h: number, c: ColorName): void => { ctx.fillStyle = PAL[c]; ctx.fillRect(x, y, w, h); };

/** A stage id like 1.3 in the 3x5 font, which has no dot, so the dot is a pixel. 9 px wide, centered on x. */
function label(ctx: Ctx, id: string, x: number, y: number, color: ColorName): void {
  drawTinyText(ctx, id.charAt(0), x - 5, y, color);
  rect(ctx, x - 1, y + 4, 1, 1, color);
  drawTinyText(ctx, id.charAt(2), x + 1, y, color);
}

/** The open panel: it swaps between two warm faces and wears a dithered glow. Calm slows the swap to a slow breath. */
function openPanel(ctx: Ctx, cx: number, cy: number, id: string, t: number, calm: boolean): void {
  const x = cx - 8, y = cy - 8, on = ((t / (calm ? 90 : 24)) | 0) & 1;
  const glow: ColorName = on ? 'yellow' : 'amber';
  for (let j = -3; j < 19; j++) for (let i = -3; i < 19; i++) {
    const ring = Math.max(Math.abs(i - 7.5), Math.abs(j - 7.5));
    if (ring > 8 && ring < 11 && ((i + j) & 1) === 0 && !(Math.abs(i - 7.5) > 9.5 && Math.abs(j - 7.5) > 9.5)) rect(ctx, x + i, y + j, 1, 1, glow);
  }
  rect(ctx, x + 2, y + 16, 16, 2, 'pine1');
  rect(ctx, x + 16, y + 2, 2, 14, 'pine1');
  rect(ctx, x, y, 16, 16, 'black');
  const [face, hi, lo] = (on ? ['yellow', 'cream', 'orange'] : ['cream', 'white', 'amber']) as ColorName[];
  rect(ctx, x + 1, y + 1, 14, 14, face as ColorName);
  rect(ctx, x + 1, y + 1, 14, 1, hi as ColorName); rect(ctx, x + 1, y + 1, 1, 14, hi as ColorName);
  rect(ctx, x + 1, y + 14, 14, 1, lo as ColorName); rect(ctx, x + 14, y + 2, 1, 13, lo as ColorName);
  // A play arrow, red with a bright edge.
  [1, 2, 3, 4, 3, 2, 1].forEach((w, r) => rect(ctx, x + 6, y + 2 + r, w, 1, 'red'));
  label(ctx, id, cx, cy + 1, 'black');
}

/** White brackets around the selected panel, with a black underlay so they read on sand, green and cream alike. */
function brackets(ctx: Ctx, cx: number, cy: number, t: number, calm: boolean): void {
  const d = calm ? 3 : 3 + (((t >> 4) & 1) ? 1 : 0), L = 5;
  const x0 = cx - 8 - d, y0 = cy - 8 - d, x1 = cx + 7 + d, y1 = cy + 7 + d;
  for (const [pass, c] of [[1, 'black'], [0, 'white']] as [number, ColorName][]) {
    const o = pass;
    rect(ctx, x0 - o, y0 - o, L + o * 2, 1 + o * 2, c); rect(ctx, x0 - o, y0 - o, 1 + o * 2, L + o * 2, c);
    rect(ctx, x1 - L + 1 - o, y0 - o, L + o * 2, 1 + o * 2, c); rect(ctx, x1 - o, y0 - o, 1 + o * 2, L + o * 2, c);
    rect(ctx, x0 - o, y1 - o, L + o * 2, 1 + o * 2, c); rect(ctx, x0 - o, y1 - L + 1 - o, 1 + o * 2, L + o * 2, c);
    rect(ctx, x1 - L + 1 - o, y1 - o, L + o * 2, 1 + o * 2, c); rect(ctx, x1 - o, y1 - L + 1 - o, 1 + o * 2, L + o * 2, c);
  }
}

/** A point on the route between two nodes, k from 0 to 1, and the way it is heading. */
function along(from: string, to: string, k: number): { x: number; y: number; dir: Dir } {
  const a = NODE_VERT[from] ?? 0, b = NODE_VERT[to] ?? a, step = b >= a ? 1 : -1;
  const pts: [number, number][] = [];
  for (let i = a; i !== b + step; i += step) pts.push(ROUTE[i] as [number, number]);
  const seg = (i: number): number => { const [x0, y0] = pts[i - 1] as [number, number], [x1, y1] = pts[i] as [number, number]; return Math.abs(x1 - x0) + Math.abs(y1 - y0); };
  let total = 0;
  for (let i = 1; i < pts.length; i++) total += seg(i);
  let left = Math.min(1, Math.max(0, k)) * total, dir: Dir = 'down';
  for (let i = 1; i < pts.length; i++) {
    const [x0, y0] = pts[i - 1] as [number, number], [x1, y1] = pts[i] as [number, number];
    const len = seg(i);
    dir = x1 > x0 ? 'right' : x1 < x0 ? 'left' : y1 > y0 ? 'down' : 'up';
    if (left <= len || i === pts.length - 1) {
      const f = len ? Math.min(1, left / len) : 0;
      return { x: Math.round(x0 + (x1 - x0) * f), y: Math.round(y0 + (y1 - y0) * f), dir };
    }
    left -= len;
  }
  const only = pts[0] as [number, number];
  return { x: only[0], y: only[1], dir };
}

function drawToken(ctx: Ctx, v: VarView): void {
  const sel = NODE_XY[v.selected] ?? [128, 100];
  const pos = v.walk ? along(v.walk.from, v.walk.to, v.walk.k) : { x: sel[0], y: sel[1], dir: 'down' as Dir };
  const feet = pos.y - 1;
  for (let i = -4; i <= 4; i++) rect(ctx, pos.x + i, feet - 1 + (Math.abs(i) > 2 ? 1 : 0), 1, Math.abs(i) > 2 ? 1 : 2, 'ink');
  const frame = v.walk ? ((v.t / 7) | 0) & 3 : ((v.t / 30) | 0) & 1;
  drawActorFrame(ctx, v.lead, pos.dir, v.walk ? 'walk' : 'idle', frame, pos.x - 8, feet - 15);
}

// ---------------------------------------------------------------- the bars
function drawBars(ctx: Ctx, v: VarView): void {
  const w = textWidth(v.chapter) + 10;
  roundRect2(ctx, 5, 2, w, 12, 'leaf');
  roundRect2(ctx, 6, 3, w - 2, 10, 'pine1');
  drawText(ctx, v.chapter, 10, 5, 'white');
  const room = 256 - 8 - (5 + w) - 8;
  if (textWidth(v.stage) <= room) drawText(ctx, v.stage, 250, 5, 'yellow', { align: 'right' });
  else drawTinyText(ctx, v.stage, 250 - tinyWidth(v.stage), 6, 'yellow');

  const n = v.party.length, cw = Math.min(62, Math.floor(244 / Math.max(1, n))), x0 = Math.round((256 - n * cw) / 2);
  v.party.forEach((m, i) => {
    const fx = x0 + i * cw + Math.round((cw - 40) / 2), fy = 183;
    rect(ctx, fx - 1, fy - 1, 26, 26, 'slate');
    drawPortrait(ctx, m.id, 'neutral', fx, fy);
    drawText(ctx, 'LV', fx + 28, fy + 3, 'mist');
    drawText(ctx, String(m.level), fx + 28, fy + 13, 'yellow');
  });
  drawText(ctx, v.hint, 128, 212, 'mist', { align: 'center' });
}

function roundRect2(ctx: Ctx, x: number, y: number, w: number, h: number, c: ColorName): void {
  for (let j = 0; j < h; j++) {
    const edge = Math.min(j, h - 1 - j), ins = edge === 0 ? 2 : edge === 1 ? 1 : 0;
    rect(ctx, x + ins, y + j, w - ins * 2, 1, c);
  }
}

export const V1: MapVariant = {
  id: 1,
  name: 'Board game',
  blurb: 'A Super Mario Bros. 3 world map. A bright green field in a thick black frame, a wide sandy path with square turns, and a chunky landmark beside every stage panel.',
  draw(ctx, v) {
    ctx.drawImage(landFor(v), 0, 0);
    for (const n of v.nodes) {
      const xy = NODE_XY[n.id];
      if (xy && n.state === 'open') openPanel(ctx, xy[0], xy[1], n.id, v.t, v.calm);
    }
    const sel = NODE_XY[v.selected];
    if (sel) brackets(ctx, sel[0], sel[1], v.t, v.calm);
    drawToken(ctx, v);
    drawBars(ctx, v);
  },
};
