// Effects for Levels 10 and 11 (stages 4.1 and 4.2): Hopper's haymaker, Eddie's Flying V, a pulse of his solo and the feedback that
// cuts it short, a grandfather clock's chime, a hero lifted by the curse, Max's Walkman and a Creel ghoul stepping out of a mirror.
// Stand-ins until Audio writes them (docs/level-10.md, docs/level-11.md): each is a short plain recipe so the game has something to
// play. Pure data in the shape sfx.ts plays. LEVELS1011 is the gain for each.
import { N, R, T, bp, lp } from './sfx_kit.ts';
import type { Recipe } from './sfx_kit.ts';

export type Sfx1011 = 'haymaker' | 'vswing' | 'riff' | 'feedback' | 'chime' | 'curse' | 'walkman' | 'ghoul';

export const SFX1011: Record<Sfx1011, Recipe> = {
  haymaker: R([N(15, 9000, 0.12, 0.6, { f: lp(1200, 300) }), T('tri', 120, 0.12, 0.6, { f2: 60 })], 0.02),
  vswing: R([N(15, 12000, 0.1, 0.5, { f: bp(1500, 700, 1) }), T('p25', 165, 0.18, 0.3)], 0.02),
  riff: R([T('p50', 110, 0.16, 0.4), T('p50', 165, 0.16, 0.3)], 0.02),
  feedback: R([T('p12', 1800, 0.5, 0.3, { f2: 2600 })], 0.01),
  chime: R([T('tri', 196, 0.9, 0.5), T('tri', 392, 0.6, 0.2)], 0.01),
  curse: R([N(15, 6000, 0.6, 0.4, { f: lp(500, 200), rise: 0.3 })], 0.01),
  walkman: R([N(7, 9000, 0.03, 0.4, { f: bp(2000, undefined, 1) }), T('p25', 659, 0.1, 0.25, { at: 0.06 }), T('p25', 880, 0.15, 0.25, { at: 0.16 })], 0.01),
  ghoul: R([N(15, 20000, 0.35, 0.4, { f: bp(3000, 4500, 2) }), T('tri', 1200, 0.3, 0.15, { f2: 700 })], 0.02),
};

export const LEVELS1011: Record<Sfx1011, number> = { haymaker: 0.5, vswing: 0.5, riff: 0.5, feedback: 0.3, chime: 0.4, curse: 0.4, walkman: 0.4, ghoul: 0.4 };
