// Flattens a track into a timeline the sequencer plays and the tests inspect. Pure.
import type { Drum, Inst, LayerId, Slot, Track } from './types.ts';
import { DRUM_SECONDS, STEPS_PER_BAR } from './theory.ts';

export interface CNote {
  slot: Slot;
  layer: LayerId;
  /** Index of the channel in track.channels. */
  ch: number;
  bar: number;
  /** Sixteenths from the bar line. */
  step: number;
  /** Sixteenths from the loop start. */
  abs: number;
  /** Sixteenths the key stays down. */
  gate: number;
  /** Sixteenths from the gate end to the next onset on this slot, wrapping the loop. Negative means the data overlaps. */
  gap: number;
  /** 0 for drums. */
  midi: number;
  drum: Drum | null;
  vel: number;
  inst: Inst | null;
}

export interface Compiled {
  bars: number;
  stepSec: number;
  /** The step each bar starts on, counted from the loop start. One extra entry holds the loop length. */
  starts: readonly number[];
  /** Loop length in sixteenths. */
  loop: number;
  notes: CNote[];
  byBar: CNote[][];
}

const cache = new WeakMap<Track, Compiled>();

/** How many tempo phases the track has: one unless it lists `phases`. */
export function phaseCount(track: Track): number {
  return track.phases?.length ?? 1;
}

/** Tempo of a phase in bpm. A phase outside the list is clamped to its nearest end. */
export function phaseBpm(track: Track, phase = 0): number {
  const list = track.phases;
  if (!list || list.length === 0) return track.bpm;
  return list[Math.max(0, Math.min(list.length - 1, Math.round(phase)))];
}

/** Seconds in one sixteenth at the tempo of `phase`. */
export function stepSeconds(track: Track, phase = 0): number { return 60 / phaseBpm(track, phase) / 4; }

/** Steps in each bar: track.barSteps, or sixteen everywhere when the track does not set it. */
export function barLengths(track: Track): readonly number[] {
  const given = track.barSteps;
  if (!given) return Array.from({ length: track.bars }, () => STEPS_PER_BAR);
  if (given.length !== track.bars) throw new Error(`${track.id} has ${given.length} barSteps for ${track.bars} bars`);
  return given;
}

function startsOf(track: Track): number[] {
  const starts = [0];
  for (const len of barLengths(track)) starts.push(starts[starts.length - 1] + len);
  return starts;
}

/** Seconds in one bar of the loop. The bar wraps, so any non-negative index works. */
export function barSeconds(track: Track, bar = 0, phase = 0): number {
  const c = compile(track);
  const i = ((bar % c.bars) + c.bars) % c.bars;
  return stepSeconds(track, phase) * (c.starts[i + 1] - c.starts[i]);
}

/** Seconds one pass of the track takes at the tempo of `phase`: a scene's clock when the music cannot play. */
export function loopSeconds(track: Track, phase = 0): number {
  return compile(track).loop * stepSeconds(track, phase);
}

/** The sixteenth step where bar `barIndex` starts, counted from the start of play. The index may run past the loop. */
export function barStartSteps(track: Track, barIndex: number): number {
  const c = compile(track);
  const laps = Math.floor(barIndex / c.bars);
  return laps * c.loop + c.starts[barIndex - laps * c.bars];
}

/** Seconds from the start of play to the start of bar `barIndex`, if the whole piece plays at one phase's tempo. */
export function barStartSeconds(track: Track, barIndex: number, phase = 0): number {
  return barStartSteps(track, barIndex) * stepSeconds(track, phase);
}

/** Which bar of the loop is sounding `seconds` after play started. */
export function barAt(track: Track, seconds: number): number {
  const c = compile(track);
  const loopSec = c.loop * c.stepSec;
  const t = ((seconds % loopSec) + loopSec) % loopSec;
  let bar = 0;
  while (bar + 1 < c.bars && c.starts[bar + 1] * c.stepSec <= t) bar++;
  return bar;
}

export function compile(track: Track): Compiled {
  const cached = cache.get(track);
  if (cached) return cached;
  const stepSec = stepSeconds(track);
  // A drum rings for a fixed number of seconds, so it spans more steps at a faster tempo. Its length in steps is
  // taken at the fastest phase, which makes the gaps (and so findOverlaps) hold at every phase.
  const drumStepSec = Math.min(stepSec, ...(track.phases ?? []).map((bpm) => 60 / bpm / 4));
  const starts = startsOf(track);
  const loop = starts[track.bars];
  const notes: CNote[] = [];
  track.channels.forEach((c, ch) => {
    for (let bar = 0; bar < c.bars.length; bar++) {
      const base = starts[bar];
      if (c.slot === 'noi') {
        for (const e of c.bars[bar]) {
          notes.push({
            slot: 'noi', layer: c.layer, ch, bar, step: e.step, abs: base + e.step,
            gate: DRUM_SECONDS[e.drum] / drumStepSec, gap: 0, midi: 0, drum: e.drum, vel: e.vel ?? 1, inst: null,
          });
        }
      } else {
        for (const e of c.bars[bar]) {
          notes.push({
            slot: c.slot, layer: c.layer, ch, bar, step: e.step, abs: base + e.step,
            gate: e.len * c.inst.gate, gap: 0, midi: e.midi, drum: null, vel: e.vel ?? 1, inst: c.inst,
          });
        }
      }
    }
  });
  // The gap to the next onset on the same slot, across layers, wrapping the loop.
  const bySlot = new Map<Slot, CNote[]>();
  for (const n of notes) {
    const list = bySlot.get(n.slot) ?? [];
    list.push(n);
    bySlot.set(n.slot, list);
  }
  for (const list of bySlot.values()) {
    list.sort((a, b) => a.abs - b.abs);
    list.forEach((n, i) => {
      const nextAbs = i + 1 < list.length ? list[i + 1].abs : list[0].abs + loop;
      n.gap = nextAbs - (n.abs + n.gate);
    });
  }
  notes.sort((a, b) => a.abs - b.abs);
  const byBar: CNote[][] = Array.from({ length: track.bars }, () => []);
  for (const n of notes) byBar[n.bar].push(n);
  const out: Compiled = { bars: track.bars, stepSec, starts, loop, notes, byBar };
  cache.set(track, out);
  return out;
}

/** The notes that overlap another on the same slot, as readable lines. Empty means the data is clean. */
export function findOverlaps(track: Track): string[] {
  return compile(track).notes
    .filter((n) => n.gap < -1e-9)
    .map((n) => `${n.slot} bar ${n.bar + 1} step ${n.step} overlaps the next note by ${(-n.gap).toFixed(2)} sixteenths`);
}

/**
 * How long a pitched voice is held and how long it releases, in seconds. The sequencer plays exactly this.
 * The release uses the quiet before the next note on the slot but never more. When there is none, the gate
 * gives up its last few milliseconds, so one voice ends before the next begins and a slot never sounds
 * twice at once.
 */
export function noteTiming(n: CNote, stepSec: number): { gate: number; release: number } {
  if (!n.inst) return { gate: n.gate * stepSec, release: 0 };
  const room = Math.max(0, n.gap * stepSec);
  const release = Math.min(n.inst.env.r, Math.max(0.004, room));
  const span = (n.gate + n.gap) * stepSec;
  return { gate: Math.min(n.gate * stepSec, Math.max(0.01, span - release - 0.0002)), release };
}

/** [start, end) in seconds for each note, release tail included, at the tempo of `phase`. */
export function voiceSpans(track: Track, layers?: readonly LayerId[], phase = 0): [number, number][] {
  const c = compile(track);
  const stepSec = stepSeconds(track, phase);
  const spans: [number, number][] = [];
  for (const n of c.notes) {
    if (layers && !layers.includes(n.layer)) continue;
    const t = noteTiming(n, stepSec);
    const start = n.abs * stepSec;
    spans.push([start, start + t.gate + t.release]);
  }
  return spans;
}

/** The most voices sounding at once over two trips around the loop, so a tail that crosses the seam is counted. */
export function maxVoices(track: Track, layers?: readonly LayerId[], phase = 0): number {
  const loop = loopSeconds(track, phase);
  const events: [number, number][] = [];
  for (const [a, b] of voiceSpans(track, layers, phase)) {
    for (const shift of [0, loop]) {
      events.push([a + shift, 1]);
      events.push([b + shift, -1]);
    }
  }
  // At the same instant, ends sort before starts: a voice that stops as another starts is not an overlap.
  events.sort((x, y) => x[0] - y[0] || x[1] - y[1]);
  let live = 0;
  let max = 0;
  for (const [, d] of events) {
    live += d;
    if (live > max) max = live;
  }
  return max;
}
