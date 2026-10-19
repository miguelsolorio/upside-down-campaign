// Vecna's clock, his orbs and his tuning (docs/level-13.md, "Vecna" and "Lead's calls"): the chime that curses a random standing hero and marks an
// orb, the marked orb lifting the curse, each standing orb's heal, an orb breaking and regrowing, and the per-spawn numbers chapter 5 runs on.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { SimEvent } from '../src/core/types.ts';
import { ENEMY_DEFS, xOf } from '../src/enemies/defs.ts';
import { riffRing } from '../src/combat/props.ts';
import { isBossOrElite } from '../src/heroes/hellfire.ts';
import { inp, makeWhite, ofType, sfxIds, tc, tf } from './sim-helpers.ts';
import type { VRig } from './vecna-helpers.ts';
import { PARTY, VX, at, atticSpawns, bodyView, breakOrb, hammer, hold, orbView, setShare, steps, toFloat, until, vRig, attic } from './vecna-helpers.ts';

const cursedIds = (ev: SimEvent[]): string[] => ofType(ev, 'cursed').map((c) => c.hero);
const marked = (r: VRig): number => r.sim.view().actors.filter((a) => a.id === 'orb' && a.marked === true).length;
/** Makes the clock chime on the next tick and returns the heroes it cursed. */
const chime = (r: VRig): string[] => { r.v.chimeCd = 1; return cursedIds(steps(r, 1)); };

// ------------------------------------------------------------------ the tuning

test('a spawn\'s x lies over its def\'s for that spawn alone: chapter 5\'s { speedMul: 1.3, chimeEvery: 720 }', () => {
  const r = vRig({}, { x: { speedMul: 1.3, chimeEvery: 720 }, still: false });
  assert.equal(xOf(r.body).speedMul, 1.3);
  assert.equal(xOf(r.body).chimeEvery, 720);
  assert.equal(xOf(r.body).whipEvery, VX.whipEvery, 'the rest is the def\'s');
  assert.equal(ENEMY_DEFS.vecna.x.speedMul, 1, 'and the def is not touched');
  assert.equal(ENEMY_DEFS.vecna.x.chimeEvery, 900);
  const plain = vRig({}, { still: false });
  assert.equal(plain.body.tune, null);
  assert.equal(xOf(plain.body), ENEMY_DEFS.vecna.x);
  assert.equal(plain.v.chimeCd, 900);
  assert.equal(r.v.chimeCd, 720, 'the clock starts on its own interval');
  assert.equal(r.v.whipCd, Math.round(VX.whipEvery / 1.3));
  assert.equal(r.body.hpMax, plain.body.hpMax, 'HP is not a number the spawn changes');
  // Two Vecnas in one sim keep their own numbers.
  const { s } = makeWhite({ grid: attic(), start: { x: tc(10), y: tf(10) }, spawns: [
    { kind: 'enemy', id: 'a', type: 'vecna', tx: 4, ty: 4, group: 'a', x: { speedMul: 2 } },
    { kind: 'enemy', id: 'b', type: 'vecna', tx: 14, ty: 4, group: 'b' },
  ] });
  assert.deepEqual(s.enemies.map((e) => xOf(e).speedMul), [2, 1]);
});

test('speedMul scales his walk, whip and throw: x1.3 walks 30% faster, winds up in 18 frames and whips every 92', () => {
  const walk = (x?: Record<string, number>): number => { const r = vRig({}, { x }); const y0 = r.body.y; steps(r, 60); return r.body.y - y0; };
  const ratio = walk({ speedMul: 1.3 }) / walk();
  assert.ok(Math.abs(ratio - 1.3) < 0.03, `${ratio}`);
  const w = vRig({}, { x: { speedMul: 1.3 } });
  w.s.god = true;
  at(w, tc(10), tf(10));
  w.body.x = tc(10); w.body.y = tf(10) - 22;
  w.v.whipCd = 0;
  w.sim.step(inp());
  assert.equal(w.v.move, 'wind');
  assert.equal(w.v.t, 18, 'the wind-up');
  const starts: number[] = [];
  let was = 'walk';
  for (let f = 0; f < 800; f++) {
    at(w, tc(10), tf(10));
    w.sim.step(inp());
    if (w.v.move === 'wind' && was !== 'wind') starts.push(f);
    was = w.v.move;
  }
  const gaps = starts.slice(1).map((s, i) => s - (starts[i] as number));
  assert.ok(gaps.length >= 6 && gaps.every((g) => g >= 82 && g <= 102), gaps.join(' '));
  const t = vRig({}, { x: { speedMul: 1.3 } });
  toFloat(t);
  t.v.throwCd = 0;
  t.sim.step(inp());
  assert.equal(t.v.t, 18, 'the throw\'s wind-up');
  steps(t, 18);
  assert.equal(t.v.rocks[0]?.life, 31, 'and the rock is in the air for 40 / 1.3 frames');
});

test('chimeEvery sets the clock: chapter 5\'s 720 curses on frame 720, knocks the hero out 720 frames after, and Burn halves it to 360', () => {
  const r = vRig({}, { x: { speedMul: 1.3, chimeEvery: 720 }, still: false });
  r.s.god = false;
  r.v.whipCd = 99999;
  const first = until(r, () => r.s.house.curses.length > 0, 800);
  assert.equal(first.frames, 720);
  const ko = until(r, () => r.s.heroes.some((h) => h.ko), 900);
  assert.ok(ko.frames >= 718 && ko.frames <= 723, `${ko.frames} frames from the first chime to the KO`);
  assert.deepEqual(ofType(ko.ev, 'curseEnd').map((c) => c.how), ['ko']);
  const b = vRig({}, { x: { chimeEvery: 720 }, still: false });
  b.v.whipCd = 99999;
  setShare(b, 0.2);
  steps(b, 1);
  assert.ok(b.v.chimeCd >= 358 && b.v.chimeCd <= 360, `in Burn the next chime is at half the interval: ${b.v.chimeCd}`);
});

// ------------------------------------------------------------------ the chime

test('the clock chimes every 900 frames and curses a hero: the first chime at once, the mark on a standing orb, the chime pose', () => {
  const r = vRig({}, { still: false });
  r.v.whipCd = 99999;
  const quiet = steps(r, 899);
  assert.equal(ofType(quiet, 'cursed').length, 0);
  const ev = steps(r, 1);
  assert.equal(ofType(ev, 'cursed').length, 1);
  assert.ok(sfxIds(ev).includes('chime'), 'the first chime is at once');
  assert.ok(r.sim.view().fx.some((f) => f.kind === 'chime'), 'a ring comes off the attic\'s clock');
  assert.equal(r.s.house.curses[0]?.clock, 'clock_attic');
  assert.equal(marked(r), 1, 'one orb is red');
  assert.equal(bodyView(r)?.pose, 'curse');
  steps(r, VX.curseT + 2);
  assert.equal(bodyView(r)?.pose, undefined);
  // The next one is 900 frames on from the first, just as the curse knocks its hero out.
  steps(r, 898 - VX.curseT - 2);
  assert.equal(r.s.house.curses.length, 1);
  assert.equal(ofType(steps(r, 1), 'cursed').length, 0);
  assert.equal(ofType(steps(r, 1), 'cursed').length, 1, 'the second chime');
});

test('a curse counts its four chimes a third of the interval apart and knocks the hero out at the fourth, as the next one chimes', () => {
  const r = vRig({}, { tough: false });
  r.s.god = false;
  const who = chime(r);
  assert.equal(who.length, 1);
  const hudOf = (): (number | undefined)[] => r.sim.view().hud.party.map((p) => p.curse);
  const stage = (): number => (hudOf().find((c) => c !== undefined) as number | undefined) ?? 0;
  steps(r, 298);
  assert.equal(stage(), 1);
  steps(r, 2);
  assert.equal(stage(), 2, 'the second chime 300 frames on');
  steps(r, 300);
  assert.equal(stage(), 3);
  const ko = until(r, () => r.s.heroes.some((h) => h.ko), 400);
  assert.ok(ko.frames >= 298 && ko.frames <= 302, `${ko.frames}`);
  assert.deepEqual(ofType(ko.ev, 'heroKO').map((e) => e.hero), who);
});

test('in Burn the clock chimes every 450 frames, twice as fast, while Clock and Float keep 900', () => {
  const gaps = (share: number): number[] => {
    const r = vRig({}, { tough: false, still: false });
    r.v.whipCd = 99999; r.v.throwCd = 99999;
    setShare(r, share);
    r.s.god = true;
    const at: number[] = [];
    for (let f = 0; f < 3000; f++) {
      r.v.whipCd = 99999; r.v.throwCd = 99999;
      if (ofType(r.sim.step(inp()), 'cursed').length > 0) at.push(f);
    }
    return at.slice(1).map((v, i) => v - (at[i] as number));
  };
  // A swap after a curse takes a frame of hit-stop from the shockwave, so a gap can run a frame long.
  const near = (g: number, want: number): boolean => g >= want && g <= want + 3;
  const burn = gaps(0.2);
  assert.ok(burn.length >= 3 && burn.every((g) => near(g, 450)), burn.join(' '));
  assert.ok(gaps(0.5).every((g) => near(g, 900)), 'Float');
  assert.ok(gaps(0.9).every((g) => near(g, 900)), 'Clock');
});

test('in Burn a curse counts twice as fast: the chimes are 150 frames apart', () => {
  const r = vRig({}, { tough: false });
  setShare(r, 0.2);
  steps(r, 2);
  hold(r);
  chime(r);
  hold(r);
  const ko = until(r, () => r.s.heroes.some((h) => h.ko), 600);
  assert.ok(ko.frames >= 445 && ko.frames <= 452, `${ko.frames} frames from the first chime`);
});

test('the clock curses a random hero who is standing and not cursed, and never the last one standing', () => {
  const seen = new Set<string>();
  for (let seed = 1; seed <= 40; seed++) {
    const r = vRig({ seed });
    const [who] = chime(r);
    assert.ok(who);
    seen.add(who as string);
  }
  assert.ok(seen.size >= 3, `only ${[...seen].join(', ')}`);
  assert.ok([...seen].some((id) => id !== 'mike'), 'not always the hero who is up');
  // Each chime takes someone new, until one is left.
  const r = vRig();
  const hit = [chime(r), chime(r), chime(r), chime(r)].map((c) => c[0]);
  assert.equal(hit.filter((h) => h !== undefined).length, 3, 'three of the four, never the last');
  assert.equal(new Set(hit.filter((h) => h)).size, 3, 'all different');
  assert.equal(r.s.heroes.filter((h) => !h.ko).length - r.s.house.curses.length, 1);
  // A hero who is down is not a choice either, and two left standing is one curse.
  const down = vRig({ seed: 9 });
  for (const h of down.s.heroes.slice(0, 2)) { h.ko = true; h.hp = 0; }
  const wasDown = down.s.heroes.slice(0, 2).map((h) => h.id);
  const picked = chime(down);
  assert.equal(picked.length, 1);
  assert.ok(!wasDown.includes(picked[0] as never));
  assert.deepEqual(chime(down), [], 'and with one standing, nothing');
  const lone = vRig({ party: [{ id: 'mike', level: 8 }] });
  assert.deepEqual(chime(lone), [], 'a hero alone is never cursed');
});

test('the chime does nothing while the Walkman is on, and with no orb standing to mark', () => {
  const w = vRig();
  w.s.house.walkOn = 100;
  assert.deepEqual(chime(w), []);
  assert.equal(w.v.chimeCd, 900, 'and the clock counts on');
  const o = vRig();
  for (let i = 1; i <= 4; i++) breakOrb(o, i);
  assert.deepEqual(chime(o), [], 'all four broken');
  const three = vRig();
  for (let i = 1; i <= 3; i++) breakOrb(three, i);
  assert.equal(chime(three).length, 1);
  assert.equal(orbView(three, 4)?.marked, true, 'it marks the one that stands');
  assert.ok(three.s.house.curses.every((c) => c.orb === 'orb4'));
});

test('the marks: two curses at once mark two orbs, and the hero who is up is never left cursed (the party swaps away)', () => {
  const r = vRig();
  chime(r);
  chime(r);
  assert.equal(marked(r), 2);
  assert.equal(r.s.house.curses.length, 2);
  assert.notEqual(r.s.house.curses[0]?.orb, r.s.house.curses[1]?.orb);
  const up = r.s.heroes[r.s.active];
  assert.ok(up && !r.s.house.curses.some((c) => c.hero === up), 'whoever is up is free to act');
});

// ------------------------------------------------------------------ the ways out

test('breaking the marked orb lifts its curse: curseEnd orb, the hero floats back, the mark goes and nobody is knocked out', () => {
  const r = vRig({}, { tough: false });
  const [who] = chime(r);
  hold(r);
  steps(r, 10);
  const m = r.orbs.find((o) => r.s.house.curses.some((c) => c.orb === o.id)) as typeof r.orbs[number];
  assert.ok(m);
  assert.equal(orbView(r, r.orbs.indexOf(m) + 1)?.marked, true);
  hammer(r, m, 60);
  const ev = steps(r, 2);
  assert.deepEqual(ofType(ev, 'curseEnd'), [{ t: 'curseEnd', hero: who, how: 'orb' }]);
  assert.equal(r.s.house.curses.length, 0);
  assert.equal(marked(r), 0);
  assert.equal(r.sim.view().hud.party.find((p) => p.id === who)?.curse, undefined);
  steps(r, 2000);
  assert.ok(r.s.heroes.every((h) => !h.ko), 'nobody falls');
  assert.equal(r.s.heroes.find((h) => h.id === who)?.z, 0, 'back on the floor');
});

test('breaking an orb the clock did not mark leaves the curse counting', () => {
  const r = vRig({}, { tough: false });
  chime(r);
  const other = r.orbs.find((o) => !r.s.house.curses.some((c) => c.orb === o.id)) as typeof r.orbs[number];
  hammer(r, other, 60);
  const ev = steps(r, 2);
  assert.equal(ofType(ev, 'curseEnd').length, 0);
  assert.equal(r.s.house.curses.length, 1);
  assert.equal(marked(r), 1);
});

test('the Walkman also ends a curse, and its mark with it', () => {
  // A seed where the clock does not take Max: she is the one who plays it.
  let r = vRig();
  let who: string | undefined;
  for (let seed = 1; seed < 30 && (who === undefined || who === 'max'); seed++) {
    r = vRig({ party: [{ id: 'mike', level: 8 }, { id: 'max', level: 8 }, { id: 'dustin', level: 8 }], walkman: true, seed });
    who = chime(r)[0];
  }
  assert.ok(who && who !== 'max');
  assert.equal(marked(r), 1);
  // Away from Max and back by a quick swap (a forced swap does not play it).
  const maxAt = r.s.heroes.findIndex((h) => h.id === 'max');
  const other = r.s.heroes.findIndex((h, i) => i !== maxAt && h.id !== who);
  const ev = [...r.sim.step(inp({ swapTo: other })), ...steps(r, 12), ...r.sim.step(inp({ swapTo: maxAt })), ...steps(r, 2)];
  assert.deepEqual(ofType(ev, 'curseEnd').map((c) => c.how), ['walkman']);
  assert.equal(marked(r), 0);
});

test('the attic\'s clock is never broken while he lives, and chimes again and again', () => {
  const r = vRig();
  const clock = r.s.props.find((p) => p.id === 'clock_attic');
  assert.ok(clock);
  riffRing(r.s, clock.x + 8, clock.y + 16, 60);
  assert.equal(clock.state, 'closed');
  for (let i = 0; i < 2; i++) chime(r);
  assert.equal(r.s.house.curses.length, 2, 'two chimes from the one clock');
  r.body.hp = 0;
  steps(r, 40);
  riffRing(r.s, clock.x + 8, clock.y + 16, 60);
  assert.equal(clock.state, 'open', 'once he is gone it breaks like any clock');
});

// ------------------------------------------------------------------ the heal

test('each standing orb heals him half a percent of his max HP every 120 frames, and a broken one does not', () => {
  const r = vRig();
  r.body.hp = 1100;
  r.v.healCd = 120;
  steps(r, 120);
  const gain = Math.round(r.body.hpMax * VX.heal * 4);
  assert.equal(r.body.hp, 1100 + gain, 'four orbs');
  assert.equal(r.v.healCd, 120);
  assert.ok(r.s.floaters.some((f) => f.text === `+${gain}`));
  breakOrb(r, 1);
  breakOrb(r, 2);
  r.body.hp = 1100;
  steps(r, 120);
  assert.equal(r.body.hp, 1100 + Math.round(r.body.hpMax * VX.heal * 2), 'two');
  breakOrb(r, 3);
  breakOrb(r, 4);
  r.body.hp = 1100;
  steps(r, 240);
  assert.equal(r.body.hp, 1100, 'none');
  const cap = vRig();
  cap.body.hp = cap.body.hpMax - 5;
  cap.v.healCd = 1;
  steps(cap, 1);
  assert.equal(cap.body.hp, cap.body.hpMax, 'never over the top');
});

test('the heal goes on in Float and Burn', () => {
  for (const share of [0.5, 0.2]) {
    const r = vRig();
    setShare(r, share);
    steps(r, 40);
    const hp = r.body.hp;
    r.v.healCd = 2;
    steps(r, 2);
    assert.ok(r.body.hp > hp, `at ${share}`);
  }
});

// ------------------------------------------------------------------ the orbs

test('an orb is rooted and harmless, and anyone\'s hit lands on it without shoving it', () => {
  const r = vRig({}, { still: false });
  const o = r.orbs[0] as typeof r.body;
  const { x, y } = o;
  assert.equal(o.atk, 0);
  const dmg = hammer(r, o, 1);
  assert.ok(dmg > 0 && o.hp === o.hpMax - dmg);
  at(r, o.x + 10, o.y);
  steps(r, 400);
  assert.equal(o.x, x);
  assert.equal(o.y, y);
  assert.equal(r.sim.view().actors.filter((a) => a.id === 'orb').length, 4);
  assert.equal(isBossOrElite(o), false, 'and Eddie\'s mark is not an orb\'s mark');
});

test('an orb breaks at 0 HP and is not killed: a stalk (pose severed) that sounds, can\'t be hit, and heals nothing', () => {
  const r = vRig();
  const o = r.orbs[0] as typeof r.body;
  o.hp = 1;
  const ev: SimEvent[] = [];
  hammer(r, o, 5);
  ev.push(...steps(r, 40));
  assert.ok(sfxIds(ev).includes('orb'));
  assert.equal(ofType(ev, 'kill').length, 0, 'no kill');
  assert.equal(o.dead, false);
  assert.equal(o.hp, 0);
  assert.equal(orbView(r, 1)?.pose, 'severed');
  assert.equal(orbView(r, 1)?.bar, null);
  assert.equal(hammer(r, o, 60), 0, 'a stalk takes no hit');
  assert.equal(ofType(steps(r, 100), 'kill').length, 0);
  assert.equal(r.sim.enemiesAlive('boss'), 5, 'it still counts as standing in the group');
});

test('an orb a burn takes to 0 HP breaks the same way', () => {
  const r = vRig();
  const o = r.orbs[1] as typeof r.body;
  o.hp = 3;
  o.stat.burn = 120; o.stat.burnTick = 1; o.stat.burnDmg = 9;
  steps(r, 2);
  assert.equal(o.orb?.broken, true);
  assert.equal(o.dead, false);
});

test('a broken orb regrows at full HP 1200 frames later, and a spawn\'s x can say otherwise', () => {
  const r = vRig();
  breakOrb(r, 1);
  steps(r, 1198);
  assert.equal(orbView(r, 1)?.pose, 'severed');
  steps(r, 2);
  const o = r.orbs[0] as typeof r.body;
  assert.equal(o.orb?.broken, false);
  assert.equal(o.hp, o.hpMax);
  assert.equal(orbView(r, 1)?.pose, undefined);
  assert.ok(hammer(r, o, 1) > 0, 'and it can be hit again');
  const quick = vRig({ spawns: atticSpawns(true).map((sp) => (sp.kind === 'enemy' && sp.id === 'orb2' ? { ...sp, x: { regrow: 300 } } : sp)) });
  breakOrb(quick, 2);
  breakOrb(quick, 3);
  steps(quick, 300);
  assert.equal(quick.orbs[1]?.orb?.broken, false, 'orb2 on its own count');
  assert.equal(quick.orbs[2]?.orb?.broken, true, 'orb3 on the def\'s');
});

test('before he wakes nothing of the fight runs: no chime, no heal, nobody in the view', () => {
  const { sim, s } = makeWhite({ grid: attic(), party: PARTY, spawns: atticSpawns(true), start: { x: tc(10), y: tf(10) }, enemyMult: 1 });
  const ev = steps({ sim }, 1500);
  assert.equal(ofType(ev, 'cursed').length, 0);
  assert.equal(sim.view().actors.filter((a) => a.id === 'vecna' || a.id === 'orb').length, 0);
  sim.spawnGroup('boss');
  assert.equal(sim.view().actors.filter((a) => a.id === 'vecna').length, 1);
  assert.equal(sim.view().actors.filter((a) => a.id === 'orb').length, 4);
  assert.equal(s.enemies.find((e) => e.kind === 'vecna')?.vecna?.chimeCd, 900, 'and the clock starts then');
});
