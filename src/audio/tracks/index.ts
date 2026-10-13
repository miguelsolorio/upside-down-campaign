// Registry of the music tracks. Pure data: Node tests import this file.
import type { TrackId } from '../../core/types.ts';
import type { Track } from './types.ts';
import { STATIC } from './static.ts';
import { MIRKWOOD } from './mirkwood.ts';

export const TRACKS: Record<TrackId, Track> = { static: STATIC, mirkwood: MIRKWOOD };
export const TRACK_IDS: TrackId[] = ['static', 'mirkwood'];
