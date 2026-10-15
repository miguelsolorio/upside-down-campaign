// Actor sprites: one atlas canvas per character (13 frames by 4 directions), plus flash and tint variants.
// Overlays (shadow, nosebleed, "!" and HP bar) are drawn with plain rects around the sprite. A cell is 16 by 16, or
// 24 by 24 for the warden. A guard with its shield down and an elite enemy each have an atlas of their own. The
// Demogorgon, the demodog, the Alpha, the vine and the pod are drawn from frames of their own (actor_demo.ts, actor_dog.ts, actor_alpha.ts, actor_plant.ts).
import type { ActorView, AnimId, Dir } from '../core/types.ts';
import type { ColorName } from './palette.ts';
import type { CharSpec } from './data/types.ts';
import { ANIM_ORDER, CELL, POSES, bodyShift, composeFrame, composeRat } from './actor_pose.ts';
import { composeGuard, composeWarden, FOE_CELL } from './actor_foes.ts';
import { DEMO_H, DEMO_W, demoFrame } from './actor_demo.ts';
import { DOG_H, DOG_W, dogFrame } from './actor_dog.ts';
import { ALPHA_H, ALPHA_W, alphaFrame } from './actor_alpha.ts';
import { PLANT, drawWhip, podFrame, vineFrame } from './actor_plant.ts';
import type { Frame } from './actor_kit.ts';
import { KIDS } from './data/heroes.ts';
import { ADULTS } from './data/adultchars.ts';
import { MAX } from './data/max.ts';
import { STEVE } from './data/steve.ts';
import { HOPPER } from './data/hopper.ts';
import { AGENT, RAT_PAL } from './data/foes.ts';
import { PALS, TRIM } from './data/guard.ts';
import { canvasFromPixels, mirrorRoles, px32, rect } from './canvas.ts';
import type { Ctx } from './canvas.ts';

const DIRS: Dir[] = ['down', 'up', 'left', 'right'];
const DIR_ROW: Record<Dir, number> = { down: 0, up: 1, left: 2, right: 3 };
const FRAME_BASE = {} as Record<AnimId, number>;
let FRAME_COUNT = 0;
for (const a of ANIM_ORDER) { FRAME_BASE[a] = FRAME_COUNT; FRAME_COUNT += POSES[a].length; }

/**
 * Frames of the walk cycle hold for 7 ticks, idle breathes every 30, the attack and cast poses switch at 6 and 8. An npc who is
 * channeling (Eleven holding the Gate shut, anim cast and strained) holds the third cast frame, her arms thrown up.
 */
function frameIndex(anim: AnimId, t: number, channeling = false): number {
  if (channeling) return 2;
  switch (anim) {
    case 'idle': return ((t / 30) | 0) & 1;
    case 'walk': return ((t / 7) | 0) & 3;
    case 'attack': return t < 6 ? 0 : 1;
    case 'cast': return t < 8 ? 0 : 1;
    default: return 0;
  }
}

interface Sheet {
  id: string;
  /** Side of one square frame: 16, or 24 for the warden. */
  cell: number;
  roles: Uint8Array[];
  /** First opaque row of each direction's standing and walking frames, for placing the bar and the "!". */
  tops: number[];
  pal: Record<string, ColorName>;
  main?: HTMLCanvasElement;
  white?: HTMLCanvasElement;
  tints: Map<ColorName, HTMLCanvasElement>;
}

const specs = new Map<string, CharSpec>();
for (const s of [...KIDS, ...ADULTS, MAX, STEVE, HOPPER, AGENT]) specs.set(s.id, s);
const sheets = new Map<string, Sheet>();

/** The red band of an elite: the second row of the sprite, across the head. */
function eliteBand(buf: Uint8Array, C: number): void {
  let top = -1;
  for (let y = 0; y < C && top < 0; y++) for (let x = 0; x < C; x++) { const v = buf[y * C + x] as number; if (v && v !== 107) { top = y; break; } }
  if (top < 0 || top + 1 >= C) return;
  for (let x = 0; x < C; x++) { const v = buf[(top + 1) * C + x] as number; if (v && v !== 107) buf[(top + 1) * C + x] = 82; }
}

/** key is the actor id, then ":low" for a guard with its shield down, then ":elite". */
function buildSheet(key: string): Sheet {
  const [id, ...flags] = key.split(':') as [string, ...string[]];
  const elite = flags.includes('elite'), low = flags.includes('low');
  const foe = id === 'guard' || id === 'warden';
  const C = foe ? (FOE_CELL[id] as number) : CELL;
  const spec = specs.get(id) ?? (id === 'rat' || foe ? undefined : specs.get('mike'));
  const roles: Uint8Array[] = [];
  for (const dir of DIRS) {
    const view = dir === 'down' ? 'down' : dir === 'up' ? 'up' : 'side';
    for (const anim of ANIM_ORDER) {
      for (let f = 0; f < POSES[anim].length; f++) {
        const buf = id === 'guard' ? composeGuard(view, anim, f, low) : id === 'warden' ? composeWarden(view, anim, f, low)
          : spec ? composeFrame(spec, view, anim, f) : composeRat(view, anim, f);
        if (elite && !foe && anim !== 'ko') eliteBand(buf, C);
        roles.push(dir === 'left' ? mirrorRoles(buf, C, C) : buf);
      }
    }
  }
  const tops = DIRS.map((_, d) => {
    let top = C;
    for (let f = 0; f < FRAME_BASE.attack; f++) {
      const buf = roles[d * FRAME_COUNT + f] as Uint8Array;
      for (let i = 0; i < buf.length; i++) if (buf[i]) { top = Math.min(top, (i / C) | 0); break; }
    }
    return top;
  });
  const pal: Record<string, ColorName> = id === 'guard' || id === 'warden' ? { ...PALS[id], ...TRIM[id][elite ? 'elite' : 'normal'] }
    : spec ? { ...spec.pal, ...(elite ? { b: 'red', R: 'hot' } : {}) } : { ...RAT_PAL, ...(elite ? { R: 'red' } : {}) };
  return { id: key, cell: C, roles, tops, pal, tints: new Map() };
}

function sheetOf(key: string): Sheet {
  let s = sheets.get(key);
  if (!s) { s = buildSheet(key); sheets.set(key, s); }
  return s;
}

/** The atlas an actor is drawn from: its id, plus whether a guard has its shield down and whether it is an elite. */
function keyOf(id: string, guarding: boolean | undefined, elite: boolean | undefined, kind: string): string {
  const foe = id === 'guard' || id === 'warden';
  return id + (foe && guarding === false ? ':low' : '') + (elite && kind === 'enemy' ? ':elite' : '');
}

type Mode = 'main' | 'white' | ColorName;

function render(sh: Sheet, mode: Mode): HTMLCanvasElement {
  const C = sh.cell;
  const W = FRAME_COUNT * C, H = DIRS.length * C;
  const px = new Uint32Array(W * H);
  const own = new Uint32Array(128);
  for (const k of Object.keys(sh.pal)) own[k.charCodeAt(0)] = px32(sh.pal[k] as ColorName);
  own[107] = px32('ink');
  const white = px32('white');
  const tint = mode === 'main' || mode === 'white' ? 0 : px32(mode);
  sh.roles.forEach((buf, idx) => {
    const ox = (idx % FRAME_COUNT) * C, oy = ((idx / FRAME_COUNT) | 0) * C;
    for (let y = 0; y < C; y++) {
      for (let x = 0; x < C; x++) {
        const v = buf[y * C + x] as number;
        if (!v) continue;
        let c = own[v] || white;
        if (mode === 'white') c = white;
        else if (tint && v !== 107 && ((x + y) & 1) === 0) c = tint;
        px[(oy + y) * W + ox + x] = c;
      }
    }
  });
  return canvasFromPixels(px, W, H);
}

function atlasFor(sh: Sheet, v: ActorView): HTMLCanvasElement {
  if (v.flash > 0.6) return sh.white ?? (sh.white = render(sh, 'white'));
  const tint: ColorName | null = v.flash > 0.25 ? 'white' : v.tint;
  if (tint) {
    let c = sh.tints.get(tint);
    if (!c) { c = render(sh, tint); sh.tints.set(tint, c); }
    return c;
  }
  return sh.main ?? (sh.main = render(sh, 'main'));
}

// ---------------------------------------------------------------- shadow, "!" and bar
const SHADOW_SIZES: [number, number][] = [[12, 4], [10, 4], [8, 3], [6, 2]];
/** The warden's shadow is wider. */
const SHADOW_BIG: [number, number][] = [[20, 6], [18, 5], [14, 4], [10, 3]];
/** The Alpha's: it stands 30 px wide. */
const SHADOW_HUGE: [number, number][] = [[30, 8], [26, 7], [20, 5], [14, 4]];
const SHADOWS = [SHADOW_SIZES, SHADOW_BIG, SHADOW_HUGE];
const shadowCache = new Map<number, HTMLCanvasElement>();

/** tier 0 is the plain shadow, 1 the warden's and the bosses', 2 the Alpha's. */
type ShadowTier = boolean | 0 | 1 | 2;
const tierOf = (t: ShadowTier): number => (t === true ? 1 : t === false ? 0 : t);

function shadowSprite(size: number, phase: number, tier: ShadowTier = 0): HTMLCanvasElement {
  const key = tierOf(tier) * 8 + size * 2 + phase;
  let c = shadowCache.get(key);
  if (c) return c;
  const [w, h] = (SHADOWS[tierOf(tier)] as [number, number][])[size] as [number, number];
  const px = new Uint32Array(w * h);
  const ink = px32('black');
  for (let j = 0; j < h; j++) {
    const dy = (j + 0.5 - h / 2) / (h / 2);
    const half = (w / 2) * Math.sqrt(Math.max(0, 1 - dy * dy)) + 0.2;
    for (let i = 0; i < w; i++) {
      if (Math.abs(i + 0.5 - w / 2) <= half && ((i + j + phase) & 1) === 0) px[j * w + i] = ink;
    }
  }
  c = canvasFromPixels(px, w, h);
  shadowCache.set(key, c);
  return c;
}

/** Dithered oval on the ground. The checker is anchored to world pixels so it never shimmers. */
function drawShadow(ctx: Ctx, cx: number, cy: number, z: number, tier: ShadowTier = 0): void {
  const size = z >= 14 ? 3 : z >= 8 ? 2 : z >= 4 ? 1 : 0;
  const [w, h] = (SHADOWS[tierOf(tier)] as [number, number][])[size] as [number, number];
  const x = cx - (w >> 1), y = cy + 1 - h;
  ctx.drawImage(shadowSprite(size, (x + y) & 1, tier), x, y);
}

const ALERT_ROWS = [
  'kkkk', 'kHRk', 'kHRk', 'kHRk', 'kHRk', 'kkkk', 'kHRk', 'kHRk', 'kkkk',
];
let alertCanvas: HTMLCanvasElement | null = null;
function alertSprite(): HTMLCanvasElement {
  if (alertCanvas) return alertCanvas;
  const px = new Uint32Array(4 * 9);
  const pal: Record<string, number> = { k: px32('ink'), H: px32('hot'), R: px32('red') };
  ALERT_ROWS.forEach((row, y) => { for (let x = 0; x < 4; x++) px[y * 4 + x] = pal[row[x] as string] as number; });
  alertCanvas = canvasFromPixels(px, 4, 9);
  return alertCanvas;
}

/** The HP bar over an enemy. An elite's is 2 px wider. */
function drawHpBar(ctx: Ctx, cx: number, top: number, hp: number, hpMax: number, elite = false): void {
  const frac = hpMax > 0 ? Math.max(0, Math.min(1, hp / hpMax)) : 0;
  const inner = elite ? 14 : 12, half = inner >> 1;
  const w = Math.round(inner * frac);
  rect(ctx, cx - half - 1, top, inner + 2, 4, 'ink');
  rect(ctx, cx - half, top + 1, inner, 2, 'blood0');
  if (w > 0) {
    rect(ctx, cx - half, top + 1, w, 1, 'hot');
    rect(ctx, cx - half, top + 2, w, 1, 'red');
  }
}

/** Light and dark rows of a hero's bar fill, by the color the HUD would give that much HP. */
const HERO_BAR_FILL: Partial<Record<ColorName, [ColorName, ColorName]>> = {
  leaf: ['leaf', 'pine3'], yellow: ['yellow', 'amber'], hot: ['hot', 'red'], blood1: ['blood1', 'blood0'],
};

/**
 * The HP bar over a hero, in the HUD's green, yellow and red where an enemy's is red. It is 6 px of fill in an 8 px frame,
 * half an enemy's, because a party standing still bunches up to 7 px apart and anything wider fuses with its neighbor's.
 * Any HP at all shows at least a pixel. It draws apart from the sprite, after everything else in the world, so an enemy
 * standing in front never covers it and an invulnerability flicker never hides it.
 */
export function drawHeroBar(ctx: Ctx, v: ActorView, color: ColorName): void {
  const bar = v.bar;
  if (!bar) return;
  const sh = sheetOf(keyOf(v.id, v.guarding, v.elite, v.kind));
  const cx = Math.round(v.x), z = Math.max(0, Math.round(v.z));
  const top = Math.round(v.y) - sh.cell - z + (sh.tops[DIR_ROW[v.dir]] as number) - 5;
  const frac = bar.hpMax > 0 ? Math.max(0, Math.min(1, bar.hp / bar.hpMax)) : 0;
  const inner = 6, left = cx - (inner >> 1);
  const w = bar.hp > 0 ? Math.max(1, Math.round(inner * frac)) : 0;
  const [hi, lo] = HERO_BAR_FILL[color] ?? HERO_BAR_FILL.hot as [ColorName, ColorName];
  rect(ctx, left - 1, top, inner + 2, 4, 'ink');
  rect(ctx, left, top + 1, inner, 2, 'shadow');
  if (w > 0) {
    rect(ctx, left, top + 1, w, 1, hi);
    rect(ctx, left, top + 2, w, 1, lo);
  }
}

/** Eleven's nosebleed: a stain under the nose and a drop that runs down the chin, on a 48 tick loop. */
function drawNosebleed(ctx: Ctx, v: ActorView, ox: number, oy: number, frame: number): void {
  if (v.dir === 'up' || v.anim === 'ko') return;
  const view = v.dir === 'down' ? 'down' : 'side';
  const [sx, sy] = bodyShift(view, v.anim, frame);
  const phase = v.t % 48;
  const side = view === 'side';
  const flip = v.dir === 'left';
  const nx = side ? 12 + sx : 7;
  const px = (flip ? CELL - 1 - nx : nx) + ox;
  const y0 = oy + 7 + sy;
  rect(ctx, px, y0, 1, 1, 'hot');
  if (phase >= 10) rect(ctx, px, y0 + 1, 1, 1, 'hot');
  if (phase >= 22) rect(ctx, px, y0 + 2, 1, 1, 'red');
  if (phase >= 34 && phase < 44) rect(ctx, px, y0 + 4, 1, 1, 'red');
}

/** An actor drawn from a frame of its own (actor_kit.ts), cw by ch with its feet on the bottom, with the same shadow, bar and "!" as the others. */
function drawFramed(ctx: Ctx, v: ActorView, f: Frame, cw: number, ch: number, shadow: 'none' | 'small' | 'big' | 'huge'): void {
  const cx = Math.round(v.x), cy = Math.round(v.y), z = Math.max(0, Math.round(v.z));
  const oy = cy - ch - z, head = oy + f.top;
  if (!v.blink) {
    if (shadow !== 'none' && !v.hidden) drawShadow(ctx, cx, cy, z, shadow === 'huge' ? 2 : shadow === 'big' ? 1 : 0);
    ctx.drawImage(f.img, cx - (cw >> 1), oy);
    if (v.bar && !v.hidden) drawHpBar(ctx, cx, head - 5, v.bar.hp, v.bar.hpMax, v.elite === true);
  }
  if (v.alert) ctx.drawImage(alertSprite(), cx - 2, head - (v.bar ? 15 : 10) + ((v.t >> 2) & 1));
}

/** Draws one actor. Feet at v.x, v.y; z lifts the sprite but not its shadow. */
export function drawActor(ctx: Ctx, v: ActorView): void {
  switch (v.id) {
    case 'demogorgon': drawFramed(ctx, v, demoFrame(v), DEMO_W, DEMO_H, 'big'); return;
    case 'demodog': drawFramed(ctx, v, dogFrame(v), DOG_W, DOG_H, 'big'); return;
    case 'alpha': drawFramed(ctx, v, alphaFrame(v), ALPHA_W, ALPHA_H, 'huge'); return;
    case 'vine': drawFramed(ctx, v, vineFrame(v), PLANT, PLANT, 'none'); if (!v.blink) drawWhip(ctx, v); return;
    case 'pod': drawFramed(ctx, v, podFrame(v), PLANT, PLANT, 'none'); return;
    default: break;
  }
  const sh = sheetOf(keyOf(v.id, v.guarding, v.elite, v.kind));
  const C = sh.cell;
  const cx = Math.round(v.x), cy = Math.round(v.y);
  const z = Math.max(0, Math.round(v.z));
  const ox = cx - (C >> 1), oy = cy - C - z;
  const row = DIR_ROW[v.dir];
  const head = oy + (sh.tops[row] as number);
  if (!v.blink) {
    drawShadow(ctx, cx, cy, z, C > CELL);
    const frame = frameIndex(v.anim, v.t, v.kind === 'npc' && v.strained && v.anim === 'cast');
    ctx.drawImage(atlasFor(sh, v), (FRAME_BASE[v.anim] + frame) * C, row * C, C, C, ox, oy, C, C);
    if (v.strained) drawNosebleed(ctx, v, ox, oy, frame);
    // A hero's bar is drawn later, on top of the whole scene, by drawHeroBar.
    if (v.bar && v.kind === 'enemy') drawHpBar(ctx, cx, head - 5, v.bar.hp, v.bar.hpMax, v.elite === true);
  }
  if (v.alert) ctx.drawImage(alertSprite(), cx - 2, head - (v.bar && v.kind === 'enemy' ? 15 : 10) + ((v.t >> 2) & 1));
}

/** Builds every sheet and the main atlases up front. */
export function warmActors(): void {
  for (const id of ['mike', 'dustin', 'lucas', 'eleven', 'will', 'joyce', 'max', 'steve', 'hopper', 'agent', 'rat', 'guard', 'warden']) {
    const sh = sheetOf(id);
    sh.main = render(sh, 'main');
  }
  shadowSprite(0, 0); shadowSprite(0, 1); shadowSprite(0, 0, true); shadowSprite(0, 1, true); shadowSprite(0, 0, 2); shadowSprite(0, 1, 2); alertSprite();
}

/** For the sheet scene: draws one raw frame at x, y (top-left). A guard or warden can have its shield down, and any enemy can be an elite. */
export function drawActorFrame(ctx: Ctx, id: string, dir: Dir, anim: AnimId, frame: number, x: number, y: number, opts: { guarding?: boolean; elite?: boolean } = {}): void {
  const sh = sheetOf(keyOf(id, opts.guarding, opts.elite, id === 'agent' || id === 'rat' || id === 'guard' || id === 'warden' ? 'enemy' : 'hero'));
  const C = sh.cell;
  ctx.drawImage(sh.main ?? (sh.main = render(sh, 'main')), (FRAME_BASE[anim] + frame) * C, DIR_ROW[dir] * C, C, C, x, y, C, C);
}
