// The 4.3 rooftop's sim side (docs/level-12.md, "The roof" and "The fall"): Eddie planted at the front while the song plays, the flock of five that
// circles him and is topped back up, a hit's pulse, a miss's dive, a wipe, the roof ending, and Sim.dismissHero's rules. The whole rooftop chart
// played against a sim is in tests/rooftop-song.test.ts.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { HeroId, Sim, SimEvent } from '../src/core/types.ts';
import { ENEMY_DEFS } from '../src/enemies/index.ts';
import { hitEnemy } from '../src/combat/damage.ts';
import type { Enemy, Hero, S } from '../src/combat/state.ts';
import { arena, idle, inp, makeWhite, ofType, press, run, sfxIds, tc, tf } from './sim-helpers.ts';

const X = ENEMY_DEFS.demobat.x;
const hero = (s: S, i: number): Hero => s.heroes[i] as Hero;
const eddie = (s: S): Hero => s.heroes.find((h) => h.id === 'eddie') as Hero;
const steady = (s: S): void => { s.rng = () => 0.5; };
const dist = (ax: number, ay: number, bx: number, by: number): number => Math.hypot(bx - ax, by - ay);
const roofBats = (s: S): Enemy[] => s.enemies.filter((e) => e.rt === 'roof' && !e.dead && e.hp > 0);
const hurt = (ev: SimEvent[]) => ofType(ev, 'hit').filter((h) => !h.onEnemy);
const up = (sim: Sim): string | undefined => sim.view().hud.party.find((p) => p.active)?.id;
const sim_ = (sim: Sim): Required<Pick<Sim, 'rooftop' | 'soloNote' | 'dismissHero'>> => sim as Required<Pick<Sim, 'rooftop' | 'soloNote' | 'dismissHero'>>;

/** Burrows round the edge of an 18 by 12 deck. */
const BURROWS = [{ tx: 2, ty: 2 }, { tx: 9, ty: 1 }, { tx: 15, ty: 2 }, { tx: 1, ty: 6 }, { tx: 16, ty: 6 }, { tx: 2, ty: 10 }, { tx: 9, ty: 10 }, { tx: 15, ty: 10 }];

/** Mike, Eddie and Lucas at Lv 6 in the middle of a roof deck, Mike up. Fixed rolls. */
function rig(over: Parameters<typeof makeWhite>[0] = {}) {
  const r = makeWhite({
    party: [{ id: 'mike', level: 6 }, { id: 'eddie', level: 6 }, { id: 'lucas', level: 6 }], start: { x: tc(9), y: tf(6) },
    grid: arena(18, 12), burrows: BURROWS, ...over,
  });
  steady(r.s);
  return r;
}
/** The roof on, the flock circling. */
function onRoof(over: Parameters<typeof makeWhite>[0] = {}) {
  const r = rig(over);
  sim_(r.sim).rooftop(true);
  run(r.sim, 120);
  return r;
}
/** Holds a bat still in its wind-up where it stands: a target that does not move or dive. */
function pin(e: Enemy, x: number, y: number): void {
  e.x = x; e.y = y; e.aware = true; e.mode = 'windup'; e.bat!.move = 'wind'; e.bat!.t = 99999;
}

// ------------------------------------------------------------------ the roof is on

test('rooftop(true): Eddie comes to the front and plants himself, and nothing he is given to do moves him', () => {
  const { sim, s } = rig();
  assert.equal(up(sim), 'mike');
  const ev: SimEvent[] = [];
  sim_(sim).rooftop(true);
  ev.push(...run(sim, 3));
  assert.deepEqual(ofType(ev, 'swap').map((e) => [e.from, e.to]), [['mike', 'eddie']]);
  assert.equal(up(sim), 'eddie');
  const e = eddie(s);
  const home = { x: e.x, y: e.y };
  const mp = e.mp;
  run(sim, 30, inp({ mx: 1, my: 0.5 }));
  press(sim, { attackPressed: true }, 30);
  press(sim, { specialPressed: true }, 30);
  assert.deepEqual({ x: e.x, y: e.y }, home, 'he does not walk');
  assert.equal(e.anim, 'cast', 'he is playing');
  assert.equal(e.mp, mp, 'and spends no MP');
  assert.equal(sim.view().fx.some((f) => f.kind === 'slash'), false, 'no swing');
  assert.equal(sim.view().actors.find((a) => a.id === 'eddie' && a.kind === 'hero')?.anim, 'cast');
  const solo = sim.view().hud.solo;
  assert.ok(solo && solo.ring === 40 && solo.streak === 0, 'the HUD says he is soloing');
});

test('swaps do nothing while the song plays: not by slot, not by cycling, not in a forced tick', () => {
  const { sim } = onRoof();
  press(sim, { swapTo: 0 }, 20);
  press(sim, { swapTo: 2 }, 20);
  press(sim, { swapDelta: 1 }, 20);
  press(sim, { swapDelta: -1 }, 20);
  assert.equal(up(sim), 'eddie');
  const ev = run(sim, 30);
  assert.equal(ofType(ev, 'swap').length, 0);
});

test('Eddie already up is not swapped; a party without him does nothing at all', () => {
  const a = rig({ party: [{ id: 'eddie', level: 6 }, { id: 'mike', level: 6 }] });
  sim_(a.sim).rooftop(true);
  assert.equal(ofType(run(a.sim, 3), 'swap').length, 0);
  assert.equal(roofBats(a.s).length, 5);
  const b = rig({ party: [{ id: 'mike', level: 6 }, { id: 'lucas', level: 6 }] });
  sim_(b.sim).rooftop(true);
  sim_(b.sim).soloNote(false, false);
  run(b.sim, 60);
  assert.equal(b.s.roof.on, false);
  assert.equal(b.s.enemies.length, 0);
  assert.equal(b.sim.view().hud.solo, null);
  // A second call is not a second flock.
  const c = rig();
  sim_(c.sim).rooftop(true);
  sim_(c.sim).rooftop(true);
  run(c.sim, 5);
  assert.equal(roofBats(c.s).length, 5);
});

// ------------------------------------------------------------------ the flock

test('a flock of five comes up from the burrows and circles him: run-time bats, awake, in one group', () => {
  const { sim, s } = rig();
  sim_(sim).rooftop(true);
  const bats = roofBats(s);
  assert.equal(bats.length, 5);
  const feet = BURROWS.map((b) => `${b.tx * 16 + 8},${b.ty * 16 + 12}`);
  for (const e of bats) {
    assert.equal(e.group, 'roof');
    assert.equal(e.kind, 'demobat');
    assert.equal(e.aware, true);
    assert.ok(feet.includes(`${e.hx},${e.hy}`), `${e.id} came up at a burrow`);
  }
  assert.equal(new Set(bats.map((e) => `${e.hx},${e.hy}`)).size, 5, 'five different burrows');
  run(sim, 200);
  const h = eddie(s);
  for (const e of bats) {
    if (e.bat!.move === 'orbit') assert.ok(Math.abs(dist(e.x, e.y, h.x, h.y) - 56) < 6, `${e.id} circles at 56 px`);
  }
  assert.equal(sim.view().actors.filter((a) => a.id === 'demobat').length, 5);
});

test('with no burrows listed the flock comes up on open floor round him', () => {
  const { sim, s } = rig({ burrows: [] });
  sim_(sim).rooftop(true);
  assert.equal(roofBats(s).length, 5);
  for (const e of roofBats(s)) assert.ok(dist(e.x, e.y, eddie(s).x, eddie(s).y) < 70);
});

test('on its own clock the flock never dives: the pressure is the misses', () => {
  const { sim, s } = onRoof();
  const hp = eddie(s).hp;
  run(sim, 900);
  assert.equal(eddie(s).hp, hp);
  assert.ok(roofBats(s).every((e) => e.bat!.move === 'orbit'));
});

test('a bat that dies is replaced 45 frames later, and three that die are replaced one every 45 frames', () => {
  const { sim, s } = onRoof();
  const kill = (e: Enemy): void => { e.hp = 1; hitEnemy(s, eddie(s), e, { power: 9, air: true }); };
  /** The frames, counted from the kill, at which the flock gains a bat. */
  const arrivals = (n: number): number[] => {
    for (const e of roofBats(s).slice(0, n)) kill(e);
    const out: number[] = [];
    let last = 5 - n;
    for (let f = 1; f <= 200 && roofBats(s).length < 5; f++) {
      run(sim, 1);
      if (f < 6) { last = roofBats(s).length; continue; }
      if (roofBats(s).length > last) { out.push(f); last = roofBats(s).length; }
    }
    return out;
  };
  const one = arrivals(1);
  assert.equal(one.length, 1);
  assert.ok(one[0]! >= X.roofGap && one[0]! <= X.roofGap + 6, `the bat came ${one[0]} frames after the kill`);
  assert.equal(roofBats(s).length, 5);
  run(sim, 100);
  const three = arrivals(3);
  assert.equal(three.length, 3, 'one at a time');
  assert.equal(three[1]! - three[0]!, X.roofGap);
  assert.equal(three[2]! - three[1]!, X.roofGap);
  assert.equal(roofBats(s).length, 5);
});

test('they pay no XP and drop nothing, whatever the roll', () => {
  const { sim, s } = onRoof();
  s.rng = () => 0;
  const xp0 = sim.party().map((p) => p.xp);
  const e = roofBats(s)[0] as Enemy;
  e.hp = 1;
  hitEnemy(s, eddie(s), e, { power: 9, air: true });
  const ev = run(sim, 8);
  assert.deepEqual(ofType(ev, 'kill').map((k) => [k.kind, k.xp]), [['demobat', 0]]);
  assert.deepEqual(sim.party().map((p) => p.xp), xp0);
  assert.equal(s.items.length, 0);
  assert.equal(sim.stats().xpEarned, 0);
});

// ------------------------------------------------------------------ a hit, a miss

test('a hit pulses his ring: the riff fx and sfx, the bats inside hit and stunned, the ones outside left alone', () => {
  const { sim, s } = onRoof();
  const h = eddie(s);
  const [near, far] = roofBats(s) as [Enemy, Enemy];
  pin(near, h.x + 40, h.y);
  pin(far, h.x, h.y + 70);
  near.z = far.z = 12;
  sim_(sim).soloNote(true, false);
  const ev = run(sim, 1);
  assert.ok(sfxIds(ev).includes('riff'));
  const ring = sim.view().fx.filter((f) => f.kind === 'riff');
  assert.equal(ring.length, 1);
  assert.equal(ring[0]?.w, 96, 'the ring has widened a step, 40 to 48 px: 96 across');
  assert.ok(near.hp < near.hpMax, 'the bat inside is hit at 12 px up');
  assert.ok(near.stat.stun >= 38 && near.stat.stun <= 40, 'and stunned');
  assert.equal(far.hp, far.hpMax, 'a bat at 70 px is outside');
  assert.equal(far.stat.stun, 0);
  assert.equal(sim.view().hud.solo?.ring, 48);
  assert.equal(sim.view().hud.solo?.streak, 1);
});

test('the ring grows a step on a hit, two on a perfect and shrinks a step on a miss, between 24 and 72 px', () => {
  const { sim, s } = onRoof();
  const ring = (): number => sim.view().hud.solo?.ring ?? 0;
  assert.equal(ring(), 40);
  sim_(sim).soloNote(true, false);
  assert.equal(ring(), 48);
  sim_(sim).soloNote(true, true);
  assert.equal(ring(), 64);
  sim_(sim).soloNote(false, false);
  assert.equal(ring(), 56);
  assert.equal(sim.view().hud.solo?.streak, 0, 'a miss ends the streak');
  for (let i = 0; i < 6; i++) sim_(sim).soloNote(true, true);
  assert.equal(ring(), 72, 'no wider than 72');
  for (let i = 0; i < 9; i++) sim_(sim).soloNote(false, false);
  assert.equal(ring(), 24, 'and no narrower than 24');
  assert.ok(s.roof.on);
});

test('a perfect pulse crits every bat it hits', () => {
  const { sim, s } = onRoof();
  const h = eddie(s);
  const e = roofBats(s)[0] as Enemy;
  pin(e, h.x + 30, h.y);
  e.z = 12;
  sim_(sim).soloNote(true, true);
  const ev = run(sim, 1);
  const crits = ofType(ev, 'hit').filter((x) => x.onEnemy).map((x) => x.crit);
  assert.ok(crits.length >= 1 && crits.every(Boolean), 'every hit of a perfect is a crit');
  const plain = onRoof();
  const p = roofBats(plain.s)[0] as Enemy;
  pin(p, eddie(plain.s).x + 30, eddie(plain.s).y);
  p.z = 12;
  sim_(plain.sim).soloNote(true, false);
  const ev2 = run(plain.sim, 1);
  const plains = ofType(ev2, 'hit').filter((x) => x.onEnemy).map((x) => x.crit);
  assert.ok(plains.length === 1 && !plains[0], 'a plain hit is not');
  assert.ok(e.hpMax - e.hp > p.hpMax - p.hp, 'and it hurts more');
});

test('a miss sends the nearest circling bat down at him: the "!", the dive, power 0.6, and he does not flinch', () => {
  const { sim, s } = onRoof();
  const h = eddie(s);
  const bats = roofBats(s);
  // The third is plainly the nearest, on his ring; the rest are well off it.
  bats.forEach((e, i) => { e.x = h.x + (i === 2 ? 54 : 90 + i * 10); e.y = h.y; });
  const nearest = bats[2] as Enemy;
  sim_(sim).soloNote(false, false);
  assert.equal(nearest.bat!.move, 'wind', 'the nearest one is winding up at once');
  assert.equal(nearest.mode, 'windup');
  assert.equal(bats.filter((e) => e !== nearest && e.bat!.move !== 'orbit').length, 0, 'and only that one');
  const home = { x: h.x, y: h.y };
  const dmg: number[] = [];
  let flinched = false;
  for (let f = 0; f < 90; f++) {
    for (const x of hurt(sim.step(idle()))) dmg.push(x.dmg);
    if (h.hurtT > 0 || h.anim === 'hurt') flinched = true;
  }
  assert.equal(dmg.length, 1, 'one dive, one touch');
  assert.equal(dmg[0], Math.max(1, Math.round(X.roofPower * 30 - h.st.def * 0.5)), 'power 0.6 of 30, not 0.8');
  assert.equal(flinched, false, 'he plays on');
  assert.deepEqual({ x: h.x, y: h.y }, home, 'and is not shoved');
  assert.equal(h.anim, 'cast');
});

test('a stunned bat\'s dive is cancelled: the next pulse in the wind-up saves him', () => {
  const { sim, s } = onRoof();
  const h = eddie(s);
  const e = roofBats(s)[0] as Enemy;
  e.x = h.x + 50; e.y = h.y;
  sim_(sim).soloNote(false, false);
  const sent = roofBats(s).find((b) => b.bat!.move === 'wind') as Enemy;
  assert.ok(sent);
  sent.x = h.x + 30; sent.y = h.y;
  run(sim, 5);
  sim_(sim).soloNote(true, false);
  run(sim, 100);
  assert.equal(h.hp, h.st.hp, 'it never touched him');
});

test('two misses in a row send two bats', () => {
  const { sim, s } = onRoof();
  sim_(sim).soloNote(false, false);
  sim_(sim).soloNote(false, false);
  assert.equal(roofBats(s).filter((e) => e.bat!.move === 'wind').length, 2);
});

// ------------------------------------------------------------------ a wipe, and the end

test('Eddie at 0 HP while the song plays is a wipe, whoever else is standing', () => {
  const { sim, s } = onRoof();
  assert.equal(s.heroes.filter((h) => !h.ko).length, 3);
  eddie(s).hp = 0;
  const ev = run(sim, 2);
  assert.deepEqual(ofType(ev, 'heroKO').map((e) => e.hero), ['eddie']);
  assert.equal(ofType(ev, 'allDown').length, 1);
  assert.equal(s.over, true);
  assert.equal(ofType(ev, 'swap').length, 0, 'no one steps in for him');
  assert.equal(s.roof.on, false);
  // Off the roof, the same fall only costs a hero.
  const o = rig({ party: [{ id: 'eddie', level: 6 }, { id: 'mike', level: 6 }] });
  eddie(o.s).hp = 0;
  const ev2 = run(o.sim, 2);
  assert.equal(ofType(ev2, 'allDown').length, 0);
  assert.equal(up(o.sim), 'mike');
});

test('a bat\'s dive that takes his last HP loses the roof', () => {
  const { sim, s } = onRoof();
  const h = eddie(s);
  h.hp = 3;
  sim_(sim).soloNote(false, false);
  const ev = run(sim, 90);
  assert.equal(ofType(ev, 'allDown').length, 1);
  assert.equal(h.ko, true);
});

test('rooftop(false): the stand ends, he walks and swaps again, and the bats stay as they are', () => {
  const { sim, s } = onRoof();
  const before = roofBats(s).map((e) => e.uid);
  sim_(sim).rooftop(false);
  assert.equal(sim.view().hud.solo, null);
  const h = eddie(s);
  const x0 = h.x;
  run(sim, 30, inp({ mx: 1 }));
  assert.ok(h.x > x0 + 10, 'he walks');
  assert.deepEqual(roofBats(s).map((e) => e.uid), before, 'the same five');
  press(sim, { swapTo: 0 }, 20);
  assert.equal(up(sim), 'mike', 'swaps work');
  // Nothing is topped up, nothing dives, and a note now is nothing.
  const e = roofBats(s)[0] as Enemy;
  e.hp = 1;
  hitEnemy(s, h, e, { power: 9, air: true });
  const fx = sim.view().fx.length;
  sim_(sim).soloNote(true, true);
  sim_(sim).soloNote(false, false);
  run(sim, 400);
  assert.equal(roofBats(s).length, 4);
  assert.equal(sim.view().fx.filter((f) => f.kind === 'riff').length, 0);
  assert.ok(sim.view().fx.length <= fx + 40);
  assert.ok(roofBats(s).every((b) => b.bat!.move === 'orbit'));
});

test('a wipe that is got up from ends the roof for the sim', () => {
  const { sim, s } = onRoof();
  eddie(s).hp = 0;
  run(sim, 2);
  sim.healParty(0.5);
  assert.equal(s.roof.on, false);
  assert.equal(s.over, false);
  assert.equal(sim.view().hud.solo, null);
});

// ------------------------------------------------------------------ the fall

const ids = (sim: Sim): string[] => sim.view().hud.party.map((p) => p.id);
const body = (sim: Sim, id: string) => sim.view().actors.find((a) => a.kind === 'hero' && a.id === id);

test('dismissHero: gone from the view and the HUD at once, and party() still reports him with his level', () => {
  const { sim, s } = rig();
  eddie(s).level = 7;
  sim_(sim).dismissHero('eddie');
  assert.deepEqual(ids(sim), ['mike', 'lucas']);
  assert.equal(body(sim, 'eddie'), undefined);
  assert.equal(up(sim), 'mike');
  run(sim, 5);
  assert.deepEqual(ids(sim), ['mike', 'lucas']);
  assert.deepEqual(sim.party().map((p) => [p.id, p.level]), [['mike', 6], ['lucas', 6], ['eddie', 7]]);
  assert.equal(s.heroes.length, 2);
});

test('dismissing the one who is up swaps to the next hero who can fight', () => {
  const { sim, s } = rig({ party: [{ id: 'eddie', level: 6 }, { id: 'mike', level: 6 }, { id: 'lucas', level: 6 }] });
  hero(s, 1).ko = true; hero(s, 1).hp = 0;
  sim_(sim).dismissHero('eddie');
  const ev = run(sim, 2);
  assert.equal(up(sim), 'lucas', 'Mike is down, so Lucas');
  assert.deepEqual(ofType(ev, 'swap').map((e) => [e.from, e.to]), [['eddie', 'lucas']]);
  assert.equal(s.over, false);
  assert.equal(s.heroes[s.active]?.id, 'lucas');
});

test('dismissing a hero on the bench leaves the one who is up where he is, at every index', () => {
  for (const [party, gone, stays] of [
    [['mike', 'eddie', 'lucas'], 'eddie', 'mike'], [['mike', 'lucas', 'eddie'], 'eddie', 'mike'], [['mike', 'eddie', 'lucas'], 'mike', 'eddie'],
  ] as [HeroId[], HeroId, HeroId][]) {
    const { sim, s } = rig({ party: party.map((id) => ({ id, level: 6 })) });
    if (stays !== party[0]) sim_(sim).dismissHero(party[0] as HeroId);
    else sim_(sim).dismissHero(gone);
    run(sim, 3);
    const first = party[0] as HeroId;
    assert.equal(up(sim), stays === first ? first : stays, `${party.join()} without ${gone}`);
    assert.equal(s.heroes[s.active]?.id, up(sim));
  }
});

test('nobody swaps to a dismissed hero, by slot or by cycling, and a swap lands on the right one after the others move up', () => {
  const { sim } = rig();
  sim_(sim).dismissHero('eddie');
  press(sim, { swapTo: 1 }, 20);
  assert.equal(up(sim), 'lucas', 'slot 1 is Lucas now');
  press(sim, { swapDelta: 1 }, 20);
  assert.equal(up(sim), 'mike');
  press(sim, { swapDelta: 1 }, 20);
  assert.equal(up(sim), 'lucas');
  press(sim, { swapTo: 2 }, 20);
  assert.equal(up(sim), 'lucas', 'there is no slot 2');
});

test('a dismissed hero is not counted when the party goes down: the last one standing falling is the end', () => {
  const { sim, s } = rig({ party: [{ id: 'mike', level: 6 }, { id: 'eddie', level: 6 }] });
  sim_(sim).dismissHero('eddie');
  assert.equal(s.over, false);
  hero(s, 0).hp = 0;
  const ev = run(sim, 2);
  assert.equal(ofType(ev, 'allDown').length, 1, 'Eddie is not an Eddie who could stand in');
  assert.equal(s.over, true);
});

test('a dismissed hero earns nothing more, heals nothing, and the last hero cannot be dismissed', () => {
  const { sim, s } = rig({ party: [{ id: 'mike', level: 6 }, { id: 'eddie', level: 6 }], spawns: [{ kind: 'enemy', id: 'b1', type: 'demobat', tx: 12, ty: 6, group: 'g' }] });
  sim_(sim).dismissHero('eddie');
  const xp0 = sim.party().find((p) => p.id === 'eddie')?.xp;
  sim.dev.giveXp(50);
  sim.healParty(1);
  assert.equal(sim.party().find((p) => p.id === 'eddie')?.xp, xp0);
  assert.equal(sim.party().length, 2);
  sim_(sim).dismissHero('mike');
  assert.equal(sim.view().hud.party.length, 1, 'Mike is the last one up and stays');
  sim_(sim).dismissHero('lucas');
  assert.equal(sim.party().length, 2, 'a hero who is not in the party is nothing to dismiss');
  assert.ok(s.enemies.length > 0);
});

test('dismissing Eddie on the roof ends the song for the sim, and the bats that are left circle whoever is up', () => {
  const { sim, s } = onRoof();
  const before = roofBats(s).length;
  sim_(sim).dismissHero('eddie');
  assert.equal(s.roof.on, false);
  assert.equal(up(sim), 'lucas', 'the next in the party');
  run(sim, 200);
  assert.equal(roofBats(s).length, before, 'no top-up');
  const l = s.heroes[s.active] as Hero;
  for (const e of roofBats(s)) if (e.bat!.move === 'orbit') assert.ok(Math.abs(dist(e.x, e.y, l.x, l.y) - 56) < 6, 'they circle Lucas now');
});

test('a cursed or knocked-out hero hanging on is not a hero who can fight: the fall hands over to the one who can', () => {
  const { sim, s } = rig({ party: [{ id: 'eddie', level: 6 }, { id: 'mike', level: 6 }] });
  hero(s, 1).ko = true; hero(s, 1).hp = 0;
  sim_(sim).dismissHero('eddie');
  assert.equal(s.over, true, 'nobody is left to fight');
  assert.equal(s.heroes.length, 1);
  assert.equal(s.active, 0);
  assert.equal(ofType(run(sim, 1), 'allDown').length, 1);
});
