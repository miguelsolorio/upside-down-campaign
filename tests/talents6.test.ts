// The Lv 6 talents (docs/game-design.md, "Heroes"): the held Special, Will's Cleric, Nancy's Molotov, Mike's Rally and Dustin's Dart.
// Lucas's Camo, Max's Kickflip, Steve's Ahoy and Robin's Triple scoop are in tests/talents6-moves.test.ts.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { SimEvent, SimSpawn } from '../src/core/types.ts';
import { HERO_DEFS, HERO_IDS, roleAt, utilitiesAt } from '../src/heroes/index.ts';
import { xpToNext } from '../src/progression/index.ts';
import { heroSheet } from '../src/heroes/charsheet.ts';
import { HOLD_FRAMES } from '../src/heroes/hold.ts';
import { heroAtk } from '../src/combat/damage.ts';
import type { Enemy, Hero, S } from '../src/combat/state.ts';
import { inp, makeWhite, ofType, press, rat, run, sfxIds, tc, tf } from './sim-helpers.ts';

const hero = (s: S, i: number): Hero => s.heroes[i] as Hero;
/** MP comes back a little every frame, so MP is compared to within half a point. */
const near = (a: number, b: number, msg?: string): void => assert.ok(Math.abs(a - b) < 0.5, `${msg ?? ''} ${a} is not ${b}`);
const enemy = (s: S, i: number): Enemy => s.enemies[i] as Enemy;
/** Parks every enemy where it stands with HP to spare, so a test can read what a move did to it. */
function freeze(s: S): void {
  for (const e of s.enemies) { e.stat.stun = 99999; e.hp = e.hpMax = 9999; }
}
const down = inp({ specialPressed: true, specialHeld: true, mx: 0.2 });
const held = inp({ specialHeld: true, mx: 0.2 });
/** Holds Special for `n` frames from the press, without letting go. */
function hold(sim: { step(i: ReturnType<typeof inp>): SimEvent[] }, n: number): SimEvent[] {
  const out = [...sim.step(down)];
  for (let i = 1; i < n; i++) out.push(...sim.step(held));
  return out;
}

// ------------------------------------------------------------------ the held Special

test('below Lv 6 a press casts at once, as it always has', () => {
  const { sim, s } = makeWhite({ party: [{ id: 'will', level: 5 }] });
  const mp = hero(s, 0).mp;
  sim.step(down);
  near(hero(s, 0).mp, mp - HERO_DEFS.will.special.mp, 'Fireball on the press');
  assert.equal(sim.view().actors.find((a) => a.id === 'will')?.charge, undefined, 'no ring');
});

test('from Lv 6 a tap casts the plain Special when the key comes up', () => {
  const { sim, s } = makeWhite({ party: [{ id: 'will', level: 6 }] });
  const mp = hero(s, 0).mp;
  hold(sim, 5);
  near(hero(s, 0).mp, mp, 'nothing while the key is down');
  const ring = sim.view().actors.find((a) => a.id === 'will')?.charge ?? 0;
  assert.ok(ring > 0 && ring < 1, `the ring is filling (${ring})`);
  sim.step(inp());
  near(hero(s, 0).mp, mp - HERO_DEFS.will.special.mp, 'Fireball on the release');
  assert.ok(s.projs.some((p) => p.kind === 'fireball') || s.timers.length > 0, 'the ball is on its way');
});

test('a press that comes up on the same frame (the bot\'s tap) casts the plain Special that frame', () => {
  const { sim, s } = makeWhite({ party: [{ id: 'nancy', level: 6 }] });
  const mp = hero(s, 0).mp;
  sim.step(inp({ specialPressed: true, mx: 0.2 }));
  near(hero(s, 0).mp, mp - HERO_DEFS.nancy.special.mp);
  run(sim, 10);
  assert.equal(s.projs.filter((p) => p.kind === 'bullet').length, HERO_DEFS.nancy.special.x.n, 'the Shotgun');
});

test('holding HOLD_FRAMES casts the variant once, and letting go after casts nothing more', () => {
  const { sim, s } = makeWhite({ party: [{ id: 'will', level: 6 }, { id: 'mike' }] });
  hero(s, 0).hp = 10;
  const mp = hero(s, 0).mp;
  hold(sim, HOLD_FRAMES - 1);
  near(hero(s, 0).mp, mp, 'one frame short, nothing yet');
  sim.step(held);
  near(hero(s, 0).mp, mp - HERO_DEFS.will.special.x.healMp, 'the heal on frame 24');
  run(sim, 30, held);
  sim.step(inp());
  run(sim, 5);
  assert.ok(hero(s, 0).mp > mp - HERO_DEFS.will.special.x.healMp - 0.5, 'no Fireball after');
  assert.equal(s.projs.filter((p) => p.kind === 'fireball').length, 0);
});

test('a full ring released while the Special cools down casts nothing', () => {
  const { sim, s } = makeWhite({ party: [{ id: 'nancy', level: 6 }] });
  hero(s, 0).cdSpecial = 200;
  const mp = hero(s, 0).mp;
  hold(sim, HOLD_FRAMES + 10);
  sim.step(inp());
  run(sim, 10);
  assert.ok(hero(s, 0).mp >= mp, 'nothing cast');
});

// ------------------------------------------------------------------ Will: Cleric

test('Cleric: Will is a Wizard to Lv 5 and a Cleric from Lv 6, on the sheet too', () => {
  assert.equal(roleAt('will', 5), 'Wizard');
  assert.equal(roleAt('will', 6), 'Cleric');
  assert.equal(heroSheet('will', 6).role, 'Cleric');
  assert.equal(heroSheet('will', 5).role, 'Wizard');
  assert.equal(roleAt('mike', 6), 'Paladin');
});

test('Cleric: the hold heals every living hero 30% of max HP, the bench too, and a KO stays down', () => {
  const { sim, s } = makeWhite({ party: [{ id: 'will', level: 6 }, { id: 'mike', level: 6 }, { id: 'dustin', level: 6 }] });
  const [w, m, d] = [hero(s, 0), hero(s, 1), hero(s, 2)];
  w.hp = 5; m.hp = m.st.hp - 3; d.hp = 0; d.ko = true;
  const ev = hold(sim, HOLD_FRAMES);
  assert.equal(w.hp, 5 + Math.round(w.st.hp * 0.3));
  assert.equal(m.hp, m.st.hp, 'capped at max');
  assert.equal(d.hp, 0);
  assert.equal(d.ko, true);
  assert.ok(sfxIds(ev).includes('heal'));
  assert.ok(sim.view().fx.filter((f) => f.kind === 'heal').length >= 2);
});

test('Cleric: the heal waits 10 s, and a hold before then says NOT YET and costs nothing', () => {
  const { sim, s } = makeWhite({ party: [{ id: 'will', level: 6 }] });
  const w = hero(s, 0);
  w.hp = 5;
  hold(sim, HOLD_FRAMES);
  sim.step(inp());
  run(sim, 100);
  const mp = w.mp;
  hold(sim, HOLD_FRAMES);
  assert.ok(sim.view().floaters.some((f) => f.text === 'NOT YET'));
  assert.ok(w.mp >= mp, 'no MP spent');
  sim.step(inp());
  run(sim, HERO_DEFS.will.special.x.healCd);
  w.hp = 5;
  hold(sim, HOLD_FRAMES);
  assert.ok(w.hp > 5, 'healed again once the wait is over');
});

// ------------------------------------------------------------------ Nancy: Molotov

test('Molotov: Nancy opens burn from Lv 6, not before', () => {
  assert.deepEqual(utilitiesAt('nancy', 5), ['shoot']);
  assert.deepEqual(utilitiesAt('nancy', 6), ['shoot', 'burn']);
  assert.deepEqual(utilitiesAt('dustin', 6), HERO_DEFS.dustin.utilities);
});

test('Molotov: the hold lobs a bottle that leaves a fire pool, and a foe in it burns', () => {
  const { sim, s } = makeWhite({ party: [{ id: 'nancy', level: 6 }], spawns: [rat('a', 7, 8)] });
  freeze(s);
  const r = enemy(s, 0);
  const mp = hero(s, 0).mp;
  hold(sim, HOLD_FRAMES);
  near(hero(s, 0).mp, mp - HERO_DEFS.nancy.special.x.molMp);
  sim.step(inp());
  let flight = 0, pool = 0;
  for (let i = 0; i < 80; i++) {
    sim.step(inp());
    if (sim.view().fx.some((f) => f.kind === 'bottle')) flight++;
    if (sim.view().fx.some((f) => f.kind === 'fire' && f.w === HERO_DEFS.nancy.special.x.poolR * 2)) pool++;
  }
  assert.ok(flight >= 15, `the bottle flies (${flight})`);
  assert.ok(pool > 40, `the pool burns on (${pool})`);
  assert.ok(r.hp < 9999, 'the rat took the fire');
  assert.ok(r.stat.burn > 0, 'and is burning');
});

test('Molotov: a pool beside the vines burns them away, so Nancy opens a burn gate', () => {
  const vines: SimSpawn = { kind: 'prop', id: 'vines1', prop: 'vines', tx: 8, ty: 8, w: 32, h: 16, hitBy: 'burn' };
  const { sim } = makeWhite({ party: [{ id: 'nancy', level: 6 }], start: { x: tc(4), y: tf(8) }, spawns: [vines] });
  hold(sim, HOLD_FRAMES);
  sim.step(inp());
  const ev = run(sim, 200);
  assert.ok(ofType(ev, 'propCleared').some((e) => e.propId === 'vines1'), 'the vines are gone');
});

// ------------------------------------------------------------------ Mike: Rally

test('Rally: from Lv 6 the DM screen lifts the party\'s ATK 20% for 10 s', () => {
  const { sim, s } = makeWhite({ party: [{ id: 'mike', level: 6 }, { id: 'dustin', level: 4 }] });
  const d = hero(s, 1);
  assert.equal(heroAtk(s, d), d.st.atk);
  press(sim, { specialPressed: true, mx: 0.2 }, HERO_DEFS.mike.special.at + 1);
  assert.ok(sim.view().floaters.some((f) => f.text === 'RALLY'));
  assert.ok(Math.abs(heroAtk(s, d) / d.st.atk - 1.2) < 1e-9, 'the bench too');
  assert.ok(Math.abs(heroAtk(s, hero(s, 0)) / hero(s, 0).st.atk - 1.2) < 1e-9);
  run(sim, HERO_DEFS.mike.special.x.rally);
  assert.equal(heroAtk(s, d), d.st.atk, 'and it ends');
});

test('Rally: a second screen refreshes it and never stacks; a Lv 5 Mike has none', () => {
  const { sim, s } = makeWhite({ party: [{ id: 'mike', level: 6 }] });
  press(sim, { specialPressed: true, mx: 0.2 }, 300);
  press(sim, { specialPressed: true, mx: 0.2 }, HERO_DEFS.mike.special.at + 1);
  assert.ok(s.t6.rally > 550, 'refreshed');
  assert.ok(Math.abs(heroAtk(s, hero(s, 0)) / hero(s, 0).st.atk - 1.2) < 1e-9, 'not 1.44');
  const low = makeWhite({ party: [{ id: 'mike', level: 5 }] });
  press(low.sim, { specialPressed: true, mx: 0.2 }, 20);
  assert.equal(low.s.t6.rally, 0);
});

// ------------------------------------------------------------------ Dustin: Dart

test('Dart: the spray calls Dart, who runs to a foe and bites it as Dustin', () => {
  const { sim, s } = makeWhite({ party: [{ id: 'dustin', level: 6 }], spawns: [rat('a', 4, 12)] });
  freeze(s);
  const r = enemy(s, 0);
  press(sim, { specialPressed: true, mx: 0.2 }, HERO_DEFS.dustin.special.at + 1);
  assert.ok(s.t6.dart, 'Dart is out');
  assert.ok(sim.view().fx.some((f) => f.kind === 'pet'));
  const ev = run(sim, 120);
  assert.ok(r.hp < 9999, 'he bit it');
  assert.ok(sfxIds(ev).includes('chomp'));
  assert.equal(r.by, 'dustin');
});

test('Dart: he leaves after 12 s and can\'t come again until 30 s after the call; a Lv 5 Dustin has no Dart', () => {
  const { sim, s } = makeWhite({ party: [{ id: 'dustin', level: 6 }] });
  const x = HERO_DEFS.dustin.special.x;
  press(sim, { specialPressed: true, mx: 0.2 }, HERO_DEFS.dustin.special.at + 1);
  assert.ok(s.t6.dart);
  run(sim, x.dart);
  assert.equal(s.t6.dart, null, 'gone at 12 s');
  hero(s, 0).mp = hero(s, 0).st.mp;
  press(sim, { specialPressed: true, mx: 0.2 }, HERO_DEFS.dustin.special.at + 1);
  assert.equal(s.t6.dart, null, 'still resting');
  run(sim, x.dartRest - x.dart);
  hero(s, 0).mp = hero(s, 0).st.mp;
  press(sim, { specialPressed: true, mx: 0.2 }, HERO_DEFS.dustin.special.at + 1);
  assert.ok(s.t6.dart, 'back after 30 s');
  const low = makeWhite({ party: [{ id: 'dustin', level: 5 }] });
  press(low.sim, { specialPressed: true, mx: 0.2 }, 20);
  assert.equal(low.s.t6.dart, null);
});

test('Dart: with no foe he stays at the active hero\'s heels, and a wipe sends him home', () => {
  const { sim, s } = makeWhite({ party: [{ id: 'dustin', level: 6 }, { id: 'mike' }] });
  press(sim, { specialPressed: true, mx: 0.2 }, HERO_DEFS.dustin.special.at + 1);
  run(sim, 120, inp({ mx: 1 }));
  const p = s.t6.dart;
  const h = hero(s, 0);
  assert.ok(p && Math.hypot(p.x - h.x, p.y - h.y) < 40, 'he kept up');
  s.over = true;
  sim.healParty(0.5);
  assert.equal(s.t6.dart, null);
  assert.equal(s.t6.dartRest, 0, 'and he can come again at once');
});

// ------------------------------------------------------------------ the callout

test('reaching Lv 6 brings the Lv 6 talent\'s NEW TALENT callout, once, for every hero', () => {
  for (const id of HERO_IDS) {
    const { sim } = makeWhite({ party: [{ id, level: 5 }, { id: id === 'mike' ? 'dustin' : 'mike', level: 5 }] });
    sim.dev.giveXp(xpToNext(5));
    const ups = ofType(sim.step(inp()), 'levelUp').map((e) => e.info).filter((u) => u.hero === id);
    assert.deepEqual(ups.map((u) => u.to), [6], id);
    assert.equal(ups[0]?.talent?.name, HERO_DEFS[id].talents[1]?.name);
    sim.dev.giveXp(xpToNext(6));
    const more = ofType(sim.step(inp()), 'levelUp').map((e) => e.info).filter((u) => u.hero === id);
    assert.equal(more[0]?.talent, null, `${id} gains nothing at 7`);
  }
});
