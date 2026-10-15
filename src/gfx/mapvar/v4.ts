// Map variant 4, "Two Hawkins": Hawkins above a wavy horizon, the same land hanging below it in the Upside Down.
// The still layers live in v4_land.ts (cached per set of node states); this file adds everything that moves, the nodes,
// the token, and the bars. See map-variations.html.
import type { MapVariant, VarNode, VarView } from './types.ts';
import { Px } from '../px.ts';
import { BAYER4, discPx, makeCanvas, ctx2d, rect } from '../canvas.ts';
import type { Ctx } from '../canvas.ts';
import { drawText, drawTinyText } from '../font.ts';
import { drawPortrait } from '../ui.ts';
import { drawActorFrame } from '../actors.ts';
import type { Dir } from '../../core/types.ts';
import { HZ, POS, tokenAt } from './v4_geo.ts';
import { BAND_Y, GATE_AT, HOLE, buildWorld } from './v4_land.ts';
import type { World } from './v4_land.ts';

const worlds = new Map<string, World>();
function worldFor(nodes: VarNode[]): World {
  const key = nodes.map((n) => n.state).join(',');
  let w = worlds.get(key);
  if (!w) {
    const st: Record<string, VarNode['state']> = {};
    for (const n of nodes) st[n.id] = n.state;
    w = buildWorld(st);
    worlds.set(key, w);
  }
  return w;
}

// ---------------------------------------------------------------- bars (still)
let chrome: HTMLCanvasElement | null = null;
function chromeLayer(): HTMLCanvasElement {
  if (chrome) return chrome;
  const p = new Px(256, 224);
  p.rect(0, 0, 256, 14, 'ink'); p.rect(0, 14, 256, 1, 'shadow'); p.rect(0, 15, 256, 1, 'slate');
  for (let y = BAND_Y - 8; y < BAND_Y; y++) for (let x = 0; x < 256; x++) if ((BAYER4[(y & 3) * 4 + (x & 3)] as number) / 16 < (y - (BAND_Y - 9)) / 9) p.set(x, y, 'ink');
  p.rect(0, BAND_Y, 256, 48, 'ink'); p.rect(0, BAND_Y, 256, 1, 'blood1'); p.rect(0, BAND_Y + 1, 256, 1, 'blood0');
  chrome = p.toCanvas();
  return chrome;
}

function drawBars(ctx: Ctx, v: VarView): void {
  drawText(ctx, v.chapter, 6, 4, 'mist', { shadow: true });
  drawText(ctx, v.stage, 250, 4, 'yellow', { align: 'right', shadow: true });
  const n = v.party.length, cell = Math.min(62, Math.floor(252 / Math.max(1, n)));
  const x0 = Math.round((256 - n * cell) / 2), blockW = 24 + 4 + 12, off = Math.round((cell - blockW) / 2);
  v.party.forEach((m, i) => {
    const x = x0 + i * cell + off, y = BAND_Y + 5;
    rect(ctx, x - 1, y - 1, 26, 26, 'purple');
    drawPortrait(ctx, m.id, 'neutral', x, y);
    drawText(ctx, 'LV', x + 28, y + 2, 'mist', { shadow: true });
    drawText(ctx, String(m.level), x + 28, y + 13, 'yellow', { shadow: true });
  });
  drawText(ctx, v.hint, 128, BAND_Y + 36, 'mist', { align: 'center', shadow: true });
}

// ---------------------------------------------------------------- things that drift
const CLOUD_A = ['.....wwww.......', '..wwwwwwwww.....', '.wwwwwwwwwwwww..', 'wwwwwwwwwwwwwwww', 'bbbbbbbbbbbbbbbb'];
const CLOUD_B = ['...www.....', '.wwwwwww..', 'wwwwwwwwww', 'bbbbbbbbbb'];
let clouds: HTMLCanvasElement[] | null = null;
function cloudSprites(): HTMLCanvasElement[] {
  return clouds ?? (clouds = [CLOUD_A, CLOUD_B].map((rows) => new Px(16, 5).art(rows, { w: 'white', b: 'bone' }).toCanvas()));
}

function drawClouds(ctx: Ctx, t: number): void {
  const [a, b] = cloudSprites() as [HTMLCanvasElement, HTMLCanvasElement];
  const T = t * 0.07;
  ctx.drawImage(a, Math.round(((20 + T) % 300) - 30), 22);
  ctx.drawImage(b, Math.round(((150 + T * 0.7) % 300) - 30), 29);
  ctx.drawImage(a, Math.round(((235 + T * 0.5) % 300) - 30), 19);
}

interface Spore { x: number; y: number; vy: number; amp: number; ph: number; big: boolean }
let spores: Spore[] | null = null;
function sporeList(): Spore[] {
  if (spores) return spores;
  spores = [];
  for (let i = 0; i < 46; i++) {
    const h = (n: number): number => (((Math.imul(i + 1, 0x9e3779b1) ^ Math.imul(n, 0x85ebca6b)) >>> 0) % 1000) / 1000;
    spores.push({ x: h(1) * 256, y: h(2) * 70, vy: 0.1 + h(3) * 0.22, amp: 1 + h(4) * 3, ph: h(5) * 6.28, big: h(6) > 0.78 });
  }
  return spores;
}

function drawSpores(ctx: Ctx, t: number, calm: boolean): void {
  const T = calm ? 0 : t, top = HZ + 6, range = BAND_Y - 6 - top;
  for (const s of sporeList()) {
    const y = top + ((((s.y - T * s.vy) % range) + range) % range);
    const x = Math.round(s.x + Math.sin(T * 0.02 + s.ph) * s.amp);
    if (s.big) { rect(ctx, x, Math.round(y), 2, 2, 'grey3'); rect(ctx, x + 1, Math.round(y) + 1, 1, 1, 'grey2'); }
    else rect(ctx, x, Math.round(y), 1, 1, y > top + 40 ? 'grey2' : 'grey3');
  }
}

function drawVeinLights(ctx: Ctx, w: World, t: number): void {
  w.veins.forEach((pts, i) => {
    if (i % 2 || pts.length < 10) return;
    const n = pts.length + 14, head = Math.floor(t / 2 + i * 17) % n;
    for (let k = 0; k < 3; k++) {
      const p = pts[head - k];
      if (p) rect(ctx, p[0], p[1], 1, 1, k === 0 ? 'pink' : k === 1 ? 'hot' : 'red');
    }
  });
}

function drawHoleSwirl(ctx: Ctx, t: number, locked: boolean, calm: boolean): void {
  if (locked) return;
  const a0 = t * (calm ? 0.012 : 0.045);
  for (let i = 0; i < 7; i++) {
    const a = a0 + (i * Math.PI * 2) / 7;
    const x = Math.round(HOLE.x + Math.cos(a) * 11), y = Math.round(HOLE.y + 1 + Math.sin(a) * 3.6);
    if (Math.sin(a) < -0.2) continue;
    rect(ctx, x, y, 1, 1, i % 2 ? 'hot' : 'pink');
  }
}

function drawGateSpark(ctx: Ctx, t: number, locked: boolean): void {
  if (locked) return;
  const c = t % 80;
  if (c > 8) return;
  const seed = (t >> 1) * 7919;
  let x = GATE_AT.x - 9, y = GATE_AT.y - 20;
  for (let k = 0; k < 14; k++) {
    rect(ctx, x, y, 1, 1, k % 3 ? 'magenta' : 'pink');
    x += ((seed >> k) & 1) ? 1 : 0; y += 3 - ((seed >> (k + 3)) & 1);
    if (k % 4 === 3) x += (((seed >> k) & 2) ? 2 : -1);
  }
}

// ---------------------------------------------------------------- nodes
function dotRing(ctx: Ctx, cx: number, cy: number, r: number, color: 'white' | 'cyan' | 'yellow' | 'orange', dither: boolean): void {
  const n = Math.ceil(r * 7);
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2;
    const x = Math.round(cx + Math.cos(a) * r), y = Math.round(cy + Math.sin(a) * r);
    if (dither && ((x + y) & 1)) continue;
    rect(ctx, x, y, 1, 1, color);
  }
}

function tinyId(ctx: Ctx, id: string, cx: number, y: number, color: 'ink' | 'white'): void {
  drawTinyText(ctx, id.charAt(0), cx - 4, y, color);
  rect(ctx, cx, y + 4, 1, 1, color);
  drawTinyText(ctx, id.charAt(2), cx + 2, y, color);
}

function drawNode(ctx: Ctx, n: VarNode, x: number, y: number, t: number, calm: boolean): void {
  discPx(ctx, x, y, 7, 'ink');
  if (n.state === 'cleared') {
    discPx(ctx, x, y, 6, 'orange'); discPx(ctx, x, y, 5, 'yellow');
    rect(ctx, x - 3, y - 4, 3, 1, 'cream'); rect(ctx, x - 4, y - 3, 1, 2, 'cream');
    for (const [dx, dy] of [[-3, 0], [-2, 1], [-1, 2], [0, 1], [1, 0], [2, -1], [3, -2]] as const) rect(ctx, x + dx, y + dy - 1, 1, 2, 'ink');
  } else if (n.state === 'open') {
    const period = calm ? 240 : 64, ph = (t % period) / period;
    const hot = calm ? ((t / 120) | 0) % 2 === 0 : ph < 0.5;
    if (!calm) dotRing(ctx, x, y, 8 + Math.floor(ph * 6), ph < 0.5 ? 'white' : 'cyan', ph >= 0.5);
    else dotRing(ctx, x, y, 9, 'cyan', true);
    discPx(ctx, x, y, 6, hot ? 'white' : 'cyan'); discPx(ctx, x, y, 5, hot ? 'cream' : 'white');
    tinyId(ctx, n.id, x, y - 2, 'ink');
  } else {
    discPx(ctx, x, y, 6, 'grey2'); discPx(ctx, x, y, 5, 'ink');
    rect(ctx, x - 2, y - 1, 5, 4, 'grey3'); rect(ctx, x - 1, y - 4, 3, 1, 'grey3'); rect(ctx, x - 2, y - 3, 1, 3, 'grey3'); rect(ctx, x + 2, y - 3, 1, 3, 'grey3');
    rect(ctx, x, y, 1, 2, 'ink');
  }
}

function brackets(ctx: Ctx, x: number, y: number, t: number, calm: boolean): void {
  const r = 11 + (!calm && t % 40 >= 20 ? 1 : 0), a = 4;
  for (const [sx, sy] of [[-1, -1], [1, -1], [-1, 1], [1, 1]] as const) {
    const cx = x + sx * r, cy = y + sy * r;
    const hx = sx < 0 ? cx : cx - a + 1, vy = sy < 0 ? cy : cy - a + 1;
    rect(ctx, hx + 1, cy + 1, a, 1, 'ink'); rect(ctx, cx + 1, vy + 1, 1, a, 'ink');
    rect(ctx, hx, cy, a, 1, 'white'); rect(ctx, cx, vy, 1, a, 'white');
  }
}

// ---------------------------------------------------------------- the token
let scratch: HTMLCanvasElement | null = null;
function tokenSprite(lead: VarView['lead'], dir: Dir, walking: boolean, t: number): HTMLCanvasElement {
  scratch ??= makeCanvas(16, 16);
  const g = ctx2d(scratch);
  g.clearRect(0, 0, 16, 16);
  drawActorFrame(g, lead, dir, walking ? 'walk' : 'idle', walking ? (t / 7 | 0) & 3 : (t / 30 | 0) & 1, 0, 0);
  return scratch;
}

/** The lead's own sprite stands on the node. Below the horizon it hangs upside down, and turns over as it passes through the hole. */
function drawToken(ctx: Ctx, v: VarView): void {
  const p = tokenAt(v.selected, v.walk);
  const s = Math.max(-1, Math.min(1, (HZ + 8 - p.y) / 10));
  const dir: Dir = !v.walk ? 'down' : Math.abs(p.dx) > Math.abs(p.dy) ? (p.dx > 0 ? 'right' : 'left') : p.dy > 0 ? 'down' : 'up';
  const sprite = tokenSprite(v.lead, dir, !!v.walk, v.t);
  const x = Math.round(p.x) - 8, y = Math.round(p.y);
  const dh = Math.max(1, Math.round(16 * Math.abs(s)));
  ctx.imageSmoothingEnabled = false;
  // A flat shadow, or its upside-down twin.
  rect(ctx, x + 4, y - (s > 0 ? 7 : -6), 8, 1, 'ink');
  if (s > 0) {
    if (dh === 16) ctx.drawImage(sprite, x, y - 22);
    else ctx.drawImage(sprite, 0, 0, 16, 16, x, y - 6 - dh, 16, dh);
  } else {
    ctx.save();
    ctx.translate(x, y + 6);
    ctx.scale(1, -1);
    ctx.drawImage(sprite, 0, 0, 16, 16, 0, -dh, 16, dh);
    ctx.restore();
  }
}

function drawLamp(ctx: Ctx, t: number, calm: boolean): void {
  const on = calm || t % 90 < 50;
  rect(ctx, 78, 40, 4, 3, on ? 'hot' : 'blood1');
  if (on) { rect(ctx, 79, 41, 2, 1, 'pink'); }
}

export const V4: MapVariant = {
  id: 4,
  name: 'Two Hawkins',
  blurb: 'The town above a wavy horizon, the same town hanging below it in the Upside Down. The route drops through the pumpkin patch\'s hole and the map descends with the campaign.',
  draw(ctx, v) {
    const w = worldFor(v.nodes);
    const calm = v.calm;
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(w.base, 0, 0);
    ctx.drawImage(chromeLayer(), 0, 0);
    drawClouds(ctx, calm ? 0 : v.t);
    drawLamp(ctx, v.t, calm);
    if (!calm) drawVeinLights(ctx, w, v.t);
    drawHoleSwirl(ctx, v.t, v.nodes.find((n) => n.id === '2.1')?.state === 'locked', calm);
    if (!calm) drawGateSpark(ctx, v.t, v.nodes.find((n) => n.id === '2.3')?.state === 'locked');
    drawSpores(ctx, v.t, calm);
    ctx.drawImage(w.over, 0, 0);
    const sel = v.nodes.find((n) => n.id === v.selected);
    for (const n of v.nodes) {
      const p = POS[n.id];
      if (p) drawNode(ctx, n, p.x, p.y, v.t, calm);
    }
    if (sel) { const p = POS[sel.id]; if (p) brackets(ctx, p.x, p.y, v.t, calm); }
    drawToken(ctx, v);
    drawBars(ctx, v);
  },
};
