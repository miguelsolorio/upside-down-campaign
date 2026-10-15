// The Demogorgon's later moves: the petals and the acid fan at 60 percent HP, the leap at 30 percent.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ofType, tc, tf } from './sim-helpers.ts';
import type { Frame } from './demo-helpers.ts';
import { DEMO, X, bossRig, only, runUntil, sfxOf, takes, track } from './demo-helpers.ts';

const hurt = (frames: Frame[]): number[] => frames.flatMap((t) => ofType(t.ev, 'hit').filter((h) => !h.onEnemy).map((h) => h.dmg));
const count = (frames: Frame[], id: string): number => frames.reduce((n, t) => n + sfxOf(t.ev).filter((s) => s === id).length, 0);
const fxOf = (t: Frame | undefined, kind: string): Frame['fx'] => (t?.fx ?? []).filter((f) => f.kind === kind);

test('petals: shut above 60 percent HP, open below it, and the roar comes once', () => {
  const r = bossRig();
  only(r, null);
  r.sim.dev.god = true;
  r.boss.hp = r.boss.hpMax * 0.62;
  const calm = track(r, 150);
  assert.ok(calm.every((t) => t.v?.petals === false), 'petals shut');
  assert.equal(count(calm, 'roar') + count(calm, 'petals'), 0);
  r.boss.hp = r.boss.hpMax * 0.58;
  const open = track(r, 400);
  assert.equal(count(open, 'roar'), 1, 'one roar');
  assert.equal(count(open, 'petals'), 1, 'and the head opening');
  const at = open.findIndex((t) => sfxOf(t.ev).includes('petals'));
  assert.ok(at >= 0 && at < 5, 'at once');
  assert.ok(open.slice(at).every((t) => t.v?.petals === true));
  r.boss.hp = r.boss.hpMax * 0.2;
  assert.equal(count(track(r, 300), 'roar'), 0, 'it never roars again, lower or not');
});

test('petals: the line is exactly 60 percent of its HP', () => {
  for (const [share, opens] of [[0.601, false], [0.6, true]] as const) {
    const r = bossRig();
    only(r, null);
    r.sim.dev.god = true;
    r.boss.hp = r.boss.hpMax * share;
    track(r, 6);
    assert.equal(r.d.petals, opens, `at ${share}`);
  }
});

test('spit: never before the petals open', () => {
  const r = bossRig();
  only(r, 'spit');
  r.d.spitCd = 0;
  r.boss.hp = r.boss.hpMax * 0.8;
  r.sim.dev.god = true;
  const frames = track(r, 500);
  assert.equal(count(frames, 'acid'), 0);
  assert.ok(frames.every((t) => t.v?.pose !== 'spit'));
});

test('spit: three globs in a fan at the hero, each shows a mark, and they land 40 frames later in a 14 px splash', () => {
  const r = bossRig({ start: { x: tc(13) - 100, y: tf(6) } });
  only(r, 'spit');
  r.d.petals = true;
  r.d.spitCd = 0;
  r.boss.hp = r.boss.hpMax * 0.7;
  const hx = r.hero.x, hy = r.hero.y;
  const frames = track(r, 120);
  const first = frames.findIndex((t) => t.v?.pose === 'spit');
  let wind = 0;
  while (frames[first + wind]?.v?.pose === 'spit') wind++;
  assert.equal(wind, X.spitWindup, 'the wind-up');
  assert.ok(frames.slice(first, first + wind).every((t) => t.v?.alert), 'under the "!"');
  const fire = first + wind;
  assert.ok(sfxOf(frames[fire]?.ev ?? []).includes('acid'));

  const marks = fxOf(frames[fire], 'mark');
  assert.equal(marks.length, 3);
  assert.ok(marks.every((m) => m.w === 28 && m.h === 14), 'each is a 14 px ring');
  const bx = frames[fire]?.v?.x ?? 0, by = frames[fire]?.v?.y ?? 0;
  const centre = Math.atan2(hy - by, hx - bx);
  const wrap = (a: number): number => Math.atan2(Math.sin(a), Math.cos(a));
  const rel = marks.map((m) => wrap(Math.atan2(m.y - by, m.x - bx) - centre)).sort((a, b) => a - b);
  assert.ok(Math.abs(rel[0] as number + X.fan) < 0.02 && Math.abs(rel[1] as number) < 0.02 && Math.abs(rel[2] as number - X.fan) < 0.02, `a fan, one straight at the hero: ${rel.map((n) => n.toFixed(2))}`);
  const mid = marks.find((m) => Math.abs(wrap(Math.atan2(m.y - by, m.x - bx) - centre)) < 0.02);
  assert.ok(mid && Math.hypot(mid.x - hx, mid.y - hy) < 2, 'it lands on the hero');
  const globs = fxOf(frames[fire], 'acid');
  assert.equal(globs.length, 3, 'and three globs are in the air');
  assert.ok(globs.every((g) => g.life === X.flight + X.splashT && g.w === 28 && g.h === 14), 'each lives 40 frames of flight and 14 of splash');
  const mid20 = fxOf(frames[fire + 20], 'acid');
  assert.ok(mid20.every((g) => g.t === 20 && Math.hypot(g.x - bx, g.y - by) > 30), 'on its way');
  assert.ok(fxOf(frames[fire + 20], 'acid').every((g) => marks.some((m) => Math.hypot(m.x - g.x, m.y - g.y) > 10)), 'not there yet');

  const land = fire + X.flight;
  assert.ok(sfxOf(frames[land]?.ev ?? []).includes('acid'), 'they land 40 frames after the spit');
  assert.equal(fxOf(frames[land - 1], 'mark').length, 3, 'the marks stand until then');
  assert.equal(fxOf(frames[land], 'mark').length, 0);
  const splash = fxOf(frames[land], 'acid');
  assert.equal(splash.length, 3);
  assert.ok(splash.every((g) => g.t === X.flight && marks.some((m) => Math.hypot(m.x - g.x, m.y - g.y) < 1)), 'each on its mark, at the start of its splash');
  // The hit on the hero freezes play for a few frames, so look a little either side of the 14.
  assert.equal(fxOf(frames[land + X.splashT - 4], 'acid').length, 3, 'the splash is drawn for 14 frames');
  assert.equal(fxOf(frames[land + X.splashT + 5], 'acid').length, 0, 'and then gone');
  const dmg = hurt(frames.slice(0, land - 1));
  assert.deepEqual(dmg, [], 'nothing hurts before they land');
  const taken = hurt([frames[land] as Frame]);
  const range = takes(X.globPower, DEMO.atk, r.hero.st.def);
  assert.equal(taken.length, 1, 'the hero standing on the middle one is hit once');
  assert.ok((taken[0] as number) >= range.lo && (taken[0] as number) <= range.hi, `${taken[0]}, expected ${range.lo} to ${range.hi}`);
});

test('spit: a hero who steps off the marks is not touched', () => {
  const r = bossRig({ start: { x: tc(13) - 100, y: tf(6) } });
  only(r, 'spit');
  r.d.petals = true;
  r.d.spitCd = 0;
  r.boss.hp = r.boss.hpMax * 0.7;
  const before = track(r, 40);
  assert.ok(count(before, 'acid') === 1 && before.some((t) => fxOf(t, 'mark').length === 3), 'the marks are down');
  r.sim.dev.teleport(r.hero.x, r.hero.y - 60);
  const frames = [...before, ...track(r, 50)];
  assert.ok(count(frames, 'acid') >= 2, 'it spat and they landed');
  assert.deepEqual(hurt(frames), []);
});

test('leap: not above 30 percent HP, and from there it crouches, jumps and lands on the hero', () => {
  const calm = bossRig();
  only(calm, 'leap');
  calm.d.petals = true;
  calm.d.leapCd = 0;
  calm.boss.hp = calm.boss.hpMax * 0.31;
  calm.sim.dev.god = true;
  assert.ok(track(calm, 500).every((t) => t.v?.pose !== 'leap'), 'no leap at 31 percent');

  const r = bossRig({ start: { x: tc(13) - 100, y: tf(6) } });
  only(r, 'leap');
  r.d.petals = true;
  r.d.leapCd = 0;
  r.boss.hp = r.boss.hpMax * 0.29;
  const hx = r.hero.x, hy = r.hero.y;
  const frames = track(r, 200);
  const first = frames.findIndex((t) => t.v?.pose === 'leap');
  assert.ok(first >= 0 && first < 4, 'at once');
  let crouch = 0;
  while (frames[first + crouch]?.v?.alert) crouch++;
  assert.equal(crouch, X.crouch, 'the crouch is 30 frames under the "!"');
  assert.ok(frames.slice(first, first + crouch).every((t) => t.v?.pose === 'leap' && t.v.z === 0));

  const up = first + crouch;
  const mark = fxOf(frames[up], 'mark');
  assert.equal(mark.length, 1, 'a mark where it will come down');
  assert.ok(mark[0] && mark[0].w === 80 && mark[0].h === 40, '40 px across the shockwave');
  assert.ok(mark[0] && Math.hypot(mark[0].x - hx, mark[0].y - hy) < 1, 'on the hero');
  let air = 0, zmax = 0;
  while (frames[up + air]?.v?.pose === 'leap') { zmax = Math.max(zmax, frames[up + air]?.v?.z ?? 0); air++; }
  assert.ok(air >= 44 && air <= 46, `${air} frames in the air`);
  assert.ok(zmax > 20, `it rises ${zmax.toFixed(0)} px`);
  assert.ok(Math.abs((frames[up + 22]?.v?.z ?? 0) - zmax) < 3, 'to the top in the middle');
  const land = up + air;
  assert.equal(frames[land]?.v?.z, 0);
  assert.ok(sfxOf(frames[land]?.ev ?? []).includes('thud'));
  assert.equal(fxOf(frames[land], 'ring').some((f) => f.w === 80), true, 'a 40 px shockwave');
  assert.equal(fxOf(frames[land], 'mark').length, 0, 'and the mark is gone');
  assert.ok(Math.hypot((frames[land]?.v?.x ?? 0) - hx, (frames[land]?.v?.y ?? 0) - hy) < 1, 'it comes down on him');
  const taken = hurt([frames[land] as Frame]);
  const range = takes(X.leapPower, DEMO.atk, r.hero.st.def);
  assert.equal(taken.length, 1);
  assert.ok((taken[0] as number) >= range.lo && (taken[0] as number) <= range.hi, `${taken[0]}, expected ${range.lo} to ${range.hi}`);
  let rec = 0;
  while (frames[land + rec]?.v?.pose === undefined && !frames[land + rec]?.v?.alert && land + rec < frames.length - 1) rec++;
  assert.ok(rec >= X.leapRecover, `${rec} frames before it does anything else`);
});

test('leap: a hero who has run 44 px from the mark is clear of the shockwave; one who stayed within 40 is not', () => {
  for (const [away, hit] of [[44, false], [30, true]] as const) {
    const r = bossRig({ start: { x: tc(13) - 100, y: tf(6) } });
    only(r, 'leap');
    r.d.petals = true;
    r.d.leapCd = 0;
    r.boss.hp = r.boss.hpMax * 0.29;
    runUntil(r, () => r.d.move === 'air', 80);
    r.sim.dev.teleport(r.hero.x, r.hero.y - away);
    const rest = track(r, 80);
    assert.equal(hurt(rest).length, hit ? 1 : 0, `${away} px from the mark`);
  }
});
