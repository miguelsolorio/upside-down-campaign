// One last campaign: the epilogue's music. F major, 72 bpm, a triangle and soft pulses, no combat layer. It plays through
// once, about 80 seconds, and its last bar is a d20 rolling to a stop. The checks every track meets (key, loop closure,
// polyphony, overlaps) run over TRACK_IDS in tracks.test.ts. This file checks what makes the ending the ending: that the
// motif resolves at last, that it plays once and tells a scene when it has ended, and the roll.
// Peak, limiter and clipping need a rendered signal, which Node can't make. They were measured with an offline render in
// a headless Chrome (renderOffline in render.ts, the same call as the audio lab's R key) and are recorded below next to a
// fingerprint of the track data that was rendered. If the track changes, the fingerprint stops matching and the test says
// to render it again. Where a real OfflineAudioContext exists (a browser test runner) the same test renders it itself.
import { test, mock } from 'node:test';
import assert from 'node:assert/strict';
import { TRACKS, TRACK_IDS } from '../src/audio/tracks/index.ts';
import { ENDING } from '../src/audio/tracks/ending.ts';
import { compile, findOverlaps, loopSeconds, maxVoices } from '../src/audio/tracks/compile.ts';
import { chord, chordPcs, inScale, makeScale, note, pitchClass } from '../src/audio/tracks/theory.ts';
import { MOTIF, motifInMajor, motifMajorBars } from '../src/audio/tracks/motif.ts';
import { scheduleOffline, startLive } from '../src/audio/sequencer.ts';
import type { NoiseChannel, PitchedChannel, Track } from '../src/audio/tracks/types.ts';
import { fakeContext, stub } from './audio-fake.ts';
import { print } from './audio-helpers.ts';

const E = ENDING;
const MAJOR = makeScale('F', 'major');
const pitched = (slot: string): PitchedChannel => {
  const c = E.channels.find((ch) => ch.slot === slot);
  assert.ok(c && c.slot !== 'noi', `${slot} channel`);
  return c as PitchedChannel;
};
const lead = pitched('p1');
const tri = pitched('tri');
const arp = pitched('p2');
const warm = pitched('p3');
const dice = E.channels.find((c) => c.slot === 'noi') as NoiseChannel;
const line = (c: PitchedChannel, from: number, count: number): number[] => c.bars.slice(from, from + count).flat().map((e) => e.midi);
/** The tune's last note in a bar, as a name-free pitch. */
const lastIn = (bar: number): number => lead.bars[bar].at(-1)!.midi;

// ---------------------------------------------------------------- what it is

test('the ending is registered: F major, 72 bpm, 24 bars, 80 seconds, a triangle and soft pulses and no combat layer', () => {
  assert.equal(TRACKS.ending, E);
  assert.ok(TRACK_IDS.includes('ending'));
  assert.deepEqual([E.id, E.title, E.bpm, E.tonic, E.mode, E.bars], ['ending', 'One last campaign', 72, 'F', 'major', 24]);
  assert.notEqual(E.bpm, 84, 'not the show theme');
  assert.deepEqual([...E.layers], ['base'], 'no combat layer');
  assert.ok(E.channels.every((c) => c.layer === 'base'));
  assert.equal(E.phases, undefined, 'one tempo');
  // 60 to 90 seconds, once.
  assert.equal(E.once, true);
  assert.ok(Math.abs(loopSeconds(E) - 80) < 1e-9, `${loopSeconds(E)} s`);
  // Triangle bass and soft pulse voices: every pulse is quiet, there is a triangle, and the only noise is the die.
  assert.deepEqual(E.channels.map((c) => c.slot).sort(), ['noi', 'p1', 'p2', 'p3', 'tri']);
  assert.equal(tri.inst.wave, 'tri');
  for (const c of [lead, arp, warm]) {
    assert.ok(c.inst.wave.startsWith('p'), `${c.slot} is a pulse`);
    assert.ok(c.inst.vol <= 0.2, `${c.slot} is soft: ${c.inst.vol}`);
  }
  for (const c of E.channels) assert.equal(c.bars.length, 24);
  const loud = compile(E).notes.filter((n) => n.drum && n.bar < 23);
  assert.equal(loud.length, 0, 'no drums before the last bar');
});

test('every note is in F major with no exceptions, and every chord is diatonic', () => {
  assert.deepEqual([...E.chromatic], []);
  const stray = compile(E).notes.filter((n) => !n.drum && !inScale(MAJOR, n.midi)).map((n) => `${n.slot} bar ${n.bar + 1} midi ${n.midi}`);
  assert.deepEqual(stray, []);
  for (const sym of E.harmony) for (const pc of chordPcs(sym)) assert.ok(inScale(MAJOR, pc), `${sym} has ${pc}`);
  assert.equal(E.harmony[0], 'Fmaj7');
  assert.equal(E.harmony[23], 'F');
  // Nothing is the show's chord: no C major seventh anywhere, and no run of four chord tones up the same chord.
  assert.ok(!E.harmony.includes('Cmaj7'));
});

// ---------------------------------------------------------------- the motif resolves

test('the Hawkins motif is in major here, C D C A Bb F, the way the Hawkins track plays it', () => {
  assert.deepEqual(motifInMajor().map((m) => m % 12), [0, 2, 0, 9, 10, 5]);
  assert.deepEqual(lead.bars.slice(4, 6), motifMajorBars());
  assert.deepEqual(lead.bars.slice(8, 10), motifMajorBars());
  assert.deepEqual(line(lead, 4, 2), motifInMajor());
  assert.equal(motifInMajor().length, MOTIF.length);
});

test('twice the tune hangs on E, the leading tone, and never goes home', () => {
  const e = pitchClass('E');
  const f = pitchClass('F');
  for (const bar of [7, 11]) {
    assert.equal(E.harmony[bar], 'C7', `bar ${bar + 1}`);
    assert.equal(lastIn(bar) % 12, e, `bar ${bar + 1} ends on E`);
    assert.ok(lead.bars[bar].at(-1)!.step + lead.bars[bar].at(-1)!.len >= 15, 'and holds it to the bar line');
  }
  // Nothing before the resolution lands on F over an F chord: the tune has not been home.
  for (let bar = 4; bar < 16; bar++) {
    if (lead.bars[bar].length === 0) continue;
    const home = lastIn(bar) % 12 === f && chord(E.harmony[bar]).root === f;
    assert.ok(!home, `bar ${bar + 1} is not home yet`);
  }
  // The motif itself ends on F, but it does so over Bb, the chord that never closes it.
  assert.equal(lastIn(5) % 12, f);
  assert.equal(E.harmony[5], 'Bbmaj7');
});

test('then the motif comes back an octave up and resolves: the E steps up to F on the tonic chord', () => {
  // Bars 17 and 18: the motif, an octave above where it was.
  assert.deepEqual(line(lead, 16, 2), motifInMajor().map((m) => m + 12));
  // Bar 19 hangs on E over C7 once more, and bar 20 is the F it was always going to: a semitone up, over an F chord.
  assert.equal(E.harmony[18], 'C7');
  assert.equal(E.harmony[19], 'F');
  assert.equal(lastIn(18) % 12, pitchClass('E'));
  assert.equal(lastIn(19) % 12, pitchClass('F'));
  assert.equal(lastIn(19) - lastIn(18), 1, 'the leading tone resolves up a semitone');
  assert.equal(lead.bars[19].length, 1);
  assert.ok(lead.bars[19][0].len >= 15, 'and it is held');
  // The voice under it lands on a chord tone of F: A, the third.
  assert.equal(warm.bars[19][0].midi % 12, pitchClass('A'));
  // The coda remembers the opening and falls home onto a long F.
  assert.deepEqual(lead.bars[20].map((e) => e.midi), [note('C5'), note('D5'), note('C5')]);
  assert.equal(lead.bars[22][0].midi, note('F4'));
});

test('the triangle carries the tune alone in the bridge, an octave under where it sings', () => {
  for (let bar = 12; bar < 16; bar++) {
    assert.ok(tri.bars[bar].length >= 2, `bar ${bar + 1} has the tune`);
    assert.equal(lead.bars[bar].length, 0, `the lead rests in bar ${bar + 1}`);
    for (const e of tri.bars[bar]) assert.ok(e.midi >= 55 && e.midi <= 72, `a triangle tune sits in the middle: ${e.midi}`);
  }
  // Under the tune and after it the triangle is the bass: roots and fifths, low.
  for (const bar of [4, 5, 16, 17, 21]) assert.ok(tri.bars[bar].every((e) => e.midi <= 55), `bar ${bar + 1} is the bass`);
  assert.equal(tri.bars[15].at(-1)!.midi % 12, pitchClass('E'), 'the bridge comes down on E as well');
});

test('the arp rocks 3 + 3 + 2 and changes chord every bar, so it is not a Cmaj7 arpeggio', () => {
  for (let bar = 0; bar < 23; bar++) assert.deepEqual(arp.bars[bar].map((e) => e.step), [0, 3, 6, 8, 11, 14], `bar ${bar + 1}`);
  const roots = new Set(E.harmony.map((s) => chord(s).root));
  assert.ok(roots.size >= 5, 'five or more roots');
  // It swells through the intro and is gone by the die.
  const vol = (bar: number): number => Math.max(...arp.bars[bar].map((e) => e.vel ?? 1));
  assert.ok(vol(0) < vol(3) && vol(22) < vol(20));
});

// ---------------------------------------------------------------- the die

test('the last bar is the d20: a rattle that slows as it settles, then a tock and a bright F major chord', () => {
  const last = dice.bars[23];
  assert.ok(last.length >= 10, `${last.length} clacks`);
  for (const bar of dice.bars.slice(0, 23)) assert.equal(bar.length, 0);
  // Each gap is longer than the one before: the die is slowing down.
  const stepSec = compile(E).stepSec;
  const gaps = last.slice(1).map((h, i) => (h.step - last[i].step) * stepSec);
  gaps.forEach((g, i) => { if (i > 0) assert.ok(g > gaps[i - 1], `gap ${i} is longer`); });
  assert.ok(gaps[0] >= 0.045 && gaps[0] <= 0.06, `it starts at ${gaps[0]}`);
  assert.ok(gaps.at(-1)! > 0.25 && gaps.at(-1)! < 0.5, `and settles at ${gaps.at(-1)}`);
  // The last clack is a tock on step 13, at full velocity, and the rattle starts after the coda has faded.
  assert.deepEqual([last.at(-1)!.step, last.at(-1)!.drum, last.at(-1)!.vel], [13, 'tock', 1]);
  assert.ok(last[0].step > 3);
  assert.ok(last.every((h) => h.drum === 'tick' || h.drum === 'tock'));
  // The landing: the F major triad, F in the triangle, A, F and C above, all on the tock and ending with the bar.
  const landing = compile(E).notes.filter((n) => n.bar === 23 && !n.drum);
  assert.deepEqual(landing.map((n) => n.slot).sort(), ['p1', 'p2', 'p3', 'tri']);
  for (const n of landing) {
    assert.equal(n.step, 13);
    assert.ok(n.step + n.gate / (n.inst?.gate ?? 1) <= 16 + 1e-9, 'nothing runs past the last bar');
  }
  assert.deepEqual([...new Set(landing.map((n) => n.midi % 12))].sort((a, b) => a - b), [0, 5, 9]);
  assert.equal(landing.find((n) => n.slot === 'tri')!.midi, note('F2'));
  assert.ok(landing.find((n) => n.slot === 'p2')!.midi >= note('F6'), 'with a bright octave on top');
  // The harmony of the last bar is the tonic.
  assert.equal(E.harmony[23], 'F');
  assert.equal(chord(E.harmony[23]).root, pitchClass(E.tonic));
});

test('the loop closes and the ending fits in five voices: nothing overlaps and nothing runs past the last bar', () => {
  assert.deepEqual(findOverlaps(E), []);
  assert.ok(maxVoices(E) <= 5);
  const c = compile(E);
  for (const n of c.notes) assert.ok(n.abs + n.gate / (n.inst?.gate ?? 1) <= c.loop + 1e-9);
});

// ---------------------------------------------------------------- it plays once, and says when it has

test('an offline render plays the bars once: nothing is scheduled after the last bar, however long the render', () => {
  const f = fakeContext();
  scheduleOffline(f as unknown as BaseAudioContext, stub() as unknown as AudioNode, E, 300, ['base'], 0);
  const starts = f.voices.map((v) => v.t);
  assert.ok(starts.length > 100);
  assert.ok(Math.max(...starts) < 80, `the last onset is at ${Math.max(...starts)} s`);
  const again = fakeContext();
  scheduleOffline(again as unknown as BaseAudioContext, stub() as unknown as AudioNode, TRACKS.clock, 100, ['base'], 0);
  assert.ok(Math.max(...again.voices.map((v) => v.t)) > 90, 'while a loop goes on to the end of the render');
});

test('the live driver plays 24 bars, stops scheduling, and reports when the music runs out', () => {
  mock.timers.enable({ apis: ['setInterval'] });
  try {
    const f = fakeContext();
    const driver = startLive(f as unknown as BaseAudioContext, stub() as unknown as AudioNode, E, { base: stub(), sendBase: stub() }, 0.05);
    const bar = 240 / 72;
    assert.equal(driver.endAt, null);
    for (let k = 1; k < 24; k++) {
      f.currentTime = 0.05 + k * bar - 0.05;
      mock.timers.tick(25);
      assert.equal(driver.endAt === null, k < 23, `the end is known once bar 24 is scheduled, not at bar ${k + 1}`);
      assert.equal(driver.barAt(0.05 + k * bar + 0.01), k);
    }
    // The last bar went out at 76.72 s and it is the last: the end is known now.
    assert.ok(driver.endAt !== null && Math.abs(driver.endAt - (0.05 + 80)) < 1e-6, `ends at ${driver.endAt}`);
    const sent = f.voices.length;
    f.currentTime = 90;
    mock.timers.tick(250);
    assert.equal(f.voices.length, sent, 'it does not loop');
    assert.equal(driver.barAt(100), 23, 'and the bar stays the last');
    driver.stop();
  } finally {
    mock.timers.reset();
  }
});

test('the audio API says when the ending has ended, and not before, and a loop never ends', async () => {
  const f = fakeContext();
  (globalThis as { AudioContext?: unknown }).AudioContext = function () { return f; };
  mock.timers.enable({ apis: ['setInterval', 'setTimeout'] });
  try {
    const { audio } = await import('../src/audio/index.ts');
    const { position } = await import('../src/audio/live.ts');
    const bar = 240 / 72;
    assert.ok(Math.abs(audio.trackSeconds('ending') - 80) < 1e-9);
    assert.equal(audio.musicEnded(), false, 'nothing is playing');
    // Before sound is allowed there is nothing to end, so a scene keeps its own clock (trackSeconds).
    audio.music('ending');
    assert.equal(audio.musicEnded(), false, 'asked for, not started');
    f.currentTime = 100;
    audio.unlock();
    // It starts at 100.05 s. Walk the clock a bar at a time.
    const start = 100.05;
    for (let k = 0; k < 24; k++) {
      f.currentTime = start + k * bar - 0.05;
      mock.timers.tick(25);
      assert.equal(audio.musicEnded(), false, `bar ${k + 1} is playing`);
    }
    assert.equal(position()?.bar, 22, 'two bars from the end, at the last bar scheduled');
    f.currentTime = start + 23 * bar + 1;
    assert.equal(position()?.bar, 23);
    assert.equal(audio.musicEnded(), false, 'one second into the die');
    f.currentTime = start + 80 - 0.01;
    assert.equal(audio.musicEnded(), false, 'a hair before the end');
    f.currentTime = start + 80 + 0.01;
    assert.equal(audio.musicEnded(), true, 'a hair after');
    assert.equal(position()?.bar, 23, 'the lab still shows the last bar');
    // Asking for it again does not restart it. Stopping it and asking again does.
    audio.music('ending');
    assert.equal(audio.musicEnded(), true);
    audio.music(null);
    assert.equal(audio.musicEnded(), false);
    f.currentTime = 300;
    audio.music('ending');
    assert.equal(audio.musicEnded(), false);
    audio.music('abyss');
    f.currentTime = 5000;
    assert.equal(audio.musicEnded(), false, 'a loop never ends');
    audio.music(null);
  } finally {
    mock.timers.reset();
    delete (globalThis as { AudioContext?: unknown }).AudioContext;
  }
});

// ---------------------------------------------------------------- levels

/**
 * What the offline render said, through the same limiter the game uses: the whole ending and three seconds of tail
 * (83 s). peak is the largest sample after the limiter, limiterDb the largest gain reduction in 20 ms windows (0.0001 is
 * the compressor's own rounding), rmsDb the loudness over the whole render, clipped the samples at full scale. The other
 * tracks, rendered the same way: base peaks 0.47 to 0.71 at -16.2 to -18.4 dB.
 */
const MEASURED = {
  print: '3a764065',
  base: { peak: 0.5027, limiterDb: 0.0001, rmsDb: -18.23, clipped: 0 },
};

test('the ending renders without clipping: peak under 0.9, limiter under 3 dB, as loud as the other tracks', async () => {
  const Offline = (globalThis as { OfflineAudioContext?: unknown }).OfflineAudioContext;
  if (Offline) {
    const { renderOffline } = await import('../src/audio/render.ts');
    const m = await renderOffline('ending', 83);
    assert.ok(m.peak < 0.9, `peak ${m.peak}`);
    assert.ok(m.limiterDb < 3, `limiter ${m.limiterDb}`);
    assert.equal(m.clipped, 0);
    return;
  }
  assert.equal(print(E as Track), MEASURED.print, 'The ending changed since it was rendered: render it again (audio lab R, or renderOffline) and update MEASURED');
  const m = MEASURED.base;
  assert.ok(m.peak > 0.2 && m.peak < 0.9, `peak ${m.peak}`);
  assert.ok(m.limiterDb >= 0 && m.limiterDb < 3, `limiter ${m.limiterDb}`);
  assert.equal(m.clipped, 0);
  assert.ok(m.rmsDb > -20 && m.rmsDb < -14, `rms ${m.rmsDb}`);
});
