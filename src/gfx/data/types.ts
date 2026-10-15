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

export type Pt = [number, number];
/** A hand drawn thing: rows of role letters, with rows[0][0] sitting (ox, oy) from the front hand. */
export interface Stamp { rows: string[]; ox: number; oy: number }
export type Held = Partial<Record<View, Stamp[]>>;

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
  /** What the front hand holds, per view, hand drawn and anchored on the hand so it follows the arm (Robin's scoop, Nancy's pistol, a rifle). */
  held?: Held;
  /** What the front hand holds in one arm pose only, per view. It replaces `held` in that pose, and an empty list means an empty hand. */
  heldBy?: Partial<Record<ArmPose, Held>>;
  /** Where the front hand goes in a pose, per view, in place of the body's, so the arm carries what it holds out and up. */
  near?: Partial<Record<View, Partial<Record<ArmPose, Pt>>>>;
  /** Both hands (back or left, then front or right) in a pose, per view, in place of the body's. */
  arms?: Partial<Record<View, Partial<Record<ArmPose, [Pt, Pt]>>>>;
  /** Draw each arm two pixels thick, as the big body does. */
  thick?: boolean;
  /** Shifts the head and torso this many px toward the facing in profile in every pose (a hunch), and down from the front (a stoop). */
  lean?: number;
  stoop?: number;
}
