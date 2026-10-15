// The things in Vecna's attic that depend on where they are in the room (attic.ts), drawn as props the size of the room so the
// tile cache never sees them: vines hanging from the rafters into a knot (the Vine nest), roots running over the floor from the
// orbs to his feet, a storm sky where the roof is torn away, rain through the hole, puddles, and the rings of the clock's chime.
// Each takes the phase (0 to 3) and loops in four steps. The sky and the rain are painted in the colors they show, as actors.
import { hash2 } from '../canvas.ts';
import { BAYER4 } from '../canvas.ts';
import type { ColorName as N } from '../palette.ts';
import { Px } from '../px.ts';
import { GLOW } from './creel_b.ts';
import { ROOM_H, ROOM_W } from './look_kit.ts';
import { cord, pod } from './attic_props.ts';
import { trace, vein } from './tunnel_paint.ts';
import type { Pt } from './tunnel_paint.ts';

/** Vines from the rafters down to a knot at (cx, cy): eight long strands that sway and meet, loops round the knot, pods; shorter strands hang from the rafters either side. 256 by 100, from the top of the room. */
export function knot(phase: number, cx: number, cy: number): Px {
  const px = new Px(ROOM_W, 100), t = ((phase & 3) * Math.PI) / 2;
  [[12, 20], [30, 30], [46, 16], [210, 18], [226, 30], [242, 22]].forEach(([x0, len], i) => {
    const pts: Pt[] = [];
    for (let s = 0; s <= 12; s++) { const u = s / 12; pts.push([Math.round(x0 + Math.sin(u * 5 + i + t) * 2), Math.round(len * u)]); }
    cord(px, pts, 2);
    pod(px, (pts[12] as Pt)[0], len);
  });
  px.ellipse(cx, cy, 10, 7, 'blood0');
  [64, 84, 104, 120, 136, 152, 172, 192].forEach((x0, i) => {
    const pts: Pt[] = [], tx = cx + (i - 3.5) * 2.2;
    for (let s = 0; s <= 24; s++) {
      const u = s / 24, e = u * u * (3 - 2 * u);
      pts.push([Math.round(x0 + (tx - x0) * e + Math.sin(u * 7 + i * 1.7 + t) * 3 * Math.sin(u * Math.PI)), Math.round(cy * u)]);
    }
    cord(px, pts, i % 3 === 1 ? 3 : 2);
    if (i % 2 === 0) pod(px, (pts[15] as Pt)[0] + 3, (pts[15] as Pt)[1]);
  });
  ([[15, 9, 0.3], [12, 11, -0.5], [17, 7, 1.1], [10, 10, 2]] as [number, number, number][]).forEach(([rx, ry, rot], i) => {
    const pts: Pt[] = [];
    for (let a = 0; a <= 6.7; a += 0.35) {
      const w = 1 + 0.12 * Math.sin(a * 2 + t + i), ex = Math.cos(a) * rx * w, ey = Math.sin(a) * ry * w;
      pts.push([Math.round(cx + ex * Math.cos(rot) - ey * Math.sin(rot)), Math.round(cy + ex * Math.sin(rot) + ey * Math.cos(rot))]);
    }
    cord(px, pts, 2);
  });
  pod(px, cx - 13, cy + 4); pod(px, cx + 12, cy - 3); pod(px, cx + 2, cy + 9);
  return px;
}

/** Roots over the floor: a vein from each foot in `from` to `to`, with the pulse running toward `to`, and a few short ones branching off. Room sized. */
export function roots(phase: number, from: readonly Pt[], to: Pt): Px {
  const px = new Px(ROOM_W, ROOM_H);
  from.forEach(([x, y], i) => {
    const s = i % 2 ? -1 : 1;
    const pts: Pt[] = [[x, y], [Math.round(x + (to[0] - x) * 0.35), Math.round(y + (to[1] - y) * 0.1 + 5 * s)], [Math.round(x + (to[0] - x) * 0.7), Math.round(to[1] + 4 * s)], to];
    vein(px, pts, phase, GLOW);
    const [bx, by] = pts[1] as Pt;
    vein(px, [[bx, by], [bx + 4 * (to[0] > x ? 1 : -1), by + 9 * s], [bx + 3 * (to[0] > x ? 1 : -1), by + 15 * s]], phase, GLOW);
  });
  vein(px, [[to[0] - 24, to[1] + 6], [to[0] - 10, to[1] + 1], to], phase, GLOW);
  vein(px, [[to[0] + 24, to[1] + 7], [to[0] + 10, to[1] + 2], to], phase, GLOW);
  return px;
}

const RAMP: N[] = ['blood0', 'blood1', 'red', 'hot'];
const RAFTERS = [6, 22, 38, 54, 70, 86, 102, 118];
const EDGE = [127, 135, 130, 139, 129, 136]; // where the roof boards start again, by plank row from the top
/** The red storm sky where the roof is gone (140 by 24, from the top left of the room): dithered bands of dark red with cloud banks, black rafters (one snapped, one fallen), the ragged end of each board where the roof starts again, and on the first phase a flash with a bolt. */
export function sky(phase: number): Px {
  const W = 140, H = 24, px = new Px(W, H), p = phase & 3, flash = p === 0;
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const q = (y / (H - 1)) * 2.4 + (flash ? 1 : p === 1 ? 0.4 : 0), lo = Math.floor(q);
      const s = Math.min(3, lo + (q - lo > ((BAYER4[(y & 3) * 4 + (x & 3)] as number) + 0.5) / 16 ? 1 : 0));
      if (x < (EDGE[y >> 2] as number) - 1) px.set(x, y, RAMP[s] as N);
    }
  }
  for (const [x, y, w] of [[14, 4, 26], [56, 9, 30], [96, 3, 24], [30, 14, 20], [78, 17, 34]]) {
    const dx = (x + p * 2) % 110;
    px.rect(dx, y, w, 2, flash ? 'blood1' : 'blood0').rect(dx + 3, y + 2, w - 7, 1, flash ? 'blood1' : 'blood0');
  }
  for (const x of RAFTERS) {
    const from = x === 86 ? 8 : 0, to = x === 54 ? 13 : H;
    px.rect(x, from, 3, to - from, 'black');
    if (x === 54) px.set(54, 13, 'black').set(56, 14, 'black').set(55, 15, 'black');
    if (x === 86) px.set(87, 7, 'black').set(88, 6, 'black');
  }
  for (const [x, y] of trace([[100, 0], [108, 8], [116, 15], [124, 22]])) px.rect(x, y, 3, 2, 'black');
  EDGE.forEach((e, k) => { px.rect(e - 1, k * 4, 1, 4, 'ink'); px.rect(e - 3, k * 4 + 1, 2, 2, 'ink').set(e - 4, k * 4 + 1, 'ink'); });
  if (flash) for (const pts of [[[64, 0], [60, 6], [66, 11], [61, 17], [63, 23]], [[66, 11], [72, 14], [74, 20]]] as Pt[][]) for (const [x, y] of trace(pts)) px.set(x, y, 'cream');
  return px;
}

/** Rain through the hole (136 by 130, from y 22): streaks four pixels long leaning left, pale red in the storm's light, falling 28 px a step so four steps close the loop. */
export function rain(phase: number): Px {
  const px = new Px(138, 130), p = phase & 3, period = 112;
  for (let i = 0; i < 80; i++) {
    const x = 4 + (hash2(i, 5, 31) % 130), y = ((hash2(i, 9, 77) % period) + p * 28) % period;
    const col: N = i % 4 === 0 ? 'bone' : 'pink';
    px.line(x, y, x - 1, y + 3, col);
    if (y > period - 8) px.set(x - 2, y + 4, 'rose').set(x + 1, y + 4, 'rose');
  }
  return px;
}

/** Puddles of the sky on the boards (room sized): dark red with a red reflection, an ink rim and a ripple that spreads. */
export function puddles(phase: number): Px {
  const px = new Px(ROOM_W, ROOM_H), p = phase & 3;
  const list: [number, number, number, number][] = [[30, 80, 15, 5], [90, 124, 19, 6], [58, 144, 11, 4], [24, 120, 8, 3], [44, 52, 8, 3]];
  list.forEach(([cx, cy, rx, ry], i) => {
    px.ellipse(cx, cy, rx + 1, ry + 1, 'ink').ellipse(cx, cy, rx, ry, 'blood1').ellipse(cx - 1, cy - 1, rx * 0.55, ry * 0.45, 'red');
    px.rect(cx - rx + 3, cy - ry + 1, 3, 1, 'hot');
    const rr = 1 + ((p + i) & 3) * (rx / 5);
    for (let a = 0; a < 360; a += 12) px.set(Math.round(cx + Math.cos((a * Math.PI) / 180) * rr), Math.round(cy + Math.sin((a * Math.PI) / 180) * rr * (ry / rx)), 'pink');
  });
  return px;
}

/** The chime as sound waves spreading out of the clock's face to both sides (room sized, actor): two arcs a step apart, bright at first, fading as they spread. */
export function chime(phase: number, cx: number, cy: number): Px {
  const px = new Px(ROOM_W, ROOM_H), p = phase & 3, col: N[] = ['hot', 'red', 'blood1', 'blood0'];
  for (const [r, c] of [[10 + p * 5, col[p] as N], [p ? 5 + p * 5 : 0, col[Math.max(0, p - 1)] as N]] as [number, N][]) {
    if (!r) continue;
    for (let a = -52; a <= 52; a += 3) for (const s of [1, -1]) {
      const x = Math.round(cx + s * Math.cos((a * Math.PI) / 180) * r), y = Math.round(cy + Math.sin((a * Math.PI) / 180) * r);
      px.set(x, y, c);
      if (!p) px.set(x + s, y, c);
    }
  }
  return px;
}
