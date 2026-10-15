// Starcourt: stages 3.1 and 3.2. C Lydian, 118 bpm, 32 bars. Bright 1985 mall pop. Lydian is major with the fourth
// raised (C D E F# G A B), so the whole track hangs on one note: F sharp. The Hawkins motif comes back as the same
// six degrees in Lydian, G A G E F# C (motifLydianBars), and the old fourth is now the raised one, held one note
// before the tonic. The lead leans on F# again in the bridge (a whole bar of it over Bm7), over the F# diminished
// chord, and as the major seventh of G. D, the chord a step above the tonic, is the Lydian chord: its third is F#.
// A bouncing triangle bass, a sparkling arp that runs in triplet twinkles (three sixteenths and a rest, a beat at a
// time, with a dotted-eighth echo behind it), a square lead and a shaker on the off-beats.
// Base: bass, lead, arp, shaker. Combat: a driving pulse on the third pulse slot and drums that share the noise
// slot with the shaker. The pulse locks onto the bass's octave pops and the kick leaves the shaker's steps alone.
// Original: nothing here is a Cmaj7 arpeggio, and it is not near the show's tempo.
import type { BassNotes } from './theory.ts';
import type { DrumEv, Inst, NoteEv, Track } from './types.ts';
import { arpBars, bassBars, cat, ev, grid, hit, ramp, rest } from './theory.ts';
import { motifLydianBars } from './motif.ts';

const BARS = 32;

// Eight blocks of four bars, every chord built from C Lydian tones, so the track has no exceptions to list.
// Intro, the motif and its answer twice, a bridge, the chorus, a breakdown, the motif again and an outro. The loop
// ends on Gmaj7 (the dominant, with F# as its major seventh), which falls onto the Cmaj7 at bar one.
const HARMONY: readonly string[] = [
  'Cmaj7', 'D', 'Cmaj7', 'D',
  'Cmaj7', 'D7', 'Em7', 'D',
  'Cmaj7', 'D7', 'Em7', 'Bm7',
  'Am7', 'Em7', 'Bm7', 'D',
  'Cmaj7', 'D7', 'Em7', 'D',
  'Am7', 'D', 'Gmaj7', 'F#dim',
  'Cmaj7', 'D7', 'Em7', 'D',
  'Bm7', 'Em7', 'D', 'Gmaj7',
];

const BASS: Inst = { wave: 'tri', vol: 0.2, env: { a: 0.004, d: 0, s: 1, r: 0.03 }, gate: 0.8 };
const LEAD: Inst = {
  wave: 'p50', vol: 0.17, env: { a: 0.01, d: 0.12, s: 0.8, r: 0.14 }, gate: 0.95,
  vib: { rate: 5.5, cents: 18, delay: 0.25 }, send: 0.4,
};
const ARP: Inst = { wave: 'p12', vol: 0.13, env: { a: 0.002, d: 0.16, s: 0.15, r: 0.04 }, gate: 0.8, send: 0.4 };
const DRIVE: Inst = { wave: 'p25', vol: 0.27, env: { a: 0.002, d: 0.1, s: 0.5, r: 0.03 }, gate: 0.7 };

/** The fifth above the root, or the flat fifth over the F# diminished chord, which is C and keeps the key. */
const fifthOf = (sym: string): number => (sym.endsWith('dim') ? 6 : 7);

// ---- base: bass. Root on the beat, then an octave pop on the sixteenth before the next beat: dum-ba dum-ba dum-ba
// dum-da. The last bar of every four turns it over with the fifth and the octave.
function bounce(bar: number): BassNotes {
  const five = fifthOf(HARMONY[bar]);
  return bar % 4 === 3
    ? [[0, 2, 0], [3, 1, 12], [4, 2, 0], [7, 1, 12], [8, 2, 0], [10, 2, five], [12, 2, 12], [14, 2, five]]
    : [[0, 2, 0], [3, 1, 12], [4, 2, 0], [7, 1, 12], [8, 2, 0], [11, 1, 12], [12, 2, 0], [14, 2, five]];
}
const bass = bassBars(HARMONY, { range: [36, 48], notes: bounce });

// ---- base: arp. Twinkles: three chord tones climbing a sixteenth apart, a rest, and the next beat starts one tone
// higher. It is quiet in the intro and louder after. In the breakdown (bars 21 and 22) the lead rests and the
// arp jumps up an octave, so the sparkle has the room to itself.
const TWINKLE = [0, 1, 2, 4, 5, 6, 8, 9, 10, 12, 13, 14];
const TWINKLE_VEL = [1, 0.55, 0.7, 0.85, 0.5, 0.65, 0.9, 0.5, 0.65, 0.8, 0.5, 0.65];
const LOW_ARP = { win: [62, 86] as const, steps: TWINKLE, idx: [0, 1, 2, 1, 2, 3, 2, 3, 4, 3, 2, 1], len: 1, vel: TWINKLE_VEL };
const HIGH_ARP = { ...LOW_ARP, win: [72, 96] as const, idx: [0, 1, 2, 2, 3, 4, 1, 2, 3, 3, 2, 1] };
const arp = cat(
  ramp(arpBars(HARMONY.slice(0, 4), LOW_ARP), 0.5, 0.85),
  arpBars(HARMONY.slice(4, 20), LOW_ARP),
  arpBars(HARMONY.slice(20, 22), HIGH_ARP),
  arpBars(HARMONY.slice(22), LOW_ARP),
);

// ---- base: lead. Silent for four bars. The motif and an answer that climbs B C D and falls F# E D; the motif and
// a second answer that ends hanging on F#; a bridge of long notes that holds F# for a whole bar; the chorus (the
// motif and a Lydian scale run up to B); a breakdown with the lead silent; a long major seventh and a bar of F# over
// the F# diminished chord; the motif and a falling answer; and an outro that hangs on B, the leading tone.
const ANSWER_A: NoteEv[][] = [
  [ev(0, 6, 'B4'), ev(6, 2, 'C5'), ev(8, 7, 'D5')],
  [ev(0, 6, 'F#5'), ev(6, 2, 'E5'), ev(8, 7, 'D5')],
];
const ANSWER_B: NoteEv[][] = [
  [ev(0, 6, 'G5'), ev(6, 2, 'F#5'), ev(8, 7, 'E5')],
  [ev(0, 6, 'D5'), ev(6, 2, 'E5'), ev(8, 7, 'F#5')],
];
const BRIDGE: NoteEv[][] = [
  [ev(0, 6, 'E5'), ev(6, 2, 'G5'), ev(8, 7, 'A5')],
  [ev(0, 8, 'G5'), ev(8, 4, 'B5'), ev(12, 3, 'A5')],
  [ev(0, 15, 'F#5')],
  [ev(0, 6, 'F#5'), ev(6, 2, 'A5'), ev(8, 7, 'F#5')],
];
const RUN: NoteEv[][] = [
  [ev(0, 2, 'E5'), ev(2, 2, 'F#5'), ev(4, 2, 'G5'), ev(6, 2, 'A5'), ev(8, 2, 'B5'), ev(10, 2, 'A5'), ev(12, 3, 'G5')],
  [ev(0, 6, 'A5'), ev(6, 2, 'F#5'), ev(8, 7, 'D5')],
];
const SIGH: NoteEv[][] = [
  [ev(0, 6, 'D5'), ev(6, 2, 'E5'), ev(8, 7, 'F#5')],
  [ev(0, 15, 'F#5')],
];
const FALL: NoteEv[][] = [
  [ev(0, 6, 'G5'), ev(6, 2, 'F#5'), ev(8, 7, 'E5')],
  [ev(0, 6, 'D5'), ev(6, 2, 'C5'), ev(8, 7, 'A4')],
];
const OUTRO: NoteEv[][] = [
  [ev(0, 15, 'D5')],
  [ev(0, 8, 'E5'), ev(8, 7, 'G5')],
  [ev(0, 6, 'F#5'), ev(6, 2, 'E5'), ev(8, 7, 'D5')],
  [ev(0, 15, 'B4')],
];
const lead = cat(
  rest<NoteEv>(4),
  motifLydianBars(), ANSWER_A,
  motifLydianBars(), ANSWER_B,
  BRIDGE,
  motifLydianBars(), RUN,
  rest<NoteEv>(2), SIGH,
  motifLydianBars(), FALL,
  OUTRO,
);

// ---- base: shaker. A hat on each off-beat eighth. Step ten is left out of every other bar, which gives the combat
// kick a place to push in; the kick can only sit where the shaker does not.
const shaker = (bar: number): DrumEv[] => [
  hit(2, 'hat', 0.34), hit(6, 'hat', 0.26), ...(bar % 2 === 0 ? [hit(10, 'hat', 0.34)] : []), hit(14, 'hat', 0.26),
];
const hats: DrumEv[][] = Array.from({ length: BARS }, (_, bar) => shaker(bar));

// ---- combat: the driving pulse. Sixteenth notes in a chug: the beat, the off-beat, and the sixteenth before the next
// beat an octave up, which lands with the bass's octave pops. Accents fall on the beats.
const CHUG = [0, 2, 3, 4, 6, 7, 8, 10, 11, 12, 14, 15];
const CHUG_VEL = [1, 0.65, 0.8, 0.9, 0.65, 0.8, 0.9, 0.65, 0.8, 0.9, 0.65, 0.8];
function driveNotes(bar: number): BassNotes {
  const five = fifthOf(HARMONY[bar]);
  const turn = bar % 4 === 3;
  return CHUG.map((step) => {
    const octave = step % 4 === 3;
    // The turn-around bar answers with the fifth on the second half of the bar.
    return [step, 1, octave ? 12 : turn && step >= 10 ? five : 0] as const;
  });
}
const drive = bassBars(HARMONY, { range: [48, 60], notes: driveNotes })
  .map((evs) => evs.map((e, i) => ({ ...e, vel: CHUG_VEL[i] })));

// ---- combat: drums. Kick on one and three, snare on two and four. Every other bar the kick adds a push on the
// "and" of three, which is the shaker step left open. Every fourth bar the snare rolls instead. A kick or a snare
// rings 0.14 s or more and a step is 0.127 s, so none of them sits on the step before another hit.
const groove = grid({ kick: 'X.......X.......', snare: '....X.......X...' });
const push = grid({ kick: 'X.......X.x.....', snare: '....X.......X...' });
const roll = grid({ kick: 'X...............', snare: '....X...x.x.X...' });
const drums: DrumEv[][] = Array.from({ length: BARS }, (_, bar) => (bar % 4 === 3 ? roll : bar % 2 === 1 ? push : groove));

export const STARCOURT: Track = {
  id: 'starcourt',
  title: 'Starcourt',
  bpm: 118,
  tonic: 'C',
  mode: 'lydian',
  chromatic: [],
  bars: BARS,
  layers: ['base', 'combat'],
  harmony: HARMONY,
  echo: { beats: 0.75, feedback: 0.34, mix: 0.36, cutoff: 3400 },
  channels: [
    { slot: 'tri', layer: 'base', inst: BASS, bars: bass },
    { slot: 'p1', layer: 'base', inst: LEAD, bars: lead },
    { slot: 'p2', layer: 'base', inst: ARP, bars: arp },
    { slot: 'noi', layer: 'base', bars: hats },
    { slot: 'p3', layer: 'combat', inst: DRIVE, bars: drive },
    { slot: 'noi', layer: 'combat', bars: drums },
  ],
};
