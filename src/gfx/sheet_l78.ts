// Sheet pages for levels 7 and 8 (docs/level-7.md, docs/level-8.md): Robin, Nancy and Erica (every anim in four directions, the portraits,
// the live flags, and the effects that go with them), then the new foes, each on a page of its own: the Russian soldier, the Flayed (and
// its puddle and its rise), the melting rat and Grigori. The mall, the base and the props and effects are in sheet_l78b.ts.
import type { ActorView, Dir } from '../core/types.ts';
import { SCREEN_H, SCREEN_W } from '../core/config.ts';
import type { Ctx } from './canvas.ts';
import { drawText, drawTinyText } from './font.ts';
import { drawActor } from './actors.ts';
import { drawFx } from './fx.ts';
import { PAL } from './palette.ts';
import { view } from './sheet_a.ts';
import type { Page } from './sheet_a.ts';
import { heroPage } from './sheet_l56.ts';

const DIRS: Dir[] = ['down', 'up', 'left', 'right'];

// ---------------------------------------------------------------- heroes
const robinFx = (ctx: Ctx, t: number): void => {
  const k = t % 90;
  // A scoop lobbed to the right, then its splat; and the word vomit cone beside it.
  drawFx(ctx, { kind: 'scoop', x: 20 + Math.min(k, 22) * 2, y: 158 - Math.round(Math.sin((Math.min(k, 22) / 22) * Math.PI) * 10), dir: 'right', angle: 0, t: Math.min(k, 22), life: 22, w: 6, h: 10 });
  if (k >= 22) drawFx(ctx, { kind: 'scoop', x: 64, y: 160, dir: 'down', angle: 0, t: Math.min(k - 22, 14), life: 14, w: 32, h: 32 });
  drawFx(ctx, { kind: 'babble', x: 150, y: 160, dir: 'right', angle: 0, t: t % 40 > 24 ? 24 : t % 40, life: 24, w: 56, h: 48 });
};
const nancyFx = (ctx: Ctx, t: number): void => {
  const k = t % 50;
  drawFx(ctx, { kind: 'bullet', x: 20 + k * 2, y: 160, dir: 'right', angle: 0, t: k, life: 36, w: 6, h: 6 });
  drawFx(ctx, { kind: 'bullet', x: 120, y: 158, dir: 'right', angle: 0, t: t % 36, life: 36, w: 90, h: 8 });
  drawFx(ctx, { kind: 'trap', x: 232, y: 162, dir: 'down', angle: 0, t: t % 600, life: 600, w: 14, h: 8 });
};

export const L78_HERO_PAGES: Page[] = [
  heroPage('robin', 'ROBIN', 'SAILOR: SCOOP, WORD VOMIT', 'hero', robinFx),
  heroPage('nancy', 'NANCY', 'OVERALLS: PISTOL, SHOTGUN', 'hero', nancyFx),
  heroPage('erica', 'ERICA', 'BOSS: AN NPC, CLIPBOARD', 'npc'),
];

// ---------------------------------------------------------------- foes
type Pose = [string, Partial<ActorView>];

/** One foe page: sub 0 to 3 turn the poses to face a direction, sub 4 is the live flags. */
function foePage(id: string, title: string, note: string, poses: Pose[], bg: keyof typeof PAL, size: number): Page {
  const flags = (ctx: Ctx, t: number): void => {
    ctx.fillStyle = PAL[bg];
    ctx.fillRect(0, 0, SCREEN_W, SCREEN_H);
    drawText(ctx, `${title} LIVE: THE FLAGS THE GAME SETS`, 4, 3, 'white', { shadow: true });
    ctx.fillStyle = PAL.grey1;
    ctx.fillRect(0, 14, SCREEN_W, 190);
    const names = ['PLAIN', 'ELITE', 'BAR', 'ELITE BAR', 'ALERT', 'FLASH', 'TINT', 'CONFUSED'];
    const dirs: Dir[] = ['down', 'left', 'up', 'right'];
    names.forEach((n, c) => {
      const x = 17 + c * 31, dir = dirs[(Math.floor(t / 90) + c) % 4] as Dir;
      drawTinyText(ctx, n, x - ((n.length * 4 - 1) >> 1), 20 + (c & 1) * 6, 'cream');
      const over: Partial<ActorView> = { dir, anim: ((t >> 6) & 1) ? 'walk' : 'idle', t, elite: c === 1 || c === 3 };
      if (c === 2 || c === 3) over.bar = { hp: 3, hpMax: 5 };
      if (c === 4) { over.alert = true; over.anim = 'attack'; }
      if (c === 5) over.flash = (t >> 4) & 1 ? 1 : 0.4;
      if (c === 6) over.tint = 'purple';
      if (c === 7) over.confused = true;
      drawActor(ctx, view(id, x, 72 + (c & 1) * 0, over));
    });
    // Beside a hero and the lab's agent for scale.
    drawActor(ctx, view('mike', 40, 130, { dir: 'down' }));
    drawActor(ctx, view(id, 72, 130, { dir: 'down' }));
    drawActor(ctx, view('hopper', 104, 130, { dir: 'down', kind: 'npc' }));
    drawActor(ctx, view('warden', 140, 130, { dir: 'down' }));
    drawTinyText(ctx, 'MIKE', 32, 134, 'mist'); drawTinyText(ctx, title.slice(0, 7), 62, 134, 'mist'); drawTinyText(ctx, 'HOPPER', 94, 134, 'mist'); drawTinyText(ctx, 'WARDEN', 128, 134, 'mist');
    drawText(ctx, note, 4, 212, 'slate');
    drawText(ctx, 'UP DOWN', 200, 3, 'slate');
  };
  return {
    title,
    subs: 5,
    draw(ctx, t, sub) {
      if (sub === 4) { flags(ctx, t); return; }
      ctx.fillStyle = PAL[bg];
      ctx.fillRect(0, 0, SCREEN_W, SCREEN_H);
      const dir = DIRS[sub] as Dir;
      drawText(ctx, `${title} FACING ${dir.toUpperCase()}`, 4, 3, 'white', { shadow: true });
      const per = Math.floor(SCREEN_W / (size + 8));
      poses.forEach(([name, over], i) => {
        const col = i % per, row = (i / per) | 0, w = size + 8;
        const x = 4 + col * w + (w >> 1), y = 14 + (row + 1) * (size + 22) - 8;
        ctx.fillStyle = PAL.grey1;
        ctx.fillRect(x - (w >> 1) + 1, y - size - 3, w - 2, size + 14);
        drawActor(ctx, view(id, x, y, { dir, t: 0, ...over }));
        drawTinyText(ctx, name, x - ((name.length * 4 - 1) >> 1), y + 3, 'mist');
      });
      // The same two or three at twice the size, for the shapes.
      ctx.save();
      ctx.scale(2, 2);
      poses.slice(2, 5).forEach(([, over], i) => drawActor(ctx, view(id, 36 + i * 40, 98, { dir, t: 0, ...over })));
      ctx.restore();
      drawText(ctx, note, 4, 212, 'slate');
      drawText(ctx, 'UP DOWN', 200, 3, 'slate');
    },
  };
}

const SOLDIER: Pose[] = [
  ['IDLE', { anim: 'idle' }], ['WALK1', { anim: 'walk', t: 0 }], ['AIM', { anim: 'attack', alert: true, t: 20 }], ['FIRE', { anim: 'attack', t: 10 }],
  ['RECOVER', { anim: 'idle', t: 40 }], ['WALK2', { anim: 'walk', t: 14 }], ['WALK3', { anim: 'walk', t: 28 }], ['HURT', { anim: 'hurt' }], ['KO', { anim: 'ko' }],
  ['E AIM', { anim: 'attack', alert: true, t: 20, elite: true }], ['E FIRE', { anim: 'attack', t: 10, elite: true }], ['E IDLE', { anim: 'idle', elite: true }],
];
const FLAYED: Pose[] = [
  ['IDLE', { anim: 'idle' }], ['WALK1', { anim: 'walk', t: 0 }], ['WIND', { anim: 'attack', alert: true, t: 20 }], ['REACH', { anim: 'attack', t: 10 }],
  ['GRAB', { anim: 'attack', pose: 'grab', t: 10 }], ['WALK2', { anim: 'walk', t: 14 }], ['HURT', { anim: 'hurt' }], ['KO', { anim: 'ko' }],
  ['PUDDLE', { puddle: true }], ['RISE 8', { pose: 'rise', t: 8 }], ['RISE 20', { pose: 'rise', t: 20 }], ['RISE 32', { pose: 'rise', t: 32 }],
  ['E WIND', { anim: 'attack', alert: true, t: 20, elite: true }], ['E IDLE', { anim: 'idle', elite: true }],
];
const MELTER: Pose[] = [
  ['IDLE', { anim: 'idle' }], ['WALK1', { anim: 'walk', t: 0 }], ['WIND', { anim: 'attack', alert: true, t: 20 }], ['LUNGE', { anim: 'attack', t: 10 }],
  ['WALK2', { anim: 'walk', t: 14 }], ['HURT', { anim: 'hurt' }], ['KO', { anim: 'ko' }], ['SWIRL', { anim: 'walk', t: 20, confused: true }],
];
const GRIGORI: Pose[] = [
  ['IDLE', { anim: 'idle' }], ['WALK1', { anim: 'walk', t: 0 }], ['WIND', { anim: 'attack', alert: true, t: 20 }], ['SWING', { anim: 'attack', t: 4 }],
  ['REACH', { anim: 'attack', alert: true, pose: 'grab', t: 10 }], ['HOLD', { anim: 'attack', pose: 'grab', t: 10 }], ['LUNGE', { anim: 'dash', pose: 'grab' }],
  ['STUN', { anim: 'hurt', pose: 'stun' }], ['WALK2', { anim: 'walk', t: 14 }], ['HURT', { anim: 'hurt' }], ['KO', { anim: 'ko' }], ['WALK3', { anim: 'walk', t: 28 }],
];

export const L78_FOE_PAGES: Page[] = [
  foePage('soldier', 'SOLDIER', 'USHANKA, COAT, RIFLE', SOLDIER, 'night', 16),
  foePage('flayed', 'FLAYED', 'GRABS, RISES OUT OF GOO', FLAYED, 'night', 16),
  foePage('melter', 'MELTER', 'THE RAT, DRIPPING', MELTER, 'night', 16),
  foePage('grigori', 'GRIGORI', 'GREATCOAT: 24 BY 24', GRIGORI, 'night', 24),
];
