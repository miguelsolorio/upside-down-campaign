// Eddie Munson in the Hellfire Club look, the owner's pick (docs/chapter-4.md, gfx/var/eddie_opts.ts, HELLFIRE): the club's raglan tee,
// white with black sleeves and the red demon on the chest, black jeans, long dark curls, a red Flying V slung on his back. The sheet's
// design is the game's: the sprite is drawn from it frame by frame (actor_eddie.ts), the paper doll below is for what draws a hero from
// one (the map's token), and the portrait is on its dark red ground with the tongue-out grin for the happy face. Five fill colors (skin,
// brown, white, black, red) and the ink outline.
import type { CharSpec } from './types.ts';
import type { EddieOpt } from '../var/eddie_kit.ts';
import { EDDIE_OPTS } from '../var/eddie_opts.ts';

/** The pick: the Hellfire Club, the first of the sheet's five. */
export const EDDIE_PICK = EDDIE_OPTS[0] as EddieOpt;

/** The paper doll, with the raglan sleeves in their own color. It has no guitar: the sprite's frames add it. */
export const EDDIE_SPEC: CharSpec = { ...EDDIE_PICK.spec, sleeve: EDDIE_PICK.sleeve };

export const EDDIE_PORTRAIT = EDDIE_PICK.portrait;
