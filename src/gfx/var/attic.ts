// The Vecna's attic sheet (attic-variations.html, stage 4.4): the room under the roof of the Creel House in the Upside Down,
// where Vecna fights in three phases. The sample room has the north wall as the underside of the roof, two tiles deep, then
// floorboards with a worn rug where he stands, and an eave on each side. Letters: # the roof, W the knee wall under it,
// . floorboards, r the rug, < the eave on the west and > the eave on the east (the same eave mirrored). Three looks keep the eave
// as low floor along the walls where the cover sits, and one slopes the roof in over it. Props: the grandfather clock, the round
// window, a memory orb (there are four), Vecna and Max for scale, a trunk, furniture under a sheet and a dress form. The looks
// are in attic_a.ts and attic_b.ts, painted on look_kit.ts, all in the Upside Down skin of the Creel House (creel_b.ts).
import type { Room, StageLook } from './look_kit.ts';
import { ATTIC_A } from './attic_a.ts';
import { ATTIC_B } from './attic_b.ts';

export const ATTIC_ROOM: Room = {
  map: [
    '################',
    'WWWWWWWWWWWWWWWW',
    '<<<..........>>>',
    '<<<..........>>>',
    '<<<..rrrrrr..>>>',
    '<<<..rrrrrr..>>>',
    '<<<..rrrrrr..>>>',
    '<<<..rrrrrr..>>>',
    '<<<..........>>>',
    '<<<..........>>>',
  ],
  tiles: [
    { ch: '#', name: 'ROOF' }, { ch: 'W', name: 'KNEE WALL' }, { ch: '.', name: 'FLOOR' }, { ch: 'r', name: 'RUG' }, { ch: '<', name: 'EAVE' },
  ],
  props: ['CLOCK', 'WINDOW', 'ORB', 'VECNA', 'MAX', 'TRUNK', 'SHEET', 'DRESS FORM'],
};

export const ATTIC_OPTS: StageLook[] = [...ATTIC_A, ...ATTIC_B];
