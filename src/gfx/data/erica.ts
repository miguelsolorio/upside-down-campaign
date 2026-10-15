// Erica, Lucas's little sister, the owner's pick: Boss. A high bun with a gold clip, a pink power suit with shoulder pads and gold
// buttons, a white shirt, a clipboard she means to use. On the kid body. An npc, so idle matters most. Five fill colors (skin,
// charcoal, pink, gold, bone) and the ink outline. Her hair is charcoal, not ink, so it still shows as a shape on a dark floor.
// Rows are 16 wide. Roles: h hair, a suit, b the clip and the buttons, w the shirt and the clipboard, p skirt, f shoes.
import type { CharSpec, Held, Pt, Stamp } from './types.ts';

const CLIPBOARD: Stamp[] = [{ ox: 0, oy: -5, rows: ['.bb.', 'wwww', 'wwww', 'wwww', 'wwww'] }];
const same = (st: Stamp[]): Held => ({ down: st, up: st, side: st });
const hold: Record<'rest' | 'swingA' | 'swingB', Pt> = { rest: [12, 10], swingA: [12, 11], swingB: [12, 9] };

export const ERICA: CharSpec = {
  id: 'erica', body: 'kid', torso: 'plain', weapon: 'none',
  pal: { s: 'skin2', d: 'skin2', e: 'ink', h: 'grey1', a: 'pink', b: 'amber', w: 'bone', p: 'pink', q: 'pink', f: 'bone' },
  hair: {
    down: [{ y: 0, rows: [
      '......hhhh......',
      '.....hhhhhh.....',
      '.....hbbbbh.....',
      '....hhhhhhhh....',
      '....hh....hh....',
    ] }],
    up: [{ y: 0, rows: [
      '......hhhh......',
      '.....hhhhhh.....',
      '.....hbbbbh.....',
      '....hhhhhhhh....',
      '....hhhhhhhh....',
      '....hhhhhhhh....',
      '....hhhhhhhh....',
      '.....hhhhhh.....',
    ] }],
    side: [{ y: 0, rows: [
      '....hhhh........',
      '...hhhhhh.......',
      '...hbbbbh.......',
      '...hhhhhhhh.....',
      '..hhhhhhhhhh....',
      '..hhhhhhh.......',
      '...hhhhh........',
    ] }],
  },
  trim: {
    down: [{ y: 9, rows: ['...aaaaaaaaaa...', '.......ww.......', '.......bb.......'] }],
    up: [{ y: 9, rows: ['...aaaaaaaaaa...'] }],
    side: [{ y: 9, rows: ['.....aaaaaa.....', '.........w......', '.........b......'] }],
  },
  held: same(CLIPBOARD),
  near: { down: hold, up: hold, side: hold },
};
