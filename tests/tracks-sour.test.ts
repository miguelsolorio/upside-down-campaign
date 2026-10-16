// Sour: Starcourt going sour, for the climb to the court in stage 3.3. It replaces a stand-in that was Starcourt under
// another id. The checks every track meets (key, loop closure, polyphony, overlaps) run over TRACK_IDS in tracks.test.ts.
// This file checks what makes Sour Sour: that it is built from Starcourt's own notes, that it is its own track, and that it
// is bent the way its design says: slower, a detuned pair that beats under a slow wide vibrato, a lead that sags at the end
// of its phrases, a heavy bass and the bright parts thinned.
// Peak, limiter and clipping need a rendered signal, which Node can't make. They were measured with an offline render in
// the browser (renderOffline in render.ts, the audio lab's R key) and are recorded below next to a fingerprint of the
// track data that was rendered. If the track changes, the fingerprint stops matching and the test says to render it again.
// Where a real OfflineAudioContext exists (a browser test runner) the same test renders the track itself instead.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { TRACKS, TRACK_IDS } from '../src/audio/tracks/index.ts';
import { SOUR } from '../src/audio/tracks/sour.ts';
import { STARCOURT } from '../src/audio/tracks/starcourt.ts';
import { compile, findOverlaps, maxVoices } from '../src/audio/tracks/compile.ts';
import { chordPcs, inScale, makeScale } from '../src/audio/tracks/theory.ts';
import { motifInLydian } from '../src/audio/tracks/motif.ts';
import type { NoiseChannel, NoteEv, PitchedChannel, PitchedSlot, Track } from '../src/audio/tracks/types.ts';
import { print } from './audio-helpers.ts';

const S = SOUR;
const C = STARCOURT;
const LYDIAN = makeScale('C', 'lydian');
const pitched = (t: Track, slot: PitchedSlot, layer: string): PitchedChannel => {
  const c = t.channels.find((ch) => ch.slot === slot && ch.layer === layer);
  assert.ok(c && c.slot !== 'noi', `${t.id} has a ${layer} ${slot} channel`);
  return c as PitchedChannel;
};
const drums = (t: Track, layer: string): NoiseChannel => {
  const c = t.channels.find((ch) => ch.slot === 'noi' && ch.layer === layer);
  assert.ok(c, `${t.id} has a ${layer} noise channel`);
  return c as NoiseChannel;
};
/** 'bar:step:midi' for every note, in order. */
const keys = (bars: readonly (readonly NoteEv[])[]): string[] => bars.flatMap((evs, bar) => evs.map((e) => `${bar}:${e.step}:${e.midi}`));
const mean = (xs: readonly number[]): number => xs.reduce((a, b) => a + b, 0) / xs.length;

// ---------------------------------------------------------------- what it is

test('Sour is registered, is its own track and is not Starcourt under another id', () => {
  assert.equal(TRACKS.sour, S);
  assert.ok(TRACK_IDS.includes('sour'));
  assert.deepEqual([S.id, S.title], ['sour', 'Starcourt, sour']);
  assert.notEqual(S, C);
  assert.notEqual(S.id, C.id);
  assert.equal(new Set(Object.values(TRACKS)).size, TRACK_IDS.length, 'every track is its own');
  // A different tempo, and not one note-for-note copy of Starcourt's channels.
  assert.equal(S.bpm, 108);
  assert.notEqual(S.bpm, C.bpm);
  assert.notDeepEqual(S.channels, C.channels);
  // Every pitched instrument is changed: another volume, detune, vibrato, envelope or gate.
  for (const [slot, layer] of [['tri', 'base'], ['p1', 'base'], ['p2', 'base'], ['p3', 'combat']] as const) {
    assert.notDeepEqual(pitched(S, slot, layer).inst, pitched(C, slot, layer).inst, `${layer} ${slot} is a new instrument`);
  }
  assert.notDeepEqual(S.echo, C.echo, 'and the echo is its own');
  // Nothing is shared with Starcourt's own data: the bars are copies, so bending one never bends the other.
  for (const [i, c] of S.channels.entries()) {
    assert.notEqual(c.bars, C.channels[i].bars, `${c.layer} ${c.slot} bars are not Starcourt's array`);
    assert.notEqual(c.bars[4], C.channels[i].bars[4]);
  }
  // No other track has this tempo.
  for (const id of TRACK_IDS) if (id !== 'sour') assert.notEqual(TRACKS[id].bpm, S.bpm, `${id}`);
});

test('its layers are base and combat, in the same voices as Starcourt, with 32 bars each', () => {
  assert.deepEqual([...S.layers], ['base', 'combat']);
  assert.deepEqual([...S.layers], [...C.layers]);
  const slots = (t: Track, layer: string): string[] => t.channels.filter((c) => c.layer === layer).map((c) => c.slot).sort();
  assert.deepEqual(slots(S, 'base'), ['noi', 'p1', 'p2', 'tri']);
  assert.deepEqual(slots(S, 'combat'), ['noi', 'p3']);
  assert.equal(S.channels.length, 6);
  for (const c of S.channels) assert.equal(c.bars.length, 32, `${c.layer} ${c.slot} has 32 bars`);
  assert.equal(new Set(S.channels.map((c) => c.slot)).size, 5, 'three pulse slots, a triangle and a noise slot, no more');
  assert.deepEqual(findOverlaps(S), []);
  assert.ok(maxVoices(S) <= 5 && maxVoices(S, ['base']) <= 5 && maxVoices(S, ['combat']) <= 5);
});

test('it is still C Lydian in the score: the same key, chords and raised fourth, and every note is in the mode', () => {
  assert.deepEqual([S.tonic, S.mode, S.bars], ['C', 'lydian', 32]);
  assert.deepEqual([...S.chromatic], []);
  assert.deepEqual([...S.harmony], [...C.harmony]);
  const stray: string[] = [];
  for (const n of compile(S).notes) if (!n.drum && !inScale(LYDIAN, n.midi)) stray.push(`${n.slot} bar ${n.bar + 1} step ${n.step} midi ${n.midi}`);
  assert.deepEqual(stray, []);
  for (const sym of S.harmony) assert.ok(!chordPcs(sym).includes(5), `${sym} has no F natural`);
  // The lead is Starcourt's, so the motif is G A G E F# C, with F sharp as the raised fourth, and F natural never comes.
  const lead = pitched(S, 'p1', 'base');
  assert.deepEqual(lead.bars.slice(4, 6).flat().map((e) => e.midi), motifInLydian());
  const pcs = new Set(lead.bars.flat().map((e) => e.midi % 12));
  assert.ok(pcs.has(6) && !pcs.has(5), 'F sharp is in the lead, F natural is not');
  // It is slower: a sixth longer in seconds.
  const secs = (t: Track): number => compile(t).loop * compile(t).stepSec;
  assert.ok(Math.abs(secs(S) - 71.11) < 0.05, `${secs(S)} s`);
  assert.ok(Math.abs(secs(S) / secs(C) - 118 / 108) < 1e-9);
});

// ---------------------------------------------------------------- its notes are Starcourt's

test("its notes are Starcourt's: the lead and the harmony are the same notes, and every other voice is bent from Starcourt's bars", () => {
  const lead = pitched(S, 'p1', 'base');
  const cLead = pitched(C, 'p1', 'base');
  assert.deepEqual(keys(lead.bars), keys(cLead.bars), 'the lead plays the same notes on the same steps');
  // Only the last note of a phrase is shorter.
  let shorter = 0;
  lead.bars.forEach((evs, bar) => evs.forEach((e, i) => {
    const was = cLead.bars[bar][i];
    if (e.len !== was.len) { shorter++; assert.ok(e.len < was.len, `bar ${bar + 1} step ${e.step}`); }
    assert.equal(e.vel, was.vel);
  }));
  assert.ok(shorter >= 10, `${shorter} notes let go early`);
  // The bass: the same steps' pitch classes, an octave lower for some, and no new roots.
  const bass = pitched(S, 'tri', 'base');
  bass.bars.forEach((evs, bar) => {
    assert.ok(evs.length > 0);
    for (const e of evs) {
      const was = pitched(C, 'tri', 'base').bars[bar].find((w) => w.step === e.step);
      assert.ok(was && (was.midi === e.midi || was.midi - 12 === e.midi), `bar ${bar + 1} step ${e.step} is Starcourt's note`);
    }
  });
  // The combat chug keeps the notes it keeps, exactly.
  const drive = pitched(S, 'p3', 'combat');
  drive.bars.forEach((evs, bar) => {
    for (const e of evs) {
      const was = pitched(C, 'p3', 'combat').bars[bar].find((w) => w.step === e.step);
      assert.deepEqual(e, was, `bar ${bar + 1} step ${e.step}`);
    }
  });
  // The combat drums are Starcourt's drums, and the shaker is some of Starcourt's shaker.
  assert.deepEqual(drums(S, 'combat').bars, drums(C, 'combat').bars);
  drums(S, 'base').bars.forEach((hits, bar) => {
    for (const h of hits) assert.ok(drums(C, 'base').bars[bar].some((w) => w.step === h.step && w.drum === h.drum), `bar ${bar + 1} step ${h.step}`);
  });
  // The second pulse is the lead wherever the lead plays, and Starcourt's arp, an octave down, where it rests.
  const twin = pitched(S, 'p2', 'base');
  const arp = pitched(C, 'p2', 'base');
  let sparkles = 0;
  twin.bars.forEach((evs, bar) => {
    if (cLead.bars[bar].length > 0) {
      assert.deepEqual(evs, cLead.bars[bar], `bar ${bar + 1} doubles the lead`);
      return;
    }
    sparkles++;
    assert.ok(evs.length > 0, `bar ${bar + 1} is not silent`);
    for (const e of evs) assert.ok(arp.bars[bar].some((w) => w.step === e.step && w.midi - 12 === e.midi), `bar ${bar + 1} step ${e.step} is an arp note`);
  });
  assert.equal(sparkles, 6, 'the intro and the breakdown, where the lead rests');
});

// ---------------------------------------------------------------- what makes it sour

test('it is sour: a second pulse flat of the lead, twenty cents apart, on the same wave, so they beat', () => {
  const lead = pitched(S, 'p1', 'base').inst;
  const twin = pitched(S, 'p2', 'base').inst;
  assert.equal(lead.wave, 'p50');
  assert.equal(twin.wave, lead.wave, 'the same wave, so the beating is clean');
  assert.ok((lead.detune ?? 0) > 0 && (twin.detune ?? 0) < 0, 'one sharp, one flat');
  const apart = (lead.detune ?? 0) - (twin.detune ?? 0);
  assert.ok(apart >= 12 && apart <= 30, `${apart} cents apart: a few, not a different note`);
  assert.ok(Math.abs(twin.detune ?? 0) > Math.abs(lead.detune ?? 0), 'and the pair sits flat');
  // At D5 the pair beats at a few hertz to ten: a wobble you hear, not a tone.
  const beat = 587.33 * (2 ** (apart / 1200) - 1);
  assert.ok(beat >= 3 && beat <= 12, `${beat.toFixed(1)} beats a second at D5`);
  // Both sing into the echo, so the smear is detuned too.
  assert.ok((lead.send ?? 0) > 0 && (twin.send ?? 0) > 0);
  // The chug is flat of everything.
  assert.ok((pitched(S, 'p3', 'combat').inst.detune ?? 0) <= -10);
  assert.equal(pitched(C, 'p1', 'base').inst.detune, undefined, "Starcourt's lead is in tune");
});

test('the vibrato is slow and wide, and the two pulses drift: different rates, depths and starts', () => {
  const lead = pitched(S, 'p1', 'base').inst;
  const twin = pitched(S, 'p2', 'base').inst;
  const was = pitched(C, 'p1', 'base').inst.vib!;
  for (const v of [lead.vib!, twin.vib!]) {
    assert.ok(v.rate < was.rate && v.rate <= 4 && v.rate >= 2, `${v.rate} Hz is slower than Starcourt's ${was.rate}`);
    assert.ok(v.cents > was.cents * 1.8, `${v.cents} cents is wider than Starcourt's ${was.cents}`);
  }
  assert.notEqual(lead.vib!.rate, twin.vib!.rate);
  assert.notEqual(lead.vib!.delay, twin.vib!.delay);
  assert.notEqual(lead.vib!.cents, twin.vib!.cents);
});

test('the lead sags at the end of each phrase: it lets go of the last note, and the flat pulse is left holding it', () => {
  const lead = pitched(S, 'p1', 'base');
  const twin = pitched(S, 'p2', 'base');
  const cLead = pitched(C, 'p1', 'base');
  const ends: number[] = [];
  lead.bars.forEach((evs, bar) => {
    if (!evs.length) return;
    const last = evs.length - 1;
    const was = cLead.bars[bar][last];
    const sags = bar % 2 === 1 && was.len >= 6 && was.step + was.len >= 15;
    assert.equal(evs[last].len < was.len, sags, `bar ${bar + 1}`);
    if (!sags) return;
    ends.push(bar);
    assert.equal(evs[last].len, Math.ceil(was.len / 2), 'it is held half as long');
    assert.equal(twin.bars[bar][last].len, was.len, 'and the pulse under it holds it all the way');
    assert.equal(twin.bars[bar][last].midi, was.midi);
    // The note it lets go of sits in the pulse alone for the second half: flatter than the pair was.
    assert.ok(evs[last].len < twin.bars[bar][last].len);
  });
  assert.ok(ends.length >= 10 && ends.length <= 16, `${ends.length} phrase ends`);
  // The ends of Starcourt's phrases are the second bar of each two-bar phrase, from bar six on: motif answers, the bridge, the outro.
  assert.ok(ends.includes(5) && ends.includes(31) && ends.every((b) => b >= 5 && b % 2 === 1));
  assert.ok((twin.inst.detune ?? 0) < (lead.inst.detune ?? 0), 'the voice left holding the note is the flat one');
  assert.ok(!twin.inst.send || twin.inst.send > 0);
});

test('the bright parts are thinned: one dim arp note a beat, a thinner shaker, a chug on eighths, a darker echo', () => {
  const arp = pitched(C, 'p2', 'base');
  const twin = pitched(S, 'p2', 'base');
  for (const bar of [0, 1, 2, 3, 20, 21]) {
    assert.deepEqual(twin.bars[bar].map((e) => e.step), [0, 4, 8, 12], `bar ${bar + 1}: one note a beat`);
    assert.equal(arp.bars[bar].length, 12, `Starcourt's twinkle has twelve`);
    assert.ok(mean(twin.bars[bar].map((e) => e.midi)) <= mean(arp.bars[bar].map((e) => e.midi)) - 11, `bar ${bar + 1} is an octave lower`);
    const loud = (inst: { vol: number }, evs: readonly NoteEv[]): number => inst.vol * Math.max(...evs.map((e) => e.vel ?? 1));
    assert.ok(loud(twin.inst, twin.bars[bar]) < 0.6 * loud(arp.inst, arp.bars[bar]), `bar ${bar + 1} is dim next to the twinkle`);
    assert.ok(twin.bars[bar].every((e) => e.len === 2));
  }
  // The breakdown no longer jumps up an octave to sparkle.
  assert.ok(mean(twin.bars[20].map((e) => e.midi)) < mean(twin.bars[16].map((e) => e.midi)) + 12);
  // The shaker keeps only the off-beats at steps six and fourteen, softer.
  const hats = drums(S, 'base').bars;
  const cHats = drums(C, 'base').bars;
  for (const [bar, hits] of hats.entries()) {
    assert.deepEqual(hits.map((h) => h.step), [6, 14], `bar ${bar + 1}`);
    assert.ok(hits.every((h) => h.drum === 'hat'));
    assert.ok(hits.every((h) => (h.vel ?? 1) < Math.min(...cHats[bar].filter((c) => c.step === h.step).map((c) => c.vel ?? 1))));
  }
  assert.ok(hats.flat().length <= cHats.flat().length * 0.6, `${hats.flat().length} hats against ${cHats.flat().length}`);
  // The chug drops its octave pops: eight notes a bar, no note an octave over its bar's root.
  const drive = pitched(S, 'p3', 'combat');
  const cDrive = pitched(C, 'p3', 'combat');
  drive.bars.forEach((evs, bar) => {
    assert.deepEqual(evs.map((e) => e.step), [0, 2, 4, 6, 8, 10, 12, 14], `bar ${bar + 1}`);
    assert.ok(evs.every((e) => e.midi - evs[0].midi !== 12));
    assert.equal(cDrive.bars[bar].length, 12);
  });
  // The echo is darker, and dull enough to sit under the lead.
  assert.ok(S.echo && C.echo && S.echo.cutoff <= C.echo.cutoff / 1.5 && S.echo.cutoff <= 2000);
  assert.ok((twin.inst.vol ?? 0) < (pitched(C, 'p1', 'base').inst.vol), 'and the pair is quieter than the old lead');
});

test('the bass leans on the low end: lower than Starcourt, no octave pops, long notes, a holding gate', () => {
  const bass = pitched(S, 'tri', 'base');
  const cBass = pitched(C, 'tri', 'base');
  const all = bass.bars.flat().map((e) => e.midi);
  const cAll = cBass.bars.flat().map((e) => e.midi);
  assert.equal(bass.inst.wave, 'tri');
  assert.ok(Math.min(...all) <= 31 && Math.min(...all) < Math.min(...cAll), `lowest note ${Math.min(...all)}`);
  assert.ok(Math.max(...all) < Math.max(...cAll) - 6, 'and nothing high: the pops are gone');
  assert.ok(mean(all) < mean(cAll) - 5, 'on average well under Starcourt');
  assert.ok(Math.min(...all) >= 24 && Math.max(...all) <= 60, 'in range');
  for (const [bar, evs] of bass.bars.entries()) {
    assert.ok(evs.every((e) => e.len >= 2), `bar ${bar + 1} has no one-sixteenth pops`);
    assert.ok(evs.length <= 6 && cBass.bars[bar].length === 8, `bar ${bar + 1} has ${evs.length} notes against eight`);
    assert.ok(evs.some((e) => e.len === 4), 'and a held beat');
  }
  assert.ok(bass.inst.gate > cBass.inst.gate, 'it holds each note longer');
  // The bass is the one voice that is not detuned: the low end stays firm.
  assert.equal(bass.inst.detune, undefined);
});

// ---------------------------------------------------------------- levels

/**
 * What the offline renders said: two laps of the loop (142.3 s), so the echo tail across the seam is counted, through the
 * same limiter the game uses. peak is the largest sample after the limiter, limiterDb the largest gain reduction in 20 ms
 * windows (0.0001 is the compressor's own rounding), rmsDb the loudness, clipped the samples at full scale. The other
 * tracks, rendered the same way: base peaks 0.47 to 0.71 at -16.2 to -18.4 dB, combat peaks 0.63 to 0.79 at -16.7 to
 * -18.3 dB, and Starcourt's own are 0.48 at -16.8 dB and 0.75 at -18.7 dB.
 */
const MEASURED = {
  print: 'ab1200c0',
  base: { peak: 0.4486, limiterDb: 0, rmsDb: -16.47, clipped: 0 },
  combat: { peak: 0.7486, limiterDb: 0, rmsDb: -18.97, clipped: 0 },
};

test('base and combat render without clipping: peak under 0.9, limiter under 3 dB, and as loud as the other tracks', async () => {
  const Offline = (globalThis as { OfflineAudioContext?: unknown }).OfflineAudioContext;
  if (Offline) {
    const { renderOffline } = await import('../src/audio/render.ts');
    for (const combat of [false, true]) {
      const m = await renderOffline('sour', 142.3, { combat });
      assert.ok(m.peak < 0.9, `${combat ? 'combat' : 'base'} peak ${m.peak}`);
      assert.ok(m.limiterDb < 3, `${combat ? 'combat' : 'base'} limiter ${m.limiterDb}`);
      assert.equal(m.clipped, 0);
    }
    return;
  }
  assert.equal(print(S), MEASURED.print, 'Sour changed since it was rendered: render it again (audio lab, R) and update MEASURED');
  for (const [name, m] of [['base', MEASURED.base], ['combat', MEASURED.combat]] as const) {
    assert.ok(m.peak > 0.2 && m.peak < 0.9, `${name} peak ${m.peak}`);
    assert.ok(m.limiterDb >= 0 && m.limiterDb < 3, `${name} limiter ${m.limiterDb}`);
    assert.equal(m.clipped, 0, `${name} clips`);
    assert.ok(m.rmsDb > -20 && m.rmsDb < -14, `${name} rms ${m.rmsDb}`);
  }
  assert.ok(MEASURED.combat.peak > MEASURED.base.peak, 'the combat mix is the louder one at the peak');
  assert.ok(Math.abs(MEASURED.base.rmsDb - -16.78) <= 1 && Math.abs(MEASURED.combat.rmsDb - -18.65) <= 1, "within a dB of Starcourt's loudness");
});
