// Hellfire: Eddie's solo, for the note highway (src/solo, docs/chapter-4.md). E minor, 150 bpm, 44 bars in two sections.
// 150 bpm makes a sixteenth step exactly 0.1 s, six frames at 60 fps, so a chart frame is six times a step with no rounding.
//   The riff, bars 1 to 4: Eddie's special. Four bars with the last one cut to 12 steps, 60 steps, exactly 6 s.
//   The rooftop, bars 5 to 44: the 4.3 song, 40 bars of 16 steps, 64 s. Intro, verse, build, chorus, bridge, final chorus.
// Both are one riff, a gallop on the low E under a lead that climbs and falls: the riff is the verse's first three bars, note for note.
// The lead is the part the highway is read from (src/solo/chart.ts): every lead note two sixteenths or longer is a gem, and a
// note of one sixteenth is a flourish that sounds and is never charted. A gem's lane is its pitch: D5 and under is Attack, E5
// to A5 Special, B5 and up Crit. So the lead is written on a grid and it is the only part to move a note on the highway.
// Voices: lead on a square (p50) with a quick vibrato and a dotted-eighth echo, the rhythm guitar a palm-muted chug on a
// quarter-duty pulse (p25), the fifth above it a thin pulse (p12) that makes it a power chord, a triangle bass on the same
// rhythm, and drums on the noise slot. A kick or a snare rings 1.5 steps, so nothing sits on the step after one.
// Original: a gallop, E minor with the flat two (F natural) as the grind, and a climb to the chorus. No borrowed riff.
import type { DrumEv, Inst, NoteEv, Track } from './types.ts';
import { bassBars, ev, grid, rootNear } from './theory.ts';

/** Where the two sections sit in the track: a first bar and a length in bars. src/solo/chart.ts reads these. */
export const SOLO_SECTIONS = {
  riff: { bar: 0, bars: 4 },
  rooftop: { bar: 4, bars: 40 },
} as const;

const BARS = 44;
/** The riff's last bar is three beats, so the riff is 60 steps. */
const BAR_STEPS: readonly number[] = Array.from({ length: BARS }, (_, b) => (b === 3 ? 12 : 16));

// One chord a bar. The riff is Em Em C D and the rooftop starts on it; the build leans on Am and ends on Bm, the dominant,
// and the song ends on D, the flat seven, which falls back onto Em.
const HARMONY: readonly string[] = [
  'Em', 'Em', 'C', 'D',
  'Em', 'Em', 'C', 'D',
  'Em', 'Em', 'C', 'D', 'Em', 'Em', 'G', 'D',
  'Am', 'Am', 'C', 'Bm',
  'Em', 'C', 'G', 'D', 'Em', 'C', 'D', 'Bm',
  'Am', 'Am', 'Em', 'Em', 'C', 'C', 'D', 'Bm',
  'Em', 'C', 'G', 'D', 'Em', 'C', 'D', 'D',
];

// ---- the lead. One string a bar: notes as "step pitch length", split by "|". A length of 1 is a flourish, not a gem.
const R0 = '0 E5 3|4 B5 2|8 G5 4|13 F#5 1|14 E5 1|15 D5 1';
const R1 = '0 B4 3|4 E5 2|8 B5 4|13 A5 1|14 G5 1|15 E5 1';
const R2 = '0 G5 4|6 E5 2|10 C5 4|14 D5 1|15 E5 1';
const L: readonly string[] = [
  // the riff (bars 1 to 4)
  R0, R1, R2, '0 D5 2|4 D6 8',
  // the rooftop: intro, four bars that only call
  '0 B4 12',
  '0 G5 6|8 F#5 4',
  '0 E5 6|8 G5 8',
  '0 A5 4|6 D5 8',
  // verse, eight bars: the riff, then the grind
  R0, R1, R2,
  '0 A5 4|4 F#5 4|8 D5 6|14 E5 1|15 F#5 1',
  '0 E5 3|4 F5 2|8 G5 4|13 F#5 1|14 E5 1|15 D5 1',
  '0 B4 3|4 E5 2|8 B5 4|13 A5 1|14 G5 1|15 F#5 1',
  '0 D5 4|4 G5 4|8 B5 6|14 A5 1|15 G5 1',
  '0 A5 4|4 F#5 4|8 D5 8',
  // build, four bars that climb through all three lanes
  '0 C5 4|4 E5 4|8 A5 6',
  '0 B4 4|4 G5 4|8 B5 6|14 A5 1|15 B5 1',
  '0 E5 4|4 G5 2|6 C6 2|8 E6 8',
  '0 B4 2|2 D5 2|4 F#5 2|6 B5 2|8 F#6 8',
  // chorus, eight bars: the hook climbs, then falls
  '0 B4 4|4 E5 4|8 B5 4|12 E6 4',
  '0 C6 6|8 G5 4|12 C5 4',
  '0 D5 4|4 G5 4|8 B5 4|12 D6 4',
  '0 F#6 6|8 E6 2|10 D6 2|12 A5 4',
  '0 E6 4|4 B5 4|8 G5 4|12 D5 4',
  '0 B4 4|4 G5 4|8 C6 4|12 E6 4',
  '0 D5 2|2 E5 2|4 F#5 4|8 A5 4|12 D6 4',
  '0 F#6 8|8 D6 4|12 B4 4',
  // bridge, eight bars: arpeggios, half notes first, then the climb
  '0 A4 4|6 E5 2|8 A5 8',
  '0 C6 4|6 B5 2|8 C5 8',
  '0 B4 4|6 E5 2|8 G5 8',
  '0 E6 4|6 D6 2|8 B5 8',
  '0 C5 2|2 E5 2|4 G5 2|6 C6 2|8 E6 8',
  '0 G5 4|4 E5 2|6 C5 2|8 G5 4|12 C6 4',
  '0 D5 4|4 A5 2|6 D6 2|8 F#6 4|12 A5 4',
  '0 B4 2|2 F#5 2|4 B5 2|6 D6 2|8 F#6 2|10 D6 6',
  // final chorus, eight bars: the hook again, a gem every eighth in the last four
  '0 B4 2|2 E5 2|4 B5 4|8 E6 4|12 B5 4',
  '0 C6 4|4 G5 2|6 E5 2|8 C5 4|12 G5 4',
  '0 D5 2|2 G5 2|4 B5 2|6 D6 2|8 G6 8',
  '0 F#6 4|4 E6 2|6 D6 2|8 A5 4|12 D5 4',
  '0 E6 2|2 B5 2|4 G5 2|6 D5 2|8 G5 4|12 B5 4',
  '0 C5 2|2 G5 2|4 C6 2|6 E6 2|8 G6 8',
  '0 D5 2|2 E5 2|4 F#5 2|6 A5 2|8 D6 8',
  '0 A5 4|4 D6 4|8 F#6 8',
];
const lead: NoteEv[][] = L.map((s) => s.split('|').map((t) => {
  const [step, pitch, len] = t.split(' ');
  return ev(Number(step), Number(len), pitch);
}));

// ---- the chugs. A cell is [step, length, semitones above the root, velocity]. The rhythm guitar plays the root and the
// thin pulse above it plays the fifth on the same cell, so the pair is a power chord. The bass plays the root, a step
// slower, and only where the cell says.
type Cell = readonly (readonly [number, number, number, number])[];
const eighths = (accent: readonly number[]): Cell => accent.map((v, i) => [i * 2, 2, 0, v] as const);
const GALLOP: Cell = [
  [0, 2, 0, 1], [2, 1, 0, 0.7], [3, 1, 0, 0.75], [4, 2, 0, 0.9], [6, 1, 0, 0.7], [7, 1, 0, 0.75],
  [8, 2, 0, 1], [10, 1, 0, 0.7], [11, 1, 0, 0.75], [12, 2, 0, 0.9], [14, 1, 0, 0.7], [15, 1, 0, 0.75],
];
const CELLS: Record<string, Cell> = {
  gallop: GALLOP,
  eighths: eighths([1, 0.7, 0.85, 0.7, 1, 0.7, 0.85, 0.7]),
  // the same eighths with the octave popping on the "and" of two and four
  pops: eighths([1, 0.7, 0.85, 0.7, 1, 0.7, 0.85, 0.7]).map(([s, l, o, v]) => [s, l, s === 6 || s === 14 ? 12 : o, v] as const),
  sixteenths: Array.from({ length: 16 }, (_, s) => [s, 1, s % 4 === 3 ? 12 : 0, s % 4 === 0 ? 1 : s % 2 ? 0.6 : 0.75] as const),
  // open power chords on the beats, held, for the intro and the chorus
  stab: [[0, 6, 0, 1], [8, 6, 0, 1]],
  open: [[0, 8, 0, 1], [8, 4, 0, 0.9], [12, 4, 0, 0.9]],
  // the riff's last bar: four eighths, a breath, and the closing hit held to the bar line
  end: [[0, 2, 0, 1], [2, 2, 0, 0.75], [4, 2, 0, 0.9], [6, 2, 0, 0.75], [8, 4, 0, 1]],
};
// How each bar is played: [cell, kit]. A kit is the drum pattern. The riff and the verse gallop, the intro is quiet, the
// chorus opens up, the bridge pumps eighths and the last four bars run sixteenths.
const FORM: readonly (readonly [string, string])[] = [
  ['gallop', 'groove'], ['gallop', 'groove'], ['gallop', 'groove'], ['end', 'finish'],
  ['stab', 'light'], ['stab', 'light'], ['stab', 'light'], ['eighths', 'fill'],
  ['gallop', 'crash'], ['gallop', 'groove'], ['gallop', 'groove'], ['gallop', 'fill'],
  ['gallop', 'groove'], ['gallop', 'groove'], ['gallop', 'groove'], ['gallop', 'fill'],
  ['eighths', 'groove'], ['eighths', 'groove'], ['pops', 'half'], ['sixteenths', 'fill'],
  ['open', 'crash'], ['open', 'blast'], ['open', 'blast'], ['pops', 'blast'],
  ['open', 'blast'], ['open', 'blast'], ['pops', 'blast'], ['pops', 'fill'],
  ['eighths', 'groove'], ['eighths', 'groove'], ['eighths', 'groove'], ['eighths', 'fill'],
  ['pops', 'blast'], ['pops', 'blast'], ['pops', 'blast'], ['sixteenths', 'fill'],
  ['open', 'crash'], ['open', 'blast'], ['open', 'blast'], ['pops', 'blast'],
  ['sixteenths', 'blast'], ['sixteenths', 'blast'], ['sixteenths', 'blast'], ['stab', 'ending'],
];
/** The fifth stays out where the lead has the room to itself: the intro and the lead-heavy bridge bars. */
const NO_FIFTH = new Set([4, 5, 6, 7]);

const cellOf = (b: number): Cell => (CELLS[FORM[b][0]] as Cell).filter(([s]) => s < BAR_STEPS[b]);
/** The bass is slower than the guitar: eighths where the guitar gallops or runs sixteenths, the guitar's own cell elsewhere. */
const BASS_CELL: Record<string, string> = { gallop: 'eighths', sixteenths: 'pops' };
const bassCell = (b: number): Cell => (CELLS[BASS_CELL[FORM[b][0]] ?? FORM[b][0]] as Cell).filter(([s]) => s < BAR_STEPS[b]);
const root = (b: number): number => rootNear(HARMONY[b], 40, 40, 51);

const chug: NoteEv[][] = HARMONY.map((_, b) => cellOf(b).map(([s, l, o, v]) => ev(s, l, root(b) + o, v)));
const fifth: NoteEv[][] = HARMONY.map((_, b) => (NO_FIFTH.has(b) ? [] : cellOf(b).map(([s, l, o, v]) => ev(s, l, root(b) + 7 + o, v * 0.8))));
const bass: NoteEv[][] = bassBars(HARMONY, {
  range: [28, 40],
  notes: (b) => bassCell(b).map(([s, l, o]) => [s, l, o] as const),
}).map((evs, b) => evs.map((e, i) => ({ ...e, vel: bassCell(b)[i][3] })));

// ---- the drums. Each pattern is one bar; the riff's closing bar has 12 steps.
const KITS: Record<string, DrumEv[]> = {
  light: grid({ kick: 'X.......x.......', snare: '............X...', hat: '..o.o.o.o.o...o.' }),
  groove: grid({ kick: 'X.x.....X.x.....', snare: '....X.......X...', hat: '......o.......o.' }),
  half: grid({ kick: 'X.......X.x.....', snare: '........X.......', hat: '..o...o...o...o.' }),
  blast: grid({ kick: 'X.x...x.x.x...x.', snare: '....X.......X...' }),
  crash: grid({ ohat: 'X...............', snare: '....X.......X...', kick: '..x...x.x.x...x.' }),
  fill: grid({ kick: 'X.x.....', snare: '........x.x.x.X.' }),
  finish: grid({ kick: 'X.x...x.....', snare: '....X.......', ohat: '........X...' }),
  ending: grid({ kick: 'X.......', snare: '........x.x.x.X.' }),
};
const drums: DrumEv[][] = FORM.map(([, kit]) => KITS[kit].map((d) => ({ ...d })));

// ---- the voices. Levels are set by the offline render in tests/tracks-solo.test.ts.
const BASS: Inst = { wave: 'tri', vol: 0.22, env: { a: 0.004, d: 0, s: 1, r: 0.03 }, gate: 0.8 };
const CHUG: Inst = { wave: 'p25', vol: 0.15, env: { a: 0.002, d: 0.07, s: 0.55, r: 0.02 }, gate: 0.6 };
const FIFTH: Inst = { wave: 'p12', vol: 0.1, env: { a: 0.002, d: 0.07, s: 0.5, r: 0.02 }, gate: 0.6 };
const LEAD: Inst = {
  wave: 'p50', vol: 0.15, env: { a: 0.006, d: 0.1, s: 0.8, r: 0.1 }, gate: 0.92,
  vib: { rate: 6.2, cents: 22, delay: 0.12 }, send: 0.35,
};

export const SOLO: Track = {
  id: 'solo',
  title: 'Hellfire',
  bpm: 150,
  tonic: 'E',
  mode: 'minor',
  // 5 is F natural, the flat two: the grind in the verse's twelfth bar.
  chromatic: [5],
  bars: BARS,
  barSteps: BAR_STEPS,
  layers: ['base'],
  harmony: HARMONY,
  echo: { beats: 0.75, feedback: 0.35, mix: 0.3, cutoff: 3200 },
  channels: [
    { slot: 'tri', layer: 'base', inst: BASS, bars: bass },
    { slot: 'p2', layer: 'base', inst: CHUG, bars: chug },
    { slot: 'p3', layer: 'base', inst: FIFTH, bars: fifth },
    { slot: 'p1', layer: 'base', inst: LEAD, bars: lead },
    { slot: 'noi', layer: 'base', bars: drums },
  ],
};
