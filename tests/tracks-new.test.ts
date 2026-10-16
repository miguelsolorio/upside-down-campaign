// Upside Down, Clock and Hawkins, the eight Level 3 and 4 effects and Will's stinger. The checks every track
// meets (key, loop closure, polyphony, overlaps) live in tracks.test.ts and run over TRACK_IDS, which now
// holds all six tracks. This file checks what makes each of the new ones what it is.
// Peak, limiter and clipping need a rendered signal. They are measured in the browser by the audio lab
// (`?audio=1`, key R for tracks and E for effects), not here.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { TRACKS, TRACK_IDS } from '../src/audio/tracks/index.ts';
import { compile, findOverlaps, maxVoices, noteTiming } from '../src/audio/tracks/compile.ts';
import { chord, invert, inScale, makeScale, note } from '../src/audio/tracks/theory.ts';
import {
  CLOCK_AXIS, D_MINOR, D_PHRYGIAN, F_MAJOR, G_MINOR, MOTIF, MOTIF_AXIS, MOTIF_PITCHES, motifInMajor, motifUpsideDown,
} from '../src/audio/tracks/motif.ts';
import { STINGERS } from '../src/audio/tracks/jingles.ts';
import { DRUM_SECONDS } from '../src/audio/tracks/theory.ts';
import { DRUM_DEFS } from '../src/audio/synth.ts';
import { SFX } from '../src/audio/sfx.ts';
import { LEVELS34 } from '../src/audio/sfx_levels34.ts';
import type { Ns, Part, Tn } from '../src/audio/sfx_kit.ts';
import type { NoiseChannel, PitchedChannel, Track } from '../src/audio/tracks/types.ts';

const NEW = ['upside', 'clock', 'hawkins'] as const;

function pitched(t: Track, slot: string, layer: string): PitchedChannel {
  const c = t.channels.find((ch) => ch.slot === slot && ch.layer === layer);
  assert.ok(c && c.slot !== 'noi', `${t.id} has a ${layer} ${slot} channel`);
  return c as PitchedChannel;
}
function drums(t: Track, layer: string): NoiseChannel {
  const c = t.channels.find((ch) => ch.slot === 'noi' && ch.layer === layer);
  assert.ok(c, `${t.id} has a ${layer} noise channel`);
  return c as NoiseChannel;
}
const midis = (bars: readonly { midi: number }[][]): number[] => bars.flat().map((e) => e.midi);

// ---------------------------------------------------------------- the registry

test('the new tracks are real: registered, distinct, and no longer borrowed', () => {
  assert.deepEqual([...TRACK_IDS].sort(), ['clock', 'hawkins', 'lab', 'mirkwood', 'sour', 'starcourt', 'static', 'upside']);
  assert.deepEqual(Object.keys(TRACKS).sort(), [...TRACK_IDS].sort());
  assert.equal(new Set(Object.values(TRACKS)).size, 8, 'eight different tracks');
  for (const id of NEW) {
    const t = TRACKS[id];
    assert.equal(t.id, id);
    assert.deepEqual([...t.layers], ['base', 'combat']);
    assert.equal(t.bars, 32);
    assert.notEqual(t.bpm, 84);
  }
  assert.deepEqual(new Set(NEW.map((id) => TRACKS[id].bpm)).size, 3, 'three tempos');
});

test('upside, clock and hawkins are in the keys and tempos the design asks for', () => {
  const rows: [keyof typeof TRACKS, number, string, string][] = [
    ['upside', 66, 'D', 'phrygian'], ['clock', 150, 'G', 'minor'], ['hawkins', 112, 'F', 'major'],
  ];
  for (const [id, bpm, tonic, mode] of rows) {
    const t = TRACKS[id];
    assert.deepEqual([t.bpm, t.tonic, t.mode], [bpm, tonic, mode], id);
  }
});

test('no new track borrows the show theme: no Cmaj7 arpeggio, nothing near 84 bpm', () => {
  for (const id of NEW) {
    const t = TRACKS[id];
    assert.ok(Math.abs(t.bpm - 84) > 8, `${id} tempo ${t.bpm}`);
    // The theme is a Cmaj7 broken chord (C E G B) in even steps. Look for any voice that plays exactly that in a bar.
    for (const n of compile(t).byBar) {
      const bySlot = new Map<string, number[]>();
      for (const x of n) if (x.inst) bySlot.set(`${x.layer}${x.slot}`, [...(bySlot.get(`${x.layer}${x.slot}`) ?? []), x.midi % 12]);
      for (const pcs of bySlot.values()) assert.notDeepEqual(pcs.slice(0, 4), [0, 4, 7, 11], `${id} plays C E G B`);
    }
  }
});

// ---------------------------------------------------------------- the Upside Down

test('Upside Down: the lead is the title tune upside down, snapped to D Phrygian', () => {
  const up = TRACKS.upside;
  const lead = pitched(up, 'p1', 'base');
  const title = pitched(TRACKS.static, 'p1', 'base');
  // Static's motif, answer, motif and cadence (its bars 9 to 16) come back as bars 5 to 12, note for note.
  for (let i = 0; i < 8; i++) {
    const was = title.bars[8 + i];
    const now = lead.bars[4 + i];
    assert.equal(now.length, was.length, `bar ${5 + i} has the same notes`);
    was.forEach((e, k) => {
      assert.equal(now[k].step, e.step);
      assert.equal(now[k].len, e.len);
      assert.equal(now[k].midi, invert([e.midi], MOTIF_AXIS, D_PHRYGIAN)[0], `bar ${5 + i} note ${k}`);
    });
  }
  assert.deepEqual(midis(lead.bars.slice(4, 6)), motifUpsideDown());
  assert.deepEqual(motifUpsideDown(), invert(MOTIF_PITCHES, MOTIF_AXIS, D_PHRYGIAN));
  // Above the axis goes below it.
  midis(lead.bars.slice(4, 6)).forEach((n, i) => assert.ok(MOTIF_PITCHES[i] > MOTIF_AXIS ? n < MOTIF_AXIS : n <= MOTIF_AXIS));
  for (let b = 0; b < 4; b++) assert.equal(lead.bars[b].length, 0, `bar ${b + 1} is the drone alone`);
});

test('Upside Down: two pulse voices a few cents apart play one line', () => {
  const up = TRACKS.upside;
  const flat = pitched(up, 'p1', 'base');
  const sharp = pitched(up, 'p2', 'base');
  for (const c of [flat, sharp]) assert.notEqual(c.inst.wave, 'tri');
  assert.equal(flat.inst.wave, sharp.inst.wave);
  const [a, b] = [flat.inst.detune ?? 0, sharp.inst.detune ?? 0];
  assert.ok(a < 0 && b > 0, `detunes ${a} and ${b}`);
  assert.ok(b - a >= 10 && b - a <= 40, `${b - a} cents apart`);
  // The same line in both, except for the ghost in the fourth block: sharp plays the motif an octave up, flat rests.
  for (let bar = 0; bar < 32; bar++) {
    if (bar === 12 || bar === 13) continue;
    assert.deepEqual(sharp.bars[bar], flat.bars[bar], `bar ${bar + 1}`);
  }
  assert.equal(flat.bars[12].length + flat.bars[13].length, 0);
  assert.deepEqual(midis(sharp.bars.slice(12, 14)), motifUpsideDown().map((n) => n + 12));
  // Real detune is a number of cents on the oscillator. The drone and the pump are not detuned.
  assert.equal(pitched(up, 'tri', 'base').inst.detune, undefined);
});

test('Upside Down: a gust of noise wind every bar, and the combat stomp waits for it to die', () => {
  const up = TRACKS.upside;
  const c = compile(up);
  const wind = drums(up, 'base').bars;
  wind.forEach((bar, i) => {
    assert.equal(bar.length, 1, `bar ${i + 1} has one gust`);
    assert.equal(bar[0].drum, 'wind');
    assert.equal(bar[0].step, 0);
  });
  assert.ok(DRUM_DEFS.wind.mode === 15 && DRUM_DEFS.wind.rise !== undefined, 'wind is white noise that swells in');
  const gustSteps = DRUM_SECONDS.wind / c.stepSec;
  assert.ok(gustSteps > 6 && gustSteps < 8, `a gust lasts ${gustSteps.toFixed(2)} steps`);
  for (const [i, bar] of drums(up, 'combat').bars.entries()) {
    for (const h of bar) assert.ok(h.step >= 8, `bar ${i + 1} hit at step ${h.step} lands inside the gust`);
  }
  const kinds = new Set(compile(up).notes.filter((n) => n.layer === 'combat' && n.drum).map((n) => n.drum));
  for (const d of ['kick', 'snare', 'hat']) assert.ok(kinds.has(d as 'kick'), d);
  // The combat bass is a sixteenth-note pump on its own slot: sixteen notes in every bar.
  for (const [i, bar] of pitched(up, 'p3', 'combat').bars.entries()) assert.equal(bar.length, 16, `bar ${i + 1} pump`);
  assert.ok(up.harmony.includes('Eb'), 'the flat second is in the harmony');
});

// ---------------------------------------------------------------- the Clock

test('Clock: a low bell on the first beat of every fourth bar, and only there', () => {
  const t = TRACKS.clock;
  const bell = pitched(t, 'p3', 'base');
  const hits = compile(t).notes.filter((n) => n.layer === 'base' && n.slot === 'p3');
  assert.equal(hits.length, 8, 'eight bells in 32 bars');
  for (const n of hits) {
    assert.equal(n.step, 0);
    assert.equal(n.bar % 4, 0, `bar ${n.bar + 1}`);
    assert.ok(n.midi < note('G3'), `midi ${n.midi} is low`);
  }
  assert.ok(bell.inst.env.exp === true && bell.inst.env.s === 0 && bell.inst.env.d >= 0.8, 'a strike and a long fade');
  assert.ok((bell.inst.send ?? 0) >= 0.5, 'it rings into the echo');
  // Each bell is the root of its bar's chord.
  for (const n of hits) assert.equal(n.midi % 12, chord(t.harmony[n.bar]).root, `bar ${n.bar + 1}`);
  // The bell bar thins out around it: no bass on the strike, and the combat pump waits until it has rung.
  const bass = pitched(t, 'tri', 'base');
  const pump = pitched(t, 'p3', 'combat');
  for (let bar = 0; bar < 32; bar += 4) {
    assert.ok(!bass.bars[bar].some((e) => e.step === 0), `bar ${bar + 1} bass rests`);
    assert.ok(pump.bars[bar].every((e) => e.step >= 12), `bar ${bar + 1} pump waits`);
    assert.ok(pump.bars[bar].length > 0, `bar ${bar + 1} pump comes back`);
  }
  // The kick lands with it.
  const kicks = drums(t, 'combat').bars;
  for (let bar = 0; bar < 32; bar += 4) assert.ok(kicks[bar].some((h) => h.drum === 'kick' && h.step === 0));
});

test('Clock: sixteenth notes in every bar, without a break', () => {
  const t = TRACKS.clock;
  const run = pitched(t, 'p2', 'base');
  run.bars.forEach((bar, i) => {
    assert.deepEqual(bar.map((e) => e.step), Array.from({ length: 16 }, (_, s) => s), `bar ${i + 1}`);
    for (const e of bar) assert.equal(e.len, 1);
  });
  assert.equal(run.inst.wave, 'p12');
  // The first beat of a bar is the strongest sixteenth.
  for (const bar of run.bars) assert.equal(Math.max(...bar.map((e) => e.vel ?? 1)), bar[0].vel ?? 1);
  // Four hits of the clock noise a bar, on the off-beat eighths.
  for (const bar of drums(t, 'base').bars) assert.deepEqual(bar.map((h) => h.step), [2, 6, 10, 14]);
});

test('Clock: the motif flipped around G, in G minor', () => {
  const t = TRACKS.clock;
  const lead = pitched(t, 'p1', 'base');
  const flipped = invert(MOTIF_PITCHES, CLOCK_AXIS, G_MINOR);
  assert.deepEqual(flipped.map((n) => n % 12), [5, 3, 5, 9, 7, 0], 'F Eb F A G C');
  assert.equal(CLOCK_AXIS, note('G5'));
  // First lead block is bars 9 to 12: the bell's ghost, then the motif over two bars, then the answer.
  assert.deepEqual(midis(lead.bars.slice(9, 11)), flipped);
  MOTIF_PITCHES.forEach((n, i) => {
    if (n > CLOCK_AXIS) assert.ok(flipped[i] < CLOCK_AXIS);
    else if (n < CLOCK_AXIS) assert.ok(flipped[i] > CLOCK_AXIS);
    else assert.equal(flipped[i], CLOCK_AXIS);
  });
  flipped.forEach((n) => assert.ok(inScale(G_MINOR, n)));
  // Four lead blocks in eight, and the ghost of the bell in every block.
  const blocks = [0, 1, 2, 3, 4, 5, 6, 7].map((b) => lead.bars.slice(b * 4 + 1, b * 4 + 4).flat().length);
  assert.deepEqual(blocks.map((n) => n > 0), [false, false, true, false, true, false, true, true]);
  for (let bar = 0; bar < 32; bar += 4) assert.equal(lead.bars[bar].length, 1, `bar ${bar + 1} ghost`);
});

test('Clock: F sharp, the leading tone, sounds only over the D major bar that closes the loop', () => {
  const t = TRACKS.clock;
  assert.deepEqual([...t.chromatic], [6]);
  const where = new Set(compile(t).notes.filter((n) => !n.drum && n.midi % 12 === 6).map((n) => n.bar));
  assert.deepEqual([...where], [31]);
  assert.equal(t.harmony[31], 'D');
  assert.ok(inScale(makeScale('G', 'minor'), note('F4')));
});

test('Clock: the combat layer is a pump and a kit; the base layer is the sixteenths, bass, bell, motif and clock', () => {
  const t = TRACKS.clock;
  const slots = (layer: string): string[] => t.channels.filter((c) => c.layer === layer).map((c) => c.slot).sort();
  assert.deepEqual(slots('base'), ['noi', 'p1', 'p2', 'p3', 'tri']);
  assert.deepEqual(slots('combat'), ['noi', 'p3']);
  const c = compile(t);
  for (const d of ['kick', 'snare', 'hat']) assert.ok(c.notes.some((n) => n.layer === 'combat' && n.drum === d), d);
  // A step is 0.1 s: kick and snare ring longer, so there is no hit on the step after one.
  const hits = c.notes.filter((n) => n.slot === 'noi').sort((a, b) => a.abs - b.abs);
  hits.forEach((h, i) => {
    const next = hits[i + 1] ?? hits[0];
    const dist = ((next.abs - h.abs + c.loop) % c.loop) * c.stepSec;
    assert.ok(dist >= DRUM_SECONDS[h.drum!] - 1e-9, `${h.drum} at bar ${h.bar + 1} step ${h.step}`);
  });
});

// ---------------------------------------------------------------- Hawkins

test('Hawkins: the motif in major, the same degrees in F', () => {
  const t = TRACKS.hawkins;
  const major = motifInMajor();
  assert.deepEqual(major, [note('C5'), note('D5'), note('C5'), note('A4'), note('Bb4'), note('F4')]);
  const lead = pitched(t, 'p1', 'base');
  assert.deepEqual(midis(lead.bars.slice(4, 6)), major, 'the lead states it at bar five');
  // Degrees 5 b6 5 b3 4 1 of D minor become 5 6 5 3 4 1 of F major.
  const above = (n: number, tonic: number): number => (((n - tonic) % 12) + 12) % 12;
  assert.deepEqual(MOTIF_PITCHES.map((n) => above(n, MOTIF_AXIS)), [7, 8, 7, 3, 5, 0]);
  assert.deepEqual(major.map((n) => above(n, note('F4'))), [7, 9, 7, 4, 5, 0]);
  MOTIF_PITCHES.forEach((n, i) => {
    const was = D_MINOR.steps.indexOf(above(n, MOTIF_AXIS));
    const now = F_MAJOR.steps.indexOf(above(major[i], note('F4')));
    assert.equal(now, was, `note ${i} keeps its degree`);
    assert.ok(inScale(F_MAJOR, major[i]));
  });
  // The rhythm is the motif's rhythm.
  const first = lead.bars.slice(4, 6).flat();
  assert.deepEqual(first.map((e) => e.len), MOTIF.map((m) => m.len));
  assert.deepEqual(lead.bars.slice(0, 4).flat(), [], 'four bars of arp and bass first');
});

test('Hawkins: warm sevenths, no chromatic notes, home on F and a way back through C7', () => {
  const t = TRACKS.hawkins;
  assert.deepEqual([...t.chromatic], []);
  assert.equal(t.harmony[0], 'Fmaj7');
  assert.equal(t.harmony[31], 'C7');
  assert.deepEqual([...new Set(t.harmony)].sort(), ['Am7', 'Bbmaj7', 'C7', 'Dm7', 'Fmaj7', 'Gm7']);
  const lead = pitched(t, 'p1', 'base');
  assert.equal(lead.inst.wave, 'p50', 'a square lead is the warm one');
  const slots = (layer: string): string[] => t.channels.filter((c) => c.layer === layer).map((c) => c.slot).sort();
  assert.deepEqual(slots('base'), ['noi', 'p1', 'p2', 'tri']);
  assert.deepEqual(slots('combat'), ['noi', 'p3']);
  const c = compile(t);
  for (const d of ['kick', 'snare', 'hat']) assert.ok(c.notes.some((n) => n.layer === 'combat' && n.drum === d), d);
  // Eighth-note drive on the combat bass: eight notes a bar.
  for (const bar of pitched(t, 'p3', 'combat').bars) assert.equal(bar.length, 8);
});

// ---------------------------------------------------------------- levels and layers, for all six

test('every track keeps its voices quiet enough: the coincident amplitudes stay inside the range of the first three', () => {
  const CREST: Record<string, number> = { p12: 1.75, p25: 1.5, p50: 1, tri: 1 };
  const worst = new Map<string, number>();
  for (const id of TRACK_IDS) {
    const t = TRACKS[id];
    const c = compile(t);
    const spans = c.notes.map((n) => {
      const start = n.abs * c.stepSec;
      if (n.inst) {
        const timing = noteTiming(n, c.stepSec);
        return { start, end: start + timing.gate + timing.release, a: n.inst.vol * n.vel * CREST[n.inst.wave] };
      }
      return { start, end: start + n.gate * c.stepSec, a: DRUM_DEFS[n.drum!].vol * n.vel };
    });
    let top = 0;
    for (const s of spans) {
      let sum = 0;
      for (const o of spans) if (o.start <= s.start && o.end > s.start) sum += o.a;
      top = Math.max(top, sum);
    }
    worst.set(id, top);
    // Full scale in the render is 0.9. Voices never peak together, and the renders show about half of this sum.
    assert.ok(top < 1.8, `${id} adds up to ${top.toFixed(2)}`);
    assert.ok(maxVoices(t) <= 5, `${id} voices`);
    assert.deepEqual(findOverlaps(t), [], `${id} overlaps`);
  }
  for (const id of NEW) {
    const old = Math.max(worst.get('static')!, worst.get('mirkwood')!, worst.get('lab')!);
    assert.ok(worst.get(id)! <= old * 1.1, `${id} is no hotter than the first three`);
  }
});

test('the base layer alone stays under five voices and under the whole', () => {
  for (const id of NEW) {
    const t = TRACKS[id];
    assert.ok(maxVoices(t, ['base']) <= 4, `${id} base`);
    assert.ok(maxVoices(t, ['combat']) <= 2, `${id} combat`);
    assert.ok(maxVoices(t) <= 5);
  }
});

// ---------------------------------------------------------------- Will's stinger

test("Will's tag-in stinger is three soft triangle notes, and not like the other four", () => {
  const will = STINGERS.will;
  assert.ok(will.notes.length >= 2 && will.notes.length <= 4, `${will.notes.length} notes`);
  for (const n of will.notes) {
    assert.equal(n.w, 'tri');
    assert.ok(n.vol <= 0.3, 'soft');
  }
  assert.equal(will.hits.length, 0, 'no noise');
  assert.ok(will.length < 1.1, `${will.length} s: a tag-in stays short`);
  const shape = (c: typeof will): string => JSON.stringify(c.notes.map((n) => [n.w, n.midi]));
  for (const h of ['mike', 'dustin', 'lucas', 'eleven'] as const) {
    assert.notEqual(shape(STINGERS[h]), shape(will), h);
    assert.notEqual(STINGERS[h].notes[0].midi, will.notes[0].midi, `${h} does not start where Will starts`);
  }
  // The old stand-in was A4 then E5.
  assert.notDeepEqual(will.notes.map((n) => n.midi), [note('A4'), note('E5')]);
});

// ---------------------------------------------------------------- the eight effects

const NEW_SFX = ['roar', 'acid', 'lunge', 'petals', 'chomp', 'thud', 'reveal', 'sizzle'] as const;
const OLD_STANDINS: Record<(typeof NEW_SFX)[number], string> = {
  roar: 'growl', acid: 'candyPop', lunge: 'dash', petals: 'flicker', chomp: 'bash', thud: 'slam', reveal: 'lights', sizzle: 'flame',
};
const tones = (id: keyof typeof SFX): Tn[] => SFX[id].parts.filter((p): p is Tn => p.k === 't');
const noises = (id: keyof typeof SFX): Ns[] => SFX[id].parts.filter((p): p is Ns => p.k === 'n');
const length = (id: keyof typeof SFX): number => Math.max(...SFX[id].parts.map((p) => p.at + p.d));

test('the eight effects have their own recipes and no stand-in is left', () => {
  for (const id of NEW_SFX) {
    const old = OLD_STANDINS[id] as keyof typeof SFX;
    assert.notEqual(SFX[id], SFX[old], `${id} is not ${old}`);
    assert.notDeepEqual(SFX[id].parts, SFX[old].parts, `${id} sounds unlike ${old}`);
    for (const other of Object.keys(SFX) as (keyof typeof SFX)[]) if (other !== id) assert.notEqual(SFX[id], SFX[other], `${id} shares a recipe with ${other}`);
    assert.ok(LEVELS34[id] > 0.2 && LEVELS34[id] < 1, `${id} has a measured level, got ${LEVELS34[id]}`);
    for (const p of SFX[id].parts as Part[]) {
      assert.ok(p.d > 0 && p.at >= 0 && p.v > 0 && p.v <= 1, `${id} part`);
      if (p.k === 't') assert.ok(p.f >= 20 && p.f <= 8000 && (!p.f2 || (p.f2 >= 20 && p.f2 <= 8000)), `${id} tone ${p.f}`);
    }
  }
});

test('the effects have the lengths the design wants', () => {
  const span: Record<(typeof NEW_SFX)[number], [number, number]> = {
    roar: [1.3, 1.7], acid: [0.2, 0.35], lunge: [0.25, 0.5], petals: [0.5, 0.9],
    chomp: [0.2, 0.45], thud: [0.5, 0.9], reveal: [0.6, 1.2], sizzle: [0.7, 1.2],
  };
  for (const id of NEW_SFX) {
    const [lo, hi] = span[id];
    assert.ok(length(id) >= lo && length(id) <= hi, `${id} runs ${length(id).toFixed(2)} s`);
  }
  assert.ok(length('roar') > 2 * length('growl'), 'the roar is long next to the growl');
});

test('roar is low and thud lower still; petals and reveal stay out of their way', () => {
  // The roar fires together with petals, so it keeps to the low end and petals to the middle.
  for (const t of tones('roar')) assert.ok(t.f <= 130, `roar tone ${t.f}`);
  assert.ok(Math.min(...tones('roar').map((t) => t.f2 ?? t.f)) <= 45);
  for (const n of noises('roar')) assert.ok((n.f?.freq ?? 0) <= 1000, 'roar noise stays under 1 kHz');
  for (const t of tones('petals')) assert.ok(t.f >= 140, `petals tone ${t.f}`);
  for (const n of noises('petals')) assert.ok((n.f?.freq ?? 0) >= 400 || n.f?.type !== 'bandpass', 'petals bands sit above the roar');
  assert.equal(tones('petals').filter((t) => t.f < 100).length, 0);
  assert.ok(Math.min(...tones('thud').map((t) => t.f2 ?? t.f)) <= 35, 'the boom drops to 30 Hz');
  for (const t of tones('reveal')) assert.ok(t.f >= 380, `reveal tone ${t.f}: no low end`);
  for (const n of noises('reveal')) assert.ok(n.f?.type === 'highpass' && n.f.freq >= 5000, 'only air above 5 kHz');
  assert.ok(tones('reveal').filter((t) => t.w === 'tri').length >= 5, 'a run of triangle bells');
});

test('acid, chomp, thud, lunge and sizzle have the parts that name them', () => {
  // acid: bubbles that rise
  assert.ok(tones('acid').filter((t) => t.f2 && t.f2 > t.f).length >= 2, 'two rising bubbles');
  // chomp: two closings of the jaw, 0.08 s or more apart, each a click
  const clicks = noises('chomp').filter((n) => n.d <= 0.04).map((n) => n.at);
  assert.ok(clicks.length >= 2 && Math.max(...clicks) - Math.min(...clicks) >= 0.08, 'two bites');
  // thud: a second knock, and bits of wall ticking down
  assert.ok(noises('thud').filter((n) => n.d <= 0.02).length >= 4, 'debris');
  assert.ok(tones('thud').filter((t) => t.at >= 0.2).length >= 1, 'a second knock');
  // lunge: noise that climbs and noise that falls
  const sweeps = noises('lunge').filter((n) => n.f?.freqEnd);
  assert.ok(sweeps.some((n) => n.f!.freqEnd! > n.f!.freq), 'rising sweep');
  assert.ok(sweeps.some((n) => n.f!.freqEnd! < n.f!.freq), 'falling sweep');
  // sizzle: a bed of hiss and a dozen crackles, nothing low
  assert.ok(noises('sizzle').filter((n) => n.m === 7 && n.d <= 0.02).length >= 10, 'crackles');
  assert.equal(tones('sizzle').length, 0, 'no pitched part');
  for (const n of noises('sizzle')) assert.ok((n.f?.freq ?? 0) >= 900, 'nothing below 900 Hz');
  // petals: five lips
  assert.equal(noises('petals').filter((n) => n.m === 7 && n.d >= 0.1).length, 5);
});
