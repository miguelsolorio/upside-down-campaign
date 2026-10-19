// Stage 5.2 in play: whole headless runs of the bot over the islands, the bridges and the ring, the twins beat in the real sim with the director (the rock
// fall, the music, the wake and the clear), a retry from each string of lights with the kills and the open gates carried over, and the party a jump brings.
// The map, the budget and the route are in stage52.test.ts, the gates in the sim in stage52-gates.test.ts.
//
// The route runs play the stage with enemyMult at ROUTE_MULT, not the stage's own: the number the stage ships with is a cliff (docs/level-15.md,
// "Result"), and these runs prove the route, the beats and the clear whatever it is. The runs at the shipped number are the ones that count clears.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { defaultParty } from '../src/core/campaign.ts';
import { createSim } from '../src/combat/index.ts';
import { createBot } from '../src/combat/bot.ts';
import { routeFrom, simOptions, stageGrid } from '../src/world/options.ts';
import { createDirector } from '../src/world/triggers.ts';
import { musicAfter } from '../src/world/triggers.ts';
import type { StageData } from '../src/world/types.ts';
import type { TrackId } from '../src/core/types.ts';
import { idle, playStage, stageXp } from './stage-helpers.ts';
import { S, kit, prop } from './stage52-helpers.ts';

/** The factor the bot clears at on chief every time, under what the stage ships with. */
const ROUTE_MULT = 1;
const PLAYED: StageData = { ...S, enemyMult: ROUTE_MULT };
const ORDER = ['l15_start', 'l15_burn_hint', 'l15_burn_done', 'l15_sense_hint', 'l15_sense_done', 'l15_crack_hint', 'l15_crack_done', 'l15_twins', 'l15_clear'];
const seeds = (n: number): number[] => Array.from({ length: n }, (_, i) => i + 1);

// ---------------------------------------------------------------- whole runs
test('stage 5.2: the bot clears the stage on chief, through every beat in order, the cache left alone and the twins on the ring', () => {
  const party = defaultParty('5.2');
  assert.deepEqual(party.map((p) => p.id), ['mike', 'dustin', 'robin', 'will'], 'Will is in the party a jump brings');
  for (const careless of [false, true]) {
    for (const seed of [1, 2, 3, 4]) {
      const run = playStage(PLAYED, seed, party, 30000, 'chief', careless);
      assert.ok(run.done && !run.allDown, `seed ${seed}${careless ? ' careless' : ''} clears`);
      // The gap's hint plays if a fight with the deck's bats walks the party past the gap on the road island; it is a courtesy, not a step.
      assert.deepEqual(run.said.filter((id) => id !== 'l15_gap_hint'), ORDER, `seed ${seed}: every beat, in order, and not the cache's`);
      assert.deepEqual(run.steps, ['open door1'], 'the bot opens its gates by flag, not by the director, and the clear lifts the rock fall');
      // A burst pod pays 3 XP before xpMult, and a run can lose two of them.
      assert.ok(run.xp >= stageXp(PLAYED) - Math.ceil(6 * (PLAYED.xpMult ?? 1)) && run.xp <= stageXp(PLAYED), `seed ${seed}: ${run.xp} XP, everything but a burst pod`);
      assert.ok(run.frames > 60 * 60 && run.frames < 60 * 300, `seed ${seed}: ${(run.frames / 60).toFixed(0)} s`);
    }
  }
});

test('stage 5.2: at the shipped factor the bot clears most runs on chief, and one that never dodges still clears more than half; nothing sticks', () => {
  let careful = 0, careless = 0;
  for (const seed of seeds(20)) {
    const a = playStage(S, seed, defaultParty('5.2'), 30000);
    assert.ok(a.done || a.allDown, `seed ${seed} got stuck after ${a.frames} frames`);
    if (a.done) careful++;
    const b = playStage(S, seed, defaultParty('5.2'), 30000, 'chief', true);
    assert.ok(b.done || b.allDown, `a careless bot on seed ${seed} got stuck`);
    if (b.done) careless++;
  }
  assert.ok(careful >= 13 && careful <= 20, `the careful bot cleared ${careful} of 20`);
  assert.ok(careless >= 10, `the careless bot cleared ${careless} of 20`);
}, { timeout: 120000 });

test('stage 5.2: forty more seeds, careful and careless, all end in a clear or a wipe; none gets stuck on a bridge', () => {
  for (const seed of seeds(40).map((n) => n + 100)) {
    for (const careless of [false, true]) {
      const r = playStage(S, seed, defaultParty('5.2'), 30000, 'chief', careless);
      assert.ok(r.done || r.allDown, `seed ${seed}${careless ? ' careless' : ''} got stuck after ${r.frames} frames`);
    }
  }
}, { timeout: 120000 });

// ---------------------------------------------------------------- the twins beat
test('the twins beat: crossing onto the ring shuts door1 behind the party, switches to clock and wakes both, and the clear lifts the rock fall', () => {
  const grid = stageGrid(PLAYED);
  const door = prop('door1');
  // The party comes off the bridge: it starts on the ring's west tip and walks east.
  const sim = createSim(simOptions(PLAYED, grid, { party: defaultParty('5.2'), start: { x: 32 * 16 + 8, y: 10 * 16 + 12 }, seed: 9, difficulty: 'chief' }));
  const log: string[] = [];
  const dir = createDirector(PLAYED.beats, PLAYED.waves, {
    sim: () => sim, say: (id, done) => { log.push(`say ${id}`); done(); }, scare: (done) => done(), open: (id) => { log.push(`open ${id}`); sim.openProp(id); },
    music: (track: TrackId) => { log.push(`music ${track}`); }, jingle: () => undefined, finish: () => { log.push('finish'); },
  });
  const state = (): string | undefined => sim.view().props.find((p) => p.id === 'door1')?.state;
  const asleep = (): number => sim.view().actors.filter((a) => a.kind === 'enemy' && a.id === 'twin').length;
  assert.equal(state(), 'open', 'door1 is spawned open');
  assert.equal(asleep(), 0, 'the twins sleep: they are not in the view');
  for (let f = 0; f < 90 && !dir.hasFired('twins'); f++) {
    dir.events(sim.step({ ...idle, mx: 1 }));
    const p = sim.heroPos();
    dir.tick(Math.floor(p.x / 16), Math.floor((p.y - 4) / 16));
  }
  assert.ok(dir.hasFired('twins'), 'three tiles in, the beat fires');
  assert.deepEqual(log, ['music clock', 'say l15_twins'], 'the rock falls and the music changes, then the words');
  assert.equal(state(), 'closed', 'door1 is shut');
  assert.equal(asleep(), 2, 'both twins are up');
  assert.equal(sim.view().hud.boss?.name, 'THE TWINS');
  assert.equal(musicAfter(PLAYED.beats, ['twins'], 'upside'), 'clock', 'a retry carries the clock on');
  // The way back is shut: a hero walking west stops at the rock fall.
  for (let f = 0; f < 120; f++) sim.step({ ...idle, mx: -1 });
  assert.ok(sim.heroPos().x >= (door.tx + 1) * 16 + 4, `the rock fall holds at ${sim.heroPos().x.toFixed(0)}`);
  // Both twins down is the clear.
  sim.dev.killAll();
  for (let f = 0; f < 200 && !dir.finished(); f++) dir.events(sim.step(idle));
  assert.ok(dir.finished(), 'both twins gone finishes the stage');
  assert.deepEqual(log, ['music clock', 'say l15_twins', 'say l15_clear', 'open door1', 'finish']);
});

test('the twins beat: the bot fights them on the ring and wins most of the time, the twins go over the rim and come back, and a hero never goes over', () => {
  let wins = 0, falls = 0;
  for (const seed of seeds(6)) {
    const grid = stageGrid(PLAYED);
    const sim = createSim(simOptions(PLAYED, grid, { party: defaultParty('5.2'), start: { x: 33 * 16 + 8, y: 10 * 16 + 12 }, seed, difficulty: 'chief' }));
    const bot = createBot({ grid, waypoints: [{ x: 36 * 16 + 8, y: 10 * 16 + 12 }] });
    const dir = createDirector(PLAYED.beats, PLAYED.waves, { sim: () => sim, say: (_id, done) => done(), scare: (done) => done(), open: (id) => sim.openProp(id), jingle: () => undefined, finish: () => undefined });
    let over = false;
    for (let f = 0; f < 60 * 300 && !dir.finished() && !over; f++) {
      const ev = sim.step(bot.next(sim));
      dir.events(ev);
      for (const e of ev) { if (e.t === 'sfx' && e.id === 'fall') falls++; if (e.t === 'allDown') over = true; }
      const p = sim.heroPos();
      assert.ok(!grid.drop?.[Math.floor((p.y - 4) / 16) * grid.w + Math.floor(p.x / 16)], 'the hero is never on the void');
      dir.tick(Math.floor(p.x / 16), Math.floor((p.y - 4) / 16));
    }
    if (dir.finished()) wins++;
  }
  assert.ok(wins >= 5, `the bot beat the twins in ${wins} of 6`);
  assert.ok(falls >= 3, `${falls} falls into the void over six fights`);
}, { timeout: 120000 });

// ---------------------------------------------------------------- a retry from each string
/** What the party carries into a retry from `light`: the beats played, the groups gone, the strings lit and the gates open. */
const CARRIED: Record<string, { fired: string[]; cleared: string[]; open: string[] }> = {
  lights_landing: { fired: ['start'], cleared: [], open: ['lights_landing'] },
  lights_bridge: {
    fired: ['start', 'burn_hint', 'burn_done', 'sense_hint'], cleared: ['landing', 'road', 'bridge'], open: ['lights_landing', 'lights_bridge', 'burn1'],
  },
  lights_ring: {
    fired: ['start', 'burn_hint', 'burn_done', 'sense_hint', 'sense_done', 'crack_hint', 'crack_done'], cleared: ['landing', 'road', 'bridge', 'classroom'],
    open: ['lights_landing', 'lights_bridge', 'lights_ring', 'burn1', 'sense1', 'crack1'],
  },
};
const LEFT: Record<string, string[]> = {
  lights_landing: ORDER.slice(1),
  lights_bridge: ['l15_sense_done', 'l15_crack_hint', 'l15_crack_done', 'l15_twins', 'l15_clear'],
  lights_ring: ['l15_twins', 'l15_clear'],
};

for (const light of ['lights_landing', 'lights_bridge', 'lights_ring']) {
  test(`stage 5.2: a retry from ${light}, with the kills and the open gates carried over, walks on and clears`, () => {
    const cp = PLAYED.checkpoints.find((c) => c.prop === light) as (typeof PLAYED.checkpoints)[number];
    const have = CARRIED[light] as (typeof CARRIED)[string];
    const gone = kit.enemies.filter((e) => have.cleared.includes(e.group)).map((e) => e.id);
    const grid = stageGrid(PLAYED);
    const sim = createSim(simOptions(PLAYED, grid, { party: defaultParty('5.2'), start: { x: cp.x, y: cp.y }, seed: 5, difficulty: 'chief', skipSpawns: gone, openProps: have.open }));
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
    assert.deepEqual(said.filter((id) => id !== 'l15_gap_hint'), LEFT[light], 'the beats that were left play, and the ones before the string do not play again');
  });
}
