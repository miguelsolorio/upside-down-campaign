// The Upside Down Hawkins sheet (hawkinsud-variations.html, stage 4.3): a Hawkins street in the Upside Down. The sample room
// is two houses and the street in front of them: roofs, house fronts with windows and doors, dead lawns, the sidewalk, the
// road with its center line, veins across the ground. Letters: # roof, H a house front, w a window in it, D a door, g lawn,
// c sidewalk, . road, = the center line, v veins over the lawn. Props: an abandoned car, a dead streetlight, the gate tear
// in the ground, a grandfather clock left in a yard (the 4.3 curse hazard). The looks are in hawkinsud_a.ts and
// hawkinsud_b.ts, painted on look_kit.ts.
import type { Room, StageLook } from './look_kit.ts';
import { HAWKINSUD_A } from './hawkinsud_a.ts';
import { HAWKINSUD_B } from './hawkinsud_b.ts';

export const HAWKINSUD_ROOM: Room = {
  map: [
    '#######..#######',
    'HHwHHDHH..HwHDHH',
    'ggggggggggggvggg',
    'cccccccccccccccc',
    '................',
    '.==..==..==..==.',
    '................',
    'cccccccccccccccc',
    'ggvggggggggggggg',
    'gggggggvvggggggg',
  ],
  tiles: [
    { ch: '#', name: 'ROOF' }, { ch: 'H', name: 'HOUSE' }, { ch: 'w', name: 'WINDOW' }, { ch: 'D', name: 'DOOR' }, { ch: 'g', name: 'LAWN' },
    { ch: 'c', name: 'WALK' }, { ch: '.', name: 'ROAD' }, { ch: '=', name: 'LINE' }, { ch: 'v', name: 'VEINS' },
  ],
  props: ['CAR', 'STREETLIGHT', 'TEAR', 'CLOCK'],
};

export const HAWKINSUD_OPTS: StageLook[] = [...HAWKINSUD_A, ...HAWKINSUD_B];
