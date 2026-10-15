// Nancy Wheeler, the owner's pick: Overalls. A high ponytail with a rose tie, a rose long sleeve shirt under denim overalls with steel
// buckles, grey sneakers. A teen, so the adult body. Five fill colors (skin, brown, rose, denim, steel) and the ink outline. Rows are 16
// wide. Roles: h hair, and the shotgun's wooden stock; a the shirt and the hair tie; b and p the overalls; x the buckles; f shoes; g the
// guns, steel. The guns are stamps on the front hand (CharSpec.held): the pistol is raised at rest and in the wind-up and pointed in
// the strike, and Cast is the shotgun, held in both hands and pointed (heldBy, arms, near).
import type { CharSpec, Held, Pt, Stamp } from './types.ts';

const at = (rows: string[], ox: number, oy: number): Stamp => ({ rows, ox, oy });
const all = (down: Stamp[], up: Stamp[] = down, side: Stamp[] = down): Held => ({ down, up, side });

/** The pistol raised: pointing up beside her in front and back, out at arm's length in profile. */
const PISTOL: Held = all([at(['gg', 'gg', 'gg', 'g.', 'g.'], 0, -5)], [at(['gg', 'gg', 'gg', 'g.', 'g.'], 0, -5)], [at(['gggg', 'g...'], 0, -1)]);
/** The shot: toward the viewer in front, away from him in back, level in profile. */
const SHOT: Held = all([at(['gg', 'gg', 'g.'], -1, 0)], [at(['gg', 'gg', 'gg', 'g.'], 0, -4)], [at(['ggggg', 'g....'], 0, -1)]);
/** The shotgun: stock, then barrel. Both hands are on it. */
const SHOTGUN: Held = all(
  [at(['hh', 'hh', 'gg', 'gg', 'gg', 'gg'], -1, -2)],
  [at(['gg', 'gg', 'gg', 'gg', 'hh', 'hh'], -1, -5)],
  [at(['hhhgggggg', '..hhg.g..'], -4, -1)],
);
/** The wind-up in profile: the pistol held up in front of her face, pointing at the ceiling. */
const COCKED: Held = { side: [at(['gg', 'gg', 'gg', 'g.'], 0, -3)] };
const raised = (x: number, y: number): Record<'rest' | 'swingA' | 'swingB', Pt> => ({ rest: [x, y], swingA: [x, y + 1], swingB: [x, y - 1] });

export const NANCY: CharSpec = {
  id: 'nancy', body: 'adult', torso: 'plain', weapon: 'none',
  pal: { s: 'skin0', d: 'skin0', e: 'ink', h: 'soil1', a: 'rose', b: 'blue', p: 'blue', q: 'blue', f: 'grey3', g: 'grey3', x: 'grey3' },
  hair: {
    down: [{ y: 0, rows: [
      '......hhhh......',
      '.....hhaahh.....',
      '....hhhhhhhh....',
      '....hhhhhhhh....',
      '....hh....hh....',
    ] }],
    up: [{ y: 0, rows: [
      '......hhhh......',
      '.....hhaahh.....',
      '....hhhhhhhh....',
      '....hhhhhhhh....',
      '....hhhhhhhh....',
      '....hhhhhhhh....',
      '.....hhhhhh.....',
      '......hhhh......',
    ] }],
    side: [{ y: 0, rows: [
      '..hh............',
      '.hhaa.hhhh......',
      '.hhh.hhhhhhh....',
      '..hhhhhhhhhhh...',
      '...hhhhhh.......',
      '...hhh..........',
      '....hh..........',
    ] }],
  },
  trim: {
    down: [{ y: 8, rows: ['.....b....b.....', '.....bxbbxb.....', '......bbbb......', '......bbbb......'] }],
    up: [{ y: 8, rows: ['.....b....b.....', '.....bbbbbb.....', '......bbbb......', '......bbbb......'] }],
    side: [{ y: 8, rows: ['......b.........', '......bbb.......', '.......bb.......', '.......bb.......'] }],
  },
  held: PISTOL,
  heldBy: { strike: SHOT, raise: SHOTGUN, thrust: SHOTGUN, windup: COCKED },
  near: {
    down: { ...raised(12, 8), strike: [9, 11], raise: [9, 10], thrust: [9, 10] },
    up: { ...raised(12, 8), strike: [8, 5], raise: [8, 7], thrust: [8, 6] },
    side: { ...raised(12, 9), windup: [12, 6], strike: [12, 9], raise: [11, 10], thrust: [12, 9] },
  },
  arms: {
    down: { raise: [[7, 10], [9, 10]], thrust: [[7, 10], [9, 10]] },
    up: { raise: [[7, 7], [8, 7]], thrust: [[7, 6], [8, 6]] },
    side: { raise: [[8, 10], [11, 10]], thrust: [[9, 9], [12, 9]] },
  },
};
