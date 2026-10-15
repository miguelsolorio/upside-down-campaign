// What a hero design is on heroes3-variations.html: the paper-doll rig (a CharSpec, the body it's drawn on, and the held thing),
// the portrait spec in the game's format, and the words the owner picks it by. Types only.
import type { Expr } from '../../core/types.ts';
import type { PortraitSpec } from '../data/portraits.ts';
import type { Rig3 } from './compose3.ts';

export type Who3 = 'robin' | 'nancy' | 'erica';

export interface Hero3Opt {
  who: Who3;
  /** For the snap attribute: heroes3-robin-sailor. */
  slug: string;
  /** The short name to pick it by. */
  name: string;
  /** One line: the idea. */
  note: string;
  rig: Rig3;
  portrait: PortraitSpec;
  /** The second expression on the card, after neutral. */
  other: Expr;
}
