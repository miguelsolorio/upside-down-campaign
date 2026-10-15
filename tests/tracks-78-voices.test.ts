// Robin's and Nancy's tag-in stingers and Robin's, Nancy's and Erica's speech blips, made for Levels 7 and 8 (stages 3.1
// and 3.2). They replace stand-ins, so these tests check that nothing is borrowed any more, that every number is in
// range, and that each sound is built the way its design says. Peak and loudness need a rendered signal, which Node
// can't make. They were measured with an offline render in the browser (renderWith in render.ts) and are recorded below
// next to a fingerprint of the data that was measured. If a cue or a blip changes, its fingerprint stops matching and
// the test says to measure it again. The stub context in audio-helpers.ts plays the real code and checks the level.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { BLIPS, playBlip, playCue } from '../src/audio/cues.ts';
import { STINGERS } from '../src/audio/tracks/jingles.ts';
import type { Cue } from '../src/audio/tracks/jingles.ts';
import { note } from '../src/audio/tracks/theory.ts';
import { midiToHz } from '../src/audio/dsp.ts';
import type { Speaker } from '../src/core/types.ts';
import { play, peakOf, print } from './audio-helpers.ts';

/**
 * Peak after the limiter with the cue alone, and its A-weighted energy in dB (the ear's view of how loud it is). The
 * other tag-ins, measured the same way: Will 0.384, Max 0.45, Eleven 0.441, Steve 0.446, Mike 0.504 at 24.1 to 26 dB.
 */
const MEASURED_CUES: Record<'robin' | 'nancy', { print: string; peak: number; energyDb: number }> = {
  robin: { print: 'b3e504d0', peak: 0.359, energyDb: 25.3 },
  nancy: { print: 'd6a345af', peak: 0.467, energyDb: 25.7 },
};
/** The same for a blip at the centre of its range: the peak after the limiter, and the A-weighted energy in dB. */
const MEASURED_BLIPS: Record<'robin' | 'nancy' | 'erica', { print: string; peak: number; energyDb: number }> = {
  robin: { print: 'bb22d7a8', peak: 0.21, energyDb: 9 },
  nancy: { print: '06af0b49', peak: 0.372, energyDb: 8.7 },
  erica: { print: 'e116b4db', peak: 0.135, energyDb: 10 },
};
/** A-weighted energy of the other speakers' blips, from the same render: Mike 11.9, Dustin 8.4, Lucas 9.1, Eleven 9.6, Will 10, Max 8.8, Steve 10.9. */
const BLIP_MEDIAN_DB = 9.6;

// ---------------------------------------------------------------- the stingers

const HEROES = ['mike', 'dustin', 'lucas', 'eleven', 'will', 'max', 'steve', 'robin', 'nancy'] as const;
const melody = (c: Cue) => c.notes.filter((n) => n.w !== 'tri' || c === STINGERS.eleven || c === STINGERS.will || c === STINGERS.nancy);

test("Robin's and Nancy's tag-in stingers are two to four notes, in range, short, and unlike every other", () => {
  for (const h of ['robin', 'nancy'] as const) {
    const c = STINGERS[h];
    const tune = melody(c);
    assert.ok(tune.length >= 2 && tune.length <= 4, `${h} has ${tune.length} notes`);
    assert.ok(c.length > 0.3 && c.length < 1.1, `${h} runs ${c.length.toFixed(2)} s: a tag-in stays short`);
    assert.ok(c.duck > 0 && c.duck <= c.length && c.duckDb >= 3 && c.duckDb <= 9, `${h} ducks the music`);
    assert.ok(c.gain >= 0.5 && c.gain <= 2, `${h} gain ${c.gain}`);
    for (const n of c.notes) {
      const [lo, hi] = [Math.min(n.midi, n.to ?? n.midi), Math.max(n.midi, n.to ?? n.midi)];
      assert.ok(lo >= 36 && hi <= 96, `${h} note ${n.midi}`);
      assert.ok(n.at >= 0 && n.dur > 0 && n.vol > 0 && n.vol <= 0.35, `${h} note timing and volume`);
      assert.ok(n.at + n.dur <= c.length, `${h} note ends inside the cue`);
    }
    const shape = (k: Cue): string => JSON.stringify(k.notes.map((n) => [n.w, n.midi]));
    for (const other of [...HEROES.filter((o) => o !== h), 'scare'] as const) {
      assert.notEqual(shape(STINGERS[other]), shape(c), `${h} is not ${other}`);
      if (other !== 'scare') assert.notEqual(STINGERS[other].notes[0].midi, c.notes[0].midi, `${h} does not start where ${other} starts`);
    }
  }
  assert.equal(new Set(HEROES.map((h) => STINGERS[h])).size, 9);
  // The stand-ins were E5 then B5 for Robin and G4 then D5 for Nancy.
  assert.notDeepEqual(melody(STINGERS.robin).map((n) => n.midi), [note('E5'), note('B5')]);
  assert.notDeepEqual(melody(STINGERS.nancy).map((n) => n.midi), [note('G4'), note('D5')]);
});

test('Robin is fast and chatty on the high pulse: four short notes, a stutter and a hop, flat, with nothing under them', () => {
  const c = STINGERS.robin;
  assert.equal(c.notes.length, 4);
  assert.ok(c.notes.every((n) => n.w === 'p25' && !n.ring && !n.vib && n.to === undefined), 'the 25 percent pulse, held flat');
  assert.ok(c.notes.every((n) => n.midi >= note('G5')), 'all of it high');
  assert.ok(c.notes[0].midi === c.notes[1].midi, 'the same note twice, a stutter');
  assert.ok(c.notes[2].midi > c.notes[1].midi && c.notes[3].midi < c.notes[2].midi, 'a hop up and a drop');
  const starts = c.notes.map((n) => n.at);
  assert.ok(starts.every((s, i) => !i || s - starts[i - 1] <= 0.12), 'a note every tenth of a second');
  assert.ok(c.notes.slice(0, 3).every((n) => n.dur <= 0.09), 'short ones');
  assert.ok(c.notes[3].at + c.notes[3].dur <= 0.5, 'the whole phrase fits in half a second');
  assert.equal(c.hits.length, 0, 'no noise');
  assert.ok(!c.notes.some((n) => n.w === 'tri'), 'no bass');
  // Dustin is the other thin high one. Robin is on the wider pulse, higher, and has no zigzag.
  assert.equal(STINGERS.dustin.notes[0].w, 'p12');
  assert.ok(Math.min(...c.notes.map((n) => n.midi)) >= Math.max(...STINGERS.dustin.notes.map((n) => n.midi)), 'and no lower than his highest');
});

test('Nancy is flat and decisive on the triangle: the same note twice, then a fourth down and held, with no wobble, no slide and no noise', () => {
  const c = STINGERS.nancy;
  assert.equal(c.notes.length, 3);
  assert.ok(c.notes.every((n) => n.w === 'tri' && !n.vib && !n.ring && n.to === undefined), 'level: no vibrato, no slide');
  assert.equal(c.notes[0].midi, c.notes[1].midi);
  assert.equal(c.notes[0].dur, c.notes[1].dur);
  assert.equal(c.notes[2].midi, c.notes[1].midi - 5, 'a fourth down, like a cadence landing home');
  assert.ok(c.notes[2].dur > 2 * c.notes[1].dur, 'and it sits');
  const starts = c.notes.map((n) => n.at);
  assert.ok(Math.abs(starts[1] - starts[0] - (starts[2] - starts[1])) < 1e-9, 'evenly spaced, like a hammer coming down');
  assert.equal(c.hits.length, 0, 'no noise');
  // Will is the other triangle-only one: three notes that rise and sag. Nancy sits lower and never rises.
  assert.ok(c.notes.every((n, i) => !i || n.midi <= c.notes[i - 1].midi));
  assert.ok(Math.max(...c.notes.map((n) => n.midi)) < Math.min(...STINGERS.will.notes.map((n) => n.midi)));
});

test('the stingers were measured: the data is what was rendered, and both peak with the rest of the tag-ins', () => {
  for (const h of ['robin', 'nancy'] as const) {
    const m = MEASURED_CUES[h];
    assert.equal(print(STINGERS[h]), m.print, `${h}'s stinger changed since it was measured: render it again and update MEASURED_CUES`);
    assert.ok(m.peak >= 0.35 && m.peak <= 0.55, `${h} peaks at ${m.peak}, between Will's 0.38 and Mike's 0.50`);
    assert.ok(m.energyDb >= 23 && m.energyDb <= 27, `${h} carries ${m.energyDb} dB, with Mike's 24.1 and Steve's 26`);
    const out = play((ctx, dest) => playCue(ctx, dest, STINGERS[h], 0));
    assert.equal(out.voices.length, STINGERS[h].notes.length + STINGERS[h].hits.length, `${h} makes one voice per note and hit`);
    assert.equal(out.tones.length, STINGERS[h].notes.length);
    for (const t of out.tones) for (const f of t.freq) assert.ok(f >= 20 && f <= 4000, `${h} plays ${f} Hz`);
    for (const v of out.voices) assert.ok(peakOf(v) <= 0.35 * STINGERS[h].gain + 1e-9, `${h} no voice is loud on its own`);
  }
});

// ---------------------------------------------------------------- the speech blips

const hz = (m: number): number => midiToHz(m);
const range = (w: Speaker): [number, number] => [BLIPS[w].midi - BLIPS[w].spread, BLIPS[w].midi + BLIPS[w].spread];
/** Plays a blip with the first random number picking the semitone and the second the cents. */
const blipAt = (who: Speaker, pick: number) => play((ctx, dest) => {
  let k = 0;
  playBlip(ctx, dest, who, 0, () => (k++ === 0 ? pick : 0.5));
});
const others = (w: Speaker): Speaker[] => (Object.keys(BLIPS) as Speaker[]).filter((o) => o !== w);

test("Robin's blip is the fastest and highest pulse after Erica's square, and it leans a semitone up", () => {
  const b = BLIPS.robin;
  assert.equal(b.wave, 'p25');
  assert.ok(b.bend === 1, 'every blip leans up a semitone: she runs a little ahead');
  for (const w of others('robin')) assert.ok(BLIPS[w].dur > b.dur, `${w} is slower than Robin`);
  for (const w of others('robin')) if (w !== 'erica') assert.ok(BLIPS[w].midi < b.midi, `${w} is lower than Robin`);
  assert.ok(b.dur <= 0.03 && b.attack <= 0.002, 'quick');
  const [lo, hi] = range('robin');
  assert.ok(lo >= 60 && hi <= 96 && b.spread >= 3, `high and lively: ${lo} to ${hi}`);
  // The other thin pulse is Dustin's, a lower voice on the 12.5 percent wave. Max shares the 25 percent wave, lower.
  assert.ok(BLIPS.max.wave === 'p25' && BLIPS.max.midi < b.midi - 3);
  assert.notDeepEqual(b, { wave: 'p25', midi: 76, spread: 4, dur: 0.035, vol: 0.2, attack: 0.002 }, 'not the stand-in');
});

test("Nancy's blip is the lowest and most level triangle: a third of the spread, no bend, steady length", () => {
  const b = BLIPS.nancy;
  assert.equal(b.wave, 'tri');
  assert.ok(b.spread <= 1 && b.bend === undefined, 'level');
  for (const w of others('nancy')) if (BLIPS[w].wave === 'tri') {
    assert.ok(BLIPS[w].spread > b.spread, `${w} wanders more than Nancy`);
    assert.ok(range(w)[0] > range('nancy')[1], `${w} sits above Nancy's whole range`);
  }
  assert.ok(b.dur >= 0.05 && b.dur <= 0.1 && b.attack >= 0.008 && b.attack < b.dur / 2, 'a soft start and a steady length');
  assert.notDeepEqual(b, { wave: 'tri', midi: 62, spread: 2, dur: 0.06, vol: 0.22, attack: 0.006 }, 'not the stand-in');
  // Every note it can play is the same length, and the pitch holds still: no slide on the oscillator.
  for (const pick of [0, 0.5, 0.999]) assert.equal(blipAt('nancy', pick).tones[0].freq.length, 1);
});

test("Erica's blip is a quick bright square above everyone else's, short and hard", () => {
  const b = BLIPS.erica;
  assert.equal(b.wave, 'p50');
  for (const w of others('erica')) assert.ok(BLIPS[w].midi < b.midi, `${w} is lower than Erica`);
  for (const w of others('erica')) if (BLIPS[w].wave === 'p50') assert.ok(BLIPS[w].dur > b.dur, `${w}'s square is slower`);
  assert.ok(b.dur <= 0.035 && b.attack <= 0.001 && b.bend === undefined, 'quick, no attack, no bend');
  assert.ok(range('erica')[0] >= 78 && range('erica')[1] <= 90);
  assert.notDeepEqual(b, { wave: 'p50', midi: 77, spread: 3, dur: 0.04, vol: 0.18, attack: 0.002 }, 'not the stand-in');
});

test('the three blips reach the synth as the voice they claim, and were set by how loud they sound, not by peak', () => {
  for (const w of ['robin', 'nancy', 'erica'] as const) {
    const b = BLIPS[w];
    const m = MEASURED_BLIPS[w];
    assert.equal(print(b), m.print, `${w}'s blip changed since it was measured: render it again and update MEASURED_BLIPS`);
    assert.ok(Math.abs(m.peak - b.vol) < 0.015, `${w} was measured at ${m.peak}, set to ${b.vol}`);
    assert.ok(Math.abs(m.energyDb - BLIP_MEDIAN_DB) <= 1.5, `${w} carries ${m.energyDb} dB, against the others' ${BLIP_MEDIAN_DB}`);
    for (const [pick, semis] of [[0, -b.spread], [0.999, b.spread]] as const) {
      const out = blipAt(w, pick);
      assert.equal(out.tones.length, 1);
      assert.equal(out.voices.length, 1);
      const [f0, f1] = out.tones[0].freq;
      assert.ok(Math.abs(Math.log2(f0 / hz(b.midi + semis))) < 15 / 1200, `${w} starts on its note ${semis}`);
      if (b.bend) assert.ok(Math.abs(f1 / f0 - 2 ** (b.bend / 12)) < 1e-9, `${w} ends a semitone over where it started`);
      assert.ok(Math.abs(peakOf(out.voices[0]) - b.vol) < 1e-9, `${w} peaks at its volume`);
    }
  }
  // A low triangle is not heard as loud as a bright square at the same peak, so Nancy's peak is the highest and Erica's the lowest.
  assert.ok(BLIPS.nancy.vol > BLIPS.robin.vol && BLIPS.robin.vol > BLIPS.erica.vol);
  const square = blipAt('erica', 0.5).tones[0].wave;
  assert.ok(Math.abs(square.imag[2]) < 1e-6 && Math.abs(square.real[2]) < 1e-6, "Erica's is a square: no even harmonics");
  const tri = blipAt('nancy', 0.5).tones[0].wave;
  assert.ok(Math.abs(tri.imag[3] / tri.imag[1]) < 0.15 && Math.abs(tri.imag[2]) < 1e-6, "Nancy's is a triangle: soft harmonics, none even");
});
