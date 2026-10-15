// Sheet pages for the Demogorgon and its two effects. The creature page shows every pose with the petals shut and open
// (up and down change the way it faces, the last sub page shows the flags the game sets); the effects page shows the acid
// glob and its splash and the floor mark over time, and a live volley of three globs with their marks.
import type { ActorView, Dir, FxKind } from '../core/types.ts';
import { SCREEN_H, SCREEN_W, VIEW_TOP } from '../core/config.ts';
import type { Ctx } from './canvas.ts';
import { drawText, drawTinyText } from './font.ts';
import { drawActor } from './actors.ts';
import { drawFx } from './fx.ts';
import { PAL } from './palette.ts';
import { bakeStage, drawStage } from './tiles.ts';
import type { BakedStage } from './tiles.ts';
import { view } from './sheet_a.ts';
import type { Page } from './sheet_a.ts';

const DIRS: Dir[] = ['down', 'up', 'left', 'right'];

/** Every frame the sheet shows: a label, and what the sim would send to get it. */
const FRAMES: [string, Partial<ActorView>][] = [
  ['IDLE', { anim: 'idle', t: 0 }], ['IDLE2', { anim: 'idle', t: 30 }], ['STEP1', { anim: 'walk', t: 0 }], ['STEP2', { anim: 'walk', t: 14 }],
  ['WIND', { anim: 'attack', alert: true }], ['SWIPE', { anim: 'attack' }], ['HURT', { anim: 'hurt' }], ['CHRG1', { pose: 'charge', t: 0 }],
  ['CHRG2', { pose: 'charge', t: 8 }], ['STUN1', { pose: 'stun', t: 0 }], ['STUN2', { pose: 'stun', t: 16 }], ['SPIT', { pose: 'spit' }],
  ['CRCH', { pose: 'leap', z: 0 }], ['AIR', { pose: 'leap', z: 1 }], ['LIE1', { pose: 'pinned', t: 0 }], ['LIE2', { pose: 'pinned', t: 32 }],
];

const boss = (x: number, y: number, over: Partial<ActorView>): ActorView => view('demogorgon', x, y, { kind: 'enemy', ...over });

const creature: Page = {
  title: 'DEMOGORGON',
  subs: 5,
  draw(ctx, t, sub) {
    ctx.fillStyle = PAL.dusk;
    ctx.fillRect(0, 0, SCREEN_W, SCREEN_H);
    if (sub === 4) { live(ctx, t); return; }
    const dir = DIRS[sub] as Dir;
    drawText(ctx, `DEMOGORGON FACING ${dir.toUpperCase()}`, 4, 3, 'white', { shadow: true });
    for (const [panel, petals] of [[0, false], [1, true]] as [number, boolean][]) {
      drawText(ctx, petals ? 'PETALS OPEN' : 'PETALS SHUT', 4, 12 + panel * 102, 'cream');
      FRAMES.forEach(([name, over], i) => {
        const col = i % 8, row = (i / 8) | 0, x = col * 32 + 16, y = 56 + panel * 98 + row * 46;
        drawActor(ctx, boss(x, y, { dir, petals, ...over }));
        drawTinyText(ctx, name, x - ((name.length * 4 - 1) >> 1), y + 2, 'mist');
      });
    }
  },
};

/** The same sprite as the game draws it: flags, a flash, a tint, a bar, the "!", a leap arc, a charge, a pin. */
function live(ctx: Ctx, t: number): void {
  drawText(ctx, 'LIVE: THE FLAGS THE GAME SETS', 4, 3, 'white', { shadow: true });
  const names = ['PLAIN', 'ALERT', 'FLASH', 'TINT', 'BAR', 'LEAP', 'CHARGE', 'PINNED'];
  names.forEach((n, i) => drawText(ctx, n, 16 + i * 32, 14 + (i & 1) * 8, 'cream', { align: 'center' }));
  const dirs: Dir[] = ['down', 'left', 'up', 'right'];
  [false, true].forEach((petals, r) => {
    const y = 90 + r * 100;
    for (let c = 0; c < 8; c++) {
      const dir = dirs[(Math.floor(t / 90) + r) % 4] as Dir;
      const over: Partial<ActorView> = { dir, petals, anim: ((t >> 6) & 1) ? 'walk' : 'idle', t };
      if (c === 1) { over.alert = true; over.anim = 'attack'; over.t = 0; }
      if (c === 2) over.flash = (t >> 4) & 1 ? 1 : 0.4;
      if (c === 3) over.tint = 'cyan';
      if (c === 4) over.bar = { hp: 3, hpMax: 5 };
      if (c === 5) { over.pose = 'leap'; over.z = Math.max(0, Math.round(Math.sin(((t % 90) / 90) * Math.PI) * 18)); }
      if (c === 6) over.pose = 'charge';
      if (c === 7) over.pose = 'pinned';
      drawActor(ctx, boss(16 + c * 32, y, over));
    }
  });
}

// ---------------------------------------------------------------- effects
const COURT = ['K##############K', 'KuuuuuuuuuuuuuuK', 'KuuuuuuuuuuuuuuK', 'KuuuuuuuuuuuuuuK', 'KuuuuuuuuuuuuuuK', 'KuuuuuuuuuuuuuuK', 'KuuuuuuuuuuuuuuK', 'KuuuuuuuuuuuuuuK', 'KuuuuuuuuuuuuuuK', 'KuuuuuuuuuuuuuuK', 'KuuuuuuuuuuuuuuK', 'KKKKKKKKKKKKKKKK'];
const baked = new Map<boolean, BakedStage>();
function court(night: boolean): BakedStage {
  let b = baked.get(night);
  if (!b) { b = bakeStage(COURT, night); baked.set(night, b); }
  return b;
}

const fx = (kind: FxKind, x: number, y: number, t: number, life: number, w = 0, angle = 0) => ({ kind, x, y, dir: 'right' as Dir, angle, t, life, w, h: 0 });

const effects: Page = {
  title: 'BOSS FX',
  subs: 2,
  draw(ctx, t, sub) {
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, SCREEN_W, SCREEN_H);
    ctx.save();
    ctx.translate(0, VIEW_TOP);
    drawStage(ctx, court(true), 0, 0, t);
    if (sub === 0) {
      [0, 8, 16, 24, 32, 38, 41, 45, 49, 53].forEach((f, i) => drawFx(ctx, fx('acid', 14 + i * 25, 36, f, 54, 28)));
      [0, 0.12, 0.25, 0.4, 0.55, 0.7, 0.85, 0.95, 1].forEach((p, i) => drawFx(ctx, fx('mark', 14 + i * 28, 82, Math.round(p * 45), 45, 28)));
      [0.1, 0.3, 0.5, 0.7, 0.9, 1].forEach((p, i) => drawFx(ctx, fx('mark', 24 + i * 40, 140, Math.round(p * 45), 45, 64)));
    } else {
      const k = t % 150, from = { x: 40, y: 90 };
      const targets = [{ x: 150, y: 50 }, { x: 170, y: 90 }, { x: 150, y: 130 }];
      drawActor(ctx, boss(from.x, from.y + 14, { dir: 'right', petals: true, pose: k < 24 ? 'spit' : undefined, anim: 'idle', t }));
      targets.forEach((to, i) => {
        const s = 20 + i * 4;
        if (k >= s && k < s + 54) {
          const f = k - s, u = Math.min(1, f / 40);
          drawFx(ctx, fx('mark', to.x, to.y, Math.min(f, 40), 40, 28));
          drawFx(ctx, fx('acid', from.x + (to.x - from.x) * u, from.y + (to.y - from.y) * u, f, 54, 28, Math.atan2(to.y - from.y, to.x - from.x)));
        }
      });
    }
    ctx.restore();
    ctx.fillStyle = PAL.ink;
    ctx.fillRect(0, 0, SCREEN_W, VIEW_TOP);
    drawText(ctx, sub === 0 ? 'ACID IN FLIGHT AND SPLASH, MARKS' : 'LIVE: A SPIT, THREE GLOBS AND MARKS', 6, 6, 'white');
    drawText(ctx, 'UP DOWN', 200, 214, 'slate');
  },
};

export const DEMO_PAGES: Page[] = [creature, effects];
