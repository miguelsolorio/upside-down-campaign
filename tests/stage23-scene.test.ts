// Stage 2.3 in the real play scene, headless: a fake canvas and a fake game around createPlayScene. The ward falling is a loss like the
// whole party going down (the game over card), a retry from lights_gate runs the defense again from the start with the Alpha dead,
// the seals open and the boss track still on, and nothing can be lit while the defense runs. The data is in stage23.test.ts, the
// beats in stage23-beats.test.ts and the bot's runs in stage23-play.test.ts.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { Game, Scene } from '../src/core/scene.ts';
import type { PropView, Sim } from '../src/core/types.ts';
import { STAGE_23 as S } from '../src/world/stages/stage23.ts';
import type { Director } from '../src/world/triggers.ts';

// ---------------------------------------------------------------- a fake canvas, so the stage can bake
const noop = (): undefined => undefined;
function fakeCtx(): unknown {
  const own: Record<string, unknown> = {};
  return new Proxy(own, {
    get(t, k: string) {
      if (k === 'createImageData' || k === 'getImageData') return (w: number, h: number) => ({ data: new Uint8ClampedArray(Math.max(1, w * h * 4)), width: w, height: h });
      if (k === 'measureText') return () => ({ width: 0 });
      return k in t ? t[k] : noop;
    },
    set(t, k: string, v) { t[k] = v; return true; },
  });
}
(globalThis as unknown as { document: unknown }).document = {
  createElement: () => { const c: Record<string, unknown> = { width: 1, height: 1 }; c.getContext = () => fakeCtx(); return c; },
};
(globalThis as unknown as { __ud: unknown }).__ud = {};
const { createPlayScene } = await import('../src/world/play.ts');

// ---------------------------------------------------------------- a fake game
const pressed = new Set<string>();
const stack: Scene[] = [];
const game: Game = {
  input: {
    poll: noop, held: (a: string) => pressed.has(a), pressed: (a: string) => pressed.has(a), released: () => false, axis: () => ({ x: 0, y: 0 }),
    device: () => 'keyboard', hover: () => null, moved: () => false, wheel: () => 0, clicked: () => null, point: noop, notice: () => null, interrupted: () => false,
    capture: () => noop, offer: noop, offered: () => false,
  } as unknown as Game['input'],
  settings: { difficulty: 'chief', shake: 1, reduceFlashing: false } as unknown as Game['settings'],
  flags: { bot: false, god: false, dev: false, level: 0, seed: 1, party: null } as unknown as Game['flags'],
  scenes: {
    push(s: Scene) { stack.push(s); s.enter?.(game); },
    pop() { stack.pop(); },
    top: () => stack[stack.length - 1] ?? null,
    go: noop, update: noop, draw: noop,
  } as unknown as Game['scenes'],
  frame: 0,
};
const play = createPlayScene({
  stageId: '2.3', party: [{ id: 'mike', level: 6 }, { id: 'dustin', level: 5 }, { id: 'max', level: 4 }, { id: 'steve', level: 4 }],
  onClear: noop, onQuit: noop, onStartOver: noop,
});
play.enter?.(game);
const live = (): { sim: Sim; director: Director } => (globalThis as unknown as { __ud: { play: { sim: Sim; director: Director } } }).__ud.play;
const sim = (): Sim => live().sim;
const fired = (id: string): boolean => live().director.hasFired(id);
const prop = (id: string): PropView => sim().view().props.find((p) => p.id === id) as PropView;
const tick = (n = 1, key?: string): void => {
  for (let i = 0; i < n; i++) {
    game.frame++;
    if (key && i === 0) pressed.add(key);
    (stack[stack.length - 1] ?? play).update(game);
    pressed.clear();
  }
};
const at = (tx: number, ty: number): void => { sim().dev.teleport(tx * 16 + 8, ty * 16 + 12); tick(3); };

test('scene: the den and the Alpha beats shut the seals and wake the boss, and its death opens them and brings the boss bar down', () => {
  tick(5);
  assert.equal(prop('seal1').state, 'open');
  at(11, 19);
  assert.ok(fired('den'));
  at(9, 12);
  assert.ok(fired('alpha'), 'the Alpha beat fires in the den\'s south-west corner');
  tick(5);
  assert.deepEqual([prop('seal1').state, prop('seal2').state], ['closed', 'closed'], 'both seals are shut');
  assert.equal(sim().view().hud.boss?.name, 'DEMODOG ALPHA', 'and the Alpha is awake');
  sim().dev.killAll();
  tick(8);
  assert.ok(fired('alpha_down'));
  assert.deepEqual([prop('seal1').state, prop('seal2').state], ['open', 'open'], 'the seals open when it dies');
  assert.equal(sim().view().hud.boss, null);
});

test('scene: the lights of lights_gate save the retry spot, and nothing can be lit once the defense has started', () => {
  // The crack was broken on the way (the bot does it by flag): a retry keeps it broken.
  sim().openProp('crack1');
  tick(2);
  assert.equal(prop('crack1').state, 'open');
  at(29, 11);
  assert.equal(prop('lights_gate').state, 'off');
  tick(1, 'interact');
  assert.equal(prop('lights_gate').state, 'open', 'the party lights the string after the Alpha');
  at(32, 8);
  assert.ok(fired('gate'), 'the doorway beat fires after the Alpha');
  at(37, 8);
  assert.ok(fired('defend'));
  const ward = sim().view().hud.ward;
  assert.deepEqual([ward?.name, ward?.hp, ward?.hpMax, ward?.total], ['ELEVEN', S.defense?.hp, S.defense?.hp, 2700], 'the defense is running on a full clock');
  // A string of lights in reach, the key pressed: nothing lights while the ward is set.
  at(12, 19);
  assert.equal(prop('lights_den').state, 'off');
  tick(1, 'interact');
  tick(2, undefined);
  assert.equal(prop('lights_den').state, 'off', 'the second string stays dark during the defense');
});

test('scene: Eleven falling loses the stage like the whole party going down: the game over card comes up after her, not before', () => {
  assert.equal(stack.length, 0, 'no card yet');
  // The party stays out of the chamber, so the waves go for Eleven and nobody pulls them off her.
  at(29, 7);
  let downAt = -1, n = 0;
  for (; n < 5000 && stack.length === 0; n++) {
    tick(1);
    const w = sim().view().hud.ward;
    if (downAt < 0 && w && w.hp <= 1 && sim().view().actors.some((a) => a.id === 'eleven' && a.anim === 'ko')) downAt = n;
  }
  assert.ok(stack.length === 1, `the game over card came up after ${n} frames`);
  assert.ok(downAt >= 0, 'Eleven was down first');
  assert.ok(n - downAt >= 80 && n - downAt <= 130, `the card comes up about 100 frames after she falls: ${n - downAt}`);
  assert.ok(sim().view().actors.some((a) => a.id === 'eleven' && a.anim === 'ko'), 'she is on the floor');
  // Nothing else lost the stage: the party is still standing.
  assert.ok(sim().view().hud.party.some((p) => !p.ko), 'the party is up');
});

test('scene: a retry from lights_gate runs the defense again from the start, with the Alpha dead, the seals open and Eleven standing', () => {
  const over = stack[0] as Scene;
  tick(1, 'confirm');
  tick(1, 'confirm');
  assert.equal(stack.length, 0, 'RETRY closes the card');
  const v = sim().view();
  assert.equal(v.hud.ward, null, 'the defense has not started');
  assert.ok(!v.actors.some((a) => a.id === 'alpha'), 'the Alpha stays dead');
  assert.ok(!v.actors.some((a) => a.kind === 'enemy'), 'nothing run-time is left over');
  assert.deepEqual([prop('seal1').state, prop('seal2').state, prop('lights_gate').state, prop('crack1').state], ['open', 'open', 'open', 'open'], 'the seals, the lights and the broken crack stay open');
  const eleven = v.actors.find((a) => a.id === 'eleven');
  assert.ok(eleven && eleven.anim !== 'ko' && !eleven.bar, 'Eleven is standing at the rift with no bar');
  const p = sim().heroPos();
  assert.ok(Math.hypot(p.x - (29 * 16 + 8), p.y - (11 * 16 + 12)) < 24, 'the party is at lights_gate');
  // The gate beat is what lit lights_gate, so it is in the save too: the retry stands at the Gate, ready for the defense.
  for (const id of ['alpha', 'alpha_down', 'gate']) assert.ok(fired(id), `${id} is still fired`);
  for (const id of ['defend', 'level_clear']) assert.ok(!fired(id), `${id} is not`);
  assert.ok(over, 'the old card is gone');
  // And the defense comes back whole: a full clock, a full bar, the first wave up at once.
  at(32, 8);
  at(37, 8);
  const w = sim().view().hud.ward;
  assert.ok(fired('defend') && w && w.left >= 2700 - 10 && w.hp === w.hpMax, `the clock starts again from ${w?.left}, her bar at ${w?.hp}`);
  assert.ok(sim().view().actors.filter((a) => a.kind === 'enemy').length >= 2, 'the first wave of two comes up');
});

test('scene: with the bot on (?bot=1) a loss retries at once and the bot walks the whole route again, not from where it left off', () => {
  // Seed 15 is a run on which Eleven falls (node scripts/measure-stage.ts 2.3 chief 100). The retry keeps the party's levels, so the
  // second attempt can go either way, but it has to get to the den and the defense: a bot that kept its old route would stand idle.
  const flags = game.flags as unknown as { bot: boolean; seed: number };
  flags.bot = true;
  flags.seed = 15;
  let cleared = false;
  const botPlay = createPlayScene({
    stageId: '2.3', party: [{ id: 'mike', level: 6 }, { id: 'dustin', level: 5 }, { id: 'max', level: 4 }, { id: 'steve', level: 4 }],
    onClear: () => { cleared = true; }, onQuit: noop, onStartOver: noop,
  });
  stack.length = 0;
  botPlay.enter?.(game);
  flags.bot = false;
  const cycles = [{ den: false, defend: false }];
  let last: unknown = live().sim;
  for (let n = 0; n < 30000 && !cleared; n++) {
    game.frame++;
    botPlay.update(game);
    const l = live();
    if (l.sim !== last) { last = l.sim; cycles.push({ den: false, defend: false }); }
    const c = cycles[cycles.length - 1] as { den: boolean; defend: boolean };
    if (l.director.hasFired('den')) c.den = true;
    if (l.director.hasFired('defend')) c.defend = true;
  }
  assert.ok(cycles.length >= 2, 'the first attempt lost and the scene retried');
  assert.ok(cycles[0]?.defend, 'the first attempt got as far as the defense, where Eleven fell');
  assert.ok(cycles[1]?.den && cycles[1]?.defend, 'the second got to the den and the defense again');
  assert.ok(cleared || cycles.length >= 3, 'and went on to clear it or lose it again');
  assert.equal(stack.length, 0, 'a loss never stops on the card with the bot on');
});
