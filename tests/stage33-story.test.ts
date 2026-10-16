// Stage 3.3, the food court: its 13 beats and the director running them (Hopper leaves, the doors shut before the script, the clear is
// boom, script, doors, finish, and a retry after Billy is freed brings the Mind Flayer in again), the 14 scripts including Hopper's
// letter, and the voices they keep. The map, the budget and the bot are in stage33.test.ts, and the play scene in stage33-play.test.ts.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { keyText, setPromptDevice } from '../src/core/bindings.ts';
import { fitsBox, hasEmDash, wrapText } from '../src/core/text.ts';
import { SCRIPTS } from '../src/story/scripts.ts';
import { L9_SCRIPTS } from '../src/story/scripts_l9.ts';
import { createDirector, musicAfter } from '../src/world/triggers.ts';
import type { DirectorEnv } from '../src/world/triggers.ts';
import type { Sim } from '../src/core/types.ts';
import { BEAT_IDS, SCRIPT_IDS, S, at, inRect, inRoom, kit, prop, rectOf, rectTiles, when } from './stage33-helpers.ts';

const { idx, enemies, props, npcs, flood, startTx, startTy } = kit;

// ---------------------------------------------------------------- beats
/** A stand-in sim and env for the director that also takes close, music, boom and leave, which this stage's beats use. */
function fakeBase(alive: Record<string, number>): { env: DirectorEnv; log: string[] } {
  const log: string[] = [];
  const sim = {
    enemiesAlive: (g?: string) => (g === undefined ? 0 : alive[g] ?? 0),
    spawnGroup: (g: string) => { log.push(`wake ${g}`); },
    closeProp: (id: string) => { log.push(`close ${id}`); },
    dismiss: (id: string) => { log.push(`leave ${id}`); },
    party: () => [],
  } as unknown as Sim;
  const env: DirectorEnv = {
    sim: () => sim, say: (id, done) => { log.push(`say ${id}`); done(); }, scare: (done) => done(), open: (id) => { log.push(`open ${id}`); },
    music: (track) => { log.push(`music ${track}`); }, boom: () => { log.push('boom'); }, jingle: () => undefined, finish: () => { log.push('finish'); },
  };
  return { env, log };
}

test('stage 3.3: every beat has a trigger and a real script, in the spec\'s order, and the doors close on the billy beat and open at the clear', () => {
  assert.deepEqual(S.beats.map((b) => b.id), BEAT_IDS, 'the beats are the spec\'s, in route order');
  const groups = new Set(enemies.map((e) => e.group));
  const open = flood(new Set(['crack1', 'crate1']));
  const ids = S.beats.map((b) => b.id);
  for (const b of S.beats) {
    for (const st of b.steps) {
      if (st.t === 'say') assert.ok(SCRIPT_IDS.includes(st.script) && SCRIPTS[st.script], `${b.id} plays ${st.script}`);
      if (st.t === 'wake') assert.ok(groups.has(st.group), `${b.id} wakes ${st.group}`);
      if (st.t === 'open' || st.t === 'close') assert.ok(props.some((p) => p.id === st.prop), `${b.id} opens or closes ${st.prop}`);
      if (st.t === 'leave') assert.ok(npcs.some((n) => n.id === st.npc), `${b.id} sends away ${st.npc}`);
    }
    const w = b.when;
    if ('rect' in w) {
      assert.ok(rectTiles(w.rect).some(([x, y]) => open[idx(x, y)] === 1), `${b.id} rect is reachable`);
      if (w.needs) assert.ok(ids.indexOf(w.needs) >= 0 && ids.indexOf(w.needs) < ids.indexOf(b.id), `${b.id} needs ${w.needs}, which comes before it`);
    } else if ('cleared' in w) assert.ok(groups.has(w.cleared), `${b.id} waits on ${w.cleared}`);
    else if ('after' in w) assert.ok(ids.includes(w.after), `${b.id} follows ${w.after}`);
    else if (w.event === 'pinned') assert.ok(enemies.some((e) => e.id === w.spawn), `${b.id} waits on ${w.spawn}`);
    else if (w.event === 'defended') assert.fail('no defense in this stage');
    else assert.ok(props.some((p) => p.id === w.prop), `${b.id} watches ${w.prop}`);
  }
  const said = new Set(S.beats.flatMap((b) => b.steps.flatMap((st) => (st.t === 'say' ? [st.script] : []))));
  assert.deepEqual([...said].sort(), SCRIPT_IDS.filter((s) => s !== 'l9_letter').sort(), 'every script but the epilogue\'s letter is played by some beat, and no other is');
  assert.deepEqual(when('crack_done'), { event: 'propCleared', prop: 'crack1' });
  assert.deepEqual(when('crate_done'), { event: 'propCleared', prop: 'crate1' });
  assert.deepEqual(when('billy_down'), { event: 'pinned', spawn: 'billy' });
  assert.deepEqual(when('billy_freed'), { cleared: 'boss' });
  assert.deepEqual(when('level_clear'), { cleared: 'flayer' });
  // sour waits on the hint beat on the ramp, not on crate_done: an event beat does not fire again after a retry that keeps the crate open.
  assert.deepEqual([when('sour'), when('balcony'), when('billy')].map((w) => (w as { needs: string }).needs), ['crate_hint', 'sour', 'balcony']);
  const steps = (id: string): unknown => S.beats.find((b) => b.id === id)?.steps;
  assert.deepEqual(steps('start'), [{ t: 'say', script: 'l9_start' }, { t: 'leave', npc: 'hopper' }]);
  assert.deepEqual(steps('concourse'), [{ t: 'say', script: 'l9_concourse' }, { t: 'wake', group: 'crowd' }]);
  assert.deepEqual(steps('sour'), [{ t: 'music', track: 'sour' }, { t: 'say', script: 'l9_sour' }]);
  assert.deepEqual(steps('balcony'), [{ t: 'say', script: 'l9_balcony' }, { t: 'wake', group: 'balcony' }]);
  assert.deepEqual(steps('billy'), [{ t: 'close', prop: 'door1' }, { t: 'close', prop: 'door2' }, { t: 'music', track: 'clock' }, { t: 'say', script: 'l9_billy' }, { t: 'wake', group: 'boss' }]);
  assert.deepEqual(steps('billy_freed'), [{ t: 'say', script: 'l9_billy_freed' }, { t: 'wake', group: 'flayer' }]);
  assert.deepEqual(steps('level_clear'), [{ t: 'boom' }, { t: 'say', script: 'l9_clear' }, { t: 'open', prop: 'door1' }, { t: 'open', prop: 'door2' }, { t: 'finish' }]);
  assert.ok(S.beats.every((b) => b.steps.every((st) => st.t !== 'scare' && st.t !== 'waves' && st.t !== 'defend')), 'no scare, no waves, no defense');
  // The triggers sit where the spec puts them.
  const through = (gates: string[], id: string): boolean => rectTiles(rectOf(id)).some(([x, y]) => at(flood(new Set(gates)), x, y) === 1);
  for (const id of ['start', 'kitchen', 'crack_hint', 'concourse', 'crate_hint']) assert.ok(through([], id), `${id} is reachable at the start`);
  for (const id of ['sour', 'balcony', 'billy']) {
    assert.ok(through(['crate1'], id), `${id} is reachable once the crate is open`);
    assert.ok(!through([], id), `${id} is not reachable with the crate in place`);
  }
  assert.ok(inRect(rectOf('start'), startTx, startTy), 'the start beat covers the start');
  assert.ok(rectTiles(rectOf('kitchen')).every(([x, y]) => x >= 12 && x <= 14 && y >= 30 && y <= 34), 'the kitchen beat is the kitchens\' doorway');
  const ck = prop('crack1'), ct = prop('crate1');
  assert.ok(rectOf('crack_hint').ty >= ck.ty + 1 && rectOf('crack_hint').ty <= ck.ty + 3, 'the crack hint stands in front of crack1, on the kitchen side');
  assert.ok(rectOf('crate_hint').ty >= ct.ty + 1 && rectOf('crate_hint').ty <= ct.ty + 3, 'the crate hint stands in front of crate1, on the ramp');
  assert.ok(rectTiles(rectOf('concourse')).every(([x, y]) => inRoom('concourse', x, y) && x <= 35 && y >= 33), 'the concourse beat is its south-west end, by the kitchens\' doorway');
  assert.ok(rectTiles(rectOf('sour')).every(([x, y]) => inRoom('balcony', x, y) && y <= ct.ty - 1), 'the sour beat is the balcony just beyond the crate');
  const bal = rectTiles(rectOf('balcony'));
  assert.ok(bal.every(([x, y]) => inRoom('balcony', x, y)) && [10, 11, 12, 13, 14].every((y) => bal.some(([, v]) => v === y)), 'the balcony beat spans the whole lower lane, so nobody walks round it');
  const arena = rectTiles(rectOf('billy'));
  assert.ok(arena.every(([x, y]) => inRoom('court', x, y)), 'the billy trigger is inside the court');
  assert.ok(arena.every(([x]) => x <= prop('door1').tx - 2), 'a tile and more clear of the doors, so nobody stands in one when they shut');
  assert.ok([6, 7, 12, 13].every((y) => arena.some(([, v]) => v === y)), 'level with both doorways');
  assert.equal(musicAfter(S.beats, ['start'], S.music), 'starcourt');
  assert.equal(musicAfter(S.beats, ['start', 'sour'], S.music), 'sour', 'a retry from the balcony\'s string stays on the soured music');
  assert.equal(musicAfter(S.beats, ['start', 'sour', 'billy'], S.music), 'clock', 'and after the billy beat on the boss track, for both phases');
});

test('director: the beats run in route order, Hopper leaves after his speech, the doors shut before the script, and the clear runs boom, script, doors, finish', () => {
  const { env, log } = fakeBase({ crowd: 5, balcony: 4, boss: 1, flayer: 5 });
  const d = createDirector(S.beats, S.waves, env);
  const run = (fn: () => void): string[] => { log.length = 0; fn(); return [...log]; };
  const tick = (id: string): void => { const r = rectOf(id); d.tick(r.tx, r.ty); };
  assert.deepEqual(run(() => { d.tick(startTx, startTy); d.tick(startTx, startTy); }), ['say l9_start', 'leave hopper'], 'a rect beat fires once');
  assert.deepEqual(run(() => tick('kitchen')), ['say l9_kitchen']);
  assert.deepEqual(run(() => tick('crack_hint')), ['say l9_crack_hint']);
  assert.deepEqual(run(() => d.events([{ t: 'propCleared', propId: 'crack1' }])), ['say l9_crack_done']);
  assert.deepEqual(run(() => d.events([{ t: 'propCleared', propId: 'other' }])), []);
  assert.deepEqual(run(() => tick('concourse')), ['say l9_concourse', 'wake crowd']);
  assert.deepEqual(run(() => tick('sour')), [], 'the sour beat waits for the ramp');
  assert.deepEqual(run(() => tick('crate_hint')), ['say l9_crate_hint']);
  assert.deepEqual(run(() => d.events([{ t: 'propCleared', propId: 'crate1' }])), ['say l9_crate_done']);
  assert.deepEqual(run(() => tick('billy')), [], 'the court waits for the balcony');
  assert.deepEqual(run(() => tick('sour')), ['music sour', 'say l9_sour']);
  assert.deepEqual(run(() => tick('billy')), [], 'and the balcony beat comes first');
  assert.deepEqual(run(() => tick('balcony')), ['say l9_balcony', 'wake balcony']);
  assert.deepEqual(run(() => tick('billy')), ['close door1', 'close door2', 'music clock', 'say l9_billy', 'wake boss']);
  assert.deepEqual(run(() => d.events([{ t: 'pinned', spawnId: 'billy' }])), ['say l9_billy_down']);
  assert.deepEqual(run(() => d.events([{ t: 'groupCleared', group: 'boss' }])), ['say l9_billy_freed', 'wake flayer']);
  assert.ok(!d.finished());
  assert.deepEqual(run(() => d.events([{ t: 'groupCleared', group: 'flayer' }])), ['boom', 'say l9_clear', 'open door1', 'open door2', 'finish']);
  assert.ok(d.finished());
});

test('director: a retry from the balcony\'s string with Billy already freed shuts the doors and brings the Mind Flayer in again', () => {
  // The kill list holds Billy, so his group has nobody left: waking it counts as cleared at once and the freed beat follows.
  const { env, log } = fakeBase({ boss: 0, flayer: 5 });
  const d = createDirector(S.beats, S.waves, env);
  d.restore({ fired: ['start', 'kitchen', 'concourse', 'crate_hint', 'crate_done', 'sour', 'balcony'], cleared: [] });
  const r = rectOf('billy');
  d.tick(r.tx, r.ty);
  assert.deepEqual(log, ['close door1', 'close door2', 'music clock', 'say l9_billy', 'say l9_billy_freed', 'wake flayer']);
});

// ---------------------------------------------------------------- the scripts
test('stage 3.3: the 14 scripts exist, match the level doc, fit the box on a keyboard and a pad, and keep to their voices', () => {
  const doc = readFileSync(new URL('../docs/level-9.md', import.meta.url), 'utf8');
  const listed = [...(/^Scripts:\s*(.+)$/m.exec(doc)?.[1] ?? '').split('. ')[0]?.matchAll(/`([a-z0-9_]+)`/g) ?? []].map((m) => m[1] as string);
  assert.deepEqual([...listed].sort(), [...SCRIPT_IDS].sort(), 'the doc and the test agree on the fourteen');
  assert.deepEqual(L9_SCRIPTS.map((s) => s.id), SCRIPT_IDS, 'in the doc\'s order');
  assert.deepEqual(Object.keys(SCRIPTS).filter((k) => k.startsWith('l9_')).sort(), [...SCRIPT_IDS].sort(), 'no stray l9 scripts');
  try {
    for (const device of ['keyboard', 'gamepad'] as const) {
      setPromptDevice(device);
      for (const s of L9_SCRIPTS) {
        assert.ok(s.lines.length >= 3 && s.lines.length <= 8, `${s.id} has ${s.lines.length} lines`);
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
  const all = L9_SCRIPTS.flatMap((s) => s.lines.map((l, i) => ({ id: s.id, i, ...l })));
  const text = (id: string): string => (SCRIPTS[id]?.lines ?? []).map((l) => l.text).join(' ');
  const by = (h: string): typeof all => all.filter((l) => l.who === h);
  assert.ok(by('dustin').length >= 6 && by('will').length >= 4 && by('nancy').length >= 4 && by('eleven').length >= 6 && by('mike').length >= 4, 'Dustin, Will, Nancy, Eleven and Mike all speak');
  assert.ok(by('hopper').length >= 8 && by('joyce').length >= 1, 'Hopper and Joyce speak, at the lift and in the letter');
  assert.ok(all.filter((l) => l.who === 'hopper' && l.id !== 'l9_letter').every((l) => l.id === 'l9_start'), 'and Hopper says nothing in the stage past the lift');
  assert.ok(by('nancy').every((l) => l.text.length <= 72), 'Nancy is flat and short');
  assert.ok(by('eleven').every((l) => l.text.length <= 44 && /[.!?]$/.test(l.text)), 'Eleven speaks in short full sentences');
  assert.ok(all.every((l) => !hasEmDash(l.text)), 'no em dashes');
  assert.ok(all.every((l) => !/seamless|robust|leverage|unlock|delve/i.test(l.text)), 'no banned words');
  assert.ok(!all.some((l) => /\{swapTo\d\}/.test(l.text)), 'no line names a swap slot: the party is picked on the map');
  assert.match(text('l9_start'), /\{interact\}/, 'the first script teaches the lights');
  assert.match(text('l9_start'), /Key/);
  assert.match(text('l9_concourse'), /\{swapOr\}/, 'the concourse teaches the swap that frees a held hero');
  assert.match(text('l9_balcony'), /\{interact\}|lights/, 'the balcony points at the string by the doors');
  assert.match(text('l9_balcony'), /shut/, 'and warns that the doors stay shut');
  assert.match(text('l9_crack_hint'), /Steve/);
  assert.match(text('l9_crack_hint'), /\{attack\}/);
  assert.match(text('l9_crate_hint'), /Eleven/);
  assert.match(text('l9_crate_hint'), /\{attack\}/);
  assert.match(text('l9_billy'), /wall/, 'the fight teaches the wall stun');
  assert.match(text('l9_billy_down'), /Eleven/, 'the reach hint names Eleven');
  assert.ok(!all.some((l) => /\b(two|three|four|five|six|seven|eight|nine|\d+) (rats|Flayed|legs)\b/i.test(l.text)), 'nobody counts the enemies, so the roster can change without the words');
  // Billy never speaks while he fights: one short line, once he is free.
  assert.deepEqual(by('billy').map((l) => l.id), ['l9_billy_freed']);
  assert.ok(by('billy').every((l) => l.text.length <= 48), 'short');
  // Eleven carries the beach.
  const freed = L9_SCRIPTS.find((s) => s.id === 'l9_billy_freed')?.lines ?? [];
  assert.equal(freed[0]?.who, 'eleven');
  assert.match(text('l9_billy_freed'), /beach/);
  assert.ok(freed.filter((l) => l.who === 'eleven').length === 3 && freed.length <= 6, 'in three short lines');
  // The floor shakes, the lights die, somebody asks where Hopper is, and nobody answers.
  const clear = SCRIPTS.l9_clear?.lines ?? [];
  assert.match(text('l9_clear'), /lights/i);
  assert.match(text('l9_clear'), /floor/i);
  assert.match(clear.at(-1)?.text ?? '', /^Where is Hopper\?$/);
  assert.equal(clear.at(-1)?.who, 'eleven');
});

test('stage 3.3: Hopper\'s letter is six to eight lines in his voice with one line of Eleven\'s at the end, and none of it is the show\'s', () => {
  const letter = SCRIPTS.l9_letter?.lines ?? [];
  assert.ok(letter.length >= 6 && letter.length <= 8, `${letter.length} lines`);
  assert.ok(letter.slice(0, -1).every((l) => l.who === 'hopper'), 'Hopper writes every line but the last');
  assert.equal(letter.at(-1)?.who, 'eleven');
  assert.equal(letter.filter((l) => l.who !== 'hopper').length, 1, 'one line of Eleven\'s');
  assert.ok((letter.at(-1)?.text.length ?? 99) <= 60 && /[.!?]$/.test(letter.at(-1)?.text ?? ''), 'a short full sentence or two');
  const words = letter.map((l) => l.text).join(' ');
  // Gruff and practical, with no goodbye in so many words, and nothing the show's letter says.
  assert.ok(!/goodbye|good-bye|farewell|dear |love you|i'?m proud|sorry|three inches|door open/i.test(words), 'no goodbye, no sign-off');
  assert.ok(letter.slice(0, -1).every((l) => l.text.length >= 40), 'each line says something');
  assert.ok(letter.every((l) => !hasEmDash(l.text) && !/seamless|robust|leverage|unlock|delve/i.test(l.text)));
  assert.ok(letter.every((l) => !/\{/.test(l.text)), 'no key tokens: it is a letter');
});

