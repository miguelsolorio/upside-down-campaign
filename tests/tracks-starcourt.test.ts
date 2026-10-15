// Starcourt: stages 3.1 and 3.2. C Lydian, 118 bpm, 32 bars, bright mall pop. The checks every track meets (key,
// loop closure, polyphony, overlaps) run over TRACK_IDS in tracks.test.ts. This file checks what makes Starcourt
// Starcourt: the Hawkins motif in Lydian, the raised fourth, the groove and the levels.
// Peak, limiter and clipping need a rendered signal, which Node can't make. They were measured with an offline
// render in the browser (renderOffline in render.ts, the audio lab's R key) and are recorded below next to a
// fingerprint of the track data that was rendered. If the track changes, the fingerprint stops matching and the test
// says to render it again. Where a real OfflineAudioContext exists (a browser test runner) the same test renders
// the track itself instead.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { TRACKS, TRACK_IDS } from '../src/audio/tracks/index.ts';
import { STARCOURT } from '../src/audio/tracks/starcourt.ts';
import { HAWKINS } from '../src/audio/tracks/hawkins.ts';
import { compile, findOverlaps, maxVoices } from '../src/audio/tracks/compile.ts';
import { chordPcs, inScale, makeScale, note, pitchClass } from '../src/audio/tracks/theory.ts';
import { C_LYDIAN, D_MINOR, MOTIF, MOTIF_PITCHES, motifInLydian, motifLydianBars } from '../src/audio/tracks/motif.ts';
import type { NoiseChannel, PitchedChannel } from '../src/audio/tracks/types.ts';
import { print } from './audio-helpers.ts';

const T = STARCOURT;
const LYDIAN = makeScale('C', 'lydian');
/** The fifth over the chord's root: seven semitones, or six over the diminished chord. */
const HARMONY_FIFTH = (bar: number): number => (T.harmony[bar].endsWith('dim') ? 6 : 7);
const pitched = (slot: string, layer: string): PitchedChannel => {
  const c = T.channels.find((ch) => ch.slot === slot && ch.layer === layer);
  assert.ok(c && c.slot !== 'noi', `a ${layer} ${slot} channel`);
  return c as PitchedChannel;
};
const drums = (layer: string): NoiseChannel => {
  const c = T.channels.find((ch) => ch.slot === 'noi' && ch.layer === layer);
  assert.ok(c, `a ${layer} noise channel`);
  return c as NoiseChannel;
};

// ---------------------------------------------------------------- what it is

test('Starcourt is C Lydian at 118, 32 bars, with a base and a combat layer, and it is its own track', () => {
  assert.equal(TRACKS.starcourt, STARCOURT);
  assert.ok(TRACK_IDS.includes('starcourt'));
  assert.deepEqual([T.id, T.tonic, T.mode, T.bpm, T.bars], ['starcourt', 'C', 'lydian', 118, 32]);
  assert.deepEqual([...T.layers], ['base', 'combat']);
  assert.equal(T.channels.length, 6);
  for (const c of T.channels) assert.equal(c.bars.length, 32, `${c.layer} ${c.slot} has 32 bars`);
  assert.deepEqual(LYDIAN.steps, [0, 2, 4, 6, 7, 9, 11], 'Lydian is major with the fourth raised');
  assert.deepEqual([...makeScale('C', 'major').steps].map((s, i) => LYDIAN.steps[i] - s), [0, 0, 0, 1, 0, 0, 0]);
  // It is not Hawkins under another name, which is what the stand-in was.
  assert.notEqual(T.bpm, HAWKINS.bpm);
  assert.notEqual(T.mode, HAWKINS.mode);
  assert.notDeepEqual(T.channels, HAWKINS.channels);
  assert.notDeepEqual(T.harmony, HAWKINS.harmony);
  assert.equal(new Set(Object.values(TRACKS)).size, 7, 'seven different tracks');
  // 65 seconds, near a minute.
  const c = compile(T);
  assert.ok(Math.abs(c.loop * c.stepSec - 65.08) < 0.05);
});

test('every note is in C Lydian with no exceptions, and every chord is built from its tones', () => {
  assert.deepEqual([...T.chromatic], [], 'no chromatic notes are declared, so none are needed');
  const stray: string[] = [];
  for (const n of compile(T).notes) if (!n.drum && !inScale(LYDIAN, n.midi)) stray.push(`${n.slot} bar ${n.bar + 1} step ${n.step} midi ${n.midi}`);
  assert.deepEqual(stray, []);
  for (const [i, sym] of T.harmony.entries()) {
    for (const pc of chordPcs(sym)) assert.ok(inScale(LYDIAN, pc), `bar ${i + 1} ${sym} has pitch class ${pc} outside the mode`);
  }
});

test('the loop closes on the dominant, nothing overlaps, and no more than five voices ever sound', () => {
  assert.deepEqual(findOverlaps(T), []);
  assert.equal(T.harmony[0], 'Cmaj7');
  assert.equal(T.harmony[31], 'Gmaj7', 'the last chord is the dominant, with F sharp as its major seventh');
  assert.equal(chordPcs(T.harmony[31])[0], pitchClass('G'));
  assert.ok(maxVoices(T) <= 5, `all layers: ${maxVoices(T)}`);
  assert.ok(maxVoices(T, ['base']) <= 5 && maxVoices(T, ['combat']) <= 5);
  assert.equal(new Set(T.channels.map((c) => c.slot)).size, 5, 'three pulse slots, a triangle and a noise slot, no more');
  const keys = T.channels.map((c) => `${c.slot}/${c.layer}`);
  assert.equal(new Set(keys).size, keys.length);
});

// ---------------------------------------------------------------- the motif and the raised fourth

test('the Hawkins motif comes back in Lydian: the same six degrees, G A G E F# C', () => {
  const lyd = motifInLydian();
  assert.deepEqual(lyd, [note('G5'), note('A5'), note('G5'), note('E5'), note('F#5'), note('C5')]);
  assert.deepEqual(lyd.map((n) => n % 12), [7, 9, 7, 4, 6, 0]);
  // Degrees counted in each scale: the motif is 5 b6 5 b3 4 1 of D minor, and this is 5 6 5 3 #4 1 of C Lydian.
  const degree = (n: number, root: number, steps: readonly number[]): number => steps.indexOf((((n - root) % 12) + 12) % 12);
  const was = MOTIF_PITCHES.map((n) => degree(n, pitchClass('D'), D_MINOR.steps));
  const now = lyd.map((n) => degree(n, 0, C_LYDIAN.steps));
  assert.deepEqual(was, [4, 5, 4, 2, 3, 0]);
  assert.deepEqual(now, was, 'the same scale degrees');
  // The fourth degree is the one note that is not in C major: the raised fourth.
  assert.ok(lyd.every((n) => inScale(C_LYDIAN, n)));
  assert.equal(lyd.filter((n) => !inScale(makeScale('C', 'major'), n)).length, 1);
  assert.equal(lyd[4] % 12, pitchClass('F#'));
  // Rhythm unchanged: long, short, long, twice.
  const bars = motifLydianBars();
  assert.deepEqual(bars.flat().map((e) => [e.step, e.len]), MOTIF.map((m) => [m.step % 16, m.len]));
  assert.deepEqual(bars.flat().map((e) => e.midi), lyd);
});

test('the lead plays the motif four times, in bars 5, 9, 17 and 25, and the first time it enters', () => {
  const lead = pitched('p1', 'base');
  const lyd = motifInLydian();
  for (const bar of [4, 8, 16, 24]) assert.deepEqual(lead.bars.slice(bar, bar + 2).flat().map((e) => e.midi), lyd, `bar ${bar + 1}`);
  for (let b = 0; b < 4; b++) assert.equal(lead.bars[b].length, 0, `bar ${b + 1} is silent`);
  assert.deepEqual(lead.bars.slice(4, 6).flat().map((e) => [e.step, e.len]), MOTIF.map((m) => [m.step % 16, m.len]));
  // It is a square lead with a vibrato, on the first pulse slot.
  assert.equal(lead.inst.wave, 'p50');
  assert.ok(lead.inst.vib && lead.inst.vib.cents > 0);
  // The motif is not the only thing it plays: answers follow it.
  const played = lead.bars.filter((b) => b.length > 0).length;
  assert.ok(played >= 24, `${played} bars with notes`);
});

test('the lead leans on the raised fourth: F sharp is the second most played note, and one bar is all F sharp', () => {
  const lead = pitched('p1', 'base');
  const weight = new Map<number, number>();
  let all = 0;
  for (const e of lead.bars.flat()) {
    weight.set(e.midi % 12, (weight.get(e.midi % 12) ?? 0) + e.len);
    all += e.len;
  }
  const fSharp = weight.get(6) ?? 0;
  const ranked = [...weight.entries()].sort((a, b) => b[1] - a[1]);
  assert.ok(fSharp / all >= 0.2, `F sharp is ${(100 * fSharp / all).toFixed(0)} percent of the lead`);
  assert.ok(ranked[0][0] === 7 || ranked[0][0] === 6, 'G or F sharp leads');
  assert.ok(ranked.slice(0, 2).some(([pc]) => pc === 6), 'and F sharp is in the top two');
  assert.equal(weight.get(5), undefined, 'F natural never appears: this is not C major');
  // Whole bars of it: the bridge holds F sharp over Bm7, and the F sharp diminished bar holds it as the root.
  const whole = lead.bars.map((b, i) => (b.length === 1 && b[0].midi % 12 === 6 && b[0].len === 15 ? i + 1 : 0)).filter(Boolean);
  assert.deepEqual(whole, [15, 24]);
  assert.equal(T.harmony[14], 'Bm7');
  assert.equal(T.harmony[23], 'F#dim');
  // D, the chord a step above the tonic, is the Lydian chord, and it comes up more than any other but C.
  const count = (sym: string): number => T.harmony.filter((h) => h === sym).length;
  assert.ok(count('D') + count('D7') >= 10, 'D and D7 come back again and again');
  for (const sym of T.harmony) assert.ok(!chordPcs(sym).includes(5), `${sym} has no F natural`);
});

// ---------------------------------------------------------------- the groove

test('the bass bounces: a root on the beat and an octave pop on the sixteenth before the next one', () => {
  const bass = pitched('tri', 'base');
  assert.equal(bass.inst.wave, 'tri');
  for (const [i, bar] of bass.bars.entries()) {
    assert.equal(bar.length, 8, `bar ${i + 1} has eight notes`);
    const root = chordPcs(T.harmony[i])[0];
    for (const e of bar) {
      const pc = ((e.midi % 12) + 12) % 12;
      assert.ok(e.midi >= 36 && e.midi <= 60, `bar ${i + 1} bass note ${e.midi}`);
      assert.ok(pc === root || pc === (root + 7) % 12 || pc === (root + 6) % 12, `bar ${i + 1} bass note ${e.midi}`);
    }
    // The pops: a note at step 3 and step 7 an octave over the root on the beat before it.
    for (const step of [3, 7]) {
      const pop = bar.find((e) => e.step === step)!;
      const beat = bar.find((e) => e.step === step - 3 || e.step === step - 3 + 0)!;
      assert.equal(pop.midi - beat.midi, 12, `bar ${i + 1} pop at step ${step}`);
      assert.equal(pop.len, 1);
    }
  }
  // The flat fifth over the F sharp diminished chord is C: the one place the fifth is not seven semitones.
  const dim = bass.bars[23];
  assert.ok(dim.some((e) => e.midi % 12 === 0), 'C over F# dim');
  assert.ok(!dim.some((e) => e.midi % 12 === 1), 'never C sharp');
});

test('the arp twinkles: three sixteenths and a rest on every beat, and it jumps an octave when the lead rests', () => {
  const arp = pitched('p2', 'base');
  assert.equal(arp.inst.wave, 'p12', 'the thin pulse: glassy');
  assert.ok((arp.inst.send ?? 0) >= 0.3, 'it feeds the echo');
  assert.ok(T.echo && Math.abs(T.echo.beats - 0.75) < 1e-9, 'a dotted-eighth echo');
  for (const [i, bar] of arp.bars.entries()) {
    assert.deepEqual(bar.map((e) => e.step), [0, 1, 2, 4, 5, 6, 8, 9, 10, 12, 13, 14], `bar ${i + 1}`);
    for (const e of bar) assert.equal(e.len, 1);
    const pcs = chordPcs(T.harmony[i]);
    for (const e of bar) assert.ok(pcs.includes(e.midi % 12), `bar ${i + 1} note ${e.midi} is a tone of ${T.harmony[i]}`);
  }
  // Quiet in the intro, louder after.
  const loud = (bar: number): number => Math.max(...arp.bars[bar].map((e) => e.vel ?? 1));
  assert.ok(loud(0) < loud(3) && loud(3) <= 1 && loud(0) >= 0.4, 'it ramps through the intro');
  // The breakdown: the lead is silent in bars 21 and 22 and the arp is an octave higher there.
  const lead = pitched('p1', 'base');
  const mean = (bar: number): number => arp.bars[bar].reduce((a, e) => a + e.midi, 0) / arp.bars[bar].length;
  for (const bar of [20, 21]) {
    assert.equal(lead.bars[bar].length, 0, `bar ${bar + 1} lead rests`);
    assert.ok(mean(bar) > mean(bar - 4) + 6, `bar ${bar + 1} arp is up high`);
  }
});

test('the combat layer adds a driving pulse and drums, and nothing else', () => {
  const base = T.channels.filter((c) => c.layer === 'base').map((c) => c.slot).sort();
  const combat = T.channels.filter((c) => c.layer === 'combat').map((c) => c.slot).sort();
  assert.deepEqual(base, ['noi', 'p1', 'p2', 'tri']);
  assert.deepEqual(combat, ['noi', 'p3']);
  // The pulse: twelve sixteenths a bar in a chug, an octave pop on the sixteenth before each beat, on the 25 percent pulse.
  const drive = pitched('p3', 'combat');
  assert.equal(drive.inst.wave, 'p25');
  for (const [i, bar] of drive.bars.entries()) {
    assert.deepEqual(bar.map((e) => e.step), [0, 2, 3, 4, 6, 7, 8, 10, 11, 12, 14, 15], `bar ${i + 1}`);
    for (const e of bar) assert.equal(e.len, 1);
    // The root is the note on the downbeat. The pops sit an octave over it, and the turn-around bar (every fourth) puts
    // the fifth on its second half in between.
    const root = bar[0].midi;
    for (const step of [3, 7, 11, 15]) assert.equal(bar.find((e) => e.step === step)!.midi - root, 12, `bar ${i + 1} pop at ${step}`);
    const fives = bar.filter((e) => e.step >= 10 && e.step % 4 !== 3).map((e) => e.midi - root);
    assert.deepEqual(fives, i % 4 === 3 ? Array(3).fill(HARMONY_FIFTH(i)) : Array(3).fill(0), `bar ${i + 1} second half`);
  }
  // The pops land on the bass's pops: the same pitch classes at steps 3, 7 and 11.
  const bass = pitched('tri', 'base');
  for (const step of [3, 7, 11]) {
    for (const [i, bar] of drive.bars.entries()) {
      const b = bass.bars[i].find((e) => e.step === step);
      if (b) assert.equal(bar.find((e) => e.step === step)!.midi % 12, b.midi % 12, `bar ${i + 1} step ${step}`);
    }
  }
  // Drums: kick, snare, hat all there, kick on one and three in every bar, snare on two and four except in the roll.
  const kinds = new Set(compile(T).notes.filter((n) => n.layer === 'combat' && n.drum).map((n) => n.drum));
  assert.ok(kinds.has('kick') && kinds.has('snare'));
  assert.ok(new Set(compile(T).notes.filter((n) => n.layer === 'base' && n.drum).map((n) => n.drum)).has('hat'), 'the shaker is in the base layer');
  for (const [i, bar] of drums('combat').bars.entries()) {
    assert.ok(bar.some((h) => h.drum === 'kick' && h.step === 0), `bar ${i + 1} kick on one`);
    assert.ok(bar.some((h) => h.drum === 'snare' && h.step === 4) && bar.some((h) => h.drum === 'snare' && h.step === 12), `bar ${i + 1} snare on two and four`);
    if (i % 4 !== 3) assert.ok(bar.some((h) => h.drum === 'kick' && h.step === 8), `bar ${i + 1} kick on three`);
  }
  // Every fourth bar the snare rolls, and every other bar the kick pushes in on the "and" of three.
  const kickAt10 = drums('combat').bars.map((b) => b.some((h) => h.drum === 'kick' && h.step === 10));
  assert.deepEqual(kickAt10.map((k, i) => k === (i % 2 === 1 && i % 4 !== 3)), Array(32).fill(true));
  // The kick only pushes where the shaker leaves a gap: no combat hit shares a step with a base hit.
  const shaker = drums('base').bars;
  for (const [i, bar] of drums('combat').bars.entries()) {
    for (const h of bar) assert.ok(!shaker[i].some((s) => s.step === h.step), `bar ${i + 1} step ${h.step} is the shaker's`);
  }
});

test('the tempo and the shapes are its own: not near 84, and no voice plays C E G B', () => {
  assert.ok(Math.abs(T.bpm - 84) > 8);
  for (const c of T.channels) {
    if (c.slot === 'noi') continue;
    const flat = (c as PitchedChannel).bars.flat().map((e) => ((e.midi % 12) + 12) % 12);
    for (let i = 0; i + 3 < flat.length; i++) {
      assert.notDeepEqual(flat.slice(i, i + 4), [0, 4, 7, 11], `${c.layer} ${c.slot} plays C E G B at note ${i}`);
      assert.notDeepEqual(flat.slice(i, i + 4), [11, 7, 4, 0], `${c.layer} ${c.slot} plays B G E C at note ${i}`);
    }
  }
});

// ---------------------------------------------------------------- levels

/**
 * What the offline renders said: two laps of the loop (130.2 s), so the echo tail across the seam is counted, through
 * the same limiter the game uses. peak is the largest sample after the limiter, limiterDb the largest gain reduction in
 * 20 ms windows (0.0001 is the compressor's own rounding), rmsDb the loudness, clipped the samples at full scale.
 * The other six tracks, rendered the same way for 66 s: base peaks 0.47 to 0.71 at -16.2 to -18.4 dB, combat peaks
 * 0.63 to 0.79 at -16.7 to -18.3 dB.
 */
const MEASURED = {
  print: 'bc0f09d1',
  base: { peak: 0.4836, limiterDb: 0, rmsDb: -16.78, clipped: 0 },
  combat: { peak: 0.7519, limiterDb: 0, rmsDb: -18.65, clipped: 0 },
};

test('base and combat render without clipping: peak under 0.9, limiter under 3 dB', async () => {
  const Offline = (globalThis as { OfflineAudioContext?: unknown }).OfflineAudioContext;
  if (Offline) {
    const { renderOffline } = await import('../src/audio/render.ts');
    for (const combat of [false, true]) {
      const m = await renderOffline('starcourt', 66, { combat });
      assert.ok(m.peak < 0.9, `${combat ? 'combat' : 'base'} peak ${m.peak}`);
      assert.ok(m.limiterDb < 3, `${combat ? 'combat' : 'base'} limiter ${m.limiterDb}`);
      assert.equal(m.clipped, 0);
    }
    return;
  }
  assert.equal(print(T), MEASURED.print, 'Starcourt changed since it was rendered: render it again (audio lab, R) and update MEASURED');
  for (const [name, m] of [['base', MEASURED.base], ['combat', MEASURED.combat]] as const) {
    assert.ok(m.peak > 0.2 && m.peak < 0.9, `${name} peak ${m.peak}`);
    assert.ok(m.limiterDb >= 0 && m.limiterDb < 3, `${name} limiter ${m.limiterDb}`);
    assert.equal(m.clipped, 0, `${name} clips`);
    assert.ok(m.rmsDb > -30 && m.rmsDb < -10, `${name} rms ${m.rmsDb}`);
  }
  assert.ok(MEASURED.combat.peak > MEASURED.base.peak, 'the combat mix is the louder one at the peak');
});
