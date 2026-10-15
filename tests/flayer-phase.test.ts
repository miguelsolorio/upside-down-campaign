// The Mind Flayer's waves, phase two and the sweep, the boss rules, its death all at once, the boss bar and the XP (docs/level-9.md, "The Mind
// Flayer"). The numbers, the legs and the head are in tests/flayer.test.ts, the bot in tests/flayer-bot.test.ts. Numbers a retune moves are
// read from ENEMY_DEFS.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { SimEvent } from '../src/core/types.ts';
import { confuse } from '../src/combat/confuse.ts';
import { damageRange, hitEnemy } from '../src/combat/damage.ts';
import { startLine } from '../src/enemies/flayer_legs.ts';
import type { Enemy } from '../src/combat/state.ts';
import { idle, ofType, run, sfxIds, tc, tf, makeWhite } from './sim-helpers.ts';
import { BURROWS, FLAYER, FX, LEG, LX, at, bodyView, court, cut, cutAll, fRig, flayerSpawns, hammer, hold, legView, ls, rigOf, until } from './flayer-helpers.ts';

const hurt = (ev: SimEvent[]) => ofType(ev, 'hit').filter((h) => !h.onEnemy);
const waves = (r: { s: { enemies: Enemy[] } }) => r.s.enemies.filter((e) => e.group === 'waves' && !e.dead);
const sweeper = (r: ReturnType<typeof fRig>): Enemy | undefined => r.legs.find((l) => ls(l).sweep !== null);
const bandFx = (r: ReturnType<typeof fRig>) => r.sim.view().fx.find((f) => f.kind === 'sweep');

// ------------------------------------------------------------------ waves

test('waves: a wave of Flayed comes up at the arena\'s sides, awake, worth 1 XP each, in group waves', () => {
  const r = fRig({ god: true });
  r.f.waveCd = 0;
  run(r.sim, 1);
  const w = waves(r);
  assert.equal(w.length, FX.waveN);
  assert.ok(w.every((e) => e.kind === 'flayed' && e.aware && e.xp === 1 && e.drop === 0 && !e.dormant));
  const sides = BURROWS.map((b) => tc(b.tx));
  assert.ok(w.every((e) => sides.some((x) => Math.abs(e.x - x) < 4)), `at x ${w.map((e) => e.x).join(', ')}`);
  // A wave of two or more fills both sides.
  if (FX.waveN >= 2) assert.ok(sides.every((x) => w.some((e) => Math.abs(e.x - x) < 4)), 'one at each side');
});

test('waves: one wave every waveEvery frames while the head is up, the first after waveFirst', () => {
  const r = fRig({ god: true }, true, false);
  hold(r);
  r.f.waveCd = FX.waveFirst;
  r.f.slamCd = 99999; r.f.sweepCd = 99999;
  const starts: number[] = [];
  let seen = 0;
  for (let f = 0; f < FX.waveFirst + FX.waveEvery * 2 + 100; f++) {
    run(r.sim, 1);
    for (const e of waves(r)) { e.dead = true; e.hp = 0; }
    if (r.f.waves !== seen) { seen = r.f.waves; starts.push(f); }
  }
  assert.equal(starts.length, 3);
  assert.deepEqual(starts.slice(1).map((s, i) => s - (starts[i] as number)), [FX.waveEvery, FX.waveEvery]);
  assert.ok(Math.abs((starts[0] as number) - FX.waveFirst) <= 1);
});

test('waves: at most waveMax alive; a wave with room for fewer brings what fits, a wave with none brings none and tries again soon', () => {
  const r = fRig({ god: true });
  let alive = 0;
  while (alive < FX.waveMax) {
    r.f.waveCd = 0; run(r.sim, 1);
    alive = Math.min(alive + FX.waveN, FX.waveMax);
    assert.equal(waves(r).length, alive, 'what fits comes');
  }
  const made = r.f.waves;
  r.f.waveCd = 0; run(r.sim, 1);
  assert.equal(waves(r).length, FX.waveMax);
  assert.equal(r.f.waves, made, 'not counted');
  assert.ok(r.f.waveCd > 0 && r.f.waveCd < FX.waveEvery, 'and it tries again before a whole round');
  waves(r)[0]!.hp = 0;
  run(r.sim, 30);
  r.f.waveCd = 0; run(r.sim, 1);
  assert.equal(waves(r).length, FX.waveMax, 'a dead one makes room');
});

test('waves: none while the head is down, and the clock waits for it', () => {
  const r = fRig({ god: true });
  cutAll(r);
  until(r, () => r.f.move === 'down');
  r.f.waveCd = 5;
  run(r.sim, 200);
  assert.equal(waves(r).length, 0);
  assert.equal(r.f.waveCd, 5);
});

test('waves: a stage with no burrows gets them on open floor round the hero', () => {
  const r = fRig({ god: true, burrows: [] });
  at(r, tc(11), tf(9));
  r.f.waveCd = 0;
  run(r.sim, 1);
  const w = waves(r);
  assert.equal(w.length, FX.waveN);
  assert.ok(w.every((e) => Math.hypot(e.x - r.hero.x, e.y - r.hero.y) < 90));
});

test('waves: a Flayed of a wave is worth 1 XP and drops nothing', () => {
  const r = fRig({ god: true });
  r.f.waveCd = 0; run(r.sim, 1);
  const w = waves(r)[0] as Enemy;
  w.hp = 1;
  hitEnemy(r.s, r.hero, w, { power: 5, noCrit: true });
  const ev = run(r.sim, 8);
  assert.equal(ofType(ev, 'kill').find((k) => k.group === 'waves')?.xp, 1);
  assert.equal(r.s.items.length, 0);
});

// ------------------------------------------------------------------ phase two

test('phase two: under half HP the warning drops to 28 frames and two legs go at once', () => {
  const r = fRig({ god: true });
  r.body.hp = r.body.hpMax * 0.51;
  run(r.sim, 2);
  assert.equal(r.f.phase2, false, 'not at 51 percent');
  r.body.hp = r.body.hpMax * 0.5;
  const ev = run(r.sim, 2);
  assert.equal(r.f.phase2, true);
  assert.ok(sfxIds(ev).includes('roar'));
  assert.ok(r.sim.view().floaters.some((f) => f.text === 'ENRAGED'));
  at(r, tc(11), tf(9));
  r.f.slamCd = 0;
  run(r.sim, 1);
  const going = r.legs.filter((l) => ls(l).move === 'warn');
  assert.equal(going.length, 2, 'two legs');
  let frames = 0;
  while (going.every((l) => ls(l).move === 'warn')) { run(r.sim, 1); frames++; }
  assert.equal(frames, LX.warnLow, 'and the warning is 28 frames');
});

test('phase two: never more than two legs on lines, and a pair about every slam gap', () => {
  const r = fRig({ god: true }, true, false);
  r.body.hp = r.body.hpMax * 0.4;
  r.f.sweepCd = 99999;
  let most = 0, was = 0;
  const starts: number[] = [];
  for (let f = 0; f < 1400; f++) {
    run(r.sim, 1);
    const n = r.legs.filter((l) => ls(l).move === 'warn' || ls(l).move === 'slam').length;
    most = Math.max(most, n);
    if (n > 0 && was === 0) starts.push(f);
    was = n;
  }
  assert.equal(most, 2);
  assert.ok(starts.length >= (1400 - FX.riseT - FX.slamFirst) / (FX.slamEvery * 1.5), `${starts.length} pairs`);
});

// ------------------------------------------------------------------ the sweep

test('sweep: one fx, the band across the arena on the hero\'s row, 24 px tall, 40 frames of warning then the strike', () => {
  const r = fRig({ god: true });
  r.f.phase2 = true;
  at(r, tc(11), 150);
  r.f.sweepCd = 0;
  run(r.sim, 1);
  const leg = sweeper(r) as Enemy;
  assert.ok(leg, 'a leg is sweeping');
  assert.equal(legView(r, r.legs.indexOf(leg) + 1)?.pose, 'warn');
  assert.equal(r.sim.view().fx.filter((f) => f.kind === 'sweep').length, 1);
  const fx = bandFx(r);
  assert.equal(fx?.h, LX.bandH);
  assert.equal(fx?.y, 150 - LX.bandH / 2, 'its top is 12 px above the row');
  assert.ok((fx?.x ?? 99) <= 17 && (fx?.x ?? 0) + (fx?.w ?? 0) >= 335, `from ${fx?.x} to ${(fx?.x ?? 0) + (fx?.w ?? 0)}: wall to wall`);
  assert.equal(fx?.life, LX.sweepWarn + LX.slamT);
  const idx = r.legs.indexOf(leg) + 1;
  let warning = 1;
  while (bandFx(r) && legView(r, idx)?.pose === 'warn') { assert.equal(bandFx(r)?.t, warning - 1); run(r.sim, 1); warning++; }
  assert.equal(warning - 1, LX.sweepWarn, '40 frames of warning, t counting from 0');
  assert.equal(legView(r, idx)?.pose, 'slam');
  assert.equal(bandFx(r)?.t, LX.sweepWarn);
  run(r.sim, LX.slamT);
  assert.equal(bandFx(r), undefined, 'and the band is gone after the strike');
});

test('sweep: a hero in the band takes the sweep\'s power and knockback out of it, once; one outside it, or who left, takes nothing', () => {
  let def = 0;
  const hit = (dy: number, leaves = false): { n: number; dmg: number; moved: number } => {
    const r = fRig({ god: false });
    def = r.hero.st.def;
    r.f.phase2 = true;
    at(r, tc(11), 150);
    r.f.sweepCd = 0;
    run(r.sim, 1);
    at(r, tc(3) + (dy === 5 ? 200 : 0), 150 + dy);
    const y0 = r.hero.y;
    if (leaves) { run(r.sim, 20); at(r, tc(3), 150 + 30); }
    const ev = run(r.sim, LX.sweepWarn + LX.slamT);
    const h = hurt(ev);
    return { n: h.length, dmg: (h[0] as { dmg: number } | undefined)?.dmg ?? 0, moved: r.hero.y - y0 };
  };
  const inside = hit(-9);
  const range = damageRange(LX.sweepPower, LEG.atk, def);
  assert.equal(inside.n, 1);
  assert.ok(inside.dmg >= range.min && inside.dmg <= range.max, `${inside.dmg}, not in ${range.min} to ${range.max}, for the sweep's power of the leg's ATK`);
  assert.ok(inside.moved < -4, 'thrown up out of the band, the way he was above its middle');
  assert.equal(hit(5).n, 1, 'anywhere along it');
  assert.equal(hit(14).n, 0, 'just outside');
  assert.equal(hit(0, true).n, 0, 'who left in time');
});

test('sweep: about every sweepEvery frames in phase two, and never in phase one', () => {
  const r = fRig({ god: true }, true, false);
  r.f.sweepCd = FX.sweepFirst;
  const phase1 = (() => { let n = 0; for (let f = 0; f < 600; f++) { run(r.sim, 1); if (sweeper(r)) n++; } return n; })();
  assert.equal(phase1, 0);
  r.body.hp = r.body.hpMax * 0.45;
  const starts: number[] = [];
  let was = false;
  for (let f = 0; f < 3600; f++) {
    run(r.sim, 1);
    const on = sweeper(r) !== undefined;
    if (on && !was) starts.push(f);
    was = on;
  }
  assert.ok(starts.length >= 6, `${starts.length} sweeps in 3600 frames`);
  const gaps = starts.slice(1).map((s, i) => s - (starts[i] as number));
  assert.ok(gaps.every((g) => g >= FX.sweepEvery - 60 && g <= FX.sweepEvery + 120), `gaps ${gaps.join(', ')}`);
});

test('sweep: a lone leg sweeps, and not while a line is warned', () => {
  const r = fRig({ god: true });
  r.f.phase2 = true;
  at(r, tc(11), 150);
  startLine(r.s, r.legs[0] as Enemy, r.hero, LX.warn);
  r.f.sweepCd = 0;
  run(r.sim, 5);
  assert.equal(sweeper(r), undefined, 'it waits for the line');
  until(r, () => sweeper(r) !== undefined, 200);
  assert.notEqual(sweeper(r), r.legs[0]);
});

// ------------------------------------------------------------------ boss rules

test('boss rules: Word vomit staggers a leg 30 frames, so its slam waits, and does nothing to the body', () => {
  const strike = (vomit: boolean): number => {
    const r = fRig({ god: true });
    at(r, tc(8), tf(9));
    const leg = r.legs[0] as Enemy;
    startLine(r.s, leg, r.hero, LX.warn);
    run(r.sim, 10);
    if (vomit) { confuse(r.s, leg, 180); assert.ok(r.sim.view().floaters.some((f) => f.text === 'DAZED')); }
    return until(r, () => ls(leg).move === 'slam').frames;
  };
  assert.equal(strike(true) - strike(false), 30);
  const r = fRig();
  confuse(r.s, r.body, 180);
  run(r.sim, 5);
  assert.deepEqual([r.body.stagger, r.body.stat.confuse], [0, 0]);
  assert.equal(r.sim.view().floaters.filter((f) => f.text === 'DAZED').length, 0);
});

test('boss rules: Word vomit on a sweeping leg holds the band\'s warning too', () => {
  const r = fRig({ god: true });
  r.f.phase2 = true;
  at(r, tc(11), 150);
  r.f.sweepCd = 0;
  run(r.sim, 20);
  const leg = sweeper(r) as Enemy;
  const t0 = bandFx(r)?.t as number;
  confuse(r.s, leg, 180);
  run(r.sim, 29);
  assert.equal(bandFx(r)?.t, t0 + 0, 'the band waits');
  run(r.sim, 2);
  assert.ok((bandFx(r)?.t as number) > t0, 'and goes on');
});

test('boss rules: knockback, a lure and a trap do nothing to the body or its legs', () => {
  const r = fRig({ god: false }, true, true, [{ id: 'mike', level: 7 }, { id: 'nancy', level: 5 }]);
  cut(r, 1); cut(r, 2); cut(r, 3);
  const leg = r.legs[3] as Enemy;
  const before = [leg.x, leg.y, r.body.x, r.body.y];
  hitEnemy(r.s, r.hero, leg, { power: 1, kb: 30, angle: 0, noCrit: true });
  r.s.lure = { x: leg.x + 30, y: leg.y, age: 0, life: 300, pull: 300 };
  r.s.traps.push({ x: leg.x, y: leg.y, age: 0, life: 600, by: 'nancy' });
  run(r.sim, 60);
  assert.deepEqual([leg.x, leg.y, r.body.x, r.body.y], before);
  assert.equal(leg.stat.stun, 0);
  assert.equal(r.s.traps.length, 1, 'and the trap is still there');
  cut(r, 4);
  until(r, () => r.f.move === 'down');
  hitEnemy(r.s, r.hero, r.body, { power: 1, kb: 30, angle: 0, noCrit: true });
  run(r.sim, 20);
  assert.deepEqual([r.body.x, r.body.y], [before[2], before[3]]);
});

// ------------------------------------------------------------------ dying all at once

test('death: at 0 HP the body and all four legs die in the same tick, with one groupCleared flayer and the body\'s XP', () => {
  const r = fRig({ god: true });
  cut(r, 1); cut(r, 2);
  cut(r, 3); cut(r, 4);
  until(r, () => r.f.move === 'down');
  run(r.sim, 6);
  r.body.hp = 3;
  hammer(r, r.body, 5);
  const ticks: SimEvent[][] = [];
  for (let i = 0; i < 12; i++) ticks.push(run(r.sim, 1));
  const killTicks = ticks.filter((t) => ofType(t, 'kill').length > 0);
  assert.equal(killTicks.length, 1, 'one tick');
  const kills = ofType(killTicks[0] as SimEvent[], 'kill');
  assert.deepEqual(kills.map((k) => k.spawnId).sort(), ['flayer', 'leg1', 'leg2', 'leg3', 'leg4']);
  assert.deepEqual(kills.map((k) => [k.spawnId, k.xp]).sort().map(([, xp]) => xp).sort((a, b) => (a as number) - (b as number)), [0, 0, 0, 0, FLAYER.xp]);
  assert.equal(ofType(ticks.flat(), 'groupCleared').filter((g) => g.group === 'flayer').length, 1);
  assert.equal(r.sim.stats().xpEarned, FLAYER.xp, 'the legs give none');
  assert.equal(r.sim.enemiesAlive('flayer'), 0);
});

test('death: standing legs go with the body too, and so do the pools and the Flayed it sent, with no kill for them', () => {
  const r = fRig({ god: true });
  r.f.waveCd = 0; run(r.sim, 1);
  r.s.pools.push({ x: 100, y: 100, age: 0 });
  assert.equal(waves(r).length, FX.waveN);
  r.sim.dev.killAll();
  const ev = run(r.sim, 8);
  const kills = ofType(ev, 'kill');
  assert.ok(kills.some((k) => k.kind === 'flayer'));
  assert.equal(kills.filter((k) => k.kind === 'flayerleg').length, 4);
  assert.equal(r.sim.view().pools.length, 0);
  assert.equal(waves(r).length, 0);
  assert.equal(ofType(ev, 'groupCleared').filter((g) => g.group === 'flayer').length, 1);
});

test('death: the legs\' 0 XP stays 0 under an XP factor, where every other enemy is worth at least 1', () => {
  const { sim, s } = makeWhite({ grid: court(), spawns: flayerSpawns(false), start: { x: tc(11), y: tf(10) }, xpMult: 0.3, enemyMult: 1 });
  const r = rigOf(sim, s);
  const xps = new Map(s.enemies.map((e) => [e.id, e.xp]));
  assert.equal(xps.get('flayer'), Math.round(FLAYER.xp * 0.3));
  for (const id of ['leg1', 'leg2', 'leg3', 'leg4']) assert.equal(xps.get(id), 0, id);
  assert.equal(r.body.xp, Math.round(FLAYER.xp * 0.3));
});

// ------------------------------------------------------------------ the bar

test('bar: nothing while it sleeps, then MIND FLAYER with its HP and the four legs\' shares; the legs never fill it themselves', () => {
  const { sim, s } = makeWhite({ grid: court(), spawns: flayerSpawns(true), start: { x: tc(11), y: tf(10) }, enemyMult: 1, seed: 4 });
  assert.equal(sim.view().hud.boss, null);
  sim.spawnGroup('flayer');
  const r = rigOf(sim, s);
  assert.deepEqual(sim.view().hud.boss, { name: 'MIND FLAYER', hp: FLAYER.hp, hpMax: FLAYER.hp, parts: [1, 1, 1, 1] }, 'even while it rises');
  run(sim, FX.riseT + 1);
  r.legs[1]!.hp = LEG.hp / 2;
  r.body.hp = FLAYER.hp * 0.6 + 0.2;
  cut(r, 3);
  assert.deepEqual(sim.view().hud.boss, { name: 'MIND FLAYER', hp: Math.ceil(FLAYER.hp * 0.6 + 0.2), hpMax: FLAYER.hp, parts: [1, 0.5, 0, 1] });
  // Only the legs awake: no bar.
  const legs = makeWhite({ grid: court(), spawns: flayerSpawns(false).filter((sp) => sp.kind === 'enemy' && sp.type === 'flayerleg'), start: { x: tc(11), y: tf(10) } });
  assert.equal(legs.sim.view().hud.boss, null);
});

test('bar: every share is 0 with the head down, and the bar goes with the body', () => {
  const r = fRig();
  cutAll(r);
  until(r, () => r.f.move === 'down');
  assert.deepEqual(r.sim.view().hud.boss?.parts, [0, 0, 0, 0]);
  r.body.hp = 1;
  run(r.sim, 6);
  hammer(r, r.body, 5);
  run(r.sim, 8);
  assert.equal(r.sim.view().hud.boss, null);
});

test('view: a leg is drawn from its root (x, y) to its tip (aim); the body has no aim; hp bars show once hit', () => {
  const r = fRig();
  const v = r.sim.view();
  assert.equal(bodyView(r)?.aim, undefined);
  const lv = legView(r, 2);
  assert.ok(lv?.aim);
  assert.equal(lv?.kind, 'enemy');
  assert.equal(lv?.bar, null);
  hammer(r, r.legs[1] as Enemy, 1);
  assert.ok(legView(r, 2)?.bar);
  void v;
  void idle;
});
