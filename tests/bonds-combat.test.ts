// Bonds in the sim (heroes/bonds.ts, combat/bonds.ts): the party's bonds land on each hero once a tick, follow the roster and not the
// lead, and change what combat reads: ATK, DEF, the speed factor and the crit roll, plus Babysit's heal and the DM screen's cover.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { HeroId } from '../src/core/types.ts';
import { BONDS, NO_MODS, SOLO_EXTRA } from '../src/heroes/bonds.ts';
import type { BondDef } from '../src/heroes/bonds.ts';
import { HERO_DEFS } from '../src/heroes/index.ts';
import { standLife } from '../src/heroes/eddie_solo.ts';
import { speedFactor } from '../src/heroes/common.ts';
import { heroDef } from '../src/heroes/steve_guard.ts';
import { heroAtk, hitEnemy, hurtHero } from '../src/combat/damage.ts';
import { makeHero } from '../src/combat/party.ts';
import type { Hero } from '../src/combat/state.ts';
import { inp, makeWhite, press, rat, run, sfxIds, tc, tf } from './sim-helpers.ts';

const party = (...ids: HeroId[]) => ids.map((id) => ({ id }));
/** A sim with this party, stepped once so the bonds are on. */
function sim(...ids: HeroId[]) {
  const w = makeWhite({ party: party(...ids), seed: 7 });
  w.sim.step(inp());
  return w;
}
const hero = (s: { heroes: Hero[] }, id: HeroId): Hero => s.heroes.find((h) => h.id === id) as Hero;

test('a hero made on its own has no bonds, and a tick gives every hero the bonds of the party they are in', () => {
  assert.equal(makeHero('mike', 1, 0, 0, 0).bond, NO_MODS);
  const w = makeWhite({ party: party('mike', 'eleven', 'lucas', 'max'), seed: 7 });
  assert.equal(hero(w.s, 'mike').bond, NO_MODS, 'nothing before the first tick');
  w.sim.step(inp());
  assert.equal(hero(w.s, 'mike').bond.atk, 0.1);
  assert.equal(hero(w.s, 'eleven').bond.atk, 0.1);
  assert.equal(hero(w.s, 'lucas').bond.spd, 0.1);
  assert.equal(hero(w.s, 'max').bond.spd, 0.1);
  assert.equal(hero(w.s, 'mike').bond.spd, 0);
});

test('a bond follows the roster, not the lead: swapping, a KO and a long fight change nothing', () => {
  const { sim: sm, s } = sim('dustin', 'mike', 'eleven');
  const lead = s.heroes[0] as Hero;
  assert.equal(lead.id, 'dustin');
  assert.equal(hero(s, 'mike').bond.atk, 0.1, 'Mike is on the bench and has it');
  assert.equal(hero(s, 'eleven').bond.atk, 0.1);
  press(sm, { swapTo: 1 }, 30);
  assert.equal(s.active, 1);
  assert.equal(hero(s, 'mike').bond.atk, 0.1);
  hero(s, 'eleven').ko = true;
  hero(s, 'eleven').hp = 0;
  run(sm, 30);
  assert.equal(hero(s, 'mike').bond.atk, 0.1, 'a hero who is down is still in the party');
  assert.equal(hero(s, 'eleven').bond.atk, 0.1);
});

test('a hero who joins mid-stage completes a bond on the next tick', () => {
  const { sim: sm, s } = sim('mike', 'lucas');
  assert.equal(hero(s, 'mike').bond.atk, 0);
  sm.recruit('eleven');
  assert.equal(hero(s, 'mike').bond.atk, 0, 'not until the tick');
  sm.step(inp());
  assert.equal(hero(s, 'mike').bond.atk, 0.1);
  assert.equal(hero(s, 'eleven').bond.atk, 0.1);
});

test('Friends don\'t lie: both hit 10% harder, and nobody else does', () => {
  const { s } = sim('mike', 'eleven', 'dustin');
  for (const id of ['mike', 'eleven'] as const) assert.ok(Math.abs(heroAtk(s, hero(s, id)) / hero(s, id).st.atk - 1.1) < 1e-9, id);
  assert.equal(heroAtk(s, hero(s, 'dustin')), hero(s, 'dustin').st.atk);
  const plain = sim('mike', 'dustin', 'lucas');
  assert.equal(heroAtk(plain.s, hero(plain.s, 'mike')), hero(plain.s, 'mike').st.atk);
});

test('it multiplies with Inspiration and Rally, it does not replace them', () => {
  const { s } = sim('mike', 'eleven');
  s.inspire = 100;
  const m = hero(s, 'mike');
  assert.ok(Math.abs(heroAtk(s, m) / m.st.atk - 1.1 * 1.15) < 1e-9);
});

test('Party of four: Mike, Dustin, Lucas and Will take hits 8% better, and three of them do not', () => {
  const dmg = (...ids: HeroId[]): number => {
    const w = makeWhite({ party: party(...ids), seed: 7 });
    w.sim.step(inp());
    for (const h of w.s.heroes) { h.st.def = 100; h.hp = h.st.hp = 9999; }
    return hurtHero(w.s, hero(w.s, 'mike'), 0, 0, 1, 200);
  };
  const plain = dmg('mike', 'dustin', 'lucas', 'robin'), four = dmg('mike', 'dustin', 'lucas', 'will');
  // DEF 100 is 108: four more off the hit, before the difficulty factor.
  assert.ok(plain - four >= 3 && plain - four <= 4, `${plain} becomes ${four}`);
  const { s } = sim('mike', 'dustin', 'lucas', 'will');
  const m = hero(s, 'mike');
  assert.ok(Math.abs(heroDef(s, m) / m.st.def - 1.08) < 1e-9);
  const withBabysit = sim('mike', 'dustin', 'lucas', 'will');
  withBabysit.s.babysit = 100;
  assert.ok(Math.abs(heroDef(withBabysit.s, hero(withBabysit.s, 'mike')) / m.st.def - 1.08 * 1.15) < 1e-9, 'with Babysit the two multiply');
});

test('Mad Max: Lucas and Max walk and swing 10% faster, and the others do not', () => {
  const { s } = sim('lucas', 'max', 'mike');
  assert.ok(Math.abs(speedFactor(hero(s, 'lucas')) / (1 + 0.015 * (hero(s, 'lucas').st.spd - 10)) - 1.1) < 1e-9);
  assert.equal(speedFactor(hero(s, 'mike')), 1);
  const walked = (...ids: HeroId[]): number => {
    const w = makeWhite({ party: party(...ids), start: { x: tc(2), y: tf(8) }, seed: 7 });
    const x0 = w.sim.heroPos().x;
    run(w.sim, 60, inp({ mx: 1 }));
    return w.sim.heroPos().x - x0;
  };
  const ratio = walked('lucas', 'max') / walked('lucas', 'mike');
  assert.ok(ratio > 1.09 && ratio < 1.11, `Lucas walks ${ratio.toFixed(3)} times as far`);
  const cd = (...ids: HeroId[]): number => {
    const w = makeWhite({ party: party(...ids), seed: 7 });
    w.sim.step(inp());
    press(w.sim, { attackPressed: true });
    return hero(w.s, 'lucas').cdBasic;
  };
  assert.ok(cd('lucas', 'max') < cd('lucas', 'mike'), 'and his rocket is ready sooner');
});

test('Scoops troop: Steve and Robin crit 10 points more often', () => {
  const crits = (...ids: HeroId[]): number => {
    const w = makeWhite({ party: party(...ids), seed: 11, spawns: [rat('dummy', 8, 8)] });
    w.sim.step(inp());
    const e = w.s.enemies[0]!;
    let n = 0;
    for (let i = 0; i < 2000; i++) {
      e.hp = 1e9; e.dead = false;
      hitEnemy(w.s, hero(w.s, 'steve'), e, { power: 1 });
      for (const ev of w.s.events) if (ev.t === 'hit' && ev.onEnemy && ev.crit) n++;
      w.s.events = [];
    }
    return n;
  };
  const plain = crits('steve', 'mike'), scoops = crits('steve', 'robin');
  assert.ok(plain > 70 && plain < 135, `5% of 2000 is 100 (${plain})`);
  assert.ok(scoops > 250 && scoops < 350, `15% of 2000 is 300 (${scoops})`);
});

test('Babysitter\'s club: Babysit also heals Dustin a fifth of his HP, bench or not, and never wakes him up', () => {
  const cast = (ids: HeroId[], prep: (d: Hero) => void) => {
    const w = makeWhite({ party: party(...ids), seed: 7 });
    w.sim.step(inp());
    const d = w.s.heroes.find((h) => h.id === 'dustin');
    if (d) prep(d);
    const ev = press(w.sim, { specialPressed: true }, 12);
    return { w, d, ev };
  };
  const hurt = (d: Hero): void => { d.hp = 10; };
  const club = cast(['steve', 'dustin', 'mike'], hurt);
  const heal = Math.round((club.d as Hero).st.hp * 0.2);
  // The bench also regenerates 2% a second, a fraction of a point over the 12 frames.
  assert.ok(Math.abs((club.d as Hero).hp - (10 + heal)) < 0.5, `a fifth of 38 is 8, Dustin is at ${(club.d as Hero).hp}`);
  assert.ok(club.w.sim.view().fx.some((f) => f.kind === 'heal'), 'a heal fx on Dustin');
  assert.ok(sfxIds(club.ev).includes('heal'));
  assert.ok(club.w.s.babysit > 0, 'and Babysit itself is up');
  // Without the bond, Babysit leaves Dustin alone; without Dustin there is nothing to heal and nothing breaks.
  const none = cast(['steve', 'robin', 'mike', 'lucas'], hurt);
  assert.equal(none.d, undefined);
  // A Dustin who is down stays down, and one at full health gets no floater.
  const down = cast(['steve', 'dustin'], (d) => { d.ko = true; d.hp = 0; });
  assert.equal((down.d as Hero).hp, 0);
  assert.equal((down.d as Hero).ko, true);
  const full = cast(['steve', 'dustin'], () => undefined);
  assert.equal((full.d as Hero).hp, (full.d as Hero).st.hp);
  assert.ok(!full.w.sim.view().fx.some((f) => f.kind === 'heal'));
  // Never past his max.
  const near = cast(['steve', 'dustin'], (d) => { d.hp = d.st.hp - 2; });
  assert.equal((near.d as Hero).hp, (near.d as Hero).st.hp);
});

test('Babysit with no Dustin in the party heals nobody else', () => {
  const w = makeWhite({ party: party('steve', 'mike', 'lucas'), seed: 7 });
  w.sim.step(inp());
  const mike = hero(w.s, 'mike');
  mike.hp = 10;
  press(w.sim, { specialPressed: true }, 12);
  assert.ok(mike.hp <= 10 + 1, `Mike is at ${mike.hp}`);
});

/** Mike casts the DM screen facing down, then Eleven (or Lucas) steps into his place. Returns the sim and the new active hero. */
function behindScreen(second: HeroId) {
  const w = makeWhite({ party: party('mike', second), seed: 7 });
  w.sim.step(inp());
  press(w.sim, { specialPressed: true }, 12);
  assert.ok(w.s.shield, 'the screen is up');
  press(w.sim, { swapTo: 1 }, 30);
  const h = w.s.heroes[w.s.active] as Hero;
  assert.equal(h.id, second);
  h.st.def = 0; h.hp = h.st.hp = 9999;
  return { ...w, h };
}
/** What a hit from straight above does to the active hero: the screen is below them, so the line of fire never crosses it. */
const hitFromAbove = (w: { s: Parameters<typeof hurtHero>[0]; h: Hero }): number => hurtHero(w.s, w.h, w.h.x, w.h.y - 70, 1, 200);

test('Friends don\'t lie: the DM screen covers Eleven from every side, halving the hit, where it would not cover Lucas', () => {
  const eleven = behindScreen('eleven'), lucas = behindScreen('lucas');
  assert.equal(eleven.s.shield?.x, lucas.s.shield?.x, 'the same screen in the same place');
  const covered = hitFromAbove(eleven), bare = hitFromAbove(lucas);
  assert.ok(Math.abs(covered / bare - 0.5) < 0.06, `${bare} becomes ${covered}`);
});

test('the cover is only near the screen and only while it stands, and it is Eleven\'s: Mike gets the line of fire and no more', () => {
  const w = behindScreen('eleven');
  const near = hitFromAbove(w);
  w.h.invuln = 0;
  w.h.x += 60;
  const far = hitFromAbove(w);
  assert.ok(far > near * 1.8, `out of reach, ${near} is ${far}`);
  w.h.invuln = 0; w.h.x -= 60;
  w.s.shield = null;
  const gone = hitFromAbove(w);
  assert.ok(gone > near * 1.8, `and with the screen down, ${gone}`);
  // Mike himself, standing at the dome with a hit coming from behind it, is covered by the dome and not by the bond.
  const m = makeWhite({ party: party('mike', 'eleven'), seed: 7 });
  m.sim.step(inp());
  press(m.sim, { specialPressed: true }, 12);
  const mike = m.s.heroes[0] as Hero;
  mike.st.def = 0; mike.hp = mike.st.hp = 9999;
  assert.equal(mike.bond.cover, 0);
  const a = hurtHero(m.s, mike, mike.x, mike.y - 70, 1, 200);
  mike.invuln = 0;
  const b = hurtHero(m.s, mike, mike.x, mike.y + 70, 1, 200);
  assert.ok(b < a * 0.6, `the screen is below him: from below ${b}, from above ${a}`);
});

test('a lone Eleven, or Eleven beside someone other than Mike, has no cover', () => {
  const w = makeWhite({ party: party('eleven', 'lucas'), seed: 7 });
  w.sim.step(inp());
  assert.equal(hero(w.s, 'eleven').bond.cover, 0);
});

test('Chief and kid: Hopper and Eleven take hits 10% better, bench or not, and nobody else does', () => {
  const { s } = sim('hopper', 'mike', 'eleven');
  for (const id of ['hopper', 'eleven'] as const) {
    const h = hero(s, id);
    assert.equal(h.bond.def, 0.1, id);
    assert.ok(Math.abs(heroDef(s, h) / h.st.def - 1.1) < 1e-9, `${id}'s DEF reads the bond`);
  }
  assert.equal(hero(s, 'mike').bond.def, 0, 'Mike is only beside them');
  const bench = sim('mike', 'hopper', 'eleven');
  assert.equal(hero(bench.s, 'eleven').bond.def, 0.1, 'Eleven leads and Hopper waits');
  const alone = sim('hopper', 'mike', 'lucas');
  assert.equal(hero(alone.s, 'hopper').bond.def, 0, 'Hopper without Eleven');
  const dmg = (...ids: HeroId[]): number => {
    const w = makeWhite({ party: party(...ids), seed: 7 });
    w.sim.step(inp());
    for (const h of w.s.heroes) { h.st.def = 100; h.hp = h.st.hp = 9999; }
    return hurtHero(w.s, hero(w.s, 'hopper'), 0, 0, 1, 200);
  };
  const plain = dmg('hopper', 'mike', 'lucas'), chief = dmg('hopper', 'eleven', 'lucas');
  // DEF 100 is 110: five more off the hit, before the difficulty factor.
  assert.ok(plain - chief >= 4 && plain - chief <= 6, `${plain} becomes ${chief}`);
});

test('Hellfire: the stand lasts 480 frames with Dustin in the party and 360 without, and the bond is the only thing that says so', () => {
  const life = (...ids: HeroId[]): number | undefined => {
    const w = makeWhite({ party: party(...ids), seed: 7 });
    hero(w.s, 'eddie').mp = 18;
    press(w.sim, { specialPressed: true });
    return w.sim.view().hud.solo?.life;
  };
  assert.equal(life('eddie', 'dustin'), 480);
  assert.equal(life('eddie', 'mike', 'dustin'), 480, 'Dustin waits on the bench');
  assert.equal(life('eddie', 'mike', 'lucas'), 360);
  assert.equal(life('eddie'), 360);
  const { s } = sim('eddie', 'dustin');
  assert.equal(hero(s, 'eddie').bond.solo, SOLO_EXTRA);
  assert.equal(hero(s, 'dustin').bond.solo, 0);
  assert.equal(standLife(hero(s, 'eddie')), HERO_DEFS.eddie.special.dur + SOLO_EXTRA);
  const hellfire = BONDS.find((b) => b.id === 'hellfire') as BondDef;
  hellfire.on = false;
  try {
    assert.equal(life('eddie', 'dustin'), 360, 'switch the bond off and Dustin buys nothing: one source, no double count');
  } finally {
    hellfire.on = true;
  }
  const down = sim('eddie', 'mike', 'dustin');
  hero(down.s, 'dustin').ko = true;
  hero(down.s, 'dustin').hp = 0;
  hero(down.s, 'eddie').mp = 18;
  press(down.sim, { specialPressed: true });
  assert.equal(down.sim.view().hud.solo?.life, 480, 'a bond follows the roster, and a KO\'d Dustin is still in it');
});
