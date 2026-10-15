// Max and Steve (docs/level-5.md): the Board and the Skate dash over gaps, the nail bat and the crack, Babysit, both talents,
// and the bot crossing a gap at a `dash` waypoint.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { Grid, HeroId, SimEvent, SimSpawn } from '../src/core/types.ts';
import { HERO_DEFS, critChance } from '../src/heroes/index.ts';
import { createBot } from '../src/combat/bot.ts';
import { hurtHero } from '../src/combat/damage.ts';
import { rectsOverlap, footBlocked } from '../src/combat/space.ts';
import { arena, inp, makeWhite, ofType, press, rat, run, sfxIds, tc, tf } from './sim-helpers.ts';

/** A hall two tiles tall (rows 3 and 4) running east, walled with pines, 24 tiles long. */
function hall(marks: Record<string, string> = {}): Grid {
  const m: Record<string, string> = { ...marks };
  for (let x = 1; x < 23; x++) for (const y of [1, 2, 5, 6, 7]) m[`${x},${y}`] ??= 'T';
  return arena(24, 9, m);
}
/** The same hall turned to run south: columns 3 and 4. */
function vhall(): Grid {
  const m: Record<string, string> = {};
  for (let y = 1; y < 23; y++) for (const x of [1, 2, 5, 6, 7]) m[`${x},${y}`] = 'T';
  return arena(9, 24, m);
}
/** A gap across the hall, one tile deep: x 160 to 176. */
const GAP: SimSpawn = { kind: 'prop', id: 'gap1', prop: 'gap', tx: 10, ty: 3, w: 16, h: 32 };
/** The gap across the south-running hall: y 160 to 176. */
const VGAP: SimSpawn = { kind: 'prop', id: 'gap1', prop: 'gap', tx: 3, ty: 10, w: 32, h: 16 };
const HALL_Y = 68;
const overGap = (x: number, y: number): boolean => rectsOverlap(x - 5, y - 8, 10, 8, 160, 48, 16, 32);
const east = { mx: 1, specialPressed: true };

/** Max in the hall with Mike behind her, at x0, dashing east. Runs the dash out and the 20 frames after. */
function dashEast(x0: number, spawns: SimSpawn[] = [GAP], grid = hall()) {
  const w = makeWhite({ grid, party: [{ id: 'max' }, { id: 'mike' }], start: { x: x0, y: HALL_Y }, spawns });
  const events = [...w.sim.step(inp(east)), ...run(w.sim, 40)];
  return { ...w, events };
}

test('Board: two hits, the second at 1.2 times the power, and a late second press starts the chain again', () => {
  const first: number[] = [], second: number[] = [];
  for (let seed = 1; seed <= 24; seed++) {
    const { sim, s } = makeWhite({ party: [{ id: 'max', level: 6 }], god: true, seed, start: { x: tc(5), y: tf(8) }, spawns: [rat('r', 6, 8)] });
    (s.enemies[0] as { hp: number }).hp = 9999;
    const h = s.heroes[0]!;
    const hits: number[] = [];
    const take = (ev: SimEvent[]): void => { for (const e of ofType(ev, 'hit')) if (e.onEnemy && !e.crit) hits.push(e.dmg); };
    take(press(sim, { attackPressed: true, mx: 0.2 }, 12));
    assert.equal(h.combo, 1, 'one hit in');
    take(press(sim, { attackPressed: true, mx: 0.2 }, 12));
    assert.equal(h.combo, 0, 'two hits and the chain is done');
    if (hits.length === 2) { first.push(hits[0]!); second.push(hits[1]!); }
    // Press once, wait out the window (cooldown plus 14 frames), press again: that is a first hit again.
    run(sim, 40);
    press(sim, { attackPressed: true }, 12);
    run(sim, 40);
    press(sim, { attackPressed: true }, 12);
    assert.equal(h.combo, 1, 'a late second press is the start of a new chain');
  }
  const mean = (a: number[]): number => a.reduce((x, y) => x + y, 0) / a.length;
  assert.ok(first.length >= 12, `${first.length} clean pairs`);
  const ratio = mean(second) / mean(first);
  assert.ok(ratio > 1.1 && ratio < 1.32, `second hit is ${ratio.toFixed(2)} times the first`);
});

test('Skate dash: a roll of 72 px along her aim, MP 4, the skate sound, a trail and the dash anim, and the stick cannot steer it', () => {
  const { sim, s } = makeWhite({ grid: hall(), party: [{ id: 'max' }], start: { x: 40, y: HALL_Y } });
  const h = s.heroes[0]!;
  const mp = h.mp;
  const ev = sim.step(inp(east));
  assert.ok(sfxIds(ev).includes('skate'));
  assert.ok(Math.abs(mp - h.mp - HERO_DEFS.max.special.mp) < 0.05, 'costs 4 MP');
  const trail = sim.view().fx.find((f) => f.kind === 'trail');
  assert.ok(trail && trail.w === 72 && trail.angle === 0, 'the trail: its length and heading');
  const anims: string[] = [sim.view().actors.find((a) => a.id === 'max')!.anim];
  for (let i = 0; i < 20; i++) { sim.step(inp(i < 15 ? { my: 1 } : {})); anims.push(sim.view().actors.find((a) => a.id === 'max')!.anim); }
  assert.equal(anims.slice(0, 16).every((a) => a === 'dash'), true, 'dash anim for 16 frames');
  assert.notEqual(anims[16], 'dash');
  assert.ok(Math.abs(h.x - 112) < 0.5 && Math.abs(h.y - HALL_Y) < 0.5, `straight along the aim, ended at ${h.x}, ${h.y}`);
  // With the roll over she is a normal hero again and the stick steers.
  run(sim, 10, inp({ my: 1 }));
  assert.ok(h.y > HALL_Y + 4);
});

test('Skate dash: it stops early against a wall and never ends inside one', () => {
  const { sim, s } = makeWhite({ grid: hall(), party: [{ id: 'max' }], start: { x: 330, y: HALL_Y } });
  sim.step(inp(east));
  const trail = sim.view().fx.find((f) => f.kind === 'trail');
  run(sim, 30);
  const h = s.heroes[0]!;
  assert.ok(h.x > 355 && h.x <= 363.01, `stopped at the wall, at ${h.x}`);
  assert.equal(footBlocked(s, h.x, h.y), false);
  assert.ok(trail && trail.w < 40, `the trail is only as long as the roll (${trail?.w})`);
});

test('Skate dash: it hits each enemy it passes through once, throws it to the side, and leaves one off the path alone', () => {
  const spawns = [rat('above', 7, 5), rat('below', 8, 5), rat('late', 9, 5), rat('off', 8, 8)];
  const { sim, s } = makeWhite({ grid: arena(24, 16), party: [{ id: 'max', level: 4 }], god: true, start: { x: tc(4), y: tf(5) }, spawns });
  for (const e of s.enemies) e.hp = 9999;
  const [above, below] = [s.enemies[0]!, s.enemies[1]!];
  above.y -= 3; below.y += 4;
  const off = s.enemies[3]!;
  off.y = tf(5) + 40;
  let hits = 0, aboveVy = 0, belowVy = 0;
  for (let i = 0; i < 24; i++) {
    const ev = sim.step(i === 0 ? inp(east) : inp());
    hits += ofType(ev, 'hit').filter((e) => e.onEnemy).length;
    aboveVy = Math.min(aboveVy, above.vy); belowVy = Math.max(belowVy, below.vy);
  }
  assert.equal(hits, 3, 'one hit each for the three on the path');
  assert.equal(off.hp, 9999, 'the one off the path was not touched');
  assert.ok(aboveVy < -0.5 && belowVy > 0.5, `thrown to the sides: ${aboveVy.toFixed(2)} and ${belowVy.toFixed(2)}`);
});

test('Skate dash: invulnerable for the roll and 6 frames after, and not a frame more', () => {
  const { sim, s } = makeWhite({ grid: hall(), party: [{ id: 'max' }, { id: 'mike' }], start: { x: 40, y: HALL_Y } });
  const h = s.heroes[0]!;
  sim.step(inp(east));
  assert.equal(h.invuln, 16 + 6);
  assert.equal(hurtHero(s, h, 0, 0, 1, 50), 0, 'a hit during the roll does nothing');
  // After step n the counter reads 22 - n. The enemy phase of the next step sees it one lower, and it is the step after the 22nd that can hurt.
  for (let i = 1; i <= 21; i++) {
    sim.step(inp());
    assert.ok(h.invuln > 0, `step ${i}`);
    assert.equal(hurtHero(s, h, 0, 0, 1, 50), 0);
  }
  sim.step(inp());
  assert.equal(h.invuln, 0);
  assert.ok(hurtHero(s, h, 0, 0, 1, 50) > 0, 'vulnerable again');
});

test('gap: always solid to walking, for every hero, and to enemies', () => {
  for (const id of ['mike', 'max'] as HeroId[]) {
    const w = makeWhite({ grid: hall(), party: [{ id }], start: { x: 120, y: HALL_Y }, spawns: [GAP] });
    const ev = run(w.sim, 220, inp({ mx: 1 }));
    assert.ok(w.sim.heroPos().x <= 155.01, `${id} stopped at ${w.sim.heroPos().x}`);
    assert.equal(ofType(ev, 'propCleared').length, 0);
    assert.equal(w.s.props[0]?.state, 'closed');
  }
  // A rat on the far side sees her across the drop and runs at her. It stays on its side.
  const w = makeWhite({ grid: hall(), party: [{ id: 'mike' }], god: true, start: { x: 120, y: HALL_Y }, spawns: [GAP, rat('r', 13, 3)] });
  let nearest = 999;
  for (let i = 0; i < 300; i++) { w.sim.step(inp()); nearest = Math.min(nearest, w.s.enemies[0]!.x); }
  assert.ok(nearest >= 180.9, `the rat came no closer than ${nearest}`);
});

test('gap: the dash crosses it from every start, and her box is never left inside it', () => {
  let crossed = 0;
  for (let x0 = 20; x0 <= 155; x0++) {
    const { s, events } = dashEast(x0);
    const h = s.heroes[0]!;
    assert.equal(overGap(h.x, h.y), false, `from ${x0} she ended at ${h.x}, over the gap`);
    assert.equal(footBlocked(s, h.x, h.y), false);
    const cleared = ofType(events, 'propCleared');
    if (h.x > 160) {
      crossed++;
      assert.deepEqual(cleared, [{ t: 'propCleared', propId: 'gap1' }], `from ${x0}: once`);
      assert.equal(s.props[0]?.state, 'open');
    } else {
      assert.equal(cleared.length, 0, `from ${x0}: she did not cross`);
      assert.equal(s.props[0]?.state, 'closed');
    }
    // A start close enough to carry on and clear it crosses. One that would end more than 16 px short of clear stops before it.
    if (x0 >= 93) assert.ok(h.x >= 181, `from ${x0} she ended at ${h.x}`);
    if (x0 <= 82) assert.ok(h.x < 160 && Math.abs(h.x - (x0 + 72)) < 0.01, `from ${x0} she ended at ${h.x}`);
  }
  assert.ok(crossed > 40);
});

test('gap: a roll that would end over it carries on to clear it, at most 16 px more', () => {
  // From x 100 the full roll ends at 172, over the gap. Carrying on 9 px clears it (box edge past 176).
  const a = dashEast(100).s.heroes[0]!;
  assert.ok(a.x > 180.9 && a.x <= 181.1, `ended at ${a.x}`);
  // From x 93 it takes the whole 16 px.
  const b = dashEast(93).s.heroes[0]!;
  assert.ok(b.x > 180.9 && b.x <= 181.1, `ended at ${b.x}`);
  // From x 88 it would take 21, so she stops short on the near side.
  const c = dashEast(88).s.heroes[0]!;
  assert.ok(c.x <= 155.01 && c.x > 150, `ended at ${c.x}`);
});

test('gap: crossing works west, and down and up a hall that runs south, and on a diagonal never ends inside', () => {
  const west = makeWhite({ grid: hall(), party: [{ id: 'max' }], start: { x: 230, y: HALL_Y }, spawns: [GAP] });
  const ev = [...west.sim.step(inp({ mx: -1, specialPressed: true })), ...run(west.sim, 40)];
  assert.ok(west.sim.heroPos().x < 160 - 5 + 0.01 && ofType(ev, 'propCleared').length === 1);
  for (const [y0, dir] of [[110, 1], [240, -1]] as const) {
    const w = makeWhite({ grid: vhall(), party: [{ id: 'max' }], start: { x: 60, y: y0 }, spawns: [VGAP] });
    const out = [...w.sim.step(inp({ my: dir, specialPressed: true })), ...run(w.sim, 40)];
    const p = w.sim.heroPos();
    assert.equal(rectsOverlap(p.x - 5, p.y - 8, 10, 8, 48, 160, 32, 16), false);
    assert.equal(ofType(out, 'propCleared').length, 1, `from y ${y0}`);
  }
  // Open ground, a 32 by 16 gap in the middle, every start and all eight ways.
  const spawn: SimSpawn = { kind: 'prop', id: 'gap1', prop: 'gap', tx: 10, ty: 8, w: 32, h: 16 };
  for (let n = 0; n < 160; n++) {
    const x = 120 + (n * 37) % 130, y = 90 + (n * 53) % 110;
    const a = (n % 8) * (Math.PI / 4);
    const w = makeWhite({ party: [{ id: 'max' }], start: { x, y }, spawns: [spawn] });
    if (footBlocked(w.s, x, y)) continue;
    run(w.sim, 1, inp({ mx: Math.cos(a), my: Math.sin(a), specialPressed: true }));
    run(w.sim, 40);
    const p = w.sim.heroPos();
    assert.equal(rectsOverlap(p.x - 5, p.y - 8, 10, 8, 160, 128, 32, 16), false, `from ${x},${y} at ${n % 8}/8`);
    assert.equal(footBlocked(w.s, p.x, p.y), false);
  }
});

test('gap: propCleared is once. It stays solid after, and walking over it is still no way across', () => {
  const { sim, s } = makeWhite({ grid: hall(), party: [{ id: 'max' }, { id: 'mike' }], start: { x: 120, y: HALL_Y }, spawns: [GAP] });
  const first = [...sim.step(inp(east)), ...run(sim, 30)];
  assert.equal(ofType(first, 'propCleared').length, 1);
  assert.equal(s.props[0]?.state, 'open');
  assert.equal(s.props[0]?.solid, true);
  // Back the other way: a second crossing says nothing.
  const back = [...sim.step(inp({ mx: -1, specialPressed: true })), ...run(sim, 40)];
  assert.equal(ofType(back, 'propCleared').length, 0, 'not again');
  assert.ok(sim.heroPos().x < 155.01);
  // She is back where she began. Mike, taking the lead, walks into it and goes nowhere.
  sim.step(inp({ swapTo: 1 }));
  run(sim, 120, inp({ mx: 1 }));
  assert.ok(sim.heroPos().x <= 155.01, `Mike at ${sim.heroPos().x}`);
  assert.equal(s.props[0]?.solid, true);
});

test('gap: the party is across once she is, and a swap waits out the roll', () => {
  const { sim, s } = makeWhite({ grid: hall(), party: [{ id: 'max' }, { id: 'mike' }], start: { x: 120, y: HALL_Y }, spawns: [GAP] });
  sim.step(inp(east));
  // A swap pressed in the middle of the roll is held, not dropped, and is made once she has landed.
  run(sim, 3, inp({ swapTo: 1 }));
  assert.equal(s.active, 0);
  run(sim, 20);
  assert.equal(s.active, 1, 'tagged in after the landing');
  assert.ok(s.heroes[1]!.x > 180 && !overGap(s.heroes[1]!.x, s.heroes[1]!.y));
  run(sim, 120);
  assert.ok(s.heroes[0]!.x > 176, 'the one who trailed her is across too');
});

test('gap: a blocked far side leaves her on the near side, never inside', () => {
  // A pine right behind the gap: nowhere to land.
  for (const x0 of [100, 120, 140, 150]) {
    const { s, events } = dashEast(x0, [GAP], hall({ '11,3': 'T', '11,4': 'T' }));
    const h = s.heroes[0]!;
    assert.ok(h.x <= 155.01, `from ${x0} she ended at ${h.x}`);
    assert.equal(overGap(h.x, h.y), false);
    assert.equal(ofType(events, 'propCleared').length, 0, 'she did not cross, so the puzzle is not solved');
    assert.equal(s.props[0]?.state, 'closed');
  }
  // One tile of floor behind it is enough to land on.
  const { s, events } = dashEast(120, [GAP], hall({ '12,3': 'T', '12,4': 'T' }));
  assert.ok(s.heroes[0]!.x > 180.9 && s.heroes[0]!.x <= 187.01, `landed at ${s.heroes[0]!.x}`);
  assert.equal(ofType(events, 'propCleared').length, 1);
});

test('gap: a hero without the dash who pushes at it for 20 frames, swings or fires at it is a try; Max is not', () => {
  const pokes = (ev: SimEvent[]): { propId: string; hero: HeroId }[] => ofType(ev, 'poked').map((e) => ({ propId: e.propId, hero: e.hero }));
  const mike = makeWhite({ grid: hall(), party: [{ id: 'mike' }], start: { x: 125, y: HALL_Y }, spawns: [GAP] });
  const leaning = run(mike.sim, 70, inp({ mx: 1 }));
  assert.ok(pokes(leaning).length >= 1 && pokes(leaning).every((p) => p.propId === 'gap1' && p.hero === 'mike'));
  const swing = makeWhite({ grid: hall(), party: [{ id: 'mike' }], start: { x: 140, y: HALL_Y }, spawns: [GAP] });
  assert.deepEqual(pokes(press(swing.sim, { mx: 0.2, attackPressed: true }, 3)), [{ propId: 'gap1', hero: 'mike' }]);
  const shot = makeWhite({ grid: hall(), party: [{ id: 'lucas' }], start: { x: 100, y: HALL_Y }, spawns: [GAP] });
  assert.deepEqual(pokes(press(shot.sim, { mx: 0.2, attackPressed: true }, 3)), [{ propId: 'gap1', hero: 'lucas' }]);
  const max = makeWhite({ grid: hall(), party: [{ id: 'max' }], start: { x: 125, y: HALL_Y }, spawns: [GAP] });
  assert.deepEqual(pokes(run(max.sim, 90, inp({ mx: 1 }))), [], 'pushing');
  assert.deepEqual(pokes(press(max.sim, { mx: 0.2, attackPressed: true }, 3)), [], 'swinging');
  // Once it is crossed nobody is trying anything.
  press(max.sim, east, 40);
  assert.deepEqual(pokes(run(mike.sim, 90, inp({ mx: 1 }))).length > 0, true);
  const open = makeWhite({ grid: hall(), party: [{ id: 'mike' }], start: { x: 125, y: HALL_Y }, spawns: [GAP], openProps: ['gap1'] });
  assert.deepEqual(pokes(run(open.sim, 90, inp({ mx: 1 }))), [], 'an open gap is solved');
  assert.ok(open.sim.heroPos().x <= 155.01, 'and still a drop');
});

test('gap: a retry that has it open starts that way, and openProp opens it and keeps it solid', () => {
  const retry = makeWhite({ grid: hall(), party: [{ id: 'mike' }], start: { x: 100, y: HALL_Y }, spawns: [GAP], openProps: ['gap1'] });
  assert.equal(retry.s.props[0]?.state, 'open');
  assert.equal(retry.s.props[0]?.solid, true);
  const w = makeWhite({ grid: hall(), party: [{ id: 'mike' }], start: { x: 100, y: HALL_Y }, spawns: [GAP] });
  w.sim.openProp('gap1');
  assert.equal(ofType(w.sim.step(inp()), 'propCleared').length, 1);
  assert.equal(w.s.props[0]?.state, 'open');
  assert.equal(w.s.props[0]?.solid, true);
});

const CRACK: SimSpawn = { kind: 'prop', id: 'crack1', prop: 'crack', tx: 10, ty: 6, w: 32, h: 16, hitBy: 'smash' };
const southOfCrack = { x: 176, y: 132 };
const swingUp = { my: -0.2, attackPressed: true };

test('crack: any swing of the nail bat that reaches it breaks it, with a crack, dust, propCleared, open and walkable', () => {
  for (const combo of [0, 1, 2]) {
    const { sim, s } = makeWhite({ party: [{ id: 'steve' }], start: southOfCrack, spawns: [CRACK] });
    s.heroes[0]!.combo = combo;
    s.heroes[0]!.comboT = 30;
    const ev = press(sim, swingUp, 12);
    assert.ok(sfxIds(ev).includes('crack'), `swing ${combo + 1}`);
    assert.deepEqual(ofType(ev, 'propCleared'), [{ t: 'propCleared', propId: 'crack1' }]);
    assert.equal(ofType(ev, 'poked').length, 0, 'it is the right hero');
    assert.equal(s.props[0]?.state, 'open');
    assert.equal(s.props[0]?.solid, false);
    assert.ok(sim.view().fx.some((f) => f.kind === 'dust'));
    run(sim, 80, inp({ my: -1 }));
    assert.ok(sim.heroPos().y < 100, 'walks through where it was');
  }
  // A swing that cannot reach it does nothing.
  const far = makeWhite({ party: [{ id: 'steve' }], start: { x: 176, y: 190 }, spawns: [CRACK] });
  press(far.sim, swingUp, 12);
  assert.equal(far.s.props[0]?.state, 'closed');
});

test('crack: every other hero swinging, firing or pushing at it is a try, and it holds', () => {
  for (const id of ['mike', 'dustin', 'lucas', 'eleven', 'will', 'max'] as HeroId[]) {
    const { sim, s } = makeWhite({ party: [{ id, level: 4 }], start: southOfCrack, spawns: [CRACK] });
    const ev = [...press(sim, swingUp, 20), ...run(sim, 100, inp({ my: -1 }))];
    const pokes = ofType(ev, 'poked');
    assert.ok(pokes.length >= 1 && pokes.every((p) => p.propId === 'crack1' && p.hero === id), id);
    assert.equal(ofType(ev, 'propCleared').length, 0, id);
    assert.equal(s.props[0]?.state, 'closed', id);
    assert.equal(s.props[0]?.solid, true, id);
  }
});

test('Nail bat: a three-hit chain, the third heavy and throwing', () => {
  const dmg: number[][] = [[], [], []];
  const push: number[] = [];
  for (let seed = 1; seed <= 30; seed++) {
    const { sim, s } = makeWhite({ party: [{ id: 'steve', level: 6 }], god: true, seed, start: { x: tc(5), y: tf(8) }, spawns: [rat('r', 6, 8)] });
    const rat0 = s.enemies[0]!;
    rat0.hp = 9999;
    const h = s.heroes[0]!;
    for (let k = 0; k < 3; k++) {
      rat0.x = tc(6); rat0.y = tf(8); rat0.vx = 0; rat0.vy = 0;
      let fastest = 0;
      const ev: SimEvent[] = [];
      for (let i = 0; i < 14; i++) { ev.push(...sim.step(inp(i === 0 ? { attackPressed: true, mx: 0.2 } : {}))); fastest = Math.max(fastest, rat0.vx); }
      const hit = ofType(ev, 'hit').find((e) => e.onEnemy && !e.crit);
      if (hit) dmg[k]!.push(hit.dmg);
      if (k === 2) push.push(fastest);
      if (k < 2) assert.equal(h.combo, k + 1);
    }
    assert.equal(h.combo, 0);
  }
  const mean = (a: number[]): number => a.reduce((x, y) => x + y, 0) / a.length;
  assert.ok(Math.abs(mean(dmg[0]!) / mean(dmg[1]!) - 1) < 0.1, 'the first two are alike');
  const ratio = mean(dmg[2]!) / mean(dmg[0]!);
  assert.ok(ratio > 1.25 && ratio < 1.5, `the third is ${ratio.toFixed(2)} times the first`);
  assert.ok(mean(push) > 1.5, `the third throws it (${mean(push).toFixed(2)})`);
});

test('Babysit: costs 6 MP, taunts every enemy within 72 px for 3 s, and the pulse is a taunt fx and sound', () => {
  const spawns = [rat('near', 7, 8), rat('edge', 9, 8), rat('far', 14, 8)];
  const { sim, s } = makeWhite({ party: [{ id: 'steve', level: 2 }], god: true, start: { x: tc(5), y: tf(8) }, spawns });
  for (const e of s.enemies) e.hp = 9999;
  const mp = s.heroes[0]!.mp;
  const ev = press(sim, { specialPressed: true }, 8);
  assert.ok(sfxIds(ev).includes('taunt'));
  assert.ok(Math.abs(mp - s.heroes[0]!.mp - 6) < 0.2, 'six MP');
  const fx = sim.view().fx.find((f) => f.kind === 'taunt');
  assert.ok(fx && fx.w === 144, 'a pulse 72 px out');
  const [near, edge, far] = s.enemies as [typeof s.enemies[0], typeof s.enemies[0], typeof s.enemies[0]];
  assert.ok(near.taunt > 160 && near.taunt <= 180, `near: ${near.taunt}`);
  assert.ok(edge.taunt > 160 && edge.taunt <= 180, `at 64 px: ${edge.taunt}`);
  assert.equal(far.taunt, 0, 'out of reach');
  assert.equal(near.aware, true);
  run(sim, 185);
  assert.equal(near.taunt, 0, 'it wears off after three seconds');
  assert.ok(s.babysit > 100 && s.babysit < 130, `the guard has a little over two seconds left (${s.babysit})`);
  run(sim, 130);
  assert.equal(s.babysit, 0);
});

test('Babysit: he takes 40 percent less damage for 5 seconds, and the whole party has 15 percent more DEF', () => {
  const hit = (cast: boolean, who: 0 | 1): number => {
    const { sim, s } = makeWhite({ party: [{ id: 'steve', level: 2 }, { id: 'mike' }], seed: 9 });
    s.heroes[0]!.st.def = 0; s.heroes[1]!.st.def = 100;
    if (cast) press(sim, { specialPressed: true }, 10);
    else run(sim, 11);
    if (who === 1) { press(sim, { swapTo: 1 }, 30); }
    return hurtHero(s, s.heroes[who]!, 0, 0, 1, 200);
  };
  const plain = hit(false, 0), guarded = hit(true, 0);
  assert.equal(guarded, Math.round(plain * 0.6), `${plain} becomes ${guarded}`);
  // Mike's DEF 100 is 115 with it: 7.5 less off the hit before the difficulty factor (kid, chief and upside are 1 or more).
  const base = hit(false, 1), lifted = hit(true, 1);
  assert.ok(base - lifted >= 6 && base - lifted <= 12, `${base} becomes ${lifted}`);
  // After the five seconds it is gone.
  const { sim, s } = makeWhite({ party: [{ id: 'steve', level: 2 }], seed: 9 });
  s.heroes[0]!.st.def = 0;
  press(sim, { specialPressed: true }, 320);
  const plain2 = makeWhite({ party: [{ id: 'steve', level: 2 }], seed: 9 });
  plain2.s.heroes[0]!.st.def = 0;
  run(plain2.sim, 321);
  assert.equal(hurtHero(s, s.heroes[0]!, 0, 0, 1, 200), hurtHero(plain2.s, plain2.s.heroes[0]!, 0, 0, 1, 200));
});

test('Hair of steel: from Lv 3 the first hit after 5 seconds unhurt does nothing, with a SAVED, and then it needs 5 seconds again', () => {
  const { sim, s } = makeWhite({ party: [{ id: 'steve', level: 3 }], seed: 3 });
  const h = s.heroes[0]!;
  const hp = h.hp;
  assert.equal(hurtHero(s, h, 0, 0, 1, 40), 0, 'the first hit');
  assert.equal(h.hp, hp);
  assert.equal(h.invuln, 0, 'no flinch, no invulnerability');
  assert.ok(sim.view().floaters.some((f) => f.text === 'SAVED'));
  assert.ok(hurtHero(s, h, 0, 0, 1, 40) > 0, 'the next one lands');
  run(sim, 60);
  assert.ok(hurtHero(s, h, 0, 0, 1, 40) > 0, 'and one a second later too');
  // 299 frames unhurt is not enough; 300 is.
  run(sim, 299);
  assert.ok(hurtHero(s, h, 0, 0, 1, 40) > 0, 'one frame short');
  run(sim, 300);
  assert.equal(hurtHero(s, h, 0, 0, 1, 40), 0, 'saved again');
  // Below Lv 3 there is no talent.
  const low = makeWhite({ party: [{ id: 'steve', level: 2 }], seed: 3 });
  assert.ok(hurtHero(low.s, low.s.heroes[0]!, 0, 0, 1, 40) > 0);
  // Nobody else has it.
  const mike = makeWhite({ party: [{ id: 'mike', level: 5 }], seed: 3 });
  assert.ok(hurtHero(mike.s, mike.s.heroes[0]!, 0, 0, 1, 40) > 0);
});

test('High score: +5 percent crit and +10 percent quarter drops from Lv 3', () => {
  assert.ok(Math.abs(critChance(HERO_DEFS.max, 3) - critChance(HERO_DEFS.max, 2) - 0.05) < 1e-9);
  assert.equal(critChance(HERO_DEFS.max, 2), 0.08);
  assert.equal(critChance(HERO_DEFS.steve, 9), 0.05, 'Steve has no crit talent');
  const quarters = (party: { id: HeroId; level: number }[]): number => {
    const spawns: SimSpawn[] = [];
    for (let i = 0; i < 600; i++) spawns.push(rat(`r${i}`, 1 + (i % 22), 1 + Math.floor(i / 22) % 14, 'g'));
    const { sim, s } = makeWhite({ party, spawns, seed: 11, start: { x: tc(1), y: tf(1) } });
    for (const e of s.enemies) e.hp = 0;
    sim.step(inp());
    return s.items.filter((it) => it.kind === 'quarter').length;
  };
  // Max at Lv 2 would level up to 3 within a few kills, so the control has no Max at all.
  const without = quarters([{ id: 'mike', level: 1 }]);
  const withIt = quarters([{ id: 'mike', level: 1 }, { id: 'max', level: 3 }]);
  assert.ok(withIt - without >= 40 && withIt - without <= 80, `${without} quarters without it, ${withIt} with (expect about 60 more in 600)`);
});

/** A hall with the gap, the party on the near side. The bot's waypoints are the whole route. */
function botRun(dash: boolean, frames: number) {
  const grid = hall();
  const w = makeWhite({ grid, party: [{ id: 'mike' }, { id: 'max' }], start: { x: tc(2), y: HALL_Y }, spawns: [GAP] });
  const wps = [{ x: tc(7), y: HALL_Y }, dash ? { x: tc(8), y: HALL_Y, dash: true as const } : { x: tc(8), y: HALL_Y }, { x: tc(18), y: HALL_Y }];
  const bot = createBot({ grid, waypoints: wps });
  const events: SimEvent[] = [];
  let f = 0;
  for (; f < frames && !bot.done(); f++) events.push(...w.sim.step(bot.next(w.sim)));
  return { ...w, bot, events, frames: f };
}

test('bot: at a dash waypoint it swaps to Max, casts the Skate dash over the gap and carries on to the next waypoint', () => {
  const r = botRun(true, 1500);
  assert.ok(r.bot.done(), `stuck at ${JSON.stringify(r.sim.heroPos())} after ${r.frames} frames`);
  assert.equal(r.s.props[0]?.state, 'open');
  assert.equal(ofType(r.events, 'propCleared').length, 1);
  assert.ok(r.sim.heroPos().x > 176);
  assert.equal(r.sim.party()[r.s.active]?.id, 'max');
  assert.ok(r.events.some((e) => e.t === 'swap' && e.to === 'max'));
  assert.ok(r.events.some((e) => e.t === 'sfx' && e.id === 'skate'));
});

test('bot: there is no shortcut for a gap. Without a dash waypoint it never gets across', () => {
  const r = botRun(false, 1200);
  assert.equal(r.bot.done(), false);
  assert.equal(r.s.props[0]?.state, 'closed');
  assert.ok(r.sim.heroPos().x <= 155.01);
});

test('bot: Steve casts Babysit when two foes are close, and not for one', () => {
  const run1 = (spawns: SimSpawn[]) => {
    const grid = arena(24, 16);
    const w = makeWhite({ grid, party: [{ id: 'steve', level: 3 }], god: true, start: { x: tc(5), y: tf(8) }, spawns });
    const bot = createBot({ grid, waypoints: [{ x: tc(20), y: tf(8) }] });
    let taunted = 0;
    for (let f = 0; f < 400; f++) {
      const ev = w.sim.step(bot.next(w.sim));
      if (ev.some((e) => e.t === 'sfx' && e.id === 'taunt')) taunted++;
    }
    return taunted;
  };
  assert.ok(run1([rat('a', 7, 8, 'g'), rat('b', 7, 9, 'g'), rat('c', 8, 8, 'g')]) >= 1);
  assert.equal(run1([rat('a', 7, 8, 'g')]), 0);
});

test('a gate never waits on a hero who is out: a try at a gap with Max down stands her up, and only then', () => {
  const w = makeWhite({ grid: hall(), party: [{ id: 'mike' }, { id: 'max' }], start: { x: 125, y: HALL_Y }, spawns: [GAP] });
  const max = w.s.heroes.find((h) => h.id === 'max');
  assert.ok(max);
  max.ko = true; max.hp = 0; max.mp = 0;
  run(w.sim, 70, inp({ mx: 1 }));
  assert.equal(max.ko, false, 'Mike leaning on the gap stands her up');
  assert.ok(max.hp >= Math.ceil(max.st.hp * 0.3) && max.hp < max.st.hp, 'with a third of her HP');
  assert.ok(max.mp >= HERO_DEFS.max.special.mp, 'and the MP for one dash');
  // Someone who can open it is up, so nobody stands: a down Mike stays down when Max tries nothing.
  const both = makeWhite({ grid: hall(), party: [{ id: 'mike' }, { id: 'max' }, { id: 'steve' }], start: { x: 125, y: HALL_Y }, spawns: [GAP] });
  const steve = both.s.heroes.find((h) => h.id === 'steve');
  assert.ok(steve);
  steve.ko = true; steve.hp = 0;
  run(both.sim, 70, inp({ mx: 1 }));
  assert.equal(steve.ko, true, 'a gap does not need Steve');
});

test('a try at a crack with Steve down stands him up', () => {
  const w = makeWhite({ party: [{ id: 'mike' }, { id: 'steve' }], start: southOfCrack, spawns: [CRACK] });
  const steve = w.s.heroes.find((h) => h.id === 'steve');
  assert.ok(steve);
  steve.ko = true; steve.hp = 0;
  run(w.sim, 70, inp({ my: -1 }));
  assert.equal(steve.ko, false);
});
