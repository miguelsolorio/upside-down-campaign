// Registry of the music tracks. Pure data: Node tests import this file.
import type { TrackId } from '../../core/types.ts';
import type { Track } from './types.ts';
import { STATIC } from './static.ts';
import { MIRKWOOD } from './mirkwood.ts';
import { LAB } from './lab.ts';
import { UPSIDE } from './upside.ts';
import { CLOCK } from './clock.ts';
import { HAWKINS } from './hawkins.ts';
import { STARCOURT } from './starcourt.ts';

export const TRACKS: Record<TrackId, Track> = {
  static: STATIC, mirkwood: MIRKWOOD, lab: LAB, upside: UPSIDE, clock: CLOCK, hawkins: HAWKINS, starcourt: STARCOURT,
};
export const TRACK_IDS: TrackId[] = ['static', 'mirkwood', 'lab', 'upside', 'clock', 'hawkins', 'starcourt'];
