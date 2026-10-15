// Stage 3.1, Starcourt Mall, in the real sim: shutter1 holds everyone until it is opened, panel1 answers a shot or anyone up close,
// crack1 answers only Steve's nail bat and crate1 only Eleven's shove, the hint names whoever is in the party (the panel's alt list),
// and whole headless runs of the bot through the ambush. The map, the budget, the beats and the scripts are in stage31.test.ts.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { defaultParty, rosterFor } from '../src/core/campaign.ts';
import { createSim } from '../src/combat/index.ts';
import { HINT_AFTER, createPuzzleTracker, namedFor } from '../src/world/puzzles.ts';
import { simOptions } from '../src/world/options.ts';
import { STAGE_31 as S } from '../src/world/stages/stage31.ts';
import type { Difficulty, HeroId, PartySeed, SimEvent, SimInput } from '../src/core/types.ts';
import { idle, playStage, runUntil, stageKit } from './stage-helpers.ts';
import type { Prop } from './stage-helpers.ts';

const kit = stageKit(S);
const { grid, props } = kit;
const prop = (id: string): Prop => props.find((p) => p.id === id) as Prop;
const propsOnly = S.spawns.filter((s) => s.kind === 'prop');
const px = (tx: number): number => tx * 16 + 8;
const fy = (ty: number): number => ty * 16 + 12;
/** One hero on the stage with its props and no enemies, so nothing interrupts what a test is looking at. The rest of `party` trails. */
const solo = (id: HeroId, tx: number, ty: number, party: PartySeed[] = [{ id, level: 5 }]) =>
  createSim({ ...simOptions(S, grid, { party, start: { x: px(tx), y: fy(ty) } }), spawns: propsOnly });
/** Face (mx, my) with a nudge too small to walk anywhere, then press `key` once. */
const aim = (mx: number, my: number, key: Partial<SimInput>) => (f: number): SimInput =>
  ({ ...idle, ...(f < 6 ? { mx: mx * 0.2, my: my * 0.2 } : f === 6 ? { mx: mx * 0.2, my: my * 0.2, ...key } : {}) });
const is = (e: SimEvent, kind: 'targetHit' | 'propCleared', id: string): boolean => e.t === kind && e.propId === id;
const poked = (e: SimEvent, id: string, hero: HeroId): boolean => e.t === 'poked' && e.propId === id && e.hero === hero;
const walk = (sim: ReturnType<typeof solo>, frames: number, mx: number, my: number): { x: number; y: number } => {
  for (let f = 0; f < frames; f++) sim.step({ ...idle, mx, my });
  return sim.heroPos();
};
const ROSTER = rosterFor('3.1');

// ---------------------------------------------------------------- the shutter and the panel
test('shutter1: holds a walking hero and a swung blade until it is opened, and open it lets the whole party through', () => {
  const sh = prop('shutter1');
  for (const tx of [sh.tx, sh.tx + 1, sh.tx + 2]) {
    const stopped = walk(solo('mike', tx, sh.ty + 2), 120, 0, -1);
    assert.ok(stopped.y >= (sh.ty + 1) * 16 + 8 - 0.01, `shutter1 holds a hero walking up column ${tx}`);
  }
  const shut = solo('mike', sh.tx + 1, sh.ty + 1);
  const sim = solo('mike', sh.tx + 1, sh.ty + 2);
  assert.equal(sim.view().props.find((p) => p.id === 'shutter1')?.state, 'closed');
  assert.equal(runUntil(shut, 90, aim(0, -1, { attackPressed: true }), (e) => is(e, 'propCleared', 'shutter1')), null, 'a swing does not open it');
  sim.openProp('shutter1');
  sim.step(idle);
  assert.equal(sim.view().props.find((p) => p.id === 'shutter1')?.state, 'open');
  assert.ok(walk(sim, 90, 0, -1).y < sh.ty * 16 - 8, 'open, the way through to the court is clear');
});

test('panel1: a shot from Lucas or Nancy lights it, anyone\'s basic attack up close does, and a swing from a few tiles off does not', () => {
  const panel = prop('panel1');
  const floorBelow = panel.ty + 1;
  const lights = (id: HeroId, ty: number, party?: PartySeed[]): boolean =>
    runUntil(solo(id, panel.tx, ty, party), 90, aim(0, -1, { attackPressed: true }), (e) => is(e, 'targetHit', 'panel1')) !== null;
  // A shot flies the length of the concourse: from the far side of the lane, four tiles out.
  for (const id of ['lucas', 'nancy'] as HeroId[]) {
    assert.ok(lights(id, floorBelow + 3), `${id}'s shot lights it from four tiles out`);
    assert.ok(lights(id, floorBelow), `and from beside it`);
  }
  // Everyone else has to walk up and hit it. Each roster hero's basic, from the floor right under it.
  for (const id of ROSTER) assert.ok(lights(id, floorBelow), `${id} up close lights it`);
  assert.ok(!lights('mike', floorBelow + 2), 'Mike\'s bat from two tiles out falls short');
  assert.ok(!lights('steve', floorBelow + 2), 'and so does Steve\'s');
  // The shot does not open the shutter by itself: the beat does (shutter_open), and shutter1 stays put until then.
  const sim = solo('lucas', panel.tx, floorBelow + 3);
  const e = runUntil(sim, 90, aim(0, -1, { attackPressed: true }), (ev) => is(ev, 'targetHit', 'panel1'));
  assert.ok(e);
  for (let f = 0; f < 30; f++) sim.step(idle);
  assert.equal(sim.view().props.find((p) => p.id === 'panel1')?.state, 'lit');
  assert.equal(sim.view().props.find((p) => p.id === 'shutter1')?.state, 'closed');
});

test('panel1: a swing at it from a few tiles off is a try for the hero who isn\'t Lucas or Nancy, and a shot never is', () => {
  const panel = prop('panel1');
  const ty = panel.ty + 3;
  // Mike swinging at the panel from about 30 px away reaches it with the swing's slack but not with the smash: a try.
  const mike = runUntil(solo('mike', panel.tx, panel.ty + 2), 90, aim(0, -1, { attackPressed: true }), (e) => poked(e, 'panel1', 'mike'));
  assert.ok(mike, 'Mike swinging at it from two tiles out is a try');
  const lucas = solo('lucas', panel.tx, ty);
  const tries: SimEvent[] = [];
  for (let f = 0; f < 90; f++) tries.push(...lucas.step(aim(0, -1, { attackPressed: true })(f)));
  assert.ok(tries.some((e) => is(e, 'targetHit', 'panel1')), 'Lucas lit it');
});

// ---------------------------------------------------------------- the cache gates
test('crack1: only Steve\'s nail bat breaks it, the back room opens behind it, and everyone else swinging at it is a try', () => {
  const c = prop('crack1');
  const swing = (id: HeroId): SimEvent | null => runUntil(solo(id, c.tx, c.ty + 1), 90, aim(0, -1, { attackPressed: true }), (e) => is(e, 'propCleared', 'crack1'));
  assert.ok(swing('steve'), 'a nail bat swing from Scoops Ahoy breaks it');
  for (const id of ROSTER.filter((h) => h !== 'steve')) {
    assert.equal(swing(id), null, `${id}'s swing does not`);
    assert.ok(runUntil(solo(id, c.tx, c.ty + 1), 90, aim(0, -1, { attackPressed: true }), (e) => poked(e, 'crack1', id)), `${id} swinging at it is a try`);
  }
  assert.ok(walk(solo('mike', c.tx, c.ty + 2), 90, 0, -1).y >= (c.ty + 1) * 16 + 8 - 0.01, 'crack1 holds a walking hero out of the back room');
  const steve = solo('steve', c.tx, c.ty + 2);
  assert.ok(runUntil(steve, 120, (f) => (f < 40 ? { ...idle, my: -0.2 } : f === 40 ? { ...idle, my: -0.2, attackPressed: true } : { ...idle, my: -1 }), (e) => is(e, 'propCleared', 'crack1')));
  assert.ok(walk(steve, 90, 0, -1) && steve.heroPos().y < c.ty * 16, 'broken, the way into the back room is open');
});

test('crate1: only Eleven\'s shove moves it, and the side shop opens behind it', () => {
  const c = prop('crate1');
  const push = (id: HeroId, ty: number, key: Partial<SimInput> = { attackPressed: true }): boolean =>
    runUntil(solo(id, c.tx, ty), 90, aim(0, -1, key), (e) => is(e, 'propCleared', 'crate1')) !== null;
  assert.ok(push('eleven', c.ty + 1), 'the shove clears it from the corridor');
  assert.ok(push('eleven', c.ty + 2), 'from two tiles back');
  assert.ok(!push('eleven', c.ty + 1, { specialPressed: true }), 'her beam does not move it');
  for (const id of ROSTER.filter((h) => h !== 'eleven')) {
    assert.ok(!push(id, c.ty + 1), `${id}'s basic does not move it`);
    assert.ok(!push(id, c.ty + 1, { specialPressed: true }), `${id}'s special does not move it`);
  }
  assert.ok(walk(solo('mike', c.tx, c.ty + 2), 90, 0, -1).y >= (c.ty + 1) * 16 + 8 - 0.01, 'crate1 holds a walking hero out of the side shop');
  const sim = solo('eleven', c.tx, c.ty + 2);
  sim.openProp('crate1');
  sim.step(idle);
  assert.ok(walk(sim, 90, 0, -1).y < c.ty * 16, 'moved, the way into the side shop is open');
});

// ---------------------------------------------------------------- the hint, and the party it needs
const withLead = (lead: HeroId, party: PartySeed[]): PartySeed[] => [...party.filter((p) => p.id === lead), ...party.filter((p) => p.id !== lead)];
const seeds = (...ids: HeroId[]): PartySeed[] => ids.map((id) => ({ id, level: 5 }));
interface Try { hero: HeroId; party: PartySeed[]; at: [number, number]; input: (f: number) => Partial<SimInput>; frames?: number }

/** Plays the attempt and returns the tracker's verdict: the puzzle, the hero it names, the hint, and the prop it was tried on. */
function attempt(t: Try): { puzzle: string | null; hero: HeroId | null; hint: string | null; tried: string | null } {
  const sim = solo(t.hero, t.at[0], t.at[1], withLead(t.hero, t.party));
  const tracker = createPuzzleTracker(S.puzzles);
  const look = (): void => tracker.tick({ hasFired: () => true, busy: false, props: sim.view().props, hero: sim.heroPos(), party: sim.party().map((p) => p.id) });
  // The play scene has ticked the tracker long before anyone tries anything, so it knows the party.
  look();
  for (let f = 0; f < (t.frames ?? 60); f++) {
    for (const e of sim.step({ ...idle, ...t.input(f) })) if (e.t === 'poked') tracker.poke(e.propId, e.hero);
    look();
  }
  const stuck = tracker.highlight();
  return { puzzle: stuck?.id ?? null, hero: stuck?.hero ?? null, hint: stuck?.hint ?? null, tried: stuck ? tracker.triedProp(stuck) : null };
}
const swingUp = (f: number): Partial<SimInput> => (f === 0 ? { my: -0.2, attackPressed: true } : { my: -0.2 });
const TWO_OUT = (): [number, number] => [prop('panel1').tx, prop('panel1').ty + 2];

test('hint: the panel names Lucas while he is in the party, then Nancy, then the first of the rest who is', () => {
  const swing = (hero: HeroId, party: PartySeed[]) => attempt({ hero, party, at: TWO_OUT(), input: swingUp });
  const withLucas = swing('mike', seeds('mike', 'lucas', 'nancy', 'eleven'));
  assert.deepEqual([withLucas.puzzle, withLucas.hero, withLucas.hint, withLucas.tried], ['shutter', 'lucas', 'MAYBE LUCAS SHOULD TRY HIS SLINGSHOT', 'panel1']);
  const noLucas = swing('mike', seeds('mike', 'eleven', 'robin', 'nancy'));
  assert.deepEqual([noLucas.puzzle, noLucas.hero, noLucas.hint], ['shutter', 'nancy', 'MAYBE NANCY SHOULD TRY HER PISTOL'], 'the default party has Nancy but not Lucas');
  const neither = swing('dustin', seeds('dustin', 'will', 'mike', 'robin'));
  assert.deepEqual([neither.hero, neither.hint], ['mike', 'MAYBE MIKE SHOULD HIT THE PANEL'], 'Mike is the first of the rest, in order');
  const later = swing('robin', seeds('robin', 'steve', 'eleven', 'max'));
  assert.deepEqual([later.hero, later.hint], ['eleven', 'MAYBE ELEVEN SHOULD HIT THE PANEL'], 'the alt order is the roster\'s: Eleven comes before Max and Steve');
  // The hero who is named is the one the HUD's bench slot pulses for, and the one who is trying is never the wrong one.
  assert.equal(swing('nancy', seeds('nancy', 'mike', 'eleven', 'robin')).puzzle, null, 'Nancy swinging at it is who the hint wants');
  assert.equal(swing('mike', seeds('mike', 'dustin', 'will', 'robin')).puzzle, null, 'and so is Mike, when he is the first of the rest');
  assert.equal(swing('lucas', seeds('lucas', 'mike', 'nancy', 'eleven')).puzzle, null, 'Lucas is who it wants while he is in the party');
});

test('hint: the five second clock names the same hero, and a party with nobody who can solve it never gets a hint', () => {
  const [tx, ty] = TWO_OUT();
  const waits = (party: PartySeed[], frames: number): { puzzle: string | null; hero: HeroId | null } => {
    const sim = solo(party[0]?.id as HeroId, tx, ty, party);
    const tracker = createPuzzleTracker(S.puzzles);
    for (let f = 0; f < frames; f++) {
      sim.step(idle);
      tracker.tick({ hasFired: () => true, busy: false, props: sim.view().props, hero: sim.heroPos(), party: sim.party().map((p) => p.id) });
    }
    const stuck = tracker.highlight();
    return { puzzle: stuck?.id ?? null, hero: stuck?.hero ?? null };
  };
  assert.deepEqual(waits(seeds('mike', 'eleven', 'robin', 'nancy'), HINT_AFTER - 1), { puzzle: null, hero: null }, 'not before five seconds');
  assert.deepEqual(waits(seeds('mike', 'eleven', 'robin', 'nancy'), HINT_AFTER), { puzzle: 'shutter', hero: 'nancy' }, 'and then it is Nancy\'s');
  assert.deepEqual(waits(seeds('mike', 'lucas', 'robin', 'nancy'), HINT_AFTER), { puzzle: 'shutter', hero: 'lucas' });
  assert.deepEqual(waits(seeds('robin'), HINT_AFTER), { puzzle: 'shutter', hero: 'robin' }, 'a party of one still has a hero to name');
  // The tracker is told who is in the party. A party with no one in it is a party nobody can name.
  const tracker = createPuzzleTracker(S.puzzles);
  const sim = solo('mike', tx, ty);
  for (let f = 0; f < HINT_AFTER * 2; f++) {
    sim.step(idle);
    tracker.tick({ hasFired: () => true, busy: false, props: sim.view().props, hero: sim.heroPos(), party: [] });
  }
  assert.equal(tracker.highlight(), null, 'nobody in the party, nobody to name');
});

test('hint: the caches never nag without their hero, and crack1 and crate1 name only Steve and Eleven', () => {
  const c = prop('crack1'), k = prop('crate1');
  const noSteve = attempt({ hero: 'mike', party: seeds('mike', 'eleven', 'robin', 'nancy'), at: [c.tx, c.ty + 1], input: swingUp });
  assert.deepEqual([noSteve.puzzle, noSteve.tried], [null, null], 'no nag at the crack with Steve out of the party');
  const withSteve = attempt({ hero: 'mike', party: seeds('mike', 'steve', 'robin', 'nancy'), at: [c.tx, c.ty + 1], input: swingUp });
  assert.deepEqual([withSteve.puzzle, withSteve.hero, withSteve.hint], ['crack', 'steve', 'MAYBE STEVE SHOULD TRY HIS NAIL BAT']);
  const noEleven = attempt({ hero: 'mike', party: seeds('mike', 'steve', 'robin', 'nancy'), at: [k.tx, k.ty + 1], input: swingUp });
  assert.deepEqual([noEleven.puzzle, noEleven.tried], [null, null], 'no nag at the crate with Eleven out of the party');
  const withEleven = attempt({ hero: 'mike', party: seeds('mike', 'eleven', 'robin', 'nancy'), at: [k.tx, k.ty + 1], input: swingUp });
  assert.deepEqual([withEleven.puzzle, withEleven.hero, withEleven.hint], ['crate', 'eleven', 'MAYBE ELEVEN SHOULD TRY HER SHOVE']);
});

test('namedFor: the hero if they are in the party or no party is given, else the first of alt who is, else nobody', () => {
  const def = S.puzzles[0] as (typeof S.puzzles)[number];
  assert.deepEqual(namedFor(def), { hero: 'lucas', hint: def.hint }, 'no party given: the first hero, as on every stage before this one');
  assert.deepEqual(namedFor(def, ['mike', 'lucas', 'nancy']), { hero: 'lucas', hint: def.hint });
  assert.equal(namedFor(def, ['mike', 'nancy'])?.hero, 'nancy');
  assert.equal(namedFor(def, ['robin', 'steve', 'mike'])?.hero, 'mike', 'the alt order, not the party\'s');
  assert.equal(namedFor(def, []), null);
  const crack = S.puzzles[1] as (typeof S.puzzles)[number];
  assert.equal(namedFor(crack, ['mike', 'nancy']), null, 'a puzzle with no alt is live only for its own hero');
  assert.equal(namedFor(crack, ['steve'])?.hero, 'steve');
});

// ---------------------------------------------------------------- whole runs
const runs = (n: number): number[] => Array.from({ length: n }, (_, i) => i + 1);
/**
 * The scripts a bot run plays. It walks into Scoops Ahoy as far as the counter's end but not into the back room, opens shutter1 by
 * flag (no panel hit, so no shutter_done), goes past crate1 and never breaks crack1.
 */
const ROUTE = ['l7_start', 'l7_scoops', 'l7_shutter_hint', 'l7_court', 'l7_crate_hint', 'l7_service', 'l7_ambush', 'l7_clear'];
const run = (seed: number, difficulty: Difficulty = 'chief', careless = false) => playStage(S, seed, defaultParty('3.1'), 30000, difficulty, careless);

test('whole run: the bot opens the shutter by flag and clears the mall most of the time on chief, with both caches left shut', () => {
  let clears = 0;
  for (const seed of runs(10)) {
    const r = run(seed);
    assert.ok(r.done || r.allDown, `seed ${seed} got stuck after ${r.frames} frames`);
    if (!r.done) continue;
    clears++;
    assert.ok(r.xp >= 170 && r.xp <= 210, `seed ${seed}: the stage pays ${r.xp} XP`);
    assert.deepEqual(r.said, ROUTE, `seed ${seed}: the scripts play in route order, and neither cache is opened`);
    assert.ok(r.frames >= 60 * 80 && r.frames <= 60 * 160, `seed ${seed}: ${(r.frames / 60).toFixed(0)} s`);
    assert.ok(r.damage >= 30 && r.damage <= 450, `seed ${seed}: ${r.damage.toFixed(0)} damage`);
  }
  assert.ok(clears >= 6, `cleared ${clears} of 10`);
});

test('whole run: kid is a walk, and a bot that never dodges and upside both finish, in a win or a wipe', () => {
  const kid = runs(10).filter((seed) => run(seed, 'kid').done).length;
  assert.ok(kid >= 9, `kid cleared ${kid} of 10`);
  let careless = 0, upside = 0;
  for (const seed of runs(10)) {
    const b = run(seed, 'chief', true);
    assert.ok(b.done || b.allDown, `a careless bot on seed ${seed} got stuck`);
    if (b.done) careless++;
    const u = run(seed, 'upside');
    assert.ok(u.done || u.allDown, `upside on seed ${seed} got stuck`);
    if (u.done) upside++;
  }
  assert.ok(careless >= 6, `the careless bot cleared ${careless} of 10`);
  assert.ok(upside >= 2, `upside cleared ${upside} of 10`);
});
