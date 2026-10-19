// Stage 5.2, the Abyss, in the real sim: the void holds everyone, gap1 holds everyone but Max's dash, sense1 shows itself to Will alone, burn1 and crack1
// open outright to their heroes and give way to anyone else's twelfth blow, and the hint names someone in any party. The map, the budget, the beats and the
// scripts are in stage52.test.ts, and whole runs of the bot in stage52-play.test.ts.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createSim } from '../src/combat/index.ts';
import { createPuzzleTracker } from '../src/world/puzzles.ts';
import { simOptions } from '../src/world/options.ts';
import { CHIP_HITS } from '../src/world/stages/stage52_data.ts';
import type { HeroId, PartySeed, SimEvent, SimInput } from '../src/core/types.ts';
import { idle, runUntil } from './stage-helpers.ts';
import { S, kit, prop } from './stage52-helpers.ts';

const { grid } = kit;
const propsOnly = S.spawns.filter((s) => s.kind === 'prop');
const px = (tx: number): number => tx * 16 + 8;
const fy = (ty: number): number => ty * 16 + 12;
/** One hero on the stage with its props and no enemies, so nothing interrupts what a test is looking at. The rest of `party` trails. */
const solo = (id: HeroId, tx: number, ty: number, party: PartySeed[] = [{ id, level: 8 }]) =>
  createSim({ ...simOptions(S, grid, { party, start: { x: px(tx), y: fy(ty) } }), spawns: propsOnly });
/** Face (mx, my) with a nudge too small to walk anywhere, and press `key` once at frame 6. */
const aim = (mx: number, my: number, key: Partial<SimInput>) => (f: number): Partial<SimInput> & SimInput =>
  ({ ...idle, ...(f < 6 ? { mx: mx * 0.2, my: my * 0.2 } : f === 6 ? { mx: mx * 0.2, my: my * 0.2, ...key } : {}) });
/** Face (mx, my) and hold Attack, so the hero swings as fast as his cooldown lets him. */
const keepSwinging = (mx: number, my: number) => (): SimInput => ({ ...idle, mx: mx * 0.2, my: my * 0.2, attackHeld: true });
const cleared = (e: SimEvent, id: string): boolean => e.t === 'propCleared' && e.propId === id;
const thud = (e: SimEvent): boolean => e.t === 'sfx' && e.id === 'thud';
const walk = (sim: ReturnType<typeof solo>, frames: number, mx: number, my: number): { x: number; y: number } => {
  for (let f = 0; f < frames; f++) sim.step({ ...idle, mx, my });
  return sim.heroPos();
};

/** Swings until `id` gives way and counts the blows that did not break it (each is a thud). Null if it never does. */
function blows(hero: HeroId, at: [number, number], dir: [number, number], id: string, party?: PartySeed[]): number | null {
  const sim = solo(hero, at[0], at[1], party);
  let n = 0;
  const input = keepSwinging(dir[0], dir[1]);
  for (let f = 0; f < 60 * 20; f++) {
    for (const e of sim.step(input())) {
      if (thud(e)) n++;
      if (cleared(e, id)) return n;
    }
  }
  return null;
}

// ---------------------------------------------------------------- the void
test('the void: a hero walking off any edge of any island stops at the rim, and the bridges hold a hero in their lane', () => {
  for (const [name, tx, ty] of [['lawn', 10, 35], ['road', 30, 34], ['deck', 17, 24], ['classroom', 10, 10], ['ring', 40, 11]] as const) {
    for (const [mx, my] of [[1, 0], [-1, 0], [0, 1], [0, -1]] as const) {
      const sim = solo('mike', tx, ty);
      for (let f = 0; f < 600; f++) {
        sim.step({ ...idle, mx, my });
        const p = sim.heroPos();
        const t = grid.drop?.[Math.floor((p.y - 4) / 16) * grid.w + Math.floor(p.x / 16)];
        assert.ok(!t, `${name}: walking (${mx}, ${my}) put Mike on the void at frame ${f}`);
      }
    }
  }
  // On the first bridge, north and south are the void: he stays on the lane.
  const bridge = solo('mike', 19, 35);
  const south = walk(bridge, 60, 0, 1);
  assert.ok(Math.abs(south.y - fy(35)) < 6, `the bridge holds him to its lane: y ${south.y}`);
});

// ---------------------------------------------------------------- gap1
test('gap1: Max\'s skate dash gets over it from the road onto the pad, and it stays shut to walking', () => {
  const g = prop('gap1');
  const sim = solo('max', g.tx - 2, g.ty, [{ id: 'max', level: 8 }, { id: 'mike', level: 8 }]);
  const e = runUntil(sim, 60, aim(1, 0, { specialPressed: true }), (ev) => cleared(ev, 'gap1'));
  assert.ok(e, 'the dash opens it');
  for (let f = 0; f < 30; f++) sim.step(idle);
  const p = sim.heroPos();
  assert.ok(p.x - 5 > g.tx * 16 + 16, `she lands on the pad, at ${p.x.toFixed(0)}`);
  const back = walk(sim, 90, -1, 0);
  assert.ok(back.x - 5 >= g.tx * 16 + 16 - 0.01, 'walking back is no way over: it holds');
  const mike = solo('mike', g.tx - 2, g.ty);
  assert.ok(walk(mike, 120, 1, 0).x <= g.tx * 16 - 5 + 0.01, 'nobody else walks over it');
});

// ---------------------------------------------------------------- sense1
test('sense1: Will shows the bridge by standing at its foot and nobody else does, and once it shows the way north to the classroom is open', () => {
  const s = prop('sense1');
  const will = solo('will', s.tx, s.ty + 4, [{ id: 'will', level: 7 }]);
  assert.ok(runUntil(will, 60, () => idle, (ev) => cleared(ev, 'sense1')), 'Will at its foot reveals it');
  const north = walk(will, 240, 0, -1);
  assert.ok(north.y < s.ty * 16, `and he walks over it onto the classroom: y ${north.y.toFixed(0)}`);
  for (const id of ['mike', 'dustin', 'robin', 'max', 'steve'] as HeroId[]) {
    const sim = solo(id, s.tx, s.ty + 4);
    assert.equal(runUntil(sim, 180, () => ({ ...idle, my: -1 }), (ev) => cleared(ev, 'sense1')), null, `${id} does not`);
    assert.ok(sim.heroPos().y >= (s.ty + 4) * 16 - 8, `${id} cannot walk onto the hidden bridge`);
  }
  // The bridge is the void to a hero who has not seen it: solid, in the view as a shut prop.
  assert.equal(solo('mike', s.tx, s.ty + 4).view().props.find((p) => p.id === 'sense1')?.state, 'closed');
});

// ---------------------------------------------------------------- burn1
test('burn1: Dustin\'s spray burns the wall away from the foot of the bridge, and the way north is open', () => {
  const b = prop('burn1');
  const dustin = solo('dustin', b.tx, b.ty + 3, [{ id: 'dustin', level: 9 }]);
  const e = runUntil(dustin, 120, aim(0, -1, { specialPressed: true }), (ev) => cleared(ev, 'burn1'));
  assert.ok(e, 'the spray opens it');
  const north = walk(dustin, 120, 0, -1);
  assert.ok(north.y < b.ty * 16, `burned, the bridge carries him on to the deck: y ${north.y.toFixed(0)}`);
  const closed = solo('mike', b.tx, b.ty + 3);
  assert.ok(walk(closed, 60, 0, -1).y >= (b.ty + 2) * 16 - 0.01, 'while it stands the vines hold a walking hero');
});

test('burn1: with no one to burn it, anyone\'s twelfth blow wears the vines away, and fewer do not; the wall does not give way to a hero who is only standing by it', () => {
  const b = prop('burn1');
  for (const id of ['mike', 'robin', 'will', 'lucas'] as HeroId[]) {
    const n = blows(id, [b.tx, b.ty + 2], [0, -1], 'burn1');
    assert.equal(n, CHIP_HITS - 1, `${id}: ${CHIP_HITS - 1} blows hold, the ${CHIP_HITS}th breaks`);
  }
  const mike = solo('mike', b.tx, b.ty + 2);
  assert.equal(runUntil(mike, 60 * 6, () => idle, (ev) => cleared(ev, 'burn1')), null, 'a hero standing there does nothing');
  // Aimed away from it, the swings do nothing either.
  assert.equal(blows('mike', [b.tx, b.ty + 2], [0, 1], 'burn1'), null, 'swinging at nothing does not wear it down');
});

// ---------------------------------------------------------------- crack1
test('crack1: Steve\'s nail bat and Hopper\'s fists break it at once, and everyone else wears it down in twelve blows', () => {
  const c = prop('crack1');
  const at: [number, number] = [c.tx - 1, c.ty + 1];
  const swing = (id: HeroId, lv = 8): SimEvent | null => runUntil(solo(id, at[0], at[1], [{ id, level: lv }]), 90, aim(1, 0, { attackPressed: true }), (e) => cleared(e, 'crack1'));
  assert.ok(swing('steve'), 'a nail bat swing breaks it');
  assert.ok(swing('hopper', 7), 'so does a punch');
  for (const id of ['mike', 'dustin', 'will'] as HeroId[]) assert.equal(swing(id), null, `one swing of ${id}'s does not`);
  for (const id of ['mike', 'robin', 'eleven', 'max'] as HeroId[]) {
    assert.equal(blows(id, at, [1, 0], 'crack1'), CHIP_HITS - 1, `${id}: ${CHIP_HITS} blows break it`);
  }
  const mike = solo('mike', c.tx - 2, c.ty + 1);
  assert.ok(walk(mike, 120, 1, 0).x <= c.tx * 16 - 5 + 0.01, 'while it stands it holds a walking hero');
  const steve = solo('steve', c.tx - 1, c.ty + 1);
  assert.ok(runUntil(steve, 60, aim(1, 0, { attackPressed: true }), (e) => cleared(e, 'crack1')));
  assert.ok(walk(steve, 90, 1, 0).x > (c.tx + 1) * 16, 'broken, the neck is open');
});

// ---------------------------------------------------------------- the hint, and the party it needs
const withLead = (lead: HeroId, party: PartySeed[]): PartySeed[] => [...party.filter((p) => p.id === lead), ...party.filter((p) => p.id !== lead)];
const lv = (ids: HeroId[]): PartySeed[] => ids.map((id) => ({ id, level: 8 }));
/** Waits beside `id` and returns the hint the tracker would show: the puzzle, its hero and its line. */
function waits(party: HeroId[], id: string, at: [number, number], frames = 60 * 6): { puzzle: string; hero: HeroId; hint: string } | null {
  const sim = solo(party[0] as HeroId, at[0], at[1], lv(party));
  const tracker = createPuzzleTracker(S.puzzles);
  for (let f = 0; f < frames; f++) {
    for (const e of sim.step(idle)) if (e.t === 'poked') tracker.poke(e.propId, e.hero);
    tracker.tick({ hasFired: () => true, busy: false, props: sim.view().props, hero: sim.heroPos(), party: sim.party().map((p) => p.id) });
  }
  const h = tracker.highlight();
  return h && h.prop === id ? { puzzle: h.id, hero: h.hero, hint: h.hint } : null;
}

test('hints: the hint at burn1 and crack1 names the gate\'s own hero while one is in the party, and else the first other hero, so the wait always names someone', () => {
  const b = prop('burn1'), c = prop('crack1');
  const atBurn: [number, number] = [b.tx, b.ty + 3], atCrack: [number, number] = [c.tx - 2, c.ty + 1];
  assert.equal(waits(['mike', 'dustin', 'robin', 'will'], 'burn1', atBurn)?.hero, 'dustin');
  assert.equal(waits(['mike', 'nancy', 'robin', 'will'], 'burn1', atBurn)?.hint, 'MAYBE NANCY SHOULD TRY HER MOLOTOV');
  assert.equal(waits(['mike', 'lucas', 'robin', 'will'], 'burn1', atBurn)?.hint, 'MAYBE MIKE SHOULD HACK AT THE VINES');
  assert.equal(waits(['mike', 'dustin', 'robin', 'will'], 'crack1', atCrack)?.hint, 'MAYBE MIKE SHOULD BREAK THE WALL', 'no Steve and no Hopper');
  assert.equal(waits(['mike', 'steve', 'robin', 'will'], 'crack1', atCrack)?.hero, 'steve');
  assert.equal(waits(['mike', 'hopper', 'robin', 'will'], 'crack1', atCrack)?.hint, 'MAYBE HOPPER SHOULD THROW A PUNCH');
  assert.equal(waits(['lucas', 'dustin', 'robin', 'will'], 'crack1', atCrack)?.hint, 'MAYBE DUSTIN SHOULD BREAK THE WALL', 'the lead may be anyone: the first of the others in the list is named');
  assert.equal(waits(['lucas', 'robin', 'eleven', 'will'], 'crack1', atCrack)?.hint, 'MAYBE LUCAS SHOULD BREAK THE WALL');
  // And the hint comes only after the five seconds, when nobody has tried anything.
  assert.equal(waits(['mike', 'dustin', 'robin', 'will'], 'burn1', atBurn, 60 * 2), null);
});

test('hints: Mike swinging at crack1 with Steve in the party is a try, and the hint comes at once and names Steve', () => {
  const c = prop('crack1');
  const party = withLead('mike', lv(['mike', 'steve', 'robin', 'will']));
  const sim = solo('mike', c.tx - 1, c.ty + 1, party);
  const tracker = createPuzzleTracker(S.puzzles);
  for (let f = 0; f < 60; f++) {
    for (const e of sim.step({ ...idle, ...aim(1, 0, { attackPressed: true })(f) })) if (e.t === 'poked') tracker.poke(e.propId, e.hero);
    tracker.tick({ hasFired: () => true, busy: false, props: sim.view().props, hero: sim.heroPos(), party: sim.party().map((p) => p.id) });
  }
  const h = tracker.highlight();
  assert.deepEqual([h?.id, h?.hero], ['crack', 'steve']);
});
