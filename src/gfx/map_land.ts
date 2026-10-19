// The map's still layers. Hawkins above the wavy horizon, its reflection below in the Upside Down palette, the route and the
// small sign plates. Built once per set of node states and cached by map.ts; nothing here moves.
import type { NodeState } from '../core/mapdata.ts';
import { Px } from './px.ts';
import type { Paint } from './px.ts';
import type { ColorName } from './palette.ts';
import { BAYER4, ctx2d, makeCanvas, px32, rect } from './canvas.ts';
import type { Ctx } from './canvas.ts';
import { drawTinyText } from './font.ts';
import { BAND_Y, HZ, LAND, LEGS, ORDER, POS, SCREEN_H, SCREEN_W, TOP_H, hzAt } from './map_geo.ts';
import { arcade, gate, grey, lab, pumpkin, remap, roots, school, toUD, toUDLand, tunnels, woods } from './map_art.ts';
import { bunker, foodCourt, mall } from './map_mall.ts';
import { abyssMark, lockdownMark } from './map_ch5.ts';
import { INSET, kamchatka } from './map_inset.ts';
import { groundBoxes, paintTownGround, townItems } from './map_town.ts';
import type { Box, Item } from './map_town.ts';

const W = SCREEN_W, H = SCREEN_H;
export const HOLE = { x: LAND.hole.x, y: HZ };
/** The center of the gate, for its crackle and its glow. */
export const GATE_AT = { x: LAND.gate.x, y: LAND.gate.top + 13 };
/** The lab's red lamp, which blinks. */
export const LAMP = { x: LAND.lab.x - 15 + 4, y: LAND.lab.base - 28 + 1 + 1 };

export interface World {
  base: HTMLCanvasElement;
  over: HTMLCanvasElement;
  /** The Kamchatka inset on its own, for map.ts to draw over the clouds, which drift across the sky it hangs in. */
  inset: HTMLCanvasElement;
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
  if (y < 18) return 'blue';
  if (y < 26) return mix(x, y, (y - 18) / 8, 'blue', 'sky') as ColorName;
  if (y < 32) return 'sky';
  if (y < 40) return mix(x, y, (y - 32) / 8, 'sky', 'cream') as ColorName;
  return 'cream';
}

function hill1(x: number): number { return 35 + Math.round(3 * Math.sin(x * 0.03 + 1) + 2 * Math.sin(x * 0.09)); }
function hill2(x: number): number { return 42 + Math.round(2 * Math.sin(x * 0.05 + 2) + 1 * Math.sin(x * 0.13)); }

function sun(P: Px, cx: number, cy: number): void {
  for (let y = cy - 14; y <= cy + 14; y++) for (let x = cx - 14; x <= cx + 14; x++) {
    const d = Math.hypot(x - cx, y - cy);
    if (d <= 6.5) P.set(x, y, (x - cx) + (y - cy) < -3 && d <= 4.5 ? 'cream' : d > 5 ? 'amber' : 'yellow');
    else if (d <= 10 && ((x + y) & 1) === 0) P.set(x, y, 'cream');
    else if (d <= 12.5 && (x & 1) === 0 && (y & 1) === 0) P.set(x, y, 'cream');
  }
}

/** The Upside Down's sun: a black disc with an ember rim, hung where Hawkins' sun would reflect. */
function darkSun(P: Px, cx: number, cy: number): void {
  for (let y = cy - 14; y <= cy + 14; y++) for (let x = cx - 14; x <= cx + 14; x++) {
    const d = Math.hypot(x - cx, y - cy);
    if (d <= 5.5) P.set(x, y, 'ink');
    else if (d <= 7) P.set(x, y, 'blood1');
    else if (d <= 10 && ((x + y) & 1) === 0) P.set(x, y, 'blood0');
    else if (d <= 12.5 && (x & 1) === 0 && (y & 1) === 0) P.set(x, y, 'blood0');
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
  paintTownGround(G);
  for (let i = 0; i < 160; i++) {
    const x = Math.floor(rnd() * W), y = 46 + Math.floor(rnd() * 46);
    if (y >= hzAt(x) - 6) continue;
    const under = G.get(x, y);
    if (under !== px32('pine3') && under !== px32('leaf')) continue;
    G.set(x, y, 'leaf'); G.set(x, y + 1, 'pine2');
  }
  for (let i = 0; i < 30; i++) {
    const x = Math.floor(rnd() * W), y = 48 + Math.floor(rnd() * 42);
    if (y >= hzAt(x) - 7 || G.get(x, y) !== px32('pine3')) continue;
    G.set(x, y, rnd() < 0.5 ? 'pink' : rnd() < 0.5 ? 'yellow' : 'white');
  }
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
  for (const x of [10, 46, 82, 134, 168, 236, 250]) crawl(x, hzAt(x) + 2, 24 + Math.floor(rnd() * 40), true, rnd() < 0.5 ? -1 : 1);
  return all;
}

function drawHole(P: Px, locked: boolean): void {
  const cx = HOLE.x, cy = HOLE.y;
  P.ellipse(cx, cy, 14, 6, 'soil1');
  P.ellipse(cx, cy - 1, 13, 5, 'soil2');
  P.ellipse(cx, cy, 11.5, 4.5, 'soil0');
  P.ellipse(cx, cy + 0.5, 10, 3.8, 'ink');
  if (!locked) {
    P.ellipse(cx, cy + 0.5, 8, 3, 'blood0');
    P.ellipse(cx, cy + 1, 5.5, 2.2, 'blood1');
    P.ellipse(cx, cy + 1, 2.8, 1.3, 'red');
  } else {
    P.ellipse(cx, cy + 0.5, 7, 2.6, 'night');
  }
  for (let i = 0; i < 10; i++) {
    const a = (i / 10) * Math.PI * 2;
    P.set(Math.round(cx + Math.cos(a) * 13), Math.round(cy + Math.sin(a) * 5.4), i % 3 === 0 ? 'soil3' : 'soil2');
  }
}

/** `night` is a plate in the colors of a night picture (Kamchatka's inset): a dark blue ground and a pale edge, grey while its stage is locked. */
export interface PlateSpec { cx: number; y: number; name: string; state: NodeState; ud: boolean; point: 'down' | 'up' | 'left' | 'right'; night?: boolean }

/** Where a sign plate sits, with a margin, so the town can keep clear of it. */
export function plateRect(s: Pick<PlateSpec, 'cx' | 'y' | 'name'>): Box {
  const w = s.name.length * 4 - 1 + 6, x = Math.round(s.cx - w / 2);
  return { x0: x - 3, y0: s.y - 3, x1: x + w + 3, y1: s.y + 9 + 3 };
}

/** A small sign plate with a pointer: the place in the 3 by 5 font. */
function drawPlate(ctx: Ctx, s: PlateSpec): void {
  const { cx, y, name, ud, point } = s, locked = s.state === 'locked';
  const bg: ColorName = ud ? (locked ? 'night' : 'blood0') : s.night ? (locked ? 'grey1' : 'night') : locked ? 'grey3' : 'bone';
  const fg: ColorName = ud ? (locked ? 'grey2' : 'pink') : s.night ? (locked ? 'grey3' : 'cream') : locked ? 'grey1' : 'ink';
  const edge: ColorName = ud ? (locked ? 'grey1' : 'red') : s.night ? (locked ? 'grey2' : 'mist') : 'ink';
  const w = name.length * 4 - 1 + 6, h = 9;
  const x = Math.round(cx - w / 2);
  rect(ctx, x, y, w, h, edge);
  rect(ctx, x + 1, y + 1, w - 2, h - 2, bg);
  drawTinyText(ctx, name, x + 3, y + 2, fg);
  const mx = Math.round(cx);
  if (point === 'down') { rect(ctx, mx - 2, y + h, 5, 1, edge); rect(ctx, mx - 1, y + h + 1, 3, 1, edge); rect(ctx, mx, y + h + 2, 1, 1, edge); rect(ctx, mx - 1, y + h - 1, 3, 1, bg); }
  else if (point === 'up') { rect(ctx, mx - 2, y - 1, 5, 1, edge); rect(ctx, mx - 1, y - 2, 3, 1, edge); rect(ctx, mx, y - 3, 1, 1, edge); rect(ctx, mx - 1, y, 3, 1, bg); }
  else if (point === 'left') { rect(ctx, x - 1, y + 2, 1, 5, edge); rect(ctx, x - 2, y + 3, 1, 3, edge); rect(ctx, x - 3, y + 4, 1, 1, edge); rect(ctx, x, y + 3, 1, 3, bg); }
  else { rect(ctx, x + w, y + 2, 1, 5, edge); rect(ctx, x + w + 1, y + 3, 1, 3, edge); rect(ctx, x + w + 2, y + 4, 1, 1, edge); rect(ctx, x + w - 1, y + 3, 1, 3, bg); }
}

/** The legs that are a flight and not a walk, by the node they go to: the hops to Kamchatka, half a world away, and back to the Creel House. */
const FLIGHT = new Set(['4.1', '4.2']);

/** The route, drawn as stitches: solid and gold where it is walked, dashed white to the next stage, short grey dashes beyond. A flight is long dashes in every state, so a hop that crosses the world is never mistaken for a walk. */
function paintRoute(P: Px, st: Record<string, NodeState>): void {
  LEGS.forEach((leg, i) => {
    const to = st[ORDER[i + 1] as string];
    const flight = FLIGHT.has(ORDER[i + 1] as string);
    const on = (along: number): boolean => flight ? along % 10 < (to === 'locked' ? 3 : 6) : to === 'cleared' || (to === 'open' ? Math.floor(along / 4) % 2 === 0 : Math.floor(along / 5) % 3 === 0);
    for (const pass of [0, 1]) {
      const seen = new Set<number>();
      leg.pts.forEach(([fx, fy], k) => {
        const x = Math.round(fx), y = Math.round(fy), key = y * 512 + x;
        if (seen.has(key) || !on(leg.at[k] as number)) return;
        seen.add(key);
        if (pass === 0) { P.rect(x - 1, y - 1, 4, 4, 'ink'); return; }
        P.rect(x, y, 2, 2, to === 'cleared' ? 'yellow' : to === 'open' ? 'white' : 'grey2');
        if (to === 'cleared') P.set(x + 1, y + 1, 'orange');
      });
    }
  });
}

/** The whole still picture as one pixel buffer, the labels' places, and the veins. Pure pixel work, so Node can test it. */
export function paintLand(st: Record<string, NodeState>): { px: Px; plates: PlateSpec[]; veins: [number, number][][]; inset: Px } {
  const locked = (id: string): boolean => st[id] === 'locked';
  const P = new Px(W, H).fill('ink');
  const G = new Px(W, H), O = new Px(W, H);

  // Hawkins: sky, sun and the ground.
  for (let x = 0; x < W; x++) for (let y = 0; y < hzAt(x); y++) P.set(x, y, skyAt(x, y));
  sun(P, 232, 25);
  paintGround(G);

  // The stage landmarks, then the plates over them, so the town knows what to keep clear.
  const solid: Box[] = [], green: Box[] = [];
  const stage: Item[] = [];
  const stand = (px: Px, cx: number, base: number, isLocked: boolean): Box => {
    if (isLocked) remap(px, grey);
    const x = cx - (px.w >> 1), y = base - px.h + 1;
    stage.push({ px, x, y });
    const b = { x0: x - 1, y0: y - 1, x1: x + px.w + 1, y1: y + px.h + 1 };
    solid.push(b); green.push(b);
    return b;
  };
  const wd = stand(woods(), LAND.woods.x, LAND.woods.base, locked('1.1'));
  const lb = stand(lab(), LAND.lab.x, LAND.lab.base, locked('1.2'));
  const sc = stand(school(), LAND.school.x, LAND.school.base, locked('1.3'));
  const lp = locked('2.1');
  for (const [cx, base, rx, ry] of [[191, 92, 3, 2], [197, 96, 2, 2], [226, 91, 4, 3], [234, 95, 3, 2]] as const) stand(remap(pumpkin(rx, ry), lp ? grey : (c) => c), cx, base, false);
  stand(arcade(), 245, 90, lp);
  stand(mall(), LAND.mall.x, LAND.mall.base, locked('3.1'));
  const fc = stand(foodCourt(), LAND.food.x, LAND.food.base, locked('3.3'));
  const plates: PlateSpec[] = [
    { cx: LAND.woods.x, y: wd.y0 - 12, name: 'MIRKWOOD', state: st['1.1'] as NodeState, ud: false, point: 'down' },
    { cx: LAND.lab.x, y: lb.y0 - 12, name: 'LAB', state: st['1.2'] as NodeState, ud: false, point: 'down' },
    { cx: LAND.school.x, y: sc.y0 - 12, name: 'SCHOOL', state: st['1.3'] as NodeState, ud: false, point: 'down' },
    { cx: LAND.hole.x, y: 57, name: 'PATCH', state: st['2.1'] as NodeState, ud: false, point: 'down' },
    // The mall's and the food court's plates are one stacked sign over the dome: STARCOURT on top, sharing its border with FOOD COURT, whose
    // pointer is the one that reaches the dome. FOOD COURT comes after, so its plate draws over the pointer of the plate above.
    { cx: LAND.mall.x + 6, y: fc.y0 - 19, name: 'STARCOURT', state: st['3.1'] as NodeState, ud: false, point: 'down' },
    { cx: LAND.mall.x + 6, y: fc.y0 - 11, name: 'FOOD COURT', state: st['3.3'] as NodeState, ud: false, point: 'down' },
    { cx: LAND.bunker.x - 26, y: LAND.bunker.y - 12, name: 'BASE', state: st['3.2'] as NodeState, ud: false, point: 'right' },
    // Kamchatka's plate hangs under its inset, pointing up into it.
    { cx: INSET.x + 22, y: INSET.y + INSET.h, name: 'KAMCHATKA', state: st['4.1'] as NodeState, ud: false, point: 'up', night: true },
  ];
  for (const s of plates) solid.push(plateRect(s));
  const framedInset = { x0: INSET.x - 2, y0: INSET.y - 2, x1: INSET.x + INSET.w + 2, y1: INSET.y + INSET.h + 2 };
  solid.push(framedInset); green.push(framedInset);
  for (const id of ORDER) { const p = POS[id] as { x: number; y: number }; const b = { x0: p.x - 9, y0: p.y - 24, x1: p.x + 9, y1: p.y + 9 }; solid.push(b); green.push(b); }
  for (const leg of LEGS) leg.pts.forEach(([x, y], i) => { if (i % 3 === 0) { const b = { x0: x - 5, y0: y - 5, x1: x + 5, y1: y + 5 }; solid.push(b); green.push(b); } });
  for (const b of groundBoxes()) { solid.push(b); green.push(b); }
  const rnd = rng(2024);
  const items = [...townItems(solid, green, rnd), ...stage].sort((a, b) => a.y + a.px.h - (b.y + b.px.h));
  for (const it of items) O.blit(it.px, it.x, it.y);
  // A dithered shadow under each stage landmark's feet.
  for (const it of stage) for (let i = 1; i < it.px.w - 1; i += 2) { const sx = it.x + i, sy = it.y + it.px.h; if (G.get(sx, sy) && !O.get(sx, sy)) G.set(sx, sy, 'pine1'); }
  P.blit(G, 0, 0);
  P.blit(O, 0, 0);

  // The Upside Down: a sick sky, a few drifts of haze, the dark sun, then the reflection of everything above, fading with depth.
  for (let x = 0; x < W; x++) for (let y = hzAt(x); y < BAND_Y; y++) {
    const d = y - hzAt(x);
    P.set(x, y, d < 40 ? 'night' : d < 70 ? mix(x, y, (d - 40) / 30, 'night', 'ink') : (x * 5 + y * 3) % 23 === 0 ? 'night' : 'ink');
  }
  for (const [hx, hy, rx, ry] of [[60, 160, 58, 16], [200, 176, 46, 10], [24, 130, 30, 8], [140, 140, 30, 8]] as const) {
    for (let y = hy - ry; y <= hy + ry; y++) for (let x = hx - rx; x <= hx + rx; x++) {
      const d = ((x - hx) / rx) ** 2 + ((y - hy) / ry) ** 2;
      if (d > 1 || y < hzAt(x) + 14 || y >= BAND_Y - 4) continue;
      const cur = P.get(x, y);
      if (cur !== px32('night') && cur !== px32('ink')) continue;
      if (d < 0.4 ? ((x + y) & 1) === 0 : d < 0.8 && (x & 1) === 0 && (y & 1) === 0) P.set(x, y, 'purple0');
    }
  }
  darkSun(P, 232, 2 * HZ - 25);
  const reflect = (src: Px, from: number, span: number, map: (c: ColorName) => ColorName): void => {
    const R = new Px(W, H);
    for (let x = 0; x < W; x++) {
      const h = hzAt(x);
      for (let d = 0; ; d++) {
        const sy = h - 1 - d, dy = h + d;
        if (sy < TOP_H || dy >= BAND_Y) break;
        const v = src.d[sy * W + x] as number;
        if (!v) continue;
        if (d > from && bayer(x, dy) < (d - from) / span) continue;
        R.d[dy * W + x] = v;
      }
    }
    P.blit(remap(R, map), 0, 0);
  };
  reflect(G, 28, 18, toUDLand);
  reflect(O, 36, 26, toUD);
  const veins = paintVeins(P, rng(77));

  // The hole in the patch, and what is down there. The bunker of the base stands on the cut of the earth: underground, but not upside down.
  drawHole(P, lp);
  const bk = bunker();
  if (locked('3.2')) remap(bk, grey);
  P.blit(bk, LAND.bunker.x - (bk.w >> 1), hzAt(LAND.bunker.x) - bk.h + 1);
  const tn = tunnels();
  const tx = LAND.tunnels.x - (tn.w >> 1);
  P.blit(tn, tx, LAND.tunnels.top);
  if (!locked('2.2')) roots(P, LAND.tunnels.x, LAND.tunnels.top, rng(5));
  const gx = GATE_AT.x, gy = GATE_AT.y;
  if (!locked('2.3')) {
    for (let y = gy - 32; y <= gy + 32; y++) for (let x = gx - 34; x <= gx + 34; x++) {
      const d = Math.hypot(x - gx, (y - gy) * 0.8);
      const cur = P.get(x, y);
      if (cur !== px32('ink') && cur !== px32('night') && cur !== px32('purple0')) continue;
      if (d < 22 && ((x + y) & 1) === 0 && d > 15) P.set(x, y, 'blood0');
      else if (d < 30 && d >= 22 && (x & 1) === 0 && (y & 1) === 0) P.set(x, y, 'blood0');
      else if (d <= 15 && d > 10 && (x & 1) === 0 && (y & 1) === 0) P.set(x, y, 'blood1');
    }
  }
  const CH5_MARKS = [['5.1', 'LOCKDOWN', lockdownMark(), LAND.lockdown], ['5.2', 'ABYSS', abyssMark(), LAND.abyss]] as const;
  const gt = gate(!locked('2.3'));
  P.blit(gt, gx - (gt.w >> 1), LAND.gate.top);

  // Chapter 5: the lockdown's floodlight over its sandbags and the Abyss's floating island, in the Upside Down half.
  for (const [id, , mark, at] of CH5_MARKS) {
    if (locked(id)) remap(mark, grey);
    P.blit(mark, at.x - (mark.w >> 1), at.top);
  }

  paintRoute(P, st);

  // Kamchatka's inset goes over the route, which runs in to its edge; map.ts draws it again over the clouds.
  const inset = kamchatka();
  if (locked('4.1')) remap(inset, grey);
  P.blit(inset, INSET.x, INSET.y);

  plates.push({ cx: LAND.tunnels.x, y: LAND.tunnels.top + tn.h + 3, name: 'TUNNELS', state: st['2.2'] as NodeState, ud: true, point: 'up' });
  plates.push({ cx: 86, y: GATE_AT.y - 4, name: 'GATE', state: st['2.3'] as NodeState, ud: true, point: 'right' });
  // Chapter 5's plates hang under their landmarks, pointing up, like the tunnels'.
  for (const [id, name, mark, at] of CH5_MARKS) plates.push({ cx: at.x, y: at.top + (mark.h as number) + 3, name, state: st[id] as NodeState, ud: true, point: 'up' });
  // The heart has no landmark yet (Art draws it): its plate hangs just under its node, in line with the other two.
  const heart = POS['5.3'] as { x: number; y: number };
  plates.push({ cx: heart.x, y: 181, name: 'HEART', state: st['5.3'] as NodeState, ud: true, point: 'up' });
  return { px: P, plates, veins, inset };
}

/** The still layers as canvases: the picture, and the labels that go over the spores and drifting things. */
export function buildWorld(st: Record<string, NodeState>): World {
  const { px, plates, veins, inset } = paintLand(st);
  const over = makeCanvas(W, H);
  const o = ctx2d(over);
  for (const s of plates) drawPlate(o, s);
  return { base: px.toCanvas(), over, inset: inset.toCanvas(), veins };
}
