// The three poses Grigori has that no hero does (docs/level-8.md): the haymaker's wind-up and swing, and the grab. They are arm
// targets for the big body plus a lean, in the same terms as the game's own poses, so Art can add them to actor_pose.ts as they
// are. Wind-up: the fist goes back past the hip and the body leans away. Swing: the whole shoulder comes round and the fist ends
// out front at chest height. Grab: both arms reach, the body lunges. Pure data: no DOM.
import type { ArmTable, PoseDef, Rig3, Stamp } from './compose3.ts';

export const GRIGORI_ARMS: ArmTable = {
  side: { wind: [[10, 10], [3, 6]], swing: [[3, 10], [13, 9]], grab: [[12, 8], [14, 9]] },
  down: { wind: [[3, 10], [15, 5]], swing: [[3, 11], [6, 12]], grab: [[1, 8], [14, 8]] },
  up: { wind: [[3, 10], [15, 5]], swing: [[3, 11], [8, 6]], grab: [[1, 8], [14, 8]] },
};

export const WIND: PoseDef = { legs: 'wide', arms: 'wind', face: 'open', bob: 0, lean: -2, leanV: 0 };
export const SWING: PoseDef = { legs: 'wide', arms: 'swing', face: 'closed', bob: 0, lean: 2, leanV: 1 };
export const GRAB: PoseDef = { legs: 'wide', arms: 'grab', face: 'open', bob: 0, lean: 2, leanV: 1 };

/** A fist, a 2 by 2 block of skin on the near hand, so the arm ends in something in the three poses. */
const FIST: Stamp[] = [{ ox: -1, oy: -1, rows: ['ss', 'ss'] }];
export const GRIGORI_FISTS: NonNullable<Rig3['heldBy']> = {
  wind: { down: FIST, up: FIST, side: FIST },
  swing: { down: FIST, up: FIST, side: FIST },
  grab: { down: FIST, up: FIST, side: FIST },
};
