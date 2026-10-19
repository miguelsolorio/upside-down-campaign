// One last campaign: the epilogue (docs/chapter-5.md, "Music"). F major, 72 bpm, 24 bars, which is 80 seconds. It plays
// through once and stops (Track.once), and its last bar is a d20 rolling to a stop.
// A triangle bass and soft pulses, and nothing else until the die: no combat layer, no drums. The Hawkins motif comes in
// major, C D C A Bb F, the way the Hawkins track plays it. Twice it hangs: the phrase ends on E, the leading tone of C7,
// and never goes home. Then the bridge, where the triangle leaves the bass and carries the tune alone. Then the motif once
// more, an octave up, over F, Bb, C7 and F, and the E finally steps up to F. That is the resolution the show never played.
// Original: the show's theme is a Cmaj7 arpeggio near 84 bpm, and this is a rocking 3 + 3 + 2 lullaby in another key.
import type { BassNotes } from './theory.ts';
import type { DrumEv, Inst, NoteEv, Track } from './types.ts';
import { arpBars, bassBars, cat, ev, hit, ramp, rest } from './theory.ts';
import { motifMajorBars, shiftBars } from './motif.ts';

const BARS = 24;

// Six blocks. Every chord is diatonic to F major, so the track has no exceptions to list. A bar of F ends the loop.
const HARMONY: readonly string[] = [
  'Fmaj7', 'Bbmaj7', 'Fmaj7', 'C7', // 0 to 3: the intro, the arp alone
  'Fmaj7', 'Bbmaj7', 'Gm7', 'C7', // 4 to 7: the motif, hanging on E
  'Fmaj7', 'Bbmaj7', 'Dm7', 'C7', // 8 to 11: again, doubled, hanging on E higher up
  'Dm7', 'Gm7', 'Bbmaj7', 'C7', // 12 to 15: the bridge, where the triangle sings
  'Fmaj7', 'Bbmaj7', 'C7', 'F', // 16 to 19: the motif resolves
  'F', 'Bbmaj7', 'F', 'F', // 20 to 23: the coda, and the die
];

const BASS: Inst = { wave: 'tri', vol: 0.19, env: { a: 0.01, d: 0, s: 1, r: 0.05 }, gate: 0.92 };
// The tune is a soft pulse: a slow attack, a little breath of vibrato, and the echo under it.
const LEAD: Inst = {
  wave: 'p25', vol: 0.17, env: { a: 0.03, d: 0.15, s: 0.75, r: 0.2 }, gate: 0.95,
  vib: { rate: 4.4, cents: 16, delay: 0.4 }, send: 0.5,
};
const ARP: Inst = { wave: 'p25', vol: 0.12, env: { a: 0.004, d: 0.3, s: 0.2, r: 0.08 }, gate: 0.8, send: 0.35 };
const WARM: Inst = { wave: 'p50', vol: 0.075, env: { a: 0.05, d: 0.1, s: 0.8, r: 0.2 }, gate: 0.95, send: 0.2 };

// ---- the tune. MAJOR is the motif (C D C | A Bb F).
const MAJOR = motifMajorBars();
// Over Gm7 the line falls D C Bb and then G E. The E is the leading tone, and the bar stops there.
const HANG_LOW: NoteEv[][] = [[ev(0, 6, 'D5'), ev(6, 2, 'C5'), ev(8, 7, 'Bb4')], [ev(0, 8, 'G4'), ev(8, 7, 'E4')]];
// The second time it climbs over Dm7 and holds the E an octave up.
const HANG_HIGH: NoteEv[][] = [[ev(0, 6, 'F5'), ev(6, 2, 'E5'), ev(8, 7, 'D5')], [ev(0, 15, 'E5')]];
// The bridge, for the triangle: it rises A C D, Bb C D, F G A, and comes down onto E once more.
const BRIDGE: NoteEv[][] = [
  [ev(0, 6, 'A4'), ev(6, 2, 'C5'), ev(8, 7, 'D5')],
  [ev(0, 6, 'Bb4'), ev(6, 2, 'C5'), ev(8, 7, 'D5')],
  [ev(0, 6, 'F5'), ev(6, 2, 'G5'), ev(8, 7, 'A5')],
  [ev(0, 8, 'G5'), ev(8, 7, 'E5')],
];
// The E steps up to F: the last note of the tune, on the tonic chord. The warm voice sits a third lower, on G then A.
const RESOLVE_LEAD: NoteEv[][] = [[ev(0, 15, 'E5')], [ev(0, 15, 'F5')]];
const RESOLVE_WARM: NoteEv[][] = [[ev(0, 15, 'G4')], [ev(0, 15, 'A4')]];
// The coda remembers the opening, C D C, and then the tune falls home: Bb A F, and a long F.
const CODA: NoteEv[][] = [
  [ev(0, 6, 'C5', 0.7), ev(6, 2, 'D5', 0.7), ev(8, 7, 'C5', 0.7)],
  [ev(0, 6, 'Bb4', 0.6), ev(6, 2, 'A4', 0.6), ev(8, 7, 'F4', 0.6)],
  [ev(0, 15, 'F4', 0.5)],
  [],
];

// ---- the die. The last bar is a bar of its own: the noise voice's ticks and tocks tumble, quick at first and slowing as
// the die settles (each gap a fifth longer than the one before, from 0.05 s), and the last one is a tock on step 13. On
// it a bright F major triad lands: the root on the triangle, the third and fifth on two pulses and the octave above.
const LAND = 13;
const LAND_LEN = 3;
const CLACKS = 12;
const STEP_SEC = 60 / 72 / 4;
const GAPS: number[] = Array.from({ length: CLACKS - 1 }, (_, k) => (0.05 * 1.22 ** k) / STEP_SEC);
const rolling = (): DrumEv[] => {
  let at = LAND - GAPS.reduce((a, b) => a + b, 0);
  return Array.from({ length: CLACKS }, (_, k) => {
    const last = k === CLACKS - 1;
    const h = hit(at, last || k % 2 === 0 ? 'tock' : 'tick', last ? 1 : 1 - k * 0.035);
    if (!last) at += GAPS[k];
    return h;
  });
};
/** The last bar of a channel becomes the landing note. */
const landing = (bars: NoteEv[][], pitch: string): NoteEv[][] =>
  bars.map((evs, bar) => (bar === BARS - 1 ? [ev(LAND, LAND_LEN, pitch)] : evs));

// ---- bass. A pedal in the intro and the coda, roots and fifths under the tune, a walk up and back in the doubled block.
// The bridge has none, because the triangle carries the tune there, an octave under where it is written above.
const PEDAL: BassNotes = [[0, 16, 0]];
const SWAY: BassNotes = [[0, 10, 0], [10, 6, 7]];
const WALK: BassNotes = [[0, 4, 0], [4, 4, 7], [8, 4, 12], [12, 4, 7]];
const bassNotes = (bar: number): BassNotes => (bar < 4 || bar >= 20 ? PEDAL : bar < 8 || bar >= 16 ? SWAY : WALK);
const bridge = shiftBars(BRIDGE, -12);
const tri = landing(
  bassBars(HARMONY, { range: [36, 52], notes: bassNotes }).map((evs, bar) => (bar >= 12 && bar < 16 ? bridge[bar - 12] : evs)),
  'F2',
);

// ---- the arp: 3 + 3 + 2 + 3 + 3 + 2 sixteenths, rocking up and back, soft. It swells through the intro, fades in the coda
// and is gone before the die.
const ROCK = { win: [55, 72] as const, steps: [0, 3, 6, 8, 11, 14], idx: [0, 2, 1, 3, 2, 1], len: 2, vel: [1, 0.6, 0.75, 0.9, 0.6, 0.7] };
const arpAll = arpBars(HARMONY, ROCK);
const arp = landing(cat(ramp(arpAll.slice(0, 4), 0.45, 0.85), arpAll.slice(4, 20), ramp(arpAll.slice(20), 0.8, 0.3)), 'F6');

// ---- the tune (p1), with the warm voice an octave under it in the doubled block and a third under it in the last.
const lead = landing(
  cat(rest<NoteEv>(4), MAJOR, HANG_LOW, MAJOR, HANG_HIGH, rest<NoteEv>(4), shiftBars(MAJOR, 12), RESOLVE_LEAD, CODA),
  'A5',
);
const warm = landing(
  cat(rest<NoteEv>(8), shiftBars(MAJOR, -12), shiftBars(HANG_HIGH, -12), rest<NoteEv>(4), MAJOR, RESOLVE_WARM, rest<NoteEv>(4)),
  'C6',
);

const noise: DrumEv[][] = Array.from({ length: BARS }, (_, bar) => (bar === BARS - 1 ? rolling() : []));

export const ENDING: Track = {
  id: 'ending',
  title: 'One last campaign',
  bpm: 72,
  once: true,
  tonic: 'F',
  mode: 'major',
  chromatic: [],
  bars: BARS,
  layers: ['base'],
  harmony: HARMONY,
  echo: { beats: 0.75, feedback: 0.46, mix: 0.5, cutoff: 2600 },
  channels: [
    { slot: 'tri', layer: 'base', inst: BASS, bars: tri },
    { slot: 'p1', layer: 'base', inst: LEAD, bars: lead },
    { slot: 'p2', layer: 'base', inst: ARP, bars: arp },
    { slot: 'p3', layer: 'base', inst: WARM, bars: warm },
    { slot: 'noi', layer: 'base', bars: noise },
  ],
};
