// Stage 4.3, Upside Down Hawkins: its 10 beats and the director running them (each clock beat curses before its script, the roof beat shuts
// the door and changes the music, the solo waits for the song, the fall comes before the party's script and the finish after it, and a retry
// from any string still reaches the clear), and the 10 scripts: Eddie brave and nervous underneath on the roof, the party and the narrator.
// The map, the budget and the bot's route are in stage43.test.ts, and whole runs and the play scene in stage43-play.test.ts.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { keyText, setPromptDevice } from '../src/core/bindings.ts';
import { fitsBox, hasEmDash, wrapText } from '../src/core/text.ts';
import { SCRIPTS } from '../src/story/scripts.ts';
import { L12_SCRIPTS } from '../src/story/scripts_l12.ts';
import { createDirector, musicAfter } from '../src/world/triggers.ts';
import type { DirectorEnv } from '../src/world/triggers.ts';
import type { Sim } from '../src/core/types.ts';
import { BEAT_IDS, SCRIPT_IDS, S, inPlace, inRect, kit, prop, rectOf, rectTiles, solid, when } from './stage43-helpers.ts';

const { idx, enemies, props, flood, startTx, startTy } = kit;

// ---------------------------------------------------------------- beats
/** A stand-in sim and env for the director that also takes close, curse, dismissHero and the solo, which this stage's beats use. `song()` ends the song. */
function fakeBase(alive: Record<string, number>): { env: DirectorEnv; log: string[]; song(): void } {
  const log: string[] = [];
  let end: (() => void) | null = null;
  const sim = {
    enemiesAlive: (g?: string) => (g === undefined ? 0 : alive[g] ?? 0),
    spawnGroup: (g: string) => { log.push(`wake ${g}`); },
    closeProp: (id: string) => { log.push(`close ${id}`); },
    curse: (id: string) => { log.push(`curse ${id}`); },
    dismissHero: (id: string) => { log.push(`dismiss ${id}`); },
    party: () => [],
  } as unknown as Sim;
  const env: DirectorEnv = {
    sim: () => sim, say: (id, done) => { log.push(`say ${id}`); done(); }, scare: (done) => done(), open: (id) => { log.push(`open ${id}`); },
    music: (track) => { log.push(`music ${track}`); }, solo: (chart, done) => { log.push(`solo ${chart}`); end = done; }, jingle: () => undefined,
    finish: () => { log.push('finish'); },
  };
  return { env, log, song: () => end?.() };
}
const tick = (d: ReturnType<typeof createDirector>, id: string): void => { const r = rectOf(id); d.tick(r.tx, r.ty); };

test('stage 4.3: every beat has a trigger and a real script, in the spec\'s order, and the steps are the spec\'s', () => {
  assert.deepEqual(S.beats.map((b) => b.id), BEAT_IDS, 'the beats are the spec\'s, in route order');
  const groups = new Set(enemies.map((e) => e.group));
  const open = flood(new Set(['mirror1']));
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
    } else if ('after' in w) assert.ok(ids.includes(w.after) && ids.indexOf(w.after) < ids.indexOf(b.id), `${b.id} follows ${w.after}`);
    else assert.fail(`${b.id} waits on an event or a cleared group: a retry would never fire it again`);
  }
  const said = new Set(S.beats.flatMap((b) => b.steps.flatMap((st) => (st.t === 'say' ? [st.script] : []))));
  assert.deepEqual([...said].sort(), [...SCRIPT_IDS].sort(), 'every script is played by some beat, and no other is');
  const steps = (id: string): unknown => S.beats.find((b) => b.id === id)?.steps;
  assert.deepEqual(steps('start'), [{ t: 'say', script: 'l12_start' }]);
  assert.deepEqual(steps('street'), [{ t: 'say', script: 'l12_street' }, { t: 'wake', group: 'bats1' }]);
  assert.deepEqual(steps('mirror_hint'), [{ t: 'say', script: 'l12_mirror_hint' }]);
  assert.deepEqual(steps('park'), [{ t: 'say', script: 'l12_park' }, { t: 'wake', group: 'bats2' }]);
  for (const n of [1, 2, 3]) assert.deepEqual(steps(`clock${n}`), [{ t: 'curse', prop: `clock${n}` }, { t: 'say', script: `l12_clock${n}` }], `clock${n}: the curse, then the script`);
  assert.deepEqual(steps('roof'), [{ t: 'close', prop: 'door_roof' }, { t: 'music', track: 'clock' }, { t: 'say', script: 'l12_roof' }]);
  assert.deepEqual(steps('solo'), [{ t: 'say', script: 'l12_solo' }, { t: 'solo', chart: 'rooftop' }]);
  assert.deepEqual(steps('level_clear'), [{ t: 'fall', hero: 'eddie' }, { t: 'say', script: 'l12_fall' }, { t: 'finish' }]);
  assert.deepEqual(when('roof'), { rect: rectOf('roof'), needs: 'park' });
  assert.deepEqual(when('solo'), { after: 'roof' });
  assert.deepEqual(when('level_clear'), { after: 'solo' });
  assert.ok(S.beats.every((b) => b.steps.every((st) => st.t !== 'scare' && st.t !== 'waves' && st.t !== 'defend' && st.t !== 'leave' && st.t !== 'recruit' && st.t !== 'alarm' && st.t !== 'walkman')), 'no scare, waves, defense, npc or recruit: Eddie is in the party');
  assert.equal(musicAfter(S.beats, ['start', 'street', 'clock1'], S.music), 'upside', 'the upside track plays the whole way');
  assert.equal(musicAfter(S.beats, ['start', 'roof'], S.music), 'clock', 'the roof beat switches to clock for the climb (a retry keeps it)');
});

test('stage 4.3: the triggers sit where the spec puts them: each clock a few steps off, the park at the gate, the roof on the deck behind the ladder', () => {
  // A clock beat is the tiles in front of its clock, close enough that the chime is a few steps from the clock to be broken.
  for (const n of [1, 2, 3]) {
    const c = prop(`clock${n}`), r = rectOf(`clock${n}`);
    const nearest = Math.min(...rectTiles(r).filter(([x, y]) => !solid(x, y)).map(([x, y]) => Math.hypot(x - c.tx, y - (c.ty + 0.5))));
    assert.ok(nearest <= 4, `clock${n}'s beat is ${nearest.toFixed(1)} tiles from it`);
    assert.ok(rectTiles(r).filter(([x, y]) => !solid(x, y)).every(([x, y]) => !(x === c.tx && (y === c.ty || y === c.ty + 1))), `clock${n}'s beat is not the clock`);
  }
  assert.ok(inRect(rectOf('start'), startTx, startTy), 'the start beat covers the start');
  assert.ok(rectTiles(rectOf('start')).every(([x, y]) => inPlace('tear', x, y)), 'and nothing but the tear');
  assert.ok(rectTiles(rectOf('street')).every(([x, y]) => inPlace('street', x, y) && x <= 10), 'the street beat is its west end');
  assert.ok(rectTiles(rectOf('clock1')).every(([x, y]) => inPlace('street', x, y) && y <= 33), 'clock1\'s beat is the sidewalk in front of its yard');
  // mirror_hint is far enough from the glass that the ghouls are still in it (80 px), on the road below the alley.
  const m = prop('mirror1');
  const far = (tx: number, ty: number): number => {
    const x = tx * 16 + 8, y = ty * 16 + 10, nx = Math.max(m.tx * 16, Math.min(x, m.tx * 16 + 32)), ny = Math.max(m.ty * 16, Math.min(y, m.ty * 16 + 16));
    return Math.hypot(x - nx, y - ny);
  };
  assert.ok(rectTiles(rectOf('mirror_hint')).filter(([x, y]) => !solid(x, y)).every(([x, y]) => far(x, y) > 80), 'the mirror hint plays before the ghouls step out');
  assert.ok(rectTiles(rectOf('mirror_hint')).every(([x, y]) => inPlace('street', x, y) || inPlace('yards', x, y)) && rectOf('mirror_hint').tx <= 18, 'on the road and lawn below the alley');
  assert.ok(rectTiles(rectOf('clock2')).every(([x, y]) => inPlace('cross', x, y)), 'clock2\'s beat is the cross street, where the alley comes out');
  assert.ok(rectOf('clock2').tx <= 18 && rectOf('clock2').tx + rectOf('clock2').w > 19, 'above the alley\'s mouth');
  assert.ok(rectTiles(rectOf('park')).every(([x, y]) => (inPlace('cross', x, y) || inPlace('gate', x, y)) && x >= 28), 'the park beat is the gate and the road in front of it');
  assert.ok(rectOf('park').tx + rectOf('park').w > 30, 'it takes in the gate');
  assert.ok(rectTiles(rectOf('clock3')).every(([x, y]) => inPlace('lanes', x, y)), 'clock3\'s beat is the lane in front of it');
  // The roof: the deck a few steps in from the ladder, so the door at the lip is behind the party and the song starts with room round Eddie.
  const roof = rectOf('roof');
  assert.ok(rectTiles(roof).every(([x, y]) => inPlace('deck', x, y)), 'the roof beat is on the deck');
  assert.ok(roof.ty + roof.h - 1 <= 8 && roof.tx <= 37 && roof.tx + roof.w > 38, 'a few rows in from the ladder, over it');
  assert.ok(roof.ty >= 4, 'and well clear of the north lip');
  const door = prop('door_roof');
  assert.ok(roof.ty + roof.h < door.ty - 2, 'with the door behind it');
});

test('director: the beats run in route order, each clock curses before its script, the roof shuts the door, the song waits, the fall comes before the party\'s script', () => {
  const { env, log, song } = fakeBase({ street: 10, alley: 3, park: 13, bats1: 4, bats2: 5 });
  const d = createDirector(S.beats, S.waves, env);
  const run = (fn: () => void): string[] => { log.length = 0; fn(); return [...log]; };
  assert.deepEqual(run(() => { d.tick(startTx, startTy); d.tick(startTx, startTy); }), ['say l12_start'], 'a rect beat fires once');
  assert.deepEqual(run(() => tick(d, 'roof')), [], 'the roof waits for the park');
  assert.deepEqual(run(() => tick(d, 'street')), ['say l12_street', 'wake bats1']);
  assert.deepEqual(run(() => tick(d, 'clock1')), ['curse clock1', 'say l12_clock1']);
  assert.deepEqual(run(() => tick(d, 'mirror_hint')), ['say l12_mirror_hint']);
  assert.deepEqual(run(() => d.events([{ t: 'propCleared', propId: 'mirror1' }])), [], 'a shattered mirror starts nothing: the chain waits on rects only');
  assert.deepEqual(run(() => tick(d, 'clock2')), ['curse clock2', 'say l12_clock2']);
  assert.deepEqual(run(() => tick(d, 'clock2')), [], 'and only once');
  assert.deepEqual(run(() => d.events([{ t: 'curseEnd', hero: 'mike', how: 'clock' }])), [], 'a curse ending starts nothing either');
  assert.deepEqual(run(() => tick(d, 'park')), ['say l12_park', 'wake bats2']);
  assert.deepEqual(run(() => tick(d, 'clock3')), ['curse clock3', 'say l12_clock3']);
  assert.deepEqual(run(() => tick(d, 'roof')), ['close door_roof', 'music clock', 'say l12_roof', 'say l12_solo', 'solo rooftop'], 'the door, the music, the script, then the song');
  assert.ok(!d.finished());
  assert.deepEqual(run(() => tick(d, 'roof')), [], 'the roof beat fires once');
  assert.deepEqual(run(() => song()), ['dismiss eddie', 'say l12_fall', 'finish'], 'the song ends, Eddie falls, the party speaks, the stage finishes');
  assert.ok(d.finished());
});

test('director: a retry from each string reaches the clear, whatever was broken or cleared, because every chain waits on a rect beat', () => {
  const light = (fired: string[], cleared: string[], alive: Record<string, number>): { log: string[]; song(): void; d: ReturnType<typeof createDirector> } => {
    const { env, log, song } = fakeBase(alive);
    const d = createDirector(S.beats, S.waves, env);
    d.restore({ fired, cleared });
    return { log, song, d };
  };
  // lights_tear: lit at the start, before any beat but start.
  const a = light(['start'], [], { bats1: 4, bats2: 5 });
  for (const id of ['street', 'clock1', 'mirror_hint', 'clock2', 'park', 'clock3', 'roof']) tick(a.d, id);
  a.song();
  assert.deepEqual(a.log, [
    'say l12_street', 'wake bats1', 'curse clock1', 'say l12_clock1', 'say l12_mirror_hint', 'curse clock2', 'say l12_clock2', 'say l12_park', 'wake bats2',
    'curse clock3', 'say l12_clock3', 'close door_roof', 'music clock', 'say l12_roof', 'say l12_solo', 'solo rooftop', 'dismiss eddie', 'say l12_fall', 'finish',
  ]);
  // lights_park: lit on the cross street before the gate, with mirror1 shattered and clock1 and clock2 broken: nothing event-driven is lost.
  const b = light(['start', 'street', 'clock1', 'mirror_hint', 'clock2'], ['bats1', 'street', 'alley'], { bats2: 5 });
  for (const id of ['clock3', 'roof']) tick(b.d, id);
  assert.deepEqual(b.log, ['curse clock3', 'say l12_clock3'], 'the roof still needs the park beat, which plays at the gate');
  tick(b.d, 'park');
  tick(b.d, 'roof');
  b.song();
  assert.deepEqual(b.log.slice(2), ['say l12_park', 'wake bats2', 'close door_roof', 'music clock', 'say l12_roof', 'say l12_solo', 'solo rooftop', 'dismiss eddie', 'say l12_fall', 'finish']);
  // lights_roof: lit in the lot after the park and the third clock: only the roof is left.
  const c = light(['start', 'street', 'clock1', 'mirror_hint', 'clock2', 'park', 'clock3'], ['bats1', 'street', 'alley', 'park', 'bats2'], {});
  tick(c.d, 'roof');
  c.song();
  assert.deepEqual(c.log, ['close door_roof', 'music clock', 'say l12_roof', 'say l12_solo', 'solo rooftop', 'dismiss eddie', 'say l12_fall', 'finish']);
  assert.ok(c.d.finished());
  // A song cut short by a wipe never reports: the retry restores a director with the roof and solo unplayed, and the old callback does nothing.
  const e = fakeBase({});
  const dd = createDirector(S.beats, S.waves, e.env);
  dd.restore({ fired: ['start', 'street', 'clock1', 'mirror_hint', 'clock2', 'park', 'clock3'], cleared: [] });
  tick(dd, 'roof');
  dd.restore({ fired: ['start', 'street', 'clock1', 'mirror_hint', 'clock2', 'park', 'clock3'], cleared: [] });
  e.song();
  assert.ok(!dd.finished(), 'the thrown-away song cannot finish the stage');
});

// ---------------------------------------------------------------- the scripts
test('stage 4.3: the 10 scripts exist, fit the box on a keyboard and a pad, and are Eddie\'s, the party\'s and the narrator\'s', () => {
  assert.deepEqual(L12_SCRIPTS.map((s) => s.id), SCRIPT_IDS, 'in the doc\'s order');
  assert.deepEqual(Object.keys(SCRIPTS).filter((k) => k.startsWith('l12_')).sort(), [...SCRIPT_IDS].sort(), 'no stray l12 scripts');
  try {
    for (const device of ['keyboard', 'gamepad'] as const) {
      setPromptDevice(device);
      for (const s of L12_SCRIPTS) {
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
  const all = L12_SCRIPTS.flatMap((s) => s.lines.map((l, i) => ({ id: s.id, i, ...l })));
  const text = (id: string): string => (SCRIPTS[id]?.lines ?? []).map((l) => l.text).join(' ');
  const who = (id: string): Set<string> => new Set((SCRIPTS[id]?.lines ?? []).map((l) => l.who));
  assert.ok(all.every((l) => l.who !== 'hopper'), 'Hopper is in Kamchatka');
  assert.ok(all.every((l) => !hasEmDash(l.text)), 'no em dashes');
  assert.ok(all.every((l) => !/seamless|robust|leverage|unlock|delve/i.test(l.text)), 'no banned words');
  assert.ok(all.every((l) => !/not only|moreover|furthermore/i.test(l.text)), 'and none of the usual tells');
  assert.ok(all.every((l) => !/\{swap/.test(l.text)), 'no line names a swap slot');
  assert.ok(all.every((l) => l.text === l.text.trim() && !/ {2}|\.\.\./.test(l.text)), 'no stray spaces or dots');
  assert.ok(all.every((l) => !/\b(two|three|four|five|six|seven|eight|nine|ten|\d+) (ghouls|bats|demobats|demodogs|clocks|mirrors)\b/i.test(l.text)), 'nobody counts the foes, so the roster can change without the words');
  assert.ok(all.every((l) => !/freaks|master of puppets|run, run|welcome to the hellfire/i.test(l.text)), 'nothing quotes the show');
  // The roof is Eddie's: he is brave and nervous underneath, and he sends the others away.
  assert.ok(who('l12_roof').has('eddie') && who('l12_solo').has('eddie'), 'Eddie carries the roof and the solo');
  assert.ok((SCRIPTS.l12_solo?.lines ?? []).every((l) => l.who === 'eddie'), 'and the solo is only his');
  assert.ok((SCRIPTS.l12_roof?.lines ?? []).filter((l) => l.who === 'eddie').length >= 3, 'with most of the roof');
  assert.match(text('l12_roof'), /go|below|down/i, 'he sends them down');
  assert.match(text('l12_solo'), /nervous/i, 'nervous underneath');
  assert.ok((SCRIPTS.l12_roof?.lines ?? []).some((l) => l.who === 'eddie' && l.expr === 'determined') && (SCRIPTS.l12_roof?.lines ?? []).some((l) => l.who === 'eddie' && l.expr === 'worried'), 'brave and worried');
  // After the song he says nothing: the fall is the party\'s.
  const fall = SCRIPTS.l12_fall?.lines ?? [];
  assert.ok(!who('l12_fall').has('eddie'), 'nothing from Eddie after the song');
  assert.ok(fall.length >= 3 && fall.length <= 6 && fall.filter((l) => l.who !== 'narrator').length >= 3, 'a few lines from the party');
  assert.ok(fall.some((l) => /eddie/i.test(l.text)), 'who say his name');
  assert.equal(fall[0]?.who, 'narrator', 'after a line of narration');
  const people = new Set(all.map((l) => l.who));
  assert.ok(['eddie', 'max', 'dustin', 'mike', 'lucas', 'will', 'nancy', 'robin', 'steve'].every((c) => people.has(c as never)), 'the story assumes everyone: any hero may speak');
  assert.ok(all.filter((l) => l.who === 'narrator').length >= 6, 'the narrator sets each place');
  const expr = new Set(all.flatMap((l) => (l.expr ? [l.expr] : [])));
  assert.ok(['worried', 'determined', 'shocked', 'hurt'].every((e) => expr.has(e as never)), 'faces change with the mood');
  // Teaching: the lights at the tear, the riff at the glass, and the curse without any key.
  assert.match(text('l12_start'), /\{interact\}/, 'the tear teaches the lights');
  assert.match(text('l12_mirror_hint'), /\{attack\}/);
  assert.match(text('l12_mirror_hint'), /riff|guitar/i);
  for (const n of [1, 2, 3]) {
    assert.ok(!/\{\w+\}/.test(text(`l12_clock${n}`)), `clock${n} names its way out without a key`);
    assert.match(text(`l12_clock${n}`), /clock|chime|bell/i);
  }
  assert.match(text('l12_clock1'), /guitar/i, 'the first clock repeats that Eddie\'s guitar breaks it');
  assert.match(text('l12_clock1'), /three/i, 'and anyone else needs a few hits');
  assert.ok(L12_SCRIPTS.find((s) => s.id === 'l12_clock3')!.lines.length <= L12_SCRIPTS.find((s) => s.id === 'l12_clock1')!.lines.length, 'the clock scripts get shorter');
  assert.match(text('l12_street'), /demobat/i, 'the street names the flock');
});
