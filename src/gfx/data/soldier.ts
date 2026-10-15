// The Russian soldier (docs/level-8.md): a fur ushanka with its flaps down, a long greatcoat belted in black, boots, and a rifle. On
// the adult body. Five fill colors (skin, grey fur, olive, wood, brass) and the ink outline. Rows are 16 wide. Roles: t the fur hat,
// a the greatcoat and trousers, b the hat star, the collar tabs and the muzzle flash (red on an elite, with the band across the hat,
// actors.ts), g the stock, n the barrel (ink). The rifle is a stamp on the front hand (CharSpec.held): carried at the hip, shouldered
// and aimed in the wind-up, and fired with a flash of brass at the muzzle in the strike. A recover is the rest frame, the rifle lowered.
import type { CharSpec, Held, Stamp } from './types.ts';

const at = (rows: string[], ox: number, oy: number): Stamp => ({ rows, ox, oy });
const all = (down: Stamp[], up: Stamp[] = down, side: Stamp[] = down): Held => ({ down, up, side });

/** Carried: muzzle up beside him from the front and back, the barrel pointing ahead and low in profile. */
const CARRY: Held = all([at(['n', 'n', 'n', 'n', 'g', 'g'], 0, -5)], [at(['n', 'n', 'n', 'n', 'g', 'g'], 0, -5)], [at(['gggnnnnn'], -2, 0)]);
/** Aimed: pointing at the viewer in front, away from him in back, level at the shoulder in profile. */
const AIM: Held = all([at(['gg', 'nn', 'nn', 'nn'], -1, -1)], [at(['nn', 'nn', 'nn', 'gg'], 0, -4)], [at(['ggnnnnnn'], -4, -1)]);
/** Fired: the same with the flash at the muzzle. */
const FIRE: Held = all([at(['gg', 'nn', 'nn', 'nn', 'bb'], -1, -1)], [at(['bb', 'nn', 'nn', 'nn', 'gg'], 0, -5)], [at(['ggnnnnnb'], -4, -1)]);

export const SOLDIER: CharSpec = {
  id: 'soldier', body: 'adult', torso: 'plain', weapon: 'none',
  pal: { s: 'skin0', d: 'skin0', e: 'ink', t: 'grey2', a: 'pine2', b: 'yellow', p: 'pine2', q: 'pine2', f: 'ink', g: 'soil1', n: 'ink' },
  hair: {
    down: [{ y: 0, rows: [
      '....tttttttt....',
      '...tttttbttttt..',
      '...tttttttttt...',
      '...tt......tt...',
      '...tt......tt...',
    ] }],
    up: [{ y: 0, rows: [
      '....tttttttt....',
      '...tttttttttt...',
      '...tttttttttt...',
      '...tttttttttt...',
      '...tttttttttt...',
      '....tttttttt....',
    ] }],
    side: [{ y: 0, rows: [
      '....ttttttt.....',
      '...ttttbtttt....',
      '..ttttttttttt...',
      '..tttt.....tt...',
      '..ttt.......t...',
    ] }],
  },
  trim: {
    down: [
      { y: 8, rows: ['....bb....bb....'] },
      { y: 10, rows: ['....eeeeeeee....'] },
      { y: 11, rows: ['....aaaaaaaa....', '....aaaaaaaa....'] },
    ],
    up: [
      { y: 10, rows: ['....eeeeeeee....'] },
      { y: 11, rows: ['....aaaaaaaa....', '....aaaaaaaa....'] },
    ],
    side: [
      { y: 8, rows: ['......bb........'] },
      { y: 10, rows: ['.....eeeeee.....'] },
      { y: 11, rows: ['.....aaaaaaa....', '.....aaaaaaa....'] },
    ],
  },
  held: CARRY,
  heldBy: { windup: AIM, strike: FIRE },
  near: {
    down: { rest: [11, 11], swingA: [11, 12], swingB: [11, 10], windup: [9, 10], strike: [9, 11] },
    up: { rest: [11, 11], swingA: [11, 12], swingB: [11, 10], windup: [9, 8], strike: [8, 7] },
    side: { rest: [10, 11], swingA: [10, 12], swingB: [10, 10], windup: [11, 9], strike: [11, 9] },
  },
  arms: {
    down: { windup: [[8, 10], [9, 10]], strike: [[8, 10], [9, 10]] },
    up: { windup: [[7, 8], [8, 8]], strike: [[7, 7], [8, 7]] },
    side: { windup: [[8, 10], [11, 9]], strike: [[8, 10], [11, 9]] },
  },
};
