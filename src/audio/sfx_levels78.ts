// Effects for Levels 7 and 8 (stages 3.1 and 3.2): Nancy's pistol and shotgun, Robin's scoop and babble, a soldier's rifle,
// a melting rat bursting, a grab, a cipher door opening, an item from Erica's stash, and a purchase at her cart.
// Stand-ins until Audio writes them: each borrows a Levels 3 and 4 effect. Pure data in the shape sfx.ts plays. LEVELS78
// is the gain for each.
import type { Recipe } from './sfx_kit.ts';
import { LEVELS34, SFX34 } from './sfx_levels34.ts';

export type Sfx78 = 'pistol' | 'shotgun' | 'scoop' | 'babble' | 'rifle' | 'melt' | 'grab' | 'decode' | 'stash' | 'buy';

/** A stand-in is a copy, so no two effects share one recipe object. */
const copy = (r: Recipe): Recipe => ({ ...r, parts: r.parts.map((p) => ({ ...p })) });

export const SFX78: Record<Sfx78, Recipe> = {
  pistol: copy(SFX34.chomp), shotgun: copy(SFX34.thud), scoop: copy(SFX34.acid), babble: copy(SFX34.petals), rifle: copy(SFX34.chomp),
  melt: copy(SFX34.acid), grab: copy(SFX34.lunge), decode: copy(SFX34.reveal), stash: copy(SFX34.reveal), buy: copy(SFX34.reveal),
};

export const LEVELS78: Record<Sfx78, number> = {
  pistol: LEVELS34.chomp, shotgun: LEVELS34.thud, scoop: LEVELS34.acid, babble: LEVELS34.petals, rifle: LEVELS34.chomp * 0.7,
  melt: LEVELS34.acid, grab: LEVELS34.lunge, decode: LEVELS34.reveal, stash: LEVELS34.reveal, buy: LEVELS34.reveal,
};
