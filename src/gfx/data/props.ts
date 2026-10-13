// Small hand-drawn pieces for props and items. Each map turns a letter into a palette color.
import type { ColorName } from '../palette.ts';

export interface Art { rows: string[]; map: Record<string, ColorName> }

/** Eggo waffle, 7x7. s crust, a golden, o grid line, b butter. */
export const EGGO: Art = {
  rows: ['.sssss.', 'sbboaas', 'sbboaas', 'sooooos', 'saaoaas', 'saaoaas', '.sssss.'],
  map: { s: 'soil3', a: 'amber', o: 'orange', b: 'cream' },
};

/** Soda can, 5x8. g rim, r body, h highlight, w wave, d shade. */
export const COKE: Art = {
  rows: ['.ggg.', 'ggggg', 'rhrrd', 'rhwwd', 'rwwrd', 'rhrrd', 'ggggg', '.ggg.'],
  map: { g: 'grey3', r: 'red', h: 'hot', w: 'white', d: 'blood1' },
};

/** Bulb for the Christmas lights, 3 wide and 4 tall. g socket, c glass, h highlight. */
export const BULB_ROWS: string[] = ['.g.', 'chc', 'ccc', '.c.'];

/** Wooden sign board lettering, drawn as short dashes. */
export const SIGN_TEXT: string[] = ['xxx.xx', '......', '.xx.xxx'];

/** Wrecked wood for a broken crate or a cleared log. */
export const CHIPS: Art = {
  rows: ['s..d....s', '..s....d.', '.d...s...', '....d..s.'],
  map: { s: 'soil3', d: 'soil1' },
};
