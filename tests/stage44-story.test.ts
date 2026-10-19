// Stage 4.4, Vecna's lair: the director running its seven beats (the door shuts and the music changes before the vecna script, the phases play their
// scripts, the clear is script, door, finish, and a retry from either string still reaches the attic), and the seven scripts: Vecna slow and
// certain, a few words at a time, and the party short and grieving. The map, the budget and the bot's route are in stage44.test.ts, and whole
// runs and the play scene in stage44-play.test.ts.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { keyText, setPromptDevice } from '../src/core/bindings.ts';
import { fitsBox, hasEmDash, wrapText } from '../src/core/text.ts';
import { SCRIPTS } from '../src/story/scripts.ts';
import { L13_SCRIPTS } from '../src/story/scripts_l13.ts';
import { createDirector, musicAfter } from '../src/world/triggers.ts';
import type { DirectorEnv } from '../src/world/triggers.ts';
import type { Sim } from '../src/core/types.ts';
import { BEAT_IDS, SCRIPT_IDS, S, kit, rectOf } from './stage44-helpers.ts';

const { enemies, props } = kit;

// ---------------------------------------------------------------- beats
/** A stand-in sim and env for the director that also takes close, which this stage's `vecna` beat uses. */
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
const tick = (d: ReturnType<typeof createDirector>, id: string): void => { const r = rectOf(id); d.tick(r.tx, r.ty); };

test('stage 4.4: every beat has a trigger and a real script, and the steps act on groups and props the stage has', () => {
  const groups = new Set(enemies.map((e) => e.group));
  for (const b of S.beats) {
    for (const st of b.steps) {
      if (st.t === 'say') assert.ok(SCRIPT_IDS.includes(st.script) && SCRIPTS[st.script], `${b.id} plays ${st.script}`);
      if (st.t === 'wake') assert.ok(groups.has(st.group), `${b.id} wakes ${st.group}`);
      if (st.t === 'open' || st.t === 'close') assert.ok(props.some((p) => p.id === st.prop), `${b.id} acts on ${st.prop}`);
    }
    const w = b.when;
    if ('cleared' in w) assert.ok(groups.has(w.cleared), `${b.id} waits on ${w.cleared}`);
    if ('event' in w && w.event === 'phase') assert.ok(enemies.some((e) => e.id === w.spawn && e.type === 'vecna') && (w.phase === 2 || w.phase === 3), `${b.id} watches Vecna's phases`);
  }
  const said = new Set(S.beats.flatMap((b) => b.steps.flatMap((st) => (st.t === 'say' ? [st.script] : []))));
  assert.deepEqual([...said].sort(), SCRIPT_IDS.filter((s) => s !== 'l13_hill').sort(), 'every script but the epilogue\'s is played by some beat, and no other is');
  assert.equal(musicAfter(S.beats, ['start', 'house', 'stairs'], S.music), 'upside', 'the route keeps the Upside Down track');
  assert.equal(musicAfter(S.beats, ['start', 'house', 'stairs', 'vecna'], S.music), 'clock', 'and a retry or a load after the attic beat keeps the clock');
});

test('director: the beats run in route order, the door shuts and the music changes before Vecna speaks, and the clear is script, door, finish', () => {
  const { env, log } = fakeBase({ foyer: 5, landing: 7, boss: 5 });
  const d = createDirector(S.beats, S.waves, env);
  const run = (fn: () => void): string[] => { log.length = 0; fn(); return [...log]; };
  assert.deepEqual(run(() => { tick(d, 'start'); tick(d, 'start'); }), ['say l13_start'], 'a rect beat fires once');
  assert.deepEqual(run(() => tick(d, 'vecna')), [], 'the attic waits for the stairs');
  assert.deepEqual(run(() => tick(d, 'house')), ['say l13_house', 'wake foyer']);
  assert.deepEqual(run(() => tick(d, 'vecna')), [], 'and for the stairs, not the foyer');
  assert.deepEqual(run(() => tick(d, 'stairs')), ['say l13_stairs', 'wake landing']);
  assert.deepEqual(run(() => tick(d, 'vecna')), ['close door_attic', 'music clock', 'say l13_vecna', 'wake boss']);
  assert.deepEqual(run(() => tick(d, 'vecna')), [], 'and only once');
  assert.deepEqual(run(() => d.events([{ t: 'phase', spawnId: 'vecna', phase: 2 }])), ['say l13_float']);
  assert.deepEqual(run(() => d.events([{ t: 'phase', spawnId: 'vecna', phase: 2 }])), [], 'a phase plays its script once');
  assert.deepEqual(run(() => d.events([{ t: 'phase', spawnId: 'other', phase: 3 }])), [], 'only Vecna\'s phases');
  assert.deepEqual(run(() => d.events([{ t: 'phase', spawnId: 'vecna', phase: 3 }])), ['say l13_burn']);
  assert.ok(!d.finished());
  assert.deepEqual(run(() => d.events([{ t: 'groupCleared', group: 'foyer' }, { t: 'groupCleared', group: 'landing' }])), [], 'the foyer and the landing clearing do nothing');
  assert.deepEqual(run(() => d.events([{ t: 'groupCleared', group: 'boss' }])), ['say l13_clear', 'open door_attic', 'finish']);
  assert.ok(d.finished());
});

test('director: a retry from a string reaches the attic whatever the beats before it did, because every link in the chain is a rect', () => {
  const walk = (fired: string[]): string[] => {
    const { env, log } = fakeBase({ foyer: 5, landing: 2, boss: 5 });
    const d = createDirector(S.beats, S.waves, env);
    d.restore({ fired, cleared: [] });
    for (const id of ['start', 'house', 'stairs', 'vecna']) tick(d, id);
    return log;
  };
  // lights_porch is lit on the porch, before everything but the start: the whole route plays again.
  assert.deepEqual(walk(['start']), ['say l13_house', 'wake foyer', 'say l13_stairs', 'wake landing', 'close door_attic', 'music clock', 'say l13_vecna', 'wake boss']);
  // lights_landing is lit past the stairs: only the attic is left, and Vecna wakes at his full health (a fresh sim, the boss group whole).
  assert.deepEqual(walk(['start', 'house', 'stairs']), ['close door_attic', 'music clock', 'say l13_vecna', 'wake boss']);
  // A group with nobody left alive counts as cleared on the spot (the dead are skipped on a retry), so a retry that took the landing's last
  // enemy changes nothing: the stairs beat still plays and the attic still follows it.
  const { env, log } = fakeBase({ foyer: 0, landing: 0, boss: 5 });
  const d = createDirector(S.beats, S.waves, env);
  d.restore({ fired: ['start'], cleared: [] });
  for (const id of ['house', 'stairs', 'vecna']) tick(d, id);
  assert.deepEqual(log, ['say l13_house', 'say l13_stairs', 'close door_attic', 'music clock', 'say l13_vecna', 'wake boss']);
});

// ---------------------------------------------------------------- the scripts
test('stage 4.4: the 8 scripts exist (the seven beats\' and the epilogue\'s), fit the box on a keyboard and a pad, and are the party\'s, the narrator\'s and Vecna\'s', () => {
  assert.deepEqual(L13_SCRIPTS.map((s) => s.id), SCRIPT_IDS, 'in the doc\'s order');
  assert.deepEqual(Object.keys(SCRIPTS).filter((k) => k.startsWith('l13_')).sort(), [...SCRIPT_IDS].sort(), 'no stray l13 scripts');
  assert.deepEqual(S.beats.map((b) => b.id), BEAT_IDS);
  try {
    for (const device of ['keyboard', 'gamepad'] as const) {
      setPromptDevice(device);
      for (const s of L13_SCRIPTS) {
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
  const all = L13_SCRIPTS.flatMap((s) => s.lines.map((l, i) => ({ id: s.id, i, ...l })));
  const text = (id: string): string => (SCRIPTS[id]?.lines ?? []).map((l) => l.text).join(' ');
  const who = (id: string): Set<string> => new Set((SCRIPTS[id]?.lines ?? []).map((l) => l.who));
  assert.ok(all.every((l) => !['hopper', 'eddie'].includes(l.who)), 'Hopper is in Kamchatka and Eddie fell on the roof');
  assert.ok(all.every((l) => !hasEmDash(l.text)), 'no em dashes');
  assert.ok(all.every((l) => !/seamless|robust|leverage|unlock|delve/i.test(l.text)), 'no banned words');
  assert.ok(all.every((l) => l.text === l.text.trim() && !/ {2}|\.\.\./.test(l.text)), 'no stray spaces or dots');
  assert.ok(all.every((l) => !/running up that hill|friends don't lie|master control|number one/i.test(l.text)), 'nothing quotes the show');
  assert.ok(all.every((l) => !/\b(two|three|four|five|six|seven|\d+) (demodogs|vines|pods|bats|orbs|bulbs)\b/i.test(l.text)), 'nobody counts the enemies, so the roster can change without the words');
  // Vecna: slow and certain, a few words a line, one or two a script, and not on the route.
  const vecna = all.filter((l) => l.who === 'vecna');
  assert.deepEqual([...new Set(vecna.map((l) => l.id))], ['l13_vecna', 'l13_float', 'l13_burn', 'l13_clear'], 'he speaks at the attic, the float, the burn and the end');
  for (const l of vecna) {
    assert.ok(l.text.split(' ').length <= 8, `${l.id}: "${l.text}" is a few words`);
    assert.ok(!/!|\?/.test(l.text), `${l.id}: he never raises his voice`);
  }
  for (const id of SCRIPT_IDS) assert.ok(vecna.filter((l) => l.id === id).length <= 2, `${id}: at most two of his lines`);
  assert.ok(vecna.some((l) => l.id === 'l13_vecna' && l.i === 1) && SCRIPTS.l13_vecna?.lines.at(-1)?.who === 'vecna', 'he opens and begins the fight');
  // The party: short lines from anyone, since the party is picked on the map.
  const people = new Set(all.map((l) => l.who));
  assert.ok(['mike', 'dustin', 'will', 'lucas', 'robin', 'nancy', 'max', 'steve', 'eleven'].every((c) => people.has(c as never)), 'the story assumes everyone: any hero may speak');
  assert.ok(all.filter((l) => l.who === 'narrator').length >= 4, 'the narrator sets the scene in each place');
  // Teaching: the lights, the orbs and the clock's two ways out, the float and the burn, all without a key.
  assert.match(text('l13_start'), /lights/i, 'the porch points at the string of lights');
  assert.match(text('l13_stairs'), /gap/i, 'the stairs point at the gap beside them');
  assert.match(text('l13_vecna'), /bulb/i);
  assert.match(text('l13_vecna'), /clock/i);
  assert.match(text('l13_vecna'), /red/i, 'the marked bulb is the red one');
  assert.match(text('l13_vecna'), /tape|music/i, 'and Max\'s music is the other way out');
  assert.ok((SCRIPTS.l13_vecna?.lines ?? []).some((l) => l.who === 'max' && /swap me/i.test(l.text)), 'which she says herself');
  assert.ok(!/\{\w+\}/.test(text('l13_vecna')) && !/\b(press|button|key)\b/i.test(text('l13_vecna')), 'without a key');
  assert.match(text('l13_float'), /shots|beams/i, 'a shot reaches him in the air');
  assert.match(text('l13_float'), /bulb/i, 'and a broken bulb pulls him down');
  assert.match(text('l13_float'), /grow back/i, 'and they grow back');
  assert.match(text('l13_burn'), /clock|bell/i, 'the clock rings faster in the burn');
  assert.match(text('l13_burn'), /fire/i);
  // The end of chapter four: the gates are open, and chapter five is the town under lockdown.
  assert.match(text('l13_clear'), /gates/i);
  assert.match(text('l13_clear'), /1986/);
  assert.equal(SCRIPTS.l13_clear?.lines.at(-1)?.who, 'narrator', 'the chapter ends on the narrator');
  assert.ok(who('l13_clear').has('vecna') && who('l13_clear').has('mike'));
});
