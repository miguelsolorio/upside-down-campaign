// Sour: Starcourt going sour near the Mind Flayer, in 3.3 (docs/level-9.md, "What Audio makes"). A stand-in until Audio
// writes it: for now it is Starcourt under its own id, so the stage has music where the `sour` beat switches to it.
import type { Track } from './types.ts';
import { STARCOURT } from './starcourt.ts';

export const SOUR: Track = { ...STARCOURT, id: 'sour', title: 'Starcourt, sour' };
