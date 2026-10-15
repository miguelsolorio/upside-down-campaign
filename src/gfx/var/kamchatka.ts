// The Kamchatka sheet (kamchatka-variations.html, stage 4.1): Hopper's prison camp. The sample room is the snow yard on the
// left, inside the wire, and the prison block on the right through an open doorway: a hall, then the cell row whose barred
// doors face the corridor below. Letters: f the wire fence, . snow, d a drift, t the trampled path, # wall top, W wall face,
// b a barred cell door in the face, c concrete floor, g a floor grate. Props: the floodlight, a burning barrel, crates. The
// looks are in kamchatka_a.ts and kamchatka_b.ts, painted on look_kit.ts.
import type { Room, StageLook } from './look_kit.ts';
import { KAMCHATKA_A } from './kamchatka_a.ts';
import { KAMCHATKA_B } from './kamchatka_b.ts';

export const KAMCHATKA_ROOM: Room = {
  map: [
    'ffffffff########',
    '........########',
    '..dd...#WWWWWWWW',
    '.......#cccccccc',
    '.d.ttttcccccgccc',
    '...t...#cccccccc',
    '...t.d.#########',
    '...t...#WbbWWbbW',
    '.d.t...#cccccccc',
    '...t..d#cccccccc',
  ],
  tiles: [
    { ch: '.', name: 'SNOW' }, { ch: 'd', name: 'DRIFT' }, { ch: 't', name: 'PATH' }, { ch: 'f', name: 'FENCE' },
    { ch: '#', name: 'TOP' }, { ch: 'W', name: 'WALL' }, { ch: 'b', name: 'BARS' }, { ch: 'c', name: 'FLOOR' }, { ch: 'g', name: 'GRATE' },
  ],
  props: ['FLOODLIGHT', 'BARREL', 'CRATES'],
};

export const KAMCHATKA_OPTS: StageLook[] = [...KAMCHATKA_A, ...KAMCHATKA_B];
