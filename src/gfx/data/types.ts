// Shapes for the paper-doll data files. Types only, so Node can import the data without a DOM.
import type { ColorName } from '../palette.ts';

export type View = 'down' | 'up' | 'side';
export type LegPose = 'stand' | 'stepA' | 'stepB' | 'wide';
export type ArmPose = 'rest' | 'swingA' | 'swingB' | 'windup' | 'strike' | 'raise' | 'thrust' | 'back' | 'flail';
export type Face = 'open' | 'closed' | 'ko' | 'hurt';

/** A layer of 16-wide rows whose first row sits at cell row y. */
export interface Part { y: number; rows: string[] }

export interface BodyDef {
  head: Record<View, Part>;
  face: Record<Face, Record<View, Part>>;
  torso: Record<View, Part>;
  legs: Record<View, Record<LegPose, Part>>;
  shoulder: Record<View, [number, number][]>;
  arms: Record<View, Record<ArmPose, [number, number][]>>;
}

export type TorsoPattern = 'plain' | 'stripes' | 'plaid' | 'cardigan' | 'dress';
export type WeaponKind = 'none' | 'bat' | 'sling' | 'candy' | 'gun' | 'nailbat' | 'board';

export interface HairLayers { down: Part[]; up: Part[]; side: Part[] }

export interface CharSpec {
  id: string;
  /** big is Hopper's: a ten pixel torso, three pixel legs and arms drawn two pixels thick. */
  body: 'kid' | 'adult' | 'agent' | 'big';
  /** Role letter to palette color. */
  pal: Record<string, ColorName>;
  hair: HairLayers;
  torso: TorsoPattern;
  weapon: WeaponKind;
  /** Extra layers drawn over the torso (collar, belt, walkie). */
  trim?: HairLayers;
  /** The role letter a sleeve is drawn in. Default 'a', the torso. A letterman jacket has its own. */
  sleeve?: string;
  /** A held thing shown at rest (Max's board stands at her side). It is left out when the weapon itself is drawn: the swing and the dash. */
  carry?: HairLayers;
}
