// The one place combat learns about bonds (heroes/bonds.ts). Once a tick `applyBonds` writes what the party's bonds change onto each hero
// as `hero.bond`, and everything else reads that: heroAtk (damage.ts), heroDef (steve_guard.ts), speedFactor (common.ts) and the crit
// roll (damage.ts) read the numbers, and Steve's Babysit (`babysitHeal`) and the hit on a hero (`screenCovers`) read the two that
// are not a stat. None of them knows who is paired with whom. A bond counts while both heroes are in the party, led or benched, up
// or down, so it follows the roster and not the active slot.
import type { Hero, S } from './state.ts';
import { BODY_Y } from './space.ts';
import { addFx, floater, sfx } from './fx.ts';
import { modsFor } from '../heroes/bonds.ts';

/** The roster each sim's bonds were last worked out for, so a tick with the same party costs a string compare. */
const applied = new WeakMap<S, string>();

/** Gives every hero the bonuses of the party they are in. Cheap to call every tick: it only works when the roster changed. */
export function applyBonds(s: S): void {
  const key = s.heroes.map((h) => h.id).join();
  if (applied.get(s) === key) return;
  applied.set(s, key);
  const party = s.heroes.map((h) => h.id);
  for (const h of s.heroes) h.bond = modsFor(party, h.id);
}

/** True when Mike's DM screen is up and covers this hero from every side: Eleven, bonded to Mike. The hit is halved as behind the dome. */
export function screenCovers(s: S, h: Hero): boolean {
  const sh = s.shield;
  if (!sh || h.bond.cover <= 0) return false;
  return Math.hypot(h.x - sh.x, h.y - BODY_Y - sh.y) <= h.bond.cover;
}

/** Steve casts Babysit: with Dustin in the party, the bond patches Dustin up too, bench or not. A KO'd Dustin stays down. */
export function babysitHeal(s: S, steve: Hero): void {
  if (steve.bond.babysit <= 0) return;
  const d = s.heroes.find((h) => h.id === 'dustin');
  if (!d || d.ko) return;
  const gain = Math.min(d.st.hp - d.hp, Math.round(d.st.hp * steve.bond.babysit));
  if (gain <= 0) return;
  d.hp += gain;
  addFx(s, 'heal', d.x, d.y - 6, d.dir, 0, 30, 18, 18);
  floater(s, `+${gain}`, d.x, d.y - 18, 'leaf', false);
  sfx(s, 'heal');
}
