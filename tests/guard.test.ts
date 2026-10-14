// The riot guard in the real sim: stats, the shield (front, flank, burn, shove, recover), the slow turn, the bash, and
// how it plays with the DM screen, the candy lure, the swap shockwave and the burst.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ENEMY_DEFS } from '../src/enemies/index.ts';
import { damageRange, hitEnemy } from '../src/combat/damage.ts';
import { BURN_PERIOD } from '../src/combat/status.ts';
import { inp, makeWhite, ofType, press, run, sfxIds, tc, tf } from './sim-helpers.ts';
import { guardAt } from './guard-helpers.ts';
import type { Enemy, Hero, S } from '../src/combat/state.ts';
import type { Sim, SimEvent } from '../src/core/types.ts';

interface Rig { sim: Sim; s: S; g: Enemy; hero: Hero }

/** One guard at tile (12, 8) facing down, and Mike at Lv 3 well away from it. */
function rig(over: Parameters<typeof makeWhite>[0] = {}): Rig {
  const { sim, s } = makeWhite({ party: [{ id: 'mike', level: 3 }], start: { x: tc(3), y: tf(3) }, spawns: [guardAt(12, 8)], seed: 4, ...over });
  return { sim, s, g: s.enemies[0] as Enemy, hero: s.heroes[0] as Hero };
}

/** The guard's own hit-test angles: a hit travelling `up` came from below, in front of a guard facing down. */
const FROM_FRONT = -Math.PI / 2;
const FROM_BACK = Math.PI / 2;
/** A hit that comes from `deg` degrees off the guard's facing (down). */
const fromOffset = (deg: number): number => Math.atan2(Math.sin((90 + deg) * Math.PI / 180), Math.cos((90 + deg) * Math.PI / 180)) + Math.PI;

function strike(r: Rig, angle: number, kb = 0, extra: Partial<Parameters<typeof hitEnemy>[3]> = {}): number {
  const before = r.g.hp;
  hitEnemy(r.s, r.hero, r.g, { power: 1, kb, angle, noCrit: true, ...extra });
  return before - r.g.hp;
}

test('guard: the contract numbers', () => {
  const d = ENEMY_DEFS.guard;
  assert.deepEqual([d.hp, d.atk, d.def, d.speed, d.xp], [70, 17, 8, 0.7, 24]);
  assert.deepEqual([d.windup, d.power, d.cooldown, d.x.range, d.x.kb, d.x.recover, d.x.turn, d.x.arc, d.x.block, d.x.breakKb, d.x.breakT],
    [30, 1, 110, 26, 4.2, 36, 12, 75, 0.2, 3.2, 45]);
  assert.equal(makeWhite({ spawns: [guardAt(12, 8)] }).s.enemies[0]?.hpMax, 70);
});

test('shield: a hit from the front does 20 percent, never below 1, with BLOCK and the block sound', () => {
  const r = rig();
  const full = damageRange(1, r.hero.st.atk, 8);
  const lo = Math.max(1, Math.round(full.min * 0.2)), hi = Math.max(1, Math.round(full.max * 0.2));
  const dealt = strike(r, FROM_FRONT);
  assert.ok(dealt >= lo && dealt <= hi, `blocked hit ${dealt}, expected ${lo} to ${hi}`);
  assert.ok(dealt < full.min);
  assert.ok(r.s.floaters.some((f) => f.text === 'BLOCK'), 'BLOCK floats over it');
  assert.ok(r.s.events.some((e) => e.t === 'sfx' && e.id === 'block'));
  assert.ok(!r.s.events.some((e) => e.t === 'sfx' && e.id === 'hit'), 'the plain hit sound is replaced');
  assert.equal(strike(r, FROM_FRONT, 0, { power: 0.1 }), 1, 'a feeble hit still does 1');
});

test('shield: a hit from the flank or the back does full damage, with no BLOCK', () => {
  const r = rig();
  const full = damageRange(1, r.hero.st.atk, 8);
  for (const angle of [FROM_BACK, 0, Math.PI]) {
    r.s.floaters = [];
    const dealt = strike(r, angle);
    assert.ok(dealt >= full.min && dealt <= full.max, `angle ${angle.toFixed(2)}: ${dealt}, expected ${full.min} to ${full.max}`);
    assert.ok(!r.s.floaters.some((f) => f.text === 'BLOCK'));
  }
});

test('shield: the arc is 75 degrees either side of the facing', () => {
  const r = rig();
  const full = damageRange(1, r.hero.st.atk, 8);
  for (const deg of [0, 40, 70, -70]) assert.ok(strike(r, fromOffset(deg)) < full.min, `${deg} degrees off the facing is blocked`);
  for (const deg of [80, 100, 180, -80, -135]) assert.ok(strike(r, fromOffset(deg)) >= full.min, `${deg} degrees off the facing is not`);
});

test('shield: a crit cannot get through a block, and Mike\'s fiat waits for a hit that does', () => {
  const r = rig();
  r.s.armed = true;
  hitEnemy(r.s, r.hero, r.g, { power: 1, angle: FROM_FRONT });
  assert.equal(r.s.armed, true, 'a block does not spend the first-hit fiat');
  hitEnemy(r.s, r.hero, r.g, { power: 1, angle: FROM_BACK });
  assert.equal(r.s.armed, false, 'a hit that gets through does');
  const crits = (angle: number): number => {
    let n = 0;
    for (let i = 0; i < 300; i++) {
      r.g.hp = r.g.hpMax;
      r.s.events = [];
      hitEnemy(r.s, r.hero, r.g, { power: 1, angle });
      n += ofType(r.s.events, 'hit').filter((h) => h.crit).length;
    }
    return n;
  };
  assert.equal(crits(FROM_FRONT), 0, 'no crit through the shield');
  assert.ok(crits(FROM_BACK) > 0, 'crits still happen from behind');
});

test('shield: burn ticks ignore it, and Farrah spray lights a guard from the front', () => {
  const r = rig({ party: [{ id: 'dustin', level: 3 }], start: { x: tc(12), y: tf(8) + 24 } });
  r.g.cd = 9999;
  r.hero.dir = 'up'; r.hero.aim = -Math.PI / 2;
  const dmg = Math.max(1, Math.round(r.hero.st.atk * 0.22));
  assert.ok(dmg >= 2, 'a burn tick is worth 2 or more at Lv 3');
  press(r.sim, { specialPressed: true });
  run(r.sim, 60);
  assert.ok(r.g.stat.burn > 0, 'it is burning');
  assert.equal(r.g.stat.burnDmg, dmg);
  // From here nothing else touches it. Each tick takes the full burn damage, shield or not.
  let ticks = 0, last = r.g.hp;
  for (let f = 0; f < 200; f++) {
    run(r.sim, 1);
    if (r.g.hp < last) { assert.equal(last - r.g.hp, dmg, `tick ${ticks}`); ticks++; }
    last = r.g.hp;
  }
  assert.ok(ticks >= 3, `${ticks} burn ticks landed`);
  assert.ok(BURN_PERIOD === 30);
});

test('shield: Eleven\'s Push breaks it for 45 frames, then the shield comes back and cannot be broken at once again', () => {
  const r = rig({ party: [{ id: 'eleven', level: 3 }], start: { x: tc(12), y: tf(8) + 22 } });
  r.g.cd = 9999;
  r.hero.dir = 'up'; r.hero.aim = -Math.PI / 2;
  const guardingNow = (): boolean => r.sim.view().actors.find((a) => a.kind === 'enemy')?.guarding === true;
  assert.equal(guardingNow(), true);
  const full = damageRange(1.4, r.hero.st.atk, 8);
  const hp0 = r.g.hp;
  // The press lands the push 5 frames later.
  let broken = -1;
  for (let f = 0; f < 20 && broken < 0; f++) {
    run(r.sim, 1, inp(f === 0 ? { attackPressed: true } : {}));
    if (!guardingNow()) broken = f;
  }
  assert.ok(broken >= 4 && broken <= 7, `broke on frame ${broken}`);
  assert.ok(hp0 - r.g.hp < full.min, 'the breaking push itself was blocked at 20 percent');
  assert.ok(r.s.floaters.some((f) => f.text === 'BREAK'));
  let down = 0;
  while (!guardingNow() && down < 100) { run(r.sim, 1); down++; }
  assert.equal(down, 45, 'the shield is down for 45 frames');
  // Grace: a second push right after the shield returns is blocked and does not break it.
  r.hero.cdBasic = 0;
  const hp1 = r.g.hp;
  run(r.sim, 1, inp({ attackPressed: true }));
  run(r.sim, 8);
  assert.equal(guardingNow(), true, 'still guarding');
  assert.ok(hp1 - r.g.hp < full.min, 'and the hit was blocked');
});

test('shield: any hit with knockback of 3.2 or more breaks it, and 3.1 does not', () => {
  const soft = rig();
  strike(soft, FROM_FRONT, 3.1);
  assert.equal(soft.g.broken, 0);
  assert.equal(soft.sim.view().actors.find((a) => a.kind === 'enemy')?.guarding, true);
  const hard = rig();
  strike(hard, FROM_FRONT, 3.2);
  assert.equal(hard.g.broken, 45);
  assert.equal(hard.sim.view().actors.find((a) => a.kind === 'enemy')?.guarding, false);
  const back = rig();
  const full = damageRange(1, back.hero.st.atk, 8);
  assert.ok(strike(back, FROM_BACK, 5.2) >= full.min, 'a shove from behind is full damage and breaks it as well');
  assert.equal(back.g.broken, 45);
});

test('shield: a broken guard takes full damage from the front, and cannot attack until it is back', () => {
  const r = rig({ start: { x: tc(12), y: tf(8) + 18 } });
  strike(r, FROM_FRONT, 5);
  r.hero.invuln = 0;
  const full = damageRange(1, r.hero.st.atk, 8);
  const dealt = strike(r, FROM_FRONT);
  assert.ok(dealt >= full.min, `${dealt} while broken`);
  const hurt = ofType(run(r.sim, 40), 'hit').filter((h) => !h.onEnemy);
  assert.equal(hurt.length, 0, 'it does not fight back while it is down');
  assert.equal(r.g.mode === 'windup', false);
});

test('shield: recovering or stunned opens it, a windup does not', () => {
  const r = rig();
  const full = damageRange(1, r.hero.st.atk, 8);
  r.g.mode = 'windup'; r.g.modeT = 10;
  assert.ok(strike(r, FROM_FRONT) < full.min, 'the windup is still behind the shield');
  r.g.mode = 'recover'; r.g.modeT = 20;
  assert.equal(r.sim.view().actors.find((a) => a.kind === 'enemy')?.guarding, false);
  assert.ok(strike(r, FROM_FRONT) >= full.min, 'a recovering guard takes the full hit');
  r.g.mode = 'chase';
  r.g.stat.stun = 20;
  assert.equal(r.sim.view().actors.find((a) => a.kind === 'enemy')?.guarding, false);
  assert.ok(strike(r, FROM_FRONT) >= full.min, 'a stunned guard too');
});

test('shield: a guard has poise: blocked and flank hits neither stagger it nor cancel its windup', () => {
  const r = rig();
  r.g.aware = true;
  r.g.mode = 'windup'; r.g.modeT = 20;
  strike(r, FROM_FRONT);
  strike(r, FROM_BACK);
  assert.equal(r.g.stagger, 0);
  assert.equal(r.g.mode, 'windup');
  strike(r, FROM_BACK, 4);
  assert.equal(r.g.mode, 'chase', 'a break cancels the wind-up');
  assert.ok(r.g.stagger >= 45);
});

test('turn: it faces the hero only after 12 frames with the hero behind its shield', () => {
  const r = rig({ start: { x: tc(12), y: tf(8) - 30 } });
  r.g.cd = 9999;
  const v = (): string | undefined => r.sim.view().actors.find((a) => a.kind === 'enemy')?.dir;
  assert.equal(v(), 'down');
  let frames = 0;
  while (v() === 'down' && frames < 60) { run(r.sim, 1); frames++; }
  assert.equal(frames, 12);
  assert.equal(v(), 'up', 'now it faces the hero');
});

test('turn: walking around it opens the flank, and the turn catches up 12 frames later', () => {
  const r = rig({ start: { x: tc(12), y: tf(8) + 26 } });
  r.g.cd = 9999;
  r.g.aware = true; r.g.mode = 'chase';
  run(r.sim, 20);
  assert.equal(r.g.dir, 'down', 'with the hero in front it keeps facing down');
  // The hero steps around to its right side, then behind it.
  r.sim.dev.teleport(tc(12), tf(8) - 24);
  const full = damageRange(1, r.hero.st.atk, 8);
  run(r.sim, 11);
  assert.equal(r.g.dir, 'down', 'still facing down after 11 frames');
  assert.ok(strike(r, FROM_BACK) >= full.min, 'so a hit from behind is full damage');
  run(r.sim, 8);
  assert.equal(r.g.dir, 'up');
});

test('bash: red "!" for 30 frames, then the bash, then 36 frames with the shield down', () => {
  // God mode keeps the hit-stop out of the count, so the frames are exact.
  const r = rig({ start: { x: tc(12), y: tf(8) + 20 }, god: true });
  r.g.aware = true; r.g.mode = 'chase'; r.g.cd = 0;
  const track: { alert: boolean; guarding: boolean; ev: SimEvent[] }[] = [];
  for (let f = 0; f < 150; f++) {
    const ev = r.sim.step(inp());
    const a = r.sim.view().actors.find((x) => x.kind === 'enemy');
    track.push({ alert: a?.alert === true, guarding: a?.guarding === true, ev });
  }
  const first = track.findIndex((t) => t.alert);
  assert.ok(first >= 0 && first < 5, `the wind-up began on frame ${first}`);
  let len = 0;
  while (track[first + len]?.alert) len++;
  assert.equal(len, 30, 'the red "!" shows for 30 frames');
  assert.ok(track.slice(first, first + 30).every((t) => t.guarding), 'the shield is up during the wind-up');
  const bashAt = track.findIndex((t) => sfxIds(t.ev).includes('bash'));
  assert.equal(bashAt, first + 30, 'the bash lands on the frame the wind-up ends');
  let down = 0;
  while (!track[bashAt + down]?.guarding) down++;
  assert.equal(down, 36, 'the shield is down for the 36-frame recovery');
});

test('bash: damage is power 1.0 of ATK 17 less half the hero\'s DEF, and it throws the hero back', () => {
  const r = rig({ start: { x: tc(12), y: tf(8) + 20 } });
  r.g.aware = true; r.g.mode = 'windup'; r.g.modeT = 1;
  const range = damageRange(1, 17, r.hero.st.def);
  const ev = run(r.sim, 2);
  const hit = ofType(ev, 'hit').find((h) => !h.onEnemy);
  assert.ok(hit, 'it hit the hero');
  assert.ok(hit.dmg >= range.min && hit.dmg <= range.max, `bash ${hit.dmg}, expected ${range.min} to ${range.max}`);
  assert.ok(range.min >= 11 && range.max <= 16, 'about a quarter of a Lv 3 Mike');
});

test('bash: 110 frame cooldown from the start of the wind-up, knockback 4.2, and it only reaches the front', () => {
  const r = rig({ start: { x: tc(12), y: tf(8) + 20 } });
  r.g.aware = true; r.g.mode = 'chase'; r.g.cd = 0;
  let sawWindup = false;
  const y0 = r.hero.y;
  for (let f = 0; f < 60 && !sawWindup; f++) {
    run(r.sim, 1);
    if (r.g.mode === 'windup') { sawWindup = true; assert.equal(r.g.cd, 110); }
  }
  assert.ok(sawWindup);
  run(r.sim, 30);
  run(r.sim, 12);
  assert.ok(r.hero.y - y0 > 12, `thrown ${(r.hero.y - y0).toFixed(1)} px`);
  // A hero beside it and behind it is out of the arc when the bash lands.
  for (const [dx, dy] of [[0, -22], [-22, 0]] as const) {
    const q = rig({ start: { x: tc(12) + dx, y: tf(8) + dy } });
    q.g.aware = true; q.g.mode = 'windup'; q.g.modeT = 1; q.g.dir = 'down'; q.g.turnT = -999;
    const hp = q.hero.hp;
    run(q.sim, 2);
    assert.equal(q.hero.hp, hp, `a hero at ${dx},${dy} is not in the bash`);
  }
});

test('guards fire no darts and fight in melee only', () => {
  const r = rig({ start: { x: tc(12), y: tf(8) + 90 } });
  r.g.aware = true; r.g.mode = 'chase';
  let darts = 0;
  for (let f = 0; f < 200; f++) {
    run(r.sim, 1);
    darts += r.sim.view().fx.filter((x) => x.kind === 'dart').length;
  }
  assert.equal(darts, 0);
  assert.ok(Math.hypot(r.g.x - r.hero.x, r.g.y - r.hero.y) < 40, 'it closed the distance on foot');
});

test('patrol: a guard walks its route at 0.5 px a frame, facing the way it walks, and notices the hero like an agent', () => {
  const r = rig({ spawns: [guardAt(6, 12, { patrol: [{ tx: 6, ty: 12 }, { tx: 14, ty: 12 }] })], start: { x: tc(3), y: tf(2) } });
  const x0 = r.g.x;
  // It pauses 40 frames at its first stop, then walks.
  run(r.sim, 100);
  assert.ok(r.g.x > x0 + 25 && r.g.x < x0 + 35, `moved ${(r.g.x - x0).toFixed(1)} px in 60 walking frames`);
  assert.equal(r.g.dir, 'right');
  assert.equal(r.g.aware, false);
  r.sim.dev.teleport(r.g.x + 50, r.g.y);
  run(r.sim, 3);
  assert.equal(r.g.aware, true);
});

test('the DM screen halves a bash that passes through it', () => {
  const dmg = (screen: boolean): number => {
    const r = rig({ start: { x: tc(12), y: tf(8) + 20 } });
    r.g.aware = true; r.g.mode = 'windup'; r.g.modeT = 1; r.g.dir = 'down';
    if (screen) r.s.shield = { x: r.g.x, y: r.g.y - 7 + 12, angle: -Math.PI / 2, half: 15, age: 0, life: 300 };
    const before = r.hero.hp;
    run(r.sim, 2);
    return before - r.hero.hp;
  };
  const open = dmg(false), screened = dmg(true);
  assert.ok(open >= 12, `open bash ${open}`);
  assert.ok(Math.abs(screened - open / 2) <= 2, `screened ${screened}`);
});

test('the candy lure pulls a guard off the hero, shield still up, facing where it walks', () => {
  const r = rig({ party: [{ id: 'dustin', level: 3 }], start: { x: tc(12), y: tf(8) + 40 } });
  r.g.aware = true; r.g.mode = 'chase';
  r.s.lure = { x: tc(12) + 50, y: r.g.y, age: 0, life: 180, pull: 64 };
  run(r.sim, 10);
  assert.equal(r.g.mode, 'lured');
  assert.equal(r.g.dir, 'right');
  assert.equal(r.sim.view().actors.find((a) => a.kind === 'enemy')?.guarding, true);
  run(r.sim, 80);
  assert.ok(Math.abs(r.g.x - (tc(12) + 50)) < 10, 'it walked to the candy');
});

test('swapping in lands the shockwave, which stuns and breaks a guard beside the hero', () => {
  const r = rig({ party: [{ id: 'mike', level: 3 }, { id: 'eleven', level: 3 }], start: { x: tc(12), y: tf(8) + 24 } });
  r.g.cd = 9999;
  run(r.sim, 2);
  r.s.swapCd = 0;
  press(r.sim, { swapTo: 1 }, 14);
  assert.equal(r.g.broken > 0 || r.g.stat.stun > 0, true, 'the shockwave got through');
  assert.ok(r.g.hp < r.g.hpMax);
});

test('the party burst ignores the shield', () => {
  const r = rig({ start: { x: tc(12), y: tf(8) + 24 } });
  r.g.cd = 9999;
  const before = r.g.hp;
  r.s.burst = 1;
  press(r.sim, { burstPressed: true }, 200);
  const dealt = before - r.g.hp;
  assert.ok(dealt >= damageRange(3, r.hero.st.atk, 8).min, `the burst did ${dealt}`);
});
