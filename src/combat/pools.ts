// The Mind Flayer's goo pools (docs/level-9.md, "The Mind Flayer"): where a leg's tip lands it leaves a pool, X.poolR px across from its middle,
// that lasts X.poolLife frames. At most X.poolMax at a time: a fifth replaces the oldest. The active hero standing in one is slowed (the slow
// is renewed every tick, so it lingers a moment after he steps out) and takes power X.poolPower every X.poolEvery frames, counted from when he
// stepped in. Nobody else is touched. SimView.pools reports them, and they dry up when the Mind Flayer dies (enemies/flayer_hit.ts).
import type { PoolView } from '../core/types.ts';
import { ENEMY_DEFS } from '../enemies/defs.ts';
import type { S } from './state.ts';
import { activeHero } from './state.ts';
import { hurtHero } from './damage.ts';
import { dist } from './space.ts';
import { slowHero } from './status.ts';

const DEF = ENEMY_DEFS.flayerleg;
const X = DEF.x;

/** A pool where a tip landed. The oldest goes when there are more than X.poolMax. */
export function addPool(s: S, x: number, y: number): void {
  s.pools.push({ x, y, age: 0 });
  while (s.pools.length > X.poolMax) s.pools.shift();
}

/** Ages the pools, drops the dry ones, and slows and stings the active hero standing in one. */
export function updatePools(s: S): void {
  if (s.pools.length === 0) { s.poolCd = X.poolEvery as number; return; }
  for (const p of s.pools) p.age++;
  s.pools = s.pools.filter((p) => p.age < X.poolLife);
  const h = activeHero(s);
  const inside = s.pools.find((p) => dist(h.x, h.y, p.x, p.y) <= X.poolR);
  if (!inside || h.ko || s.over) { s.poolCd = X.poolEvery as number; return; }
  slowHero(s, h, X.poolSlow as number);
  if (--s.poolCd > 0) return;
  s.poolCd = X.poolEvery as number;
  // No invulnerability after a sting, or the next one, thirty frames on, would land inside it.
  hurtHero(s, h, inside.x, inside.y, X.poolPower as number, DEF.atk, 0, 0);
}

export function poolViews(s: S): PoolView[] {
  return s.pools.map((p) => ({ x: p.x, y: p.y, r: X.poolR as number, t: p.age, life: X.poolLife as number }));
}
