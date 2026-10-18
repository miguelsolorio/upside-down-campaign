// Campaign progress for the map screen: which stages are cleared and every hero met so far, at their best. Kept
// apart from the autosave inside a stage (save.ts), which only lives while a stage is being played. Pure and
// DOM-free so Node tests can run it. A bad or old record reads as "no progress", it never throws.
import type { HeroId, HeroSnapshot, PartySeed, StatKey, Stash, StashItem } from './types.ts';
import { PARTY_SIZE, STAGE_ORDER, mergeHeroes, seedsFrom } from './campaign.ts';
import { savingAllowed } from './save.ts';
import { storage } from './storage.ts';
import { HERO_IDS } from '../heroes/index.ts';
import { MAX_LEVEL, STAT_KEYS } from '../progression/xp.ts';

export interface Progress {
  v: 1;
  /** Stage ids cleared at least once, in STAGE_ORDER order. */
  cleared: string[];
  /** Every hero met so far with their level, XP and d20 bonus. Replays only ever move a hero forward. */
  heroes: PartySeed[];
  /** The last party picked on the map, lead first (docs/map-screen.md, "Party picks"). Absent until the first pick. */
  picks?: HeroId[];
  /** Quarters carried between stages (docs/map-screen.md, "Erica's cart"). Absent on a save from before the purse: see purseOf. */
  purse?: number;
  /** What the party bought from Erica and hasn't used. Absent means nothing. */
  stash?: Stash;
  /** Max has her Walkman back, the 4.2 story item (docs/level-11.md). Absent means not yet. */
  walkman?: boolean;
}

/** Most of one item the party can carry. */
export const STASH_MAX = 3;

/** What a save from before the purse existed starts with, per cleared stage: about what those stages left lying around. */
export const OLD_PURSE_PER_STAGE = 10;

/** The quarters in the purse. A save from before the purse gets OLD_PURSE_PER_STAGE for each stage it has cleared. */
export function purseOf(p: Progress | null): number {
  if (!p) return 0;
  return p.purse ?? OLD_PURSE_PER_STAGE * p.cleared.length;
}

/** The stash, never absent. */
export function stashOf(p: Progress | null): Stash {
  return { eggo: p?.stash?.eggo ?? 0, coke: p?.stash?.coke ?? 0 };
}

/** A copy of `p` with every field, purse and stash included, so the helpers below never drop one. */
function copyOf(p: Progress | null): Progress {
  const out: Progress = { v: 1, cleared: [...(p?.cleared ?? [])], heroes: (p?.heroes ?? []).map((h) => ({ ...h })) };
  if (p?.picks) out.picks = [...p.picks];
  if (p) { out.purse = purseOf(p); out.stash = stashOf(p); }
  if (p?.walkman) out.walkman = true;
  return out;
}

const KEY = 'upside-down:progress:v1';

const isRecord = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);
const num = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);

function parseHero(v: unknown): PartySeed | null {
  if (!isRecord(v) || !(HERO_IDS as unknown[]).includes(v.id)) return null;
  const level = v.level, xp = v.xp;
  if (!num(level) || !Number.isInteger(level) || level < 1 || level > MAX_LEVEL || !num(xp) || xp < 0) return null;
  const bonus: Partial<Record<StatKey, number>> = {};
  if (isRecord(v.bonus)) for (const k of STAT_KEYS) if (num(v.bonus[k])) bonus[k] = v.bonus[k] as number;
  return { id: v.id as HeroId, level, xp, bonus };
}

/** Rebuilds a clean Progress from untrusted JSON, or null if anything is off. Unknown stage ids are dropped. */
export function parseProgress(raw: unknown): Progress | null {
  if (!isRecord(raw) || raw.v !== 1 || !Array.isArray(raw.cleared) || !Array.isArray(raw.heroes)) return null;
  if (!raw.cleared.every((s) => typeof s === 'string')) return null;
  const heroes: PartySeed[] = [];
  for (const h of raw.heroes) {
    const seed = parseHero(h);
    if (!seed || heroes.some((p) => p.id === seed.id)) return null;
    heroes.push(seed);
  }
  const cleared = STAGE_ORDER.filter((id) => (raw.cleared as string[]).includes(id));
  const out: Progress = { v: 1, cleared, heroes };
  // Picks are a convenience: a bad list is dropped, it never spoils the rest of the record.
  const picks = raw.picks;
  if (Array.isArray(picks) && picks.length > 0 && picks.length <= PARTY_SIZE && new Set(picks).size === picks.length &&
    picks.every((h) => (HERO_IDS as unknown[]).includes(h))) out.picks = picks as HeroId[];
  // The purse and the stash are small whole numbers. A bad value is dropped (the old-save rule then applies to the purse).
  if (num(raw.purse) && raw.purse >= 0) out.purse = Math.floor(raw.purse);
  if (isRecord(raw.stash)) {
    const n = (v: unknown): number => (num(v) && v >= 0 ? Math.min(STASH_MAX, Math.floor(v)) : 0);
    out.stash = { eggo: n(raw.stash.eggo), coke: n(raw.stash.coke) };
  }
  if (raw.walkman === true) out.walkman = true;
  return out;
}

/**
 * A clear of `stage` added to `p` (or to a fresh record): the stage is marked, the party merged in and the run's `quarters`
 * added to the purse. Picks and the stash carry.
 */
export function recordClear(p: Progress | null, stage: string, party: HeroSnapshot[], quarters = 0): Progress {
  const out = copyOf(p);
  out.cleared = STAGE_ORDER.filter((id) => id === stage || (p?.cleared ?? []).includes(id));
  out.heroes = mergeHeroes(p?.heroes ?? [], seedsFrom(party));
  out.purse = purseOf(p) + Math.max(0, Math.floor(quarters));
  out.stash = stashOf(p);
  return out;
}

/** `p` with the party the player just picked remembered, lead first. */
export function withPicks(p: Progress | null, picks: readonly HeroId[]): Progress {
  const out = copyOf(p);
  out.picks = picks.slice(0, PARTY_SIZE);
  return out;
}

/** `p` with one `item` spent from the stash (the sim's stashUsed). Nothing changes when there is none left. */
export function spendStash(p: Progress | null, item: StashItem): Progress {
  const out = copyOf(p);
  const stash = stashOf(p);
  stash[item] = Math.max(0, stash[item] - 1);
  out.stash = stash;
  return out;
}

/** `p` with its purse and stash replaced, as Erica's cart leaves them. */
export function withPurse(p: Progress | null, purse: number, stash: Stash): Progress {
  const out = copyOf(p);
  out.purse = Math.max(0, Math.floor(purse));
  out.stash = { eggo: Math.min(STASH_MAX, Math.max(0, stash.eggo)), coke: Math.min(STASH_MAX, Math.max(0, stash.coke)) };
  return out;
}

/** `p` with Max's Walkman, the story item a `walkman` beat gives (docs/level-11.md). */
export function withWalkman(p: Progress | null): Progress {
  const out = copyOf(p);
  out.walkman = true;
  return out;
}

/** The first stage in play order not cleared yet, or null when every stage of this build is cleared. */
export function nextUncleared(p: Progress | null): string | null {
  return STAGE_ORDER.find((id) => !(p?.cleared ?? []).includes(id)) ?? null;
}

/** A stage the map lets the player enter: any cleared stage, and the first uncleared one. */
export function isOpen(p: Progress | null, stage: string): boolean {
  return (p?.cleared ?? []).includes(stage) || nextUncleared(p) === stage;
}

export function loadProgress(): Progress | null {
  const raw = storage.get(KEY);
  if (!raw) return null;
  try { return parseProgress(JSON.parse(raw)); } catch { return null; }
}

export function writeProgress(p: Progress): void {
  if (savingAllowed()) storage.set(KEY, JSON.stringify(p));
}

export function clearProgress(): void {
  if (savingAllowed()) storage.remove(KEY);
}
