// The Creel House's two props (docs/level-11.md), in the Abandoned look the sheet drew (gfx/var/creel_a.ts): the haunted mirror and the
// grandfather clock. The mirror is a tarnished gilt frame round lit glass with a sheen across it. While ghouls wait in it (PropView.k, the
// share of them still in the glass) a pale head and shoulders stand in the glass with eyes that glow and go dark again; with none left the
// glass is empty. A mirror 16 wide hangs on a wall like the sheet's; a wider one is a doorway (the foyer's is 32 by 16) and is one pane in its
// frame. Shattered (state open) it is an empty frame with shards: a wall mirror's pane is dark with the last jagged pieces in it, and a doorway
// has nothing in its frame at all, since the party walks through it, only teeth of glass along its edges and shards on the floor. The clock is
// 16 by 32: whole it ticks (the pendulum swings in four steps), smashed (state open) its glass door is broken, its face cracked to a dark
// hole and its pendulum fallen, and it stands there still (it is solid either way). The attic's clock, `clock_attic` (docs/level-13.md), is
// Vecna's: the Upside Down house's old clock with a vine up its trunk (gfx/var/attic_a.ts), and it is never smashed. Painted in daytime
// values, for the night pass. Pure pixel work.
import type { PropView } from '../core/types.ts';
import { Px } from './px.ts';
import type { Ctx } from './canvas.ts';
import { oldClock } from './var/attic_a.ts';
import { clock, mirror } from './var/creel_a.ts';
import type { MirrorKit } from './var/creel_a.ts';

type Art = (key: string, build: () => Px) => HTMLCanvasElement;

const TARNISH: MirrorKit = { fr: 'sand', hi: 'bone', lo: 'soil3', glass: 'mist', sheen: 'bone', shine: 'white', ghost: 'slate', eye: 'hot', crack: 'ink' };
const GHOST = ['..ff..', '.hffh.', '.ffff.', '..ff..', 'ffffff', 'ffffff'];

// ---------------------------------------------------------------- the mirror
/** The glass of a doorway mirror: lit, a sheen across it, and a head and shoulders for each of up to two ghouls still in it (the eyes glow on the first two steps of the phase). */
function wideGlass(px: Px, m: MirrorKit, x0: number, y0: number, w: number, h: number, ghosts: number, phase: number): void {
  px.rect(x0, y0, w, h, m.glass);
  for (let i = 0; i < w + h; i += 9) px.line(x0 + i, y0, x0 + i - h + 1, y0 + h - 1, m.sheen);
  px.rect(x0, y0, 3, 1, m.shine).rect(x0, y0, 1, 3, m.shine);
  for (let g = 0; g < ghosts; g++) {
    const gx = x0 + ((w - 6) >> 1) + (ghosts === 2 ? (g ? 7 : -7) : 0), gy = y0 + h - 7;
    px.art(GHOST, { f: m.ghost, h: phase < 2 ? m.eye : m.ghost }, gx, Math.max(y0, gy));
  }
}

/** A doorway mirror, w by h: an ink edge, a gilt frame two px wide with a lit top and left, and the glass. */
function wideMirror(w: number, h: number, ghosts: number, phase: number): Px {
  const m = TARNISH, px = new Px(w, h);
  px.rect(0, 0, w, h, 'ink').rect(1, 1, w - 2, h - 1, m.fr).rect(1, 1, w - 2, 1, m.hi).rect(1, 1, 1, h - 1, m.hi).rect(w - 2, 2, 1, h - 2, m.lo).rect(2, h - 2, w - 4, 1, m.lo);
  px.rect(3, 3, w - 6, h - 5, 'ink');
  wideGlass(px, m, 4, 4, w - 8, h - 7, ghosts, phase);
  return px;
}

/** The same doorway with the glass gone: the frame's two posts and its lintel, teeth of glass left along them, and a few shards on the floor. The middle is clear, so the floor shows through. */
function wideBroken(w: number, h: number): Px {
  const m = TARNISH, px = new Px(w, h);
  px.rect(0, 0, w, 4, 'ink').rect(1, 1, w - 2, 2, m.fr).rect(1, 1, w - 2, 1, m.hi).rect(1, 3, w - 2, 1, m.lo);
  for (const x of [0, w - 3]) px.rect(x, 0, 3, h, 'ink').rect(x, 1, 3, h - 1, m.fr).rect(x, 1, 1, h - 1, m.hi).rect(x + 2, 2, 1, h - 2, m.lo);
  px.rect(0, h - 1, 3, 1, 'ink').rect(w - 3, h - 1, 3, 1, 'ink');
  for (let x = 3; x < w - 3; x += 4) { const d = 1 + ((x * 7) & 3); px.rect(x, 4, 3, d, m.glass).rect(x + 1, 4 + d, 1, 1, m.sheen).set(x, 4, m.shine); }
  for (const [x, y] of [[6, h - 3], [10, h - 2], [15, h - 4], [w - 11, h - 3], [w - 8, h - 2], [w - 14, h - 5]] as const) if (x > 3 && x < w - 3) px.rect(x, y, 2, 1, 'sky').set(x, y - 1, 'white');
  return px;
}

/** A mirror on a wall, 16 by 16, from the sheet's painter: the tall tarnished frame, whole or broken. */
function wallMirror(w: number, h: number, broken: boolean, phase: number): Px {
  const tile = new Px(16);
  mirror(tile, TARNISH, broken, phase);
  const px = new Px(w, h);
  return px.blit(tile, (w - 16) >> 1, (h - 16) >> 1);
}

/** What a mirror of this size and state looks like, `k` the share of its ghouls still in it. */
export function mirrorPx(w: number, h: number, broken: boolean, k: number, phase: number): Px {
  if (w >= 24) return broken ? wideBroken(w, h) : wideMirror(w, h, k > 0.5 ? 2 : k > 0 ? 1 : 0, phase);
  return wallMirror(w, h, broken, k > 0 ? phase : 3);
}

// ---------------------------------------------------------------- the clock
/** The clock whole, in the Abandoned look's colors: dark old wood, grey brass, a crack in the hood and a cobweb hanging in the case. */
export function clockPx(phase: number): Px {
  const old = clock({ body: 'soil2', hi: 'soil3', lo: 'soil1', brass: 'grey3', brassHi: 'bone', face: 'bone', hand: 'grey1', well: 'shadow' }, phase);
  return old.line(5, 7, 10, 12, 'grey1').line(4, 20, 8, 19, 'bone').line(8, 19, 9, 24, 'bone');
}

/** The clock smashed: the face a dark hole with its glass in jagged teeth, the case's door broken open, the pendulum hanging off its hook with the bob on the floor, shards at the foot. */
export function smashedClockPx(): Px {
  const px = clock({ body: 'soil2', hi: 'soil3', lo: 'soil1', brass: 'grey3', brassHi: 'bone', face: 'black', hand: 'grey1', well: 'black' }, 0);
  px.ellipse(8, 9.5, 3.7, 3.7, 'black');
  for (const [x, y] of [[5, 7], [6, 6], [10, 7], [11, 9], [10, 12], [6, 12], [4, 10]] as const) px.set(x, y, 'bone');
  px.set(8, 6, 'white').set(8, 12, 'mist').line(8, 9, 11, 7, 'bone').line(8, 9, 5, 12, 'mist');
  px.rect(4, 17, 8, 10, 'black');
  for (const [x, y, w] of [[4, 17, 3], [8, 18, 2], [10, 20, 2], [4, 22, 2], [4, 25, 3], [9, 26, 3]] as const) px.rect(x, y, w, 1, 'mist').set(x, y + 1, 'bone');
  px.line(8, 17, 11, 25, 'grey3').rect(10, 26, 3, 3, 'grey3').set(10, 26, 'bone').rect(11, 27, 2, 2, 'grey2');
  px.line(2, 4, 13, 12, 'ink').line(13, 12, 12, 14, 'ink');
  for (const [x, y] of [[1, 31], [4, 30], [7, 31], [10, 30], [13, 31], [14, 29]] as const) px.rect(x, y, 2, 1, 'sky').set(x, y - 1, 'white');
  return px;
}

// ---------------------------------------------------------------- drawing
/** Draws a mirror or the clock. Static art is cached by what decides it; the live part, the glow of the ghouls' eyes and the clock's pendulum, is the phase of the prop's own frame count. */
export function drawCh4Prop(ctx: Ctx, v: PropView, art: Art): void {
  const x = Math.round(v.x), y = Math.round(v.y), w = Math.round(v.w), h = Math.round(v.h), open = v.state === 'open';
  if (v.kind === 'mirror') {
    const k = Math.max(0, Math.min(1, v.k ?? 0)), n = k > 0.5 ? 2 : k > 0 ? 1 : 0, phase = (v.t >> 5) & 3;
    const key = `mirror${w}x${h}${open ? 'b' : `w${n}:${n ? phase : 3}`}`;
    ctx.drawImage(art(key, () => mirrorPx(w, h, open, n ? (n === 2 ? 1 : 0.4) : 0, n ? phase : 3)), x, y);
    return;
  }
  const phase = (v.t >> 4) & 3;
  if (v.id === 'clock_attic') { ctx.drawImage(art(`clockattic${phase}`, () => oldClock(phase)), x + ((w - 16) >> 1), y + h - 32); return; }
  ctx.drawImage(art(open ? 'clockbroken' : `clock${phase}`, () => (open ? smashedClockPx() : clockPx(phase))), x + ((w - 16) >> 1), y + h - 32);
}
