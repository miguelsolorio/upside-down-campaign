// Which item spawns a sim has already given up. A lit string of lights banks the quarters picked up so far (SaveData.quarters), and
// a retry or a CONTINUE builds a fresh sim whose items are all back, so the ones already taken have to stay gone or the same quarter
// pays twice. ItemView carries no id, so each spawn is matched to the nearest unclaimed item of its kind: an item only ever drifts
// MAGNET_RADIUS from where it was put, so one that is still there is within a little more than that. Pure, so Node can run it.
import type { ItemView, SimSpawn } from '../core/types.ts';
import { TILE } from '../core/config.ts';
import { MAGNET_RADIUS } from '../combat/pickups.ts';

const REACH = MAGNET_RADIUS + 2;

/** Ids of the item spawns with no item left for them in `items`. Spawns in `skipped` were never in the sim and are left out. */
export function takenItems(spawns: readonly SimSpawn[], items: readonly ItemView[], skipped: ReadonlySet<string> = new Set()): string[] {
  const spots = spawns.flatMap((s) => (s.kind === 'item' && !skipped.has(s.id) ? [{ id: s.id, kind: s.item, x: s.tx * TILE + TILE / 2, y: s.ty * TILE + 12 }] : []));
  const pairs: { s: number; i: number; d: number }[] = [];
  spots.forEach((s, si) => items.forEach((it, ii) => {
    const d = Math.hypot(it.x - s.x, it.y - s.y);
    if (it.kind === s.kind && d <= REACH) pairs.push({ s: si, i: ii, d });
  }));
  pairs.sort((a, b) => a.d - b.d);
  const spotUsed = new Set<number>(), itemUsed = new Set<number>();
  for (const p of pairs) {
    if (spotUsed.has(p.s) || itemUsed.has(p.i)) continue;
    spotUsed.add(p.s); itemUsed.add(p.i);
  }
  return spots.filter((_, si) => !spotUsed.has(si)).map((s) => s.id);
}
