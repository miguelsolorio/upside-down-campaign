// Static: the title track. D minor, 92 bpm, 32 bars. A slow pulse arpeggio over triangle bass,
// a quiet noise bed, and a lead that walks in at bar nine playing the Hawkins motif. Original.
import type { DrumEv, Inst, NoteEv, Track } from './types.ts';
import { arpBars, bassBars, cat, ev, grid, hit, lineBars, ramp, rest } from './theory.ts';
import { ANSWER, CADENCE, LONGS, motifBars } from './motif.ts';

// One chord per bar. Sections: intro (1 to 8), lead (9 to 16), bridge (17 to 24), return (25 to 32).
// The loop ends on A7, which pulls straight back to Dm7 at bar one.
const HARMONY: readonly string[] = [
  'Dm7', 'Bbmaj7', 'Gm7', 'A7', 'Dm7', 'Bbmaj7', 'C7', 'A7',
  'Dm7', 'Bbmaj7', 'Gm7', 'A7', 'Dm7', 'Fmaj7', 'Gm7', 'A7',
  'Fmaj7', 'C7', 'Dm7', 'Bbmaj7', 'Fmaj7', 'C7', 'Gm7', 'A7',
  'Dm7', 'Bbmaj7', 'Gm7', 'A7', 'Bbmaj7', 'C7', 'Gm7', 'A7',
];

const BASS: Inst = { wave: 'tri', vol: 0.16, env: { a: 0.006, d: 0, s: 1, r: 0.03 }, gate: 0.96 };
const ARP: Inst = { wave: 'p25', vol: 0.22, env: { a: 0.004, d: 0.3, s: 0.3, r: 0.07 }, gate: 0.8, send: 0.3 };
const LEAD: Inst = {
  wave: 'p25', vol: 0.23, env: { a: 0.012, d: 0.12, s: 0.8, r: 0.14 }, gate: 0.95,
  vib: { rate: 5.2, cents: 22, delay: 0.3 }, send: 0.45,
};
const PAD: Inst = { wave: 'p50', vol: 0.08, env: { a: 0.06, d: 0, s: 1, r: 0.05 }, gate: 1 };

// ---- bass: long notes in the intro and bridge, a gentle pulse elsewhere
const LONG = [[0, 12, 0], [12, 4, 7]] as const;
const PULSE = [[0, 4, 0], [4, 2, 0], [6, 2, 12], [8, 4, 0], [12, 2, 0], [14, 2, 7]] as const;
const bass = bassBars(HARMONY, {
  range: [40, 52],
  notes: (bar) => (bar < 4 || (bar >= 16 && bar < 20) ? LONG : PULSE),
});

// ---- arp: eighth notes that rock around the fifth, so the pulse stays put while the chords move
const arpLow = {
  win: [55, 72] as const,
  steps: [0, 2, 4, 6, 8, 10, 12, 14],
  idx: [2, 4, 3, 4, 5, 4, 3, 4],
  len: 2,
  vel: [1, 0.62, 0.8, 0.62, 0.92, 0.62, 0.8, 0.62],
};
const arpHigh = { ...arpLow, win: [67, 84] as const };
const arp = cat(
  ramp(arpBars(HARMONY.slice(0, 4), arpLow), 0.55, 0.85),
  arpBars(HARMONY.slice(4, 16), arpLow),
  arpBars(HARMONY.slice(16, 24), arpHigh),
  arpBars(HARMONY.slice(24, 32), arpLow),
);

// ---- lead: silent for eight bars, then the motif, an answer, the motif again and a falling cadence.
// C sharp in the answer is the leading tone over A7, the one chromatic note in the track.
// The phrases live in motif.ts, so the Upside Down can flip the same ones.
const phrase = cat(motifBars(), ANSWER, motifBars(), CADENCE);
const lead = cat(rest<NoteEv>(8), phrase, rest<NoteEv>(2), motifBars(-12), LONGS, ANSWER, phrase);

// ---- pad: one slow line that moves to the nearest chord tone each bar, from bar five
const pad = cat(rest<NoteEv>(4), lineBars(HARMONY.slice(4), { win: [54, 66], start: 60 }));

// ---- noise: static crackle in the intro, then a half-time beat that grows
const softBeat = grid({ kick: 'x.......o.......', hat: '..o...o...o...o.' });
const fullBeat = grid({ kick: 'x.....x.........', snare: '........X.......', hat: 'o.o.o.o.o.o.o.o.' });
const kickOnly = grid({ kick: 'x.......x.......' });
const roll = grid({ kick: 'X...............', snare: '........X...oooo' });
const again = (n: number, bar: DrumEv[]): DrumEv[][] => Array.from({ length: n }, () => bar);
const noise = cat<DrumEv>(
  [[hit(0, 'swell', 0.5)], [], [hit(11, 'crack', 0.4)], [], [hit(0, 'swell', 0.4)], [], [hit(13, 'crack', 0.4)], []],
  again(8, softBeat),
  [[hit(0, 'swell', 0.5)], [], ...again(5, kickOnly), roll],
  [...again(7, fullBeat), roll],
);

export const STATIC: Track = {
  id: 'static',
  title: 'Static',
  bpm: 92,
  tonic: 'D',
  mode: 'minor',
  // 1 is C sharp: the leading tone in A7 and in the answer phrase.
  chromatic: [1],
  bars: 32,
  layers: ['base'],
  harmony: HARMONY,
  echo: { beats: 0.75, feedback: 0.34, mix: 0.45, cutoff: 3200 },
  channels: [
    { slot: 'tri', layer: 'base', inst: BASS, bars: bass },
    { slot: 'p2', layer: 'base', inst: ARP, bars: arp },
    { slot: 'p1', layer: 'base', inst: LEAD, bars: lead },
    { slot: 'p3', layer: 'base', inst: PAD, bars: pad },
    { slot: 'noi', layer: 'base', bars: noise },
  ],
};
