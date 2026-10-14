// The Demogorgon (docs/level-3.md): stalk and swipe, the charge and its wall stun, and the boss bar. The floor, the pin
// and the finisher are in demogorgon-pin.test.ts, the petals and the leap in demogorgon-phases.test.ts.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { damageRange, hitEnemy } from '../src/combat/damage.ts';
import { arena, ofType, run, sfxIds, tc, tf } from './sim-helpers.ts';
import { DEMO, X, bossRig, bossView, demoAt, only, placeHero, runUntil, sfxOf, takes, track } from './demo-helpers.ts';

test('demogorgon: the contract numbers', () => {
  assert.deepEqual([DEMO.def, DEMO.speed, DEMO.xp, DEMO.windup, DEMO.power, DEMO.drop], [6, 0.8, 60, 30, 1, 1]);
  assert.deepEqual([X.reach, X.kb, X.chargeWindup, X.chargeSpeed, X.chargePower, X.chargeKb, X.stunT, X.stunMul, X.stunsToPin],
    [30, 4, 36, 4.2, 1.2, 5, 150, 1.5, 3]);
  assert.deepEqual([X.petalsAt, X.leapAt, X.flight, X.splash, X.globPower, X.crouch, X.air, X.shock, X.leapPower, X.leapKb, X.leapRecover],
    [0.6, 0.3, 40, 14, 0.8, 30, 45, 40, 1.3, 5, 50]);
  const r = bossRig();
  assert.equal(r.boss.hpMax, Math.round(DEMO.hp * 1.2), 'the stage factor scales its HP like anyone\'s');
});

test('asleep: a dormant Demogorgon does nothing, shows no bar, is not drawn, and still counts as alive', () => {
  // bossRig wakes the group 'boss' only, so one in another group stays down.
  const r = bossRig({ spawns: [demoAt(13, 6, { dormant: true, group: 'sleep' })] });
  const x0 = r.boss.x;
  run(r.sim, 300);
  assert.equal(r.boss.x, x0);
  assert.equal(r.d.move, 'walk');
  assert.equal(r.sim.view().hud.boss, null);
  assert.equal(r.sim.view().actors.some((a) => a.id === 'demogorgon'), false);
  assert.equal(r.sim.enemiesAlive('sleep'), 1);
  r.sim.spawnGroup('sleep');
  assert.equal(r.sim.view().actors.some((a) => a.id === 'demogorgon'), true, 'woken on the beat');
});

test('stalk: it walks at the hero at 0.8 px a frame', () => {
  const r = bossRig();
  only(r, null);
  const x0 = r.boss.x;
  run(r.sim, 50);
  assert.ok(Math.abs(x0 - r.boss.x - 40) < 1.5, `walked ${(x0 - r.boss.x).toFixed(1)} px in 50 frames`);
  assert.equal(bossView(r)?.anim, 'walk');
  assert.equal(bossView(r)?.pose, undefined);
});

test('swipe: 30 frames under the red "!", then an arc 30 px in front for power 1.0 and knockback 4, with a chomp', () => {
  const r = bossRig({ start: { x: tc(13) - 22, y: tf(6) } });
  only(r, 'swipe');
  r.boss.cd = 0;
  const frames = track(r, 90);
  const first = frames.findIndex((t) => t.v?.alert);
  assert.ok(first >= 0 && first < 4, 'it starts at once');
  let len = 0;
  while (frames[first + len]?.v?.alert) len++;
  assert.equal(len, 30);
  const strike = frames[first + 30] as (typeof frames)[number];
  assert.ok(sfxOf(strike.ev).includes('chomp'));
  const hurt = ofType(strike.ev, 'hit').find((h) => !h.onEnemy);
  const range = takes(1, DEMO.atk, r.hero.st.def);
  assert.ok(hurt && hurt.dmg >= range.lo && hurt.dmg <= range.hi, `swipe ${hurt?.dmg}, expected ${range.lo} to ${range.hi}`);
  assert.ok(frames.every((t) => t.v?.pose === undefined), 'no pose: it is a plain swipe');
  assert.ok(frames.slice(first, first + 30).every((t) => t.v?.anim === 'attack' && t.v.alert), 'the wind-up');
  assert.ok(frames[first + 30]?.v?.anim === 'attack' && !frames[first + 30]?.v?.alert, 'then the swing pose, without the "!"');
  run(r.sim, 12);
  assert.ok(tc(13) - 22 - r.hero.x > 8, 'and the hero is thrown back');
});

test('swipe: the swing pose (anim attack, no "!") lasts 12 frames after the strike, then it is idle', () => {
  const r = bossRig({ start: { x: tc(13) - 22, y: tf(6) }, god: true });
  only(r, 'swipe');
  r.boss.cd = 0;
  const frames = track(r, 80);
  const strike = frames.findIndex((t) => sfxOf(t.ev).includes('chomp'));
  let swing = 0;
  while (frames[strike + swing]?.v?.anim === 'attack' && !frames[strike + swing]?.v?.alert) swing++;
  assert.equal(swing, 12);
  assert.equal(frames[strike + 12]?.v?.anim, 'idle');
});

test('swipe: nothing lands on a hero who stepped out of its reach, or round behind it', () => {
  for (const [dx, dy] of [[-48, 0], [22, 0]] as const) {
    const r = bossRig({ start: { x: tc(13) - 22, y: tf(6) } });
    only(r, 'swipe');
    r.boss.cd = 0;
    runUntil(r, () => bossView(r)?.alert === true, 20);
    const bx = r.boss.x, by = r.boss.y;
    r.sim.dev.teleport(bx + dx, by + dy);
    const ev = run(r.sim, 40);
    assert.ok(sfxIds(ev).includes('chomp'), 'it still swings');
    assert.equal(ofType(ev, 'hit').filter((h) => !h.onEnemy).length, 0, `at ${dx},${dy} the swipe finds nobody`);
  }
});

test('charge: planted 36 frames under the "!", then 4.2 px a frame along a straight line until a wall, which stuns it 150 frames', () => {
  const r = bossRig();
  only(r, 'charge');
  r.d.chargeCd = 0;
  const frames = track(r, 260);
  const first = frames.findIndex((t) => t.v?.pose === 'charge');
  let wind = 0;
  while (frames[first + wind]?.v?.alert) wind++;
  assert.equal(wind, 36, 'the wind-up');
  assert.ok(frames.slice(first, first + wind).every((t) => t.v?.pose === 'charge'));
  const bx = tc(13);
  assert.ok(Math.abs((frames[first + 30]?.v?.x ?? 0) - bx) < 2, 'planted while it winds up');
  assert.ok(sfxOf(frames[first + wind]?.ev ?? []).includes('lunge'), 'lunge at the end of the wind-up');
  const x1 = frames[first + wind + 3]?.v?.x ?? 0, x2 = frames[first + wind + 4]?.v?.x ?? 0;
  assert.ok(Math.abs(x1 - x2 - 4.2) < 0.15, `${(x1 - x2).toFixed(2)} px a frame`);
  assert.equal(frames[first + wind + 4]?.v?.alert, false, 'no "!" while it runs');
  const thud = frames.findIndex((t) => sfxOf(t.ev).includes('thud'));
  assert.ok(thud > first + wind + 20, 'it ran a while first');
  assert.ok(Math.abs((frames[thud]?.v?.x ?? 0) - 21) < 1, 'and stopped flush against the west wall');
  let stun = 0;
  while (frames[thud + stun]?.v?.pose === 'stun') stun++;
  assert.equal(stun, 150);
  assert.equal(r.d.stuns, 1);
});

test('charge: hitting the wall shakes the screen', () => {
  const r = bossRig();
  only(r, 'charge');
  r.d.chargeCd = 0;
  runUntil(r, () => r.d.move === 'stun', 600);
  assert.ok(r.s.shake > 3, `shake ${r.s.shake.toFixed(1)}`);
});

test('charge: it aims at where the hero stands when the wind-up ends, not where he stood at the start', () => {
  const r = bossRig();
  only(r, 'charge');
  r.d.chargeCd = 0;
  run(r.sim, 20);
  placeHero(r, 3, 2);
  runUntil(r, () => r.d.move === 'run', 40);
  const x0 = r.boss.x, y0 = r.boss.y;
  run(r.sim, 1);
  const vx = r.boss.x - x0, vy = r.boss.y - y0;
  assert.ok(Math.abs(Math.hypot(vx, vy) - 4.2) < 0.1);
  const want = Math.atan2(r.hero.y - y0, r.hero.x - x0);
  assert.ok(Math.abs(Math.atan2(vy, vx) - want) < 0.05, 'it runs at him, up and to the left');
});

test('charge: a hero in the way takes power 1.2 and knockback 5 once, and the charge does not stop for him', () => {
  const r = bossRig({ start: { x: tc(8), y: tf(6) } });
  only(r, 'charge');
  r.d.chargeCd = 0;
  const frames = track(r, 200);
  const hits = frames.flatMap((t) => ofType(t.ev, 'hit').filter((h) => !h.onEnemy));
  assert.equal(hits.length, 1, 'hurt once');
  const range = takes(1.2, DEMO.atk, r.hero.st.def);
  assert.ok(hits[0] && hits[0].dmg >= range.lo && hits[0].dmg <= range.hi, `charge ${hits[0]?.dmg}, expected ${range.lo} to ${range.hi}`);
  assert.equal(r.d.stuns, 1, 'it ran on to the wall and stunned itself');
  assert.ok(r.boss.x < tc(8), 'past where he stood');
});

test('charge: the stun is 50 percent more damage taken', () => {
  const r = bossRig();
  only(r, null);
  r.boss.hp = r.boss.hpMax = 99999;
  const hit = (): number => hitEnemy(r.s, r.hero, r.boss, { power: 1, noCrit: true });
  const range = damageRange(1, r.hero.st.atk, DEMO.def);
  for (let i = 0; i < 12; i++) {
    const dmg = hit();
    assert.ok(dmg >= range.min && dmg <= range.max, `normal hit ${dmg}`);
  }
  r.d.chargeCd = 0;
  runUntil(r, () => r.d.move === 'stun', 600);
  for (let i = 0; i < 12; i++) {
    const dmg = hit();
    assert.ok(dmg >= Math.round(range.min * 1.5) && dmg <= Math.round(range.max * 1.5), `stunned hit ${dmg}`);
    assert.ok(dmg > range.max, 'and more than any normal hit');
  }
});

test('charge: it comes again about 150 frames after the stun is over', () => {
  const r = bossRig();
  r.d.leapCd = 99999; r.d.spitCd = 99999; r.boss.cd = 99999;
  r.d.chargeCd = 0;
  runUntil(r, () => r.d.move === 'stun', 600);
  runUntil(r, () => r.d.move !== 'stun', 400);
  placeHero(r, 15, 6);
  placeHero(r, r.boss.x < 100 ? 16 : 1, 6);
  const { frames } = runUntil(r, () => r.d.move === 'wind', 400);
  assert.ok(frames >= 130 && frames <= 170, `${frames} frames`);
});

test('poise: a hit does not stagger it, stun it, break its wind-up or move it off a charge; the candy bar does not lure it', () => {
  const r = bossRig();
  only(r, 'charge');
  r.d.chargeCd = 0;
  runUntil(r, () => r.d.move === 'wind', 40);
  const x = r.boss.x;
  hitEnemy(r.s, r.hero, r.boss, { power: 1, kb: 6, angle: Math.PI, stagger: 30, stun: 90, noCrit: true });
  assert.equal(r.boss.stagger, 0);
  assert.equal(r.boss.stat.stun, 0);
  assert.equal(r.boss.mode, 'windup');
  assert.equal(r.d.move, 'wind');
  run(r.sim, 5);
  assert.ok(Math.abs(r.boss.x - x) < 6, 'a heavy shove moves it a little at most');
  runUntil(r, () => r.d.move === 'run', 40);
  const vx = r.boss.vx;
  hitEnemy(r.s, r.hero, r.boss, { power: 1, kb: 6, angle: Math.PI / 2, noCrit: true });
  assert.equal(r.boss.vx, vx, 'and a hit while it runs does not push it');
  assert.equal(r.boss.vy, 0);
  const lure = bossRig();
  only(lure, null);
  lure.s.lure = { x: tc(8), y: tf(2), age: 0, life: 180, pull: 400 };
  for (let i = 0; i < 120; i++) {
    run(lure.sim, 1);
    assert.notEqual(lure.boss.mode, 'lured');
  }
});

test('hits: the stun does not count a wall stun it did not take (Mike\'s third swing, the swap shockwave)', () => {
  const r = bossRig();
  only(r, null);
  hitEnemy(r.s, r.hero, r.boss, { power: 1, stun: 60, noCrit: true });
  assert.equal(r.d.stuns, 0);
  assert.equal(r.d.move, 'walk');
});

test('charge: in the 18 by 12 court every charge ends against a wall, wherever the hero stands', () => {
  for (const [hx, hy] of [[3, 2], [15, 9], [8, 6], [3, 9]] as const) {
    const r = bossRig({ grid: arena(18, 12), start: { x: tc(hx), y: tf(hy) } });
    only(r, 'charge');
    r.d.chargeCd = 0;
    r.sim.dev.god = true;
    runUntil(r, () => r.d.move === 'stun', 600);
    assert.equal(r.d.stuns, 1, `charge at ${hx},${hy}`);
    const x = r.boss.x, y = r.boss.y;
    assert.ok(x < 22 || x > 266 || y < 30 || y > 174, `stopped at ${x.toFixed(0)},${y.toFixed(0)}, against a wall`);
  }
});

test('boss bar: none while it sleeps, DEMOGORGON with its HP while it is awake, and gone when it dies', () => {
  const sleeping = bossRig({ spawns: [demoAt(13, 6, { dormant: true, group: 'sleep' })] });
  assert.equal(sleeping.sim.view().hud.boss, null);
  const r = bossRig();
  assert.deepEqual(r.sim.view().hud.boss, { name: 'DEMOGORGON', hp: r.boss.hpMax, hpMax: r.boss.hpMax });
  r.boss.hp = 200.4;
  assert.deepEqual(r.sim.view().hud.boss, { name: 'DEMOGORGON', hp: 201, hpMax: r.boss.hpMax });
  r.boss.hp = 0;
  run(r.sim, 8);
  assert.equal(r.sim.view().hud.boss, null);
});
