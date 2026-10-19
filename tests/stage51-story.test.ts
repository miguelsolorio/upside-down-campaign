// Stage 5.1, Hawkins under lockdown: its 6 beats and the director running them (the checkpoint wakes its squad after its script, the commander
// beat shuts door1 and switches the music before its script and wakes the Commander after, the clear is script, door, finish, and a retry
// carries the music on), and the 6 scripts: Hopper and the narrator. The map, the budget and the bot's route are in stage51.test.ts, and the
// play scene in stage51-play.test.ts.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { keyText, setPromptDevice } from '../src/core/bindings.ts';
import { fitsBox, hasEmDash, wrapText } from '../src/core/text.ts';
import { SCRIPTS } from '../src/story/scripts.ts';
import { L14_SCRIPTS } from '../src/story/scripts_l14.ts';
import { createDirector, musicAfter } from '../src/world/triggers.ts';
import type { DirectorEnv } from '../src/world/triggers.ts';
import type { Sim } from '../src/core/types.ts';
import { BEAT_IDS, SCRIPT_IDS, S, at, inRect, inRoom, kit, prop, rectOf, rectTiles, when } from './stage51-helpers.ts';

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

test('stage 5.1: every beat has a trigger and a real script, in the spec\'s order, and door1 shuts on the commander beat and opens at the clear', () => {
  assert.deepEqual(S.beats.map((b) => b.id), BEAT_IDS, 'the beats are the spec\'s, in route order');
  const groups = new Set(enemies.map((e) => e.group));
  const open = flood(new Set(['boom1', 'crate1']));
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
    else if (w.event === 'pinned') assert.fail('no pinned boss in this stage');
    else if (w.event === 'defended') assert.fail('no defense in this stage');
    else if (w.event === 'curseEnd') assert.fail('no curse in this stage');
    else assert.ok(props.some((p) => p.id === w.prop), `${b.id} watches ${w.prop}`);
  }
  const said = new Set(S.beats.flatMap((b) => b.steps.flatMap((st) => (st.t === 'say' ? [st.script] : []))));
  assert.deepEqual([...said].sort(), [...SCRIPT_IDS].sort(), 'every script is played by some beat, and no other is');
  assert.deepEqual(when('level_clear'), { cleared: 'boss' }, 'the clear is the Commander\'s death');
  assert.equal((when('square') as { needs: string }).needs, 'checkpoint', 'the square waits on the checkpoint');
  const steps = (id: string): unknown => S.beats.find((b) => b.id === id)?.steps;
  assert.deepEqual(steps('start'), [{ t: 'say', script: 'l14_start' }]);
  assert.deepEqual(steps('checkpoint'), [{ t: 'say', script: 'l14_checkpoint' }, { t: 'wake', group: 'checkpoint' }]);
  assert.deepEqual(steps('commander'), [{ t: 'close', prop: 'door1' }, { t: 'music', track: 'clock' }, { t: 'say', script: 'l14_commander' }, { t: 'wake', group: 'boss' }]);
  assert.deepEqual(steps('level_clear'), [{ t: 'say', script: 'l14_clear' }, { t: 'open', prop: 'door1' }, { t: 'finish' }]);
  assert.ok(S.beats.every((b) => b.steps.every((st) => st.t !== 'scare' && st.t !== 'waves' && st.t !== 'defend' && st.t !== 'leave' && st.t !== 'recruit')), 'no scare, waves, defense, npc or recruit');
  // The triggers sit where the spec puts them.
  const through = (gates: string[], id: string): boolean => rectTiles(rectOf(id)).some(([x, y]) => at(flood(new Set(gates)), x, y) === 1);
  for (const id of ['start', 'checkpoint']) assert.ok(through([], id), `${id} is reachable at the start`);
  for (const id of ['square', 'commander']) {
    assert.ok(through(['boom1'], id), `${id} is reachable once boom1 is open`);
    assert.ok(!through([], id), `${id} is not reachable with boom1 shut`);
  }
  assert.ok(through(['boom1'], 'cache_hint') && !through([], 'cache_hint'), 'the cache\'s hint is inside the Lab');
  assert.ok(inRect(rectOf('start'), startTx, startTy), 'the start beat covers the start');
  const boom = prop('boom1'), crate = prop('crate1');
  assert.ok(rectTiles(rectOf('checkpoint')).every(([x, y]) => inRoom('street', x, y) && x < boom.tx && boom.tx - x <= 3 && y >= boom.ty && y < boom.ty + 3), 'the checkpoint beat is the three tiles of road in front of the boom gate, on the street side');
  assert.ok(rectTiles(rectOf('square')).every(([x, y]) => inRoom('plaza', x, y) && x <= 24), 'the square beat is the plaza\'s west end, past the gate');
  assert.ok(rectTiles(rectOf('cache_hint')).every(([x, y]) => inRoom('southcorr', x, y) && y <= crate.ty + 3 && x >= crate.tx - 1 && x <= crate.tx + 2 + 1), 'the cache hint stands in front of crate1, in the south corridor');
  const arena = rectTiles(rectOf('commander'));
  assert.ok(arena.every(([x, y]) => inRoom('bay', x, y)), 'the commander trigger is inside the bay');
  assert.ok(arena.every(([x]) => x >= prop('door1').tx + 3), 'three tiles clear of door1, so nobody stands in it when it shuts');
  assert.ok([3, 4].every((y) => arena.some(([, v]) => v === y)), 'level with the doorway');
  assert.equal(musicAfter(S.beats, ['start'], S.music), 'lab');
  assert.equal(musicAfter(S.beats, ['start', 'checkpoint', 'square', 'cache_hint'], S.music), 'lab', 'a retry from the Lab\'s string is still on the Lab\'s music');
  assert.equal(musicAfter(S.beats, ['start', 'checkpoint', 'square', 'commander'], S.music), 'clock', 'and after the commander beat on the boss track');
});

test('director: the beats run in route order, the squad wakes after the checkpoint script, the commander shuts door1 before its script, and the clear is script, door, finish', () => {
  const { env, log } = fakeBase({ street: 2, checkpoint: 3, square: 5, lab: 4, boss: 1 });
  const d = createDirector(S.beats, S.waves, env);
  const run = (fn: () => void): string[] => { log.length = 0; fn(); return [...log]; };
  const tick = (id: string): void => { const r = rectOf(id); d.tick(r.tx, r.ty); };
  assert.deepEqual(run(() => { d.tick(startTx, startTy); d.tick(startTx, startTy); }), ['say l14_start'], 'a rect beat fires once');
  assert.deepEqual(run(() => tick('square')), [], 'the square waits for the checkpoint');
  assert.deepEqual(run(() => tick('checkpoint')), ['say l14_checkpoint', 'wake checkpoint']);
  assert.deepEqual(run(() => tick('square')), ['say l14_square']);
  assert.deepEqual(run(() => tick('cache_hint')), ['say l14_cache_hint']);
  assert.deepEqual(run(() => tick('commander')), ['close door1', 'music clock', 'say l14_commander', 'wake boss']);
  assert.deepEqual(run(() => tick('commander')), [], 'and only once');
  assert.ok(!d.finished());
  assert.deepEqual(run(() => d.events([{ t: 'groupCleared', group: 'square' }])), [], 'a group that is not the boss does nothing');
  assert.deepEqual(run(() => d.events([{ t: 'groupCleared', group: 'boss' }])), ['say l14_clear', 'open door1', 'finish']);
  assert.ok(d.finished());
});

test('director: a retry from lights_lab brings the Commander in again, and one from lights_square does not wake the squad twice', () => {
  const a = fakeBase({ boss: 1 });
  const lab = createDirector(S.beats, S.waves, a.env);
  lab.restore({ fired: ['start', 'checkpoint', 'square', 'cache_hint'], cleared: ['street', 'checkpoint', 'square', 'lab'] });
  const r = rectOf('commander');
  lab.tick(r.tx, r.ty);
  assert.deepEqual(a.log, ['close door1', 'music clock', 'say l14_commander', 'wake boss']);
  const b = fakeBase({ square: 4 });
  const sq = createDirector(S.beats, S.waves, b.env);
  sq.restore({ fired: ['start', 'checkpoint', 'square'], cleared: ['street', 'checkpoint'] });
  const rc = rectOf('checkpoint');
  sq.tick(rc.tx, rc.ty);
  assert.deepEqual(b.log, [], 'the checkpoint beat is done');
});

// ---------------------------------------------------------------- the scripts
test('stage 5.1: the 6 scripts exist, fit the box on a keyboard, a pad and a touch screen, and keep to Hopper and the narrator', () => {
  assert.deepEqual(L14_SCRIPTS.map((s) => s.id), SCRIPT_IDS, 'in route order');
  assert.deepEqual(Object.keys(SCRIPTS).filter((k) => k.startsWith('l14_')).sort(), [...SCRIPT_IDS].sort(), 'no stray l14 scripts');
  try {
    for (const device of ['keyboard', 'gamepad', 'touch'] as const) {
      setPromptDevice(device);
      for (const s of L14_SCRIPTS) {
        assert.ok(s.lines.length >= 2 && s.lines.length <= 8, `${s.id} has ${s.lines.length} lines`);
        for (const [i, l] of s.lines.entries()) {
          const shown = keyText(l.text);
          assert.ok(shown.length <= 96 && fitsBox(shown), `${device} ${s.id}[${i}] needs ${wrapText(shown).length} rows: ${shown}`);
          if (device === 'gamepad') assert.ok(!/\{|\}/.test(shown) && !/\b(WASD|SPACE|TAB|SHIFT|ESC|[JKLQEUVZC])\b/.test(shown), `${s.id}[${i}] names a key to a pad: ${shown}`);
        }
      }
    }
  } finally {
    setPromptDevice('keyboard');
  }
  const all = L14_SCRIPTS.flatMap((s) => s.lines.map((l, i) => ({ id: s.id, i, ...l })));
  const text = (id: string): string => (SCRIPTS[id]?.lines ?? []).map((l) => l.text).join(' ');
  assert.ok(all.every((l) => l.who === 'hopper' || l.who === 'narrator'), 'nobody but Hopper and the narrator speaks: the rest of the party is whoever was picked');
  assert.ok(all.filter((l) => l.who === 'hopper').length >= 12, 'Hopper has the lines');
  assert.ok(all.filter((l) => l.who === 'narrator').length >= 3 && all.filter((l) => l.who === 'narrator').length <= 6, 'the narrator sets the scene now and then');
  assert.ok(all.every((l) => !hasEmDash(l.text)), 'no em dashes');
  assert.ok(all.every((l) => !/seamless|robust|leverage|unlock|delve/i.test(l.text)), 'no banned words');
  assert.ok(all.every((l) => !/\b[0-9]\b/.test(l.text)), 'numbers under ten are written out');
  assert.ok(all.every((l) => !/\{swap/.test(l.text)), 'no line names a swap slot: the party is whoever was picked');
  assert.ok(all.every((l) => l.text === l.text.trim() && !/ {2}|\.\.\./.test(l.text)), 'no stray spaces or dots');
  assert.match(text('l14_start'), /shield/i, 'the first script teaches the shield');
  assert.match(text('l14_start'), /side/i, 'and going round to the side');
  assert.match(text('l14_checkpoint'), /\{attack\}/, 'the checkpoint teaches the boom gate: face it and attack');
  assert.match(text('l14_checkpoint'), /gate/i);
  assert.match(text('l14_square'), /Gate/, 'the rifts are the Gate\'s cracks');
  assert.match(text('l14_commander'), /back/i, 'the Commander is hit from behind');
  assert.match(text('l14_commander'), /shield/i);
  assert.match(text('l14_commander'), /whistle/i, 'and he whistles for a squad');
  assert.ok(!all.some((l) => /\b(two|three|four|five|six|seven|eight|nine|\d+) (soldiers|troopers|agents|guards|rifles)\b/i.test(l.text)), 'nobody counts the foes, so the roster can change without the words');
  const expr = new Set(all.flatMap((l) => (l.expr ? [l.expr] : [])));
  assert.ok(['worried', 'determined', 'happy'].every((e) => expr.has(e as never)), 'his face changes with the mood');
  assert.equal(SCRIPTS.l14_clear?.lines.at(-1)?.who, 'hopper', 'the stage ends on his word');
});
