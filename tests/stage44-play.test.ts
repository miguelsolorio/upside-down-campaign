// Stage 4.4 in play: whole headless runs of the bot from the porch to Vecna's death (the door shuts behind the party with everyone inside, the
// phases play their scripts in order, the clear opens the door), a retry from each string of lights with the kills and the lit strings carried
// over, a wipe in the middle of the fight and the retry from the landing that wakes him at full health, and the real play scene on a fake canvas
// (the strings, the door, the retry from the attic). The map, the budget and the route are in stage44.test.ts, the beats and the words in
// stage44-story.test.ts.
//
// The runs play the stage with enemyMult at ROUTE_MULT, not the stage's own: the number the stage ships with is the lead's to tune
// (docs/level-13.md, "Targets"). These runs prove the route, the beats and the fight's shape, whatever it is.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { defaultParty } from '../src/core/campaign.ts';
import type { Game, Scene } from '../src/core/scene.ts';
import type { PartySeed, PropView, Sim, SimEvent } from '../src/core/types.ts';
import type { PlayOptions, StageData } from '../src/world/types.ts';
import { createSim } from '../src/combat/index.ts';
import { createBot } from '../src/combat/bot.ts';
import { routeFrom, simOptions, stageGrid } from '../src/world/options.ts';
import { createDirector } from '../src/world/triggers.ts';
import { S, kit } from './stage44-helpers.ts';
import { stageXp } from './stage-helpers.ts';

/** The factor the bot clears at on chief every time (20 seeds of 20, careless too), under what the lead will ship. */
const ROUTE_MULT = 1;
const PLAYED: StageData = { ...S, enemyMult: ROUTE_MULT };
const ORDER = ['l13_start', 'l13_house', 'l13_stairs', 'l13_vecna', 'l13_float', 'l13_burn', 'l13_clear'];
const PARTY = defaultParty('4.4');

interface Drive { sim: Sim; said: string[]; steps: string[]; events: SimEvent[]; done: boolean; allDown: boolean; frames: number; inside: boolean | null; killed: Set<string> }
interface From { light: string; fired: string[]; cleared: string[]; gone: string[] }
/** What the party carries into a retry from `light`: the beats played, the groups gone (everything on the way), and the strings lit by then. */
const FROM: Record<string, From> = {
  lights_porch: { light: 'lights_porch', fired: ['start'], cleared: [], gone: [] },
  lights_landing: {
    light: 'lights_landing', fired: ['start', 'house', 'stairs'], cleared: ['foyer', 'hall', 'parlor', 'dining', 'landing'],
    gone: ['foyer', 'hall', 'parlor', 'dining', 'landing'],
  },
};
const LIT = ['lights_porch', 'lights_landing'];

/**
 * Plays the stage with the bot: from the porch, or rebuilt at a string of lights the way the play scene does it (the dead skipped, the lit strings
 * kept open, the director restored). `stop` ends the run early on an event. The dialogue is skipped. `inside` is whether every hero stood above the door (its
 * row is 14) when it shut.
 */
function drive(seed: number, o: { from?: From; party?: PartySeed[]; careless?: boolean; skip?: Iterable<string>; stop?: (e: SimEvent) => boolean } = {}): Drive {
  const grid = stageGrid(PLAYED);
  const cp = o.from ? (PLAYED.checkpoints.find((c) => c.prop === o.from?.light) as (typeof PLAYED.checkpoints)[number]) : null;
  const gone = o.from ? kit.enemies.filter((e) => (o.from as From).gone.includes(e.group)).map((e) => e.id) : [];
  const sim = createSim(simOptions(PLAYED, grid, {
    party: o.party ?? PARTY, seed, difficulty: 'chief', ...(cp ? { start: { x: cp.x, y: cp.y }, openProps: [...LIT.slice(0, LIT.indexOf(cp.prop) + 1)] } : {}),
    skipSpawns: [...gone, ...(o.skip ?? [])],
  }));
  const bot = createBot({ grid, waypoints: cp ? routeFrom(PLAYED.waypoints, cp) : PLAYED.waypoints, careless: o.careless });
  const said: string[] = [], steps: string[] = [], events: SimEvent[] = [], killed = new Set<string>();
  let inside: boolean | null = null;
  // The director sees a sim whose closeProp also looks at the party: the door must not catch anybody in it.
  const spied: Sim = {
    ...sim,
    closeProp: (id) => { sim.closeProp(id); steps.push(`close ${id}`); const heroes = sim.view().actors.filter((a) => a.kind === 'hero'); inside = heroes.length === PARTY.length && heroes.every((a) => a.y <= 14 * 16); },
  };
  const dir = createDirector(PLAYED.beats, PLAYED.waves, {
    sim: () => spied, say: (id, done) => { said.push(id); done(); }, scare: (done) => done(), open: (id) => { steps.push(`open ${id}`); sim.openProp(id); },
    music: (track) => { steps.push(`music ${track}`); }, jingle: () => undefined, finish: () => undefined,
  });
  if (o.from) dir.restore({ fired: o.from.fired, cleared: o.from.cleared });
  let allDown = false, f = 0;
  for (; f < 30000 && !dir.finished() && !allDown; f++) {
    const ev = sim.step(bot.next(sim));
    dir.events(ev);
    let stop = false;
    for (const e of ev) {
      if (e.t === 'phase' || e.t === 'cursed' || e.t === 'curseEnd' || e.t === 'allDown' || e.t === 'kill') events.push(e);
      if (e.t === 'kill') killed.add(e.spawnId);
      if (e.t === 'allDown') allDown = true;
      if (o.stop?.(e)) stop = true;
    }
    const p = sim.heroPos();
    dir.tick(Math.floor(p.x / 16), Math.floor((p.y - 4) / 16));
    if (stop) break;
  }
  return { sim, said, steps, events, done: dir.finished(), allDown, frames: f, inside, killed };
}

// ---------------------------------------------------------------- whole runs
test('stage 4.4: the bot clears the stage on chief, through every beat in order, the door shut behind a party that is all inside, and Vecna through both phases', () => {
  for (const careless of [false, true]) {
    for (const seed of [1, 2, 3]) {
      const run = drive(seed, { careless });
      const tag = `seed ${seed}${careless ? ' careless' : ''}`;
      assert.ok(run.done && !run.allDown, `${tag} clears`);
      assert.deepEqual(run.said, ORDER, `${tag}: every beat, in order`);
      assert.deepEqual(run.steps, ['close door_attic', 'music clock', 'open door_attic'], `${tag}: the door shuts at the attic beat and opens at the clear`);
      assert.equal(run.inside, true, `${tag}: nobody was in the doorway when it shut`);
      assert.deepEqual(run.events.flatMap((e) => (e.t === 'phase' ? [e.phase] : [])), [2, 3], `${tag}: Float, then Burn`);
      const kills = run.events.filter((e) => e.t === 'kill');
      assert.equal(kills.filter((k) => k.t === 'kill' && k.kind === 'vecna').length, 1, `${tag}: Vecna dies once`);
      assert.equal(kills.filter((k) => k.t === 'kill' && k.kind === 'orb').length, 4, `${tag}: and his four orbs go with him`);
      assert.ok(run.events.filter((e) => e.t === 'curseEnd').every((e) => e.t === 'curseEnd' && (e.how === 'orb' || e.how === 'ko')), `${tag}: a curse ends at an orb or a KO, there is no clock to break`);
      assert.ok(run.sim.stats().xpEarned >= stageXp(PLAYED) * 0.6, `${tag}: ${run.sim.stats().xpEarned} XP, most of the stage`);
      assert.ok(run.frames > 60 * 60 && run.frames < 60 * 360, `${tag}: ${(run.frames / 60).toFixed(0)} s`);
      assert.equal(run.sim.view().props.find((p) => p.id === 'door_attic')?.state, 'open');
    }
  }
});

test('stage 4.4: the phases play their scripts when they happen, between the attic\'s and the clear, and the boss bar carries the four orbs', () => {
  const run = drive(2, { stop: (e) => e.t === 'phase' && e.phase === 2 });
  assert.deepEqual(run.said, ORDER.slice(0, 4).concat('l13_float'), 'the float script plays the moment Float starts');
  const bar = run.sim.view().hud.boss;
  assert.equal(bar?.name, 'VECNA');
  assert.equal(bar?.parts?.length, 4, 'with a pip for each orb');
  assert.ok(bar && bar.hp <= bar.hpMax * 0.6, `at 60% or under: ${bar?.hp} of ${bar?.hpMax}`);
  assert.equal(run.sim.view().props.find((p) => p.id === 'door_attic')?.state, 'closed', 'and the door is shut while he lives');
  assert.equal(run.sim.view().props.find((p) => p.id === 'clock_attic')?.state, 'closed', 'with the clock whole');
});

// ---------------------------------------------------------------- a retry from each string
for (const light of ['lights_porch', 'lights_landing']) {
  test(`stage 4.4: a retry from ${light}, with the kills carried over and the strings lit, walks on and clears`, () => {
    const from = FROM[light] as From;
    for (const seed of [1, 2, 3]) {
      const r = drive(seed, { from });
      assert.ok(r.done && !r.allDown, `seed ${seed}: the stage is cleared`);
      assert.deepEqual(r.said, ORDER.slice(ORDER.indexOf(light === 'lights_porch' ? 'l13_house' : 'l13_vecna')), `seed ${seed}: the beats that were left play, and the ones before the string do not play again`);
      assert.equal(r.inside, true, `seed ${seed}: and the door shuts on a party that is all inside`);
    }
  });
}

test('stage 4.4: a wipe in the fight retries from the landing with the door open and Vecna asleep, and the attic beat wakes him at full health, orbs whole', () => {
  // The first visit: the bot gets him to Float, then the party is wiped (the run just stops there).
  const first = drive(3, { stop: (e) => e.t === 'phase' && e.phase === 2 });
  const hurt = first.sim.view().hud.boss;
  assert.ok(hurt && hurt.hp < hurt.hpMax, 'Vecna was hurt in the first visit');
  assert.ok(![...first.killed].some((id) => id === 'vecna' || id.startsWith('orb')), 'and nobody in the attic was killed: an orb breaks and grows back, it does not die');
  // The retry: everything killed so far is skipped, the strings are lit, the door was shut and so is not kept open.
  const grid = stageGrid(PLAYED);
  const cp = PLAYED.checkpoints.find((c) => c.prop === 'lights_landing') as (typeof PLAYED.checkpoints)[number];
  const sim = createSim(simOptions(PLAYED, grid, { party: PARTY, start: { x: cp.x, y: cp.y }, seed: 3, difficulty: 'chief', skipSpawns: [...first.killed], openProps: LIT }));
  const v0 = sim.view();
  assert.equal(v0.props.find((p) => p.id === 'door_attic')?.state, 'open', 'the door is open again');
  assert.equal(v0.hud.boss, null, 'Vecna is asleep: no boss bar');
  assert.equal(sim.enemiesAlive('boss'), 5, 'with his four orbs');
  const said: string[] = [];
  const dir = createDirector(PLAYED.beats, PLAYED.waves, {
    sim: () => sim, say: (id, done) => { said.push(id); done(); }, scare: (done) => done(), open: (id) => sim.openProp(id), music: () => undefined, jingle: () => undefined, finish: () => undefined,
  });
  dir.restore({ fired: ['start', 'house', 'stairs'], cleared: ['foyer', 'hall', 'parlor', 'dining', 'landing'] });
  const bot = createBot({ grid, waypoints: routeFrom(PLAYED.waypoints, cp) });
  const phases: number[] = [];
  let f = 0;
  for (; f < 3000 && !dir.hasFired('vecna'); f++) {
    const ev = sim.step(bot.next(sim));
    dir.events(ev);
    for (const e of ev) if (e.t === 'phase') phases.push(e.phase);
    const p = sim.heroPos();
    dir.tick(Math.floor(p.x / 16), Math.floor((p.y - 4) / 16));
  }
  assert.ok(dir.hasFired('vecna'), 'the party walks to the attic and the beat fires again');
  assert.deepEqual(said, ['l13_vecna'], 'and plays its script, not the ones before it');
  const bar = sim.view().hud.boss;
  assert.deepEqual([bar?.name, bar?.hp], ['VECNA', bar?.hpMax], 'Vecna wakes at full health');
  assert.deepEqual(bar?.parts, [1, 1, 1, 1], 'with every orb whole');
  assert.deepEqual(phases, [], 'in the first phase');
  assert.equal(sim.view().props.find((p) => p.id === 'door_attic')?.state, 'closed');
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
interface Handle { sim: Sim; retry(): void; director: { hasFired(id: string): boolean } }
const live = (): Handle => (globalThis as unknown as { __ud: { play: Handle } }).__ud.play;
const sim = (): Sim => live().sim;
const prop = (id: string): PropView => sim().view().props.find((p) => p.id === id) as PropView;

/** A scene on stage 4.4. `at` puts the active hero on a tile and ticks a few frames. */
function start(party: PartySeed[] = PARTY): { tick(n?: number, key?: string): void; at(tx: number, ty: number): void; cleared: () => number } {
  stack.length = 0;
  pressed.clear();
  let cleared = 0;
  const opts: PlayOptions = { stageId: '4.4', party, onClear: () => { cleared++; }, onQuit: noop, onStartOver: noop };
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
const cpTile = (light: string): [number, number] => {
  const c = S.checkpoints.find((q) => q.prop === light) as (typeof S.checkpoints)[number];
  return [Math.floor(c.x / 16), Math.floor((c.y - 4) / 16)];
};

// ---------------------------------------------------------------- the scene
test('scene: the party starts on the porch, each string lights and saves the place, and a retry stands the party by it with it still lit', () => {
  const s = start();
  sim().dev.god = true;
  assert.ok(live().director.hasFired('start'), 'the start beat fired on the first tick');
  assert.deepEqual(sim().party().map((p) => p.id), PARTY.map((p) => p.id));
  assert.equal(sim().view().hud.boss, null);
  for (const c of S.checkpoints) {
    s.at(...cpTile(c.prop));
    s.tick(1, 'interact');
    assert.equal(prop(c.prop).state, 'open', `${c.prop} is lit`);
    s.at(10, 37);
    live().retry();
    s.tick(2);
    assert.deepEqual(heroTile(), cpTile(c.prop), `a retry stands the party by ${c.prop}`);
    assert.equal(prop(c.prop).state, 'open', `and ${c.prop} is still lit`);
  }
});

test('scene: the attic beat shuts the door and wakes Vecna, a retry from the landing opens it and puts him back to sleep, and the beat wakes him again; the clear opens the door for good', () => {
  const s = start();
  sim().dev.god = true;
  s.at(...cpTile('lights_porch'));
  s.tick(1, 'interact');
  s.at(12, 21);
  assert.ok(live().director.hasFired('stairs'), 'the stairs beat fired at the foot of them');
  assert.ok(!live().director.hasFired('vecna'));
  s.at(...cpTile('lights_landing'));
  s.tick(1, 'interact');
  assert.equal(prop('lights_landing').state, 'open');
  assert.equal(prop('door_attic').state, 'open', 'the door stands open on the way');
  s.at(24, 8);
  assert.ok(live().director.hasFired('vecna'), 'the attic beat fired');
  assert.equal(prop('door_attic').state, 'closed', 'the door shut behind the party');
  s.tick(5);
  assert.deepEqual([sim().view().hud.boss?.name, sim().view().hud.boss?.hp], ['VECNA', sim().view().hud.boss?.hpMax], 'and Vecna is up, at full health');
  // A wipe: the retry rebuilds the stage at the landing.
  live().retry();
  s.tick(3);
  assert.deepEqual(heroTile(), cpTile('lights_landing'), 'the party stands by lights_landing');
  assert.equal(prop('door_attic').state, 'open', 'the door is open again');
  assert.equal(sim().view().hud.boss, null, 'Vecna is asleep');
  assert.ok(live().director.hasFired('stairs') && !live().director.hasFired('vecna'), 'the stairs are behind the party and the attic ahead of it');
  sim().dev.god = true;
  s.at(24, 8);
  assert.ok(live().director.hasFired('vecna'), 'the attic beat fires again');
  assert.equal(prop('door_attic').state, 'closed');
  s.tick(5);
  const bar = sim().view().hud.boss;
  assert.ok(bar && bar.hp === bar.hpMax && bar.parts?.every((p) => p === 1), 'and wakes him at full health');
  // The clear.
  sim().dev.killAll();
  s.tick(30);
  assert.equal(prop('door_attic').state, 'open', 'the clear opens the door');
  s.tick(150);
  assert.equal(s.cleared(), 1, 'the stage reaches its results once');
});
