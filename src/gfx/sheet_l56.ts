// Sheet pages for levels 5 and 6 (docs/level-5.md, docs/level-6.md): Max, Steve and Hopper (every anim in four directions, the five
// expressions, and the live loops), and the Demodog Alpha (every pose in four directions, and the flags the game sets with its
// rings). The tunnels, the overrun Lab, the props and the effects are in sheet_l56b.ts.
import type { ActorView, AnimId, CharId, Dir, Expr } from '../core/types.ts';
import { SCREEN_H, SCREEN_W } from '../core/config.ts';
import type { Ctx } from './canvas.ts';
import { drawText, drawTinyText } from './font.ts';
import { drawActor, drawActorFrame } from './actors.ts';
import { drawFx } from './fx.ts';
import { drawPortrait } from './ui.ts';
import { PAL } from './palette.ts';
import { view } from './sheet_a.ts';
import type { Page } from './sheet_a.ts';

const DIRS: Dir[] = ['down', 'up', 'left', 'right'];
const FLOOR = PAL.grey1;

function floor(ctx: Ctx, y: number, h: number): void {
  ctx.fillStyle = FLOOR;
  ctx.fillRect(0, y, SCREEN_W, h);
}

// ---------------------------------------------------------------- heroes
const FRAMES: [string, AnimId, number][] = [
  ['IDLE', 'idle', 0], ['IDLE2', 'idle', 1], ['WALK1', 'walk', 0], ['WALK2', 'walk', 1], ['WALK3', 'walk', 2], ['WALK4', 'walk', 3], ['WIND', 'attack', 0],
  ['HIT', 'attack', 1], ['CAST1', 'cast', 0], ['CAST2', 'cast', 1], ['CHAN', 'cast', 2], ['DASH', 'dash', 0], ['HURT', 'hurt', 0], ['KO', 'ko', 0],
];
const EXPRS: Expr[] = ['neutral', 'happy', 'worried', 'determined', 'hurt', 'shocked'];

/** One hero: every frame at twice its size (sub 0 to 3 turns him to face a direction), the portraits, and a live row with the flags the game sets. */
function heroPage(id: CharId, title: string, note: string): Page {
  return {
    title,
    subs: 4,
    draw(ctx, t, sub) {
      ctx.fillStyle = PAL.shadow;
      ctx.fillRect(0, 0, SCREEN_W, SCREEN_H);
      const dir = DIRS[sub] as Dir;
      drawText(ctx, `${title} FACING ${dir.toUpperCase()}`, 4, 3, 'white', { shadow: true });
      FRAMES.forEach(([name, anim, f], i) => {
        const col = i % 7, row = (i / 7) | 0, x = 6 + col * 35, y = 16 + row * 44;
        ctx.fillStyle = FLOOR;
        ctx.fillRect(x - 1, y - 1, 34, 34);
        ctx.save();
        ctx.translate(x, y);
        ctx.scale(2, 2);
        drawActorFrame(ctx, id, dir, anim, f, 0, 0);
        ctx.restore();
        drawTinyText(ctx, name, x, y + 35, 'mist');
      });
      EXPRS.forEach((e, i) => {
        drawPortrait(ctx, id, e, 6 + i * 40, 108);
        drawTinyText(ctx, e.toUpperCase().slice(0, 7), 6 + i * 40, 134, 'mist');
      });
      floor(ctx, 148, 60);
      const live: [string, Partial<ActorView>][] = [
        ['WALK', { anim: 'walk', t }], ['ATTACK', { anim: 'attack', t: t % 30 }], ['CAST', { anim: 'cast', t: t % 40 }],
        ['DASH', { anim: 'dash', t: 0 }], ['HURT', { anim: 'hurt', flash: (t >> 3) & 1 ? 0.8 : 0 }], ['BAR', { anim: 'idle', t, bar: { hp: 3, hpMax: 5 } }],
      ];
      live.forEach(([name, over], i) => {
        const x = 20 + i * 40;
        drawActor(ctx, view(id, x, 184, { dir, kind: id === 'hopper' ? 'npc' : 'hero', ...over }));
        drawTinyText(ctx, name, x - ((name.length * 4 - 1) >> 1), 196, 'mist');
      });
      if (id === 'max') drawFx(ctx, { kind: 'trail', x: 140, y: 178, dir: 'right', angle: 0, t: t % 40, life: 24, w: 72, h: 10 });
      if (id === 'steve') drawFx(ctx, { kind: 'taunt', x: 140, y: 184, dir: 'right', angle: 0, t: t % 50, life: 34, w: 72, h: 0 });
      drawText(ctx, note, 4, 212, 'slate');
      drawText(ctx, 'UP DOWN', 200, 3, 'slate');
    },
  };
}

export const HERO_PAGES: Page[] = [
  heroPage('max', 'MAX', 'WALKMAN: BOARD IN ATTACK AND DASH'),
  heroPage('steve', 'STEVE', 'LETTERMAN: BIG HAIR, NAIL BAT'),
  heroPage('hopper', 'HOPPER', 'UNIFORM: BIG BODY, AN NPC'),
];

// ---------------------------------------------------------------- the Alpha
const POSES: [string, Partial<ActorView>][] = [
  ['IDLE', { anim: 'idle', t: 0 }], ['STEP1', { anim: 'walk', t: 0 }], ['STEP2', { anim: 'walk', t: 14 }], ['WIND', { anim: 'attack', alert: true, t: 0 }],
  ['BITE', { anim: 'attack', t: 0 }], ['LUNGE', { anim: 'dash' }], ['CRCH', { pose: 'crouch', t: 0 }], ['AIR', { pose: 'leap', z: 1 }],
  ['HOWL', { pose: 'howl' }], ['STUN1', { pose: 'stun', t: 0 }], ['STUN2', { pose: 'stun', t: 16 }], ['HURT', { anim: 'hurt' }],
  ['KO', { anim: 'ko' }], ['WIND2', { anim: 'attack', alert: true, t: 4 }], ['IDLE2', { anim: 'idle', t: 30 }], ['STEP3', { anim: 'walk', t: 28 }],
];

const alpha = (x: number, y: number, over: Partial<ActorView>): ActorView => view('alpha', x, y, { kind: 'enemy', ...over });

const alphaPage: Page = {
  title: 'ALPHA',
  subs: 5,
  draw(ctx, t, sub) {
    ctx.fillStyle = PAL.night;
    ctx.fillRect(0, 0, SCREEN_W, SCREEN_H);
    if (sub === 4) { liveAlpha(ctx, t); return; }
    const dir = DIRS[sub] as Dir;
    drawText(ctx, `DEMODOG ALPHA FACING ${dir.toUpperCase()}`, 4, 3, 'white', { shadow: true });
    floor(ctx, 14, 112);
    POSES.forEach(([name, over], i) => {
      const col = i % 8, row = (i / 8) | 0, x = col * 32 + 16, y = 50 + row * 50;
      drawActor(ctx, alpha(x, y, { dir, ...over }));
      drawTinyText(ctx, name, x - ((name.length * 4 - 1) >> 1), y + 3, 'mist');
    });
    // The same poses at twice the size, for the shapes.
    ctx.save();
    ctx.scale(2, 2);
    ([['WIND', { anim: 'attack', alert: true }], ['BITE', { anim: 'attack' }], ['AIR', { pose: 'leap', z: 1 }], ['HOWL', { pose: 'howl' }]] as [string, Partial<ActorView>][]).forEach(([, over], i) => {
      drawActor(ctx, alpha(16 + i * 32, 100, { dir, ...over }));
    });
    ctx.restore();
    drawText(ctx, 'STALKER: 32 BY 24, FOUR COLORS', 4, 202, 'slate');
    drawText(ctx, 'UP DOWN', 200, 3, 'slate');
  },
};

/** The flags the game sets, with the demodog beside it for scale, the howl ring and the lunge. */
function liveAlpha(ctx: Ctx, t: number): void {
  drawText(ctx, 'LIVE: THE FLAGS THE GAME SETS', 4, 3, 'white', { shadow: true });
  floor(ctx, 14, 190);
  const names = ['PLAIN', 'ALERT', 'FLASH', 'TINT', 'BAR', 'LEAP'];
  names.forEach((n, i) => drawTinyText(ctx, n, 16 + i * 40 - ((n.length * 4 - 1) >> 1), 20 + (i & 1) * 6, 'cream'));
  const dirs: Dir[] = ['down', 'left', 'up', 'right'];
  for (let c = 0; c < 6; c++) {
    const dir = dirs[(Math.floor(t / 90) + c) % 4] as Dir;
    const over: Partial<ActorView> = { dir, anim: ((t >> 6) & 1) ? 'walk' : 'idle', t };
    if (c === 1) { over.alert = true; over.anim = 'attack'; over.t = t % 30; }
    if (c === 2) over.flash = (t >> 4) & 1 ? 1 : 0.4;
    if (c === 3) over.tint = 'cyan';
    if (c === 4) over.bar = { hp: 3, hpMax: 5 };
    if (c === 5) { over.pose = 'leap'; over.z = Math.max(0, Math.round(Math.sin(((t % 90) / 90) * Math.PI) * 18)); }
    drawActor(ctx, alpha(20 + c * 40, 70, over));
  }
  drawActor(ctx, view('demodog', 224, 70, { kind: 'enemy', dir: 'left', anim: 'walk', t }));
  drawTinyText(ctx, 'YOUNG', 214, 74, 'mist');
  const k = t % 120;
  drawActor(ctx, alpha(60, 150, { dir: 'right', pose: 'howl', t }));
  drawFx(ctx, { kind: 'howl', x: 60, y: 134, dir: 'right', angle: 0, t: k % 60, life: 50, w: 96, h: 48 });
  drawTinyText(ctx, 'HOWL', 52, 156, 'mist');
  const run = k < 60 ? 0 : Math.min(1, (k - 60) / 18);
  drawActor(ctx, alpha(120 + run * 90, 150, { dir: 'right', anim: k < 60 ? 'attack' : 'dash', alert: k < 60, t: k }));
  drawTinyText(ctx, 'LUNGE', 130, 160, 'mist');
  drawText(ctx, 'UP DOWN', 200, 3, 'slate');
}

export const L56_PAGES: Page[] = [...HERO_PAGES, alphaPage];
