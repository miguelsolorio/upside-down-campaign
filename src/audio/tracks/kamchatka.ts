// kamchatka: mirkwood in the snow, for stage 4.1 (docs/level-10.md). A stand-in until Audio writes it: mirkwood as it is, so the
// stage has its music. Pure data: Node tests import this file.
import type { Track } from './types.ts';
import { MIRKWOOD } from './mirkwood.ts';

export const KAMCHATKA: Track = { ...MIRKWOOD, id: 'kamchatka' };
