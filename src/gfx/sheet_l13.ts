// Sheet pages for level 13 (docs/level-13.md), stage 4.4: the Creel House in its Upside Down skin, its tiles painted and at night and then the house
// baked with its window flashing red and its veins pulsing; Vecna's attic in Vine nest, its five tiles and then the room baked with the knot of vines
// over the middle and the roots under it, the clock, the four orbs (one marked), Vecna floating over them and a hero; Vecna himself, Rooted, in every
// pose at twice his size over his shadow, the tendrils' loop of eight, his portrait and the orb in its three looks; and the effects at every step of
// their life. Everything is baked and drawn the way the stage is, so it shows what it will.
import type { ActorView, Expr } from '../core/types.ts';
import type { TileName } from '../core/tiles.ts';
import { SCREEN_H, SCREEN_W, VIEW_TOP } from '../core/config.ts';
import type { Ctx } from './canvas.ts';
import { drawText, drawTinyText } from './font.ts';
import { drawActor } from './actors.ts';
import { drawFx } from './fx.ts';
import { drawProp } from './props.ts';
import { nightTile } from './night.ts';
import { PAL } from './palette.ts';
import type { Px } from './px.ts';
import { drawPortrait } from './ui.ts';
import { bakeStage, drawStage } from './tiles.ts';
import type { BakedStage } from './tiles.ts';
import { view } from './sheet_a.ts';
import type { Page } from './sheet_a.ts';
import { prop } from './sheet_l56b.ts';
import { HOUSE } from './sheet_l11.ts';
import { ATTIC_TILES, ORB_AT, atticNear, atticTile } from './tile_attic.ts';
import { CREEL_TILES, creelNear, creelTile } from './tile_creel.ts';
import { windowPhase } from './tile_club.ts';

const label = (ctx: Ctx, text: string, x: number, y: number): void => { drawTinyText(ctx, text, x, y, 'mist'); };
const wipe = (ctx: Ctx, color: keyof typeof PAL): void => { ctx.fillStyle = PAL[color]; ctx.fillRect(0, 0, SCREEN_W, SCREEN_H); };
const around = (n: TileName): { n: TileName; e: TileName; s: TileName; w: TileName } => ({ n, e: n, s: n, w: n });
const spot = (v: number): { tx: number; ty: number } => ({ tx: 5 + v * 3, ty: 4 + v * 7 });

/** The attic as a stage: the roof and its knee wall, the eaves, the floor, the rug where he stands, in the stage's letters (core/tiles.ts): Ć roof, ć wall, Ĉ floor, ĉ rug, Ċ eave. The rows beyond the eaves are roof, as the stage has them. */
export const ATTIC = ['ĆĆĆĆĆĆĆĆĆĆĆĆĆĆĆĆĆĆ', 'ćććććććććććććććććć', ...Array.from({ length: 8 }, (_, y) => `ĆĊĊĊĈĈ${y >= 2 && y < 6 ? 'ĉĉĉĉĉĉ' : 'ĈĈĈĈĈĈ'}ĈĈĊĊĊĆ`)];

const baked = new Map<string, BakedStage>();
/** A stage baked at night in the Upside Down skin, once. */
function bake(key: string, rows: string[]): BakedStage {
  let b = baked.get(key);
  if (!b) { b = bakeStage(rows, true, 'upside'); baked.set(key, b); }
  return b;
}

const head = (ctx: Ctx, text: string): void => {
  ctx.fillStyle = PAL.ink;
  ctx.fillRect(0, 0, SCREEN_W, VIEW_TOP);
  drawText(ctx, text, 6, 6, 'white');
  drawText(ctx, 'UP DOWN', 4, 214, 'slate');
};

// ---------------------------------------------------------------- the tiles
const cache = new Map<string, HTMLCanvasElement>();

/** A tile of the house in the Upside Down skin, or of the attic, at night, three variants by place, with the veins at a step of their pulse. */
function sample(name: TileName, v: number, phase: number): HTMLCanvasElement {
  const attic = ATTIC_TILES.includes(name), key = `${name}${v}${attic ? '' : phase}`;
  let c = cache.get(key);
  if (!c) {
    const near = attic ? atticNear(name, v, around(name)) : creelNear(name, v, around(name)), tc = { ...spot(v), near };
    const day = (attic ? atticTile(name, tc) : creelTile(name, tc, 'upside', phase)) as Px;
    c = nightTile(day, name, tc).toCanvas();
    cache.set(key, c);
  }
  return c;
}

/** Three variants at night under the names, five to a row. */
function index(ctx: Ctx, names: TileName[], text: string, t: number): void {
  wipe(ctx, 'night');
  drawText(ctx, text, 4, 3, 'bone');
  const phase = (t >> 4) & 3;
  names.forEach((n, i) => {
    const cx = 2 + (i % 5) * 51, cy = 18 + ((i / 5) | 0) * 40;
    for (let v = 0; v < 3; v++) ctx.drawImage(sample(n, v, phase), cx + v * 17, cy);
    drawTinyText(ctx, n.toUpperCase(), cx, cy + 19, 'mist');
  });
  drawText(ctx, 'UP DOWN', 200, 3, 'slate');
}

// ---------------------------------------------------------------- the house
const house: Page = {
  title: 'THE CREEL HOUSE: UPSIDE DOWN',
  subs: 2,
  draw(ctx, t, sub) {
    wipe(ctx, 'black');
    if (sub === 0) { index(ctx, CREEL_TILES, 'THE UPSIDE DOWN SKIN, AT NIGHT', t); label(ctx, 'THE VEINS PULSE IN FOUR STEPS', 4, 112); return; }
    ctx.save();
    ctx.translate(0, VIEW_TOP);
    drawStage(ctx, bake('l13house', HOUSE), 0, 0, t);
    drawProp(ctx, prop('clock', 'clock_attic', 224, 0, 16, 32, 'closed', t), true);
    drawActor(ctx, view('max', 110, 100, { dir: 'up', anim: 'walk', t }));
    drawActor(ctx, view('mike', 150, 130, { dir: 'left', anim: 'idle', t }));
    ctx.restore();
    head(ctx, 'THE HOUSE: THE WINDOW FLASHES RED');
    label(ctx, `WINDOW STEP ${windowPhase(t)}`, 190, 214);
  },
};

// ---------------------------------------------------------------- the attic
const attic: Page = {
  title: "VECNA'S ATTIC: VINE NEST",
  subs: 2,
  draw(ctx, t, sub) {
    wipe(ctx, 'black');
    if (sub === 0) { index(ctx, ATTIC_TILES, 'VINE NEST, AT NIGHT', t); label(ctx, 'ROOF, KNEE WALL, FLOOR, RUG, EAVE', 4, 112); return; }
    ctx.save();
    ctx.translate(-16, VIEW_TOP);
    drawStage(ctx, bake('l13attic', ATTIC), 16, 0, t);
    // The rug is tiles 6 to 11 across and 4 to 7 down: the orbs stand at its four corners, the clock on the wall, Vecna floating in the knot.
    const x0 = 6 * 16, x1 = 12 * 16, y0 = 4 * 16, y1 = 8 * 16;
    const feet: [number, number][] = [[x0 - ORB_AT.x, y0 + ORB_AT.top], [x1 + ORB_AT.x, y0 + ORB_AT.top], [x0 - ORB_AT.x, y1 + ORB_AT.bottom], [x1 + ORB_AT.x, y1 + ORB_AT.bottom]];
    drawProp(ctx, prop('clock', 'clock_attic', 40, 8, 16, 32, 'closed', t), true);
    feet.forEach(([x, y], i) => drawActor(ctx, view('orb', x, y + 1, { kind: 'enemy', t: t + i * 9, marked: i === 1 })));
    drawActor(ctx, view('vecna', (x0 + x1) / 2, y0 + 40, { kind: 'enemy', pose: 'float', z: 24, t }));
    drawActor(ctx, view('max', (x0 + x1) / 2, y1 + 22, { dir: 'up', anim: 'idle', t }));
    ctx.restore();
    head(ctx, 'THE ATTIC: THE KNOT, THE ROOTS, THE ORBS');
  },
};

// ---------------------------------------------------------------- Vecna
type Pose = [string, Partial<ActorView>];
const FLOOR_PAL: (keyof typeof PAL)[] = ['soil0', 'night'];

/** Three poses at twice their size on a floor, their names under them. `blaze` lights the burning one with the fire effect over it. */
function poses(ctx: Ctx, t: number, list: Pose[], text: string): void {
  wipe(ctx, 'ink');
  drawText(ctx, text, 4, 3, 'white', { shadow: true });
  list.forEach(([name, over], i) => {
    const x = 4 + i * 82;
    ctx.fillStyle = PAL[FLOOR_PAL[i & 1] as keyof typeof PAL];
    ctx.fillRect(x, 16, 78, 190);
    ctx.save();
    ctx.scale(2, 2);
    const cx = (x + 39) / 2, aim = over.pose === 'whip' ? { aim: { x: cx - 16, y: 96 }, t: 8 + (t % 16) } : {};
    drawActor(ctx, view('vecna', cx, 94, { kind: 'enemy', t, ...over, ...aim }));
    if (over.pose === 'burn') drawFx(ctx, { kind: 'blaze', x: cx, y: 94, dir: 'down', angle: 0, t, life: 999999, w: 28, h: 40 });
    ctx.restore();
    label(ctx, name, x + 4, 196);
  });
}

const POSE_SETS: Pose[][] = [
  [['STAND', {}], ['WALK', { anim: 'walk', t: 0 }], ['CURSE', { pose: 'curse' }]],
  [['WHIP', { pose: 'whip' }], ['FLOAT', { pose: 'float', z: 12 }], ['THROW', { pose: 'throw', z: 12 }]],
  [['BURN AND BLAZE', { pose: 'burn' }], ['STUN: AN ORB BROKE', { pose: 'stun' }], ['HURT', { anim: 'hurt' }]],
];

const vecna: Page = {
  title: 'VECNA: ROOTED',
  subs: 5,
  draw(ctx, t, sub) {
    if (sub < 3) { poses(ctx, t, POSE_SETS[sub] as Pose[], sub === 0 ? 'VECNA: THE CLOCK, TWICE LIFE SIZE' : sub === 1 ? 'VECNA: THE WHIP AND THE FLOAT' : 'VECNA: THE BURN, THE STUN, THE HURT'); return; }
    wipe(ctx, 'ink');
    if (sub === 3) {
      drawText(ctx, 'THE TENDRILS: A LOOP OF EIGHT UNDER EVERY POSE', 4, 3, 'white', { shadow: true });
      ctx.fillStyle = PAL.soil0;
      ctx.fillRect(0, 16, SCREEN_W, 96);
      ctx.fillRect(0, 118, SCREEN_W, 96);
      for (let f = 0; f < 8; f++) {
        drawActor(ctx, view('vecna', 22 + f * 32, 100, { kind: 'enemy', t: f * 6 }));
        drawActor(ctx, view('vecna', 22 + f * 32, 204, { kind: 'enemy', pose: 'float', z: 4, t: f * 6 }));
      }
      label(ctx, 'STAND, THEN FLOAT, STEPS 1 TO 8; THEY NEVER STOP', 4, 206);
      return;
    }
    drawText(ctx, 'THE FACES AND THE MEMORY ORB', 4, 3, 'white', { shadow: true });
    (['neutral', 'happy', 'worried', 'determined', 'hurt', 'shocked'] as Expr[]).forEach((e, i) => {
      const x = 4 + (i % 3) * 42, y = 18 + ((i / 3) | 0) * 40;
      drawPortrait(ctx, 'vecna', e, x, y);
      label(ctx, e.toUpperCase(), x, y + 26);
    });
    ctx.fillStyle = PAL.soil0;
    ctx.fillRect(130, 16, 122, 70);
    ctx.save();
    ctx.scale(2, 2);
    ([['STANDING', {}], ['MARKED', { marked: true }], ['SEVERED', { pose: 'severed' }]] as [string, Partial<ActorView>][]).forEach(([, over], i) => drawActor(ctx, view('orb', 78 + i * 20, 40, { kind: 'enemy', t, ...over })));
    ctx.restore();
    ['STANDING', 'MARKED', 'SEVERED'].forEach((n, i) => label(ctx, n, 134 + i * 40, 76));
    label(ctx, 'THE ORB: LIT RED WHEN THE CLOCK MARKS IT, A STALK WHEN BROKEN', 4, 100);
    ctx.fillStyle = PAL.soil0;
    ctx.fillRect(0, 112, SCREEN_W, 100);
    ([20, 40, 56, 80] as number[]).map((t) => ({ anim: 'ko' as const, t })).forEach((over, i) => drawActor(ctx, view('vecna', 30 + i * 52, 190, { kind: 'enemy', ...over })));
    label(ctx, 'HIS KO: THE STUN THINNING OUT', 4, 200);
  },
};

// ---------------------------------------------------------------- the effects
const EFFECTS: [string, 'debris' | 'whip' | 'blaze', number, number, number][] = [
  ['DEBRIS: A ROCK LOBBED ONTO ITS MARK, THEN THE SPLASH', 'debris', 40, 20, 9], ['WHIP: A VINE LASH, 60 PX', 'whip', 10, 60, 7], ['BLAZE: THE FIRE OVER HIM', 'blaze', 30, 28, 7],
];

const effects: Page = {
  title: "VECNA'S EFFECTS",
  subs: 1,
  draw(ctx) {
    wipe(ctx, 'night');
    drawText(ctx, 'DEBRIS, WHIP, BLAZE', 4, 3, 'white', { shadow: true });
    EFFECTS.forEach(([name, kind, life, w, n], r) => {
      const y = 18 + r * 66, pitch = kind === 'whip' ? 36 : kind === 'blaze' ? 36 : 28;
      label(ctx, name, 4, y);
      for (let i = 0; i < n; i++) {
        const t = Math.round((i / (n - 1)) * life * 0.97), x = kind === 'whip' ? 8 + i * pitch : 18 + i * pitch, yy = y + (kind === 'whip' ? 36 : kind === 'blaze' ? 58 : 44);
        ctx.fillStyle = PAL.soil0;
        ctx.fillRect(x - 14, y + 8, kind === 'whip' ? 34 : 28, 54);
        if (kind === 'blaze') drawActor(ctx, view('vecna', x, y + 58, { kind: 'enemy', pose: 'burn' }));
        drawFx(ctx, { kind, x, y: yy, dir: 'right', angle: 0, t, life, w, h: kind === 'blaze' ? 40 : 8 });
      }
    });
  },
};

export const L13_PAGES: Page[] = [house, attic, vecna, effects];
