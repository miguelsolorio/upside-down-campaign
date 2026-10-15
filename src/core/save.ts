// The one save: the party's levels and where they last lit Joyce's lights, plus what they had cleared by then.
// Pure and DOM-free so Node tests can run it. A bad or old save reads as "no save", it never throws.
import type { HeroId, PartySeed, StatKey } from './types.ts';
import { STAGE_ORDER } from './campaign.ts';
import { flags } from './flags.ts';
import { storage } from './storage.ts';
import { HERO_IDS } from '../heroes/index.ts';
import { MAX_LEVEL, STAT_KEYS } from '../progression/xp.ts';

export interface SaveData {
  v: 1;
  stage: string;
  /** Id, level, XP and d20 bonus of each hero, in party order. */
  party: PartySeed[];
  /** Feet position of the lit lights, and the story beats fired by then. */
  checkpoint: { x: number; y: number; state: { fired: string[]; cleared: string[] } };
  /** Spawn ids already killed. */
  killed: string[];
  /** Prop ids already opened or lit. */
  openProps: string[];
  /** Quarters this stage's run had picked up by the time the lights were lit, so a retry or a CONTINUE keeps them. 0 if absent. */
  quarters?: number;
}

const KEY = 'upside-down:save:v1';

const isRecord = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);
const num = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);
const strings = (v: unknown): string[] | null =>
  Array.isArray(v) && v.every((s) => typeof s === 'string') ? (v as string[]) : null;

function parseHero(v: unknown): PartySeed | null {
  if (!isRecord(v) || !(HERO_IDS as unknown[]).includes(v.id)) return null;
  const level = v.level, xp = v.xp;
  if (!num(level) || !Number.isInteger(level) || level < 1 || level > MAX_LEVEL) return null;
  if (!num(xp) || xp < 0) return null;
  const bonus: Partial<Record<StatKey, number>> = {};
  if (isRecord(v.bonus)) {
    for (const k of STAT_KEYS) {
      const n = v.bonus[k];
      if (num(n)) bonus[k] = n;
    }
  }
  return { id: v.id as HeroId, level, xp, bonus };
}

/** Rebuilds a clean SaveData from untrusted JSON, or null if anything is off. */
export function parseSave(raw: unknown): SaveData | null {
  if (!isRecord(raw) || raw.v !== 1 || typeof raw.stage !== 'string') return null;
  if (!Array.isArray(raw.party) || raw.party.length === 0) return null;
  const party: PartySeed[] = [];
  for (const h of raw.party) {
    const seed = parseHero(h);
    if (!seed || party.some((p) => p.id === seed.id)) return null;
    party.push(seed);
  }
  const cp = raw.checkpoint;
  if (!isRecord(cp) || !num(cp.x) || !num(cp.y) || !isRecord(cp.state)) return null;
  const fired = strings(cp.state.fired), cleared = strings(cp.state.cleared);
  const killed = strings(raw.killed), openProps = strings(raw.openProps);
  if (!fired || !cleared || !killed || !openProps) return null;
  const out: SaveData = { v: 1, stage: raw.stage, party, checkpoint: { x: cp.x, y: cp.y, state: { fired, cleared } }, killed, openProps };
  if (num(raw.quarters) && raw.quarters > 0) out.quarters = Math.floor(raw.quarters);
  return out;
}

export function loadSave(): SaveData | null {
  const raw = storage.get(KEY);
  if (!raw) return null;
  try { return parseSave(JSON.parse(raw)); } catch { return null; }
}

/** A `?stage=` jump past the first stage. An id the campaign doesn't know means the first stage, as flow.ts reads it. */
export function isStageJump(stage: string = flags.stage): boolean {
  return stage !== STAGE_ORDER[0] && STAGE_ORDER.includes(stage);
}

/** Debug runs (?bot, ?god, a forced ?level or ?party, a ?stage= jump) never change the real save or progress. */
export function savingAllowed(): boolean {
  return !flags.bot && !flags.god && flags.level === 0 && !flags.party && !isStageJump();
}

export function writeSave(data: SaveData): void {
  if (savingAllowed()) storage.set(KEY, JSON.stringify(data));
}

export function clearSave(): void {
  if (savingAllowed()) storage.remove(KEY);
}

export function hasSave(): boolean {
  return loadSave() !== null;
}
