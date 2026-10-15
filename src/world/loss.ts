// How a stage is lost. The whole party going down loses it, and so does the ward falling in a defense (docs/level-6.md): the game
// over card comes up either way, and for the ward it names the reason. Pure, so Node can test it.
import type { SimEvent } from '../core/types.ts';

/** The line under the game over title when the one the party was guarding went down. */
export const WARD_DOWN_REASON = 'ELEVEN IS DOWN';

/** True for a sim event that loses the stage: `allDown`, or `wardDown`. */
export const isLoss = (e: SimEvent): boolean => e.t === 'allDown' || e.t === 'wardDown';

/** What the game over card says for this loss: nothing for the party going down, the ward's line for the ward. */
export const lossReason = (e: SimEvent): string | undefined => (e.t === 'wardDown' ? WARD_DOWN_REASON : undefined);
