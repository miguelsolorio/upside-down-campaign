// The Abyss: the final boss, 5.3. D minor, 160 bpm, every motif at once, and a tempo that steps up 4 bpm at each of the
// boss's three phases. The checks every track meets (key, loop closure, polyphony, overlaps) run over TRACK_IDS in
// tracks.test.ts. This file checks what makes the Abyss the Abyss: the Hawkins motif, its inversion and the Clock's bell
// sounding together, the phase tempos, and that the sequencer and the live player really play them.
// Peak, limiter and clipping need a rendered signal, which Node can't make. They were measured with an offline render in
// a headless Chrome (renderOffline in render.ts, the same call as the audio lab's R key) and are recorded below next to a
// fingerprint of the track data that was rendered. If the track changes, the fingerprint stops matching and the test says
// to render it again. Where a real OfflineAudioContext exists (a browser test runner) the same test renders it itself.
import { test, mock } from 'node:test';
import assert from 'node:assert/strict';
import { TRACKS, TRACK_IDS } from '../src/audio/tracks/index.ts';
import { ABYSS } from '../src/audio/tracks/abyss.ts';
import { CLOCK } from '../src/audio/tracks/clock.ts';
import {
  barSeconds, barStartSeconds, compile, findOverlaps, loopSeconds, maxVoices, noteTiming, phaseBpm, phaseCount, stepSeconds,
} from '../src/audio/tracks/compile.ts';
import { DRUM_SECONDS, chordPcs, inScale, makeScale, note, pitchClass } from '../src/audio/tracks/theory.ts';
import { D_MINOR, MOTIF_AXIS, MOTIF_PITCHES, flipBars, motifBars, motifUpsideDown } from '../src/audio/tracks/motif.ts';
import { scheduleBar, scheduleOffline, startLive } from '../src/audio/sequencer.ts';
import { createRig } from '../src/audio/rig.ts';
import type { NoiseChannel, PitchedChannel, Track } from '../src/audio/tracks/types.ts';
import { fakeContext, onsets, stub } from './audio-fake.ts';
import { print } from './audio-helpers.ts';

const A = ABYSS;
const MINOR = makeScale('D', 'minor');
const pitched = (slot: string, layer: string): PitchedChannel => {
  const c = A.channels.find((ch) => ch.slot === slot && ch.layer === layer);
  assert.ok(c && c.slot !== 'noi', `${layer} ${slot} channel`);
  return c as PitchedChannel;
};
const drums = (layer: string): NoiseChannel => {
  const c = A.channels.find((ch) => ch.slot === 'noi' && ch.layer === layer);
  assert.ok(c, `${layer} noise channel`);
  return c as NoiseChannel;
};
/** The pitches a channel plays in bars [from, from + count). */
const line = (c: PitchedChannel, from: number, count: number): number[] => c.bars.slice(from, from + count).flat().map((e) => e.midi);
const lead = pitched('p1', 'base');
const mirror = pitched('p2', 'base');
const bell = pitched('p3', 'base');
const gallop = pitched('p3', 'combat');

// ---------------------------------------------------------------- what it is

test('the Abyss is registered: D minor, 160 bpm, 32 bars, a base and a combat layer in five voices', () => {
  assert.equal(TRACKS.abyss, A);
  assert.ok(TRACK_IDS.includes('abyss'));
  assert.deepEqual([A.id, A.title, A.bpm, A.tonic, A.mode, A.bars], ['abyss', 'The Abyss', 160, 'D', 'minor', 32]);
  assert.deepEqual([...A.layers], ['base', 'combat']);
  assert.notEqual(A.bpm, 84, 'not the show theme');
  assert.equal(A.once, undefined, 'a boss track loops');
  const slots = (layer: string): string[] => A.channels.filter((c) => c.layer === layer).map((c) => c.slot).sort();
  assert.deepEqual(slots('base'), ['noi', 'p1', 'p2', 'p3', 'tri']);
  assert.deepEqual(slots('combat'), ['noi', 'p3']);
  assert.equal(new Set(A.channels.map((c) => c.slot)).size, 5, 'three pulse slots, a triangle and a noise slot');
  for (const c of A.channels) assert.equal(c.bars.length, 32, `${c.layer} ${c.slot}`);
  assert.equal(new Set(Object.values(TRACKS)).size, TRACK_IDS.length);
});

test('every note is in D minor, the one exception is the C sharp in the A major chord, and the chords agree', () => {
  assert.deepEqual([...A.chromatic], [1]);
  const stray: string[] = [];
  for (const n of compile(A).notes) if (!n.drum && !inScale(MINOR, n.midi) && n.midi % 12 !== 1) stray.push(`${n.slot} bar ${n.bar + 1} step ${n.step} midi ${n.midi}`);
  assert.deepEqual(stray, []);
  // C sharp is used, in the tunes and not only in the chord.
  const sharps = (c: PitchedChannel): number => c.bars.flat().filter((e) => e.midi % 12 === 1).length;
  assert.ok(sharps(lead) >= 6 && sharps(mirror) >= 6, `${sharps(lead)} and ${sharps(mirror)} C sharps`);
  A.harmony.forEach((sym, bar) => {
    const outside = chordPcs(sym).filter((pc) => !inScale(MINOR, pc));
    assert.deepEqual(outside, sym === 'A' ? [1] : [], `bar ${bar + 1} ${sym}`);
  });
  assert.equal(A.harmony[0], 'Dm');
  // Every block of four opens on a bell bar and closes on the A chord that pulls it back.
  for (let b = 0; b < 8; b++) assert.equal(A.harmony[b * 4 + 3], 'A', `block ${b + 1} ends on A`);
});

// ---------------------------------------------------------------- the motifs

test('the Hawkins motif is in the lead and its inversion is in the second pulse, the same one the Upside Down plays', () => {
  // Block 1 (bars 5 and 6): the lead plays the motif as Static writes it, A5 Bb5 A5 F5 G5 D5.
  assert.deepEqual(lead.bars.slice(4, 6), motifBars());
  assert.deepEqual(line(lead, 4, 2), [...MOTIF_PITCHES]);
  // Block 0 (bars 1 and 2): the second pulse plays it turned over, around D5, snapped to the scale: G F G Bb A D.
  const upside = motifUpsideDown();
  assert.deepEqual(line(mirror, 0, 2), upside);
  assert.deepEqual(upside.map((m) => m % 12), [7, 5, 7, 10, 9, 2]);
  assert.deepEqual(mirror.bars.slice(0, 2), flipBars(motifBars(), MOTIF_AXIS, D_MINOR));
  // It really is an inversion: every interval flipped around the tonic, within the snap to the scale.
  line(mirror, 0, 2).forEach((m, i) => assert.ok(Math.abs(m + MOTIF_PITCHES[i] - 2 * MOTIF_AXIS) <= 1, `note ${i}`));
  // Same steps and lengths as the motif: the two voices move together.
  assert.deepEqual(mirror.bars.slice(0, 2).map((evs) => evs.map((e) => [e.step, e.len])), motifBars().map((evs) => evs.map((e) => [e.step, e.len])));
  // The motif's notes sit in D minor and so does its mirror, so they need no exception.
  for (const m of [...MOTIF_PITCHES, ...upside]) assert.ok(inScale(MINOR, m));
});

test('all the motifs sound at once: the motif, its inversion and the bell together, in blocks 2, 4 and 6', () => {
  const inv = motifUpsideDown();
  const together = (bar: number): string[] => compile(A).notes.filter((n) => n.bar === bar && n.step === 0 && n.layer === 'base' && !n.drum).map((n) => n.slot).sort();
  // Block 2, bars 9 and 10: the tune, its mirror, and the bell strike on the same downbeat as the bass.
  assert.deepEqual(line(lead, 8, 2), [...MOTIF_PITCHES]);
  assert.deepEqual(line(mirror, 8, 2), inv);
  assert.deepEqual(together(8), ['p1', 'p2', 'p3', 'tri']);
  // Block 4, bars 17 and 18: the mirror drops an octave and keeps its rhythm.
  assert.deepEqual(line(lead, 16, 2), [...MOTIF_PITCHES]);
  assert.deepEqual(line(mirror, 16, 2), inv.map((m) => m - 12));
  assert.deepEqual(together(16), ['p1', 'p2', 'p3', 'tri']);
  // Block 6, bars 25 and 26: the two voices swap, so the lead plays the mirror and the second pulse plays the motif.
  assert.deepEqual(line(lead, 24, 2), inv);
  assert.deepEqual(line(mirror, 24, 2), [...MOTIF_PITCHES]);
  assert.deepEqual(together(24), ['p1', 'p2', 'p3', 'tri']);
  // And the first and fourth bars of the loop are not silent either: the mirror alone opens it, over the bell.
  assert.deepEqual(together(0).filter((s) => s === 'p3' || s === 'p2'), ['p2', 'p3']);
  assert.equal(lead.bars[0].length, 0);
  assert.equal(mirror.bars[4].length, 0, 'the motif has block 1 to itself');
  assert.deepEqual(line(lead, 4, 2), [...MOTIF_PITCHES]);
});

test("the bell is the Clock's: a low strike on the first beat of every fourth bar, on the chord's root, ringing for ten steps", () => {
  const strikes = bell.bars.flatMap((evs, bar) => evs.map((e) => ({ bar, ...e })));
  assert.equal(strikes.length, 8);
  for (const s of strikes) {
    assert.equal(s.bar % 4, 0);
    assert.equal(s.step, 0);
    assert.ok(s.len >= 8 && s.len <= 12, `rings ${s.len} steps`);
    assert.ok(s.midi >= 40 && s.midi <= 52, `low: ${s.midi}`);
    assert.equal(s.midi % 12, pitchClass(A.harmony[s.bar].replace(/m$/, '')), `bar ${s.bar + 1} strikes the root of ${A.harmony[s.bar]}`);
  }
  // The same instrument as the Clock's bell, a shade quieter: a hard strike, one second of fade, a slow vibrato.
  const clockBell = CLOCK.channels.find((c) => c.slot === 'p3' && c.layer === 'base') as PitchedChannel;
  assert.deepEqual({ ...bell.inst, vol: 0 }, { ...clockBell.inst, vol: 0 });
  assert.ok(bell.inst.vol < clockBell.inst.vol);
  assert.ok(bell.inst.env.exp && bell.inst.env.d >= 1 && bell.inst.env.s === 0);
  // The combat gallop shares the bell's voice and waits out the strike on a bell bar, and plays on every other bar.
  gallop.bars.forEach((evs, bar) => {
    assert.ok(evs.length > 0, `bar ${bar + 1} gallops`);
    if (bar % 4 === 0) assert.ok(evs.every((e) => e.step >= 10), `bar ${bar + 1} waits for the bell`);
  });
  assert.deepEqual(findOverlaps(A), []);
});

test('it is a boss and not a lullaby: eighths in the bass, a gallop in combat, a clock in the noise, and a fill to turn the block', () => {
  const bass = pitched('tri', 'base');
  assert.equal(bass.bars[5].length, 8, 'eight notes a bar in the body of the track');
  assert.equal(bass.bars[0].length, 2, 'the intro is slow');
  assert.ok(bass.bars[12].length === 2, 'and so is the bridge');
  assert.ok(gallop.bars[1].length === 12 && gallop.bars[1].every((e) => e.len <= 2));
  const ticks = drums('base').bars;
  for (const bar of ticks) assert.deepEqual(bar.map((h) => [h.step, h.drum]), [[2, 'tick'], [6, 'tock'], [10, 'tick'], [14, 'tock']]);
  const kit = new Set(drums('combat').bars.flat().map((h) => h.drum));
  assert.deepEqual([...kit].sort(), ['hat', 'kick', 'snare']);
  assert.notDeepEqual(drums('combat').bars[3], drums('combat').bars[1], 'the fourth bar of a block is a fill');
  // On a bell bar the kick leaves the downbeat to the bell.
  assert.ok(drums('combat').bars[4].every((h) => h.step !== 0));
});

// ---------------------------------------------------------------- the loop

test('the loop closes: nothing overlaps across the seam and the last chord is the dominant, leading home', () => {
  assert.deepEqual(findOverlaps(A), []);
  const last = A.harmony[31];
  assert.equal((pitchClass(last) - pitchClass(A.tonic) + 12) % 12, 7, `ends on ${last}`);
  // The lead's last note is the leading tone, C sharp, which the next lap resolves into the D of the bass.
  assert.equal(lead.bars[31].at(-1)?.midi % 12, 1);
  assert.equal(lead.bars[31].at(-1)?.midi, note('C#6'));
  assert.equal(compile(A).loop, 32 * 16);
  assert.ok(maxVoices(A) <= 5, 'two laps, so a tail across the seam counts');
  for (const n of compile(A).notes) assert.ok(n.abs + n.gate / (n.inst?.gate ?? 1) <= compile(A).loop + 1e-9, 'nothing runs past the end');
});

// ---------------------------------------------------------------- the phases

test('the boss has three tempo phases: 160, 164 and 168 bpm, four more at each step', () => {
  assert.deepEqual([...(A.phases ?? [])], [160, 164, 168]);
  assert.equal(A.phases?.[0], A.bpm, 'the first phase is the track tempo');
  assert.equal(phaseCount(A), 3);
  assert.deepEqual([0, 1, 2].map((p) => phaseBpm(A, p)), [160, 164, 168]);
  assert.deepEqual([0, 1, 2].map((p) => phaseBpm(A, p + 1) - phaseBpm(A, p)), [4, 4, 0]);
  // A phase out of range is the nearest end, and a fraction rounds.
  assert.deepEqual([-1, 3, 99, 1.4, 1.6].map((p) => phaseBpm(A, p)), [160, 168, 168, 164, 168]);
  // Seconds follow: a bar is 1.5 s, then 1.463 s, then 1.429 s, and the whole loop is 48 s, then 46.8 s, then 45.7 s.
  for (const p of [0, 1, 2]) {
    const bpm = phaseBpm(A, p);
    assert.ok(Math.abs(stepSeconds(A, p) - 60 / bpm / 4) < 1e-12);
    assert.ok(Math.abs(barSeconds(A, 5, p) - 240 / bpm) < 1e-12, `bar at phase ${p}`);
    assert.ok(Math.abs(loopSeconds(A, p) - (32 * 240) / bpm) < 1e-9, `loop at phase ${p}`);
    assert.ok(Math.abs(barStartSeconds(A, 8, p) - (8 * 240) / bpm) < 1e-9);
  }
  assert.ok(Math.abs(loopSeconds(A) - 48) < 1e-9);
  // Only the Abyss steps: every other track has one phase and ignores one it is asked for.
  for (const id of TRACK_IDS) {
    if (id === 'abyss') continue;
    assert.equal(phaseCount(TRACKS[id]), 1, id);
    assert.equal(phaseBpm(TRACKS[id], 2), TRACKS[id].bpm, id);
    assert.equal(TRACKS[id].phases, undefined, id);
  }
});

test('at every phase the music still fits: five voices, no overlaps, and a drum never rings into the next hit', () => {
  for (const p of [0, 1, 2]) {
    assert.ok(maxVoices(A, undefined, p) <= 5, `phase ${p} all layers: ${maxVoices(A, undefined, p)}`);
    assert.ok(maxVoices(A, ['base'], p) <= 5 && maxVoices(A, ['combat'], p) <= 5, `phase ${p} by layer`);
  }
  assert.deepEqual(findOverlaps(A), [], 'compiled at the fastest tempo, so it holds at all of them');
  const c = compile(A);
  const hits = c.notes.filter((n) => n.slot === 'noi').sort((a, b) => a.abs - b.abs);
  for (const p of [0, 1, 2]) {
    const step = stepSeconds(A, p);
    hits.forEach((h, i) => {
      const next = hits[i + 1] ?? hits[0];
      const dist = ((next.abs - h.abs + c.loop) % c.loop) * step;
      assert.ok(dist >= DRUM_SECONDS[h.drum!] - 1e-9, `phase ${p}: ${h.drum} at bar ${h.bar + 1} step ${h.step} has ${dist.toFixed(3)} s`);
    });
    // A pitched voice ends before the next one on its slot begins.
    for (const n of c.notes) {
      if (!n.inst) continue;
      const { gate, release } = noteTiming(n, step);
      assert.ok(gate > 0 && gate + release <= (n.gate + n.gap) * step + 1e-9, `phase ${p}: ${n.slot} bar ${n.bar + 1} step ${n.step}`);
    }
  }
});

test('the sequencer plays the phase it is given: every onset sits on the sixteenth grid of that tempo', () => {
  const grid = (phase: number | undefined): number[] => {
    const f = fakeContext();
    scheduleBar(f as unknown as BaseAudioContext, stub() as unknown as AudioNode, A, 0, 10, ['base', 'combat'], phase);
    return onsets(f.voices, 10);
  };
  for (const p of [0, 1, 2]) {
    const step = stepSeconds(A, p);
    const times = grid(p);
    assert.ok(times.length >= 8);
    for (const t of times) assert.ok(Math.abs(t / step - Math.round(t / step)) < 1e-4, `phase ${p}: ${t}`);
    assert.ok(Math.abs(times.at(-1)! - 15 * step) < 1e-4 || Math.abs(times.at(-1)! - 14 * step) < 1e-4, `phase ${p} ends the bar on the grid`);
  }
  // The tick on step 14 is a fixed fraction of a bar, so it lands earlier as the tempo rises.
  const at14 = (p: number): number => grid(p).filter((t) => Math.abs(t / stepSeconds(A, p) - 14) < 1e-4)[0];
  assert.ok(at14(1) < at14(0) && at14(2) < at14(1));
  assert.ok(Math.abs(at14(2) / at14(0) - 160 / 168) < 1e-6);
  // Leave the phase out and it is the first tempo.
  assert.deepEqual(grid(undefined), grid(0));
});

test('an offline render at a phase lays the bars at that tempo, and nowhere else', () => {
  const f = fakeContext();
  scheduleOffline(f as unknown as BaseAudioContext, stub() as unknown as AudioNode, A, 5, ['base'], 0, 2);
  const times = onsets(f.voices, 0);
  const bar = 240 / 168;
  for (let k = 0; k < 3; k++) assert.ok(times.some((t) => Math.abs(t - k * bar) < 1e-6), `bar ${k + 1} starts at ${(k * bar).toFixed(3)}`);
  assert.ok(!times.some((t) => Math.abs(t - 1.5) < 1e-6), 'and not at the first tempo');
  assert.ok(Math.max(...times) < 4 * bar, 'four bars and no more');
});

test('the echo follows the tempo: its delay is three quarters of a beat at whichever phase is playing', () => {
  const f = fakeContext();
  const glides: number[] = [];
  const delay = stub();
  delay.delayTime = { value: 0, setTargetAtTime: (v: number) => { glides.push(v); } };
  f.createDelay = () => delay;
  const rig = createRig(f as unknown as BaseAudioContext, stub() as unknown as AudioNode, A);
  const want = (bpm: number): number => (0.75 * 60) / bpm;
  assert.ok(Math.abs(delay.delayTime.value - want(160)) < 1e-12, 'it starts at the first tempo');
  rig.setBpm(168);
  assert.ok(Math.abs(glides[0] - want(168)) < 1e-12, 'and glides to the new one');
  rig.setBpm(164, true);
  assert.ok(Math.abs(delay.delayTime.value - want(164)) < 1e-12, 'or jumps, for a render');
  assert.equal(glides.length, 1);
  // A track with no echo has nothing to move.
  assert.doesNotThrow(() => createRig(fakeContext() as unknown as BaseAudioContext, stub() as unknown as AudioNode, TRACKS.static).setBpm(100));
});

test('the live driver takes a new phase at the next bar it schedules, and tells the lab which bar is sounding', () => {
  mock.timers.enable({ apis: ['setInterval'] });
  try {
    const f = fakeContext();
    const r = { base: stub(), combat: stub(), sendBase: stub(), sendCombat: stub() };
    const driver = startLive(f as unknown as BaseAudioContext, stub() as unknown as AudioNode, A, r as never, 0.05);
    const at = (time: number): void => { f.currentTime = time; mock.timers.tick(25); };
    // Bar one went out at once, at 160 bpm, and bar two is due at 1.55 s. It is scheduled 0.1 s ahead.
    at(1.4);
    assert.equal(driver.barAt(1.4), 0);
    driver.setPhase(2);
    at(1.46);
    assert.equal(driver.barAt(1.6), 1, 'bar two is the first at 168 bpm');
    // Bar two lasts 1.4286 s, so bar three starts at 2.9786 s and not at 3.05 s.
    at(2.9);
    assert.equal(driver.barAt(2.97), 1);
    assert.equal(driver.barAt(2.99), 2);
    assert.equal(driver.barAt(3.04), 2);
    const bar3 = f.voices.filter((v) => v.t > 2.9 && v.t < 3.2).map((v) => v.t);
    assert.ok(bar3.length > 0 && Math.abs(Math.min(...bar3) - (0.05 + 240 / 160 + 240 / 168)) < 1e-6);
    // Back to the first tempo: the bar already scheduled keeps its length, the next one is long again.
    driver.setPhase(0);
    at(4.35);
    at(5.85);
    assert.equal(driver.barAt(4.42), 3);
    assert.equal(driver.barAt(5.9), 3, 'bar four started at 4.407 and lasts 1.5 s');
    assert.equal(driver.barAt(5.95), 4);
    assert.equal(driver.endAt, null, 'a loop never ends');
    driver.stop();
  } finally {
    mock.timers.reset();
  }
});

test('the audio API steps the phase of the Abyss, ignores it on other tracks, and starts every new track at the first tempo', async () => {
  const f = fakeContext();
  (globalThis as { AudioContext?: unknown }).AudioContext = function () { return f; };
  mock.timers.enable({ apis: ['setInterval', 'setTimeout'] });
  try {
    const { audio } = await import('../src/audio/index.ts');
    const { currentPhase, position } = await import('../src/audio/live.ts');
    const tick = (time: number): void => { f.currentTime = time; mock.timers.tick(25); };
    const barAt = (time: number): number | undefined => { f.currentTime = time; return position()?.bar; };
    assert.equal(audio.trackSeconds('abyss'), 48);
    assert.equal(audio.musicEnded(), false);
    // Asked for before the browser lets sound start: the phase waits with the track, and the first bar is at 168 bpm.
    audio.music('abyss');
    audio.phase(2);
    assert.equal(currentPhase(), 2);
    audio.unlock();
    assert.deepEqual(position(), { id: 'abyss', bar: 0, bars: 32 });
    // Bar one went out at 0.05 s. Bar two is due at 1.4786 s, not at 1.55 s.
    tick(1.4);
    assert.equal(barAt(1.49), 1);
    tick(2.85);
    assert.equal(barAt(2.915), 2, 'and bar three at 2.907 s');
    // Down to the first tempo: bar three was scheduled at 168 bpm and keeps its length, so bar four starts at 4.3357 s.
    // Bar four is scheduled once the phase is 0, so it lasts 1.5 s and bar five starts at 5.8357 s, not at 5.7643 s.
    audio.phase(0);
    tick(4.25);
    assert.equal(barAt(4.34), 3);
    tick(5.75);
    assert.equal(barAt(5.83), 3);
    assert.equal(barAt(5.84), 4);
    // A phase past the last holds at the last: 168 bpm again, so bar six lasts 1.4286 s.
    audio.phase(40);
    assert.equal(currentPhase(), 2);
    tick(7.25);
    tick(8.7);
    assert.equal(barAt(8.74), 5);
    assert.equal(barAt(8.77), 6);
    audio.phase(-3);
    assert.equal(currentPhase(), 0);
    audio.phase(2);
    // Asking for the track that is already playing keeps its phase.
    audio.music('abyss');
    assert.equal(currentPhase(), 2);
    assert.equal(audio.musicEnded(), false, 'a boss track loops and never ends');
    // Another track has one tempo and ignores the call, and going back to the Abyss starts it at the first tempo.
    audio.music('hawkins');
    assert.equal(currentPhase(), 0, 'a new track starts at phase 0');
    audio.phase(2);
    assert.equal(currentPhase(), 0, 'Hawkins has one phase');
    audio.music('abyss');
    assert.equal(currentPhase(), 0);
    f.currentTime = 30;
    audio.music(null);
    audio.music('abyss');
    tick(30.25);
    tick(31.75);
    assert.equal(barAt(31.76), 0, 'bar two of a new run is at 31.81 s, 1.5 s on, and not 1.4286 s');
    assert.equal(barAt(31.82), 1);
    audio.music(null);
  } finally {
    mock.timers.reset();
    delete (globalThis as { AudioContext?: unknown }).AudioContext;
  }
});

// ---------------------------------------------------------------- levels

/**
 * What the offline renders said, through the same limiter the game uses: two laps of the loop (96 s), so an echo tail across the
 * seam counts: the base layer and the full combat mix at the first tempo, and the combat mix again at the last. peak is the largest sample after the limiter,
 * limiterDb the largest gain reduction in 20 ms windows (0.0001 is the compressor's own rounding), rmsDb the loudness,
 * clipped the samples at full scale. The other tracks, rendered the same way: base peaks 0.47 to 0.71 at -16.2 to -18.4 dB
 * and combat peaks 0.63 to 0.79 at -16.7 to -18.3 dB; the Clock, which this one stands beside, is 0.52 at -18.4 dB and 0.77
 * at -16.9 dB.
 */
const MEASURED = {
  print: 'bb0c93c1',
  base: { peak: 0.744, limiterDb: 0.0001, rmsDb: -16.18, clipped: 0 },
  combat: { peak: 0.764, limiterDb: 0.0001, rmsDb: -16.76, clipped: 0 },
  fastest: { peak: 0.7629, limiterDb: 0.0001, rmsDb: -16.72, clipped: 0 },
};

test('base and combat render without clipping at every phase: peak under 0.9, limiter under 3 dB, as loud as the other tracks', async () => {
  const Offline = (globalThis as { OfflineAudioContext?: unknown }).OfflineAudioContext;
  if (Offline) {
    const { renderOffline } = await import('../src/audio/render.ts');
    for (const [combat, phase] of [[false, 0], [true, 0], [true, 2]] as const) {
      const m = await renderOffline('abyss', 96, { combat, phase });
      assert.ok(m.peak < 0.9, `${combat ? 'combat' : 'base'} phase ${phase} peak ${m.peak}`);
      assert.ok(m.limiterDb < 3, `${combat ? 'combat' : 'base'} phase ${phase} limiter ${m.limiterDb}`);
      assert.equal(m.clipped, 0);
    }
    return;
  }
  assert.equal(print(A as Track), MEASURED.print, 'The Abyss changed since it was rendered: render it again (audio lab R, or renderOffline) and update MEASURED');
  for (const [name, m] of [['base', MEASURED.base], ['combat', MEASURED.combat], ['fastest', MEASURED.fastest]] as const) {
    assert.ok(m.peak > 0.2 && m.peak < 0.9, `${name} peak ${m.peak}`);
    assert.ok(m.limiterDb >= 0 && m.limiterDb < 3, `${name} limiter ${m.limiterDb}`);
    assert.equal(m.clipped, 0, `${name} clips`);
    assert.ok(m.rmsDb > -20 && m.rmsDb < -14, `${name} rms ${m.rmsDb}`);
  }
  assert.ok(Math.abs(MEASURED.base.rmsDb - -17.3) <= 2 && Math.abs(MEASURED.combat.rmsDb - -17.5) <= 2, "within two dB of the other tracks' loudness");
  assert.ok(Math.abs(MEASURED.fastest.peak - MEASURED.combat.peak) < 0.1, 'and the faster tempo is not hotter');
});
