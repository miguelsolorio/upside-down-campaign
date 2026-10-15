// Starcourt: 3.1 and 3.2. A stand-in until Audio writes the real track (docs/level-7.md, "What Audio makes"): C Lydian,
// 118 bpm, bright mall pop with the motif in Lydian. For now it is Hawkins under its own id, so the stages have music.
import type { Track } from './types.ts';
import { HAWKINS } from './hawkins.ts';

export const STARCOURT: Track = { ...HAWKINS, id: 'starcourt', title: 'Starcourt' };
