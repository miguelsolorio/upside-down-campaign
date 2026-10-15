// The Mind Flayer (docs/level-9.md, "The Mind Flayer"): the numbers, the rise, the shield, a leg's warning and slam, the pools, severing, the head
// coming down and the legs growing back. Numbers a retune moves are read from ENEMY_DEFS; the numbers test pins the doc's. Waves, phase two, the sweep, the death and the bar are in tests/flayer-phase.test.ts, the bot in
// tests/flayer-bot.test.ts.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { SimEvent } from '../src/core/types.ts';
import { damageRange, hitEnemy, rollDamage } from '../src/combat/damage.ts';
import { addPool } from '../src/combat/pools.ts';
import { startLine } from '../src/enemies/flayer_legs.ts';
import { footBlocked } from '../src/combat/space.ts';
import { idle, inp, ofType, press, run, sfxIds, tc, tf } from './sim-helpers.ts';
import { FLAYER, FX, LEG, LX, at, bodyView, cut, cutAll, fRig, hammer, hold, legView, ls, rootOf, until } from './flayer-helpers.ts';

const hurt = (ev: SimEvent[]) => ofType(ev, 'hit').filter((h) => !h.onEnemy);

/** A point `along` px down leg `i`'s line (once it has started), and the unit vector across it. */
function onLine(r: ReturnType<typeof fRig>, i: number, along: number, off = 0): { x: number; y: number } {
  const l = ls(r.legs[i - 1] as never);
  const e = r.legs[i - 1]!;
  const len = Math.hypot(e.x - l.rx, e.y - l.ry);
  const ux = (e.x - l.rx) / len, uy = (e.y - l.ry) / len;
  return { x: l.rx + ux * along - uy * off, y: l.ry + uy * along + ux * off };
}

test('the numbers: what docs/level-9.md says, with the HP the bot fight moved', () => {
  assert.deepEqual([FLAYER.atk, FLAYER.def, FLAYER.xp, LEG.atk, LEG.def, LEG.xp], [22, 6, 120, 22, 4, 0]);
  assert.deepEqual([FLAYER.hp, LEG.hp], [800, 90], 'the first spec had 1600 and 180: the bot fight needed less');
  assert.deepEqual([FX.riseT, FX.downT, FX.downMul, FX.slamEvery, FX.phaseAt, FX.sweepEvery, FX.waveEvery, FX.waveN, FX.waveMax], [40, 420, 3, 110, 0.5, 480, 600, 1, 2]);
  assert.deepEqual([LX.warn, LX.warnLow, LX.slamT, LX.rest, LX.len, LX.halfW, LEG.power, LX.kb], [40, 28, 12, 30, 150, 12, 0.8, 5]);
  assert.deepEqual([LX.sweepWarn, LX.bandH, LX.sweepPower, LX.sweepKb], [40, 24, 0.5, 4]);
  assert.deepEqual([LX.poolR, LX.poolLife, LX.poolMax, LX.poolPower, LX.poolEvery], [20, 480, 4, 0.07, 30]);
  assert.equal(FLAYER.speed + LEG.speed, 0, 'rooted');
});

// ------------------------------------------------------------------ rise

test('rise: on waking the body is in pose rise for 40 frames, with a glass fx and the shatter sfx, and nothing hits it or its legs', () => {
  const r = fRig({}, true, true, undefined, false);
  const ev = r.sim.step(idle());
  assert.ok(sfxIds(ev).includes('shatter'));
  assert.ok(r.sim.view().fx.some((f) => f.kind === 'glass'), 'the skylight breaks');
  assert.equal(bodyView(r)?.pose, 'rise');
  const hp = r.body.hp;
  for (let i = 1; i < FX.riseT - 1; i++) {
    assert.equal(hammer(r, r.body), 0);
    for (const leg of r.legs) assert.equal(hammer(r, leg), 0);
    r.sim.step(idle());
    assert.equal(bodyView(r)?.pose, 'rise', `frame ${i}`);
  }
  assert.equal(r.body.hp, hp);
  assert.ok(r.legs.every((l) => l.hp === l.hpMax));
  assert.ok(r.legs.every((l) => ls(l).move === 'idle'), 'and no leg warns');
  r.sim.step(idle());
  assert.equal(bodyView(r)?.pose, undefined, 'then it fights: 40 frames from the wake');
  assert.ok(hammer(r, r.legs[0] as never) > 0, 'and a leg can be hit');
});

test('rise: nothing slams while it rises, and the first slam comes after the pause', () => {
  const r = fRig({}, true, false, undefined, false);
  const warns: number[] = [];
  for (let f = 0; f < 400; f++) {
    r.sim.step(idle());
    if (r.legs.some((l) => ls(l).move === 'warn') && warns.length === 0) warns.push(f);
  }
  assert.ok((warns[0] as number) >= FX.riseT + FX.slamFirst - 2, `the first warning came at ${warns[0]}`);
  assert.ok((warns[0] as number) <= FX.riseT + FX.slamFirst + 2);
});

// ------------------------------------------------------------------ the shield

test('shield: a hit on the body with any leg standing does nothing but a block spark and the block sfx', () => {
  const r = fRig();
  const hp = r.body.hp;
  assert.equal(hammer(r, r.body), 0);
  const ev = run(r.sim, 1);
  assert.equal(r.body.hp, hp);
  assert.ok(sfxIds(ev).includes('block'));
  assert.ok(r.sim.view().fx.some((f) => f.kind === 'spark'));
  cut(r, 1); cut(r, 2); cut(r, 3);
  assert.equal(hammer(r, r.body), 0, 'three legs cut, one standing');
  assert.equal(r.body.hp, hp);
});

test('shield: a swing at the body in its stall wall is blocked, and lands once the head is down', () => {
  const r = fRig();
  at(r, tc(11), tf(3));
  r.hero.dir = 'up'; r.hero.aim = -Math.PI / 2;
  const hp = r.body.hp;
  const ev = press(r.sim, { attackPressed: true }, 30);
  assert.equal(r.body.hp, hp, 'blocked');
  assert.ok(sfxIds(ev).includes('block'), 'the swing reached it');
  cutAll(r);
  run(r.sim, 6);
  assert.equal(r.f.move, 'down');
  press(r.sim, { attackPressed: true }, 30);
  assert.ok(r.body.hp < hp, 'the swing lands on the head');
});

test('shield: fire does not burn through it either', () => {
  const r = fRig();
  r.body.stat.burn = 120; r.body.stat.burnTick = 1; r.body.stat.burnDmg = 40;
  run(r.sim, 100);
  assert.equal(r.body.hp, r.body.hpMax);
});

// ------------------------------------------------------------------ the line

test('line: a leg warns for 40 frames (pose warn, aim 150 px down the line from its root), then slams for 12 (pose slam), then rests 30', () => {
  const r = fRig({ god: true });
  const root = rootOf(1);
  at(r, tc(8), tf(9));
  startLine(r.s, r.legs[0] as never, r.hero, LX.warn);
  const v0 = legView(r, 1);
  assert.equal(v0?.pose, 'warn');
  assert.deepEqual([v0?.x, v0?.y], [root.x, root.y], 'x, y is the root');
  const a = v0?.aim as { x: number; y: number };
  assert.ok(Math.abs(Math.hypot(a.x - root.x, a.y - root.y) - LX.len) < 0.5, 'and aim is 150 px out');
  // The line goes through where the hero stood: the hero is within a pixel or two of it.
  const t = ((r.hero.x - root.x) * (a.x - root.x) + (r.hero.y - root.y) * (a.y - root.y)) / (LX.len * LX.len);
  const cx = root.x + (a.x - root.x) * t, cy = root.y + (a.y - root.y) * t;
  assert.ok(Math.hypot(cx - r.hero.x, cy - r.hero.y) < 1);
  const poses: (string | undefined)[] = [];
  const evs: SimEvent[][] = [];
  for (let f = 0; f < 90; f++) { evs.push(r.sim.step(idle())); poses.push(legView(r, 1)?.pose); }
  assert.equal(poses.slice(0, 39).every((p) => p === 'warn'), true, '39 more frames of warning');
  assert.equal(poses.slice(39, 51).every((p) => p === 'slam'), true, 'then 12 of slam');
  assert.equal(poses[51], undefined, 'then it rests');
  assert.ok(sfxIds(evs[39] as SimEvent[]).includes('legslam'), 'the legslam sfx on the first frame of the slam');
  assert.equal(poses.slice(51, 81).every((p) => p === undefined), true);
  assert.equal(ls(r.legs[0] as never).move, 'idle', 'open for its next turn after 30 frames');
});

test('line: the slam fx sits at the tip, and the tip is where the leg is hit', () => {
  const r = fRig();
  at(r, tc(8), tf(9));
  startLine(r.s, r.legs[0] as never, r.hero, LX.warn);
  const aim = legView(r, 1)?.aim as { x: number; y: number };
  run(r.sim, LX.warn);
  const fx = r.sim.view().fx.find((f) => f.kind === 'slam');
  assert.ok(fx, 'a slam fx');
  assert.deepEqual([fx?.x, fx?.y], [aim.x, aim.y]);
  assert.ok(Math.abs((fx?.w ?? 0) - LX.len) < 0.5, 'w its reach');
  assert.deepEqual([r.legs[0]?.x, r.legs[0]?.y], [aim.x, aim.y]);
});

test('line: a hero on the line takes the slam with its knockback across it, once; one past its half-width takes nothing, even in the slam', () => {
  const dmgs: number[] = [];
  let def = 0;
  for (const off of [0, LX.halfW * 0.7, LX.halfW - 0.5]) {
    const r = fRig({ god: false });
    def = r.hero.st.def;
    at(r, tc(8), tf(9));
    startLine(r.s, r.legs[0] as never, r.hero, LX.warn);
    const p = onLine(r, 1, 100, off);
    at(r, p.x, p.y);
    const ev = run(r.sim, LX.warn + LX.slamT + 2);
    const h = hurt(ev);
    assert.equal(h.length, 1, `offset ${off}: hit once`);
    dmgs.push((h[0] as { dmg: number }).dmg);
    if (off > 0) assert.ok(Math.hypot(r.hero.vx, r.hero.vy) > 0.5 || Math.hypot(r.hero.x - p.x, r.hero.y - p.y) > 2, 'and shoved');
  }
  const range = damageRange(LEG.power, LEG.atk, def);
  assert.ok(dmgs.every((d) => d >= range.min && d <= range.max), `damage ${dmgs.join(', ')}, not in ${range.min} to ${range.max}, for the leg's power of its ATK`);
  for (const off of [LX.halfW + 1, LX.halfW + 8]) {
    const r = fRig({ god: false });
    at(r, tc(8), tf(9));
    startLine(r.s, r.legs[0] as never, r.hero, LX.warn);
    const p = onLine(r, 1, 100, off);
    at(r, p.x, p.y);
    assert.equal(hurt(run(r.sim, LX.warn + LX.slamT + 2)).length, 0, `offset ${off}: missed`);
  }
});

test('line: the knockback throws the hero across the line, away from it', () => {
  const r = fRig({ god: false });
  at(r, tc(8), tf(9));
  startLine(r.s, r.legs[0] as never, r.hero, LX.warn);
  const p = onLine(r, 1, 100, 6);
  at(r, p.x, p.y);
  const root = rootOf(1), tip = r.legs[0] as { x: number; y: number };
  run(r.sim, LX.warn + 1);
  // The line's normal on the side the hero was on.
  const len = Math.hypot(tip.x - root.x, tip.y - root.y);
  const nx = (tip.y - root.y) / len, ny = -(tip.x - root.x) / len;
  const side = Math.sign((p.x - root.x) * nx + (p.y - root.y) * ny);
  assert.ok((r.hero.vx * nx + r.hero.vy * ny) * side > 1, 'moving away from the line');
});

test('line: a hero who steps off during the warning is not touched', () => {
  const r = fRig({ god: false });
  at(r, tc(8), tf(9));
  startLine(r.s, r.legs[0] as never, r.hero, LX.warn);
  const p = onLine(r, 1, 100, 0);
  at(r, p.x, p.y);
  run(r.sim, 20);
  const q = onLine(r, 1, 100, 24);
  at(r, q.x, q.y);
  assert.equal(hurt(run(r.sim, 40)).length, 0);
});

test('line: it stops short of a wall, 150 px at most', () => {
  const r = fRig();
  at(r, 40, 44);
  startLine(r.s, r.legs[0] as never, r.hero, LX.warn);
  const a = legView(r, 1)?.aim as { x: number; y: number };
  assert.ok(a.x < rootOf(1).x - 40, 'the line runs west');
  assert.ok(!footBlocked(r.s, a.x, a.y), 'and ends on open floor');
  assert.ok(Math.hypot(a.x - rootOf(1).x, a.y - rootOf(1).y) < LX.len - 2, 'short of 150 px');
});

test('line: one leg at a time, about every slam gap, in phase one', () => {
  const r = fRig({ god: true }, true, false);
  const starts: number[] = [];
  let was = 0;
  let most = 0;
  for (let f = 0; f < 1500; f++) {
    r.sim.step(idle());
    const n = r.legs.filter((l) => ls(l).move === 'warn' || ls(l).move === 'slam').length;
    most = Math.max(most, n);
    if (n > 0 && was === 0) starts.push(f);
    was = n;
  }
  assert.equal(most, 1, 'never two on lines');
  // From the first slam to the end, a slam every FX.slamEvery give or take a tenth: at least most of them come.
  assert.ok(starts.length >= (1500 - FX.riseT - FX.slamFirst) / (FX.slamEvery * 1.3), `${starts.length} slams in 1500 frames`);
  const gaps = starts.slice(1).map((s, i) => s - (starts[i] as number));
  assert.ok(gaps.every((g) => g >= FX.slamEvery - 10 && g <= FX.slamEvery + 20), `gaps ${gaps.join(', ')}`);
});

// ------------------------------------------------------------------ pools

test('pools: where a tip lands there is a pool, poolR across from its middle, for poolLife frames', () => {
  const r = fRig({ god: true });
  at(r, tc(8), tf(9));
  startLine(r.s, r.legs[0] as never, r.hero, LX.warn);
  assert.deepEqual(r.sim.view().pools, [], 'not yet');
  const aim = legView(r, 1)?.aim as { x: number; y: number };
  run(r.sim, LX.warn);
  const [p] = r.sim.view().pools;
  assert.deepEqual([p?.x, p?.y, p?.r, p?.life], [aim.x, aim.y, LX.poolR, LX.poolLife]);
  assert.equal(p?.t, 1, 'a frame old on the tick it landed');
  run(r.sim, 100);
  assert.equal(r.sim.view().pools[0]?.t, 101);
  run(r.sim, LX.poolLife - 102);
  assert.equal(r.sim.view().pools.length, 1);
  run(r.sim, 1);
  assert.equal(r.sim.view().pools.length, 0, 'dry after its life');
});

test('pools: at most poolMax, and one more replaces the oldest', () => {
  const r = fRig({ god: true });
  for (let i = 0; i <= LX.poolMax; i++) { addPool(r.s, 100 + i * 40, 150); run(r.sim, 5); }
  const xs = r.sim.view().pools.map((p) => p.x);
  assert.deepEqual(xs, Array.from({ length: LX.poolMax }, (_, i) => 140 + i * 40));
});

test('pools: the active hero in one is slowed and stung every poolEvery frames; outside one, nothing', () => {
  const r = fRig({ god: false });
  addPool(r.s, tc(11), tf(8));
  at(r, tc(11) + 15, tf(8));
  const ev = run(r.sim, 100);
  assert.ok(r.hero.stat.slow > 0);
  assert.equal(r.sim.view().actors.find((a) => a.id === 'mike')?.tint, 'purple');
  const hits = hurt(ev);
  assert.equal(hits.length, Math.floor(100 / LX.poolEvery), 'one every poolEvery frames, from when he stepped in');
  const sting = damageRange(LX.poolPower, LEG.atk, r.hero.st.def);
  assert.ok(hits.every((h) => h.dmg >= sting.min && h.dmg <= sting.max), `${hits.map((h) => h.dmg).join(', ')}, not in ${sting.min} to ${sting.max}`);
  assert.ok(r.hero.hp > 880, 'a sting, not a slam');
  // 24 px from the middle is outside.
  const q = fRig({ god: false });
  addPool(q.s, tc(11), tf(8));
  at(q, tc(11) + 24, tf(8));
  const ev2 = run(q.sim, 100);
  assert.equal(q.hero.stat.slow, 0);
  assert.equal(hurt(ev2).length, 0);
});

test('pools: the slow wears off a moment after he steps out', () => {
  const r = fRig({ god: false });
  addPool(r.s, tc(11), tf(8));
  at(r, tc(11), tf(8));
  run(r.sim, 10);
  assert.ok(r.hero.stat.slow > 0);
  at(r, tc(11) + 60, tf(8));
  run(r.sim, LX.poolSlow + 2);
  assert.equal(r.hero.stat.slow, 0);
});

// ------------------------------------------------------------------ severing

test('sever: a leg at 0 HP is cut, not dead: pose severed, the sever sfx, no hits, no slams', () => {
  const r = fRig();
  const leg = r.legs[1] as never as typeof r.body;
  leg.hp = 1;
  hammer(r, leg, 5);
  const ev = run(r.sim, 2);
  assert.ok(sfxIds(ev).includes('sever'));
  assert.equal(legView(r, 2)?.pose, 'severed');
  assert.equal(leg.dead, false);
  assert.equal(leg.hp, 0);
  assert.equal(ofType(ev, 'kill').length, 0);
  assert.equal(r.sim.enemiesAlive('flayer'), 5, 'still counted');
  assert.equal(hammer(r, leg), 0, 'it can not be hit');
  run(r.sim, 60);
  assert.equal(leg.dead, false, 'and the reaper leaves it alone');
});

test('sever: a cut leg is never picked to slam, however long it waits', () => {
  const r = fRig({ god: true }, true, false);
  cut(r, 1); cut(r, 2); cut(r, 3);
  const picked = new Set<number>();
  for (let f = 0; f < 800; f++) {
    r.sim.step(idle());
    r.legs.forEach((l, i) => { if (ls(l).move === 'warn') picked.add(i); });
  }
  assert.deepEqual([...picked], [3], 'only the fourth leg went');
});

test('sever: burning a leg to 0 cuts it too', () => {
  const r = fRig();
  const leg = r.legs[2] as never as typeof r.body;
  leg.hp = 5;
  leg.stat.burn = 90; leg.stat.burnTick = 1; leg.stat.burnDmg = 10;
  const ev = run(r.sim, 3);
  assert.ok(sfxIds(ev).includes('sever'));
  assert.equal(legView(r, 3)?.pose, 'severed');
});

test('sever: cutting a leg mid-warning takes its line away', () => {
  const r = fRig();
  at(r, tc(8), tf(9));
  const leg = r.legs[0] as never as typeof r.body;
  startLine(r.s, leg, r.hero, LX.warn);
  run(r.sim, 10);
  leg.hp = 1;
  hammer(r, leg, 5);
  assert.equal(legView(r, 1)?.pose, 'severed');
  assert.equal(hurt(run(r.sim, 60)).length, 0);
});

// ------------------------------------------------------------------ the head

test('head: with all four legs cut the body is in pose down for downT frames', () => {
  const r = fRig();
  r.s.rng = () => 0.5;
  cutAll(r);
  const { frames } = until(r, () => bodyView(r)?.pose === 'down');
  assert.ok(frames <= 8, 'down as soon as the last leg is cut');
  let down = 1;
  while (bodyView(r)?.pose === 'down') { run(r.sim, 1); down++; }
  assert.equal(down - 1, FX.downT, 'down for downT frames');
});

test('head: it takes downMul times the damage while it is down', () => {
  const r = fRig();
  r.s.rng = () => 0.5;
  cutAll(r);
  until(r, () => bodyView(r)?.pose === 'down');
  run(r.sim, 6);
  const hp = r.body.hp;
  const dealt = hammer(r, r.body, 2);
  assert.equal(dealt, Math.round(rollDamage(2, r.hero.st.atk, FLAYER.def, 1) * FX.downMul), 'downMul');
  assert.equal(r.body.hp, hp - dealt);
  assert.ok(ofType(run(r.sim, 1), 'hit').some((h) => h.onEnemy));
});

test('head: while it is down the legs stay cut and nothing slams, sweeps or warns', () => {
  const r = fRig({ god: false });
  hold(r);
  cutAll(r);
  r.f.slamCd = 0; r.f.sweepCd = 0; r.f.phase2 = true;
  let worst = 0;
  for (let f = 0; f < FX.downT - 10; f++) {
    r.sim.step(idle());
    worst = Math.max(worst, r.legs.filter((l) => ls(l).move !== 'severed').length);
  }
  assert.equal(worst, 0);
  assert.equal(r.sim.view().fx.filter((f) => f.kind === 'sweep').length, 0);
});

test('regrow: the head comes up, the legs grow back at full HP, the shield is back, and the slams start again after a pause', () => {
  const r = fRig({ god: true });
  cutAll(r);
  until(r, () => r.f.move === 'down');
  hold(r);
  until(r, () => r.f.move === 'up');
  assert.ok(r.legs.every((l) => l.hp === l.hpMax && ls(l).move === 'idle'), 'full HP');
  assert.ok(r.legs.every((l) => legView(r, r.legs.indexOf(l) + 1)?.pose === undefined));
  const hp = r.body.hp;
  assert.equal(hammer(r, r.body), 0, 'shielded again');
  assert.equal(r.body.hp, hp);
  assert.equal(r.f.slamCd, FX.slamRegrow, 'a pause before the first slam');
  r.f.slamCd = FX.slamRegrow;
  r.f.waveCd = 99999; r.f.sweepCd = 99999;
  const { frames } = until(r, () => r.legs.some((l) => ls(l).move === 'warn'), 300);
  assert.ok(frames >= FX.slamRegrow - 2 && frames <= FX.slamRegrow + 2, `the first warning came after ${frames}`);
});

test('regrow: a leg that was half cut grows back whole, and a leg regrown stands at its rest tip', () => {
  const r = fRig({ god: true });
  r.legs[3]!.hp = 50;
  cut(r, 1); cut(r, 2); cut(r, 3);
  cut(r, 4);
  until(r, () => r.f.move === 'down');
  hold(r);
  until(r, () => r.f.move === 'up');
  for (const [i, l] of r.legs.entries()) {
    assert.equal(l.hp, l.hpMax);
    const root = rootOf(i + 1);
    assert.deepEqual([l.x, l.y], [root.x, root.y + LX.restLen], 'its tip lies in front of its root');
  }
});

test('no flags: the sim never wakes or opens anything on its own', () => {
  const r = fRig({ god: true }, true, false);
  const ev = run(r.sim, 600);
  assert.equal(ofType(ev, 'propCleared').length, 0);
  assert.equal(r.legs.length, 4);
  void inp;
});
