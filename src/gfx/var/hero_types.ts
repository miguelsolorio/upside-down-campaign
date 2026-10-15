// What a hero design is on the sheet: the paper-doll rig (a CharSpec plus the body it's drawn on), the portrait spec in the
// game's format, and the words the owner picks it by. Types only.
import type { Expr } from '../../core/types.ts';
import type { PortraitSpec } from '../data/portraits.ts';
import type { Rig } from './compose.ts';

export type HeroName = 'max' | 'steve' | 'hopper';

export interface HeroOpt {
  who: HeroName;
  /** For the snap attribute: heroes2-max-walkman. */
  slug: string;
  /** The short name to pick it by. */
  name: string;
  /** One line: the idea. */
  note: string;
  rig: Rig;
  portrait: PortraitSpec;
  /** The second expression on the card, after neutral. */
  other: Expr;
}
