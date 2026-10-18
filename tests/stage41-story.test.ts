// Stage 4.1, Kamchatka: its 10 beats and the director running them (the guard room wakes after the block script, the pit's door shuts before
// its script and the music switches, the clear is script, door, finish, and a retry carries the music on), and the 10 scripts: Hopper alone,
// gruff and soft underneath, and the narrator. The map, the budget and the bot's route are in stage41.test.ts, and the play scene in
// stage41-play.test.ts.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { keyText, setPromptDevice } from '../src/core/bindings.ts';
import { fitsBox, hasEmDash, wrapText } from '../src/core/text.ts';
import { SCRIPTS } from '../src/story/scripts.ts';
import { L10_SCRIPTS } from '../src/story/scripts_l10.ts';
import { createDirector, musicAfter } from '../src/world/triggers.ts';
import type { DirectorEnv } from '../src/world/triggers.ts';
import type { Sim } from '../src/core/types.ts';
import { BEAT_IDS, SCRIPT_IDS, S, at, inRect, inRoom, kit, prop, rectOf, rectTiles, when } from './stage41-helpers.ts';

const { idx, enemies, props, flood, startTx, startTy } = kit;

// ---------------------------------------------------------------- beats
/** A stand-in sim and env for the director that also takes close and music, which this stage's beats use. */
function fakeBase(alive: Record<string, number>): { env: DirectorEnv; log: string[] } {
  const log: string[] = [];
  const sim = {
    enemiesAlive: (g?: string) => (g === undefined ? 0 : alive[g] ?? 0),
    spawnGroup: (g: string) => { log.push(`wake ${g}`); },
    closeProp: (id: string) => { log.push(`close ${id}`); },
    party: () => [],
  } as unknown as Sim;
  const env: DirectorEnv = {
    sim: () => sim, say: (id, done) => { log.push(`say ${id}`); done(); }, scare: (done) => done(), open: (id) => { log.push(`open ${id}`); },
    music: (track) => { log.push(`music ${track}`); }, jingle: () => undefined, finish: () => { log.push('finish'); },
  };
  return { env, log };
}

test('stage 4.1: every beat has a trigger and a real script, in the spec\'s order, and door1 shuts on the pit beat and opens at the clear', () => {
  assert.deepEqual(S.beats.map((b) => b.id), BEAT_IDS, 'the beats are the spec\'s, in route order');
  const groups = new Set(enemies.map((e) => e.group));
  const open = flood(new Set(['crack1', 'crack2']));
  const ids = S.beats.map((b) => b.id);
  for (const b of S.beats) {
    for (const st of b.steps) {
      if (st.t === 'say') assert.ok(SCRIPT_IDS.includes(st.script) && SCRIPTS[st.script], `${b.id} plays ${st.script}`);
      if (st.t === 'wake') assert.ok(groups.has(st.group), `${b.id} wakes ${st.group}`);
      if (st.t === 'open' || st.t === 'close') assert.ok(props.some((p) => p.id === st.prop), `${b.id} opens or closes ${st.prop}`);
    }
    const w = b.when;
    if ('rect' in w) {
      assert.ok(rectTiles(w.rect).some(([x, y]) => open[idx(x, y)] === 1), `${b.id} rect is reachable`);
      if (w.needs) assert.ok(ids.indexOf(w.needs) >= 0 && ids.indexOf(w.needs) < ids.indexOf(b.id), `${b.id} needs ${w.needs}, which comes before it`);
    } else if ('cleared' in w) assert.ok(groups.has(w.cleared), `${b.id} waits on ${w.cleared}`);
    else if ('after' in w) assert.ok(ids.includes(w.after), `${b.id} follows ${w.after}`);
    else if (w.event === 'pinned') assert.ok(enemies.some((e) => e.id === w.spawn), `${b.id} waits on ${w.spawn}`);
    else if (w.event === 'defended') assert.fail('no defense in this stage');
    else if (w.event === 'curseEnd') assert.fail('no curse in this stage');
    else assert.ok(props.some((p) => p.id === w.prop), `${b.id} watches ${w.prop}`);
  }
  const said = new Set(S.beats.flatMap((b) => b.steps.flatMap((st) => (st.t === 'say' ? [st.script] : []))));
  assert.deepEqual([...said].sort(), [...SCRIPT_IDS].sort(), 'every script is played by some beat, and no other is');
  assert.deepEqual(when('crack_done'), { event: 'propCleared', prop: 'crack1' });
  assert.deepEqual(when('pit_down'), { event: 'pinned', spawn: 'pitdemo' });
  assert.deepEqual(when('level_clear'), { cleared: 'boss' });
  assert.equal((when('pit') as { needs: string }).needs, 'shaft', 'the pit waits on the shaft');
  const steps = (id: string): unknown => S.beats.find((b) => b.id === id)?.steps;
  assert.deepEqual(steps('start'), [{ t: 'say', script: 'l10_start' }]);
  assert.deepEqual(steps('block'), [{ t: 'say', script: 'l10_block' }, { t: 'wake', group: 'guardroom' }]);
  assert.deepEqual(steps('pit'), [{ t: 'close', prop: 'door1' }, { t: 'music', track: 'clock' }, { t: 'say', script: 'l10_pit' }, { t: 'wake', group: 'boss' }]);
  assert.deepEqual(steps('level_clear'), [{ t: 'say', script: 'l10_clear' }, { t: 'open', prop: 'door1' }, { t: 'finish' }]);
  assert.ok(S.beats.every((b) => b.steps.every((st) => st.t !== 'scare' && st.t !== 'waves' && st.t !== 'defend' && st.t !== 'leave' && st.t !== 'recruit')), 'no scare, waves, defense, npc or recruit: Hopper is alone');
  // The triggers sit where the spec puts them.
  const through = (gates: string[], id: string): boolean => rectTiles(rectOf(id)).some(([x, y]) => at(flood(new Set(gates)), x, y) === 1);
  for (const id of ['start', 'yard', 'crack_hint']) assert.ok(through([], id), `${id} is reachable at the start`);
  for (const id of ['block', 'shaft', 'pit']) {
    assert.ok(through(['crack1'], id), `${id} is reachable once crack1 is open`);
    assert.ok(!through([], id), `${id} is not reachable with crack1 shut`);
  }
  assert.ok(through(['crack1'], 'cell_hint') && !through([], 'cell_hint'), 'the cache\'s hint is inside the block');
  assert.ok(inRect(rectOf('start'), startTx, startTy), 'the start beat covers the start');
  const c1 = prop('crack1'), c2 = prop('crack2');
  assert.ok(rectTiles(rectOf('crack_hint')).every(([x, y]) => inRoom('yard', x, y) && y > c1.ty && y <= c1.ty + 3 && x >= c1.tx - 1 && x <= c1.tx + 2), 'the crack hint stands in front of crack1, on the yard side');
  assert.ok(rectTiles(rectOf('cell_hint')).every(([x, y]) => inRoom('corridor', x, y) && y <= c2.ty + 3 && x >= c2.tx - 1 && x <= c2.tx + 2), 'the cell hint stands in front of crack2, in the corridor');
  assert.ok(rectTiles(rectOf('yard')).every(([x, y]) => inRoom('yard', x, y) && y >= 25), 'the yard beat is the yard\'s south edge, at the gate');
  assert.ok(rectTiles(rectOf('block')).every(([x, y]) => inRoom('corridor', x, y) && x > c1.tx + 1), 'the block beat is the corridor past the notch');
  assert.ok(rectTiles(rectOf('shaft')).every(([x, y]) => inRoom('shaft', x, y)) && rectOf('shaft').tx === 19, 'the shaft beat is the landing\'s west edge, its top');
  const arena = rectTiles(rectOf('pit'));
  assert.ok(arena.every(([x, y]) => inRoom('pit', x, y)), 'the pit trigger is inside the arena');
  assert.ok(arena.every(([x]) => x >= prop('door1').tx + 3), 'three tiles clear of door1, so nobody stands in it when it shuts');
  assert.ok([10, 11].every((y) => arena.some(([, v]) => v === y)), 'level with the doorway');
  assert.equal(musicAfter(S.beats, ['start'], S.music), 'kamchatka');
  assert.equal(musicAfter(S.beats, ['start', 'block', 'shaft'], S.music), 'kamchatka', 'a retry from the shaft\'s string is still on the camp\'s music');
  assert.equal(musicAfter(S.beats, ['start', 'block', 'shaft', 'pit'], S.music), 'clock', 'and after the pit beat on the boss track');
});

test('director: the beats run in route order, the guard room wakes after the block script, the pit shuts door1 before its script, and the clear is script, door, finish', () => {
  const { env, log } = fakeBase({ yard: 5, block: 3, guardroom: 2, boss: 1 });
  const d = createDirector(S.beats, S.waves, env);
  const run = (fn: () => void): string[] => { log.length = 0; fn(); return [...log]; };
  const tick = (id: string): void => { const r = rectOf(id); d.tick(r.tx, r.ty); };
  assert.deepEqual(run(() => { d.tick(startTx, startTy); d.tick(startTx, startTy); }), ['say l10_start'], 'a rect beat fires once');
  assert.deepEqual(run(() => tick('yard')), ['say l10_yard']);
  assert.deepEqual(run(() => tick('crack_hint')), ['say l10_crack_hint']);
  assert.deepEqual(run(() => d.events([{ t: 'propCleared', propId: 'crack1' }])), ['say l10_crack_done']);
  assert.deepEqual(run(() => d.events([{ t: 'propCleared', propId: 'other' }])), []);
  assert.deepEqual(run(() => tick('block')), ['say l10_block', 'wake guardroom']);
  assert.deepEqual(run(() => tick('cell_hint')), ['say l10_cell_hint']);
  assert.deepEqual(run(() => tick('pit')), [], 'the pit waits for the shaft');
  assert.deepEqual(run(() => tick('shaft')), ['say l10_shaft']);
  assert.deepEqual(run(() => tick('pit')), ['close door1', 'music clock', 'say l10_pit', 'wake boss']);
  assert.deepEqual(run(() => tick('pit')), [], 'and only once');
  assert.deepEqual(run(() => d.events([{ t: 'pinned', spawnId: 'pitdemo' }])), ['say l10_pit_down']);
  assert.deepEqual(run(() => d.events([{ t: 'pinned', spawnId: 'other' }])), []);
  assert.ok(!d.finished());
  assert.deepEqual(run(() => d.events([{ t: 'groupCleared', group: 'boss' }])), ['say l10_clear', 'open door1', 'finish']);
  assert.ok(d.finished());
});

test('director: a retry from the shaft\'s string brings the Demogorgon in again, and one from the guard room\'s does not wake the sleepers twice', () => {
  const a = fakeBase({ boss: 1 });
  const shaft = createDirector(S.beats, S.waves, a.env);
  shaft.restore({ fired: ['start', 'yard', 'crack_hint', 'crack_done', 'block', 'shaft'], cleared: ['yard', 'block', 'guardroom'] });
  const r = rectOf('pit');
  shaft.tick(r.tx, r.ty);
  assert.deepEqual(a.log, ['close door1', 'music clock', 'say l10_pit', 'wake boss']);
  const b = fakeBase({ guardroom: 2 });
  const room = createDirector(S.beats, S.waves, b.env);
  room.restore({ fired: ['start', 'yard', 'crack_hint', 'crack_done', 'block'], cleared: ['yard'] });
  const rb = rectOf('block');
  room.tick(rb.tx, rb.ty);
  assert.deepEqual(b.log, [], 'the block beat is done');
});

// ---------------------------------------------------------------- the scripts
test('stage 4.1: the 10 scripts exist, fit the box on a keyboard and a pad, and keep to Hopper alone and the narrator', () => {
  assert.deepEqual(L10_SCRIPTS.map((s) => s.id), SCRIPT_IDS, 'in the doc\'s order');
  assert.deepEqual(Object.keys(SCRIPTS).filter((k) => k.startsWith('l10_')).sort(), [...SCRIPT_IDS].sort(), 'no stray l10 scripts');
  try {
    for (const device of ['keyboard', 'gamepad'] as const) {
      setPromptDevice(device);
      for (const s of L10_SCRIPTS) {
        assert.ok(s.lines.length >= 2 && s.lines.length <= 8, `${s.id} has ${s.lines.length} lines`);
        for (const [i, l] of s.lines.entries()) {
          const shown = keyText(l.text);
          assert.ok(shown.length <= 96 && fitsBox(shown), `${device} ${s.id}[${i}] needs ${wrapText(shown).length} rows: ${shown}`);
          assert.ok(!/\{|\}/.test(shown), `${s.id}[${i}] has an unfilled token`);
        }
      }
    }
  } finally {
    setPromptDevice('keyboard');
  }
  const all = L10_SCRIPTS.flatMap((s) => s.lines.map((l, i) => ({ id: s.id, i, ...l })));
  const text = (id: string): string => (SCRIPTS[id]?.lines ?? []).map((l) => l.text).join(' ');
  assert.ok(all.every((l) => l.who === 'hopper' || l.who === 'narrator'), 'nobody but Hopper and the narrator speaks');
  const hopper = all.filter((l) => l.who === 'hopper');
  assert.ok(hopper.length >= 25, `Hopper has ${hopper.length} lines`);
  assert.ok(all.filter((l) => l.who === 'narrator').length >= 3 && all.filter((l) => l.who === 'narrator').length <= 6, 'the narrator sets the scene now and then');
  assert.ok(all.every((l) => !hasEmDash(l.text)), 'no em dashes');
  assert.ok(all.every((l) => !/seamless|robust|leverage|unlock|delve/i.test(l.text)), 'no banned words');
  assert.ok(all.every((l) => !/\{swap/.test(l.text)), 'no line names a swap slot: there is nobody to swap to');
  assert.ok(all.every((l) => l.text === l.text.trim() && !/ {2}|\.\.\./.test(l.text)), 'no stray spaces or dots');
  assert.match(text('l10_start'), /Joyce/);
  assert.match(text('l10_start'), /lights/i, 'the care package is Joyce\'s lights');
  assert.match(text('l10_start'), /note/i, 'with a note');
  assert.match(text('l10_start'), /\{interact\}/, 'the first script teaches the lights');
  assert.match(text('l10_yard'), /\{special\}/, 'the yard teaches the slam against a baton guard');
  assert.match(text('l10_yard'), /bullet|rifle/i);
  assert.match(text('l10_crack_hint'), /\{attack\}/);
  assert.match(text('l10_cell_hint'), /\{attack\}/);
  assert.match(text('l10_shaft'), /\{interact\}/, 'the shaft points at its string of lights');
  assert.match(text('l10_pit'), /wall/, 'the pit teaches the wall stun');
  assert.match(text('l10_pit_down'), /\{special\}/, 'and the finisher is the slam');
  assert.match(text('l10_pit_down'), /floor/i);
  assert.ok(/pal/.test(text('l10_pit')) && !all.some((l) => l.id !== 'l10_pit' && l.id !== 'l10_clear' && /pal\b/.test(l.text)), 'he talks to the beast in the pit, and says sorry when it is over');
  assert.ok(all.filter((l) => l.who === 'hopper' && /Joyce/.test(l.text)).length >= 3, 'he talks to Joyce in his head, now and then');
  assert.ok(!all.some((l) => /\b(two|three|four|five|six|seven|eight|nine|\d+) (guards|rifles|batons)\b/i.test(l.text)), 'nobody counts the guards, so the roster can change without the words');
  const expr = new Set(all.flatMap((l) => (l.expr ? [l.expr] : [])));
  assert.ok(['worried', 'determined', 'happy'].every((e) => expr.has(e as never)), 'his face changes with the mood');
  assert.equal(SCRIPTS.l10_clear?.lines.at(-1)?.who, 'hopper', 'the stage ends on his word');
});
