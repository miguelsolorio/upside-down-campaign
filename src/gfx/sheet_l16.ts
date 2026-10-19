// Sheet pages for level 16 (docs/level-16.md), stage 5.3, Vecna inside the Mind Flayer: the final boss's spider with its chest shut and open, rising
// and with its head down, its legs in every pose (and the one the clock marked), the arena with the heart's glow, the two channel marks (dim, then
// lit) and the channelers on them, and Joyce with her axe in every direction. Every actor goes through drawActor from a view, so it shows what the
// game draws; the arena goes through the same marks and glow the world pass uses (world/heart.ts).
import type { ActorView, Dir } from '../core/types.ts';
import { SCREEN_H, SCREEN_W, VIEW_TOP } from '../core/config.ts';
import { drawText } from './font.ts';
import { drawActor, drawAxeJoyce } from './actors.ts';
import { drawChannelMark, drawHeartGlow } from './ch5/heart_marks.ts';
import { PAL } from './palette.ts';
import { bakeStage, drawStage } from './tiles.ts';
import type { BakedStage } from './tiles.ts';
import { view } from './sheet_a.ts';
import type { Page } from './sheet_a.ts';
import { head } from './sheet_l56b.ts';
import { foe, label } from './sheet_l1415.ts';

const DIRS: Dir[] = ['down', 'up', 'left', 'right'];
const spider = (y: number, t: number, over: Partial<ActorView> = {}): ActorView => foe('flayer5', 128, y, { t, ...over });

// ---------------------------------------------------------------- the Mind Flayer
const body: Page = {
  title: 'FINAL MIND FLAYER',
  subs: 2,
  draw(ctx, t, sub) {
    ctx.fillStyle = PAL.blood0;
    ctx.fillRect(0, 0, SCREEN_W, SCREEN_H);
    if (sub === 0) {
      drawText(ctx, 'THE MIND FLAYER: CHEST SHUT, THEN OPEN', 4, 3, 'white', { shadow: true });
      label(ctx, 'SHUT: THE BODY TAKES NO HIT', 4, 16, 'cream');
      drawActor(ctx, spider(66, t));
      label(ctx, 'OPEN: A HIT ON A LEG HOLDS IT 5 S (K THE SHARE LEFT)', 4, 112, 'cream');
      drawActor(ctx, spider(166, t, { open: true, k: 0.5 + 0.5 * Math.sin(t / 40) }));
      drawText(ctx, 'UP DOWN', 4, 212, 'slate');
      return;
    }
    drawText(ctx, 'RISING, AND ITS HEAD DOWN', 4, 3, 'white', { shadow: true });
    label(ctx, 'RISE: 40 FRAMES, LOOPING', 4, 16, 'cream');
    drawActor(ctx, spider(66, t % 40, { pose: 'rise' }));
    label(ctx, 'DOWN (ALSO ITS LAST POSE, KNEELING): THE CHEST IS OPEN', 4, 112, 'cream');
    drawActor(ctx, spider(166, t, { pose: 'down', open: true }));
    drawText(ctx, 'UP DOWN', 4, 212, 'slate');
  },
};

// ---------------------------------------------------------------- the legs
const legAt = (x: number, over: Partial<ActorView>): ActorView =>
  foe('leg5', x, 60, { aim: { x: x - 14, y: 112 }, anim: 'idle', ...over });
const LEGS: { name: string; over: Partial<ActorView> }[] = [
  { name: 'IDLE', over: {} },
  { name: 'WARN', over: { pose: 'warn', anim: 'attack', t: 10 } },
  { name: 'SLAM', over: { pose: 'slam', anim: 'attack', t: 4 } },
  { name: 'SEVERED', over: { pose: 'severed', anim: 'idle' } },
  { name: 'MARKED', over: { marked: true } },
];
const legs: Page = {
  title: 'FINAL LEGS',
  subs: 1,
  draw(ctx, t) {
    ctx.fillStyle = PAL.blood0;
    ctx.fillRect(0, 0, SCREEN_W, SCREEN_H);
    drawText(ctx, 'THE LEGS ARE 3.3\'S', 4, 3, 'white', { shadow: true });
    LEGS.forEach((l, i) => {
      const x = 28 + i * 50;
      drawActor(ctx, legAt(x, { t: t + i * 9, ...l.over }));
      label(ctx, l.name, x - 14, 128, 'mist');
    });
    label(ctx, 'MARKED: THE CLOCK CHOSE IT. CUT IT TO LIFT THE CURSE', 4, 146, 'cream');
    label(ctx, 'THE BAR UNDER THE BOSS BAR HAS A PIP FOR EACH LEG', 4, 156, 'mist');
    drawText(ctx, 'UP DOWN', 4, 212, 'slate');
  },
};

// ---------------------------------------------------------------- the heart
/** The arena in miniature: a disc of heartfloor, the rim round it and wall beyond, 16 by 12 tiles. */
export function heartRows(cx = 8, cy = 6.2, r = 5.4): string[] {
  const floor = (x: number, y: number): boolean => Math.hypot(x + 0.5 - cx, y + 0.5 - cy) <= r;
  return Array.from({ length: 12 }, (_, y) => Array.from({ length: 16 }, (_, x) => (floor(x, y) ? 'õ' : floor(x + 1, y) || floor(x - 1, y) || floor(x, y + 1) || floor(x, y - 1) ? 'ó' : 'ô')).join(''));
}
let heartBaked: BakedStage | null = null;

const heart: Page = {
  title: 'THE HEART',
  subs: 2,
  draw(ctx, t, sub) {
    ctx.fillStyle = PAL.ink;
    ctx.fillRect(0, 0, SCREEN_W, SCREEN_H);
    heartBaked ??= bakeStage(heartRows(), false);
    // sub 0: before the channel, the marks dim. 1: the channel running, the marks lit. The glow pulses on both (Reduce flashing holds it at one step).
    const lit = sub !== 0;
    ctx.save();
    ctx.translate(0, VIEW_TOP);
    drawStage(ctx, heartBaked, 0, 0, t);
    const e = { x: 92, y: 136 }, w = { x: 164, y: 136 };
    drawChannelMark(ctx, 'eleven', e.x, e.y, t, lit);
    drawChannelMark(ctx, 'will', w.x, w.y, t, lit);
    drawHeartGlow(ctx, t, SCREEN_W / 2, (SCREEN_H - VIEW_TOP) / 2);
    drawActor(ctx, foe('flayer5', 128, 56, { t, open: ((t >> 6) & 1) === 1 }));
    for (const [x, tx] of [[96, 76], [160, 180]] as const) drawActor(ctx, foe('leg5', x, 62, { aim: { x: tx, y: 110 }, anim: 'idle', t: t + x }));
    drawActor(ctx, view('eleven', e.x, e.y, { dir: 'down', anim: 'cast', t, strained: true, bar: { hp: 300, hpMax: 380 } }));
    drawActor(ctx, view('will', w.x, w.y, { dir: 'down', anim: 'cast', t, bar: { hp: 380, hpMax: 380 } }));
    drawActor(ctx, view('mike', 128, 150, { dir: 'up', anim: 'walk', t }));
    drawActor(ctx, view('dustin', 112, 166, { dir: 'up', anim: 'idle', t }));
    ctx.restore();
    head(ctx, ['MARKS DIM, BEFORE THE CHANNEL', 'MARKS LIT, THE CHANNEL RUNNING'][sub] as string);
  },
};

// ---------------------------------------------------------------- Joyce
/** Her poses by the view's anim and t: a walk steps every 7 frames, an attack raises the axe for 8, brings it down for 6, then follows through. */
const JOYCE: { name: string; over: Partial<ActorView> }[] = [
  { name: 'IDLE', over: { anim: 'idle' } }, { name: 'WALK', over: { anim: 'walk', t: 0 } }, { name: 'WALK', over: { anim: 'walk', t: 7 } },
  { name: 'WALK', over: { anim: 'walk', t: 14 } }, { name: 'WALK', over: { anim: 'walk', t: 21 } },
  { name: 'RAISE', over: { anim: 'attack', t: 2 } }, { name: 'SWING', over: { anim: 'attack', t: 10 } }, { name: 'FOLLOW', over: { anim: 'attack', t: 20 } },
];
const joyce: Page = {
  title: 'JOYCE AND THE AXE',
  subs: 1,
  draw(ctx, t) {
    ctx.fillStyle = PAL.night;
    ctx.fillRect(0, 0, SCREEN_W, SCREEN_H);
    drawText(ctx, 'JOYCE RUNS IN AND FINISHES IT', 4, 3, 'white', { shadow: true });
    DIRS.forEach((d, r) => {
      const y = 62 + r * 38;
      label(ctx, d.toUpperCase(), 1, y - 24);
      JOYCE.forEach((p, i) => drawAxeJoyce(ctx, view('joyce', 20 + i * 29, y, { kind: 'npc', dir: d, ...p.over })));
    });
    JOYCE.forEach((p, i) => label(ctx, p.name, 8 + i * 29, 164));
    label(ctx, 'LIVE: THE RUN, THEN THE CHOP', 4, 176, 'cream');
    const c = t % 150, run = Math.min(1, c / 62);
    drawAxeJoyce(ctx, view('joyce', 64 + run * 150, 204, { kind: 'npc', dir: 'right', anim: c < 62 ? 'walk' : c < 88 ? 'attack' : 'idle', t: c < 62 ? c * 2 : c - 62 }));
    drawText(ctx, 'UP DOWN', 4, 212, 'slate');
  },
};

export const L16_PAGES: Page[] = [body, legs, heart, joyce];
