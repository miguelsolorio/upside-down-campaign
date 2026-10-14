// Stage 2.1, the Palace and the patch: the beats, the director and the 13 scripts. The map, the budget and the gates are in
// stage21.test.ts, and the real sim and the bot in stage21-play.test.ts.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { keyText, setPromptDevice } from '../src/core/bindings.ts';
import { fitsBox, wrapText } from '../src/core/text.ts';
import { SCRIPTS } from '../src/story/scripts.ts';
import { L4_SCRIPTS } from '../src/story/scripts_l4.ts';
import { STAGE_21 as S, ROWS, WAVES } from '../src/world/stages/stage21.ts';
import { createDirector } from '../src/world/triggers.ts';
import type { TileRect } from '../src/world/types.ts';
import type { SimEvent } from '../src/core/types.ts';
import { fakeEnv, rectTiles, stageKit } from './stage-helpers.ts';

const kit = stageKit(S);
const { grid, idx, enemies, props, flood, startTx, startTy } = kit;
const GATES = ['vines1', 'gate1', 'hidden1'];
const ALL = new Set(GATES);
const at = (r: Uint8Array, x: number, y: number): number => r[idx(x, y)] as number;
const BEAT_IDS = ['start', 'max', 'street', 'dart', 'vines_hint', 'vines_cleared', 'patch', 'target_hint', 'gate1_open', 'sense_hint', 'hidden_open', 'ambush', 'level_clear'];
const SCRIPT_IDS = [
  'l4_start', 'l4_max', 'l4_street', 'l4_dart', 'l4_vines_hint', 'l4_vines_done', 'l4_patch', 'l4_shoot_hint', 'l4_shoot_done',
  'l4_sense_hint', 'l4_sense_done', 'l4_ambush', 'l4_clear',
];
const when = (id: string): unknown => S.beats.find((b) => b.id === id)?.when;
const steps = (id: string): unknown => S.beats.find((b) => b.id === id)?.steps;
const rectOf = (id: string): TileRect => (when(id) as { rect: TileRect }).rect;

// ---------------------------------------------------------------- beats
test('stage 2.1: every beat has a trigger, a real script, group or prop, and the rect beats sit behind the right gates', () => {
  assert.deepEqual(S.beats.map((b) => b.id), BEAT_IDS, 'the beats are the spec\'s, in route order');
  const groups = new Set(enemies.map((e) => e.group));
  const open = flood(ALL);
  const ids = S.beats.map((b) => b.id);
  for (const b of S.beats) {
    for (const st of b.steps) {
      if (st.t === 'say') assert.ok(SCRIPT_IDS.includes(st.script) && SCRIPTS[st.script], `${b.id} plays ${st.script}`);
      if (st.t === 'wake') assert.ok(groups.has(st.group), `${b.id} wakes ${st.group}`);
      if (st.t === 'open') assert.ok(props.some((p) => p.id === st.prop), `${b.id} opens ${st.prop}`);
    }
    const w = b.when;
    if ('rect' in w) {
      assert.ok(rectTiles(w.rect).some(([x, y]) => open[idx(x, y)] === 1), `${b.id} rect is reachable`);
      if (w.needs) assert.ok(ids.includes(w.needs), `${b.id} needs ${w.needs}`);
    } else if ('cleared' in w) assert.ok(groups.has(w.cleared), `${b.id} waits on ${w.cleared}`);
    else if ('after' in w) assert.ok(ids.includes(w.after), `${b.id} follows ${w.after}`);
    else if (w.event === 'pinned') assert.fail('no boss in this stage');
    else assert.ok(props.some((p) => p.id === w.prop), `${b.id} watches ${w.prop}`);
  }
  const said = new Set(S.beats.flatMap((b) => b.steps.flatMap((st) => (st.t === 'say' ? [st.script] : []))));
  assert.deepEqual([...said].sort(), [...SCRIPT_IDS].sort(), 'every script is played by some beat, and no other is');
  assert.deepEqual(steps('gate1_open'), [{ t: 'open', prop: 'gate1' }, { t: 'say', script: 'l4_shoot_done' }]);
  assert.deepEqual(steps('ambush'), [{ t: 'say', script: 'l4_ambush' }, { t: 'waves' }]);
  assert.deepEqual(steps('level_clear'), [{ t: 'say', script: 'l4_clear' }, { t: 'finish' }]);
  assert.deepEqual(when('vines_cleared'), { event: 'propCleared', prop: 'vines1' });
  assert.deepEqual(when('gate1_open'), { event: 'targetHit', prop: 'target1' });
  assert.deepEqual(when('hidden_open'), { event: 'propCleared', prop: 'hidden1' });
  assert.deepEqual(when('level_clear'), { cleared: 'amb3' });
  assert.ok(S.beats.every((b) => b.steps.every((st) => st.t !== 'music' && st.t !== 'scare')), 'no music change, no scare');
  const through = (gates: string[], id: string): boolean => rectTiles(rectOf(id)).some(([x, y]) => at(flood(new Set(gates)), x, y) === 1);
  const behind: [string, string[], string[]][] = [
    ['patch', ['vines1'], []], ['target_hint', ['vines1'], []], ['sense_hint', ['vines1', 'gate1'], ['vines1']],
    ['ambush', GATES, ['vines1', 'gate1']],
  ];
  for (const id of ['start', 'max', 'street', 'dart', 'vines_hint']) assert.ok(through([], id), `${id} is reachable at the start`);
  for (const [id, needed, fewer] of behind) {
    assert.ok(through(needed, id), `${id} is reachable once ${needed.join(', ')} is open`);
    assert.ok(!through(fewer, id), `${id} is not reachable with only ${fewer.join(', ') || 'nothing'} open`);
  }
  const vines = props.find((p) => p.id === 'vines1');
  assert.ok(rectOf('vines_hint').ty + rectOf('vines_hint').h <= (vines?.ty ?? 0), 'the vines hint stands on the street side of the vines');
  assert.ok(rectOf('start').tx <= startTx && startTx < rectOf('start').tx + rectOf('start').w && rectOf('start').ty <= startTy, 'the start beat covers the start');
  const door = rectOf('street');
  assert.ok(door.tx <= 8 && 9 < door.tx + door.w && ROWS[8]?.slice(8, 10) === '++', 'the street beat is at the Palace door');
  assert.equal(grid.solid[idx(8, 8)], 0);
});

// ---------------------------------------------------------------- the director
test('director: the beats run in route order, the gates open on the puzzles, and the three waves chain to the finish', () => {
  const { env, log } = fakeEnv({ amb1: 3, amb2: 3, amb3: 4 }, ['mike', 'dustin', 'lucas', 'will']);
  const d = createDirector(S.beats, S.waves, env);
  const run = (fn: () => void): string[] => { log.length = 0; fn(); return [...log]; };
  const tick = (id: string): void => { const r = rectOf(id); d.tick(r.tx, r.ty); };
  assert.deepEqual(run(() => { d.tick(startTx, startTy); d.tick(startTx, startTy); }), ['say l4_start'], 'a rect beat fires once');
  for (const [id, script] of [['max', 'l4_max'], ['street', 'l4_street'], ['dart', 'l4_dart'], ['vines_hint', 'l4_vines_hint']] as const) {
    assert.deepEqual(run(() => tick(id)), [`say ${script}`], id);
  }
  assert.deepEqual(run(() => d.events([{ t: 'propCleared', propId: 'vines1' }])), ['say l4_vines_done']);
  assert.deepEqual(run(() => tick('patch')), ['say l4_patch']);
  assert.deepEqual(run(() => tick('target_hint')), ['say l4_shoot_hint']);
  assert.deepEqual(run(() => d.events([{ t: 'targetHit', propId: 'target1' }])), ['open gate1', 'say l4_shoot_done']);
  assert.deepEqual(run(() => d.events([{ t: 'targetHit', propId: 'something else' }])), []);
  assert.deepEqual(run(() => tick('sense_hint')), ['say l4_sense_hint']);
  assert.deepEqual(run(() => d.events([{ t: 'propCleared', propId: 'hidden1' }])), ['say l4_sense_done']);
  assert.deepEqual(run(() => tick('ambush')), ['say l4_ambush', 'wake amb1']);
  assert.deepEqual(run(() => d.events([{ t: 'groupCleared', group: 'amb1' }])), ['wake amb2']);
  assert.deepEqual(run(() => d.events([{ t: 'groupCleared', group: 'amb2' }])), ['wake amb3']);
  assert.ok(!d.finished());
  assert.deepEqual(run(() => d.events([{ t: 'groupCleared', group: 'amb3' }])), ['say l4_clear', 'finish']);
  assert.ok(d.finished());
  assert.deepEqual(WAVES, ['amb1', 'amb2', 'amb3']);
});

test('director: a retry from the hole\'s lights skips the dead and still runs the ambush to the finish', () => {
  const { env, log } = fakeEnv({ amb1: 0, amb2: 3, amb3: 4 }, ['mike', 'dustin', 'lucas', 'will']);
  const d = createDirector(S.beats, S.waves, env);
  d.restore({ fired: BEAT_IDS.slice(0, 11), cleared: ['street', 'rows', 'barn', 'corn'] });
  const r = rectOf('ambush');
  d.tick(r.tx, r.ty);
  assert.deepEqual(log, ['say l4_ambush', 'wake amb2'], 'a wave with nobody left counts as cleared and the next one wakes');
  d.events([{ t: 'groupCleared', group: 'amb2' } as SimEvent, { t: 'groupCleared', group: 'amb3' } as SimEvent]);
  assert.ok(d.finished());
});

// ---------------------------------------------------------------- the scripts
test('stage 2.1: the 13 scripts exist, match the level doc, and fit the box on a keyboard and a pad', () => {
  const doc = readFileSync(new URL('../docs/level-4.md', import.meta.url), 'utf8');
  const line = /^Scripts:\s*(.+)$/m.exec(doc)?.[1] ?? '';
  const listed = [...(line.split('. ')[0] ?? '').matchAll(/`([a-z0-9_]+)`/g)].map((m) => m[1] as string);
  assert.deepEqual([...listed].sort(), [...SCRIPT_IDS].sort(), 'the doc and the test agree on the thirteen');
  assert.deepEqual(L4_SCRIPTS.map((s) => s.id).sort(), [...SCRIPT_IDS].sort());
  assert.deepEqual(Object.keys(SCRIPTS).filter((k) => k.startsWith('l4_')).sort(), [...SCRIPT_IDS].sort(), 'no stray l4 scripts');
  try {
    for (const device of ['keyboard', 'gamepad'] as const) {
      setPromptDevice(device);
      for (const s of L4_SCRIPTS) {
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
});

test('stage 2.1: the voices: Max is quick and dry in l4_max and nowhere else, Will notices, and Eleven is missed once and never explained', () => {
  const who = (id: string): Set<string> => new Set((SCRIPTS[id]?.lines ?? []).map((l) => l.who));
  const text = (id: string): string => (SCRIPTS[id]?.lines ?? []).map((l) => l.text).join(' ');
  const all = L4_SCRIPTS.flatMap((s) => s.lines.map((l, i) => ({ id: s.id, i, ...l })));
  assert.ok(who('l4_max').has('max'), 'Max speaks in l4_max');
  assert.ok(all.filter((l) => l.who === 'max').every((l) => l.id === 'l4_max'), 'and only there');
  const maxLines = all.filter((l) => l.who === 'max');
  assert.ok(maxLines.length >= 3 && maxLines.every((l) => l.text.length <= 60), 'a few short lines');
  assert.ok(who('l4_max').has('dustin') || who('l4_max').has('lucas'), 'to somebody');
  assert.match(text('l4_max'), /MADMAX/, 'the high score');
  assert.ok(all.every((l) => l.who !== 'eleven' && l.who !== 'joyce'), 'neither Eleven nor Joyce is here');
  const missed = all.filter((l) => /eleven/i.test(l.text));
  assert.equal(missed.length, 1, 'Eleven is named once in the whole stage');
  assert.deepEqual([missed[0]?.id, missed[0]?.who], ['l4_street', 'mike'], 'by Mike, out on the street');
  assert.ok(!all.some((l) => /\b(gone|dead|died|vanish|disappear|lost her|where she)\b/i.test(l.text)), 'and nobody says where she is');
  for (const id of ['l4_start', 'l4_sense_hint', 'l4_sense_done']) assert.ok(who(id).has('will'), `Will speaks in ${id}`);
  assert.ok(who('l4_start').has('dustin') && who('l4_start').has('lucas') && who('l4_start').has('mike'));
  assert.ok(who('l4_dart').has('dustin'), 'Dustin finds the creature');
  assert.match(text('l4_dart'), /Dart/, 'and names it');
  for (const s of L4_SCRIPTS) if (s.id !== 'l4_max') assert.ok(who(s.id).has('mike') || who(s.id).has('dustin') || who(s.id).has('lucas'), `${s.id} has a kid in it`);
  assert.ok(L4_SCRIPTS.some((s) => s.lines.some((l) => l.who === 'lucas' && /worried|determined/.test(l.expr ?? ''))), 'Lucas watches the exits');
});

test('stage 2.1: the puzzle scripts name the hero\'s slot and the key, and the fights are taught', () => {
  const text = (id: string): string => (SCRIPTS[id]?.lines ?? []).map((l) => l.text).join(' ');
  assert.match(text('l4_vines_hint'), /\{swapTo2\}/, 'Dustin is slot two');
  assert.match(text('l4_vines_hint'), /\{special\}/, 'his spray is the special');
  assert.match(text('l4_shoot_hint'), /\{swapTo3\}/, 'Lucas is slot three');
  assert.match(text('l4_shoot_hint'), /\{attack\}/);
  assert.match(text('l4_sense_hint'), /\{swapTo4\}/, 'Will is slot four, now that Eleven has gone');
  assert.match(text('l4_start'), /\{interact\}/, 'the first script teaches the lights');
  assert.match(text('l4_ambush'), /\{burst\}/, 'the ambush teaches the party burst');
  assert.match(text('l4_patch'), /pods/i, 'the rot names the pods');
  assert.match(text('l4_patch'), /vines/i, 'and the vines');
  assert.match(text('l4_ambush'), /demodog/i);
  assert.match(text('l4_clear'), /tunnel/i, 'the last words point at the tunnels');
  assert.match(text('l4_start'), /1984/, 'it is Halloween, 1984');
  const sense = SCRIPTS.l4_sense_hint?.lines ?? [];
  assert.equal(sense[0]?.who, 'will', 'Will feels something first');
});
