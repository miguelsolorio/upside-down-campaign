// The effects of level 13 (docs/level-13.md), drawn like the rest of fx.ts: pixel-snapped rects from t and life alone, no alpha, fades are dithers.
// debris: a rock Vecna throws, lobbed from high above its mark: (x, y) is where it lands, h how high it is over that spot (when the sim sends
// none it falls on its own curve), w the diameter of its splash. The rock's own shadow on the floor, a spot of black dither that widens and goes
// solid as it comes down (the sim adds the wider `mark` ring that warns of where), and the last 12 frames of the life are the splash: a crack of
// white at the foot of it, a ring of dust that widens to w, and the rock's pieces thrown out and dropped. whip: one of his vine lashes, from (x, y)
// at his feet along `angle`, w long: the vine shoots out, a wave runs down it as it cracks, a spark of white at the tip, and it thins to a dither
// and is gone; whipWarn is the line it will lash along, on the floor while he winds up (ActorView.aim its tip). blaze: the fire over him in Burn,
// from (x, y) at his feet, w across and h tall (his whole body): tongues of fire on the shoulders, the head, the back and the elbows that rise and
// sway in a loop of ten frames, whatever the life, so a new one every 30 stands where the last one left off. Pure pixel work: nothing here uses alpha.
import type { FxView } from '../core/types.ts';
import type { ColorName } from './palette.ts';
import { rect, unit } from './canvas.ts';
import type { Ctx } from './canvas.ts';

const clamp = (v: number, lo = 0, hi = 1): number => Math.max(lo, Math.min(hi, v));
const easeOut = (p: number): number => 1 - (1 - p) * (1 - p);
/** True when this pixel survives a fade: keep fraction k of a checker pattern. */
const keep = (x: number, y: number, k: number): boolean => k >= 1 || (k > 0.5 ? ((x + y) & 3) !== 0 : k > 0.25 ? ((x + y) & 1) === 0 : ((x & 1) === 0 && (y & 1) === 0 && k > 0));

// ---------------------------------------------------------------- debris
/** Frames the splash lasts at the end of a rock's life. */
export const SPLASH_FRAMES = 12;

/** The rock, 7 px across around (0, 0), in one of three turns: a grey chunk with a lit corner, a dark underside and a strand of vine round it. */
const ROCK: string[][] = [
  ['..kkk..', '.kwwgk.', 'kwgggdk', 'kggggvk', 'kgdddvk', '.kkddk.', '..kkk..'],
  ['...kk..', '.kkwgk.', 'kwggggk', 'kgggvdk', 'kgdvddk', '.kdddk.', '..kkk..'],
  ['..kkk..', '.kgwwk.', 'kggwggk', 'kvgggdk', 'kvdgddk', '.kkddk.', '...kk..'],
];
const ROCK_PAL: Record<string, ColorName> = { k: 'ink', w: 'bone', g: 'grey3', d: 'grey1', v: 'blood1' };

function rock(ctx: Ctx, cx: number, cy: number, turn: number): void {
  (ROCK[turn % 3] as string[]).forEach((row, j) => {
    for (let i = 0; i < row.length; i++) { const col = ROCK_PAL[row[i] as string]; if (col) rect(ctx, cx - 3 + i, cy - 3 + j, 1, 1, col); }
  });
}

/** The rock's shadow: a spot of black dither on the floor under it that widens toward half the splash and fills in as the landing nears (q 0 to 1). */
function shadowMark(ctx: Ctx, x: number, y: number, R: number, q: number): void {
  const r = Math.max(3, Math.round(R * (0.25 + 0.3 * easeOut(q)))), ry = Math.max(2, Math.round(r * 0.5));
  for (let j = -ry; j <= ry; j++) {
    for (let i = -r; i <= r; i++) {
      const d = (i * i) / (r * r) + (j * j) / (ry * ry);
      if (d > 1) continue;
      const rim = d > 0.55, solid = q > 0.7 && d < 0.55;
      if (rim || solid ? ((x + i + y + j) & 1) === 0 : ((x + i) & 1) === 0 && ((y + j) & 1) === 0) rect(ctx, x + i, y + j, 1, 1, 'black');
    }
  }
}

/** The rock in the air: over its mark, turning, with two bits of dust shaken off behind it. */
function flight(ctx: Ctx, f: FxView, q: number): void {
  const x = Math.round(f.x), y = Math.round(f.y), R = Math.max(6, (f.w > 0 ? f.w : 20) / 2);
  const h = f.h > 0 ? f.h : Math.round(52 * (1 - q) * (1 - q)) + 2;
  shadowMark(ctx, x, y, R, q);
  const cy = y - h;
  rock(ctx, x, cy, ((f.t / 3) | 0) % 3);
  rect(ctx, x + 3, cy - 3 - (f.t & 1), 1, 1, 'grey2');
  rect(ctx, x - 4, cy - 5, 1, 1, 'grey3');
}

/** The splash: a flash of white where it lands, a ring of dust widening to w and thinning, and its pieces thrown out and dropped. */
function splash(ctx: Ctx, f: FxView, q: number): void {
  const x = Math.round(f.x), y = Math.round(f.y), R = Math.max(6, (f.w > 0 ? f.w : 20) / 2), fade = q > 0.5 ? 1 - (q - 0.5) / 0.5 : 1;
  if (q < 0.25) {
    const s = Math.max(1, Math.round(R * 0.4 * (1 - q * 4)));
    rect(ctx, x - s, y, s * 2 + 1, 1, 'white');
    rect(ctx, x, y - (s >> 1), 1, s + 1, 'cream');
  }
  const r = Math.max(2, Math.round(R * easeOut(clamp(q * 1.5)))), ry = Math.max(1, r >> 1);
  for (let a = 0; a < 40; a++) {
    const t = (a / 40) * Math.PI * 2, px = Math.round(x + Math.cos(t) * r), py = Math.round(y + Math.sin(t) * ry);
    if (keep(px, py, fade)) rect(ctx, px, py, 1, 1, a & 1 ? 'grey3' : 'grey2');
  }
  for (let i = 0; i < 7; i++) {
    const side = unit(i, 1, 53) * 2 - 1, out = side * R * 1.1 * easeOut(clamp(q * 1.4)), up = Math.sin(clamp(q * 1.2) * Math.PI) * (4 + unit(i, 2, 53) * 8);
    const px = Math.round(x + out), py = Math.round(y - up + unit(i, 3, 53) * 2);
    if (keep(px, py, fade)) rect(ctx, px, py, i & 1 ? 2 : 1, i & 1 ? 2 : 1, i % 3 === 0 ? 'bone' : i % 3 === 1 ? 'grey3' : 'blood1');
  }
}

/** debris: the rock falling on its mark for most of its life, then the splash. */
export function debris(ctx: Ctx, f: FxView): void {
  const air = f.life > SPLASH_FRAMES + 8 ? f.life - SPLASH_FRAMES : Math.round(f.life * 0.6);
  if (f.t < air) { flight(ctx, f, clamp(f.t / Math.max(1, air))); return; }
  splash(ctx, f, clamp((f.t - air) / Math.max(1, f.life - air)));
}

// ---------------------------------------------------------------- whip
/** The lash: a vine two px thick at the root and one at the tip, `L` long along the angle, bent by a wave that runs outward as it cracks. */
export function whip(ctx: Ctx, f: FxView, ang: number, p: number): void {
  const L = f.w > 0 ? f.w : 60, reach = L * easeOut(clamp(p / 0.3)), fade = p > 0.5 ? clamp(1 - (p - 0.5) / 0.45) : 1;
  const c = Math.cos(ang), s = Math.sin(ang), amp = 5 * (1 - p * 0.7);
  const dot = (x: number, y: number, w: number, col: ColorName): void => { for (let j = 0; j < w; j++) for (let i = 0; i < w; i++) if (keep(x + i, y + j, fade)) rect(ctx, x + i, y + j, 1, 1, col); };
  let tipX = f.x, tipY = f.y;
  for (let i = 0; i <= reach; i++) {
    const u = i / L, off = Math.sin(u * 7 - p * 14) * amp * (0.25 + 0.75 * u), x = Math.round(f.x + c * i - s * off), y = Math.round(f.y + s * i + c * off);
    tipX = x; tipY = y;
    const thick = u < 0.35 ? 3 : u < 0.75 ? 2 : 1;
    dot(x + 1, y + 1, thick, 'blood0');
    dot(x, y, thick, i % 5 === 3 ? 'hot' : i % 2 ? 'red' : 'blood1');
    if (i % 11 === 6 && u > 0.2) dot(Math.round(x - s * 2), Math.round(y + c * 2), 1, 'red');
  }
  if (p > 0.22 && p < 0.5) {
    const k = p < 0.34 ? 2 : 1;
    rect(ctx, tipX - k, tipY, k * 2 + 1, 1, 'white');
    rect(ctx, tipX, tipY - k, 1, k * 2 + 1, 'white');
    rect(ctx, tipX - 1, tipY - 1, 3, 3, p < 0.34 ? 'cream' : 'hot');
    rect(ctx, tipX, tipY, 1, 1, 'white');
  }
}

// ---------------------------------------------------------------- blaze
/** Where the flames stand on him, as the share of the width across from his middle and of the height up from his feet, their height in px and the way they lean: shoulders, head, back, elbows, hip. */
const SPOTS: [number, number, number, number][] = [[-0.29, 0.75, 12, -1], [0.29, 0.75, 11, 1], [0, 0.93, 9, 1], [-0.1, 0.45, 8, -1], [-0.4, 0.55, 7, -1], [0.4, 0.55, 7, 1], [0.14, 0.3, 6, 1]];

/** One tongue of fire from (x, y) up, `h` tall: a wide base of red under orange, an amber core and a yellow tip, leaning with the sway. */
function tongue(ctx: Ctx, x: number, y: number, h: number, lean: number): void {
  for (let i = 0; i < h; i++) {
    const u = i / h, w = u < 0.25 ? 4 : u < 0.6 ? 3 : u < 0.85 ? 2 : 1, sx = x + Math.round(lean * u * u * 3) - (w >> 1);
    const col: ColorName = u < 0.2 ? 'red' : u < 0.5 ? 'orange' : u < 0.8 ? 'amber' : 'yellow';
    rect(ctx, sx, y - i, w, 1, col);
    if (u > 0.15 && u < 0.7 && w >= 3) rect(ctx, x + Math.round(lean * u * u * 3), y - i, 1, 1, u < 0.45 ? 'amber' : 'yellow');
  }
}

/** blaze: seven tongues over the body that rise and fall in a loop of ten frames, each out of step; a few embers drift up off the shoulders. (x, y) is his feet, w across and h tall. */
export function blaze(ctx: Ctx, f: FxView): void {
  const W = f.w > 0 ? f.w : 28, H = f.h > 0 ? f.h : 40, step = ((f.t / 2) | 0) % 5;
  SPOTS.forEach(([sx, sy, th, lean], i) => {
    const s = (step + i * 2) % 5, grow = [0.8, 1, 0.9, 1.1, 0.85][s] as number, sway = [0, 1, 0, -1, 0][(s + i) % 5] as number;
    tongue(ctx, Math.round(f.x + sx * W), Math.round(f.y - sy * H), Math.max(3, Math.round(th * grow)), lean + sway);
  });
  for (let i = 0; i < 4; i++) {
    const age = (step * 2 + i * 7) % 18, ex = Math.round(f.x + (unit(i, 1, 71) * 2 - 1) * W * 0.45 + Math.sin(age * 0.5 + i) * 1.5), ey = Math.round(f.y - H * 0.7 - age);
    if (age < 14) rect(ctx, ex, ey, 1, 1, age < 6 ? 'yellow' : age < 10 ? 'orange' : 'red');
  }
}

/** The line a lash will follow, on the floor from his feet (x, y) to its tip while he winds up (t the wind-up's frames): dashes of dark red that march out toward the tip, solid for the wind-up's last third, and a hot point where it ends. */
export function whipWarn(ctx: Ctx, x: number, y: number, tipX: number, tipY: number, t: number): void {
  const len = Math.hypot(tipX - x, tipY - y), soon = t >= 16;
  for (let i = 0; i <= len; i++) {
    if (!(soon || (i + t) % 6 < 4)) continue;
    const px = Math.round(x + ((tipX - x) * i) / len), py = Math.round(y + ((tipY - y) * i) / len);
    rect(ctx, px, py, 1, 1, i % 6 === 0 ? 'hot' : 'red');
    rect(ctx, px, py + 1, 1, 1, 'blood0');
  }
  const ex = Math.round(tipX), ey = Math.round(tipY);
  for (const [dx, dy] of [[-1, -1], [1, 1], [-1, 1], [1, -1]] as const) for (let i = 1; i <= 3; i++) rect(ctx, ex + dx * i, ey + dy * i, 1, 1, i > 2 ? 'blood1' : 'hot');
  rect(ctx, ex, ey, 1, 1, 'white');
}
