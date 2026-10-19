// Stage 4.2 in play: whole headless runs of the bot through the club, the street, the foyer, the hall, the parlor's curse and the back hall (the
// curse fires and ends, the Walkman is given, Max's music ends it when she is in the party), a retry from each string of lights with the kills
// and the open mirrors carried over, and the real play scene on a fake canvas (the strings, the retry, the Walkman saved). The map, the budget
// and the route are in stage42.test.ts, the beats and the scripts in stage42-story.test.ts.
//
// The runs play the stage with enemyMult at ROUTE_MULT, not the stage's own: the number the stage ships with is the lead's to tune
// (docs/level-11.md, "Targets"). These runs prove the route, the beats and the curse, whatever it is.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { defaultParty } from '../src/core/campaign.ts';
import type { Game, Scene } from '../src/core/scene.ts';
import type { PartySeed, PropView, Sim, SimEvent } from '../src/core/types.ts';
import type { PlayOptions, StageData } from '../src/world/types.ts';
import { createSim } from '../src/combat/index.ts';
import { createBot } from '../src/combat/bot.ts';
import { routeFrom, simOptions, stageGrid } from '../src/world/options.ts';
import { createMemoryFade } from '../src/world/memory.ts';
import { createDirector } from '../src/world/triggers.ts';
import { S, kit } from './stage42-helpers.ts';
import { stageXp } from './stage-helpers.ts';

/** The factor the bot clears at on chief every time (20 seeds of 20, careless too), under what the lead will ship. */
const ROUTE_MULT = 1;
const PLAYED: StageData = { ...S, enemyMult: ROUTE_MULT };
const ORDER = ['l11_start', 'l11_walkman', 'l11_street', 'l11_yard', 'l11_mirror_hint', 'l11_mirror_done', 'l11_curse', 'l11_curse_end', 'l11_finale', 'l11_clear'];
/** Max is in this party, so the Walkman the beat gives is hers to play. */
const WITH_MAX: PartySeed[] = [{ id: 'mike', level: 8 }, { id: 'max', level: 7 }, { id: 'robin', level: 5 }, { id: 'eddie', level: 5 }];

interface Run { done: boolean; allDown: boolean; frames: number; xp: number; said: string[]; steps: string[]; gave: number; events: SimEvent[]; sim: Sim; memoryMax: number; memoryEnd: number }

/** Plays the stage whole: the bot walks the waypoints, the director runs the beats, the dialogue is skipped, the Walkman beat gives it. */
function play(stage: StageData, seed: number, party: PartySeed[], careless = false): Run {
  const grid = stageGrid(stage);
  const sim = createSim(simOptions(stage, grid, { party, seed, difficulty: 'chief' }));
  const bot = createBot({ grid, waypoints: stage.waypoints, careless });
  const said: string[] = [], steps: string[] = [], events: SimEvent[] = [];
  let gave = 0;
  const dir = createDirector(stage.beats, stage.waves, {
    sim: () => sim, say: (id, done) => { said.push(id); done(); }, scare: (done) => done(),
    open: (id) => { steps.push(`open ${id}`); sim.openProp(id); }, walkman: () => { gave++; sim.giveWalkman?.(); },
    light: (id) => { steps.push(`light ${id}`); sim.openProp(id); sim.healParty(0.5); }, jingle: () => undefined, finish: () => undefined,
  });
  // The play scene fades the parlor into its Blood red skin while a curse counts (world/memory.ts): how far it got, and where it ended.
  const fade = createMemoryFade();
  let allDown = false, f = 0, memoryMax = 0;
  for (; f < 30000 && !dir.finished() && !allDown; f++) {
    const ev = sim.step(bot.next(sim));
    fade.step(sim.view());
    memoryMax = Math.max(memoryMax, fade.k());
    dir.events(ev);
    for (const e of ev) {
      if (e.t === 'cursed' || e.t === 'curseEnd' || e.t === 'walkman' || e.t === 'allDown') events.push(e);
      if (e.t === 'allDown') allDown = true;
    }
    const p = sim.heroPos();
    dir.tick(Math.floor(p.x / 16), Math.floor((p.y - 4) / 16));
  }
  return { done: dir.finished(), allDown, frames: f, xp: sim.stats().xpEarned, said, steps, gave, events, sim, memoryMax, memoryEnd: fade.k() };
}

// ---------------------------------------------------------------- whole runs
test('stage 4.2: the bot clears the stage on chief, through every beat in order, the Walkman given and the clock curse fired and broken by Eddie', () => {
  const party = defaultParty('4.2');
  assert.deepEqual(party.map((p) => p.id), ['mike', 'dustin', 'robin', 'eddie'], 'a party with Eddie in it');
  for (const careless of [false, true]) {
    for (const seed of [1, 2, 3]) {
      const run = play(PLAYED, seed, party, careless);
      const tag = `seed ${seed}${careless ? ' careless' : ''}`;
      assert.ok(run.done && !run.allDown, `${tag} clears`);
      assert.deepEqual(run.said, ORDER, `${tag}: every beat, in order, and not the pantry's`);
      assert.deepEqual(run.steps, ['open door_back'], `${tag}: the bot opens mirror1 itself, and the clear opens door_back`);
      assert.equal(run.gave, 1, `${tag}: the Walkman is given once`);
      const cursed = run.events.filter((e) => e.t === 'cursed');
      const ended = run.events.filter((e) => e.t === 'curseEnd');
      assert.equal(cursed.length, 1, `${tag}: one curse`);
      assert.ok(cursed.every((e) => e.t === 'cursed' && e.hero !== 'eddie' && e.hero !== 'max'), `${tag}: it takes a hero who is neither Eddie nor Max`);
      assert.deepEqual(ended.map((e) => (e.t === 'curseEnd' ? [e.hero, e.how] : null)), [[(cursed[0] as { hero: string }).hero, 'clock']], `${tag}: the clock breaks and lifts it`);
      assert.ok(!run.events.some((e) => e.t === 'walkman'), `${tag}: nobody plays a Walkman Max is not in the party to play`);
      assert.ok(run.xp >= stageXp(PLAYED) * 0.6, `${tag}: ${run.xp} XP, most of the ghouls`);
      assert.ok(run.frames > 60 * 30 && run.frames < 60 * 240, `${tag}: ${(run.frames / 60).toFixed(0)} s`);
      assert.equal(run.sim.view().hud.walkman, null, `${tag}: no Walkman on the HUD without Max in the party`);
      assert.equal(run.memoryMax, 1, `${tag}: the parlor goes all the way to Blood red while the curse counts`);
      assert.equal(run.memoryEnd, 0, `${tag}: and is Abandoned again by the end`);
    }
  }
});

test('stage 4.2: with Max in the party the bot plays her Walkman at the curse, which ends it without the clock, and the clock is left standing', () => {
  for (const seed of [1, 2, 3]) {
    const run = play(PLAYED, seed, WITH_MAX);
    assert.ok(run.done && !run.allDown, `seed ${seed} clears`);
    assert.deepEqual(run.said, ORDER, `seed ${seed}: every beat, in order`);
    const ended = run.events.filter((e) => e.t === 'curseEnd');
    assert.deepEqual(ended.map((e) => (e.t === 'curseEnd' ? e.how : null)), ['walkman'], `seed ${seed}: Max's music ends the curse`);
    assert.equal(run.events.filter((e) => e.t === 'walkman').length, 1, `seed ${seed}: it plays once`);
    assert.ok(run.events.findIndex((e) => e.t === 'cursed') < run.events.findIndex((e) => e.t === 'walkman'), `seed ${seed}: after the chime`);
    assert.notEqual(run.sim.view().props.find((p) => p.id === 'clock1')?.state, 'open', 'the clock is still whole');
    assert.ok(run.sim.view().hud.walkman !== null, 'the HUD shows the Walkman on Max\'s slot');
  }
});

// ---------------------------------------------------------------- a retry from each string
/** What the party carries into a retry from `light`: the beats played, the groups gone, the strings lit, mirror1 shattered and the Walkman given. */
const CARRIED: Record<string, { fired: string[]; cleared: string[]; open: string[]; walkman: boolean }> = {
  lights_club: { fired: ['start'], cleared: [], open: ['lights_club'], walkman: false },
  lights_yard: { fired: ['start', 'walkman', 'street', 'yard'], cleared: [], open: ['lights_club', 'lights_yard'], walkman: true },
  lights_hall: {
    fired: ['start', 'walkman', 'street', 'yard', 'mirror_hint', 'mirror_done'], cleared: ['foyer', 'hall'],
    open: ['lights_club', 'lights_yard', 'lights_hall', 'mirror1'], walkman: true,
  },
};
const LEFT: Record<string, string[]> = {
  lights_club: ORDER.slice(1),
  lights_yard: ORDER.slice(4),
  lights_hall: ORDER.slice(6),
};

/** The stage rebuilt at a string the way the play scene does it, and run to the end. Kept open: `extra`, such as a clock already broken. */
function retry(light: string, extra: string[] = [], party: PartySeed[] = defaultParty('4.2'), dead: string[] = []): { sim: Sim; said: string[]; done: boolean; events: SimEvent[] } {
  const cp = PLAYED.checkpoints.find((c) => c.prop === light) as (typeof PLAYED.checkpoints)[number];
  const have = CARRIED[light] as (typeof CARRIED)[string];
  const gone = kit.enemies.filter((e) => have.cleared.includes(e.group) || dead.includes(e.group)).map((e) => e.id);
  const grid = stageGrid(PLAYED);
  const sim = createSim(simOptions(PLAYED, grid, { party, start: { x: cp.x, y: cp.y }, seed: 5, difficulty: 'chief', skipSpawns: gone, openProps: [...have.open, ...extra], walkman: have.walkman }));
  const said: string[] = [], events: SimEvent[] = [];
  const dir = createDirector(PLAYED.beats, PLAYED.waves, {
    sim: () => sim, say: (id, done) => { said.push(id); done(); }, scare: (done) => done(), open: (id) => sim.openProp(id), jingle: () => undefined, finish: () => undefined,
    walkman: () => sim.giveWalkman?.(),
  });
  dir.restore({ fired: have.fired, cleared: have.cleared });
  const bot = createBot({ grid, waypoints: routeFrom(PLAYED.waypoints, cp) });
  for (let f = 0; f < 30000 && !dir.finished(); f++) {
    const ev = sim.step(bot.next(sim));
    dir.events(ev);
    for (const e of ev) if (e.t === 'cursed' || e.t === 'curseEnd') events.push(e);
    const p = sim.heroPos();
    dir.tick(Math.floor(p.x / 16), Math.floor((p.y - 4) / 16));
  }
  return { sim, said, done: dir.finished(), events };
}

for (const light of ['lights_club', 'lights_yard', 'lights_hall']) {
  test(`stage 4.2: a retry from ${light}, with the kills and the open mirror carried over, walks on and clears`, () => {
    const r = retry(light);
    assert.ok(r.done, 'the stage is cleared');
    assert.deepEqual(r.said, LEFT[light], 'the beats that were left play, and the ones before the string do not play again');
    assert.equal(r.sim.enemiesAlive('finale'), 0, 'and the back hall is clear');
    // The curse beat fires again for any string lit before it: the clock is whole after a retry, and it is the same lesson.
    if (light !== 'lights_club') assert.equal(r.events.filter((e) => e.t === 'cursed').length, 1);
  });
}

test('stage 4.2: a retry from lights_yard with mirror1 already shattered (kept open) still reaches the clock and the finale, though mirror_done never fires again', () => {
  const r = retry('lights_yard', ['mirror1'], defaultParty('4.2'), ['foyer']);
  assert.ok(r.done, 'the stage is cleared');
  assert.deepEqual(r.said, ['l11_mirror_hint', 'l11_curse', 'l11_curse_end', 'l11_finale', 'l11_clear'], 'the foyer\'s hint plays again, mirror_done does not, and the curse chain goes on');
  assert.equal(r.events.filter((e) => e.t === 'cursed').length, 1);
});

test('stage 4.2: a retry with the clock already broken still clears: the curse does nothing, no curse ends, and the finale starts all the same', () => {
  const r = retry('lights_hall', ['clock1']);
  assert.ok(r.done, 'the stage is cleared');
  assert.deepEqual(r.said, ['l11_curse', 'l11_finale', 'l11_clear'], 'no chime, no curse end');
  assert.deepEqual(r.events, []);
});

test('stage 4.2: a retry from lights_hall with Max in the party starts with the Walkman on her slot, ready', () => {
  const r = retry('lights_hall', [], WITH_MAX);
  assert.ok(r.done);
  assert.ok(r.events.some((e) => e.t === 'curseEnd' && e.how === 'walkman'), 'and she plays it at the curse');
});

// ---------------------------------------------------------------- a fake canvas and a fake localStorage
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

// ---------------------------------------------------------------- a fake game
const pressed = new Set<string>();
const stack: Scene[] = [];
const game: Game = {
  input: {
    poll: noop, held: (a: string) => pressed.has(a), pressed: (a: string) => pressed.has(a), released: () => false, axis: () => ({ x: 0, y: 0 }),
    device: () => 'keyboard', hover: () => null, moved: () => false, wheel: () => 0, clicked: () => null, point: noop, notice: () => null,
    capture: () => noop, offer: noop, offered: () => false, interrupted: () => false,
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
interface Handle { sim: Sim; retry(): void; director: { hasFired(id: string): boolean }; stage: { memory?: { tx: number; ty: number; w: number; h: number }; memoryBaked: unknown } }
const live = (): Handle => (globalThis as unknown as { __ud: { play: Handle } }).__ud.play;
const sim = (): Sim => live().sim;
const prop = (id: string): PropView => sim().view().props.find((p) => p.id === id) as PropView;

/** A scene on stage 4.2. `at` puts the active hero on a tile and ticks a few frames. `saved` counts the Walkman callbacks. */
function start(party: PartySeed[] = defaultParty('4.2'), walkman = false): { tick(n?: number, key?: string): void; at(tx: number, ty: number): void; saved: () => number; cleared: () => number } {
  stack.length = 0;
  pressed.clear();
  let cleared = 0, saved = 0;
  const opts: PlayOptions = { stageId: '4.2', party, onClear: () => { cleared++; }, onQuit: noop, onStartOver: noop, walkman, onWalkman: () => { saved++; } };
  const scene = createPlayScene(opts);
  scene.enter?.(game);
  const tick = (n = 1, key?: string): void => {
    for (let i = 0; i < n; i++) {
      game.frame++;
      if (key) pressed.add(key);
      (stack[stack.length - 1] ?? scene).update(game);
      pressed.clear();
    }
  };
  tick(2);
  return { tick, at: (tx, ty) => { sim().dev.teleport(tx * 16 + 8, ty * 16 + 12); tick(3); }, saved: () => saved, cleared: () => cleared };
}
const heroTile = (): [number, number] => { const p = sim().heroPos(); return [Math.floor(p.x / 16), Math.floor((p.y - 4) / 16)]; };

// ---------------------------------------------------------------- the scene
test('scene: the party starts in the club with Eddie in it, and each string lights and saves the place, so a retry stands the party by it with it still lit', () => {
  const s = start();
  sim().dev.god = true;
  assert.ok(live().director.hasFired('start'), 'the start beat fired on the first tick');
  assert.deepEqual(sim().party().map((p) => p.id), ['mike', 'dustin', 'robin', 'eddie']);
  assert.equal(sim().view().hud.party.length, 4);
  assert.deepEqual(live().stage.memory, S.memory, 'the scene knows the memory room');
  assert.ok(live().stage.memoryBaked, 'and has the parlor baked in Blood red');
  for (const c of S.checkpoints) {
    s.at(Math.floor(c.x / 16), Math.floor((c.y - 4) / 16));
    s.tick(1, 'interact');
    assert.equal(prop(c.prop).state, 'open', `${c.prop} is lit`);
    s.at(8, 34);
    live().retry();
    s.tick(2);
    const [tx, ty] = heroTile();
    assert.deepEqual([tx, ty], [Math.floor(c.x / 16), Math.floor((c.y - 4) / 16)], `a retry stands the party by ${c.prop}`);
    assert.equal(prop(c.prop).state, 'open', `and ${c.prop} is still lit`);
  }
});

test('scene: the Walkman beat gives it once and the save hears of it at once, so a retry or a second visit still has it, and the HUD shows it for Max', () => {
  const s = start(WITH_MAX);
  sim().dev.god = true;
  assert.equal(s.saved(), 0);
  assert.equal(sim().view().hud.walkman, null, 'not before the beat');
  s.at(20, 34);
  assert.ok(live().director.hasFired('walkman'));
  assert.equal(s.saved(), 1, 'the save gets the Walkman as the beat plays');
  assert.deepEqual(sim().view().hud.walkman, { ready: 1, on: 0 }, 'ready on Max\'s slot');
  s.tick(120);
  assert.equal(s.saved(), 1, 'and only once');
  // A string lit after it keeps the beat played, so a retry has the Walkman and does not give it again.
  const lights = S.checkpoints.find((c) => c.prop === 'lights_yard') as (typeof S.checkpoints)[number];
  s.at(Math.floor(lights.x / 16), Math.floor((lights.y - 4) / 16) - 1);
  s.tick(1, 'interact');
  live().retry();
  s.tick(3);
  assert.deepEqual(sim().view().hud.walkman, { ready: 1, on: 0 }, 'the Walkman is still on Max\'s slot after a retry');
  assert.equal(s.saved(), 1);
  // A scene that begins with the save's Walkman has it from the start, with no beat.
  start(WITH_MAX, true);
  assert.deepEqual(sim().view().hud.walkman, { ready: 1, on: 0 }, 'a later stage starts with it');
});

test('scene: the curse beat chimes the clock and lifts a hero, a wipe in it retries from the last string with the curse gone, and the clear opens door_back for good', () => {
  const s = start();
  sim().dev.god = true;
  s.at(38, 17);
  assert.ok(live().director.hasFired('mirror_hint'));
  sim().openProp('mirror1');
  s.tick(2);
  assert.equal(prop('mirror1').state, 'open');
  // The hall's string, lit before the parlor, is the save point for the curse.
  const lights = S.spawns.find((q) => q.kind === 'prop' && q.id === 'lights_hall') as { tx: number; ty: number };
  s.at(lights.tx + 1, lights.ty + 1);
  s.tick(1, 'interact');
  s.at(25, 6);
  assert.ok(live().director.hasFired('curse'), 'the curse beat fired in the parlor');
  s.tick(5);
  assert.ok(sim().view().hud.party.some((p) => (p.curse ?? 0) > 0), 'a hero is cursed, with the clock mark on their slot');
  live().retry();
  s.tick(3);
  assert.ok(!sim().view().hud.party.some((p) => (p.curse ?? 0) > 0), 'the retry has no curse');
  assert.ok(!live().director.hasFired('curse'), 'and the beat plays again, since the string was lit before it');
  const [tx, ty] = heroTile();
  assert.ok(tx >= 20 && tx <= 22 && ty >= 11, `the party stands by lights_hall again: ${tx},${ty}`);
  s.at(25, 6);
  assert.ok(live().director.hasFired('curse'));
  s.tick(30);
  assert.equal(prop('door_back').state, 'closed', 'door_back stays shut until the finale is cleared');
  s.at(30, 5);
  assert.ok(live().director.hasFired('finale'), 'the finale needs the curse beat, not the curse to end');
  assert.equal(prop('door_back').state, 'closed');
  sim().dev.killAll();
  s.tick(30);
  assert.equal(prop('door_back').state, 'open');
  s.tick(150);
  assert.equal(s.cleared(), 1, 'the stage reaches its results once');
});
