// The hint rule: a puzzle whose hero is not in the party never shows its hint (world/puzzles.ts), on every stage. With Steve left
// out of the party in 2.2 the cache stays shut and nothing nags. Pure logic, so Node runs it without a canvas.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { HINT_AFTER, createPuzzleTracker } from '../src/world/puzzles.ts';
import type { PuzzleTracker } from '../src/world/puzzles.ts';
import { STAGE_11 } from '../src/world/stages/stage11.ts';
import { STAGE_12 } from '../src/world/stages/stage12.ts';
import { STAGE_13 } from '../src/world/stages/stage13.ts';
import { STAGE_21 } from '../src/world/stages/stage21.ts';
import { STAGE_22 } from '../src/world/stages/stage22.ts';
import type { PuzzleDef, StageData } from '../src/world/types.ts';
import type { HeroId, PropView, Vec2 } from '../src/core/types.ts';

const AT: Vec2 = { x: 116, y: 108 };
const stand = (id: string): PropView => ({ id, kind: 'target', x: 100, y: 100, w: 32, h: 16, state: 'closed', t: 0 });
const DEF: PuzzleDef = { id: 'p', beat: 'b', prop: 'rock', hero: 'steve', hint: 'MAYBE STEVE SHOULD TRY HIS NAIL BAT' };

/** Ticks the tracker `frames` times with the arrival beat fired, nobody busy and the hero beside the prop. */
function wait(tr: PuzzleTracker, def: PuzzleDef, frames: number, party?: readonly HeroId[]): void {
  for (let i = 0; i < frames; i++) tr.tick({ hasFired: () => true, busy: false, props: [stand(def.prop)], hero: AT, party });
}

test('a hero who is in the party gets the hint: five seconds near the puzzle, or a try with someone else, as before', () => {
  const party: HeroId[] = ['mike', 'dustin', 'max', 'steve'];
  const timed = createPuzzleTracker([DEF]);
  wait(timed, DEF, HINT_AFTER - 1, party);
  assert.equal(timed.highlight(), null);
  wait(timed, DEF, 1, party);
  assert.equal(timed.highlight(), DEF);
  const tried = createPuzzleTracker([DEF]);
  tried.poke('rock', 'mike');
  wait(tried, DEF, 1, party);
  assert.equal(tried.highlight(), DEF);
  assert.equal(tried.triedProp(DEF), 'rock');
});

test('a hero who is not in the party never gets the hint: not from the clock, not from a try, not after any wait', () => {
  const party: HeroId[] = ['mike', 'dustin', 'max', 'will'];
  const timed = createPuzzleTracker([DEF]);
  wait(timed, DEF, HINT_AFTER * 6, party);
  assert.equal(timed.highlight(), null, 'six times the clock');
  const tried = createPuzzleTracker([DEF]);
  tried.poke('rock', 'mike');
  tried.poke('rock', 'dustin');
  wait(tried, DEF, HINT_AFTER * 2, party);
  assert.equal(tried.highlight(), null, 'tried with the wrong hero, over and over');
  assert.equal(tried.triedProp(DEF), 'rock', 'the try is remembered, in case he joins');
  // The party changes (a pick on the map, a recruit): once he is in, the try counts.
  wait(tried, DEF, 1, [...party, 'steve']);
  assert.equal(tried.highlight(), DEF);
  wait(tried, DEF, 1, party);
  assert.equal(tried.highlight(), null, 'and out again, it stops');
});

test('with no party given every hero counts, so a stage that does not say keeps its hints', () => {
  const tr = createPuzzleTracker([DEF]);
  wait(tr, DEF, HINT_AFTER);
  assert.equal(tr.highlight(), DEF);
});

test('every puzzle on every stage goes quiet when its hero is out of the party, and speaks when he is in', () => {
  const stages: StageData[] = [STAGE_11, STAGE_12, STAGE_13, STAGE_21, STAGE_22];
  const heroes: HeroId[] = ['mike', 'dustin', 'lucas', 'eleven', 'will', 'max', 'steve'];
  let seen = 0;
  for (const S of stages) {
    for (const def of S.puzzles) {
      seen++;
      const others = heroes.filter((h) => h !== def.hero);
      const out = createPuzzleTracker([def]);
      out.poke(def.prop, others[0] as HeroId);
      wait(out, def, HINT_AFTER * 2, others);
      assert.equal(out.highlight(), null, `${S.id} ${def.id}: no hint without ${def.hero}`);
      const inn = createPuzzleTracker([def]);
      wait(inn, def, HINT_AFTER, heroes);
      assert.equal(inn.highlight(), def, `${S.id} ${def.id}: the hint with ${def.hero} in the party`);
    }
  }
  assert.ok(seen >= 12, `${seen} puzzles checked`);
});

test('the play scene tells the tracker who is in the party', () => {
  const src = readFileSync(new URL('../src/world/play.ts', import.meta.url), 'utf8');
  assert.match(src, /puzzles\.tick\(\{[^}]*party: view\.hud\.party\.map\(\(m\) => m\.id\)/s, 'play.ts passes the party to puzzles.tick');
});
