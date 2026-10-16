// The Mind Flayer's sheet page (docs/level-9.md), live on a sample court 22 by 13 tiles, drawn the way the stage is: the body across the north
// wall and its four legs, at rest, then a fight on a loop (one leg warning with its line on the floor, one slamming, a pool where each lands
// and dries, a sweep across the arena), then its head down with the legs severed and, once the legs go, the body dying, then its
// coming in through the skylight, the legs with it. The goo of the pools and the effects are in fx_l9.ts, the body and legs in actor_flayer.ts.
import type { ActorView } from '../core/types.ts';
import { SCREEN_H, SCREEN_W, VIEW_TOP } from '../core/config.ts';
import type { Ctx } from './canvas.ts';
import { drawActor } from './actors.ts';
import { drawFx } from './fx.ts';
import { drawPool } from './fx_l9.ts';
import { drawStage } from './tiles.ts';
import { view } from './sheet_a.ts';
import type { Page } from './sheet_a.ts';
import { bake, head } from './sheet_l56b.ts';

/** A food court, 22 wide: a stall row on the north wall (a cap over a face), a band round the floor, the patch under the skylight. */
const W = 22;
const row = (y: number): string => {
  if (y === 0 || y === 10) return `À${'Á'.repeat(W - 2)}À`;
  return `ÀÁ${[...Array(W - 4)].map((_, x) => (y >= 3 && y <= 8 && x >= 4 && x <= 13 ? 'Æ' : 'À')).join('')}ÁÀ`;
};
const COURT = ['Â'.repeat(W), 'Ã'.repeat(W), ...Array.from({ length: 11 }, (_, y) => row(y))];
/** The body's feet and the legs' roots (tile centers, as in stage33_data.ts, less the two tiles the sample's wall is shorter by). */
const BODY = { x: 168, y: 44 };
const ROOTS = [88, 136, 200, 248];
const REST = 56;
/** Where a leg's line goes from a root through a point: 112 px long here, so the whole line fits the page (the game's is 150). */
function lineTo(rx: number, to: { x: number; y: number }): { x: number; y: number } {
  const dx = to.x - rx, dy = to.y - 60, d = Math.hypot(dx, dy) || 1;
  return { x: Math.round(rx + (dx / d) * 112), y: Math.round(60 + (dy / d) * 112) };
}

const foe = (id: 'flayer' | 'flayerleg', x: number, y: number, over: Partial<ActorView>): ActorView => view(id, x, y, { kind: 'enemy', ...over });
const legs = (over: (i: number) => Partial<ActorView>): ActorView[] => ROOTS.map((x, i) => foe('flayerleg', x, 60, { aim: { x, y: 60 + REST }, ...over(i) }));

/** The court under the camera, the body in the middle of the screen. */
function court(ctx: Ctx, t: number): void {
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, SCREEN_W, SCREEN_H);
  const camX = BODY.x - SCREEN_W / 2;
  ctx.translate(-camX, VIEW_TOP);
  drawStage(ctx, bake('flayer-court', COURT), camX, 0, t);
}

// ---------------------------------------------------------------- the fight, on a loop
const LOOP = 540;
interface Slam { leg: number; at: number; hero: { x: number; y: number } }
const SLAMS: Slam[] = [{ leg: 1, at: 10, hero: { x: 150, y: 120 } }, { leg: 2, at: 130, hero: { x: 200, y: 124 } }, { leg: 0, at: 250, hero: { x: 96, y: 116 } }];
const HEROES = [{ x: 150, y: 120 }, { x: 170, y: 136 }];

function fight(ctx: Ctx, t: number): void {
  const k = t % LOOP;
  const tips = new Map<number, { x: number; y: number }>();
  const state = new Map<number, Partial<ActorView>>();
  for (const s of SLAMS) {
    const tip = lineTo(ROOTS[s.leg] as number, s.hero), e = k - s.at;
    if (e >= 40) drawPool(ctx, { x: tip.x, y: tip.y, r: 20, t: e - 40, life: 480 });
    if (e >= 0 && e < 40) state.set(s.leg, { pose: 'warn', anim: 'attack', t: e, aim: tip });
    else if (e >= 40 && e < 52) { state.set(s.leg, { pose: 'slam', anim: 'attack', t: e - 40, aim: tip }); }
    else if (e >= 52) tips.set(s.leg, tip);
  }
  drawActor(ctx, foe('flayer', BODY.x, BODY.y, { t }));
  legs((i) => state.get(i) ?? (tips.has(i) ? { aim: tips.get(i) as { x: number; y: number } } : {})).forEach((v) => drawActor(ctx, v));
  HEROES.forEach((h, i) => drawActor(ctx, view(i ? 'eleven' : 'mike', h.x, h.y, { dir: 'up', anim: 'idle', kind: 'hero', t })));
  for (const s of SLAMS) {
    const e = k - s.at, tip = lineTo(ROOTS[s.leg] as number, s.hero);
    if (e >= 40 && e < 52) drawFx(ctx, { kind: 'slam', x: tip.x, y: tip.y, dir: 'down', angle: Math.atan2(tip.y - 60, tip.x - (ROOTS[s.leg] as number)), t: e - 40, life: 12, w: 112, h: 0 });
  }
  // A sweep across the arena along the row the heroes stand on: the warning, then the strike.
  const sw = k - 370;
  if (sw >= 0 && sw < 52) drawFx(ctx, { kind: 'sweep', x: 16, y: 108, dir: 'down', angle: 0, t: sw, life: 52, w: 320, h: 24 });
}

const flayer: Page = {
  title: 'MIND FLAYER',
  subs: 4,
  draw(ctx, t, sub) {
    ctx.save();
    court(ctx, t);
    if (sub === 0) {
      drawActor(ctx, foe('flayer', BODY.x, BODY.y, { t }));
      legs((i) => (i === 1 ? { aim: { x: 56, y: 140 } } : i === 2 ? { aim: { x: 300, y: 150 } } : {})).forEach((v) => drawActor(ctx, v));
      drawActor(ctx, view('mike', 150, 130, { dir: 'up', kind: 'hero', t }));
      drawActor(ctx, view('eleven', 176, 142, { dir: 'up', kind: 'hero', t }));
    } else if (sub === 1) fight(ctx, t);
    else if (sub === 2) {
      // Head down, the legs cut. Then it dies: flashes and thins out in the last frames of the loop.
      const k = t % 200, dying = k >= 150;
      drawActor(ctx, foe('flayer', BODY.x, BODY.y, dying ? { anim: 'ko', t: k - 150 } : { pose: 'down', t }));
      legs(() => (dying ? { anim: 'ko', t: k - 150 } : { pose: 'severed' })).forEach((v) => drawActor(ctx, v));
      if (!dying) {
        drawActor(ctx, view('mike', 150, 96, { dir: 'up', kind: 'hero', anim: 'attack', t: t % 30 }));
        drawActor(ctx, view('eleven', 192, 100, { dir: 'up', kind: 'hero', anim: 'idle', t }));
      }
    } else {
      // Coming in through the skylight: 40 frames, the glass breaking, the legs with it.
      const k = t % 120;
      drawActor(ctx, foe('flayer', BODY.x, BODY.y, k < 40 ? { pose: 'rise', t: k } : { t: k }));
      legs(() => ({})).forEach((v) => drawActor(ctx, v));
      if (k < 40) drawFx(ctx, { kind: 'glass', x: BODY.x, y: BODY.y, dir: 'down', angle: 0, t: k, life: 40, w: 128, h: 0 });
      drawActor(ctx, view('mike', 150, 130, { dir: 'up', kind: 'hero', t }));
    }
    ctx.restore();
    head(ctx, ['THE MIND FLAYER AT REST, LEGS OUT', 'A FIGHT: WARN, SLAM, GOO, SWEEP', 'HEAD DOWN, LEGS CUT, THEN IT DIES', 'IT COMES IN THROUGH THE SKYLIGHT'][sub] as string);
  },
};

export const L9B_PAGES: Page[] = [flayer];
