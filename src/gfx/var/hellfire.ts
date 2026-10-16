// The Hellfire Club sheet (hellfire-variations.html, the start of stage 4.2): Eddie's recruit scene, in the club's room at Hawkins
// High, spring 1986. The sample room is a classroom after hours: the north wall with a window, the chalkboard, the club's banner
// between two posters, a window, the door and a bookcase; linoleum; student desks in rows on the left; and in the middle the D&D
// table, with Eddie standing at its head behind the DM screen and two kids in chairs either side. Letters: # wall top, W wall
// face, C chalkboard, P poster, w window, D door, S bookcase, . floor, d desk. Props: the table, the banner, the DM screen,
// Eddie, Mike, Dustin (the chairs and the clock follow, unnamed). The looks are in hellfire_a.ts and hellfire_b.ts, painted on
// look_kit.ts with the painters of hellfire_paint.ts and hellfire_props.ts.
import type { Room, StageLook } from './look_kit.ts';
import { HELLFIRE_A } from './hellfire_a.ts';
import { HELLFIRE_B } from './hellfire_b.ts';

export const HELLFIRE_ROOM: Room = {
  map: [
    '################',
    'wwWCCCPWWPwwWDSS',
    '................',
    '.d.d............',
    '................',
    '.d.d............',
    '................',
    '.d.d............',
    '................',
    '................',
  ],
  tiles: [
    { ch: '#', name: 'TOP' }, { ch: 'W', name: 'WALL' }, { ch: 'C', name: 'BOARD' }, { ch: 'P', name: 'POSTER' },
    { ch: 'w', name: 'WINDOW' }, { ch: 'D', name: 'DOOR' }, { ch: 'S', name: 'SHELF' }, { ch: '.', name: 'FLOOR' }, { ch: 'd', name: 'DESK' },
  ],
  props: ['TABLE', 'BANNER', 'SCREEN', 'EDDIE', 'MIKE', 'DUSTIN'],
};

export const HELLFIRE_OPTS: StageLook[] = [...HELLFIRE_A, ...HELLFIRE_B];
