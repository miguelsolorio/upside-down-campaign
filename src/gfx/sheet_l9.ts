// Sheet pages for level 9 (docs/level-9.md), the food court and Flayed Billy: the court's tiles, painted and at night, a corner of the court
// baked and lit the way the stage is, and the kitchen and the escalator; Billy in every pose in four directions, then the reach (the veins
// fading as it climbs, the free man, the portrait in its six faces) and the flags the game sets. The Mind Flayer is in sheet_l9b.ts.
import type { ActorView, Dir, Expr } from '../core/types.ts';
import type { TileName } from '../core/tiles.ts';
import { SCREEN_H, SCREEN_W, VIEW_TOP } from '../core/config.ts';
import type { Ctx } from './canvas.ts';
import { drawText, drawTinyText } from './font.ts';
import { drawActor } from './actors.ts';
import { paintGlow } from './glow.ts';
import type { Glow } from './glow.ts';
import { nightTile } from './night.ts';
import { PAL } from './palette.ts';
import { drawPortrait } from './ui.ts';
import { drawStage, samplePx } from './tiles.ts';
import { view } from './sheet_a.ts';
import type { Page } from './sheet_a.ts';
import { bake, head } from './sheet_l56b.ts';
import { FOOD_TILES, foodTable } from './tile_food.ts';

// ---------------------------------------------------------------- the food court
const NAMES: TileName[] = [...FOOD_TILES, 'table'];
const nightCache = new Map<string, HTMLCanvasElement>();
const dayCache = new Map<string, HTMLCanvasElement>();
const spot = (v: number): { tx: number; ty: number } => ({ tx: 5 + v * 3, ty: 4 + v * 7 });

/** A tile of the court painted (day) or at night: the table is the court's, on its floor. */
function sample(name: TileName, v: number, night: boolean): HTMLCanvasElement {
  const key = `${name}${v}`, cache = night ? nightCache : dayCache;
  let c = cache.get(key);
  if (!c) {
    const near = { n: 'foodfloor', e: 'foodfloor', s: 'foodfloor', w: 'foodfloor' } as const;
    const day = name === 'table' ? foodTable({ ...spot(v), near }) : samplePx(name, v);
    c = (night ? nightTile(day, name, { ...spot(v), near: { n: name, e: name, s: name, w: name } }) : day).toCanvas();
    cache.set(key, c);
  }
  return c;
}

/** Three variants painted and three at night, five names to a row. */
function index(ctx: Ctx, label: string): void {
  ctx.fillStyle = PAL.night;
  ctx.fillRect(0, 0, SCREEN_W, SCREEN_H);
  drawText(ctx, label, 4, 3, 'bone');
  NAMES.forEach((n, i) => {
    const col = i % 5, cx = 2 + col * 51, cy = 16 + ((i / 5) | 0) * 50;
    for (let v = 0; v < 3; v++) { ctx.drawImage(sample(n, v, false), cx + v * 17, cy); ctx.drawImage(sample(n, v, true), cx + v * 17, cy + 17); }
    drawTinyText(ctx, n.toUpperCase(), cx, cy + 36, 'mist');
  });
}

// Â stall cap, Ã stall, À floor, Á band, Æ sky floor, I table, ¨ goo, Ä kitchen, Ç fryer, Z counter, Å escalator, ` railing, ¢ mall floor.
const COURT = [
  'ÂÂÂÂÂÂÂÂÂÂÂÂÂÂÂÂ',
  'ÃÃÃÃÃÃÃÃÃÃÃÃÃÃÃÃ',
  'ÀÁÁÁÁÁÁÁÁÁÁÁÁÁÁÀ',
  'IÁÀÀÀÀÀÀÀÀÀÀÀÀÁÀ',
  'ÀÁÀÀÆÆÆÆÆÆÀÀÀÀÁI',
  'ÀÁÀÀÆÆÆÆÆÆÀ¨¨ÀÁÀ',
  'IÁÀÀÆÆÆÆÆÆÀ¨¨¨ÁÀ',
  'ÀÁÀÀÀÀÀÀÀÀÀÀ¨ÀÁI',
  'ÀÁÁÁÁÁÁÁÁÁÁÁÁÁÁÀ',
  'IÀÀÀÀÀÀÀIÀÀÀÀÀÀÀ',
];
const KITCHEN = [
  'ÇÇÇÇÇÇÇÇÇÇÇÇÇÇÇÇ',
  'ÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄ',
  'ÄÇÇÄÄÄÄÄÇÇÄÄÄÄÄÄ',
  'ÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄ',
  'ÄÄZZZZZZÄÄZZZZÄÄ',
  'ÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄ',
];
const ESCALATOR = [
  '¢¢¢¢¢`ÅÅ`¢¢¢¢¢¢¢',
  '¢¢¢¢¢`ÅÅ`¢¢¢¢¢¢¢',
  '¢¢¢¢¢`ÅÅ`¢¢¢¢¢¢¢',
  '¢¢¢¢¢`ÅÅ`¢¢¢¢¢¢¢',
  '¢¢¢¢¢`ÅÅ`¢¢¢¢¢¢¢',
];
const LIGHTS: Glow[] = [
  { x: 28, y: 22, r: 30, k: 1 }, { x: 76, y: 22, r: 30, k: 1, flicker: 0.4 }, { x: 124, y: 22, r: 30, k: 1 }, { x: 172, y: 22, r: 30, k: 1, flicker: 0.3 }, { x: 220, y: 22, r: 30, k: 1 },
  { x: 120, y: 88, r: 56, k: 0.7 },
];
const KITCHEN_LIGHTS: Glow[] = [{ x: 24, y: 8, r: 26, k: 0.9, flicker: 0.4 }, { x: 88, y: 8, r: 26, k: 0.9 }, { x: 150, y: 8, r: 26, k: 0.9, flicker: 0.3 }, { x: 48, y: 100, r: 32, k: 0.6 }];
const ESC_LIGHTS: Glow[] = [{ x: 108, y: 20, r: 36, k: 0.8 }, { x: 108, y: 62, r: 36, k: 0.8 }];

const food: Page = {
  title: 'FOOD COURT',
  subs: 3,
  draw(ctx, t, sub) {
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, SCREEN_W, SCREEN_H);
    if (sub === 0) { index(ctx, 'FOOD COURT TILES: PAINTED, THEN AT NIGHT'); drawText(ctx, 'UP DOWN', 4, 214, 'slate'); return; }
    ctx.save();
    ctx.translate(0, VIEW_TOP);
    if (sub === 1) {
      drawStage(ctx, bake('court', COURT), 0, 0, t);
      drawActor(ctx, view('mike', 60, 100, { dir: 'right', anim: 'walk', t }));
      drawActor(ctx, view('eleven', 76, 104, { dir: 'right', anim: 'walk', t }));
      drawActor(ctx, view('flayed', 190, 108, { kind: 'enemy', dir: 'left', anim: 'walk', t }));
      ctx.restore();
      paintGlow(ctx, LIGHTS.map((g) => ({ ...g, y: g.y + VIEW_TOP })), t);
      head(ctx, 'THE COURT AT NIGHT, WITH ITS GOO');
      return;
    }
    drawStage(ctx, bake('kitchen', KITCHEN), 0, 0, t);
    ctx.translate(0, 112);
    drawStage(ctx, bake('esc', ESCALATOR), 0, 0, t);
    ctx.translate(0, -112);
    drawActor(ctx, view('mike', 40, 76, { dir: 'down', anim: 'walk', t }));
    drawActor(ctx, view('robin', 128, 130, { dir: 'up', anim: 'walk', t }));
    ctx.restore();
    paintGlow(ctx, [...KITCHEN_LIGHTS, ...ESC_LIGHTS.map((g) => ({ ...g, y: g.y + 112 }))].map((g) => ({ ...g, y: g.y + VIEW_TOP })), t);
    head(ctx, 'THE KITCHEN AND THE ESCALATOR');
  },
};

// ---------------------------------------------------------------- Billy
const DIRS: Dir[] = ['down', 'up', 'left', 'right'];
type Pose = [string, Partial<ActorView>];
const POSES: Pose[] = [
  ['IDLE', { anim: 'idle' }], ['WALK1', { anim: 'walk', t: 0 }], ['WALK2', { anim: 'walk', t: 14 }], ['JAB UP', { anim: 'attack', alert: true }],
  ['JAB', { anim: 'attack' }], ['CHARGE', { anim: 'attack', pose: 'charge', alert: true }], ['RUN', { anim: 'dash', pose: 'charge' }], ['GRAB', { anim: 'attack', pose: 'grab', alert: true }],
  ['HOLD', { anim: 'attack', pose: 'grab', t: 4 }], ['STUN', { anim: 'hurt', pose: 'stun' }], ['STUN2', { anim: 'hurt', pose: 'stun', t: 8 }], ['HURT', { anim: 'hurt' }],
  ['PINNED', { pose: 'pinned', k: 0 }], ['K HALF', { pose: 'pinned', k: 0.5 }], ['K MOST', { pose: 'pinned', k: 0.8 }], ['FREED', { kind: 'npc' }],
];
const EXPRS: Expr[] = ['neutral', 'happy', 'worried', 'determined', 'hurt', 'shocked'];
const bill = (x: number, y: number, over: Partial<ActorView>): ActorView => view('billy', x, y, { kind: 'enemy', ...over });

const billy: Page = {
  title: 'BILLY',
  subs: 5,
  draw(ctx, t, sub) {
    ctx.fillStyle = PAL.night;
    ctx.fillRect(0, 0, SCREEN_W, SCREEN_H);
    if (sub === 4) {
      drawText(ctx, 'BILLY: THE REACH AND THE FACES', 4, 3, 'white', { shadow: true });
      ctx.fillStyle = PAL.grey1;
      ctx.fillRect(0, 14, SCREEN_W, 78);
      // The reach climbs from 0 to 1 and he is free; the same at twice the size, and Eleven kneeling beside him.
      const k = Math.min(1, (t % 160) / 120);
      ctx.save();
      ctx.scale(2, 2);
      drawActor(ctx, bill(30, 44, { dir: 'right', pose: 'pinned', k }));
      drawActor(ctx, bill(72, 44, { dir: 'down', pose: 'pinned', k }));
      drawActor(ctx, bill(114, 44, { dir: 'right', kind: 'npc' }));
      ctx.restore();
      drawActor(ctx, view('eleven', 100, 84, { dir: 'left', anim: 'cast', t, kind: 'hero' }));
      drawTinyText(ctx, `K ${Math.round(k * 100)}`, 8, 18, 'cream');
      EXPRS.forEach((e, i) => {
        drawPortrait(ctx, 'billy', e, 6 + i * 40, 98);
        drawTinyText(ctx, e.toUpperCase().slice(0, 7), 6 + i * 40, 124, 'mist');
      });
      ctx.fillStyle = PAL.grey1;
      ctx.fillRect(0, 138, SCREEN_W, 66);
      const live: [string, Partial<ActorView>][] = [
        ['PLAIN', { anim: 'walk', t }], ['BAR', { anim: 'idle', t, bar: { hp: 3, hpMax: 5 } }], ['ALERT', { anim: 'attack', alert: true, t }],
        ['FLASH', { anim: 'idle', flash: (t >> 3) & 1 ? 0.8 : 0 }], ['TINT', { anim: 'walk', t, tint: 'purple' }], ['BLINK', { anim: 'idle', blink: (t >> 2) & 1 ? true : false }],
      ];
      live.forEach(([name, over], i) => {
        const x = 24 + i * 40;
        drawActor(ctx, bill(x, 184, { dir: 'down', ...over }));
        drawTinyText(ctx, name, x - ((name.length * 4 - 1) >> 1), 188, 'mist');
      });
      drawText(ctx, 'THE FREE MAN: THE LIFEGUARD', 4, 212, 'slate');
      drawText(ctx, 'UP DOWN', 200, 3, 'slate');
      return;
    }
    const dir = DIRS[sub] as Dir, w = 32;
    drawText(ctx, `BILLY FACING ${dir.toUpperCase()}`, 4, 3, 'white', { shadow: true });
    const per = Math.floor(SCREEN_W / w);
    POSES.forEach(([name, over], i) => {
      const col = i % per, row = (i / per) | 0, x = 4 + col * w + (w >> 1), y = 38 + row * 44;
      ctx.fillStyle = PAL.grey1;
      ctx.fillRect(x - (w >> 1) + 1, y - 27, w - 2, 36);
      drawActor(ctx, bill(x, y, { dir, t: 0, ...over }));
      drawTinyText(ctx, name, x - ((name.length * 4 - 1) >> 1), y + 3, 'mist');
    });
    // Three of them at twice the size, for the shapes, beside Steve and Max for scale.
    ctx.save();
    ctx.scale(2, 2);
    [4, 5, 12].forEach((i, n) => drawActor(ctx, bill(24 + n * 34, 100, { dir, t: 0, ...(POSES[i] as Pose)[1] })));
    ctx.restore();
    drawActor(ctx, view('steve', 150, 198, { dir, kind: 'npc' }));
    drawActor(ctx, view('max', 174, 198, { dir, kind: 'npc' }));
    drawActor(ctx, bill(206, 198, { dir, anim: 'idle' }));
    drawTinyText(ctx, 'STEVE', 142, 202, 'mist'); drawTinyText(ctx, 'MAX', 168, 202, 'mist'); drawTinyText(ctx, 'BILLY', 196, 202, 'mist');
    drawText(ctx, 'LIFEGUARD: 24 BY 24', 4, 212, 'slate');
    drawText(ctx, 'UP DOWN', 200, 3, 'slate');
  },
};

export const L9_PAGES: Page[] = [food, billy];
