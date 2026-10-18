// Hellfire, the `solo` track: Eddie's riff and the 4.3 rooftop song, two sections of one E minor track at 150 bpm. The checks
// every track meets (key, loop closure, polyphony, overlaps) run over TRACK_IDS in tracks.test.ts; this file checks what makes
// Hellfire Hellfire: that it is registered and its own, that its two sections are the lengths the highway needs, that the lead
// the charts are read from is where the design says, that the riff is the song's first two bars, how it is arranged, and that
// it and the feedback squeal render within the level the other tracks keep to.
// Peak, limiter and clipping need a rendered signal, which Node can't make. They were measured with an offline render in the
// browser (renderOffline in render.ts, the audio lab's R key; renderWith for the squeal) and are recorded below next to a
// fingerprint of the data that was rendered. If the track changes, the fingerprint stops matching and the test says to render
// it again. Where a real OfflineAudioContext exists (a browser test runner) the same test renders the track itself instead.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { TRACKS, TRACK_IDS } from '../src/audio/tracks/index.ts';
import { SOLO, SOLO_SECTIONS } from '../src/audio/tracks/solo.ts';
import { barLengths, barSeconds, compile, findOverlaps, maxVoices } from '../src/audio/tracks/compile.ts';
import { chord, chordPcs, inScale, makeScale, pitchClass } from '../src/audio/tracks/theory.ts';
import { MOTIF_PITCHES } from '../src/audio/tracks/motif.ts';
import { SFX, playSfx } from '../src/audio/sfx.ts';
import { LEVELS_SOLO, SFX_SOLO } from '../src/audio/sfx_solo.ts';
import type { Ns, Part, Tn } from '../src/audio/sfx_kit.ts';
import { LIMITER } from '../src/audio/engine.ts';
import type { NoteEv, PitchedChannel, PitchedSlot, NoiseChannel } from '../src/audio/tracks/types.ts';
import { peakOf, play, print } from './audio-helpers.ts';

const pitched = (slot: PitchedSlot): PitchedChannel => {
  const c = SOLO.channels.find((ch) => ch.slot === slot);
  assert.ok(c && c.slot !== 'noi', `a ${slot} channel`);
  return c as PitchedChannel;
};
const drums = (): NoiseChannel => SOLO.channels.find((ch) => ch.slot === 'noi') as NoiseChannel;
const lead = (): PitchedChannel => pitched('p1');
const E_MINOR = makeScale('E', 'minor');

// ---------------------------------------------------------------- what it is

test('Hellfire is registered, is its own track, and sits at 150 bpm in E minor', () => {
  assert.equal(TRACKS.solo, SOLO);
  assert.ok(TRACK_IDS.includes('solo'));
  assert.deepEqual([SOLO.id, SOLO.title, SOLO.bpm, SOLO.tonic, SOLO.mode, SOLO.bars], ['solo', 'Hellfire', 150, 'E', 'minor', 44]);
  assert.equal(new Set(Object.values(TRACKS)).size, TRACK_IDS.length, 'every track is its own');
  assert.notEqual(SOLO.bpm, 84, 'not the show theme');
  assert.deepEqual([...SOLO.layers], ['base']);
  assert.ok(SOLO.echo, 'the lead has a dotted-eighth echo');
});

test('it keeps to five voices in the NES slots, and no voice runs into its next note', () => {
  assert.deepEqual(SOLO.channels.map((c) => c.slot).sort(), ['noi', 'p1', 'p2', 'p3', 'tri']);
  for (const c of SOLO.channels) assert.equal(c.bars.length, 44, `${c.slot} has 44 bars`);
  assert.deepEqual(findOverlaps(SOLO), []);
  assert.ok(maxVoices(SOLO) <= 5);
  assert.deepEqual(pitched('p1').inst.wave, 'p50');
  assert.equal(pitched('p2').inst.wave, 'p25');
  assert.equal(pitched('p3').inst.wave, 'p12');
  assert.equal(pitched('tri').inst.wave, 'tri');
});

test('it is E minor, with F natural, the flat two, as its one listed exception, in the lead, in one bar', () => {
  const stray: string[] = [];
  for (const n of compile(SOLO).notes) if (!n.drum && !inScale(E_MINOR, n.midi) && !SOLO.chromatic.includes(n.midi % 12)) stray.push(`${n.slot} bar ${n.bar + 1} step ${n.step} midi ${n.midi}`);
  assert.deepEqual(stray, []);
  assert.deepEqual([...SOLO.chromatic], [5]);
  const naturals = compile(SOLO).notes.filter((n) => !n.drum && n.midi % 12 === 5);
  assert.ok(naturals.length > 0 && naturals.every((n) => n.slot === 'p1' && n.bar === 12), 'F natural is the verse grind and nothing else');
  // Every chord is built from E minor tones, and the song ends on D, the flat seven, which falls back onto Em.
  for (const sym of SOLO.harmony) for (const pc of chordPcs(sym)) assert.ok(inScale(E_MINOR, 60 + pc), `${sym} is in the key`);
  const last = chord(SOLO.harmony[43]);
  assert.equal(last.symbol, 'D');
  assert.equal((last.root - pitchClass('E') + 12) % 12, 10);
  assert.deepEqual(SOLO.harmony.slice(0, 4), ['Em', 'Em', 'C', 'D']);
});

// ---------------------------------------------------------------- the two sections

test('the riff is exactly 6 s and the rooftop 64 s: a 12 step bar closes the riff, a sixteenth is 0.1 s, six frames', () => {
  const steps = barLengths(SOLO);
  assert.equal(steps.length, 44);
  assert.deepEqual([...steps.slice(0, 4)], [16, 16, 16, 12]);
  assert.ok(steps.slice(4).every((n) => n === 16));
  const c = compile(SOLO);
  assert.ok(Math.abs(c.stepSec - 0.1) < 1e-12);
  const secs = (bar: number, n: number): number => Array.from({ length: n }, (_, i) => barSeconds(SOLO, bar + i)).reduce((a, b) => a + b, 0);
  const { riff, rooftop } = SOLO_SECTIONS;
  assert.deepEqual([riff.bar, riff.bars, rooftop.bar, rooftop.bars], [0, 4, 4, 40]);
  assert.ok(Math.abs(secs(riff.bar, riff.bars) - 6) < 1e-9);
  assert.ok(Math.abs(secs(rooftop.bar, rooftop.bars) - 64) < 1e-9);
  assert.ok(Math.abs(c.loop * c.stepSec - 70) < 1e-9);
});

test('the lead is one voice a note at a time, in a singing range, and every note is on the sixteenth grid', () => {
  const all = lead().bars.flatMap((evs, bar) => evs.map((e) => ({ ...e, bar })));
  for (const e of all) {
    assert.ok(Number.isInteger(e.step) && Number.isInteger(e.len) && e.len >= 1, `bar ${e.bar + 1} step ${e.step}`);
    assert.ok(e.midi >= 62 && e.midi <= 91, `bar ${e.bar + 1} note ${e.midi}`);
    assert.ok(e.step + e.len <= barLengths(SOLO)[e.bar] + 8, 'a note may ring over a bar line, not far');
  }
  // A one-sixteenth note is a flourish. Every bar of the song has at least one note that is not.
  assert.ok(lead().bars.every((evs) => evs.some((e) => e.len >= 2)), 'every bar has a note to chart');
  assert.ok(all.filter((e) => e.len === 1).length >= 10, 'and there are flourishes between them');
});

test('the riff is the song: the verse opens with the riff, note for note, and the last bar of each ends the same way', () => {
  const bars = lead().bars;
  assert.deepEqual(bars.slice(8, 11), bars.slice(0, 3), 'bars 9 to 11 are bars 1 to 3');
  assert.notDeepEqual(bars[3], bars[11], 'but the closing bar of the riff is its own');
  // The chug under both is the same gallop on the low E.
  const chug = pitched('p2').bars;
  assert.deepEqual(chug.slice(8, 11), chug.slice(0, 3));
  const gallop = chug[0].map((e) => e.step);
  assert.deepEqual(gallop, [0, 2, 3, 4, 6, 7, 8, 10, 11, 12, 14, 15]);
  assert.equal(chug[0][0].midi, 40, 'the low E');
});

test('the riff closes on a held hit: the last bar is eight eighth notes and one long chord, and the drums crash on it', () => {
  const lastBar = (slot: PitchedSlot): NoteEv[] => pitched(slot).bars[3];
  const chug = lastBar('p2');
  assert.deepEqual(chug.map((e) => [e.step, e.len]), [[0, 2], [2, 2], [4, 2], [6, 2], [8, 4]]);
  assert.deepEqual(lastBar('p3').map((e) => e.step), [0, 2, 4, 6, 8], 'the fifth sounds with it');
  assert.equal(lead().bars[3].at(-1)!.len, 8, 'the lead holds to the bar line');
  assert.ok(drums().bars[3].some((d) => d.step === 8 && d.drum === 'ohat'));
  assert.ok(drums().bars[3].every((d) => d.step < 12));
  // Nothing in any voice starts after the bar's twelfth step.
  for (const c of SOLO.channels) for (const e of c.bars[3] as { step: number }[]) assert.ok(e.step < 12, `${c.slot} step ${e.step}`);
});

// ---------------------------------------------------------------- how it is arranged

test('the song builds: a quiet intro with no fifth, a gallop verse, a climb, an open chorus, and sixteenths to finish', () => {
  const p2 = pitched('p2').bars, p3 = pitched('p3').bars;
  for (let b = 4; b < 8; b++) assert.equal(p3[b].length, 0, `bar ${b + 1}: the intro has no fifth`);
  for (let b = 8; b < 16; b++) assert.equal(p2[b].length, 12, `bar ${b + 1}: the verse gallops`);
  for (let b = 40; b < 43; b++) assert.equal(p2[b].length, 16, `bar ${b + 1}: sixteenths`);
  for (const b of [20, 21, 22, 24, 25]) assert.ok(p2[b].length <= 3, `bar ${b + 1}: open chords`);
  // Each fifth voice is a fifth over the guitar, a power chord.
  for (let b = 8; b < 40; b++) {
    p2[b].forEach((e, i) => assert.equal(p3[b][i].midi - e.midi, 7, `bar ${b + 1} note ${i}`));
  }
  // The lead is sparse at first and busy at the end.
  const gems = (from: number, to: number): number => lead().bars.slice(from, to).flat().filter((e) => e.len >= 2).length;
  assert.ok(gems(4, 8) <= 8 && gems(36, 40) >= 18, `${gems(4, 8)} notes in the intro and ${gems(36, 40)} in the final chorus`);
});

test('the drums are a backbeat: snare on two and four, and the kick never sits on the step after a kick or a snare', () => {
  const snares = (bar: number): number[] => drums().bars[bar].filter((d) => d.drum === 'snare').map((d) => d.step);
  for (const b of [0, 1, 2, 8, 9, 10, 20, 21, 22, 36, 37]) {
    assert.ok(snares(b).includes(4) && snares(b).includes(12), `bar ${b + 1} has its backbeat`);
  }
  // The compiler's overlap check covers the rest; this is the reason: a kick and a snare ring 1.5 steps.
  assert.deepEqual(findOverlaps(SOLO), []);
  const kinds = new Set(drums().bars.flat().map((d) => d.drum));
  for (const d of ['kick', 'snare', 'hat', 'ohat']) assert.ok(kinds.has(d as never), d);
});

test('it is original: no run of eight lead notes shares its intervals with another track, and it is not the show motif', () => {
  const grams = (evs: readonly NoteEv[][]): Set<string> => {
    const m = evs.flat().map((e) => e.midi);
    const out = new Set<string>();
    for (let i = 0; i + 8 <= m.length; i++) out.add(m.slice(i + 1, i + 8).map((x, j) => x - m[i + j]).join(','));
    return out;
  };
  const mine = grams(lead().bars);
  assert.ok(mine.size > 30);
  for (const id of TRACK_IDS) {
    if (id === 'solo') continue;
    for (const c of TRACKS[id].channels) {
      if (c.slot === 'noi') continue;
      for (const g of grams(c.bars)) assert.ok(!mine.has(g), `${id} ${c.slot} shares ${g}`);
    }
  }
  const motif = MOTIF_PITCHES.slice(1).map((x, i) => x - MOTIF_PITCHES[i]).join(',');
  assert.ok(![...mine].some((g) => g.includes(motif.split(',').slice(0, 4).join(','))), 'not the show motif in any key');
});

// ---------------------------------------------------------------- levels

/**
 * What the offline render said: two laps of the loop (140.3 s), so the echo tail across the seam is counted, through the same
 * limiter the game uses. peak is the largest sample after the limiter, limiterDb the largest gain reduction in 20 ms windows
 * (0.0001 is the compressor's own rounding), rmsDb the loudness, clipped the samples at full scale. The other tracks, rendered
 * the same way: base peaks 0.47 to 0.71 at -16.2 to -18.4 dB, combat peaks 0.63 to 0.79. Hellfire has no combat layer: its
 * one mix is the whole song.
 */
const MEASURED = { print: '20cf1035', peak: 0.7434, limiterDb: 0.0001, rmsDb: -16.59, clipped: 0 };

test('it renders without clipping: peak under 0.9, limiter under 3 dB, and as loud as the other tracks', async () => {
  const Offline = (globalThis as { OfflineAudioContext?: unknown }).OfflineAudioContext;
  if (Offline) {
    const { renderOffline } = await import('../src/audio/render.ts');
    const m = await renderOffline('solo', 140.3, {});
    assert.ok(m.peak < 0.9 && m.limiterDb < 3 && m.clipped === 0, `peak ${m.peak} limiter ${m.limiterDb}`);
    return;
  }
  assert.equal(print(SOLO), MEASURED.print, 'Hellfire changed since it was rendered: render it again (audio lab, R) and update MEASURED');
  assert.ok(MEASURED.peak > 0.3 && MEASURED.peak < 0.9, `peak ${MEASURED.peak}`);
  assert.ok(MEASURED.limiterDb >= 0 && MEASURED.limiterDb < 3, `limiter ${MEASURED.limiterDb}`);
  assert.equal(MEASURED.clipped, 0);
  assert.ok(MEASURED.rmsDb > -20 && MEASURED.rmsDb < -14, `rms ${MEASURED.rmsDb}`);
});

// ---------------------------------------------------------------- the feedback squeal

const MEASURED_SQUEAL = { print: 'dae2c1ee', unit: 0.9701, peak: 0.4462 };
const tones = (): Tn[] => SFX_SOLO.squeal.parts.filter((p): p is Tn => p.k === 't');
const noises = (): Ns[] => SFX_SOLO.squeal.parts.filter((p): p is Ns => p.k === 'n');

test('the squeal is registered and is its own sound: no recipe or part is shared with another effect', () => {
  assert.equal(SFX.squeal, SFX_SOLO.squeal);
  for (const other of Object.keys(SFX) as (keyof typeof SFX)[]) {
    if (other === 'squeal') continue;
    assert.notEqual(SFX.squeal, SFX[other], `shares a recipe with ${other}`);
    assert.notDeepEqual(SFX.squeal.parts, SFX[other].parts, `is a copy of ${other}`);
  }
  const all = Object.values(SFX).flatMap((r) => r.parts);
  assert.equal(new Set(all).size, all.length, 'no part object is shared between two recipes');
});

test('the squeal is a long, high, held howl: over a second, a tone climbing to E6, nothing else held that high', () => {
  const r = SFX_SOLO.squeal;
  const length = Math.max(...r.parts.map((p: Part) => p.at + p.d));
  assert.ok(length >= 1.1 && length <= 1.5, `${length.toFixed(2)} s`);
  const howl = tones().find((t) => t.hold && t.d >= 1 && t.w === 'p50')!;
  assert.ok(howl && howl.f < 600 && (howl.f2 ?? 0) > 1200, 'it climbs from B4 to E6');
  assert.ok(howl.vib && howl.vib.cents >= 40, 'and wobbles');
  assert.ok(tones().some((t) => t.f < 100), 'with a thump from the amp under it');
  assert.ok(noises().length >= 5, 'a hiss and the crackles');
  // In range at the jitter, and at a semitone either way, like every effect.
  assert.ok(r.j >= 0 && r.j <= 0.08);
  for (const t of tones()) for (const f of [t.f, t.f2 ?? t.f]) assert.ok(f * (1 - r.j - 0.06) >= 20 && f * (1 + r.j + 0.06) <= 8000, `tone ${f}`);
  for (const p of r.parts) assert.ok(p.d > 0 && p.at >= 0 && p.v > 0 && p.v <= 1);
  // Every other effect is shorter, or lower, or not held: none holds a pitched note above 1 kHz for a second.
  for (const [id, other] of Object.entries(SFX)) {
    if (id === 'squeal') continue;
    const held = other.parts.filter((p): p is Tn => p.k === 't' && p.hold && p.d >= 1 && Math.max(p.f, p.f2 ?? 0) > 1000);
    assert.equal(held.length, 0, `${id} holds a high note for a second`);
  }
});

test('the squeal is measured: its level makes a peak near 0.45, a little under the impacts, and the stub plays it at that level', () => {
  assert.equal(print(SFX.squeal), MEASURED_SQUEAL.print, 'the squeal changed since it was measured: render it again (audio lab, E) and update MEASURED_SQUEAL');
  const peak = MEASURED_SQUEAL.unit * LEVELS_SOLO.squeal;
  assert.ok(Math.abs(peak - MEASURED_SQUEAL.peak) < 0.005, `${peak} against ${MEASURED_SQUEAL.peak}`);
  assert.ok(MEASURED_SQUEAL.peak >= 0.4 && MEASURED_SQUEAL.peak <= 0.5);
  assert.ok(MEASURED_SQUEAL.peak < 0.9 && MEASURED_SQUEAL.peak < 10 ** (LIMITER.threshold / 20) + 0.3);
  // The real playSfx on a stub context: the loudest single voice is the howl, well under the limiter.
  const played = play((ctx, dest) => playSfx(ctx, dest, 'squeal', 0, 1));
  assert.ok(played.voices.length >= tones().length + noises().length);
  const loudest = Math.max(...played.voices.map(peakOf));
  assert.ok(loudest > 0.1 && loudest < 0.5, `loudest voice ${loudest}`);
});
