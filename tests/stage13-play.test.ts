// Stage 1.3, Hawkins Middle School, in the real sim: the gates hold and open, each puzzle answers only its hero, the hint
// follows a wrong try, and whole headless runs of the bot, finisher included, chained out of 1.1 and 1.2.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { defaultParty, seedsFrom } from '../src/core/campaign.ts';
import { createSim } from '../src/combat/index.ts';
import { createBot } from '../src/combat/bot.ts';
import { createPuzzleTracker } from '../src/world/puzzles.ts';
import { simOptions, stageGrid } from '../src/world/options.ts';
import { createDirector } from '../src/world/triggers.ts';
import { STAGE_11 } from '../src/world/stages/stage11.ts';
import { STAGE_12 } from '../src/world/stages/stage12.ts';
import { STAGE_13 as S } from '../src/world/stages/stage13.ts';
import type { Difficulty, HeroId, HeroSnapshot, PartySeed, SimEvent, SimInput } from '../src/core/types.ts';
import { idle, playStage, runUntil, stageKit, tileOf } from './stage-helpers.ts';
import type { Prop } from './stage-helpers.ts';

const kit = stageKit(S);
const { grid, props } = kit;
const prop = (id: string): Prop => props.find((p) => p.id === id) as Prop;

// ---------------------------------------------------------------- the gates, puzzles and hints, in the real sim
const propsOnly = S.spawns.filter((s) => s.kind === 'prop');
/** One hero on the stage with its props and no enemies, so nothing interrupts what a test is looking at. */
const solo = (id: HeroId, tx: number, ty: number) =>
  createSim({ ...simOptions(S, grid, { party: [{ id, level: 4 }], start: { x: tx * 16 + 8, y: ty * 16 + 12 } }), spawns: propsOnly });
/** Walk toward (mx, my) for 20 frames to face that way, then ease off and press `key` once. */
const facing = (mx: number, my: number, key: Partial<SimInput>) => (f: number): SimInput =>
  (f < 20 ? { ...idle, mx, my } : f === 20 ? { ...idle, mx: mx * 0.2, my: my * 0.2, ...key } : idle);
const hit = (e: SimEvent, kind: 'targetHit' | 'propCleared', id: string): boolean => e.t === kind && e.propId === id;
const walk = (sim: ReturnType<typeof solo>, frames: number, mx: number, my: number): { x: number; y: number } => {
  for (let f = 0; f < frames; f++) sim.step({ ...idle, mx, my });
  return sim.heroPos();
};
const OTHERS = (hero: HeroId): HeroId[] => (['mike', 'dustin', 'lucas', 'eleven'] as HeroId[]).filter((h) => h !== hero);

test('gates: closed, van1, vines1 and door1 stop a hero in the sim, and open they let one through', () => {
  const van = prop('van1'), vines = prop('vines1'), door = prop('door1');
  const side = solo('mike', van.tx - 2, van.ty);
  assert.ok(walk(side, 120, 1, 0).x <= van.tx * 16 - 5 + 0.01, 'van1 holds the side door');
  side.openProp('van1');
  assert.ok(walk(side, 150, 1, 0).x > (van.tx + 3) * 16, 'open, the hall is next');
  const back = solo('mike', vines.tx + 1, vines.ty + 2);
  assert.ok(walk(back, 120, 0, -1).y >= vines.ty * 16 + 24, 'vines1 holds the back door');
  back.openProp('vines1');
  assert.ok(walk(back, 150, 0, -1).y < vines.ty * 16, 'open, the cafeteria is next');
  const fire = solo('mike', door.tx + 1, door.ty + 3);
  assert.ok(walk(fire, 120, 0, -1).y >= door.ty * 16 + 24, 'door1 holds the fire door');
  fire.openProp('door1');
  assert.ok(walk(fire, 150, 0, -1).y < door.ty * 16, 'open, the gym is next');
});

test('puzzles: only Eleven shoves van1 aside from the lot, and only from close up', () => {
  const van = prop('van1');
  const push = (id: HeroId, back: number, key: Partial<SimInput> = { attackPressed: true }): boolean =>
    runUntil(solo(id, van.tx - back, van.ty), 90, facing(1, 0, key), (e) => hit(e, 'propCleared', 'van1')) !== null;
  assert.ok(push('eleven', 1) && push('eleven', 2), 'Push clears it from one and two tiles back');
  assert.ok(!push('eleven', 5), 'five tiles back the shove falls short');
  assert.ok(!push('eleven', 2, { specialPressed: true }), 'her beam does not move it');
  for (const id of OTHERS('eleven')) assert.ok(!push(id, 2) && !push(id, 2, { specialPressed: true }), `${id} cannot move it`);
});

test('puzzles: only Dustin burns vines1 away, and the flame needs a moment', () => {
  const v = prop('vines1');
  const burn = (id: HeroId, dy: number, key: Partial<SimInput> = { specialPressed: true }): SimEvent | null =>
    runUntil(solo(id, v.tx + 1, v.ty + dy), 120, facing(0, -1, key), (e) => hit(e, 'propCleared', 'vines1'));
  for (const dy of [1, 2]) assert.ok(burn('dustin', dy), `Farrah spray from ${dy} tiles below clears it`);
  assert.ok(!burn('dustin', 6), 'six tiles back, across the whole room, it falls short');
  assert.ok(!burn('dustin', 2, { attackPressed: true }), 'the candy lure does not');
  for (const id of OTHERS('dustin')) assert.ok(!burn(id, 2) && !burn(id, 2, { attackPressed: true }), `${id} cannot burn it`);
});

test('puzzles: Lucas lights firebox1 over the serving counter from the cafeteria floor, and nobody else can', () => {
  const b = prop('firebox1');
  const shoot = (id: HeroId, tx: number, ty: number, key: Partial<SimInput> = { attackPressed: true }, mx = 0): boolean =>
    runUntil(solo(id, tx, ty), 120, facing(mx, -1, key), (e) => hit(e, 'targetHit', 'firebox1')) !== null;
  for (const ty of [20, 21, 22, 23]) assert.ok(shoot('lucas', b.tx, ty), `a rocket north from ${b.tx},${ty} clears the counter and lights the box`);
  assert.ok(!shoot('lucas', b.tx + 3, 22), 'a column three tiles over misses');
  assert.ok(!shoot('lucas', b.tx, 22, { specialPressed: false, attackPressed: false }), 'no shot, no light');
  for (const id of OTHERS('lucas')) {
    assert.ok(!shoot(id, b.tx, 20), `${id}'s basic does not light it`);
    assert.ok(!shoot(id, b.tx, 20, { specialPressed: true }), `${id}'s special does not light it`);
  }
  // From inside the gym a rocket straight south, or east and west, never reaches it: the court is east of the box.
  for (let tx = 30; tx <= 46; tx += 2) assert.ok(!shoot('lucas', tx, 15), `a rocket south from the court at ${tx},15 does not light the box`);
});

// ---------------------------------------------------------------- the hint, end to end
interface Try { hero: HeroId; at: [number, number]; input: (f: number) => Partial<SimInput>; frames?: number }

/** Plays the attempt and returns the tracker's verdict: the puzzle it hints, and the prop that was tried. */
function attempt(t: Try): { puzzle: string | null; tried: string | null; opened: string[] } {
  const sim = solo(t.hero, t.at[0], t.at[1]);
  const tracker = createPuzzleTracker(S.puzzles);
  const opened: string[] = [];
  for (let f = 0; f < (t.frames ?? 60); f++) {
    const ev = sim.step({ ...idle, ...t.input(f) });
    for (const e of ev) {
      if (e.t === 'poked') tracker.poke(e.propId, e.hero);
      if (e.t === 'propCleared' || e.t === 'targetHit') opened.push(e.propId);
    }
    tracker.tick({ hasFired: () => true, busy: false, props: sim.view().props, hero: sim.heroPos() });
  }
  const stuck = tracker.highlight();
  return { puzzle: stuck?.id ?? null, tried: stuck ? tracker.triedProp(stuck) : null, opened };
}
const swing = (nudge: Partial<SimInput>) => (f: number): Partial<SimInput> => (f === 0 ? { ...nudge, attackPressed: true } : nudge);
const right = { mx: 0.2 }, up = { my: -0.2 };

test('hints: the wrong hero swinging at the van, the vines or the fire door gets the hint at once, the right one does not', () => {
  for (const hero of OTHERS('eleven')) {
    const r = attempt({ hero, at: [19, 36], input: swing(right) });
    assert.deepEqual([r.puzzle, r.tried], ['van', 'van1'], `${hero} at the van`);
  }
  const shove = attempt({ hero: 'eleven', at: [19, 36], input: swing(right) });
  assert.equal(shove.puzzle, null);
  assert.deepEqual(shove.opened, ['van1'], 'her push clears it, with no hint');
  for (const hero of OTHERS('dustin')) {
    const r = attempt({ hero, at: [25, 28], input: swing(up) });
    assert.deepEqual([r.puzzle, r.tried], ['vines', 'vines1'], `${hero} at the vines`);
  }
  assert.equal(attempt({ hero: 'dustin', at: [25, 28], input: (f) => (f === 0 ? { ...up, specialPressed: true } : up) }).puzzle, null, 'Dustin spraying them is who the vines want');
  for (const hero of OTHERS('lucas')) {
    const r = attempt({ hero, at: [45, 19], input: swing(up) });
    assert.deepEqual([r.puzzle, r.tried], ['firebox', 'door1'], `${hero} at the fire door: the hint names the door`);
  }
  assert.equal(attempt({ hero: 'lucas', at: [45, 19], input: swing(up) }).puzzle, null, 'Lucas shoots the box that opens it');
});

test('hints: pushing against the van, the vines or the fire door with the wrong hero gets the hint too', () => {
  const walkInto = (mx: number, my: number) => (): Partial<SimInput> => ({ mx, my });
  assert.equal(attempt({ hero: 'mike', at: [19, 36], input: walkInto(1, 0), frames: 80 }).puzzle, 'van');
  assert.equal(attempt({ hero: 'eleven', at: [19, 36], input: walkInto(1, 0), frames: 80 }).puzzle, null, 'Eleven leaning on it is not a wrong try');
  assert.equal(attempt({ hero: 'lucas', at: [25, 28], input: walkInto(0, -1), frames: 80 }).puzzle, 'vines');
  assert.equal(attempt({ hero: 'mike', at: [45, 19], input: walkInto(0, -1), frames: 80 }).puzzle, 'firebox');
});

test('hints: Mike swinging at the box itself, and a rocket at the vines, are tries on the right prop', () => {
  const box = prop('firebox1');
  const mike = attempt({ hero: 'mike', at: [box.tx, 18], input: swing(up) });
  assert.deepEqual([mike.puzzle, mike.tried], ['firebox', 'firebox1']);
  assert.deepEqual(mike.opened, [], 'his bat does not light it');
  const lucas = attempt({ hero: 'lucas', at: [25, 28], input: swing(up) });
  assert.deepEqual([lucas.puzzle, lucas.tried], ['vines', 'vines1']);
  assert.deepEqual(lucas.opened, [], 'a rocket does not burn them');
});

// ---------------------------------------------------------------- whole runs
interface Run {
  done: boolean; allDown: boolean; frames: number; xp: number; kos: number; damage: number; lowestHp: number; levels: number[];
  party: HeroSnapshot[]; said: string[]; music: string[]; pinnedAt: number; killAt: number; killBy: string; bossAt: number;
}

/** Plays the whole stage with the bot, the dialogue skipped, and notes the boss: the beat that woke it, the pin and the kill. */
function play(seed: number, party: PartySeed[], difficulty: Difficulty = 'chief', careless = false, maxFrames = 30000): Run {
  const sim = createSim(simOptions(S, grid, { party, seed, difficulty }));
  const bot = createBot({ grid, waypoints: S.waypoints, careless });
  const said: string[] = [], music: string[] = [];
  const dir = createDirector(S.beats, S.waves, {
    sim: () => sim, say: (id, done) => { said.push(id); done(); }, scare: (done) => done(), open: (id) => sim.openProp(id),
    music: (t) => { music.push(t); }, alarm: () => undefined, jingle: () => undefined, finish: () => undefined,
  });
  const out = { allDown: false, pinnedAt: -1, killAt: -1, killBy: '', bossAt: -1 };
  let f = 0, lowestHp = 1;
  for (; f < maxFrames && !dir.finished() && !out.allDown; f++) {
    const ev = sim.step(bot.next(sim));
    dir.events(ev);
    for (const e of ev) {
      if (e.t === 'pinned') out.pinnedAt = f;
      if (e.t === 'kill' && e.kind === 'demogorgon') { out.killAt = f; out.killBy = e.by; }
      if (e.t === 'allDown') out.allDown = true;
    }
    const now = sim.party();
    lowestHp = Math.min(lowestHp, now.reduce((a, m) => a + m.hp, 0) / now.reduce((a, m) => a + m.hpMax, 0));
    const [tx, ty] = tileOf(sim.heroPos().x, sim.heroPos().y);
    dir.tick(tx, ty);
    if (out.bossAt < 0 && dir.hasFired('demogorgon')) out.bossAt = f;
  }
  const st = sim.stats(), snap = sim.party();
  return { done: dir.finished(), ...out, frames: f, xp: st.xpEarned, kos: st.kos, damage: st.damageTaken, lowestHp, levels: snap.map((p) => p.level), party: snap, said, music };
}

const ROUTE = [
  'l3_start', 'l3_van_hint', 'l3_van_done', 'l3_agents', 'l3_vines_hint', 'l3_vines_done', 'l3_cafeteria', 'l3_scare', 'l3_firebox_hint',
  'l3_gym', 'l3_demogorgon', 'l3_pinned', 'l3_clear',
];
/** A rocket that misses can still light the box, which plays its "done" script early. It is not part of the route's order. */
const incidental = new Set(['l3_firebox_done']);
const seeds = (n: number): number[] => Array.from({ length: n }, (_, i) => i + 1);

test('whole run: the bot clears the school most of the time on chief, and the boss goes down to Eleven\'s Mind Blast after the pin', () => {
  let clears = 0;
  for (const seed of seeds(10)) {
    const r = play(seed, defaultParty('1.3'));
    assert.ok(r.done || r.allDown, `seed ${seed} got stuck after ${r.frames} frames`);
    if (!r.done) continue;
    clears++;
    assert.equal(r.xp, 140, `seed ${seed}: the stage pays 140 XP`);
    assert.ok(r.pinnedAt >= 0 && r.killAt > r.pinnedAt, `seed ${seed}: a win goes through the pin`);
    assert.equal(r.killBy, 'eleven', `seed ${seed}: and her beam does it`);
    assert.deepEqual(r.said.filter((id) => !incidental.has(id)), ROUTE, `seed ${seed}: the scripts play in route order, the boss's last`);
    assert.deepEqual(r.music, ['clock'], `seed ${seed}: the music changes once, to the boss track`);
    assert.ok(r.bossAt > r.frames * 0.4, 'the boss is the second half of the run');
    assert.ok(Math.max(...r.levels) <= 5 && Math.min(...r.levels) >= 4, `levels ${r.levels.join(',')}`);
  }
  assert.ok(clears >= 6, `cleared ${clears} of 10`);
});

test('whole run: kid is a walk, and a bot that never dodges and upside both finish, in a win or a wipe', () => {
  const kid = seeds(10).filter((seed) => play(seed, defaultParty('1.3'), 'kid').done).length;
  assert.ok(kid >= 9, `kid cleared ${kid} of 10`);
  let careful = 0, careless = 0;
  for (const seed of seeds(8)) {
    const a = play(seed, defaultParty('1.3'));
    const b = play(seed, defaultParty('1.3'), 'chief', true);
    assert.ok(b.done || b.allDown, `a careless bot on seed ${seed} got stuck`);
    careful += a.damage;
    careless += b.damage;
    const u = play(seed, defaultParty('1.3'), 'upside');
    assert.ok(u.done || u.allDown, `upside on seed ${seed} got stuck`);
  }
  assert.ok(careless > careful * 1.3, `the school costs a bot that does not dodge ${(careless / 8).toFixed(0)} HP a run against ${(careful / 8).toFixed(0)}`);
});

test('whole run: forty seeds on chief, the bot always ends: no run is stuck', () => {
  let wipes = 0;
  for (const seed of seeds(40)) {
    const r = play(seed, defaultParty('1.3'));
    assert.ok(r.done || r.allDown, `seed ${seed} ran ${r.frames} frames without ending`);
    if (r.allDown) wipes++;
  }
  assert.ok(wipes <= 12, `${wipes} of 40 wiped`);
});

test('chained run: out of 1.1 and 1.2 with the carried party, the bot reaches the school and nobody hits Lv 6', () => {
  let reached = 0;
  for (const seed of [1, 2, 3]) {
    const first = playStage(STAGE_11, seed, [{ id: 'mike' }, { id: 'dustin' }, { id: 'lucas' }]);
    assert.ok(first.done, `seed ${seed}: stage 1.1 clears`);
    const lab = playStage(STAGE_12, seed, seedsFrom(first.party));
    if (!lab.done) continue;
    const carried = seedsFrom(lab.party);
    assert.deepEqual(carried.map((s) => s.id), ['mike', 'dustin', 'lucas', 'eleven']);
    reached++;
    const r = play(seed, carried);
    assert.ok(r.done || r.allDown, `seed ${seed}: the school ends`);
    assert.ok(Math.max(...r.levels) < 6, `seed ${seed}: nobody reaches Lv 6, got ${r.levels.join(',')}`);
    if (r.done) assert.ok(r.xp === 140 && r.killBy === 'eleven');
  }
  assert.ok(reached >= 2, `${reached} of 3 got out of the Lab`);
});

test('a jump straight to stage 1.3 starts all four at their arrival levels', () => {
  const party = defaultParty('1.3');
  assert.deepEqual(party.map((p) => [p.id, p.level]), [['mike', 5], ['dustin', 4], ['lucas', 4], ['eleven', 4]]);
  const r = play(2, party);
  assert.ok(r.done || r.allDown);
});
