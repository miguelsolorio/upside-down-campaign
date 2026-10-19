// Bonds (docs/game-design.md, "Bonds"): small bonuses for heroes who are in the party together. This file is the rules and the data
// and touches no game state: which bonds a party has, and what each one gives each member. combat/bonds.ts writes the result onto
// every hero once a tick, which is the one place the sim learns of it. The picks panel, the character sheet and the stage-start
// callout read the same list, so what they say is what combat does.
//
// A bond counts while all its members are in the party, whoever leads and whoever is down. A bond with `on: false` is in the data
// but never counts and never shows. All seven are on now: chapter 4 made Hopper and Eddie playable and switched Chief and kid and
// Hellfire on.
import type { HeroId } from '../core/types.ts';

/** A hero a bond can name. Every HeroId, now that Hopper and Eddie are on the roster. */
export type BondHero = HeroId;

export type BondId = 'friends' | 'party-of-four' | 'chief-and-kid' | 'mad-max' | 'babysitters-club' | 'scoops-troop' | 'hellfire';

/** What a hero's bonds change right now. The fractions add: 0.1 is +10 percent. */
export interface BondMods {
  /** Added to ATK, to DEF and to the speed factor (walk pace and basic cooldown). */
  atk: number;
  def: number;
  spd: number;
  /** Added to the crit chance, in points of 0..1: 0.1 is ten points. */
  crit: number;
  /** Steve: the share of Dustin's max HP Babysit heals, when he casts it. */
  babysit: number;
  /** Eleven: the px round Mike's DM screen where it covers her from every side. 0 when it does not. */
  cover: number;
  /** Eddie: the frames added to the Hellfire solo (chapter 4). */
  solo: number;
}

/** A hero with no bonds. Shared and frozen: nothing may write to it. */
export const NO_MODS: Readonly<BondMods> = Object.freeze({ atk: 0, def: 0, spd: 0, crit: 0, babysit: 0, cover: 0, solo: 0 });

export interface BondDef {
  id: BondId;
  /** What the player reads. The names are nods, the wording round them is the game's own. */
  name: string;
  /** Up to 8 letters, for the corner of a card on the picks panel. */
  tag: string;
  /** What it gives, in as few words as will do (24 characters at most): the sheet and the picks panel print it. */
  perk: string;
  /** The same in a sentence, for the callout when a stage starts with the bond. */
  text: string;
  heroes: readonly BondHero[];
  on: boolean;
  /** What each member gets. A member with no entry gets nothing, so a bond can favour one side. */
  gives: Partial<Record<BondHero, Partial<BondMods>>>;
}

/** Everyone in `heroes` gets `mods`. */
function each(heroes: readonly BondHero[], mods: Partial<BondMods>): Partial<Record<BondHero, Partial<BondMods>>> {
  const out: Partial<Record<BondHero, Partial<BondMods>>> = {};
  for (const h of heroes) out[h] = mods;
  return out;
}

/** Where Mike's DM screen covers Eleven from every side, in px from its center. The dome itself is 15 px across the middle. */
export const SCREEN_COVER = 32;
/** The share of Dustin's max HP that Babysit heals when Steve is bonded to him. */
export const BABYSIT_HEAL = 0.2;
/** Frames Hellfire adds to the solo (360 to 480): heroes/eddie_solo.ts reads them off `hero.bond.solo`, nowhere else. */
export const SOLO_EXTRA = 120;

const FOUR: readonly BondHero[] = ['mike', 'dustin', 'lucas', 'will'];

export const BONDS: readonly BondDef[] = [
  {
    id: 'friends', name: "Friends don't lie", tag: 'FRIENDS', perk: '+10% ATK, SHARED SCREEN', on: true,
    text: "Mike's word is good for Eleven. Both hit 10% harder, and the DM screen covers her too.",
    heroes: ['mike', 'eleven'],
    gives: { mike: { atk: 0.1 }, eleven: { atk: 0.1, cover: SCREEN_COVER } },
  },
  {
    id: 'party-of-four', name: 'Party of four', tag: 'PARTY', perk: '+8% DEF', on: true,
    text: 'The four who started it all, side by side. All four take hits 8% better.',
    heroes: FOUR, gives: each(FOUR, { def: 0.08 }),
  },
  {
    id: 'chief-and-kid', name: 'Chief and kid', tag: 'CHIEF', perk: '+10% DEF', on: true,
    text: 'Hopper keeps one eye on Eleven, and she keeps one on him. Both take hits 10% better.',
    heroes: ['hopper', 'eleven'], gives: each(['hopper', 'eleven'], { def: 0.1 }),
  },
  {
    id: 'mad-max', name: 'Mad Max', tag: 'MAD MAX', perk: '+10% SPD', on: true,
    text: 'Lucas and Max never lose a race. Both move and act 10% faster.',
    heroes: ['lucas', 'max'], gives: each(['lucas', 'max'], { spd: 0.1 }),
  },
  {
    id: 'babysitters-club', name: "Babysitter's club", tag: 'BABYSIT', perk: 'BABYSIT HEALS DUSTIN', on: true,
    text: 'Steve looks after Dustin. Every Babysit patches Dustin up too, for a fifth of his HP.',
    heroes: ['steve', 'dustin'], gives: { steve: { babysit: BABYSIT_HEAL } },
  },
  {
    id: 'scoops-troop', name: 'Scoops troop', tag: 'SCOOPS', perk: '+10% CRIT', on: true,
    text: 'Steve and Robin work a shift like a team. Both crit 10% more often.',
    heroes: ['steve', 'robin'], gives: each(['steve', 'robin'], { crit: 0.1 }),
  },
  {
    id: 'hellfire', name: 'Hellfire', tag: 'HELLFIRE', perk: 'SOLO LASTS 2S MORE', on: true,
    text: 'Eddie plays for Dustin like it is a full house. The solo lasts 2 seconds longer.',
    heroes: ['eddie', 'dustin'], gives: { eddie: { solo: SOLO_EXTRA } },
  },
];

/** The bonds that are switched on, in the order above. */
export const liveBonds = (): BondDef[] => BONDS.filter((b) => b.on);

const inParty = (b: BondDef, party: readonly BondHero[]): boolean => b.heroes.every((h) => party.includes(h));

/** The bonds `party` has right now, in list order: every member present, and the bond switched on. */
export function activeBonds(party: readonly BondHero[]): BondDef[] {
  return liveBonds().filter((b) => inParty(b, party));
}

/** Every switched-on bond `id` is a member of, whether or not the party has it. */
export function bondsOf(id: BondHero): BondDef[] {
  return liveBonds().filter((b) => b.heroes.includes(id));
}

/** The members of `b` that `party` lacks. Empty when the bond is active. */
export function missingFrom(b: BondDef, party: readonly BondHero[]): BondHero[] {
  return b.heroes.filter((h) => !party.includes(h));
}

/** The bonds `after` has that `before` did not: what adding a hero to the party brings. */
export function gainedBonds(before: readonly BondHero[], after: readonly BondHero[]): BondDef[] {
  return activeBonds(after).filter((b) => !inParty(b, before));
}

/** What `party`'s bonds change for hero `id`: the sum of what each active bond gives them. */
export function modsFor(party: readonly BondHero[], id: BondHero): BondMods {
  const out: BondMods = { ...NO_MODS };
  for (const b of activeBonds(party)) {
    const g = b.gives[id];
    if (!g) continue;
    for (const k of Object.keys(g) as (keyof BondMods)[]) out[k] += g[k] ?? 0;
  }
  return out;
}

/** One line of a hero's bonds for the character sheet: what an active bond gives, or who an inactive one is waiting for. */
export interface BondRow { text: string; active: boolean }

const nameOf = (h: BondHero): string => `${h[0]?.toUpperCase() ?? ''}${h.slice(1)}`;

/** The sheet's lines for hero `id` in `party`: every switched-on bond they belong to, the active ones with their perk and the rest
 * with the heroes they need. Active bonds come first. */
export function bondRows(id: BondHero, party: readonly BondHero[]): BondRow[] {
  const rows = bondsOf(id).map((b): BondRow => {
    const need = missingFrom(b, party);
    return { text: need.length === 0 ? `${b.name}  ${b.perk}` : `${b.name}  needs ${need.map(nameOf).join(', ')}`, active: need.length === 0 };
  });
  return [...rows.filter((r) => r.active), ...rows.filter((r) => !r.active)];
}
