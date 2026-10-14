// The Demogorgon's floor, its pin and the finisher: HP holds at 1 until three wall stuns, the hit after that pins it, a
// pinned boss only takes Eleven's Mind Blast beam, and everything else is reported as a try.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { hitEnemy } from '../src/combat/damage.ts';
import type { SimEvent, SimInput } from '../src/core/types.ts';
import type { Hero } from '../src/combat/state.ts';
import { inp, ofType, press, run } from './sim-helpers.ts';
import type { BossRig } from './demo-helpers.ts';
import { DEMO, bossRig, bossView, only, stunOnce } from './demo-helpers.ts';

const hammer = (r: BossRig): number => hitEnemy(r.s, r.hero, r.boss, { power: 30, noCrit: true });
const pinnedCount = (ev: SimEvent[]): number => ofType(ev, 'pinned').length;

/** A boss that has had its three stuns and is down to its last HP, pinned by one more hit. */
function pinnedRig(over: Parameters<typeof bossRig>[0] = {}): { r: BossRig; ev: SimEvent[] } {
  const r = bossRig(over);
  only(r, null);
  r.d.stuns = 3;
  r.boss.hp = 40;
  hammer(r);
  return { r, ev: run(r.sim, 2) };
}

/** Swaps to a party slot far from the boss and walks him up beside it, so the swap's shockwave is not what touches it. */
function stepUp(r: BossRig, slot: number): void {
  r.sim.step(inp({ swapTo: slot }));
  run(r.sim, 24);
  r.sim.dev.teleport(r.boss.x - 22, r.boss.y);
  run(r.sim, 2);
}

test('floor: its HP stays at 1 through any hit before the third wall stun, and it does not die or pin', () => {
  for (const stuns of [0, 1, 2]) {
    const r = bossRig();
    only(r, null);
    r.d.stuns = stuns;
    r.boss.hp = 10;
    hammer(r);
    const ev = run(r.sim, 20);
    assert.equal(r.boss.hp, 1, `after ${stuns} stuns`);
    assert.equal(r.boss.dead, false);
    assert.equal(ofType(ev, 'kill').length, 0);
    assert.equal(pinnedCount(ev), 0);
    assert.notEqual(bossView(r)?.pose, 'pinned');
    assert.ok(r.sim.view().hud.boss, 'and its bar is still up');
    // The hit that landed on the floor still dealt its damage as a number, and the next one does the same.
    assert.ok(hammer(r) > 0);
    assert.equal(r.boss.hp, 1);
  }
});

test('floor: only a wall counts. Three real charges into the wall, and the next hit that would finish it pins it', () => {
  const r = bossRig();
  r.sim.dev.god = true;
  r.boss.hp = 60;
  const seen: SimEvent[] = [];
  for (let n = 1; n <= 3; n++) {
    stunOnce(r);
    assert.equal(r.d.stuns, n);
    if (n === 3) {
      // Three stuns, and still not pinned: it takes a hit that would finish it.
      assert.equal(r.d.move, 'walk');
      assert.equal(bossView(r)?.pose, undefined);
      assert.equal(pinnedCount(seen), 0);
    }
    hammer(r);
    seen.push(...run(r.sim, 5));
    assert.equal(r.boss.hp, 1, `HP floor after stun ${n}`);
    assert.equal(pinnedCount(seen), n === 3 ? 1 : 0, `after stun ${n}`);
  }
  assert.equal(bossView(r)?.pose, 'pinned');
});

test('pin: the event comes once, with its spawn id, and the boss stays at 1 HP in the pinned pose', () => {
  const { r, ev } = pinnedRig();
  const pins = ofType(ev, 'pinned');
  assert.deepEqual(pins, [{ t: 'pinned', spawnId: 'demo' }]);
  assert.equal(r.boss.hp, 1);
  assert.equal(bossView(r)?.pose, 'pinned');
  assert.equal(bossView(r)?.alert, false);
  assert.equal(r.boss.dead, false);
  let more = 0;
  for (let i = 0; i < 12; i++) { hammer(r); more += pinnedCount(run(r.sim, 6)); }
  assert.equal(more, 0, 'never again');
});

test('pin: it makes no more attacks, whatever stands next to it', () => {
  const { r } = pinnedRig({ start: { x: 216 - 20, y: 108 } });
  r.sim.dev.teleport(r.boss.x - 20, r.boss.y);
  const x0 = r.boss.x, y0 = r.boss.y, hp0 = r.hero.hp;
  for (let i = 0; i < 600; i++) {
    run(r.sim, 1);
    assert.equal(bossView(r)?.alert, false);
  }
  assert.equal(r.hero.hp, hp0);
  assert.deepEqual([r.boss.x, r.boss.y], [x0, y0]);
  assert.equal(bossView(r)?.pose, 'pinned');
  assert.equal(r.sim.aggro(), false, 'and the music can calm down');
});

test('pinned: Mike, Dustin, Lucas and Eleven\'s own Push do nothing to it, and each is reported as a try on "demo"', () => {
  const tries: [string, number, Partial<SimInput>][] = [
    ['mike', 0, { mx: 0.2, attackPressed: true }],
    ['dustin', 1, { mx: 0.2, specialPressed: true }],
    ['lucas', 2, { mx: 0.2, attackPressed: true }],
    ['eleven', 3, { mx: 0.2, attackPressed: true }],
  ];
  for (const [hero, slot, input] of tries) {
    const { r } = pinnedRig();
    if (slot > 0) stepUp(r, slot); else r.sim.dev.teleport(r.boss.x - 22, r.boss.y);
    run(r.sim, 6);
    const ev = press(r.sim, input, 40);
    const pokes = ofType(ev, 'poked').filter((p) => p.propId === 'demo');
    assert.deepEqual(pokes.map((p) => p.hero), [hero], `${hero}`);
    assert.equal(r.boss.hp, 1, `${hero} dealt nothing`);
    assert.equal(ofType(ev, 'hit').filter((h) => h.onEnemy).length, 0, `${hero}: no hit on the boss`);
    assert.equal(ofType(ev, 'kill').length, 0);
  }
});

test('pinned: it reports the same try only every three quarters of a second', () => {
  const { r } = pinnedRig();
  r.sim.dev.teleport(r.boss.x - 22, r.boss.y);
  run(r.sim, 4);
  const swing = { mx: 0.2, attackPressed: true };
  let n = ofType(press(r.sim, swing, 20), 'poked').length;
  n += ofType(press(r.sim, swing, 20), 'poked').length;
  assert.equal(n, 1, 'two swings 20 frames apart are one try');
  run(r.sim, 50);
  assert.equal(ofType(press(r.sim, swing, 10), 'poked').length, 1, 'a later swing is another');
});

test('pinned: fire does not hurt it, and neither does being burning when it was pinned', () => {
  const { r } = pinnedRig();
  r.boss.stat.burn = 200; r.boss.stat.burnDmg = 9; r.boss.stat.burnTick = 1;
  const ev = run(r.sim, 240);
  assert.equal(r.boss.hp, 1);
  assert.equal(ofType(ev, 'kill').length, 0);
});

test('finisher: Eleven\'s Mind Blast kills a pinned boss with a normal kill and groupCleared', () => {
  const { r } = pinnedRig({ party: [{ id: 'eleven', level: 4 }, { id: 'mike', level: 5 }] });
  r.sim.dev.teleport(r.boss.x - 26, r.boss.y);
  run(r.sim, 4);
  const hero = r.s.heroes[r.s.active] as Hero;
  assert.equal(hero.id, 'eleven');
  const mp0 = hero.mp;
  const ev = press(r.sim, { mx: 0.2, specialPressed: true }, 40);
  assert.ok(hero.mp < mp0, 'it cost her MP');
  const kills = ofType(ev, 'kill');
  assert.equal(kills.length, 1);
  assert.deepEqual(
    { kind: kills[0]?.kind, spawnId: kills[0]?.spawnId, group: kills[0]?.group, by: kills[0]?.by, xp: kills[0]?.xp },
    { kind: 'demogorgon', spawnId: 'demo', group: 'boss', by: 'eleven', xp: DEMO.xp },
  );
  assert.deepEqual(ofType(ev, 'groupCleared'), [{ t: 'groupCleared', group: 'boss' }]);
  assert.equal(ofType(ev, 'poked').length, 0, 'the beam is not a try');
  assert.equal(pinnedCount(ev), 0);
  assert.equal(r.sim.enemiesAlive('boss'), 0);
  assert.equal(r.sim.view().hud.boss, null);
});

test('finisher: Eleven\'s beam on a boss that has had its stuns but is not pinned yet pins it. The next one kills', () => {
  const r = bossRig({ party: [{ id: 'eleven', level: 4 }, { id: 'mike', level: 5 }] });
  only(r, null);
  r.d.stuns = 3;
  r.boss.hp = 5;
  r.sim.dev.teleport(r.boss.x - 26, r.boss.y);
  run(r.sim, 4);
  const first = press(r.sim, { mx: 0.2, specialPressed: true }, 50);
  assert.equal(pinnedCount(first), 1);
  assert.equal(ofType(first, 'kill').length, 0, 'the blast that floors it does not also kill it');
  const second = press(r.sim, { mx: 0.2, specialPressed: true }, 50);
  assert.equal(ofType(second, 'kill').length, 1);
});

test('finisher: a hero knocked out can\'t be the one that fails the fight, so Eleven stands up with one blast of MP when it is pinned', () => {
  const r = bossRig();
  only(r, null);
  const eleven = r.s.heroes.find((h) => h.id === 'eleven') as Hero;
  eleven.ko = true; eleven.hp = 0; eleven.mp = 0;
  r.s.bodies.push({ id: 'eleven', x: 100, y: 100, dir: 'down', t: 0 });
  r.d.stuns = 3;
  r.boss.hp = 40;
  hammer(r);
  run(r.sim, 2);
  assert.equal(eleven.ko, false);
  assert.ok(eleven.hp > 0);
  assert.ok(eleven.mp >= 8);
  assert.equal(r.s.bodies.some((b) => b.id === 'eleven'), false);
});
