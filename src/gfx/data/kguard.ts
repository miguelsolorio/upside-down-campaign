// The two Kamchatka guards (docs/level-10.md, gfx/var/kguard_opts.ts), built the way SOLDIER is (data/soldier.ts): on the adult body, a hat
// and anything over the face in `hair`, collars and belts in `trim`, and a hand drawn stamp on the front hand (CharSpec.held, heldBy, near)
// that is carried at rest, raised or aimed in the wind-up, and fired or swung in the hit. KGUARD is the owner's pick, Greatcoat: a long grey
// greatcoat to the boots, a brown fur hat with snow caught on it and a scarf over the mouth, carrying the soldier's rifle. KBATON is the camp
// guard (Camp guard): a dark blue-grey coat, a red star and felt boots, with a baton for close work. He blocks from the front like the riot
// guard, so he has two stances, as the riot guard has two atlases (actors.ts): KBATON holds the baton across his body while `guarding`, and
// KBATON_LOW is the pick as drawn, the baton hanging at his side, for a guard who is recovering, broken or stunned. The wind-up and the
// swing are the same in both. Five fill colors each (skin plus four) and the ink outline. Rows are 16 wide. Roles: s skin, e ink (eyes, belt),
// t the hat, a the coat and trousers, g the stock or the baton, n the barrel (ink), b the star, the buckle and the muzzle flash, w snow, c the scarf.
import type { CharSpec, Held, Pt, Stamp } from './types.ts';

const at = (rows: string[], ox: number, oy: number): Stamp => ({ rows, ox, oy });
const all = (down: Stamp[], up: Stamp[] = down, side: Stamp[] = down): Held => ({ down, up, side });

// ---------------------------------------------------------------- the rifle, as the soldier carries it
const CARRY: Held = all([at(['n', 'n', 'n', 'n', 'g', 'g'], 0, -5)], [at(['n', 'n', 'n', 'n', 'g', 'g'], 0, -5)], [at(['gggnnnnn'], -2, 0)]);
const AIM: Held = all([at(['gg', 'nn', 'nn', 'nn'], -1, -1)], [at(['nn', 'nn', 'nn', 'gg'], 0, -4)], [at(['ggnnnnnn'], -4, -1)]);
const FIRE: Held = all([at(['gg', 'nn', 'nn', 'nn', 'bb'], -1, -1)], [at(['bb', 'nn', 'nn', 'nn', 'gg'], 0, -5)], [at(['ggnnnnnb'], -4, -1)]);

export const KGUARD: CharSpec = {
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
/** The block: the baton held across the body in both hands from the front, its ends showing either side of him from behind, and upright in front of him in profile. */
const BATON_BLOCK: Held = all([at(['ggggggggg'], -7, -1)], [at(['gg.....g'], -7, -1)], [at(['g', 'g', 'g', 'g', 'g', 'g'], 1, -4)]);

const CAMP_NEAR: Record<'down' | 'up' | 'side', Partial<Record<'rest' | 'swingA' | 'swingB' | 'windup' | 'strike', Pt>>> = {
  down: { rest: [12, 11], swingA: [12, 12], swingB: [12, 10], strike: [11, 10] },
  up: { rest: [12, 11], swingA: [12, 12], swingB: [12, 10], strike: [13, 8] },
  side: { rest: [9, 11], swingA: [10, 11], swingB: [7, 11], windup: [4, 7], strike: [10, 8] },
};

/** The camp guard as drawn on the sheet: the baton hanging at his side. His coat, hat and boots are the same in both stances. */
export const KBATON_LOW: CharSpec = {
  id: 'kbaton', body: 'adult', torso: 'plain', weapon: 'none',
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
  held: BATON_REST,
  heldBy: { windup: BATON_UP, strike: BATON_HIT },
  near: CAMP_NEAR,
};

/** The camp guard on guard: the baton across his chest (both hands on it from the front and back, one forward in profile) at rest and while he walks, and at his side again when he staggers. */
export const KBATON: CharSpec = {
  ...KBATON_LOW,
  held: BATON_BLOCK,
  heldBy: { windup: BATON_UP, strike: BATON_HIT, flail: BATON_REST },
  near: {
    down: { strike: CAMP_NEAR.down.strike as Pt },
    up: { strike: CAMP_NEAR.up.strike as Pt },
    side: { windup: CAMP_NEAR.side.windup as Pt, strike: CAMP_NEAR.side.strike as Pt, rest: [11, 9], swingA: [11, 9], swingB: [11, 9] },
  },
  arms: {
    down: { rest: [[5, 10], [10, 10]], swingA: [[5, 10], [10, 10]], swingB: [[5, 10], [10, 10]] },
    up: { rest: [[4, 10], [11, 10]], swingA: [[4, 10], [11, 10]], swingB: [[4, 10], [11, 10]] },
    side: { rest: [[7, 10], [11, 9]], swingA: [[7, 10], [11, 9]], swingB: [[7, 10], [11, 9]] },
  },
};
