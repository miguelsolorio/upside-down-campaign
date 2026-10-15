// Effects for Level 9 (stage 3.3, the food court): a Mind Flayer leg striking, a leg cut, the skylight breaking, the Key's
// machine blowing up under the mall, and Eleven reaching Billy. Stand-ins until Audio writes them: each borrows a Levels 3 and
// 4 effect (the Levels 5 and 6 ones are checked for copies). Pure data in the shape sfx.ts plays. LEVELS9 is the gain for each.
import type { Recipe } from './sfx_kit.ts';
import { LEVELS34, SFX34 } from './sfx_levels34.ts';

export type Sfx9 = 'legslam' | 'sever' | 'shatter' | 'boom' | 'reach';

/** A stand-in is a copy, so no two effects share one recipe object. */
const copy = (r: Recipe): Recipe => ({ ...r, parts: r.parts.map((p) => ({ ...p })) });

export const SFX9: Record<Sfx9, Recipe> = {
  legslam: copy(SFX34.thud), sever: copy(SFX34.chomp), shatter: copy(SFX34.acid), boom: copy(SFX34.roar),
  reach: copy(SFX34.reveal),
};

export const LEVELS9: Record<Sfx9, number> = {
  legslam: LEVELS34.thud, sever: LEVELS34.chomp, shatter: LEVELS34.acid, boom: LEVELS34.roar, reach: LEVELS34.reveal,
};
