// The four pit looks in card order, for pit-variations.html. The room and the shared pieces are in pit_kit.ts.
import type { StageLook } from './look_kit.ts';
import { PIT_A } from './pit_a.ts';
import { PIT_B } from './pit_b.ts';

export { PIT_ROOM } from './pit_kit.ts';
export const PIT_OPTS: StageLook[] = [...PIT_A, ...PIT_B];
