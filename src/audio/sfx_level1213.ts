// Effects for Levels 12 and 13 (stages 4.3 and 4.4): a demobat's dive, a flock passing, the storm's thunder, Vecna's vine lash, a
// memory orb breaking, a throw landing and his call as a phase turns. Stand-ins until Audio writes them (docs/level-12.md,
// docs/level-13.md): short plain recipes so the game has something to play. LEVELS1213 is the gain for each.
import { N, R, T, bp, lp } from './sfx_kit.ts';
import type { Recipe } from './sfx_kit.ts';

export type Sfx1213 = 'screech' | 'flap' | 'bolt' | 'whip' | 'orb' | 'debris' | 'vecna';

export const SFX1213: Record<Sfx1213, Recipe> = {
  screech: R([T('p12', 2200, 0.2, 0.3, { f2: 1400 })], 0.01),
  flap: R([N(7, 6000, 0.08, 0.3, { f: bp(900, undefined, 1.2) })], 0.01),
  bolt: R([N(15, 4000, 0.6, 0.6, { f: lp(400, 90) })], 0.02),
  whip: R([N(15, 18000, 0.12, 0.5, { f: bp(1800, 3200, 2) })], 0.01),
  orb: R([T('tri', 900, 0.2, 0.3, { f2: 300 }), N(7, 9000, 0.15, 0.3, { f: bp(2400, undefined, 2) })], 0.01),
  debris: R([N(15, 5000, 0.3, 0.6, { f: lp(700, 150) })], 0.02),
  vecna: R([T('saw', 55, 0.8, 0.4, { f2: 41 })], 0.03),
};

export const LEVELS1213: Record<Sfx1213, number> = { screech: 0.4, flap: 0.3, bolt: 0.4, whip: 0.4, orb: 0.4, debris: 0.4, vecna: 0.4 };
