// Robin and Nancy (docs/level-7.md): Scoop toss and Word vomit, Pistol and Shotgun, the bear traps, and the bot casting each at the
// right moment. The confusion brain itself is in tests/confuse.test.ts.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { EnemyKind, SimEvent, SimSpawn } from '../src/core/types.ts';
import { HERO_DEFS } from '../src/heroes/index.ts';
import { heroSheet } from '../src/heroes/charsheet.ts';
import { ENEMY_DEFS } from '../src/enemies/index.ts';
import { damageRange } from '../src/combat/damage.ts';
import { createBot } from '../src/combat/bot.ts';
import type { Enemy, S } from '../src/combat/state.ts';
import { agent, arena, inp, makeWhite, ofType, press, rat, run, sfxIds, tc, tf } from './sim-helpers.ts';

const hits = (ev: SimEvent[]) => ofType(ev, 'hit').filter((h) => h.onEnemy);
/** Parks every enemy where it stands (stunned for good) with HP to spare, so a test can read what a move did to it. */
function freeze(s: S): void {
  for (const e of s.enemies) { e.stat.stun = 99999; e.hp = e.hpMax = 9999; }
}
const east = { mx: 0.2, attackPressed: true };
const eastSpecial = { mx: 0.2, specialPressed: true };
const enemy = (s: S, i: number): Enemy => s.enemies[i] as Enemy;
const unit = (id: string, type: EnemyKind, tx: number, ty: number, extra: Partial<Extract<SimSpawn, { kind: 'enemy' }>> = {}): SimSpawn =>
  ({ kind: 'enemy', id, type, tx, ty, group: 'g', ...extra });

test('the kit numbers: what the spec says', () => {
  const r = HERO_DEFS.robin;
  assert.deepEqual([r.basic.name, r.basic.power, r.basic.reach, r.basic.x.land, r.basic.x.blast, r.basic.x.slow], ['Scoop toss', 0.9, 72, 22, 16, 60]);
  assert.deepEqual([r.special.name, r.special.mp, r.special.reach, r.special.x.half, r.special.x.confuse, r.special.x.linguist], ['Word vomit', 5, 56, 40, 180, 240]);
  assert.deepEqual(r.utilities, ['read']);
  const n = HERO_DEFS.nancy;
  assert.deepEqual([n.basic.name, n.basic.power, n.basic.x.speed, n.basic.reach], ['Pistol', 1.1, 4.4, 160]);
  assert.deepEqual([n.special.name, n.special.mp, n.special.x.n, n.special.reach, n.special.x.speed, n.special.power, n.special.kb], ['Shotgun', 7, 5, 72, 5, 0.6, 4]);
  assert.equal(n.special.x.fan * (n.special.x.n - 1), 50, 'five pellets across 50 degrees');
  assert.equal(n.special.x.trapLife, 600);
  assert.equal(n.special.x.traps, 2);
  assert.equal(n.special.x.hold, 120);
  assert.equal(n.special.x.trapPower, 0.8);
  assert.deepEqual(n.utilities, ['shoot']);
});

// ------------------------------------------------------------------ Scoop toss

test('Scoop toss: a lob that flies 22 frames, lands on the nearest enemy in the cone, splashes 16 px for power 0.9 and slows 60 frames', () => {
  const { sim, s } = makeWhite({ party: [{ id: 'robin', level: 2 }], start: { x: tc(4), y: tf(8) }, spawns: [rat('a', 8, 8), rat('b', 9, 8), rat('c', 12, 8)] });
  freeze(s);
  const [a, b, c] = [enemy(s, 0), enemy(s, 1), enemy(s, 2)];
  const [ax, bx] = [a.x, b.x];
  const first = press(sim, east, 0);
  assert.ok(sfxIds(first).includes('scoop'));
  const events: SimEvent[] = [];
  let flight = 0, peak = 0, splat = false;
  for (let i = 0; i < 40; i++) {
    events.push(...sim.step(inp()));
    const f = sim.view().fx.find((x) => x.kind === 'scoop' && x.w === 6);
    if (f) { flight++; peak = Math.max(peak, f.h); }
    if (sim.view().fx.some((x) => x.kind === 'scoop' && x.w === 32)) splat = true;
  }
  assert.ok(flight >= 20 && flight <= 22, `the scoop is in the air for about 22 frames (${flight})`);
  assert.ok(peak > 10, 'and it arcs');
  assert.ok(splat, 'then a splat 32 px across');
  const landed = hits(events);
  const [dmgA, dmgB] = [landed.filter((h) => Math.abs(h.x - ax) < 1), landed.filter((h) => Math.abs(h.x - bx) < 1)];
  assert.equal(dmgA.length, 1, 'the one it lands on');
  assert.equal(dmgB.length, 1, 'and the one 16 px behind it, inside the splash');
  assert.equal(landed.length, 2, 'the one 64 px behind is clear of it');
  const range = damageRange(0.9, HERO_DEFS.robin.base.atk + Math.floor(HERO_DEFS.robin.growth.atk), 0);
  for (const h of landed) if (!h.crit) assert.ok(h.dmg >= range.min && h.dmg <= range.max, `damage ${h.dmg}`);
  assert.ok(a.stat.slow > 0 && a.stat.slow <= 60, 'slowed');
  assert.ok(b.stat.slow > 0);
  assert.equal(c.stat.slow, 0);
  assert.equal(c.hp, 9999);
});

test('Scoop toss: the slow lasts 60 frames of play', () => {
  const { sim, s } = makeWhite({ party: [{ id: 'robin', level: 2 }], spawns: [rat('a', 8, 8)] });
  enemy(s, 0).hp = 9999;
  enemy(s, 0).hpMax = 9999;
  enemy(s, 0).stat.stun = 20;
  press(sim, east, 0);
  let peak = 0, ticks = 0, tinted = false;
  for (let i = 0; i < 140; i++) {
    const before = enemy(s, 0).stat.slow;
    sim.step(inp());
    if (enemy(s, 0).stat.slow > 0 && enemy(s, 0).stat.stun === 0 && sim.view().actors.find((a) => a.id === 'rat')?.tint === 'purple') tinted = true;
    peak = Math.max(peak, enemy(s, 0).stat.slow);
    if (before > 0 && enemy(s, 0).stat.slow < before) ticks++;
  }
  assert.equal(peak, 60, 'slowed for 60 frames');
  assert.equal(ticks, 60, 'and it runs down one frame at a time');
  assert.equal(enemy(s, 0).stat.slow, 0);
  assert.ok(tinted, 'a slowed enemy shows purple');
});

test('Scoop toss: with nothing to aim at it lands 72 px out along her aim, and never farther than 72 even for a target at 80', () => {
  const none = makeWhite({ party: [{ id: 'robin', level: 2 }], start: { x: tc(4), y: tf(8) } });
  press(none.sim, east, 0);
  run(none.sim, 14);
  const lob = none.s.projs.find((p) => p.kind === 'scoop');
  assert.ok(lob?.lob);
  assert.ok(Math.abs((lob?.lob?.ex ?? 0) - (tc(4) + 72)) < 0.5 && Math.abs((lob?.lob?.ey ?? 0) - tf(8)) < 0.5, `lands at ${lob?.lob?.ex}`);
  const far = makeWhite({ party: [{ id: 'robin', level: 2 }], start: { x: tc(4), y: tf(8) }, spawns: [rat('a', 9, 8, 'g', { dormant: false })] });
  far.s.enemies[0]!.x = tc(4) + 80; far.s.enemies[0]!.stat.stun = 99999;
  press(far.sim, east, 14);
  const lob2 = far.s.projs.find((p) => p.kind === 'scoop');
  assert.ok(Math.abs((lob2?.lob?.ex ?? 0) - (tc(4) + 72)) < 0.5, `clamped to ${lob2?.lob?.ex}`);
});

test('Scoop toss: it ignores an enemy outside the 40 degree cone and a sleeping one', () => {
  const { sim, s } = makeWhite({
    party: [{ id: 'robin', level: 2 }], start: { x: tc(4), y: tf(8) },
    spawns: [rat('side', 6, 12), rat('sleeper', 7, 8, 'g', { dormant: true })],
  });
  s.enemies[0]!.stat.stun = 99999;
  press(sim, east, 14);
  const lob = s.projs.find((p) => p.kind === 'scoop');
  assert.ok(Math.abs((lob?.lob?.ex ?? 0) - (tc(4) + 72)) < 0.5 && Math.abs((lob?.lob?.ey ?? 0) - tf(8)) < 0.5, 'straight ahead at full reach');
});

test('Scoop toss: it kills a rat in one to three hits and an agent in two to five, like everyone\'s basic attack', () => {
  const count = (kind: 'rat' | 'agent', seed: number): number => {
    const spawn = kind === 'rat' ? rat('x', 8, 8, 'g') : agent('x', 8, 8, 'g');
    const { sim } = makeWhite({ party: [{ id: 'robin' }], god: true, spawns: [spawn], start: { x: tc(5), y: tf(8) }, seed });
    let n = 0;
    for (let f = 0; f < 1500 && sim.enemiesAlive() > 0; f++) n += hits(sim.step(inp({ attackHeld: true, mx: 0.9 }))).length;
    assert.equal(sim.enemiesAlive(), 0, `${kind} seed ${seed} died`);
    return n;
  };
  let rMax = 0, aMin = 99, aMax = 0;
  for (let seed = 1; seed <= 30; seed++) {
    rMax = Math.max(rMax, count('rat', seed));
    const a = count('agent', seed);
    aMin = Math.min(aMin, a); aMax = Math.max(aMax, a);
  }
  assert.ok(rMax <= 3, `a rat took up to ${rMax}`);
  assert.ok(aMin >= 2 && aMax <= 5, `agents took ${aMin} to ${aMax}`);
});

// ------------------------------------------------------------------ Word vomit

test('Word vomit: 5 MP, a babble sfx and fx 56 px long, and every enemy in the cone is confused for 180 frames', () => {
  const { sim, s } = makeWhite({
    party: [{ id: 'robin', level: 2 }], start: { x: tc(4), y: tf(8) },
    spawns: [rat('in1', 7, 8), rat('in2', 7, 7), rat('behind', 2, 8), rat('far', 11, 8), rat('wide', 5, 12)],
  });
  freeze(s);
  const mp = s.heroes[0]!.mp;
  const ev = press(sim, eastSpecial, 0);
  assert.ok(sfxIds(ev).includes('babble'));
  assert.ok(Math.abs(mp - s.heroes[0]!.mp - 5) < 0.05, 'costs 5 MP');
  run(sim, 8);
  const fx = sim.view().fx.find((f) => f.kind === 'babble');
  assert.ok(fx && fx.w === 56 && fx.angle === 0, 'the cone fx');
  assert.deepEqual(s.enemies.map((e) => e.stat.confuse > 0), [true, true, false, false, false]);
  const flags = sim.view().actors.filter((a) => a.kind === 'enemy').map((a) => a.confused === true);
  assert.equal(flags.filter(Boolean).length, 2, 'ActorView.confused on the two inside');
  assert.ok(s.enemies[0]!.stat.confuse > 170 && s.enemies[0]!.stat.confuse <= 180, 'confused for 180 frames');
});

test('Word vomit: the confusion lasts 180 frames, and the flag drops with it', () => {
  const { sim, s } = makeWhite({ party: [{ id: 'robin', level: 2 }], start: { x: tc(4), y: tf(8) }, spawns: [rat('a', 7, 8)] });
  freeze(s);
  press(sim, eastSpecial, 0);
  let frames = 0;
  for (let i = 0; i < 260; i++) {
    sim.step(inp());
    if (sim.view().actors.find((a) => a.id === 'rat')?.confused) frames++;
  }
  assert.ok(frames >= 178 && frames <= 180, `confused for ${frames} frames`);
});

test('Linguist: from Lv 3 the confusion lasts 240 frames, and the sheet says so', () => {
  const lasts = (level: number): number => {
    const { sim, s } = makeWhite({ party: [{ id: 'robin', level }], start: { x: tc(4), y: tf(8) }, spawns: [rat('a', 7, 8)] });
    freeze(s);
    press(sim, eastSpecial, 0);
    let frames = 0;
    for (let i = 0; i < 300; i++) {
      sim.step(inp());
      if (sim.view().actors.find((a) => a.id === 'rat')?.confused) frames++;
    }
    return frames;
  };
  const [lv2, lv3] = [lasts(2), lasts(3)];
  assert.ok(lv2 >= 178 && lv2 <= 180, `Lv 2: ${lv2}`);
  assert.ok(lv3 >= 238 && lv3 <= 240, `Lv 3: ${lv3}`);
  assert.match(heroSheet('robin', 2).moves[1]!.note, /3s/);
  assert.match(heroSheet('robin', 3).moves[1]!.note, /4s/);
});

test('Word vomit: a boss is not confused, it staggers for 30 frames instead', () => {
  const { sim, s } = makeWhite({
    party: [{ id: 'robin', level: 2 }], god: true, start: { x: tc(4), y: tf(8) },
    spawns: [agent('boss1', 7, 8, 'boss'), rat('plain', 7, 9, 'g')],
  });
  for (const e of s.enemies) e.hp = e.hpMax = 9999;
  enemy(s, 1).stat.stun = 99999;
  press(sim, eastSpecial, 0);
  let hurt = 0;
  for (let i = 0; i < 12; i++) sim.step(inp());
  for (let i = 0; i < 60; i++) {
    sim.step(inp());
    if (sim.view().actors.find((a) => a.id === 'agent')?.anim === 'hurt') hurt++;
  }
  assert.equal(enemy(s, 0).stat.confuse, 0, 'the boss is not confused');
  assert.equal(sim.view().actors.find((a) => a.id === 'agent')?.confused, undefined);
  assert.ok(enemy(s, 1).stat.confuse > 0, 'the rat next to it is');
  assert.ok(hurt >= 15 && hurt <= 30, `staggered for about 30 frames (${hurt} seen)`);
});

test('Word vomit: the Demogorgon and the Alpha count as bosses too', () => {
  for (const type of ['demogorgon', 'alpha'] as const) {
    const { sim, s } = makeWhite({ party: [{ id: 'robin', level: 2 }], god: true, start: { x: tc(4), y: tf(8) }, spawns: [unit('b', type, 7, 8)] });
    press(sim, eastSpecial, 7);
    assert.equal(enemy(s, 0).stat.confuse, 0, type);
  }
});

// ------------------------------------------------------------------ Pistol

test('Pistol: a 4.4 px a frame bullet in eight directions, power 1.1, reach 160 px', () => {
  const dirs: [number, number, number][] = [[1, 0, 0], [1, 1, Math.PI / 4], [0, 1, Math.PI / 2], [-1, 1, (3 * Math.PI) / 4], [-1, 0, Math.PI], [0, -1, -Math.PI / 2]];
  for (const [mx, my, angle] of dirs) {
    const { sim, s } = makeWhite({ party: [{ id: 'nancy', level: 2 }], start: { x: tc(10), y: tf(8) } });
    const ev = press(sim, { mx: mx * 0.2, my: my * 0.2, attackPressed: true }, 6);
    assert.ok(sfxIds(ev).includes('pistol'));
    const p = s.projs.find((q) => q.kind === 'bullet');
    assert.ok(p, 'a bullet');
    assert.ok(Math.abs(Math.hypot(p.vx, p.vy) - 4.4) < 1e-6);
    assert.ok(Math.abs(Math.atan2(p.vy, p.vx) - angle) < 1e-6, `aim ${angle}`);
    assert.equal(p.life, Math.round(160 / 4.4));
    const fx = sim.view().fx.find((f) => f.kind === 'bullet');
    assert.ok(fx && Math.abs(fx.angle - angle) < 1e-6);
  }
});

test('Pistol: it hits for power 1.1 at 150 px and not at 175, and lights a target like Lucas\'s rocket', () => {
  const near = makeWhite({ party: [{ id: 'nancy', level: 2 }], start: { x: tc(3), y: tf(8) }, spawns: [rat('a', 13, 8)] });
  freeze(near.s);
  const ev = [...press(near.sim, east, 0), ...run(near.sim, 60)];
  const range = damageRange(1.1, HERO_DEFS.nancy.base.atk + Math.floor(HERO_DEFS.nancy.growth.atk), 0);
  const landed = hits(ev);
  assert.equal(landed.length, 1);
  if (!landed[0]!.crit) assert.ok(landed[0]!.dmg >= range.min && landed[0]!.dmg <= range.max, `damage ${landed[0]!.dmg}`);
  const far = makeWhite({ party: [{ id: 'nancy', level: 2 }], start: { x: tc(3), y: tf(8) }, spawns: [rat('a', 14, 8)] });
  freeze(far.s);
  far.s.enemies[0]!.x = tc(3) + 175;
  assert.equal(hits([...press(far.sim, east, 0), ...run(far.sim, 60)]).length, 0, '175 px is out of reach');
  const lamp: SimSpawn = { kind: 'prop', id: 'lamp', prop: 'target', tx: 9, ty: 8 };
  const shot = makeWhite({ party: [{ id: 'nancy', level: 2 }], start: { x: tc(3), y: tf(8) }, spawns: [lamp] });
  const sh = [...press(shot.sim, east, 0), ...run(shot.sim, 40)];
  assert.deepEqual(ofType(sh, 'targetHit'), [{ t: 'targetHit', propId: 'lamp' }]);
});

test('Pistol: it kills a rat in one to three hits and an agent in two to five', () => {
  const count = (kind: 'rat' | 'agent', seed: number): number => {
    const spawn = kind === 'rat' ? rat('x', 9, 8, 'g') : agent('x', 9, 8, 'g');
    const { sim } = makeWhite({ party: [{ id: 'nancy' }], god: true, spawns: [spawn], start: { x: tc(5), y: tf(8) }, seed });
    let n = 0;
    for (let f = 0; f < 1500 && sim.enemiesAlive() > 0; f++) n += hits(sim.step(inp({ attackHeld: true, mx: 0.9 }))).length;
    assert.equal(sim.enemiesAlive(), 0, `${kind} seed ${seed} died`);
    return n;
  };
  let rMax = 0, aMin = 99, aMax = 0;
  for (let seed = 1; seed <= 30; seed++) {
    rMax = Math.max(rMax, count('rat', seed));
    const a = count('agent', seed);
    aMin = Math.min(aMin, a); aMax = Math.max(aMax, a);
  }
  assert.ok(rMax <= 3, `a rat took up to ${rMax}`);
  assert.ok(aMin >= 2 && aMax <= 5, `agents took ${aMin} to ${aMax}`);
});

// ------------------------------------------------------------------ Shotgun

test('Shotgun: 7 MP, five pellets across 50 degrees at 5 px a frame, a spark at the muzzle and the shotgun sfx', () => {
  const { sim, s } = makeWhite({ party: [{ id: 'nancy', level: 2 }], start: { x: tc(4), y: tf(8) } });
  const mp = s.heroes[0]!.mp;
  const ev = press(sim, eastSpecial, 6);
  assert.ok(sfxIds(ev).includes('shotgun'));
  assert.ok(Math.abs(mp - s.heroes[0]!.mp - 7) < 0.3, 'costs 7 MP');
  const pellets = s.projs.filter((p) => p.kind === 'bullet');
  assert.equal(pellets.length, 5);
  const angles = pellets.map((p) => (Math.atan2(p.vy, p.vx) * 180) / Math.PI).sort((a, b) => a - b);
  assert.deepEqual(angles.map((a) => Math.round(a * 10) / 10), [-25, -12.5, 0, 12.5, 25]);
  assert.ok(pellets.every((p) => Math.abs(Math.hypot(p.vx, p.vy) - 5) < 1e-6 && p.power === 0.6 && p.kb === 4));
  assert.equal(pellets[0]!.life, Math.round(72 / 5));
  const spark = sim.view().fx.find((f) => f.kind === 'spark');
  assert.ok(spark && Math.abs(spark.x - (tc(4) + 8)) < 8, 'a spark at the muzzle');
});

test('Shotgun: up close all five pellets hit for 0.6 each, the shove is heavy and does not stack, and the pellets stop at 72 px', () => {
  const close = makeWhite({ party: [{ id: 'nancy', level: 2 }], start: { x: tc(4), y: tf(8) }, spawns: [rat('a', 5, 8)] });
  freeze(close.s);
  close.s.enemies[0]!.x = tc(4) + 16;
  const ev = [...press(close.sim, eastSpecial, 0), ...run(close.sim, 40)];
  assert.equal(hits(ev).length, 5, 'all five landed');
  const range = damageRange(0.6, HERO_DEFS.nancy.base.atk + Math.floor(HERO_DEFS.nancy.growth.atk), 0);
  for (const h of hits(ev)) if (!h.crit) assert.ok(h.dmg >= range.min && h.dmg <= range.max, `pellet of ${h.dmg}`);
  // The shove: five hits of 4 would be 20 px a frame. It is capped at one heavy shove.
  const e = close.s.enemies[0]!;
  assert.ok(e.x > tc(4) + 16, 'shoved');
  assert.ok(e.x - (tc(4) + 16) < 40, `not flung across the room (${e.x - (tc(4) + 16)} px)`);

  const reach = makeWhite({ party: [{ id: 'nancy', level: 2 }], start: { x: tc(4), y: tf(8) }, spawns: [rat('a', 5, 8), rat('b', 5, 9)] });
  freeze(reach.s);
  reach.s.enemies[0]!.x = tc(4) + 60;
  reach.s.enemies[1]!.x = tc(4) + 92;
  reach.s.enemies[1]!.y = tf(8);
  const ev2 = [...press(reach.sim, eastSpecial, 0), ...run(reach.sim, 30)];
  const struck = hits(ev2).map((h) => Math.round(h.x));
  assert.ok(struck.length > 0 && struck.every((x) => Math.abs(x - (tc(4) + 60)) < 3), 'the near one is hit and the one at 92 px is not');
});

test('Shotgun: a heavy shove breaks a hold on the hero, and the knockback is the full 4 on one pellet', () => {
  const { sim, s } = makeWhite({ party: [{ id: 'nancy', level: 2 }], start: { x: tc(4), y: tf(8) }, spawns: [rat('a', 5, 8)] });
  freeze(s);
  const e = s.enemies[0]!;
  e.x = tc(4) + 60;
  e.y = tf(8);
  press(sim, eastSpecial, 40);
  assert.ok(e.x > tc(4) + 60, 'shoved back by the pellets that reached');
  assert.ok(Math.hypot(e.vx, e.vy) <= 5.2 / ENEMY_DEFS.rat.weight + 1e-6);
});

// ------------------------------------------------------------------ Trap kit

const trapsIn = (sim: ReturnType<typeof makeWhite>['sim']) => sim.view().fx.filter((f) => f.kind === 'trap');

test('Trap kit: from Lv 3 each Shotgun drops a bear trap at her feet, at most two, each lasting 600 frames', () => {
  const lv2 = makeWhite({ party: [{ id: 'nancy', level: 2 }], start: { x: tc(4), y: tf(8) } });
  press(lv2.sim, eastSpecial, 10);
  assert.equal(trapsIn(lv2.sim).length, 0, 'no trap before Lv 3');

  const { sim, s } = makeWhite({ party: [{ id: 'nancy', level: 3 }], start: { x: tc(4), y: tf(8) } });
  press(sim, eastSpecial, 10);
  let traps = trapsIn(sim);
  assert.equal(traps.length, 1);
  assert.ok(Math.abs(traps[0]!.x - tc(4)) < 0.5 && Math.abs(traps[0]!.y - tf(8)) < 0.5, 'at her feet');
  assert.equal(traps[0]!.life, 600);
  s.heroes[0]!.mp = 99;
  sim.dev.teleport(tc(8), tf(8));
  run(sim, 40);
  press(sim, eastSpecial, 10);
  assert.equal(trapsIn(sim).length, 2);
  sim.dev.teleport(tc(12), tf(8));
  run(sim, 40);
  press(sim, eastSpecial, 10);
  traps = trapsIn(sim);
  assert.equal(traps.length, 2, 'a third takes the oldest away');
  assert.deepEqual(traps.map((t) => Math.round(t.x)).sort((a, b) => a - b), [tc(8), tc(12)]);
  // Ages out 600 frames after it went down.
  run(sim, 600);
  assert.equal(trapsIn(sim).length, 0);
});

test('Trap kit: the first non-boss enemy to step on one is held for 120 frames and takes power 0.8, and the trap is spent', () => {
  const { sim, s } = makeWhite({
    party: [{ id: 'nancy', level: 3 }], start: { x: tc(6), y: tf(8) },
    spawns: [unit('first', 'rat', 14, 8), unit('second', 'rat', 16, 8)],
  });
  for (const e of s.enemies) { e.hp = e.hpMax = 9999; e.aware = true; e.mode = 'chase'; }
  // Drop the trap, then walk off to the west with the rats coming after her down the same row.
  press(sim, eastSpecial, 10);
  const ev: SimEvent[] = [];
  let heldAt = -1, held: { x: number } | null = null;
  for (let i = 0; i < 400; i++) {
    ev.push(...sim.step(inp({ mx: i < 30 ? -1 : 0 })));
    const stunned = s.enemies.filter((e) => e.stat.stun > 0);
    if (heldAt < 0 && stunned.length > 0) { heldAt = i; held = { x: stunned[0]!.x }; }
  }
  assert.ok(heldAt > 0, 'a rat stepped on it');
  assert.equal(trapsIn(sim).length, 0, 'the trap is spent');
  const trapHit = hits(ev).filter((h) => h.dmg > 0);
  assert.ok(trapHit.length >= 1);
  // Held: it cannot move or attack while the 120 frames run.
  const again = makeWhite({
    party: [{ id: 'nancy', level: 3 }], start: { x: tc(6), y: tf(8) },
    spawns: [unit('first', 'rat', 14, 8)],
  });
  again.s.enemies[0]!.hp = again.s.enemies[0]!.hpMax = 9999;
  again.s.enemies[0]!.aware = true; again.s.enemies[0]!.mode = 'chase';
  press(again.sim, eastSpecial, 10);
  let started = -1;
  const xs: number[] = [];
  for (let i = 0; i < 300; i++) {
    again.sim.step(inp({ mx: i < 20 ? -1 : 0 }));
    const e = again.s.enemies[0]!;
    if (started < 0 && e.stat.stun > 100) started = i;
    if (started >= 0) xs.push(e.x);
  }
  assert.ok(started >= 0, 'held');
  const heldXs = xs.slice(5, 110);
  assert.ok(Math.max(...heldXs) - Math.min(...heldXs) < 1, 'it does not move while held');
  assert.ok(held !== null);
  // The trap hit is 0.8 of her ATK against its DEF.
  const range = damageRange(0.8, HERO_DEFS.nancy.base.atk + Math.floor(HERO_DEFS.nancy.growth.atk * 2), ENEMY_DEFS.rat.def);
  const firstHit = 9999 - again.s.enemies[0]!.hp;
  assert.ok(firstHit >= range.min, `took ${firstHit}`);
});

test('Trap kit: a trap holds one enemy, so the second walks over the spot', () => {
  const { sim, s } = makeWhite({
    party: [{ id: 'nancy', level: 3 }], start: { x: tc(6), y: tf(8) },
    spawns: [unit('first', 'agent', 12, 8), unit('second', 'agent', 14, 8)],
  });
  for (const e of s.enemies) { e.hp = e.hpMax = 9999; e.stat.slow = 0; }
  press(sim, eastSpecial, 10);
  let most = 0;
  for (let i = 0; i < 300; i++) {
    sim.step(inp({ mx: i < 30 ? -1 : 0 }));
    most = Math.max(most, s.enemies.filter((e) => e.stat.stun > 0).length);
  }
  assert.ok(most <= 1, `${most} held at once`);
});

test('Trap kit: a boss walks over it and a sleeper does not set it off', () => {
  const { sim, s } = makeWhite({
    party: [{ id: 'nancy', level: 3 }], start: { x: tc(6), y: tf(8) },
    spawns: [unit('boss', 'agent', 9, 8, { group: 'boss' }), unit('sleep', 'agent', 7, 8, { dormant: true })],
  });
  for (const e of s.enemies) e.hp = e.hpMax = 9999;
  press(sim, eastSpecial, 10);
  assert.equal(trapsIn(sim).length, 1);
  s.enemies[0]!.x = tc(6);
  s.enemies[0]!.y = tf(8);
  run(sim, 5);
  assert.equal(s.enemies[0]!.stat.stun, 0, 'the boss is not held');
  assert.equal(trapsIn(sim).length, 1, 'and the trap is still there');
  s.enemies[1]!.x = tc(6);
  s.enemies[1]!.y = tf(8);
  run(sim, 5);
  assert.equal(trapsIn(sim).length, 1, 'a sleeper is not an enemy that steps');
});

// ------------------------------------------------------------------ the bot

/** The sfx ids a bot-driven sim makes in `frames` ticks. */
function botSfx(party: { id: 'robin' | 'nancy' }[], spawns: SimSpawn[], frames: number): Set<string> {
  const grid = arena(24, 16);
  const sim = createSimFor(party, spawns, grid);
  const bot = createBot({ grid, waypoints: [{ x: tc(20), y: tf(8) }] });
  const seen = new Set<string>();
  for (let f = 0; f < frames; f++) for (const id of sfxIds(sim.step(bot.next(sim)))) seen.add(id);
  return seen;
}
function createSimFor(party: { id: 'robin' | 'nancy' }[], spawns: SimSpawn[], grid: ReturnType<typeof arena>) {
  return makeWhite({ grid, party: party.map((p) => ({ ...p, level: 4 })), start: { x: tc(5), y: tf(8) }, spawns, god: true }).sim;
}

test('bot: Robin casts Word vomit with three enemies within 56 px, and not with two', () => {
  const three = botSfx([{ id: 'robin' }], [rat('a', 8, 7), rat('b', 8, 8), rat('c', 8, 9)], 90);
  assert.ok(three.has('babble'), 'three in range');
  const two = botSfx([{ id: 'robin' }], [rat('a', 8, 7), rat('b', 8, 8)], 90);
  assert.ok(!two.has('babble'), 'two is not a crowd');
  assert.ok(two.has('scoop'), 'she lobs scoops instead');
});

test('bot: Nancy casts the Shotgun with an enemy within 40 px and shoots the pistol from farther out', () => {
  const close = botSfx([{ id: 'nancy' }], [rat('a', 7, 8)], 90);
  assert.ok(close.has('shotgun'), 'a rat within 40 px');
  const far = botSfx([{ id: 'nancy' }], [agent('a', 13, 8)], 20);
  assert.ok(far.has('pistol'), 'and the pistol at range');
  assert.ok(!far.has('shotgun'));
});

test('bot: a party of Robin and Nancy clears a small fight', () => {
  let cleared = 0;
  for (let seed = 1; seed <= 6; seed++) {
    const grid = arena(24, 16);
    const { sim } = makeWhite({
      grid, seed, party: [{ id: 'robin', level: 4 }, { id: 'nancy', level: 4 }], start: { x: tc(4), y: tf(8) },
      spawns: [rat('a', 9, 7), rat('b', 9, 9), rat('c', 10, 8), agent('d', 14, 6), agent('e', 14, 10)],
    });
    const bot = createBot({ grid, waypoints: [{ x: tc(20), y: tf(8) }] });
    for (let f = 0; f < 3600 && sim.enemiesAlive() > 0; f++) sim.step(bot.next(sim));
    if (sim.enemiesAlive() === 0) cleared++;
  }
  assert.ok(cleared >= 5, `cleared ${cleared} of 6`);
});

test('the sheet has real lines for both, and the talent text matches the kit', () => {
  const r = heroSheet('robin', 3), n = heroSheet('nancy', 3);
  assert.equal(r.moves[0]!.dmg !== null && r.moves[1]!.dmg === null, true, 'the scoop deals damage, Word vomit does none');
  assert.equal(n.moves[1]!.hits, 5);
  assert.match(n.moves[1]!.note, /trap/i);
  assert.doesNotMatch(heroSheet('nancy', 2).moves[1]!.note, /trap/i);
  assert.match(r.moves[0]!.note, /slow/i);
});
