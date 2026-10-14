// The puzzle hint clock and the Level 1 puzzle data. Pure logic, so Node runs it without a canvas.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { keyText } from '../src/core/bindings.ts';
import { fitsBox, hasEmDash } from '../src/core/text.ts';
import { HERO_DEFS } from '../src/heroes/defs.ts';
import { STAGE_11 as S } from '../src/world/stages/stage11.ts';
import { STAGE_12 as S2 } from '../src/world/stages/stage12.ts';
import { fakeEnv } from './stage-helpers.ts';
import { HINT_AFTER, NEAR_PX, TIP_FRAMES, createPuzzleTracker } from '../src/world/puzzles.ts';
import type { PuzzleTracker } from '../src/world/puzzles.ts';
import { createDirector } from '../src/world/triggers.ts';
import type { DirectorEnv } from '../src/world/triggers.ts';
import type { PuzzleDef } from '../src/world/types.ts';
import type { PropState, PropView, SimSpawn, Vec2 } from '../src/core/types.ts';

const DEF: PuzzleDef = { id: 'p', beat: 'b', prop: 'rock', hero: 'lucas', label: 'SHOOT', tip: 'Do the thing.' };
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

test('thirty seconds is 1800 ticks of the 60 Hz sim', () => {
  assert.equal(HINT_AFTER, 1800);
});

test('nothing happens before the arrival beat has fired', () => {
  const tr = createPuzzleTracker([DEF]);
  run(tr, HINT_AFTER + 60, { fired: false });
  assert.equal(tr.highlight(), null);
  assert.equal(tr.tip(), null);
});

test('highlights after thirty seconds near the prop, not a tick sooner', () => {
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
  assert.equal(tr.tip(), null);
  run(tr, HINT_AFTER - 1);
  assert.equal(tr.highlight(), null, 'a retry starts the thirty seconds over');
});

test('the objective tip shows when the clock starts and is gone before the highlight', () => {
  const tr = createPuzzleTracker([DEF]);
  assert.equal(tr.tip(), null);
  run(tr, 1);
  assert.equal(tr.tip(), DEF);
  run(tr, TIP_FRAMES - 2);
  assert.equal(tr.tip(), DEF, 'still up on the last tip tick');
  run(tr, 1);
  assert.equal(tr.tip(), null);
  assert.ok(TIP_FRAMES < HINT_AFTER);
  assert.equal(tr.highlight(), null);
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

test('puzzle labels and tips follow the copy rules and fit the bottom strip', () => {
  for (const p of S.puzzles) {
    assert.match(p.label, /^[A-Z]{3,8}$/, `${p.id}: a one-word label`);
    for (const text of [p.label, p.tip]) {
      assert.ok(!hasEmDash(text), `${p.id}: em dash in ${text}`);
      assert.ok(!/seamless|robust|leverage|unlock|delve/i.test(text), `${p.id}: banned word in ${text}`);
      assert.ok(!/\b[0-9]\b/.test(text), `${p.id}: key digits come from tokens, not the copy: ${text}`);
    }
    const shown = keyText(p.tip);
    assert.ok(!shown.includes('{'), `${p.id}: every token in "${p.tip}" is known`);
    // 256 px at 6 px a glyph is 42 columns. With the default keys a tip stays on one row, so no word is left alone below it.
    assert.ok(fitsBox(shown, 42, 1), `${p.id}: "${shown}" is ${shown.length} characters, over one row of 42`);
  }
  assert.match(keyText(S.puzzles[0]?.tip ?? ''), /\b3\b.*\bJ\b/, 'the gate tip names Lucas\'s slot and the attack key');
  assert.match(keyText(S.puzzles[1]?.tip ?? ''), /\b4\b.*\bJ\b/, 'the log tip names Eleven\'s slot and the attack key');
});

// ---------------------------------------------------------------- Level 2 data
const props2 = S2.spawns.filter((s): s is Prop => s.kind === 'prop');
const HEROES = ['mike', 'dustin', 'lucas', 'eleven'] as const;

test('Level 2 has the burn, relay and crate puzzles, each wired to a real beat, prop and hero', () => {
  assert.deepEqual(S2.puzzles.map((p) => p.id), ['burn', 'relay', 'crate']);
  assert.deepEqual(S2.puzzles.map((p) => p.beat), ['burn_hint', 'relay_hint', 'crate_hint']);
  assert.deepEqual(S2.puzzles.map((p) => p.prop), ['sensor1', 'relay1', 'crate1']);
  assert.deepEqual(S2.puzzles.map((p) => p.hero), ['dustin', 'lucas', 'eleven']);
  assert.deepEqual(S2.puzzles.map((p) => p.label), ['BURN', 'SHOOT', 'PUSH']);
  for (const p of S2.puzzles) {
    assert.ok(S2.beats.some((b) => b.id === p.beat), `${p.id}: beat ${p.beat} exists`);
    const target = props2.find((x) => x.id === p.prop);
    assert.ok(target, `${p.id}: prop ${p.prop} exists`);
    const need = target?.hitBy ?? target?.pushBy;
    assert.ok(need, `${p.id}: the prop asks for a utility`);
    assert.ok(HERO_DEFS[p.hero].utilities.includes(need as never), `${p.id}: ${p.hero} can ${need}`);
    // The swap has to matter: exactly one of the four can do it, and it is the hero the hint points at.
    const can = HEROES.filter((h) => HERO_DEFS[h].utilities.includes(need as never));
    assert.deepEqual(can, [p.hero], `${p.id}: only ${p.hero} has ${need}`);
  }
});

test('Level 2 labels and tips follow the copy rules and fit one row of the bottom strip', () => {
  for (const p of S2.puzzles) {
    assert.match(p.label, /^[A-Z]{3,8}$/, `${p.id}: a one-word label`);
    for (const text of [p.label, p.tip]) {
      assert.ok(!hasEmDash(text), `${p.id}: em dash in ${text}`);
      assert.ok(!/seamless|robust|leverage|unlock|delve/i.test(text), `${p.id}: banned word in ${text}`);
      assert.ok(!/\b[0-9]\b/.test(text), `${p.id}: key digits come from tokens, not the copy: ${text}`);
    }
    const shown = keyText(p.tip);
    assert.ok(!shown.includes('{'), `${p.id}: every token in "${p.tip}" is known`);
    assert.ok(fitsBox(shown, 42, 1), `${p.id}: "${shown}" is ${shown.length} characters, over one row of 42`);
  }
  const tips = S2.puzzles.map((p) => keyText(p.tip));
  assert.match(tips[0] ?? '', /\b2\b.*\bK\b/, "the burn tip names Dustin's slot and the special key");
  assert.match(tips[1] ?? '', /\b3\b.*\bJ\b/, "the relay tip names Lucas's slot and the attack key");
  assert.match(tips[2] ?? '', /\b4\b.*\bJ\b/, "the crate tip names Eleven's slot and the attack key");
  assert.deepEqual(S2.puzzles.map((p) => p.tip), [
    'Dustin on {pick2}. Face the sensor, press {special}.',
    'Lucas on {pick3}. Face the glass, press {attack}.',
    'Eleven on {pick4}. Face the crate, press {attack}.',
  ]);
});

test('Level 2 hints wake in route order through the real beat chain, and a solved prop clears its hint', () => {
  const { env } = fakeEnv({ rats1: 6, lock1: 2, lock2: 4, lock3: 3 }, ['mike', 'dustin', 'lucas', 'eleven']);
  const dir = createDirector(S2.beats, S2.waves, env);
  const tr = createPuzzleTracker(S2.puzzles);
  const state: Record<string, PropState> = {};
  const view = (p: Prop): PropView => ({ id: p.id, kind: p.prop, x: p.tx * 16, y: p.ty * 16, w: p.w ?? 16, h: p.h ?? 16, state: state[p.id] ?? 'closed', t: 0 });
  const soak = (hero: Vec2, frames: number): void => {
    for (let i = 0; i < frames; i++) tr.tick({ hasFired: (b) => dir.hasFired(b), busy: dir.busy(), props: props2.map(view), hero });
  };
  const beside = (id: string): Vec2 => {
    const p = props2.find((q) => q.id === id) as Prop;
    return { x: p.tx * 16 + (p.w ?? 16) / 2, y: (p.ty + Math.ceil((p.h ?? 16) / 16)) * 16 + 12 };
  };
  // Nothing is armed before its arrival beat, however long the party stands there.
  soak(beside('sensor1'), HINT_AFTER + 10);
  assert.equal(tr.highlight(), null);
  // Power room: the burn hint arms, and thirty seconds beside the sensor highlights it.
  dir.tick(33, 33);
  assert.ok(dir.hasFired('burn_hint'));
  soak(beside('sensor1'), HINT_AFTER);
  assert.equal(tr.highlight()?.id, 'burn');
  state.sensor1 = 'lit';
  dir.events([{ t: 'targetHit', propId: 'sensor1' }]);
  state.door1 = 'open';
  soak(beside('sensor1'), 1);
  assert.equal(tr.highlight(), null, 'a lit sensor is solved');
  // Observation corridor: the scare, then the shoot hint straight after it.
  assert.ok(!dir.hasFired('relay_hint'));
  dir.tick(28, 17);
  assert.ok(dir.hasFired('scare') && dir.hasFired('relay_hint'));
  soak(beside('relay1'), HINT_AFTER);
  assert.equal(tr.highlight()?.id, 'relay');
  state.relay1 = 'lit';
  dir.events([{ t: 'targetHit', propId: 'relay1' }]);
  soak(beside('relay1'), 1);
  assert.equal(tr.highlight(), null);
  // Crate corridor: the push hint needed door2 to open first.
  assert.ok(dir.hasFired('door2_open'));
  dir.tick(25, 6);
  assert.ok(dir.hasFired('crate_hint'));
  soak(beside('crate1'), HINT_AFTER);
  assert.equal(tr.highlight()?.id, 'crate');
  state.crate1 = 'open';
  soak(beside('crate1'), 1);
  assert.equal(tr.highlight(), null);
});
