// Actor sprites: one atlas canvas per character (13 frames by 4 directions), plus flash and tint variants.
// Overlays (shadow, nosebleed, "!" and HP bar) are drawn with plain rects around the sprite.
import type { ActorView, AnimId, Dir } from '../core/types.ts';
import type { ColorName } from './palette.ts';
import type { CharSpec } from './data/types.ts';
import { ANIM_ORDER, CELL, POSES, bodyShift, composeFrame, composeRat } from './actor_pose.ts';
import { KIDS } from './data/heroes.ts';
import { ADULTS } from './data/adultchars.ts';
import { AGENT, RAT_PAL } from './data/foes.ts';
import { canvasFromPixels, mirrorRoles, px32, rect } from './canvas.ts';
import type { Ctx } from './canvas.ts';

const DIRS: Dir[] = ['down', 'up', 'left', 'right'];
const DIR_ROW: Record<Dir, number> = { down: 0, up: 1, left: 2, right: 3 };
const FRAME_BASE = {} as Record<AnimId, number>;
let FRAME_COUNT = 0;
for (const a of ANIM_ORDER) { FRAME_BASE[a] = FRAME_COUNT; FRAME_COUNT += POSES[a].length; }

/** Frames of the walk cycle hold for 7 ticks, idle breathes every 30, the attack and cast poses switch at 6 and 8. */
function frameIndex(anim: AnimId, t: number): number {
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
  roles: Uint8Array[];
  /** First opaque row of each direction's standing and walking frames, for placing the bar and the "!". */
  tops: number[];
  pal: Record<string, ColorName>;
  main?: HTMLCanvasElement;
  white?: HTMLCanvasElement;
  tints: Map<ColorName, HTMLCanvasElement>;
}

const specs = new Map<string, CharSpec>();
for (const s of [...KIDS, ...ADULTS, AGENT]) specs.set(s.id, s);
const sheets = new Map<string, Sheet>();

function buildSheet(id: string): Sheet {
  const spec = specs.get(id) ?? (id === 'rat' ? undefined : specs.get('mike'));
  const roles: Uint8Array[] = [];
  for (const dir of DIRS) {
    const view = dir === 'down' ? 'down' : dir === 'up' ? 'up' : 'side';
    for (const anim of ANIM_ORDER) {
      for (let f = 0; f < POSES[anim].length; f++) {
        const buf = spec ? composeFrame(spec, view, anim, f) : composeRat(view, anim, f);
        roles.push(dir === 'left' ? mirrorRoles(buf, CELL, CELL) : buf);
      }
    }
  }
  const tops = DIRS.map((_, d) => {
    let top = CELL;
    for (let f = 0; f < FRAME_BASE.attack; f++) {
      const buf = roles[d * FRAME_COUNT + f] as Uint8Array;
      for (let i = 0; i < buf.length; i++) if (buf[i]) { top = Math.min(top, (i / CELL) | 0); break; }
    }
    return top;
  });
  return { id, roles, tops, pal: spec ? spec.pal : { ...RAT_PAL }, tints: new Map() };
}

function sheetOf(id: string): Sheet {
  let s = sheets.get(id);
  if (!s) { s = buildSheet(id); sheets.set(id, s); }
  return s;
}

type Mode = 'main' | 'white' | ColorName;

function render(sh: Sheet, mode: Mode): HTMLCanvasElement {
  const W = FRAME_COUNT * CELL, H = DIRS.length * CELL;
  const px = new Uint32Array(W * H);
  const own = new Uint32Array(128);
  for (const k of Object.keys(sh.pal)) own[k.charCodeAt(0)] = px32(sh.pal[k] as ColorName);
  own[107] = px32('ink');
  const white = px32('white');
  const tint = mode === 'main' || mode === 'white' ? 0 : px32(mode);
  sh.roles.forEach((buf, idx) => {
    const ox = (idx % FRAME_COUNT) * CELL, oy = ((idx / FRAME_COUNT) | 0) * CELL;
    for (let y = 0; y < CELL; y++) {
      for (let x = 0; x < CELL; x++) {
        const v = buf[y * CELL + x] as number;
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
const shadowCache = new Map<number, HTMLCanvasElement>();

function shadowSprite(size: number, phase: number): HTMLCanvasElement {
  const key = size * 2 + phase;
  let c = shadowCache.get(key);
  if (c) return c;
  const [w, h] = SHADOW_SIZES[size] as [number, number];
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
function drawShadow(ctx: Ctx, cx: number, cy: number, z: number): void {
  const size = z >= 14 ? 3 : z >= 8 ? 2 : z >= 4 ? 1 : 0;
  const [w, h] = SHADOW_SIZES[size] as [number, number];
  const x = cx - (w >> 1), y = cy + 1 - h;
  ctx.drawImage(shadowSprite(size, (x + y) & 1), x, y);
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

function drawHpBar(ctx: Ctx, cx: number, top: number, hp: number, hpMax: number): void {
  const frac = hpMax > 0 ? Math.max(0, Math.min(1, hp / hpMax)) : 0;
  const w = Math.round(12 * frac);
  rect(ctx, cx - 7, top, 14, 4, 'ink');
  rect(ctx, cx - 6, top + 1, 12, 2, 'blood0');
  if (w > 0) {
    rect(ctx, cx - 6, top + 1, w, 1, 'hot');
    rect(ctx, cx - 6, top + 2, w, 1, 'red');
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

/** Draws one actor. Feet at v.x, v.y; z lifts the sprite but not its shadow. */
export function drawActor(ctx: Ctx, v: ActorView): void {
  const sh = sheetOf(v.id);
  const cx = Math.round(v.x), cy = Math.round(v.y);
  const z = Math.max(0, Math.round(v.z));
  const ox = cx - 8, oy = cy - 16 - z;
  const row = DIR_ROW[v.dir];
  const head = oy + (sh.tops[row] as number);
  if (!v.blink) {
    drawShadow(ctx, cx, cy, z);
    const frame = frameIndex(v.anim, v.t);
    ctx.drawImage(atlasFor(sh, v), (FRAME_BASE[v.anim] + frame) * CELL, row * CELL, CELL, CELL, ox, oy, CELL, CELL);
    if (v.strained) drawNosebleed(ctx, v, ox, oy, frame);
    if (v.bar) drawHpBar(ctx, cx, head - 5, v.bar.hp, v.bar.hpMax);
  }
  if (v.alert) ctx.drawImage(alertSprite(), cx - 2, head - (v.bar ? 15 : 10) + ((v.t >> 2) & 1));
}

/** Builds every sheet and the main atlases up front. */
export function warmActors(): void {
  for (const id of ['mike', 'dustin', 'lucas', 'eleven', 'will', 'joyce', 'agent', 'rat']) {
    const sh = sheetOf(id);
    sh.main = render(sh, 'main');
  }
  shadowSprite(0, 0); shadowSprite(0, 1); alertSprite();
}

/** For the sheet scene: draws one raw frame at x, y (top-left). */
export function drawActorFrame(ctx: Ctx, id: string, dir: Dir, anim: AnimId, frame: number, x: number, y: number): void {
  const sh = sheetOf(id);
  ctx.drawImage(sh.main ?? (sh.main = render(sh, 'main')), (FRAME_BASE[anim] + frame) * CELL, DIR_ROW[dir] * CELL, CELL, CELL, x, y, CELL, CELL);
}

