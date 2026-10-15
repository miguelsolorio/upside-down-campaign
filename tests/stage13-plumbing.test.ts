// The shared world plumbing stage 1.3 added: the `music` beat step, the `pinned` beat trigger, and a puzzle that watches an
// enemy (`PuzzleDef.enemy`): the stand-in prop the caret points at, the try that shows the hint, and the death that ends it.
// Stages 1.1 and 1.2 must be untouched by all of it.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { ActorView, HeroId, PropView, SimEvent } from '../src/core/types.ts';
import { hitEnemy } from '../src/combat/damage.ts';
import type { Hero } from '../src/combat/state.ts';
import { stageGrid } from '../src/world/options.ts';
import { HINT_AFTER, createPuzzleTracker, foeKinds, isNear, puzzleProps } from '../src/world/puzzles.ts';
import { createDirector } from '../src/world/triggers.ts';
import type { DirectorEnv } from '../src/world/triggers.ts';
import { STAGE_11 } from '../src/world/stages/stage11.ts';
import { STAGE_12 } from '../src/world/stages/stage12.ts';
import { STAGE_13 as S } from '../src/world/stages/stage13.ts';
import type { Beat, PuzzleDef } from '../src/world/types.ts';
import { fakeEnv } from './stage-helpers.ts';
import { makeWhite, ofType, tc, tf } from './sim-helpers.ts';

// ---------------------------------------------------------------- the music step
const BEATS: Beat[] = [
  { id: 'wake', when: { rect: { tx: 1, ty: 1, w: 1, h: 1 } }, steps: [{ t: 'music', track: 'clock' }, { t: 'say', script: 'a' }, { t: 'music', track: 'upside' }] },
];

test('music step: it switches the track at once, in order with the other steps, and does not wait', () => {
  const heard: string[] = [];
  let release: (() => void) | null = null;
  const { env } = fakeEnv({});
  const e: DirectorEnv = {
    ...env,
    music: (t) => { heard.push(`music ${t}`); },
    say: (id, done) => { heard.push(`say ${id}`); release = done; },
  };
  const d = createDirector(BEATS, [], e);
  d.tick(1, 1);
  assert.deepEqual(heard, ['music clock', 'say a'], 'the music goes first and the dialogue holds the steps after it');
  assert.ok(d.busy());
  (release as unknown as () => void)();
  assert.deepEqual(heard, ['music clock', 'say a', 'music upside']);
  assert.ok(!d.busy());
});

test('music step: an env without a music hook is fine, so the stand-in envs of the other stages still run', () => {
  const { env, log } = fakeEnv({});
  assert.equal(env.music, undefined);
  const d = createDirector(BEATS, [], env);
  d.tick(1, 1);
  assert.deepEqual(log, ['say a']);
});

// ---------------------------------------------------------------- the pinned trigger
const PIN: Beat[] = [
  { id: 'p', when: { event: 'pinned', spawn: 'demo' }, steps: [{ t: 'say', script: 'pinned' }] },
  { id: 'c', when: { event: 'propCleared', prop: 'demo' }, steps: [{ t: 'say', script: 'cleared' }] },
];

test('pinned trigger: it fires for its own spawn once, not for another spawn or another event with the same name', () => {
  const { env, log } = fakeEnv({});
  const d = createDirector(PIN, [], env);
  d.events([{ t: 'pinned', spawnId: 'other' }]);
  d.events([{ t: 'propCleared', propId: 'other' }, { t: 'targetHit', propId: 'demo' }]);
  assert.deepEqual(log, [], 'no other spawn, no other event');
  d.events([{ t: 'pinned', spawnId: 'demo' }]);
  d.events([{ t: 'pinned', spawnId: 'demo' }]);
  assert.deepEqual(log, ['say pinned'], 'once');
  assert.ok(d.hasFired('p') && !d.hasFired('c'));
  d.restore({ fired: [], cleared: [] });
  d.events([{ t: 'pinned', spawnId: 'demo' }]);
  assert.deepEqual(log, ['say pinned', 'say pinned'], 'a retry puts it back');
});

// ---------------------------------------------------------------- the stand-in prop
const demoView = (over: Partial<ActorView> = {}): ActorView => ({
  kind: 'enemy', id: 'demogorgon', x: 200, y: 150, dir: 'left', anim: 'idle', t: 0, flash: 0, blink: false, strained: false,
  tint: null, alert: false, z: 0, bar: null, pose: 'pinned', ...over,
});
const rock: PropView = { id: 'rock', kind: 'crate', x: 10, y: 10, w: 16, h: 16, state: 'closed', t: 0 };
const kinds = foeKinds(S.puzzles, S.spawns);

test('foeKinds: only the puzzle that watches a spawn is mapped, to that spawn\'s enemy kind', () => {
  assert.deepEqual([...kinds], [['demo', 'demogorgon']]);
  assert.equal(foeKinds(STAGE_11.puzzles, STAGE_11.spawns).size, 0);
  assert.equal(foeKinds(STAGE_12.puzzles, STAGE_12.spawns).size, 0);
  const notASpawn: PuzzleDef = { id: 'x', beat: 'b', prop: 'ghost', enemy: true, hero: 'eleven', hint: 'MAYBE ELEVEN SHOULD TRY HER MIND BLAST' };
  assert.equal(foeKinds([notASpawn], S.spawns).size, 0, 'a spawn id that does not exist maps to nothing');
});

test('puzzleProps: a stand-in for the boss at its feet while it is on the field, and none once it is dying or gone', () => {
  const out = puzzleProps(S.puzzles, [rock], [demoView()], kinds);
  assert.equal(out.length, 2);
  assert.equal(out[0], rock, 'the sim\'s own props come first, untouched');
  const stand = out[1] as PropView;
  assert.equal(stand.id, 'demo', 'its id is the spawn id, so a poked event and the tracker find it');
  assert.deepEqual([stand.x + stand.w / 2, stand.y + stand.h], [200, 150], 'centered on its feet, standing above them');
  assert.ok(stand.w >= 16 && stand.h >= 24, 'about the size of its sprite');
  assert.equal(stand.state, 'closed');
  assert.equal(puzzleProps(S.puzzles, [rock], [], kinds).length, 1, 'asleep or not on the field: none');
  assert.equal(puzzleProps(S.puzzles, [rock], [demoView({ anim: 'ko' })], kinds).length, 1, 'dying: none, so the puzzle is no longer live');
  assert.equal(puzzleProps(S.puzzles, [rock], [demoView({ kind: 'npc' })], kinds).length, 1);
  assert.equal(puzzleProps(S.puzzles, [rock], [demoView({ id: 'rat' })], kinds).length, 1, 'only that kind of enemy');
});

test('puzzleProps: stages 1.1 and 1.2 get their own props back, the very same array', () => {
  for (const st of [STAGE_11, STAGE_12]) {
    const list = [rock];
    assert.equal(puzzleProps(st.puzzles, list, [demoView()], foeKinds(st.puzzles, st.spawns)), list);
  }
});

// ---------------------------------------------------------------- the hint for the pinned boss
const finish = S.puzzles.find((p) => p.id === 'finish') as PuzzleDef;
const heroNear = { x: 210, y: 150 };
const heroFar = { x: 700, y: 150 };
const watch = (actors: ActorView[], hero = heroNear, fired = true, busy = false): ReturnType<typeof createPuzzleTracker> => {
  const t = createPuzzleTracker([finish]);
  t.tick({ hasFired: () => fired, busy, props: puzzleProps(S.puzzles, [], actors, kinds), hero });
  return t;
};

test('boss hint: it waits for the pin beat and its script, and a try with the wrong hero shows the hint at once', () => {
  const t = createPuzzleTracker([finish]);
  const tick = (fired: boolean, busy: boolean, actors = [demoView()]): void =>
    t.tick({ hasFired: () => fired, busy, props: puzzleProps(S.puzzles, [], actors, kinds), hero: heroNear });
  tick(false, false);
  t.poke('demo', 'mike');
  assert.equal(t.highlight(), null, 'not before the pinned beat has fired');
  tick(true, true);
  assert.equal(t.highlight(), null, 'not while the pinned script plays');
  tick(true, false);
  assert.equal(t.highlight()?.id, 'finish');
  assert.equal(t.triedProp(finish), 'demo', 'the caret goes on the boss');
  t.reset();
  tick(true, false);
  assert.equal(t.highlight(), null, 'a retry forgets the try');
});

test('boss hint: only a try that is not Eleven\'s counts, from any other hero', () => {
  for (const hero of ['mike', 'dustin', 'lucas'] as HeroId[]) {
    const t = watch([demoView()]);
    t.poke('demo', hero);
    assert.equal(t.highlight()?.id, 'finish', `${hero} hitting the pinned boss shows the hint`);
  }
  const t = watch([demoView()]);
  t.poke('demo', 'eleven');
  assert.equal(t.highlight(), null, 'Eleven trying it is who the hint wants');
  t.poke('some other prop', 'mike');
  assert.equal(t.highlight(), null, 'and a try on anything else is not this puzzle');
});

test('boss hint: standing by the pinned boss for five seconds shows it, and walking off or killing it does not', () => {
  const t = createPuzzleTracker([finish]);
  const tick = (actors: ActorView[], hero: { x: number; y: number }): void =>
    t.tick({ hasFired: () => true, busy: false, props: puzzleProps(S.puzzles, [], actors, kinds), hero });
  for (let f = 0; f < HINT_AFTER - 2; f++) tick([demoView()], heroNear);
  assert.equal(t.highlight(), null, 'not at four seconds and some');
  for (let f = 0; f < 4; f++) tick([demoView()], heroNear);
  assert.equal(t.highlight()?.id, 'finish', 'at five seconds');
  assert.equal(t.triedProp(finish), null, 'the clock hint has no tried prop');
  tick([demoView({ anim: 'ko' })], heroNear);
  assert.equal(t.highlight(), null, 'its death ends the hint');
  const far = createPuzzleTracker([finish]);
  for (let f = 0; f < HINT_AFTER + 10; f++) far.tick({ hasFired: () => true, busy: false, props: puzzleProps(S.puzzles, [], [demoView()], kinds), hero: heroFar });
  assert.equal(far.highlight(), null, 'far from it the clock does not run');
  const stand = puzzleProps(S.puzzles, [], [demoView()], kinds)[0] as PropView;
  assert.ok(isNear(stand, heroNear) && !isNear(stand, heroFar));
});

// ---------------------------------------------------------------- the real sim: a pinned Demogorgon on the real court
const bossSpawn = S.spawns.filter((s) => s.kind === 'enemy' && s.id === 'demo');
const idleIn = { mx: 0, my: 0, attackHeld: false, attackPressed: false, specialPressed: false, specialHeld: false, swapDelta: 0 as const, swapTo: -1, burstPressed: false };

/** The boss awake and pinned the way a fight leaves it, on the stage's own grid, with Mike in front and Eleven on the bench. */
function pinned(): ReturnType<typeof makeWhite>['sim'] {
  const { sim, s } = makeWhite({
    grid: stageGrid(S), party: [{ id: 'mike', level: 5 }, { id: 'eleven', level: 4 }], start: { x: tc(34), y: tf(8) }, spawns: bossSpawn,
    enemyMult: S.enemyMult, seed: 4,
  });
  sim.spawnGroup('boss');
  const boss = s.enemies.find((e) => e.kind === 'demogorgon');
  assert.ok(boss?.demo);
  boss.demo.stuns = 3;
  boss.hp = 30;
  boss.x = tc(33) + 6; boss.y = tf(8);
  const mike = s.heroes[0] as Hero;
  hitEnemy(s, mike, boss, { power: 30, noCrit: true });
  assert.equal(boss.demo.move, 'pinned');
  return sim;
}

test('boss hint, in the real sim: Mike swinging at the pinned boss is a try on "demo" the tracker answers, and Eleven\'s beam ends it', () => {
  const sim = pinned();
  const tracker = createPuzzleTracker(S.puzzles);
  const seen: SimEvent[] = [];
  const stepIn = (input: Partial<typeof idleIn>): void => {
    const ev = sim.step({ ...idleIn, ...input });
    seen.push(...ev);
    for (const e of ofType(ev, 'poked')) tracker.poke(e.propId, e.hero);
    const v = sim.view();
    tracker.tick({ hasFired: () => true, busy: false, props: puzzleProps(S.puzzles, v.props, v.actors, kinds), hero: sim.heroPos() });
  };
  stepIn({});
  assert.ok(ofType(seen, 'pinned').some((e) => e.spawnId === 'demo'), 'the sim reports the pin with the spawn id');
  assert.equal(tracker.highlight(), null, 'nobody has tried anything');
  // Face west with a nudge, then swing.
  for (let f = 0; f < 4; f++) stepIn({ mx: -0.2 });
  stepIn({ mx: -0.2, attackPressed: true });
  for (let f = 0; f < 20; f++) stepIn({});
  assert.deepEqual(ofType(seen, 'poked').map((e) => [e.propId, e.hero]), [['demo', 'mike']], 'one try, on the boss, by Mike');
  assert.equal(tracker.highlight()?.id, 'finish');
  assert.equal(tracker.triedProp(finish), 'demo');
  const stand = puzzleProps(S.puzzles, sim.view().props, sim.view().actors, kinds).find((p) => p.id === 'demo');
  assert.ok(stand && isNear(stand, sim.heroPos()), 'the caret has a prop to sit on, and the party is near it');
  // Swap to Eleven, face it and blast.
  stepIn({ swapTo: 1 });
  for (let f = 0; f < 12; f++) stepIn({ mx: -0.2 });
  stepIn({ mx: -0.2, specialPressed: true });
  for (let f = 0; f < 60 && !ofType(seen, 'kill').length; f++) stepIn({});
  const kill = ofType(seen, 'kill')[0];
  assert.deepEqual([kill?.spawnId, kill?.by, kill?.kind], ['demo', 'eleven', 'demogorgon']);
  assert.ok(ofType(seen, 'groupCleared').some((e) => e.group === 'boss'), 'the boss group is cleared, which is the level_clear beat');
  for (let f = 0; f < 80; f++) stepIn({});
  assert.equal(tracker.highlight(), null, 'the hint is gone once it is dead');
  assert.equal(puzzleProps(S.puzzles, sim.view().props, sim.view().actors, kinds).some((p) => p.id === 'demo'), false);
});
