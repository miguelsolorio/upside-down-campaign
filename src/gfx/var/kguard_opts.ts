// Four Kamchatka guards (stage 4.1, docs/chapter-4.md): the prison guards of the Soviet camp, winter versions of the Russian soldier
// of 3.2 (data/soldier.ts). Each is a CharSpec on the adult body, built the way the soldier is: the hat and anything over the face in
// `hair`, collars, belts and coat skirts in `trim`, and a hand drawn stamp on the front hand (`held`, `heldBy`, `near`) that is
// carried at rest, raised or aimed in the wind-up, and fired or swung in the hit, so a pick drops into the game's data as is.
// Five fill colors at most (skin and four more) plus the ink outline, the belt and the boots in ink. Rows are 16 wide.
// Roles: s skin, e ink (eyes, belt), t the hat, a the coat and trousers, g the stock or the baton, n the barrel (ink), b the star,
// the buckle and the muzzle flash, w snow, c fleece, m camo. Three carry the rifle; the camp guard carries a baton.
import type { CharSpec, Held, Stamp } from '../data/types.ts';

/** `melee` is set when the front hand carries a baton: the card labels the wind up and swing instead of aim and fire. */
export interface GuardOpt { slug: string; name: string; note: string; spec: CharSpec; melee?: boolean }

const at = (rows: string[], ox: number, oy: number): Stamp => ({ rows, ox, oy });
const all = (down: Stamp[], up: Stamp[] = down, side: Stamp[] = down): Held => ({ down, up, side });

// ---------------------------------------------------------------- the rifle, as the soldier carries it
const CARRY: Held = all([at(['n', 'n', 'n', 'n', 'g', 'g'], 0, -5)], [at(['n', 'n', 'n', 'n', 'g', 'g'], 0, -5)], [at(['gggnnnnn'], -2, 0)]);
const AIM: Held = all([at(['gg', 'nn', 'nn', 'nn'], -1, -1)], [at(['nn', 'nn', 'nn', 'gg'], 0, -4)], [at(['ggnnnnnn'], -4, -1)]);
const FIRE: Held = all([at(['gg', 'nn', 'nn', 'nn', 'bb'], -1, -1)], [at(['bb', 'nn', 'nn', 'nn', 'gg'], 0, -5)], [at(['ggnnnnnb'], -4, -1)]);
const RIFLE = {
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
} satisfies Pick<CharSpec, 'held' | 'heldBy' | 'near' | 'arms'>;

// ---------------------------------------------------------------- the baton: at the side, raised, swung down
const BATON_REST: Held = all([at(['g', 'g', 'g'], 0, 1)], [at(['g', 'g', 'g'], 0, 1)], [at(['.g..', '..g.', '...g'], 0, 1)]);
const BATON_UP: Held = all(
  [at(['.g', '.g', 'g.', 'g.'], 0, -4)], [at(['.g', '.g', 'g.', 'g.'], 0, -4)],
  [at(['g...', '.g..', '..g.'], -3, -3)],
);
const BATON_HIT: Held = all(
  [at(['..g.', '.g..', 'g...'], -3, 1)], [at(['g', 'g', 'g', 'g'], 0, -4)],
  [at(['.g..', '..g.', '...g'], 0, 1)],
);
const BATON = {
  held: BATON_REST,
  heldBy: { windup: BATON_UP, strike: BATON_HIT },
  near: {
    down: { rest: [12, 11], swingA: [12, 12], swingB: [12, 10], strike: [11, 10] },
    up: { rest: [12, 11], swingA: [12, 12], swingB: [12, 10], strike: [13, 8] },
    side: { rest: [9, 11], swingA: [10, 11], swingB: [7, 11], windup: [4, 7], strike: [10, 8] },
  },
} satisfies Pick<CharSpec, 'held' | 'heldBy' | 'near'>;

// ---------------------------------------------------------------- 1 Greatcoat
/** A long grey greatcoat to the boots, brown fur hat and scarf, snow caught on the hat and the shoulders. */
const GREATCOAT: CharSpec = {
  id: 'kguard', body: 'adult', torso: 'plain', weapon: 'none',
  pal: { s: 'skin0', d: 'skin0', e: 'ink', t: 'soil1', a: 'grey2', b: 'yellow', w: 'white', c: 'grey2', p: 'grey2', q: 'grey2', f: 'ink', g: 'soil1', n: 'ink' },
  hair: {
    down: [
      { y: 0, rows: ['....twwwwwwt....', '...ttttbbtttt...', '...ttwtttttwt...', '...tt......tt...', '...tt......tt...'] },
      { y: 6, rows: ['....cccccccc....', '.....cccccc.....'] },
    ],
    up: [
      { y: 0, rows: ['....twwwwwwt....', '...twwttttwwt...', '...tttttttttt...', '...tttttttttt...', '...tttttttttt...', '....tttttttt....'] },
      { y: 6, rows: ['....cccccccc....', '.....cccccc.....'] },
    ],
    side: [
      { y: 0, rows: ['....twwwwwt.....', '...ttttbtttt....', '..ttwttttttwt...', '..tttt.....tt...', '..ttt.......t...'] },
      { y: 6, rows: ['....cccccccc....', '.....cccccc.....'] },
      { y: 8, rows: ['....cc..........', '...cc...........'] },
    ],
  },
  trim: {
    down: [
      { y: 8, rows: ['....ww....ww....'] },
      { y: 10, rows: ['....eeebbeee....'] },
      { y: 11, rows: ['....aaaaaaaa....', '...aaaaaaaaaa...'] },
    ],
    up: [
      { y: 8, rows: ['....ww....ww....'] },
      { y: 10, rows: ['....eeeeeeee....'] },
      { y: 11, rows: ['....aaaaaaaa....', '...aaaaaaaaaa...'] },
    ],
    side: [
      { y: 8, rows: ['......ww........'] },
      { y: 10, rows: ['.....eeeeeb.....'] },
      { y: 11, rows: ['.....aaaaaaa....', '....aaaaaaaaa...'] },
    ],
  },
  ...RIFLE,
};

// ---------------------------------------------------------------- 2 Winter whites
/** A white snow-camo smock and trousers with pale grey blotches, a white cover over the hat, a black belt and boots. */
const WHITES: CharSpec = {
  id: 'kguard', body: 'adult', torso: 'plain', weapon: 'none',
  pal: { s: 'skin0', d: 'skin0', e: 'ink', t: 'white', a: 'white', m: 'mist', b: 'yellow', p: 'white', q: 'white', f: 'ink', g: 'soil1', n: 'ink' },
  hair: {
    down: [{ y: 0, rows: ['....tttttttt....', '...ttmmtttttt...', '...ttttttmmtt...', '...tt......tt...', '...tt......tt...'] }],
    up: [{ y: 0, rows: ['....tttttttt....', '...ttmmtttttt...', '...ttttttmmtt...', '...tttttttttt...', '...tmmtttttmt...', '....tttttttt....'] }],
    side: [{ y: 0, rows: ['....ttttttt.....', '...ttttmmttt....', '..ttmmttttttt...', '..tttt.....tt...', '..ttt.......t...'] }],
  },
  trim: {
    down: [
      { y: 8, rows: ['....aaammaaa....', '.....aaaamm.....'] },
      { y: 10, rows: ['....eeeeeeee....'] },
      { y: 11, rows: ['....mmaaaaam....', '....aaaammaa....'] },
    ],
    up: [
      { y: 8, rows: ['....aaammaaa....', '.....aaaamm.....'] },
      { y: 10, rows: ['....eeeeeeee....'] },
      { y: 11, rows: ['....mmaaaaam....', '....aaaammaa....'] },
    ],
    side: [
      { y: 9, rows: ['.......mm.......'] },
      { y: 10, rows: ['.....eeeeee.....'] },
      { y: 11, rows: ['.....aammaaa....', '.....aaaaamm....'] },
    ],
  },
  ...RIFLE,
};

// ---------------------------------------------------------------- 3 Sheepskin
/** The tower sentry's tulup: a long tan sheepskin to the boots with a big cream fleece collar and front edge, and a dark fur hat. */
const SHEEPSKIN: CharSpec = {
  id: 'kguard', body: 'adult', torso: 'plain', weapon: 'none',
  pal: { s: 'skin0', d: 'skin0', e: 'ink', t: 'soil1', a: 'soil3', c: 'cream', b: 'yellow', p: 'soil3', q: 'soil3', f: 'ink', g: 'soil1', n: 'ink' },
  hair: {
    down: [{ y: 0, rows: ['....tttttttt....', '...ttttbbtttt...', '...tttttttttt...', '...tt......tt...', '...tt......tt...', '...tt......tt...'] }],
    up: [
      { y: 0, rows: ['....tttttttt....', '...tttttttttt...', '...tttttttttt...', '...tttttttttt...', '...tttttttttt...', '....tttttttt....'] },
      { y: 7, rows: ['...cccccccccc...'] },
    ],
    side: [
      { y: 0, rows: ['....ttttttt.....', '...ttttbtttt....', '..ttttttttttt...', '..tttt.....tt...', '..ttt.......t...', '..tt............'] },
      { y: 6, rows: ['...c............', '...cc......cc...'] },
    ],
  },
  trim: {
    down: [
      { y: 7, rows: ['...cc......cc...'] },
      { y: 8, rows: ['...cccccccccc...', '....aaaccaaa....', '....aaaccaaa....', '....aaaccaaa....', '...aaaaaaaaaa...'] },
    ],
    up: [
      { y: 8, rows: ['...cccccccccc...', '....aaaaaaaa....', '....aaaaaaaa....', '....aaaaaaaa....', '...aaaaaaaaaa...'] },
    ],
    side: [
      { y: 8, rows: ['....cccccccc....', '....aaaaaaaa....', '....aaaaaaaa....', '....aaaaaaaa....', '....aaaaaaaaa...'] },
    ],
  },
  ...RIFLE,
};

// ---------------------------------------------------------------- 4 Camp guard
/** The yard guard: a dark blue-grey coat and ushanka with a red star, grey felt boots, and a baton in the front hand. */
const CAMP: CharSpec = {
  id: 'kguard', body: 'adult', torso: 'plain', weapon: 'none',
  pal: { s: 'skin0', d: 'skin0', e: 'ink', t: 'shadow', a: 'shadow', b: 'red', p: 'grey3', q: 'grey3', f: 'grey3', g: 'soil2', n: 'ink' },
  hair: {
    down: [{ y: 0, rows: ['....tttttttt....', '...ttttbbtttt...', '...ttttbbtttt...', '...tt......tt...', '...tt......tt...'] }],
    up: [{ y: 0, rows: ['....tttttttt....', '...tttttttttt...', '...tttttttttt...', '...tttttttttt...', '...tttttttttt...', '....tttttttt....'] }],
    side: [{ y: 0, rows: ['....ttttttt.....', '...ttttbbttt....', '..tttttbbtttt...', '..tttt.....tt...', '..ttt.......t...'] }],
  },
  trim: {
    down: [
      { y: 8, rows: ['....bb....bb....'] },
      { y: 10, rows: ['....eeebbeee....'] },
      { y: 11, rows: ['....aaaaaaaa....', '....aaaaaaaa....'] },
    ],
    up: [
      { y: 8, rows: ['....bb....bb....'] },
      { y: 10, rows: ['....eeeeeeee....'] },
      { y: 11, rows: ['....aaaaaaaa....', '....aaaaaaaa....'] },
    ],
    side: [
      { y: 8, rows: ['......bb........'] },
      { y: 10, rows: ['.....eeeeeb.....'] },
      { y: 11, rows: ['.....aaaaaaa....', '.....aaaaaaa....'] },
    ],
  },
  ...BATON,
};

export const KGUARD_OPTS: GuardOpt[] = [
  { slug: 'greatcoat', name: 'Greatcoat', note: 'A long grey greatcoat with snow caught on the hat and shoulders and a scarf over the mouth.', spec: GREATCOAT },
  { slug: 'whites', name: 'Winter whites', note: 'A white camo smock and hat cover: hard to see in the snow, with a black belt and boots to find him by.', spec: WHITES },
  { slug: 'sheepskin', name: 'Sheepskin', note: 'The tower sentry in a long tan sheepskin with a big fleece collar.', spec: SHEEPSKIN },
  { slug: 'camp', name: 'Camp guard', note: 'A dark blue-grey coat, a red star and felt boots, with a baton for close work.', spec: CAMP, melee: true },
];
