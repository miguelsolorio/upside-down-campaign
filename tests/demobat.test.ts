// The demobat (docs/level-12.md, "The demobat"): a flyer that ignores walls and the nav grid, circles the active hero in a flock, sends one bat
// down at a time with a 20 frame "!", is reached by a swing or a blast only while it is low, by a shot, a beam and a pulse at any height, is
// stunned by Eddie's solo, and dies in sparks. The bot's dive dodge and its lead of a flock are at the bottom. The roof is in tests/rooftop.test.ts.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { Sim, SimEvent, SimSpawn } from '../src/core/types.ts';
import { ENEMY_DEFS } from '../src/enemies/index.ts';
import { sendDive } from '../src/enemies/demobat.ts';
import { createBot } from '../src/combat/bot.ts';
import { batFoe, createBatSense } from '../src/combat/bot_demobat.ts';
import { hitEnemy } from '../src/combat/damage.ts';
import { footBlocked } from '../src/combat/space.ts';
import { endStand } from '../src/heroes/eddie_solo.ts';
import type { Enemy, Hero, S } from '../src/combat/state.ts';
import { arena, idle, inp, makeWhite, ofType, press, run, sfxIds, tc, tf } from './sim-helpers.ts';

const DEF = ENEMY_DEFS.demobat;
const X = DEF.x;
const hero = (s: S, i = 0): Hero => s.heroes[i] as Hero;
const batOf = (s: S, id: string): Enemy => s.enemies.find((e) => e.id === id) as Enemy;
const steady = (s: S): void => { s.rng = () => 0.5; };
const hurt = (ev: SimEvent[]) => ofType(ev, 'hit').filter((h) => !h.onEnemy);
const bats = (sim: Sim) => sim.view().actors.filter((a) => a.kind === 'enemy' && a.id === 'demobat');
const dist = (ax: number, ay: number, bx: number, by: number): number => Math.hypot(bx - ax, by - ay);

const bat = (id: string, tx: number, ty: number, group = 'sky', extra: Partial<Extract<SimSpawn, { kind: 'enemy' }>> = {}): SimSpawn =>
  ({ kind: 'enemy', id, type: 'demobat', tx, ty, group, ...extra });

/** Mike (Lv 6) at tile (12, 8) of a 26 by 16 hall, the bats as given. Fixed rolls. */
function rig(spawns: SimSpawn[], over: Parameters<typeof makeWhite>[0] = {}) {
  const r = makeWhite({ party: [{ id: 'mike', level: 6 }], start: { x: tc(12), y: tf(8) }, spawns, grid: arena(26, 16), ...over });
  steady(r.s);
  return r;
}
/** A bat held in its wind-up where it is, so it hovers at height and does not move: the target for the hit tests. */
function pin(e: Enemy): void {
  e.aware = true; e.mode = 'windup';
  e.bat!.move = 'wind'; e.bat!.t = 99999;
}
/** Five bats a short way off, all awake at once. */
const flock = (group = 'sky', tx = 17): SimSpawn[] => [0, 1, 2, 3, 4].map((i) => bat(`${group}${i}`, tx + (i % 2), 5 + i, group));

test('numbers: 40 HP, 30 ATK, 2 DEF, walk 1.4, 6 XP, and a flock circles at 56 px, 10 to 14 px up', () => {
  assert.deepEqual([DEF.hp, DEF.atk, DEF.def, DEF.speed, DEF.xp], [40, 30, 2, 1.4, 6]);
  assert.deepEqual([X.orbit, X.diveEvery, X.diveWindup, X.diveT, X.diveSpeed, X.climb, X.low, X.stunT, X.roofPower], [56, 150, 20, 12, 4, 30, 6, 40, 0.6]);
  const r = rig(flock());
  r.sim.dev.god = true;
  run(r.sim, 150);
  for (const e of r.s.enemies) {
    const h = hero(r.s);
    assert.ok(Math.abs(dist(e.x, e.y, h.x, h.y) - 56) < 6, `${e.id} is ${dist(e.x, e.y, h.x, h.y).toFixed(1)} px out`);
    assert.ok(e.z >= 9.9 && e.z <= 14.1, `${e.id} is ${e.z.toFixed(1)} px up`);
  }
  assert.equal(bats(r.sim).length, 5);
});

test('the flock takes equal slots on the ring and keeps turning round the hero', () => {
  const r = rig(flock());
  r.sim.dev.god = true;
  run(r.sim, 220);
  const h = hero(r.s);
  const angles = r.s.enemies.map((e) => Math.atan2(e.y - h.y, e.x - h.x)).sort((a, b) => a - b);
  for (let i = 0; i < 5; i++) {
    const gap = ((angles[(i + 1) % 5] as number) - (angles[i] as number) + Math.PI * 2) % (Math.PI * 2);
    assert.ok(Math.abs(gap - (Math.PI * 2) / 5) < 0.35, `gap ${i} is ${((gap * 180) / Math.PI).toFixed(0)} degrees`);
  }
  const first = Math.atan2(r.s.enemies[0]!.y - h.y, r.s.enemies[0]!.x - h.x);
  run(r.sim, 30);
  const later = Math.atan2(r.s.enemies[0]!.y - h.y, r.s.enemies[0]!.x - h.x);
  assert.ok(Math.abs(later - first) > 0.3, 'it keeps going round');
});

test('it ignores solid tiles: a hero sealed in a block of wall is still circled, over the wall', () => {
  // A 9 by 9 block of trees with one open tile in the middle, where the hero stands. The ring at 56 px is all inside the block.
  const marks: Record<string, string> = {};
  for (let x = 10; x <= 18; x++) for (let y = 6; y <= 14; y++) marks[`${x},${y}`] = 'T';
  delete marks['14,10'];
  const r = makeWhite({
    party: [{ id: 'mike', level: 6 }], start: { x: tc(14), y: tf(10) }, grid: arena(30, 20, marks), spawns: [bat('b1', 23, 10)], god: true,
  });
  run(r.sim, 200);
  const e = batOf(r.s, 'b1');
  let over = 0, ringed = 0;
  for (let f = 0; f < 240; f++) {
    run(r.sim, 1);
    // A lone bat dives every 150 frames; the dive and the climb leave the ring.
    if (e.bat!.move !== 'orbit') continue;
    ringed++;
    const d = dist(e.x, e.y, hero(r.s).x, hero(r.s).y);
    assert.ok(Math.abs(d - 56) < 6, `${d.toFixed(1)} px out`);
    if (footBlocked(r.s, e.x, e.y)) over++;
  }
  assert.ok(ringed > 120 && over === ringed, `it was over the wall on ${over} of ${ringed} frames on the ring`);
  assert.equal(r.sim.view().hud.party[0]?.hp, hero(r.s).st.hp, 'and hurt nobody');
});

test('a bat that has not noticed anyone hovers over its spot until the hero is within 160 px, then comes', () => {
  const r = rig([bat('b1', 23, 8)]);
  const e = batOf(r.s, 'b1');
  const home = { x: e.x, y: e.y };
  run(r.sim, 120);
  assert.ok(dist(e.x, e.y, home.x, home.y) < 1, '176 px away: it stays');
  assert.equal(r.sim.aggro(), false);
  assert.ok(e.z > 9.9 && e.z < 14.1, 'hovering');
  r.sim.dev.teleport(tc(12) + 30, tf(8));
  run(r.sim, 2);
  assert.equal(e.aware, true, '146 px away: it has noticed');
  run(r.sim, 50);
  assert.ok(dist(e.x, e.y, hero(r.s).x, hero(r.s).y) < 100, 'and has come in from 146 px');
  assert.equal(r.sim.aggro(), true);
});

test('a dormant flock sleeps unseen until its group is woken, then circles at once', () => {
  const r = rig([bat('b1', 15, 6, 'sky', { dormant: true }), bat('b2', 15, 9, 'sky', { dormant: true })]);
  run(r.sim, 60);
  assert.equal(bats(r.sim).length, 0, 'not in the view');
  assert.equal(r.sim.enemiesAlive('sky'), 2);
  r.sim.spawnGroup('sky');
  run(r.sim, 70);
  assert.equal(bats(r.sim).length, 2);
  for (const e of r.s.enemies) assert.ok(Math.abs(dist(e.x, e.y, hero(r.s).x, hero(r.s).y) - 56) < 6, 'on the ring');
});

// ------------------------------------------------------------------ the dive

test('one bat of a flock dives at a time, about every 150 frames, and every bat takes its turn', () => {
  const r = rig(flock());
  r.sim.dev.god = true;
  const starts: { at: number; id: string }[] = [];
  const winding = new Set<string>();
  let most = 0;
  for (let f = 0; f < 1500; f++) {
    run(r.sim, 1);
    const busy = r.s.enemies.filter((e) => e.bat!.move === 'wind' || e.bat!.move === 'dive');
    most = Math.max(most, busy.length);
    for (const e of busy) if (e.bat!.move === 'wind' && !winding.has(e.id + e.bat!.last)) { winding.add(e.id + e.bat!.last); starts.push({ at: r.s.frame, id: e.id }); }
  }
  assert.equal(most, 1, 'never two at once');
  assert.ok(starts.length >= 8, `${starts.length} dives in 1500 frames`);
  for (let i = 1; i < starts.length; i++) {
    const gap = (starts[i] as { at: number }).at - (starts[i - 1] as { at: number }).at;
    assert.ok(gap >= X.diveEvery - 1 && gap <= X.diveEvery + 3, `dive ${i} came ${gap} frames after the last`);
  }
  assert.equal(new Set(starts.slice(0, 5).map((s) => s.id)).size, 5, 'the first five dives are five different bats');
});

test('two flocks, two groups: each sends one bat at a time, and they do not wait on each other', () => {
  const r = rig([...flock('a', 17), ...flock('b', 6)]);
  r.sim.dev.god = true;
  let both = 0;
  for (let f = 0; f < 900; f++) {
    run(r.sim, 1);
    const busy = (g: string): number => r.s.enemies.filter((e) => e.group === g && (e.bat!.move === 'wind' || e.bat!.move === 'dive')).length;
    assert.ok(busy('a') <= 1 && busy('b') <= 1);
    if (busy('a') === 1 && busy('b') === 1) both++;
  }
  assert.ok(both > 20, `both flocks had a bat down on ${both} frames`);
});

test('the dive: a 20 frame "!" and crouch, 12 frames at 4 px along the locked line, power 0.8, then 30 frames climbing back', () => {
  const r = rig([bat('b1', 16, 8)]);
  const e = batOf(r.s, 'b1');
  const h = hero(r.s);
  const poses: (string | undefined)[] = [];
  const alerts: boolean[] = [];
  const dmg: number[] = [];
  const track: { x: number; y: number; z: number }[] = [];
  const moves: string[] = [];
  let sawScreech = false;
  for (let f = 0; f < 400 && !(moves.includes('climb') && e.bat!.move === 'orbit'); f++) {
    // The touch freezes the field for a few frames of hit-stop, which are not the bat's.
    const frozen = r.s.hitstop > 0;
    const ev = r.sim.step(idle());
    for (const x of hurt(ev)) dmg.push(x.dmg);
    if (sfxIds(ev).includes('screech')) sawScreech = true;
    if (frozen) continue;
    const v = bats(r.sim)[0];
    if (e.bat!.move === 'wind' || e.bat!.move === 'dive' || (moves.length > 0 && e.bat!.move === 'climb')) {
      moves.push(e.bat!.move); poses.push(v?.pose); alerts.push(v?.alert === true); track.push({ x: e.x, y: e.y, z: e.z });
    }
  }
  const n = (m: string): number => moves.filter((x) => x === m).length;
  assert.equal(n('wind'), X.diveWindup, 'a 20 frame wind-up');
  assert.equal(n('dive'), X.diveT, 'a dive of 12 frames');
  assert.equal(n('climb'), X.climb, 'and 30 to climb');
  assert.equal(poses.filter((p) => p === 'crouch').length, 20, 'pose crouch under the wind-up');
  assert.equal(poses.filter((p) => p === 'charge').length, 12, 'pose charge in the dive');
  assert.equal(alerts.filter(Boolean).length, 20, 'the "!" shows for the wind-up');
  assert.ok(sawScreech, 'and the screech');
  const d0 = moves.indexOf('dive');
  const sx = track[d0 + 1]!.x - track[d0]!.x, sy = track[d0 + 1]!.y - track[d0]!.y;
  for (let i = d0; i < d0 + 11; i++) {
    const t = track[i] as { x: number; y: number }, u = track[i + 1] as { x: number; y: number };
    assert.ok(Math.abs(dist(t.x, t.y, u.x, u.y) - 4) < 0.01, '4 px a frame');
    assert.ok(Math.abs(u.x - t.x - sx) < 0.01 && Math.abs(u.y - t.y - sy) < 0.01, 'along one line');
  }
  assert.ok((track[d0] as { z: number }).z > 9.9, 'it starts the dive up high');
  assert.ok(Math.abs((track[moves.indexOf('climb')] as { z: number }).z - 2) < 0.01, 'and z has fallen to 2 at the bottom');
  assert.equal(dmg.length, 1, 'the touch hurts once');
  assert.equal(dmg[0], Math.max(1, Math.round(0.8 * 30 - h.st.def * 0.5)), 'power 0.8 of 30');
  const climb0 = moves.indexOf('climb');
  assert.ok((track[climb0 + 29] as { z: number }).z > 9.5, 'back up at the end of the climb');
  assert.ok(dist(e.x, e.y, h.x, h.y) < 70, 'and back on its ring');
});

test('the dive line is locked when the "!" begins: a hero who steps aside is not touched', () => {
  const r = rig([bat('b1', 16, 8)]);
  const e = batOf(r.s, 'b1');
  while (e.bat!.move !== 'wind') run(r.sim, 1);
  r.sim.dev.teleport(hero(r.s).x, hero(r.s).y + 40);
  const dmg = run(r.sim, 80).flatMap((ev) => (ev.t === 'hit' && !ev.onEnemy ? [ev.dmg] : []));
  assert.deepEqual(dmg, []);
  assert.equal(e.bat!.move === 'orbit' || e.bat!.move === 'climb' || e.bat!.move === 'wind', true);
});

test('a hit that staggers the bat breaks the wind-up, and the dive never comes', () => {
  const r = rig([bat('b1', 16, 8)]);
  const e = batOf(r.s, 'b1');
  while (e.bat!.move !== 'wind') run(r.sim, 1);
  hitEnemy(r.s, hero(r.s), e, { power: 1, air: true });
  assert.notEqual(e.mode, 'windup', 'the "!" is gone');
  const seen = new Set<string>();
  for (let f = 0; f < 60; f++) { run(r.sim, 1); seen.add(e.bat!.move); }
  assert.equal(seen.has('dive'), false);
  assert.equal(r.sim.view().hud.party[0]?.hp, hero(r.s).st.hp);
});

// ------------------------------------------------------------------ what reaches it

test('a swing and a blast reach a circling bat only while it is low, z under 6', () => {
  const r = rig([bat('b1', 15, 8)]);
  const e = batOf(r.s, 'b1');
  pin(e);
  e.z = 12;
  assert.equal(hitEnemy(r.s, hero(r.s), e, { power: 5 }), 0, 'high: a swing finds nothing');
  assert.equal(hitEnemy(r.s, hero(r.s), e, { power: 5, kb: 3 }), 0, 'and a blast neither');
  assert.equal(e.hp, e.hpMax);
  e.z = 6;
  assert.equal(hitEnemy(r.s, hero(r.s), e, { power: 5 }), 0, 'z 6 is still too high');
  e.z = 5.9;
  assert.ok(hitEnemy(r.s, hero(r.s), e, { power: 5 }) > 0, 'z 5.9 is low');
  assert.ok(e.hp < e.hpMax);
});

test('a real swing from Mike misses a bat overhead and lands on one that is low', () => {
  const r = rig([bat('b1', 13, 8)]);
  const e = batOf(r.s, 'b1');
  e.x = hero(r.s).x + 20; e.y = hero(r.s).y;
  pin(e);
  e.z = 12;
  press(r.sim, { attackPressed: true, mx: 0.2 }, 20);
  assert.equal(e.hp, e.hpMax, 'high, the bat is untouched');
  run(r.sim, 20);
  for (let f = 0; f < 24; f++) { e.z = 3; r.sim.step(f === 0 ? inp({ attackPressed: true, mx: 0.2 }) : idle()); }
  assert.ok(e.hp < e.hpMax, 'low, the swing lands');
});

test('a shot, a beam, the burst and a stun reach it at any height', () => {
  const r = rig([bat('b1', 18, 8)], { party: [{ id: 'lucas', level: 6 }] });
  const e = batOf(r.s, 'b1');
  e.x = hero(r.s).x + 60; e.y = hero(r.s).y;
  pin(e);
  e.z = 12;
  const hp0 = e.hp;
  press(r.sim, { attackPressed: true, mx: 0.2 }, 30);
  assert.ok(e.hp < hp0, 'Lucas\'s rocket hits a bat 12 px up');
  const f = rig([bat('b1', 15, 8)]);
  const g = batOf(f.s, 'b1');
  pin(g);
  g.z = 12;
  assert.ok(hitEnemy(f.s, hero(f.s), g, { power: 1, beam: true }) > 0, 'a beam');
  assert.ok(hitEnemy(f.s, hero(f.s), g, { power: 1, air: true }) > 0, 'a pulse or a burst');
  const h = rig([bat('b1', 15, 8)]);
  const k = batOf(h.s, 'b1');
  pin(k);
  k.z = 12;
  k.stat.stun = 20;
  assert.ok(hitEnemy(h.s, hero(h.s), k, { power: 1 }) > 0, 'a stunned bat can be hit by anyone');
});

test('Eddie\'s solo pulse hits and stuns it for 40 frames: it falls to z 2, pose stun, anyone can hit it, then it climbs back', () => {
  const r = rig([bat('b1', 15, 8), bat('b2', 20, 8)], { party: [{ id: 'eddie', level: 6 }, { id: 'mike', level: 6 }] });
  const e = batOf(r.s, 'b1'), far = batOf(r.s, 'b2');
  e.x = hero(r.s).x + 36; e.y = hero(r.s).y;
  far.x = hero(r.s).x + 90; far.y = hero(r.s).y;
  pin(e); pin(far);
  e.z = 12;
  press(r.sim, { specialPressed: true }, 29);
  assert.equal(e.stat.stun, 0, 'no pulse yet');
  run(r.sim, 2);
  assert.ok(e.stat.stun > 36 && e.stat.stun <= 40, `stunned for ${e.stat.stun} frames`);
  assert.ok(e.hp < e.hpMax, 'and hit: the pulse reaches it at any height');
  assert.equal(far.hp, far.hpMax, 'a bat outside the ring is untouched');
  assert.equal(far.stat.stun, 0);
  run(r.sim, 10);
  assert.ok(e.z < 2.01, `it has fallen to z ${e.z.toFixed(1)}`);
  assert.equal(bats(r.sim).find((a) => a.x === e.x)?.pose, 'stun');
  assert.ok(hitEnemy(r.s, hero(r.s, 1), e, { power: 1 }) > 0, 'Mike can hit it');
  endStand(r.s, hero(r.s));
  run(r.sim, 40);
  assert.equal(e.stat.stun, 0);
  assert.notEqual(e.bat!.move, 'dive', 'the stun cancelled its wind-up');
  run(r.sim, 30);
  assert.ok(e.z > 9, `it is back up at z ${e.z.toFixed(1)}`);
});

test('it dies in sparks: a kill worth 6 XP, the ko anim, five more sparks than a plain hit, and the group clears', () => {
  const r = rig([bat('b1', 16, 8)]);
  const e = batOf(r.s, 'b1');
  e.hp = 1;
  hitEnemy(r.s, hero(r.s), e, { power: 5, air: true });
  const before = r.sim.view().fx.filter((f) => f.kind === 'spark').length;
  // The hit's hit-stop holds the field for a few frames before the kill is noticed.
  const ev = run(r.sim, 6);
  assert.deepEqual(ofType(ev, 'kill').map((k) => [k.kind, k.spawnId, k.group, k.xp]), [['demobat', 'b1', 'sky', 6]]);
  assert.deepEqual(ofType(ev, 'groupCleared').map((g) => g.group), ['sky']);
  assert.equal(r.sim.view().fx.filter((f) => f.kind === 'spark').length - before, 5);
  assert.equal(bats(r.sim)[0]?.anim, 'ko');
});

test('two bats on one ring stay opposite each other: nothing pushes them apart or off it', () => {
  const r = rig([bat('b1', 15, 8), bat('b2', 15, 8)]);
  run(r.sim, 200);
  const [a, b] = r.s.enemies as [Enemy, Enemy];
  const h = hero(r.s);
  assert.ok(dist(a.x, a.y, b.x, b.y) > 60, 'two bats on one ring are opposite each other');
  for (const e of [a, b]) assert.ok(Math.abs(dist(e.x, e.y, h.x, h.y) - 56) < 6);
});

test('a hit knocks it through a wall, as it flies through them', () => {
  const marks: Record<string, string> = {};
  for (let y = 1; y < 15; y++) marks[`14,${y}`] = 'T';
  const r = rig([bat('b1', 13, 8)], { grid: arena(26, 16, marks) });
  const e = batOf(r.s, 'b1');
  e.x = 14 * 16 - 3; e.y = tf(8);
  e.aware = true; e.bat!.move = 'wind'; e.bat!.t = 99999; e.mode = 'windup';
  hitEnemy(r.s, hero(r.s), e, { power: 1, air: true, kb: 14, angle: 0 });
  let over = false;
  for (let f = 0; f < 30; f++) { run(r.sim, 1); if (footBlocked(r.s, e.x, e.y)) over = true; }
  assert.ok(e.x > 14 * 16 + 4 || over, `it ended at x ${e.x.toFixed(1)}`);
  assert.ok(e.x > 14 * 16 - 3 + 4, 'it moved right on');
});

// ------------------------------------------------------------------ the bot

/** A bat sent down at Mike from 40 px, who stands still or steers as the bot's dodge says. Returns the HP he lost. */
function diveRun(dodge: boolean): number {
  const r = rig([bat('b1', 15, 8)]);
  const e = batOf(r.s, 'b1');
  r.sim.dev.teleport(tc(12), tf(8));
  e.aware = true;
  e.x = hero(r.s).x + 40; e.y = hero(r.s).y; e.z = 12;
  sendDive(r.s, e, hero(r.s));
  const sense = createBatSense();
  const open = (): boolean => true;
  const hp0 = hero(r.s).hp;
  for (let f = 0; f < 80; f++) {
    const step = dodge ? sense.dodge(r.sim.view(), hero(r.s).x, hero(r.s).y, open) : null;
    r.sim.step(step ? inp({ mx: step[0], my: step[1] }) : idle());
  }
  return hp0 - hero(r.s).hp;
}

test('bot: steps off a dive line during the wind-up, and a hero who stands still is hit', () => {
  assert.ok(diveRun(false) > 0, 'standing still costs HP');
  assert.equal(diveRun(true), 0, 'the dodge costs none');
});

test('bot: a bat out of a swing\'s reach is no target for a swing, but always one for a shot', () => {
  const r = rig([bat('b1', 15, 8)]);
  const v = (z: number) => ({ ...r.sim.view().actors.find((a) => a.id === 'demobat')!, z });
  assert.equal(batFoe(v(12), 30, false, 34), false, 'high');
  assert.equal(batFoe(v(3), 30, false, 34), true, 'low and close');
  assert.equal(batFoe(v(3), 80, false, 34), false, 'low but far');
  assert.equal(batFoe(v(12), 80, true, 140), true, 'a shot reaches it at any height');
  assert.equal(batFoe({ ...v(12), id: 'ghoul' }, 80, false, 34), true, 'and nothing else is touched');
});

test('bot: a shooter leads against a flock, and the hero he relieved takes the lead back when it is gone', () => {
  const grid = arena(26, 16);
  const { sim, s } = makeWhite({
    grid, party: [{ id: 'mike', level: 7 }, { id: 'lucas', level: 7 }], start: { x: tc(6), y: tf(8) }, seed: 3,
    spawns: [bat('b1', 11, 6), bat('b2', 11, 9), bat('b3', 12, 7)],
  });
  const bot = createBot({ grid, waypoints: [{ x: tc(6), y: tf(8) }] });
  let leader = 'mike';
  let down = false;
  const leads: string[] = ['mike'];
  for (let f = 0; f < 3000 && !down && !(sim.enemiesAlive() === 0 && leads.length > 1 && f > 600); f++) {
    if (sim.step(bot.next(sim)).some((e) => e.t === 'allDown')) down = true;
    const now = sim.view().hud.party.find((p) => p.active)?.id ?? '';
    if (now !== leader) { leader = now; leads.push(now); }
  }
  assert.equal(down, false);
  assert.equal(sim.enemiesAlive(), 0, 'the flock is dead');
  assert.deepEqual(leads.slice(0, 2), ['mike', 'lucas'], 'Lucas took the lead once the bats were in sight');
  run(sim, 120);
  const after = sim.view().hud.party.find((p) => p.active)?.id;
  void s;
  assert.ok(leads.includes('lucas'));
  assert.ok(after === 'mike' || leads.at(-1) === 'mike', 'and Mike has it back');
});

test('bot: clears a flock on the way, careless or not, with a shooter in the party', () => {
  for (const careless of [false, true]) {
    const grid = arena(30, 16);
    const { sim } = makeWhite({
      grid, party: [{ id: 'mike', level: 7 }, { id: 'dustin', level: 6 }, { id: 'lucas', level: 6 }], start: { x: tc(4), y: tf(8) }, seed: 4,
      spawns: [bat('b1', 12, 5), bat('b2', 13, 8), bat('b3', 12, 11), bat('b4', 14, 7)],
    });
    const bot = createBot({ grid, waypoints: [{ x: tc(10), y: tf(8) }, { x: tc(26), y: tf(8) }], careless });
    let down = false;
    for (let f = 0; f < 4000 && !down && !(sim.enemiesAlive() === 0 && bot.done()); f++) {
      if (sim.step(bot.next(sim)).some((e) => e.t === 'allDown')) down = true;
    }
    assert.equal(down, false, `careless ${careless}`);
    assert.equal(sim.enemiesAlive(), 0, `careless ${careless}: the flock is dead`);
    assert.equal(bot.done(), true, `careless ${careless}: and the route is walked`);
  }
});

test('bot: a party with no shooter walks on past a flock and is not held up chasing it round', () => {
  const grid = arena(34, 16);
  const { sim } = makeWhite({
    grid, party: [{ id: 'mike', level: 8 }, { id: 'dustin', level: 8 }], start: { x: tc(4), y: tf(8) }, seed: 5,
    spawns: [bat('b1', 9, 6), bat('b2', 10, 9)],
  });
  const bot = createBot({ grid, waypoints: [{ x: tc(30), y: tf(8) }] });
  let down = false;
  let f = 0;
  for (; f < 4000 && !down && !bot.done(); f++) {
    if (sim.step(bot.next(sim)).some((e) => e.t === 'allDown')) down = true;
  }
  assert.equal(down, false);
  assert.equal(bot.done(), true, 'it got to the end');
  assert.ok(f < 1500, `in ${f} frames`);
});
