// Registry of the music tracks. Pure data: Node tests import this file.
import type { TrackId } from '../../core/types.ts';
import type { Track } from './types.ts';
import { STATIC } from './static.ts';
import { MIRKWOOD } from './mirkwood.ts';
import { LAB } from './lab.ts';

// upside, clock and hawkins borrow an existing track until Audio writes them. TRACK_IDS lists only the real ones.
export const TRACKS: Record<TrackId, Track> = { static: STATIC, mirkwood: MIRKWOOD, lab: LAB, upside: MIRKWOOD, clock: LAB, hawkins: STATIC };
export const TRACK_IDS: TrackId[] = ['static', 'mirkwood', 'lab'];
