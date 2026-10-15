// Hero barks: one-liners that float over a hero. Pure data, no DOM, so Node can test it.
// Short barks are 22 characters or fewer. Level-up lines run to 64 (World wraps them at 26 columns).
// Variants cycle with module-level counters, one per hero, event and tier, so the order is deterministic.
// Eleven's vocabulary grows with her level: two words or fewer through level 2, short sentences for 3 to 5, fuller from 6.
import type { BarkEvent, HeroId } from '../core/types.ts';

export const BARK_MAX = 22;
export const LEVEL_UP_MAX = 64;

type ShortEvent = Exclude<BarkEvent, 'levelUp'>;
export type BarkSet = Record<ShortEvent, readonly string[]>;
export const SHORT_EVENTS: readonly ShortEvent[] = ['swapIn', 'special', 'kill', 'crit', 'idle', 'ko', 'lowHp', 'eggo'];

const MIKE: BarkSet = {
  swapIn: ['Stay behind me.', 'My turn. Stay close.', "Okay. I've got this."],
  special: ["Screen's up!", 'Get behind the screen!', 'Behind me! Now!'],
  kill: ['Down. Everyone okay?', 'Clear. Keep moving.', 'Next. Stay together.'],
  crit: ['Critical hit!', "Nat 20! Let's go!", 'Roll for damage!'],
  ko: ["Go on. I'm fine.", "Don't stop for me."],
  lowHp: ["I'm fine. Keep going.", 'Still on my feet.'],
  eggo: ['Anyone else need one?', 'Fuel up. Then move.'],
  idle: ['Stay together.', 'Everyone still here?', 'Eyes open, guys.'],
};

const DUSTIN: BarkSet = {
  swapIn: ['Hear me out!', 'Dustin, reporting in!', 'Science time!'],
  special: ['Combustion!', 'Flammable. Obviously.', 'Aerosol, meet flame!'],
  kill: ['Hypothesis confirmed.', "Told you it'd work.", 'Science wins.'],
  crit: ['Statistically rare!', 'One in twenty!', 'Beautiful odds!'],
  ko: ['Note to self: ow.', 'Record this. Ow.'],
  lowHp: ['This is bad, guys.', 'Not great. Not great.'],
  eggo: ['Carbs! Thank you!', 'Fuel for the brain!'],
  idle: ["Fun fact: it's dark.", 'Anyone else hear that?', 'I brought snacks.'],
};

const LUCAS: BarkSet = {
  swapIn: ["I'll watch the exits.", 'Covering. Go.', 'Eyes up.'],
  special: ['Triple shot.', 'Three at once.', 'Spread. Fire.'],
  kill: ['One less.', 'Clean shot.', 'Next.'],
  crit: ['Dead center.', 'Nailed it.', 'Right on target.'],
  ko: ['Bad idea. Told you.', 'Called it. Ow.'],
  lowHp: ['This is going bad.', 'I need cover!'],
  eggo: ['Not bad.', 'Finally. Real food.'],
  idle: ['Check the exits.', "Something's off.", "I don't like this."],
};

/** Level 2 and below: one or two words. */
const ELEVEN_1: BarkSet = {
  swapIn: ['Here.', 'Ready.', 'Me.'],
  special: ['Break!', 'Stop!', 'Away!'],
  kill: ['Bad.', 'Gone.', 'Done.'],
  crit: ['Strong!', 'Hard hit.', 'Yes!'],
  ko: ['Sorry.', 'Tired.'],
  lowHp: ['Hurts.', 'Weak.'],
  eggo: ['Mine.', 'Yes. Eggo.'],
  idle: ['Friends.', 'Listening.', 'Close.'],
};

/** Levels 3 to 5: short sentences. */
const ELEVEN_2: BarkSet = {
  swapIn: ['I can help.', 'My turn.', "I'm here now."],
  special: ['Get back.', 'Stop. Right now.', 'I said stop.'],
  kill: ['That was bad.', 'Stay down.', 'No more.'],
  crit: ['That hurt them.', 'I did that.', 'Strong. Very.'],
  ko: ["I'm sorry. Tired.", 'Too much. Sorry.'],
  lowHp: ["I'm hurt. Still here.", 'It hurts a lot.'],
  eggo: ['Mine. I like these.', 'Thank you. Eggo.'],
  idle: ['Something is close.', 'I hear it.', 'Stay together.'],
};

/** Level 6 and up: fuller. */
const ELEVEN_3: BarkSet = {
  swapIn: ["I'll take this one.", 'Let me handle it.', 'Stay behind me now.'],
  special: ['Get out of my way.', "You don't scare me.", 'This ends right now.'],
  kill: ["They won't hurt us.", "That's what you get.", 'One more down.'],
  crit: ['I felt that one land.', 'That was a good one.', 'Right through them.'],
  ko: ["I couldn't hold on.", 'Sorry. Keep going.'],
  lowHp: ["I'm hurt, not done.", 'I can still fight.'],
  eggo: ['These are all mine.', 'I missed these.'],
  idle: ['I hear them coming.', 'Stay close to me.', "I'll keep us safe."],
};

const ELEVEN_TIERS: readonly BarkSet[] = [ELEVEN_1, ELEVEN_2, ELEVEN_3];

/** 0 for levels 1 and 2, 1 for levels 3 to 5, 2 for level 6 and up. */
export function elevenTier(level: number): 0 | 1 | 2 {
  return level <= 2 ? 0 : level <= 5 ? 1 : 2;
}

/** The set a hero draws from at this level. */
export function barkSet(who: HeroId, level: number): BarkSet | null {
  switch (who) {
    case 'mike': return MIKE;
    case 'dustin': return DUSTIN;
    case 'lucas': return LUCAS;
    case 'eleven': return ELEVEN_TIERS[elevenTier(level)] ?? ELEVEN_1;
    default: return null;
  }
}

// ---------------------------------------------------------------- level-up lines
// Exact lines for levels 2 and 3, one fallback for the rest. Eleven gets a second, fuller fallback from level 6.
interface LevelUpSet { two: string; three: string; other: string }

const LEVEL_UP: Record<HeroId, LevelUpSet> = {
  mike: {
    two: 'Stronger. Good. Now nobody falls behind.',
    three: 'Level three. I can cover more of you now.',
    other: 'Stronger again. Everybody check in.',
  },
  dustin: {
    two: 'Level two! Let me explain why that matters.',
    three: "Level three. Hear me out: we're getting good at this.",
    other: 'More XP. More science. Better plan.',
  },
  lucas: {
    two: 'Level two. Still not loving the plan.',
    three: 'Level three. Better. Still watching the exits.',
    other: "Stronger. Doesn't mean I trust the plan.",
  },
  eleven: {
    two: 'Stronger.',
    three: "I feel it. I'm stronger now.",
    other: "I'm stronger. I can do more now.",
  },
  will: {
    two: 'Okay. I feel steadier now.',
    three: 'Level three. I can tell when it is close.',
    other: 'Stronger. It is not getting me again.',
  },
};
const ELEVEN_FULL = "I'm stronger now, and I won't let anything happen to them.";

function levelUpLine(who: HeroId, level: number): string | null {
  const set = LEVEL_UP[who];
  if (!set) return null;
  if (level <= 2) return set.two;
  if (level === 3) return set.three;
  if (who === 'eleven' && level >= 6) return ELEVEN_FULL;
  return set.other;
}

/** Every level-up line a hero can say, for tests and the dev panel. */
export function levelUpLines(who: HeroId): string[] {
  const set = LEVEL_UP[who];
  if (!set) return [];
  return who === 'eleven' ? [set.two, set.three, set.other, ELEVEN_FULL] : [set.two, set.three, set.other];
}

// ---------------------------------------------------------------- cycling
const counters = new Map<string, number>();

/** Starts every cycle over. Tests call this so the order is known. */
export function resetBarks(): void { counters.clear(); }

function next(key: string, list: readonly string[]): string | null {
  if (list.length === 0) return null;
  const n = counters.get(key) ?? 0;
  counters.set(key, n + 1);
  return list[n % list.length] ?? null;
}

/**
 * A short in-character line for this hero and event. For levelUp, level is the level just reached.
 * For anything else it is the hero's current level, which only matters to Eleven.
 */
export function pickBark(who: HeroId, event: BarkEvent, level: number): string | null {
  if (event === 'levelUp') return levelUpLine(who, level);
  const set = barkSet(who, level);
  if (!set) return null;
  const tier = who === 'eleven' ? elevenTier(level) : 0;
  return next(`${who}:${tier}:${event}`, set[event]);
}
