// Actor sprites: one atlas canvas per character (13 frames by 4 directions), plus flash and tint variants.
// Overlays (shadow, charge ring, nosebleed, "!", the swirl of a confused enemy and HP bar) are drawn with plain rects around the sprite. A cell is
// 16 by 16, or 24 by 24 for the warden and Grigori. A guard with its shield down and an elite enemy each have an atlas of their own.
// Which frame of the atlas a view asks for is actor_pick.ts. A dormant Flayed is a puddle and a rising one comes up out of it
// (actor_goo.ts). The Demogorgon, the demodog, the Alpha, the vine and the pod are drawn from frames of their own (actor_demo.ts,
// actor_dog.ts, actor_alpha.ts, actor_plant.ts), and so are Billy, kneeling with his veins fading and slumped once he is free
// (actor_billy.ts), and the Mind Flayer and its legs (actor_flayer.ts). So are Eddie (actor_eddie.ts), the Creel ghoul (actor_ghoul.ts) and the
// demobat (actor_demobat.ts), a flier whose shadow stays on the ground under the height `z` lifts it to, and Vecna (actor_vecna.ts), who floats the
// same way, and his memory orbs (actor_orb.ts).
import type { ActorView, AnimId, Dir } from '../core/types.ts';
import type { ColorName } from './palette.ts';
import type { CharSpec } from './data/types.ts';
import { ANIM_ORDER, CELL, POSES, bodyShift, composeFrame, composeRat } from './actor_pose.ts';
import { composeGuard, composeWarden, FOE_CELL } from './actor_foes.ts';
import { composeGrigori } from './actor_grigori.ts';
import { composeMelter, MELTER_PAL } from './actor_melter.ts';
import { slotOf } from './actor_pick.ts';
import { CH4_SPECS, keyOf, lookSpec } from './actor_look.ts';
import { PUDDLE_H, PUDDLE_W, RISE_FRAMES, puddlePx, puddleStep, swirl } from './actor_goo.ts';
import { DEMO_H, DEMO_W, demoFrame } from './actor_demo.ts';
import { DOG_H, DOG_W, dogFrame } from './actor_dog.ts';
import { ALPHA_H, ALPHA_W, alphaFrame } from './actor_alpha.ts';
import { PLANT, drawWhip, podFrame, vineFrame } from './actor_plant.ts';
import { BILLY_H, BILLY_W, billyFrame } from './actor_billy.ts';
import { EDDIE_H, EDDIE_W, eddieFrameOf } from './actor_eddie.ts';
import { GHOUL_H, GHOUL_W, ghoulFrameOf } from './actor_ghoul.ts';
import { BAT_H, BAT_W, batFrameFor } from './actor_demobat.ts';
import { VECNA_H, VECNA_W, vecnaFrameOf } from './actor_vecna.ts';
import { ORB_H, ORB_W, orbFrameOf } from './actor_orb.ts';
import { whipWarn } from './fx_vecna.ts';
import { drawMarks } from './actor_mark.ts';
import { drawFlayer, drawFlayerLeg } from './actor_flayer.ts';
import type { Frame } from './actor_kit.ts';
import { ghostKeep } from './actor_kit.ts';
import { chargeRing } from './fx_l6.ts';
import { KIDS } from './data/heroes.ts';
import { ADULTS } from './data/adultchars.ts';
import { MAX } from './data/max.ts';
import { STEVE } from './data/steve.ts';
import { HOPPER } from './data/hopper.ts';
import { ROBIN } from './data/robin.ts';
import { NANCY } from './data/nancy.ts';
import { ERICA } from './data/erica.ts';
import { SOLDIER } from './data/soldier.ts';
import { FLAYED } from './data/flayed.ts';
import { GRIGORI_CELL, GRIGORI_PAL } from './data/grigori.ts';
import { AGENT, RAT_PAL } from './data/foes.ts';
import { PALS, TRIM } from './data/guard.ts';
import { canvasFromPixels, mirrorRoles, px32, rect } from './canvas.ts';
import type { Ctx } from './canvas.ts';

const DIRS: Dir[] = ['down', 'up', 'left', 'right'];
const DIR_ROW: Record<Dir, number> = { down: 0, up: 1, left: 2, right: 3 };
const FRAME_BASE = {} as Record<AnimId, number>;
let FRAME_COUNT = 0;
for (const a of ANIM_ORDER) { FRAME_BASE[a] = FRAME_COUNT; FRAME_COUNT += POSES[a].length; }

interface Sheet {
  id: string;
  /** Side of one square frame: 16, or 24 for the warden and Grigori. */
  cell: number;
  roles: Uint8Array[];
  /** First opaque row of each direction's standing and walking frames, for placing the bar and the "!". */
  tops: number[];
  pal: Record<string, ColorName>;
  main?: HTMLCanvasElement;
  white?: HTMLCanvasElement;
  /** A hero hidden under Camo: half dither, the outline kept. */
  faint?: HTMLCanvasElement;
  tints: Map<ColorName, HTMLCanvasElement>;
}

const specs = new Map<string, CharSpec>();
for (const s of [...KIDS, ...ADULTS, MAX, STEVE, HOPPER, ROBIN, NANCY, ERICA, SOLDIER, FLAYED, AGENT, ...CH4_SPECS]) specs.set(s.id, s);
const sheets = new Map<string, Sheet>();

/** The red band of an elite: the second row of the sprite, across the head. */
function eliteBand(buf: Uint8Array, C: number): void {
  let top = -1;
  for (let y = 0; y < C && top < 0; y++) for (let x = 0; x < C; x++) { const v = buf[y * C + x] as number; if (v && v !== 107) { top = y; break; } }
  if (top < 0 || top + 1 >= C) return;
  for (let x = 0; x < C; x++) { const v = buf[(top + 1) * C + x] as number; if (v && v !== 107) buf[(top + 1) * C + x] = 82; }
}

/** The ids drawn by hand rather than from a paper doll: the rats, the guards, the warden and Grigori. */
const NO_SPEC = new Set(['rat', 'melter', 'guard', 'warden', 'grigori']);

/** key is the actor id, then ":low" for a guard with its shield down, then ":elite", then ":prison" for Hopper in the Telogreika (actor_look.ts). */
function buildSheet(key: string): Sheet {
  const [id, ...flags] = key.split(':') as [string, ...string[]];
  const elite = flags.includes('elite'), low = flags.includes('low');
  const foe = id === 'guard' || id === 'warden';
  const C = foe ? (FOE_CELL[id] as number) : id === 'grigori' ? GRIGORI_CELL : CELL;
  const spec = lookSpec(id, flags) ?? specs.get(id) ?? (NO_SPEC.has(id) ? undefined : specs.get('mike'));
  const roles: Uint8Array[] = [];
  for (const dir of DIRS) {
    const view = dir === 'down' ? 'down' : dir === 'up' ? 'up' : 'side';
    for (const anim of ANIM_ORDER) {
      for (let f = 0; f < POSES[anim].length; f++) {
        const buf = id === 'guard' ? composeGuard(view, anim, f, low) : id === 'warden' ? composeWarden(view, anim, f, low)
          : id === 'grigori' ? composeGrigori(view, anim, f) : id === 'melter' ? composeMelter(view, anim, f)
          : spec ? composeFrame(spec, view, anim, f) : composeRat(view, anim, f);
        if (elite && !foe && id !== 'grigori' && anim !== 'ko') eliteBand(buf, C);
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
  const pal: Record<string, ColorName> = foe ? { ...PALS[id], ...TRIM[id][elite ? 'elite' : 'normal'] }
    : id === 'grigori' ? { ...GRIGORI_PAL } : id === 'melter' ? { ...MELTER_PAL, ...(elite ? { R: 'hot' as ColorName } : {}) }
    : spec ? { ...spec.pal, ...(elite ? { b: 'red', R: 'hot' } : {}) } : { ...RAT_PAL, ...(elite ? { R: 'red' } : {}) };
  return { id: key, cell: C, roles, tops, pal, tints: new Map() };
}

function sheetOf(key: string): Sheet {
  let s = sheets.get(key);
  if (!s) { s = buildSheet(key); sheets.set(key, s); }
  return s;
}

type Mode = 'main' | 'white' | 'faint' | ColorName;

function render(sh: Sheet, mode: Mode): HTMLCanvasElement {
  const C = sh.cell;
  const W = FRAME_COUNT * C, H = DIRS.length * C;
  const px = new Uint32Array(W * H);
  const own = new Uint32Array(128);
  for (const k of Object.keys(sh.pal)) own[k.charCodeAt(0)] = px32(sh.pal[k] as ColorName);
  own[107] = px32('ink');
  const white = px32('white');
  const tint = mode === 'main' || mode === 'white' || mode === 'faint' ? 0 : px32(mode);
  sh.roles.forEach((buf, idx) => {
    const ox = (idx % FRAME_COUNT) * C, oy = ((idx / FRAME_COUNT) | 0) * C;
    for (let y = 0; y < C; y++) {
      for (let x = 0; x < C; x++) {
        const v = buf[y * C + x] as number;
        if (!v) continue;
        let c = own[v] || white;
        if (mode === 'faint' && !ghostKeep(true, x, y, c === own[107])) continue;
        if (mode === 'white') c = white;
        else if (tint && v !== 107 && ((x + y) & 1) === 0) c = tint;
        px[(oy + y) * W + ox + x] = c;
      }
    }
  });
  return canvasFromPixels(px, W, H);
}

function atlasFor(sh: Sheet, v: ActorView): HTMLCanvasElement {
  if (v.hidden && v.kind === 'hero') return sh.faint ?? (sh.faint = render(sh, 'faint'));
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

/** An actor drawn from a frame of its own (actor_kit.ts), cw by ch with its feet on the bottom, with the same shadow, bar and "!" as the others. Returns the row of its head. */
function drawFramed(ctx: Ctx, v: ActorView, f: Frame, cw: number, ch: number, shadow: 'none' | 'small' | 'big' | 'huge'): number {
  const cx = Math.round(v.x), cy = Math.round(v.y), z = Math.max(0, Math.round(v.z));
  const oy = cy - ch - z, head = oy + f.top;
  if (!v.blink) {
    if (shadow !== 'none' && !v.hidden) drawShadow(ctx, cx, cy, z, shadow === 'huge' ? 2 : shadow === 'big' ? 1 : 0);
    ctx.drawImage(f.img, cx - (cw >> 1), oy);
    // A hero's bar is drawn later, on top of the whole scene, by drawHeroBar.
    if (v.bar && v.kind === 'enemy' && !v.hidden) drawHpBar(ctx, cx, head - 5, v.bar.hp, v.bar.hpMax, v.elite === true);
    if (v.confused && v.kind === 'enemy' && !v.hidden) swirl(ctx, cx, head - (v.bar ? 8 : 3), v.t);
  }
  if (v.alert) ctx.drawImage(alertSprite(), cx - 2, head - (v.bar ? 15 : 10) + ((v.t >> 2) & 1));
  return head;
}

const puddles = new Map<number, HTMLCanvasElement>();
function puddleCanvas(step: number): HTMLCanvasElement {
  let c = puddles.get(step);
  if (!c) { c = puddlePx(step).toCanvas(); puddles.set(step, c); }
  return c;
}

/** A dormant Flayed: a puddle of goo where it will stand, breathing. It has no shadow, no bar and is never hit. */
function drawPuddle(ctx: Ctx, v: ActorView): void {
  if (v.blink) return;
  ctx.drawImage(puddleCanvas(puddleStep(v.t)), Math.round(v.x) - (PUDDLE_W >> 1), Math.round(v.y) - PUDDLE_H + 2);
}

/** A Flayed rising out of its puddle: the head comes up first, a row at a time, and the front of the puddle stays over its feet. */
function drawRise(ctx: Ctx, v: ActorView, sh: Sheet): void {
  const C = sh.cell, cx = Math.round(v.x), cy = Math.round(v.y);
  const p = Math.max(0, Math.min(1, v.t / RISE_FRAMES));
  const shift = Math.round((1 - p) * (C - 2));
  const pud = puddleCanvas(puddleStep(v.t));
  const px = cx - (PUDDLE_W >> 1), py = cy - PUDDLE_H + 2;
  ctx.drawImage(pud, px, py);
  if (C - shift > 0) ctx.drawImage(atlasFor(sh, v), FRAME_BASE.idle * C, DIR_ROW[v.dir] * C, C, C - shift, cx - (C >> 1), cy - C + shift, C, C - shift);
  ctx.drawImage(pud, 0, PUDDLE_H - 4, PUDDLE_W, 4, px, py + PUDDLE_H - 4, PUDDLE_W, 4);
}

/** The pit's Demogorgon is the 1.3 sprite as it is, all twelve poses (the owner's call, docs/chapter-4.md): an alias for good, not a stand-in. */
const ALIAS: Partial<Record<string, ActorView['id']>> = { pitdemo: 'demogorgon' };
/** Draws one actor. Feet at v.x, v.y; z lifts the sprite but not its shadow. A hero under the curse and a foe Eddie has marked wear their marks over it; a memory orb the clock marked is lit red instead (actor_orb.ts), so it has no d20. */
export function drawActor(ctx: Ctx, w: ActorView): void {
  const head = drawBody(ctx, w);
  if (head !== null && (w.curse || (w.marked && w.id !== 'orb')) && !w.blink) drawMarks(ctx, w, head);
}

/** The actor itself, without its marks: the row its head is on, or null when it has none to hang a mark on (a puddle, a body that draws its own). */
function drawBody(ctx: Ctx, w: ActorView): number | null {
  const sub = ALIAS[w.id];
  const v: ActorView = sub ? { ...w, id: sub } : w;
  switch (v.id) {
    case 'demogorgon': return drawFramed(ctx, v, demoFrame(v), DEMO_W, DEMO_H, 'big');
    case 'demodog': return drawFramed(ctx, v, dogFrame(v), DOG_W, DOG_H, 'big');
    case 'alpha': return drawFramed(ctx, v, alphaFrame(v), ALPHA_W, ALPHA_H, 'huge');
    case 'billy': return drawFramed(ctx, v, billyFrame(v), BILLY_W, BILLY_H, v.kind === 'npc' ? 'small' : 'big');
    case 'eddie': return drawFramed(ctx, v, eddieFrameOf(v), EDDIE_W, EDDIE_H, 'small');
    case 'ghoul': return drawFramed(ctx, v, ghoulFrameOf(v), GHOUL_W, GHOUL_H, 'small');
    case 'demobat': return drawFramed(ctx, v, batFrameFor(v), BAT_W, BAT_H, 'small');
    case 'vecna': if (v.pose === 'whip' && v.aim && !v.blink) whipWarn(ctx, Math.round(v.x), Math.round(v.y), v.aim.x, v.aim.y, v.t); return drawFramed(ctx, v, vecnaFrameOf(v), VECNA_W, VECNA_H, 'big');
    case 'orb': return drawFramed(ctx, v, orbFrameOf(v), ORB_W, ORB_H, 'none');
    case 'flayer': drawFlayer(ctx, v); return null;
    case 'flayerleg': drawFlayerLeg(ctx, v, drawHpBar); return null;
    case 'vine': { const head = drawFramed(ctx, v, vineFrame(v), PLANT, PLANT, 'none'); if (!v.blink) drawWhip(ctx, v); return head; }
    case 'pod': return drawFramed(ctx, v, podFrame(v), PLANT, PLANT, 'none');
    default: break;
  }
  if (v.puddle) { drawPuddle(ctx, v); return null; }
  const sh = sheetOf(keyOf(v.id, v.guarding, v.elite, v.kind));
  const C = sh.cell;
  const cx = Math.round(v.x), cy = Math.round(v.y);
  const z = Math.max(0, Math.round(v.z));
  const ox = cx - (C >> 1), oy = cy - C - z;
  const row = DIR_ROW[v.dir];
  const head = oy + (sh.tops[row] as number);
  if (v.pose === 'rise' && v.id === 'flayed') { if (!v.blink) drawRise(ctx, v, sh); return null; }
  const bar = v.bar && v.kind === 'enemy';
  if (!v.blink) {
    drawShadow(ctx, cx, cy, z, C > CELL);
    if (v.charge !== undefined && v.charge > 0 && v.kind === 'hero') chargeRing(ctx, cx, cy, v.charge, v.t);
    const [anim, frame] = slotOf(v);
    ctx.drawImage(atlasFor(sh, v), (FRAME_BASE[anim] + frame) * C, row * C, C, C, ox, oy, C, C);
    if (v.strained) drawNosebleed(ctx, v, ox, oy, frame);
    // A hero's bar is drawn later, on top of the whole scene, by drawHeroBar.
    if (bar) drawHpBar(ctx, cx, head - 5, (v.bar as { hp: number }).hp, (v.bar as { hpMax: number }).hpMax, v.elite === true);
    if (v.confused && v.kind === 'enemy') swirl(ctx, cx, head - (bar ? 8 : 3), v.t);
  }
  if (v.alert) ctx.drawImage(alertSprite(), cx - 2, head - (bar ? 15 : 10) + ((v.t >> 2) & 1));
  return head;
}

/** Builds every sheet and the main atlases up front. */
export function warmActors(): void {
  for (const id of ['mike', 'dustin', 'lucas', 'eleven', 'will', 'joyce', 'max', 'steve', 'hopper', 'robin', 'nancy', 'erica', 'agent', 'rat', 'guard', 'warden', 'soldier', 'flayed', 'melter', 'grigori', 'kguard', 'kbaton', 'hopper:prison']) {
    const sh = sheetOf(id);
    sh.main = render(sh, 'main');
  }
  shadowSprite(0, 0); shadowSprite(0, 1); shadowSprite(0, 0, true); shadowSprite(0, 1, true); shadowSprite(0, 0, 2); shadowSprite(0, 1, 2); alertSprite();
}

const ENEMY_IDS = new Set(['agent', 'rat', 'guard', 'warden', 'soldier', 'flayed', 'melter', 'grigori', 'kguard', 'kbaton']);

/** For the sheet scene: draws one raw frame at x, y (top-left). A guard, the warden or a camp guard can have the shield or baton down, any enemy can be an elite, and `prison` picks Hopper's look in place of the chapter's. */
export function drawActorFrame(ctx: Ctx, id: string, dir: Dir, anim: AnimId, frame: number, x: number, y: number, opts: { guarding?: boolean; elite?: boolean; prison?: boolean } = {}): void {
  const sh = sheetOf(keyOf(id, opts.guarding, opts.elite, ENEMY_IDS.has(id) ? 'enemy' : 'hero', opts.prison));
  const C = sh.cell;
  ctx.drawImage(sh.main ?? (sh.main = render(sh, 'main')), (FRAME_BASE[anim] + frame) * C, DIR_ROW[dir] * C, C, C, x, y, C, C);
}
