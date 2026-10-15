// Stage 2.1, the Palace and the patch, in the real sim: the gates hold and open, each puzzle answers only its hero, the hint
// follows a wrong try, and whole headless runs of the bot through the ambush, with the carry rule that brings Will in.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { defaultParty, partyFor } from '../src/core/campaign.ts';
import { createSim } from '../src/combat/index.ts';
import { createBot } from '../src/combat/bot.ts';
import { createPuzzleTracker } from '../src/world/puzzles.ts';
import { simOptions } from '../src/world/options.ts';
import { createDirector } from '../src/world/triggers.ts';
import { STAGE_21 as S } from '../src/world/stages/stage21.ts';
import type { Difficulty, HeroId, PartySeed, SimEvent, SimInput } from '../src/core/types.ts';
import { idle, runUntil, stageKit, tileOf } from './stage-helpers.ts';
import type { Prop } from './stage-helpers.ts';

const kit = stageKit(S);
const { grid, props } = kit;
const prop = (id: string): Prop => props.find((p) => p.id === id) as Prop;
const PARTY: HeroId[] = ['mike', 'dustin', 'lucas', 'will'];
const OTHERS = (hero: HeroId): HeroId[] => PARTY.filter((h) => h !== hero);

// ---------------------------------------------------------------- the gates, puzzles and hints, in the real sim
const propsOnly = S.spawns.filter((s) => s.kind === 'prop');
/** One hero on the stage with its props and no enemies, so nothing interrupts what a test is looking at. */
const solo = (id: HeroId, tx: number, ty: number) =>
  createSim({ ...simOptions(S, grid, { party: [{ id, level: 4 }], start: { x: tx * 16 + 8, y: ty * 16 + 12 } }), spawns: propsOnly });
/** Face (mx, my) with a nudge too small to walk anywhere, then press `key` once: the hero stays exactly where he was put. */
const aim = (mx: number, my: number, key: Partial<SimInput>) => (f: number): SimInput =>
  (f < 6 ? { ...idle, mx: mx * 0.2, my: my * 0.2 } : f === 6 ? { ...idle, mx: mx * 0.2, my: my * 0.2, ...key } : idle);
const hit = (e: SimEvent, kind: 'targetHit' | 'propCleared', id: string): boolean => e.t === kind && e.propId === id;
const walk = (sim: ReturnType<typeof solo>, frames: number, mx: number, my: number): { x: number; y: number } => {
  for (let f = 0; f < frames; f++) sim.step({ ...idle, mx, my });
  return sim.heroPos();
};

test('gates: closed, vines1, gate1 and hidden1 stop a hero in the sim, and open they let one through', () => {
  const vines = prop('vines1'), gate = prop('gate1'), hidden = prop('hidden1');
  const street = solo('mike', vines.tx, vines.ty - 2);
  assert.ok(walk(street, 90, 0, 1).y <= vines.ty * 16 + 0.01, 'vines1 holds the fence gap');
  street.openProp('vines1');
  assert.ok(walk(street, 150, 0, 1).y > (vines.ty + 2) * 16, 'open, the patch is next');
  const yard = solo('mike', gate.tx - 2, gate.ty + 1);
  assert.ok(walk(yard, 90, 1, 0).x <= gate.tx * 16 - 5 + 0.01, 'gate1 holds the way to the far field');
  yard.openProp('gate1');
  assert.ok(walk(yard, 150, 1, 0).x > (gate.tx + 2) * 16, 'open, the far field is next');
  const corn = solo('mike', hidden.tx, hidden.ty - 2);
  assert.ok(walk(corn, 90, 0, 1).y <= hidden.ty * 16 + 0.01, 'hidden1 is a wall of corn');
  corn.openProp('hidden1');
  assert.ok(walk(corn, 150, 0, 1).y > (hidden.ty + 2) * 16, 'revealed, the hole is next');
});

test('puzzles: only Dustin burns vines1 away, and only from close up', () => {
  const v = prop('vines1');
  const burn = (id: HeroId, dy: number, key: Partial<SimInput> = { specialPressed: true }): SimEvent | null =>
    runUntil(solo(id, v.tx, v.ty - dy), 120, aim(0, 1, key), (e) => hit(e, 'propCleared', 'vines1'));
  assert.ok(burn('dustin', 2) && burn('dustin', 3), 'Farrah spray from two and three tiles back clears it');
  assert.ok(!burn('dustin', 5), 'five tiles back it falls short');
  assert.ok(!burn('dustin', 2, { attackPressed: true }), 'the candy lure does not');
  for (const id of OTHERS('dustin')) assert.ok(!burn(id, 2) && !burn(id, 2, { attackPressed: true }), `${id} cannot burn it`);
});

test('puzzles: Lucas lights target1 over the barn wall from the yard, and nobody else can', () => {
  const t = prop('target1');
  const shoot = (id: HeroId, dy: number, key: Partial<SimInput> = { attackPressed: true }, dx = 0): boolean =>
    runUntil(solo(id, t.tx + dx, t.ty + dy), 120, aim(0, -1, key), (e) => hit(e, 'targetHit', 'target1')) !== null;
  for (const dy of [2, 4, 6, 8]) assert.ok(shoot('lucas', dy), `a rocket north from ${dy} tiles out lights the plate`);
  assert.ok(!shoot('lucas', 11), 'eleven tiles out it falls short');
  assert.ok(!shoot('lucas', 4, { attackPressed: true }, 3), 'a column three tiles over misses');
  for (const id of OTHERS('lucas')) {
    assert.ok(!shoot(id, 4), `${id}'s basic does not light it`);
    assert.ok(!shoot(id, 4, { specialPressed: true }), `${id}'s special does not light it`);
  }
});

test('puzzles: only Will, active and within 40 px, shows the way through the corn', () => {
  const h = prop('hidden1');
  const reveal = (id: HeroId, dy: number, frames = 90): boolean =>
    runUntil(solo(id, h.tx, h.ty - dy), frames, () => idle, (e) => hit(e, 'propCleared', 'hidden1')) !== null;
  assert.ok(reveal('will', 1) && reveal('will', 2), 'standing one or two tiles from it, Will shows it');
  assert.ok(!reveal('will', 4), 'four tiles out he does not');
  for (const id of OTHERS('will')) assert.ok(!reveal(id, 1), `${id} beside it sees only corn`);
  // On the bench, he does nothing until he is swapped in.
  const sim = createSim({ ...simOptions(S, grid, { party: [{ id: 'mike', level: 5 }, { id: 'will', level: 3 }], start: { x: h.tx * 16 + 8, y: (h.ty - 1) * 16 + 12 } }), spawns: propsOnly });
  assert.equal(runUntil(sim, 90, () => idle, (e) => hit(e, 'propCleared', 'hidden1')), null, 'Will on the bench');
  assert.ok(runUntil(sim, 20, (f) => (f === 0 ? { ...idle, swapTo: 1 } : idle), (e) => hit(e, 'propCleared', 'hidden1')), 'and swapped in');
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
const down = { my: 0.2 }, up = { my: -0.2 }, right = { mx: 0.2 };
const into = (mx: number, my: number) => (): Partial<SimInput> => ({ mx, my });

test('hints: the wrong hero swinging at the vines, the gate or the corn gets the hint at once, the right one does not', () => {
  for (const hero of OTHERS('dustin')) {
    const r = attempt({ hero, at: [40, 12], input: swing(down) });
    assert.deepEqual([r.puzzle, r.tried], ['vines', 'vines1'], `${hero} at the vines`);
  }
  assert.equal(attempt({ hero: 'dustin', at: [40, 12], input: (f) => (f === 0 ? { ...down, specialPressed: true } : down) }).puzzle, null, 'Dustin spraying them is who the vines want');
  for (const hero of OTHERS('lucas')) {
    const r = attempt({ hero, at: [21, 28], input: swing(right) });
    assert.deepEqual([r.puzzle, r.tried], ['target', 'gate1'], `${hero} at the gate: the hint names the gate`);
  }
  assert.equal(attempt({ hero: 'lucas', at: [21, 28], input: swing(right) }).puzzle, null, 'Lucas shoots the plate that opens it');
  const plate = prop('target1');
  const mike = attempt({ hero: 'mike', at: [plate.tx, 26], input: swing(up) });
  assert.deepEqual([mike.puzzle, mike.tried], ['target', 'target1'], 'Mike swinging at the plate itself');
  assert.deepEqual(mike.opened, [], 'his bat does not light it');
});

test('hints: pushing against the vines, the gate or the corn with the wrong hero gets the hint too', () => {
  assert.equal(attempt({ hero: 'mike', at: [40, 12], input: into(0, 1), frames: 80 }).puzzle, 'vines');
  assert.equal(attempt({ hero: 'mike', at: [21, 28], input: into(1, 0), frames: 80 }).puzzle, 'target');
  assert.equal(attempt({ hero: 'lucas', at: [21, 28], input: into(1, 0), frames: 80 }).puzzle, null, 'Lucas leaning on the gate is not a wrong try');
  for (const hero of OTHERS('will')) {
    const r = attempt({ hero, at: [45, 28], input: into(0, 1), frames: 80 });
    assert.deepEqual([r.puzzle, r.tried], ['hidden', 'hidden1'], `${hero} leaning on the corn`);
  }
  const will = attempt({ hero: 'will', at: [45, 28], input: into(0, 1), frames: 80 });
  assert.equal(will.puzzle, null, 'Will walks through it');
  assert.deepEqual(will.opened, ['hidden1']);
});

// ---------------------------------------------------------------- whole runs
interface Run {
  done: boolean; allDown: boolean; frames: number; xp: number; kos: number; damage: number; levels: number[]; said: string[]; waves: string[];
}

/** Plays the whole stage with the bot, the dialogue skipped. */
function play(seed: number, party: PartySeed[], difficulty: Difficulty = 'chief', careless = false, maxFrames = 30000): Run {
  const sim = createSim(simOptions(S, grid, { party, seed, difficulty }));
  const bot = createBot({ grid, waypoints: S.waypoints, careless });
  const said: string[] = [], waves: string[] = [];
  const dir = createDirector(S.beats, S.waves, {
    sim: () => sim, say: (id, done) => { said.push(id); done(); }, scare: (done) => done(), open: (id) => sim.openProp(id),
    alarm: () => undefined, jingle: () => undefined, finish: () => undefined,
  });
  let allDown = false, f = 0;
  for (; f < maxFrames && !dir.finished() && !allDown; f++) {
    const ev = sim.step(bot.next(sim));
    dir.events(ev);
    for (const e of ev) {
      if (e.t === 'groupCleared' && e.group.startsWith('amb')) waves.push(e.group);
      if (e.t === 'allDown') allDown = true;
    }
    const [tx, ty] = tileOf(sim.heroPos().x, sim.heroPos().y);
    dir.tick(tx, ty);
  }
  const st = sim.stats();
  return { done: dir.finished(), allDown, frames: f, xp: st.xpEarned, kos: st.kos, damage: st.damageTaken, levels: sim.party().map((p) => p.level), said, waves };
}

const ROUTE = [
  'l4_start', 'l4_max', 'l4_street', 'l4_dart', 'l4_vines_hint', 'l4_vines_done', 'l4_patch', 'l4_shoot_hint', 'l4_sense_hint',
  'l4_sense_done', 'l4_ambush', 'l4_clear',
];
/** A rocket that hits the plate by chance plays its "done" script early. It is not part of the route's order. */
const incidental = new Set(['l4_shoot_done']);
const seeds = (n: number): number[] => Array.from({ length: n }, (_, i) => i + 1);

test('whole run: the bot clears the patch most of the time on chief, and the three waves come up one after another', () => {
  let clears = 0;
  for (const seed of seeds(10)) {
    const r = play(seed, defaultParty('2.1'));
    assert.ok(r.done || r.allDown, `seed ${seed} got stuck after ${r.frames} frames`);
    if (!r.done) continue;
    clears++;
    assert.ok(r.xp >= 130 && r.xp <= 166, `seed ${seed}: the stage pays ${r.xp} XP`);
    assert.deepEqual(r.said.filter((id) => !incidental.has(id)), ROUTE, `seed ${seed}: the scripts play in route order`);
    assert.deepEqual(r.waves, ['amb1', 'amb2', 'amb3'], `seed ${seed}: the waves come in turn`);
    assert.ok(r.frames >= 60 * 70 && r.frames <= 60 * 150, `seed ${seed}: ${(r.frames / 60).toFixed(0)} s`);
    assert.ok(Math.max(...r.levels) <= 6, `levels ${r.levels.join(',')}`);
  }
  assert.ok(clears >= 7, `cleared ${clears} of 10`);
});

test('whole run: kid is a walk, and a bot that never dodges and upside both finish, in a win or a wipe', () => {
  const kid = seeds(10).filter((seed) => play(seed, defaultParty('2.1'), 'kid').done).length;
  assert.ok(kid >= 9, `kid cleared ${kid} of 10`);
  let careless = 0;
  for (const seed of seeds(10)) {
    const b = play(seed, defaultParty('2.1'), 'chief', true);
    assert.ok(b.done || b.allDown, `a careless bot on seed ${seed} got stuck`);
    if (b.done) careless++;
    const u = play(seed, defaultParty('2.1'), 'upside');
    assert.ok(u.done || u.allDown, `upside on seed ${seed} got stuck`);
  }
  assert.ok(careless >= 5, `a bot that never dodges cleared ${careless} of 10`);
});

test('whole run: forty seeds on chief, the bot always ends: no run is stuck', () => {
  let wipes = 0, damage = 0;
  for (const seed of seeds(40)) {
    const r = play(seed, defaultParty('2.1'));
    assert.ok(r.done || r.allDown, `seed ${seed} ran ${r.frames} frames without ending`);
    if (r.allDown) wipes++;
    damage += r.damage;
  }
  assert.ok(wipes <= 10, `${wipes} of 40 wiped`);
  assert.ok(damage / 40 >= 150 && damage / 40 <= 300, `the stage costs ${(damage / 40).toFixed(0)} HP a run (the spec's own numbers cost 15)`);
});

test('the carry rule: out of stage 1.3 Eleven is dropped and Will joins at the others\' average level minus one, and the bot plays that party', () => {
  const known = defaultParty('1.3');
  const party = partyFor('2.1', known);
  assert.deepEqual(party.map((p) => p.id), PARTY, 'Mike, Dustin, Lucas, Will');
  assert.equal(party.find((p) => p.id === 'will')?.level, 3, 'Will arrives at the average minus one');
  const r = play(3, party);
  assert.ok(r.done || r.allDown);
  assert.deepEqual(defaultParty('2.1').map((p) => [p.id, p.level]), [['mike', 5], ['dustin', 5], ['lucas', 4], ['will', 3]], 'a jump straight to 2.1 starts at Lv 5, 5, 4, 3');
});
