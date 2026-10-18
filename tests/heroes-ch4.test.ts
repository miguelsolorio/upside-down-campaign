// Chapter 4's two heroes (docs/level-10.md, docs/level-11.md): Hopper's Haymaker, Ground slam, Coffee and Wind-up, Eddie's Flying V, the
// Hellfire solo stand-in, Metalhead and Hellfire DM, the riff opening mirrors and clocks, a party of one, and the bot playing both.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { HERO_DEFS } from '../src/heroes/index.ts';
import type { Enemy, Hero, S } from '../src/combat/state.ts';
import { hitEnemy, hurtHero, rollDamage } from '../src/combat/damage.ts';
import { createBot } from '../src/combat/bot.ts';
import { BURST_FREEZE } from '../src/combat/burst.ts';
import type { SimEvent, SimInput, SimSpawn } from '../src/core/types.ts';
import { arena, inp, makeWhite, ofType, press, rat, run, sfxIds, tc, tf } from './sim-helpers.ts';

const hero = (s: S, i = 0): Hero => s.heroes[i] as Hero;
const enemy = (s: S, i = 0): Enemy => s.enemies[i] as Enemy;
const prop = (id: string, kind: 'crack' | 'mirror' | 'clock', tx: number, ty: number, w = 32, h = 16): SimSpawn => ({ kind: 'prop', id, prop: kind, tx, ty, w, h });

/** Every foe stands still with HP to spare, so a test reads what a move did and nothing fights back. */
function freeze(s: S): void {
  for (const e of s.enemies) { e.stat.stun = 99999; e.hp = e.hpMax = 9999; }
}
/** Puts a foe `d` px from the hero's feet at `deg` degrees (0 is east, 90 is south). */
function place(s: S, e: Enemy, d: number, deg: number): void {
  const a = (deg * Math.PI) / 180;
  e.x = hero(s).x + Math.cos(a) * d;
  e.y = hero(s).y + Math.sin(a) * d;
  e.hx = e.x; e.hy = e.y;
}
/** No spread and no crit roll: a hit is exactly power x ATK less half the DEF. */
function steady(s: S): void { s.rng = () => 0.5; }
const hitDmg = (ev: SimEvent[]): number[] => ofType(ev, 'hit').filter((h) => h.onEnemy).map((h) => h.dmg);
const count = (ev: SimEvent[], id: string): number => ev.filter((e) => e.t === 'sfx' && e.id === id).length;

// ------------------------------------------------------------------ Hopper: Haymaker

function hopperRig(level: number, spawns: SimSpawn[] = [rat('a', 20, 3), rat('b', 20, 4)]) {
  const rig = makeWhite({ party: [{ id: 'hopper', level }], start: { x: tc(4), y: tf(8) }, spawns });
  freeze(rig.s);
  steady(rig.s);
  return rig;
}

test('Haymaker: slow, an arc of 80 degrees either side, no chain, and sfx haymaker', () => {
  const { sim, s } = hopperRig(5);
  place(s, enemy(s, 0), 26, 75);
  place(s, enemy(s, 1), 26, 100);
  const ev = press(sim, { attackPressed: true, mx: 0.2 }, HERO_DEFS.hopper.basic.at + 1);
  assert.ok(sfxIds(ev).includes('haymaker'));
  assert.equal(enemy(s, 0).hp, 9999 - rollDamage(1.6, hero(s).st.atk, 0, 1), '75 degrees off the aim is in the arc');
  assert.equal(enemy(s, 1).hp, 9999, '100 degrees is out of it');
  assert.equal(hero(s).combo, 0, 'no chain');
  assert.ok(hero(s).cdBasic > 10, 'and a 30 frame cooldown from the press');
});

test('Haymaker and Ground slam break a crack in a wall, and a plain Mike swing does not', () => {
  for (const move of ['basic', 'special'] as const) {
    const { sim, s } = hopperRig(5, [prop('c', 'crack', 6, 8)]);
    const ev = press(sim, move === 'basic' ? { attackPressed: true, mx: 0.2 } : { specialPressed: true, mx: 0.2 }, 20);
    assert.deepEqual(ofType(ev, 'propCleared').map((e) => e.propId), ['c'], move);
    assert.equal(s.props[0]?.state, 'open');
    assert.equal(s.props[0]?.solid, false);
  }
  const mike = makeWhite({ party: [{ id: 'mike' }], spawns: [prop('c', 'crack', 6, 8)] });
  assert.deepEqual(ofType(press(mike.sim, { attackPressed: true, mx: 0.2 }, 20), 'propCleared'), []);
});

// ------------------------------------------------------------------ Hopper: Ground slam

test('Ground slam: a shockwave all round that stuns every foe in 44 px, and costs 8 MP', () => {
  const { sim, s } = hopperRig(5, [rat('n', 20, 3), rat('e', 20, 3), rat('s', 20, 3), rat('w', 20, 3), rat('far', 20, 3)]);
  [0, 90, 180, 270].forEach((deg, i) => place(s, enemy(s, i), 36, deg));
  place(s, enemy(s, 4), 70, 0);
  for (const e of s.enemies) e.stat.stun = 0;
  const mp = hero(s).mp;
  const ev = press(sim, { specialPressed: true }, HERO_DEFS.hopper.special.at + 1);
  assert.ok(sfxIds(ev).includes('slam'));
  assert.ok(sim.view().fx.some((f) => f.kind === 'nova'), 'fx nova');
  for (let i = 0; i < 4; i++) {
    assert.equal(enemy(s, i).hp, 9999 - rollDamage(1, hero(s).st.atk, 0, 1), `foe ${i} is hit`);
    assert.ok(enemy(s, i).stat.stun > 30, `foe ${i} is stunned`);
  }
  assert.equal(enemy(s, 4).hp, 9999, 'the one 70 px off is not');
  assert.ok(Math.abs(mp - hero(s).mp - HERO_DEFS.hopper.special.mp) < 1, 'MP spent');
});

/** A riot guard facing Hopper from the east, in step with a Hopper who has MP to spare. */
function guardRig(level: number) {
  const rig = makeWhite({ party: [{ id: 'hopper', level }], start: { x: tc(4), y: tf(8) }, spawns: [rat('g', 6, 8, 'g', { type: 'guard', dir: 'left' })] });
  const g = enemy(rig.s);
  g.hp = g.hpMax = 9999;
  // It holds its shield up and never swings.
  g.cd = 1e9;
  steady(rig.s);
  return { ...rig, g };
}

test('a plain haymaker is blocked by a guard, the slam and the wind-up break the block', () => {
  const plain = guardRig(5);
  press(plain.sim, { attackPressed: true, mx: 0.2 }, HERO_DEFS.hopper.basic.at + 1);
  assert.equal(plain.g.broken, 0, 'knockback 2.8 is under the 3.2 a block needs');
  assert.ok(plain.g.hp >= 9999 - 5, 'and it is blocked to a fifth');
  const slam = guardRig(5);
  press(slam.sim, { specialPressed: true, mx: 0.2 }, HERO_DEFS.hopper.special.at + 1);
  assert.ok(slam.g.broken > 0, 'the slam breaks it');
  const wind = guardRig(6);
  press(wind.sim, { attackPressed: true, attackHeld: true, mx: 0.2 });
  run(wind.sim, 30, inp({ attackHeld: true }));
  press(wind.sim, {}, HERO_DEFS.hopper.basic.at + 1);
  assert.ok(wind.g.broken > 0, 'so does the wind-up');
});

// ------------------------------------------------------------------ Hopper: Wind-up

test('Wind-up: from Lv 6 Attack fires on release, held 24 frames it is the wind-up haymaker', () => {
  const { sim, s } = hopperRig(6);
  place(s, enemy(s, 0), 26, 0);
  const atk = hero(s).st.atk;
  // Held: the ring fills and nothing swings.
  press(sim, { attackPressed: true, attackHeld: true, mx: 0.2 }, 0);
  const rings: number[] = [];
  for (let i = 0; i < 30; i++) {
    sim.step(inp({ attackHeld: true }));
    rings.push(sim.view().actors.find((a) => a.id === 'hopper')?.charge ?? 0);
  }
  assert.equal(enemy(s).hp, 9999, 'nothing has swung yet');
  assert.ok(rings[5] as number > 0 && (rings[5] as number) < 1, 'the ring is filling');
  assert.equal(rings[29], 1, 'and full');
  const ev = run(sim, HERO_DEFS.hopper.basic.at + 2);
  assert.deepEqual(hitDmg(ev), [rollDamage(1.6 * 1.8, atk, 0, 1)], 'let go: the wind-up haymaker');
  assert.equal(sim.view().actors.find((a) => a.id === 'hopper')?.charge, undefined, 'the ring is gone');
});

test('Wind-up: a tap is the plain haymaker on release, and below Lv 6 Attack fires on the press', () => {
  const tap = hopperRig(6);
  place(tap.s, enemy(tap.s), 26, 0);
  const ev = [...press(tap.sim, { attackPressed: true, attackHeld: true, mx: 0.2 }, 0), ...press(tap.sim, {}, HERO_DEFS.hopper.basic.at + 2)];
  assert.deepEqual(hitDmg(ev), [rollDamage(1.6, hero(tap.s).st.atk, 0, 1)]);
  const low = hopperRig(5);
  place(low.s, enemy(low.s), 26, 0);
  const first = press(low.sim, { attackPressed: true, attackHeld: true, mx: 0.2 }, HERO_DEFS.hopper.basic.at + 1);
  assert.equal(hitDmg(first).length, 1, 'Lv 5 swings on the press, key still down');
  assert.equal(low.sim.view().actors.find((a) => a.id === 'hopper')?.charge, undefined);
});

test('Wind-up: a hit lets go of the hold', () => {
  const { sim, s } = hopperRig(6);
  press(sim, { attackPressed: true, attackHeld: true }, 0);
  run(sim, 10, inp({ attackHeld: true }));
  assert.ok(hero(s).holdT > 5);
  hero(s).hurtT = 12;
  sim.step(inp({ attackHeld: true }));
  assert.equal(hero(s).holdT, 0);
});

// ------------------------------------------------------------------ Hopper: Coffee

test('Coffee: from Lv 3 an Eggo, a Coke and the stash heal Hopper 25 percent more', () => {
  const eaten = (level: number, item: 'eggo' | 'coke'): number => {
    const { sim, s } = makeWhite({
      party: [{ id: 'hopper', level }], start: { x: tc(4), y: tf(8) }, spawns: [{ kind: 'item', id: 'i', item, tx: 4, ty: 8 }],
    });
    const h = hero(s);
    h.hp = 1; h.mp = 0;
    run(sim, 2);
    return item === 'eggo' ? h.hp - 1 : h.mp;
  };
  const hp2 = HERO_DEFS.hopper.base.hp + Math.floor(HERO_DEFS.hopper.growth.hp);
  assert.ok(Math.abs(eaten(2, 'eggo') - hp2 * 0.4) < 1.5, 'Lv 2: the usual 40 percent');
  const lv3 = HERO_DEFS.hopper.base.hp + Math.floor(HERO_DEFS.hopper.growth.hp * 2);
  assert.ok(Math.abs(eaten(3, 'eggo') - lv3 * 0.4 * 1.25) < 1.5, 'Lv 3: a quarter more');
  assert.ok(eaten(3, 'coke') > eaten(2, 'coke') * 1.2, 'a Coke too');
  // The stash: an Eggo at under a quarter HP, a Coke when Special is short of MP.
  const stashed = (level: number): number => {
    const { sim, s } = makeWhite({ party: [{ id: 'hopper', level }], stash: { eggo: 1, coke: 0 } });
    hero(s).hp = 2;
    run(sim, 2);
    return hero(s).hp - 2;
  };
  assert.ok(stashed(3) > stashed(2) * 1.2, 'the stash');
});

// ------------------------------------------------------------------ Eddie: Flying V

function eddieRig(level: number, spawns: SimSpawn[] = [], party: { id: 'eddie' | 'dustin' | 'mike'; level?: number }[] = [{ id: 'eddie', level }]) {
  const rig = makeWhite({ party: party.map((p) => ({ ...p, level: p.level ?? level })), start: { x: tc(4), y: tf(8) }, spawns });
  steady(rig.s);
  return rig;
}

test('Flying V: a wide arc, the sound ring hits a foe the arc missed for half as much, and no chain', () => {
  const { sim, s } = eddieRig(2, [rat('in', 20, 3), rat('past', 20, 3), rat('side', 20, 3)]);
  freeze(s);
  place(s, enemy(s, 0), 24, 60);
  place(s, enemy(s, 1), 40, 0);
  place(s, enemy(s, 2), 40, 90);
  const atk = hero(s).st.atk;
  const ev = press(sim, { attackPressed: true, mx: 0.2 }, HERO_DEFS.eddie.basic.at + 1);
  assert.ok(sfxIds(ev).includes('vswing'));
  assert.equal(enemy(s, 0).hp, 9999 - rollDamage(1.2, atk, 0, 1), '60 degrees is inside the 75');
  assert.equal(enemy(s, 1).hp, 9999 - rollDamage(0.5, atk, 0, 1), '40 px is past the arc, inside the ring');
  assert.equal(enemy(s, 2).hp, 9999, 'off to the side is neither');
  const ring = sim.view().fx.find((f) => f.kind === 'riff');
  assert.ok(ring && ring.w === 28, 'a 28 px riff ring');
  assert.ok(Math.abs((ring?.x ?? 0) - (hero(s).x + 30)) < 1, 'where the arc ends');
  assert.equal(hero(s).combo, 0);
});

test('Metalhead: from Lv 3 his hits deal 10 percent more', () => {
  const dmg = (level: number): number => {
    const { sim, s } = eddieRig(level, [rat('a', 6, 8)]);
    freeze(s);
    return hitDmg(press(sim, { attackPressed: true, mx: 0.2 }, HERO_DEFS.eddie.basic.at + 1))[0] as number;
  };
  const atk = (level: number): number => HERO_DEFS.eddie.base.atk + Math.floor(HERO_DEFS.eddie.growth.atk * (level - 1));
  assert.equal(dmg(2), rollDamage(1.2, atk(2), 0, 1));
  assert.equal(dmg(3), rollDamage(1.2, atk(3) * 1.1, 0, 1));
});

// ------------------------------------------------------------------ Eddie: the Hellfire solo (the stand-in)

test('the solo: he plants for 360 frames in anim cast, pulses every 30 starting on frame 30, and ends', () => {
  const { sim, s } = eddieRig(3);
  const mp = hero(s).mp;
  const pulses: number[] = [];
  const x0 = hero(s).x;
  const tick = (input = inp()): void => { if (sfxIds(sim.step(input)).includes('riff')) pulses.push(frame); };
  let frame = 0;
  tick(inp({ specialPressed: true }));
  assert.ok(Math.abs(mp - hero(s).mp - HERO_DEFS.eddie.special.mp) < 0.5, 'MP is spent at the start');
  const spent = hero(s).mp;
  for (frame = 1; frame <= 365; frame++) {
    // He is asked to walk and to cast again the whole time.
    tick(inp({ mx: 1, specialPressed: frame % 50 === 0 }));
    assert.ok(hero(s).mp >= spent - 1e-9, 'Special spends nothing more');
    if (frame === 100) {
      const v = sim.view();
      assert.equal(v.actors.find((a) => a.id === 'eddie')?.anim, 'cast');
      assert.deepEqual(v.hud.solo, { t: 100, life: 360, streak: 0, ring: 40, beat: 20 });
      assert.equal(hero(s).x, x0, 'movement does nothing');
    }
  }
  assert.equal(pulses.length, 12);
  assert.deepEqual(pulses.slice(0, 3), [30, 60, 90]);
  assert.equal(s.t6.stand, null);
  assert.equal(sim.view().hud.solo, null);
  assert.notEqual(sim.view().actors.find((a) => a.id === 'eddie')?.anim, 'cast');
  run(sim, 70);
  assert.ok(hero(s).cdSpecial <= 0, 'cool again a second after');
  run(sim, 5, inp({ mx: 1 }));
  assert.ok(hero(s).x > x0, 'he walks');
});

test('the solo: each pulse hits every foe within 40 px for 0.4 and knocks it back, and none farther', () => {
  const { sim, s } = eddieRig(3, [rat('near', 20, 3), rat('far', 20, 3)]);
  freeze(s);
  place(s, enemy(s, 0), 30, 200);
  place(s, enemy(s, 1), 60, 20);
  const atk = hero(s).st.atk * 1.1;
  const ev = [...press(sim, { specialPressed: true }, 29), ...run(sim, 1)];
  assert.deepEqual(hitDmg(ev), [rollDamage(0.4, atk, 0, 1)]);
  assert.equal(enemy(s, 1).hp, 9999);
  const ring = sim.view().fx.find((f) => f.kind === 'riff');
  assert.equal(ring?.w, 80, 'the 40 px ring is 80 across');
});

test('the Hellfire bond: with Dustin in the party the solo lasts 480 frames and pulses 16 times', () => {
  const { sim, s } = eddieRig(3, [], [{ id: 'eddie' }, { id: 'dustin' }]);
  const ev = [...press(sim, { specialPressed: true }, 0)];
  assert.equal(sim.view().hud.solo?.life, 480);
  ev.push(...run(sim, 490));
  assert.equal(count(ev, 'riff'), 16);
  assert.equal(s.t6.stand, null);
});

test('a swap away ends the solo, a hit does not', () => {
  const { sim, s } = eddieRig(3, [], [{ id: 'eddie' }, { id: 'mike' }]);
  press(sim, { specialPressed: true }, 40);
  assert.ok(s.t6.stand);
  // A hit flinches him; he stands back in the cast.
  assert.ok(hurtHero(s, hero(s), hero(s).x + 10, hero(s).y, 0.5, 10) > 0);
  assert.equal(hero(s).act, null, 'the cast was cancelled');
  run(sim, 20);
  assert.ok(s.t6.stand, 'still playing');
  assert.equal(sim.view().actors.find((a) => a.id === 'eddie')?.anim, 'cast');
  const ev = press(sim, { swapTo: 1 }, 3);
  assert.equal(s.active, 1);
  assert.equal(s.t6.stand, null, 'the swap ended it');
  assert.equal(sim.view().hud.solo, null);
  assert.ok(hero(s, 0).cdSpecial <= HERO_DEFS.eddie.special.cd, 'and the Special cools from there');
  assert.ok(!sfxIds([...ev, ...run(sim, 60)]).includes('riff'), 'no more pulses');
});

test('the solo ends when Eddie is knocked out', () => {
  const { sim, s } = eddieRig(3, [], [{ id: 'eddie' }, { id: 'mike' }]);
  press(sim, { specialPressed: true }, 40);
  hero(s).hp = 0;
  run(sim, 12);
  assert.equal(s.t6.stand, null);
  assert.equal(s.active, 1);
});

// ------------------------------------------------------------------ Eddie: Hellfire DM

test('Hellfire DM: from Lv 6 his hits mark an elite or a boss for 300 frames, and the party hits it for 20 percent more', () => {
  const mark = (level: number, extra: Partial<Extract<SimSpawn, { kind: 'enemy' }>>) => {
    const rig = eddieRig(level, [rat('a', 6, 8, 'g', extra)], [{ id: 'eddie' }, { id: 'mike', level: 6 }]);
    freeze(rig.s);
    press(rig.sim, { attackPressed: true, mx: 0.2 }, HERO_DEFS.eddie.basic.at + 1);
    return rig;
  };
  const marked = (rig: ReturnType<typeof mark>): boolean => rig.sim.view().actors.find((a) => a.kind === 'enemy')?.marked === true;
  const elite = mark(6, { tier: 'elite' });
  assert.ok(marked(elite), 'an elite');
  assert.ok(!marked(mark(5, { tier: 'elite' })), 'not before Lv 6');
  assert.ok(!marked(mark(6, {})), 'not a plain foe');
  assert.ok(marked(mark(6, { group: 'boss' })), 'a boss');
  // Mike's hit: the plain damage, then 20 percent more while the mark holds.
  const e = enemy(elite.s);
  const mike = hero(elite.s, 1);
  const base = rollDamage(1, mike.st.atk, e.def, 1);
  assert.equal(hitEnemy(elite.s, mike, e, { power: 1 }), Math.round(base * 1.2));
  run(elite.sim, 320);
  assert.ok(!marked(elite), 'the mark ran out');
  assert.equal(hitEnemy(elite.s, mike, e, { power: 1 }), base);
});

// ------------------------------------------------------------------ The riff

test('the riff: the swing opens a mirror, the ring reaches one just past the arc, and any other hero only tries it', () => {
  const { sim, s } = eddieRig(2, [prop('m', 'mirror', 6, 8)]);
  const ev = press(sim, { attackPressed: true, mx: 0.2 }, HERO_DEFS.eddie.basic.at + 1);
  assert.deepEqual(ofType(ev, 'propCleared').map((e) => e.propId), ['m']);
  assert.ok(sfxIds(ev).includes('shatter'));
  assert.equal(s.props[0]?.state, 'open');
  assert.equal(s.props[0]?.solid, false, 'a mirror is walkable once shattered');
  assert.deepEqual(ofType(ev, 'poked'), [], 'Eddie never pokes it');
  // 40 px away is past the arc's 34, inside the ring at its end.
  const far = eddieRig(2, [prop('m', 'mirror', 7, 8)]);
  assert.deepEqual(ofType(press(far.sim, { attackPressed: true, mx: 0.2 }, HERO_DEFS.eddie.basic.at + 1), 'propCleared').length, 1);
  const mike = makeWhite({ party: [{ id: 'mike' }], spawns: [prop('m', 'mirror', 6, 8)] });
  const swing = press(mike.sim, { attackPressed: true, mx: 0.2 }, 20);
  assert.deepEqual(ofType(swing, 'propCleared'), []);
  assert.equal(ofType(swing, 'poked').length, 1, 'any other hero is only trying it');
});

test('the riff: a solo pulse breaks a mirror and the clock, and the clock stays solid', () => {
  const { sim, s } = eddieRig(3, [prop('m', 'mirror', 5, 8), prop('c', 'clock', 3, 6, 16, 32), prop('out', 'mirror', 12, 8)]);
  const ev = press(sim, { specialPressed: true }, 30);
  assert.deepEqual(ofType(ev, 'propCleared').map((e) => e.propId).sort(), ['c', 'm']);
  assert.equal(s.props.find((p) => p.id === 'c')?.solid, true);
  assert.equal(s.props.find((p) => p.id === 'c')?.state, 'open');
  assert.equal(s.props.find((p) => p.id === 'out')?.state, 'closed', 'one far off stays whole');
});

test('openProp shatters a mirror and a clock by id, as it opens any other gate', () => {
  const { sim, s } = makeWhite({ spawns: [prop('m', 'mirror', 6, 8), prop('c', 'clock', 9, 8, 16, 32)] });
  sim.openProp('m'); sim.openProp('c');
  const ev = sim.step(inp());
  assert.deepEqual(ofType(ev, 'propCleared').map((e) => e.propId).sort(), ['c', 'm']);
  assert.equal(s.props[0]?.solid, false);
  assert.equal(s.props[1]?.solid, true);
});

// ------------------------------------------------------------------ A party of one

test('with one hero a swap does nothing and makes no sound, and the KO is the party going down', () => {
  const { sim, s } = hopperRig(5);
  const ev = [...press(sim, { swapDelta: 1 }, 2), ...press(sim, { swapDelta: -1 }, 2), ...press(sim, { swapTo: 0 }, 2), ...press(sim, { swapTo: 3 }, 2)];
  assert.deepEqual(ofType(ev, 'swap'), []);
  assert.ok(!sfxIds(ev).includes('swap'));
  assert.equal(s.active, 0);
  assert.equal(s.swapLock, 0);
  hero(s).hp = 0;
  const out = run(sim, 2);
  assert.equal(ofType(out, 'heroKO').length, 1);
  assert.equal(ofType(out, 'allDown').length, 1);
  assert.ok(s.over);
});

test('with one hero the Crit sweeps with his signature alone', () => {
  const { sim, s } = hopperRig(5, [rat('a', 20, 3), rat('b', 20, 3)]);
  place(s, enemy(s, 0), 90, 0);
  place(s, enemy(s, 1), 150, 180);
  s.burst = 1;
  const ev = [...press(sim, { burstPressed: true }, 0), ...run(sim, BURST_FREEZE + 40)];
  assert.equal(ofType(ev, 'burst').length, 1);
  for (const e of s.enemies) assert.ok(e.hp < 9999, 'the sweep reached both');
  assert.equal(s.seq, null);
  assert.equal(s.burst, 0);
});

// ------------------------------------------------------------------ The bot

/** A bot playing `party` in the arena with `spawns` frozen where they stand (or awake, with `awake`). */
function botRig(party: { id: 'hopper' | 'eddie'; level: number }[], spawns: SimSpawn[], awake = false) {
  const rig = makeWhite({ party, start: { x: tc(4), y: tf(8) }, spawns });
  steady(rig.s);
  for (const e of rig.s.enemies) { e.hp = e.hpMax = 9999; if (!awake) e.stat.stun = 99999; }
  const bot = createBot({ grid: arena(24, 16), waypoints: [{ x: tc(20), y: tf(8) }] });
  const inputs: SimInput[] = [];
  const play = (n: number): SimEvent[] => {
    const out: SimEvent[] = [];
    for (let i = 0; i < n; i++) {
      const input = bot.next(rig.sim);
      inputs.push(input);
      out.push(...rig.sim.step(input));
    }
    return out;
  };
  return { ...rig, play, inputs };
}
test('bot: Hopper slams with two foes within 40 px and not for one', () => {
  const two = botRig([{ id: 'hopper', level: 5 }], [rat('a', 5, 8), rat('b', 5, 9)]);
  assert.ok(count(two.play(40), 'slam') >= 1);
  const one = botRig([{ id: 'hopper', level: 5 }], [rat('a', 5, 8)]);
  const ev = one.play(80);
  assert.equal(count(ev, 'slam'), 0);
  assert.ok(count(ev, 'haymaker') >= 1);
});

test('bot: Hopper from Lv 6 taps against a plain foe, and against a guard holds the wind-up and breaks the block', () => {
  const plain = botRig([{ id: 'hopper', level: 6 }], [rat('a', 5, 8)]);
  plain.s.heroes[0]!.mp = 0;
  let ringed = false;
  let swings = 0;
  for (let i = 0; i < 120; i++) {
    swings += count(plain.play(1), 'haymaker');
    ringed ||= (plain.sim.view().actors.find((a) => a.id === 'hopper')?.charge ?? 0) > 0;
  }
  assert.ok(swings >= 3, `tapped ${swings} haymakers`);
  assert.ok(!ringed, 'and never held');
  const guard = botRig([{ id: 'hopper', level: 6 }], [rat('g', 6, 8, 'g', { type: 'guard', dir: 'left' })], true);
  const g = guard.s.enemies[0] as Enemy;
  guard.s.heroes[0]!.mp = 0;
  let held = false, broke = false;
  for (let i = 0; i < 200; i++) {
    guard.play(1);
    held ||= (guard.sim.view().actors.find((a) => a.id === 'hopper')?.charge ?? 0) > 0.5;
    broke ||= g.broken > 0;
  }
  assert.ok(held, 'held for the wind-up');
  assert.ok(broke, 'and broke the block');
});

test('bot: Eddie casts the solo with two foes within 56 px and presses nothing until it is over', () => {
  const lone = botRig([{ id: 'eddie', level: 3 }], [rat('a', 5, 8)]);
  assert.equal(count(lone.play(100), 'riff'), 0, 'one foe is not enough');
  const duo = botRig([{ id: 'eddie', level: 3 }], [rat('a', 5, 8), rat('b', 5, 9)]);
  duo.play(5);
  assert.ok(duo.s.t6.stand, 'the solo is playing');
  const from = duo.inputs.length;
  duo.play(100);
  for (const input of duo.inputs.slice(from)) {
    assert.ok(!input.attackHeld && !input.attackPressed && !input.specialPressed && input.mx === 0 && input.my === 0);
  }
  assert.ok(duo.s.t6.stand, 'and it plays on');
});
