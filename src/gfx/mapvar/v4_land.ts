// Design 4, "Two Hawkins": the still layers. Hawkins above the wavy horizon, its reflection below in the Upside Down palette,
// the route, and the sign plates. Built once per set of node states and cached by v4.ts; nothing here moves.
import type { NodeState } from '../../core/mapdata.ts';
import { Px } from '../px.ts';
import type { Paint } from '../px.ts';
import type { ColorName } from '../palette.ts';
import { BAYER4, ctx2d, makeCanvas, px32, rect } from '../canvas.ts';
import type { Ctx } from '../canvas.ts';
import { drawTinyText } from '../font.ts';
import { HZ, LEGS, hzAt, ORDER } from './v4_geo.ts';
import { arcade, gate, grey, lab, pumpkin, remap, roots, school, toUD, toUDLand, tunnels, woods } from './v4_art.ts';

const W = 256, H = 224;
export const BAND_Y = 176;
export const HOLE = { x: 204, y: HZ };
export const GATE_AT = { x: 136, y: 150 };

export interface World {
  base: HTMLCanvasElement;
  over: HTMLCanvasElement;
  /** The red veins of the Upside Down, for the lights that run along them. */
  veins: [number, number][][];
}

function rng(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const bayer = (x: number, y: number): number => (BAYER4[(y & 3) * 4 + (x & 3)] as number) / 16;
const mix = (x: number, y: number, k: number, a: Paint, b: Paint): Paint => (bayer(x, y) < k ? b : a);

function skyAt(x: number, y: number): ColorName {
  if (y < 30) return 'blue';
  if (y < 40) return mix(x, y, (y - 30) / 10, 'blue', 'sky') as ColorName;
  if (y < 52) return 'sky';
  if (y < 62) return mix(x, y, (y - 52) / 10, 'sky', 'cream') as ColorName;
  return 'cream';
}

function hill1(x: number): number { return 69 + Math.round(3 * Math.sin(x * 0.03 + 1) + 2 * Math.sin(x * 0.09)); }
function hill2(x: number): number { return 77 + Math.round(2 * Math.sin(x * 0.05 + 2) + 1 * Math.sin(x * 0.13)); }

function sun(P: Px, cx: number, cy: number): void {
  for (let y = cy - 14; y <= cy + 14; y++) for (let x = cx - 14; x <= cx + 14; x++) {
    const d = Math.hypot(x - cx, y - cy);
    if (d <= 7.5) P.set(x, y, (x - cx) + (y - cy) < -3 && d <= 5.5 ? 'cream' : d > 6 ? 'amber' : 'yellow');
    else if (d <= 11 && ((x + y) & 1) === 0) P.set(x, y, 'cream');
    else if (d <= 13.5 && (x & 1) === 0 && (y & 1) === 0) P.set(x, y, 'cream');
  }
}

/** The Upside Down's sun: a black disc with an ember rim, hung where Hawkins' sun would reflect. */
function darkSun(P: Px, cx: number, cy: number): void {
  for (let y = cy - 14; y <= cy + 14; y++) for (let x = cx - 14; x <= cx + 14; x++) {
    const d = Math.hypot(x - cx, y - cy);
    if (d <= 6.5) P.set(x, y, 'ink');
    else if (d <= 8) P.set(x, y, 'blood1');
    else if (d <= 11 && ((x + y) & 1) === 0) P.set(x, y, 'blood0');
    else if (d <= 13.5 && (x & 1) === 0 && (y & 1) === 0) P.set(x, y, 'blood0');
  }
}

function paintGround(G: Px): void {
  const rnd = rng(11);
  for (let x = 0; x < W; x++) {
    const h1 = hill1(x), h2 = hill2(x), hz = hzAt(x);
    for (let y = h1; y < hz; y++) {
      let c: ColorName;
      if (y < h2) c = y === h1 ? 'pine2' : y - h1 < 3 ? mix(x, y, 0.35, 'pine1', 'pine2') as ColorName : 'pine1';
      else if (y === h2) c = 'leaf';
      else if (y < hz - 6) c = y - h2 < 3 ? mix(x, y, 0.4, 'pine3', 'leaf') as ColorName : 'pine3';
      else c = mix(x, y, (y - (hz - 6)) / 6, 'pine3', 'pine2') as ColorName;
      G.set(x, y, c);
    }
    // The cut edge of the earth: a lip of grass, then soil down to the horizon.
    G.set(x, hz - 5, 'pine2');
    G.set(x, hz - 4, 'soil3'); G.set(x, hz - 3, 'soil2'); G.set(x, hz - 2, 'soil1'); G.set(x, hz - 1, 'soil0');
    if (rnd() < 0.2) G.set(x, hz - 3, 'soil3');
    if (rnd() < 0.16) G.set(x, hz - 2, 'soil2');
  }
  // Tufts and a few flowers.
  for (let i = 0; i < 150; i++) {
    const x = Math.floor(rnd() * W), y = 81 + Math.floor(rnd() * 12);
    if (y >= hzAt(x) - 6) continue;
    G.set(x, y, 'leaf'); G.set(x, y + 1, 'pine2');
    if (rnd() < 0.5) G.set(x + 1, y, 'leaf');
  }
  for (let i = 0; i < 26; i++) {
    const x = Math.floor(rnd() * W), y = 82 + Math.floor(rnd() * 10);
    if (y >= hzAt(x) - 7) continue;
    G.set(x, y, rnd() < 0.5 ? 'pink' : rnd() < 0.5 ? 'yellow' : 'white');
  }
}

function put(G: Px, sprite: Px, cx: number, base: number, locked: boolean): { x: number; y: number; w: number; h: number } {
  if (locked) remap(sprite, grey);
  const x = cx - (sprite.w >> 1), y = base - sprite.h + 1;
  // A flat shadow of dithered dark grass under the feet.
  for (let i = 0; i < sprite.w; i++) if ((i & 1) === 0) G.set(x + i, base + 1, locked ? 'grey1' : 'pine1');
  G.blit(sprite, x, y);
  return { x, y, w: sprite.w, h: sprite.h };
}

function paintVeins(P: Px, rnd: () => number): [number, number][][] {
  const all: [number, number][][] = [];
  const crawl = (x0: number, y0: number, len: number, fat: boolean, sx: number): void => {
    const pts: [number, number][] = [];
    let x = x0, y = y0, drift = sx;
    for (let k = 0; k < len; k++) {
      pts.push([x, y]);
      P.set(x, y, k % 7 === 6 ? 'red' : 'blood1');
      if (fat && k < 10) P.set(x + 1, y, 'blood1');
      if (rnd() < 0.18) drift = rnd() < 0.5 ? -1 : 1;
      if (rnd() < 0.3) x += drift;
      if (rnd() < 0.82) y++;
      if (y >= BAND_Y - 3) break;
    }
    all.push(pts);
    if (len > 24) for (let b = 0; b < 2; b++) {
      const at = pts[Math.floor(len * (0.3 + 0.3 * b + rnd() * 0.15))];
      if (at) crawl(at[0], at[1], 9 + Math.floor(rnd() * 12), false, rnd() < 0.5 ? -1 : 1);
    }
  };
  for (const x of [10, 47, 83, 119, 171, 233, 249]) crawl(x, hzAt(x) + 2, 22 + Math.floor(rnd() * 34), true, rnd() < 0.5 ? -1 : 1);
  return all;
}

function drawHole(P: Px, locked: boolean): void {
  const cx = HOLE.x, cy = HOLE.y;
  P.ellipse(cx, cy, 17, 7, 'soil1');
  P.ellipse(cx, cy - 1, 16, 6, 'soil2');
  P.ellipse(cx, cy, 14.5, 5.5, 'soil0');
  P.ellipse(cx, cy + 0.5, 12.5, 4.5, 'ink');
  if (!locked) {
    P.ellipse(cx, cy + 0.5, 10, 3.5, 'blood0');
    P.ellipse(cx, cy + 1, 7, 2.5, 'blood1');
    P.ellipse(cx, cy + 1, 3.5, 1.5, 'red');
  } else {
    P.ellipse(cx, cy + 0.5, 9, 3, 'night');
  }
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2;
    const x = Math.round(cx + Math.cos(a) * 16), y = Math.round(cy + Math.sin(a) * 6.3);
    P.set(x, y, i % 3 === 0 ? 'soil3' : 'soil2');
  }
}

/** A sign plate with a pointer: tiny stage number, then the place. */
function plate(ctx: Ctx, cx: number, y: number, id: string, name: string, state: NodeState, ud: boolean, point: 'down' | 'up' | 'left' | 'right'): void {
  const locked = state === 'locked';
  const bg: ColorName = ud ? (locked ? 'night' : 'blood0') : locked ? 'grey3' : 'bone';
  const fg: ColorName = ud ? (locked ? 'grey2' : 'pink') : locked ? 'grey1' : 'ink';
  const edge: ColorName = ud ? (locked ? 'grey1' : 'red') : 'ink';
  const w = 9 + 3 + name.length * 4 - 1 + 6, h = 9;
  const x = Math.round(cx - w / 2);
  rect(ctx, x, y, w, h, edge);
  rect(ctx, x + 1, y + 1, w - 2, h - 2, bg);
  const num = (id.charAt(0) as string);
  drawTinyText(ctx, num, x + 3, y + 2, fg);
  rect(ctx, x + 7, y + 6, 1, 1, fg);
  drawTinyText(ctx, id.charAt(2), x + 9, y + 2, fg);
  drawTinyText(ctx, name, x + 3 + 9 + 3, y + 2, fg);
  const mx = Math.round(cx);
  if (point === 'down') { rect(ctx, mx - 2, y + h, 5, 1, edge); rect(ctx, mx - 1, y + h + 1, 3, 1, edge); rect(ctx, mx, y + h + 2, 1, 1, edge); rect(ctx, mx - 1, y + h - 1, 3, 1, bg); }
  else if (point === 'up') { rect(ctx, mx - 2, y - 1, 5, 1, edge); rect(ctx, mx - 1, y - 2, 3, 1, edge); rect(ctx, mx, y - 3, 1, 1, edge); rect(ctx, mx - 1, y, 3, 1, bg); }
  else if (point === 'left') { rect(ctx, x - 1, y + 2, 1, 5, edge); rect(ctx, x - 2, y + 3, 1, 3, edge); rect(ctx, x - 3, y + 4, 1, 1, edge); rect(ctx, x, y + 3, 1, 3, bg); }
  else { rect(ctx, x + w, y + 2, 1, 5, edge); rect(ctx, x + w + 1, y + 3, 1, 3, edge); rect(ctx, x + w + 2, y + 4, 1, 1, edge); rect(ctx, x + w - 1, y + 3, 1, 3, bg); }
}

/** The route, drawn as stitches: solid and gold where it is walked, dashed white to the next stage, short grey dashes beyond. */
function paintRoute(P: Px, st: Record<string, NodeState>): void {
  LEGS.forEach((leg, i) => {
    const to = st[ORDER[i + 1] as string];
    const seen = new Set<number>();
    leg.pts.forEach(([fx, fy], k) => {
      const x = Math.round(fx), y = Math.round(fy), key = y * 512 + x;
      if (seen.has(key)) return;
      seen.add(key);
      const along = leg.at[k] as number;
      const on = to === 'cleared' || (to === 'open' ? Math.floor(along / 4) % 2 === 0 : Math.floor(along / 5) % 3 === 0);
      if (!on) return;
      P.rect(x - 1, y - 1, 4, 4, 'ink');
    });
    seen.clear();
    leg.pts.forEach(([fx, fy], k) => {
      const x = Math.round(fx), y = Math.round(fy), key = y * 512 + x;
      if (seen.has(key)) return;
      seen.add(key);
      const along = leg.at[k] as number;
      const on = to === 'cleared' || (to === 'open' ? Math.floor(along / 4) % 2 === 0 : Math.floor(along / 5) % 3 === 0);
      if (!on) return;
      P.rect(x, y, 2, 2, to === 'cleared' ? 'yellow' : to === 'open' ? 'white' : 'grey2');
      if (to === 'cleared') P.set(x + 1, y + 1, 'orange');
    });
  });
}

export function buildWorld(st: Record<string, NodeState>): World {
  const locked = (id: string): boolean => st[id] === 'locked';
  const P = new Px(W, H).fill('ink');
  const G = new Px(W, H), O = new Px(W, H);

  // Hawkins: sky, sun, then the ground and what stands on it.
  for (let x = 0; x < W; x++) for (let y = 16; y < hzAt(x); y++) P.set(x, y, skyAt(x, y));
  sun(P, 228, 40);
  paintGround(G);
  const wd = put(O, woods(), 34, 84, locked('1.1'));
  const lb = put(O, lab(), 96, 84, locked('1.2'));
  const sc = put(O, school(), 154, 84, locked('1.3'));
  const lp = locked('2.1');
  for (const [cx, base, rx, ry] of [[188, 87, 4, 3], [222, 86, 6, 5], [233, 90, 4, 3], [213, 91, 3, 2]] as const) put(O, remap(pumpkin(rx, ry), lp ? grey : (c) => c), cx, base, false);
  put(O, arcade(), 247, 85, lp);
  P.blit(G, 0, 0);
  P.blit(O, 0, 0);

  // The Upside Down: a sick sky, the dark sun, then the reflection of everything above, fading with depth.
  for (let x = 0; x < W; x++) for (let y = hzAt(x); y < BAND_Y; y++) {
    const d = y - hzAt(x);
    P.set(x, y, d < 40 ? 'night' : d < 70 ? mix(x, y, (d - 40) / 30, 'night', 'ink') : (x * 5 + y * 3) % 23 === 0 ? 'night' : 'ink');
  }
  // A few drifts of violet haze, dithered thin, behind everything down here.
  for (const [hx, hy, rx, ry] of [[52, 150, 58, 18], [176, 162, 50, 12], [20, 124, 30, 9], [120, 118, 36, 8]] as const) {
    for (let y = hy - ry; y <= hy + ry; y++) for (let x = hx - rx; x <= hx + rx; x++) {
      const d = ((x - hx) / rx) ** 2 + ((y - hy) / ry) ** 2;
      if (d > 1 || y < hzAt(x) + 14 || y >= BAND_Y - 4) continue;
      const cur = P.get(x, y);
      if (cur !== px32('night') && cur !== px32('ink')) continue;
      if (d < 0.4 ? ((x + y) & 1) === 0 : d < 0.8 && (x & 1) === 0 && (y & 1) === 0) P.set(x, y, 'purple0');
    }
  }
  darkSun(P, 228, 2 * HZ - 40);
  const reflect = (src: Px, from: number, span: number, map: (c: ColorName) => ColorName): void => {
    const R = new Px(W, H);
    for (let x = 0; x < W; x++) {
      const h = hzAt(x);
      for (let d = 0; ; d++) {
        const sy = h - 1 - d, dy = h + d;
        if (sy < 16 || dy >= BAND_Y) break;
        const v = src.d[sy * W + x] as number;
        if (!v) continue;
        if (d > from && bayer(x, dy) < (d - from) / span) continue;
        R.d[dy * W + x] = v;
      }
    }
    P.blit(remap(R, map), 0, 0);
  };
  reflect(G, 24, 16, toUDLand);
  reflect(O, 34, 26, toUD);

  const rnd = rng(2024);
  const veins = paintVeins(P, rnd);

  // The hole in the patch, and what is down there.
  drawHole(P, lp);
  const tn = tunnels();
  P.blit(tn, 198 - 23, 130 - 17);
  if (!locked('2.2')) roots(P, 198, 130 - 17, rnd);

  const gx = GATE_AT.x, gy = GATE_AT.y;
  if (!locked('2.3')) {
    for (let y = gy - 40; y <= gy + 40; y++) for (let x = gx - 40; x <= gx + 40; x++) {
      const d = Math.hypot(x - gx, (y - gy) * 0.8);
      const cur = P.get(x, y);
      if (cur !== px32('ink') && cur !== px32('night') && cur !== px32('purple0')) continue;
      if (d < 26 && ((x + y) & 1) === 0 && d > 19) P.set(x, y, 'blood0');
      else if (d < 34 && d >= 26 && (x & 1) === 0 && (y & 1) === 0) P.set(x, y, 'blood0');
      else if (d <= 19 && d > 12 && (x & 1) === 0 && (y & 1) === 0) P.set(x, y, 'blood1');
    }
  }
  const gt = gate(!locked('2.3'));
  P.blit(gt, gx - 20, gy - 25);

  paintRoute(P, st);

  // The horizon between the worlds is the top bar's edge and the party band's top; both are painted by v4.ts each frame.
  const over = makeCanvas(W, H);
  const o = ctx2d(over);
  plate(o, 34, wd.y - 13, '1.1', 'MIRKWOOD', st['1.1'] as NodeState, false, 'down');
  plate(o, 96, lb.y - 13, '1.2', 'LAB', st['1.2'] as NodeState, false, 'down');
  plate(o, 154, sc.y - 13, '1.3', 'SCHOOL', st['1.3'] as NodeState, false, 'down');
  plate(o, 204, 62, '2.1', 'PATCH', st['2.1'] as NodeState, false, 'down');
  plate(o, 198, 152, '2.2', 'TUNNELS', st['2.2'] as NodeState, true, 'up');
  plate(o, 90, GATE_AT.y - 5, '2.3', 'GATE', st['2.3'] as NodeState, true, 'right');
  return { base: P.toCanvas(), over, veins };
}
