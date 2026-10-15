// The Lv 6 talents that ride on a move or a swap: Lucas's Camo, Max's Kickflip, Steve's Ahoy and Robin's Triple scoop.
// The held Special, Cleric, Molotov, Rally and Dart are in tests/talents6.test.ts.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { HERO_DEFS } from '../src/heroes/index.ts';
import type { Enemy, Hero, S } from '../src/combat/state.ts';
import { inp, makeWhite, press, rat, run, tc, tf } from './sim-helpers.ts';

const hero = (s: S, i: number): Hero => s.heroes[i] as Hero;
const enemy = (s: S, i: number): Enemy => s.enemies[i] as Enemy;
function freeze(s: S): void {
  for (const e of s.enemies) { e.stat.stun = 99999; e.hp = e.hpMax = 9999; }
}

// ------------------------------------------------------------------ Lucas: Camo

/** Lucas with a rat that has seen him, closing from the east. He shoots west, away from it. */
function camoRig(level: number, group = 'g') {
  const rig = makeWhite({ party: [{ id: 'lucas', level }], spawns: [rat('a', 10, 8, group)] });
  const r = enemy(rig.s, 0);
  r.hp = r.hpMax = 9999;
  r.aware = true; r.mode = 'chase';
  return { ...rig, r };
}

test('Camo: from Lv 6 a Triple shot hides Lucas, and a chasing foe stands and looks round', () => {
  const { sim, s, r } = camoRig(6);
  press(sim, { specialPressed: true, mx: -0.2 }, HERO_DEFS.lucas.special.at + 1);
  assert.ok(s.t6.camo > 0, 'hidden');
  assert.equal(sim.view().actors.find((a) => a.id === 'lucas')?.hidden, true, 'drawn faint');
  const x0 = r.x;
  run(sim, 100);
  assert.ok(Math.abs(r.x - x0) < 2, `the rat stayed put (${x0} to ${r.x})`);
  assert.notEqual(r.mode, 'windup');
  run(sim, 120);
  assert.equal(s.t6.camo, 0);
  assert.equal(sim.view().actors.find((a) => a.id === 'lucas')?.hidden, undefined);
  const x1 = r.x;
  run(sim, 40);
  assert.ok(r.x < x1 - 4, 'once it ends the rat comes on again');
});

test('Camo: at most once every 8 s, not below Lv 6, and a boss is not fooled', () => {
  const { sim, s } = camoRig(6);
  press(sim, { specialPressed: true, mx: -0.2 }, HERO_DEFS.lucas.special.at + 1);
  run(sim, 200);
  assert.equal(s.t6.camo, 0);
  hero(s, 0).mp = hero(s, 0).st.mp;
  press(sim, { specialPressed: true, mx: -0.2 }, HERO_DEFS.lucas.special.at + 1);
  assert.equal(s.t6.camo, 0, 'still cooling down');
  const low = camoRig(5);
  press(low.sim, { specialPressed: true, mx: -0.2 }, HERO_DEFS.lucas.special.at + 1);
  assert.equal(low.s.t6.camo, 0);
  const boss = camoRig(6, 'boss');
  press(boss.sim, { specialPressed: true, mx: -0.2 }, HERO_DEFS.lucas.special.at + 1);
  const x0 = boss.r.x;
  run(boss.sim, 60);
  assert.ok(boss.r.x < x0 - 4, 'the boss keeps coming');
});

test('Camo: it ends when Lucas tags out', () => {
  const { sim, s } = makeWhite({ party: [{ id: 'lucas', level: 6 }, { id: 'mike' }] });
  press(sim, { specialPressed: true, mx: -0.2 }, HERO_DEFS.lucas.special.at + 1);
  assert.ok(s.t6.camo > 0);
  press(sim, { swapTo: 1 }, 2);
  assert.equal(s.t6.camo, 0);
});

// ------------------------------------------------------------------ Max: Kickflip

/** Max rolls east 72 px from (72, 140). One rat waits just off the end of her line, out of the roll's own reach. */
function kickRig(level: number) {
  const rig = makeWhite({ party: [{ id: 'max', level }], start: { x: tc(4), y: tf(8) }, spawns: [rat('side', 8, 9), rat('far', 4, 12)] });
  freeze(rig.s);
  return rig;
}

test('Kickflip: from Lv 6 the roll ends in a shockwave that hits foes round where she lands', () => {
  const { sim, s } = kickRig(6);
  press(sim, { specialPressed: true, mx: 0.2 }, 30);
  assert.ok(enemy(s, 0).hp < 9999, 'the rat beside the landing is hit');
  assert.equal(enemy(s, 1).hp, 9999, 'the one far off is not');
  const low = kickRig(5);
  press(low.sim, { specialPressed: true, mx: 0.2 }, 30);
  assert.equal(enemy(low.s, 0).hp, 9999, 'a Lv 5 roll only hits what it passes through');
});

// ------------------------------------------------------------------ Steve: Ahoy

function ahoyRig(level: number, tx = 8) {
  const rig = makeWhite({ party: [{ id: 'mike' }, { id: 'steve', level }], start: { x: tc(4), y: tf(8) }, spawns: [rat('a', tx, 8)] });
  const r = enemy(rig.s, 0);
  r.hp = r.hpMax = 9999;
  return { ...rig, r };
}

test('Ahoy: a charged swap to a Lv 6 Steve leaps him onto the nearest foe, and the landing hits and stuns', () => {
  const { sim, s, r } = ahoyRig(6);
  const x0 = hero(s, 1).x;
  let peak = 0;
  sim.step(inp({ swapTo: 1 }));
  for (let i = 0; i < HERO_DEFS.steve.special.x.leap + 2; i++) {
    sim.step(inp());
    peak = Math.max(peak, sim.view().actors.find((a) => a.id === 'steve')?.z ?? 0);
  }
  const st = hero(s, 1);
  assert.ok(peak > 8, `he is in the air (${peak})`);
  assert.ok(st.x > x0 + 40, `he went to it (${x0} to ${st.x})`);
  assert.ok(Math.hypot(st.x - r.x, st.y - r.y) <= HERO_DEFS.steve.special.x.leapHit + 4, 'he landed beside it');
  assert.ok(r.hp < 9999, 'it was hit');
  assert.ok(r.stat.stun > 0, 'and stunned');
  assert.ok(sim.view().floaters.some((f) => f.text === 'AHOY'));
});

test('Ahoy: no leap on a quick swap, with no foe in reach, or below Lv 6', () => {
  const quick = ahoyRig(6);
  quick.s.swapCd = 100;
  run(quick.sim, 1, inp({ swapTo: 1 }));
  assert.equal(quick.s.t6.leap, null, 'not charged');
  const far = ahoyRig(6, 12);
  run(far.sim, 1, inp({ swapTo: 1 }));
  assert.equal(far.s.t6.leap, null, '128 px is out of reach');
  const low = ahoyRig(5);
  run(low.sim, 1, inp({ swapTo: 1 }));
  assert.equal(low.s.t6.leap, null);
});

// ------------------------------------------------------------------ Robin: Triple scoop

test('Triple scoop: from Lv 6 a toss throws three scoops, the side two weaker', () => {
  const scoops = (level: number): number => {
    const { sim, s } = makeWhite({ party: [{ id: 'robin', level }] });
    press(sim, { attackPressed: true, mx: 0.2 }, HERO_DEFS.robin.basic.at + 1);
    return s.projs.filter((p) => p.kind === 'scoop').length;
  };
  assert.equal(scoops(5), 1);
  assert.equal(scoops(6), 3);
  // A rat on the line of the throw takes the full scoop, as a Lv 5 toss gives it.
  const { sim, s } = makeWhite({ party: [{ id: 'robin', level: 6 }], spawns: [rat('mid', 8, 8)] });
  freeze(s);
  press(sim, { attackPressed: true, mx: 0.2 }, 40);
  const fresh = makeWhite({ party: [{ id: 'robin', level: 5 }], spawns: [rat('mid', 8, 8)] });
  freeze(fresh.s);
  press(fresh.sim, { attackPressed: true, mx: 0.2 }, 40);
  assert.ok(9999 - enemy(s, 0).hp >= 9999 - enemy(fresh.s, 0).hp, 'the scoop on target hits as hard as ever');
});
