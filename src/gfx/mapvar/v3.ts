// Map variant 3, "Hawkins at night": an aerial map of the town after dark. The land is night blue; the route is a road in
// dusk blue, 3 px wide with a dashed slate center line, lit by amber streetlights. Each stage is a lit landmark seen from
// above, and a round road sign marks it: green check when cleared, glowing amber when open, slate when locked. A place that
// is still locked has its lights out. The last two stages are swallowed by Upside Down fog: ink and purple, dark red veins
// and drifting spores. The land is painted once per set of states and cached; each frame adds the glow, spores and token.
import type { MapVariant, VarNode, VarView } from './types.ts';
import type { Dir } from '../../core/types.ts';
import { PAL } from '../palette.ts';
import type { ColorName } from '../palette.ts';
import { Px } from '../px.ts';
import { BAYER4, ctx2d, hash2 } from '../canvas.ts';
import type { Ctx } from '../canvas.ts';
import { drawText, drawTinyText, textWidth, tinyWidth } from '../font.ts';
import { drawPortrait } from '../ui.ts';
import { drawActorFrame } from '../actors.ts';
import { arcade, halo, lab, patch, school, upside, woods } from './v3_art.ts';
import { SPORES, fogDensity, paintFog, paintVeins, sporeAt } from './v3_fog.ts';

const Y0 = 16, Y1 = 176;
const NODE: Record<string, [number, number]> = {
  '1.1': [34, 140], '1.2': [84, 92], '1.3': [140, 130], '2.1': [166, 84], '2.2': [206, 128], '2.3': [232, 60],
};
const UPSIDE = ['2.2', '2.3'];
/** The road's vertices with a corner radius each: a corner under a sign stays sharp so the token walks through its center. */
const VERTS: [number, number, number][] = [
  [34, 140, 0], [34, 92, 6], [84, 92, 0], [118, 92, 6], [118, 130, 6], [140, 130, 0], [166, 130, 6],
  [166, 84, 0], [206, 84, 6], [206, 128, 0], [232, 128, 6], [232, 60, 0],
];

// ---------------------------------------------------------------- the road, as pixels one step apart
const ROAD: [number, number][] = [];
const NODE_AT: Record<string, number> = {};
(() => {
  const push = (x: number, y: number): void => {
    const q = ROAD[ROAD.length - 1];
    if (!q || q[0] !== x || q[1] !== y) ROAD.push([x, y]);
  };
  const line = (x0: number, y0: number, x1: number, y1: number): void => {
    const n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0));
    for (let i = 0; i <= n; i++) push(Math.round(x0 + ((x1 - x0) * i) / (n || 1)), Math.round(y0 + ((y1 - y0) * i) / (n || 1)));
  };
  let cx = (VERTS[0] as number[])[0] as number, cy = (VERTS[0] as number[])[1] as number;
  for (let i = 1; i < VERTS.length; i++) {
    const [vx, vy, r] = VERTS[i] as [number, number, number];
    const [nx, ny] = (VERTS[i + 1] ?? VERTS[i]) as [number, number, number];
    if (r > 0 && i < VERTS.length - 1) {
      const d1x = Math.sign(vx - cx), d1y = Math.sign(vy - cy), d2x = Math.sign(nx - vx), d2y = Math.sign(ny - vy);
      const ax = vx - d1x * r, ay = vy - d1y * r, bx = vx + d2x * r, by = vy + d2y * r;
      line(cx, cy, ax, ay);
      for (let k = 1; k <= 10; k++) {
        const u = k / 10, w = 1 - u;
        push(Math.round(w * w * ax + 2 * w * u * vx + u * u * bx), Math.round(w * w * ay + 2 * w * u * vy + u * u * by));
      }
      cx = bx; cy = by;
    } else { line(cx, cy, vx, vy); cx = vx; cy = vy; }
  }
  for (const [id, [x, y]] of Object.entries(NODE)) {
    let best = 0, bd = 1e9;
    ROAD.forEach(([px, py], i) => { const d = Math.hypot(px - x, py - y); if (d < bd) { bd = d; best = i; } });
    NODE_AT[id] = best;
  }
})();

// ---------------------------------------------------------------- the land
const bayer = (x: number, y: number): number => ((BAYER4[((y & 3) * 4) + (x & 3)] as number) + 0.5) / 16;
function vnoise(x: number, y: number, seed: number): number {
  const xi = Math.floor(x), yi = Math.floor(y), fx = x - xi, fy = y - yi;
  const u = fx * fx * (3 - 2 * fx), v = fy * fy * (3 - 2 * fy);
  const a = hash2(xi, yi, seed) / 4294967296, b = hash2(xi + 1, yi, seed) / 4294967296;
  const c = hash2(xi, yi + 1, seed) / 4294967296, d = hash2(xi + 1, yi + 1, seed) / 4294967296;
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
}

interface Rect { x: number; y: number; w: number; h: number }
const hits = (a: Rect, b: Rect): boolean => a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;

/** Places the fixed set of town blocks: [x, y, w, h] rooftops, kept off the road, the landmarks and the fog. */
const NO_GO: Rect[] = [
  { x: 52, y: 24, w: 64, h: 60 }, { x: 40, y: 96, w: 76, h: 80 }, { x: 118, y: 132, w: 82, h: 44 }, { x: 124, y: 34, w: 40, h: 50 },
  { x: 172, y: 38, w: 34, h: 32 }, { x: 196, y: 16, w: 60, h: 160 }, { x: 28, y: 86, w: 94, h: 14 }, { x: 28, y: 86, w: 12, h: 60 },
  { x: 112, y: 86, w: 12, h: 50 }, { x: 160, y: 78, w: 50, h: 14 }, { x: 160, y: 78, w: 12, h: 58 },
];

function paintTown(p: Px, lit: (id: string) => boolean): void {
  // Land: night with broad patches of shadow, dithered where they fade.
  p.rect(0, Y0, 256, Y1 - Y0, 'night');
  for (let y = Y0; y < Y1; y++) for (let x = 0; x < 256; x++) {
    const n = vnoise(x / 22, y / 22, 2) * 0.65 + vnoise(x / 9, y / 9, 6) * 0.35;
    if (n > 0.74 || (n > 0.66 && (n - 0.66) / 0.08 > bayer(x, y))) p.set(x, y, 'shadow');
  }
  // A cross street or two that go nowhere, in the same dusk blue.
  for (const [x0, y0, x1, y1] of [[34, 140, 34, 172], [166, 84, 166, 40], [34, 92, 34, 44], [118, 130, 118, 172]]) {
    p.rect(Math.min(x0, x1) - 1, Math.min(y0, y1) - 1, Math.abs(x1 - x0) + 4, Math.abs(y1 - y0) + 4, 'ink');
    p.rect(Math.min(x0, x1), Math.min(y0, y1), Math.abs(x1 - x0) + 2, Math.abs(y1 - y0) + 2, 'dusk');
  }
  // Rooftops.
  const keep: Rect[] = [...NO_GO];
  let placed = 0;
  for (let n = 0; n < 500 && placed < 22; n++) {
    const w = 5 + (hash2(n, 1, 8) % 3), h = 4 + (hash2(n, 2, 8) % 3);
    const x = 8 + (hash2(n, 3, 8) % 236), y = Y0 + 6 + (hash2(n, 4, 8) % 148);
    const r = { x: x - 2, y: y - 2, w: w + 4, h: h + 4 };
    if (keep.some((k) => hits(k, r))) continue;
    keep.push(r);
    placed++;
    p.rect(x + 1, y + 1, w, h, 'ink').rect(x, y, w, h, 'dusk').rect(x, y, w, 1, 'slate').rect(x + (w >> 1), y, 1, h, 'shadow');
    if (hash2(n, 5, 8) % 5 < 2) p.set(x + 1, y + h - 1, 'amber');
  }
  // The odd tree, lone and dark.
  for (let n = 0; n < 60; n++) {
    const x = 6 + (hash2(n, 1, 9) % 244), y = Y0 + 5 + (hash2(n, 2, 9) % 150);
    const r = { x: x - 3, y: y - 3, w: 7, h: 7 };
    if (keep.some((k) => hits(k, r)) || ROAD.some(([rx, ry]) => Math.abs(rx - x) < 7 && Math.abs(ry - y) < 7)) continue;
    keep.push(r);
    p.disc(x, y, 3, 'pine0').set(x - 1, y - 1, 'pine1').set(x + 2, y + 1, 'black');
  }

  // The road. Dim where it leads to a locked stage.
  for (let pass = 0; pass < 3; pass++) {
    // Pass 0 lays an ink shoulder along the road, pass 1 the road itself, pass 2 the center dashes.
    NODE_IDS.forEach((id, j) => {
      if (j === 0) return;
      const a = NODE_AT[NODE_IDS[j - 1] as string] as number, b = NODE_AT[id] as number, open = lit(id);
      for (let i = a; i <= b; i++) {
        const [x, y] = ROAD[i] as [number, number];
        if (pass === 0) p.rect(x - 2, y - 2, 5, 5, 'ink');
        else if (pass === 1) p.rect(x - 1, y - 1, 3, 3, open ? 'dusk' : 'shadow');
        else if ((i - a) % 6 < 3 && !nearSign(x, y, 10)) p.set(x, y, open ? 'slate' : 'dusk');
      }
    });
  }
  // Streetlights on the lit stretches: a lamp beside the road and a dithered halo.
  NODE_IDS.forEach((id, j) => {
    if (j === 0 || !lit(id)) return;
    const a = NODE_AT[NODE_IDS[j - 1] as string] as number, b = NODE_AT[id] as number;
    for (let i = a + 12; i < b - 6; i += 22) {
      const [x, y] = ROAD[i] as [number, number], [x2, y2] = ROAD[Math.min(ROAD.length - 1, i + 2)] as [number, number];
      if (nearSign(x, y, 14) || fogDensity(x, y, []) > 0.08) continue;
      const flat = Math.abs(x2 - x) >= Math.abs(y2 - y), side = (i / 22) & 1 ? 1 : -1;
      const lx = x + (flat ? 0 : side * 5), ly = y + (flat ? side * 5 : 0);
      halo(p, lx, ly, 6, 'orange', 0.75);
      halo(p, lx, ly, 3, 'amber', 1);
      p.set(lx, ly, 'yellow');
    }
  });
}

const NODE_IDS = Object.keys(NODE);
const nearSign = (x: number, y: number, r: number): boolean => Object.values(NODE).some(([nx, ny]) => Math.abs(nx - x) < r && Math.abs(ny - y) < r);

const CHECK = ['......#', '#....##', '.#..##.', '..###..', '...#...'];
const LOCK = ['.ggg.', 'g...g', 'ggggg', 'ggkgg', 'ggkgg', 'ggggg'];

/** A round road sign seen from above. The open sign is drawn live, so here it only gets its shadow. */
function paintSign(p: Px, cx: number, cy: number, state: VarNode['state']): void {
  p.disc(cx + 2, cy + 2, 9, 'black');
  if (state === 'open') return;
  if (state === 'cleared') {
    p.disc(cx, cy, 9, 'bone').disc(cx, cy, 8, 'pine3');
    p.art(CHECK, { '#': 'white' }, cx - 3, cy - 6);
  } else {
    p.disc(cx, cy, 9, 'slate').disc(cx, cy, 8, 'dusk');
    p.art(LOCK, { g: 'mist', k: 'dusk' }, cx - 2, cy - 7);
  }
}

interface Land { canvas: HTMLCanvasElement; fog: Uint8Array }
const lands = new Map<string, Land>();

function buildLand(v: VarView): Land {
  const p = new Px(256, 224);
  const st = (id: string): VarNode['state'] => v.nodes.find((n) => n.id === id)?.state ?? 'locked';
  const lit = (id: string): boolean => st(id) !== 'locked';
  paintTown(p, lit);
  woods(p, lit('1.1'));
  lab(p, lit('1.2'));
  school(p, lit('1.3'));
  patch(p, lit('2.1'));
  arcade(p, lit('2.1'));
  // The fog keeps a clearing around any Upside Down stage that is no longer locked.
  const clear = UPSIDE.filter(lit).map((id) => NODE[id] as [number, number]);
  paintFog(p, Y0, Y1, clear);
  upside(p, !lit('2.2'), !lit('2.3'));
  paintVeins(p, Y0, Y1);
  for (const n of v.nodes) { const xy = NODE[n.id]; if (xy) paintSign(p, xy[0], xy[1], n.state); }
  // The bars.
  p.rect(0, 0, 256, Y0, 'ink').rect(0, Y0 - 1, 256, 1, 'dusk');
  p.rect(0, Y1, 256, 224 - Y1, 'ink').rect(0, Y1, 256, 1, 'dusk').rect(0, Y1 + 1, 256, 1, 'shadow');

  const c = p.toCanvas();
  const g = ctx2d(c);
  // Letters that need the font: the neon sign and the numbers on the signs.
  drawTinyText(g, 'ARCADE', 178, 43, lit('2.1') ? 'cyan' : 'slate');
  for (const n of v.nodes) {
    const xy = NODE[n.id];
    if (xy && n.state !== 'open') number(g, n.id, xy[0], xy[1] + 1, n.state === 'cleared' ? 'white' : 'mist');
  }
  const fog = new Uint8Array(256 * 224);
  for (let y = Y0; y < Y1; y++) for (let x = 150; x < 256; x++) fog[y * 256 + x] = Math.round(fogDensity(x, y, clear) * 255);
  return { canvas: c, fog };
}

function landFor(v: VarView): Land {
  const key = v.nodes.map((n) => n.state[0]).join('');
  let l = lands.get(key);
  if (!l) { l = buildLand(v); lands.set(key, l); }
  return l;
}

// ---------------------------------------------------------------- live parts
const rect = (ctx: Ctx, x: number, y: number, w: number, h: number, c: ColorName): void => { ctx.fillStyle = PAL[c]; ctx.fillRect(x, y, w, h); };

/** A stage number in the 3x5 font, which has no dot, so the dot is a pixel. 9 px wide, centered on x. */
function number(ctx: Ctx, id: string, x: number, y: number, color: ColorName): void {
  drawTinyText(ctx, id.charAt(0), x - 5, y, color);
  rect(ctx, x - 1, y + 4, 1, 1, color);
  drawTinyText(ctx, id.charAt(2), x + 1, y, color);
}

/** The glow around the open sign, in two sizes, as cached canvases. */
const glows: HTMLCanvasElement[] = [];
function glowOf(big: boolean): HTMLCanvasElement {
  const k = big ? 1 : 0;
  let c = glows[k];
  if (!c) {
    const p = new Px(44, 44);
    halo(p, 22, 22, big ? 20 : 15, big ? 'amber' : 'orange', big ? 0.8 : 0.6);
    halo(p, 22, 22, big ? 13 : 11, big ? 'yellow' : 'amber', big ? 0.5 : 0.35);
    c = p.toCanvas();
    glows[k] = c;
  }
  return c;
}

function drawOpen(ctx: Ctx, id: string, cx: number, cy: number, t: number, calm: boolean): void {
  const big = (((t / (calm ? 90 : 24)) | 0) & 1) === 1;
  ctx.drawImage(glowOf(big), cx - 22, cy - 22);
  // The sign: an amber disc with a bright rim, a play arrow on top and the number below.
  const disc = (r: number, c: ColorName): void => {
    ctx.fillStyle = PAL[c];
    for (let j = -r; j < r; j++) {
      const half = Math.round(Math.sqrt(Math.max(0, r * r - (j + 0.5) * (j + 0.5))));
      ctx.fillRect(cx - half, cy + j, half * 2, 1);
    }
  };
  disc(9, big ? 'cream' : 'yellow');
  disc(8, big ? 'yellow' : 'amber');
  [1, 2, 3, 2, 1].forEach((w, r) => rect(ctx, cx - 1, cy - 6 + r, w, 1, 'ink'));
  number(ctx, id, cx, cy + 1, 'ink');
}

/** Marching dashes in a ring around the selected sign. */
const RING: [number, number][] = [];
for (let a = 0; a < 80; a++) {
  const t = (a / 80) * Math.PI * 2, x = Math.round(Math.cos(t) * 13), y = Math.round(Math.sin(t) * 13);
  const q = RING[RING.length - 1];
  if (!q || q[0] !== x || q[1] !== y) RING.push([x, y]);
}
function drawSelect(ctx: Ctx, cx: number, cy: number, t: number, calm: boolean): void {
  const phase = calm ? 0 : t >> 2;
  RING.forEach(([dx, dy], i) => {
    if (((i + phase) % 6) < 3) { rect(ctx, cx + dx, cy + dy, 1, 1, 'white'); }
    else rect(ctx, cx + dx, cy + dy, 1, 1, 'ink');
  });
}

function along(from: string, to: string, k: number): { x: number; y: number; dir: Dir } {
  const a = NODE_AT[from] ?? 0, b = NODE_AT[to] ?? a;
  const i = Math.round(a + (b - a) * Math.min(1, Math.max(0, k)));
  const [x, y] = ROAD[i] as [number, number];
  const s = b >= a ? 1 : -1, j0 = Math.max(0, Math.min(ROAD.length - 1, i - 3 * s)), j1 = Math.max(0, Math.min(ROAD.length - 1, i + 3 * s));
  const dx = (ROAD[j1] as number[])[0]! - (ROAD[j0] as number[])[0]!, dy = (ROAD[j1] as number[])[1]! - (ROAD[j0] as number[])[1]!;
  return { x, y, dir: Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : (dy > 0 ? 'down' : 'up') };
}

function drawToken(ctx: Ctx, v: VarView): void {
  const sel = NODE[v.selected] ?? [128, 100];
  const pos = v.walk ? along(v.walk.from, v.walk.to, v.walk.k) : { x: sel[0], y: sel[1], dir: 'down' as Dir };
  const feet = pos.y - 1;
  for (let i = -4; i <= 4; i++) rect(ctx, pos.x + i, feet - 1 + (Math.abs(i) > 2 ? 1 : 0), 1, Math.abs(i) > 2 ? 1 : 2, 'black');
  const frame = v.walk ? ((v.t / 7) | 0) & 3 : ((v.t / 30) | 0) & 1;
  drawActorFrame(ctx, v.lead, pos.dir, v.walk ? 'walk' : 'idle', frame, pos.x - 8, feet - 15);
}

function drawBars(ctx: Ctx, v: VarView): void {
  drawText(ctx, v.chapter, 8, 5, 'mist');
  const room = 256 - 8 - 8 - textWidth(v.chapter) - 10;
  if (textWidth(v.stage) <= room) drawText(ctx, v.stage, 248, 5, 'amber', { align: 'right' });
  else drawTinyText(ctx, v.stage, 248 - tinyWidth(v.stage), 6, 'amber');
  const n = v.party.length, cw = Math.min(62, Math.floor(244 / Math.max(1, n))), x0 = Math.round((256 - n * cw) / 2);
  v.party.forEach((m, i) => {
    const fx = x0 + i * cw + Math.round((cw - 40) / 2), fy = 183;
    rect(ctx, fx - 1, fy - 1, 26, 26, 'dusk');
    drawPortrait(ctx, m.id, 'neutral', fx, fy);
    drawText(ctx, 'LV', fx + 28, fy + 3, 'mist');
    drawText(ctx, String(m.level), fx + 28, fy + 13, 'amber');
  });
  drawText(ctx, v.hint, 128, 212, 'mist', { align: 'center' });
}

export const V3: MapVariant = {
  id: 3,
  name: 'Hawkins at night',
  blurb: 'An aerial map of the town after dark: dusk blue roads under amber streetlights, lit landmarks, round road signs for stages, and the Upside Down fog swallowing the last two stages.',
  draw(ctx, v) {
    const land = landFor(v);
    ctx.drawImage(land.canvas, 0, 0);
    // Spores, only where there is fog, and not over a sign.
    const t = v.calm ? 0 : v.t;
    for (const s of SPORES) {
      const [x, y] = sporeAt(s, t, Y0, Y1);
      if (x < 0 || x > 255 || (land.fog[y * 256 + x] as number) < 70) continue;
      if (UPSIDE.some((id) => { const n = NODE[id] as [number, number]; return Math.abs(n[0] - x) < 11 && Math.abs(n[1] - y) < 11; })) continue;
      rect(ctx, x, y, s.big ? 2 : 1, s.big ? 2 : 1, s.c);
    }
    for (const n of v.nodes) {
      const xy = NODE[n.id];
      if (xy && n.state === 'open') drawOpen(ctx, n.id, xy[0], xy[1], v.t, v.calm);
    }
    const sel = NODE[v.selected];
    if (sel) drawSelect(ctx, sel[0], sel[1], v.t, v.calm);
    drawToken(ctx, v);
    drawBars(ctx, v);
  },
};
