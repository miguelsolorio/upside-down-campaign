// Stage 5.1 in play: whole headless runs of the bot through the street, the checkpoint, the square, the Lab and the bay, a retry from each string
// of lights with the kills and the open gate carried over, and the real play scene on a fake canvas (the lights, the retry, the bay's door and
// music, the clear). The map, the budget and the route are in stage51.test.ts, the beats and the scripts in stage51-story.test.ts.
//
// The runs play the stage with enemyMult at ROUTE_MULT, not the stage's own: the number the stage ships with is tuned so the bot loses
// some runs (docs/level-14.md, "Result"), and these prove the route, the beats and the Commander's fight, whatever it is.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { defaultParty } from '../src/core/campaign.ts';
import type { Game, Scene } from '../src/core/scene.ts';
import type { PartySeed, PropView, Sim } from '../src/core/types.ts';
import type { PlayOptions, StageData } from '../src/world/types.ts';
import { audio } from '../src/audio/index.ts';
import { createSim } from '../src/combat/index.ts';
import { createBot } from '../src/combat/bot.ts';
import { routeFrom, simOptions, stageGrid } from '../src/world/options.ts';
import { createDirector } from '../src/world/triggers.ts';
import { S, kit } from './stage51-helpers.ts';
import { playStage, stageXp } from './stage-helpers.ts';

/** The factor the bot clears at on chief every time (careless too), under what the stage ships with. */
const ROUTE_MULT = 1;
const PLAYED: StageData = { ...S, enemyMult: ROUTE_MULT };
const ORDER = ['l14_start', 'l14_checkpoint', 'l14_square', 'l14_cache_hint', 'l14_commander', 'l14_clear'];

// ---------------------------------------------------------------- whole runs
test('stage 5.1: the bot clears the stage on chief, through every beat in order, the boom gate and the Commander included', () => {
  const party = defaultParty('5.1');
  assert.deepEqual(party.map((p) => p.id), ['mike', 'dustin', 'robin', 'hopper'], 'the party a jump brings, Hopper locked in');
  for (const careless of [false, true]) {
    for (const seed of [1, 2, 3]) {
      const run = playStage(PLAYED, seed, party, 30000, 'chief', careless);
      assert.ok(run.done && !run.allDown, `seed ${seed}${careless ? ' careless' : ''} clears`);
      assert.deepEqual(run.said, ORDER, `seed ${seed}: every beat, in order`);
      assert.deepEqual(run.steps, ['open door1'], 'the bot opens boom1 by flag, not by the director, and the clear opens the door');
      assert.ok(run.xp >= stageXp(PLAYED), `seed ${seed}: ${run.xp} XP, every foe and the Commander`);
      assert.ok(run.frames > 60 * 60 && run.frames < 60 * 300, `seed ${seed}: ${(run.frames / 60).toFixed(0)} s`);
    }
  }
});

// ---------------------------------------------------------------- a retry from each string
/** What the party carries into a retry from `light`: the beats played, the groups gone, the strings lit and the gate broken. */
const CARRIED: Record<string, { fired: string[]; cleared: string[]; open: string[] }> = {
  lights_street: { fired: ['start'], cleared: [], open: ['lights_street'] },
  lights_square: { fired: ['start', 'checkpoint', 'square'], cleared: ['street', 'checkpoint'], open: ['lights_street', 'lights_square', 'boom1'] },
  lights_lab: {
    fired: ['start', 'checkpoint', 'square', 'cache_hint'], cleared: ['street', 'checkpoint', 'square', 'lab'],
    open: ['lights_street', 'lights_square', 'lights_lab', 'boom1'],
  },
};
const LEFT: Record<string, string[]> = {
  lights_street: ORDER.slice(1),
  lights_square: ['l14_cache_hint', 'l14_commander', 'l14_clear'],
  lights_lab: ['l14_commander', 'l14_clear'],
};

for (const light of ['lights_street', 'lights_square', 'lights_lab']) {
  test(`stage 5.1: a retry from ${light}, with the kills and the gate carried over, walks on and clears`, () => {
    const cp = PLAYED.checkpoints.find((c) => c.prop === light) as (typeof PLAYED.checkpoints)[number];
    const have = CARRIED[light] as (typeof CARRIED)[string];
    const gone = kit.enemies.filter((e) => have.cleared.includes(e.group)).map((e) => e.id);
    const grid = stageGrid(PLAYED);
    const sim = createSim(simOptions(PLAYED, grid, { party: defaultParty('5.1'), start: { x: cp.x, y: cp.y }, seed: 5, difficulty: 'chief', skipSpawns: gone, openProps: have.open }));
    const said: string[] = [];
    const dir = createDirector(PLAYED.beats, PLAYED.waves, {
      sim: () => sim, say: (id, done) => { said.push(id); done(); }, scare: (done) => done(), open: (id) => sim.openProp(id), jingle: () => undefined, finish: () => undefined,
    });
    dir.restore({ fired: have.fired, cleared: have.cleared });
    const bot = createBot({ grid, waypoints: routeFrom(PLAYED.waypoints, cp) });
    for (let f = 0; f < 30000 && !dir.finished(); f++) {
      dir.events(sim.step(bot.next(sim)));
      const p = sim.heroPos();
      dir.tick(Math.floor(p.x / 16), Math.floor((p.y - 4) / 16));
    }
    assert.ok(dir.finished(), 'the stage is cleared');
    assert.deepEqual(said, LEFT[light], 'the beats that were left play, and the ones before the string do not play again');
    assert.equal(sim.enemiesAlive('boss'), 0, 'and the Commander is dead');
    if (light === 'lights_lab') assert.ok(dir.hasFired('commander'), 'the commander beat fired again after the retry');
  });
}

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
interface Handle { sim: Sim; retry(): void; director: { hasFired(id: string): boolean } }
const live = (): Handle => (globalThis as unknown as { __ud: { play: Handle } }).__ud.play;
const sim = (): Sim => live().sim;
const prop = (id: string): PropView => sim().view().props.find((p) => p.id === id) as PropView;

const PARTY: PartySeed[] = [{ id: 'hopper', level: 7 }, { id: 'mike', level: 10 }];

/** A scene on stage 5.1. `cleared` counts the times the stage's clear reached the results. `at` puts the lead on a tile and ticks a few frames. */
function start(): { tick(n?: number, key?: string): void; at(tx: number, ty: number): void; cleared: () => number } {
  stack.length = 0;
  pressed.clear();
  let cleared = 0;
  const opts: PlayOptions = { stageId: '5.1', party: PARTY, onClear: () => { cleared++; }, onQuit: noop, onStartOver: noop };
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
  return { tick, at: (tx, ty) => { sim().dev.teleport(tx * 16 + 8, ty * 16 + 12); tick(3); }, cleared: () => cleared };
}
const heroTile = (): [number, number] => { const p = sim().heroPos(); return [Math.floor(p.x / 16), Math.floor((p.y - 4) / 16)]; };

// ---------------------------------------------------------------- the scene
test('scene: the party starts on Main Street, and each string lights and saves their place, so a retry stands them by it with it still lit', () => {
  const s = start();
  sim().dev.god = true;
  assert.ok(live().director.hasFired('start'), 'the start beat fired on the first tick');
  assert.deepEqual(sim().party().map((p) => p.id), ['hopper', 'mike'], 'the party is who was picked, Hopper in it');
  for (const c of S.checkpoints) {
    const p = S.spawns.find((q) => q.kind === 'prop' && q.id === c.prop) as { tx: number; ty: number };
    s.at(p.tx + 1, p.ty + 1);
    s.tick(1, 'interact');
    assert.equal(prop(c.prop).state, 'open', `${c.prop} is lit`);
    s.at(2, 34);
    live().retry();
    s.tick(2);
    const [tx, ty] = heroTile();
    assert.deepEqual([tx, ty], [Math.floor(c.x / 16), Math.floor((c.y - 4) / 16)], `a retry stands them by ${c.prop}`);
    assert.equal(prop(c.prop).state, 'open', `and ${c.prop} is still lit`);
  }
});

test('scene: the checkpoint wakes its squad, the commander beat shuts door1 and brings the clock track in, a retry from the Lab\'s string opens the door and the Lab\'s track again, and the clear opens it for good', () => {
  const heard: string[] = [];
  const real = audio.music;
  audio.music = (track) => { heard.push(track); };
  try {
    const s = start();
    sim().dev.god = true;
    assert.equal(heard.at(-1), 'lab', 'the stage opens on the Lab\'s track');
    assert.equal(sim().enemiesAlive('checkpoint'), 3);
    assert.equal(sim().view().actors.filter((a) => a.kind === 'enemy' && a.id.startsWith('cp_')).length, 0, 'the squad is asleep (not in view)');
    s.at(17, 34);
    assert.ok(live().director.hasFired('checkpoint'), 'the checkpoint beat fires in front of the gate');
    // The Lab's string first, then the bay.
    assert.equal(prop('door1').state, 'open', 'door1 is open to begin with');
    s.at(22, 3);
    s.tick(1, 'interact');
    assert.equal(prop('lights_lab').state, 'open');
    s.at(33, 4);
    assert.ok(live().director.hasFired('commander'));
    assert.equal(prop('door1').state, 'closed', 'door1 shuts behind them');
    assert.equal(heard.at(-1), 'clock', 'and the bay has the clock track');
    assert.equal(sim().enemiesAlive('boss'), 1);
    // A wipe in the bay: the retry stands them by the Lab\'s string, the door open and the Lab\'s track back, and the Commander asleep again.
    live().retry();
    s.tick(2);
    assert.equal(prop('door1').state, 'open');
    assert.equal(heard.at(-1), 'lab');
    assert.ok(!sim().view().actors.some((a) => a.kind === 'enemy' && a.id === 'commander'), 'the Commander is asleep (not in view) again');
    assert.equal(sim().enemiesAlive('boss'), 1);
    // The clear: everything dies at once, the boss group clears, the door opens and the stage reaches its results once.
    s.at(33, 4);
    assert.equal(prop('door1').state, 'closed');
    sim().dev.killAll();
    s.tick(30);
    assert.equal(prop('door1').state, 'open');
    s.tick(120);
    assert.equal(s.cleared(), 1, 'the stage reaches its results once');
  } finally {
    audio.music = real;
  }
});
