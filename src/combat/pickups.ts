// Eggos, Cokes and quarters. Items within the magnet radius drift to the active hero and are collected on contact. Erica's stash
// (docs/level-7.md) is spent here too: an Eggo when the active hero is low, a Coke when a special is pressed short of MP.
import type { Hero, Item, S } from './state.ts';
import { activeHero } from './state.ts';
import { addFx, floater, sfx } from './fx.ts';
import { dist } from './space.ts';

export const MAGNET_RADIUS = 18;
export const EGGO_HEAL = 0.4;
export const COKE_MP = 0.5;
/** Share of max HP below which the stash feeds the active hero an Eggo, and the least frames between two of them. */
export const STASH_EGGO_BELOW = 0.25;
export const STASH_EGGO_GAP = 120;
const GRAB = 5;
const DRIFT = 1.7;

function collect(s: S, it: Item): void {
  const h = activeHero(s);
  if (it.kind === 'eggo') {
    // A full-HP active hero would waste it, so the most wounded living hero eats it instead.
    let t = h;
    if (h.hp >= h.st.hp) {
      for (const o of s.heroes) if (!o.ko && o.hp < o.st.hp && (t === h || o.hp / o.st.hp < t.hp / t.st.hp)) t = o;
    }
    const gain = Math.min(t.st.hp - t.hp, Math.round(t.st.hp * EGGO_HEAL));
    t.hp += gain;
    // Regen leaves hp fractional, so the room left is too. The bar fills exactly; only the label rounds.
    if (Math.round(gain) > 0) floater(s, `+${Math.round(gain)}`, h.x, h.y - 18, 'leaf');
    addFx(s, 'heal', h.x, h.y - 6, h.dir, 0, 24, 14, 14);
    sfx(s, 'heal');
  } else if (it.kind === 'coke') {
    let t = h;
    if (h.mp >= h.st.mp) {
      for (const o of s.heroes) if (!o.ko && o.mp < o.st.mp && (t === h || o.mp / o.st.mp < t.mp / t.st.mp)) t = o;
    }
    const gain = Math.min(t.st.mp - t.mp, Math.round(t.st.mp * COKE_MP));
    t.mp += gain;
    if (Math.round(gain) > 0) floater(s, `+${Math.round(gain)}`, h.x, h.y - 18, 'cyan');
    addFx(s, 'heal', h.x, h.y - 6, h.dir, 0, 24, 14, 14);
    sfx(s, 'heal');
  } else {
    s.stats.quarters++;
    floater(s, '+1', h.x, h.y - 18, 'amber', false, 28);
  }
  s.events.push({ t: 'pickup', item: it.kind, hero: h.id });
  sfx(s, 'pickup');
}

export function updateItems(s: S): void {
  const h = activeHero(s);
  let taken = false;
  for (const it of s.items) {
    it.t++;
    if (h.ko) continue;
    const d = dist(h.x, h.y, it.x, it.y);
    if (d <= GRAB) { collect(s, it); it.t = -1; taken = true; continue; }
    if (d <= MAGNET_RADIUS) {
      it.x += ((h.x - it.x) / d) * Math.min(d, DRIFT);
      it.y += ((h.y - it.y) / d) * Math.min(d, DRIFT);
    }
  }
  if (taken) s.items = s.items.filter((it) => it.t >= 0);
}

/** One stash item gone: the floater, the heal fx, the sound, the event and one less in the stash. */
function spendStash(s: S, h: Hero, item: 'eggo' | 'coke', gain: number): void {
  const eggo = item === 'eggo';
  floater(s, eggo ? 'EGGO' : 'COKE', h.x, h.y - 26, eggo ? 'leaf' : 'cyan', false, 36);
  if (Math.round(gain) > 0) floater(s, `+${Math.round(gain)}`, h.x, h.y - 18, eggo ? 'leaf' : 'cyan');
  addFx(s, 'heal', h.x, h.y - 6, h.dir, 0, 24, 14, 14);
  sfx(s, 'stash');
  s.stash[item]--;
  s.events.push({ t: 'stashUsed', item });
}

/** The active hero stands and is under a quarter of their HP: an Eggo from the stash heals them, at most once every 120 frames. */
export function updateStash(s: S): void {
  const h = activeHero(s);
  if (s.over || h.ko || s.stash.eggo <= 0 || h.hp >= h.st.hp * STASH_EGGO_BELOW || s.frame - s.eggoAt < STASH_EGGO_GAP) return;
  const gain = Math.min(h.st.hp - h.hp, Math.round(h.st.hp * EGGO_HEAL));
  h.hp += gain;
  s.eggoAt = s.frame;
  spendStash(s, h, 'eggo', gain);
}

/**
 * Special was pressed short of MP. If the stash has a Coke the hero drinks it, for the same MP a picked-up one gives. Returns
 * true when one was drunk, and the caller checks again whether the special can now be paid for.
 */
export function drinkCoke(s: S, h: Hero): boolean {
  if (s.stash.coke <= 0 || h.ko) return false;
  const gain = Math.min(h.st.mp - h.mp, Math.round(h.st.mp * COKE_MP));
  h.mp += gain;
  spendStash(s, h, 'coke', gain);
  return true;
}
