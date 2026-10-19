// The order of the stages, who plays each one, and what carries from one to the next. Pure and DOM-free so Node
// tests can run it. flow.ts uses it to decide where a cleared stage leads and who walks in, and the map screen
// uses it to draw the stages and to build the party for a replay.
import type { HeroId, HeroSnapshot, PartySeed } from './types.ts';

/** Stage ids in play order. The last one ends this build with the feedback note. */
export const STAGE_ORDER: readonly string[] = ['1.1', '1.2', '1.3', '2.1', '2.2', '2.3', '3.1', '3.2', '3.3', '4.1', '4.2', '4.3', '4.4'];

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
  3: { title: 'Chapter three', subtitle: 'Starcourt' },
  4: { title: 'Chapter four', subtitle: 'Hellfire' },
};

/** How many stages each chapter has in the design (docs/game-design.md, "Chapters"), built or not. */
const CHAPTER_LENGTH: Record<number, number> = { 1: 3, 2: 3, 3: 3, 4: 4, 5: 3 };

/**
 * True when `id` is the last stage of its chapter, so its clear ends the chapter: the epilogue, then CHAPTER n CLEAR. It reads the
 * chapter's length, not the end of STAGE_ORDER, so the last stage built in the middle of a chapter (4.2) doesn't claim to end it.
 */
export function closesChapter(id: string): boolean {
  if (!STAGE_ORDER.includes(id)) return false;
  const n = Number.parseInt(id.split('.')[1] ?? '', 10);
  return n === CHAPTER_LENGTH[chapterOf(id)];
}

/** True when `id` is the first stage of its chapter, so entering it shows the chapter card. */
export function opensChapter(id: string): boolean {
  const i = STAGE_ORDER.indexOf(id);
  return i === 0 || (i > 0 && chapterOf(STAGE_ORDER[i - 1] as string) !== chapterOf(id));
}

/**
 * Who can play each stage. Up to four is the party itself, in order (the first is the lead). More than four is a pool
 * the player picks four from on the map (docs/map-screen.md, "Party picks"). Eleven joins inside 1.1 with a recruit beat,
 * so 1.1 starts with three. She is gone after the Demogorgon and comes back at the end of 2.3. Will is back for
 * chapter 2, and Max and Steve join in 2.2. Chapter 3 has all nine: Eleven again, and Robin and Nancy join in 3.1. Chapter 4 splits
 * the party: Hopper plays 4.1 alone in Kamchatka and stays there, and Eddie joins the nine in Hawkins in 4.2 (docs/level-10.md,
 * docs/level-11.md).
 */
const ROSTER: Record<string, HeroId[]> = {
  '1.1': ['mike', 'dustin', 'lucas'],
  '1.2': ['mike', 'dustin', 'lucas', 'eleven'],
  '1.3': ['mike', 'dustin', 'lucas', 'eleven'],
  '2.1': ['mike', 'dustin', 'lucas', 'will'],
  '2.2': ['mike', 'dustin', 'lucas', 'will', 'max', 'steve'],
  '2.3': ['mike', 'dustin', 'lucas', 'will', 'max', 'steve'],
  '3.1': ['mike', 'dustin', 'lucas', 'will', 'eleven', 'max', 'steve', 'robin', 'nancy'],
  '3.2': ['mike', 'dustin', 'lucas', 'will', 'eleven', 'max', 'steve', 'robin', 'nancy'],
  '3.3': ['mike', 'dustin', 'lucas', 'will', 'eleven', 'max', 'steve', 'robin', 'nancy'],
  '4.1': ['hopper'],
  '4.2': ['mike', 'dustin', 'lucas', 'will', 'eleven', 'max', 'steve', 'robin', 'nancy', 'eddie'],
  '4.3': ['mike', 'dustin', 'lucas', 'will', 'eleven', 'max', 'steve', 'robin', 'nancy', 'eddie'],
  // Eddie fell on the 4.3 roof: from here on he is in no pool (docs/level-12.md, "The fall").
  '4.4': ['mike', 'dustin', 'lucas', 'will', 'eleven', 'max', 'steve', 'robin', 'nancy'],
};

/** Heroes a stage can't be cleared without, because a gate on its route needs them. Party picks lock them in. Eleven
 *  holds 3.3's route crate and is the only one who can reach Billy (docs/level-9.md). Eddie's riff opens 4.2's first mirror, and he
 *  joins there (docs/level-11.md). */
const REQUIRED: Record<string, HeroId[]> = {
  '2.2': ['max'],
  '2.3': ['steve'],
  '3.2': ['robin'],
  '3.3': ['eleven'],
  '4.2': ['eddie'],
  '4.3': ['eddie'],
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
  '2.2': [{ id: 'mike', level: 5, xp: 116 }, { id: 'dustin', level: 5, xp: 22 }, { id: 'max', level: 3 }, { id: 'steve', level: 3 }],
  '2.3': [{ id: 'mike', level: 6, xp: 12 }, { id: 'dustin', level: 5, xp: 159 }, { id: 'max', level: 4, xp: 19 }, { id: 'steve', level: 4, xp: 22 }],
  '3.1': [{ id: 'mike', level: 6, xp: 198 }, { id: 'dustin', level: 5, xp: 257 }, { id: 'robin', level: 3 }, { id: 'nancy', level: 3 }],
  '3.2': [{ id: 'mike', level: 7, xp: 9 }, { id: 'dustin', level: 6, xp: 112 }, { id: 'robin', level: 3, xp: 101 }, { id: 'nancy', level: 3, xp: 103 }],
  // Eleven is locked in 3.3 and catches up to the party she joins (CATCH_UP): the run plays 3.1 and 3.2 without her (docs/level-9.md).
  '3.3': [{ id: 'mike', level: 7, xp: 175 }, { id: 'dustin', level: 6, xp: 258 }, { id: 'robin', level: 4, xp: 112 }, { id: 'eleven', level: 4 }],
  // Hopper plays 4.1 alone and joins at the average of the best four less one (joinLevel); Eddie is locked in 4.2 and catches up to
  // the party he joins (CATCH_UP) (docs/level-10.md, docs/level-11.md).
  '4.1': [{ id: 'hopper', level: 5 }],
  '4.2': [{ id: 'mike', level: 8, xp: 150 }, { id: 'dustin', level: 7, xp: 224 }, { id: 'robin', level: 5, xp: 230 }, { id: 'eddie', level: 5 }],
  // 4.3 and 4.4 from the run through the built stages, Eddie's riff played on the note highway by the solo's bot (world/songs.ts); 4.4 pays 245 XP at xpMult 1.8
  // (docs/level-12.md, docs/level-13.md).
  '4.3': [{ id: 'mike', level: 8, xp: 590 }, { id: 'dustin', level: 7, xp: 485 }, { id: 'robin', level: 6, xp: 180 }, { id: 'eddie', level: 5, xp: 225 }],
  '4.4': [{ id: 'mike', level: 9, xp: 340 }, { id: 'dustin', level: 8, xp: 485 }, { id: 'robin', level: 7, xp: 125 }, { id: 'eleven', level: 5, xp: 189 }],
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
 * Heroes who join at a stage and walk into it on their first visit, though nothing locks them in: Robin and Nancy at the mall.
 * Without this the picks panel opened on chapter 2's party and they only played if the player swapped them in.
 */
const JOINS: Record<string, HeroId[]> = {
  '3.1': ['robin', 'nancy'],
};

/**
 * The four heroes who play stage `id`, lead first, from the player's picks (lead first, as remembered from last time).
 * Heroes outside the stage's pool and repeats are dropped. With `known` (every hero met so far), a hero who joins at this stage
 * and hasn't been met yet takes the place of the last pick that isn't the lead or required, so the newcomers start in the party.
 * A required hero who is missing takes the place of the last pick that isn't required. Empty slots fill from the stage's
 * default party, then from the pool, in order. No picks at all is the default party. A stage without picks is just its roster.
 */
export function pickParty(id: string, picks: readonly HeroId[] = [], known?: readonly PartySeed[]): HeroId[] {
  const pool = rosterFor(id);
  if (!needsPicks(id)) return pool;
  const out: HeroId[] = [];
  const from = picks.length > 0 ? picks : defaultParty(id).map((s) => s.id);
  for (const h of from) if (pool.includes(h) && !out.includes(h) && out.length < PARTY_SIZE) out.push(h);
  const fresh = known ? (JOINS[id] ?? []).filter((h) => pool.includes(h) && !known.some((k) => k.id === h)) : [];
  // From the last newcomer back, so they land in the party in the order JOINS lists them.
  for (const n of [...fresh].reverse()) {
    if (out.includes(n)) continue;
    if (out.length < PARTY_SIZE) { out.push(n); continue; }
    for (let i = out.length - 1; i >= 1; i--) {
      const h = out[i] as HeroId;
      if (!requiredFor(id).includes(h) && !fresh.includes(h)) { out[i] = n; break; }
    }
  }
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

/**
 * The level a hero nobody has met yet joins stage `id` at: the met heroes in its pool, averaged, minus one. A stage whose pool has
 * nobody met yet (4.1, Hopper alone) averages the PARTY_SIZE best heroes met instead, the party the player would field
 * (docs/level-10.md). Null if nobody at all is met.
 */
function joinLevel(id: string, known: PartySeed[]): number | null {
  let have = rosterFor(id).map((h) => known.find((k) => k.id === h)).filter((s): s is PartySeed => !!s);
  if (have.length === 0) have = [...known].sort((a, b) => (ahead(a, b) ? -1 : ahead(b, a) ? 1 : 0)).slice(0, PARTY_SIZE);
  if (have.length === 0) return null;
  const avg = have.reduce((n, s) => n + (s.level ?? 1), 0) / have.length;
  return Math.max(1, Math.floor(avg) - 1);
}

/**
 * Heroes who come back at a stage after sitting the stages before it out, and catch up: Eleven at the food court, locked in after
 * the run plays the mall and the base without her (docs/level-9.md). One who is behind walks in at the level of the party she joins,
 * averaged and less one, the recruit rule, with no XP toward the next. Her d20 bonus carries.
 */
const CATCH_UP: Record<string, HeroId[]> = {
  '3.3': ['eleven'],
  // Eddie joins at the level of the party he joins, averaged and less one, as docs/chapter-4.md words the recruit rule: the pool's
  // average would bring him in at Lv 3 beside a Lv 8 lead, dragged down by the heroes chapter 2 left behind (docs/level-11.md).
  '4.2': ['eddie'],
};

/** `party` with the stage's returning heroes brought up to the rest of it (CATCH_UP). */
function catchUp(id: string, party: PartySeed[]): PartySeed[] {
  const back = CATCH_UP[id] ?? [];
  return party.map((s) => {
    if (!back.includes(s.id)) return s;
    const rest = party.filter((o) => o.id !== s.id);
    if (rest.length === 0) return s;
    const level = Math.max(1, Math.floor(rest.reduce((n, o) => n + (o.level ?? 1), 0) / rest.length) - 1);
    return (s.level ?? 1) >= level ? s : { ...s, level, xp: 0 };
  });
}

const seedOf = (h: HeroId, known: PartySeed[], join: number): PartySeed => {
  const k = known.find((s) => s.id === h);
  return k ? { ...k, bonus: k.bonus ? { ...k.bonus } : undefined } : { id: h, level: join };
};

/**
 * The party for stage `id` built from the heroes met so far and, on a stage with picks, the player's picks (see
 * pickParty). A hero nobody has met yet joins at the average level of the met heroes in the stage's pool minus one
 * (at least 1), the plan's recruit rule, so who else was picked doesn't change it. A hero who comes back at this stage
 * catches up to the party she joins (CATCH_UP). With nothing known it is the arrival party.
 */
export function partyFor(id: string, known: PartySeed[], picks?: readonly HeroId[]): PartySeed[] {
  const join = joinLevel(id, known);
  if (join === null) return defaultParty(id);
  return catchUp(id, pickParty(id, picks, known).map((h) => seedOf(h, known, join)));
}

/**
 * Every hero in stage `id`'s pool as a seed, in pool order, at the level they would play it at: their own, or the join
 * level for one nobody has met. For the party picks panel. With nothing known, the arrival levels (1 for a hero the
 * arrival party leaves out).
 */
export function poolFor(id: string, known: PartySeed[], picks?: readonly HeroId[]): PartySeed[] {
  const join = joinLevel(id, known);
  const arrival = defaultParty(id);
  const pool = rosterFor(id).map((h) => (join === null ? arrival.find((s) => s.id === h) ?? { id: h, level: 1 } : seedOf(h, known, join)));
  // A hero who comes back here shows the level she will play at in the party the picks make (CATCH_UP).
  const back = CATCH_UP[id] ?? [];
  if (join === null || back.length === 0) return pool;
  const party = partyFor(id, known, picks);
  return pool.map((s) => (back.includes(s.id) ? party.find((p) => p.id === s.id) ?? s : s));
}
