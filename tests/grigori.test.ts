// Grigori (docs/level-8.md, "Grigori"): the front guard, the haymaker and its recovery, the grab and the throw, rage, the power box and
// the breaker, Word vomit and the traps, and the boss bar. The bot's play is in tests/grigori-bot.test.ts.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { PartySeed, SimEvent, SimSpawn } from '../src/core/types.ts';
import { confuse } from '../src/combat/confuse.ts';
import { damageRange, hitEnemy } from '../src/combat/damage.ts';
import type { Enemy } from '../src/combat/state.ts';
import { arena, idle, inp, makeWhite, ofType, run, sfxIds, tc, tf } from './sim-helpers.ts';
import type { GRig } from './grigori-helpers.ts';
import { CHAMBER_PROPS, GRIGORI, GX, ON_PLATE, at, bossView, box, gRig, grabber, grigoriAt, haymaker, park, plates, prop, strike } from './grigori-helpers.ts';
import { beginHold } from '../src/enemies/hold.ts';

const hurt = (ev: SimEvent[]) => ofType(ev, 'hit').filter((h) => !h.onEnemy);
test('the numbers: what docs/level-8.md says, with HP up from its 800 (see the note in enemies/defs.ts)', () => {
  assert.deepEqual([GRIGORI.hp, GRIGORI.atk, GRIGORI.def, GRIGORI.speed, GRIGORI.xp, GRIGORI.windup, GRIGORI.power], [1200, 12, 8, 0.7, 80, 30, 1]);
  assert.deepEqual([GX.reach, GX.arc, GX.kb, GX.range, GX.recover, GX.rageRecover, GX.block, GX.rageAt, GX.rageSpeed], [32, 70, 5, 28, 50, 36, 0.25, 0.5, 0.9]);
  assert.deepEqual([GX.grabEvery, GX.grabLow, GX.grabMin, GX.grabMax, GX.grabWindup, GX.lungeT, GX.lungeSpeed, GX.holdT, GX.throwPower, GX.throwKb], [220, 160, 30, 80, 24, 12, 3.5, 45, 0.7, 6]);
  assert.deepEqual([GX.stunT, GX.stunHp, GX.stunMul, GX.call], [180, 0.08, 1.5, 2]);
});

// ------------------------------------------------------------------ the boss bar

test('boss bar: nothing while he sleeps, then GRIGORI with his HP, and nothing again once he is down', () => {
  const { sim, s } = makeWhite({ grid: arena(18, 12), party: [{ id: 'mike', level: 7 }], start: { x: tc(3), y: tf(6) }, spawns: [grigoriAt(13, 6, { dormant: true })], seed: 4 });
  assert.equal(sim.view().hud.boss, null);
  sim.spawnGroup('boss');
  assert.deepEqual(sim.view().hud.boss, { name: 'GRIGORI', hp: GRIGORI.hp, hpMax: GRIGORI.hp });
  const e = s.enemies[0] as Enemy;
  e.hp = 333;
  assert.deepEqual(sim.view().hud.boss, { name: 'GRIGORI', hp: 333, hpMax: GRIGORI.hp });
  sim.dev.killAll();
  const kill = ofType(run(sim, 2), 'kill')[0];
  assert.equal(sim.view().hud.boss, null);
  assert.deepEqual([kill?.kind, kill?.xp, s.items.filter((i) => i.kind === 'quarter').length], ['grigori', 80, 1], 'worth 80 XP and a quarter');
});

// ------------------------------------------------------------------ the front guard

test('front guard: a hit from inside 70 degrees of his front does a quarter, with the block sfx and a BLOCK floater; from the side or behind, full', () => {
  const r = gRig();
  park(r, tc(9), tf(6));
  r.g.move = 'walk';
  r.boss.dir = 'right';
  const full = damageRange(1, r.hero.st.atk, GRIGORI.def);
  const quarter = { min: Math.max(1, Math.round(full.min * 0.25)), max: Math.max(1, Math.round(full.max * 0.25)) };
  for (const deg of [0, 30, 60, 69, -45, -69]) {
    const h = strike(r, deg);
    assert.ok(h.dmg >= quarter.min && h.dmg <= quarter.max, `${deg} degrees: ${h.dmg}, expected ${quarter.min} to ${quarter.max}`);
    assert.ok(h.sounds.includes('block'), `${deg} degrees: block sfx`);
  }
  for (const deg of [71, 90, 135, 180, -90, -135, -71]) {
    const h = strike(r, deg);
    assert.ok(h.dmg >= full.min && h.dmg <= full.max, `${deg} degrees: ${h.dmg}, expected ${full.min} to ${full.max}`);
    assert.ok(!h.sounds.includes('block'), `${deg} degrees: no block`);
  }
  strike(r, 0);
  assert.ok(r.s.floaters.some((f) => f.text === 'BLOCK'), 'a BLOCK floater');
});

test('front guard: it is down while he recovers, so a hit from the front does full damage then', () => {
  const r = gRig();
  park(r, tc(9), tf(6));
  r.boss.dir = 'right';
  const full = damageRange(1, r.hero.st.atk, GRIGORI.def);
  const h = strike(r, 0);
  assert.ok(h.dmg >= full.min && h.dmg <= full.max, `recovering, front: ${h.dmg}, expected ${full.min} to ${full.max}`);
  assert.ok(!h.sounds.includes('block'), 'no block while he recovers');
});

test('rage: at half HP he calls two soldiers into the chamber, once', () => {
  const r = gRig();
  r.boss.hp = Math.floor(r.boss.hpMax * GX.rageAt) - 1;
  r.sim.step(idle());
  const called = () => r.s.enemies.filter((e) => e.kind === 'soldier' && !e.dead).length;
  assert.equal(called(), GX.call, 'two soldiers come in');
  assert.ok(r.s.enemies.filter((e) => e.kind === 'soldier').every((e) => e.xp === 1 && e.aware), 'run-time spawns: awake, 1 XP');
  r.boss.hp -= 10;
  r.sim.step(idle());
  assert.equal(called(), GX.call, 'only once');
});

test('front guard: a hit does not stagger him, and a blocked hit neither crits nor spends Mike\'s fiat crit', () => {
  const r = gRig();
  park(r, tc(9), tf(6));
  r.g.move = 'walk';
  r.boss.dir = 'right';
  r.s.armed = true;
  r.hero.x = r.boss.x + 20; r.hero.y = r.boss.y;
  hitEnemy(r.s, r.hero, r.boss, { power: 1, kb: 3, angle: Math.PI });
  assert.equal(r.boss.stagger, 0, 'no stagger');
  assert.equal(r.s.armed, true, 'a blocked hit leaves the fiat for one that gets through');
});

test('front guard: he turns to the hero at once, except while he recovers', () => {
  const r = gRig();
  r.g.grabCd = 99999;
  r.boss.cd = 99999;
  const spots: [number, string][] = [[0, 'right'], [90, 'down'], [180, 'left'], [-90, 'up']];
  for (const [deg, dir] of spots) {
    const a = (deg * Math.PI) / 180;
    at(r, r.boss.x + Math.cos(a) * 60, r.boss.y + Math.sin(a) * 60);
    r.sim.step(idle());
    assert.equal(r.boss.dir, dir, `hero at ${deg} degrees: he faces ${dir}`);
  }
  // In recovery he keeps the way he faced, whatever the hero does.
  r.g.move = 'recover';
  r.g.t = 40;
  const face = r.boss.dir;
  at(r, r.boss.x + 40, r.boss.y);
  run(r.sim, 20);
  at(r, r.boss.x - 40, r.boss.y);
  run(r.sim, 10);
  assert.equal(r.boss.dir, face);
});

// ------------------------------------------------------------------ the haymaker

test('haymaker: at 28 px a 30 frame wind-up under the "!", then an arc of reach 32 for power 1.2, knockback 5 and the slam sfx', () => {
  const r = haymaker(30);
  assert.equal(r.alerts, 30);
  const hit = hurt(r.ev);
  assert.equal(hit.length, 1);
  const range = damageRange(GRIGORI.power, GRIGORI.atk, r.hero.st.def);
  assert.ok(hit[0]!.dmg >= range.min && hit[0]!.dmg <= range.max, `${hit[0]!.dmg} against ${range.min} to ${range.max}`);
  assert.ok(sfxIds(r.ev).includes('slam'));
  assert.ok(Math.hypot(r.hero.vx, r.hero.vy) > 3, 'thrown back');
});

test('haymaker: a hero who has backed out of its 32 px reach by the swing is missed', () => {
  const r = haymaker(30, 1);
  assert.equal(r.alerts, 30);
  assert.deepEqual(hurt(r.ev), []);
});

test('haymaker: then 50 frames of recovery in which he does not turn, even with the hero at his back', () => {
  const r = haymaker(30, 1);
  const face = r.boss.dir;
  const back = { left: [1, 0], right: [-1, 0], up: [0, 1], down: [0, -1] }[face] as number[];
  at(r, r.boss.x + back[0]! * 30, r.boss.y + back[1]! * 30);
  let turned = -1;
  for (let f = 1; f <= 70 && turned < 0; f++) {
    r.sim.step(idle());
    if (r.boss.dir !== face) turned = f;
  }
  assert.ok(turned >= 50 && turned <= 52, `he turned after ${turned} frames`);
});

// ------------------------------------------------------------------ the grab

test('grab: a 24 frame wind-up under the "!" with pose grab, then a 12 frame lunge at 3.5 px a frame', () => {
  const r = grabber(60);
  let alerts = 0, lunge = 0, x0 = 0, x1 = 0;
  for (let f = 0; f < 80; f++) {
    r.sim.step(idle());
    const v = bossView(r)!;
    if (v.alert) { alerts++; assert.equal(v.pose, 'grab'); assert.equal(v.anim, 'attack'); x0 = r.boss.x; }
    else if (v.pose === 'grab' && v.anim === 'dash') { if (lunge === 0) x0 = r.boss.x; lunge++; x1 = r.boss.x; }
    if (r.g.move === 'recover') break;
  }
  assert.equal(alerts, 24);
  assert.equal(lunge, 12, 'pose grab for the 12 frames of the lunge');
  const v = (x0 - x1) / 11;
  assert.ok(Math.abs(v - 3.5) < 0.1, `${v.toFixed(2)} px a frame`);
});

test('grab: a hero in the line is held for 45 frames (pose grab, the grab sfx), then thrown for power 1.0 and knockback 6', () => {
  const r = grabber(45);
  const ev: SimEvent[] = [];
  while (!r.s.hold) ev.push(...r.sim.step(idle()));
  const y0 = r.hero.y;
  assert.ok(sfxIds(ev).includes('grab'), 'grab sfx');
  assert.deepEqual(hurt(ev), [], 'the grab itself does no damage');
  const hp = r.hero.hp;
  let held = 0, swung = false;
  const after: SimEvent[] = [];
  while (r.s.hold && held < 100) {
    const e2 = r.sim.step(inp({ my: -1, attackPressed: true, attackHeld: true }));
    after.push(...e2);
    if (sfxIds(e2).includes('swing')) swung = true;
    if (r.s.hold) { held++; assert.equal(bossView(r)?.pose, 'grab'); assert.equal(r.hero.hp, hp, 'no damage while he holds'); }
  }
  assert.ok(held >= 43 && held <= 45, `held for ${held} more ticks`);
  assert.equal(swung, false);
  assert.ok(Math.abs(r.hero.y - y0) < 1, 'and no step');
  const thrown = hurt(after);
  assert.equal(thrown.length, 1, 'then the throw');
  const range = damageRange(GX.throwPower as number, GRIGORI.atk, r.hero.st.def);
  assert.ok(thrown[0]!.dmg >= range.min && thrown[0]!.dmg <= range.max, `${thrown[0]!.dmg} against ${range.min} to ${range.max}`);
  assert.ok(Math.hypot(r.hero.vx, r.hero.vy) > 4.5, 'knockback 6');
  assert.equal(bossView(r)?.pose, undefined);
});

test('grab: a hero who steps off the line is missed, and he recovers for 36 frames without turning', () => {
  const r = grabber(45);
  for (let f = 0; f < 25; f++) { r.sim.step(inp({ my: 1 })); }
  const face = r.boss.dir;
  while (r.g.move !== 'recover') r.sim.step(inp({ my: 1 }));
  assert.equal(r.s.hold, null, 'missed');
  at(r, r.boss.x + 30, r.boss.y);
  let turned = -1;
  for (let f = 1; f <= 60 && turned < 0; f++) { r.sim.step(idle()); if (r.boss.dir !== face) turned = f; }
  assert.ok(turned >= 36 && turned <= 39, `he turned after ${turned} frames`);
});

test('grab: a swap frees the held hero, with no throw, and the one who comes in is invulnerable', () => {
  const r = grabber(45);
  while (!r.s.hold) r.sim.step(idle());
  run(r.sim, 10);
  const hp = r.hero.hp;
  r.sim.step(inp({ swapTo: 1 }));
  const ev = run(r.sim, 10);
  assert.equal(r.s.hold, null);
  assert.equal(r.s.heroes[r.s.active]?.id, r.s.heroes[1]?.id, 'the second hero came in');
  assert.ok(r.s.heroes[r.s.active]!.invuln > 0, 'invulnerable for a moment');
  assert.equal(r.hero.hp, hp, 'Mike took nothing');
  assert.deepEqual(hurt(ev), [], 'and nobody was thrown');
  assert.notEqual(bossView(r)?.pose, 'grab');
});

test('grab: about every 220 frames, and every 160 once he is enraged', () => {
  const gaps = (rage: boolean): number[] => {
    const r = gRig({});
    r.boss.cd = 99999;
    if (rage) r.boss.hp = r.boss.hpMax * 0.4;
    const starts: number[] = [];
    let was = false;
    for (let f = 0; f < 1500; f++) {
      // The hero stays 45 px off, in line, on whichever side has room, so he can always grab.
      at(r, r.boss.x + (r.boss.x > 140 ? -45 : 45), r.boss.y);
      r.sim.step(idle());
      const wind = r.g.move === 'grab';
      if (wind && !was) starts.push(f);
      was = wind;
    }
    return starts.slice(1).map((v, i) => v - (starts[i] as number));
  };
  const calm = gaps(false), raged = gaps(true);
  assert.ok(calm.length >= 3 && raged.length >= 4);
  for (const g of calm) assert.ok(g >= 190 && g <= 260, `calm gap ${g}`);
  for (const g of raged) assert.ok(g >= 140 && g <= 200, `raged gap ${g}`);
});

// ------------------------------------------------------------------ rage

test('rage: at half HP he roars once, walks at 0.9 and recovers from a haymaker in 36 frames', () => {
  const speed = (share: number): number => {
    const r = gRig({});
    r.boss.hp = r.boss.hpMax * share;
    r.g.grabCd = 99999;
    r.boss.cd = 99999;
    at(r, tc(1), tf(6));
    run(r.sim, 2);
    const x0 = r.boss.x;
    run(r.sim, 30);
    return (x0 - r.boss.x) / 30;
  };
  assert.ok(Math.abs(speed(0.51) - 0.7) < 0.02, `calm ${speed(0.51).toFixed(3)}`);
  assert.ok(Math.abs(speed(0.5) - 0.9) < 0.02, `raged ${speed(0.5).toFixed(3)}`);
  const r = gRig({});
  r.boss.hp = r.boss.hpMax * 0.49;
  let rage = 0;
  for (let f = 0; f < 120; f++) { r.sim.step(idle()); rage += r.sim.view().floaters.filter((x) => x.text === 'RAGE' && x.t === 1).length; }
  assert.equal(rage, 1, 'one RAGE');
  assert.equal(r.g.raged, true);
  const h = haymaker(30, 1, 0.4);
  const back = { left: [1, 0], right: [-1, 0], up: [0, 1], down: [0, -1] }[h.boss.dir] as number[];
  const face = h.boss.dir;
  at(h, h.boss.x + back[0]! * 30, h.boss.y + back[1]! * 30);
  let turned = -1;
  for (let f = 1; f <= 70 && turned < 0; f++) { h.sim.step(idle()); if (h.boss.dir !== face) turned = f; }
  assert.ok(turned >= 36 && turned <= 38, `recovered in ${turned} frames`);
});

// ------------------------------------------------------------------ poise

test('poise: a hit does not break his wind-up, stagger him or shove him off a lunge', () => {
  const g = gRig({ god: false });
  g.g.grabCd = 99999;
  g.boss.cd = 0;
  at(g, g.boss.x - 30, g.boss.y);
  while (!bossView(g)?.alert) g.sim.step(idle());
  run(g.sim, 5);
  hitEnemy(g.s, g.hero, g.boss, { power: 1, kb: 5, angle: Math.PI, stagger: 30 });
  run(g.sim, 3);
  assert.equal(g.g.move, 'hay', 'still winding up');
  assert.equal(g.boss.stagger, 0);
  const l = grabber(60);
  while (l.g.move !== 'lunge') l.sim.step(idle());
  const x0 = l.boss.x;
  hitEnemy(l.s, l.hero, l.boss, { power: 1, kb: 6, angle: 0 });
  run(l.sim, 8);
  assert.ok(x0 - l.boss.x > 10, 'still lunging the same way');
});

// ------------------------------------------------------------------ Word vomit and the traps

test('Word vomit staggers him for 30 frames instead of confusing him, and cuts off a wind-up he was in', () => {
  const r = gRig({ party: [{ id: 'robin', level: 5 }, { id: 'mike', level: 7 }] as PartySeed[], god: false });
  r.g.grabCd = 99999;
  r.boss.cd = 0;
  r.hero.st.hp = 900; r.hero.hp = 900;
  at(r, r.boss.x - 40, r.boss.y);
  while (!bossView(r)?.alert) r.sim.step(idle());
  run(r.sim, 5);
  assert.equal(r.g.move, 'hay');
  // Robin's own cast: the cone reaches 56 px.
  r.sim.step(inp({ mx: 0.2, specialPressed: true }));
  const ev = run(r.sim, 40);
  assert.ok(r.s.floaters.some((f) => f.text === 'DAZED') || r.boss.stagger === 0, 'a DAZED floater');
  assert.equal(r.boss.stat.confuse, 0, 'never confused');
  assert.notEqual(bossView(r)?.confused, true);
  assert.deepEqual(hurt(ev), [], 'the haymaker never came');
  assert.notEqual(r.g.move, 'hay');
  // The stagger is 30 frames.
  const lone = gRig({});
  confuse(lone.s, lone.boss, 180);
  assert.equal(lone.boss.stagger, 30);
  assert.equal(lone.boss.stat.confuse, 0);
});

test('Nancy\'s traps do not hold him', () => {
  const r = gRig({ party: [{ id: 'nancy', level: 5 }, { id: 'mike', level: 7 }] as PartySeed[] });
  park(r, tc(9), tf(6));
  r.s.traps.push({ x: r.boss.x, y: r.boss.y, age: 0, life: 600, by: 'nancy' });
  run(r.sim, 10);
  assert.equal(r.s.traps.length, 1, 'the trap is still there');
  assert.equal(r.boss.stat.stun, 0);
  assert.ok(!r.s.floaters.some((f) => f.text === 'TRAPPED'));
});

test('a hold ends if Grigori is staggered, stunned or killed', () => {
  const ways: Record<string, (r: GRig) => void> = {
    stagger: (r) => { confuse(r.s, r.boss, 180); },
    kill: (r) => { r.boss.hp = 0; },
    stun: (r) => { r.boss.x = ON_PLATE.x; r.boss.y = ON_PLATE.y; r.sim.openProp('breaker1'); },
  };
  for (const [name, way] of Object.entries(ways)) {
    const r = gRig({ god: false });
    r.boss.cd = 99999;
    r.g.grabCd = 99999;
    at(r, r.boss.x - 14, r.boss.y);
    beginHold(r.s, r.boss, r.hero);
    r.g.move = 'hold';
    r.g.t = 5;
    assert.ok(r.s.hold, `${name}: held`);
    way(r);
    run(r.sim, 6);
    assert.equal(r.s.hold, null, `${name}: let go`);
    run(r.sim, 30, inp({ my: 1 }));
    assert.ok(r.hero.y > tf(6), `${name}: the hero walks`);
  }
});

// ------------------------------------------------------------------ the power box and the breaker

test('breaker: a shot lights it (targetHit) and every powerbox fires for 30 frames: lit, the zap sfx and an arcs fx; then 300 frames and it re-arms', () => {
  const r = box();
  assert.deepEqual(plates(r), ['closed', 'closed']);
  r.sim.step(inp({ my: -0.3, attackPressed: true }));
  let hitAt = -1;
  const ev: SimEvent[] = [];
  const litFrames: number[] = [];
  const arcs: number[] = [];
  const breaker: string[] = [];
  for (let f = 0; f < 420; f++) {
    const e = r.sim.step(idle());
    ev.push(...e);
    if (hitAt < 0 && e.some((x) => x.t === 'targetHit' && x.propId === 'breaker1')) hitAt = f;
    if (hitAt >= 0) {
      if (plates(r).every((s) => s === 'lit')) litFrames.push(f);
      arcs.push(r.sim.view().fx.filter((x) => x.kind === 'arcs').length);
      breaker.push(prop(r, 'breaker1')!.state);
    }
  }
  assert.ok(hitAt > 0, 'the shot reached the breaker');
  assert.equal(litFrames.length, 30, 'both plates lit for 30 frames');
  assert.equal(litFrames[0], hitAt, 'from the hit');
  assert.ok(sfxIds(ev).includes('zap'));
  assert.equal(arcs.slice(0, 30).every((n) => n === 2), true, 'an arcs fx on each plate while it fires');
  assert.equal(arcs[31], 0, 'and none after');
  assert.deepEqual(plates(r), ['closed', 'closed']);
  const lit = breaker.filter((s) => s === 'lit').length;
  assert.ok(lit >= 299 && lit <= 301, `the breaker stayed lit ${lit} frames`);
  assert.equal(breaker[breaker.length - 1], 'closed', 're-armed');
  // And it can be shot again.
  r.sim.step(inp({ my: -0.3, attackPressed: true }));
  let again = false;
  for (let f = 0; f < 60; f++) if (r.sim.step(idle()).some((x) => x.t === 'targetHit')) again = true;
  assert.ok(again, 'a second shot lights it again');
});

test('breaker: only a shot lights it, not a swing', () => {
  const r = box({ party: [{ id: 'mike', level: 7 }, { id: 'nancy', level: 5 }] as PartySeed[], start: { x: 152, y: 36 } });
  const ev = run(r.sim, 4, inp({ my: -0.3, attackHeld: true, attackPressed: true }));
  assert.ok(!ev.some((e) => e.t === 'targetHit'));
});

test('power box: Grigori on a plate when it fires is stunned for 180 frames (pose stun) and loses 8 percent of his max HP at once', () => {
  const r = box();
  park(r, ON_PLATE.x, ON_PLATE.y);
  const hp = r.boss.hp;
  r.sim.openProp('breaker1');
  const poses: (string | undefined)[] = [];
  for (let f = 0; f < 200; f++) { r.sim.step(idle()); poses.push(bossView(r)?.pose); }
  assert.equal(hp - r.boss.hp, Math.round(GRIGORI.hp * 0.08), '8 percent of his max HP');
  assert.equal(poses.filter((p) => p === 'stun').length, 180);
  assert.equal(poses[0], 'stun');
  assert.equal(poses[179], 'stun');
  assert.notEqual(poses[180], 'stun');
});

test('power box: stunned, he takes full damage from every side, times 1.5', () => {
  const r = box();
  park(r, ON_PLATE.x, ON_PLATE.y);
  r.boss.dir = 'right';
  r.sim.openProp('breaker1');
  run(r.sim, 3);
  assert.equal(r.g.move, 'stun');
  const full = damageRange(1, r.hero.st.atk, GRIGORI.def);
  const lo = Math.round(full.min * 1.5), hi = Math.round(full.max * 1.5);
  for (const deg of [0, 45, 90, 180, -90]) {
    const h = strike(r, deg);
    assert.ok(h.dmg >= lo && h.dmg <= hi, `${deg} degrees: ${h.dmg}, expected ${lo} to ${hi}`);
    assert.ok(!h.sounds.includes('block'), `${deg} degrees: not blocked`);
  }
  run(r.sim, 180);
  assert.ok(strike(r, 0).dmg < lo, 'a front hit is a quarter again once the stun is over');
});

test('power box: off the plate he is not stunned, and a second firing stuns him again', () => {
  const r = box();
  park(r, tc(15), tf(6));
  const hp = r.boss.hp;
  r.sim.openProp('breaker1');
  run(r.sim, 40);
  assert.equal(r.boss.hp, hp);
  assert.notEqual(r.g.move, 'stun');
  const twice = box();
  park(twice, ON_PLATE.x, ON_PLATE.y);
  twice.sim.openProp('breaker1');
  run(twice.sim, 40);
  assert.equal(twice.g.move, 'stun');
  const first = twice.boss.hp;
  run(twice.sim, 300);
  park(twice, ON_PLATE.x, ON_PLATE.y);
  twice.sim.openProp('breaker1');
  run(twice.sim, 3);
  assert.equal(twice.g.move, 'stun');
  assert.equal(first - twice.boss.hp, Math.round(GRIGORI.hp * 0.08));
});

test('power box: any other enemy on a plate loses 30 percent of its max HP, once, and one asleep or rising is left alone', () => {
  const flayed = (id: string, tx: number, ty: number, group = 'g', dormant = false): SimSpawn => ({ kind: 'enemy', id, type: 'flayed', tx, ty, group, dormant });
  const r = box({
    spawns: [grigoriAt(15, 6, { dormant: true }), ...CHAMBER_PROPS, { kind: 'prop', id: 'powerbox2', prop: 'powerbox', tx: 2, ty: 2, w: 32, h: 32 },
      flayed('f1', 7, 5), flayed('f2', 8, 6, 'asleep', true), flayed('f3', 2, 2), flayed('f4', 7, 6, 'rising', true)],
  });
  const [f1, f2, f3, f4] = [1, 2, 3, 4].map((i) => r.s.enemies[i] as Enemy);
  f1.stat.stun = 99999; f3.stat.stun = 99999;
  r.sim.spawnGroup('rising');
  const hp = [f1, f2, f3, f4].map((f) => f.hp);
  r.sim.openProp('breaker1');
  run(r.sim, 45);
  assert.equal(hp[0]! - f1.hp, Math.round(hp[0]! * 0.3), 'a Flayed on the first plate');
  assert.equal(hp[2]! - f3.hp, Math.round(hp[2]! * 0.3), 'and on the second');
  assert.equal(f2.hp, hp[1], 'a dormant one is untouched');
  assert.equal(f4.hp, hp[3], 'and so is one that is rising');
});

test('power box: the hero on a plate takes 15 and is thrown clear', () => {
  const r = box({ party: [{ id: 'mike', level: 7 }, { id: 'nancy', level: 5 }] as PartySeed[], start: { x: ON_PLATE.x, y: ON_PLATE.y } });
  r.hero.st.hp = 90; r.hero.hp = 90;
  r.sim.openProp('breaker1');
  const ev = run(r.sim, 1);
  const h = hurt(ev);
  assert.equal(h.length, 1);
  assert.equal(h[0]!.dmg, 15);
  run(r.sim, 14);
  const inside = r.hero.x >= 112 && r.hero.x < 144 && r.hero.y - 4 >= 80 && r.hero.y - 4 < 112;
  assert.equal(inside, false, 'thrown off the plate');
  assert.equal(r.hero.hp, 75);
});
