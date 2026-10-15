// Chapter 3's foes (docs/level-7.md, "New enemies", and docs/level-8.md, "The soldier"): the melting rat and its goo, the Flayed with its
// grab and its rise out of the puddle, and the Russian soldier's burst. Grigori is in tests/grigori.test.ts.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { EnemyKind, Sim, SimEvent, SimInput, SimSpawn } from '../src/core/types.ts';
import { ENEMY_DEFS } from '../src/enemies/index.ts';
import { HOLD_BREAK_KB } from '../src/enemies/hold.ts';
import { confuse } from '../src/combat/confuse.ts';
import { damageRange, hitEnemy } from '../src/combat/damage.ts';
import { newProj } from '../src/combat/proj.ts';
import { BODY_Y } from '../src/combat/space.ts';
import type { Enemy, Hero, S } from '../src/combat/state.ts';
import { arena, inp, makeWhite, ofType, run, sfxIds, tc, tf } from './sim-helpers.ts';

const unit = (id: string, type: EnemyKind, tx: number, ty: number, extra: Partial<Extract<SimSpawn, { kind: 'enemy' }>> = {}): SimSpawn =>
  ({ kind: 'enemy', id, type, tx, ty, group: 'g', ...extra });
const foe = (s: S, i = 0): Enemy => s.enemies[i] as Enemy;
const mike = (s: S): Hero => s.heroes[0] as Hero;
const hurt = (ev: SimEvent[]) => ofType(ev, 'hit').filter((h) => !h.onEnemy);
const actor = (sim: Sim, id: string) => sim.view().actors.find((a) => a.kind === 'enemy' && a.id === id);
const dist = (ax: number, ay: number, bx: number, by: number): number => Math.hypot(bx - ax, by - ay);

/** Mike (Lv 7) and Eleven, with HP to spare so a test can read what a move did without the fight ending. */
function rig(spawns: SimSpawn[], over: Parameters<typeof makeWhite>[0] = {}) {
  const r = makeWhite({ party: [{ id: 'mike', level: 7 }, { id: 'eleven', level: 5 }], start: { x: tc(4), y: tf(8) }, spawns, ...over });
  mike(r.s).st.hp = 900;
  mike(r.s).hp = 900;
  return r;
}

test('the numbers: what docs/level-7.md and docs/level-8.md say', () => {
  const m = ENEMY_DEFS.melter, f = ENEMY_DEFS.flayed, so = ENEMY_DEFS.soldier;
  assert.deepEqual([m.hp, m.atk, m.def, m.speed, m.xp, m.windup, m.power], [50, 40, 2, 1.3, 4, 20, 0.75]);
  assert.deepEqual([m.x.range, m.x.lungeT, m.x.lungeSpeed], [34, 11, 3.4]);
  assert.deepEqual([m.x.burst, m.x.power, m.x.slow], [22, 0.5, 60]);
  assert.deepEqual([f.hp, f.atk, f.def, f.speed, f.xp, f.windup, f.power], [140, 40, 4, 0.55, 11, 22, 0.8]);
  assert.deepEqual([f.x.range, f.x.reachT, f.x.recover, f.x.hold, f.x.eliteHold, f.x.kb, f.x.rise], [30, 10, 40, 40, 50, 3, 40]);
  assert.equal(f.x.reachSpeed, 2.4);
  assert.deepEqual([so.hp, so.atk, so.def, so.speed, so.xp, so.windup, so.power, so.cooldown], [90, 38, 5, 0.8, 12, 30, 0.3, 120]);
  assert.deepEqual([so.x.near, so.x.far, so.x.panic, so.x.back, so.x.speed, so.x.range, so.x.burst, so.x.eliteBurst, so.x.gap, so.x.recover], [80, 120, 60, 0.7, 3.2, 180, 3, 5, 6, 50]);
  assert.deepEqual([so.x.butt, so.x.buttWindup, so.x.buttPower, so.x.buttKb], [22, 20, 0.8, 3]);
});

// ------------------------------------------------------------------ the melting rat

test('melting rat: swarms like the rat, a 20 frame wind-up under the "!" and then a bite for power 0.75', () => {
  const { sim, s } = rig([unit('m', 'melter', 7, 8)], { seed: 5 });
  let alerts = 0, longest = 0;
  const dmg: number[] = [];
  for (let f = 0; f < 200 && dmg.length === 0; f++) {
    const ev = sim.step(inp());
    if (actor(sim, 'melter')?.alert) alerts++; else if (alerts) { longest = Math.max(longest, alerts); alerts = 0; }
    for (const h of hurt(ev)) dmg.push(h.dmg);
  }
  assert.equal(Math.max(longest, alerts), ENEMY_DEFS.melter.windup, 'the "!" shows for the wind-up');
  const range = damageRange(0.75, ENEMY_DEFS.melter.atk, mike(s).st.def);
  assert.equal(dmg.length, 1, 'one bite');
  assert.ok(dmg[0]! >= range.min && dmg[0]! <= range.max, `bite of ${dmg[0]}, expected ${range.min} to ${range.max}`);
});

type Rig = ReturnType<typeof rig>;

/**
 * A melting rat at tile (6, 8), standing still, a second one asleep next to it and the hero `gap` px away. `kill` ends the first, and
 * the result is what the burst did over the next few ticks.
 */
function burst(kill: (r: Rig, m: Enemy) => void, gap = 12) {
  const r = rig([unit('m', 'melter', 6, 8), unit('other', 'melter', 6, 9, { dormant: true }), unit('rat', 'rat', 4, 8, { dormant: true })], { start: { x: tc(6) + gap, y: tf(8) }, seed: 3 });
  const [m, other] = [foe(r.s, 0), foe(r.s, 1)];
  m.stat.stun = 99999;
  const hp = mike(r.s).hp, otherHp = other.hp;
  kill(r, m);
  const ev: SimEvent[] = [];
  let slow = 0, goo = 0;
  for (let i = 0; i < 90; i++) {
    ev.push(...r.sim.step(inp()));
    slow = Math.max(slow, mike(r.s).stat.slow);
    goo = Math.max(goo, r.sim.view().fx.filter((f) => f.kind === 'goo').length);
  }
  return { died: !r.s.enemies.includes(m), taken: hp - mike(r.s).hp, goo, sounds: sfxIds(ev), otherSafe: other.hp === otherHp, slow, events: ev, ...r };
}

test('melting rat: it bursts into a 22 px goo when it dies, by a hit, a burn, a bump or the dev panel', () => {
  const causes: Record<string, (r: Rig, m: Enemy) => void> = {
    hit: (r, m) => { m.hp = 1; hitEnemy(r.s, mike(r.s), m, { power: 1 }); },
    burn: (r, m) => { m.hp = 1; m.stat.burn = 40; m.stat.burnTick = 1; m.stat.burnDmg = 5; },
    bump: (r, m) => {
      m.hp = 1;
      const rat = r.s.enemies[2] as Enemy;
      rat.dormant = false; rat.x = m.x + 14; rat.y = m.y;
      confuse(r.s, rat, 600);
    },
    killAll: (r) => { r.sim.dev.killAll(); },
  };
  for (const [name, kill] of Object.entries(causes)) {
    const b = burst(kill);
    assert.ok(b.died, `${name}: it died`);
    assert.equal(ofType(b.events, 'kill').filter((k) => k.kind === 'melter').length >= 1, true, `${name}: a kill event`);
    assert.ok(b.goo >= 1, `${name}: a goo fx`);
    assert.ok(b.sounds.includes('melt'), `${name}: the melt sfx`);
    const heroDef = mike(b.s).st.def;
    const r2 = damageRange(0.5, ENEMY_DEFS.melter.atk, heroDef);
    assert.ok(b.taken >= r2.min && b.taken <= r2.max, `${name}: the hero took ${b.taken}, expected ${r2.min} to ${r2.max}`);
    assert.ok(b.slow > 0 && b.slow <= 60, `${name}: and is slowed (${b.slow})`);
    assert.ok(b.otherSafe || name === 'killAll', `${name}: it hurts nobody else`);
  }
});

test('melting rat: the goo is a goo fx 44 px across, and a hero outside 22 px is not touched', () => {
  const near = rig([unit('m', 'melter', 6, 8)], { start: { x: tc(6) + 10, y: tf(8) }, seed: 3 });
  foe(near.s).stat.stun = 99999;
  foe(near.s).hp = 1;
  hitEnemy(near.s, mike(near.s), foe(near.s), { power: 1 });
  run(near.sim, 6);
  const goo = near.sim.view().fx.find((f) => f.kind === 'goo');
  assert.ok(goo, 'a goo fx');
  assert.equal(goo?.w, 44);
  assert.equal(goo?.h, 22);
  const far = burst((r, m) => { m.hp = 1; hitEnemy(r.s, mike(r.s), m, { power: 1 }); }, 30);
  assert.equal(far.taken, 0, 'a hero 30 px away takes nothing');
  assert.equal(far.slow, 0, 'and is not slowed');
  assert.ok(far.sounds.includes('melt'), 'but the burst still sounds');
});

// ------------------------------------------------------------------ the Flayed

/** A Flayed 18 px east of Mike, awake, with Mike standing still. Returns when the grab lands. */
function grabbed(over: Parameters<typeof makeWhite>[0] = {}, extra: Partial<Extract<SimSpawn, { kind: 'enemy' }>> = {}) {
  const r = rig([unit('f', 'flayed', 6, 8, extra)], { start: { x: tc(6) - 18, y: tf(8) }, seed: 7, ...over });
  const events: SimEvent[] = [];
  let alerts = 0, longest = 0;
  for (let f = 0; f < 300 && !r.s.hold; f++) {
    events.push(...r.sim.step(inp()));
    if (actor(r.sim, 'flayed')?.alert) alerts++; else if (alerts) { longest = Math.max(longest, alerts); alerts = 0; }
  }
  return { ...r, events, windup: longest, f: foe(r.s) };
}

test('Flayed: shambles at the hero at 0.55 px a frame', () => {
  const { sim, s } = rig([unit('f', 'flayed', 9, 8)], { god: true });
  run(sim, 2);
  const x0 = foe(s).x;
  run(sim, 40);
  const v = (x0 - foe(s).x) / 40;
  assert.ok(v > 0.5 && v <= 0.56, `${v.toFixed(3)} px a frame`);
});

test('Flayed: a 22 frame wind-up under the "!", then a reach, and the grab holds the hero for 40 frames', () => {
  const g = grabbed();
  assert.equal(g.windup, ENEMY_DEFS.flayed.windup, 'the "!" shows for the wind-up');
  assert.ok(g.s.hold, 'the grab landed');
  assert.equal(g.s.hold?.by, g.f);
  assert.ok(sfxIds(g.events).includes('grab'), 'the grab sfx');
  const range = damageRange(0.8, ENEMY_DEFS.flayed.atk, mike(g.s).st.def);
  const first = hurt(g.events);
  assert.equal(first.length, 1);
  assert.ok(first[0]!.dmg >= range.min && first[0]!.dmg <= range.max, `grab of ${first[0]!.dmg}, expected ${range.min} to ${range.max}`);
  assert.equal(actor(g.sim, 'flayed')?.pose, 'grab', 'pose grab');
  // Held: the stick and the attack button do nothing.
  const x0 = mike(g.s).x, y0 = mike(g.s).y;
  let held = 0, swung = false;
  const after: SimEvent[] = [];
  while (g.s.hold && held < 100) {
    const ev = g.sim.step(inp({ my: -1, attackPressed: true, attackHeld: true }));
    after.push(...ev);
    if (sfxIds(ev).includes('swing')) swung = true;
    if (g.s.hold) held++;
  }
  assert.ok(held >= 36 && held <= 42, `held for ${held} more ticks`);
  assert.equal(swung, false, 'no swing');
  assert.ok(Math.abs(mike(g.s).y - y0) < 1 && Math.abs(mike(g.s).x - x0) < 1, 'and no step');
  assert.equal(actor(g.sim, 'mike')?.anim ?? 'hurt', 'hurt');
  // The hold ends in a shove away from it, with no second hit.
  assert.deepEqual(hurt(after), [], 'the shove does no damage');
  run(g.sim, 6);
  assert.ok(mike(g.s).x < x0 - 3, `shoved away ${x0 - mike(g.s).x} px`);
});

test('Flayed: after the hold it recovers for 40 frames before it winds up again', () => {
  const g = grabbed();
  while (g.s.hold) g.sim.step(inp());
  let frames = 0;
  while (!actor(g.sim, 'flayed')?.alert && frames < 400) { g.sim.step(inp({ mx: -1 })); frames++; }
  assert.ok(frames >= 40, `${frames} frames to the next wind-up`);
});

test('Flayed: a swap frees the hero, and the one who comes in is invulnerable', () => {
  const g = grabbed();
  assert.ok(g.s.hold);
  g.sim.step(inp({ swapTo: 1 }));
  run(g.sim, 8);
  assert.equal(g.s.hold, null, 'let go');
  assert.equal(g.s.heroes[g.s.active]?.id, 'eleven');
  assert.ok((g.s.heroes[g.s.active]?.invuln ?? 0) > 0, 'invulnerable for a moment');
  const x0 = g.s.heroes[g.s.active]!.x;
  run(g.sim, 5, inp({ mx: -1 }));
  assert.ok(g.s.heroes[g.s.active]!.x < x0 - 2, 'and free to move');
  assert.notEqual(actor(g.sim, 'flayed')?.pose, 'grab');
});

test('Flayed: a hit with knockback 3 or more frees the hero, and a smaller one neither frees him nor staggers it', () => {
  const small = grabbed();
  const x = foe(small.s).x;
  hitEnemy(small.s, mike(small.s), foe(small.s), { power: 1, kb: HOLD_BREAK_KB - 0.1, angle: Math.PI });
  run(small.sim, 4);
  assert.ok(small.s.hold, 'a soft hit changes nothing');
  assert.equal(foe(small.s).x, x, 'it did not move');
  assert.equal(foe(small.s).stagger, 0, 'or stagger');
  const hard = grabbed();
  hitEnemy(hard.s, mike(hard.s), foe(hard.s), { power: 1, kb: HOLD_BREAK_KB, angle: Math.PI });
  run(hard.sim, 4);
  assert.equal(hard.s.hold, null, 'a hard one frees him');
});

test('Flayed: it shambles through light hits on its way in and in its wind-up, and knockback 3 or more stops it', () => {
  // On its way in: a light hit neither moves it nor staggers it.
  const walk = rig([unit('f', 'flayed', 9, 8)], { seed: 3 });
  run(walk.sim, 2);
  const f = foe(walk.s), x0 = f.x;
  hitEnemy(walk.s, mike(walk.s), f, { power: 1, kb: HOLD_BREAK_KB - 0.1, angle: 0 });
  assert.equal(f.stagger, 0, 'no stagger on the walk in');
  assert.equal(f.vx, 0, 'and no shove');
  assert.ok(Math.abs(f.x - x0) < 1);
  // In its wind-up: a light hit leaves the wind-up running, a heavy one breaks it.
  for (const [kb, keeps] of [[HOLD_BREAK_KB - 0.1, true], [HOLD_BREAK_KB, false]] as [number, boolean][]) {
    const r = rig([unit('f', 'flayed', 6, 8)], { seed: 3 });
    let f2 = foe(r.s);
    for (let t = 0; t < 200 && f2.mode !== 'windup'; t++) { r.sim.step(inp()); f2 = foe(r.s); }
    assert.equal(f2.mode, 'windup', 'it winds up');
    hitEnemy(r.s, mike(r.s), f2, { power: 1, kb, angle: 0 });
    assert.equal(f2.mode === 'windup', keeps, keeps ? 'a light hit keeps the wind-up' : 'a heavy one breaks it');
  }
});

test('Flayed: stunned, confused, staggered or killed, it lets go', () => {
  const ways: Record<string, (g: ReturnType<typeof grabbed>) => void> = {
    stun: (g) => { g.f.stat.stun = 30; },
    confuse: (g) => { confuse(g.s, g.f, 120); },
    stagger: (g) => { g.f.stagger = 20; },
    kill: (g) => { g.f.hp = 0; },
  };
  for (const [name, way] of Object.entries(ways)) {
    const g = grabbed();
    assert.ok(g.s.hold, `${name}: held`);
    way(g);
    run(g.sim, 8);
    assert.equal(g.s.hold, null, `${name}: let go`);
    const x0 = mike(g.s).x;
    run(g.sim, 24, inp({ mx: -1 }));
    assert.ok(mike(g.s).x < x0 - 3, `${name}: the hero walks`);
  }
});

test('Flayed: an elite holds for 50 frames', () => {
  const normal = grabbed();
  const elite = grabbed({}, { tier: 'elite' });
  const count = (g: ReturnType<typeof grabbed>): number => { let n = 0; while (g.s.hold && n < 200) { g.sim.step(inp()); n++; } return n; };
  const [a, b] = [count(normal), count(elite)];
  assert.ok(b - a >= 9 && b - a <= 11, `${a} against ${b}`);
});

test('Flayed: a hero who is invulnerable is not grabbed', () => {
  const r = rig([unit('f', 'flayed', 6, 8)], { start: { x: tc(6) - 18, y: tf(8) }, seed: 7 });
  for (let f = 0; f < 200; f++) { mike(r.s).invuln = 30; r.sim.step(inp()); }
  assert.equal(r.s.hold, null);
});

test('Flayed: a dormant one is a goo puddle, and when its group wakes it rises for 40 frames, untouchable, then hunts', () => {
  const r = rig([unit('f', 'flayed', 6, 8, { dormant: true }), unit('awake', 'flayed', 6, 12)], { start: { x: tc(6) - 14, y: tf(8) } });
  const puddle = r.sim.view().actors.filter((a) => a.id === 'flayed');
  assert.equal(puddle.length, 2);
  assert.equal(puddle.filter((a) => a.puddle === true).length, 1, 'only the dormant one is a puddle');
  assert.equal(puddle.find((a) => a.puddle)?.anim, 'idle');
  r.sim.spawnGroup('g');
  const rising: boolean[] = [];
  const hp0 = foe(r.s, 0).hp;
  const damage: number[] = [];
  let untouched = true;
  for (let f = 0; f < 60; f++) {
    const a = r.sim.view().actors.find((x) => x.id === 'flayed' && Math.abs(x.x - foe(r.s, 0).x) < 0.01 && Math.abs(x.y - foe(r.s, 0).y) < 0.01);
    rising.push(a?.pose === 'rise');
    if (a?.pose === 'rise') {
      untouched &&= hitEnemy(r.s, mike(r.s), foe(r.s, 0), { power: 5, kb: 4 }) === 0 && foe(r.s, 0).hp === hp0;
      assert.equal(a.puddle, undefined, 'a rising one is no puddle');
      assert.equal(a.alert, false, 'and does not attack');
    }
    for (const h of hurt(r.sim.step(inp()))) damage.push(h.dmg);
  }
  assert.equal(rising.filter(Boolean).length, 40, 'the pose is rise for 40 frames');
  assert.equal(rising.indexOf(true), 0, 'from the first frame');
  assert.ok(untouched, 'untouchable');
  assert.deepEqual(damage, [], 'and it hurt nobody while it rose');
  assert.equal(r.sim.view().actors.filter((a) => a.puddle === true).length, 0, 'no puddles left');
  // After the rise it winds up on the hero next to it.
  let alerted = false;
  for (let f = 0; f < 120; f++) { r.sim.step(inp()); if (actor(r.sim, 'flayed')?.alert) alerted = true; }
  assert.ok(alerted || r.s.hold !== null, 'then it hunts');
});

test('Flayed: a shot passes through a Flayed that is rising', () => {
  const r = rig([unit('f', 'flayed', 8, 8, { dormant: true })], { start: { x: tc(4), y: tf(8) } });
  r.sim.spawnGroup('g');
  const p = newProj({ kind: 'bullet', mine: true, by: 'mike', x: tc(8) - 20, y: tf(8) - BODY_Y, vx: 3, vy: 0, life: 40, r: 3, power: 5, util: 'shoot' });
  r.s.projs.push(p);
  run(r.sim, 25);
  assert.equal(foe(r.s).hp, foe(r.s).hpMax, 'no damage');
  assert.deepEqual(p.hit, [], 'and the shot did not stop on it');
});

// ------------------------------------------------------------------ the soldier

const SO = ENEMY_DEFS.soldier;
/** A soldier `gap` px east of Mike on open floor, and Mike with HP to spare. */
function soldierRig(gap: number, over: Parameters<typeof makeWhite>[0] = {}, extra: Partial<Extract<SimSpawn, { kind: 'enemy' }>> = {}) {
  const sx = 3;
  const r = rig([unit('so', 'soldier', sx + Math.round(gap / 16), 8, extra)], { grid: arena(32, 16), start: { x: tc(sx), y: tf(8) }, seed: 11, ...over });
  const so = foe(r.s);
  // Put it exactly `gap` px away.
  so.x = mike(r.s).x + gap; so.y = mike(r.s).y; so.hx = so.x; so.hy = so.y;
  return { ...r, so };
}

/** Runs the soldier through one burst and returns the frame of every shot, the "!" length and the bullets seen on the way. */
function burstOf(rigged: ReturnType<typeof soldierRig>, input: (f: number, shotsSoFar: number) => SimInput = () => inp()) {
  const { sim, s } = rigged;
  const shots: number[] = [];
  const bullets: { f: number; id: number; x: number; y: number; angle: number }[] = [];
  let alert = 0, longest = 0, started = false;
  const events: SimEvent[] = [];
  for (let f = 0; f < 400; f++) {
    const ev = sim.step(input(f, shots.length));
    events.push(...ev);
    if (sfxIds(ev).includes('rifle')) shots.push(f);
    if (actor(sim, 'soldier')?.alert) { alert++; started = true; } else if (alert) { longest = Math.max(longest, alert); alert = 0; }
    sim.view().fx.filter((x) => x.kind === 'bullet').forEach((x) => bullets.push({ f, id: Math.round(x.life * 1000 + x.t), x: x.x, y: x.y, angle: x.angle }));
    if (started && shots.length > 0 && foe(s).soldier?.move === 'recover') break;
  }
  return { shots, windup: Math.max(longest, alert), bullets, events };
}

test('soldier: keeps a band, closes in from the edge of its sight, and steps back at 0.7 px a frame when the hero is inside 60', () => {
  const far = soldierRig(128, { god: true });
  run(far.sim, 120);
  const d = dist(far.so.x, far.so.y, mike(far.s).x, mike(far.s).y);
  assert.ok(d >= 76 && d <= 124, `it settled ${d.toFixed(0)} px away`);
  const close = soldierRig(40, { god: true });
  run(close.sim, 1);
  const x0 = close.so.x;
  run(close.sim, 20);
  const v = (close.so.x - x0) / 20;
  assert.ok(v > 0.6 && v <= 0.72, `backed off at ${v.toFixed(2)} px a frame`);
});

test('soldier: a 30 frame wind-up under the "!", then three rounds six frames apart, `rifle` on each, at 3.2 px a frame', () => {
  const b = burstOf(soldierRig(100));
  assert.equal(b.windup, 30, 'the "!" shows for 30 frames');
  assert.equal(b.shots.length, 3, 'three rounds');
  assert.deepEqual(b.shots.slice(1).map((f, i) => f - (b.shots[i] as number)), [6, 6], 'six frames apart');
  // While only the first round is out, follow it from one frame to the next.
  const solo = b.bullets.filter((x) => x.f > b.shots[0]! && x.f < b.shots[1]!);
  const steps = solo.slice(1).map((x, i) => (solo[i] as { x: number }).x - x.x);
  assert.ok(steps.length >= 4);
  for (const st of steps) assert.ok(Math.abs(st - 3.2) < 0.01, `${st.toFixed(3)} px a frame`);
});

test('soldier: each round hits for power 0.45 of its ATK', () => {
  const r = soldierRig(100, { god: false });
  const dmg: number[] = [];
  for (let f = 0; f < 140; f++) for (const h of hurt(r.sim.step(inp()))) dmg.push(h.dmg);
  const range = damageRange(SO.power, SO.atk, mike(r.s).st.def);
  assert.equal(dmg.length, 3, 'all three rounds land on a hero who stands still');
  for (const d of dmg) assert.ok(d >= range.min && d <= range.max, `${d} against ${range.min} to ${range.max}`);
});

test('soldier: the burst does not track. A hero who steps aside after the wind-up is missed', () => {
  const r = soldierRig(100);
  const angles = new Set<string>();
  let hits = 0;
  for (let f = 0; f < 140; f++) {
    // Once the "!" is down, walk straight north.
    const winding = actor(r.sim, 'soldier')?.alert === true;
    const fired = r.s.projs.length > 0;
    const ev = r.sim.step(winding || !fired ? inp() : inp({ my: -1 }));
    hits += hurt(ev).length;
    for (const x of r.sim.view().fx) if (x.kind === 'bullet') angles.add(x.angle.toFixed(4));
  }
  assert.equal(angles.size, 1, 'every round flies along one line');
  assert.equal(hits, 0, 'and a hero who left it is not touched');
});

test('soldier: an elite fires five rounds', () => {
  const b = burstOf(soldierRig(100, {}, { tier: 'elite' }));
  assert.equal(b.shots.length, 5);
  assert.deepEqual(b.shots.slice(1).map((f, i) => f - (b.shots[i] as number)), [6, 6, 6, 6]);
});

test('soldier: the bullet reaches 180 px and no more', () => {
  // Mike stands east of it, in line, then steps aside as the first round leaves, so the round has the whole floor to fly over.
  const r = rig([unit('so', 'soldier', 2, 8)], { grid: arena(40, 16), start: { x: tc(2) + 100, y: tf(8) }, god: true, seed: 11 });
  const muzzle = foe(r.s).x;
  let last = 0, aside = false;
  for (let f = 0; f < 200; f++) {
    r.sim.step(inp(aside ? { my: -1 } : {}));
    const b = r.sim.view().fx.find((x) => x.kind === 'bullet');
    if (b) { aside = true; last = Math.max(last, b.x - muzzle); }
  }
  assert.ok(last >= 170, `it flew ${last.toFixed(0)} px`);
  assert.ok(last <= 192, `and stopped at ${last.toFixed(0)}`);
});

test('soldier: inside 22 px it clubs the hero instead, a 20 frame wind-up then power 0.8 and a shove of 3', () => {
  const r = soldierRig(14, { god: false });
  let alerts = 0, longest = 0;
  const dmg: number[] = [];
  const x0 = mike(r.s).x;
  let shoved = 0;
  const sounds: string[] = [];
  for (let f = 0; f < 60; f++) {
    const ev = r.sim.step(inp());
    sounds.push(...sfxIds(ev));
    if (actor(r.sim, 'soldier')?.alert) alerts++; else if (alerts) { longest = Math.max(longest, alerts); alerts = 0; }
    for (const h of hurt(ev)) { dmg.push(h.dmg); shoved = Math.abs(mike(r.s).vx) + Math.abs(mike(r.s).vy); }
  }
  assert.equal(Math.max(longest, alerts), 20, 'the "!" shows for 20 frames');
  assert.ok(!sounds.includes('rifle'), 'no round was fired');
  const range = damageRange(SO.x.buttPower, SO.atk, mike(r.s).st.def);
  assert.equal(dmg.length, 1);
  assert.ok(dmg[0]! >= range.min && dmg[0]! <= range.max, `${dmg[0]} against ${range.min} to ${range.max}`);
  assert.ok(shoved > 2 && shoved <= 3.2, `shoved at ${shoved.toFixed(2)}`);
  assert.ok(mike(r.s).x < x0, 'away from it');
});

test('soldier: a hit breaks its wind-up, and a burst in progress', () => {
  const r = soldierRig(100, { god: true });
  while (!actor(r.sim, 'soldier')?.alert) r.sim.step(inp());
  run(r.sim, 10);
  hitEnemy(r.s, mike(r.s), r.so, { power: 1, kb: 2 });
  const ev = run(r.sim, 40);
  assert.ok(!sfxIds(ev).includes('rifle'), 'no round came');
  assert.equal(r.so.soldier?.move === 'wind', false);
  // Mid-burst: after the first round.
  const b = soldierRig(100, { god: true });
  let shots = 0;
  while (shots < 1) shots += sfxIds(b.sim.step(inp())).filter((x) => x === 'rifle').length;
  hitEnemy(b.s, mike(b.s), b.so, { power: 1, kb: 2 });
  shots += sfxIds(run(b.sim, 30)).filter((x) => x === 'rifle').length;
  assert.equal(shots, 1, 'the rest of the burst is lost');
});

test('soldier: its bullets stop at solid tiles and at solid props, so cover works for both sides', () => {
  // A wall of pines between them: the bullet stops, the hero behind it is untouched.
  const marks: Record<string, string> = {};
  for (let y = 1; y < 15; y++) marks[`8,${y}`] = 'T';
  const r = soldierRig(100, { grid: arena(32, 16, marks), god: false });
  r.so.x = tc(12); r.so.hx = r.so.x;
  mike(r.s).x = tc(5);
  const p = newProj({ kind: 'bullet', mine: false, x: r.so.x - 4, y: r.so.y - BODY_Y, vx: -SO.x.speed, vy: 0, life: 60, r: 3, power: 1, atk: 30 });
  r.s.projs.push(p);
  let hits = 0;
  for (let f = 0; f < 60; f++) hits += hurt(r.sim.step(inp())).length;
  assert.equal(hits, 0, 'a wall stops it');
  assert.equal(r.s.projs.includes(p), false);
  // A door that shuts after the first round: the rest hit the door.
  const d = soldierRig(100, {
    god: false,
    spawns: [unit('so', 'soldier', 9, 8), { kind: 'prop', id: 'door1', prop: 'door', tx: 6, ty: 7, w: 16, h: 32, state: 'open', solid: false }],
  });
  let shots = 0, dh = 0;
  for (let f = 0; f < 140; f++) {
    const ev = d.sim.step(inp());
    shots += sfxIds(ev).filter((x) => x === 'rifle').length;
    dh += hurt(ev).length;
    if (shots === 1) d.sim.closeProp('door1');
  }
  assert.equal(shots, 3, 'it still fires its three');
  assert.equal(dh, 0, 'but the door took them');
});

test('soldier: behind a wall it has no line, so it does not fire', () => {
  const marks: Record<string, string> = {};
  for (let y = 0; y < 16; y++) marks[`8,${y}`] = 'T';
  const r = rig([unit('so', 'soldier', 12, 8)], { grid: arena(32, 16, marks), start: { x: tc(4), y: tf(8) }, god: true });
  const ev = run(r.sim, 300);
  assert.ok(!sfxIds(ev).includes('rifle'));
});
