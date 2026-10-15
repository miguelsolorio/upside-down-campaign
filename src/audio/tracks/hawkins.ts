// Hawkins: the map screen and the first town stage. F major, 112 bpm, 32 bars. The title motif in major:
// 5 b6 5 b3 4 1 of D minor becomes 5 6 5 3 4 1 of F major (C D C A Bb F), which turns the sigh into a smile
// with a catch in it. A square lead over a bouncing triangle bass and a soft broken-chord arp, with a pinch
// of noise for a shaker. Warm and a little wistful: the chords are all sevenths, and the way home is
// through the relative minor.
// Base: bass, lead, arp, shaker. Combat: a driving bass on the third pulse slot and drums that share the
// noise slot with the shaker. Original: nothing here is an arpeggio over a single chord.
import type { DrumEv, Inst, NoteEv, Track } from './types.ts';
import { arpBars, bassBars, cat, ev, grid, hit, ramp, rest } from './theory.ts';
import { motifMajorBars, shiftBars } from './motif.ts';

const BARS = 32;

// Eight blocks of four bars. Every chord is diatonic to F major, so the track has no exceptions to list.
// The loop ends on C7, which falls onto the Fmaj7 at bar one.
const HARMONY: readonly string[] = [
  'Fmaj7', 'Fmaj7', 'Bbmaj7', 'Fmaj7',
  'Fmaj7', 'Bbmaj7', 'Dm7', 'C7',
  'Fmaj7', 'Bbmaj7', 'Dm7', 'C7',
  'Gm7', 'Gm7', 'Bbmaj7', 'Am7',
  'Bbmaj7', 'C7', 'Am7', 'Dm7',
  'Fmaj7', 'Bbmaj7', 'Dm7', 'C7',
  'Fmaj7', 'Bbmaj7', 'Gm7', 'C7',
  'Dm7', 'Bbmaj7', 'Gm7', 'C7',
];

const BASS: Inst = { wave: 'tri', vol: 0.2, env: { a: 0.005, d: 0, s: 1, r: 0.03 }, gate: 0.85 };
const LEAD: Inst = {
  wave: 'p50', vol: 0.17, env: { a: 0.012, d: 0.12, s: 0.8, r: 0.15 }, gate: 0.95,
  vib: { rate: 5, cents: 20, delay: 0.3 }, send: 0.45,
};
const ARP: Inst = { wave: 'p25', vol: 0.14, env: { a: 0.004, d: 0.25, s: 0.3, r: 0.06 }, gate: 0.8, send: 0.3 };
const DRIVE: Inst = { wave: 'p25', vol: 0.27, env: { a: 0.002, d: 0.14, s: 0.55, r: 0.03 }, gate: 0.7 };

// ---- base: bass. Root, root, fifth, root, fifth, octave: the same figure in every bar, so it bounces.
const BOUNCE = [[0, 3, 0], [4, 2, 0], [6, 2, 7], [8, 3, 0], [12, 2, 7], [14, 2, 12]] as const;
const bass = bassBars(HARMONY, { range: [36, 48], notes: BOUNCE });

// ---- base: arp. Eighths that climb a seventh chord and come back. It gets louder through the intro.
const ARP_SPEC = { win: [57, 81] as const, steps: [0, 2, 4, 6, 8, 10, 12, 14], idx: [0, 1, 2, 3, 2, 1, 2, 3], len: 2, vel: [1, 0.6, 0.78, 0.6, 0.92, 0.6, 0.78, 0.6] };
const arp = cat(
  ramp(arpBars(HARMONY.slice(0, 4), ARP_SPEC), 0.5, 0.85),
  arpBars(HARMONY.slice(4), ARP_SPEC),
);

// ---- base: lead. The motif in major, its answer, and a bridge of long notes. Silent for four bars.
// The answer climbs A Bb C and falls D C A: the Bb is the one note that does not belong to its chord, the
// catch in the voice. The last block hangs on E, the third of C7, which the loop resolves to F.
const ANSWER_F: NoteEv[][] = [
  [ev(0, 6, 'A4'), ev(6, 2, 'Bb4'), ev(8, 7, 'C5')],
  [ev(0, 6, 'D5'), ev(6, 2, 'C5'), ev(8, 7, 'A4')],
];
const BRIDGE: NoteEv[][] = [
  [ev(0, 15, 'D5')],
  [ev(0, 8, 'C5'), ev(8, 7, 'Bb4')],
  [ev(0, 15, 'A4')],
  [ev(0, 6, 'G4'), ev(6, 2, 'A4'), ev(8, 7, 'C5')],
];
const FALL: NoteEv[][] = [
  [ev(0, 6, 'D5'), ev(6, 2, 'C5'), ev(8, 7, 'Bb4')],
  [ev(0, 6, 'A4'), ev(6, 2, 'G4'), ev(8, 7, 'F4')],
];
const FINAL: NoteEv[][] = [[ev(0, 15, 'F5')], [ev(0, 15, 'D5')], [ev(0, 6, 'Bb4'), ev(6, 2, 'A4'), ev(8, 7, 'G4')], [ev(0, 15, 'E5')]];
const lead = cat(
  rest<NoteEv>(4),
  motifMajorBars(), ANSWER_F,
  motifMajorBars(), ANSWER_F,
  BRIDGE,
  shiftBars(motifMajorBars(), 12), ANSWER_F,
  motifMajorBars(), ANSWER_F,
  motifMajorBars(), FALL,
  FINAL,
);

// ---- base: shaker. A soft hat on each off-beat eighth.
const shaker = [hit(2, 'hat', 0.3), hit(6, 'hat', 0.3), hit(10, 'hat', 0.3), hit(14, 'hat', 0.3)];
const hats: DrumEv[][] = Array.from({ length: BARS }, () => shaker);

// ---- combat: a driving bass an octave over the triangle. Eighths: root, root, octave, root, then the fifth
// and octave to turn. The triangle keeps its bounce underneath, so the two lock into a push.
const PUSH = [[0, 2, 0], [2, 2, 0], [4, 2, 12], [6, 2, 0], [8, 2, 0], [10, 2, 7], [12, 2, 12], [14, 2, 7]] as const;
const TURN = [[0, 2, 0], [2, 2, 0], [4, 2, 12], [6, 2, 0], [8, 2, 7], [10, 2, 7], [12, 2, 12], [14, 2, 12]] as const;
const drive = bassBars(HARMONY, { range: [48, 60], notes: (bar) => (bar % 4 === 3 ? TURN : PUSH) });

// ---- combat: drums. Kick on one and three, snare on two and four, hat on the sixteenth after each shaker
// tick. A step is 0.134 s and kick and snare ring 0.14 s or more, so nothing sits on the step after one.
const groove = grid({ kick: 'X.......x.......', snare: '....X.......X...', hat: '...o...o...o...o' });
const fill = grid({ kick: 'X...............', snare: '....x...x..X....', hat: '...o...o.......o' });
const drums: DrumEv[][] = Array.from({ length: BARS }, (_, bar) => (bar % 4 === 3 ? fill : groove));

export const HAWKINS: Track = {
  id: 'hawkins',
  title: 'Hawkins',
  bpm: 112,
  tonic: 'F',
  mode: 'major',
  chromatic: [],
  bars: BARS,
  layers: ['base', 'combat'],
  harmony: HARMONY,
  echo: { beats: 0.75, feedback: 0.38, mix: 0.4, cutoff: 3000 },
  channels: [
    { slot: 'tri', layer: 'base', inst: BASS, bars: bass },
    { slot: 'p1', layer: 'base', inst: LEAD, bars: lead },
    { slot: 'p2', layer: 'base', inst: ARP, bars: arp },
    { slot: 'noi', layer: 'base', bars: hats },
    { slot: 'p3', layer: 'combat', inst: DRIVE, bars: drive },
    { slot: 'noi', layer: 'combat', bars: drums },
  ],
};
