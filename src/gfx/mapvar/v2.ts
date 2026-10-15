// Map variant 2, "Mike's campaign map": the D&D frame of the game. A sheet of graph paper lies on the basement table, with
// the wood showing at the edges. Everything on the sheet is ink line art in dark browns: doodled landmarks, a dashed pencil
// route and dungeon-room squares for the stages. Cleared rooms get a red pen check, the open one is circled in red, locked
// ones are smudged, and the Upside Down stages are ink stains. The token is the lead standing as a miniature on a round base.
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
import { arcade, compass, d20, lab, patch, school, stain, tape, woods } from './v2_art.ts';

/** The sheet of paper. */
const PX = 10, PY = 19, PW = 236, PH = 154;

/** Room centers and the control points of the route; each node sits on one of the control points. */
const ROOM: Record<string, [number, number]> = {
  '1.1': [50, 140], '1.2': [92, 92], '1.3': [126, 134], '2.1': [168, 88], '2.2': [206, 140], '2.3': [222, 62],
};
const CTRL: [number, number][] = [
  [50, 140], [62, 124], [74, 108], [86, 100], [92, 92],
  [104, 102], [110, 114], [120, 124], [126, 134],
  [128, 118], [140, 104], [154, 96], [168, 88],
  [184, 100], [196, 116], [204, 130], [206, 140],
  [214, 120], [222, 102], [226, 82], [222, 62],
];
const NODE_CTRL: Record<string, number> = { '1.1': 0, '1.2': 4, '1.3': 8, '2.1': 12, '2.2': 16, '2.3': 20 };
const UPSIDE = new Set(['2.2', '2.3']);

// ---------------------------------------------------------------- the route, as pixels one step apart
const ROUTE: [number, number][] = [];
const NODE_AT: Record<string, number> = {};
(() => {
  const at = (i: number): [number, number] => CTRL[Math.min(CTRL.length - 1, Math.max(0, i))] as [number, number];
  for (let i = 0; i < CTRL.length - 1; i++) {
    const [p0, p1, p2, p3] = [at(i - 1), at(i), at(i + 1), at(i + 2)];
    for (const [id, ci] of Object.entries(NODE_CTRL)) if (ci === i) NODE_AT[id] = ROUTE.length;
    const n = Math.ceil(Math.hypot(p2[0] - p1[0], p2[1] - p1[1]) * 1.4);
    for (let k = 0; k < n; k++) {
      const u = k / n, u2 = u * u, u3 = u2 * u;
      const f = (a: number, b: number, c: number, d: number): number => 0.5 * (2 * b + (-a + c) * u + (2 * a - 5 * b + 4 * c - d) * u2 + (-a + 3 * b - 3 * c + d) * u3);
      const x = Math.round(f(p0[0], p1[0], p2[0], p3[0])), y = Math.round(f(p0[1], p1[1], p2[1], p3[1]));
      const last = ROUTE[ROUTE.length - 1];
      if (!last || last[0] !== x || last[1] !== y) ROUTE.push([x, y]);
    }
  }
  NODE_AT['2.3'] = ROUTE.length;
  ROUTE.push(CTRL[CTRL.length - 1] as [number, number]);
})();

// ---------------------------------------------------------------- the table and the paper
function paintWood(p: Px): void {
  p.fill('soil1');
  for (let y = 0; y < 224; y++) {
    const row = y >> 4, seam = (y & 15) === 15;
    if (seam) { p.rect(0, y, 256, 1, 'soil0'); continue; }
    if ((y & 15) === 0) for (let x = 0; x < 256; x += 2) p.set(x + (y & 1), y, 'soil2');
    // Grain: a few long streaks, darker more often than lighter.
    if (hash2(y, 7, 1) % 5 === 0) {
      const x0 = hash2(y, 8, 1) % 256, len = 10 + (hash2(y, 9, 1) % 40), c = hash2(y, 10, 1) % 3 === 0 ? 'soil2' : 'soil0';
      p.rect(x0, y, len, 1, c);
    }
    // Where two boards meet end to end.
    const jx = (row * 83 + 40) % 256, jx2 = (jx + 128) % 256;
    p.set(jx, y, 'soil0').set(jx2, y, 'soil0');
  }
  // Two knots in the grain, one on each side of the sheet.
  for (const [kx, ky] of [[4, 100], [251, 60]]) p.ellipse(kx as number, ky as number, 2.5, 4, 'soil0').ellipse(kx as number, ky as number, 1, 2.2, 'soil2');
}

function paintPaper(p: Px): void {
  p.rect(PX + 2, PY + 2, PW, PH, 'soil0');
  p.rect(PX, PY, PW, PH, 'cream');
  // A graph grid: a dotted line every 8 px.
  for (let gx = PX + 4; gx < PX + PW; gx += 8) for (let y = PY + 1; y < PY + PH - 1; y += 2) p.set(gx, y, 'sand');
  for (let gy = PY + 4; gy < PY + PH; gy += 8) for (let x = PX + 1; x < PX + PW - 1; x += 2) p.set(x, gy, 'sand');
  // Aged edges: a solid rim and a dithered band inside it, heavier at the bottom.
  for (let y = PY; y < PY + PH; y++) for (let x = PX; x < PX + PW; x++) {
    const d = Math.min(x - PX, PX + PW - 1 - x, y - PY, PY + PH - 1 - y);
    if (d === 0) p.set(x, y, 'sand');
    else if (d === 1 && ((x + y) & 1) === 0) p.set(x, y, 'sand');
    else if (d === 2 && ((x + y) & 3) === 0 && y > PY + PH / 2) p.set(x, y, 'sand');
  }
}

/** The sprite with its dark inks turned to light pencil and its hatching dropped: a place not yet explored. */
function pencil(src: Px): Px {
  const out = new Px(src.w, src.h);
  const ink = px32('soil0'), mid = px32('soil1'), hatchC = px32('soil2'), paper = px32('cream'), pen = px32('soil3');
  for (let i = 0; i < src.d.length; i++) {
    const v = src.d[i] as number;
    out.d[i] = v === ink || v === mid ? pen : v === hatchC ? paper : v;
  }
  return out;
}

/** A smear of graphite: a lighter, dither-dotted patch with a darker heart. */
function smudge(p: Px, cx: number, cy: number, rx: number, ry: number, seed: number): void {
  for (let y = cy - ry; y <= cy + ry; y++) for (let x = cx - rx; x <= cx + rx; x++) {
    const a = (x - cx) / rx, b = (y - cy) / ry, d = a * a + b * b;
    if (d > 1) continue;
    const h = hash2(x, y, seed) % 100, here = p.get(x, y);
    if (!here) continue;
    if (d < 0.35 && ((x + y) & 1) === 0 && h < 60) p.set(x, y, 'soil3');
    else if (h < 45 * (1 - d) + 8) p.set(x, y, 'sand');
  }
}

// ---------------------------------------------------------------- rooms
type Side = 'n' | 'e' | 's' | 'w';
/** The way out of a room, toward the next one (or back toward the last one, for the last room). */
function doorSide(id: string): Side {
  const ids = Object.keys(ROOM), i = ids.indexOf(id);
  const a = ROOM[id] as [number, number], b = ROOM[ids[i < ids.length - 1 ? i + 1 : i - 1] as string] as [number, number];
  const dx = b[0] - a[0], dy = b[1] - a[1];
  return Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'e' : 'w') : (dy > 0 ? 's' : 'n');
}

/** A dungeon room, 16 by 16: thick hatched walls, a paper floor and a gap in the wall where the door is. */
function paintRoom(p: Px, cx: number, cy: number, id: string, state: VarNode['state']): void {
  const x = cx - 8, y = cy - 8, locked = state === 'locked', ud = UPSIDE.has(id);
  const wall = locked ? 'soil2' : 'soil1', edge = locked ? 'soil3' : 'soil0';
  p.rect(x, y, 16, 16, edge).rect(x + 1, y + 1, 14, 14, wall);
  for (let j = 1; j < 15; j++) for (let i = 1; i < 15; i++) if (((i + j) & 1) === 0) p.set(x + i, y + j, locked ? 'soil3' : 'soil2');
  const floor = locked && ud ? 'ink' : locked ? 'sand' : 'cream';
  p.rect(x + 2, y + 2, 12, 12, floor);
  if (locked && !ud) for (let j = 2; j < 14; j++) for (let i = 2; i < 14; i++) if (((i + j) & 1) === 0) p.set(x + i, y + j, 'cream');
  // The door: a four pixel gap through both wall layers, with a post on each side.
  const side = doorSide(id), g = floor === 'sand' ? 'cream' : floor;
  const gap = (ax: number, ay: number, w: number, h: number): void => { p.rect(x + ax, y + ay, w, h, g); };
  if (side === 'e') { gap(13, 6, 3, 4); p.rect(x + 14, y + 5, 2, 1, edge).rect(x + 14, y + 10, 2, 1, edge); }
  if (side === 'w') { gap(0, 6, 3, 4); p.rect(x, y + 5, 2, 1, edge).rect(x, y + 10, 2, 1, edge); }
  if (side === 's') { gap(6, 13, 4, 3); p.rect(x + 5, y + 14, 1, 2, edge).rect(x + 10, y + 14, 1, 2, edge); }
  if (side === 'n') { gap(6, 0, 4, 3); p.rect(x + 5, y, 1, 2, edge).rect(x + 10, y, 1, 2, edge); }
}

const CHECK = ['.........rr', '........rr.', '.......rr..', 'rr....rr...', '.rr..rr....', '..rrrr.....', '...rr......'];

// ---------------------------------------------------------------- the land
const PLACES: { text: string; x: number; y: number; id: string }[] = [
  { text: 'MIRKWOOD', x: 12, y: 153, id: '1.1' }, { text: 'HAWKINS LAB', x: 30, y: 80, id: '1.2' },
  { text: 'MIDDLE SCHOOL', x: 126, y: 149, id: '1.3' }, { text: 'PUMPKIN PATCH', x: 140, y: 43, id: '2.1' },
  { text: 'THE TUNNELS', x: 183, y: 160, id: '2.2' }, { text: 'THE GATE', x: 207, y: 85, id: '2.3' },
];

function buildLand(v: VarView): HTMLCanvasElement {
  const p = new Px(256, 224);
  paintWood(p);
  paintPaper(p);
  const state = (id: string): VarNode['state'] => v.nodes.find((n) => n.id === id)?.state ?? 'locked';
  const locked = (id: string): boolean => state(id) === 'locked';

  // Smudges first, so the doodles are drawn over them.
  v.nodes.forEach((n, i) => {
    const xy = ROOM[n.id];
    if (xy && n.state === 'locked' && !UPSIDE.has(n.id)) smudge(p, xy[0] - 6, xy[1] - 4, 26, 20, 3 + i);
  });

  // Doodles, in ink, or in faint pencil where the way is still shut.
  const draw = (s: Px, x: number, y: number, id: string): void => { p.blit(locked(id) ? pencil(s) : s, x, y); };
  draw(woods(), 12, 100, '1.1');
  draw(lab(), 36, 48, '1.2');
  draw(school(), 138, 114, '1.3');
  draw(patch(), 144, 50, '2.1');
  draw(arcade(), 186, 52, '2.1');
  p.blit(compass(), 92, 31);

  // The route: a dashed pencil line, dark where walked, lighter where it is still ahead.
  v.nodes.forEach((n, j) => {
    if (j === 0) return;
    const a = NODE_AT[(v.nodes[j - 1] as VarNode).id] as number, b = NODE_AT[n.id] as number;
    const c: ColorName = n.state === 'cleared' ? 'soil1' : n.state === 'open' ? 'soil2' : 'soil3';
    for (let i = a; i <= b; i++) {
      const pt = ROUTE[i] as [number, number];
      if ((i - a) % 7 >= 4 && i !== b) continue;
      // The pencil leaves a mark two pixels wide: beside the pixel across the line, not along it.
      const q = ROUTE[Math.min(ROUTE.length - 1, i + 1)] as [number, number], o = ROUTE[Math.max(0, i - 1)] as [number, number];
      const flat = Math.abs(q[0] - o[0]) >= Math.abs(q[1] - o[1]);
      p.set(pt[0], pt[1], c).set(pt[0] + (flat ? 0 : 1), pt[1] + (flat ? 1 : 0), c);
    }
  });

  // The Upside Down: stains that swallow the route's end.
  p.blit(stain('tunnels'), (ROOM['2.2'] as number[])[0]! - 23, (ROOM['2.2'] as number[])[1]! - 17);
  p.blit(stain('gate'), (ROOM['2.3'] as number[])[0]! - 20, (ROOM['2.3'] as number[])[1]! - 20);

  for (const n of v.nodes) {
    const xy = ROOM[n.id];
    if (!xy) continue;
    paintRoom(p, xy[0], xy[1], n.id, n.state);
    if (n.state === 'cleared') p.art(CHECK, { r: 'red' }, xy[0] - 1, xy[1] - 13).set(xy[0] + 9, xy[1] - 13, 'hot').set(xy[0] + 8, xy[1] - 12, 'hot');
  }

  // The table's d20 and the tape on the sheet's corners.
  p.blit(tape(), 3, 15).blit(tape(), 239, 15, true);
  p.blit(d20(), 228, 155);

  const c = p.toCanvas();
  const g = ctx2d(c);
  for (const pl of PLACES) drawTinyText(g, pl.text, pl.x, pl.y, locked(pl.id) && !UPSIDE.has(pl.id) ? 'soil3' : 'soil1');
  drawTinyText(g, 'N', 100, 25, 'soil1');
  drawTinyText(g, 'HERE BE DEMOGORGONS', 118, 24, 'soil3');
  drawTinyText(g, 'HAWKINS 1983', 14, 23, 'soil2');
  for (const n of v.nodes) {
    const xy = ROOM[n.id];
    if (!xy) continue;
    const ink: ColorName = n.state === 'locked' ? (UPSIDE.has(n.id) ? 'soil3' : 'soil2') : 'soil0';
    numberAt(g, n.id, xy[0], xy[1] + 1, ink);
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

/** The room number in the 3x5 font, which has no dot, so the dot is a pixel. 9 px wide, centered on x. */
function numberAt(ctx: Ctx, id: string, x: number, y: number, color: ColorName): void {
  drawTinyText(ctx, id.charAt(0), x - 5, y - 2, color);
  rect(ctx, x - 1, y + 2, 1, 1, color);
  drawTinyText(ctx, id.charAt(2), x + 1, y - 2, color);
}

/** A hand-drawn loop around a room: a little wobbly, drifting outward, overshooting where the pen met the start. */
function loop(r: number, wob: number): [number, number][] {
  const out: [number, number][] = [];
  for (let a = -0.5; a < Math.PI * 2 + 0.4; a += 0.05) {
    const k = (a + 0.5) / (Math.PI * 2 + 0.9);
    const rx = r + 1 + 1.5 * k + wob * Math.sin(3 * a + 1), ry = r + 0.5 + 1.2 * k + wob * Math.cos(2 * a);
    const x = Math.round(Math.cos(a) * rx), y = Math.round(Math.sin(a) * ry);
    const last = out[out.length - 1];
    if (!last || last[0] !== x || last[1] !== y) out.push([x, y]);
  }
  return out;
}
const RING_A = loop(12, 0.7), RING_B = loop(15, 0.9);

function strokeRing(ctx: Ctx, cx: number, cy: number, pts: [number, number][], c: ColorName, dither: boolean): void {
  ctx.fillStyle = PAL[c];
  for (const [dx, dy] of pts) {
    const x = cx + dx, y = cy + dy;
    if (dither && ((x + y) & 1)) continue;
    ctx.fillRect(x, y, 1, 1);
    if (!dither) ctx.fillRect(Math.abs(dx) > Math.abs(dy) * 0.8 ? x : x + (dx < 0 ? -1 : 1), Math.abs(dx) > Math.abs(dy) * 0.8 ? y + (dy < 0 ? -1 : 1) : y, 1, 1);
  }
}

/** The open room is circled in red. Normally the pen goes round twice and once, in turn; calm keeps both and only breathes. */
function drawOpen(ctx: Ctx, cx: number, cy: number, t: number, calm: boolean): void {
  const on = ((t / (calm ? 90 : 24)) | 0) & 1;
  if (calm) { strokeRing(ctx, cx, cy, RING_B, 'hot', true); strokeRing(ctx, cx, cy, RING_A, on ? 'hot' : 'red', false); return; }
  if (on) strokeRing(ctx, cx, cy, RING_B, 'hot', false);
  strokeRing(ctx, cx, cy, RING_A, on ? 'hot' : 'red', false);
}

/** A marker halo around the selected room: amber dots in a ring, outside the walls. */
function drawSelect(ctx: Ctx, cx: number, cy: number, t: number, calm: boolean): void {
  const grow = calm ? 0 : ((t >> 4) & 1);
  const rx = 15 + grow, ry = 14 + grow;
  ctx.fillStyle = PAL.amber;
  for (let y = -ry; y <= ry; y++) for (let x = -rx; x <= rx; x++) {
    if (x >= -8 && x < 8 && y >= -8 && y < 8) continue;
    const d = (x * x) / (rx * rx) + (y * y) / (ry * ry);
    if (d <= 1 && d > 0.55 && ((x + y + 64) & 1) === 0) ctx.fillRect(cx + x, cy + y, 1, 1);
  }
}

/** A point on the route between two nodes, k from 0 to 1, and the way it is heading. */
function along(from: string, to: string, k: number): { x: number; y: number; dir: Dir } {
  const a = NODE_AT[from] ?? 0, b = NODE_AT[to] ?? a;
  const i = Math.round(a + (b - a) * Math.min(1, Math.max(0, k)));
  const [x, y] = ROUTE[i] as [number, number];
  const s = b >= a ? 1 : -1, j0 = Math.max(0, Math.min(ROUTE.length - 1, i - 4 * s)), j1 = Math.max(0, Math.min(ROUTE.length - 1, i + 4 * s));
  const dx = (ROUTE[j1] as number[])[0]! - (ROUTE[j0] as number[])[0]!, dy = (ROUTE[j1] as number[])[1]! - (ROUTE[j0] as number[])[1]!;
  return { x, y, dir: Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : (dy > 0 ? 'down' : 'up') };
}

/** The miniature: a round plastic base and the lead standing on it. */
function drawMini(ctx: Ctx, v: VarView): void {
  const room = ROOM[v.selected] ?? [128, 100];
  const pos = v.walk ? along(v.walk.from, v.walk.to, v.walk.k) : { x: room[0], y: room[1], dir: 'down' as Dir };
  const y0 = pos.y + 6;
  const rows: [number, number, ColorName][] = [[-3, 5, 'ink'], [-2, 7, 'ink'], [-1, 8, 'grey2'], [0, 8, 'grey2'], [1, 8, 'grey1'], [2, 7, 'ink'], [3, 5, 'ink']];
  for (const [dy, half, c] of rows) rect(ctx, pos.x - half, y0 + dy - 1, half * 2 + 1, 1, c);
  rect(ctx, pos.x - 5, y0 - 2, 5, 1, 'grey3');
  const frame = v.walk ? ((v.t / 7) | 0) & 3 : ((v.t / 30) | 0) & 1;
  drawActorFrame(ctx, v.lead, pos.dir, v.walk ? 'walk' : 'idle', frame, pos.x - 8, y0 - 15);
}

// ---------------------------------------------------------------- the bars, on the wood
function drawBars(ctx: Ctx, v: VarView): void {
  drawText(ctx, v.chapter, 8, 5, 'cream', { shadow: true });
  const room = 256 - 8 - 8 - textWidth(v.chapter) - 10;
  if (textWidth(v.stage) <= room) drawText(ctx, v.stage, 248, 5, 'cream', { align: 'right', shadow: true });
  else drawTinyText(ctx, v.stage, 248 - tinyWidth(v.stage), 6, 'cream');
  const n = v.party.length, cw = Math.min(62, Math.floor(244 / Math.max(1, n))), x0 = Math.round((256 - n * cw) / 2);
  v.party.forEach((m, i) => {
    const fx = x0 + i * cw + Math.round((cw - 40) / 2), fy = 183;
    rect(ctx, fx - 1, fy - 1, 28, 28, 'soil0');
    rect(ctx, fx - 1, fy - 1, 26, 26, 'sand');
    drawPortrait(ctx, m.id, 'neutral', fx, fy);
    drawText(ctx, 'LV', fx + 28, fy + 3, 'cream', { shadow: true });
    drawText(ctx, String(m.level), fx + 28, fy + 13, 'cream', { shadow: true });
  });
  drawText(ctx, v.hint, 128, 212, 'cream', { align: 'center', shadow: true });
}

export const V2: MapVariant = {
  id: 2,
  name: "Mike's campaign map",
  blurb: 'The D&D frame of the game: graph paper on the basement table, ink doodles, a dashed pencil route, dungeon rooms for stages, a red pen check or circle, and the Upside Down as ink stains.',
  draw(ctx, v) {
    ctx.drawImage(landFor(v), 0, 0);
    const sel = ROOM[v.selected];
    if (sel) drawSelect(ctx, sel[0], sel[1], v.t, v.calm);
    for (const n of v.nodes) {
      const xy = ROOM[n.id];
      if (xy && n.state === 'open') drawOpen(ctx, xy[0], xy[1], v.t, v.calm);
    }
    drawMini(ctx, v);
    drawBars(ctx, v);
  },
};
