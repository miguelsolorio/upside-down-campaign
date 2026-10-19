// Chapter 5's foes (docs/level-14.md, docs/level-15.md): the trooper's riot shield (frontal blocking, side hits, the smash that breaks it, the
// burst and the flank), the Lab agent in hazmat, the Commander (his shield, the squad he calls and its cap, the crack at half HP, the charge and
// the wall stun), the twins (turns, the boss bar, enrage, the fall into the void and the climb back, the finish) and the bot's flank step. The
// foe Demogorgon, the void and the bot's clears are in foes-ch5-more.test.ts, the four sounds in audio-ch5.test.ts.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ENEMY_DEFS } from '../src/enemies/defs.ts';
import { DIR_ANGLE } from '../src/enemies/shield.ts';
import { HERO_DEFS } from '../src/heroes/defs.ts';
import { createBot } from '../src/combat/bot.ts';
import { heroAtk, hitEnemy, rollDamage } from '../src/combat/damage.ts';
import { angleDiff } from '../src/combat/space.ts';
import { arena, inp, makeWhite, ofType, press, run, tc, tf } from './sim-helpers.ts';
import { MIKE, actorOf, foe, hall, hero, hurt, pair, ring, sfxIn, slay, steady, streak, unit } from './foes-ch5-helpers.ts';

const RAD = Math.PI / 180;
const PARTY_52_ONE = [{ id: 'will' as const, level: 7 }];
const D = ENEMY_DEFS;
/** What the active hero's plain swing or shot does to this foe, spread and crit aside. */
const full = (s: Parameters<typeof heroAtk>[0], power: number, def: number): number => rollDamage(power, heroAtk(s, hero(s)), def, 1);

test('the five foes: HP and ATK sized for a Lv 10 party (chapter 4 guards are 80 to 110 HP), the riot shields stop 60 and 75 degrees and let nothing through', () => {
  assert.deepEqual([D.trooper.hp, D.trooper.atk, D.agent5.hp, D.agent5.atk, D.commander.hp, D.commander.atk], [130, 34, 90, 38, 700, 28]);
  assert.deepEqual([D.demofoe.hp, D.demofoe.atk, D.twin.hp, D.twin.atk], [400, 30, 560, 32]);
  assert.ok(D.trooper.hp > D.kbaton.hp && D.agent5.hp > D.kguard.hp && D.demofoe.hp > D.pitdemo.hp / 2, 'bigger than chapter 4\'s');
  assert.deepEqual([D.trooper.x.arc, D.trooper.x.block, D.commander.x.arc, D.commander.x.block], [60, 0, 75, 0]);
  assert.equal(D.commander.name, 'The Commander');
});

// ------------------------------------------------------------------ the trooper's shield
test('trooper: a swing from the front does nothing, with a clang and no hit sound, and the same swing from behind lands in full', () => {
  const front = hall('trooper', 24, {}, MIKE, true);
  steady(front.s);
  const ev = press(front.sim, { attackPressed: true, mx: 0.2 }, HERO_DEFS.mike.basic.at + 2);
  assert.equal(foe(front.s).hp, foe(front.s).hpMax, 'not a point of damage');
  assert.ok(sfxIn(ev, 'clang') >= 1 && sfxIn(ev, 'hit') === 0 && sfxIn(ev, 'block') === 0);
  assert.deepEqual(ofType(ev, 'hit').filter((h) => h.onEnemy), [], 'and not a hit event: every one of those is a point of damage at least');
  assert.equal(actorOf(front.sim, 'trooper')?.guarding, true);
  const back = hall('trooper', 24, { dir: 'right' }, MIKE, true);
  steady(back.s);
  const ev2 = press(back.sim, { attackPressed: true, mx: 0.2 }, HERO_DEFS.mike.basic.at + 2);
  assert.equal(foe(back.s).hpMax - foe(back.s).hp, full(back.s, 1, D.trooper.def), 'all of it from behind');
  assert.ok(sfxIn(ev2, 'hit') >= 1 && sfxIn(ev2, 'clang') === 0);
});

test('trooper: a pistol round from the front bounces and one from behind lands', () => {
  const nancy = [{ id: 'nancy' as const, level: 10 }];
  const front = hall('trooper', 24, {}, nancy, true);
  steady(front.s);
  const ev = press(front.sim, { attackPressed: true, mx: 0.2 }, 30);
  assert.equal(foe(front.s).hp, foe(front.s).hpMax);
  assert.ok(sfxIn(ev, 'clang') >= 1);
  // The round lands before the 12 frames he needs to turn to a hero in his blind side.
  const back = hall('trooper', 24, { dir: 'right' }, nancy, true);
  steady(back.s);
  press(back.sim, { attackPressed: true, mx: 0.2 }, 30);
  assert.ok(foe(back.s).hp < foe(back.s).hpMax);
});

test('trooper: the shield covers 60 degrees either side of the way it faces and not a degree more', () => {
  for (const [deg, blocked] of [[0, true], [30, true], [59, true], [-59, true], [61, false], [-61, false], [90, false], [180, false]] as [number, boolean][]) {
    const r = hall('trooper', 30, {}, MIKE, true);
    steady(r.s);
    // He faces west, toward Mike. The blow travels from a source `deg` off his front: its angle is `deg` seen from the other end.
    const dealt = hitEnemy(r.s, r.h, foe(r.s), { power: 1, angle: deg * RAD, kb: 2.4, noCrit: true });
    assert.equal(dealt, blocked ? 0 : full(r.s, 1, D.trooper.def), `${deg} degrees off the front`);
    assert.equal(foe(r.s).hp, blocked ? foe(r.s).hpMax : foe(r.s).hpMax - dealt);
  }
});

test('trooper: a smash (Steve\'s bat, Hopper\'s slam) breaks the shield for good, from the front too, and nobody else\'s swing does', () => {
  const steve = hall('trooper', 24, {}, [{ id: 'steve', level: 10 }], true);
  steady(steve.s);
  const ev = press(steve.sim, { attackPressed: true, mx: 0.2 }, HERO_DEFS.steve.basic.at + 2);
  assert.ok(sfxIn(ev, 'shieldBreak') === 1 && sfxIn(ev, 'clang') === 0, 'the break is its own sound');
  assert.equal(foe(steve.s).hp, foe(steve.s).hpMax, 'the swing that breaks it is still bounced');
  const gone = actorOf(steve.sim, 'trooper');
  assert.deepEqual([gone?.broken, gone?.guarding], [true, false]);
  run(steve.sim, 600);
  assert.deepEqual([actorOf(steve.sim, 'trooper')?.broken, actorOf(steve.sim, 'trooper')?.guarding], [true, false], 'ten seconds on, it is still gone');
  press(steve.sim, { attackPressed: true, mx: 0.2 }, HERO_DEFS.steve.basic.at + 2);
  assert.ok(foe(steve.s).hp < foe(steve.s).hpMax, 'and the next swing lands from the front');
  // Hopper's slam, and a plain swing from Mike for contrast.
  const hopper = hall('trooper', 24, {}, [{ id: 'hopper', level: 10 }], true);
  press(hopper.sim, { specialPressed: true, mx: 0.2 }, HERO_DEFS.hopper.special.at + 2);
  assert.equal(foe(hopper.s).ch5?.gone, true);
  const mike = hall('trooper', 24, {}, MIKE, true);
  for (let i = 0; i < 3; i++) press(mike.sim, { attackPressed: true, mx: 0.2 }, 30);
  assert.equal(foe(mike.s).ch5?.gone, false);
  assert.equal(actorOf(mike.sim, 'trooper')?.guarding, true);
});

test('trooper: Steve\'s bat from the side lands in full and breaks the shield too', () => {
  const r = hall('trooper', 24, { dir: 'right' }, [{ id: 'steve', level: 10 }], true);
  steady(r.s);
  const ev = press(r.sim, { attackPressed: true, mx: 0.2 }, HERO_DEFS.steve.basic.at + 2);
  assert.equal(foe(r.s).hpMax - foe(r.s).hp, full(r.s, HERO_DEFS.steve.basic.power, D.trooper.def));
  assert.equal(sfxIn(ev, 'shieldBreak'), 1);
  assert.equal(actorOf(r.sim, 'trooper')?.broken, true);
});

// ------------------------------------------------------------------ the burst and the flank
test('trooper: a 30 frame "!", then three rounds six frames apart with his ATK, once the hero is between 64 and 170 px', () => {
  const r = hall('trooper', 110);
  steady(r.s);
  const frames: { ev: ReturnType<typeof run>; a: ReturnType<typeof actorOf> }[] = [];
  const atks = new Set<number>();
  for (let f = 0; f < 140; f++) {
    frames.push({ ev: r.sim.step(inp()), a: actorOf(r.sim, 'trooper') });
    for (const p of r.s.projs) if (!p.mine) atks.add(p.atk);
  }
  const first = frames.findIndex((t) => t.a?.alert);
  assert.ok(first >= 0);
  assert.equal(streak(frames, first, (t) => t.a?.alert === true), 30);
  const shots = frames.flatMap((t, i) => (sfxIn(t.ev, 'rifle') > 0 ? [i] : []));
  assert.deepEqual(shots, [first + 30, first + 36, first + 42]);
  assert.deepEqual([...atks], [34]);
  const hits = frames.flatMap((t) => hurt(t.ev).map((h) => h.dmg));
  assert.equal(hits.length, 3, 'all three land on a hero who stands still');
  assert.ok(hits.every((d) => d === Math.max(1, Math.round(D.trooper.power * 34 - hero(r.s).st.def * 0.5))));
});

test('trooper: a group of them shoots one at a time, each in turn, and none of them is left out', () => {
  const r = makeWhite({
    party: MIKE, grid: arena(32, 16), start: { x: tc(3), y: tf(8) }, seed: 4,
    spawns: [unit('t1', 'trooper', 9, 5), unit('t2', 'trooper', 10, 8), unit('t3', 'trooper', 9, 11)],
  });
  r.sim.dev.god = true;
  let together = 0;
  for (let f = 0; f < 900; f++) {
    r.sim.step(inp());
    const going = r.s.enemies.filter((e) => e.ch5?.move === 'wind' || e.ch5?.move === 'fire');
    if (going.length > 1) together++;
  }
  assert.equal(together, 0, 'never two at once');
  assert.ok(r.s.enemies.every((e) => e.swings >= 2), `bursts each has started: ${r.s.enemies.map((e) => e.swings)}`);
});

test('trooper: the aim is locked when the "!" ends, so a hero who steps out of the line is missed', () => {
  const r = hall('trooper', 110);
  steady(r.s);
  for (let f = 0; f < 200 && foe(r.s).ch5?.move !== 'fire'; f++) r.sim.step(inp());
  assert.equal(foe(r.s).ch5?.move, 'fire');
  r.sim.dev.teleport(r.h.x, r.h.y + 50);
  const ev = run(r.sim, 80);
  assert.equal(sfxIn(ev, 'rifle'), 2, 'the other two rounds go out');
  assert.equal(hurt(ev).length, 0);
});

test('trooper: too close to shoot, he clubs the hero with the rifle butt instead, and the shield is down while he recovers from it', () => {
  const r = hall('trooper', 40);
  steady(r.s);
  const frames: { ev: ReturnType<typeof run>; a: ReturnType<typeof actorOf> }[] = [];
  for (let f = 0; f < 120; f++) frames.push({ ev: r.sim.step(inp()), a: actorOf(r.sim, 'trooper') });
  assert.equal(frames.filter((t) => sfxIn(t.ev, 'rifle') > 0).length, 0, 'no burst inside 64 px');
  const first = frames.findIndex((t) => t.a?.alert);
  assert.equal(streak(frames, first, (t) => t.a?.alert === true), 20);
  const swing = frames.findIndex((t) => hurt(t.ev).length > 0);
  assert.equal(hurt(frames[swing]?.ev ?? []).map((h) => h.dmg)[0], Math.max(1, Math.round(0.8 * 34 - hero(r.s).st.def * 0.5)));
  // Thirty frames, and the three of hit-stop the club's landing freezes the sim for.
  assert.equal(streak(frames, swing, (t) => t.a?.guarding === false), 33, 'thirty frames with the shield down');
  assert.equal(frames[swing + 33]?.a?.guarding, true);
});

test('trooper: after the burst he walks round the hero for 60 frames, shield up, about as far from him as he was', () => {
  const r = hall('trooper', 110);
  steady(r.s);
  r.sim.dev.god = true;
  const bearing = (): number => Math.atan2(foe(r.s).y - r.h.y, foe(r.s).x - r.h.x);
  let start = 0, end = 0, n = 0, d0 = 0, d1 = 0, ups = true;
  for (let f = 0; f < 300; f++) {
    r.sim.step(inp());
    const a = actorOf(r.sim, 'trooper');
    if (a?.pose === 'flank') {
      if (n++ === 0) { start = bearing(); d0 = Math.hypot(foe(r.s).x - r.h.x, foe(r.s).y - r.h.y); }
      end = bearing(); d1 = Math.hypot(foe(r.s).x - r.h.x, foe(r.s).y - r.h.y);
      ups &&= a.guarding === true;
    } else if (n > 0) break;
  }
  assert.equal(n, 60);
  assert.ok(ups, 'the shield stays up');
  assert.ok(angleDiff(end, start) > 15 * RAD && angleDiff(end, start) < 70 * RAD, `round by ${(angleDiff(end, start) / RAD).toFixed(0)} degrees`);
  assert.ok(Math.abs(d1 - d0) < 10, `${d0.toFixed(0)} px out, then ${d1.toFixed(0)}`);
});

// ------------------------------------------------------------------ the Commander
/** The Commander in a hall `gap` px east of Mike, group `boss`, awake. */
const commander = (gap = 140, party = MIKE, over: Parameters<typeof hall>[2] = {}) => hall('commander', gap, { group: 'boss', ...over }, party);
const live = (r: ReturnType<typeof commander>): number => r.s.enemies.filter((e) => e.rt === 'squad' && !e.dead).length;

test('the Commander: blocks the front within 75 degrees for nothing, and takes the full hit from the side', () => {
  const r = commander(30);
  const c = foe(r.s);
  c.cd = 1e9;
  steady(r.s);
  const hit = (deg: number) => hitEnemy(r.s, r.h, c, { power: 1, angle: deg * RAD, kb: 2.4, noCrit: true });
  assert.equal(hit(0), 0);
  assert.equal(hit(74), 0);
  assert.equal(hit(76), full(r.s, 1, D.commander.def));
  assert.equal(c.hp, c.hpMax - full(r.s, 1, D.commander.def));
  assert.equal(c.ch5?.gone, false, 'and a plain hit, a shove however hard, never breaks it or staggers him');
  hitEnemy(r.s, r.h, c, { power: 1, angle: 0, kb: 6, noCrit: true });
  assert.deepEqual([c.ch5?.gone, c.stagger], [false, 0]);
  assert.equal(actorOf(r.sim, 'commander')?.guarding, true);
});

test('the Commander: three smashes break the shield for good, each one a clang until the third, and it stays down', () => {
  const r = commander(30, [{ id: 'steve', level: 10 }]);
  const c = foe(r.s);
  c.cd = 1e9;
  const swing = () => {
    hitEnemy(r.s, r.h, c, { power: 1, angle: 0, kb: 2.8, noCrit: true });
    return run(r.sim, 6);
  };
  assert.equal(sfxIn(swing(), 'clang'), 1);
  assert.equal(sfxIn(swing(), 'clang'), 1);
  assert.equal(c.ch5?.gone, false);
  assert.equal(actorOf(r.sim, 'commander')?.guarding, true);
  const third = swing();
  assert.equal(sfxIn(third, 'shieldBreak'), 1);
  assert.equal(sfxIn(third, 'clang'), 0);
  assert.deepEqual([actorOf(r.sim, 'commander')?.broken, actorOf(r.sim, 'commander')?.guarding], [true, false]);
  assert.equal(c.hp, c.hpMax, 'all three were bounced');
  run(r.sim, 300);
  assert.equal(actorOf(r.sim, 'commander')?.guarding, false);
  assert.ok(hitEnemy(r.s, r.h, c, { power: 1, angle: 0, kb: 2.8, noCrit: true }) > 0, 'the next one lands from the front');
});

test('the Commander: he plants the shield and whistles every 8 s, calling three troopers at most, run-time spawns of the squad', () => {
  const r = commander();
  const c = foe(r.s);
  c.ch5!.whistleCd = 0;
  const frames: { ev: ReturnType<typeof run>; a: ReturnType<typeof actorOf> }[] = [];
  for (let f = 0; f < 140; f++) frames.push({ ev: r.sim.step(inp()), a: actorOf(r.sim, 'commander') });
  const plant = frames.findIndex((t) => t.a?.pose === 'plant');
  assert.ok(plant >= 0 && plant < 4, 'he plants at once');
  assert.equal(streak(frames, plant, (t) => t.a?.pose === 'plant'), D.commander.x.plantT);
  assert.equal(sfxIn(frames[plant]?.ev ?? [], 'whistle'), 1, 'the whistle sounds as he plants');
  assert.equal(live(r), 3);
  const squad = r.s.enemies.filter((e) => e.rt === 'squad');
  assert.ok(squad.every((e) => e.kind === 'trooper' && e.group === 'squad' && e.xp === 1 && e.drop === 0 && e.aware));
  assert.ok(squad.every((e) => Math.hypot(e.x - c.x, e.y - c.y) < 70), 'they come up round him');
  assert.ok(squad.every((e) => e.hpMax < D.trooper.hp && e.atk < D.trooper.atk), 'a little weaker than the stage\'s');
  assert.equal(r.sim.enemiesAlive('squad'), 3);
  assert.equal(c.ch5?.whistleCd, D.commander.x.whistleEvery - (140 - plant - 1) , 'eight seconds from the plant to the next');
});

test('the Commander: with three of the squad up he does not whistle, and when one falls the next call brings one, not three', () => {
  const r = commander();
  const c = foe(r.s);
  c.ch5!.whistleCd = 0;
  run(r.sim, 100);
  assert.equal(live(r), 3);
  let planted = 0;
  for (let f = 0; f < 240; f++) {
    c.ch5!.whistleCd = 0;
    r.sim.step(inp());
    if (actorOf(r.sim, 'commander')?.pose === 'plant') planted++;
  }
  assert.equal(planted, 0, 'no plant while all three stand');
  assert.equal(live(r), 3);
  r.s.enemies.find((e) => e.rt === 'squad')!.hp = 0;
  const ev = run(r.sim, 200);
  assert.equal(sfxIn(ev, 'whistle'), 1);
  assert.equal(live(r), 3, 'back to three, and no more');
  assert.equal(r.s.enemies.filter((e) => e.rt === 'squad').length <= 4, true);
});

test('the Commander: the shield cracks at half HP, the whistles stop, and he charges in straight lines that stun him on a wall for 2 s', () => {
  const r = commander(140);
  const c = foe(r.s);
  steady(r.s);
  r.sim.dev.god = true;
  c.ch5!.whistleCd = 0;
  c.hp = Math.floor(c.hpMax / 2);
  const ev = run(r.sim, 1);
  assert.equal(c.ch5?.cracked, true);
  assert.equal(actorOf(r.sim, 'commander')?.cracked, true);
  assert.equal(sfxIn(ev, 'shieldBreak'), 1);
  let plants = 0;
  const frames: { ev: ReturnType<typeof run>; a: ReturnType<typeof actorOf>; x: number; y: number }[] = [];
  for (let f = 0; f < 300; f++) {
    c.ch5!.whistleCd = 0;
    frames.push({ ev: r.sim.step(inp()), a: actorOf(r.sim, 'commander'), x: c.x, y: c.y });
    if (actorOf(r.sim, 'commander')?.pose === 'plant') plants++;
    if (c.demo?.move === 'stun') break;
  }
  assert.equal(plants, 0, 'no more whistles');
  const wind = frames.findIndex((t) => t.a?.pose === 'charge' && t.a.alert);
  assert.ok(wind >= 0, 'he charges');
  assert.equal(streak(frames, wind, (t) => t.a?.pose === 'charge' && t.a.alert === true), D.commander.x.chargeWindup);
  // The run goes straight at 4.2 px a frame until a wall stops it.
  const go = wind + D.commander.x.chargeWindup;
  const a = frames[go + 2] as (typeof frames)[number], b = frames[go + 12] as (typeof frames)[number];
  assert.ok(Math.abs(Math.hypot(b.x - a.x, b.y - a.y) / 10 - D.commander.x.chargeSpeed) < 0.3, 'a run at the charge speed');
  assert.ok(Math.abs(b.y - a.y) < 1, 'along the line locked at the end of the "!"');
  assert.equal(c.demo?.move, 'stun', 'a wall stops him');
  assert.ok(frames.some((t) => t.ev.some((e) => e.t === 'sfx' && e.id === 'thud')));
  assert.equal(actorOf(r.sim, 'commander')?.pose, 'stun');
  assert.equal(actorOf(r.sim, 'commander')?.guarding, false, 'shield down while he is dazed');
  // Dazed for 120 frames, he takes half as much again; awake again, the same blow is back to its normal size.
  const dazed = hitEnemy(r.s, r.h, c, { power: 1, angle: Math.PI, noCrit: true });
  let n = 0;
  while (c.demo?.move === 'stun') { r.sim.step(inp()); n++; }
  assert.ok(n >= D.commander.x.stunT - 8 && n <= D.commander.x.stunT + 6, `${n} more frames of stun (and the hit's hit-stop)`);
  assert.equal(actorOf(r.sim, 'commander')?.pose, undefined);
  const awake = hitEnemy(r.s, r.h, c, { power: 1, angle: Math.PI, noCrit: true });
  assert.ok(Math.abs(dazed - awake * D.commander.x.stunMul) <= 1, `${dazed} dazed, ${awake} not`);
});

test('the Commander: at 0 HP he is killed, and the boss group is cleared with the squad still standing', () => {
  const r = commander(140);
  r.sim.dev.god = true;
  foe(r.s).ch5!.whistleCd = 0;
  run(r.sim, 100);
  assert.equal(live(r), 3);
  hitEnemy(r.s, r.h, foe(r.s), { power: 50, angle: Math.PI, noCrit: true });
  const ev = run(r.sim, 12);
  assert.ok(ev.some((e) => e.t === 'kill' && e.kind === 'commander' && e.spawnId === 'u'));
  assert.ok(ev.some((e) => e.t === 'groupCleared' && e.group === 'boss'), 'the stage\'s finish');
  assert.equal(r.sim.view().hud.boss, null);
});

// ------------------------------------------------------------------ the twins

test('the twins: one boss bar for both, THE TWINS, with their HP added, and it carries on when one of them is gone', () => {
  const r = pair();
  const [a, b] = r.twins as [ReturnType<typeof foe>, ReturnType<typeof foe>];
  assert.deepEqual(r.sim.view().hud.boss, { name: 'THE TWINS', hp: 2 * D.twin.hp, hpMax: 2 * D.twin.hp });
  hitEnemy(r.s, r.h, a, { power: 3, angle: Math.PI, noCrit: true });
  assert.equal(r.sim.view().hud.boss?.hp, a.hp + b.hp);
  const asleep = hall('twin', 80, { group: 'boss', dormant: true }, [{ id: 'will', level: 7 }]);
  assert.equal(asleep.sim.view().hud.boss, null, 'asleep, no bar');
  slay(r, 0);
  assert.deepEqual(r.sim.view().hud.boss, { name: 'THE TWINS', hp: b.hp, hpMax: 2 * D.twin.hp });
  run(r.sim, 40);
  assert.equal(r.sim.view().hud.boss?.hpMax, 2 * D.twin.hp, 'and the dead one gone from the field changes nothing');
});

test('the twins: they take turns, one charging while the other circles at range, and never both at once', () => {
  const r = pair();
  r.sim.dev.god = true;
  const [a, b] = r.twins as [ReturnType<typeof foe>, ReturnType<typeof foe>];
  const seen = [0, 0];
  const launches: number[] = [];
  let both = 0;
  const rangeWhileOther: number[] = [];
  for (let f = 0; f < 1800; f++) {
    r.sim.step(inp());
    const going = r.twins.map((t) => t.demo?.move === 'wind' || t.demo?.move === 'run');
    if (going[0] && going[1]) both++;
    r.twins.forEach((t, i) => { if ((t.ch5?.charges ?? 0) > (seen[i] as number)) { seen[i] = t.ch5!.charges; launches.push(i); } });
    if (going[0] !== going[1]) {
      const other = going[0] ? b : a;
      rangeWhileOther.push(Math.hypot(other.x - r.h.x, other.y - r.h.y));
    }
  }
  assert.equal(both, 0);
  assert.ok(launches.length >= 6, `${launches.length} charges in 30 seconds`);
  assert.ok(launches.every((x, i) => i === 0 || x !== launches[i - 1]), `they alternate: ${launches.join('')}`);
  const sorted = rangeWhileOther.sort((p, q) => p - q);
  const median = sorted[Math.floor(sorted.length / 2)] as number;
  assert.ok(Math.abs(median - D.twin.x.orbit) < 40, `the one waiting circles about ${D.twin.x.orbit} px out, at ${median.toFixed(0)}`);
});

test('the twins: when one dies the other enrages, 30 percent faster and charging faster, with the acid arcs every 5 s', () => {
  const r = pair();
  r.sim.dev.god = true;
  const [a, b] = r.twins as [ReturnType<typeof foe>, ReturnType<typeof foe>];
  assert.equal(b.ch5?.enraged, false);
  slay(r, 0);
  assert.deepEqual([b.ch5?.enraged, b.spd, a.dead], [true, D.twin.x.enrage, true]);
  let petals = -1, spits = 0, was = '';
  const starts: number[] = [];
  for (let f = 0; f < 1500; f++) {
    r.sim.step(inp());
    const move = b.demo?.move ?? '';
    if (petals < 0 && actorOf(r.sim, 'twin')?.petals) petals = f;
    if (move === 'spit' && was !== 'spit') { spits++; starts.push(f); }
    was = move;
    if (b.demo?.move === 'run') assert.ok(Math.abs(Math.hypot(b.ax, b.ay) - D.twin.x.chargeSpeed * D.twin.x.enrage) < 0.01, 'the charge is 30 percent faster too');
  }
  assert.ok(petals >= 0 && petals < 120, 'it roars and the petals open');
  assert.ok(spits >= 4, `${spits} volleys of acid`);
  const gaps = starts.slice(1).map((s, i) => s - (starts[i] as number));
  assert.ok(gaps.every((g) => g >= 280 && g <= 520), `about every five seconds: ${gaps}`);
  assert.ok(gaps.reduce((n, g) => n + g, 0) / gaps.length < 420);
});

test('the twins: a charge that ends on the void drops the twin: it falls, loses 15 percent of its HP and climbs back 180 frames after', () => {
  const r = ring(PARTY_52_ONE, [[12, 8]]);
  r.sim.dev.god = true;
  r.sim.dev.teleport(tc(12), tf(3));
  const t = r.twins[0] as ReturnType<typeof foe>;
  t.demo!.chargeCd = 0;
  const x0 = { x: t.x, y: t.y };
  let before = t.hp, fallAt = -1;
  const rows: { pose?: string; k?: number; fx: boolean; ev: ReturnType<typeof run> }[] = [];
  for (let f = 0; f < 400; f++) {
    const hp = t.hp;
    const ev = r.sim.step(inp());
    const v = actorOf(r.sim, 'twin');
    if (fallAt < 0 && t.demo?.move === 'fall') { fallAt = f; before = hp; }
    if (fallAt >= 0) rows.push({ pose: v?.pose, k: v?.k, fx: r.sim.view().fx.some((x) => x.kind === 'fall' && x.life === 48), ev });
    if (fallAt >= 0 && f - fallAt > 200) break;
  }
  assert.ok(fallAt >= 0, 'it went over the edge');
  assert.ok(rows.some((x) => sfxIn(x.ev, 'fall') === 1) && rows[0]?.fx, 'the fall sound and its effect at the edge');
  assert.equal(before - t.hp, Math.round(t.hpMax * D.twin.x.fallLoss), '15 percent of its max HP');
  assert.ok(rows.slice(0, 40).every((x) => x.pose === 'fall'), 'forty frames of falling');
  assert.ok((rows[0]?.k ?? 1) < 0.1 && (rows[38]?.k ?? 0) > 0.9, 'k running from 0 to 1');
  assert.ok(rows.slice(40, 140).every((x) => x.pose === 'fall' && x.k === 1), 'a hundred frames out of sight');
  assert.ok(rows.slice(142, 178).every((x) => x.pose === 'climb') && (rows[142]?.k ?? 0) > 0.9 && (rows[177]?.k ?? 1) < 0.1, 'then the climb, k running back to 0');
  const back = rows.findIndex((x) => x.pose === undefined);
  assert.ok(back >= 178 && back <= 182, `back on its feet ${back} frames after it went over`);
  assert.ok(Math.hypot(t.x - x0.x, t.y - x0.y) < 140, 'where it went over, near enough');
});

test('the twins: finish when both are at 0, not before', () => {
  const r = pair();
  hitEnemy(r.s, r.h, r.twins[0] as ReturnType<typeof foe>, { power: 99, angle: 0, noCrit: true });
  const first = run(r.sim, 12);
  assert.ok(first.some((e) => e.t === 'kill' && e.spawnId === 'twin1'));
  assert.equal(first.some((e) => e.t === 'groupCleared'), false);
  hitEnemy(r.s, r.h, r.twins[1] as ReturnType<typeof foe>, { power: 99, angle: 0, noCrit: true });
  const last = run(r.sim, 12);
  assert.equal(last.filter((e) => e.t === 'groupCleared' && e.group === 'boss').length, 1);
  assert.equal(r.sim.view().hud.boss, null);
});

// ------------------------------------------------------------------ the bot
/**
 * Mike alone, played by the bot, against one `type` facing him across a hall (no squad for the Commander). Counts his swings from within
 * reach, and how many of them he started in front of a raised shield, within its arc, rather than from the side.
 */
function swings(type: 'trooper' | 'commander', careless: boolean): { swings: number; atShield: number; dead: boolean } {
  const grid = arena(30, 16);
  const { sim, s } = makeWhite({ grid, party: MIKE, start: { x: tc(3), y: tf(8) }, spawns: [unit('u', type, 14, 8, { dir: 'left', group: 'boss' })], seed: 3 });
  const bot = createBot({ grid, waypoints: [{ x: tc(26), y: tf(8) }], careless });
  const e = foe(s), h = hero(s);
  h.st.hp = h.hp = 900;
  s.armed = false;
  e.ch5!.whistleCd = 1e9;
  let n = 0, atShield = 0, swinging = false;
  for (let f = 0; f < 2500 && !e.dead; f++) {
    sim.step(bot.next(sim));
    const starts = h.act === 'basic' && !swinging;
    swinging = h.act === 'basic';
    if (!starts || Math.hypot(h.x - e.x, h.y - e.y) > 60) continue;
    n++;
    const off = angleDiff(Math.atan2(h.y - e.y, h.x - e.x), DIR_ANGLE[e.dir]);
    if (actorOf(sim, type)?.guarding === true && off <= D[type].x.arc * RAD) atShield++;
  }
  return { swings: n, atShield, dead: e.dead };
}

test('the bot steps round to a trooper\'s or the Commander\'s side before it swings, where one that does not hacks at the shield', () => {
  for (const type of ['trooper', 'commander'] as const) {
    const careful = swings(type, false), careless = swings(type, true);
    assert.ok(careful.dead && careful.swings >= 6, `${type}: it kills him in ${careful.swings} swings`);
    assert.ok(careful.atShield <= 1, `${type}: ${careful.atShield} of ${careful.swings} swings started in front of the raised shield`);
    assert.ok(careless.atShield >= 3 && careless.atShield > careful.atShield * 2, `${type}: against ${careless.atShield} of ${careless.swings} for a bot that doesn't circle`);
  }
});
