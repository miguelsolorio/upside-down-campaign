// Effects for Levels 5 and 6 (stages 2.2 and 2.3): the Alpha's howl, Max's skate, a cracked wall breaking, Steve's
// Babysit, the Gate rumbling and shutting. Stand-ins until Audio writes them: each borrows a Levels 3 and 4 effect.
// Pure data in the shape sfx.ts plays. LEVELS56 is the gain for each.
import type { Recipe } from './sfx_kit.ts';
import { LEVELS34, SFX34 } from './sfx_levels34.ts';

export type Sfx56 = 'howl' | 'skate' | 'crack' | 'taunt' | 'rumble' | 'gateShut';

/** A stand-in is a copy, so no two effects share one recipe object. */
const copy = (r: Recipe): Recipe => ({ ...r, parts: r.parts.map((p) => ({ ...p })) });

export const SFX56: Record<Sfx56, Recipe> = {
  howl: copy(SFX34.roar), skate: copy(SFX34.lunge), crack: copy(SFX34.thud), taunt: copy(SFX34.petals), rumble: copy(SFX34.thud),
  gateShut: copy(SFX34.roar),
};

export const LEVELS56: Record<Sfx56, number> = {
  howl: LEVELS34.roar, skate: LEVELS34.lunge, crack: LEVELS34.thud, taunt: LEVELS34.petals, rumble: LEVELS34.thud * 0.6, gateShut: LEVELS34.roar,
};
