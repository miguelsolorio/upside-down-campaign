// Billy pinned at 0 HP, the reach and the freed Billy (docs/level-9.md, "Billy"): the hit that would finish him leaves him kneeling, every
// hit on him is a try, Eleven's reach climbs and falls, and a freed Billy is an npc on the floor. The fight is in tests/billy.test.ts.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { SimEvent, SimInput } from '../src/core/types.ts';
import { hitEnemy } from '../src/combat/damage.ts';
import type { Enemy, Hero } from '../src/combat/state.ts';
import { idle, inp, ofType, press, run, sfxIds } from './sim-helpers.ts';
import type { BRig } from './billy-helpers.ts';
import { BILLY, BX, PARTY, bRig, becomeEleven, bossView, hammer, knockOut, npcView, park, pinnedRig, slotOf, standAt, until } from './billy-helpers.ts';

const pins = (ev: SimEvent[]) => ofType(ev, 'pinned');
const pokes = (ev: SimEvent[]) => ofType(ev, 'poked').filter((p) => p.propId === 'billy');

test('pin: the hit that would take him to 0 HP leaves him kneeling, with the event once and his spawn id', () => {
  const { r, ev } = pinnedRig();
  assert.deepEqual(pins(ev), [{ t: 'pinned', spawnId: 'billy' }]);
  assert.equal(r.boss.dead, false);
  assert.equal(ofType(ev, 'kill').length, 0);
  assert.equal(bossView(r)?.pose, 'pinned');
  assert.equal(bossView(r)?.alert, false);
  assert.equal(bossView(r)?.k, undefined, 'and the reach is 0');
  let more = 0;
  for (let i = 0; i < 12; i++) { hammer(r); more += pins(run(r.sim, 6)).length; }
  assert.equal(more, 0, 'never again');
});

test('pin: his bar is empty (no boss bar, 0 over his head), and a hit on a Billy above 0 HP pins nothing', () => {
  const { r } = pinnedRig();
  assert.equal(r.sim.view().hud.boss, null);
  assert.deepEqual(bossView(r)?.bar, { hp: 0, hpMax: BILLY.hp });
  const up = bRig();
  park(up, up.boss.x, up.boss.y);
  up.boss.hp = 400;
  hitEnemy(up.s, up.hero, up.boss, { power: 1, noCrit: true });
  const ev = run(up.sim, 6);
  assert.equal(pins(ev).length, 0);
  assert.notEqual(bossView(up)?.pose, 'pinned');
});

test('pin: fire pins him too, and fire does nothing to him once he kneels', () => {
  const r = bRig();
  park(r, r.boss.x, r.boss.y);
  r.boss.hp = 3;
  r.boss.stat.burn = 90; r.boss.stat.burnTick = 1; r.boss.stat.burnDmg = 10;
  const ev = run(r.sim, 5);
  assert.equal(pins(ev).length, 1);
  assert.equal(r.boss.dead, false);
  const hp = r.boss.hp;
  r.boss.stat.burn = 90; r.boss.stat.burnTick = 1; r.boss.stat.burnDmg = 10;
  run(r.sim, 90);
  assert.equal(r.boss.hp, hp);
  assert.equal(r.boss.dead, false);
});

test('pin: he makes no more attacks, whatever stands next to him, and the music can calm down', () => {
  const { r } = pinnedRig({ god: false });
  standAt(r, 14);
  const x0 = r.boss.x, y0 = r.boss.y, hp0 = r.hero.hp;
  for (let i = 0; i < 600; i++) {
    run(r.sim, 1);
    assert.equal(bossView(r)?.alert, false);
  }
  assert.equal(r.hero.hp, hp0);
  assert.deepEqual([r.boss.x, r.boss.y], [x0, y0]);
  assert.equal(bossView(r)?.pose, 'pinned');
  assert.equal(r.sim.aggro(), false);
});

test('pin: he lets go of a hero he held', () => {
  const r = bRig({ god: false });
  r.b.grabCd = 0; r.b.chargeCd = 99999; r.boss.cd = 99999;
  standAt(r, 20);
  until(r, () => r.s.hold !== null);
  r.boss.hp = 20;
  hammer(r);
  run(r.sim, 6);
  assert.equal(r.s.hold, null);
  assert.equal(r.b.move, 'pinned');
});

test('pin: the Flayed he called keep fighting, and one of them can take a hero', () => {
  const { r } = pinnedRig({ god: false }, PARTY, true);
  const flayed = r.s.enemies.filter((e) => e.group === 'billys');
  assert.equal(flayed.length, BX.call);
  const f = flayed[0] as Enemy;
  r.sim.dev.teleport(f.x - 40, f.y);
  until(r, () => r.s.hold !== null, 600);
  assert.equal(r.s.hold?.by.kind, 'flayed');
  assert.equal(r.b.move, 'pinned');
});

// ------------------------------------------------------------------ tries

test('tries: Mike, Dustin, Robin and Eleven\'s own Push do nothing to him, and each is a poked on "billy" with the hero who tried', () => {
  const tries: [string, Partial<SimInput>][] = [
    ['mike', { mx: 0.2, attackPressed: true }],
    ['dustin', { mx: 0.2, specialPressed: true }],
    ['robin', { mx: 0.2, attackPressed: true }],
    ['eleven', { mx: 0.2, attackPressed: true }],
  ];
  for (const [hero, input] of tries) {
    const { r } = pinnedRig();
    if (hero !== 'mike') { r.sim.step(inp({ swapTo: slotOf(r, hero) })); run(r.sim, 24); }
    // Eleven stands a step back: her Push reaches 38 px, and 34 is outside the 32 of the reach, so the reach is not what is tested.
    standAt(r, hero === 'eleven' ? 34 : 20);
    run(r.sim, 6);
    const ev = press(r.sim, input, 40);
    assert.deepEqual(pokes(ev).map((p) => p.hero), [hero], `${hero}`);
    assert.equal(ofType(ev, 'hit').filter((h) => h.onEnemy).length, 0, `${hero}: no hit on him`);
    assert.equal(ofType(ev, 'kill').length, 0);
    assert.equal(r.boss.hp, 1, `${hero} dealt nothing`);
    assert.equal(r.b.move, 'pinned');
  }
});

test('tries: a try is reported once and again 45 frames later, and each one sounds `block`', () => {
  const { r } = pinnedRig();
  standAt(r, 20);
  const ev: SimEvent[] = [];
  const blocks: number[] = [];
  for (let i = 0; i < 200; i++) {
    const out = r.sim.step(i % 4 === 0 ? inp({ attackPressed: true, mx: 0.2 }) : idle());
    ev.push(...out);
    if (sfxIds(out).includes('block')) blocks.push(i);
  }
  const n = pokes(ev).length;
  assert.ok(n >= 3 && n <= 5, `${n} tries in 200 frames`);
  assert.ok(blocks.length > n, 'every hit clinks, not only the ones that report');
});

test('tries: a knocked-out Eleven stands back up when the party tries him, with her revive share of HP and the MP for a special', () => {
  const { r } = pinnedRig();
  knockOut(r, 'eleven');
  const el = r.s.heroes[slotOf(r, 'eleven')] as Hero;
  assert.equal(el.ko, true);
  standAt(r, 20);
  run(r.sim, 30);
  assert.equal(el.ko, true, 'nobody has tried him yet');
  const ev = press(r.sim, { mx: 0.2, attackPressed: true }, 20);
  assert.equal(pokes(ev).length, 1);
  assert.equal(el.ko, false);
  assert.ok(Math.abs(el.hp - Math.ceil(el.st.hp * BX.reviveHp)) < 1, `${el.hp} of ${el.st.hp}`);
  assert.ok(el.mp >= 8);
  assert.equal(r.s.bodies.some((b) => b.id === 'eleven'), false);
});

test('tries: nothing stands her up while he is not pinned', () => {
  const r = bRig();
  park(r, r.boss.x, r.boss.y);
  knockOut(r, 'eleven');
  standAt(r, 20);
  press(r.sim, { mx: 0.2, attackPressed: true }, 30);
  assert.equal((r.s.heroes[slotOf(r, 'eleven')] as Hero).ko, true);
});

// ------------------------------------------------------------------ the reach

/** A pinned Billy with Eleven active, her feet `d` px west of him. */
function reaching(d: number): BRig {
  const { r } = pinnedRig();
  const el = becomeEleven(r);
  assert.equal(el.id, 'eleven');
  standAt(r, d);
  return r;
}

const kOf = (r: BRig): number => bossView(r)?.k ?? 0;

test('reach: Eleven active, standing, within 32 px: k climbs by 1/60 a frame, and at 1 on frame 60 he is freed', () => {
  const r = reaching(30);
  const ks: number[] = [];
  const ev: SimEvent[] = [];
  for (let i = 0; i < 59; i++) { ev.push(...r.sim.step(idle())); ks.push(kOf(r)); }
  assert.ok(Math.abs(ks[0]! - 1 / 60) < 1e-9, `${ks[0]}`);
  assert.ok(Math.abs(ks[29]! - 0.5) < 1e-9);
  assert.ok(Math.abs(ks[58]! - 59 / 60) < 1e-9);
  assert.equal(ofType(ev, 'kill').length, 0);
  assert.equal(r.b.move, 'pinned');
  const last = r.sim.step(idle());
  assert.equal(ofType(last, 'kill').length, 1, 'frame 60');
});

test('reach: 32 px counts and 33 does not', () => {
  const near = reaching(31.9);
  run(near.sim, 10);
  assert.ok(kOf(near) > 0);
  const far = reaching(33);
  run(far.sim, 10);
  assert.equal(kOf(far), 0);
  assert.equal(bossView(far)?.k, undefined);
});

test('reach: it falls by 1/120 a frame toward 0 when she steps away, and stays at 0', () => {
  const r = reaching(30);
  run(r.sim, 30);
  assert.ok(Math.abs(kOf(r) - 0.5) < 1e-9);
  standAt(r, 80);
  const ks: number[] = [];
  for (let i = 0; i < 60; i++) { r.sim.step(idle()); ks.push(kOf(r)); }
  assert.ok(Math.abs(ks[0]! - (0.5 - 1 / 120)) < 1e-9, `${ks[0]}`);
  assert.ok(Math.abs(ks[29]! - 0.25) < 1e-9);
  assert.ok(ks[59]! < 1e-9, `back to 0 after 60 frames: ${ks[59]}`);
  run(r.sim, 60);
  assert.equal(kOf(r), 0);
  assert.equal(r.boss.dead, false);
  // Back in reach, and it climbs again from where it was.
  standAt(r, 20);
  run(r.sim, 15);
  assert.ok(Math.abs(kOf(r) - 0.25) < 1e-9);
});

test('reach: no one else reaches him: Mike beside him for a whole minute does nothing', () => {
  const { r } = pinnedRig();
  standAt(r, 10);
  run(r.sim, 360);
  assert.equal(kOf(r), 0);
  assert.equal(r.boss.dead, false);
});

test('reach: a swap away from Eleven lets it fall, and a swap back picks it up again', () => {
  const r = reaching(20);
  run(r.sim, 30);
  r.sim.step(inp({ swapTo: slotOf(r, 'mike') }));
  run(r.sim, 20);
  assert.ok(kOf(r) < 0.5 + 1e-9 && kOf(r) > 0.3, `${kOf(r)}`);
  const before = kOf(r);
  run(r.sim, 20);
  assert.ok(kOf(r) < before);
  becomeEleven(r);
  standAt(r, 20);
  run(r.sim, 10);
  assert.ok(kOf(r) > 0);
});

test('reach: Eleven going down ends the climb: it falls while the party is on someone else', () => {
  const r = reaching(20);
  run(r.sim, 30);
  const el = r.s.heroes[r.s.active] as Hero;
  el.hp = 0;
  const ev = run(r.sim, 2);
  assert.equal(el.ko, true);
  assert.ok(ofType(ev, 'heroKO').length === 1);
  const k = kOf(r);
  run(r.sim, 30);
  assert.ok(kOf(r) < k, 'with the party swapped to someone else it falls');
});

test('reach: a Flayed holding Eleven does not stop it: held, still within 32 px, still climbing', () => {
  const { r } = pinnedRig({ god: false }, PARTY, true);
  const el = becomeEleven(r);
  el.st.hp = 900; el.hp = 900;
  standAt(r, 20);
  const f = r.s.enemies.find((e) => e.kind === 'flayed') as Enemy;
  f.x = el.x + 8; f.y = el.y; f.cd = 0;
  until(r, () => r.s.hold !== null, 300);
  const k = kOf(r);
  assert.ok(k > 0 && k < 1);
  run(r.sim, 10);
  assert.ok(kOf(r) > k, 'held, still within 32 px, still climbing');
});

// ------------------------------------------------------------------ freed

/** Eleven reaches a pinned Billy (with his Flayed called first when `raged`), and the sim runs until he is down. */
function freed(raged = false): { r: BRig; x: number; y: number } {
  const { r } = pinnedRig({}, PARTY, raged);
  becomeEleven(r);
  standAt(r, 24);
  const x = r.boss.x, y = r.boss.y;
  until(r, () => r.boss.dead, 200);
  return { r, x, y };
}

test('freed: the reach sound, a reveal fx, and he dies like any enemy: the kill, his XP, groupCleared boss', () => {
  const { r } = pinnedRig();
  becomeEleven(r);
  standAt(r, 24);
  const kills: SimEvent[] = [];
  const all: SimEvent[] = [];
  let fx = false;
  for (let i = 0; i < 61; i++) {
    const ev = r.sim.step(idle());
    all.push(...ev);
    if (r.sim.view().fx.some((f) => f.kind === 'reveal')) fx = true;
    kills.push(...ofType(ev, 'kill'));
  }
  assert.ok(sfxIds(all).includes('reach'));
  assert.ok(fx, 'a reveal fx');
  assert.equal(kills.length, 1);
  const k = kills[0] as Extract<SimEvent, { t: 'kill' }>;
  assert.deepEqual([k.kind, k.spawnId, k.group, k.xp, k.by], ['billy', 'billy', 'boss', BILLY.xp, 'eleven']);
  assert.deepEqual(ofType(all, 'groupCleared').map((g) => g.group), ['boss']);
  assert.equal(r.boss.dead, true);
  assert.equal(r.sim.view().hud.boss, null);
});

test('freed: his XP is paid once, when he is freed, and not when he is pinned', () => {
  const { r } = pinnedRig();
  assert.equal(r.sim.stats().xpEarned, 0);
  becomeEleven(r);
  standAt(r, 24);
  until(r, () => r.boss.dead, 200);
  assert.equal(r.sim.stats().xpEarned, BILLY.xp);
});

test('freed: he stays on the floor as an npc where he knelt, and the dying enemy is not drawn', () => {
  const { r, x, y } = freed();
  const v = r.sim.view();
  const npc = npcView(r);
  assert.ok(npc, 'an npc billy');
  assert.deepEqual([npc?.x, npc?.y], [x, y]);
  assert.equal(npc?.kind, 'npc');
  assert.equal(npc?.anim, 'idle');
  assert.equal(v.actors.filter((a) => a.id === 'billy').length, 1, 'one Billy, not a body and an npc');
  assert.equal(bossView(r), undefined);
  // And he is still there long after the enemy's death has played out.
  run(r.sim, 600);
  assert.deepEqual([npcView(r)?.x, npcView(r)?.y], [x, y]);
  assert.equal(r.s.enemies.some((e) => e.kind === 'billy'), false);
});

test('freed: the Flayed he called are still there, and keep fighting', () => {
  const { r } = freed(true);
  const left = r.s.enemies.filter((e) => e.group === 'billys' && !e.dead);
  assert.equal(left.length, BX.call);
  assert.equal(r.sim.enemiesAlive('billys'), BX.call);
  assert.equal(r.sim.enemiesAlive('boss'), 0);
});

test('freed: any death of his leaves the npc, a dev kill included', () => {
  const r = bRig();
  r.sim.dev.killAll();
  assert.equal(npcView(r)?.id, 'billy');
  assert.equal(r.boss.dead, true);
});
