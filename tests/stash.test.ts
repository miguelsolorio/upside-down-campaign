// Erica's stash (docs/level-7.md, "Erica and the stash"): the sim spends it by itself. An Eggo when the active hero stands under
// 25 percent HP (at most every 120 frames), a Coke when Special is pressed short of MP, and the special fires on that same press.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { HERO_DEFS } from '../src/heroes/index.ts';
import { COKE_MP, EGGO_HEAL } from '../src/combat/pickups.ts';
import { inp, makeWhite, ofType, press, run, sfxIds } from './sim-helpers.ts';

const stashed = (eggo: number, coke: number) => ({ stash: { eggo, coke } });

test('Eggo: under 25 percent HP the active hero eats one: 40 percent of max HP, an EGGO floater, stash sfx, stashUsed, one less', () => {
  const { sim, s } = makeWhite({ party: [{ id: 'mike', level: 5 }], ...stashed(2, 1) });
  const h = s.heroes[0]!;
  h.hp = h.st.hp * 0.24;
  const ev = sim.step(inp());
  assert.deepEqual(ofType(ev, 'stashUsed'), [{ t: 'stashUsed', item: 'eggo' }]);
  assert.ok(sfxIds(ev).includes('stash'));
  assert.ok(Math.abs(h.hp - (h.st.hp * 0.24 + Math.round(h.st.hp * EGGO_HEAL))) < 1e-6, `healed to ${h.hp}`);
  const view = sim.view();
  assert.ok(view.floaters.some((f) => f.text === 'EGGO'), 'an EGGO floater');
  assert.ok(view.floaters.some((f) => f.text === `+${Math.round(h.st.hp * EGGO_HEAL)}`), 'and the number');
  assert.deepEqual(view.hud.stash, { eggo: 1, coke: 1 });
  assert.deepEqual(s.stash, { eggo: 1, coke: 1 });
  assert.equal(ofType(run(sim, 30), 'stashUsed').length, 0, 'healthy again, so no second one');
});

test('Eggo: the line is strictly under a quarter of max HP', () => {
  const at = makeWhite({ party: [{ id: 'mike', level: 5 }], ...stashed(3, 0) });
  const h = at.s.heroes[0]!;
  h.hp = h.st.hp * 0.25;
  assert.equal(ofType(run(at.sim, 5), 'stashUsed').length, 0, 'exactly a quarter is not under it');
  const just = makeWhite({ party: [{ id: 'mike', level: 5 }], ...stashed(3, 0) });
  const j = just.s.heroes[0]!;
  j.hp = j.st.hp * 0.25 - 0.1;
  assert.equal(ofType(run(just.sim, 1), 'stashUsed').length, 1, 'just under it eats one');
});

test('Eggo: at most one every 120 frames', () => {
  const { sim, s } = makeWhite({ party: [{ id: 'mike', level: 5 }], ...stashed(3, 0) });
  const h = s.heroes[0]!;
  h.hp = 1;
  const first = ofType(sim.step(inp()), 'stashUsed').length;
  assert.equal(first, 1);
  // Knocked back under a quarter at once.
  h.hp = 1;
  const early = ofType(run(sim, 119), 'stashUsed').length;
  assert.equal(early, 0, 'not within 120 frames of the last one');
  const later = ofType(run(sim, 3), 'stashUsed').length;
  assert.equal(later, 1, 'then the next');
  assert.equal(s.stash.eggo, 1);
});

test('Eggo: not for a benched hero, a knocked-out one, or an empty stash', () => {
  const bench = makeWhite({ party: [{ id: 'mike', level: 5 }, { id: 'dustin', level: 4 }], ...stashed(2, 0) });
  const d = bench.s.heroes[1]!;
  d.hp = 1;
  assert.equal(ofType(run(bench.sim, 30), 'stashUsed').length, 0, 'the bench is not fed');
  const ko = makeWhite({ party: [{ id: 'mike', level: 5 }, { id: 'dustin', level: 4 }], ...stashed(2, 0) });
  const m = ko.s.heroes[0]!;
  m.hp = 0; m.ko = true;
  assert.equal(ofType(run(ko.sim, 10), 'stashUsed').length, 0, 'a knocked-out hero is not standing');
  const none = makeWhite({ party: [{ id: 'mike', level: 5 }] });
  none.s.heroes[0]!.hp = 1;
  assert.equal(ofType(run(none.sim, 30), 'stashUsed').length, 0);
  assert.deepEqual(none.sim.view().hud.stash, { eggo: 0, coke: 0 });
});

test('Eggo: the hero who is swapped in low eats it when they take the field', () => {
  const { sim, s } = makeWhite({ party: [{ id: 'mike', level: 5 }, { id: 'dustin', level: 4 }], ...stashed(1, 0) });
  const d = s.heroes[1]!;
  d.hp = 2;
  const ev = [...sim.step(inp({ swapTo: 1 })), ...run(sim, 3)];
  assert.equal(ofType(ev, 'stashUsed').length, 1);
  assert.ok(d.hp > 2);
});

test('Coke: Special pressed short of MP drinks one: half the max MP, a COKE floater, stash sfx, stashUsed, one less, and the special fires on that press', () => {
  const { sim, s } = makeWhite({ party: [{ id: 'dustin', level: 4 }], ...stashed(0, 2) });
  const h = s.heroes[0]!;
  const cost = HERO_DEFS.dustin.special.mp;
  h.mp = 1;
  const ev = sim.step(inp({ specialPressed: true, mx: 0.2 }));
  assert.deepEqual(ofType(ev, 'stashUsed'), [{ t: 'stashUsed', item: 'coke' }]);
  assert.ok(sfxIds(ev).includes('stash'));
  assert.ok(sfxIds(ev).includes('flame'), 'the spray went off on that press');
  assert.ok(!sfxIds(ev).includes('noMp'));
  assert.equal(h.act, 'special');
  assert.ok(Math.abs(h.mp - (1 + Math.round(h.st.mp * COKE_MP) - cost)) < 0.1, `MP is ${h.mp}`);
  const view = sim.view();
  assert.ok(view.floaters.some((f) => f.text === 'COKE'), 'a COKE floater');
  assert.deepEqual(view.hud.stash, { eggo: 0, coke: 1 });
  assert.deepEqual(s.stash, { eggo: 0, coke: 1 });
});

test('Coke: not drunk with enough MP, or while the special is still cooling down, and no stash means NO MP as before', () => {
  const rich = makeWhite({ party: [{ id: 'dustin', level: 4 }], ...stashed(0, 2) });
  const ev = rich.sim.step(inp({ specialPressed: true }));
  assert.equal(ofType(ev, 'stashUsed').length, 0, 'plenty of MP');
  assert.equal(rich.s.stash.coke, 2);
  // Straight after the cast the special is on cooldown: a press then does not drink either.
  rich.s.heroes[0]!.mp = 0;
  const cooling = press(rich.sim, { specialPressed: true }, 1);
  assert.equal(ofType(cooling, 'stashUsed').length, 0, 'cooldown');
  assert.equal(rich.s.stash.coke, 2);

  const none = makeWhite({ party: [{ id: 'dustin', level: 4 }] });
  none.s.heroes[0]!.mp = 0;
  const dry = none.sim.step(inp({ specialPressed: true }));
  assert.ok(sfxIds(dry).includes('noMp'));
  assert.ok(none.sim.view().floaters.some((f) => f.text === 'NO MP'));
});

test('the stash and the purse start from the options: the HUD shows what the party walked in with', () => {
  const { sim } = makeWhite({ party: [{ id: 'mike' }], ...stashed(3, 2), purse: 41 });
  const hud = sim.view().hud;
  assert.deepEqual(hud.stash, { eggo: 3, coke: 2 });
  assert.equal(hud.quarters, 41);
  // The view hands out a copy: writing to it does not spend anything.
  hud.stash.eggo = 0;
  assert.equal(sim.view().hud.stash.eggo, 3);
});
