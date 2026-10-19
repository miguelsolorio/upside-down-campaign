// The Creel ghoul and its mirror (docs/level-11.md, "The ghoul" and "Mirrors and the clock"): it waits in the glass until its group is awake and a
// hero comes near, steps out one at a time, drifts, lunges, takes more in the light and dies as glass; a mirror that breaks takes the ghouls in
// it along, for nothing. The bot's lunge dodge is at the bottom.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { Sim, SimEvent, SimSpawn } from '../src/core/types.ts';
import { ENEMY_DEFS } from '../src/enemies/index.ts';
import { createBot } from '../src/combat/bot.ts';
import { createGhoulSense } from '../src/combat/bot_ghoul.ts';
import { hitEnemy, rollDamage } from '../src/combat/damage.ts';
import type { Enemy, Hero, S } from '../src/combat/state.ts';
import { arena, idle, inp, makeWhite, ofType, press, run, sfxIds, tc, tf } from './sim-helpers.ts';

const X = ENEMY_DEFS.ghoul.x;
const hero = (s: S, i = 0): Hero => s.heroes[i] as Hero;
const ghoulOf = (s: S, id: string): Enemy => s.enemies.find((e) => e.id === id) as Enemy;
const steady = (s: S): void => { s.rng = () => 0.5; };
const hurt = (ev: SimEvent[]) => ofType(ev, 'hit').filter((h) => !h.onEnemy);
const visible = (sim: Sim) => sim.view().actors.filter((a) => a.kind === 'enemy' && a.id === 'ghoul');

/** A mirror on tiles (10, 5) and (11, 5), 32 by 16, with its foot at y 96. */
const MIRROR: SimSpawn = { kind: 'prop', id: 'm1', prop: 'mirror', tx: 10, ty: 5, w: 32, h: 16 };
const ghoul = (id: string, tx: number, extra: Partial<Extract<SimSpawn, { kind: 'enemy' }>> = {}): SimSpawn =>
  ({ kind: 'enemy', id, type: 'ghoul', tx, ty: 6, group: 'house', mirror: 'm1', ...extra });

/** Mike (Lv 6) well out of the mirror's sight by default, 106 px below its foot. */
function rig(spawns: SimSpawn[], over: Parameters<typeof makeWhite>[0] = {}) {
  const r = makeWhite({ party: [{ id: 'mike', level: 6 }], start: { x: tc(10), y: tf(13) }, spawns: [MIRROR, ...spawns], ...over });
  steady(r.s);
  return r;
}
/** A ghoul that is out of its mirror already, hunting, with its first attack ready. */
function bringOut(e: Enemy): void {
  e.dormant = false; e.aware = true; e.mode = 'chase'; e.cd = 0;
  e.ghoul!.move = 'drift'; e.ghoul!.sx = e.x; e.ghoul!.sy = e.y;
}
/** Puts the hero 58 px below the mirror, in the open. */
const approach = (r: ReturnType<typeof rig>): void => r.sim.dev.teleport(tc(10), tf(9));

test('in the glass: not in the view, not hittable, not aware, and still alive for a group', () => {
  const r = rig([ghoul('g1', 10)]);
  run(r.sim, 30);
  assert.equal(visible(r.sim).length, 0, 'not drawn');
  assert.equal(r.sim.enemiesAlive('house'), 1, 'but it counts');
  assert.equal(r.sim.aggro(), false, 'and the music does not know it is there');
  const e = ghoulOf(r.s, 'g1');
  assert.equal(hitEnemy(r.s, hero(r.s), e, { power: 5 }), 0, 'a hit finds nothing');
  assert.equal(e.hp, e.hpMax);
  assert.equal(r.sim.view().props.find((p) => p.id === 'm1')?.k, 1, 'the mirror shows all of its ghouls inside');
  assert.deepEqual([ENEMY_DEFS.ghoul.hp, ENEMY_DEFS.ghoul.atk, ENEMY_DEFS.ghoul.def, ENEMY_DEFS.ghoul.speed, ENEMY_DEFS.ghoul.xp], [175, 60, 4, 0.8, 14]);
});

test('it steps out when its group is awake and a hero is within 80 px of the mirror with a clear line, not before', () => {
  // A dormant group stays in the glass with the hero beside it, and steps out once woken.
  const sleeper = rig([ghoul('g1', 10, { dormant: true })]);
  approach(sleeper);
  run(sleeper.sim, 100);
  assert.equal(visible(sleeper.sim).length, 0);
  sleeper.sim.spawnGroup('house');
  run(sleeper.sim, 3);
  assert.equal(visible(sleeper.sim).length, 1, 'woken, it steps out');
  // Too far: 92 px from the mirror's edge. Then 70.
  const far = rig([ghoul('g1', 10)]);
  far.sim.dev.teleport(tc(10), 96 + 92);
  run(far.sim, 60);
  assert.equal(visible(far.sim).length, 0, '92 px is out of sight');
  far.sim.dev.teleport(tc(10), 96 + 70);
  run(far.sim, 3);
  assert.equal(visible(far.sim).length, 1, '70 px is in');
  // A wall between them: no line.
  const walled = rig([ghoul('g1', 10)], { grid: arena(24, 16, Object.fromEntries([8, 9, 10, 11, 12, 13].map((x) => [`${x},7`, 'T']))) });
  approach(walled);
  run(walled.sim, 120);
  assert.equal(visible(walled.sim).length, 0, 'no clear line, no ghoul');
});

test('stepping out: pose rise for 40 frames, the ghoul sfx, and it can be hit while it rises', () => {
  const r = rig([ghoul('g1', 10)]);
  approach(r);
  const ev = r.sim.step(inp());
  assert.ok(sfxIds(ev).includes('ghoul'));
  const poses: (string | undefined)[] = [visible(r.sim)[0]?.pose];
  for (let f = 0; f < 60; f++) { run(r.sim, 1); poses.push(visible(r.sim)[0]?.pose); }
  const rising = poses.filter((p) => p === 'rise').length;
  assert.ok(rising >= 39 && rising <= 41, `rising for ${rising} frames`);
  assert.equal(poses[poses.length - 1], undefined, 'then it is out');
  const e = ghoulOf(r.s, 'g1');
  assert.ok(Math.abs(e.x - tc(10)) < 20 && Math.abs(e.y - tf(6)) < 24, 'at the mirror\'s foot');
  // A second ghoul in a fresh rig, hit while it rises.
  const hitRig = rig([ghoul('g1', 10)]);
  approach(hitRig);
  run(hitRig.sim, 10);
  assert.equal(ghoulOf(hitRig.s, 'g1').ghoul?.move, 'rise');
  assert.ok(hitEnemy(hitRig.s, hero(hitRig.s), ghoulOf(hitRig.s, 'g1'), { power: 1 }) > 0, 'it can be hit');
});

test('one ghoul at a time per mirror: the next waits 90 frames after the last stepped out', () => {
  const r = rig([ghoul('g1', 10), ghoul('g2', 11)]);
  approach(r);
  const out: number[] = [];
  r.sim.dev.god = true;
  for (let f = 0; f < 200; f++) {
    run(r.sim, 1);
    const n = visible(r.sim).length;
    while (out.length < n) out.push(f);
  }
  assert.equal(out.length, 2);
  assert.ok(out[1]! - out[0]! >= X.gap, `the second came ${out[1]! - out[0]!} frames after the first`);
  assert.ok(out[1]! - out[0]! <= X.gap + 3);
  // Two mirrors do not wait on each other.
  const two = rig([{ kind: 'prop', id: 'm2', prop: 'mirror', tx: 12, ty: 5, w: 32, h: 16 }, ghoul('g1', 10), ghoul('g2', 12, { mirror: 'm2' })]);
  approach(two);
  run(two.sim, 3);
  assert.equal(visible(two.sim).length, 2);
});

test('it drifts at the hero bobbing 1 to 3 px, round a wall, and gives up nothing', () => {
  // A wall between the mirror and the hero, open at the east end: the ghoul has to go round it.
  const marks: Record<string, string> = {};
  for (let x = 4; x <= 14; x++) marks[`${x},8`] = 'T';
  const r = rig([ghoul('g1', 10)], { grid: arena(24, 16, marks) });
  r.sim.dev.god = true;
  r.sim.dev.teleport(tc(10), tf(12));
  // It needs a line to step out: put the hero at the mirror's foot first, then behind the wall.
  r.sim.dev.teleport(tc(10), tf(7));
  run(r.sim, 3);
  r.sim.dev.teleport(tc(10), tf(11));
  const zs: number[] = [];
  let best = 1e9;
  for (let f = 0; f < 600; f++) {
    run(r.sim, 1);
    const e = ghoulOf(r.s, 'g1');
    if (e.ghoul?.move === 'drift') zs.push(e.z);
    best = Math.min(best, Math.hypot(e.x - hero(r.s).x, e.y - hero(r.s).y));
  }
  assert.ok(best < 40, `it got to ${best.toFixed(0)} px`);
  assert.ok(Math.min(...zs) >= 1 && Math.max(...zs) <= 3, `it bobbed between ${Math.min(...zs).toFixed(1)} and ${Math.max(...zs).toFixed(1)}`);
  assert.ok(Math.max(...zs) - Math.min(...zs) > 1.2, 'and it does bob');
});

test('the lunge: a 24 frame "!", 10 frames at 3.2 px, power 0.8 and a shove of 3, 30 frames to recover', () => {
  const r = rig([ghoul('g1', 10)]);
  const e = ghoulOf(r.s, 'g1');
  // Out already, 30 px south of it with a clear line.
  bringOut(e);
  r.sim.dev.teleport(e.x, e.y + 30);
  const moves: string[] = [];
  const dmg: number[] = [];
  const alerts: boolean[] = [];
  let x0 = 0, y0 = 0, lunged = 0;
  // One round of it: the wind-up, the lunge and the recovery.
  for (let f = 0; f < 140 && !(moves.includes('recover') && e.ghoul!.move === 'drift'); f++) {
    // The touch freezes the field for a few frames of hit-stop, which are not the ghoul's.
    const frozen = r.s.hitstop > 0;
    const ev = r.sim.step(inp());
    for (const h of hurt(ev)) dmg.push(h.dmg);
    if (frozen) continue;
    moves.push(e.ghoul!.move);
    alerts.push(visible(r.sim)[0]?.alert === true);
    if (e.ghoul!.move === 'wind' && x0 === 0) { x0 = e.x; y0 = e.y; }
    if (e.ghoul!.move === 'lunge') lunged++;
  }
  const run0 = (m: string): number => moves.filter((x) => x === m).length;
  assert.equal(alerts.filter(Boolean).length, 24, 'the "!" for 24 frames');
  assert.ok(run0('wind') === 24 || run0('wind') === 25, 'a 24 frame wind-up');
  assert.equal(lunged, 10, 'a lunge of 10 frames');
  assert.equal(run0('recover'), X.recover, 'and 30 to recover');
  assert.equal(dmg.length, 1, 'the touch hurts once');
  assert.equal(dmg[0], Math.max(1, Math.round(0.8 * ENEMY_DEFS.ghoul.atk - hero(r.s).st.def * 0.5)), 'power 0.8 of his ATK');
  assert.ok(e.y - y0 > 10 || Math.hypot(e.x - x0, e.y - y0) > 10, 'it moved along the locked line');
});

test('the lunge covers 3.2 px a frame along the line locked when the "!" began, and a hit breaks the wind-up', () => {
  const r = rig([ghoul('g1', 10)]);
  r.sim.dev.god = true;
  const e = ghoulOf(r.s, 'g1');
  bringOut(e);
  r.sim.dev.teleport(e.x, e.y + 36);
  while (e.ghoul!.move !== 'wind') run(r.sim, 1);
  const ax = e.ax, ay = e.ay;
  // The hero steps aside during the wind-up; the line does not follow him.
  r.sim.dev.teleport(e.x + 40, e.y + 36);
  while (e.ghoul!.move !== 'lunge') run(r.sim, 1);
  const px = e.x, py = e.y;
  run(r.sim, 5);
  assert.ok(Math.abs(Math.hypot(e.x - px, e.y - py) - 5 * X.lungeSpeed) < 1.2, 'it flies 3.2 px a frame');
  assert.ok(Math.abs(ax) < 0.01 && ay > 3, 'straight south, where the hero stood');
  // A hit breaks a wind-up.
  const r2 = rig([ghoul('g1', 10)]);
  const e2 = ghoulOf(r2.s, 'g1');
  bringOut(e2);
  r2.sim.dev.teleport(e2.x, e2.y + 30);
  while (e2.ghoul!.move !== 'wind') run(r2.sim, 1);
  hitEnemy(r2.s, hero(r2.s), e2, { power: 1 });
  assert.notEqual(e2.mode, 'windup', 'the "!" is gone');
  const seen = new Set<string>();
  for (let f = 0; f < 60; f++) { run(r2.sim, 1); seen.add(e2.ghoul!.move); }
  assert.equal(seen.has('lunge'), false, 'and the lunge never comes');
  assert.equal(r2.sim.view().hud.party[0]!.hp, r2.sim.view().hud.party[0]!.hpMax);
});

test('light: inside 48 px of a lit lights prop it takes x1.5, not beside one that is off or out of reach', () => {
  const lights = (id: string, tx: number, ty: number, state: 'open' | 'off'): SimSpawn => ({ kind: 'prop', id, prop: 'lights', tx, ty, state });
  const dmgIn = (spawns: SimSpawn[]): number => {
    const r = rig([ghoul('g1', 10), ...spawns]);
    const e = ghoulOf(r.s, 'g1');
    bringOut(e);
    e.x = tc(10); e.y = tf(8);
    const before = e.hp;
    hitEnemy(r.s, hero(r.s), e, { power: 1, noCrit: true });
    return before - e.hp;
  };
  const plain = rollDamage(1, hero(rig([ghoul('g1', 10)]).s).st.atk, 4, 1);
  assert.equal(dmgIn([]), plain);
  assert.equal(dmgIn([lights('l', 10, 8, 'open')]), Math.round(plain * 1.5), 'a lit string beside it');
  assert.equal(dmgIn([lights('l', 10, 8, 'off')]), plain, 'a string that is off');
  assert.equal(dmgIn([lights('l', 14, 8, 'open')]), plain, 'a lit one 64 px off');
});

test('it dies as glass: a small glass burst, the shatter, and a normal kill worth 14 XP', () => {
  const r = rig([ghoul('g1', 10)]);
  approach(r);
  run(r.sim, 50);
  const e = ghoulOf(r.s, 'g1');
  e.hp = 1;
  hitEnemy(r.s, hero(r.s), e, { power: 5 });
  const ev = run(r.sim, 10);
  assert.deepEqual(ofType(ev, 'kill').map((k) => [k.kind, k.spawnId, k.group, k.xp]), [['ghoul', 'g1', 'house', 14]]);
  assert.ok(sfxIds(ev).includes('shatter'));
  assert.ok(r.sim.view().fx.some((f) => f.kind === 'glass'));
});

test('a ghoul whose spawn stands in the mirror steps out on the open floor at its foot', () => {
  const r = rig([ghoul('g1', 10, { dormant: false })].map((sp) => (sp.kind === 'enemy' ? { ...sp, ty: 5 } : sp)));
  const e = ghoulOf(r.s, 'g1');
  assert.ok(e.y > 80 && e.y < 96, 'its spawn is inside the mirror');
  approach(r);
  run(r.sim, 3);
  assert.equal(e.ghoul?.move, 'rise');
  assert.ok(e.y > 96, `it came out at y ${e.y}, below the mirror's foot`);
  assert.equal(r.sim.view().props.find((p) => p.id === 'm1')?.state, 'closed');
});

test('in the glass it is nobody\'s target: the Crit\'s sweep passes through it, and the burst meter does not wake it', () => {
  const r = rig([ghoul('g1', 10)]);
  r.sim.dev.teleport(tc(10), 96 + 100);
  r.s.burst = 1;
  press(r.sim, { burstPressed: true }, 400);
  assert.equal(ghoulOf(r.s, 'g1').hp, ghoulOf(r.s, 'g1').hpMax);
  assert.equal(ghoulOf(r.s, 'g1').dormant, true);
});

test('Eddie\'s Hellfire DM marks an elite ghoul he hits', () => {
  const r = rig([ghoul('g1', 10, { tier: 'elite' })], { party: [{ id: 'eddie', level: 6 }, { id: 'mike', level: 6 }] });
  steady(r.s);
  const e = ghoulOf(r.s, 'g1');
  bringOut(e);
  e.hp = e.hpMax = 9999;
  r.sim.dev.teleport(e.x - 22, e.y);
  e.stat.stun = 9999;
  press(r.sim, { attackPressed: true, mx: 0.2 }, 24);
  assert.equal(visible(r.sim)[0]?.marked, true);
});

// ------------------------------------------------------------------ the mirror breaks

test('a mirror that shatters kills the ghouls still in it, for no XP and no drop, and the group clears', () => {
  const r = rig([ghoul('g1', 10), ghoul('g2', 11, { dormant: true })]);
  r.s.rng = () => 0;
  const xp0 = r.sim.party()[0]!.xp;
  r.sim.openProp('m1');
  const ev = run(r.sim, 3);
  assert.deepEqual(ofType(ev, 'propCleared').map((p) => p.propId), ['m1']);
  assert.deepEqual(ofType(ev, 'kill').map((k) => [k.spawnId, k.xp]).sort(), [['g1', 0], ['g2', 0]]);
  assert.deepEqual(ofType(ev, 'groupCleared').map((g) => g.group), ['house']);
  assert.equal(r.s.items.length, 0, 'nothing drops, though the roll would have');
  assert.equal(r.sim.party()[0]!.xp, xp0, 'and nobody earns anything');
  assert.equal(r.sim.enemiesAlive('house'), 0);
  assert.equal(visible(r.sim).length, 0, 'no dying ghoul is drawn: they never left the glass');
  assert.ok(sfxIds(ev).includes('shatter'));
  // A kill that is not in the glass does drop, with the same roll.
  const o = rig([ghoul('g1', 10)]);
  o.s.rng = () => 0;
  approach(o);
  run(o.sim, 50);
  ghoulOf(o.s, 'g1').hp = 1;
  hitEnemy(o.s, hero(o.s), ghoulOf(o.s, 'g1'), { power: 5 });
  run(o.sim, 10);
  assert.equal(o.s.items.length, 1, 'a ghoul killed outside does');
});

test('a ghoul already out when its mirror breaks lives on, and the mirror\'s share falls as they step out', () => {
  const r = rig([ghoul('g1', 10), ghoul('g2', 11)]);
  const k = (): number | undefined => r.sim.view().props.find((p) => p.id === 'm1')?.k;
  assert.equal(k(), 1);
  approach(r);
  run(r.sim, 10);
  assert.equal(k(), 0.5, 'one of two is out');
  r.sim.dev.god = true;
  r.sim.openProp('m1');
  const ev = run(r.sim, 3);
  assert.deepEqual(ofType(ev, 'kill').map((x) => x.spawnId), ['g2']);
  assert.equal(r.sim.enemiesAlive('house'), 1);
  assert.equal(k(), undefined, 'a shattered mirror shows nothing in the glass');
  assert.equal(r.s.props[0]?.solid, false);
});

test('Eddie\'s swing shatters the mirror and takes its ghouls, and a retry with the kill list leaves them dead', () => {
  const r = rig([ghoul('g1', 10, { dormant: true }), ghoul('g2', 11, { dormant: true })], { party: [{ id: 'eddie', level: 3 }], start: { x: tc(10), y: tf(7) } });
  steady(r.s);
  const ev = press(r.sim, { attackPressed: true, my: -0.2 }, 24);
  assert.deepEqual(ofType(ev, 'propCleared').map((p) => p.propId), ['m1']);
  const killed = ofType(ev, 'kill').map((k) => k.spawnId);
  assert.deepEqual(killed.slice().sort(), ['g1', 'g2']);
  // The play scene rebuilds the sim from the kill list and the open props.
  const again = rig([ghoul('g1', 10), ghoul('g2', 11)], { skipSpawns: killed, openProps: ['m1'] });
  assert.equal(again.sim.enemiesAlive('house'), 0);
  assert.equal(again.s.props.find((p) => p.id === 'm1')?.state, 'open');
  assert.equal(again.s.props.find((p) => p.id === 'm1')?.solid, false);
});

test('an elite ghoul is drawn elite, with more HP and bite', () => {
  const r = rig([ghoul('g1', 10, { tier: 'elite' })]);
  approach(r);
  run(r.sim, 3);
  assert.equal(visible(r.sim)[0]?.elite, true);
  assert.ok(ghoulOf(r.s, 'g1').hp > ENEMY_DEFS.ghoul.hp * 1.8);
});

// ------------------------------------------------------------------ the bot

/** A ghoul winds up 30 px south of Mike, who stands still or lets the bot's lunge dodge steer. Returns the HP he lost. */
function lungeRun(dodge: boolean): number {
  const r = rig([ghoul('g1', 10)]);
  const e = ghoulOf(r.s, 'g1');
  bringOut(e);
  r.sim.dev.teleport(e.x, e.y + 30);
  const sense = createGhoulSense();
  const open = (): boolean => true;
  const lost0 = hero(r.s).hp;
  for (let f = 0; f < 80; f++) {
    const step = dodge ? sense.dodge(r.sim.view(), hero(r.s).x, hero(r.s).y, open) : null;
    r.sim.step(step ? inp({ mx: step[0], my: step[1] }) : idle());
  }
  return lost0 - hero(r.s).hp;
}

test('bot: steps out of a ghoul\'s lunge line during the wind-up, and a hero who stands still is hit', () => {
  assert.ok(lungeRun(false) > 0, 'standing still costs HP');
  assert.equal(lungeRun(true), 0, 'the dodge costs none');
});

test('bot: clears a room of ghouls on its way, careless or not', () => {
  for (const careless of [false, true]) {
    const grid = arena(24, 16);
    const { sim } = makeWhite({
      grid, party: [{ id: 'mike', level: 7 }, { id: 'dustin', level: 6 }, { id: 'lucas', level: 6 }], start: { x: tc(10), y: tf(13) }, seed: 3,
      spawns: [MIRROR, ghoul('g1', 10), ghoul('g2', 11)],
    });
    const bot = createBot({ grid, waypoints: [{ x: tc(10), y: tf(8) }, { x: tc(18), y: tf(8) }], careless });
    let down = false;
    for (let f = 0; f < 3000 && !down && !(sim.enemiesAlive() === 0 && bot.done()); f++) {
      if (sim.step(bot.next(sim)).some((e) => e.t === 'allDown')) down = true;
    }
    assert.equal(down, false);
    assert.equal(sim.enemiesAlive(), 0, `careless ${careless}: both ghouls are dead`);
  }
});

test('bot: opens a mirror by flag, and the ghouls still asleep in it die with it for nothing', () => {
  const grid = arena(24, 16);
  const { sim } = makeWhite({
    grid, party: [{ id: 'mike', level: 6 }], start: { x: tc(10), y: tf(13) }, seed: 3,
    spawns: [MIRROR, ghoul('g1', 10, { dormant: true }), ghoul('g2', 11, { dormant: true })],
  });
  const bot = createBot({ grid, waypoints: [{ x: tc(10), y: tf(8), open: 'm1' }] });
  const events: SimEvent[] = [];
  for (let f = 0; f < 600 && !bot.done(); f++) events.push(...sim.step(bot.next(sim)));
  events.push(...run(sim, 5));
  assert.deepEqual(ofType(events, 'propCleared').map((e) => e.propId), ['m1']);
  assert.deepEqual(ofType(events, 'kill').map((k) => [k.spawnId, k.xp]).sort(), [['g1', 0], ['g2', 0]]);
  assert.equal(sim.enemiesAlive(), 0);
});
