// Stage 4.2, the Hellfire Club and the Creel House: its 11 beats and the director running them (the Walkman is given before its script, the curse
// beat chimes the clock and wakes the parlor before the script, the clear opens door_back before the script, and a retry from a string before
// mirror1 or the curse still reaches the finale), and the 11 scripts: Eddie theatrical and nervous underneath, the party and the narrator.
// The map, the budget and the bot's route are in stage42.test.ts, and whole runs and the play scene in stage42-play.test.ts.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { keyText, setPromptDevice } from '../src/core/bindings.ts';
import { fitsBox, hasEmDash, wrapText } from '../src/core/text.ts';
import { SCRIPTS } from '../src/story/scripts.ts';
import { L11_SCRIPTS } from '../src/story/scripts_l11.ts';
import { createDirector, musicAfter } from '../src/world/triggers.ts';
import type { DirectorEnv } from '../src/world/triggers.ts';
import type { Sim } from '../src/core/types.ts';
import { BEAT_IDS, SCRIPT_IDS, S, inRect, inRoom, kit, prop, rectOf, rectTiles, roomOf, solid, when } from './stage42-helpers.ts';

const { idx, enemies, props, flood, startTx, startTy } = kit;

// ---------------------------------------------------------------- beats
/** A stand-in sim and env for the director that also takes close, curse and walkman, which this stage's beats use. */
function fakeBase(alive: Record<string, number>): { env: DirectorEnv; log: string[] } {
  const log: string[] = [];
  const sim = {
    enemiesAlive: (g?: string) => (g === undefined ? 0 : alive[g] ?? 0),
    spawnGroup: (g: string) => { log.push(`wake ${g}`); },
    closeProp: (id: string) => { log.push(`close ${id}`); },
    curse: (id: string) => { log.push(`curse ${id}`); },
    party: () => [],
  } as unknown as Sim;
  const env: DirectorEnv = {
    sim: () => sim, say: (id, done) => { log.push(`say ${id}`); done(); }, scare: (done) => done(), open: (id) => { log.push(`open ${id}`); },
    music: (track) => { log.push(`music ${track}`); }, walkman: () => { log.push('walkman'); }, jingle: () => undefined, finish: () => { log.push('finish'); },
  };
  return { env, log };
}

test('stage 4.2: every beat has a trigger and a real script, in the spec\'s order, and the steps are the spec\'s', () => {
  assert.deepEqual(S.beats.map((b) => b.id), BEAT_IDS, 'the beats are the spec\'s, in route order');
  const groups = new Set(enemies.map((e) => e.group));
  const open = flood(new Set(['mirror1', 'mirror4']));
  const ids = S.beats.map((b) => b.id);
  for (const b of S.beats) {
    for (const st of b.steps) {
      if (st.t === 'say') assert.ok(SCRIPT_IDS.includes(st.script) && SCRIPTS[st.script], `${b.id} plays ${st.script}`);
      if (st.t === 'wake') assert.ok(groups.has(st.group), `${b.id} wakes ${st.group}`);
      if (st.t === 'open' || st.t === 'close' || st.t === 'curse') assert.ok(props.some((p) => p.id === (st as { prop: string }).prop), `${b.id} acts on ${(st as { prop: string }).prop}`);
    }
    const w = b.when;
    if ('rect' in w) {
      assert.ok(rectTiles(w.rect).some(([x, y]) => open[idx(x, y)] === 1), `${b.id} rect is reachable`);
      if (w.needs) assert.ok(ids.indexOf(w.needs) >= 0 && ids.indexOf(w.needs) < ids.indexOf(b.id), `${b.id} needs ${w.needs}, which comes before it`);
    } else if ('cleared' in w) assert.ok(groups.has(w.cleared), `${b.id} waits on ${w.cleared}`);
    else if ('after' in w) assert.ok(ids.includes(w.after), `${b.id} follows ${w.after}`);
    else if (w.event === 'curseEnd') assert.ok(props.some((p) => p.prop === 'clock'), `${b.id} waits on a curse and there is a clock`);
    else if (w.event === 'pinned' || w.event === 'defended') assert.fail('no boss and no defense in this stage');
    else assert.ok(props.some((p) => p.id === w.prop), `${b.id} watches ${w.prop}`);
  }
  const said = new Set(S.beats.flatMap((b) => b.steps.flatMap((st) => (st.t === 'say' ? [st.script] : []))));
  assert.deepEqual([...said].sort(), [...SCRIPT_IDS].sort(), 'every script is played by some beat, and no other is');
  assert.deepEqual(when('mirror_done'), { event: 'propCleared', prop: 'mirror1' });
  assert.deepEqual(when('curse_end'), { event: 'curseEnd' });
  assert.deepEqual(when('level_clear'), { cleared: 'finale' });
  const steps = (id: string): unknown => S.beats.find((b) => b.id === id)?.steps;
  assert.deepEqual(steps('start'), [{ t: 'say', script: 'l11_start' }]);
  assert.deepEqual(steps('walkman'), [{ t: 'walkman' }, { t: 'say', script: 'l11_walkman' }]);
  assert.deepEqual(steps('curse'), [{ t: 'curse', prop: 'clock1' }, { t: 'wake', group: 'parlor' }, { t: 'say', script: 'l11_curse' }]);
  assert.deepEqual(steps('curse_end'), [{ t: 'say', script: 'l11_curse_end' }]);
  assert.deepEqual(steps('finale'), [{ t: 'say', script: 'l11_finale' }, { t: 'wake', group: 'finale' }]);
  assert.deepEqual(steps('level_clear'), [{ t: 'open', prop: 'door_back' }, { t: 'say', script: 'l11_clear' }, { t: 'finish' }]);
  assert.ok(S.beats.every((b) => b.steps.every((st) => st.t !== 'scare' && st.t !== 'waves' && st.t !== 'defend' && st.t !== 'leave' && st.t !== 'recruit' && st.t !== 'music' && st.t !== 'close')), 'no scare, waves, defense, npc, recruit or music change: Eddie is in the party and the music is hawkins throughout');
  assert.equal(musicAfter(S.beats, ['start', 'curse'], S.music), 'hawkins');
  // The triggers sit where the spec puts them.
  const through = (gates: string[], id: string): boolean => rectTiles(rectOf(id)).some(([x, y]) => flood(new Set(gates))[idx(x, y)] === 1);
  for (const id of ['start', 'walkman', 'street', 'yard', 'mirror_hint']) assert.ok(through([], id), `${id} is reachable at the start`);
  for (const id of ['curse', 'finale']) {
    assert.ok(through(['mirror1'], id), `${id} is reachable once mirror1 is open`);
    assert.ok(!through([], id), `${id} is not reachable with mirror1 shut`);
  }
  assert.ok(through(['mirror1'], 'cache_hint') && !through([], 'cache_hint'), 'the cache\'s hint is inside the house');
  assert.ok(inRect(rectOf('start'), startTx, startTy), 'the start beat covers the start');
  assert.ok(rectTiles(rectOf('start')).every(([x, y]) => inRoom('club', x, y)), 'and nothing but the club');
  assert.ok(rectTiles(rectOf('walkman')).every(([x, y]) => inRoom('schoolhall', x, y) && y <= 35), 'the Walkman beat is the hall in front of the lockers');
  assert.ok(rectTiles(rectOf('street')).every(([x, y]) => roomOf(x, y) === 'street' && x >= 32 && x <= 34), 'the street beat is the street outside the school doors');
  assert.ok(rectTiles(rectOf('yard')).every(([x, y]) => roomOf(x, y) === 'yard' && y >= 24 && x >= 38 && x <= 40), 'the yard beat is the yard\'s gate');
  const m1 = prop('mirror1'), m4 = prop('mirror4');
  // The hints play before the ghouls step out (they come within 80 px of the glass), so each rect takes in tiles farther than that from its mirror.
  const far = (m: typeof m1, tx: number, ty: number): number => {
    const x = tx * 16 + 8, y = ty * 16 + 10, nx = Math.max(m.tx * 16, Math.min(x, m.tx * 16 + (m.w ?? 16))), ny = Math.max(m.ty * 16, Math.min(y, m.ty * 16 + (m.h ?? 16)));
    return Math.hypot(x - nx, y - ny);
  };
  const hint1 = rectTiles(rectOf('mirror_hint')).filter(([x, y]) => !solid(x, y));
  assert.ok(hint1.every(([x, y]) => (inRoom('foyer', x, y) || y >= 19) && y > m1.ty && x >= 36 && x <= 42), 'the mirror hint is the foyer, in front of mirror1, and the front door');
  assert.ok(hint1.some(([x, y]) => y === 20 && far(m1, x, y) > 80), 'it takes in the door\'s gap, where the ghouls are still in the glass');
  assert.ok(rectTiles(rectOf('mirror_hint')).some(([x, y]) => inRoom('foyer', x, y) && y - m1.ty <= 3), 'and the tiles in front of the glass');
  const hint4 = rectTiles(rectOf('cache_hint'));
  assert.ok(hint4.every(([x, y]) => inRoom('dining', x, y) && y > m4.ty && x <= 26), 'the cache hint is the dining room west of the doorway, in front of mirror4');
  assert.ok(hint4.some(([x, y]) => far(m4, x, y) > 80), 'with tiles far enough from the glass that the ghoul is still in it');
  assert.ok(hint4.some(([x, y]) => x >= 24 && y === 15), 'including the doorway\'s landing');
  assert.ok(rectTiles(rectOf('curse')).every(([x, y]) => inRoom('parlor', x, y)), 'the curse beat is the parlor');
  assert.ok(rectOf('curse').ty + rectOf('curse').h - 1 === 6 && rectOf('curse').tx <= 24 && rectOf('curse').tx + rectOf('curse').w > 26, 'its tiles take in the doorway\'s landing, so the clock chimes as they walk in');
  assert.ok(rectTiles(rectOf('finale')).every(([x, y]) => inRoom('backhall', x, y)), 'the finale beat is the back hall');
  assert.ok(rectOf('finale').tx <= 29 && rectOf('finale').ty === 3 && rectOf('finale').h === 4, 'from the doorway in');
});

test('director: the beats run in route order, the Walkman is given before its script, the curse chimes before its script, and the clear is door, script, finish', () => {
  const { env, log } = fakeBase({ foyer: 2, hall: 5, parlor: 2, finale: 7 });
  const d = createDirector(S.beats, S.waves, env);
  const run = (fn: () => void): string[] => { log.length = 0; fn(); return [...log]; };
  const tick = (id: string): void => { const r = rectOf(id); d.tick(r.tx, r.ty); };
  assert.deepEqual(run(() => { d.tick(startTx, startTy); d.tick(startTx, startTy); }), ['say l11_start'], 'a rect beat fires once');
  assert.deepEqual(run(() => tick('walkman')), ['walkman', 'say l11_walkman']);
  assert.deepEqual(run(() => tick('street')), ['say l11_street']);
  assert.deepEqual(run(() => tick('yard')), ['say l11_yard']);
  assert.deepEqual(run(() => tick('curse')), [], 'the curse waits for the foyer');
  assert.deepEqual(run(() => tick('mirror_hint')), ['say l11_mirror_hint']);
  assert.deepEqual(run(() => d.events([{ t: 'propCleared', propId: 'mirror1' }])), ['say l11_mirror_done']);
  assert.deepEqual(run(() => d.events([{ t: 'propCleared', propId: 'other' }])), []);
  assert.deepEqual(run(() => tick('cache_hint')), ['say l11_cache_hint']);
  assert.deepEqual(run(() => tick('finale')), [], 'the finale waits for the curse');
  assert.deepEqual(run(() => tick('curse')), ['curse clock1', 'wake parlor', 'say l11_curse']);
  assert.deepEqual(run(() => tick('curse')), [], 'and only once');
  assert.deepEqual(run(() => d.events([{ t: 'curseEnd', hero: 'mike', how: 'clock' }])), ['say l11_curse_end']);
  assert.deepEqual(run(() => tick('finale')), ['say l11_finale', 'wake finale']);
  assert.ok(!d.finished());
  assert.deepEqual(run(() => d.events([{ t: 'groupCleared', group: 'finale' }])), ['open door_back', 'say l11_clear', 'finish']);
  assert.ok(d.finished());
});

test('director: the curse ending any way at all plays the same script, and the Walkman\'s own event is no curse', () => {
  for (const how of ['clock', 'walkman', 'ko'] as const) {
    const { env, log } = fakeBase({});
    const d = createDirector(S.beats, S.waves, env);
    d.events([{ t: 'curseEnd', hero: 'dustin', how }]);
    assert.deepEqual(log, ['say l11_curse_end'], how);
  }
  const { env, log } = fakeBase({});
  const d = createDirector(S.beats, S.waves, env);
  d.events([{ t: 'walkman' }]);
  assert.deepEqual(log, []);
});

test('director: a retry from a string before the mirror or the curse still reaches the finale, though mirror1 and clock1 are kept open', () => {
  // lights_yard: lit in the yard, before the house. mirror1 is open for good on the retry, so propCleared never fires again.
  const a = fakeBase({ parlor: 2, finale: 7 });
  const yard = createDirector(S.beats, S.waves, a.env);
  yard.restore({ fired: ['start', 'walkman', 'street', 'yard'], cleared: [] });
  const tick = (d: ReturnType<typeof createDirector>, id: string): void => { const r = rectOf(id); d.tick(r.tx, r.ty); };
  tick(yard, 'curse');
  assert.deepEqual(a.log, [], 'the curse still waits on the foyer\'s beat');
  tick(yard, 'mirror_hint');
  tick(yard, 'curse');
  assert.deepEqual(a.log, ['say l11_mirror_hint', 'curse clock1', 'wake parlor', 'say l11_curse'], 'the foyer\'s beat is enough: the parlor is behind mirror1');
  // The clock was broken on the first time round and stays broken, so the curse step does nothing and no curseEnd comes: the finale starts anyway.
  a.log.length = 0;
  tick(yard, 'finale');
  assert.deepEqual(a.log, ['say l11_finale', 'wake finale']);
  // lights_hall, lit before the parlor: the foyer's beats are in its snapshot.
  const b = fakeBase({ parlor: 2, finale: 7 });
  const hall = createDirector(S.beats, S.waves, b.env);
  hall.restore({ fired: ['start', 'walkman', 'street', 'yard', 'mirror_hint', 'mirror_done', 'cache_hint'], cleared: ['foyer', 'hall'] });
  tick(hall, 'curse');
  tick(hall, 'finale');
  assert.deepEqual(b.log, ['curse clock1', 'wake parlor', 'say l11_curse', 'say l11_finale', 'wake finale']);
  // A string lit while the curse counts has the curse in its snapshot and never gets its end: the finale does not wait for it.
  const c = fakeBase({ finale: 7 });
  const late = createDirector(S.beats, S.waves, c.env);
  late.restore({ fired: ['start', 'walkman', 'street', 'yard', 'mirror_hint', 'mirror_done', 'curse'], cleared: [] });
  tick(late, 'finale');
  assert.deepEqual(c.log, ['say l11_finale', 'wake finale']);
});

// ---------------------------------------------------------------- the scripts
test('stage 4.2: the 11 scripts exist, fit the box on a keyboard and a pad, and are Eddie\'s, the party\'s and the narrator\'s', () => {
  assert.deepEqual(L11_SCRIPTS.map((s) => s.id), SCRIPT_IDS, 'in the doc\'s order');
  assert.deepEqual(Object.keys(SCRIPTS).filter((k) => k.startsWith('l11_')).sort(), [...SCRIPT_IDS].sort(), 'no stray l11 scripts');
  try {
    for (const device of ['keyboard', 'gamepad'] as const) {
      setPromptDevice(device);
      for (const s of L11_SCRIPTS) {
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
  const all = L11_SCRIPTS.flatMap((s) => s.lines.map((l, i) => ({ id: s.id, i, ...l })));
  const text = (id: string): string => (SCRIPTS[id]?.lines ?? []).map((l) => l.text).join(' ');
  const who = (id: string): Set<string> => new Set((SCRIPTS[id]?.lines ?? []).map((l) => l.who));
  assert.ok(all.every((l) => l.who !== 'hopper'), 'Hopper is in Kamchatka');
  assert.ok(all.every((l) => !hasEmDash(l.text)), 'no em dashes');
  assert.ok(all.every((l) => !/seamless|robust|leverage|unlock|delve/i.test(l.text)), 'no banned words');
  assert.ok(all.every((l) => !/\{swap/.test(l.text)), 'no line names a swap slot');
  assert.ok(all.every((l) => l.text === l.text.trim() && !/ {2}|\.\.\./.test(l.text)), 'no stray spaces or dots');
  assert.ok(all.every((l) => !/freaks|roll for initiative|welcome to the hellfire/i.test(l.text)), 'nothing quotes the show: Eddie\'s greeting is his own');
  const eddie = all.filter((l) => l.who === 'eddie');
  assert.ok(eddie.length >= 14, `Eddie has ${eddie.length} lines`);
  assert.ok(who('l11_start').has('eddie') && who('l11_clear').has('eddie') && who('l11_curse').has('eddie') && who('l11_mirror_hint').has('eddie'), 'he is in the club, at the mirror, at the clock and at the clear');
  const people = new Set(all.map((l) => l.who));
  assert.ok(['eddie', 'max', 'dustin', 'mike', 'lucas', 'will', 'nancy', 'robin', 'steve'].every((c) => people.has(c as never)), 'the story assumes everyone: any hero may speak');
  assert.ok(all.filter((l) => l.who === 'narrator').length >= 8 && all.filter((l) => l.who === 'narrator').length <= 12, 'the narrator sets the scene now and then');
  const expr = new Set(all.flatMap((l) => (l.expr ? [l.expr] : [])));
  assert.ok(['worried', 'determined', 'happy', 'shocked'].every((e) => expr.has(e as never)), 'his face changes with the mood');
  // Teaching: the lights, the mirror gates, and the curse without any key.
  assert.match(text('l11_start'), /\{interact\}/, 'the club teaches the lights');
  assert.match(text('l11_start'), /chime/i, 'and the curse in the town');
  assert.match(text('l11_yard'), /\{interact\}/, 'the yard points at its string of lights');
  assert.match(text('l11_mirror_hint'), /\{attack\}/);
  assert.match(text('l11_mirror_hint'), /riff|guitar/i);
  assert.match(text('l11_cache_hint'), /\{attack\}/);
  assert.match(text('l11_walkman'), /Walkman/);
  assert.ok(who('l11_walkman').has('max'), 'Max has her Walkman back in her own words');
  assert.ok(!/\{\w+\}/.test(text('l11_curse')) && !/\b(press|button|key)\b/i.test(text('l11_curse')), 'the curse names its ways out without a key');
  assert.match(text('l11_curse'), /chime|bell/i);
  assert.match(text('l11_curse'), /clock/i);
  assert.match(text('l11_curse'), /guitar/i, 'Eddie\'s guitar breaks the clock');
  assert.match(text('l11_curse'), /three/i, 'anyone else takes a few hits');
  assert.match(text('l11_curse'), /music|tape/i, 'or Max\'s music');
  assert.ok((SCRIPTS.l11_curse?.lines ?? []).some((l) => l.who === 'max' && /swap me|with you/i.test(l.text)), 'which she says herself, and only with her in the party');
  assert.ok((SCRIPTS.l11_curse_end?.lines.length ?? 9) <= 3, 'the curse ends short');
  assert.match(text('l11_curse_end'), /red/i);
  assert.match(text('l11_curse_end'), /clock/i);
  assert.ok(!/\b(two|three|four|five|six|seven|eight|nine|\d+) (ghouls|mirrors)\b/i.test(text('l11_finale') + text('l11_mirror_hint') + text('l11_curse')), 'nobody counts the ghouls, so the roster can change without the words');
  assert.equal(SCRIPTS.l11_clear?.lines.at(-1)?.who, 'will', 'the stage ends on Will\'s word about the bell');
});
