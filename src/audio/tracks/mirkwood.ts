// Mirkwood: the forest track. A minor, 76 bpm, 32 bars. The base layer is a drone, sparse bells and a
// ticking clock. The combat layer adds noise drums, a driving eighth-note bass and a stab arp.
// intensity() crossfades the two. Five voices in all: the layers share the noise slot, and the tick
// and drum steps never collide, so the polyphony never passes five. Original.
import type { DrumEv, Inst, NoteEv, Track } from './types.ts';
import { arpBars, bassBars, ev, grid, hit, rest, rootNear } from './theory.ts';

// Four-bar blocks. Mostly home on Am, with excursions to F and Dm, and a closing E that pulls back to Am.
const BLOCKS: readonly (readonly [string, number])[] = [
  ['Am', 8], ['F', 4], ['Am', 4], ['Dm', 4], ['Am', 4], ['F', 4], ['E', 4],
];
const HARMONY: readonly string[] = BLOCKS.flatMap(([sym, n]) => Array.from({ length: n }, () => sym));

const DRONE: Inst = {
  wave: 'tri', vol: 0.22, env: { a: 0.05, d: 0, s: 1, r: 0.03 }, gate: 1,
  vib: { rate: 0.5, cents: 7, delay: 1.2 },
};
const BELL: Inst = { wave: 'p25', vol: 0.26, env: { a: 0.002, d: 1.1, s: 0, r: 0.15, exp: true }, gate: 1, send: 0.8 };
const DRIVE: Inst = { wave: 'p25', vol: 0.32, env: { a: 0.002, d: 0.16, s: 0.55, r: 0.04 }, gate: 0.72 };
const STAB: Inst = { wave: 'p12', vol: 0.2, env: { a: 0.002, d: 0.09, s: 0, r: 0.03 }, gate: 0.6, send: 0.2 };

// ---- base: drone. One long note per block, in the octave nearest the last one.
function drone(): NoteEv[][] {
  const bars = rest<NoteEv>(32);
  let bar = 0;
  let prev = 48;
  for (const [sym, n] of BLOCKS) {
    const midi = rootNear(sym, prev, 43, 55);
    prev = midi;
    bars[bar].push({ step: 0, len: n * 16, midi, vel: 1 });
    bar += n;
  }
  return bars;
}

// ---- base: bells as [bar, step, note]. Each is at least six sixteenths from the next, so it can ring out.
// G sharp is the leading tone of the closing E block.
const BELLS: readonly (readonly [number, number, string])[] = [
  [0, 0, 'E6'], [0, 10, 'C6'], [1, 4, 'A5'], [2, 2, 'B5'], [2, 12, 'E5'], [3, 8, 'A5'],
  [4, 6, 'A5'], [5, 0, 'C6'], [5, 12, 'E6'], [6, 8, 'D6'], [7, 2, 'B5'], [7, 10, 'A5'],
  [8, 0, 'C6'], [8, 9, 'A5'], [9, 6, 'F5'], [10, 2, 'G5'], [10, 12, 'E6'], [11, 8, 'C6'],
  [12, 4, 'E6'], [13, 2, 'B5'], [13, 11, 'G5'], [14, 6, 'C6'], [15, 0, 'A5'], [15, 10, 'E5'],
  [16, 0, 'D6'], [16, 10, 'A5'], [17, 5, 'F5'], [18, 2, 'E5'], [18, 12, 'C6'], [19, 8, 'A5'],
  [20, 0, 'A5'], [20, 9, 'E6'], [21, 6, 'C6'], [22, 4, 'B5'], [22, 13, 'G5'], [23, 8, 'E5'],
  [24, 4, 'A5'], [25, 0, 'F5'], [25, 10, 'C6'], [26, 6, 'E6'], [27, 2, 'G5'], [27, 9, 'A5'],
  [28, 0, 'B5'], [28, 8, 'G#5'], [29, 4, 'E5'], [30, 0, 'D6'], [30, 10, 'B5'], [31, 6, 'G#5'],
];
function bells(): NoteEv[][] {
  const bars = rest<NoteEv>(32);
  for (const [bar, step, name] of BELLS) bars[bar].push(ev(step, 6, name, 0.9));
  return bars;
}

// ---- base: the clock. Tick and tock on the off-beat eighths. The last tick of every four bars is
// missing, which leaves room for the drum fill and sounds like a skipped beat.
const ticks: DrumEv[][] = Array.from({ length: 32 }, (_, bar) => [
  hit(2, 'tick', 0.5), hit(6, 'tock', 0.5), hit(10, 'tick', 0.5),
  ...(bar % 4 === 3 ? [] : [hit(14, 'tock', 0.5)]),
]);

// ---- combat: bass. Root, root, octave, root, repeated. Root, fifth and octave fit every chord.
const DRIVING = [[0, 2, 0], [2, 2, 0], [4, 2, 12], [6, 2, 0], [8, 2, 0], [10, 2, 0], [12, 2, 12], [14, 2, 7]] as const;
const TURNING = [[0, 2, 0], [2, 2, 0], [4, 2, 12], [6, 2, 0], [8, 2, 7], [10, 2, 7], [12, 2, 12], [14, 2, 12]] as const;
const bass = bassBars(HARMONY, { range: [33, 45], notes: (bar) => (bar % 4 === 3 ? TURNING : DRIVING) });

// ---- combat: stabs on the off-beat eighths, a different run of chord tones in each bar of the block
const STAB_RUNS = [[3, 4, 5, 4], [4, 5, 6, 5], [3, 5, 4, 6], [6, 5, 4, 3]] as const;
const stabs: NoteEv[][] = HARMONY.map((sym, bar) =>
  arpBars([sym], { win: [57, 81], steps: [2, 6, 10, 14], idx: STAB_RUNS[bar % 4], len: 1.5, vel: [1, 0.8, 0.9, 0.8] })[0],
);

// ---- combat: drums. Hats sit on the odd steps so the clock keeps the even off-beats.
const groove = grid({ kick: 'X.......x.......', snare: '....X.......X...', hat: '.o.o.o.o.o.o.o.o' });
const fill = grid({ kick: 'X.......x.......', snare: '....X.......xxxx', hat: '.o.o.o.o.o.o....' });
const drums: DrumEv[][] = Array.from({ length: 32 }, (_, bar) => (bar % 4 === 3 ? fill : groove));

export const MIRKWOOD: Track = {
  id: 'mirkwood',
  title: 'Mirkwood',
  bpm: 76,
  tonic: 'A',
  mode: 'minor',
  // 8 is G sharp: the leading tone in the closing E major block.
  chromatic: [8],
  bars: 32,
  layers: ['base', 'combat'],
  harmony: HARMONY,
  echo: { beats: 0.75, feedback: 0.42, mix: 0.5, cutoff: 2400 },
  channels: [
    { slot: 'tri', layer: 'base', inst: DRONE, bars: drone() },
    { slot: 'p1', layer: 'base', inst: BELL, bars: bells() },
    { slot: 'noi', layer: 'base', bars: ticks },
    { slot: 'p2', layer: 'combat', inst: DRIVE, bars: bass },
    { slot: 'p3', layer: 'combat', inst: STAB, bars: stabs },
    { slot: 'noi', layer: 'combat', bars: drums },
  ],
};
