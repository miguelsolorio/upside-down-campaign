// The order of the stages, who plays each one, and what carries from one to the next. Pure and DOM-free so Node
// tests can run it. flow.ts uses it to decide where a cleared stage leads and who walks in, and the map screen
// uses it to draw the stages and to build the party for a replay.
import type { HeroId, HeroSnapshot, PartySeed } from './types.ts';

/** Stage ids in play order. The last one ends this build with the feedback note. */
export const STAGE_ORDER: readonly string[] = ['1.1', '1.2', '1.3', '2.1', '2.2', '2.3'];

/** Stages the map shows locked, past the end of this build, so the player can see where the road goes. */
export const STAGES_AHEAD: readonly string[] = [];

/** Heroes on the field at once: the lead and three on the bench. */
export const PARTY_SIZE = 4;

/** The stage after `id`, or null when `id` is the last one (or unknown). */
export function nextStage(id: string): string | null {
  const i = STAGE_ORDER.indexOf(id);
  return i >= 0 && i + 1 < STAGE_ORDER.length ? (STAGE_ORDER[i + 1] as string) : null;
}

export const isFinalStage = (id: string): boolean => nextStage(id) === null;

/** Stage numbers as shown to the player: "1.2" is level 2 of this build. */
export function levelNumber(id: string): number {
  const i = STAGE_ORDER.indexOf(id);
  return i >= 0 ? i + 1 : 1;
}

/** The chapter a stage belongs to: "2.1" is in chapter 2. */
export function chapterOf(id: string): number {
  const n = Number.parseInt(id, 10);
  return Number.isFinite(n) && n > 0 ? n : 1;
}

/** What the chapter card says. */
export const CHAPTERS: Record<number, { title: string; subtitle: string }> = {
  1: { title: 'Chapter one', subtitle: 'The vanishing' },
  2: { title: 'Chapter two', subtitle: 'The tunnels' },
};

/** True when `id` is the first stage of its chapter, so entering it shows the chapter card. */
export function opensChapter(id: string): boolean {
  const i = STAGE_ORDER.indexOf(id);
  return i === 0 || (i > 0 && chapterOf(STAGE_ORDER[i - 1] as string) !== chapterOf(id));
}

/**
 * Who can play each stage. Up to four is the party itself, in order (the first is the lead). More than four is a pool
 * the player picks four from on the map (docs/map-screen.md, "Party picks"). Eleven joins inside 1.1 with a recruit beat,
 * so 1.1 starts with three. She is gone after the Demogorgon and comes back at the end of 2.3. Will is back for
 * chapter 2, and Max and Steve join in 2.2.
 */
const ROSTER: Record<string, HeroId[]> = {
  '1.1': ['mike', 'dustin', 'lucas'],
  '1.2': ['mike', 'dustin', 'lucas', 'eleven'],
  '1.3': ['mike', 'dustin', 'lucas', 'eleven'],
  '2.1': ['mike', 'dustin', 'lucas', 'will'],
  '2.2': ['mike', 'dustin', 'lucas', 'will', 'max', 'steve'],
  '2.3': ['mike', 'dustin', 'lucas', 'will', 'max', 'steve'],
};

/** Heroes a stage can't be cleared without, because a gate on its route needs them. Party picks lock them in. */
const REQUIRED: Record<string, HeroId[]> = {
  '2.2': ['max'],
  '2.3': ['steve'],
};

/**
 * What a jump straight to a stage (?stage=1.3) starts with: the party a real run walks in with, levels and XP, from the
 * median of node scripts/measure-campaign.ts chief 40 (docs/pace.md). Rerun it when stage XP changes.
 */
const ARRIVAL: Record<string, PartySeed[]> = {
  '1.1': [{ id: 'mike' }, { id: 'dustin' }, { id: 'lucas' }],
  '1.2': [{ id: 'mike', level: 3, xp: 68 }, { id: 'dustin', level: 2, xp: 54 }, { id: 'lucas', level: 2, xp: 54 }, { id: 'eleven', level: 2, xp: 30 }],
  '1.3': [{ id: 'mike', level: 4, xp: 76 }, { id: 'dustin', level: 3, xp: 77 }, { id: 'lucas', level: 3, xp: 65 }, { id: 'eleven', level: 3, xp: 41 }],
  '2.1': [{ id: 'mike', level: 4, xp: 150 }, { id: 'dustin', level: 4, xp: 10 }, { id: 'lucas', level: 3, xp: 115 }, { id: 'will', level: 2 }],
  '2.2': [{ id: 'mike', level: 5, xp: 116 }, { id: 'dustin', level: 4, xp: 172 }, { id: 'max', level: 3 }, { id: 'steve', level: 3 }],
  '2.3': [{ id: 'mike', level: 6, xp: 12 }, { id: 'dustin', level: 5, xp: 123 }, { id: 'max', level: 4, xp: 19 }, { id: 'steve', level: 4, xp: 22 }],
};

/** Every hero who can play stage `id`: the party itself, or the pool the player picks from. */
export function rosterFor(id: string): HeroId[] {
  return [...(ROSTER[id] ?? (ROSTER['1.1'] as HeroId[]))];
}

/** The heroes stage `id` can't be cleared without. Party picks lock them in. */
export function requiredFor(id: string): HeroId[] {
  return [...(REQUIRED[id] ?? [])];
}

/** True when the map opens party picks before stage `id`: more heroes can play it than fit in a party. */
export function needsPicks(id: string): boolean {
  return rosterFor(id).length > PARTY_SIZE;
}

/**
 * The four heroes who play stage `id`, lead first, from the player's picks (lead first, as remembered from last time).
 * Heroes outside the stage's pool and repeats are dropped. A required hero who is missing takes the place of the last
 * pick that isn't required. Empty slots fill from the stage's default party, then from the pool, in order. No picks
 * at all is the default party. A stage without picks is just its roster.
 */
export function pickParty(id: string, picks: readonly HeroId[] = []): HeroId[] {
  const pool = rosterFor(id);
  if (!needsPicks(id)) return pool;
  const out: HeroId[] = [];
  const from = picks.length > 0 ? picks : defaultParty(id).map((s) => s.id);
  for (const h of from) if (pool.includes(h) && !out.includes(h) && out.length < PARTY_SIZE) out.push(h);
  for (const r of requiredFor(id)) {
    if (out.includes(r)) continue;
    if (out.length < PARTY_SIZE) { out.push(r); continue; }
    for (let i = out.length - 1; i >= 0; i--) {
      if (!requiredFor(id).includes(out[i] as HeroId)) { out[i] = r; break; }
    }
  }
  const fill = [...defaultParty(id).map((s) => s.id), ...pool];
  for (const h of fill) if (out.length < PARTY_SIZE && pool.includes(h) && !out.includes(h)) out.push(h);
  return out;
}

/** The party a stage begins with when nothing is carried over (new game, ?stage=, START OVER on the first stage). */
export function defaultParty(id: string): PartySeed[] {
  return (ARRIVAL[id] ?? (ARRIVAL['1.1'] as PartySeed[])).map((s) => ({ ...s, bonus: s.bonus ? { ...s.bonus } : undefined }));
}

/** A cleared stage's party as seeds: levels, XP and d20 bonus carry, health does not. */
export function seedsFrom(party: HeroSnapshot[]): PartySeed[] {
  return party.map((p) => ({ id: p.id, level: p.level, xp: p.xp, bonus: p.bonus ? { ...p.bonus } : undefined }));
}

const ahead = (a: PartySeed, b: PartySeed): boolean =>
  (a.level ?? 1) > (b.level ?? 1) || ((a.level ?? 1) === (b.level ?? 1) && (a.xp ?? 0) > (b.xp ?? 0));

/**
 * Every hero the player has met, at their best: `later` replaces an entry in `known` only when it is further along,
 * so a replay never makes a hero worse. Order follows `known`, then new heroes in the order they appear.
 */
export function mergeHeroes(known: PartySeed[], later: PartySeed[]): PartySeed[] {
  const out = known.map((s) => ({ ...s }));
  for (const s of later) {
    const i = out.findIndex((o) => o.id === s.id);
    if (i < 0) out.push({ ...s });
    else if (ahead(s, out[i] as PartySeed)) out[i] = { ...s };
  }
  return out;
}

/** The level a hero nobody has met yet joins stage `id` at: the met heroes in its pool, averaged, minus one. Null if none are met. */
function joinLevel(id: string, known: PartySeed[]): number | null {
  const have = rosterFor(id).map((h) => known.find((k) => k.id === h)).filter((s): s is PartySeed => !!s);
  if (have.length === 0) return null;
  const avg = have.reduce((n, s) => n + (s.level ?? 1), 0) / have.length;
  return Math.max(1, Math.floor(avg) - 1);
}

const seedOf = (h: HeroId, known: PartySeed[], join: number): PartySeed => {
  const k = known.find((s) => s.id === h);
  return k ? { ...k, bonus: k.bonus ? { ...k.bonus } : undefined } : { id: h, level: join };
};

/**
 * The party for stage `id` built from the heroes met so far and, on a stage with picks, the player's picks (see
 * pickParty). A hero nobody has met yet joins at the average level of the met heroes in the stage's pool minus one
 * (at least 1), the plan's recruit rule, so who else was picked doesn't change it. With nothing known it is the
 * arrival party.
 */
export function partyFor(id: string, known: PartySeed[], picks?: readonly HeroId[]): PartySeed[] {
  const join = joinLevel(id, known);
  if (join === null) return defaultParty(id);
  return pickParty(id, picks).map((h) => seedOf(h, known, join));
}

/**
 * Every hero in stage `id`'s pool as a seed, in pool order, at the level they would play it at: their own, or the join
 * level for one nobody has met. For the party picks panel. With nothing known, the arrival levels (1 for a hero the
 * arrival party leaves out).
 */
export function poolFor(id: string, known: PartySeed[]): PartySeed[] {
  const join = joinLevel(id, known);
  const arrival = defaultParty(id);
  return rosterFor(id).map((h) => (join === null ? arrival.find((s) => s.id === h) ?? { id: h, level: 1 } : seedOf(h, known, join)));
}
