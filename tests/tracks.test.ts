import { test } from 'node:test';
import assert from 'node:assert/strict';
import { TRACKS, TRACK_IDS } from '../src/audio/tracks/index.ts';
import {
  barAt, barLengths, barSeconds, barStartSeconds, barStartSteps, compile, findOverlaps, maxVoices, noteTiming,
} from '../src/audio/tracks/compile.ts';
import {
  MODES, STEPS_PER_BAR, chord, grid, inScale, invert, makeScale, note, pitchClass, snap,
} from '../src/audio/tracks/theory.ts';
import { D_PHRYGIAN, MOTIF, MOTIF_AXIS, MOTIF_PITCHES, motifUpsideDown } from '../src/audio/tracks/motif.ts';
import { JINGLES, SCARE_PITCHES, STINGERS } from '../src/audio/tracks/jingles.ts';
import { envLevel, evalCoefs, lfsrBits, lfsrPeriod, pulseCoefs, triCoefs } from '../src/audio/dsp.ts';
import { encodeWav } from '../src/audio/wav.ts';
import { SFX } from '../src/audio/sfx.ts';
import type { ModeName, PitchedChannel } from '../src/audio/tracks/types.ts';

const MAX_VOICES = 5;

/** Steps in a bar of a track: its barSteps, or sixteen. */
function stepsIn(id: keyof typeof TRACKS, bar: number): number {
  return barLengths(TRACKS[id])[bar];
}

test('every track declares tempo, key, length and layers', () => {
  for (const id of TRACK_IDS) {
    const t = TRACKS[id];
    assert.equal(t.id, id);
    assert.ok(t.title.length > 0, `${id} title`);
    assert.ok(Number.isInteger(t.bpm) && t.bpm >= 40 && t.bpm <= 200, `${id} bpm`);
    assert.match(t.tonic, /^[A-G][#b]?$/, `${id} tonic`);
    assert.ok(t.mode in MODES, `${id} mode`);
    assert.ok(Number.isInteger(t.bars) && t.bars > 0, `${id} bars`);
    if (t.barSteps) {
      assert.equal(t.barSteps.length, t.bars, `${id} barSteps has one entry per bar`);
      for (const n of t.barSteps) assert.ok(Number.isInteger(n) && n >= 4 && n <= 32, `${id} barSteps ${n}`);
    }
    assert.ok(t.layers.includes('base'), `${id} has a base layer`);
    assert.equal(t.harmony.length, t.bars, `${id} harmony has one chord per bar`);
    for (const sym of t.harmony) assert.doesNotThrow(() => chord(sym), `${id} chord ${sym}`);
    for (const pc of t.chromatic) assert.ok(Number.isInteger(pc) && pc >= 0 && pc < 12, `${id} exception ${pc}`);
  }
  const s = TRACKS.static;
  assert.deepEqual([s.bpm, s.tonic, s.mode, s.bars], [92, 'D', 'minor', 32]);
  const m = TRACKS.mirkwood;
  assert.deepEqual([m.bpm, m.tonic, m.mode], [76, 'A', 'minor']);
});

test('no track sits at the tempo of the show theme', () => {
  for (const id of TRACK_IDS) assert.notEqual(TRACKS[id].bpm, 84, id);
});

test('every channel in a track has the same bar count', () => {
  for (const id of TRACK_IDS) {
    const t = TRACKS[id];
    for (const c of t.channels) assert.equal(c.bars.length, t.bars, `${id} ${c.slot} ${c.layer}`);
  }
});

test('every note is in the scale or a listed chromatic exception', () => {
  for (const id of TRACK_IDS) {
    const t = TRACKS[id];
    const scale = makeScale(t.tonic, t.mode);
    const bad: string[] = [];
    const used = new Set<number>();
    for (const n of compile(t).notes) {
      if (n.drum) continue;
      const pc = ((n.midi % 12) + 12) % 12;
      used.add(pc);
      if (!inScale(scale, n.midi) && !t.chromatic.includes(pc)) bad.push(`${n.slot} bar ${n.bar + 1} step ${n.step} midi ${n.midi}`);
    }
    assert.deepEqual(bad, [], `${id} has notes outside ${t.tonic} ${t.mode}`);
    for (const pc of t.chromatic) assert.ok(used.has(pc), `${id} lists exception ${pc} but never uses it`);
  }
});

test('slots match their waves and events are well formed', () => {
  for (const id of TRACK_IDS) {
    const t = TRACKS[id];
    const loop = compile(t).loop;
    for (const c of t.channels) {
      if (c.slot === 'noi') continue;
      const p = c as PitchedChannel;
      assert.ok(p.slot === 'tri' ? p.inst.wave === 'tri' : p.inst.wave !== 'tri', `${id} ${p.slot} wave`);
      assert.ok(p.inst.vol > 0 && p.inst.vol <= 0.6, `${id} ${p.slot} vol`);
      assert.ok(p.inst.gate > 0 && p.inst.gate <= 1, `${id} ${p.slot} gate`);
    }
    for (const n of compile(t).notes) {
      assert.ok(n.step >= 0 && n.step < stepsIn(id, n.bar), `${id} bar ${n.bar + 1} step ${n.step}`);
      assert.ok(n.vel > 0 && n.vel <= 1, `${id} vel ${n.vel}`);
      if (n.drum) continue;
      assert.ok(Number.isInteger(n.midi) && n.midi >= 24 && n.midi <= 108, `${id} midi ${n.midi}`);
      assert.ok(n.gate > 0, `${id} gate`);
      assert.ok(n.abs + n.gate / (n.inst?.gate ?? 1) <= loop + 1e-9, `${id} ${n.slot} bar ${n.bar + 1} runs past the loop end`);
    }
  }
});

test('the loop closes: no overlaps across the seam, and the last chord leads home', () => {
  // A chord that pulls back to the start: the dominant, the subdominant, the flat seventh, or the tonic itself.
  const LEADS_HOME = [7, 5, 10, 0];
  for (const id of TRACK_IDS) {
    const t = TRACKS[id];
    assert.deepEqual(findOverlaps(t), [], `${id} overlaps`);
    const tonic = pitchClass(t.tonic);
    const last = chord(t.harmony[t.harmony.length - 1]);
    assert.ok(LEADS_HOME.includes((last.root - tonic + 12) % 12), `${id} ends on ${last.symbol}`);
  }
});

test('polyphony never passes five voices', () => {
  for (const id of TRACK_IDS) {
    const t = TRACKS[id];
    assert.ok(new Set(t.channels.map((c) => c.slot)).size <= MAX_VOICES, `${id} slots`);
    assert.ok(maxVoices(t) <= MAX_VOICES, `${id} all layers: ${maxVoices(t)}`);
    for (const layer of t.layers) assert.ok(maxVoices(t, [layer]) <= MAX_VOICES, `${id} ${layer}`);
    // One channel per slot and layer.
    const keys = t.channels.map((c) => `${c.slot}/${c.layer}`);
    assert.equal(new Set(keys).size, keys.length, `${id} duplicate channel`);
  }
});

test('a voice always ends before the next note on its slot begins', () => {
  for (const id of TRACK_IDS) {
    const t = TRACKS[id];
    const c = compile(t);
    for (const n of c.notes) {
      if (!n.inst) continue;
      const { gate, release } = noteTiming(n, c.stepSec);
      const toNext = (n.gate + n.gap) * c.stepSec;
      assert.ok(gate > 0 && release >= 0.004 - 1e-12, `${id} ${n.slot} bar ${n.bar + 1} step ${n.step}: gate ${gate}, release ${release}`);
      assert.ok(gate + release <= toNext + 1e-9, `${id} ${n.slot} bar ${n.bar + 1} step ${n.step} rings into the next note`);
    }
  }
});

test('Static: the lead enters at bar nine with the motif', () => {
  const t = TRACKS.static;
  const lead = t.channels.find((c) => c.slot === 'p1') as PitchedChannel;
  for (let b = 0; b < 8; b++) assert.equal(lead.bars[b].length, 0, `bar ${b + 1} is silent`);
  const first = [...lead.bars[8], ...lead.bars[9]].slice(0, MOTIF.length).map((e) => e.midi);
  assert.deepEqual(first, [...MOTIF_PITCHES]);
  assert.deepEqual(t.layers, ['base']);
});

test('Mirkwood: the combat layer has its own drums, bass and stabs', () => {
  const t = TRACKS.mirkwood;
  const slots = (layer: string): string[] => t.channels.filter((c) => c.layer === layer).map((c) => c.slot).sort();
  assert.deepEqual(slots('base'), ['noi', 'p1', 'tri']);
  assert.deepEqual(slots('combat'), ['noi', 'p2', 'p3']);
  const drums = compile(t).notes.filter((n) => n.layer === 'combat' && n.drum);
  for (const d of ['kick', 'snare', 'hat']) assert.ok(drums.some((n) => n.drum === d), d);
  // Eighth-note bass: eight notes in an ordinary bar.
  const bass = t.channels.find((c) => c.slot === 'p2') as PitchedChannel;
  assert.equal(bass.bars[0].length, 8);
});

test('bar lengths default to sixteen, so Static and Mirkwood are unchanged', () => {
  for (const id of ['static', 'mirkwood'] as const) {
    const t = TRACKS[id];
    assert.equal(t.barSteps, undefined, `${id} sets no barSteps`);
    assert.deepEqual([...barLengths(t)], Array.from({ length: t.bars }, () => STEPS_PER_BAR));
    const c = compile(t);
    assert.equal(c.loop, t.bars * STEPS_PER_BAR);
    assert.equal(barSeconds(t), c.stepSec * STEPS_PER_BAR);
    for (let bar = 0; bar < t.bars * 2 + 3; bar++) {
      assert.equal(barStartSteps(t, bar), bar * STEPS_PER_BAR, `${id} bar ${bar} start`);
      assert.equal(barStartSeconds(t, bar), bar * barSeconds(t), `${id} bar ${bar} time`);
      assert.equal(barAt(t, bar * barSeconds(t) + 0.01), bar % t.bars, `${id} bar ${bar} lookup`);
    }
  }
});

test('Lab: E minor, 104 bpm, and every fourth bar is 7/8', () => {
  const t = TRACKS.lab;
  assert.equal(t.id, 'lab');
  assert.equal(t.title, 'The Lab');
  assert.deepEqual([t.bpm, t.tonic, t.mode, t.bars], [104, 'E', 'minor', 32]);
  assert.notEqual(t.bpm, 84);
  assert.deepEqual([...t.layers], ['base', 'combat']);
  const steps = barLengths(t);
  assert.equal(steps.length, 32);
  steps.forEach((n, bar) => assert.equal(n, (bar + 1) % 4 === 0 ? 14 : 16, `bar ${bar + 1} has ${n} steps`));
  assert.equal(compile(t).loop, 24 * 16 + 8 * 14);
  // A 7/8 bar is seven eighths: seven sixteenth-pairs long, a step shorter than half a beat.
  assert.ok(Math.abs(barSeconds(t, 3) - (7 / 2) * (60 / 104)) < 1e-12);
  assert.ok(Math.abs(barSeconds(t, 0) - 4 * (60 / 104)) < 1e-12);
  // Bar starts add up, the loop wraps, and a time inside a bar finds that bar.
  let at = 0;
  for (let bar = 0; bar < 70; bar++) {
    assert.equal(barStartSteps(t, bar), (Math.floor(bar / 32) * 496) + compile(t).starts[bar % 32], `bar ${bar}`);
    const mid = barStartSeconds(t, bar) + barSeconds(t, bar) / 2;
    assert.equal(barAt(t, mid), bar % 32, `bar ${bar} lookup`);
    assert.ok(Math.abs(barStartSeconds(t, bar) - at) < 1e-9, `bar ${bar} start`);
    at += barSeconds(t, bar);
  }
});

test('Lab: every event stays inside its bar and the loop closes on the 7/8 bar', () => {
  const t = TRACKS.lab;
  const c = compile(t);
  assert.deepEqual(findOverlaps(t), []);
  for (const n of c.notes) {
    assert.ok(n.step < stepsIn('lab', n.bar), `bar ${n.bar + 1} step ${n.step} is past the bar end`);
  }
  // The last bar is a 7/8 bar, and nothing in it rings past the loop end.
  assert.equal(stepsIn('lab', 31), 14);
  const lastEnd = Math.max(...c.notes.filter((n) => n.bar === 31).map((n) => n.step + (n.drum ? 0 : n.gate / (n.inst?.gate ?? 1))));
  assert.ok(lastEnd <= 14 + 1e-9, `last bar ends at step ${lastEnd}`);
  // B major closes it: D sharp, the leading tone, is the one exception to E minor, and it is used in that bar.
  assert.equal(t.harmony[31], 'B');
  assert.deepEqual([...t.chromatic], [3]);
  assert.ok(c.notes.some((n) => n.bar === 31 && !n.drum && n.midi % 12 === 3), 'D sharp sounds in the last bar');
});

test('Lab: the klaxon is a two-note alternating pulse that enters after bar four', () => {
  const t = TRACKS.lab;
  const klaxon = t.channels.find((ch) => ch.slot === 'p3') as PitchedChannel;
  assert.equal(klaxon.layer, 'base');
  for (let b = 0; b < 4; b++) assert.equal(klaxon.bars[b].length, 0, `bar ${b + 1} is silent`);
  assert.ok(klaxon.bars[4].length >= 4, 'it enters in bar five');
  const tritones = new Set<number>();
  klaxon.bars.forEach((evs, bar) => {
    if (evs.length === 0) return;
    const pitches = new Set(evs.map((e) => e.midi));
    assert.equal(pitches.size, 2, `bar ${bar + 1} alternates two notes`);
    evs.forEach((e, i) => { if (i > 0) assert.notEqual(e.midi, evs[i - 1].midi, `bar ${bar + 1} alternates`); });
    const [lo, hi] = [...pitches].sort((a, b) => a - b);
    const gap = hi - lo;
    assert.ok(gap === 3 || gap === 6, `bar ${bar + 1} spans ${gap} semitones`);
    if (gap === 6) tritones.add(bar);
  });
  assert.ok(tritones.size > 0, 'at least one bar uses the tritone');
});

test('Lab: the combat layer adds a driving bass, drums and more stabs', () => {
  const t = TRACKS.lab;
  const c = compile(t);
  const slots = (layer: string): string[] => t.channels.filter((ch) => ch.layer === layer).map((ch) => ch.slot).sort();
  assert.deepEqual(slots('base'), ['noi', 'p1', 'p3', 'tri']);
  assert.deepEqual(slots('combat'), ['noi', 'p1', 'p2']);
  for (const d of ['kick', 'snare', 'hat']) assert.ok(c.notes.some((n) => n.layer === 'combat' && n.drum === d), d);
  const count = (layer: string, slot: string, bar: number): number => c.byBar[bar].filter((n) => n.layer === layer && n.slot === slot).length;
  for (let bar = 0; bar < t.bars; bar++) {
    assert.ok(count('combat', 'p1', bar) > count('base', 'p1', bar), `bar ${bar + 1} has more stabs in combat`);
    // Seven eighths in a 7/8 bar, eight in a 4/4 bar.
    assert.equal(count('combat', 'p2', bar), stepsIn('lab', bar) / 2, `bar ${bar + 1} bass`);
  }
  // Kick and open hat ring 0.15 s but a step is shorter, so no hit sits on the step after one.
  const stepSec = c.stepSec;
  assert.ok(stepSec < 0.15);
  const hits = c.notes.filter((n) => n.slot === 'noi').sort((a, b) => a.abs - b.abs);
  hits.forEach((h, i) => {
    if (h.drum !== 'kick' && h.drum !== 'ohat') return;
    const next = hits[i + 1] ?? hits[0];
    const dist = (next.abs - h.abs + c.loop) % c.loop;
    assert.ok(dist * stepSec >= 0.15 - 1e-9, `${h.drum} at bar ${h.bar + 1} step ${h.step} is followed too soon`);
  });
});

test('the klaxon effect is a two-tone siren of about a second and a bit', () => {
  const r = SFX.klaxon;
  const ends = r.parts.map((p) => p.at + p.d);
  assert.ok(Math.max(...ends) >= 1.1 && Math.max(...ends) <= 1.3, `length ${Math.max(...ends)}`);
  const pulses = r.parts.filter((p) => p.k === 't' && p.w === 'p50').map((p) => (p as { f: number }).f);
  assert.equal(new Set(pulses).size, 2, 'two pitches');
  assert.equal(pulses.length, 4);
  assert.equal(r.j, 0, 'a siren holds its pitch');
});

// ---------------------------------------------------------------- invert

const SCALES: ModeName[] = ['minor', 'phrygian', 'dorian', 'whole', 'chromatic'];

test('invert flips intervals around the axis and lands in the scale', () => {
  const inv = invert(MOTIF_PITCHES, MOTIF_AXIS, D_PHRYGIAN);
  assert.equal(inv.length, 6);
  inv.forEach((n, i) => {
    assert.ok(inScale(D_PHRYGIAN, n), `note ${i} in D Phrygian`);
    // Within a semitone of the exact reflection.
    assert.ok(Math.abs(n - (2 * MOTIF_AXIS - MOTIF_PITCHES[i])) <= 1, `note ${i} near the mirror image`);
  });
  assert.equal(invert([MOTIF_AXIS], MOTIF_AXIS, D_PHRYGIAN)[0], MOTIF_AXIS, 'the axis does not move');
  assert.deepEqual(inv, motifUpsideDown());
  // The ones above the axis go below it.
  inv.forEach((n, i) => assert.ok(MOTIF_PITCHES[i] > MOTIF_AXIS ? n < MOTIF_AXIS : n <= MOTIF_AXIS));
});

test('invert round-trips on the scale', () => {
  assert.deepEqual(invert(inv(MOTIF_PITCHES), MOTIF_AXIS, D_PHRYGIAN), [...MOTIF_PITCHES]);
  for (const mode of SCALES) {
    const s = makeScale('D', mode);
    for (const axis of [note('D4'), note('D5')]) {
      for (let n = 40; n <= 90; n++) {
        if (!inScale(s, n)) continue;
        const there = invert([n], axis, s);
        const back = invert(there, axis, s);
        assert.deepEqual(back, [n], `${mode}: ${n} around ${axis} came back as ${back[0]}`);
      }
    }
  }
  function inv(m: readonly number[]): number[] { return invert(m, MOTIF_AXIS, D_PHRYGIAN); }
});

test('snap picks the nearest scale tone and breaks ties downward', () => {
  const s = makeScale('D', 'phrygian');
  assert.equal(snap(s, note('E4')), note('Eb4'));
  assert.equal(snap(s, note('Eb4')), note('Eb4'));
  assert.equal(snap(s, note('F#4')), note('F4'));
});

// ---------------------------------------------------------------- cues

test('the scare is the motif upside down, two to three seconds, with a dissonant partner', () => {
  const scare = STINGERS.scare;
  assert.deepEqual([...SCARE_PITCHES], invert(MOTIF_PITCHES, MOTIF_AXIS, D_PHRYGIAN));
  const lead = scare.notes.filter((n) => n.w === 'p25').sort((a, b) => a.at - b.at).map((n) => n.midi);
  assert.deepEqual(lead, [...SCARE_PITCHES]);
  assert.ok(scare.length >= 2 && scare.length <= 3, `length ${scare.length}`);
  const ghost = scare.notes.filter((n) => n.w === 'p12');
  assert.equal(ghost.length, 6);
  ghost.forEach((g, i) => assert.equal(g.midi - SCARE_PITCHES[i], 1, 'a semitone above'));
});

test('every jingle and stinger exists, ducks the music and has a sound', () => {
  assert.deepEqual(Object.keys(JINGLES).sort(), ['clear', 'dice', 'gameOver', 'item', 'levelUp', 'recruit']);
  assert.deepEqual(Object.keys(STINGERS).sort(), ['dustin', 'eleven', 'lucas', 'mike', 'scare']);
  for (const [id, c] of [...Object.entries(JINGLES), ...Object.entries(STINGERS)]) {
    assert.ok(c.notes.length + c.hits.length > 0, id);
    assert.ok(c.length > 0.2 && c.length < 6, `${id} length ${c.length}`);
    assert.ok(c.duck > 0 && c.duck <= c.length, `${id} duck`);
    assert.ok(c.duckDb >= 3 && c.duckDb <= 9, `${id} duck depth`);
  }
  for (const id of Object.keys(JINGLES)) assert.equal(JINGLES[id as keyof typeof JINGLES].duckDb, 6, `${id} ducks about 6 dB`);
});

test('tag-in stingers are two to four melody notes and all different', () => {
  const heroes = ['mike', 'dustin', 'lucas', 'eleven'] as const;
  const shapes = new Set<string>();
  for (const h of heroes) {
    const c = STINGERS[h];
    const tune = c.notes.filter((n) => n.w !== 'tri' || h === 'eleven');
    assert.ok(tune.length >= 2 && tune.length <= 4, `${h} has ${tune.length} notes`);
    assert.ok(c.length < 1.6, `${h} stays short`);
    shapes.add(JSON.stringify(c.notes.map((n) => [n.w, n.midi])));
  }
  assert.equal(shapes.size, heroes.length);
});

// ---------------------------------------------------------------- synth math

test('the noise registers have the right periods', () => {
  assert.equal(lfsrPeriod(15), 32767);
  assert.equal(lfsrPeriod(7), 127);
  assert.equal(lfsrBits(15).length, 32767);
  assert.equal(lfsrBits(7).length, 127);
  for (const w of [15, 7] as const) {
    const bits = lfsrBits(w);
    const mean = bits.reduce((a, b) => a + b, 0) / bits.length;
    assert.ok(Math.abs(mean) < 1e-4, `width ${w} is balanced`);
  }
});

test('pulse wave tables have the right duty', () => {
  const sq = pulseCoefs(0.5, 64);
  for (let n = 2; n <= 64; n += 2) assert.ok(Math.abs(sq.real[n]) < 1e-6 && Math.abs(sq.imag[n]) < 1e-6, `square has no harmonic ${n}`);
  const eighth = pulseCoefs(0.125, 64);
  const mag = (n: number): number => Math.hypot(eighth.real[n], eighth.imag[n]);
  assert.ok(mag(8) < 1e-6 && mag(16) < 1e-6, '12.5 percent has no 8th harmonic');
  for (let n = 1; n <= 20; n++) {
    // The closed form: harmonic n of a pulse of duty d has magnitude 4 |sin(n pi d)| / (n pi).
    const want = (4 * Math.abs(Math.sin(n * Math.PI * 0.125))) / (n * Math.PI);
    assert.ok(Math.abs(mag(n) - want) < 1e-6, `harmonic ${n}`);
  }
  for (const duty of [0.125, 0.25, 0.5]) {
    const c = pulseCoefs(duty, 1500);
    // Without DC the high side sits at 2(1-d) and the low side at -2d.
    assert.ok(Math.abs(evalCoefs(c, Math.PI * duty) - 2 * (1 - duty)) < 0.08, `duty ${duty} high`);
    assert.ok(Math.abs(evalCoefs(c, Math.PI * (1 + duty)) + 2 * duty) < 0.08, `duty ${duty} low`);
  }
});

test('the triangle table is the stepped NES triangle', () => {
  const c = triCoefs(512);
  // Start at mid level, then run through the sixteen steps down and sixteen up.
  const mid = (j: number): number => evalCoefs(c, ((j + 0.5) * 2 * Math.PI) / 32);
  const levels = Array.from({ length: 32 }, (_, j) => mid(j));
  const peak = Math.max(...levels.map(Math.abs));
  assert.ok(peak > 0.9 && peak < 1.1, `peak ${peak}`);
  assert.ok(levels.some((v) => v > 0.9) && levels.some((v) => v < -0.9));
});

test('envelope levels follow attack, decay and sustain', () => {
  const e = { a: 0.1, d: 0.2, s: 0.5, r: 0.1 };
  assert.equal(envLevel(e, 0), 0);
  assert.ok(Math.abs(envLevel(e, 0.05) - 0.5) < 1e-9);
  assert.ok(Math.abs(envLevel(e, 0.1) - 1) < 1e-9);
  assert.ok(Math.abs(envLevel(e, 0.2) - 0.75) < 1e-9);
  assert.equal(envLevel(e, 1), 0.5);
  const bell = { a: 0.002, d: 1, s: 0, r: 0.1, exp: true };
  assert.ok(envLevel(bell, 0.5) < 0.05 && envLevel(bell, 0.5) > 0.01);
  assert.equal(envLevel(bell, 2), 0);
});

test('drum grids give one drum per step', () => {
  const g = grid({ kick: 'X.......x.......', snare: '....X...X.......', hat: 'xxxxxxxxxxxxxxxx' });
  const steps = g.map((d) => d.step);
  assert.equal(new Set(steps).size, steps.length);
  assert.equal(g[0].drum, 'kick');
  assert.equal(g.find((d) => d.step === 8)?.drum, 'kick');
  assert.equal(g.find((d) => d.step === 4)?.drum, 'snare');
});

test('the WAV encoder writes a 16-bit mono 44.1 kHz file', () => {
  const samples = new Float32Array([0, 0.5, -0.5, 1, -1, 2]);
  const buf = encodeWav(samples, 44100);
  const v = new DataView(buf);
  const tag = (at: number): string => String.fromCharCode(v.getUint8(at), v.getUint8(at + 1), v.getUint8(at + 2), v.getUint8(at + 3));
  assert.equal(buf.byteLength, 44 + samples.length * 2);
  assert.equal(tag(0), 'RIFF');
  assert.equal(tag(8), 'WAVE');
  assert.equal(tag(36), 'data');
  assert.equal(v.getUint16(22, true), 1);
  assert.equal(v.getUint32(24, true), 44100);
  assert.equal(v.getUint16(34, true), 16);
  assert.equal(v.getUint32(40, true), samples.length * 2);
  assert.equal(v.getInt16(44 + 2 * 3, true), 32767);
  assert.equal(v.getInt16(44 + 2 * 4, true), -32768);
  assert.equal(v.getInt16(44 + 2 * 5, true), 32767);
});
