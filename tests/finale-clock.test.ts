// Phase two's clock (docs/level-16.md, "The fight"): the Mind Flayer chimes every 16 s and curses a hero, as phase one's Vecna does every 12 s, and marks
// a leg where he marks an orb. Cutting that leg lifts the curse, as does Max's Walkman, the fourth chime takes the hero out, and the spider's death
// lifts what its legs held. Not a test of the bot: the stage's whole-run bot test is in finale-sim.test.ts.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ENEMY_DEFS } from '../src/enemies/defs.ts';
import { spiderClock } from '../src/combat/finale_clock.ts';
import type { HeroId, SimEvent } from '../src/core/types.ts';
import { inp, ofType } from './sim-helpers.ts';
import { hero, hit, kind, legs, rig, steps, still, toSpider, until } from './finale-helpers.ts';

const CLOCK = ENEMY_DEFS.flayer5.x.clock16 as number;
const marked = (r: ReturnType<typeof rig>): string[] => r.sim.view().actors.filter((a) => a.id === 'leg5' && a.marked).map((a) => a.id);

/** The first chime of phase two: the rig at the spider with its own attacks held off, the ticks it took, and the hero it cursed. */
function firstChime(seed: number, party?: Parameters<typeof rig>[0]['party']): { r: ReturnType<typeof rig>; at: number; who: HeroId; ev: SimEvent[] } {
  const r = rig({ seed, party });
  toSpider(r);
  still(r);
  let at = 0;
  const ev = until(r, () => { at++; return r.s.house.curses.length > 0; }, CLOCK + 200);
  return { r, at, who: ofType(ev, 'cursed')[0]!.hero, ev };
}

test('the clock is 16 s, and the spider\'s phase starts it as it rises', () => {
  assert.equal(spiderClock(), 960);
  const r = rig();
  r.sim.defend();
  assert.equal(r.s.finale!.clockCd, 0, 'not in phase one');
  kind(r, 'vecna').hp = 0;
  until(r, () => r.s.finale?.phase === 2);
  assert.ok(r.s.finale!.clockCd > CLOCK - 3 && r.s.finale!.clockCd <= CLOCK, `${r.s.finale!.clockCd} frames to the first chime`);
});

test('at 16 s it chimes: a standing hero is cursed, exactly one leg is marked, and the curse counts its chimes a third of 16 s apart', () => {
  const { r, at, who } = firstChime(3);
  // The rig counts from the moment phase two had risen, 60 frames in (toSpider), so the chime comes after what is left of 960.
  assert.ok(at >= CLOCK - 70 && at <= CLOCK, `the first chime came ${at} frames in`);
  const c = r.s.house.curses[0]!;
  assert.equal(c.hero.id, who);
  assert.equal(c.gap, 320, 'a third of 960 between chimes');
  assert.equal(c.chimes, 1, 'the first chime sounds at once');
  assert.ok(c.orb.startsWith('leg'), `the mark is on ${c.orb}`);
  assert.deepEqual(marked(r), ['leg5'], 'one leg wears the mark in the view');
  assert.equal(r.sim.view().hud.party.find((p) => p.id === who)?.curse, 1, 'and the hero\'s slot shows the first chime');
});

test('cutting the marked leg lifts the curse, with no KO; the unmarked ones do not', () => {
  const { r, who } = firstChime(3);
  const c = r.s.house.curses[0]!;
  const mark = legs(r).find((l) => l.id === c.orb)!;
  const other = legs(r).find((l) => l.id !== c.orb)!;
  other.hp = 1;
  hit(r, other, 5);
  assert.equal(r.s.house.curses.length, 1, 'cutting another leg changes nothing');
  mark.hp = 1;
  hit(r, mark, 5);
  const ev = steps(r, 2);
  assert.deepEqual(ofType(ev, 'curseEnd').map((e) => [e.hero, e.how]), [[who, 'orb']]);
  assert.equal(r.s.house.curses.length, 0);
  assert.equal(hero(r, who).ko, false);
});

test('left alone, the fourth chime takes the hero out, just as the next chime of the clock comes', () => {
  const { r, who } = firstChime(3);
  const first = r.s.house.curses[0]!;
  // The next chime comes on the very tick the fourth falls, so the list is never empty: watch for this curse's end.
  const ev = until(r, () => !r.s.house.curses.includes(first), CLOCK + 50);
  assert.deepEqual(ofType(ev, 'curseEnd').map((e) => [e.hero, e.how]), [[who, 'ko']]);
  assert.equal(hero(r, who).ko, true);
});

test('Max\'s Walkman lifts a spider curse, and no hero can be cursed while it plays', () => {
  const party = [{ id: 'mike' as const, level: 11 }, { id: 'max' as const, level: 9 }, { id: 'dustin' as const, level: 10 }, { id: 'eleven' as const, level: 8 }];
  let tried = 0;
  for (let seed = 1; seed <= 12 && tried < 1; seed++) {
    const r = rig({ seed, party });
    r.s.house.walkman = true;
    toSpider(r);
    still(r);
    const ev = until(r, () => r.s.house.curses.length > 0, CLOCK + 200);
    const who = ofType(ev, 'cursed')[0]!.hero;
    if (who === 'max') continue;
    tried++;
    const maxIdx = r.s.heroes.findIndex((h) => h.id === 'max');
    const away = r.s.heroes.findIndex((h, i) => i !== maxIdx && h.id !== who);
    r.sim.step(inp({ swapTo: away }));
    steps(r, 12);
    const lifted = ofType([...steps(r, 1, inp({ swapTo: maxIdx })), ...steps(r, 2)], 'curseEnd');
    assert.deepEqual(lifted.map((e) => [e.hero, e.how]), [[who, 'walkman']]);
    assert.ok(r.s.house.walkOn > 0);
  }
  assert.equal(tried, 1, 'a seed whose curse is not on Max');
});

test('with every leg cut the clock has nothing to mark and stays quiet, and the Mind Flayer\'s death lifts what its legs held', () => {
  const quiet = rig({ seed: 5 });
  toSpider(quiet);
  still(quiet);
  for (const l of legs(quiet)) { l.hp = 1; hit(quiet, l, 5); }
  steps(quiet, 2);
  // The legs stay cut for the head's whole time on the floor, and the clock coming due then marks nothing.
  quiet.s.finale!.clockCd = 5;
  steps(quiet, 20);
  assert.equal(quiet.s.house.curses.length, 0, 'no chime with no leg left to mark');
  assert.ok(quiet.s.finale!.clockCd > CLOCK - 40, 'it was wound again for the next 16 s');
  const { r } = firstChime(3);
  assert.equal(r.s.house.curses.length, 1);
  kind(r, 'flayer5').hp = 0;
  const ev = steps(r, 4);
  assert.deepEqual(ofType(ev, 'curseEnd').map((e) => e.how), ['orb'], 'its death lifts the curse with it');
  assert.equal(r.s.house.curses.length, 0);
});

test('phase one\'s clock is unchanged, and phase three has none', () => {
  const r = rig({ seed: 2 });
  toSpider(r);
  still(r);
  kind(r, 'flayer5').hp = 0;
  until(r, () => r.s.finale?.phase === 3);
  steps(r, CLOCK * 2);
  assert.equal(r.s.house.curses.length, 0, 'the channel has no clock');
});
