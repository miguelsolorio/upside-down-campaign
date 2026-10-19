// Eddie's Hellfire solo on the note highway (docs/level-11.md, "The Hellfire solo"; docs/chapter-4.md): the stand's own clock covers the second the
// notes take to come down the neck, then each struck note pulses the ring (a crit on a perfect), a miss narrows it, three misses in a row end it
// with no Encore, the Hellfire bond and Encore still hold, and world/songs.ts starts the riff from the view, strips the action keys while it plays,
// stops it when the stand ends some other way, and starts it again for Encore. The last test runs the real play scene on a fake canvas.
// The stand-in's own clock, undriven, is in tests/heroes-ch4.test.ts.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { HERO_DEFS } from '../src/heroes/index.ts';
import type { Enemy, Hero, S } from '../src/combat/state.ts';
import type { Game, Scene } from '../src/core/scene.ts';
import type { PartySeed, Sim, SimEvent, SimSpawn } from '../src/core/types.ts';
import type { PlayOptions } from '../src/world/types.ts';
import { SONG_BOT } from '../src/world/rooftop.ts';
import { headlessSongs, liveSongs } from '../src/world/songs.ts';
import type { Songs } from '../src/world/songs.ts';
import { botInput } from '../src/solo/bot.ts';
import { riff, ringRadius } from '../src/solo/index.ts';
import { RING_MAX, RING_START } from '../src/solo/judge.ts';
import { idle, inp, makeWhite, ofType, press, rat, run, tc, tf } from './sim-helpers.ts';

const hero = (s: S, i = 0): Hero => s.heroes[i] as Hero;
const enemy = (s: S, i = 0): Enemy => s.enemies[i] as Enemy;
const count = (ev: SimEvent[], id: string): number => ev.filter((e) => e.t === 'sfx' && e.id === id).length;
const PERFECT = { accuracy: 1, jitter: 0 };

/** Eddie (and whoever else) in the white arena with a full bar of MP. Fixed rolls, so a hit is exactly power x ATK. */
function rig(level = 3, party: PartySeed[] = [{ id: 'eddie' }], spawns: SimSpawn[] = []) {
  const r = makeWhite({ party: party.map((p) => ({ ...p, level: p.level ?? level })), start: { x: tc(4), y: tf(8) }, spawns });
  r.s.rng = () => 0.5;
  hero(r.s).mp = 18;
  return r;
}
/** Every foe stands still with HP to spare, and sits `d` px from Eddie's feet to the east. */
function setFoes(s: S, ...ds: number[]): void {
  s.enemies.forEach((e, i) => {
    e.stat.stun = 99999; e.hp = e.hpMax = 9999;
    e.x = hero(s).x + (ds[i] ?? 0); e.y = hero(s).y; e.hx = e.x; e.hy = e.y;
  });
}
const cast = (sim: Sim): SimEvent[] => press(sim, { specialPressed: true });
const standing = (s: S): boolean => s.t6.stand !== null;
const solo = (sim: Sim) => sim.view().hud.solo;
const note = (sim: Sim, hit: boolean, perfect: boolean, step: number): SimEvent[] => {
  sim.soloNote?.(hit, perfect, ringRadius(step));
  return run(sim, 1);
};
/** The input of a window with nothing pressed. */
const still = botInput([]);

// ---------------------------------------------------------------- the notes pulse the ring

test('the stand pulses on struck notes only once a highway drives it: the clock covers the lead-in, then stops at the first note', () => {
  const { sim, s } = rig();
  cast(sim);
  assert.deepEqual(solo(sim), { t: 0, life: 360, streak: 0, ring: 40, beat: 30 });
  const lead = run(sim, 40);
  assert.equal(count(lead, 'riff'), 1, 'the clock pulses at frame 30 while the notes are still coming down the neck');
  note(sim, true, false, 3);
  assert.equal(solo(sim)?.beat, 0, 'a driven stand has no beat of its own');
  assert.equal(count(run(sim, 400), 'riff'), 0, 'and the clock never pulses again, with the notes quiet');
  assert.ok(standing(s), 'and it does not end on its life either');
  assert.equal(count(note(sim, true, false, 4), 'riff'), 1, 'a struck note is a pulse');
  assert.equal(count(note(sim, false, false, 3), 'riff'), 0, 'a miss is not');
});

test('a struck note pulses the highway\'s ring, a crit on a perfect and none on a plain hit, and the view follows the streak and the ring', () => {
  const { sim, s } = rig(3, [{ id: 'eddie' }], [rat('a', 20, 3)]);
  setFoes(s, 30);
  cast(sim);
  const plain = note(sim, true, false, RING_START + 1);
  assert.deepEqual(ofType(plain, 'hit').filter((h) => h.onEnemy).map((h) => h.crit), [false]);
  assert.equal(sim.view().fx.find((f) => f.kind === 'riff')?.w, ringRadius(RING_START + 1) * 2, 'the ring on screen is the highway\'s');
  const perfect = note(sim, true, true, RING_START + 3);
  assert.deepEqual(ofType(perfect, 'hit').filter((h) => h.onEnemy).map((h) => h.crit), [true]);
  assert.deepEqual(solo(sim), { t: 2, life: 360, streak: 2, ring: ringRadius(RING_START + 3), beat: 0 });
});

test('a miss narrows the ring a step and breaks the streak, and the next pulse is as wide as the narrowed ring', () => {
  const { sim, s } = rig(3, [{ id: 'eddie' }], [rat('a', 20, 3)]);
  setFoes(s, 41);
  cast(sim);
  note(sim, true, false, RING_START + 2);
  const hurt = enemy(s).hp;
  assert.ok(hurt < 9999, 'a foe 41 px out is reached by a ring of 36 px (a pulse reaches 6 px past its edge)');
  assert.equal(solo(sim)?.streak, 1);
  note(sim, false, false, RING_START + 1);
  note(sim, false, false, RING_START);
  assert.deepEqual([solo(sim)?.streak, solo(sim)?.ring], [0, ringRadius(RING_START)]);
  note(sim, true, false, RING_START);
  assert.equal(enemy(s).hp, hurt, 'but not by one of 28 px');
});

// ---------------------------------------------------------------- the end of the solo

test('the solo\'s end ends the stand; three misses in a row cut it short and allow no Encore, and Encore plays a finished one once more', () => {
  const lv3 = rig(3);
  cast(lv3.sim);
  note(lv3.sim, true, false, 3);
  lv3.sim.soloEnd?.();
  assert.equal(standing(lv3.s), false);
  assert.ok(hero(lv3.s).cdSpecial <= HERO_DEFS.eddie.special.cd, 'and the Special cools from there');
  const lv9 = rig(9);
  cast(lv9.sim);
  note(lv9.sim, true, false, 3);
  lv9.sim.soloEnd?.(true);
  assert.equal(standing(lv9.s), false, 'cut short: the squeal, no Encore');
  const enc = rig(9);
  cast(enc.sim);
  note(enc.sim, true, false, 3);
  enc.sim.soloEnd?.(false);
  assert.ok(standing(enc.s), 'Encore keeps the stand up');
  assert.equal(enc.sim.view().floaters.some((f) => f.text === 'ENCORE'), true);
  assert.deepEqual([solo(enc.sim)?.streak, solo(enc.sim)?.beat], [0, 30], 'the clock covers the next lead-in');
  assert.equal(count(run(enc.sim, 40), 'riff'), 1);
  note(enc.sim, true, false, 3);
  enc.sim.soloEnd?.(false);
  assert.equal(standing(enc.s), false, 'once');
});

// ---------------------------------------------------------------- the songs

/** The riff played against a sim by world/songs.ts, a tick at a time until the stand is gone or `limit` ticks. */
function play(r: ReturnType<typeof rig>, songs: Songs, limit = 2000) {
  let pulses = 0, ticks = 0, aliveAt400 = false, aliveAt600 = false;
  songs.step(still, solo(r.sim));
  for (; ticks < limit && standing(r.s); ticks++) {
    pulses += count(r.sim.step(idle()), 'riff');
    songs.step(still, solo(r.sim));
    if (ticks === 400) aliveAt400 = standing(r.s);
    if (ticks === 600) aliveAt600 = standing(r.s);
  }
  return { pulses, ticks, aliveAt400, aliveAt600 };
}

test('the Hellfire bond: with Dustin the stand is 480 frames and the riff chart plays out inside it, and a lone Eddie\'s 360 does not cut the riff short', () => {
  for (const party of [[{ id: 'eddie' }, { id: 'dustin' }], [{ id: 'eddie' }]] as PartySeed[][]) {
    const r = rig(3, party);
    cast(r.sim);
    assert.equal(solo(r.sim)?.life, party.length === 2 ? 480 : 360);
    const p = play(r, headlessSongs(() => r.sim, PERFECT));
    assert.equal(p.aliveAt400, true, 'still playing after 400 frames');
    assert.ok(p.ticks > 410 && p.ticks < 440, `the stand holds until the riff ends: ${p.ticks} frames`);
    assert.ok(p.pulses >= riff.notes.length, `${p.pulses} pulses for ${riff.notes.length} notes`);
  }
});

test('Encore: a finished riff plays once more, a cut one does not, and Lv 8 has no second', () => {
  const second = rig(9);
  cast(second.sim);
  const twice = play(second, headlessSongs(() => second.sim, PERFECT));
  assert.equal(twice.aliveAt600, true, 'the second riff is still playing at frame 600');
  assert.ok(twice.ticks > 830 && twice.ticks < 880, `${twice.ticks} frames for two riffs`);
  assert.ok(twice.pulses >= riff.notes.length * 2, `${twice.pulses} pulses`);
  const lv8 = rig(8);
  cast(lv8.sim);
  assert.ok(play(lv8, headlessSongs(() => lv8.sim, PERFECT)).ticks < 440, 'one riff at Lv 8');
  const never = rig(9);
  cast(never.sim);
  const cut = play(never, headlessSongs(() => never.sim, { accuracy: 0, jitter: 0 }));
  assert.ok(cut.ticks > 100 && cut.ticks < 130, `three misses end it at ${cut.ticks} frames: a note at 0, 24 and 48 and a window each`);
  assert.equal(standing(never.s), false, 'with no Encore at Lv 9');
});

test('the careful bot (nine notes in ten) keeps the stand to its riff and gets pulses out of it', () => {
  const r = rig(5, [{ id: 'eddie' }], [rat('a', 20, 3)]);
  setFoes(r.s, 30);
  cast(r.sim);
  const p = play(r, headlessSongs(() => r.sim, SONG_BOT));
  assert.ok(p.ticks > 100 && p.ticks < 440, `${p.ticks} frames`);
  assert.ok(p.pulses >= 5, `${p.pulses} pulses`);
  assert.ok(enemy(r.s).hp < 9999);
});

test('songs: the roof\'s solo (life 0) starts no riff; the riff takes the action keys and leaves the swap; a swap away stops it and a second cast starts a fresh one', () => {
  const r = rig(3, [{ id: 'eddie' }, { id: 'mike' }]);
  const songs = headlessSongs(() => r.sim, PERFECT);
  const keys = inp({ attackPressed: true, attackHeld: true, specialPressed: true, burstPressed: true, mx: 1, swapTo: 1 });
  songs.step(undefined, { t: 5, life: 0, streak: 2, ring: 40, beat: 0 });
  assert.equal(songs.keys(keys), keys, 'a roof solo is not a riff: the input goes through');
  cast(r.sim);
  songs.step(undefined, solo(r.sim));
  const kept = songs.keys(keys);
  assert.deepEqual([kept.attackPressed, kept.attackHeld, kept.specialPressed, kept.burstPressed, kept.mx, kept.swapTo], [false, false, false, false, 0, 1]);
  assert.equal(songs.holds, false, 'and the sim is not held, as it is for the rooftop');
  press(r.sim, { swapTo: 1 }, 3);
  assert.equal(standing(r.s), false);
  songs.step(undefined, solo(r.sim));
  assert.equal(songs.keys(keys), keys, 'the swap stopped the riff');
  run(r.sim, 20);
  press(r.sim, { swapTo: 0 }, 70);
  hero(r.s).mp = 18;
  cast(r.sim);
  songs.step(undefined, solo(r.sim));
  assert.notEqual(songs.keys(keys), keys, 'and the next stand has a riff of its own');
});

// ---------------------------------------------------------------- the play scene

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
const disk = new Map<string, string>();
Object.defineProperty(globalThis, 'localStorage', {
  configurable: true,
  value: { getItem: (k: string) => disk.get(k) ?? null, setItem: (k: string, v: string) => { disk.set(k, v); }, removeItem: (k: string) => { disk.delete(k); } },
});
(globalThis as unknown as { __ud: unknown }).__ud = {};
const { createPlayScene } = await import('../src/world/play.ts');

const keysDown = new Set<string>();
const game: Game = {
  input: {
    poll: noop, held: (a: string) => keysDown.has(a), pressed: (a: string) => keysDown.has(a), released: () => false, axis: () => ({ x: 0, y: 0 }),
    device: () => 'keyboard', hover: () => null, moved: () => false, wheel: () => 0, clicked: () => null, point: noop, notice: () => null,
    capture: () => noop, offer: noop, offered: () => false, interrupted: () => false,
  } as unknown as Game['input'],
  settings: { difficulty: 'chief', shake: 1, reduceFlashing: false } as unknown as Game['settings'],
  flags: { bot: false, god: false, dev: false, level: 0, seed: 1, party: null } as unknown as Game['flags'],
  scenes: { push: noop, pop: noop, top: () => null, go: noop, update: noop, draw: noop } as unknown as Game['scenes'],
  frame: 0,
};
const live = (): { sim: Sim; retry(): void } => (globalThis as unknown as { __ud: { play: { sim: Sim; retry(): void } } }).__ud.play;

test('scene: Eddie\'s Special starts the highway, the lane keys play it, the notes widen the ring, and its end ends the stand', () => {
  const opts: PlayOptions = { stageId: '4.2', party: [{ id: 'eddie', level: 5 }, { id: 'mike', level: 5 }], onClear: noop, onQuit: noop, onStartOver: noop };
  const scene: Scene = createPlayScene(opts);
  scene.enter?.(game);
  const tick = (...keys: string[]): void => {
    game.frame++;
    keys.forEach((k) => keysDown.add(k));
    scene.update(game);
    keysDown.clear();
  };
  const sim = (): Sim => live().sim;
  const mp = (): number => sim().view().hud.party[0]?.mp ?? 0;
  const lane = ['attack', 'special', 'burst'];
  tick();
  tick();
  assert.equal(sim().view().hud.solo, null);
  const full = mp();
  // The cast is tick 1 of the stand; the highway starts on the next and its notes come down for 60 frames before the first is due.
  tick('special');
  assert.ok(mp() < full, 'the cast spends the MP');
  const spent = mp();
  const at = (n: number): string[] => riff.notes.filter((x) => x.frame + 62 === n).map((x) => lane[x.lane] as string);
  let n = 1;
  for (n = 2; n <= 62 + riff.length + 5; n++) {
    tick(...at(n));
    if (n === 62 + riff.notes[3]!.frame + 1) assert.deepEqual([sim().view().hud.solo?.streak, sim().view().hud.solo?.ring], [4, ringRadius(Math.min(RING_MAX, RING_START + 8))], 'four perfects');
    assert.ok(mp() >= spent, 'the Special lane never spends the MP again');
  }
  assert.equal(sim().view().hud.solo, null, 'the solo is over, and so is the stand');
  assert.ok(mp() >= spent);
  // A retry drops the highway with the sim; the next cast starts a fresh one.
  live().retry();
  tick();
  assert.equal(sim().view().hud.solo, null);
  tick('special');
  tick();
  assert.ok(sim().view().hud.solo, 'a new stand');
  assert.deepEqual(sim().view().hud.solo?.streak, 0);
});

test('scene: three misses in a row cut the highway short with the stand', () => {
  const scene: Scene = createPlayScene({ stageId: '4.2', party: [{ id: 'eddie', level: 5 }, { id: 'mike', level: 5 }], onClear: noop, onQuit: noop, onStartOver: noop });
  scene.enter?.(game);
  const tick = (...keys: string[]): void => { game.frame++; keys.forEach((k) => keysDown.add(k)); scene.update(game); keysDown.clear(); };
  tick();
  tick('special');
  tick();
  assert.ok(live().sim.view().hud.solo, 'the stand is up');
  // Third note at frame 48 plus its window: the solo ends 55 frames in, after the 60 of lead-in.
  for (let i = 0; i < 60 + 55 - 3; i++) tick();
  assert.ok(live().sim.view().hud.solo, 'one frame short of the third miss');
  for (let i = 0; i < 6; i++) tick();
  assert.equal(live().sim.view().hud.solo, null, 'the squeal: no stand');
});

test('scene: the pause menu holds the highway, so no note goes by while it is up, and a press on a lane brings it back', () => {
  const scene: Scene = createPlayScene({ stageId: '4.2', party: [{ id: 'eddie', level: 5 }, { id: 'mike', level: 5 }], onClear: noop, onQuit: noop, onStartOver: noop });
  scene.enter?.(game);
  const tick = (...keys: string[]): void => { game.frame++; keys.forEach((k) => keysDown.add(k)); scene.update(game); keysDown.clear(); };
  tick();
  tick('special');
  for (let i = 0; i < 30; i++) tick();
  tick('pause');
  // Three misses would end it 115 frames in; with the menu up the highway and its music hold still.
  for (let i = 0; i < 300; i++) tick();
  assert.ok(live().sim.view().hud.solo, 'no note has gone by');
  tick('attack');
  for (let i = 0; i < 140; i++) tick();
  assert.equal(live().sim.view().hud.solo, null, 'and from the press it plays on, from the bar line');
});

test('liveSongs: with ?bot=1 the solo\'s own bot plays the riff on the real highway, to its end, and the stand ends with it', () => {
  const r = rig(3);
  const songs = liveSongs(() => r.sim, () => PERFECT);
  cast(r.sim);
  const p = play(r, songs);
  assert.ok(p.aliveAt400 && p.ticks > 410 && p.ticks < 440, `${p.ticks} frames`);
  assert.ok(p.pulses >= riff.notes.length, `${p.pulses} pulses`);
});
