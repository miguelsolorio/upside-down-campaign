// The effect for the Hellfire solo (src/solo): the feedback squeal that cuts a solo short after three misses in a row. One
// recipe in the shape sfx.ts plays, and its level, measured with an offline render (renderWith in render.ts, the audio lab's
// E key). It is the one sustained, screaming sound in the game, so it is long and high where the rest are short thumps:
// nothing else holds a note above 1 kHz for a second.
import { N, R, T, bp, hp } from './sfx_kit.ts';
import type { Recipe } from './sfx_kit.ts';

export type SfxSolo = 'squeal';

// squeal: an amp howling back at the guitar, a second and a quarter. A square wave climbs from B4 (494 Hz) to E6 (1319 Hz)
// over the whole sound and wobbles on a wide, slow vibrato; a thin pulse an octave over it climbs to E7 and is the harmonic
// that makes it scream. The amp thumps once as it starts (a triangle falling from 82 Hz to 55 Hz), a hiss swells behind
// the howl, and four crackles pop in the last half as the cable is pulled. E is the solo's key, so the squeal ends in tune.
const CRACKLES = [[0.6, 0.4], [0.74, 0.34], [0.9, 0.3], [1.05, 0.26]] as const;
const SQUEAL = R([
  T('p50', 494, 1.25, 0.3, { f2: 1319, hold: true, vib: { rate: 6.5, cents: 55, delay: 0.2 } }),
  T('p12', 988, 1.15, 0.13, { at: 0.08, f2: 2637, hold: true, vib: { rate: 7.5, cents: 40, delay: 0.3 } }),
  T('tri', 82, 0.3, 0.45, { f2: 55 }),
  N(15, 30000, 1.2, 0.25, { f: bp(2600, 1800, 2.2), rise: 0.35 }),
  ...CRACKLES.map(([at, v]) => N(7, 12000, 0.04, v, { at, f: hp(3000) })),
], 0.02);

export const SFX_SOLO: Record<SfxSolo, Recipe> = { squeal: SQUEAL };

/** Gain per effect, from an offline render: peak after the limiter near 0.45, a little under the impacts (the unit peak, at gain 1, is 0.97). */
export const LEVELS_SOLO: Record<SfxSolo, number> = { squeal: 0.46 };
