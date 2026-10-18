// Chapter 4's guards and the pit Demogorgon (docs/level-10.md): the Kamchatka guard on the soldier's brain, the camp guard on the riot
// guard's, each reading its own def, and the pit Demogorgon on the 1.3 one's, pinned after three stuns and finished by Hopper's slam. The
// Creel ghoul is in tests/ghoul.test.ts.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { EnemyKind, HeroId, Sim, SimEvent, SimSpawn } from '../src/core/types.ts';
import { ENEMY_DEFS } from '../src/enemies/index.ts';
import { HERO_DEFS } from '../src/heroes/index.ts';
import { createBot } from '../src/combat/bot.ts';
import { damageRange, hitEnemy, rollDamage } from '../src/combat/damage.ts';
import type { DemoState, Enemy, Hero, S } from '../src/combat/state.ts';
import { arena, inp, makeWhite, ofType, press, run, sfxIds, tc, tf } from './sim-helpers.ts';

const unit = (id: string, type: EnemyKind, tx: number, ty: number, extra: Partial<Extract<SimSpawn, { kind: 'enemy' }>> = {}): SimSpawn =>
  ({ kind: 'enemy', id, type, tx, ty, group: 'g', ...extra });
const foe = (s: S, i = 0): Enemy => s.enemies[i] as Enemy;
const hero = (s: S, i = 0): Hero => s.heroes[i] as Hero;
const hurt = (ev: SimEvent[]) => ofType(ev, 'hit').filter((h) => !h.onEnemy);
const actor = (sim: Sim, id: string) => sim.view().actors.find((a) => a.kind === 'enemy' && a.id === id);
const steady = (s: S): void => { s.rng = () => 0.5; };

// ------------------------------------------------------------------ the Kamchatka guard

/** A guard of `type` `gap` px east of Mike (Lv 7, HP to spare) in a wide hall. */
function guardRig(type: EnemyKind, gap: number, over: Parameters<typeof makeWhite>[0] = {}, extra: Partial<Extract<SimSpawn, { kind: 'enemy' }>> = {}) {
  const r = makeWhite({ party: [{ id: 'mike', level: 7 }], grid: arena(32, 16), start: { x: tc(3), y: tf(8) }, spawns: [unit('u', type, 8, 8, extra)], seed: 11, ...over });
  hero(r.s).st.hp = 900;
  hero(r.s).hp = 900;
  const e = foe(r.s);
  e.x = hero(r.s).x + gap; e.y = hero(r.s).y; e.hx = e.x; e.hy = e.y;
  return { ...r, e };
}

test('kguard: the soldier\'s brain with its own numbers, and the soldier is as it was', () => {
  const k = ENEMY_DEFS.kguard, so = ENEMY_DEFS.soldier;
  assert.deepEqual([k.hp, k.atk, k.def, k.speed, k.xp], [80, 36, 5, 0.7, 12]);
  assert.deepEqual([so.hp, so.atk, so.def, so.speed, so.xp], [90, 38, 5, 0.8, 12], 'chapter 3 is untouched');
  assert.equal(foe(guardRig('kguard', 100).s).soldier?.move, 'walk', 'it runs the soldier\'s state');
  // Walking in from the edge of its sight, each at its own pace: seven frames at 0.7 px and at 0.8, before it is inside its band.
  const walked = (type: EnemyKind): number => {
    const r = guardRig(type, 128);
    run(r.sim, 1);
    const x0 = r.e.x;
    run(r.sim, 7);
    return x0 - r.e.x;
  };
  assert.ok(Math.abs(walked('kguard') - 4.9) < 0.15, 'the guard walks at 0.7');
  assert.ok(Math.abs(walked('soldier') - 5.6) < 0.15, 'the soldier at 0.8');
});

test('kguard: a 30 frame "!", three rounds six frames apart with his ATK, and the rifle butt up close', () => {
  const r = guardRig('kguard', 100);
  const shots: number[] = [];
  let alert = 0, longest = 0;
  const atks = new Set<number>();
  for (let f = 0; f < 200 && shots.length < 3; f++) {
    const ev = r.sim.step(inp());
    if (sfxIds(ev).includes('rifle')) shots.push(f);
    if (actor(r.sim, 'kguard')?.alert) alert++; else if (alert) { longest = Math.max(longest, alert); alert = 0; }
    for (const p of r.s.projs) if (!p.mine) atks.add(p.atk);
  }
  assert.equal(longest, 30);
  assert.deepEqual(shots.slice(1).map((f, i) => f - (shots[i] as number)), [6, 6]);
  assert.deepEqual([...atks], [36], 'the rounds carry the guard\'s ATK, not the soldier\'s 38');
  const club = guardRig('kguard', 14, {});
  steady(club.s);
  const dmg: number[] = [];
  for (let f = 0; f < 60; f++) for (const h of hurt(club.sim.step(inp()))) dmg.push(h.dmg);
  assert.equal(dmg.length, 1, 'one swing of the butt');
  assert.equal(dmg[0], rollDamage(0.8, 36, hero(club.s).st.def, 1), 'power 0.8 of his ATK');
});

// ------------------------------------------------------------------ the camp guard

test('kbaton: blocks from the front like a riot guard, takes the full hit from behind, and the slam breaks the block', () => {
  const x = ENEMY_DEFS.kbaton.x;
  assert.deepEqual([ENEMY_DEFS.kbaton.hp, ENEMY_DEFS.kbaton.atk, ENEMY_DEFS.kbaton.def, ENEMY_DEFS.kbaton.xp], [110, 34, 7, 16]);
  // He faces west, toward Mike at his west: a front hit.
  const front = guardRig('kbaton', 20, {}, { dir: 'left' });
  steady(front.s);
  front.e.cd = 1e9;
  assert.equal(actor(front.sim, 'kbaton')?.guarding, true, 'his shield is up');
  const full = rollDamage(1, hero(front.s).st.atk, front.e.def, 1);
  const before = front.e.hp;
  hitEnemy(front.s, hero(front.s), front.e, { power: 1, angle: 0, kb: 2.8, noCrit: true });
  assert.equal(before - front.e.hp, Math.max(1, Math.round(full * x.block)), 'a fifth of it from the front');
  assert.equal(front.e.broken, 0, 'knockback 2.8 does not break it');
  // From behind: Mike at his east while he faces west.
  const back = guardRig('kbaton', 20, {}, { dir: 'right' });
  steady(back.s);
  back.e.cd = 1e9;
  hitEnemy(back.s, hero(back.s), back.e, { power: 1, angle: 0, kb: 2.8, noCrit: true });
  assert.equal(back.e.hpMax - back.e.hp, full, 'all of it from behind');
});

test('kbaton: Hopper\'s slam breaks the block, and a plain haymaker is blocked', () => {
  const mk = () => {
    const r = makeWhite({ party: [{ id: 'hopper', level: 5 }], start: { x: tc(4), y: tf(8) }, spawns: [unit('b', 'kbaton', 6, 8, { dir: 'left' })] });
    steady(r.s);
    foe(r.s).hp = foe(r.s).hpMax = 9999;
    foe(r.s).cd = 1e9;
    return r;
  };
  const plain = mk();
  press(plain.sim, { attackPressed: true, mx: 0.2 }, HERO_DEFS.hopper.basic.at + 1);
  assert.equal(foe(plain.s).broken, 0);
  assert.ok(foe(plain.s).hp >= 9999 - 6, 'blocked to a fifth');
  const slam = mk();
  press(slam.sim, { specialPressed: true, mx: 0.2 }, HERO_DEFS.hopper.special.at + 1);
  assert.ok(foe(slam.s).broken > 0, 'the slam breaks it');
  assert.equal(actor(slam.sim, 'kbaton')?.guarding, false, 'and the shield is down in the view');
});

test('kbaton: winds up 30 frames and bashes for power 0.9 of his ATK, and turns to face the hero after 12 frames in his blind side', () => {
  const r = guardRig('kbaton', 20, {}, { dir: 'left' });
  steady(r.s);
  const dmg: number[] = [];
  let alerts = 0, longest = 0;
  for (let f = 0; f < 90; f++) {
    for (const h of hurt(r.sim.step(inp()))) dmg.push(h.dmg);
    if (actor(r.sim, 'kbaton')?.alert) alerts++; else if (alerts) { longest = Math.max(longest, alerts); alerts = 0; }
  }
  assert.equal(longest, 30);
  assert.equal(dmg[0], Math.max(1, Math.round(0.9 * 34 - hero(r.s).st.def * 0.5)));
  const turn = guardRig('kbaton', 20, {}, { dir: 'right' });
  turn.e.cd = 1e9;
  run(turn.sim, 11);
  assert.equal(turn.e.dir, 'right', 'still facing away after 11');
  run(turn.sim, 4);
  assert.equal(turn.e.dir, 'left', 'and facing Mike once the turn delay is over');
});

// ------------------------------------------------------------------ the pit Demogorgon

/** The court from docs/level-3.md with Hopper alone (Lv 5) and the pit Demogorgon awake at tile (13, 6). */
function pitRig(party: { id: HeroId; level?: number }[] = [{ id: 'hopper', level: 5 }], over: Parameters<typeof makeWhite>[0] = {}) {
  const r = makeWhite({
    grid: arena(18, 12), party, start: { x: tc(3), y: tf(6) }, spawns: [unit('pitdemo', 'pitdemo', 13, 6, { group: 'boss', dormant: true })], seed: 4, ...over,
  });
  const boss = foe(r.s);
  const d = boss.demo as DemoState;
  hero(r.s).st.hp = 900;
  hero(r.s).hp = 900;
  steady(r.s);
  return { ...r, boss, d, h: hero(r.s) };
}
const quiet = (r: ReturnType<typeof pitRig>): void => { r.d.chargeCd = r.d.spitCd = r.d.leapCd = 99999; r.boss.cd = 99999; };
const pins = (ev: SimEvent[]) => ofType(ev, 'pinned');

test('pitdemo: boss bar DEMOGORGON while it is awake, 600 HP of its own, and the 1.3 one\'s moves', () => {
  const r = pitRig();
  assert.equal(r.sim.view().hud.boss, null, 'nothing while it sleeps');
  r.sim.spawnGroup('boss');
  assert.deepEqual(r.sim.view().hud.boss, { name: 'DEMOGORGON', hp: 600, hpMax: 600 });
  assert.deepEqual(ENEMY_DEFS.pitdemo.x, ENEMY_DEFS.demogorgon.x, 'the same x as the 1.3 one');
  const t = [ENEMY_DEFS.pitdemo.hp, ENEMY_DEFS.pitdemo.atk, ENEMY_DEFS.pitdemo.def, ENEMY_DEFS.pitdemo.speed, ENEMY_DEFS.pitdemo.xp];
  assert.deepEqual(t, [600, 34, 6, 0.8, 60]);
  assert.equal(r.boss.demo?.move, 'walk');
});

test('pitdemo: the swipe is its own ATK, and the 1.3 Demogorgon\'s is still 24', () => {
  for (const [type, atk] of [['pitdemo', 34], ['demogorgon', 24]] as const) {
    const r = makeWhite({ party: [{ id: 'hopper', level: 5 }], grid: arena(18, 12), start: { x: tc(3), y: tf(6) }, spawns: [unit('b', type, 4, 6, { group: 'boss' })], seed: 4 });
    steady(r.s);
    hero(r.s).st.hp = hero(r.s).hp = 900;
    const b = foe(r.s);
    const d = b.demo as DemoState;
    d.chargeCd = d.spitCd = d.leapCd = 99999;
    b.cd = 0;
    const dmg: number[] = [];
    for (let f = 0; f < 150; f++) for (const h of hurt(r.sim.step(inp()))) dmg.push(h.dmg);
    assert.equal(dmg[0], Math.max(1, Math.round(0.5 * atk - hero(r.s).st.def * 0.5)), `${type} swipes for power 0.5 of ${atk}`);
  }
});

test('pitdemo: a charge into the wall stuns it for 150 frames, it takes half again meanwhile, and it spits its own acid at 60 percent', () => {
  const r = pitRig();
  r.sim.spawnGroup('boss');
  r.boss.cd = r.d.spitCd = r.d.leapCd = 99999;
  r.d.chargeCd = 0;
  r.sim.dev.teleport(tc(2), tf(2));
  for (let f = 0; f < 600 && r.d.move !== 'stun'; f++) r.sim.step(inp());
  assert.equal(r.d.move, 'stun');
  assert.equal(r.d.stuns, 1);
  assert.equal(r.d.t, ENEMY_DEFS.pitdemo.x.stunT);
  const was = r.boss.hp;
  hitEnemy(r.s, r.h, r.boss, { power: 1, noCrit: true });
  assert.equal(was - r.boss.hp, Math.round(rollDamage(1, r.h.st.atk, 6, 1) * 1.5));
  // Below 60 percent it roars and spits globs that remember who spat them.
  const s2 = pitRig();
  s2.sim.spawnGroup('boss');
  s2.boss.hp = 300;
  s2.d.petals = true;
  s2.d.spitCd = 0; s2.d.chargeCd = s2.d.leapCd = 99999; s2.boss.cd = 99999;
  for (let f = 0; f < 80 && s2.s.globs.length === 0; f++) s2.sim.step(inp());
  assert.equal(s2.s.globs.length, 3);
  assert.ok(s2.s.globs.every((g) => g.kind === 'pitdemo'));
});

test('pitdemo: HP stops at 1 until the third stun, then the hit that would finish it pins it, once', () => {
  for (const stuns of [0, 1, 2]) {
    const r = pitRig();
    r.sim.spawnGroup('boss');
    quiet(r);
    r.d.stuns = stuns;
    r.boss.hp = 8;
    hitEnemy(r.s, r.h, r.boss, { power: 30, noCrit: true });
    const ev = run(r.sim, 10);
    assert.equal(r.boss.hp, 1, `after ${stuns} stuns`);
    assert.equal(pins(ev).length, 0);
    assert.ok(r.sim.view().hud.boss);
  }
  const r = pitRig();
  r.sim.spawnGroup('boss');
  quiet(r);
  r.d.stuns = 3;
  r.boss.hp = 8;
  hitEnemy(r.s, r.h, r.boss, { power: 30, noCrit: true });
  const ev = run(r.sim, 10);
  assert.deepEqual(pins(ev), [{ t: 'pinned', spawnId: 'pitdemo' }]);
  assert.equal(actor(r.sim, 'pitdemo')?.pose, 'pinned');
  assert.equal(r.boss.hp, 1);
  assert.deepEqual(r.sim.view().hud.boss, { name: 'DEMOGORGON', hp: 1, hpMax: 600 }, 'the bar is still up, nearly empty');
  run(r.sim, 200);
  assert.equal(r.d.move, 'pinned', 'it does not attack any more');
});

/** A pinned pit Demogorgon with Hopper beside it, and Eleven on the bench to try her beam. */
function pinned() {
  const r = pitRig([{ id: 'hopper', level: 5 }, { id: 'eleven', level: 5 }]);
  r.sim.spawnGroup('boss');
  quiet(r);
  r.d.stuns = 3;
  r.boss.hp = 8;
  hitEnemy(r.s, r.h, r.boss, { power: 30, noCrit: true });
  run(r.sim, 2);
  r.sim.dev.teleport(r.boss.x - 24, r.boss.y);
  r.h.mp = HERO_DEFS.hopper.special.mp;
  run(r.sim, 2);
  return r;
}

test('pitdemo: pinned, only Hopper\'s ground slam reaching it finishes it, and every other hit is a try', () => {
  const r = pinned();
  // The haymaker, Eleven's beam and the fire are tries ('poked' with its spawn id) and do nothing.
  let ev = press(r.sim, { attackPressed: true, mx: 0.2 }, HERO_DEFS.hopper.basic.at + 4);
  assert.ok(ofType(ev, 'poked').some((p) => p.propId === 'pitdemo' && p.hero === 'hopper'));
  assert.equal(r.boss.hp, 1);
  const eleven = r.s.heroes[1] as Hero;
  assert.equal(hitEnemy(r.s, eleven, r.boss, { power: 9, beam: true }), 0, 'her beam is not its finisher');
  assert.equal(hitEnemy(r.s, r.h, r.boss, { power: 9, beam: true }), 0);
  assert.equal(hitEnemy(r.s, r.h, r.boss, { power: 9, burn: { frames: 60, tick: 30, dmg: 5 } }), 0);
  assert.equal(r.boss.dead, false);
  // A slam from too far away does not reach it.
  r.sim.dev.teleport(r.boss.x - 70, r.boss.y);
  run(r.sim, 60);
  r.h.mp = 14;
  ev = press(r.sim, { specialPressed: true }, HERO_DEFS.hopper.special.at + 6);
  assert.equal(r.boss.dead, false, 'out of reach');
  // The slam that reaches it kills it with a normal kill and clears the group.
  r.sim.dev.teleport(r.boss.x - 24, r.boss.y);
  run(r.sim, 60);
  r.h.mp = 14;
  ev = press(r.sim, { specialPressed: true }, HERO_DEFS.hopper.special.at + 6);
  const kill = ofType(ev, 'kill');
  assert.deepEqual(kill.map((k) => [k.kind, k.spawnId, k.group]), [['pitdemo', 'pitdemo', 'boss']]);
  assert.ok(kill[0]!.xp > 0);
  assert.deepEqual(ofType(ev, 'groupCleared').map((g) => g.group), ['boss']);
  assert.equal(r.sim.view().hud.boss, null);
});

test('pitdemo: pinned with Hopper out, he stands up with the MP for one slam', () => {
  const r = pitRig([{ id: 'mike', level: 5 }, { id: 'hopper', level: 5 }]);
  r.sim.spawnGroup('boss');
  quiet(r);
  const hop = r.s.heroes[1] as Hero;
  hop.ko = true; hop.hp = 0; hop.mp = 0;
  r.d.stuns = 3;
  r.boss.hp = 8;
  hitEnemy(r.s, r.h, r.boss, { power: 30, noCrit: true });
  assert.equal(hop.ko, false);
  assert.ok(hop.hp >= 1);
  assert.ok(hop.mp >= HERO_DEFS.hopper.special.mp);
});

test('pitdemo: the 1.3 Demogorgon still takes only Eleven\'s beam, and Hopper\'s slam is a try there', () => {
  const r = makeWhite({ party: [{ id: 'hopper', level: 5 }, { id: 'eleven', level: 5 }], grid: arena(18, 12), start: { x: tc(3), y: tf(6) }, spawns: [unit('demo', 'demogorgon', 13, 6, { group: 'boss' })], seed: 4 });
  steady(r.s);
  const boss = foe(r.s);
  const d = boss.demo as DemoState;
  d.chargeCd = d.spitCd = d.leapCd = 99999; boss.cd = 99999;
  d.stuns = 3; boss.hp = 8;
  hitEnemy(r.s, hero(r.s), boss, { power: 30, noCrit: true });
  assert.equal(d.move, 'pinned');
  assert.equal(hitEnemy(r.s, hero(r.s), boss, { power: 9, slam: true }), 0, 'a slam does nothing to it');
  assert.ok(hitEnemy(r.s, r.s.heroes[1] as Hero, boss, { power: 9, beam: true }) > 0, 'her beam does');
});

// ------------------------------------------------------------------ the bot

test('bot: Hopper alone against the pit Demogorgon leaves its charge line, slams it once it is pinned, and wins', () => {
  const wins: number[] = [];
  for (const seed of [1, 2, 3]) {
    const grid = arena(18, 12);
    const { sim } = makeWhite({
      grid, party: [{ id: 'hopper', level: 6 }], start: { x: tc(3), y: tf(6) }, seed, enemyMult: 0.5,
      spawns: [unit('pitdemo', 'pitdemo', 13, 6, { group: 'boss' })],
    });
    const bot = createBot({ grid, waypoints: [{ x: tc(8), y: tf(6) }] });
    let pinned = false, killed = false, down = false;
    for (let f = 0; f < 9000 && !killed && !down; f++) {
      const ev = sim.step(bot.next(sim));
      if (pins(ev).length > 0) pinned = true;
      if (ofType(ev, 'kill').some((k) => k.kind === 'pitdemo')) killed = true;
      if (ev.some((e) => e.t === 'allDown')) down = true;
    }
    if (killed) { assert.ok(pinned, 'it was pinned first'); wins.push(seed); }
  }
  assert.deepEqual(wins, [1, 2, 3], 'at half the stage factor the bot wins every time');
});
