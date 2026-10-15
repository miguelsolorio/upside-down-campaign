// Will (docs/level-4.md): the sketch bolt, the Fireball and its d20, Cold spot and the hidden spawns it shows.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRng } from '../src/core/rng.ts';
import { HERO_DEFS } from '../src/heroes/defs.ts';
import { ENEMY_DEFS } from '../src/enemies/defs.ts';
import { damageRange, hitEnemy } from '../src/combat/damage.ts';
import type { Enemy, Hero } from '../src/combat/state.ts';
import type { FxView, SimEvent, SimSpawn } from '../src/core/types.ts';
import { agent, inp, makeWhite, ofType, press, rat, run, sfxIds, tc, tf } from './sim-helpers.ts';

const WILL = HERO_DEFS.will;
const east = { mx: 0.2 };
/** The first number the sim's rng gives for a seed, as a d20: the Fireball's roll when nothing else has drawn before it. */
const firstRoll = (seed: number): number => 1 + Math.floor(createRng(seed)() * 20);
const seedWhere = (pred: (roll: number) => boolean): number => {
  for (let seed = 1; seed < 2000; seed++) if (pred(firstRoll(seed))) return seed;
  throw new Error('no seed');
};

/** Will Lv 3 at tile (5, 8) facing east, a quiet agent 80 px ahead (it never attacks: its timer is parked). */
function fireRig(seed: number, extra: SimSpawn[] = []) {
  const r = makeWhite({ party: [{ id: 'will', level: 3 }], start: { x: tc(5), y: tf(8) }, spawns: [agent('a', 10, 8, 'g'), ...extra], seed });
  for (const e of r.s.enemies) e.cd = 99999;
  return r;
}
/** Casts east and records the burst fx (it only lasts 16 frames) and every floater that showed. */
function watch(r: ReturnType<typeof fireRig>, frames = 90) {
  const ev: SimEvent[] = [];
  let blast: FxView | undefined;
  const floaters = new Set<string>();
  for (let f = 0; f < frames; f++) {
    ev.push(...r.sim.step(inp(f === 0 ? { ...east, specialPressed: true } : {})));
    const v = r.sim.view();
    blast ??= v.fx.find((x) => x.kind === 'blast') && { ...v.fx.find((x) => x.kind === 'blast') as FxView };
    for (const fl of v.floaters) floaters.add(fl.text);
  }
  return { ...r, ev, blast, floaters };
}
const cast = (seed: number) => watch(fireRig(seed));

test('will: the kit numbers', () => {
  assert.deepEqual([WILL.utilities, WILL.basic.power, WILL.basic.x.speed, WILL.special.mp, WILL.special.x.base], [['sense'], 1.3, 2.2, 10, 16]);
  assert.equal(WILL.talent.name, 'Cold spot');
});

test('sketch bolt: a slow bolt in the eight directions, power 1.3, drawn as a bolt', () => {
  for (const [mx, my, vx, vy] of [[0.2, 0, 1, 0], [0, -0.2, 0, -1], [0.2, 0.2, 0.707, 0.707], [-0.2, -0.2, -0.707, -0.707]] as const) {
    const { sim, s } = makeWhite({ party: [{ id: 'will', level: 3 }], start: { x: tc(10), y: tf(8) }, spawns: [] });
    press(sim, { mx, my, attackPressed: true }, 8);
    const bolt = s.projs.find((p) => p.kind === 'bolt');
    assert.ok(bolt, `a bolt for ${vx},${vy}`);
    assert.ok(Math.abs(bolt.vx - vx * WILL.basic.x.speed) < 0.01 && Math.abs(bolt.vy - vy * WILL.basic.x.speed) < 0.01);
    assert.equal(sim.view().fx.filter((f) => f.kind === 'bolt').length, 1);
    assert.equal(bolt.power, 1.3);
  }
});

test('sketch bolt: it hits an agent for power 1.3, reaches 120 px and no further', () => {
  const { sim, s } = makeWhite({ party: [{ id: 'will', level: 3 }], start: { x: tc(5), y: tf(8) }, spawns: [agent('near', 11, 8, 'g'), agent('far', 18, 8, 'g')] });
  for (const e of s.enemies) e.cd = 99999;
  const ev = press(sim, { ...east, attackPressed: true }, 90);
  const hits = ofType(ev, 'hit').filter((h) => h.onEnemy);
  assert.equal(hits.length, 1, 'only the near one');
  const range = damageRange(1.3, (s.heroes[0] as Hero).st.atk, ENEMY_DEFS.agent.def);
  const dmg = hits[0]?.dmg ?? 0;
  assert.ok((dmg >= range.min && dmg <= range.max) || (dmg >= range.min * 2 && dmg <= range.max * 2), `${dmg}, expected ${range.min} to ${range.max} (or double on a crit)`);
  assert.equal(s.enemies[1]?.hp, s.enemies[1]?.hpMax, 'the far one is out of range');
  assert.equal(s.projs.length, 0);
});

test('sketch bolt: it kills a rat in one to three hits and an agent in three to five, like everyone\'s basic attack', () => {
  const hitsFor = (kind: 'rat' | 'agent', seed: number): number => {
    const spawn = kind === 'rat' ? rat('x', 11, 8, 'g') : agent('x', 11, 8, 'g');
    const { sim, s } = makeWhite({ party: [{ id: 'will', level: 1 }], start: { x: tc(5), y: tf(8) }, spawns: [spawn], seed });
    const e = s.enemies[0] as Enemy;
    e.cd = 99999; e.wanderT = 1e9;
    let hits = 0;
    for (let f = 0; f < 900 && sim.enemiesAlive() > 0; f++) hits += ofType(sim.step(inp({ ...east, attackHeld: true })), 'hit').filter((h) => h.onEnemy).length;
    assert.equal(sim.enemiesAlive(), 0, `${kind} seed ${seed} died`);
    return hits;
  };
  let rMax = 0, aMin = 99, aMax = 0;
  for (let seed = 1; seed <= 40; seed++) {
    rMax = Math.max(rMax, hitsFor('rat', seed));
    const a = hitsFor('agent', seed);
    aMin = Math.min(aMin, a); aMax = Math.max(aMax, a);
  }
  assert.ok(rMax <= 3, `a rat took up to ${rMax} bolts`);
  assert.ok(aMin >= 2 && aMax <= 5, `agents took ${aMin} to ${aMax}`);
});

test('fireball: the d20 comes from the sim\'s rng. A 1 fizzles with a FIZZLE floater and no damage', () => {
  const seed = seedWhere((n) => n === 1);
  const r = cast(seed);
  assert.ok(r.floaters.has('FIZZLE'));
  assert.equal(r.blast, undefined, 'no burst');
  assert.equal(r.s.enemies[0]?.hp, r.s.enemies[0]?.hpMax);
  assert.equal(ofType(r.ev, 'hit').filter((h) => h.onEnemy).length, 0);
  assert.equal(ofType(r.ev, 'natTwenty').length, 0);
});

test('fireball: a 20 doubles the radius and shows NAT 20', () => {
  const seed = seedWhere((n) => n === 20);
  const r = cast(seed);
  assert.equal(r.blast?.w, 2 * 2 * (16 + 20), 'a 72 px radius');
  assert.ok(r.floaters.has('NAT 20'));
  assert.deepEqual(ofType(r.ev, 'natTwenty'), [{ t: 'natTwenty', hero: 'will', source: 'crit' }]);
  assert.ok((r.s.enemies[0]?.hp ?? 0) < (r.s.enemies[0]?.hpMax ?? 0));
});

test('fireball: any other roll bursts 16 plus the roll px out, on the first enemy it meets, for power 2', () => {
  for (const want of [2, 7, 13, 19]) {
    const seed = seedWhere((n) => n === want);
    const r = cast(seed);
    assert.equal(r.blast?.w, 2 * (16 + want), `roll ${want}`);
    assert.equal(r.blast?.w, r.blast?.h);
    assert.ok(!r.floaters.has('FIZZLE') && !r.floaters.has('NAT 20'));
    const hits = ofType(r.ev, 'hit').filter((h) => h.onEnemy);
    assert.equal(hits.length, 1);
    const range = damageRange(2, (r.s.heroes[0] as Hero).st.atk, ENEMY_DEFS.agent.def);
    assert.ok((hits[0]?.dmg ?? 0) >= range.min && (hits[0]?.dmg ?? 0) <= range.max, `roll ${want}: ${hits[0]?.dmg}`);
    // The ball burst on the agent, 80 px out, not at the end of its 96 px flight.
    assert.ok(Math.abs((r.blast?.x ?? 0) - (tc(10) - 6)) < 12, `burst at ${r.blast?.x}`);
  }
});

test('fireball: with nothing in its way it bursts at the end of its flight, and the radius decides who is caught', () => {
  const side = (roll: number): { hit: boolean } => {
    const seed = seedWhere((n) => n === roll);
    // Will faces east and nothing is in the line; two agents wait beside where the ball ends, 96 px out.
    const r = makeWhite({ party: [{ id: 'will', level: 3 }], start: { x: tc(5), y: tf(8) }, spawns: [agent('a', 11, 8 - 3, 'g')], seed });
    for (const e of r.s.enemies) e.cd = 99999;
    const { blast } = watch(r);
    assert.ok(blast, `a burst for roll ${roll}`);
    assert.ok(Math.abs(blast.x - (tc(5) + 4 + 96)) < 6, `the end of the flight, ${blast.x}`);
    const e = r.s.enemies[0] as Enemy;
    return { hit: e.hp < e.hpMax };
  };
  // The agent stands 48 px off the line: only the big burst reaches it.
  assert.equal(side(20).hit, true, 'a 20 reaches 76 px');
  assert.equal(side(5).hit, false, 'a 5 reaches 21');
});

test('fireball: it is the same fireball for the same seed, and one in twenty fizzles over many', () => {
  const a = cast(12), b = cast(12);
  assert.equal(a.blast?.w, b.blast?.w);
  let fizzles = 0, nats = 0;
  for (let seed = 1; seed <= 200; seed++) {
    const r = watch(fireRig(seed), 70);
    if (r.floaters.has('FIZZLE')) fizzles++;
    if (ofType(r.ev, 'natTwenty').length > 0) nats++;
  }
  assert.ok(fizzles >= 4 && fizzles <= 18, `${fizzles} fizzles in 200`);
  assert.ok(nats >= 4 && nats <= 18, `${nats} natural 20s in 200`);
});

test('fireball: it costs 10 MP, and Will without the MP does not throw it', () => {
  const { sim, s } = makeWhite({ party: [{ id: 'will', level: 3 }], start: { x: tc(5), y: tf(8) }, spawns: [] });
  const will = s.heroes[0] as Hero;
  const mp = will.mp;
  const ev = press(sim, { ...east, specialPressed: true }, 4);
  assert.ok(Math.abs(mp - will.mp - 10) < 0.5);
  assert.ok(sfxIds(ev).includes('flame'));
  will.mp = 3;
  will.cdSpecial = 0;
  press(sim, { ...east, specialPressed: true }, 4);
  assert.ok(Math.abs(will.mp - 3) < 0.5, 'and no MP was spent');
});

// ---------------------------------------------------------------- Cold spot
const vine = (id: string, tx: number, ty: number, extra: Partial<Extract<SimSpawn, { kind: 'enemy' }>> = {}): SimSpawn =>
  ({ kind: 'enemy', id, type: 'vine', tx, ty, group: 'corn', hidden: true, ...extra });
const seen = (r: ReturnType<typeof makeWhite>, kind = 'vine'): boolean | undefined => r.sim.view().actors.find((a) => a.id === kind)?.hidden;

function shownAt(level: number, dx: number, mikeFirst = false): boolean | undefined {
  const will = { id: 'will' as const, level }, mike = { id: 'mike' as const, level: 5 };
  const r = makeWhite({ party: mikeFirst ? [mike, will] : [will, mike], start: { x: tc(10) - dx, y: tf(8) }, spawns: [vine('v', 10, 8)], seed: 2 });
  (r.s.enemies[0] as Enemy).cd = 99999;
  run(r.sim, 2);
  return seen(r);
}

test('cold spot: from Lv 3, hidden spawns within 72 px show while Will is the active hero, and not otherwise', () => {
  assert.equal(shownAt(3, 60), false, 'Lv 3, 60 px: shown');
  assert.equal(shownAt(3, 70), false, '70 px is still in');
  assert.equal(shownAt(3, 80), true, '80 px: still hidden');
  assert.equal(shownAt(2, 40), true, 'before Lv 3 there is no Cold spot');
  assert.equal(shownAt(3, 40, true), true, 'Mike in front: hidden');
});

test('cold spot: an ordinary enemy has no hidden flag at all', () => {
  const r = makeWhite({ party: [{ id: 'will', level: 3 }], start: { x: tc(5), y: tf(8) }, spawns: [rat('r', 7, 8)] });
  assert.equal(r.sim.view().actors.find((a) => a.id === 'rat')?.hidden, undefined);
});

test('cold spot: a hidden enemy shows itself for good by attacking, even to a hero who cannot feel it', () => {
  const r = makeWhite({ party: [{ id: 'mike', level: 5 }], start: { x: tc(10) - 20, y: tf(8) }, spawns: [vine('v', 10, 8)] });
  assert.equal(seen(r), true);
  const e = r.s.enemies[0] as Enemy;
  run(r.sim, 20);
  assert.equal(seen(r), true, 'hidden while it waits');
  for (let i = 0; i < 80 && e.mode !== 'windup'; i++) run(r.sim, 1);
  assert.equal(e.mode, 'windup');
  assert.equal(seen(r), false, 'its wind-up shows it');
  r.sim.dev.teleport(tc(10) - 120, tf(8));
  run(r.sim, 80);
  assert.equal(seen(r), false, 'and it stays shown');
});

/** The damage of one fixed hit on a vine 40 px or `dist` px from Will (the same seed, so the same roll). */
function vineHit(level: number, hidden: boolean, dist: number, byMike = false): number {
  const r = makeWhite({ party: [{ id: 'will', level }, { id: 'mike', level: 5 }], start: { x: tc(10) - dist, y: tf(8) }, seed: 9,
    spawns: [{ kind: 'enemy', id: 'v', type: 'vine', tx: 10, ty: 8, group: 'corn', ...(hidden ? { hidden: true } : {}) }] });
  return hitEnemy(r.s, r.s.heroes[byMike ? 1 : 0] as Hero, r.s.enemies[0] as Enemy, { power: 3, noCrit: true });
}

test('cold spot: hidden enemies near Will take 15 percent more, from his hits and from the rest of the party', () => {
  const plain = vineHit(3, false, 40);
  assert.ok(plain > 10);
  assert.equal(vineHit(3, true, 40), Math.round(plain * 1.15));
  assert.equal(vineHit(3, true, 90), plain, 'out of reach of Cold spot');
  assert.equal(vineHit(2, true, 40), vineHit(2, false, 40), 'no bonus before Lv 3');
  const mikeHit = vineHit(3, false, 40, true);
  assert.equal(vineHit(3, true, 40, true), Math.round(mikeHit * 1.15), 'Mike\'s hit counts too while Will is in front');
});
