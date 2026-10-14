// Eggos, Cokes and quarters. Items within the magnet radius drift to the active hero and are collected on contact.
import type { Item, S } from './state.ts';
import { activeHero } from './state.ts';
import { addFx, floater, sfx } from './fx.ts';
import { dist } from './space.ts';

export const MAGNET_RADIUS = 18;
export const EGGO_HEAL = 0.4;
export const COKE_MP = 0.5;
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
