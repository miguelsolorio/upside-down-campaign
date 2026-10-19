// Run-time spawns (docs/level-6.md, "Run-time spawns"): the enemies the sim brings up itself at the stage's burrows. A howl calls
// three young demodogs from the three burrows nearest the Alpha, and each defense wave comes from the burrows nearest the ward,
// in turn. The ids are made up (rt1, rt2, ...) and never looked up in skipSpawns, so a retry brings every one of them back.
// Each is awake at once, comes up in a puff of dust and is worth 1 XP, so the XP lives in the Alpha and the halls and a failed
// defense can't be farmed. They drop nothing. The Commander's squad (docs/level-14.md) comes up the same way, on the ring round him.
import { TILE } from '../core/config.ts';
import type { EnemyKind, EnemyTier } from '../core/types.ts';
import type { Enemy, Pos, S } from './state.ts';
import { dust } from './fx.ts';
import { makeEnemy } from './init.ts';
import { footBlocked } from './space.ts';

/** How far past the nearest burrow a wave's burrows reach, in px: the Gate chamber's tears, never the den's. */
const WAVE_SPAN = 128;
const WAVE_MAX = 6;
/** With no burrows listed, enemies come up on a ring this far out. */
const RING = 56;

/** The feet position of a burrow's tile, as an enemy spawned there stands. */
const feet = (tx: number, ty: number): Pos => ({ x: tx * TILE + TILE / 2, y: ty * TILE + 12 });

/** Burrow positions nearest first. */
function byDistance(s: S, x: number, y: number): Pos[] {
  return s.burrows
    .map((b) => feet(b.tx, b.ty))
    .map((p) => ({ p, d: Math.hypot(p.x - x, p.y - y) }))
    .sort((a, b) => a.d - b.d)
    .map((o) => o.p);
}

/** Open floor on a ring round a point: what a stage without burrows falls back to. */
function ringSpots(s: S, x: number, y: number): Pos[] {
  const out: Pos[] = [];
  for (let i = 0; i < 8; i++) {
    const a = 0.4 + (i * Math.PI) / 4;
    const p = { x: x + Math.cos(a) * RING, y: y + Math.sin(a) * RING };
    if (!footBlocked(s, p.x, p.y)) out.push(p);
  }
  return out.length > 0 ? out : [{ x, y }];
}

/** Where a squad comes up round a point: open floor on the ring round it, the spots farthest from `from` first. */
export function squadSpots(s: S, x: number, y: number, from: Pos): Pos[] {
  return ringSpots(s, x, y).sort((a, b) => Math.hypot(b.x - from.x, b.y - from.y) - Math.hypot(a.x - from.x, a.y - from.y));
}

/** The three burrows nearest a point, or the open floor round it when the stage lists none. */
export function howlSpots(s: S, x: number, y: number): Pos[] {
  return s.burrows.length === 0 ? ringSpots(s, x, y) : byDistance(s, x, y).slice(0, 3);
}

/** The burrows a defense wave comes up from: the nearest to the ward and any within WAVE_SPAN of it. */
export function waveSpots(s: S, x: number, y: number): Pos[] {
  if (s.burrows.length === 0) return ringSpots(s, x, y);
  const sorted = byDistance(s, x, y);
  const first = sorted[0] as Pos;
  const reach = Math.hypot(first.x - x, first.y - y) + WAVE_SPAN;
  return sorted.filter((p) => Math.hypot(p.x - x, p.y - y) <= reach).slice(0, WAVE_MAX);
}

/**
 * Brings `n` enemies of `type` up in turn from `spots`, starting at `from`, and returns them. They are awake and hunting, worth 1 XP
 * and drop nothing. `group` is what their kills report.
 */
export function bringUp(s: S, rt: 'howl' | 'wave' | 'squad', group: string, type: EnemyKind, tier: EnemyTier | undefined, spots: Pos[], n: number, from = 0): Enemy[] {
  const out: Enemy[] = [];
  for (let k = 0; k < n; k++) {
    const p = spots[(from + k) % spots.length] as Pos;
    const e = makeEnemy(s, { kind: 'enemy', id: `rt${++s.rtSeq}`, type, tx: Math.floor(p.x / TILE), ty: Math.floor(p.y / TILE), group, tier });
    e.x = e.hx = e.lastX = p.x;
    e.y = e.hy = e.lastY = p.y;
    e.rt = rt;
    e.xp = 1;
    e.drop = 0;
    e.aware = true;
    e.mode = 'chase';
    e.cd = 30 + (e.uid % 4) * 10;
    s.enemies.push(e);
    dust(s, e.x, e.y, 5);
    out.push(e);
  }
  return out;
}
