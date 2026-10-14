// The Warden: a bigger shield, the same bash with a longer wind-up, a ground slam on a cycle, and the boss bar.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ENEMY_DEFS } from '../src/enemies/index.ts';
import { damageRange, hitEnemy } from '../src/combat/damage.ts';
import { arena, inp, makeWhite, ofType, run, sfxIds, tc, tf } from './sim-helpers.ts';
import { guardAt, wardenAt } from './guard-helpers.ts';
import type { Enemy, Hero, S } from '../src/combat/state.ts';
import type { Sim, SimEvent } from '../src/core/types.ts';

interface Rig { sim: Sim; s: S; w: Enemy; hero: Hero }

/** One Warden at tile (12, 8) facing down, and Mike at Lv 3 with plenty of HP. */
function rig(over: Parameters<typeof makeWhite>[0] = {}): Rig {
  const { sim, s } = makeWhite({ party: [{ id: 'mike', level: 3 }], start: { x: tc(3), y: tf(3) }, spawns: [wardenAt(12, 8)], seed: 4, ...over });
  const hero = s.heroes[0] as Hero;
  hero.st.hp = 900; hero.hp = 900;
  return { sim, s, w: s.enemies[0] as Enemy, hero };
}

const FROM_FRONT = -Math.PI / 2;
const FROM_BACK = Math.PI / 2;
const fromOffset = (deg: number): number => Math.atan2(Math.sin((90 + deg) * Math.PI / 180), Math.cos((90 + deg) * Math.PI / 180)) + Math.PI;
const hit = (r: Rig, angle: number, kb = 0): number => {
  const before = r.w.hp;
  hitEnemy(r.s, r.hero, r.w, { power: 1, kb, angle, noCrit: true });
  return before - r.w.hp;
};
const sounds = (ev: SimEvent[]): string[] => sfxIds(ev).filter((id) => id === 'bash' || id === 'slam');

test('warden: the contract numbers', () => {
  const d = ENEMY_DEFS.warden;
  assert.deepEqual([d.hp, d.atk, d.def, d.speed, d.xp], [260, 20, 9, 0.65, 60]);
  assert.deepEqual([d.windup, d.x.slamWindup, d.x.slamRadius, d.x.slamPower, d.x.slamKb, d.x.slamRecover, d.x.arc, d.x.block],
    [34, 45, 46, 1.3, 5, 60, 90, 0.25]);
  assert.equal(rig().w.hpMax, 260);
});

test('warden shield: 25 percent from inside 90 degrees, full from outside it', () => {
  const r = rig();
  const full = damageRange(1, r.hero.st.atk, 9);
  const lo = Math.max(1, Math.round(full.min * 0.25)), hi = Math.max(1, Math.round(full.max * 0.25));
  for (const deg of [0, 60, 85, -85]) {
    const dealt = hit(r, fromOffset(deg));
    assert.ok(dealt >= lo && dealt <= hi, `${deg} degrees: ${dealt}, expected ${lo} to ${hi}`);
  }
  for (const deg of [95, 135, 180, -95]) assert.ok(hit(r, fromOffset(deg)) >= full.min, `${deg} degrees is the flank`);
  assert.ok(hit(r, FROM_FRONT) > 0);
});

test('warden: it is heavy, and a shove moves it a third as far as it moves a guard', () => {
  const shove = (kind: 'g' | 'w'): number => {
    const { sim, s } = makeWhite({ party: [{ id: 'eleven', level: 3 }], start: { x: tc(3), y: tf(3) }, spawns: [kind === 'g' ? guardAt(12, 8) : wardenAt(12, 8)] });
    const e = s.enemies[0] as Enemy;
    e.cd = 9999;
    hitEnemy(s, s.heroes[0] as Hero, e, { power: 1, kb: 5.2, angle: FROM_BACK, noCrit: true });
    const y0 = e.y;
    run(sim, 30);
    return e.y - y0;
  };
  const guard = shove('g'), warden = shove('w');
  assert.ok(guard > 10, `guard thrown ${guard.toFixed(1)}`);
  assert.ok(warden < guard / 2, `warden thrown ${warden.toFixed(1)}`);
});

test('bash: wind-up 34 frames, then the same bash for power 1.0, recover 36 frames with the shield down', () => {
  const r = rig({ start: { x: tc(12), y: tf(8) + 22 }, god: true });
  r.w.aware = true; r.w.mode = 'chase'; r.w.cd = 0;
  const track: { alert: boolean; guarding: boolean; ev: SimEvent[] }[] = [];
  for (let f = 0; f < 120; f++) {
    const ev = r.sim.step(inp());
    const a = r.sim.view().actors.find((x) => x.kind === 'enemy');
    track.push({ alert: a?.alert === true, guarding: a?.guarding === true, ev });
  }
  const first = track.findIndex((t) => t.alert);
  assert.ok(first >= 0 && first < 5);
  let len = 0;
  while (track[first + len]?.alert) len++;
  assert.equal(len, 34);
  const bashAt = track.findIndex((t) => sounds(t.ev).includes('bash'));
  assert.equal(bashAt, first + 34);
  assert.ok(!track.some((t) => sounds(t.ev).includes('slam')), 'the first attack is a bash');
  let down = 0;
  while (!track[bashAt + down]?.guarding) down++;
  assert.equal(down, 36);
  const live = rig({ start: { x: tc(12), y: tf(8) + 22 } });
  live.w.aware = true; live.w.mode = 'windup'; live.w.modeT = 1;
  const range = damageRange(1, 20, live.hero.st.def);
  const h = ofType(run(live.sim, 2), 'hit').find((x) => !x.onEnemy);
  assert.ok(h && h.dmg >= range.min && h.dmg <= range.max, `bash ${h?.dmg}, expected ${range.min} to ${range.max}`);
});

test('attacks: two bashes, then a slam, and so on while it is healthy', () => {
  const r = rig({ start: { x: tc(12), y: tf(8) + 22 }, god: true });
  r.w.aware = true; r.w.mode = 'chase'; r.w.cd = 0;
  const seq: string[] = [];
  for (let f = 0; f < 1100 && seq.length < 6; f++) seq.push(...sounds(r.sim.step(inp())));
  assert.deepEqual(seq, ['bash', 'bash', 'slam', 'bash', 'bash', 'slam']);
});

test('attacks: below half HP every second attack is a slam', () => {
  const r = rig({ start: { x: tc(12), y: tf(8) + 22 }, god: true });
  r.w.aware = true; r.w.mode = 'chase'; r.w.cd = 0;
  r.w.hp = r.w.hpMax * 0.4;
  const seq: string[] = [];
  for (let f = 0; f < 1100 && seq.length < 5; f++) seq.push(...sounds(r.sim.step(inp())));
  assert.deepEqual(seq, ['bash', 'slam', 'slam', 'slam', 'bash']);
});

test('slam: 45 frames of growing ring, then a 46 px shockwave, then 60 frames of recovery with the shield down', () => {
  const r = rig({ start: { x: tc(12), y: tf(8) + 22 }, god: true });
  r.w.aware = true; r.w.mode = 'chase'; r.w.cd = 0; r.w.swings = 2;
  const frames: { ring: { w: number; h: number; t: number; life: number } | undefined; alert: boolean; guarding: boolean; ev: SimEvent[] }[] = [];
  for (let f = 0; f < 200; f++) {
    const ev = r.sim.step(inp());
    const a = r.sim.view().actors.find((x) => x.kind === 'enemy');
    const ring = r.sim.view().fx.find((x) => x.kind === 'ring' && x.life === 45);
    frames.push({ ring: ring && { w: ring.w, h: ring.h, t: ring.t, life: ring.life }, alert: a?.alert === true, guarding: a?.guarding === true, ev });
  }
  const first = frames.findIndex((t) => t.alert);
  let len = 0;
  while (frames[first + len]?.alert) len++;
  assert.equal(len, 45, 'the wind-up is 45 frames');
  const slamAt = frames.findIndex((t) => sounds(t.ev).includes('slam'));
  assert.equal(slamAt, first + 45);
  const ringFrames = frames.filter((t) => t.ring).length;
  assert.ok(ringFrames >= 44 && ringFrames <= 46, `the telegraph ring is up for ${ringFrames} frames`);
  const ring = frames[first + 20]?.ring;
  assert.ok(ring && ring.w === 92, 'the ring grows to the 46 px radius');
  assert.ok(ring.t > (frames[first + 5]?.ring?.t ?? 99), 'and its clock runs');
  assert.ok(frames.slice(first, first + 45).every((t) => t.guarding), 'the shield stays up through the wind-up');
  assert.equal(frames[slamAt + 1]?.ring, undefined, 'the telegraph is gone once it lands');
  let down = 0;
  while (!frames[slamAt + down]?.guarding) down++;
  assert.equal(down, 60, 'recovery with the shield down');
});

test('slam: hits everything within 46 px, all around, for power 1.3 and knockback 5, and misses beyond', () => {
  const range = damageRange(1.3, 20, 7);
  for (const [dx, dy, hits] of [[0, 30, true], [0, -40, true], [-44, 0, true], [30, 30, true], [0, 52, false], [-50, 0, false], [0, -56, false]] as const) {
    const r = rig({ start: { x: tc(12) + dx, y: tf(8) + dy } });
    assert.equal(r.hero.st.def, 7);
    r.w.aware = true; r.w.mode = 'windup'; r.w.slam = true; r.w.modeT = 1;
    const hp = r.hero.hp;
    const y0 = r.hero.y, x0 = r.hero.x;
    const ev = run(r.sim, 12);
    if (hits) {
      const dealt = hp - r.hero.hp;
      assert.ok(dealt >= range.min && dealt <= range.max, `at ${dx},${dy}: ${dealt}, expected ${range.min} to ${range.max}`);
      assert.ok(sfxIds(ev).includes('slam'));
      assert.ok(Math.hypot(r.hero.x - x0, r.hero.y - y0) > 12, 'and the hero is thrown');
    } else {
      assert.equal(r.hero.hp, hp, `at ${dx},${dy} the hero is clear of the ring`);
    }
  }
});

test('slam: the shockwave does not go through a wall', () => {
  for (const wall of [false, true]) {
    const r = rig({ start: { x: tc(12), y: tf(10) }, grid: arena(24, 16, wall ? { '12,9': 'T' } : {}) });
    r.w.aware = true; r.w.mode = 'windup'; r.w.slam = true; r.w.modeT = 1;
    const hp = r.hero.hp;
    run(r.sim, 6);
    assert.equal(hp - r.hero.hp > 0, !wall, wall ? 'the wall covers the hero' : 'in the open it lands');
  }
});

test('slam: a break cancels the wind-up and takes down the ring, and it cannot be broken again for 120 frames after', () => {
  const r = rig({ start: { x: tc(12), y: tf(8) + 22 } });
  r.hero.invuln = 9999;
  r.w.aware = true; r.w.mode = 'chase'; r.w.cd = 0; r.w.swings = 2;
  for (let f = 0; f < 40 && r.w.mode !== 'windup'; f++) run(r.sim, 1);
  assert.equal(r.w.mode, 'windup');
  assert.ok(r.w.slam && r.sim.view().fx.some((x) => x.kind === 'ring' && x.life === 45));
  hit(r, FROM_FRONT, 5.2);
  assert.equal(r.w.mode, 'chase');
  assert.equal(r.w.slam, false);
  assert.equal(r.sim.view().fx.some((x) => x.kind === 'ring' && x.life === 45), false, 'the ring is gone');
  assert.equal(r.w.broken, 45);
  run(r.sim, 46);
  assert.equal(r.sim.view().actors.find((a) => a.kind === 'enemy')?.guarding, true);
  hit(r, FROM_FRONT, 5.2);
  assert.equal(r.w.broken, 0, 'a second shove inside the grace time does nothing');
  assert.ok(r.w.grace > 100 && r.w.grace <= 120, `${r.w.grace} frames of grace left`);
  while (r.w.grace > 0) run(r.sim, 1);
  hit(r, FROM_FRONT, 5.2);
  assert.equal(r.w.broken, 45, 'later it breaks again');
});

test('boss bar: empty while the Warden sleeps, then its name and HP, and gone when it dies', () => {
  const r = rig({ spawns: [wardenAt(12, 8, { dormant: true }), guardAt(8, 8)] });
  assert.equal(r.sim.view().hud.boss, null, 'a guard is not a boss, and a sleeping Warden has no bar');
  r.sim.spawnGroup('w');
  assert.deepEqual(r.sim.view().hud.boss, { name: 'WARDEN', hp: 260, hpMax: 260 });
  const w = r.s.enemies.find((e) => e.kind === 'warden') as Enemy;
  w.hp = 100.2;
  assert.deepEqual(r.sim.view().hud.boss, { name: 'WARDEN', hp: 101, hpMax: 260 });
  w.hp = 0;
  run(r.sim, 8);
  assert.equal(r.sim.view().hud.boss, null);
});

test('boss bar: an elite Warden shows its own, larger, maximum', () => {
  const r = rig({ spawns: [wardenAt(12, 8, { tier: 'elite' })] });
  const bar = r.sim.view().hud.boss;
  assert.equal(bar?.hpMax, Math.round(260 * 1.9));
});

test('warden: its kill pays 60 XP and a quarter, and removes a slam ring that was still up', () => {
  const r = rig({ start: { x: tc(12), y: tf(8) + 22 } });
  r.w.aware = true; r.w.mode = 'chase'; r.w.cd = 0; r.w.swings = 2;
  for (let f = 0; f < 40 && r.w.mode !== 'windup'; f++) run(r.sim, 1);
  assert.ok(r.sim.view().fx.some((x) => x.kind === 'ring' && x.life === 45));
  r.w.hp = 0;
  const kills = ofType(run(r.sim, 10), 'kill');
  assert.equal(kills.length, 1);
  assert.equal(kills[0]?.xp, 60);
  assert.equal(kills[0]?.kind, 'warden');
  assert.equal(r.sim.view().fx.some((x) => x.kind === 'ring' && x.life === 45), false);
  assert.equal(r.s.items.filter((i) => i.kind === 'quarter').length, 1, 'it always drops a quarter');
});

test('warden: backing into a flank, a hero behind it is hit hard until it turns', () => {
  const r = rig({ start: { x: tc(12), y: tf(8) + 22 } });
  r.w.cd = 9999; r.w.aware = true; r.w.mode = 'chase';
  run(r.sim, 10);
  r.sim.dev.teleport(tc(12), tf(8) - 22);
  run(r.sim, 11);
  const full = damageRange(1, r.hero.st.atk, 9);
  assert.ok(hit(r, FROM_BACK) >= full.min);
  run(r.sim, 8);
  assert.equal(r.w.dir, 'up', 'and then it turns around');
});
