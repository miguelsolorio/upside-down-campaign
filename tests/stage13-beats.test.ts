// Stage 1.3, Hawkins Middle School: the beats, the scare, the director and the 14 scripts. The map, the budget and the gates
// are in stage13.test.ts, the real sim and the bot in stage13-play.test.ts, and the shared plumbing in stage13-plumbing.test.ts.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { keyText, setPromptDevice } from '../src/core/bindings.ts';
import { fitsBox, wrapText } from '../src/core/text.ts';
import { SCRIPTS } from '../src/story/scripts.ts';
import { L3_SCRIPTS } from '../src/story/scripts_l3.ts';
import { STAGE_13 as S, ROWS } from '../src/world/stages/stage13.ts';
import { createDirector } from '../src/world/triggers.ts';
import type { DirectorEnv } from '../src/world/triggers.ts';
import type { TileRect } from '../src/world/types.ts';
import type { Sim, SimEvent, TrackId } from '../src/core/types.ts';
import { rectTiles, stageKit, tileOf } from './stage-helpers.ts';
import type { Prop } from './stage-helpers.ts';

const kit = stageKit(S);
const { grid, idx, enemies, props, flood, startTx, startTy } = kit;
const GATES = ['van1', 'vines1', 'door1'];
const ALL = new Set(GATES);
const HEROES = ['mike', 'dustin', 'lucas', 'eleven'] as const;
const at = (r: Uint8Array, x: number, y: number): number => r[idx(x, y)] as number;
const prop = (id: string): Prop => props.find((p) => p.id === id) as Prop;
const ch = (x: number, y: number): string => ROWS[y]?.[x] ?? '?';

// ---------------------------------------------------------------- beats
const BEAT_IDS = [
  'start', 'van_hint', 'van_cleared', 'agents', 'vines_hint', 'vines_cleared', 'cafeteria', 'scare', 'firebox_hint', 'door1_open',
  'gym', 'demogorgon', 'pinned', 'level_clear',
];
const SCRIPT_IDS = [
  'l3_start', 'l3_van_hint', 'l3_van_done', 'l3_agents', 'l3_vines_hint', 'l3_vines_done', 'l3_cafeteria', 'l3_scare',
  'l3_firebox_hint', 'l3_firebox_done', 'l3_gym', 'l3_demogorgon', 'l3_pinned', 'l3_clear',
];
const when = (id: string): unknown => S.beats.find((b) => b.id === id)?.when;
const steps = (id: string): unknown => S.beats.find((b) => b.id === id)?.steps;
const rectOf = (id: string): TileRect => (when(id) as { rect: TileRect }).rect;

test('stage 1.3: every beat has a trigger, a real script, group or prop, and the rect beats sit behind the right gates', () => {
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
    else if (w.event === 'pinned') assert.ok(enemies.some((e) => e.id === w.spawn), `${b.id} watches ${w.spawn}`);
    else assert.ok(props.some((p) => p.id === w.prop), `${b.id} watches ${w.prop}`);
  }
  const said = new Set(S.beats.flatMap((b) => b.steps.flatMap((st) => (st.t === 'say' ? [st.script] : []))));
  assert.deepEqual([...said].sort(), [...SCRIPT_IDS].sort(), 'every script is played by some beat, and no other is');
  assert.deepEqual(steps('cafeteria'), [{ t: 'say', script: 'l3_cafeteria' }, { t: 'wake', group: 'rats1' }]);
  assert.deepEqual(steps('scare'), [{ t: 'scare' }, { t: 'say', script: 'l3_scare' }]);
  assert.deepEqual(steps('door1_open'), [{ t: 'open', prop: 'door1' }, { t: 'say', script: 'l3_firebox_done' }]);
  assert.deepEqual(steps('demogorgon'), [{ t: 'music', track: 'clock' }, { t: 'say', script: 'l3_demogorgon' }, { t: 'wake', group: 'boss' }]);
  assert.deepEqual(steps('level_clear'), [{ t: 'say', script: 'l3_clear' }, { t: 'finish' }]);
  assert.deepEqual(when('van_cleared'), { event: 'propCleared', prop: 'van1' });
  assert.deepEqual(when('vines_cleared'), { event: 'propCleared', prop: 'vines1' });
  assert.deepEqual(when('door1_open'), { event: 'targetHit', prop: 'firebox1' });
  assert.deepEqual(when('firebox_hint'), { after: 'scare' });
  assert.deepEqual(when('pinned'), { event: 'pinned', spawn: 'demo' });
  assert.deepEqual(when('level_clear'), { cleared: 'boss' });
  assert.equal((when('demogorgon') as { needs?: string }).needs, 'gym');
  assert.ok(S.music === 'upside' && steps('demogorgon') && (steps('demogorgon') as { t: string; track?: TrackId }[])[0]?.track === 'clock');
  const through = (gates: string[], id: string): boolean => rectTiles(rectOf(id)).some(([x, y]) => at(flood(new Set(gates)), x, y) === 1);
  const behind: [string, string[], string[]][] = [
    ['agents', ['van1'], []], ['vines_hint', ['van1'], []], ['cafeteria', ['van1', 'vines1'], ['van1']], ['gym', GATES, ['van1', 'vines1']],
    ['demogorgon', GATES, ['van1', 'vines1']],
  ];
  for (const id of ['start', 'van_hint']) assert.ok(through([], id), `${id} is reachable at the start`);
  for (const [id, needed, fewer] of behind) {
    assert.ok(through(needed, id), `${id} is reachable once ${needed.join(', ')} is open`);
    assert.ok(!through(fewer, id), `${id} is not reachable with only ${fewer.join(', ') || 'nothing'} open`);
  }
  assert.ok(rectOf('van_hint').tx + rectOf('van_hint').w <= prop('van1').tx, 'the van hint stands on the lot side of the van');
});

test('stage 1.3: the scare crosses behind the serving counter, in view of where the rats die', () => {
  const { from, to, frames } = S.scare;
  assert.ok(frames >= 60 && frames <= 120, `${frames} frames`);
  for (const p of [from, to]) {
    const [tx, ty] = tileOf(p.x, p.y);
    assert.equal(ty, 18, 'it walks along the strip behind the counter');
    assert.equal(grid.solid[idx(tx, ty)], 0, `${p.x},${p.y} is floor`);
  }
  assert.ok(from.x > to.x, 'it walks west, the way the rats come from');
  const counter = [...Array(48).keys()].filter((x) => ch(x, 19) === 'Z');
  assert.ok(to.x <= (Math.min(...counter) + 1) * 16 && from.x >= Math.max(...counter) * 16, 'across the whole counter');
});

// ---------------------------------------------------------------- the director
/** A scripted sim stand-in that also takes the music step: it only has to answer the director. */
function env(alive: Record<string, number>): { env: DirectorEnv; log: string[] } {
  const log: string[] = [];
  const sim = {
    enemiesAlive: (g?: string) => (g === undefined ? 0 : alive[g] ?? 0),
    spawnGroup: (g: string) => { log.push(`wake ${g}`); },
    party: () => HEROES.map((id) => ({ id })),
  } as unknown as Sim;
  const e: DirectorEnv = {
    sim: () => sim, say: (id, done) => { log.push(`say ${id}`); done(); }, scare: (done) => { log.push('scare'); done(); },
    open: (id) => { log.push(`open ${id}`); }, music: (t) => { log.push(`music ${t}`); }, alarm: () => { log.push('alarm'); },
    jingle: (id) => { log.push(`jingle ${id}`); }, finish: () => { log.push('finish'); },
  };
  return { env: e, log };
}

test('director: the beats run in route order, the boss wakes with the music, and the pin and the clear finish the level', () => {
  const { env: e, log } = env({ rats1: 6, boss: 1 });
  const d = createDirector(S.beats, S.waves, e);
  const run = (fn: () => void): string[] => { log.length = 0; fn(); return [...log]; };
  const tick = (id: string): void => { const r = rectOf(id); d.tick(r.tx, r.ty); };
  assert.deepEqual(run(() => { d.tick(startTx, startTy); d.tick(startTx, startTy); }), ['say l3_start'], 'a rect beat fires once');
  assert.deepEqual(run(() => tick('van_hint')), ['say l3_van_hint']);
  assert.deepEqual(run(() => d.events([{ t: 'propCleared', propId: 'van1' }])), ['say l3_van_done']);
  assert.deepEqual(run(() => tick('agents')), ['say l3_agents']);
  assert.deepEqual(run(() => tick('vines_hint')), ['say l3_vines_hint']);
  assert.deepEqual(run(() => d.events([{ t: 'propCleared', propId: 'vines1' }])), ['say l3_vines_done']);
  assert.deepEqual(run(() => tick('cafeteria')), ['say l3_cafeteria', 'wake rats1']);
  assert.deepEqual(run(() => tick('gym')), ['say l3_gym']);
  assert.deepEqual(run(() => tick('demogorgon')), ['music clock', 'say l3_demogorgon', 'wake boss'], 'the music changes, the script plays and the boss wakes');
  assert.deepEqual(run(() => d.events([{ t: 'groupCleared', group: 'rats1' }])), ['scare', 'say l3_scare', 'say l3_firebox_hint'], 'the scare waits for the rats, and the shoot hint follows it');
  assert.deepEqual(run(() => d.events([{ t: 'targetHit', propId: 'firebox1' }])), ['open door1', 'say l3_firebox_done']);
  assert.deepEqual(run(() => d.events([{ t: 'pinned', spawnId: 'demo' }])), ['say l3_pinned'], 'the pin is the arrival of the finisher');
  assert.deepEqual(run(() => d.events([{ t: 'pinned', spawnId: 'other' } as SimEvent])), [], 'only the Demogorgon\'s pin counts');
  assert.ok(!d.finished());
  assert.deepEqual(run(() => d.events([{ t: 'groupCleared', group: 'boss' }])), ['say l3_clear', 'finish']);
  assert.ok(d.finished());
});

test('director: the demogorgon beat waits for the gym beat, and a retry from the gym lights wakes the boss again', () => {
  const { env: e, log } = env({ boss: 1 });
  const d = createDirector(S.beats, S.waves, e);
  const tick = (id: string): void => { const r = rectOf(id); d.tick(r.tx, r.ty); };
  tick('demogorgon');
  assert.deepEqual(log, [], 'the arena does nothing before the gym doors');
  d.restore({ fired: ['start', 'van_hint', 'van_cleared', 'agents', 'vines_hint', 'vines_cleared', 'cafeteria', 'scare', 'firebox_hint', 'door1_open', 'gym'], cleared: ['rats1'] });
  tick('demogorgon');
  assert.deepEqual(log, ['music clock', 'say l3_demogorgon', 'wake boss'], 'from the saved lights the arena wakes it again, and the music follows');
});

// ---------------------------------------------------------------- the scripts
test('stage 1.3: the 14 scripts exist, match the level doc, fit the box on a keyboard and a pad, and keep to the voices', () => {
  const doc = readFileSync(new URL('../docs/level-3.md', import.meta.url), 'utf8');
  const line = /^Scripts:\s*(.+)$/m.exec(doc)?.[1] ?? '';
  const listed = [...(line.split('. ')[0] ?? '').matchAll(/`([a-z0-9_]+)`/g)].map((m) => m[1] as string);
  assert.deepEqual([...listed].sort(), [...SCRIPT_IDS].sort(), 'the doc and the test agree on the fourteen');
  assert.deepEqual(L3_SCRIPTS.map((s) => s.id).sort(), [...SCRIPT_IDS].sort());
  assert.deepEqual(Object.keys(SCRIPTS).filter((k) => k.startsWith('l3_')).sort(), [...SCRIPT_IDS].sort(), 'no stray l3 scripts');
  const words = (t: string): number => t.trim().split(/\s+/).length;
  try {
    for (const device of ['keyboard', 'gamepad'] as const) {
      setPromptDevice(device);
      for (const s of L3_SCRIPTS) {
        assert.ok(s.lines.length >= 2 && s.lines.length <= 8, `${s.id} has ${s.lines.length} lines`);
        for (const [i, l] of s.lines.entries()) {
          const shown = keyText(l.text);
          assert.ok(shown.length <= 96 && fitsBox(shown), `${device} ${s.id}[${i}] needs ${wrapText(shown).length} rows: ${shown}`);
          assert.ok(!/\{|\}/.test(shown), `${s.id}[${i}] has an unfilled token`);
          if (l.who === 'eleven') assert.ok(words(l.text) <= 2, `${s.id}[${i}]: Eleven speaks one or two words`);
        }
      }
    }
  } finally {
    setPromptDevice('keyboard');
  }
  const who = (id: string): Set<string> => new Set((SCRIPTS[id]?.lines ?? []).map((l) => l.who));
  const text = (id: string): string => (SCRIPTS[id]?.lines ?? []).map((l) => l.text).join(' ');
  for (const id of ['l3_van_hint', 'l3_vines_hint', 'l3_firebox_hint', 'l3_pinned']) assert.ok(who(id).has('dustin') || who(id).has('lucas'), `${id} is explained by Dustin or Lucas`);
  assert.ok(who('l3_van_hint').has('eleven') && who('l3_van_done').has('eleven'), 'Eleven answers the shove');
  assert.ok(who('l3_agents').has('lucas') && who('l3_scare').has('dustin') && who('l3_scare').has('eleven'));
  assert.ok(who('l3_vines_hint').has('dustin'), 'the burn is Dustin\'s');
  assert.ok(who('l3_firebox_hint').has('lucas'), 'the shot is Lucas\'s');
  for (const s of L3_SCRIPTS) if (!['l3_vines_done'].includes(s.id)) assert.ok(who(s.id).has('mike') || who(s.id).has('dustin') || who(s.id).has('lucas'), `${s.id} has a kid in it`);
  assert.ok(L3_SCRIPTS.filter((s) => s.id !== 'l3_start').some((s) => who(s.id).has('mike')), 'Mike checks on Eleven');
  assert.match(text('l3_van_hint'), /\{swapTo4\}/, 'the van hint names Eleven\'s slot');
  assert.match(text('l3_van_hint'), /\{attack\}/);
  assert.match(text('l3_vines_hint'), /\{swapTo2\}/);
  assert.match(text('l3_vines_hint'), /\{special\}/);
  assert.match(text('l3_firebox_hint'), /\{swapTo3\}/);
  assert.match(text('l3_firebox_hint'), /\{attack\}/);
  assert.match(text('l3_pinned'), /\{swapTo4\}/);
  assert.match(text('l3_pinned'), /\{special\}/);
  assert.match(text('l3_start'), /\{interact\}/, 'the first script teaches the lights');
  assert.match(text('l3_demogorgon'), /wall/i, 'the fight is taught: let it hit the wall');
  assert.match(SCRIPTS.l3_scare?.lines.map((l) => l.text).join(' ') ?? '', /Demogorgon/);
  const clear = SCRIPTS.l3_clear?.lines ?? [];
  assert.ok(clear.some((l) => l.who === 'eleven') && clear.some((l) => l.who === 'narrator'), 'Eleven speaks and the narrator closes');
  assert.match(clear.map((l) => l.text).join(' '), /Demogorgon is gone\. So is Eleven/, 'Eleven destroys it and is gone with it');
  assert.equal(clear.at(-1)?.who, 'mike', 'chapter one ends on Mike, going to find her');
});
