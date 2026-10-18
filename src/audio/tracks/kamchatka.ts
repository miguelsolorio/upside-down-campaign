// Kamchatka: Mirkwood in the snow, for stage 4.1 (docs/level-10.md, "What Audio makes"). Every note is Mirkwood's. The bars are
// imported from MIRKWOOD and bent, so the key (A minor, with the G sharp that leads into the closing E), the harmony and the
// bells are the same notes in the same places, the way Sour is Starcourt's. What changes is how they are played:
// - Slower: sixteen bpm down, 60 against 76, so the loop runs 128 s instead of 101.
// - Thinner: a third of the bells are let go (never the G sharp), the drone sits an octave up with nothing under it, the combat
//   bass is an octave up as well and keeps the four beats of the bar, not the eighths between them, and the stabs keep two
//   off-beats of four.
// - Colder: the bells are the thin 12.5 percent pulse in place of the 25 percent one, the drone has lost its vibrato, and the
//   echo is a full second long, brighter and sung into harder, so each bell rings on over the snow after it has gone.
// - Wind: a gust (the noise voice's wind) takes the first half of every second bar, 1.7 s of it, which is 6.8 steps at this
//   tempo. The clock's ticks keep their steps and wait for it, at four-fifths of their level. The combat drums wait too, as in the
//   Upside Down: in the bars where the wind blows, nothing on the noise voice starts before step eight.
// Base: drone, bells, wind and ticks. Combat: bass, stabs, drums. Five voices at most: the layers share only the noise slot.
import type { DrumEv, Inst, LayerId, NoiseChannel, NoteEv, PitchedChannel, PitchedSlot, Track } from './types.ts';
import { MIRKWOOD } from './mirkwood.ts';
import { hit } from './theory.ts';

function pitched(slot: PitchedSlot, layer: LayerId): PitchedChannel {
  const c = MIRKWOOD.channels.find((ch) => ch.slot === slot && ch.layer === layer);
  if (!c || c.slot === 'noi') throw new Error(`Mirkwood has no ${layer} ${slot} channel`);
  return c;
}
function noisy(layer: LayerId): NoiseChannel {
  const c = MIRKWOOD.channels.find((ch) => ch.slot === 'noi' && ch.layer === layer);
  if (!c || c.slot !== 'noi') throw new Error(`Mirkwood has no ${layer} noise channel`);
  return c;
}

const DRONE = pitched('tri', 'base');
const BELLS = pitched('p1', 'base');
const BASS = pitched('p2', 'combat');
const STABS = pitched('p3', 'combat');

// ---- base: the drone, an octave up. Thin, and with nothing under the bells to warm them.
const drone: NoteEv[][] = DRONE.bars.map((bar) => bar.map((e) => ({ ...e, midi: e.midi + 12 })));

// ---- base: the bells. Every third one is let go, except the G sharp: it is the leading tone of the closing block, and
// Mirkwood's key lists it as its one exception. Each is held three steps, 0.75 s, where Mirkwood held six: its decay is gone
// by then, the echo carries it, and it does not ride over the beat after.
const all = BELLS.bars.flat();
const letGo = new Set(all.filter((e, i) => i % 3 === 2 && e.midi % 12 !== 8));
const bells: NoteEv[][] = BELLS.bars.map((bar) => bar.filter((e) => !letGo.has(e)).map((e) => ({ ...e, len: 3 })));

// ---- base: the wind and the clock. A gust takes the first half of every second bar; it rings 1.7 s, which is 6.8 steps at
// 60 bpm. The ticks keep Mirkwood's steps (tick, tock, tick, tock, and the last tock of every fourth bar missing) wherever
// the gust is not on them, a little quieter.
const GUST = [1, 0.6, 0.85, 0.5];
const gusts = (bar: number): boolean => bar % 2 === 0;
const wind: DrumEv[][] = noisy('base').bars.map((ticks, bar) => [
  ...(gusts(bar) ? [hit(0, 'wind', GUST[(bar / 2) % 4])] : []),
  ...ticks.filter((t) => !gusts(bar) || t.step >= 8).map((t) => ({ ...t, vel: (t.vel ?? 1) * 0.8 })),
]);

// ---- combat: the bass an octave up, on the beats only: root and octave (fifth in the turning bars). The off-beats are the
// stabs'. The notes on steps zero and eight are held a step longer, because no stab follows them to collide with.
const bass: NoteEv[][] = BASS.bars.map((bar) =>
  bar.filter((e) => e.step % 4 === 0).map((e) => ({ ...e, midi: e.midi + 12, len: e.step % 8 === 0 ? 3 : 2 })));

// ---- combat: two stabs a bar, on the off-beats at steps six and fourteen.
const stabs: NoteEv[][] = STABS.bars.map((bar) => bar.filter((e) => e.step % 8 === 6).map((e) => ({ ...e })));

// ---- combat: Mirkwood's drums, minus whatever the gust is standing on.
const drums: DrumEv[][] = noisy('combat').bars.map((bar, i) => bar.filter((h) => !gusts(i) || h.step >= 8).map((h) => ({ ...h })));

// The drone is still: no vibrato. The bells are the thin pulse and sing into the echo harder. The bass is the square, which gives
// the most sound for the least peak: the coincident amplitudes in tracks-new.test.ts stay under Mirkwood's.
const DRONE_COLD: Inst = { wave: 'tri', vol: 0.22, env: { a: 0.08, d: 0, s: 1, r: 0.06 }, gate: 1 };
const BELL_COLD: Inst = { wave: 'p12', vol: 0.27, env: { a: 0.002, d: 1.3, s: 0, r: 0.15, exp: true }, gate: 1, send: 0.9 };
const BASS_COLD: Inst = { wave: 'p50', vol: 0.3, env: { a: 0.002, d: 0.2, s: 0.5, r: 0.04 }, gate: 0.72 };
const STAB_COLD: Inst = { ...STABS.inst, vol: 0.32, send: 0.45 };

export const KAMCHATKA: Track = {
  ...MIRKWOOD,
  id: 'kamchatka',
  title: 'Kamchatka',
  bpm: 60,
  echo: { beats: 1, feedback: 0.5, mix: 0.5, cutoff: 3200 },
  channels: [
    { slot: 'tri', layer: 'base', inst: DRONE_COLD, bars: drone },
    { slot: 'p1', layer: 'base', inst: BELL_COLD, bars: bells },
    { slot: 'noi', layer: 'base', bars: wind },
    { slot: 'p2', layer: 'combat', inst: BASS_COLD, bars: bass },
    { slot: 'p3', layer: 'combat', inst: STAB_COLD, bars: stabs },
    { slot: 'noi', layer: 'combat', bars: drums },
  ],
};
