// The puzzle hint clock and the Level 1 puzzle data. Pure logic, so Node runs it without a canvas.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { SCREEN_W } from '../src/core/config.ts';
import { fitsBox, hasEmDash } from '../src/core/text.ts';
import { HERO_DEFS } from '../src/heroes/defs.ts';
import { STAGE_11 as S } from '../src/world/stages/stage11.ts';
import { HINT_AFTER, NEAR_PX, createPuzzleTracker, isNear } from '../src/world/puzzles.ts';
import type { PuzzleTracker } from '../src/world/puzzles.ts';
import { createDirector } from '../src/world/triggers.ts';
import type { DirectorEnv } from '../src/world/triggers.ts';
import type { PuzzleDef } from '../src/world/types.ts';
import type { PropState, PropView, SimSpawn, Vec2 } from '../src/core/types.ts';

const DEF: PuzzleDef = { id: 'p', beat: 'b', prop: 'rock', hero: 'lucas', hint: 'MAYBE LUCAS SHOULD TRY HIS SLINGSHOT' };
const prop = (state: PropState): PropView => ({ id: 'rock', kind: 'target', x: 100, y: 100, w: 32, h: 16, state, t: 0 });
const NEAR: Vec2 = { x: 116, y: 108 };
const FAR: Vec2 = { x: 116 + NEAR_PX + 50, y: 108 };

interface Setup { fired: boolean; busy: boolean; state: PropState; hero: Vec2; props: PropView[] }
/** Ticks the tracker `frames` times with the arrival beat fired, nobody busy, the prop closed and the hero near it. */
function run(tr: PuzzleTracker, frames: number, o: Partial<Setup> = {}): void {
  for (let i = 0; i < frames; i++) {
    tr.tick({
      hasFired: (b) => (o.fired ?? true) && b === 'b', busy: o.busy ?? false,
      props: o.props ?? [prop(o.state ?? 'closed')], hero: o.hero ?? NEAR,
    });
  }
}

test('ten seconds is 600 ticks of the 60 Hz sim', () => {
  assert.equal(HINT_AFTER, 600);
});

test('nothing happens before the arrival beat has fired', () => {
  const tr = createPuzzleTracker([DEF]);
  run(tr, HINT_AFTER + 60, { fired: false });
  assert.equal(tr.highlight(), null);
});

test('highlights after ten seconds near the prop, not a tick sooner', () => {
  const tr = createPuzzleTracker([DEF]);
  run(tr, HINT_AFTER - 1);
  assert.equal(tr.highlight(), null);
  run(tr, 1);
  assert.equal(tr.highlight(), DEF);
});

test('the clock holds while a beat is busy and while the hero is away', () => {
  const tr = createPuzzleTracker([DEF]);
  run(tr, HINT_AFTER - 1);
  run(tr, 1000, { busy: true });
  run(tr, 1000, { hero: FAR });
  assert.equal(tr.highlight(), null, 'neither busy nor far time counts');
  run(tr, 1);
  assert.equal(tr.highlight(), DEF);
});

test('a solved puzzle is never highlighted, even with a full clock', () => {
  for (const state of ['open', 'lit'] as PropState[]) {
    const tr = createPuzzleTracker([DEF]);
    run(tr, HINT_AFTER);
    assert.equal(tr.highlight(), DEF);
    run(tr, 1, { state });
    assert.equal(tr.highlight(), null, `${state} counts as solved`);
    run(tr, HINT_AFTER, { state });
    assert.equal(tr.highlight(), null);
  }
});

test('isNear measures from the prop center, out to NEAR_PX', () => {
  const p = prop('closed');
  assert.ok(isNear(p, NEAR));
  assert.ok(isNear(p, { x: 116 + NEAR_PX, y: 108 }));
  assert.ok(!isNear(p, { x: 116 + NEAR_PX + 1, y: 108 }));
  assert.ok(!isNear(p, FAR));
});

test('a prop that is not in the view is ignored', () => {
  const tr = createPuzzleTracker([DEF]);
  run(tr, HINT_AFTER + 1, { props: [] });
  assert.equal(tr.highlight(), null);
});

test('reset forgets the clock', () => {
  const tr = createPuzzleTracker([DEF]);
  run(tr, HINT_AFTER);
  tr.reset();
  assert.equal(tr.highlight(), null);
  run(tr, HINT_AFTER - 1);
  assert.equal(tr.highlight(), null, 'a retry starts the ten seconds over');
});

test('each puzzle keeps its own clock', () => {
  const other: PuzzleDef = { ...DEF, id: 'q', beat: 'c', prop: 'log' };
  const tr = createPuzzleTracker([DEF, other]);
  const props = [prop('closed'), { ...prop('closed'), id: 'log' }];
  for (let i = 0; i < HINT_AFTER; i++) tr.tick({ hasFired: (b) => b === 'b', busy: false, props, hero: NEAR });
  assert.equal(tr.highlight(), DEF, 'only the puzzle whose beat fired counts');
});

test('Director.hasFired follows fire and restore', () => {
  const env: DirectorEnv = {
    sim: () => { throw new Error('no sim here'); },
    say: (_s, done) => done(), scare: (done) => done(), open: () => {}, jingle: () => {}, finish: () => {},
  };
  const d = createDirector([{ id: 'a', when: { rect: { tx: 0, ty: 0, w: 2, h: 2 } }, steps: [{ t: 'say', script: 'x' }] }], [], env);
  assert.equal(d.hasFired('a'), false);
  d.tick(5, 5);
  assert.equal(d.hasFired('a'), false, 'outside the rect');
  d.tick(1, 1);
  assert.equal(d.hasFired('a'), true);
  d.restore({ fired: [], cleared: [] });
  assert.equal(d.hasFired('a'), false);
  d.restore({ fired: ['a'], cleared: [] });
  assert.equal(d.hasFired('a'), true);
});

// ---------------------------------------------------------------- Level 1 data
type Prop = Extract<SimSpawn, { kind: 'prop' }>;
const props = S.spawns.filter((s): s is Prop => s.kind === 'prop');

test('Level 1 has the gate and log puzzles, each wired to a real beat, prop and hero', () => {
  assert.deepEqual(S.puzzles.map((p) => p.id), ['gate', 'log']);
  assert.equal(new Set(S.puzzles.map((p) => p.id)).size, S.puzzles.length);
  for (const p of S.puzzles) {
    assert.ok(S.beats.some((b) => b.id === p.beat), `${p.id}: beat ${p.beat} exists`);
    const target = props.find((x) => x.id === p.prop);
    assert.ok(target, `${p.id}: prop ${p.prop} exists`);
    const need = target?.hitBy ?? target?.pushBy;
    assert.ok(need, `${p.id}: the prop asks for a utility`);
    assert.ok(HERO_DEFS[p.hero].utilities.includes(need as never), `${p.id}: ${p.hero} can ${need}`);
  }
});

test('each hint is one subtitle row that names its hero and no key', () => {
  // The subtitle is one line of 6 px glyphs on a strip 8 px wider, with a margin on each side of the screen.
  const cols = Math.floor((SCREEN_W - 16) / 6);
  for (const p of S.puzzles) {
    assert.ok(fitsBox(p.hint, cols, 1), `"${p.hint}" is ${p.hint.length} characters, over one row of ${cols}`);
    assert.equal(p.hint, p.hint.toUpperCase(), `${p.id}: all caps, like the rest of the in-world text`);
    assert.ok(p.hint.includes(HERO_DEFS[p.hero].name.toUpperCase()), `${p.id}: names ${p.hero}`);
    assert.ok(!hasEmDash(p.hint), 'no em dash');
    assert.ok(!/seamless|robust|leverage|unlock|delve/i.test(p.hint), 'no banned words');
    assert.ok(!/\b[0-9]\b/.test(p.hint), 'no key digits, so a rebind never makes it wrong');
  }
});
