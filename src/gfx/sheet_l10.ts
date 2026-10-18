// Sheet pages for level 10 (docs/level-10.md), stage 4.1, Kamchatka: Hopper in both looks, the Uniform he wore through chapter 3 and the
// Telogreika from chapter 4, in every frame and facing and in the six faces of his portrait; the two guards, the rifle guard and the camp
// guard with his block and his lowered stance; and the camp's and the pit's tiles, painted and at night, then the yard, the block and the
// pit baked and lit the way the stage is. The Demogorgon in the pit is the 1.3 sprite as it is.
import type { AnimId, Dir, Expr } from '../core/types.ts';
import type { TileName } from '../core/tiles.ts';
import { SCREEN_H, SCREEN_W, VIEW_TOP } from '../core/config.ts';
import type { Ctx } from './canvas.ts';
import { drawText, drawTinyText } from './font.ts';
import { drawActor, drawActorFrame } from './actors.ts';
import { drawProp } from './props.ts';
import { paintGlow } from './glow.ts';
import type { Glow } from './glow.ts';
import { hopperInPrison, setLookStage } from './looks.ts';
import { nightTile } from './night.ts';
import { PAL } from './palette.ts';
import { drawPortrait } from './ui.ts';
import { drawStage, samplePx } from './tiles.ts';
import type { BakedStage } from './tiles.ts';
import { view } from './sheet_a.ts';
import type { Page } from './sheet_a.ts';
import { bake, head, prop } from './sheet_l56b.ts';
import { CAMP_TILES, campBarrel } from './tile_camp.ts';
import { PIT_TILES, lanternAt, pitTile } from './tile_pit.ts';

const DIRS: Dir[] = ['down', 'up', 'left', 'right'];
const EXPRS: Expr[] = ['neutral', 'happy', 'worried', 'determined', 'hurt', 'shocked'];

/** Runs a draw as chapter 4 does it, Hopper in the Telogreika whatever stage the sheet is on, and puts the look back after. */
function inPrison(draw: () => void): void {
  const was = hopperInPrison();
  setLookStage('4.1');
  draw();
  setLookStage(was ? '4.1' : '1.1');
}

type Frame = [AnimId, number];
/** Hopper's frames: two idle, four walk, the wind-up and the swing, hurt and down. */
const HOPPER_FRAMES: Frame[] = [['idle', 0], ['idle', 1], ['walk', 0], ['walk', 1], ['walk', 2], ['walk', 3], ['attack', 0], ['attack', 1], ['hurt', 0], ['ko', 0]];
/** A guard's: idle, three of the walk, the wind-up (the aim) and the blow (the shot), hurt and down. */
const GUARD_FRAMES: Frame[] = [['idle', 0], ['walk', 0], ['walk', 1], ['walk', 2], ['attack', 0], ['attack', 1], ['hurt', 0], ['ko', 0]];

/** A row of raw frames at 1x, 24 px apart, starting at x. */
function strip(ctx: Ctx, id: string, dir: Dir, frames: Frame[], x: number, y: number, opts: { guarding?: boolean; prison?: boolean } = {}): void {
  frames.forEach(([anim, f], i) => drawActorFrame(ctx, id, dir, anim, f, x + i * 24, y, opts));
}

/** Frames at 3x, 56 px apart. Positions stay on whole multiples of three so the scale stays crisp. */
function big(ctx: Ctx, id: string, dir: Dir, frames: Frame[], x: number, y: number, opts: { guarding?: boolean; prison?: boolean } = {}): void {
  ctx.save();
  ctx.scale(3, 3);
  frames.forEach(([anim, f], i) => drawActorFrame(ctx, id, dir, anim, f, Math.round((x + i * 57) / 3), Math.round(y / 3), opts));
  ctx.restore();
}

const label = (ctx: Ctx, text: string, x: number, y: number): void => { drawTinyText(ctx, text, x, y, 'mist'); };

// ---------------------------------------------------------------- Hopper
const hopper: Page = {
  title: 'HOPPER IN KAMCHATKA',
  subs: 5,
  draw(ctx, _t, sub) {
    ctx.fillStyle = PAL.grey1;
    ctx.fillRect(0, 0, SCREEN_W, SCREEN_H);
    if (sub === 4) {
      drawText(ctx, 'HOPPER: THE SIX FACES IN BOTH LOOKS', 4, 3, 'white', { shadow: true });
      [false, true].forEach((prison, r) => {
        label(ctx, prison ? 'TELOGREIKA CHAPTER 4 ON' : 'UNIFORM CHAPTERS 1 TO 3', 8, 20 + r * 62);
        EXPRS.forEach((e, i) => {
          drawPortrait(ctx, 'hopper', e, 8 + i * 40, 28 + r * 62, false, prison);
          label(ctx, e.toUpperCase().slice(0, 7), 8 + i * 40, 54 + r * 62);
        });
      });
      drawText(ctx, 'THE HUD AND THE DIALOGUE FOLLOW THE CHAPTER', 4, 212, 'slate');
      return;
    }
    const dir = DIRS[sub] as Dir;
    drawText(ctx, `HOPPER FACING ${dir.toUpperCase()}`, 4, 3, 'white', { shadow: true });
    label(ctx, 'UNIFORM CHAPTERS 1 TO 3', 8, 16);
    strip(ctx, 'hopper', dir, HOPPER_FRAMES, 8, 22, { prison: false });
    label(ctx, 'TELOGREIKA CHAPTER 4 ON', 8, 44);
    strip(ctx, 'hopper', dir, HOPPER_FRAMES, 8, 50, { prison: true });
    const keys: Frame[] = [['idle', 0], ['walk', 1], ['attack', 0], ['attack', 1]];
    big(ctx, 'hopper', dir, keys, 9, 84, { prison: false });
    big(ctx, 'hopper', dir, keys, 9, 138, { prison: true });
    drawText(ctx, 'UP DOWN FACING', 4, 212, 'slate');
  },
};

// ---------------------------------------------------------------- the guards
const guards: Page = {
  title: 'KAMCHATKA GUARDS',
  subs: 3,
  draw(ctx, t, sub) {
    ctx.fillStyle = PAL.grey1;
    ctx.fillRect(0, 0, SCREEN_W, SCREEN_H);
    if (sub === 0) {
      drawText(ctx, 'THE RIFLE GUARD: GREATCOAT', 4, 3, 'white', { shadow: true });
      DIRS.forEach((dir, r) => { label(ctx, dir.toUpperCase(), 2, 22 + r * 18 + 6); strip(ctx, 'kguard', dir, GUARD_FRAMES, 24, 16 + r * 18); });
      label(ctx, 'IDLE WALK3 AIM SHOT HURT DOWN', 24, 90);
      big(ctx, 'kguard', 'down', [['idle', 0], ['attack', 0]], 9, 108);
      big(ctx, 'kguard', 'right', [['attack', 0], ['attack', 1]], 123, 108);
      drawText(ctx, 'UP DOWN', 4, 212, 'slate');
      return;
    }
    if (sub === 1) {
      drawText(ctx, 'THE CAMP GUARD: BLOCK AND LOWERED', 4, 3, 'white', { shadow: true });
      [true, false].forEach((up, r) => {
        label(ctx, up ? 'GUARDING BATON ACROSS HIS BODY' : 'LOWERED RECOVERING BROKEN OR STUNNED', 4, 14 + r * 78);
        DIRS.forEach((dir, d) => strip(ctx, 'kbaton', dir, GUARD_FRAMES, 24, 20 + r * 78 + d * 14, { guarding: up }));
      });
      big(ctx, 'kbaton', 'down', [['idle', 0]], 9, 168, { guarding: true });
      big(ctx, 'kbaton', 'right', [['idle', 0]], 66, 168, { guarding: true });
      big(ctx, 'kbaton', 'down', [['idle', 0]], 123, 168, { guarding: false });
      big(ctx, 'kbaton', 'right', [['idle', 0]], 180, 168, { guarding: false });
      return;
    }
    // In the snow: Hopper against the two, the rifle guard aiming and the camp guard with his block up, and one stunned.
    ctx.save();
    ctx.translate(0, VIEW_TOP);
    const stage = bake('l10yard', YARD);
    drawStage(ctx, stage, 0, 0, t);
    drawProp(ctx, prop('floodlight', 'f', 40, 28, 16, 16, 'open', t), true);
    inPrison(() => {
      drawActor(ctx, view('hopper', 60, 150, { kind: 'hero', dir: 'right', anim: 'walk', t, bar: { hp: 3, hpMax: 5 } }));
      drawActor(ctx, view('kguard', 168, 86, { kind: 'enemy', dir: 'left', anim: 'attack', alert: true, t }));
      drawActor(ctx, view('kbaton', 150, 140, { kind: 'enemy', dir: 'left', anim: 'walk', guarding: true, t }));
      drawActor(ctx, view('kbaton', 100, 100, { kind: 'enemy', dir: 'down', anim: 'hurt', guarding: false, t, tint: 'yellow' }));
    });
    ctx.restore();
    paintGlow(ctx, lights(stage, [FLOOD]), t);
    head(ctx, 'THE YARD: HOPPER AND THE GUARDS');
  },
};

// ---------------------------------------------------------------- the camp and the pit
const nightCache = new Map<string, HTMLCanvasElement>();
const dayCache = new Map<string, HTMLCanvasElement>();
const spot = (v: number): { tx: number; ty: number } => ({ tx: 5 + v * 3, ty: 4 + v * 7 });

/** A tile painted (day) or at night, three variants by place. */
function sample(name: TileName, v: number, night: boolean): HTMLCanvasElement {
  const key = `${name}${v}`, cache = night ? nightCache : dayCache;
  let c = cache.get(key);
  if (!c) {
    const day = samplePx(name, v);
    c = (night ? nightTile(day, name, { ...spot(v), near: { n: name, e: name, s: name, w: name } }) : day).toCanvas();
    cache.set(key, c);
  }
  return c;
}

/** A pit wall with a lantern on it, found by looking along the wall for the place the position puts one. */
function lanternWall(): { tx: number; ty: number } {
  for (let tx = 1; tx < 40; tx++) if (lanternAt(pitTile('pitwall', { tx, ty: 3, near: { n: 'pitcap', e: 'pitwall', s: 'pitfloor', w: 'pitwall' } }) as never)) return { tx, ty: 3 };
  return { tx: 1, ty: 3 };
}

/** Three variants painted and three at night, five names to a row, then the drum's four steps of fire and the pit's lantern. */
function index(ctx: Ctx, names: TileName[], text: string, extra: boolean): void {
  ctx.fillStyle = PAL.night;
  ctx.fillRect(0, 0, SCREEN_W, SCREEN_H);
  drawText(ctx, text, 4, 3, 'bone');
  names.forEach((n, i) => {
    const col = i % 5, cx = 2 + col * 51, cy = 16 + ((i / 5) | 0) * 50;
    for (let v = 0; v < 3; v++) { ctx.drawImage(sample(n, v, false), cx + v * 17, cy); ctx.drawImage(sample(n, v, true), cx + v * 17, cy + 17); }
    drawTinyText(ctx, n.toUpperCase(), cx, cy + 36, 'mist');
  });
  if (!extra) return;
  const near = { n: 'snow', e: 'snow', s: 'snow', w: 'snow' } as const;
  const at = { tx: 6, ty: 5, near };
  for (let p = 0; p < 4; p++) {
    const day = campBarrel(at, p);
    ctx.drawImage(day.toCanvas(), 4 + p * 20, 172);
    ctx.drawImage(nightTile(day, 'barrel', at).toCanvas(), 4 + p * 20, 190);
  }
  drawTinyText(ctx, 'THE DRUM IN FOUR STEPS OF FIRE', 4, 209, 'mist');
}

/** The pit's lantern wall at 1x beside the same wall with no lantern, day and night. */
function lantern(ctx: Ctx): void {
  const { tx, ty } = lanternWall();
  const c = { tx, ty, near: { n: 'pitcap', e: 'pitwall', s: 'pitfloor', w: 'pitwall' } } as const;
  const day = pitTile('pitwall', c) as ReturnType<typeof samplePx>;
  ctx.drawImage(day.toCanvas(), 120, 172);
  ctx.drawImage(nightTile(day, 'pitwall', c).toCanvas(), 120, 190);
  drawTinyText(ctx, 'LANTERN WALL', 120, 209, 'mist');
}

// È snow, É drift, Ê path, Ë wire, Ì cap, Í wall, Î cell door, Ï floor, Ð grate, Ñ crates, Ò drum; Ó pit rim, Ô pit wall, Õ pit floor, Ö barricade.
/** A row of the yard: wire at both ends, snow to fill. */
const side = (inner: string): string => `Ë${inner.padEnd(14, 'È')}Ë`;
export const YARD = [
  'Ë'.repeat(16), side(''), side('ÈÉÉÉÈÈÈÈÈÈÈÒ'), side(''), side('ÈÈÈÊÊÊÊÊÊÊÊ'), side('ÈÉÉ'),
  side('ÈÉÉÈÈÈÈÑÑ'), side(''), side('ÈÈÒ'), side('ÈÈÈÈÈÈÈÈÈÈÈÑ'), side(''), 'Ë'.repeat(16),
];
export const BLOCK = [
  'ÌÌÌÌÌÌÌÌÌÌÌÌÌÌÌÌ', 'ÍÎÎÍÍÎÎÍÍÎÎÍÍÍÍÍ', 'ÏÏÏÏÏÏÏÏÏÏÏÏÏÏÏÏ', 'ÏÏÏÏÐÏÏÏÏÏÏÏÏÒÏÏ', 'ÏÏÏÏÏÏÏÏÏÏÏÏÏÏÏÏ', 'ÏÏÑÑÏÏÏÏÏÏÏÏÏÐÏÏ',
  'ÏÏÏÏÏÏÏÏÏÏÏÏÏÏÏÏ', 'ÌÌÌÌÌÌÌÌÌÌÌÌÌÌÌÌ', 'ÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍ', 'ÈÈÈÈÈÈÈÈÈÈÈÈÈÈÈÈ', 'ÈÈÈÈÊÊÊÈÈÈÈÈÈÈÈÈ', 'ÈÈÈÈÈÈÈÈÈÈÈÈÈÈÈÈ',
];
export const PIT = [
  'ÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓ', 'ÓÓÔÔÔÔÔÔÔÔÔÔÔÔÓÓ', 'ÓÓÔÔÔÔÔÖÖÔÔÔÔÔÓÓ', 'ÓÓÔÔÔÔÔÖÖÔÔÔÔÔÓÓ', 'ÓÓÕÕÕÕÕÕÕÕÕÕÕÕÓÓ', 'ÓÓÕÕÕÕÕÕÕÕÕÕÕÕÓÓ',
  'ÓÓÕÕÕÕÕÕÕÕÕÕÕÕÓÓ', 'ÓÓÕÕÕÕÕÕÕÕÕÕÕÕÓÓ', 'ÓÓÕÕÕÕÕÕÕÕÕÕÕÕÓÓ', 'ÓÓÕÕÕÕÕÕÕÕÕÕÕÕÓÓ', 'ÓÓÕÕÕÕÕÕÕÕÕÕÕÕÓÓ', 'ÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓ',
];
/** The floodlight's pool, over the one prop in the yard; the drums and the lanterns come from the baked stage's own windows. */
const FLOOD: Glow = { x: 48, y: 30 + VIEW_TOP, r: 64, k: 1.15, flicker: 0.1 };
const lights = (stage: BakedStage, extra: Glow[] = []): Glow[] => [...stage.windows.map((w) => ({ x: w.x, y: w.y + VIEW_TOP, r: 30, k: 1.1 })), ...extra];

const camp: Page = {
  title: 'KAMCHATKA CAMP',
  subs: 3,
  draw(ctx, t, sub) {
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, SCREEN_W, SCREEN_H);
    if (sub === 0) { index(ctx, CAMP_TILES, 'THE CAMP: PAINTED, THEN AT NIGHT', true); drawText(ctx, 'UP DOWN', 200, 3, 'slate'); return; }
    const rows = sub === 1 ? YARD : BLOCK, key = sub === 1 ? 'l10yard' : 'l10block';
    ctx.save();
    ctx.translate(0, VIEW_TOP);
    const stage = bake(key, rows);
    drawStage(ctx, stage, 0, 0, t);
    if (sub === 1) {
      drawProp(ctx, prop('floodlight', 'f', 40, 28, 16, 16, 'open', t), true);
      drawProp(ctx, prop('floodlight', 'g', 196, 100, 16, 16, 'open', t), true);
      inPrison(() => drawActor(ctx, view('hopper', 100, 120, { kind: 'hero', dir: 'right', anim: 'walk', t })));
    } else {
      inPrison(() => drawActor(ctx, view('hopper', 56, 100, { kind: 'hero', dir: 'up', anim: 'idle', t })));
      drawActor(ctx, view('kbaton', 150, 96, { kind: 'enemy', dir: 'left', anim: 'walk', guarding: true, t }));
      drawActor(ctx, view('kguard', 210, 120, { kind: 'enemy', dir: 'left', anim: 'idle', t }));
    }
    ctx.restore();
    paintGlow(ctx, lights(stage, sub === 1 ? [FLOOD, { x: 204, y: 102 + VIEW_TOP, r: 64, k: 1.15 }] : []), t);
    head(ctx, sub === 1 ? 'THE YARD: SNOW, WIRE, DRIFTS, DRUMS' : 'THE BLOCK: CELL DOORS AND A GRATE');
  },
};

const pit: Page = {
  title: 'THE PIT',
  subs: 2,
  draw(ctx, t, sub) {
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, SCREEN_W, SCREEN_H);
    if (sub === 0) { index(ctx, PIT_TILES, 'THE PIT: PAINTED, THEN AT NIGHT', false); lantern(ctx); drawText(ctx, 'UP DOWN', 200, 3, 'slate'); return; }
    ctx.save();
    ctx.translate(0, VIEW_TOP);
    const stage = bake('l10pit', PIT);
    drawStage(ctx, stage, 0, 0, t);
    drawActor(ctx, view('pitdemo', 128, 98, { kind: 'enemy', dir: 'down', anim: 'idle', t }));
    inPrison(() => drawActor(ctx, view('hopper', 128, 160, { kind: 'hero', dir: 'up', anim: 'idle', t })));
    ctx.restore();
    paintGlow(ctx, lights(stage), t);
    head(ctx, 'THE PIT: BARRICADE AND LANTERNS');
  },
};

export const L10_PAGES: Page[] = [hopper, guards, camp, pit];
