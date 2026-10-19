// Sheet pages for level 12 (docs/level-12.md), stage 4.3: Upside Down Hawkins in the owner's Blue storm. The street's tiles (the roofs, the
// house fronts with their windows and doors, the yard, the walk, the road, the veins) and the park's (the trailer, the fence, the tree, the
// roof deck and its lip), three variants each, by night and as a bolt lights them, with the veins pulsing; the street baked and lit by a bolt
// every few seconds (the flash bake faded over the night one, as the play scene does it) with a hero and the flock; the trailer park beside
// the roof of Eddie's trailer, with Eddie planted in the middle of the deck and the demobats circling him; and the demobat, its poses over
// its shadow and then a flock over the street. Everything is baked and drawn the way the stage is, so it shows what it will.
import type { ActorView } from '../core/types.ts';
import type { TileName } from '../core/tiles.ts';
import { SCREEN_W, SCREEN_H, VIEW_TOP } from '../core/config.ts';
import type { Ctx } from './canvas.ts';
import { drawText, drawTinyText } from './font.ts';
import { drawActor } from './actors.ts';
import { nightTile } from './night.ts';
import { PAL } from './palette.ts';
import type { Px } from './px.ts';
import { bakeStage, drawStage } from './tiles.ts';
import type { BakedStage } from './tiles.ts';
import { view } from './sheet_a.ts';
import type { Page } from './sheet_a.ts';
import { head } from './sheet_l56b.ts';
import type { Near } from './tile_ground.ts';
import { PARK_TILES, parkNear } from './tile_udpark.ts';
import { TOWN_TILES, townNear } from './tile_udtown.ts';
import { udTile } from './tile_ud.ts';

const label = (ctx: Ctx, text: string, x: number, y: number): void => { drawTinyText(ctx, text, x, y, 'mist'); };
const wipe = (ctx: Ctx, color: keyof typeof PAL): void => { ctx.fillStyle = PAL[color]; ctx.fillRect(0, 0, SCREEN_W, SCREEN_H); };

/** The stage's letters (core/tiles.ts): ë road, ì the line, í walk, î lawn, ï veins, ð house, ñ window, ò door, Ā roof, ā trailer, Ă fence, ă tree, Ą deck, ą its lip. */
export const STREET = [
  'ĀĀĀĀĀĀĀĀĀĀĀĀĀĀĀĀ', 'ĀĀĀĀĀĀĀĀĀĀĀĀĀĀĀĀ', 'ðñðòðñððñðñðòðñð', 'îîîîîîîîîîîîîîîî', 'íííííííííííííííí', 'ëëëëëëëëëëëëëëëë',
  'ìëëìëëìëëìëëìëëì', 'ëëëëëëëëëëëëëëëë', 'íííííííííííííííí', 'îïïîîîîăîîîîïïîî', 'îîîîîîîîîîîîîîîî', 'ĂĂĂĂĂĂĂĂĂĂĂĂĂĂĂĂ',
];
/** The trailer park on the left and the roof of Eddie's trailer on the right: the deck is 8 tiles square, ringed by its lip. */
export const ROOF = [
  'îîîîîîąąąąąąąąąą', 'îĂĂĂĂîąĄĄĄĄĄĄĄĄą', 'îĂāāîîąĄĄĄĄĄĄĄĄą', 'îĂāāîîąĄĄĄĄĄĄĄĄą', 'îĂîîăîąĄĄĄĄĄĄĄĄą', 'îĂîîîîąĄĄĄĄĄĄĄĄą',
  'îĂāāîîąĄĄĄĄĄĄĄĄą', 'îĂāāîîąĄĄĄĄĄĄĄĄą', 'îĂîîîîąĄĄĄĄĄĄĄĄą', 'îîîîîîąąąąąąąąąą', 'îîïïîîîîîîîîîîîî', 'îîîîîîîîîîîîîîîî',
];

const baked = new Map<string, BakedStage>();
function bake(key: string, rows: string[], flash: boolean): BakedStage {
  const k = `${key}${flash ? 'f' : ''}`;
  let b = baked.get(k);
  if (!b) { b = bakeStage(rows, true, flash ? 'flash' : undefined); baked.set(k, b); }
  return b;
}

/** How strong the bolt is at frame t on the sheet: one every 200 frames, full for 6, fading over 24. */
export const boltAt = (t: number): number => { const f = t % 200; return f < 6 ? 1 : f < 30 ? 1 - (f - 6) / 24 : 0; };

/** The stage drawn at night with the bolt's bake faded over it, the way the play scene draws a storm. */
function drawStorm(ctx: Ctx, key: string, rows: string[], t: number): void {
  drawStage(ctx, bake(key, rows, false), 0, 0, t);
  const a = boltAt(t);
  if (a <= 0) return;
  ctx.save();
  ctx.globalAlpha = a;
  drawStage(ctx, bake(key, rows, true), 0, 0, t);
  ctx.restore();
}

// ---------------------------------------------------------------- tiles
const cache = new Map<string, HTMLCanvasElement>();
const spot = (v: number): { tx: number; ty: number } => ({ tx: 5 + v * 3, ty: 4 + v * 7 });
const around = (n: TileName): Near => ({ n, e: n, s: n, w: n });

/** A tile at night or in the bolt, three variants by place, with the veins at a step of their pulse. */
function sample(name: TileName, v: number, flash: boolean, phase: number): HTMLCanvasElement {
  const key = `${name}${v}${flash ? 'f' : ''}${name === 'udveins' ? phase : ''}`;
  let c = cache.get(key);
  if (!c) {
    const near = PARK_TILES.includes(name) ? parkNear(name, v, around(name)) : townNear(name, v, around(name));
    const tc = { ...spot(v), near };
    c = nightTile(udTile(name, tc, flash, phase) as Px, name, tc).toCanvas();
    cache.set(key, c);
  }
  return c;
}

const tiles: Page = {
  title: 'UPSIDE DOWN HAWKINS: TILES',
  subs: 2,
  draw(ctx, t, sub) {
    wipe(ctx, 'night');
    const names = sub ? PARK_TILES : TOWN_TILES, phase = (t >> 4) & 3;
    drawText(ctx, sub ? 'THE PARK AND THE ROOF' : 'THE STREET', 4, 3, 'bone');
    drawTinyText(ctx, 'NIGHT, THEN THE BOLT', 4, 12, 'mist');
    names.forEach((n, i) => {
      const cx = 2 + (i % 5) * 51, cy = 20 + ((i / 5) | 0) * 52;
      for (let v = 0; v < 3; v++) { ctx.drawImage(sample(n, v, false, phase), cx + v * 17, cy); ctx.drawImage(sample(n, v, true, phase), cx + v * 17, cy + 17); }
      drawTinyText(ctx, n.toUpperCase(), cx, cy + 36, 'mist');
    });
    // The same tiles in place, with the bolt over them.
    ctx.save();
    ctx.translate(0, 128);
    drawStorm(ctx, sub ? 'roofstrip' : 'streetstrip', sub ? ROOF.slice(1, 7) : STREET.slice(1, 7), t);
    ctx.restore();
    drawText(ctx, 'UP DOWN', 200, 3, 'slate');
  },
};

// ---------------------------------------------------------------- the demobat
/** The poses a view can ask for, in the order the page shows them. */
const BAT_POSES: [string, Partial<ActorView>][] = [
  ['FLAP 1', { anim: 'walk', t: 0 }], ['FLAP 2', { anim: 'walk', t: 3 }], ['FLAP 3', { anim: 'walk', t: 6 }], ['FLAP 4', { anim: 'walk', t: 9 }],
  ['GLIDE', { anim: 'idle', t: 0 }], ['WIND UP', { pose: 'crouch', alert: true, t: 0 }], ['DIVE', { pose: 'charge', z: 4 }], ['STUNNED', { pose: 'stun', z: 2 }],
  ['HIT', { anim: 'hurt', flash: 1 }], ['KO 1', { anim: 'ko', t: 8 }], ['KO 2', { anim: 'ko', t: 12 }], ['ELITE', { elite: true, bar: { hp: 30, hpMax: 40 } }],
];

const bat = (x: number, y: number, over: Partial<ActorView>): ActorView => view('demobat', x, y, { kind: 'enemy', z: 12, anim: 'walk', ...over });

/** Draws views back to front, so a bat in front of the hero covers him and the one behind does not. */
const paintAll = (ctx: Ctx, views: ActorView[]): void => { for (const v of [...views].sort((a, b) => a.y - b.y)) drawActor(ctx, v); };

/** A flock of n circling a point on an ellipse, high over its shadows, one of them in a dive. */
function flock(n: number, cx: number, cy: number, r: number, t: number, dive = -1): ActorView[] {
  return Array.from({ length: n }, (_, i) => {
    const a = t * 0.025 + (i * Math.PI * 2) / n;
    return bat(cx + Math.cos(a) * r, cy + Math.sin(a) * r * 0.55, { t: t + i * 5, z: i === dive ? 3 : 10 + Math.round(3 * Math.sin(t * 0.07 + i)), ...(i === dive ? { pose: 'charge' as const } : {}) });
  });
}

const demobat: Page = {
  title: 'DEMOBAT: PALE',
  subs: 2,
  draw(ctx, t, sub) {
    if (sub === 0) {
      wipe(ctx, 'night');
      drawText(ctx, 'THE DEMOBAT: POSES OVER ITS SHADOW', 4, 3, 'white', { shadow: true });
      ctx.save();
      ctx.scale(2, 2);
      BAT_POSES.forEach(([, over], i) => drawActor(ctx, bat(10 + (i % 6) * 21, 42 + ((i / 6) | 0) * 40, { ...over, ...(over.anim === 'walk' ? { t: ((t >> 2) + (over.t ?? 0)) } : {}) })));
      ctx.restore();
      BAT_POSES.forEach(([name], i) => label(ctx, name, 2 + (i % 6) * 42, 90 + ((i / 6) | 0) * 80));
      label(ctx, 'THE FLAP LOOP AT 1X, EIGHT BATS AT DIFFERENT STEPS', 4, 181);
      for (let i = 0; i < 8; i++) drawActor(ctx, bat(18 + i * 30, 214, { t: t + i * 3 }));
      return;
    }
    wipe(ctx, 'black');
    ctx.save();
    ctx.translate(0, VIEW_TOP);
    drawStorm(ctx, 'street', STREET, t);
    paintAll(ctx, [
      view('eddie', 128, 120, { kind: 'hero', anim: 'cast', t }),
      ...flock(5, 128, 120, 52, t, (t >> 6) % 5),
      bat(40, 60, { pose: 'stun', z: 2, t }), bat(210, 70, { elite: true, t, bar: { hp: 90, hpMax: 150 } }),
    ]);
    ctx.restore();
    head(ctx, 'THE FLOCK OVER THE STREET');
  },
};

// ---------------------------------------------------------------- the street and the roof
const street: Page = {
  title: 'UPSIDE DOWN HAWKINS: THE STREET',
  subs: 1,
  draw(ctx, t) {
    wipe(ctx, 'black');
    ctx.save();
    ctx.translate(0, VIEW_TOP);
    drawStorm(ctx, 'street', STREET, t);
    paintAll(ctx, [
      view('mike', 60 + ((t >> 1) % 140), 138, { kind: 'hero', dir: 'right', anim: 'walk', t }),
      view('dustin', 40 + ((t >> 1) % 140), 150, { kind: 'hero', dir: 'right', anim: 'walk', t }),
      ...flock(3, 190, 90, 34, t),
    ]);
    ctx.restore();
    head(ctx, 'THE STREET IN THE STORM: A BOLT EVERY FEW SECONDS');
  },
};

const roof: Page = {
  title: 'THE TRAILER PARK AND THE ROOF',
  subs: 1,
  draw(ctx, t) {
    wipe(ctx, 'black');
    ctx.save();
    ctx.translate(0, VIEW_TOP);
    drawStorm(ctx, 'roof', ROOF, t);
    paintAll(ctx, [
      view('eddie', 176, 96, { kind: 'hero', anim: 'cast', t }),
      ...flock(5, 176, 96, 46, t, (t >> 5) % 5),
      view('max', 44, 156, { kind: 'hero', dir: 'up', anim: 'walk', t }),
    ]);
    ctx.restore();
    head(ctx, 'THE ROOF: EDDIE PLAYS, THE BATS CIRCLE');
  },
};

export const L12_PAGES: Page[] = [tiles, street, roof, demobat];
