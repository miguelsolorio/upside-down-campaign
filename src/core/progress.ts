// Campaign progress for the map screen: which stages are cleared and every hero met so far, at their best. Kept
// apart from the autosave inside a stage (save.ts), which only lives while a stage is being played. Pure and
// DOM-free so Node tests can run it. A bad or old record reads as "no progress", it never throws.
import type { HeroId, HeroSnapshot, PartySeed, StatKey } from './types.ts';
import { STAGE_ORDER, mergeHeroes, seedsFrom } from './campaign.ts';
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
  return { v: 1, cleared, heroes };
}

/** A clear of `stage` added to `p` (or to a fresh record): the stage is marked and the party merged in. */
export function recordClear(p: Progress | null, stage: string, party: HeroSnapshot[]): Progress {
  const cleared = STAGE_ORDER.filter((id) => id === stage || (p?.cleared ?? []).includes(id));
  return { v: 1, cleared, heroes: mergeHeroes(p?.heroes ?? [], seedsFrom(party)) };
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
