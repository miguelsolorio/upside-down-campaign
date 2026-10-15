// What the character sheet shows for one hero at one level: the stats, the crit chance, and each move with its damage.
// Pure, so Node can test it. Every multiplier is read from HERO_DEFS and the combat constants, never copied, so the
// sheet says what the sim does. Damage is the non-crit range against a foe with no DEF, without Inspiration.
import type { HeroId } from '../core/types.ts';
import { BURST_POWER } from '../combat/burst.ts';
import { damageRange } from '../combat/damage.ts';
import { emptyStats } from '../progression/xp.ts';
import type { Stats } from '../progression/xp.ts';
import { TALENTS, hasTalent } from '../progression/talents.ts';
import { HERO_DEFS, critChance, statsAt } from './defs.ts';

export type SheetMoveKind = 'basic' | 'special' | 'crit' | 'talent';

export interface SheetMove {
  kind: SheetMoveKind;
  name: string;
  /** MP per use, 0 for free. */
  mp: number;
  /** One hit's damage, or null for a move that deals none. */
  dmg: { min: number; max: number } | null;
  /** Most hits one use lands on one foe. */
  hits: number;
  /** One line, SHEET_NOTE_MAX characters or fewer. */
  note: string;
  /** A talent the hero hasn't reached yet. */
  locked?: boolean;
  /** The level a talent unlocks at. */
  level?: number;
}

export interface HeroSheet {
  id: HeroId;
  name: string;
  role: string;
  level: number;
  /** Maxima at this level, with the d20 bonus. */
  stats: Stats;
  /** The d20 bonus inside `stats`, in stat units. */
  bonus: Stats;
  /** Per-hit crit chance, 0..1. A crit doubles a hit. */
  crit: number;
  moves: SheetMove[];
}

/** The longest note the sheet has room for. The talents' own lines are capped at the same 32. */
export const SHEET_NOTE_MAX = 32;

const secs = (frames: number): string => `${+(frames / 60).toFixed(1)}s`;
const range = (r: { min: number; max: number }): string => (r.min === r.max ? `${r.min}` : `${r.min}-${r.max}`);

/** The basic, special and talent lines that differ per hero. */
function heroMoves(id: HeroId, level: number, atk: number): SheetMove[] {
  const def = HERO_DEFS[id];
  const b = def.basic, sp = def.special;
  const hit = (power: number) => damageRange(power, atk, 0);
  const basic = (power: number, note: string, hits = 1): SheetMove => ({ kind: 'basic', name: b.name, mp: b.mp, dmg: hit(power), hits, note });
  const special = (dmg: SheetMove['dmg'], note: string, hits = 1): SheetMove => ({ kind: 'special', name: sp.name, mp: sp.mp, dmg, hits, note });
  switch (id) {
    case 'mike':
      return [
        basic(b.power, `Third hit ${range(hit(b.power * b.x.thirdPower))} and stuns`),
        special(null, `Blocks shots, halves damage, ${secs(sp.x.life)}`),
      ];
    case 'dustin': {
      const burn = Math.max(1, Math.round(atk * sp.x.burnAtk));
      return [
        basic(b.power, `Blast, then lures foes for ${secs(b.x.lure)}`),
        special(hit(sp.power), `Burns ${burn} every ${secs(sp.x.burnTick)} for ${secs(sp.x.burn)}`, Math.floor(sp.x.life / sp.x.tick)),
      ];
    }
    case 'lucas':
      return [
        basic(b.power, 'Long shot, aims eight ways'),
        special(hit(sp.power), `${sp.x.n} rocks in a fan`, sp.x.n),
      ];
    case 'eleven': {
      const flip = hasTalent('eleven', level);
      return [
        basic(b.power * (flip ? b.x.flipPower : 1), flip ? 'Shove that clears logs, Flip on' : 'Shove that clears logs'),
        special(hit(sp.power), 'Beam through every foe in line'),
      ];
    }
  }
}

/** The sheet for `id` at `level` with `bonus` d20 points (in stat units) on top. */
export function heroSheet(id: HeroId, level: number, bonus: Stats = emptyStats()): HeroSheet {
  const def = HERO_DEFS[id];
  const stats = statsAt(def, level, bonus);
  const talent = TALENTS[id];
  const moves: SheetMove[] = [
    ...heroMoves(id, level, stats.atk),
    { kind: 'crit', name: 'Crit', mp: 0, dmg: damageRange(BURST_POWER, stats.atk, 0), hits: 1, note: 'Hits all nearby, through shields' },
    { kind: 'talent', name: talent.name, mp: 0, dmg: null, hits: 1, note: talent.text, locked: !hasTalent(id, level), level: talent.level },
  ];
  return { id, name: def.name, role: def.role, level, stats, bonus: { ...bonus }, crit: critChance(def, level), moves };
}

/** The damage as the sheet prints it: `11-13`, or `8-9 x3` for a move that lands several hits. Empty for none. */
export function damageLabel(m: SheetMove): string {
  if (!m.dmg) return '';
  return m.hits > 1 ? `${range(m.dmg)} x${m.hits}` : range(m.dmg);
}
