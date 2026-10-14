// Level 4's enemies (docs/level-4.md, "New enemies"): the young demodog and its pack rule, the vine and the pod.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ENEMY_DEFS } from '../src/enemies/defs.ts';
import { hitEnemy } from '../src/combat/damage.ts';
import type { Enemy, Hero } from '../src/combat/state.ts';
import type { SimSpawn } from '../src/core/types.ts';
import { arena, inp, makeWhite, ofType, press, run, sfxIds, tc, tf } from './sim-helpers.ts';

const foe = (id: string, type: 'demodog' | 'vine' | 'pod', tx: number, ty: number, extra: Partial<Extract<SimSpawn, { kind: 'enemy' }>> = {}): SimSpawn =>
  ({ kind: 'enemy', id, type, tx, ty, group: 'g', ...extra });
/** The damage range of an enemy hit on a hero with `def`, at the 1.15 stage factor on chief. */
function takes(power: number, atk: number, def: number, mult = 1.15): { lo: number; hi: number } {
  const f = (spread: number): number => Math.max(1, Math.round((power * atk * spread - def * 0.5) * mult));
  return { lo: f(0.9), hi: f(1.1) };
}
const hurts = (ev: ReturnType<typeof run>): number[] => ofType(ev, 'hit').filter((h) => !h.onEnemy).map((h) => h.dmg);
const opts = { enemyMult: 1.15, seed: 3 };

// ---------------------------------------------------------------- demodog
test('demodog: the numbers', () => {
  const d = ENEMY_DEFS.demodog;
  assert.deepEqual([d.hp, d.atk, d.def, d.speed, d.xp, d.windup, d.power], [34, 12, 2, 1.2, 9, 28, 0.9]);
  assert.deepEqual([d.x.orbit, d.x.lungeT, d.x.lungeSpeed, d.x.recover, d.x.gap], [48, 14, 4, 30, 20]);
});

test('demodog: it circles the hero about 48 px out and does not stand still', () => {
  const { sim, s } = makeWhite({ party: [{ id: 'mike', level: 5 }], start: { x: tc(10), y: tf(8) }, spawns: [foe('d', 'demodog', 15, 8)], ...opts });
  const e = s.enemies[0] as Enemy;
  e.aware = true; e.cd = 99999;
  run(sim, 90);
  const hero = s.heroes[0] as Hero;
  let min = 999, max = 0, travelled = 0, lx = e.x, ly = e.y;
  for (let i = 0; i < 240; i++) {
    run(sim, 1);
    const d = Math.hypot(e.x - hero.x, e.y - hero.y);
    min = Math.min(min, d); max = Math.max(max, d);
    travelled += Math.hypot(e.x - lx, e.y - ly); lx = e.x; ly = e.y;
  }
  assert.ok(min > 36 && max < 62, `orbits between ${min.toFixed(0)} and ${max.toFixed(0)} px`);
  assert.ok(travelled > 150, `walked ${travelled.toFixed(0)} px round him`);
  assert.equal(sim.view().actors.find((a) => a.id === 'demodog')?.anim, 'walk');
});

test('demodog: 28 frames of wind-up under the "!", a 14 frame lunge at 4 px a frame with a chomp, 30 frames of recovery', () => {
  const { sim, s } = makeWhite({ party: [{ id: 'mike', level: 5 }], start: { x: tc(10), y: tf(8) }, spawns: [foe('d', 'demodog', 14, 8)], ...opts });
  const e = s.enemies[0] as Enemy;
  e.aware = true; e.cd = 0; e.x = tc(10) + 46; e.y = tf(8);
  const hero = s.heroes[0] as Hero;
  const frames: { alert: boolean; anim: string; x: number; y: number; sfx: string[]; hurt: number[] }[] = [];
  for (let f = 0; f < 120; f++) {
    const ev = sim.step(inp());
    const a = sim.view().actors.find((x) => x.id === 'demodog');
    frames.push({ alert: a?.alert === true, anim: a?.anim ?? '', x: e.x, y: e.y, sfx: sfxIds(ev), hurt: hurts(ev) });
  }
  const first = frames.findIndex((t) => t.alert);
  let wind = 0;
  while (frames[first + wind]?.alert) wind++;
  assert.equal(wind, 28);
  const lunge = first + wind;
  assert.ok(frames[lunge]?.sfx.includes('lunge'));
  assert.equal(frames[lunge]?.anim, 'dash');
  let air = 0;
  while (frames[lunge + air]?.anim === 'dash') air++;
  assert.ok(air >= 14 && air <= 17, `${air} frames of lunge (14, and the bite freezes play for three more)`);
  const step = Math.hypot((frames[lunge + 5]?.x ?? 0) - (frames[lunge + 4]?.x ?? 0), (frames[lunge + 5]?.y ?? 0) - (frames[lunge + 4]?.y ?? 0));
  assert.ok(Math.abs(step - 4) < 0.2, `${step.toFixed(2)} px a frame`);
  const bites = frames.filter((t) => t.hurt.length > 0);
  assert.equal(bites.length, 1, 'one bite');
  assert.ok(bites[0]?.sfx.includes('chomp'));
  const range = takes(0.9, 12, hero.st.def);
  assert.ok((bites[0]?.hurt[0] ?? 0) >= range.lo && (bites[0]?.hurt[0] ?? 0) <= range.hi, `bite ${bites[0]?.hurt[0]}, expected ${range.lo} to ${range.hi}`);
  const after = lunge + air;
  let still = 0;
  while (frames[after + still]?.anim === 'idle') still++;
  assert.ok(still >= 29 && still <= 31, `${still} frames of recovery`);
});

test('demodog: in a pack only one winds up or lunges at a time, 20 frames apart at the least, and each takes its turn', () => {
  const dogs = [foe('d0', 'demodog', 12, 5), foe('d1', 'demodog', 12, 7), foe('d2', 'demodog', 12, 9), foe('d3', 'demodog', 14, 7)];
  const { sim, s } = makeWhite({ party: [{ id: 'mike', level: 5 }], start: { x: tc(8), y: tf(7) }, spawns: dogs, ...opts, god: true });
  sim.spawnGroup('g');
  const lunges: { id: string; start: number; end: number }[] = [];
  let open: { id: string; start: number; end: number } | null = null;
  let both = 0;
  for (let f = 0; f < 1500; f++) {
    run(sim, 1);
    const busy = s.enemies.filter((e) => e.mode === 'windup' || e.mode === 'lunge');
    if (busy.length > 1) both++;
    const flying = s.enemies.filter((e) => e.mode === 'lunge');
    if (flying.length === 1 && !open) { open = { id: (flying[0] as Enemy).id, start: f, end: f }; lunges.push(open); }
    if (open && flying.length === 0) open = null;
    if (open) open.end = f;
  }
  assert.equal(both, 0, 'never two at once');
  assert.ok(lunges.length >= 12, `${lunges.length} lunges in 25 seconds`);
  for (let i = 1; i < lunges.length; i++) {
    assert.ok((lunges[i] as { start: number }).start - (lunges[i - 1] as { end: number }).end >= 20, `lunges ${i - 1} and ${i} are ${(lunges[i] as { start: number }).start - (lunges[i - 1] as { end: number }).end} frames apart`);
  }
  const counts = new Map<string, number>();
  for (const l of lunges) counts.set(l.id, (counts.get(l.id) ?? 0) + 1);
  assert.equal(counts.size, 4, 'every dog got a turn');
  const spread = Math.max(...counts.values()) - Math.min(...counts.values());
  assert.ok(spread <= 2, `turns ${[...counts.values()].join(',')}`);
});

test('demodog: a hit breaks a wind-up, and the pack\'s turn goes on', () => {
  const { sim, s } = makeWhite({ party: [{ id: 'mike', level: 5 }], start: { x: tc(8), y: tf(7) }, spawns: [foe('d0', 'demodog', 12, 7), foe('d1', 'demodog', 12, 9)], ...opts, god: true });
  sim.spawnGroup('g');
  const a = s.enemies[0] as Enemy, b = s.enemies[1] as Enemy;
  for (let i = 0; i < 200 && a.mode !== 'windup' && b.mode !== 'windup'; i++) run(sim, 1);
  const winding = a.mode === 'windup' ? a : b;
  const other = winding === a ? b : a;
  hitEnemy(s, s.heroes[0] as Hero, winding, { power: 1, kb: 2, noCrit: true });
  assert.notEqual(winding.mode, 'windup');
  let turn = false;
  for (let i = 0; i < 150 && !turn; i++) { run(sim, 1); turn = other.mode === 'windup' || other.mode === 'lunge'; }
  assert.ok(turn, 'the other takes over');
});

// ---------------------------------------------------------------- vine
test('vine: the numbers', () => {
  const v = ENEMY_DEFS.vine;
  assert.deepEqual([v.hp, v.atk, v.def, v.speed, v.xp, v.windup, v.power, v.x.reach, v.x.slowT, v.x.burnMul], [30, 9, 2, 0, 5, 30, 0.8, 34, 90, 2]);
});

test('vine: rooted. 30 frames of wind-up in a 34 px reach, then a lash for power 0.8 that slows for 90 frames', () => {
  const { sim, s } = makeWhite({ party: [{ id: 'mike', level: 5 }], start: { x: tc(10) - 28, y: tf(8) }, spawns: [foe('v', 'vine', 10, 8)], ...opts });
  const e = s.enemies[0] as Enemy;
  const hero = s.heroes[0] as Hero;
  const x0 = e.x, y0 = e.y;
  const frames: { alert: boolean; hurt: number[]; slow: number }[] = [];
  for (let f = 0; f < 200; f++) {
    const ev = sim.step(inp());
    frames.push({ alert: sim.view().actors.find((a) => a.id === 'vine')?.alert === true, hurt: hurts(ev), slow: hero.stat.slow });
  }
  const first = frames.findIndex((t) => t.alert);
  let wind = 0;
  while (frames[first + wind]?.alert) wind++;
  assert.equal(wind, 30);
  const lash = frames[first + wind];
  const range = takes(0.8, 9, hero.st.def);
  assert.ok(lash && lash.hurt.length === 1 && lash.hurt[0] as number >= range.lo && lash.hurt[0] as number <= range.hi, `lash ${lash?.hurt}, expected ${range.lo} to ${range.hi}`);
  assert.equal(lash?.slow, 90, 'slowed for 90 frames');
  assert.ok(Math.abs((frames[first + wind + 60]?.slow ?? 0) - 30) <= 4, 'it counts down (the lash freezes play for three frames)');
  assert.equal(frames[first + wind + 100]?.slow, 0);
  assert.equal(e.x, x0); assert.equal(e.y, y0);
});

test('vine: a slowed hero walks at 55 percent of his pace, and the view tints him', () => {
  const walk = (slow: boolean): number => {
    const { sim, s } = makeWhite({ party: [{ id: 'mike', level: 5 }], start: { x: tc(4), y: tf(8) }, spawns: [], ...opts });
    const hero = s.heroes[0] as Hero;
    if (slow) hero.stat.slow = 90;
    const x0 = hero.x;
    run(sim, 60, inp({ mx: 1 }));
    if (slow) assert.equal(sim.view().actors.find((a) => a.id === 'mike')?.tint, 'purple');
    return hero.x - x0;
  };
  const fast = walk(false), slow = walk(true);
  assert.ok(Math.abs(slow / fast - 0.55) < 0.03, `${(slow / fast).toFixed(2)} of his pace`);
});

test('vine: out of reach it never lashes, and a hero who steps out of reach during the wind-up is missed', () => {
  const far = makeWhite({ party: [{ id: 'mike', level: 5 }], start: { x: tc(10) - 48, y: tf(8) }, spawns: [foe('v', 'vine', 10, 8)], ...opts });
  assert.equal(hurts(run(far.sim, 200)).length, 0);
  const dodge = makeWhite({ party: [{ id: 'mike', level: 5 }], start: { x: tc(10) - 24, y: tf(8) }, spawns: [foe('v', 'vine', 10, 8)], ...opts });
  for (let i = 0; i < 100 && dodge.s.enemies[0]?.mode !== 'windup'; i++) run(dodge.sim, 1);
  assert.equal(dodge.s.enemies[0]?.mode, 'windup');
  dodge.sim.dev.teleport(tc(10) - 60, tf(8));
  const ev = run(dodge.sim, 40);
  assert.equal(hurts(ev).length, 0);
  assert.equal((dodge.s.heroes[0] as Hero).stat.slow, 0);
});

test('vine: fire does double damage to it, in the hit and in the burn that follows', () => {
  const plain = (kind: 'vine' | 'agent', burn: boolean): number => {
    const { s } = makeWhite({ party: [{ id: 'dustin', level: 5 }], start: { x: tc(4), y: tf(8) }, spawns: [{ kind: 'enemy', id: 'x', type: kind, tx: 5, ty: 8, group: 'g' }], ...opts, seed: 8 });
    return hitEnemy(s, s.heroes[0] as Hero, s.enemies[0] as Enemy, { power: 0.5, noCrit: true, ...(burn ? { burn: { frames: 90, tick: 30, dmg: 4 } } : {}) });
  };
  assert.equal(plain('vine', true), plain('vine', false) * 2, 'the burning hit');
  assert.equal(plain('agent', true), plain('agent', false), 'nobody else');
  const tick = (kind: 'vine' | 'agent'): number => {
    const { sim, s } = makeWhite({ party: [{ id: 'mike', level: 5 }], start: { x: tc(2), y: tf(2) }, spawns: [{ kind: 'enemy', id: 'x', type: kind, tx: 15, ty: 12, group: 'g' }], ...opts });
    const e = s.enemies[0] as Enemy;
    e.hp = e.hpMax = 100;
    e.stat.burn = 100; e.stat.burnDmg = 4; e.stat.burnTick = 1;
    run(sim, 2);
    return 100 - e.hp;
  };
  assert.equal(tick('vine'), 8);
  assert.equal(tick('agent'), 4);
});

test('vine: Dustin\'s real spray kills it faster than Lucas\'s rock does, and nothing shoves it', () => {
  const kill = (id: 'dustin' | 'mike', input: Partial<Parameters<typeof inp>[0]>): { hp: number; moved: number } => {
    const { sim, s } = makeWhite({ party: [{ id, level: 5 }], start: { x: tc(10) - 40, y: tf(8) }, spawns: [foe('v', 'vine', 10, 8, { hidden: false })], ...opts });
    const e = s.enemies[0] as Enemy;
    e.cd = 99999;
    const x0 = e.x;
    press(sim, { mx: 0.2, ...input }, 40);
    return { hp: e.hp, moved: Math.abs(e.x - x0) };
  };
  const spray = kill('dustin', { specialPressed: true });
  const bat = kill('mike', { attackPressed: true });
  assert.ok(spray.hp < bat.hp || spray.hp <= 0, `spray left ${spray.hp}, a swing left ${bat.hp}`);
  assert.equal(spray.moved + bat.moved, 0, 'rooted');
});

// ---------------------------------------------------------------- pod
test('pod: the numbers', () => {
  const p = ENEMY_DEFS.pod;
  assert.deepEqual([p.hp, p.atk, p.def, p.speed, p.xp, p.aggro, p.windup, p.power, p.x.cloud], [16, 6, 0, 0, 3, 48, 40, 0.6, 28]);
});

test('pod: a hero within 48 px starts a 40 frame swell, then it bursts into a spore cloud that hurts and slows, and dies for no XP', () => {
  const { sim, s } = makeWhite({ party: [{ id: 'mike', level: 5 }], start: { x: tc(10) - 20, y: tf(8) }, spawns: [foe('p', 'pod', 10, 8)], ...opts });
  const hero = s.heroes[0] as Hero;
  const frames: { alert: boolean; ev: ReturnType<typeof run>; fx: string[] }[] = [];
  for (let f = 0; f < 80; f++) {
    const ev = sim.step(inp());
    const a = sim.view().actors.find((x) => x.id === 'pod');
    frames.push({ alert: a?.alert === true, ev, fx: sim.view().fx.map((x) => x.kind) });
  }
  const first = frames.findIndex((t) => t.alert);
  assert.ok(first >= 0 && first < 4);
  let swell = 0;
  while (frames[first + swell]?.alert) swell++;
  assert.equal(swell, 40, 'a 40 frame swell');
  const burst = frames[first + swell] as (typeof frames)[number];
  assert.ok(burst.fx.includes('spore'), 'a spore cloud');
  const range = takes(0.6, 6, hero.st.def);
  const dmg = hurts(burst.ev);
  assert.ok(dmg.length === 1 && dmg[0] as number >= range.lo && dmg[0] as number <= range.hi, `cloud ${dmg}, expected ${range.lo} to ${range.hi}`);
  assert.equal(hero.stat.slow > 0, true, 'and the hero is slowed');
  const spore = sim.view().fx.find((f) => f.kind === 'spore');
  assert.ok(spore === undefined || spore.w === 56);
  const kills = frames.flatMap((t) => ofType(t.ev, 'kill'));
  assert.equal(kills.length, 1);
  assert.equal(kills[0]?.xp, 0, 'it pays nothing for dying in its own burst');
  assert.equal(sim.stats().xpEarned, 0);
  assert.equal(s.items.filter((i) => i.kind === 'quarter').length, 0, 'and drops nothing');
  assert.deepEqual(frames.flatMap((t) => ofType(t.ev, 'groupCleared')), [{ t: 'groupCleared', group: 'g' }], 'it still clears its group');
  assert.equal(sim.enemiesAlive(), 0);
});

test('pod: the cloud reaches 28 px. A hero beyond that, even inside the 48 that starts the swell, is untouched', () => {
  const { sim, s } = makeWhite({ party: [{ id: 'mike', level: 5 }], start: { x: tc(10) - 40, y: tf(8) }, spawns: [foe('p', 'pod', 10, 8)], ...opts });
  const ev = run(sim, 80);
  assert.equal(sim.enemiesAlive(), 0, 'it swelled and burst');
  assert.equal(hurts(ev).length, 0);
  assert.equal((s.heroes[0] as Hero).stat.slow, 0);
});

test('pod: killed before it bursts it is worth its 3 XP, with no cloud', () => {
  const { sim, s } = makeWhite({ party: [{ id: 'mike', level: 5 }], start: { x: tc(10) - 20, y: tf(8) }, spawns: [foe('p', 'pod', 10, 8)], ...opts });
  const pod = s.enemies[0] as Enemy;
  for (let i = 0; i < 30 && pod.mode !== 'windup'; i++) run(sim, 1);
  assert.equal(pod.mode, 'windup');
  run(sim, 10);
  pod.hp = 0;
  const ev = run(sim, 3);
  const kills = ofType(ev, 'kill');
  assert.equal(kills.length, 1);
  assert.equal(kills[0]?.xp, 3);
  assert.equal(sim.stats().xpEarned, 3);
  assert.equal(sim.view().fx.some((f) => f.kind === 'spore'), false);
  assert.equal(hurts(ev).length, 0);
});

test('pod: a hero outside 48 px leaves it asleep, and rooted things are not shoved by a crowd', () => {
  const calm = makeWhite({ party: [{ id: 'mike', level: 5 }], start: { x: tc(10) - 60, y: tf(8) }, spawns: [foe('p', 'pod', 10, 8)], ...opts });
  run(calm.sim, 200);
  assert.equal(calm.sim.enemiesAlive(), 1);
  const crowd = makeWhite({ party: [{ id: 'mike', level: 5 }], start: { x: tc(3), y: tf(3) }, grid: arena(24, 16), ...opts,
    spawns: [foe('v', 'vine', 12, 8), foe('d0', 'demodog', 12, 8), foe('d1', 'demodog', 12, 8)] });
  const vine = crowd.s.enemies[0] as Enemy;
  const x0 = vine.x, y0 = vine.y;
  run(crowd.sim, 60);
  assert.equal(vine.x, x0);
  assert.equal(vine.y, y0);
});
