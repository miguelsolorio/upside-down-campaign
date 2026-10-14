// The puzzle hint clock and the Level 1 puzzle data. Pure logic, so Node runs it without a canvas.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { SCREEN_W } from '../src/core/config.ts';
import { fitsBox, hasEmDash } from '../src/core/text.ts';
import { HERO_DEFS } from '../src/heroes/defs.ts';
import { STAGE_11 as S } from '../src/world/stages/stage11.ts';
import { STAGE_12 as S2 } from '../src/world/stages/stage12.ts';
import { fakeEnv } from './stage-helpers.ts';
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

test('five seconds is 300 ticks of the 60 Hz sim', () => {
  assert.equal(HINT_AFTER, 300);
});

test('nothing happens before the arrival beat has fired', () => {
  const tr = createPuzzleTracker([DEF]);
  run(tr, HINT_AFTER + 60, { fired: false });
  assert.equal(tr.highlight(), null);
});

test('highlights after five seconds near the prop, not a tick sooner', () => {
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
  assert.equal(tr.highlight(), null, 'a retry starts the five seconds over');
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
  for (const p of [...S.puzzles, ...S2.puzzles]) {
    assert.ok(fitsBox(p.hint, cols, 1), `"${p.hint}" is ${p.hint.length} characters, over one row of ${cols}`);
    assert.equal(p.hint, p.hint.toUpperCase(), `${p.id}: all caps, like the rest of the in-world text`);
    assert.ok(p.hint.includes(HERO_DEFS[p.hero].name.toUpperCase()), `${p.id}: names ${p.hero}`);
    assert.ok(!hasEmDash(p.hint), 'no em dash');
    assert.ok(!/seamless|robust|leverage|unlock|delve/i.test(p.hint), 'no banned words');
    assert.ok(!/\b[0-9]\b/.test(p.hint), 'no key digits, so a rebind never makes it wrong');
  }
});

// ---------------------------------------------------------------- Level 2 data
const props2 = S2.spawns.filter((s): s is Prop => s.kind === 'prop');
const HEROES = ['mike', 'dustin', 'lucas', 'eleven'] as const;

test('Level 2 has the burn, relay and crate puzzles, each wired to a real beat, prop and hero', () => {
  assert.deepEqual(S2.puzzles.map((p) => p.id), ['burn', 'relay', 'crate']);
  assert.deepEqual(S2.puzzles.map((p) => p.beat), ['burn_hint', 'relay_hint', 'crate_hint']);
  assert.deepEqual(S2.puzzles.map((p) => p.prop), ['sensor1', 'relay1', 'crate1']);
  assert.deepEqual(S2.puzzles.map((p) => p.hero), ['dustin', 'lucas', 'eleven']);
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

test('Level 2 hints wake in route order through the real beat chain, and a solved prop clears its hint', () => {
  const { env } = fakeEnv({ rats1: 2, reinf1: 1, reinf2: 1, reinf3: 1, lock1: 1, lock2: 2, lock3: 2 }, ['mike', 'dustin', 'lucas', 'eleven']);
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
  // Power room: the burn hint arms, and five seconds beside the sensor highlights it.
  const burnAt = (S2.beats.find((b) => b.id === 'burn_hint')?.when as { rect: { tx: number; ty: number } }).rect;
  dir.tick(burnAt.tx, burnAt.ty);
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

test('Level 2 cameras are a choice, not a puzzle: no hint points at one, and a sighting does not arm or solve a hint', () => {
  const cams = props2.filter((p) => p.prop === 'camera').map((p) => p.id);
  assert.ok(cams.length >= 2);
  assert.ok(!S2.puzzles.some((p) => cams.includes(p.prop)), 'no puzzle watches a camera');
  const { env } = fakeEnv({ reinf1: 1, reinf2: 1, reinf3: 1 }, ['mike', 'dustin', 'lucas', 'eleven']);
  const dir = createDirector(S2.beats, S2.waves, env);
  const tr = createPuzzleTracker(S2.puzzles);
  for (const id of cams) dir.events([{ t: 'spotted', propId: id }]);
  for (let i = 0; i < HINT_AFTER + 10; i++) {
    tr.tick({ hasFired: (b) => dir.hasFired(b), busy: dir.busy(), props: [], hero: { x: 0, y: 0 } });
  }
  assert.equal(tr.highlight(), null);
  assert.ok(cams.every((id) => dir.hasFired(`${id}_spotted`)), 'every camera beat fired');
  assert.ok(!S2.puzzles.some((p) => dir.hasFired(p.beat)), 'and none of them is a puzzle arrival');
});

// ---------------------------------------------------------------- hints from trying it
const GATED: PuzzleDef = { ...DEF, id: 'g', blocks: ['door'] };

test('trying the puzzle with the wrong hero shows the hint at once, with no clock', () => {
  const tr = createPuzzleTracker([DEF]);
  run(tr, 1);
  assert.equal(tr.highlight(), null, 'nothing before anyone tries it');
  tr.poke('rock', 'mike');
  run(tr, 1);
  assert.equal(tr.highlight(), DEF);
  assert.equal(tr.triedProp(DEF), 'rock');
  run(tr, 600);
  assert.equal(tr.highlight(), DEF, 'and it stays up');
});

test('trying the gate or door the puzzle opens counts too, and the hint remembers which prop it was', () => {
  const tr = createPuzzleTracker([GATED]);
  tr.poke('door', 'eleven');
  run(tr, 1);
  assert.equal(tr.highlight(), GATED);
  assert.equal(tr.triedProp(GATED), 'door');
});

test('not a hint: the right hero trying it, or anyone trying something that is not this puzzle', () => {
  const tr = createPuzzleTracker([GATED]);
  tr.poke('rock', 'lucas');
  tr.poke('door', 'lucas');
  run(tr, 1);
  assert.equal(tr.highlight(), null, 'Lucas is the one who solves it');
  tr.poke('crate', 'mike');
  tr.poke('some-other-door', 'mike');
  run(tr, 1);
  assert.equal(tr.highlight(), null, 'a prop that is not part of this puzzle');
  assert.equal(tr.triedProp(GATED), null);
  // A door is not the puzzle's own prop unless the data says so.
  const bare = createPuzzleTracker([DEF]);
  bare.poke('door', 'mike');
  run(bare, 1);
  assert.equal(bare.highlight(), null);
});

test('a try waits for the arrival beat and for the dialogue, then the hint shows', () => {
  const tr = createPuzzleTracker([DEF]);
  tr.poke('rock', 'mike');
  run(tr, 5, { fired: false });
  assert.equal(tr.highlight(), null, 'the beat has not fired');
  run(tr, 5, { busy: true });
  assert.equal(tr.highlight(), null, 'a beat is talking');
  run(tr, 1);
  assert.equal(tr.highlight(), DEF);
});

test('a solved puzzle drops its hint, and a retry forgets the try', () => {
  const tr = createPuzzleTracker([DEF]);
  tr.poke('rock', 'mike');
  run(tr, 1);
  assert.equal(tr.highlight(), DEF);
  run(tr, 1, { state: 'lit' });
  assert.equal(tr.highlight(), null, 'solved');
  tr.reset();
  run(tr, 1);
  assert.equal(tr.highlight(), null, 'nothing left after a reset');
  assert.equal(tr.triedProp(DEF), null);
});

test('each puzzle is hinted on its own, and the first one in the list shows first', () => {
  const other: PuzzleDef = { id: 'q', beat: 'b', prop: 'log', hero: 'eleven', hint: 'MAYBE ELEVEN SHOULD TRY HER SHOVE' };
  const tr = createPuzzleTracker([DEF, other]);
  const props = [prop('closed'), { ...prop('closed'), id: 'log' }];
  const tick = (): void => tr.tick({ hasFired: (b) => b === 'b', busy: false, props, hero: NEAR });
  tr.poke('log', 'mike');
  tick();
  assert.equal(tr.highlight(), other, 'only the log was tried');
  tr.poke('rock', 'mike');
  tick();
  assert.equal(tr.highlight(), DEF, 'both are up and the earlier one in the list shows');
  assert.equal(tr.triedProp(other), 'log');
});

test('every gate or door a puzzle lists is a real gate or door in that stage', () => {
  for (const [name, stage, list] of [['Level 1', S, props], ['Level 2', S2, props2]] as const) {
    for (const p of stage.puzzles) {
      for (const id of p.blocks ?? []) {
        const found = list.find((x) => x.id === id);
        assert.ok(found, `${name} ${p.id}: ${id} exists`);
        assert.ok(found && (found.prop === 'gate' || found.prop === 'door'), `${name} ${p.id}: ${id} is a gate or door`);
      }
    }
  }
  assert.deepEqual(S.puzzles.map((p) => p.blocks ?? []), [['gate1'], []], 'the fence gate belongs to the lantern puzzle');
  assert.deepEqual(S2.puzzles.map((p) => p.blocks ?? []), [['door1'], ['door2'], []], 'each Lab door belongs to the puzzle that opens it');
});
