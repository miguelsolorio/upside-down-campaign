// Flayed Billy (docs/level-9.md, "Billy"): the walk, the charge and the wall stun, the grab and the swap that frees it, the two jabs, rage and
// the Flayed he calls, and the boss rules. Numbers a retune moves are read from ENEMY_DEFS; the numbers test pins the doc's. Pinned at 0 HP, the reach and the freed Billy are in tests/billy-pin.test.ts, the bot in
// tests/billy-bot.test.ts.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { SimEvent } from '../src/core/types.ts';
import { confuse, isBoss } from '../src/combat/confuse.ts';
import { damageRange, hitEnemy } from '../src/combat/damage.ts';
import type { Hero } from '../src/combat/state.ts';
import { idle, inp, ofType, run, sfxIds, tc, tf } from './sim-helpers.ts';
import type { BRig } from './billy-helpers.ts';
import { BILLY, BX, at, bRig, bossView, charger, grabber, jittered, park, slotOf, until } from './billy-helpers.ts';

const hurt = (ev: SimEvent[]) => ofType(ev, 'hit').filter((h) => !h.onEnemy);

/** Steps n ticks and records Billy's view, his position and the events of each. */
function track(r: BRig, n: number, input = idle()) {
  return Array.from({ length: n }, (_, f) => {
    const ev = r.sim.step(input);
    return { f, ev, v: bossView(r), x: r.boss.x, y: r.boss.y };
  });
}

test('the numbers: what docs/level-9.md says', () => {
  assert.deepEqual([BILLY.hp, BILLY.atk, BILLY.def, BILLY.speed, BILLY.xp], [700, 18, 6, 1.1, 60]);
  assert.deepEqual([BILLY.windup, BILLY.power, BILLY.weight], [12, 0.4, 4], 'the jab, and a boss shoved a quarter as far');
  assert.deepEqual([BX.jabReach, BX.jabGap, BX.jabRecover], [24, 8, 30]);
  assert.deepEqual([BX.chargeEvery, BX.chargeMin, BX.chargeMax, BX.chargeWindup, BX.chargeSpeed, BX.chargeRange, BX.chargePower, BX.chargeKb], [200, 60, 160, 24, 3.6, 160, 0.8, 5]);
  assert.deepEqual([BX.stunT, BX.stunMul], [60, 1.5]);
  assert.deepEqual([BX.grabReach, BX.grabEvery, BX.grabWindup, BX.holdT, BX.throwPower, BX.throwKb], [26, 240, 16, 50, 0.7, 6]);
  assert.deepEqual([BX.rageAt, BX.chargeLow, BX.rageSpeed, BX.call], [0.5, 140, 4.2, 1]);
  assert.deepEqual([BX.reachR, BX.reachRise, BX.reachFall], [32, 60, 120]);
});

test('boss bar: nothing while he sleeps, then BILLY with his HP', () => {
  const r = bRig();
  r.boss.dormant = true;
  assert.equal(r.sim.view().hud.boss, null);
  r.boss.dormant = false;
  assert.deepEqual(r.sim.view().hud.boss, { name: 'BILLY', hp: BILLY.hp, hpMax: BILLY.hp });
  r.boss.hp = 321.2;
  assert.deepEqual(r.sim.view().hud.boss, { name: 'BILLY', hp: 322, hpMax: BILLY.hp });
});

// ------------------------------------------------------------------ walk

test('walk: he comes straight at the active hero at his walk speed and faces him', () => {
  const r = bRig({ god: false });
  r.b.chargeCd = 99999; r.b.grabCd = 99999;
  const x0 = r.boss.x;
  at(r, tc(4), r.boss.y);
  run(r.sim, 30);
  assert.ok(Math.abs(x0 - r.boss.x - 30 * BILLY.speed) < 1.5, `he moved ${x0 - r.boss.x} px in 30 frames`);
  assert.equal(r.boss.y, tf(7));
  assert.equal(bossView(r)?.dir, 'left');
  assert.equal(bossView(r)?.anim, 'walk');
  assert.equal(bossView(r)?.pose, undefined);
});

// ------------------------------------------------------------------ the charge

test('charge: the wind-up under the "!" in pose charge, then a run at charge speed for at most the charge range, and no stun when it finds nothing', () => {
  // God mode: the hero stays in the line, and a hit would freeze the frame. Open floor for 160 px: the run finds no wall.
  const r = charger(100, { god: true });
  const x0 = r.boss.x;
  const frames = track(r, BX.chargeWindup + 60);
  const wind = frames.filter((f) => f.v?.alert);
  assert.equal(wind.length, BX.chargeWindup);
  assert.ok(wind.every((f) => f.v?.pose === 'charge' && f.x === x0), 'planted, in the pose');
  assert.ok(sfxIds(wind[0]?.ev ?? []).includes('alert'));
  const running = frames.filter((f) => f.v?.pose === 'charge' && !f.v.alert);
  assert.equal(running.length, Math.ceil(BX.chargeRange / BX.chargeSpeed), 'the range over the speed, in frames');
  assert.ok(sfxIds(running[0]?.ev ?? []).includes('lunge'));
  assert.ok(running.every((f) => f.v?.anim === 'dash'));
  for (let i = 1; i < running.length; i++) {
    assert.ok(Math.abs((running[i - 1] as (typeof running)[number]).x - (running[i] as (typeof running)[number]).x - BX.chargeSpeed) < 1e-9, `step ${i}`);
  }
  const ran = x0 - (running[running.length - 1] as (typeof running)[number]).x;
  assert.ok(ran <= BX.chargeRange && ran > BX.chargeRange - BX.chargeSpeed * 2, `ran ${ran} px`);
  assert.equal(sfxIds(frames.flatMap((f) => f.ev)).includes('thud'), false);
  assert.equal(frames.some((f) => f.v?.pose === 'stun'), false);
  assert.equal(frames.at(-1)?.v?.pose, undefined, 'and then he is walking or recovering');
});

test('charge: aimed where the hero stands when the "!" ends, not where he stood when it began', () => {
  const r = charger(100);
  const y0 = r.boss.y;
  // The hero strolls 40 px south during the wind-up.
  for (let i = 0; i < BX.chargeWindup; i++) { r.hero.y += 40 / BX.chargeWindup; r.sim.step(idle()); }
  at(r, r.hero.x, y0 + 40);
  r.sim.step(idle());
  assert.equal(r.b.move, 'run');
  const a = Math.atan2(r.hero.y - r.boss.y, r.hero.x - r.boss.x);
  assert.ok(Math.abs(r.boss.ax - Math.cos(a) * BX.chargeSpeed) < 0.05 && Math.abs(r.boss.ay - Math.sin(a) * BX.chargeSpeed) < 0.05, `${r.boss.ax}, ${r.boss.ay}`);
  assert.ok(r.boss.ay > 0.5, 'south-west, not due west');
  // The hero walks off the line and it does not follow.
  at(r, r.hero.x, y0 - 60);
  const ay = r.boss.ay;
  run(r.sim, 5);
  assert.equal(r.boss.ay, ay);
});

test('charge: only with the hero in the charge band and a clear line, and about a charge gap apart', () => {
  /** Does the first tick with the charge due start the wind-up? `pillar` puts a solid crate between them. */
  const starts = (from: number, pillar = false): boolean => {
    const r = charger(from);
    if (pillar) {
      r.s.props.push({
        id: 'p', kind: 'crate', x: r.boss.x - from / 2 - 8, y: r.boss.y - 24, w: 16, h: 48, solid: true, shutSolid: true, state: 'closed',
        t: 0, k: 0, pokeCd: 0, camT: 0, burnT: 0,
      });
    }
    r.sim.step(idle());
    return r.b.move === 'wind';
  };
  assert.equal(starts(100), true);
  assert.equal(starts(BX.chargeMax - 2), true, 'just inside the far edge');
  assert.equal(starts(BX.chargeMin + 4), true, 'and just outside the near one');
  assert.equal(starts(BX.chargeMax + 10), false, 'too far: he walks in first');
  assert.equal(starts(BX.chargeMin - 10), false, 'too close: he jabs and grabs instead');
  assert.equal(starts(100, true), false, 'no line');
  const r = charger(100, { god: true });
  until(r, () => r.b.move === 'recover', 200);
  const [lo, hi] = jittered(BX.chargeEvery);
  assert.ok(r.b.chargeCd >= lo && r.b.chargeCd <= hi, `${r.b.chargeCd} frames to the next`);
});

test('charge: a hero in the way is hurt once, at charge power, and the run goes on through him', () => {
  const r = charger(100);
  until(r, () => r.b.move === 'run');
  const hp0 = r.hero.hp, x0 = r.hero.x;
  const hits = [];
  let passed = false;
  for (let i = 0; i < 60 && !passed; i++) {
    hits.push(...hurt(r.sim.step(idle())));
    passed = r.boss.x < r.hero.x - 12;
  }
  assert.equal(hits.length, 1, 'once');
  // The charge's power of Billy's ATK, less half Mike's DEF.
  const range = damageRange(BX.chargePower, BILLY.atk, r.hero.st.def);
  assert.ok(hp0 - r.hero.hp >= range.min && hp0 - r.hero.hp <= range.max, `${hp0 - r.hero.hp}, not in ${range.min} to ${range.max}`);
  assert.ok(passed, 'and he ran on past him');
  assert.equal(r.b.move, 'run');
  assert.ok(r.hero.x < x0 - 2, 'knocked along the line of the run');
});

/** Billy charges at a hero standing 40 px off the west wall, 100 px away: the run ends in the wall. */
function wallRig(over: Parameters<typeof bRig>[0] = {}): BRig {
  const r = charger(100, over);
  at(r, 56, r.boss.y);
  r.boss.x = 156; r.boss.hx = 156;
  return r;
}

test('wall stun: a charge that meets a wall stuns him for his stun time, pose stun, thud, a shake', () => {
  const r = wallRig();
  const { ev } = until(r, () => r.b.move === 'stun');
  assert.ok(sfxIds(ev).includes('thud'));
  assert.ok(r.s.shake > 0);
  assert.equal(r.b.t, BX.stunT);
  assert.equal(bossView(r)?.pose, 'stun');
  assert.equal(bossView(r)?.anim, 'hurt');
  const x = r.boss.x;
  const frames = track(r, BX.stunT - 1);
  assert.ok(frames.every((f) => f.v?.pose === 'stun' && f.x === x), 'stands there');
  assert.ok(frames.every((f) => f.v?.alert === false && hurt(f.ev).length === 0), 'and attacks nothing');
  run(r.sim, 2);
  assert.equal(r.b.move, 'walk');
  assert.equal(bossView(r)?.pose, undefined);
});

test('wall stun: he takes the stun multiplier from every side while stunned', () => {
  const dmg = (stunned: boolean): number => {
    const r = bRig({ seed: 9, god: false });
    park(r, tc(10), tf(7));
    if (stunned) { r.b.move = 'stun'; r.b.t = BX.stunT; }
    at(r, r.boss.x - 20, r.boss.y);
    return hitEnemy(r.s, r.hero, r.boss, { power: 1, noCrit: true });
  };
  const plain = dmg(false), stunned = dmg(true);
  assert.ok(plain >= 8, `${plain}`);
  assert.equal(stunned, Math.round(plain * BX.stunMul));
});

test('poise: a hit does not break his wind-up, and does not shove him in a run', () => {
  const r = charger(100);
  run(r.sim, 5);
  assert.equal(r.b.move, 'wind');
  hitEnemy(r.s, r.hero, r.boss, { power: 1, kb: 5, angle: Math.PI, noCrit: true });
  run(r.sim, 6);
  assert.equal(r.b.move, 'wind', 'the wind-up stands');
  assert.equal(r.boss.stagger, 0);
  until(r, () => r.b.move === 'run');
  const vx = r.boss.vx;
  hitEnemy(r.s, r.hero, r.boss, { power: 1, kb: 5, angle: 0, noCrit: true });
  assert.equal(r.boss.vx, vx, 'a hit in the run does not shove him');
});

// ------------------------------------------------------------------ the grab

test('grab: inside reach, the wind-up under the "!" in pose grab, then the hold, and a throw at throw power', () => {
  const r = grabber(20);
  const frames = track(r, BX.grabWindup + 1);
  const ev = frames.flatMap((f) => f.ev);
  const wind = frames.filter((f) => f.v?.alert);
  assert.equal(wind.length, BX.grabWindup);
  assert.ok(wind.every((f) => f.v?.pose === 'grab'));
  assert.ok(sfxIds(wind[0]?.ev ?? []).includes('alert'));
  assert.ok(r.s.hold, 'he has hold of him');
  assert.ok(sfxIds(ev).includes('grab'));
  assert.equal(hurt(ev).length, 0, 'the grab itself does not hurt');
  // The hold: the hero cannot walk or attack while he holds, and the pose stays with no "!".
  const hp0 = r.hero.hp;
  const held = track(r, BX.holdT - 1, inp({ mx: -1, attackPressed: true }));
  assert.ok(held.every((f) => f.v?.pose === 'grab' && f.v.alert === false && f.v.anim === 'attack'));
  assert.ok(held.every((f) => hurt(f.ev).length === 0), 'no damage while he holds');
  assert.ok(Math.abs(r.hero.x - (r.boss.x - 20)) < 0.5, 'and the hero did not move');
  assert.equal(r.hero.hp, hp0);
  const end = track(r, 2);
  assert.equal(end.flatMap((f) => hurt(f.ev)).length, 1, 'the throw');
  assert.equal(r.s.hold, null);
  assert.ok(sfxIds(end.flatMap((f) => f.ev)).includes('slam'));
  assert.ok(r.hero.vx < -2 || r.hero.x < r.boss.x - 25, 'thrown away from him');
  // The throw's power of Billy's ATK, less half Mike's DEF, and not the jab's.
  const range = damageRange(BX.throwPower, BILLY.atk, r.hero.st.def);
  assert.ok(hp0 - r.hero.hp >= range.min && hp0 - r.hero.hp <= range.max, `${hp0 - r.hero.hp}, not in ${range.min} to ${range.max}`);
  assert.equal(r.b.move, 'recover');
  assert.equal(bossView(r)?.pose, undefined);
});

test('grab: a swap frees the held hero at once, and the one who comes in is not hurt', () => {
  const r = grabber(20);
  until(r, () => r.s.hold !== null);
  run(r.sim, 10);
  assert.equal(r.s.hold?.hero, r.hero);
  const ev = r.sim.step(inp({ swapTo: slotOf(r, 'dustin') }));
  run(r.sim, 1);
  assert.equal(r.s.hold, null);
  assert.equal(ofType(ev, 'swap').length, 1);
  assert.equal(r.b.move, 'recover', 'he lets go');
  const dustin = r.s.heroes[r.s.active] as Hero;
  assert.equal(dustin.id, 'dustin');
  const hp0 = dustin.hp;
  const rest = run(r.sim, 60);
  assert.equal(hurt(rest).length, 0, 'nobody is thrown');
  assert.equal(dustin.hp, hp0);
});

test('grab: a hero who steps back out of reach during the "!" is not taken', () => {
  const r = grabber(20);
  until(r, () => r.b.move === 'grab');
  // 20 px to 60 px in 15 frames: out of the grab's hit reach.
  for (let i = 0; i < 15; i++) { r.hero.x -= 2.7; r.sim.step(idle()); }
  run(r.sim, 3);
  assert.equal(r.s.hold, null);
  assert.equal(r.b.move, 'recover');
});

test('grab: only inside his grab reach, and the next is about a grab gap after the "!" began', () => {
  const r = bRig({ god: false });
  r.b.chargeCd = 99999;
  r.boss.cd = 99999;
  at(r, r.boss.x - 60, r.boss.y);
  r.b.grabCd = 0;
  // He walks in on a hero who stands still, and the "!" comes the first frame he is inside 26 px.
  let startedAt = -1;
  for (let f = 0; f < 80 && startedAt < 0; f++) {
    r.sim.step(idle());
    if (r.b.move === 'grab') startedAt = Math.hypot(r.boss.x - r.hero.x, r.boss.y - r.hero.y);
  }
  assert.ok(startedAt > BX.grabReach - 6 && startedAt <= BX.grabReach + 1.2, `he began the grab at ${startedAt.toFixed(1)} px`);
  const [lo, hi] = jittered(BX.grabEvery);
  assert.ok(r.b.grabCd >= lo && r.b.grabCd <= hi, `${r.b.grabCd} frames to the next`);
});

// ------------------------------------------------------------------ the jabs

test('jabs: inside jab reach, the wind-up under the "!", two hits at jab power a jab gap apart, then the recovery', () => {
  const r = bRig({ god: false });
  r.b.chargeCd = 99999; r.b.grabCd = 99999; r.boss.cd = 0;
  at(r, r.boss.x - 20, r.boss.y);
  // The first hit freezes the frame for 3 ticks of hit-stop, which the sim's own clock counts and the move's does not.
  const HITSTOP = 3;
  const frames = track(r, BILLY.windup + BX.jabGap + HITSTOP + 2);
  const wind = frames.filter((f) => f.v?.alert);
  assert.equal(wind.length, BILLY.windup);
  assert.ok(wind.every((f) => f.v?.pose === undefined));
  const hits = frames.filter((f) => hurt(f.ev).length > 0);
  assert.equal(hits.length, 2, 'two hits land');
  const last = (hits[1] as (typeof hits)[number]).f;
  assert.equal(last - (hits[0] as (typeof hits)[number]).f, BX.jabGap + HITSTOP, 'a jab gap apart');
  // The jab's power of Billy's ATK, less half Mike's DEF.
  const range = damageRange(BILLY.power, BILLY.atk, r.hero.st.def);
  for (const f of hits) assert.ok(hurt(f.ev)[0]!.dmg >= range.min && hurt(f.ev)[0]!.dmg <= range.max, `a jab does ${hurt(f.ev)[0]!.dmg}, not in ${range.min} to ${range.max}`);
  assert.equal(r.b.move, 'recover');
  // The recovery (plus the second hit's hit-stop): nothing starts, and he walks on after.
  const alerts: boolean[] = [];
  const n = until(r, () => { alerts.push(bossView(r)?.alert === true); return r.b.move === 'walk'; }, 60).frames;
  assert.ok(alerts.every((a) => !a), 'no new "!" while he recovers');
  assert.equal(frames.length - 1 - last + n, BX.jabRecover + HITSTOP);
});

test('jabs: a hero who is out of reach when they come out is not hit', () => {
  const r = bRig({ god: false });
  r.b.chargeCd = 99999; r.b.grabCd = 99999; r.boss.cd = 0;
  at(r, r.boss.x - 20, r.boss.y);
  until(r, () => r.b.move === 'jab');
  at(r, r.boss.x - 60, r.boss.y);
  const ev = run(r.sim, 40);
  assert.equal(hurt(ev).length, 0);
});

// ------------------------------------------------------------------ rage

test('rage: at half HP he calls his Flayed round him in group billys, awake at once, 1 XP each, and charges oftener and faster', () => {
  const r = bRig({ god: false });
  park(r, tc(11), tf(7));
  at(r, 50, tf(7));
  assert.equal(r.s.enemies.filter((e) => e.group === 'billys').length, 0);
  r.boss.hp = r.boss.hpMax * 0.5 + 1;
  hitEnemy(r.s, r.hero, r.boss, { power: 1, noCrit: true });
  const ev = run(r.sim, 6);
  assert.equal(r.b.raged, true);
  const called = r.s.enemies.filter((e) => e.group === 'billys');
  assert.equal(called.length, BX.call);
  for (const f of called) {
    assert.deepEqual([f.kind, f.xp, f.drop, f.rt, f.aware, f.dormant], ['flayed', 1, 0, 'howl', true, false]);
    assert.ok(Math.hypot(f.x - r.boss.x, f.y - r.boss.y) < 80, 'round him');
  }
  assert.ok(sfxIds(ev).includes('roar'));
  // Once only.
  hitEnemy(r.s, r.hero, r.boss, { power: 1, noCrit: true });
  run(r.sim, 6);
  assert.equal(r.s.enemies.filter((e) => e.group === 'billys').length, BX.call);
  // A charge in rage runs at the rage speed, for at most the charge range, and the next comes after the rage gap (not the calm one).
  r.s.enemies = r.s.enemies.filter((e) => e.group !== 'billys');
  r.b.move = 'walk'; r.b.t = 0; r.boss.mode = 'chase';
  r.b.chargeCd = 0; r.boss.cd = 99999; r.b.grabCd = 99999;
  at(r, r.boss.x - 100, r.boss.y);
  until(r, () => r.b.move === 'run');
  assert.ok(Math.abs(Math.hypot(r.boss.ax, r.boss.ay) - BX.rageSpeed) < 1e-9);
  assert.equal(r.b.t, Math.ceil(BX.chargeRange / BX.rageSpeed));
  until(r, () => r.b.move !== 'run', 80);
  const [lo, hi] = jittered(BX.chargeLow);
  assert.ok(r.b.chargeCd >= lo - 2 && r.b.chargeCd <= hi, `${r.b.chargeCd}`);
  assert.ok(r.b.chargeCd < jittered(BX.chargeEvery)[0], 'sooner than a calm Billy');
});

test('rage: not before half HP', () => {
  const r = bRig({ god: false });
  park(r, tc(11), tf(7));
  at(r, 50, tf(7));
  r.boss.hp = r.boss.hpMax * 0.6;
  hitEnemy(r.s, r.hero, r.boss, { power: 1, noCrit: true });
  run(r.sim, 6);
  assert.equal(r.b.raged, false);
  assert.equal(r.s.enemies.filter((e) => e.group === 'billys').length, 0);
});

// ------------------------------------------------------------------ the boss rules

test('boss rules: Word vomit staggers him for 30 frames instead of confusing him, and he loses the wind-up and the hero he held', () => {
  const r = grabber(20);
  until(r, () => r.b.move === 'grab');
  confuse(r.s, r.boss, 180);
  assert.equal(r.boss.stat.confuse, 0);
  assert.equal(r.boss.stagger, 30);
  assert.equal(r.b.move, 'walk', 'the wind-up is gone');
  assert.equal(bossView(r)?.confused, undefined);
  const g = grabber(20);
  until(g, () => g.s.hold !== null);
  confuse(g.s, g.boss, 180);
  run(g.sim, 1);
  assert.equal(g.s.hold, null, 'and a held hero is let go');
  assert.equal(g.boss.stat.confuse, 0);
});

test('boss rules: Robin\'s own Word vomit does the same', () => {
  const r = bRig({ god: false });
  park(r, tc(11), tf(7));
  r.sim.step(inp({ swapTo: slotOf(r, 'robin') }));
  run(r.sim, 24);
  r.sim.dev.teleport(r.boss.x - 30, r.boss.y);
  const robin = r.s.heroes[r.s.active] as Hero;
  robin.mp = robin.st.mp;
  r.sim.step(inp({ mx: 0.2, specialPressed: true }));
  until(r, () => r.s.floaters.some((f) => f.text === 'DAZED'), 60);
  assert.equal(r.boss.stat.confuse, 0);
  assert.ok(r.boss.stagger > 0 && r.boss.stagger <= 30);
  assert.equal(bossView(r)?.confused, undefined);
});

test('boss rules: not in the middle of a run or a wall stun, where he would hang', () => {
  const r = charger(100);
  until(r, () => r.b.move === 'run');
  confuse(r.s, r.boss, 180);
  assert.equal(r.boss.stagger, 0);
  assert.equal(r.boss.stat.confuse, 0);
  const w = wallRig();
  until(w, () => w.b.move === 'stun');
  confuse(w.s, w.boss, 180);
  assert.equal(w.boss.stagger, 0);
});

test('boss rules: he is a boss to the shared code in any group, and Nancy\'s trap does not hold him', () => {
  const r = bRig({ spawns: [{ kind: 'enemy', id: 'billy', type: 'billy', tx: 16, ty: 7, group: 'elsewhere', dormant: true }] });
  assert.equal(isBoss(r.boss), true);
  park(r, tc(11), tf(7));
  r.s.traps.push({ x: r.boss.x, y: r.boss.y, age: 0, life: 600, by: 'nancy' });
  run(r.sim, 10);
  assert.equal(r.boss.stat.stun, 0);
  assert.equal(r.s.traps.length, 1, 'and the trap is still there');
});

test('boss rules: a hit moves him a quarter as far, and never staggers or stuns him', () => {
  const r = bRig({ god: false });
  park(r, tc(11), tf(7));
  at(r, 50, tf(7));
  hitEnemy(r.s, r.hero, r.boss, { power: 1, kb: 4, angle: 0, noCrit: true });
  assert.ok(Math.abs(r.boss.vx - 1) < 1e-9, `${r.boss.vx}: a knockback of 4 over weight 4`);
  assert.equal(r.boss.stagger, 0);
  r.boss.vx = 0;
  hitEnemy(r.s, r.hero, r.boss, { power: 1, kb: 4, angle: 0, noCrit: true, stun: 120, stagger: 40 });
  assert.equal(r.boss.stagger, 0);
  assert.equal(r.boss.stat.stun, 0);
});
