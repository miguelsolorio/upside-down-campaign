// How each hero likes to fight, for the bot (bot.ts and the boss plans read it).
import type { HeroId } from '../core/types.ts';

/** Stand `hold` px from the target and act within `reach`. */
export const STYLE: Record<HeroId, { hold: number; reach: number }> = {
  mike: { hold: 20, reach: 34 },
  eleven: { hold: 26, reach: 38 },
  dustin: { hold: 70, reach: 110 },
  lucas: { hold: 92, reach: 140 },
  will: { hold: 80, reach: 120 },
  max: { hold: 18, reach: 30 },
  steve: { hold: 20, reach: 34 },
  robin: { hold: 64, reach: 90 },
  nancy: { hold: 90, reach: 150 },
};
