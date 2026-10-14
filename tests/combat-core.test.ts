import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createSim } from '../src/combat/index.ts';
import { rollDamage, damageRange, hitEnemy, heroAtk, SPREAD_LO, SPREAD_HI } from '../src/combat/damage.ts';
import { createRng } from '../src/core/rng.ts';
import { arena, makeSim, makeWhite, rat, agent, run, press, inp, idle, ofType, sfxIds, tc, tf } from './sim-helpers.ts';
import type { SimSpawn } from '../src/core/types.ts';

const near = (a: number, b: number, eps = 0.05): boolean => Math.abs(a - b) <= eps;

test('damage = max(1, round(power x ATK x spread - DEF x 0.5)), spread 0.9 to 1.1', () => {
  assert.equal(SPREAD_LO, 0.9);
  assert.equal(SPREAD_HI, 1.1);
  assert.equal(rollDamage(1, 9, 0, 1), 9);
  assert.equal(rollDamage(1, 9, 3, 1), 8);
  assert.equal(rollDamage(1.35, 9, 3, 1), 11);
  assert.equal(rollDamage(0.1, 1, 50, 1), 1, 'never below 1');
  const rng = createRng(5);
  for (let i = 0; i < 2000; i++) {
    const power = 0.3 + rng() * 3, atk = 1 + Math.floor(rng() * 40), def = Math.floor(rng() * 30);
    const { min, max } = damageRange(power, atk, def);
    const spread = SPREAD_LO + (SPREAD_HI - SPREAD_LO) * rng();
    const d = rollDamage(power, atk, def, spread);
    assert.ok(d >= min && d <= max, `${d} not in ${min}..${max}`);
    assert.ok(d >= 1);
  }
});

test('hits dealt by the bat stay inside the damage bounds, crits double and announce themselves', () => {
  let crits = 0, normal = 0;
  const floaters = new Set<string>();
  for (let seed = 11; seed < 61 && crits < 3; seed++) {
    const spawns: SimSpawn[] = [];
    for (let i = 0; i < 12; i++) spawns.push(rat(`r${i}`, 6 + (i % 3), 7 + Math.floor(i / 3), 'g'));
    const sim = makeSim({ party: [{ id: 'mike' }], spawns, seed });
    for (let f = 0; f < 3000 && sim.enemiesAlive() > 0; f++) {
      const ev = sim.step(inp({ attackHeld: true, mx: 0.3, my: 0 }));
      // Stop at the first level-up: ATK grows after that and the bounds below no longer apply.
      if (ofType(ev, 'levelUp').length > 0) break;
      for (const e of ofType(ev, 'hit')) {
        if (!e.onEnemy) continue;
        if (e.crit) {
          crits++;
          assert.ok((e.dmg >= 16 && e.dmg <= 20) || (e.dmg >= 22 && e.dmg <= 26), `crit ${e.dmg}`);
          assert.ok(ofType(ev, 'natTwenty').some((n) => n.source === 'crit' && n.hero === 'mike'));
        } else {
          normal++;
          // A rat has no DEF: the bat does 8 to 10, the third swing 11 to 13.
          assert.ok((e.dmg >= 8 && e.dmg <= 10) || (e.dmg >= 11 && e.dmg <= 13), `hit ${e.dmg}`);
        }
      }
      for (const fl of sim.view().floaters) floaters.add(fl.text);
    }
  }
  assert.ok(normal > 10, `normal hits ${normal}`);
  assert.ok(crits > 0, 'no crit showed up in fifty seeds');
  assert.ok(floaters.has('NAT 20'), 'crits show a NAT 20 floater');
});

test('hero walks about 1 px per frame, Mike and Eleven slower, diagonals are not faster', () => {
  const speeds: Record<string, number> = { dustin: 1, lucas: 1, mike: 0.9, eleven: 0.9 };
  for (const id of Object.keys(speeds)) {
    const sim = makeSim({ party: [{ id: id as 'mike' }], start: { x: tc(3), y: tf(8) } });
    run(sim, 60, inp({ mx: 1 }));
    const x = sim.heroPos().x - tc(3);
    assert.ok(near(x, 60 * (speeds[id] as number), 0.6), `${id} moved ${x}`);
  }
  const d = makeSim({ party: [{ id: 'dustin' }], start: { x: tc(3), y: tf(8) } });
  run(d, 40, inp({ mx: 1, my: 1 }));
  const p = d.heroPos();
  assert.ok(near(Math.hypot(p.x - tc(3), p.y - tf(8)), 40, 0.6), 'diagonal speed is capped');
});

test('collision: the 10 x 8 foot box stops flush against solid tiles', () => {
  const grid = arena(24, 16, { '8,8': 'T', '4,5': 'T' });
  const sim = createSim({ grid, party: [{ id: 'dustin' }], start: { x: tc(4), y: tf(8) }, spawns: [], seed: 1 });
  run(sim, 200, inp({ mx: 1 }));
  // Tile 8 starts at x = 128 and the box is 5 px either side of x.
  assert.ok(near(sim.heroPos().x, 123), `x ${sim.heroPos().x}`);
  const up = createSim({ grid, party: [{ id: 'dustin' }], start: { x: tc(4), y: tf(8) }, spawns: [], seed: 1 });
  run(up, 200, inp({ my: -1 }));
  // The solid tile at (4,5) spans y 80 to 96, so the box top stops at 96 and the feet at 104.
  assert.ok(near(up.heroPos().y, 104), `y ${up.heroPos().y}`);
});

test('collision: corner assist slides the hero around a tile corner', () => {
  const grid = arena(24, 16, { '8,8': 'T' });
  // Feet at y = 148: the box (140..148) overlaps the wall tile (128..144) by four px at the bottom.
  const sim = createSim({ grid, party: [{ id: 'dustin' }], start: { x: tc(4), y: 148 }, spawns: [], seed: 1 });
  run(sim, 120, inp({ mx: 1 }));
  assert.ok(sim.heroPos().x > 140, `stuck at ${sim.heroPos().x}`);
});

test('solid props block like walls until opened', () => {
  const spawns: SimSpawn[] = [{ kind: 'prop', id: 'gate1', prop: 'gate', tx: 8, ty: 8 }];
  const sim = makeSim({ party: [{ id: 'dustin' }], spawns, start: { x: tc(4), y: tf(8) } });
  run(sim, 200, inp({ mx: 1 }));
  assert.ok(near(sim.heroPos().x, 123), `blocked at ${sim.heroPos().x}`);
  sim.openProp('gate1');
  const ev = run(sim, 60, inp({ mx: 1 }));
  assert.ok(sim.heroPos().x > 140, 'passes once open');
  assert.ok(sfxIds(ev).includes('gateOpen'));
  assert.equal(sim.view().props.find((p) => p.id === 'gate1')?.state, 'open');
});

test('a hit knocks the enemy back, flashes it, shows its bar and freezes the action for 2 to 5 frames', () => {
  const sim = makeSim({ party: [{ id: 'mike' }], spawns: [agent('r', 6, 8, 'g')], start: { x: tc(5), y: tf(8) }, seed: 4 });
  let hitFrame = -1;
  let xBefore = 0;
  for (let f = 0; f < 200; f++) {
    const before = sim.view().actors.find((a) => a.kind === 'enemy');
    const ev = sim.step(inp({ attackHeld: true, mx: 0.3 }));
    if (ofType(ev, 'hit').some((h) => h.onEnemy)) { hitFrame = f; xBefore = before?.x ?? 0; break; }
  }
  assert.ok(hitFrame >= 0, 'the bat connected');
  const v = sim.view();
  const e = v.actors.find((a) => a.kind === 'enemy');
  assert.ok(e && e.flash > 0.5, 'white flash');
  assert.ok(e && e.bar !== null, 'bar appears once hit');
  assert.ok(v.floaters.some((fl) => /^\d+$/.test(fl.text) || fl.text === 'NAT 20'), 'damage floater');
  // Hit-stop: nothing moves for a few ticks.
  const p0 = sim.heroPos();
  const e0 = sim.view().actors.find((a) => a.kind === 'enemy');
  run(sim, 1, inp({ mx: 0.3 }));
  assert.ok(near(sim.heroPos().x, p0.x, 1e-9), 'hero frozen during hit-stop');
  assert.ok(near(sim.view().actors.find((a) => a.kind === 'enemy')?.x ?? 0, e0?.x ?? 0, 1e-9), 'enemy frozen during hit-stop');
  let frozen = 1;
  for (let i = 0; i < 8; i++) {
    const q = sim.heroPos();
    run(sim, 1, inp({ mx: 0.3 }));
    if (near(sim.heroPos().x, q.x, 1e-9)) frozen++; else break;
  }
  assert.ok(frozen >= 1 && frozen <= 5, `froze ${frozen} extra ticks`);
  // Knockback moved the rat away from Mike (to the right).
  run(sim, 6);
  const after = sim.view().actors.find((a) => a.kind === 'enemy' && a.anim !== 'ko');
  if (after) assert.ok(after.x > xBefore - 0.01, 'rat pushed right');
});

test('burn ticks damage over time, tints the enemy and stops after its duration', () => {
  const { sim, s } = makeWhite({ party: [{ id: 'dustin' }], spawns: [agent('a', 1, 1)], start: { x: 200, y: 200 }, seed: 6 });
  const a = s.enemies[0]!;
  a.stat.stun = 99999; a.aware = false;
  a.x = 230; a.y = 200;
  a.hp = a.hpMax = 400; // tough enough to outlast the flames
  run(sim, 1, inp({ mx: 0.2 }));
  const ev = press(sim, { specialPressed: true }, 12);
  assert.ok(sfxIds(ev).includes('flame'));
  assert.ok(a.stat.burn > 0, 'set alight');
  assert.equal(sim.view().actors.find((x) => x.kind === 'enemy')?.tint, 'orange');
  // Burn is damage over time: let the cone finish, then watch HP drop in steps of the burn tick.
  run(sim, 40);
  const samples: number[] = [];
  for (let i = 0; i < 100; i++) { sim.step(inp()); samples.push(a.hp); }
  const drops = samples.filter((v, i) => i > 0 && v < (samples[i - 1] as number)).length;
  assert.ok(drops >= 2 && drops <= 6, `${drops} burn ticks`);
  run(sim, 200);
  assert.equal(a.stat.burn, 0, 'burn runs out');
  const hp = a.hp;
  run(sim, 100);
  assert.equal(a.hp, hp, 'and stops hurting');
  assert.equal(sim.view().actors.find((x) => x.kind === 'enemy')?.tint, 'yellow', 'still stunned, no longer burning');
});

test('crit chance is 5 percent plus the hero bonus; Sharp eye adds 15 at Lv 3', () => {
  const rate = (id: 'mike' | 'dustin' | 'lucas' | 'eleven', level: number): number => {
    const { s } = makeWhite({ party: [{ id, level }], spawns: [rat('r', 20, 12)], seed: 99 });
    const e = s.enemies[0]!;
    let crits = 0;
    const N = 6000;
    for (let i = 0; i < N; i++) {
      e.hp = 1e9;
      s.armed = false;
      s.events = [];
      hitEnemy(s, s.heroes[0]!, e, { power: 1 });
      if (s.events.some((ev) => ev.t === 'hit' && ev.crit)) crits++;
    }
    return crits / N;
  };
  assert.ok(Math.abs(rate('mike', 1) - 0.05) < 0.015);
  assert.ok(Math.abs(rate('dustin', 3) - 0.05) < 0.015);
  assert.ok(Math.abs(rate('eleven', 1) - 0.07) < 0.015);
  assert.ok(Math.abs(rate('lucas', 2) - 0.08) < 0.015);
  assert.ok(Math.abs(rate('lucas', 3) - 0.23) < 0.02);
});

test('Mike DM fiat: the first hit of each fight is a crit, from Lv 3', () => {
  const firstIsCrit = (level: number, seed: number): boolean => {
    const { sim } = makeWhite({ party: [{ id: 'mike', level }], spawns: [agent('a', 6, 8)], start: { x: tc(5), y: tf(8) }, seed });
    for (let f = 0; f < 120; f++) {
      const ev = sim.step(inp({ attackHeld: true, mx: 0.3 }));
      const h = ofType(ev, 'hit').find((x) => x.onEnemy);
      if (h) return h.crit;
    }
    throw new Error('no hit');
  };
  let withTalent = 0, without = 0;
  for (let seed = 1; seed <= 30; seed++) {
    if (firstIsCrit(3, seed)) withTalent++;
    if (firstIsCrit(2, seed)) without++;
  }
  assert.equal(withTalent, 30);
  assert.ok(without <= 6, `${without}/30 without the talent`);
  // It resets after the party has been out of a fight for a few seconds, and only the first hit counts.
  const { sim, s } = makeWhite({ party: [{ id: 'mike', level: 3 }], spawns: [agent('a', 6, 8), agent('b', 20, 12)], start: { x: tc(5), y: tf(8) }, seed: 4 });
  const crits: boolean[] = [];
  for (let f = 0; f < 200 && crits.length < 3; f++) {
    for (const h of ofType(sim.step(inp({ attackHeld: true, mx: 0.3 })), 'hit')) if (h.onEnemy) crits.push(h.crit);
  }
  assert.equal(crits[0], true);
  assert.equal(s.armed, false);
  s.enemies.forEach((e) => { e.hp = 0; });
  run(sim, 260);
  assert.equal(s.armed, true, 'a calm stretch re-arms it');
});

test('Inspiration: +15 percent ATK while it lasts', () => {
  const { s } = makeWhite({ party: [{ id: 'mike' }] });
  const mike = s.heroes[0]!;
  assert.equal(heroAtk(s, mike), 9);
  s.inspire = 600;
  assert.ok(Math.abs(heroAtk(s, mike) - 9 * 1.15) < 1e-9);
});
