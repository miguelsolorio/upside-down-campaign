// Sour: Starcourt going sour, for the climb to the court in 3.3 (docs/level-9.md, "What Audio makes"). Every note is
// Starcourt's. The bars are imported from STARCOURT and bent, so the harmony, the Hawkins motif in Lydian and the raised
// fourth are the same notes in the same places and the key is still C Lydian. What changes is how it is played: ten bpm
// slower (108), the lead and a second pulse a few cents flat of it beating against each other under a slow, wide
// vibrato, the lead letting go of the last note of each phrase so the flat voice is left alone and the phrase sags, a
// bass that sinks and drags, and the bright parts thinned: the arp is down to one dim note a beat and an octave lower,
// the shaker keeps its off-beats, the combat chug loses its octave pops and runs a fifth of a semitone flat, and the
// echo is darker.
// The three pulse slots are full: the combat layer's chug has p3, so the second pulse takes the arp's p2. It doubles the
// lead wherever the lead plays and is the arp's one dim note a beat in the intro and the breakdown, where the lead rests.
// A true sag, a pitch that bends down through a held note, needs a per-note bend the engine does not have, so the sag is
// the hand-off between the two voices and not a slide.
// Base: bass, lead, the second pulse, shaker. Combat: the chug on p3 and the same drums as Starcourt.
import type { DrumEv, Inst, LayerId, NoiseChannel, NoteEv, PitchedChannel, PitchedSlot, Track } from './types.ts';
import { STARCOURT } from './starcourt.ts';

function pitched(slot: PitchedSlot, layer: LayerId): PitchedChannel {
  const c = STARCOURT.channels.find((ch) => ch.slot === slot && ch.layer === layer);
  if (!c || c.slot === 'noi') throw new Error(`Starcourt has no ${layer} ${slot} channel`);
  return c;
}
function noisy(layer: LayerId): NoiseChannel {
  const c = STARCOURT.channels.find((ch) => ch.slot === 'noi' && ch.layer === layer);
  if (!c || c.slot !== 'noi') throw new Error(`Starcourt has no ${layer} noise channel`);
  return c;
}

const BASS = pitched('tri', 'base');
const LEAD = pitched('p1', 'base');
const ARP = pitched('p2', 'base');
const DRIVE = pitched('p3', 'combat');

// ---- base: bass. Starcourt's bounce without its bounce: the octave pops (the one-sixteenth notes) are dropped and each
// root holds on to the next onset, up to a beat, so it plods. Roots at F sharp and above sink an octave, which puts the
// roots between F sharp 1 and E 2 (46 to 82 Hz) instead of C 2 and B 2.
const bass: NoteEv[][] = BASS.bars.map((bar) => {
  const kept = bar.filter((e) => e.len > 1);
  const sink = Math.min(...bar.map((e) => e.midi)) >= 42 ? 12 : 0;
  return kept.map((e, i) => ({ ...e, midi: e.midi - sink, len: Math.min(4, (kept[i + 1]?.step ?? 16) - e.step) }));
});

// ---- base: the lead. The same notes, and the same lengths except at the end of a phrase. Starcourt's phrases are two
// bars from bar five, so a phrase ends on the last note of every odd-numbered bar index. That note, when it is a long one
// that runs to the bar line, is held by the lead for half its length only. The second pulse keeps holding it, flat.
const sags = (bar: number, evs: readonly NoteEv[], i: number): boolean =>
  bar % 2 === 1 && i === evs.length - 1 && evs[i].len >= 6 && evs[i].step + evs[i].len >= 15;
const lead: NoteEv[][] = LEAD.bars.map((evs, bar) =>
  evs.map((e, i) => (sags(bar, evs, i) ? { ...e, len: Math.ceil(e.len / 2) } : { ...e })));

// ---- base: the second pulse. Where the lead plays, the lead's line in full. Where it rests (the intro and the breakdown)
// the arp, thinned to the first note of each twinkle, held two sixteenths, an octave down and quieter.
const sparkle: NoteEv[][] = ARP.bars.map((evs) =>
  evs.filter((e) => e.step % 4 === 0).map((e) => ({ ...e, len: 2, midi: e.midi - 12, vel: (e.vel ?? 1) * 0.7 })));
const twin: NoteEv[][] = LEAD.bars.map((evs, bar) => (evs.length > 0 ? evs.map((e) => ({ ...e })) : sparkle[bar]));

// ---- base: shaker. Only the off-beats at steps six and fourteen, a little quieter. The kick's push keeps steps ten.
const hats: DrumEv[][] = noisy('base').bars.map((bar) =>
  bar.filter((h) => h.step % 8 === 6).map((h) => ({ ...h, vel: (h.vel ?? 1) * 0.75 })));

// ---- combat: the chug on eighth notes, with the octave pops (every fourth sixteenth) taken out.
const drive: NoteEv[][] = DRIVE.bars.map((evs) => evs.filter((e) => e.step % 4 !== 3).map((e) => ({ ...e })));
const drums: DrumEv[][] = noisy('combat').bars.map((bar) => bar.map((h) => ({ ...h })));

// The lead sits four cents sharp and the second pulse sixteen flat, twenty cents apart: at D5 that beats about seven times
// a second. Vibratos are slow and wide (3.2 and 2.7 Hz, 40 and 44 cents), and start late and differently, so the two drift
// in and out of step. The chug is flat of everything. The lead and the pair are quieter than Starcourt's lead, because a
// pair that beats and a bass that never lets go add up to a louder mix, and every track is kept in the same range.
const LEAD_SOUR: Inst = { ...LEAD.inst, vol: LEAD.inst.vol * 0.88, vib: { rate: 3.2, cents: 40, delay: 0.3 }, detune: 4, send: 0.3 };
const TWIN_SOUR: Inst = {
  ...LEAD.inst, vol: LEAD.inst.vol * 0.6, env: { a: 0.04, d: 0.2, s: 0.7, r: 0.22 },
  vib: { rate: 2.7, cents: 44, delay: 0.55 }, detune: -16, send: 0.3,
};
const DRIVE_SOUR: Inst = { ...DRIVE.inst, detune: -18 };
// The bass holds its notes longer, which is what leaning on the low end sounds like.
const BASS_SOUR: Inst = { ...BASS.inst, vol: 0.19, gate: 0.92 };

export const SOUR: Track = {
  ...STARCOURT,
  id: 'sour',
  title: 'Starcourt, sour',
  bpm: 108,
  echo: { beats: 0.75, feedback: 0.4, mix: 0.4, cutoff: 1900 },
  channels: [
    { slot: 'tri', layer: 'base', inst: BASS_SOUR, bars: bass },
    { slot: 'p1', layer: 'base', inst: LEAD_SOUR, bars: lead },
    { slot: 'p2', layer: 'base', inst: TWIN_SOUR, bars: twin },
    { slot: 'noi', layer: 'base', bars: hats },
    { slot: 'p3', layer: 'combat', inst: DRIVE_SOUR, bars: drive },
    { slot: 'noi', layer: 'combat', bars: drums },
  ],
};
