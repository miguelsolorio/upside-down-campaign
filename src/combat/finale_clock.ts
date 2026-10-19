// Phase two's clock (docs/level-16.md, "The fight"): the Mind Flayer keeps the clock phase one's Vecna wound. Every `clock16` frames (16 s) from the
// moment it rises it chimes and curses a random standing hero, as Vecna's clock does (enemies/vecna.ts), and marks one of its standing legs where
// his marks an orb: cutting that leg lifts the curse (enemies/flayer_legs.ts), as Max's Walkman does, and at the fourth chime the hero falls. A curse
// counts its four chimes a third of the interval apart. Nothing chimes while the Walkman is on, or with no leg left to mark (every one cut: the head
// is down then, and the clock stops as Vecna's does with no orb to mark), and never when the curse would leave nobody standing (fightTarget).
// The marked leg shows ActorView.marked, and the Flayer's death lifts every curse its legs held (enemies/flayer_hit.ts, clearFlayer).
import { ENEMY_DEFS } from '../enemies/defs.ts';
import { legStands } from '../enemies/flayer_hit.ts';
import type { Finale } from './finale_state.ts';
import type { Enemy, S } from './state.ts';
import { activeHero } from './state.ts';
import { CHIMES, beginCurse, fightTarget, markedOrb } from './curse.ts';
import { awayFrom } from './party.ts';

/** The frames between the clock's chimes in phase two. */
export const spiderClock = (): number => ENEMY_DEFS.flayer5.x.clock16 as number;

/** A random standing leg that no curse has marked, or any standing leg when every one is marked. Null when none stands. */
function pickLeg(s: S, body: Enemy): Enemy | null {
  const up = (body.flayer?.legs ?? []).filter(legStands);
  const free = up.filter((l) => !markedOrb(s, l.id));
  const from = free.length > 0 ? free : up;
  return from.length === 0 ? null : (from[Math.floor(s.rng() * from.length)] as Enemy);
}

/** The clock chimes: a curse on a random hero, a leg marked. The party swaps away at once if the hero was the one up. */
function chime(s: S, body: Enemy): void {
  if (s.house.walkOn > 0 || s.over) return;
  const leg = pickLeg(s, body);
  const hero = leg ? fightTarget(s) : null;
  if (!leg || !hero) return;
  beginCurse(s, hero, '', Math.max(1, Math.round(spiderClock() / (CHIMES - 1))), leg.id);
  if (hero === activeHero(s)) awayFrom(s);
}

/** One tick of phase two's clock, while the Mind Flayer `body` stands. */
export function stepSpiderClock(s: S, f: Finale, body: Enemy): void {
  if (body.dead || --f.clockCd > 0) return;
  f.clockCd = spiderClock();
  chime(s, body);
}
