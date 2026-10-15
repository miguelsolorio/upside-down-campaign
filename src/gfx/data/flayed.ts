// The Flayed (docs/level-7.md): a person the Mind Flayer has walked into. Grey and bald with red eyes and veins of goo across the scalp,
// a torn grey shirt streaked with it, stooped, with the arms hanging forward and reaching. On the adult body. Five fill colors (bone,
// red, grey, dark grey, purple goo) and the ink outline. Rows are 16 wide. Roles: s skin, e the eyes (red), a the shirt, b the goo, p
// trousers. Cast frame two is the grab (actors.ts), arms clamped forward round the hero it holds.
import type { CharSpec } from './types.ts';

export const FLAYED: CharSpec = {
  id: 'flayed', body: 'adult', torso: 'plain', weapon: 'none', lean: 1, stoop: 1,
  pal: { s: 'grey3', d: 'grey3', e: 'hot', a: 'grey2', b: 'purple', p: 'grey1', q: 'grey1', f: 'ink' },
  hair: {
    down: [{ y: 2, rows: ['.....bssbsb.....', '................', '................', '................', '......kkkk......', '.......b........'] }],
    up: [{ y: 2, rows: ['.....bbsbbb.....', '....bsbbsbsb....', '....bbsbbbsb....', '.....sbsbsb.....'] }],
    side: [{ y: 2, rows: ['.....bsbbb......', '....bsbsbs......', '....bbsbs.......', '................', '..........k.....', '..........b.....'] }],
  },
  trim: {
    down: [{ y: 9, rows: ['.....a.bb.a.....', '......bbb.......', '.......b........'] }],
    up: [{ y: 9, rows: ['.....a.bb.a.....', '......bbb.......', '.......b........'] }],
    side: [{ y: 9, rows: ['.......bb.......', '......bb........', '.......b........'] }],
  },
  near: {
    down: { rest: [11, 12] },
    up: { rest: [11, 12] },
    side: { rest: [11, 12] },
  },
  arms: {
    down: {
      rest: [[4, 12], [11, 12]], swingA: [[4, 11], [11, 13]], swingB: [[4, 13], [11, 11]],
      windup: [[3, 5], [12, 5]], strike: [[6, 12], [9, 12]], raise: [[3, 7], [12, 7]], thrust: [[6, 10], [9, 10]],
    },
    up: {
      rest: [[4, 12], [11, 12]], swingA: [[4, 11], [11, 13]], swingB: [[4, 13], [11, 11]],
      windup: [[3, 5], [12, 5]], strike: [[6, 5], [9, 5]], raise: [[3, 7], [12, 7]], thrust: [[6, 7], [9, 7]],
    },
    side: {
      rest: [[10, 12], [11, 12]], swingA: [[9, 11], [12, 12]], swingB: [[11, 12], [10, 11]],
      windup: [[10, 4], [12, 5]], strike: [[13, 9], [14, 10]], raise: [[10, 6], [12, 7]], thrust: [[12, 10], [13, 10]],
    },
  },
};
