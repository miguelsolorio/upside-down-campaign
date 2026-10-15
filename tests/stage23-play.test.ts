// Stage 2.3, the Gate, in the real sim: crack1 holds everyone but Steve's nail bat, gap1 everyone but Max's dash, the seals and the
// rift are walls, the hints follow a wrong try only for a hero who is in the party, a loss is the party or the ward, and whole
// headless runs of the bot through the Alpha and the defense. The data is in stage23.test.ts, the beats in stage23-beats.test.ts and
// the play scene in stage23-scene.test.ts.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { defaultParty } from '../src/core/campaign.ts';
import { createSim } from '../src/combat/index.ts';
import { createPuzzleTracker } from '../src/world/puzzles.ts';
import { isLoss, lossReason, WARD_DOWN_REASON } from '../src/world/loss.ts';
import { simOptions } from '../src/world/options.ts';
import { STAGE_23 as S } from '../src/world/stages/stage23.ts';
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
const cleared = (e: SimEvent, id: string): boolean => e.t === 'propCleared' && e.propId === id;
const poked = (e: SimEvent, id: string, hero: HeroId): boolean => e.t === 'poked' && e.propId === id && e.hero === hero;
const walk = (sim: ReturnType<typeof solo>, frames: number, mx: number, my: number): { x: number; y: number } => {
  for (let f = 0; f < frames; f++) sim.step({ ...idle, mx, my });
  return sim.heroPos();
};

// ---------------------------------------------------------------- the gates, the seals and the rift, in the sim
test('crack: only Steve\'s nail bat breaks crack1, from the corridor, and everyone else swinging at it is a try', () => {
  const c = prop('crack1');
  const swing = (id: HeroId): SimEvent | null => runUntil(solo(id, c.tx - 1, c.ty), 90, aim(1, 0, { attackPressed: true }), (e) => cleared(e, 'crack1'));
  assert.ok(swing('steve'), 'a nail bat swing from the corridor breaks it');
  for (const id of ['mike', 'dustin', 'lucas', 'will', 'max'] as HeroId[]) {
    assert.equal(swing(id), null, `${id}'s swing does not`);
    assert.ok(runUntil(solo(id, c.tx - 1, c.ty), 90, aim(1, 0, { attackPressed: true }), (e) => poked(e, 'crack1', id)), `${id} swinging at it is a try`);
  }
  const mike = solo('mike', c.tx - 2, c.ty);
  assert.ok(walk(mike, 90, 1, 0).x <= c.tx * 16 - 5 + 0.01, 'crack1 holds a walking hero in the corridor');
  const steve = solo('steve', c.tx - 2, c.ty);
  assert.ok(runUntil(steve, 120, (f) => (f < 40 ? { ...idle, mx: 0.2 } : f === 40 ? { ...idle, mx: 0.2, attackPressed: true } : { ...idle, mx: 1 }), (e) => cleared(e, 'crack1')));
  assert.ok(walk(steve, 90, 1, 0) && steve.heroPos().x > (c.tx + 1) * 16, 'broken, the way into storage is open');
  assert.equal(runUntil(solo('steve', c.tx - 1, c.ty), 90, aim(1, 0, { attackPressed: true }), (e) => poked(e, 'crack1', 'steve')), null, 'Steve is never a try');
});

test('gap: Max\'s dash gets over gap1 into the cache and nobody else does, and the gap stays shut to walking', () => {
  const g = prop('gap1');
  const sim = solo('max', g.tx - 3, g.ty, [{ id: 'max', level: 4 }, { id: 'mike', level: 6 }]);
  assert.ok(runUntil(sim, 60, aim(1, 0, { specialPressed: true }), (e) => cleared(e, 'gap1')), 'the dash opens it');
  for (let f = 0; f < 30; f++) sim.step(idle);
  assert.ok(sim.heroPos().x - 5 > g.tx * 16 + 16, `she lands in the cache, at ${sim.heroPos().x.toFixed(0)}`);
  const back = walk(sim, 90, -1, 0);
  assert.ok(back.x - 5 >= g.tx * 16 + 16 - 0.01, 'walking back is no way over: it holds');
  const mike = solo('mike', g.tx - 2, g.ty);
  assert.ok(walk(mike, 120, 1, 0).x <= g.tx * 16 - 5 + 0.01, 'gap1 holds a walking hero');
  assert.ok(runUntil(solo('mike', g.tx - 1, g.ty), 60, aim(1, 0, { attackPressed: true }), (e) => poked(e, 'gap1', 'mike')), 'a swing at it is a try');
  assert.equal(runUntil(solo('mike', g.tx - 1, g.ty), 60, aim(1, 0, { attackPressed: true }), (e) => cleared(e, 'gap1')), null, 'and does not open it');
});

test('seals: open and walkable at the start, shut and solid after Sim.closeProp, and open again, and nothing burns or breaks one', () => {
  const s1 = prop('seal1');
  const sim = solo('mike', s1.tx, s1.ty - 3);
  assert.deepEqual(sim.view().props.filter((p) => p.id.startsWith('seal')).map((p) => p.state), ['open', 'open']);
  assert.ok(walk(solo('mike', s1.tx, s1.ty - 3), 120, 0, 1).y > (s1.ty + 2) * 16, 'open, a hero walks out of the den through it');
  sim.closeProp('seal1');
  sim.closeProp('seal2');
  assert.deepEqual(sim.view().props.filter((p) => p.id.startsWith('seal')).map((p) => p.state), ['closed', 'closed']);
  const stopped = walk(sim, 140, 0, 1);
  assert.ok(stopped.y <= s1.ty * 16 + 0.01, `a shut seal stops a hero at ${stopped.y.toFixed(0)}`);
  assert.ok(!runUntil(sim, 60, aim(0, 1, { attackPressed: true }), (e) => cleared(e, 'seal1')), 'a swing does not clear it');
  const fire = solo('dustin', s1.tx, s1.ty - 2);
  fire.closeProp('seal1');
  assert.ok(!runUntil(fire, 90, aim(0, 1, { specialPressed: true }), (e) => cleared(e, 'seal1') || e.t === 'poked'), 'Dustin\'s spray does not burn it, and is not even a try');
  sim.openProp('seal1');
  assert.ok(walk(sim, 90, 0, 1).y > s1.ty * 16, 'opened again, it lets him through');
});

test('rift: the Gate is a wall, and wide open before the defense', () => {
  const rift = prop('rift');
  const sim = solo('mike', rift.tx + 1, rift.ty + 5);
  assert.ok(walk(sim, 120, 0, -1).y >= (rift.ty + 3) * 16 + 8 - 0.01, 'a hero cannot walk into the rift');
  const view = sim.view();
  assert.equal(view.props.find((p) => p.id === 'rift')?.k ?? 0, 0, 'wide open before the defense');
});

// ---------------------------------------------------------------- the hint, and the party it needs
const FULL: PartySeed[] = [{ id: 'mike', level: 6 }, { id: 'dustin', level: 5 }, { id: 'max', level: 4 }, { id: 'steve', level: 4 }];
const withLead = (lead: HeroId, party: PartySeed[]): PartySeed[] => [...party.filter((p) => p.id === lead), ...party.filter((p) => p.id !== lead)];
function attempt(hero: HeroId, party: PartySeed[], at: [number, number], input: (f: number) => Partial<SimInput>, frames = 80): { puzzle: string | null; tried: string | null } {
  const sim = solo(hero, at[0], at[1], withLead(hero, party));
  const tracker = createPuzzleTracker(S.puzzles);
  for (let f = 0; f < frames; f++) {
    for (const e of sim.step({ ...idle, ...input(f) })) if (e.t === 'poked') tracker.poke(e.propId, e.hero);
    tracker.tick({ hasFired: () => true, busy: false, props: sim.view().props, hero: sim.heroPos(), party: sim.party().map((p) => p.id) });
  }
  const stuck = tracker.highlight();
  return { puzzle: stuck?.id ?? null, tried: stuck ? tracker.triedProp(stuck) : null };
}

test('hints: the wrong hero at crack1 gets the hint at once, and gap1\'s hint never shows without Max in the party', () => {
  const c = prop('crack1'), g = prop('gap1');
  const swing = (f: number): Partial<SimInput> => (f === 0 ? { mx: 0.2, attackPressed: true } : { mx: 0.2 });
  assert.deepEqual(Object.values(attempt('mike', FULL, [c.tx - 1, c.ty], swing)), ['crack', 'crack1'], 'Mike swinging at the crack, with Steve in the party');
  assert.equal(attempt('steve', FULL, [c.tx - 1, c.ty], swing).puzzle, null, 'Steve at the crack is who it wants');
  const lean = (): Partial<SimInput> => ({ mx: 1 });
  assert.deepEqual(Object.values(attempt('mike', FULL, [g.tx - 2, g.ty], lean)), ['gap', 'gap1'], 'Mike leaning on the gap, with Max in the party');
  const noMax = FULL.filter((p) => p.id !== 'max');
  assert.equal(attempt('mike', noMax, [g.tx - 2, g.ty], lean).puzzle, null, 'and not a word without Max');
  const sim = solo('mike', g.tx - 1, g.ty, withLead('mike', noMax));
  const tracker = createPuzzleTracker(S.puzzles);
  for (let f = 0; f < 60 * 20; f++) {
    sim.step(idle);
    tracker.tick({ hasFired: () => true, busy: false, props: sim.view().props, hero: sim.heroPos(), party: sim.party().map((p) => p.id) });
  }
  assert.equal(tracker.highlight(), null, 'twenty seconds beside the gap, no hint, so the party without Max is never nagged');
});

// ---------------------------------------------------------------- a loss is the party or the ward
test('losses: the whole party down is a loss with no reason, the ward falling is a loss that says ELEVEN IS DOWN', () => {
  const all: SimEvent = { t: 'allDown' }, ward: SimEvent = { t: 'wardDown', id: 'eleven' };
  assert.ok(isLoss(all) && isLoss(ward));
  assert.ok(!isLoss({ t: 'defended' }) && !isLoss({ t: 'heroKO', hero: 'mike' }) && !isLoss({ t: 'groupCleared', group: 'boss' }));
  assert.equal(lossReason(all), undefined);
  assert.equal(lossReason(ward), 'ELEVEN IS DOWN');
  assert.equal(WARD_DOWN_REASON, 'ELEVEN IS DOWN');
  // The sim really emits it: a defense with the party out of the way ends in wardDown, once, and not in allDown.
  const sim = createSim(simOptions(S, grid, { party: defaultParty('2.3'), start: { x: px(29), y: fy(7) }, seed: 3 }));
  sim.defend();
  const events: SimEvent[] = [];
  for (let f = 0; f < 4000 && !events.some((e) => e.t === 'wardDown'); f++) events.push(...sim.step(idle));
  assert.equal(events.filter((e) => e.t === 'wardDown').length, 1, 'wardDown, once');
  assert.ok(events.some(isLoss) && !events.some((e) => e.t === 'allDown'), 'it is the ward, not the party');
});

// ---------------------------------------------------------------- whole runs
const seeds = (n: number): number[] => Array.from({ length: n }, (_, i) => i + 1);
/** The scripts a bot run plays. It walks the corridor to the crack and never goes into the cache, so the gap's two stay unsaid. */
const ROUTE = ['l6_start', 'l6_crack_hint', 'l6_crack_done', 'l6_storage', 'l6_den', 'l6_alpha', 'l6_alpha_down', 'l6_gate', 'l6_defend', 'l6_clear'];
const run = (seed: number, difficulty: Difficulty = 'chief', careless = false) => playStage(S, seed, defaultParty('2.3'), 30000, difficulty, careless);

test('whole run: the bot breaks the crack, beats the Alpha, defends Eleven and clears the Gate most of the time on chief', () => {
  let clears = 0, falls = 0;
  for (const seed of seeds(20)) {
    const r = run(seed);
    assert.ok(r.done || r.allDown, `seed ${seed} got stuck after ${r.frames} frames`);
    if (r.fell) falls++;
    if (!r.done) continue;
    clears++;
    // A fight can push the bot past the gap's hint rect, which only plays a script. The gap itself never opens.
    assert.deepEqual(r.said.filter((id) => id !== 'l6_gap_hint'), ROUTE, `seed ${seed}: the scripts play in route order, the cache never opened`);
    assert.ok(r.xp >= 100 && r.xp <= 160, `seed ${seed}: the run pays ${r.xp} XP`);
    assert.ok(r.frames >= 60 * 85 && r.frames <= 60 * 150, `seed ${seed}: ${(r.frames / 60).toFixed(0)} s`);
    // The 45 s defense comes on top of a whole stage, so a clear takes more than the 1.3 band's 300: about 425 on average.
    assert.ok(r.damage >= 20 && r.damage <= 600, `seed ${seed}: ${r.damage.toFixed(0)} damage`);
  }
  assert.ok(clears >= 15 && clears <= 19, `cleared ${clears} of 20: the stage is neither a walk nor a wall`);
  assert.ok(falls <= 3, `Eleven fell in ${falls} of 20 careful runs`);
});

test('whole run: kid is a walk, a careless bot and upside both finish, and nothing sticks over many seeds', () => {
  const kid = seeds(10).filter((seed) => run(seed, 'kid').done).length;
  assert.ok(kid >= 9, `kid cleared ${kid} of 10`);
  let careless = 0, upside = 0;
  for (const seed of seeds(20)) {
    const b = run(seed, 'chief', true);
    assert.ok(b.done || b.allDown, `a careless bot on seed ${seed} got stuck`);
    if (b.done) careless++;
    const u = run(seed, 'upside');
    assert.ok(u.done || u.allDown, `upside on seed ${seed} got stuck`);
    if (u.done) upside++;
  }
  assert.ok(careless >= 12, `the careless bot cleared ${careless} of 20`);
  assert.ok(upside >= 4, `upside cleared ${upside} of 20`);
  for (const seed of seeds(60)) {
    const r = run(seed + 100);
    assert.ok(r.done || r.allDown, `seed ${seed + 100} got stuck after ${r.frames} frames`);
  }
});
