// Flayed Billy (docs/level-9.md, "Billy"): the walk, the charge and the wall stun, the grab and the swap that frees it, the two jabs, rage and
// the two Flayed, and the boss rules. Pinned at 0 HP, the reach and the freed Billy are in tests/billy-pin.test.ts, the bot in
// tests/billy-bot.test.ts.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { SimEvent } from '../src/core/types.ts';
import { confuse, isBoss } from '../src/combat/confuse.ts';
import { hitEnemy } from '../src/combat/damage.ts';
import type { Hero } from '../src/combat/state.ts';
import { idle, inp, ofType, run, sfxIds, tc, tf } from './sim-helpers.ts';
import type { BRig } from './billy-helpers.ts';
import { BILLY, BX, at, bRig, bossView, charger, grabber, park, slotOf, until } from './billy-helpers.ts';

const hurt = (ev: SimEvent[]) => ofType(ev, 'hit').filter((h) => !h.onEnemy);

/** Steps n ticks and records Billy's view, his position and the events of each. */
function track(r: BRig, n: number, input = idle()) {
  return Array.from({ length: n }, (_, f) => {
    const ev = r.sim.step(input);
    return { f, ev, v: bossView(r), x: r.boss.x, y: r.boss.y };
  });
}

test('the numbers: what docs/level-9.md says', () => {
  assert.deepEqual([BILLY.hp, BILLY.atk, BILLY.def, BILLY.speed, BILLY.xp], [700, 30, 6, 1.1, 60]);
  assert.deepEqual([BILLY.windup, BILLY.power, BILLY.weight], [12, 0.6, 4], 'the jab, and a boss shoved a quarter as far');
  assert.deepEqual([BX.jabReach, BX.jabGap, BX.jabRecover], [24, 8, 30]);
  assert.deepEqual([BX.chargeEvery, BX.chargeMin, BX.chargeMax, BX.chargeWindup, BX.chargeSpeed, BX.chargeRange, BX.chargePower, BX.chargeKb], [200, 60, 160, 24, 3.6, 160, 1, 5]);
  assert.deepEqual([BX.stunT, BX.stunMul], [60, 1.5]);
  assert.deepEqual([BX.grabReach, BX.grabEvery, BX.grabWindup, BX.holdT, BX.throwPower, BX.throwKb], [26, 240, 16, 50, 1, 6]);
  assert.deepEqual([BX.rageAt, BX.chargeLow, BX.rageSpeed, BX.call], [0.5, 140, 4.2, 2]);
  assert.deepEqual([BX.reachR, BX.reachRise, BX.reachFall], [32, 60, 120]);
});

test('boss bar: nothing while he sleeps, then BILLY with his HP', () => {
  const r = bRig();
  r.boss.dormant = true;
  assert.equal(r.sim.view().hud.boss, null);
  r.boss.dormant = false;
  assert.deepEqual(r.sim.view().hud.boss, { name: 'BILLY', hp: 700, hpMax: 700 });
  r.boss.hp = 321.2;
  assert.deepEqual(r.sim.view().hud.boss, { name: 'BILLY', hp: 322, hpMax: 700 });
});

// ------------------------------------------------------------------ walk

test('walk: he comes straight at the active hero at 1.1 px a frame and faces him', () => {
  const r = bRig({ god: false });
  r.b.chargeCd = 99999; r.b.grabCd = 99999;
  const x0 = r.boss.x;
  at(r, tc(4), r.boss.y);
  run(r.sim, 30);
  assert.ok(Math.abs(x0 - r.boss.x - 30 * 1.1) < 1.5, `he moved ${x0 - r.boss.x} px in 30 frames`);
  assert.equal(r.boss.y, tf(7));
  assert.equal(bossView(r)?.dir, 'left');
  assert.equal(bossView(r)?.anim, 'walk');
  assert.equal(bossView(r)?.pose, undefined);
});

// ------------------------------------------------------------------ the charge

test('charge: 24 frames of "!" in pose charge, then a run at 3.6 px a frame for at most 160 px, and no stun when it finds nothing', () => {
  // God mode: the hero stays in the line, and a hit would freeze the frame. Open floor for 160 px: the run finds no wall.
  const r = charger(100, { god: true });
  const x0 = r.boss.x;
  const frames = track(r, 24 + 60);
  const wind = frames.filter((f) => f.v?.alert);
  assert.equal(wind.length, 24);
  assert.ok(wind.every((f) => f.v?.pose === 'charge' && f.x === x0), 'planted, in the pose');
  assert.ok(sfxIds(wind[0]?.ev ?? []).includes('alert'));
  const running = frames.filter((f) => f.v?.pose === 'charge' && !f.v.alert);
  assert.equal(running.length, Math.ceil(160 / 3.6), 'a run of 45 frames');
  assert.ok(sfxIds(running[0]?.ev ?? []).includes('lunge'));
  assert.ok(running.every((f) => f.v?.anim === 'dash'));
  for (let i = 1; i < running.length; i++) {
    assert.ok(Math.abs((running[i - 1] as (typeof running)[number]).x - (running[i] as (typeof running)[number]).x - 3.6) < 1e-9, `step ${i}`);
  }
  const ran = x0 - (running[running.length - 1] as (typeof running)[number]).x;
  assert.ok(ran <= 160 && ran > 160 - 3.6 * 2, `ran ${ran} px`);
  assert.equal(sfxIds(frames.flatMap((f) => f.ev)).includes('thud'), false);
  assert.equal(frames.some((f) => f.v?.pose === 'stun'), false);
  assert.equal(frames.at(-1)?.v?.pose, undefined, 'and then he is walking or recovering');
});

test('charge: aimed where the hero stands when the "!" ends, not where he stood when it began', () => {
  const r = charger(100);
  const y0 = r.boss.y;
  // The hero strolls 40 px south during the wind-up.
  for (let i = 0; i < 24; i++) { r.hero.y += 40 / 24; r.sim.step(idle()); }
  at(r, r.hero.x, y0 + 40);
  r.sim.step(idle());
  assert.equal(r.b.move, 'run');
  const a = Math.atan2(r.hero.y - r.boss.y, r.hero.x - r.boss.x);
  assert.ok(Math.abs(r.boss.ax - Math.cos(a) * 3.6) < 0.05 && Math.abs(r.boss.ay - Math.sin(a) * 3.6) < 0.05, `${r.boss.ax}, ${r.boss.ay}`);
  assert.ok(r.boss.ay > 0.5, 'south-west, not due west');
  // The hero walks off the line and it does not follow.
  at(r, r.hero.x, y0 - 60);
  const ay = r.boss.ay;
  run(r.sim, 5);
  assert.equal(r.boss.ay, ay);
});

test('charge: only with the hero 60 to 160 px away and a clear line, and about 200 frames apart', () => {
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
  assert.equal(starts(158), true, 'just inside 160');
  assert.equal(starts(64), true, 'and just outside 60');
  assert.equal(starts(170), false, 'too far: he walks in first');
  assert.equal(starts(50), false, 'too close: he jabs and grabs instead');
  assert.equal(starts(100, true), false, 'no line');
  const r = charger(100, { god: true });
  until(r, () => r.b.move === 'recover', 200);
  assert.ok(r.b.chargeCd >= 180 && r.b.chargeCd <= 220, `${r.b.chargeCd} frames to the next`);
});

test('charge: a hero in the way is hurt once (power 1.0, knockback 5) and the run goes on through him', () => {
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
  // Power 1.0 of ATK 30 less half Mike's DEF 12: 21 to 27 (a jab, at 0.6, is 10 to 14).
  assert.ok(hp0 - r.hero.hp >= 21 && hp0 - r.hero.hp <= 27, `${hp0 - r.hero.hp}`);
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

test('wall stun: a charge that meets a wall stuns him for 60 frames, pose stun, thud, a shake', () => {
  const r = wallRig();
  const { ev } = until(r, () => r.b.move === 'stun');
  assert.ok(sfxIds(ev).includes('thud'));
  assert.ok(r.s.shake > 0);
  assert.equal(r.b.t, 60);
  assert.equal(bossView(r)?.pose, 'stun');
  assert.equal(bossView(r)?.anim, 'hurt');
  const x = r.boss.x;
  const frames = track(r, 59);
  assert.ok(frames.every((f) => f.v?.pose === 'stun' && f.x === x), 'stands there');
  assert.ok(frames.every((f) => f.v?.alert === false && hurt(f.ev).length === 0), 'and attacks nothing');
  run(r.sim, 2);
  assert.equal(r.b.move, 'walk');
  assert.equal(bossView(r)?.pose, undefined);
});

test('wall stun: he takes x1.5 from every side while stunned', () => {
  const dmg = (stunned: boolean): number => {
    const r = bRig({ seed: 9, god: false });
    park(r, tc(10), tf(7));
    if (stunned) { r.b.move = 'stun'; r.b.t = 60; }
    at(r, r.boss.x - 20, r.boss.y);
    return hitEnemy(r.s, r.hero, r.boss, { power: 1, noCrit: true });
  };
  const plain = dmg(false), stunned = dmg(true);
  assert.ok(plain >= 8, `${plain}`);
  assert.equal(stunned, Math.round(plain * 1.5));
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

test('grab: inside 26 px, 16 frames under the "!" in pose grab, then 50 frames of hold, and a throw of power 1.0 and knockback 6', () => {
  const r = grabber(20);
  const frames = track(r, 16 + 1);
  const ev = frames.flatMap((f) => f.ev);
  const wind = frames.filter((f) => f.v?.alert);
  assert.equal(wind.length, 16);
  assert.ok(wind.every((f) => f.v?.pose === 'grab'));
  assert.ok(sfxIds(wind[0]?.ev ?? []).includes('alert'));
  assert.ok(r.s.hold, 'he has hold of him');
  assert.ok(sfxIds(ev).includes('grab'));
  assert.equal(hurt(ev).length, 0, 'the grab itself does not hurt');
  // The hold: the hero cannot walk or attack for 50 frames, and the pose stays with no "!".
  const hp0 = r.hero.hp;
  const held = track(r, 49, inp({ mx: -1, attackPressed: true }));
  assert.ok(held.every((f) => f.v?.pose === 'grab' && f.v.alert === false && f.v.anim === 'attack'));
  assert.ok(held.every((f) => hurt(f.ev).length === 0), 'no damage while he holds');
  assert.ok(Math.abs(r.hero.x - (r.boss.x - 20)) < 0.5, 'and the hero did not move');
  assert.equal(r.hero.hp, hp0);
  const end = track(r, 2);
  assert.equal(end.flatMap((f) => hurt(f.ev)).length, 1, 'the throw');
  assert.equal(r.s.hold, null);
  assert.ok(sfxIds(end.flatMap((f) => f.ev)).includes('slam'));
  assert.ok(r.hero.vx < -2 || r.hero.x < r.boss.x - 25, 'thrown away from him');
  // Power 1.0, not the jab's 0.6: 21 to 27 against Mike's DEF 12.
  assert.ok(hp0 - r.hero.hp >= 21 && hp0 - r.hero.hp <= 27, `${hp0 - r.hero.hp}`);
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
  // 20 px to 60 px in 15 frames: out of the 28 px the grab still takes.
  for (let i = 0; i < 15; i++) { r.hero.x -= 2.7; r.sim.step(idle()); }
  run(r.sim, 3);
  assert.equal(r.s.hold, null);
  assert.equal(r.b.move, 'recover');
});

test('grab: only inside 26 px, and the next is about 240 frames after the "!" began', () => {
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
  assert.ok(startedAt > 20 && startedAt <= 26 + 1.2, `he began the grab at ${startedAt.toFixed(1)} px`);
  assert.ok(r.b.grabCd >= 216 && r.b.grabCd <= 264, `${r.b.grabCd} frames to the next`);
});

// ------------------------------------------------------------------ the jabs

test('jabs: inside 24 px, 12 frames under the "!", two hits of power 0.6 eight frames apart, then 30 frames of recovery', () => {
  const r = bRig({ god: false });
  r.b.chargeCd = 99999; r.b.grabCd = 99999; r.boss.cd = 0;
  at(r, r.boss.x - 20, r.boss.y);
  // The first hit freezes the frame for 3 ticks of hit-stop, which the sim's own clock counts and the move's does not.
  const HITSTOP = 3;
  const frames = track(r, 12 + 8 + HITSTOP + 2);
  const wind = frames.filter((f) => f.v?.alert);
  assert.equal(wind.length, 12);
  assert.ok(wind.every((f) => f.v?.pose === undefined));
  const hits = frames.filter((f) => hurt(f.ev).length > 0);
  assert.equal(hits.length, 2, 'two hits land');
  const last = (hits[1] as (typeof hits)[number]).f;
  assert.equal(last - (hits[0] as (typeof hits)[number]).f, 8 + HITSTOP, 'eight ticks apart');
  // Power 0.6 of ATK 30 less half Mike's DEF 12: 10 to 14.
  for (const f of hits) assert.ok(hurt(f.ev)[0]!.dmg >= 10 && hurt(f.ev)[0]!.dmg <= 14, `a jab does ${hurt(f.ev)[0]!.dmg}`);
  assert.equal(r.b.move, 'recover');
  // 30 ticks of recovery (plus the second hit's hit-stop): nothing starts, and he walks on after.
  const alerts: boolean[] = [];
  const n = until(r, () => { alerts.push(bossView(r)?.alert === true); return r.b.move === 'walk'; }, 60).frames;
  assert.ok(alerts.every((a) => !a), 'no new "!" while he recovers');
  assert.equal(frames.length - 1 - last + n, 30 + HITSTOP);
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

test('rage: at half HP he calls two Flayed round him in group billys, awake at once, 1 XP each, and charges every 140 frames at 4.2 px a frame', () => {
  const r = bRig({ god: false });
  park(r, tc(11), tf(7));
  at(r, 50, tf(7));
  assert.equal(r.s.enemies.filter((e) => e.group === 'billys').length, 0);
  r.boss.hp = r.boss.hpMax * 0.5 + 1;
  hitEnemy(r.s, r.hero, r.boss, { power: 1, noCrit: true });
  const ev = run(r.sim, 6);
  assert.equal(r.b.raged, true);
  const called = r.s.enemies.filter((e) => e.group === 'billys');
  assert.equal(called.length, 2);
  for (const f of called) {
    assert.deepEqual([f.kind, f.xp, f.drop, f.rt, f.aware, f.dormant], ['flayed', 1, 0, 'howl', true, false]);
    assert.ok(Math.hypot(f.x - r.boss.x, f.y - r.boss.y) < 80, 'round him');
  }
  assert.ok(sfxIds(ev).includes('roar'));
  // Once only.
  hitEnemy(r.s, r.hero, r.boss, { power: 1, noCrit: true });
  run(r.sim, 6);
  assert.equal(r.s.enemies.filter((e) => e.group === 'billys').length, 2);
  // A charge in rage runs at 4.2 px a frame, for at most 160 px, and the next is 126 to 154 frames after it (not 180 to 220).
  r.s.enemies = r.s.enemies.filter((e) => e.group !== 'billys');
  r.b.move = 'walk'; r.b.t = 0; r.boss.mode = 'chase';
  r.b.chargeCd = 0; r.boss.cd = 99999; r.b.grabCd = 99999;
  at(r, r.boss.x - 100, r.boss.y);
  until(r, () => r.b.move === 'run');
  assert.ok(Math.abs(Math.hypot(r.boss.ax, r.boss.ay) - 4.2) < 1e-9);
  assert.equal(r.b.t, Math.ceil(160 / 4.2));
  until(r, () => r.b.move !== 'run', 80);
  assert.ok(r.b.chargeCd >= 126 - 2 && r.b.chargeCd <= 154, `${r.b.chargeCd}`);
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
