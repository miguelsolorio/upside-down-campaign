// Effects, drawn with pixel-snapped rects and driven by t and life. Nothing is pre-rendered, nothing blends:
// fades are dithers. angle is in radians with 0 pointing right and y growing down.
import type { Dir, FxView } from '../core/types.ts';
import type { ColorName } from './palette.ts';
import { arcPx, discPx, hash2, linepx, rect, ringPx, unit } from './canvas.ts';
import type { Ctx } from './canvas.ts';
import { acid, mark } from './fx_boss.ts';
import { bolt, reveal } from './fx_town.ts';
import { howl, taunt, trail } from './fx_l56.ts';
import { arcs, babble, bullet, goo, scoop, trap } from './fx_l78.ts';
import { bottle, fire, pet } from './fx_l6.ts';
import { glass, slam, sweep } from './fx_l9.ts';
import { SMALL_GLASS, chime, riff, smallGlass, walkman } from './fx_ch4.ts';

const DIR_ANGLE: Record<Dir, number> = { right: 0, down: Math.PI / 2, left: Math.PI, up: -Math.PI / 2 };
const easeOut = (p: number): number => 1 - (1 - p) * (1 - p);
const clamp = (v: number, lo = 0, hi = 1): number => Math.max(lo, Math.min(hi, v));
/** True when this pixel survives a fade: keep fraction k of a checker pattern. */
const keep = (x: number, y: number, k: number): boolean => k >= 1 || (k > 0.5 ? ((x + y) & 3) !== 0 : k > 0.25 ? ((x + y) & 1) === 0 : ((x & 1) === 0 && (y & 1) === 0 && k > 0));

/** Half angle of a cone effect from its reach (w) and the chord width at the far edge (h). */
function coneHalf(w: number, h: number, fallback: number): number {
  return w > 0 && h > 0 ? Math.asin(clamp(h / (2 * w), 0, 1)) : fallback;
}

function slash(ctx: Ctx, f: FxView, ang: number, p: number): void {
  const R = f.w > 0 ? f.w : 28;
  const half = coneHalf(f.w, f.h, Math.PI * 0.4);
  const span = half * 2;
  const a0 = ang - span / 2;
  const head = a0 + span * easeOut(Math.min(1, p * 1.6));
  const tail = Math.max(a0, head - span * (0.85 - p * 0.3));
  const steps = Math.ceil((head - tail) * R * 1.6);
  const fade = p > 0.55 ? 1 - (p - 0.55) / 0.45 : 1;
  for (let i = 0; i <= steps; i++) {
    const u = steps ? i / steps : 1;
    const a = tail + (head - tail) * u;
    const inner = R * (0.8 - 0.5 * u);
    const c = Math.cos(a), s = Math.sin(a);
    for (let r = Math.ceil(inner); r <= R; r++) {
      const x = Math.round(f.x + c * r), y = Math.round(f.y + s * r);
      if (!keep(x, y, fade)) continue;
      const edge = r >= R - 1;
      const col: ColorName = u > 0.7 || edge ? 'white' : u > 0.25 ? 'cream' : 'bone';
      rect(ctx, x, y, 1, 1, col);
    }
  }
}

function push(ctx: Ctx, f: FxView, ang: number, p: number): void {
  const reach = f.w > 0 ? f.w : 26;
  const half = coneHalf(f.w, f.h, Math.PI * 0.34);
  const fade = p > 0.55 ? 1 - (p - 0.55) / 0.45 : 1;
  for (let i = 0; i < 3; i++) {
    const r = reach * easeOut(Math.min(1, p * 1.2)) - i * 5;
    if (r < 3) continue;
    const col: ColorName = i === 0 ? 'white' : i === 1 ? 'cyan' : 'sky';
    const sz = 3 - i;
    const n = Math.ceil(half * 2 * r * 1.3);
    for (let k = 0; k <= n; k++) {
      const a = ang - half + (half * 2 * k) / n;
      const x = Math.round(f.x + Math.cos(a) * r), y = Math.round(f.y + Math.sin(a) * r);
      if (keep(x, y, fade - i * 0.1)) rect(ctx, x - (sz >> 1), y - (sz >> 1), sz, sz, col);
    }
  }
  if (p < 0.4) discPx(ctx, f.x + Math.cos(ang) * 4, f.y + Math.sin(ang) * 4, 4 - Math.floor(p * 8), 'white');
}

function beam(ctx: Ctx, f: FxView, ang: number, p: number, t: number): void {
  const L = f.w > 0 ? f.w : 80;
  const T = f.h > 0 ? f.h : 6;
  const grow = clamp(p / 0.2);
  const shrink = p > 0.7 ? 1 - (p - 0.7) / 0.3 : 1;
  const len = L * easeOut(grow);
  const thick = Math.max(1, T * shrink);
  const c = Math.cos(ang), s = Math.sin(ang);
  const px = -s, py = c;
  for (let i = 0; i < len; i += 2) {
    const bx = f.x + c * i, by = f.y + s * i;
    const wob = ((i + t * 3) % 10 < 2) ? 1 : 0;
    for (let k = -Math.ceil(thick / 2) - 1; k <= Math.ceil(thick / 2) + 1; k += 2) {
      const ax = Math.abs(k);
      const edge = ax > thick / 2;
      if (edge && (((i >> 1) + t) & 1)) continue;
      const col: ColorName = edge ? 'sky' : ax > thick / 4 ? 'cyan' : (t & 1 ? 'white' : 'bone');
      rect(ctx, bx + px * (k + wob), by + py * (k + wob), 2, 2, col);
    }
  }
  discPx(ctx, f.x, f.y, Math.max(1, Math.round(thick / 2) + 1), 'white');
  if (grow >= 1) {
    const ex = f.x + c * len, ey = f.y + s * len;
    for (let k = 0; k < 4; k++) {
      const a = (hash2(k, t >> 1, 3) % 628) / 100;
      rect(ctx, ex + Math.cos(a) * 3, ey + Math.sin(a) * 3, 1, 1, k & 1 ? 'white' : 'cyan');
    }
  }
  for (let k = 0; k < 5; k++) {
    const d = unit(k, t >> 1, 9) * len, o = (unit(k, t >> 1, 10) - 0.5) * (thick + 8);
    rect(ctx, f.x + c * d + px * o, f.y + s * d + py * o, 1, 1, 'white');
  }
}

function flame(ctx: Ctx, f: FxView, ang: number, p: number, t: number): void {
  const L = f.w > 0 ? f.w : 52;
  const spread = f.h > 0 ? f.h : 34;
  const env = p < 0.12 ? p / 0.12 : p > 0.82 ? 1 - (p - 0.82) / 0.18 : 1;
  const reach = L * env;
  const c = Math.cos(ang), s = Math.sin(ang);
  const n = Math.round(90 * env);
  for (let pass = 0; pass < 3; pass++) {
    for (let i = 0; i < n; i++) {
      const u = (i * 0.6180339 + t * 0.05 + unit(i, 1, 2) * 0.25) % 1;
      const band = u > 0.6 ? 0 : u > 0.3 ? 1 : 2;
      if (band !== pass) continue;
      const d = u * reach;
      const maxLat = (d / L) * (spread / 2) + 1;
      const k = unit(i, t >> 2, 5) - 0.5;
      const lat = k * 2 * maxLat * (0.4 + 0.6 * u);
      const heat = 1 - (Math.abs(lat) / maxLat) * 0.7 - u * 0.75;
      const sz = 2 + Math.floor(u * 3);
      if (u > 0.7 && ((i + t) & 1)) continue;
      const col: ColorName = heat > 0.72 ? 'white' : heat > 0.5 ? 'yellow' : heat > 0.3 ? 'amber' : heat > 0.1 ? 'orange' : 'red';
      rect(ctx, f.x + c * d - s * lat - sz / 2, f.y + s * d + c * lat - sz / 2, sz, sz, col);
    }
  }
}

function shield(ctx: Ctx, f: FxView, p: number, t: number): void {
  const R = (f.w > 0 ? f.w : 40) / 2;
  const left = f.life - f.t;
  if (left < 36 && ((left >> 2) & 1)) return;
  const grow = clamp(p / 0.12);
  const r = Math.round(R * easeOut(grow));
  if (r < 2) return;
  for (let j = -r; j <= r; j++) {
    const half = Math.floor(Math.sqrt(r * r - j * j));
    for (let i = -half; i <= half; i += 1) {
      const x = f.x + i, y = f.y + j;
      if (((Math.round(x) & 3) === 0 && (Math.round(y) & 3) === 0) || ((Math.round(x) & 3) === 2 && (Math.round(y) & 3) === 2)) rect(ctx, x, y, 1, 1, 'sky');
    }
  }
  ringPx(ctx, f.x, f.y, r, 'cyan', 2);
  ringPx(ctx, f.x, f.y, r - 2, 'sky', 1);
  const spin = t * 0.07;
  for (let k = 0; k < 3; k++) arcPx(ctx, f.x, f.y, r, spin + k * 2.09, spin + k * 2.09 + 0.6, 'white', 2);
  for (const dx of [-r / 3, 0, r / 3]) {
    const h = Math.floor(Math.sqrt(Math.max(0, r * r - dx * dx))) - 3;
    for (let y = -h; y <= h; y += 3) rect(ctx, f.x + dx, f.y + y, 1, 2, 'bone');
  }
}

function nova(ctx: Ctx, f: FxView, p: number): void {
  const R = (f.w > 0 ? f.w : 64) / 2;
  const r = Math.max(1, Math.round(R * easeOut(p)));
  const th = Math.max(1, Math.round(3 * (1 - p)));
  if (p < 0.4) {
    for (let j = -r; j <= r; j++) {
      const half = Math.floor(Math.sqrt(r * r - j * j));
      for (let i = -half; i <= half; i++) if (((Math.round(f.x + i) + Math.round(f.y + j)) & 1) === 0) rect(ctx, f.x + i, f.y + j, 1, 1, 'cyan');
    }
  }
  ringPx(ctx, f.x, f.y, r, 'white', th);
  if (r > 3) ringPx(ctx, f.x, f.y, r - th, 'cyan', 1);
  if (p < 0.5) for (let k = 0; k < 8; k++) {
    const a = k * Math.PI / 4;
    linepx(ctx, f.x + Math.cos(a) * (r + 1), f.y + Math.sin(a) * (r + 1), f.x + Math.cos(a) * (r + 4 + (1 - p) * 4), f.y + Math.sin(a) * (r + 4 + (1 - p) * 4), 'sky');
  }
}

/** One streak. The sim spawns a few of these with random angles, so together they spray. */
function spark(ctx: Ctx, f: FxView, ang: number, p: number): void {
  const reach = f.w > 0 ? f.w : 13;
  const r = 2 + easeOut(p) * reach;
  const c = Math.cos(ang), s = Math.sin(ang);
  const len = Math.max(1, Math.round(5 * (1 - p)));
  const head: ColorName = p < 0.3 ? 'white' : p < 0.6 ? 'yellow' : 'amber';
  for (let i = 0; i < len; i++) {
    const sz = p < 0.5 && i < 2 ? 2 : 1;
    rect(ctx, f.x + c * (r - i) - (sz - 1) / 2, f.y + s * (r - i) - (sz - 1) / 2, sz, sz, i === 0 ? head : p < 0.6 ? 'amber' : 'orange');
  }
  if (p < 0.2) {
    rect(ctx, f.x - 1, f.y - 1, 3, 3, 'white');
    rect(ctx, f.x - 3, f.y, 7, 1, 'yellow');
    rect(ctx, f.x, f.y - 3, 1, 7, 'yellow');
  }
}

/** One puff. The sim spawns several around the feet, each drifting along its own angle. */
function dust(ctx: Ctx, f: FxView, ang: number, p: number): void {
  const drift = easeOut(p) * 6;
  const cx = f.x + Math.cos(ang) * drift, cy = f.y - p * 4 + Math.sin(ang) * drift * 0.5;
  const sz = 4 + Math.floor(p * 2.5);
  const fade = p > 0.5 ? 1 - (p - 0.5) / 0.5 : 1;
  const col: ColorName = p < 0.35 ? 'bone' : p < 0.7 ? 'mist' : 'grey3';
  const mid = (sz - 1) / 2;
  for (let y = 0; y < sz; y++) {
    for (let x = 0; x < sz; x++) {
      if ((x - mid) * (x - mid) + (y - mid) * (y - mid) > (sz / 2) * (sz / 2) - 0.4) continue;
      const px = Math.round(cx) + x - (sz >> 1), py = Math.round(cy) + y - (sz >> 1);
      if (keep(px, py, fade)) rect(ctx, px, py, 1, 1, x + y <= 1 && p < 0.35 ? 'white' : col);
    }
  }
}

function rock(ctx: Ctx, f: FxView, ang: number): void {
  const sz = clamp(Math.round(f.w * 0.6), 4, 7);
  const c = Math.cos(ang), s = Math.sin(ang);
  for (let i = 1; i <= 3; i++) rect(ctx, f.x - c * (i * 2 + sz / 2), f.y - s * (i * 2 + sz / 2), 1, 1, i === 1 ? 'bone' : 'mist');
  const x = Math.round(f.x), y = Math.round(f.y);
  discPx(ctx, x, y, sz / 2 - 0.5, 'grey3');
  const k = (f.t >> 1) & 3;
  const hx = [-1, 0, 0, -1][k] as number, hy = [-1, -1, 0, 0][k] as number;
  rect(ctx, x + hx - 1, y + hy - 1, 2, 2, 'white');
  rect(ctx, x + 1 - hx, y + 1 - hy, 2, 1, 'grey2');
}

function candy(ctx: Ctx, f: FxView): void {
  const flying = f.h > 0;
  const th = flying ? f.t * 0.32 : -0.35;
  const c = Math.cos(th), s = Math.sin(th);
  const x = Math.round(f.x), y = Math.round(f.y) + (flying ? 0 : ((f.t >> 4) & 1));
  if (!flying) for (let i = -2; i <= 2; i++) if (((x + i + y) & 1) === 0) rect(ctx, x + i, y + 4, 1, 1, 'black');
  for (let i = -4; i <= 3.5; i += 0.5) {
    for (let j = -1.5; j <= 1.5; j += 0.5) {
      const col: ColorName = i < -2.5 || i > 2 ? 'amber' : j > 0.6 ? 'blood1' : Math.abs(i) < 1.2 ? 'cream' : 'red';
      rect(ctx, x + i * c - j * s, y + i * s + j * c, 1, 1, col);
    }
  }
  if ((f.t % 24) < 4) { rect(ctx, x + 4, y - 5, 1, 3, 'white'); rect(ctx, x + 3, y - 4, 3, 1, 'white'); }
  if (!flying && (f.t % 30) < 16) ringPx(ctx, x, y, 5 + (f.t % 30) / 2, 'pink', 1);
}

function dart(ctx: Ctx, f: FxView, ang: number): void {
  const c = Math.cos(ang), s = Math.sin(ang);
  const px = -s, py = c;
  for (let i = -6; i <= 1; i++) {
    const col: ColorName = i < -4 ? 'hot' : i < 0 ? 'bone' : 'white';
    rect(ctx, f.x + c * i, f.y + s * i, 1, 1, col);
    if (i >= -5 && i <= -1) rect(ctx, f.x + c * i + px, f.y + s * i + py, 1, 1, i < -3 ? 'red' : 'grey3');
  }
  rect(ctx, f.x + c * -6 + px * 2, f.y + s * -6 + py * 2, 1, 1, 'hot');
  rect(ctx, f.x + c * -6 - px, f.y + s * -6 - py, 1, 1, 'hot');
}

function blast(ctx: Ctx, f: FxView, p: number): void {
  const R = (f.w > 0 ? f.w : 24) / 2;
  const r = Math.max(1, Math.round(R * easeOut(clamp(p * 1.4))));
  const fade = p > 0.5 ? 1 - (p - 0.5) / 0.5 : 1;
  const layer = (rad: number, col: ColorName, k: number): void => {
    for (let j = -rad; j <= rad; j++) {
      const half = Math.floor(Math.sqrt(Math.max(0, rad * rad - j * j)));
      for (let i = -half; i <= half; i++) {
        const x = Math.round(f.x + i), y = Math.round(f.y + j);
        if (keep(x, y, k)) rect(ctx, x, y, 1, 1, col);
      }
    }
  };
  layer(r, p > 0.6 ? 'grey2' : 'red', fade * 0.9);
  layer(Math.round(r * 0.75), p > 0.6 ? 'grey3' : 'orange', fade);
  layer(Math.round(r * 0.5), 'yellow', fade);
  if (p < 0.35) layer(Math.round(r * 0.28), 'white', 1);
  for (let k = 0; k < 8; k++) {
    const a = k * Math.PI / 4 + 0.4, d = R * (0.7 + easeOut(p) * 0.6);
    if (p < 0.8) rect(ctx, f.x + Math.cos(a) * d, f.y + Math.sin(a) * d, 1, 1, k & 1 ? 'amber' : 'orange');
  }
}

function heal(ctx: Ctx, f: FxView, p: number, t: number): void {
  const fade = p > 0.6 ? 1 - (p - 0.6) / 0.4 : 1;
  for (let i = 0; i < 3; i++) {
    const ph = clamp(p * 1.3 - i * 0.14);
    if (ph <= 0 || ph >= 1) continue;
    const x = Math.round(f.x + (i - 1) * 6 + Math.sin(t * 0.2 + i) * 1.2), y = Math.round(f.y - 4 - ph * 14);
    if (!keep(x, y, fade)) continue;
    rect(ctx, x - 2, y, 5, 1, 'leaf'); rect(ctx, x, y - 2, 1, 5, 'leaf'); rect(ctx, x, y, 1, 1, 'white');
    if (i === 1) { rect(ctx, x - 1, y - 1, 1, 1, 'pine3'); rect(ctx, x + 1, y + 1, 1, 1, 'pine3'); }
  }
  for (let k = 0; k < 4; k++) rect(ctx, f.x - 8 + unit(k, t >> 2, 4) * 16, f.y - 2 - unit(k, t >> 2, 5) * 14, 1, 1, 'cream');
}

function ring(ctx: Ctx, f: FxView, p: number): void {
  const R = (f.w > 0 ? f.w : 48) / 2;
  const r = Math.max(1, Math.round(R * easeOut(p)));
  const fade = p > 0.6 ? 1 - (p - 0.6) / 0.4 : 1;
  const n = Math.ceil(Math.PI * 2 * r);
  for (let k = 0; k < n; k++) {
    const a = (k / n) * Math.PI * 2;
    const x = Math.round(f.x + Math.cos(a) * r), y = Math.round(f.y + Math.sin(a) * r);
    if ((k % 5) === 4 || !keep(x, y, fade)) continue;
    rect(ctx, x, y, p < 0.3 ? 2 : 1, p < 0.3 ? 2 : 1, p < 0.5 ? 'white' : 'mist');
  }
}

function spore(ctx: Ctx, f: FxView, p: number, t: number): void {
  const W = f.w > 0 ? f.w : 32, H = f.h > 0 ? f.h : 32;
  const fade = p < 0.1 ? p / 0.1 : p > 0.85 ? 1 - (p - 0.85) / 0.15 : 1;
  const cols: ColorName[] = ['pink', 'magenta', 'bone', 'purple'];
  for (let i = 0; i < 9; i++) {
    const hx = unit(i, 1, 6), hy = unit(i, 2, 6);
    const x = f.x - W / 2 + ((hx * W + Math.sin(t * 0.05 + i * 1.7) * 3 + W) % W);
    const y = f.y - ((hy * H + t * (0.25 + 0.15 * unit(i, 3, 6))) % H);
    const col = cols[i & 3] as ColorName;
    const xi = Math.round(x), yi = Math.round(y);
    if (!keep(xi, yi, fade)) continue;
    rect(ctx, xi, yi, 1, 1, col);
    if (i % 3 === 0) { rect(ctx, xi - 1, yi, 1, 1, 'purple'); rect(ctx, xi + 1, yi, 1, 1, 'purple'); rect(ctx, xi, yi - 1, 1, 1, 'purple'); rect(ctx, xi, yi + 1, 1, 1, 'purple'); }
  }
}

export function drawFx(ctx: Ctx, f: FxView): void {
  const ang = Number.isFinite(f.angle) ? f.angle : DIR_ANGLE[f.dir];
  const p = f.life > 0 ? clamp(f.t / f.life) : 0;
  switch (f.kind) {
    case 'slash': slash(ctx, f, ang, p); break;
    case 'push': push(ctx, f, ang, p); break;
    case 'beam': beam(ctx, f, ang, p, f.t); break;
    case 'flame': flame(ctx, f, ang, p, f.t); break;
    case 'shield': shield(ctx, f, p, f.t); break;
    case 'nova': nova(ctx, f, p); break;
    case 'spark': spark(ctx, f, ang, p); break;
    case 'dust': dust(ctx, f, ang, p); break;
    case 'rock': rock(ctx, f, ang); break;
    case 'candy': candy(ctx, f); break;
    case 'dart': dart(ctx, f, ang); break;
    case 'blast': blast(ctx, f, p); break;
    case 'heal': heal(ctx, f, p, f.t); break;
    case 'ring': ring(ctx, f, p); break;
    case 'spore': spore(ctx, f, p, f.t); break;
    case 'acid': acid(ctx, f, ang); break;
    case 'mark': mark(ctx, f, p); break;
    case 'bolt': bolt(ctx, f, ang); break;
    case 'reveal': reveal(ctx, f, p); break;
    case 'trail': trail(ctx, f, ang); break;
    case 'howl': howl(ctx, f, p); break;
    case 'taunt': taunt(ctx, f, p); break;
    case 'scoop': scoop(ctx, f, p); break;
    case 'babble': babble(ctx, f, ang, p); break;
    case 'bullet': bullet(ctx, f, ang, p); break;
    case 'goo': goo(ctx, f, p); break;
    case 'trap': trap(ctx, f); break;
    case 'arcs': arcs(ctx, f, p); break;
    case 'pet': pet(ctx, f); break;
    case 'bottle': bottle(ctx, f); break;
    case 'fire': fire(ctx, f); break;
    case 'slam': slam(ctx, f, p); break;
    case 'glass': (f.w > 0 && f.w <= SMALL_GLASS ? smallGlass : glass)(ctx, f, p); break;
    case 'sweep': sweep(ctx, f); break;
    case 'riff': riff(ctx, f, p); break;
    case 'chime': chime(ctx, f, p); break;
    case 'walkman': walkman(ctx, f, p); break;
    default: break;
  }
}
