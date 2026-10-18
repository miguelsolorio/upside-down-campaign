// Effects for Levels 14 and 15 (stages 5.1 and 5.2): the Commander's whistle, a hit bouncing off a trooper's shield, a smash breaking
// that shield for good, and a twin Demogorgon dropping into the void. Stand-ins until Audio writes them (docs/level-14.md,
// docs/level-15.md): each is a short plain recipe so the game has something to play. Pure data in the shape sfx.ts plays. LEVELS1415
// is the gain for each.
import { N, R, T, bp, lp } from './sfx_kit.ts';
import type { Recipe } from './sfx_kit.ts';

export type Sfx1415 = 'whistle' | 'clang' | 'shieldBreak' | 'fall';

export const SFX1415: Record<Sfx1415, Recipe> = {
  whistle: R([T('p50', 2300, 0.35, 0.3, { hold: true, f2: 2500, vib: { rate: 30, cents: 60, delay: 0.02 } }), N(7, 20000, 0.3, 0.1, { f: bp(3200, undefined, 2) })], 0.01),
  clang: R([T('tri', 880, 0.18, 0.4, { f2: 700 }), N(15, 30000, 0.05, 0.5, { f: bp(2400, undefined, 2) })], 0.01),
  shieldBreak: R([N(15, 30000, 0.2, 0.7, { f: bp(3000, 900, 1.2) }), T('tri', 520, 0.2, 0.3, { f2: 130 }), T('p12', 1700, 0.12, 0.2, { at: 0.03, f2: 600 })], 0.02),
  fall: R([T('tri', 700, 0.9, 0.35, { f2: 70 }), N(15, 9000, 0.8, 0.25, { f: lp(900, 150) })], 0.02),
};

export const LEVELS1415: Record<Sfx1415, number> = { whistle: 0.35, clang: 0.45, shieldBreak: 0.5, fall: 0.45 };
