// The Abyss: the final boss, 5.3 (docs/chapter-5.md, "Music"). D minor, 160 bpm, 32 bars, and every tune the game has
// at once: the Hawkins motif as Static states it (A Bb A F G D), the same motif turned upside down the way the Upside
// Down turns it (G F G Bb A D, flipBars around the tonic), and the Clock's bell, a low strike on the first beat of every
// fourth bar. The three are layered in the third, fifth and seventh blocks of four bars; in the seventh the two voices swap
// lines, so the Abyss plays itself inside out.
// A boss that grows angrier raises the tempo: `phases` is 160, 164 and 168 bpm, and the sequencer plays the phase the game
// sets (audio.phase). Drums are fixed lengths in seconds, so the combat groove puts nothing within two steps of a kick or
// a snare, which holds at 168 bpm too.
// Base: bass, the motif (p1), its mirror (p2), the bell (p3), a noise clock. Combat: a gallop on p3, which waits out the
// bell on a bell bar, and drums on the noise slot between the clock's ticks. Five voices at most. Original: the show's
// theme is a Cmaj7 arpeggio near 84 bpm, and nothing here is near it.
import type { BassNotes } from './theory.ts';
import type { DrumEv, Inst, NoteEv, Track } from './types.ts';
import { bassBars, cat, ev, grid, hit, rest, rootNear } from './theory.ts';
import { D_MINOR, MOTIF_AXIS, flipBars, motifBars, shiftBars } from './motif.ts';

const BARS = 32;

// Eight blocks of four bars, and the bell strikes on each block's first bar. Dm, Bb, Gm, A is the spine: the motif
// sits on Dm and Bb, its answer climbs over Gm and the A major chord, whose C sharp is the one note outside D minor.
// Block three is the bridge (the bell tolls on Gm), block five climbs Bb, C, Dm. The loop ends on A, which falls onto Dm.
const HARMONY: readonly string[] = [
  'Dm', 'Bb', 'Gm', 'A',
  'Dm', 'Bb', 'Gm', 'A',
  'Dm', 'Bb', 'Gm', 'A',
  'Gm', 'Gm', 'Bb', 'A',
  'Dm', 'Bb', 'Gm', 'A',
  'Bb', 'C', 'Dm', 'A',
  'Dm', 'Bb', 'Gm', 'A',
  'Dm', 'Bb', 'C', 'A',
];

const BASS: Inst = { wave: 'tri', vol: 0.23, env: { a: 0.004, d: 0, s: 1, r: 0.03 }, gate: 0.85 };
// The bell is a hard strike and a long fade, with the slow vibrato of a real bell's hum.
const BELL: Inst = {
  wave: 'p25', vol: 0.27, env: { a: 0.002, d: 1, s: 0, r: 0.2, exp: true }, gate: 1,
  vib: { rate: 3.4, cents: 22, delay: 0.05 }, send: 0.9,
};
const LEAD: Inst = {
  wave: 'p25', vol: 0.19, env: { a: 0.01, d: 0.1, s: 0.8, r: 0.12 }, gate: 0.93,
  vib: { rate: 5.5, cents: 20, delay: 0.25 }, send: 0.4,
};
// The mirror is thinner and a few cents flat, so the two tunes read as two voices and not one.
const MIRROR: Inst = {
  wave: 'p12', vol: 0.17, env: { a: 0.012, d: 0.12, s: 0.75, r: 0.12 }, gate: 0.93,
  vib: { rate: 4.6, cents: 24, delay: 0.3 }, detune: -7, send: 0.5,
};
const GALLOP: Inst = { wave: 'p50', vol: 0.25, env: { a: 0.002, d: 0.1, s: 0.6, r: 0.03 }, gate: 0.75 };

// ---- the tunes. M is the Hawkins motif. W is the same six notes flipped around D5 and snapped to the scale, which is what
// the Upside Down does (it snaps to D Phrygian; the two modes agree on every note this flip lands on).
const M = motifBars();
const W = flipBars(M, MOTIF_AXIS, D_MINOR);
// The call climbs over Gm and falls onto the A chord's C sharp; the mirror's reply falls over Gm and rises through the A chord.
const CALL: NoteEv[][] = [[ev(0, 6, 'Bb5'), ev(6, 2, 'C6'), ev(8, 7, 'D6')], [ev(0, 6, 'E6'), ev(6, 2, 'D6'), ev(8, 7, 'C#6')]];
const FALL: NoteEv[][] = [[ev(0, 6, 'D5'), ev(6, 2, 'C5'), ev(8, 7, 'Bb4')], [ev(0, 6, 'A4'), ev(6, 2, 'C#5'), ev(8, 7, 'E5')]];
// The lead's cadence on the A chord, an octave under the call: E D C sharp, the leading tone.
const CADENCE: NoteEv[] = [ev(0, 6, 'E5'), ev(6, 2, 'D5'), ev(8, 7, 'C#5')];
// Block 3, the bridge: long notes over Gm, with the mirror an octave lower than it plays anywhere else.
const HOLD: NoteEv[][] = [[ev(0, 15, 'Bb5')], [ev(0, 8, 'A5'), ev(8, 7, 'G5')], [ev(0, 15, 'F5')], CADENCE];
const HOLD_LOW: NoteEv[][] = [...shiftBars(W, -12), [ev(0, 15, 'D4')], [ev(0, 15, 'C#4')]];
// Block 5: the lead climbs F G A while the mirror sinks D C Bb, then both reach for the A chord.
const CLIMB: NoteEv[][] = [[ev(0, 15, 'F5')], [ev(0, 15, 'G5')], [ev(0, 15, 'A5')], CADENCE];
const SINK: NoteEv[][] = [[ev(0, 15, 'D5')], [ev(0, 15, 'C5')], [ev(0, 15, 'Bb4')], [ev(0, 15, 'A4')]];
// The last block turns toward C major before the A: a climb G A C, and a reply that falls E D C.
const HOME: NoteEv[] = [ev(0, 6, 'G5'), ev(6, 2, 'A5'), ev(8, 7, 'C6')];
const HOME_REPLY: NoteEv[] = [ev(0, 6, 'E5'), ev(6, 2, 'D5'), ev(8, 7, 'C5')];

// Blocks, counting from 0: 0 the mirror alone, 1 the motif alone, 2 both, 3 the bridge, 4 both and wide, 5 the climb,
// 6 swapped, 7 home.
const lead = cat(
  rest<NoteEv>(4), M, CALL, M, CALL, HOLD, M, CALL, CLIMB, W, FALL, M, [HOME, CALL[1]],
);
const mirror = cat(
  W, FALL, rest<NoteEv>(4), W, FALL, HOLD_LOW, shiftBars(W, -12), shiftBars(FALL, -12), SINK, M, CALL, W, [HOME_REPLY, FALL[1]],
);

// ---- the bell, low, on the first beat of the first bar of every block. It rings for ten steps.
const BELL_STEPS = 10;
const isBell = (bar: number): boolean => bar % 4 === 0;
const bell: NoteEv[][] = HARMONY.map((sym, bar) => (isBell(bar) ? [ev(0, BELL_STEPS, rootNear(sym, 50, 40, 52))] : []));

// ---- bass: long notes in the intro and the bridge, then eighths with the octave on the off-beats. The fourth bar of
// every block turns over with the fifth and the octave.
const LONG: BassNotes = [[0, 12, 0], [12, 4, 7]];
const PLAIN: BassNotes = [[0, 2, 0], [2, 2, 0], [4, 2, 0], [6, 2, 12], [8, 2, 0], [10, 2, 0], [12, 2, 7], [14, 2, 12]];
const TURN: BassNotes = [[0, 2, 0], [2, 2, 0], [4, 2, 12], [6, 2, 0], [8, 2, 7], [10, 2, 7], [12, 2, 12], [14, 2, 12]];
const bass = bassBars(HARMONY, {
  range: [36, 48],
  notes: (bar) => (bar < 4 || Math.floor(bar / 4) === 3 ? LONG : bar % 4 === 3 ? TURN : PLAIN),
});

// ---- base: the noise clock. Tick, tock, tick, tock on the off-beat eighths, quiet.
const tickBar: DrumEv[] = [hit(2, 'tick', 0.5), hit(6, 'tock', 0.5), hit(10, 'tick', 0.5), hit(14, 'tock', 0.5)];
const ticks: DrumEv[][] = Array.from({ length: BARS }, () => tickBar);

// ---- combat: the gallop. Each beat is a long note and two sixteenths, the second an octave up: [step, len, semitones, vel].
// On a bell bar it waits until the bell has rung (step 10).
const GALLOP_PATTERN: readonly (readonly [number, number, number, number])[] = [
  [0, 2, 0, 1], [2, 1, 0, 0.6], [3, 1, 12, 0.8], [4, 2, 0, 0.9], [6, 1, 0, 0.6], [7, 1, 12, 0.8],
  [8, 2, 0, 1], [10, 1, 0, 0.6], [11, 1, 12, 0.8], [12, 2, 0, 0.9], [14, 1, 7, 0.7], [15, 1, 12, 0.8],
];
const gallop: NoteEv[][] = (() => {
  let prev = 52;
  return HARMONY.map((sym, bar) => {
    const root = rootNear(sym, prev, 46, 58);
    prev = root;
    return GALLOP_PATTERN
      .filter(([step]) => !isBell(bar) || step >= BELL_STEPS)
      .map(([step, len, off, vel]) => ev(step, len, root + off, vel));
  });
})();

// ---- combat: drums. Kicks and snares sit on steps 0, 4, 8 and 12, two before a tick (2, 6, 10, 14), so the noise voice has
// room: a kick rings 0.15 s and a step is 0.089 s at 168 bpm. Hats sit on the steps between. The fourth bar of a block is a fill.
const groove = grid({ kick: 'X.......x.......', snare: '....X.......X...', hat: '...o...o...o...o' });
// On a bell bar the kick waits until the bell has rung, then lands on the fourth beat, so the strike is clean.
const toll = grid({ kick: '............X...', snare: '....X...x.......', hat: '...o...o...o...o' });
const fill = grid({ kick: 'X...............', snare: '....x.......X...', hat: '...o...o...o...o' });
const drums: DrumEv[][] = Array.from({ length: BARS }, (_, bar) => (isBell(bar) ? toll : bar % 4 === 3 ? fill : groove));

export const ABYSS: Track = {
  id: 'abyss',
  title: 'The Abyss',
  bpm: 160,
  phases: [160, 164, 168],
  tonic: 'D',
  mode: 'minor',
  // 1 is C sharp: the leading tone in the A major chord that closes every block.
  chromatic: [1],
  bars: BARS,
  layers: ['base', 'combat'],
  harmony: HARMONY,
  echo: { beats: 0.75, feedback: 0.42, mix: 0.42, cutoff: 2600 },
  channels: [
    { slot: 'tri', layer: 'base', inst: BASS, bars: bass },
    { slot: 'p1', layer: 'base', inst: LEAD, bars: lead },
    { slot: 'p2', layer: 'base', inst: MIRROR, bars: mirror },
    { slot: 'p3', layer: 'base', inst: BELL, bars: bell },
    { slot: 'noi', layer: 'base', bars: ticks },
    { slot: 'p3', layer: 'combat', inst: GALLOP, bars: gallop },
    { slot: 'noi', layer: 'combat', bars: drums },
  ],
};
