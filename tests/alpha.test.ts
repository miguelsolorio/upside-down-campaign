// The Demodog Alpha (docs/level-6.md): the bite, the lunge on its locked line, the pounce and its mark, the three howls and the
// pack they call, its poise and the boss bar. The bot against it is in alpha-bot.test.ts.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { damageRange, hitEnemy } from '../src/combat/damage.ts';
import { ofType, run, tc, tf } from './sim-helpers.ts';
import type { Frame } from './alpha-helpers.ts';
import { ALPHA, AX, CORNERS, alphaAt, alphaRig, alphaView, onlyMove, runUntil, takes, track } from './alpha-helpers.ts';

const sfxIn = (frames: Frame[], id: string): number => frames.reduce((n, t) => n + t.ev.filter((e) => e.t === 'sfx' && e.id === id).length, 0);
const hurt = (frames: Frame[]): number[] => frames.flatMap((t) => ofType(t.ev, 'hit').filter((h) => !h.onEnemy).map((h) => h.dmg));
/** Frames in a row, from `from`, that `pred` holds for. */
const streak = (frames: Frame[], from: number, pred: (t: Frame) => boolean): number => {
  let n = 0;
  while (frames[from + n] && pred(frames[from + n] as Frame)) n++;
  return n;
};
/** Where the Alpha stands: the den's court, 90 px east of the hero, level with him. */
const faceOff = (gap: number) => ({ start: { x: tc(13) - gap, y: tf(6) } });

test('alpha: the contract numbers, and the stage factor scales its HP like anyone\'s', () => {
  assert.deepEqual([ALPHA.def, ALPHA.speed, ALPHA.xp, ALPHA.windup, ALPHA.power, ALPHA.drop], [6, 1.1, 70, 24, 1, 1]);
  assert.deepEqual([AX.reach, AX.kb, AX.lungeWindup, AX.lungeT, AX.lungeSpeed, AX.lungePower, AX.lungeMin, AX.lungeMax], [28, 4, 30, 18, 4.6, 1.1, 50, 120]);
  assert.deepEqual([AX.crouch, AX.air, AX.shock, AX.pouncePower, AX.pounceKb, AX.stunT, AX.stunMul], [30, 40, 36, 1.2, 5, 40, 1.5]);
  assert.deepEqual([AX.howl1, AX.howl2, AX.howl3, AX.howlT, AX.howlMul, AX.pack], [0.75, 0.5, 0.25, 50, 2, 3]);
  assert.equal(ALPHA.hp, 1100);
  assert.equal(alphaRig().boss.hpMax, Math.round(ALPHA.hp * 1.15));
});

test('asleep: a dormant Alpha does nothing, shows no bar and is not drawn; woken, the bar says DEMODOG ALPHA', () => {
  const r = alphaRig({ spawns: [alphaAt(13, 6, { dormant: true, group: 'sleep' })] });
  const x0 = r.boss.x;
  run(r.sim, 200);
  assert.equal(r.boss.x, x0);
  assert.equal(r.sim.view().hud.boss, null);
  assert.equal(r.sim.view().actors.some((a) => a.id === 'alpha'), false);
  r.sim.spawnGroup('sleep');
  const bar = r.sim.view().hud.boss;
  assert.deepEqual(bar, { name: 'DEMODOG ALPHA', hp: r.boss.hpMax, hpMax: r.boss.hpMax });
  hitEnemy(r.s, r.hero, r.boss, { power: 1, noCrit: true });
  assert.equal(r.sim.view().hud.boss?.hp, Math.ceil(r.boss.hp));
  r.boss.hp = 0;
  run(r.sim, 2);
  assert.equal(r.sim.view().hud.boss, null, 'and gone once it is dead');
});

test('bite: 24 frames under the red "!", then an arc 28 px in front for power 1.0 and knockback 4, with a chomp', () => {
  const r = alphaRig(faceOff(22));
  onlyMove(r, 'bite');
  r.boss.cd = 0;
  const frames = track(r, 90);
  const first = frames.findIndex((t) => t.v?.alert);
  assert.ok(first >= 0 && first < 4, 'it starts at once');
  assert.equal(streak(frames, first, (t) => t.v?.alert === true && t.v.anim === 'attack'), 24);
  const strike = frames[first + 24] as Frame;
  assert.ok(strike.ev.some((e) => e.t === 'sfx' && e.id === 'chomp'));
  const range = takes(ALPHA.power, ALPHA.atk, r.hero.st.def);
  const [dmg] = hurt([strike]);
  assert.ok(dmg !== undefined && dmg >= range.lo && dmg <= range.hi, `bite ${dmg}, expected ${range.lo} to ${range.hi}`);
  assert.ok(frames.every((t) => t.v?.pose === undefined), 'no pose: it is a plain bite');
});

test('bite: it is aimed when the wind-up starts, so a hero who steps out of its reach or round its back is not hit', () => {
  for (const [dx, dy] of [[-44, 0], [40, 0], [0, 40]] as const) {
    const r = alphaRig(faceOff(22));
    onlyMove(r, 'bite');
    r.boss.cd = 0;
    runUntil(r, () => r.a.move === 'bite', 20);
    r.sim.dev.teleport(r.hero.x + dx, r.hero.y + dy);
    const frames = track(r, 40);
    assert.equal(hurt(frames).length, 0, `stepped to ${dx}, ${dy}`);
  }
});

test('lunge: 30 frames under the "!" facing a line locked at the start, then 18 frames along it at 4.6 px a frame', () => {
  const r = alphaRig(faceOff(90));
  onlyMove(r, 'lunge');
  r.a.lungeCd = 0;
  const x0 = r.boss.x;
  const early = track(r, 4);
  // Two tiles south, out of the lane, so nothing is hit and nothing stops the run.
  r.sim.dev.teleport(r.hero.x, r.hero.y + 28);
  const frames = [...early, ...track(r, 56)];
  const first = frames.findIndex((t) => t.v?.alert);
  assert.ok(first >= 0 && first < 3);
  assert.equal(streak(frames, first, (t) => t.v?.alert === true), 30, 'the wind-up');
  assert.ok(frames.slice(first, first + 30).every((t) => t.v?.pose === undefined && t.v.dir === 'left'), 'planted, facing the hero');
  assert.ok(Math.abs((frames[first + 29]?.v?.x as number) - x0) < 4, 'planted');
  assert.equal(streak(frames, first + 30, (t) => t.v?.anim === 'dash'), 18, 'the run');
  assert.ok(Math.abs(x0 - (frames[first + 47]?.v?.x as number) - 18 * 4.6) < 6, 'about 83 px');
  assert.ok(frames[first + 30]?.ev.some((e) => e.t === 'sfx' && e.id === 'lunge'));
  assert.equal(hurt(frames).length, 0);
});

test('lunge: a hero who stays on the line takes power 1.1, and one who steps off it during the wind-up takes nothing', () => {
  const r = alphaRig(faceOff(90));
  onlyMove(r, 'lunge');
  r.a.lungeCd = 0;
  const stay = track(r, 90);
  const range = takes(AX.lungePower, ALPHA.atk, r.hero.st.def);
  const [dmg] = hurt(stay);
  assert.ok(dmg !== undefined && dmg >= range.lo && dmg <= range.hi, `lunge ${dmg}, expected ${range.lo} to ${range.hi}`);

  const g = alphaRig(faceOff(90));
  onlyMove(g, 'lunge');
  g.a.lungeCd = 0;
  const first = track(g, 6);
  assert.ok(first.some((t) => t.v?.alert), 'winding up');
  g.sim.dev.teleport(tc(13) - 90, tf(6) + 28);
  const y0 = g.boss.y;
  const rest = runUntil(g, () => g.a.move === 'recover', 80);
  assert.equal(hurt([{ ev: rest.ev, v: undefined, f: 0, fx: [] }]).length, 0, 'it runs past him');
  assert.ok(Math.abs(g.boss.y - y0) < 1, 'along the locked line, whatever he does');
  assert.ok(g.boss.x < tc(13) - 60, 'and it did run');
});

test('lunge: it stops at a wall, and is not stunned by it', () => {
  // The hero stands against the east wall with the Alpha 56 px off: the run is long enough to reach the wall behind him.
  const r = alphaRig({ start: { x: tc(16) + 2, y: tf(6) }, spawns: [alphaAt(12, 6, { dormant: true })] });
  onlyMove(r, 'lunge');
  r.a.lungeCd = 0;
  const frames = track(r, 100);
  assert.ok(frames.some((t) => t.ev.some((e) => e.t === 'sfx' && e.id === 'thud')), 'the wall');
  assert.equal(r.boss.stat.stun, 0);
  assert.ok(frames.every((t) => t.v?.pose !== 'stun'), 'no stun pose');
  assert.ok(r.boss.x < tc(17), 'it did not go through the wall');
});

test('pounce: a 30 frame crouch under the "!", then it leaps with a growing mark on the hero\'s spot and lands in a 36 px shockwave', () => {
  const r = alphaRig(faceOff(100));
  onlyMove(r, 'pounce');
  r.a.pounceCd = 0;
  const frames = track(r, 120);
  const first = frames.findIndex((t) => t.v?.pose === 'crouch');
  assert.ok(first >= 0 && first < 3);
  assert.equal(streak(frames, first, (t) => t.v?.pose === 'crouch' && t.v.alert), 30);
  const air = streak(frames, first + 30, (t) => t.v?.pose === 'leap');
  assert.equal(air, 40, 'in the air for 40 frames');
  const mid = frames[first + 30 + 20] as Frame;
  assert.ok((mid.v?.z ?? 0) > 20, `z rises: ${mid.v?.z}`);
  const mark = mid.fx.find((f) => f.kind === 'mark');
  assert.ok(mark && mark.w === 72 && mark.h === 36 && mark.life === 41, 'the mark: 36 px radius, 41 frames');
  assert.ok(Math.hypot(mark.x - tc(13) + 100, mark.y - tf(6)) < 2, 'on the spot where the hero stood');
  const landing = frames[first + 70] as Frame;
  assert.equal(landing.v?.z, 0, 'down at the end');
  assert.ok(landing.ev.some((e) => e.t === 'sfx' && e.id === 'thud'));
  const range = takes(AX.pouncePower, ALPHA.atk, r.hero.st.def);
  const hits = hurt(frames);
  assert.equal(hits.length, 1);
  assert.ok((hits[0] as number) >= range.lo && (hits[0] as number) <= range.hi, `pounce ${hits[0]}, expected ${range.lo} to ${range.hi}`);
  assert.ok(frames.slice(first + 70).every((t) => !t.fx.some((f) => f.kind === 'mark')), 'the mark is gone after the landing');
});

test('pounce: a hero 40 px off the mark when it lands is not hit, then the Alpha is dazed for 40 frames and takes 50 percent more', () => {
  const r = alphaRig(faceOff(100));
  onlyMove(r, 'pounce');
  r.a.pounceCd = 0;
  r.boss.hp = r.boss.hpMax = 99999;
  const pre = track(r, 40);
  assert.ok(pre.some((t) => t.v?.pose === 'leap'), 'in the air');
  r.sim.dev.teleport(r.hero.x - 40, r.hero.y);
  const landing = runUntil(r, () => r.a.move === 'stun', 60);
  assert.equal(hurt([...pre, { ev: landing.ev, v: undefined, f: 0, fx: [] }]).length, 0, 'out of the shockwave');
  assert.equal(alphaView(r)?.pose, 'stun');
  const calm = damageRange(1, r.hero.st.atk, ALPHA.def);
  const slot = (): number => hitEnemy(r.s, r.hero, r.boss, { power: 1, noCrit: true });
  for (let i = 0; i < 10; i++) {
    const dmg = slot();
    assert.ok(dmg >= Math.round(calm.min * 1.5) && dmg <= Math.round(calm.max * 1.5), `dazed hit ${dmg}`);
  }
  const left = runUntil(r, () => r.a.move !== 'stun', 80);
  assert.ok(left.frames >= 36 && left.frames <= 50, `dazed for ${left.frames} more frames, a few of them in hit-stop`);
  for (let i = 0; i < 10; i++) {
    const dmg = slot();
    assert.ok(dmg >= calm.min && dmg <= calm.max, `normal hit ${dmg}`);
  }
});

test('pounce: the daze is exactly 40 frames', () => {
  const r = alphaRig(faceOff(100));
  onlyMove(r, 'pounce');
  r.a.pounceCd = 0;
  track(r, 35);
  r.sim.dev.teleport(r.hero.x - 40, r.hero.y);
  runUntil(r, () => r.a.move === 'stun', 120);
  assert.equal(runUntil(r, () => r.a.move !== 'stun', 80).frames, 40);
});

test('howl: at 75, 50 and 25 percent HP, once each, and not a frame before', () => {
  const r = alphaRig();
  onlyMove(r, null);
  r.sim.dev.god = true;
  const total = (frames: Frame[]): number => frames.reduce((n, t) => n + ofType(t.ev, 'howl').length, 0);
  r.boss.hp = r.boss.hpMax * 0.76;
  assert.equal(total(track(r, 200)), 0, 'above the line: nothing');
  r.boss.hp = r.boss.hpMax * 0.74;
  assert.equal(total(track(r, 120)), 1, 'under 75 percent');
  r.boss.hp = r.boss.hpMax * 0.51;
  assert.equal(total(track(r, 120)), 0, 'above 50 percent: no more');
  r.boss.hp = r.boss.hpMax * 0.5;
  assert.equal(total(track(r, 120)), 1, 'at exactly 50 percent');
  r.boss.hp = r.boss.hpMax * 0.2;
  assert.equal(total(track(r, 120)), 1, 'under 25 percent');
  r.boss.hp = r.boss.hpMax * 0.02;
  assert.equal(total(track(r, 400)), 0, 'and there is no fourth');
});

test('howl: a hit big enough to skip a line still gets every howl, one after the other', () => {
  const r = alphaRig();
  onlyMove(r, null);
  r.sim.dev.god = true;
  r.boss.hp = r.boss.hpMax * 0.2;
  const frames = track(r, 300);
  const at = frames.flatMap((t, i) => (ofType(t.ev, 'howl').length > 0 ? [i] : []));
  assert.equal(at.length, 3);
  assert.ok((at[1] as number) - (at[0] as number) >= 50 && (at[2] as number) - (at[1] as number) >= 50, `spaced by the howl: ${at}`);
});

test('howl: it stops for 50 frames in the howl pose, with a ring, the howl sound and a howl event naming it', () => {
  const r = alphaRig();
  onlyMove(r, null);
  r.sim.dev.god = true;
  r.boss.hp = r.boss.hpMax * 0.7;
  const x0 = r.boss.x;
  const frames = track(r, 120);
  const at = frames.findIndex((t) => ofType(t.ev, 'howl').length > 0);
  assert.ok(at >= 0 && at < 4);
  assert.deepEqual(ofType(frames[at]?.ev ?? [], 'howl'), [{ t: 'howl', spawnId: 'alpha' }]);
  assert.equal(sfxIn(frames, 'howl'), 1);
  assert.equal(streak(frames, at, (t) => t.v?.pose === 'howl'), 50);
  assert.ok(frames.slice(at, at + 50).every((t) => !t.v?.alert), 'no "!": it is not attacking');
  const ring = frames[at + 5]?.fx.find((f) => f.kind === 'howl');
  assert.ok(ring && ring.life === 50 && ring.w === 160, 'the ring grows to 160 px over the howl');
  assert.ok(Math.abs((frames[at + 49]?.v?.x as number) - (frames[at]?.v?.x as number)) < 0.5, 'it does not move');
  assert.ok(Math.abs(x0 - (frames[at]?.v?.x as number)) < 6);
});

test('howl: three young demodogs climb out of the three burrows nearest it, awake, with dust, one XP each and no drops', () => {
  const r = alphaRig();
  onlyMove(r, null);
  r.sim.dev.god = true;
  r.boss.hp = r.boss.hpMax * 0.7;
  const before = r.s.enemies.length;
  const frames = track(r, 3);
  const at = frames.findIndex((t) => ofType(t.ev, 'howl').length > 0);
  assert.ok(at >= 0);
  const pups = r.s.enemies.filter((e) => e.rt === 'howl');
  assert.equal(pups.length, 3);
  assert.equal(r.s.enemies.length, before + 3);
  // From (13, 6) the nearest corners are (15, 9), (15, 2) and then (2, 9).
  const want = [CORNERS[3], CORNERS[2], CORNERS[1]].map((b) => [tc(b!.tx), tf(b!.ty)]);
  for (const [wx, wy] of want) {
    assert.ok(pups.some((p) => Math.hypot(p.x - (wx as number), p.y - (wy as number)) < 6), `a pup at ${wx}, ${wy}`);
  }
  assert.ok(pups.every((p) => p.kind === 'demodog' && !p.dormant && p.aware && p.xp === 1 && p.drop === 0 && p.group === 'howl1'));
  assert.equal(new Set(r.s.enemies.map((e) => e.id)).size, r.s.enemies.length, 'ids are unique');
  assert.ok(frames.some((t) => t.fx.some((f) => f.kind === 'dust')), 'a puff of dust');
  const view = r.sim.view().actors.filter((a) => a.id === 'demodog');
  assert.equal(view.length, 3, 'and drawn at once');
  // Each is worth 1 XP when killed.
  const pup = pups[0]!;
  pup.hp = 0;
  const ev = run(r.sim, 2);
  const kill = ofType(ev, 'kill').find((k) => k.spawnId === pup.id);
  assert.ok(kill && kill.xp === 1 && kill.group === 'howl1');
  assert.equal(r.s.items.length, 0, 'and drops no quarter');
});

test('howl: the second howl calls three more, and the ids are made up and never repeat', () => {
  const r = alphaRig();
  onlyMove(r, null);
  r.sim.dev.god = true;
  r.boss.hp = r.boss.hpMax * 0.7;
  track(r, 60);
  r.boss.hp = r.boss.hpMax * 0.45;
  track(r, 60);
  const pups = r.s.enemies.filter((e) => e.rt === 'howl');
  assert.equal(pups.length, 6);
  assert.deepEqual([...new Set(pups.map((p) => p.group))].sort(), ['howl1', 'howl2']);
  assert.equal(new Set(pups.map((p) => p.id)).size, 6);
  assert.ok(pups.every((p) => p.id.startsWith('rt')));
});

test('howl: it takes double damage while it howls, and normal damage after', () => {
  const r = alphaRig();
  onlyMove(r, null);
  r.sim.dev.god = true;
  r.boss.hp = r.boss.hpMax = 99999;
  const calm = damageRange(1, r.hero.st.atk, ALPHA.def);
  const hit = (): number => hitEnemy(r.s, r.hero, r.boss, { power: 1, noCrit: true });
  for (let i = 0; i < 8; i++) { const d = hit(); assert.ok(d >= calm.min && d <= calm.max, `normal ${d}`); }
  r.boss.hp = r.boss.hpMax * 0.7;
  runUntil(r, () => r.a.move === 'howl', 20);
  for (let i = 0; i < 8; i++) {
    const d = hit();
    assert.ok(d >= calm.min * 2 && d <= calm.max * 2 && d > calm.max, `howling ${d}`);
  }
  r.boss.hp = r.boss.hpMax;
  runUntil(r, () => r.a.move === 'walk', 80);
  for (let i = 0; i < 8; i++) { const d = hit(); assert.ok(d >= calm.min && d <= calm.max, `after ${d}`); }
});

test('poise: hits do not stun it, stagger it, break a wind-up or push it off a lunge', () => {
  const r = alphaRig(faceOff(22));
  onlyMove(r, 'bite');
  r.boss.cd = 0;
  r.boss.hp = r.boss.hpMax = 99999;
  runUntil(r, () => r.a.move === 'bite', 20);
  run(r.sim, 5);
  hitEnemy(r.s, r.hero, r.boss, { power: 1, noCrit: true, stun: 90, stagger: 40, kb: 6, angle: 0 });
  assert.equal(r.boss.stat.stun, 0);
  assert.equal(r.boss.stagger, 0);
  assert.equal(r.boss.mode, 'windup', 'the wind-up goes on');
  assert.equal(r.a.move, 'bite');
  const strike = track(r, 30);
  assert.ok(strike.some((t) => t.ev.some((e) => e.t === 'sfx' && e.id === 'chomp')), 'and the bite lands');

  const g = alphaRig(faceOff(90));
  onlyMove(g, 'lunge');
  g.a.lungeCd = 0;
  g.boss.hp = g.boss.hpMax = 99999;
  runUntil(g, () => g.a.move === 'run', 60);
  const vx = g.boss.vx;
  hitEnemy(g.s, g.hero, g.boss, { power: 1, noCrit: true, kb: 9, angle: 0 });
  assert.equal(g.boss.vx, vx, 'no shove mid-lunge');
  assert.equal(g.a.move, 'run');
});

test('death: a kill is worth 70 XP, and one in the air takes its mark with it', () => {
  const r = alphaRig(faceOff(100));
  onlyMove(r, 'pounce');
  r.a.pounceCd = 0;
  runUntil(r, () => r.a.move === 'air', 80);
  assert.ok(r.sim.view().fx.some((f) => f.kind === 'mark'));
  r.boss.hp = 1;
  hitEnemy(r.s, r.hero, r.boss, { power: 5, noCrit: true });
  const ev = run(r.sim, 8);
  const kill = ofType(ev, 'kill')[0];
  assert.ok(kill && kill.kind === 'alpha' && kill.xp === 70 && kill.group === 'boss');
  assert.ok(ev.some((e) => e.t === 'groupCleared' && e.group === 'boss'));
  assert.equal(r.sim.view().fx.some((f) => f.kind === 'mark'), false);
  assert.equal(alphaView(r)?.anim, 'ko');
});
