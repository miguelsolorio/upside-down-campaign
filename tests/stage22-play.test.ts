// Stage 2.2, the tunnels, in the real sim: the drops hold everyone but Max's dash, crack1 holds everyone but Steve's nail bat, the
// hints follow a wrong try only for a hero who is in the party, and whole headless runs of the bot through the ambush. The map,
// the budget, the beats and the scripts are in stage22.test.ts.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { defaultParty } from '../src/core/campaign.ts';
import { createSim } from '../src/combat/index.ts';
import { createPuzzleTracker } from '../src/world/puzzles.ts';
import { simOptions } from '../src/world/options.ts';
import { STAGE_22 as S } from '../src/world/stages/stage22.ts';
import type { Difficulty, HeroId, PartySeed, SimEvent, SimInput } from '../src/core/types.ts';
import { idle, playStage, runUntil, stageKit, tileOf } from './stage-helpers.ts';
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
const aim = (mx: number, my: number, key: Partial<SimInput>) => (f: number): Partial<SimInput> & SimInput =>
  ({ ...idle, ...(f < 6 ? { mx: mx * 0.2, my: my * 0.2 } : f === 6 ? { mx: mx * 0.2, my: my * 0.2, ...key } : {}) });
const cleared = (e: SimEvent, id: string): boolean => e.t === 'propCleared' && e.propId === id;
const poked = (e: SimEvent, id: string, hero: HeroId): boolean => e.t === 'poked' && e.propId === id && e.hero === hero;
const walk = (sim: ReturnType<typeof solo>, frames: number, mx: number, my: number): { x: number; y: number } => {
  for (let f = 0; f < frames; f++) sim.step({ ...idle, mx, my });
  return sim.heroPos();
};
const GAPS = ['gap1', 'gap2', 'gap3'];

// ---------------------------------------------------------------- the drops and the crack, in the sim
test('gaps: Max\'s skate dash gets over each of the three from the bot\'s waypoint, and the gap stays shut to walking', () => {
  const dashes = S.waypoints.flatMap((w, i) => (w.dash ? [{ from: w, to: S.waypoints[i + 1] as (typeof S.waypoints)[number] }] : []));
  assert.equal(dashes.length, 3);
  dashes.forEach(({ from, to }, i) => {
    const id = GAPS[i] as string;
    const g = prop(id);
    const [tx, ty] = tileOf(from.x, from.y);
    const dx = Math.sign(to.x - from.x), dy = Math.sign(to.y - from.y);
    const sim = solo('max', tx, ty, [{ id: 'max', level: 4 }, { id: 'mike', level: 6 }]);
    const e = runUntil(sim, 60, aim(dx, dy, { specialPressed: true }), (ev) => cleared(ev, id));
    assert.ok(e, `${id}: the dash opens it`);
    for (let f = 0; f < 30; f++) sim.step(idle);
    const p = sim.heroPos();
    // Landed past the far edge of the drop, not on it.
    const past = g.w === 16 ? (dx > 0 ? p.x - 5 > g.tx * 16 + 16 : p.x + 5 < g.tx * 16) : (dy > 0 ? p.y - 8 > g.ty * 16 + 16 : p.y < g.ty * 16);
    assert.ok(past, `${id}: she lands across it, at ${p.x.toFixed(0)}, ${p.y.toFixed(0)}`);
    // Walking back is no way over: it holds.
    const back = walk(sim, 90, -dx, -dy);
    const stillAcross = g.w === 16 ? (dx > 0 ? back.x - 5 >= g.tx * 16 + 16 - 0.01 : back.x + 5 <= g.tx * 16 + 0.01) : (dy > 0 ? back.y - 8 >= g.ty * 16 + 16 - 0.01 : back.y <= g.ty * 16 + 0.01);
    assert.ok(stillAcross, `${id}: stays solid after it is crossed`);
  });
});

test('gaps: nobody else crosses one: Mike walking or swinging at gap1 is a try, and Max, who solves it, is never a try', () => {
  const g = prop('gap1');
  const mike = solo('mike', g.tx - 2, g.ty);
  const stopped = walk(mike, 120, 1, 0);
  assert.ok(stopped.x <= g.tx * 16 - 5 + 0.01, 'gap1 holds a walking hero');
  const tries: SimEvent[] = [];
  const watch = solo('mike', g.tx - 2, g.ty);
  for (let f = 0; f < 120; f++) tries.push(...watch.step({ ...idle, mx: 1 }));
  assert.ok(tries.some((e) => poked(e, 'gap1', 'mike')), 'leaning on it for 20 frames is a try');
  const swing = solo('mike', g.tx - 1, g.ty);
  assert.ok(runUntil(swing, 60, aim(1, 0, { attackPressed: true }), (e) => poked(e, 'gap1', 'mike')), 'so is a swing at it');
  assert.equal(runUntil(solo('mike', g.tx - 1, g.ty), 60, aim(1, 0, { attackPressed: true }), (e) => cleared(e, 'gap1')), null, 'and a swing does not open it');
  const max = solo('max', g.tx - 2, g.ty);
  const events: SimEvent[] = [];
  for (let f = 0; f < 120; f++) events.push(...max.step({ ...idle, mx: 1 }));
  assert.ok(!events.some((e) => e.t === 'poked'), 'Max leaning on it is not trying a puzzle');
  assert.ok(max.heroPos().x <= g.tx * 16 - 5 + 0.01, 'and she cannot walk over either');
});

test('crack: only Steve\'s nail bat breaks crack1, the cache opens behind it, and everyone else swinging at it is a try', () => {
  const c = prop('crack1');
  const swing = (id: HeroId): SimEvent | null => runUntil(solo(id, c.tx + 1, c.ty + 1), 90, aim(0, -1, { attackPressed: true }), (e) => cleared(e, 'crack1'));
  assert.ok(swing('steve'), 'a nail bat swing from the junction breaks it');
  for (const id of ['mike', 'dustin', 'lucas', 'will', 'max'] as HeroId[]) {
    assert.equal(swing(id), null, `${id}'s swing does not`);
    assert.ok(runUntil(solo(id, c.tx + 1, c.ty + 1), 90, aim(0, -1, { attackPressed: true }), (e) => poked(e, 'crack1', id)), `${id} swinging at it is a try`);
  }
  const mike = solo('mike', c.tx, c.ty + 2);
  assert.ok(walk(mike, 90, 0, -1).y >= (c.ty + 1) * 16 + 8 - 0.01, 'crack1 holds a walking hero out of the cache');
  const steve = solo('steve', c.tx, c.ty + 2);
  assert.ok(runUntil(steve, 120, (f) => (f < 40 ? { ...idle, my: -0.2 } : f === 40 ? { ...idle, my: -0.2, attackPressed: true } : { ...idle, my: -1 }), (e) => cleared(e, 'crack1')));
  assert.ok(walk(steve, 90, 0, -1) && steve.heroPos().y < c.ty * 16, 'broken, the way into the cache is open');
  assert.equal(runUntil(solo('steve', c.tx + 1, c.ty + 1), 90, aim(0, -1, { attackPressed: true }), (e) => poked(e, 'crack1', 'steve')), null, 'Steve is never a try');
});

// ---------------------------------------------------------------- the hint, and the party it needs
const withLead = (lead: HeroId, party: PartySeed[]): PartySeed[] => [...party.filter((p) => p.id === lead), ...party.filter((p) => p.id !== lead)];
interface Try { hero: HeroId; party: PartySeed[]; at: [number, number]; input: (f: number) => Partial<SimInput>; frames?: number }

/** Plays the attempt and returns the tracker's verdict. The tracker is told who is in the party, the way the play scene tells it. */
function attempt(t: Try): { puzzle: string | null; tried: string | null } {
  const sim = solo(t.hero, t.at[0], t.at[1], withLead(t.hero, t.party));
  const tracker = createPuzzleTracker(S.puzzles);
  for (let f = 0; f < (t.frames ?? 60); f++) {
    for (const e of sim.step({ ...idle, ...t.input(f) })) if (e.t === 'poked') tracker.poke(e.propId, e.hero);
    tracker.tick({ hasFired: () => true, busy: false, props: sim.view().props, hero: sim.heroPos(), party: sim.party().map((p) => p.id) });
  }
  const stuck = tracker.highlight();
  return { puzzle: stuck?.id ?? null, tried: stuck ? tracker.triedProp(stuck) : null };
}
const FULL: PartySeed[] = [{ id: 'mike', level: 6 }, { id: 'dustin', level: 5 }, { id: 'max', level: 4 }, { id: 'steve', level: 4 }];
const WITHOUT = (hero: HeroId): PartySeed[] => FULL.filter((p) => p.id !== hero);
const swingUp = (f: number): Partial<SimInput> => (f === 0 ? { my: -0.2, attackPressed: true } : { my: -0.2 });
const into = (mx: number, my: number) => (): Partial<SimInput> => ({ mx, my });

test('hints: the wrong hero trying gap1 or crack1 gets the hint at once, while its hero is in the party', () => {
  const c = prop('crack1'), g = prop('gap1');
  const crack = attempt({ hero: 'mike', party: FULL, at: [c.tx + 1, c.ty + 1], input: swingUp });
  assert.deepEqual([crack.puzzle, crack.tried], ['crack', 'crack1'], 'Mike swinging at the crack, with Steve in the party');
  const gap = attempt({ hero: 'mike', party: FULL, at: [g.tx - 2, g.ty], input: into(1, 0), frames: 80 });
  assert.deepEqual([gap.puzzle, gap.tried], ['gap', 'gap1'], 'Mike leaning on the gap, with Max in the party');
  assert.equal(attempt({ hero: 'steve', party: FULL, at: [c.tx + 1, c.ty + 1], input: swingUp }).puzzle, null, 'Steve at the crack is who it wants');
});

test('hints: a puzzle whose hero is not in the party never shows its hint, however it is tried or how long they wait', () => {
  const c = prop('crack1'), g = prop('gap1');
  const noSteve = withLead('mike', WITHOUT('steve'));
  const crack = attempt({ hero: 'mike', party: noSteve, at: [c.tx + 1, c.ty + 1], input: swingUp });
  assert.deepEqual([crack.puzzle, crack.tried], [null, null], 'no nag at the crack with Steve benched out of the party');
  assert.equal(attempt({ hero: 'mike', party: noSteve, at: [c.tx, c.ty + 2], input: into(0, -1), frames: 80 }).puzzle, null, 'not for leaning on it either');
  const noMax = withLead('mike', WITHOUT('max'));
  assert.equal(attempt({ hero: 'mike', party: noMax, at: [g.tx - 2, g.ty], input: into(1, 0), frames: 80 }).puzzle, null, 'and not at the gap without Max');
  // The five-second clock does not start the hint either.
  const sim = solo('mike', c.tx + 1, c.ty + 1, noSteve);
  const tracker = createPuzzleTracker(S.puzzles);
  for (let f = 0; f < 60 * 20; f++) {
    sim.step(idle);
    tracker.tick({ hasFired: () => true, busy: false, props: sim.view().props, hero: sim.heroPos(), party: sim.party().map((p) => p.id) });
  }
  assert.equal(tracker.highlight(), null, 'twenty seconds beside the crack, no hint');
  // Put Steve back in the party and the same wait brings it.
  const full = solo('mike', c.tx + 1, c.ty + 1, FULL);
  const t2 = createPuzzleTracker(S.puzzles);
  for (let f = 0; f < 60 * 6; f++) {
    full.step(idle);
    t2.tick({ hasFired: () => true, busy: false, props: full.view().props, hero: full.heroPos(), party: full.party().map((p) => p.id) });
  }
  assert.equal(t2.highlight()?.id, 'crack', 'with Steve in the party the hint comes after five seconds');
});

// ---------------------------------------------------------------- whole runs
const seeds = (n: number): number[] => Array.from({ length: n }, (_, i) => i + 1);
/** The scripts a bot run plays. It walks through the junction, so the crack's arrival beat plays, but it never goes into the cache. */
const ROUTE = ['l5_start', 'l5_crew', 'l5_gap_hint', 'l5_gap_done', 'l5_nest', 'l5_crack_hint', 'l5_dart', 'l5_hub', 'l5_ambush', 'l5_clear'];
const run = (seed: number, difficulty: Difficulty = 'chief', careless = false) => playStage(S, seed, defaultParty('2.2'), 30000, difficulty, careless);

test('whole run: the bot dashes the three gaps and clears the tunnels most of the time on chief, with the cache left shut', () => {
  let clears = 0;
  for (const seed of seeds(10)) {
    const r = run(seed);
    assert.ok(r.done || r.allDown, `seed ${seed} got stuck after ${r.frames} frames`);
    if (!r.done) continue;
    clears++;
    assert.ok(r.xp >= 120 && r.xp <= 166, `seed ${seed}: the stage pays ${r.xp} XP`);
    assert.deepEqual(r.said, ROUTE, `seed ${seed}: the scripts play in route order, and crack1 is never broken`);
    assert.ok(r.frames >= 60 * 70 && r.frames <= 60 * 150, `seed ${seed}: ${(r.frames / 60).toFixed(0)} s`);
    assert.ok(r.damage >= 20 && r.damage <= 450, `seed ${seed}: ${r.damage.toFixed(0)} damage`);
  }
  assert.ok(clears >= 6, `cleared ${clears} of 10`);
});

test('whole run: kid is a walk, and a bot that never dodges and upside both finish, in a win or a wipe', () => {
  const kid = seeds(10).filter((seed) => run(seed, 'kid').done).length;
  assert.ok(kid >= 9, `kid cleared ${kid} of 10`);
  let careless = 0;
  for (const seed of seeds(10)) {
    const b = run(seed, 'chief', true);
    assert.ok(b.done || b.allDown, `a careless bot on seed ${seed} got stuck`);
    if (b.done) careless++;
    const u = run(seed, 'upside');
    assert.ok(u.done || u.allDown, `upside on seed ${seed} got stuck`);
  }
  assert.ok(careless >= 6, `the careless bot cleared ${careless} of 10`);
});
