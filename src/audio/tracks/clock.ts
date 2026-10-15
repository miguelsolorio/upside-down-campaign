// The Clock: the boss track. G minor, 150 bpm, 32 bars. A thin pulse runs sixteenths without a break. On the
// first beat of every fourth bar a low bell strikes, and the bar around it thins out so it can ring. The lead
// is the title motif flipped around G (F Eb F A G C), with a ghost of the bell's fifth above the strike.
// Base: sixteenths, triangle bass, bell, motif, a noise clock. Combat: a pumping bass that shares the bell's
// slot after it has rung, plus drums that share the noise slot with the clock. Original.
import type { DrumEv, Inst, NoteEv, Track } from './types.ts';
import { ev, grid, hit, pool, rootNear } from './theory.ts';
import { CLOCK_AXIS, G_MINOR, flipBars, motifBars } from './motif.ts';

const BARS = 32;

// Eight blocks of four bars, and the bell strikes on each block's first bar. The blocks that carry the lead
// run Gm, Bb, F, Cm: the motif lands on Bb and F, the answer on Cm. The last block ends on D major, the one
// chord with a sharp (F sharp, the leading tone), which pulls the loop back to Gm.
const HARMONY: readonly string[] = [
  'Gm', 'Gm', 'Eb', 'Eb',
  'Gm', 'Eb', 'Bb', 'F',
  'Gm', 'Bb', 'F', 'Cm',
  'Eb', 'Eb', 'Cm', 'Cm',
  'Gm', 'Bb', 'F', 'Cm',
  'Cm', 'Cm', 'Bb', 'F',
  'Gm', 'Bb', 'F', 'Cm',
  'Gm', 'Bb', 'F', 'D',
];
const LEAD_BLOCKS = [2, 4, 6, 7];

const isBell = (bar: number): boolean => bar % 4 === 0;
const isTurn = (bar: number): boolean => bar % 4 === 3;

const BASS: Inst = { wave: 'tri', vol: 0.23, env: { a: 0.004, d: 0, s: 1, r: 0.03 }, gate: 0.85 };
// A bell is a hard strike and a long fade. The slow vibrato stands in for the beating of a real bell's hum.
const BELL: Inst = {
  wave: 'p25', vol: 0.34, env: { a: 0.002, d: 1, s: 0, r: 0.2, exp: true }, gate: 1,
  vib: { rate: 3.4, cents: 22, delay: 0.05 }, send: 0.9,
};
const TICKS: Inst = { wave: 'p12', vol: 0.13, env: { a: 0.001, d: 0.05, s: 0.35, r: 0.02 }, gate: 0.6 };
const LEAD: Inst = {
  wave: 'p25', vol: 0.19, env: { a: 0.01, d: 0.1, s: 0.8, r: 0.12 }, gate: 0.93,
  vib: { rate: 5.5, cents: 20, delay: 0.25 }, send: 0.4,
};
const PUMP: Inst = { wave: 'p50', vol: 0.26, env: { a: 0.002, d: 0.12, s: 0.6, r: 0.03 }, gate: 0.75 };

// ---- base: bass. Quarter notes on the root with the fifth on the last beat. The bell bar rests on the first
// beat, so the strike has the room.
const bass: NoteEv[][] = HARMONY.map((sym, bar) => {
  const root = rootNear(sym, 42, 36, 48);
  const notes = [[0, 0], [4, 0], [8, 0], [12, 7]] as const;
  return notes
    .filter(([step]) => !(isBell(bar) && step === 0))
    .map(([step, off]) => ev(step, 3, root + off));
});

// ---- base: sixteenths. The root bounces off its octave and the chord tones climb above it. Index 0 is the
// third, 1 the fifth, 2 the octave, 3 the third an octave up and 4 the fifth an octave up: the window
// from root + 3 to root + 19 holds each of the three tones in that order. -1 is the root.
const CELL_PLAIN = [-1, 2, -1, 2, -1, 2, -1, 2, -1, 2, -1, 2, -1, 2, 1, 0];
const CELL_LEAD = [-1, 1, 2, 1, -1, 1, 2, 3, -1, 1, 2, 1, -1, 2, 1, 0];
const ACCENT = [1, 0.5, 0.7, 0.5, 0.85, 0.5, 0.7, 0.5, 0.9, 0.5, 0.7, 0.5, 0.85, 0.5, 0.7, 0.55];
const sixteenths: NoteEv[][] = HARMONY.map((sym, bar) => {
  const root = rootNear(sym, 55, 50, 61);
  const up = pool(sym, root + 3, root + 19);
  const cell = LEAD_BLOCKS.includes(Math.floor(bar / 4)) ? CELL_LEAD : CELL_PLAIN;
  return cell.map((k, step) => ev(step, 1, k < 0 ? root : up[Math.min(k, up.length - 1)], ACCENT[step]));
});

// ---- base: the bell, low, on the first beat of the first bar of every block. It rings for ten steps.
const BELL_STEPS = 10;
const bellRoot = (bar: number): number => rootNear(HARMONY[bar], 48, 40, 52);
const bell: NoteEv[][] = HARMONY.map((_, bar) => (isBell(bar) ? [ev(0, BELL_STEPS, bellRoot(bar))] : []));

// ---- base: the lead. The motif flipped around G (F Eb F A G C) on the second and third bars of a lead
// block, an answer in the fourth. The first bar of every block carries a ghost above the bell instead: the
// bell's fifth an octave up, struck softly.
const motif = flipBars(motifBars(), CLOCK_AXIS, G_MINOR);
// The answers are new: Eb D C falls onto the minor chord, and Bb C D climbs onto the D major chord.
const ANSWER_CM: NoteEv[] = [ev(0, 6, 'Eb5'), ev(6, 2, 'D5'), ev(8, 7, 'C5')];
const ANSWER_D: NoteEv[] = [ev(0, 6, 'Bb4'), ev(6, 2, 'C5'), ev(8, 7, 'D5')];
const lead: NoteEv[][] = HARMONY.map((sym, bar) => {
  const block = Math.floor(bar / 4);
  const at = bar % 4;
  if (at === 0) return [ev(0, 3, bellRoot(bar) + 19, 0.5)];
  if (!LEAD_BLOCKS.includes(block)) return [];
  if (at === 1 || at === 2) return motif[at - 1];
  return sym === 'D' ? ANSWER_D : ANSWER_CM;
});

// ---- base: the noise clock. Tick, tock, tick, tock on the off-beat eighths, quiet.
const tickBar: DrumEv[] = [hit(2, 'tick', 0.5), hit(6, 'tock', 0.5), hit(10, 'tick', 0.5), hit(14, 'tock', 0.5)];
const ticks: DrumEv[][] = Array.from({ length: BARS }, () => tickBar);

// ---- combat: the pump. Eighths on the root, an octave up on beats two and four, a fifth at the end of the
// bar. On a bell bar it waits until the bell has rung (step 12). Every fourth bar it climbs.
const PUMP_EASY = [[0, 0], [2, 0], [4, 12], [6, 0], [8, 0], [10, 0], [12, 12], [14, 7]] as const;
const PUMP_TURN = [[0, 0], [2, 0], [4, 12], [6, 0], [8, 7], [10, 7], [12, 12], [14, 12]] as const;
const pump: NoteEv[][] = HARMONY.map((sym, bar) => {
  const root = rootNear(sym, 49, 43, 55);
  const pattern = isTurn(bar) ? PUMP_TURN : PUMP_EASY;
  return pattern
    .filter(([step]) => !isBell(bar) || step >= 12)
    .map(([step, off]) => ev(step, 2, root + off, step % 4 === 0 ? 1 : 0.8));
});

// ---- combat: drums. Kick on one and three, snare on two and four, hats on the sixteenth after each tick.
// A step is only 0.1 s and kick and snare ring 0.14 s or more, so nothing sits on the step after one.
const groove = grid({ kick: 'X.......x.......', snare: '....X.......X...', hat: '...o...o...o...o' });
const fill = grid({ kick: 'X...............', snare: '....x...x..X....', hat: '...o...o.......o' });
const drums: DrumEv[][] = Array.from({ length: BARS }, (_, bar) => (isTurn(bar) ? fill : groove));

export const CLOCK: Track = {
  id: 'clock',
  title: 'The Clock',
  bpm: 150,
  tonic: 'G',
  mode: 'minor',
  // 6 is F sharp: the leading tone in the D major bar that closes the loop.
  chromatic: [6],
  bars: BARS,
  layers: ['base', 'combat'],
  harmony: HARMONY,
  echo: { beats: 0.75, feedback: 0.4, mix: 0.4, cutoff: 3000 },
  channels: [
    { slot: 'tri', layer: 'base', inst: BASS, bars: bass },
    { slot: 'p2', layer: 'base', inst: TICKS, bars: sixteenths },
    { slot: 'p3', layer: 'base', inst: BELL, bars: bell },
    { slot: 'p1', layer: 'base', inst: LEAD, bars: lead },
    { slot: 'noi', layer: 'base', bars: ticks },
    { slot: 'p3', layer: 'combat', inst: PUMP, bars: pump },
    { slot: 'noi', layer: 'combat', bars: drums },
  ],
};
