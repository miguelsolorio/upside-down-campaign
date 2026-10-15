// The Creel House sheet (creel-variations.html, stage 4.2 and the start of 4.4): the inside of the house at night. The sample
// room is a parlor and the hall below it: the north wall with a haunted mirror, a window and a shattered mirror, floorboards
// and a rug, a partition wall with its own mirror and a doorway, and holes in the floor. Letters: # wall top, W wall face,
// M a haunted mirror (Eddie's riff gate), m the same mirror shattered, w a window, . floorboards, r the rug, x a hole in the
// floor. Props: the grandfather clock (its chime is the curse), a lamp, an armchair. The looks are in creel_a.ts and
// creel_b.ts, painted on look_kit.ts.
import type { Room, StageLook } from './look_kit.ts';
import { CREEL_A } from './creel_a.ts';
import { CREEL_B } from './creel_b.ts';

export const CREEL_ROOM: Room = {
  map: [
    '################',
    'WWMWWWwwWWWWmWWW',
    '................',
    '..rrrrrr........',
    '..rrrrrr....x...',
    '..rrrrrr........',
    '########..######',
    'WWWMWWWW..WWWwWW',
    '................',
    '....x...........',
  ],
  tiles: [
    { ch: '#', name: 'TOP' }, { ch: 'W', name: 'WALL' }, { ch: 'M', name: 'MIRROR' }, { ch: 'm', name: 'SHATTERED' },
    { ch: 'w', name: 'WINDOW' }, { ch: '.', name: 'FLOOR' }, { ch: 'r', name: 'RUG' }, { ch: 'x', name: 'HOLE' },
  ],
  props: ['CLOCK', 'LAMP', 'CHAIR'],
};

export const CREEL_OPTS: StageLook[] = [...CREEL_A, ...CREEL_B];
