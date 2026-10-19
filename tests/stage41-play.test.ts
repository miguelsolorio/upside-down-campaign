// Stage 4.1 in play: whole headless runs of the bot through the yard, the block and the pit, a retry from each string of lights with the
// kills and the open cracks carried over, and the real play scene on a fake canvas (the lights, the retry, the pit's door and music, the
// clear). The map, the budget and the route are in stage41.test.ts, the beats and the scripts in stage41-story.test.ts.
//
// The runs play the stage with enemyMult at ROUTE_MULT, not the stage's own: one hero on one bar is a cliff, and the number the stage
// ships with is the lead's to tune (docs/level-10.md, "Targets"). These runs prove the route, the beats and the finisher, whatever it is.
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
import { S, kit } from './stage41-helpers.ts';
import { playStage, stageXp } from './stage-helpers.ts';

/** The factor the bot clears at on chief every time (200 seeds of 200 at 0.4, careless too), under what the lead will ship. */
const ROUTE_MULT = 0.4;
const PLAYED: StageData = { ...S, enemyMult: ROUTE_MULT };
const ORDER = ['l10_start', 'l10_yard', 'l10_crack_hint', 'l10_crack_done', 'l10_block', 'l10_shaft', 'l10_pit', 'l10_pit_down', 'l10_clear'];

// ---------------------------------------------------------------- whole runs
test('stage 4.1: the bot clears the stage on chief, through every beat in order, the cracks and the pit\'s finisher included', () => {
  const party = defaultParty('4.1');
  assert.deepEqual(party.map((p) => p.id), ['hopper'], 'Hopper alone');
  for (const careless of [false, true]) {
    for (const seed of [1, 2, 3]) {
      const run = playStage(PLAYED, seed, party, 30000, 'chief', careless);
      assert.ok(run.done && !run.allDown, `seed ${seed}${careless ? ' careless' : ''} clears`);
      assert.deepEqual(run.said, ORDER, `seed ${seed}: every beat, in order, and not the cache's`);
      assert.deepEqual(run.steps, ['light lights_shaft', 'open door1'], 'the shaft beat lights its string, the bot opens no gate by the director, and the clear opens the door');
      assert.ok(run.xp >= stageXp(PLAYED), `seed ${seed}: ${run.xp} XP, every guard and the beast`);
      assert.ok(run.frames > 60 * 45 && run.frames < 60 * 240, `seed ${seed}: ${(run.frames / 60).toFixed(0)} s`);
      assert.ok((run.levels[0] ?? 0) >= 5, 'Hopper keeps his level');
    }
  }
});

// ---------------------------------------------------------------- a retry from each string
/** What the party carries into a retry from `light`: the beats played, the groups gone, the strings lit and the cracks broken. */
const CARRIED: Record<string, { fired: string[]; cleared: string[]; open: string[] }> = {
  lights_yard: { fired: ['start'], cleared: [], open: ['lights_yard'] },
  lights_block: {
    fired: ['start', 'yard', 'crack_hint', 'crack_done', 'block'], cleared: ['yard', 'block', 'guardroom'], open: ['lights_yard', 'lights_block', 'crack1'],
  },
  lights_shaft: {
    fired: ['start', 'yard', 'crack_hint', 'crack_done', 'block', 'shaft'], cleared: ['yard', 'block', 'guardroom'],
    open: ['lights_yard', 'lights_block', 'lights_shaft', 'crack1'],
  },
};
const LEFT: Record<string, string[]> = {
  lights_yard: ORDER.slice(1),
  lights_block: ['l10_shaft', 'l10_pit', 'l10_pit_down', 'l10_clear'],
  lights_shaft: ['l10_pit', 'l10_pit_down', 'l10_clear'],
};

for (const light of ['lights_yard', 'lights_block', 'lights_shaft']) {
  test(`stage 4.1: a retry from ${light}, with the kills and the cracks carried over, walks on and clears`, () => {
    const cp = PLAYED.checkpoints.find((c) => c.prop === light) as (typeof PLAYED.checkpoints)[number];
    const have = CARRIED[light] as (typeof CARRIED)[string];
    const gone = kit.enemies.filter((e) => have.cleared.includes(e.group)).map((e) => e.id);
    const grid = stageGrid(PLAYED);
    const sim = createSim(simOptions(PLAYED, grid, { party: defaultParty('4.1'), start: { x: cp.x, y: cp.y }, seed: 5, difficulty: 'chief', skipSpawns: gone, openProps: have.open }));
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
    assert.equal(sim.enemiesAlive('boss'), 0, 'and the Demogorgon is dead');
    if (light === 'lights_shaft') assert.ok(dir.hasFired('pit'), 'the pit beat fired again after the retry');
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

const PARTY: PartySeed[] = [{ id: 'hopper', level: 5 }];

/** A scene on stage 4.1. `cleared` counts the times the stage's clear reached the results. `at` puts Hopper on a tile and ticks a few frames. */
function start(): { tick(n?: number, key?: string): void; at(tx: number, ty: number): void; cleared: () => number } {
  stack.length = 0;
  pressed.clear();
  let cleared = 0;
  const opts: PlayOptions = { stageId: '4.1', party: PARTY, onClear: () => { cleared++; }, onQuit: noop, onStartOver: noop };
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
test('scene: Hopper starts alone in the work yard, and each string lights and saves his place, so a retry stands him by it with it still lit', () => {
  const s = start();
  sim().dev.god = true;
  assert.ok(live().director.hasFired('start'), 'the start beat fired on the first tick');
  assert.deepEqual(sim().party().map((p) => p.id), ['hopper'], 'one hero in the party');
  assert.equal(sim().view().hud.party.length, 1);
  for (const c of S.checkpoints) {
    const p = S.spawns.find((q) => q.kind === 'prop' && q.id === c.prop) as { tx: number; ty: number };
    s.at(p.tx + 1, p.ty - 1);
    s.tick(1, 'interact');
    assert.equal(prop(c.prop).state, 'open', `${c.prop} is lit`);
    s.at(2, 33);
    live().retry();
    s.tick(2);
    const [tx, ty] = heroTile();
    assert.deepEqual([tx, ty], [Math.floor(c.x / 16), Math.floor((c.y - 4) / 16)], `a retry stands him by ${c.prop}`);
    assert.equal(prop(c.prop).state, 'open', `and ${c.prop} is still lit`);
  }
});

test('scene: the pit beat shuts door1 and brings the clock track in, a retry from the shaft\'s string opens the door and the camp\'s track again, and the clear opens it for good', () => {
  const heard: string[] = [];
  const real = audio.music;
  audio.music = (track) => { heard.push(track); };
  try {
    const s = start();
    sim().dev.god = true;
    assert.equal(prop('door1').state, 'open', 'door1 is open to begin with');
    // The shaft first, and its string; the pit beat waits on the shaft beat.
    s.at(28, 10);
    assert.equal(prop('door1').state, 'open', 'the pit beat waits for the shaft');
    s.at(19, 10);
    assert.ok(live().director.hasFired('shaft'));
    s.at(21, 9);
    s.tick(1, 'interact');
    assert.equal(prop('lights_shaft').state, 'open');
    s.at(28, 10);
    assert.ok(live().director.hasFired('pit'));
    assert.equal(prop('door1').state, 'closed', 'door1 shuts behind him');
    assert.equal(heard.at(-1), 'clock', 'and the pit has the clock track');
    assert.equal(sim().enemiesAlive('boss'), 1);
    // A wipe in the pit: the retry stands him by the shaft's string, the door open and the camp's track back, and the beast asleep again.
    live().retry();
    s.tick(2);
    assert.equal(prop('door1').state, 'open');
    assert.equal(heard.at(-1), 'kamchatka');
    assert.ok(!sim().view().actors.some((a) => a.kind === 'enemy' && a.id === 'pitdemo'), 'the Demogorgon is asleep (not in view) again');
    assert.equal(sim().enemiesAlive('boss'), 1);
    // The clear: everything dies at once, the boss group clears, the door opens and the stage reaches its results once.
    s.at(28, 10);
    sim().dev.killAll();
    s.tick(30);
    assert.equal(prop('door1').state, 'open');
    s.tick(120);
    assert.equal(s.cleared(), 1, 'the stage reaches its results once');
  } finally {
    audio.music = real;
  }
});
