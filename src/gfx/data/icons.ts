// Icon art, 8x8 each. Letters map to colors per icon through the palette beside the rows.
import type { ColorName } from '../palette.ts';
import { COKE, EGGO } from './props.ts';

export interface IconArt { rows: string[]; map: Record<string, ColorName>; ox?: number; oy?: number }

/** Christmas bulb: wire across the top, socket, glass. g wire, s socket, c glass, h highlight, d shade. */
export const BULB_ICON = [
  'gggggggg',
  '...ss...',
  '..cccc..',
  '.chcccc.',
  '.cccccd.',
  '.cccccd.',
  '..ccdd..',
  '...dd...',
];

export const BULB_COLORS: Record<string, Record<string, ColorName>> = {
  bulbRed: { g: 'grey2', s: 'grey3', c: 'red', h: 'pink', d: 'blood1' },
  bulbYellow: { g: 'grey2', s: 'grey3', c: 'yellow', h: 'cream', d: 'orange' },
  bulbGreen: { g: 'grey2', s: 'grey3', c: 'pine3', h: 'leaf', d: 'pine1' },
  bulbBlue: { g: 'grey2', s: 'grey3', c: 'blue', h: 'sky', d: 'dusk' },
  bulbOff: { g: 'grey2', s: 'grey2', c: 'grey1', h: 'grey2', d: 'night' },
};

const CURSOR_ROWS = ['yy......', 'yyyy....', 'yyyyyy..', 'yyyyyyy.', 'yyyyyy..', 'yyyy....', 'yy......', '........'];
/** Rows and columns swapped, which turns the right-pointing menu cursor to point down. */
const turnDown = (rows: string[]): string[] => (rows[0] as string).split('').map((_, c) => rows.map((r) => r[c]).join(''));

export const ICON_ART: Record<string, IconArt> = {
  eggo: { rows: EGGO.rows, map: EGGO.map },
  coke: { rows: COKE.rows, map: COKE.map, ox: 1 },
  arrow: { rows: ['........', '........', '.######.', '..####..', '...##...', '........', '........', '........'], map: { '#': 'white' } },
  cursor: { rows: CURSOR_ROWS, map: { y: 'yellow' } },
  /** The same caret pointing down over a puzzle prop in the world, or up from under it when there's no room above. */
  cursorDown: { rows: turnDown(CURSOR_ROWS), map: { y: 'yellow' } },
  cursorUp: { rows: turnDown(CURSOR_ROWS).reverse(), map: { y: 'yellow' } },
  heart: {
    rows: ['........', '.rr.rr..', 'rhrrrrr.', 'rrrrrrd.', '.rrrrd..', '..rrd...', '...r....', '........'],
    map: { r: 'red', h: 'pink', d: 'blood1' },
  },
  mpGem: {
    rows: ['........', '..hhhh..', '.hbbbbd.', 'hbbwbbbd', '.dbbbbd.', '..dbbd..', '...dd...', '........'],
    map: { h: 'sky', b: 'blue', d: 'dusk', w: 'white' },
  },
};
