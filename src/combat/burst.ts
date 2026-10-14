// Party burst. The d20 meter fills from hits dealt, hits taken and kills. At full, burst starts a 90-frame freeze,
// then each living hero's signature effect sweeps every enemy within 200 px for about 3x that hero's ATK.
import type { FxKind } from '../core/types.ts';
import type { Hero, S } from './state.ts';
import { activeHero } from './state.ts';
import { dist } from './space.ts';
import { addFx, flashScreen, sfx, shake } from './fx.ts';
import { hitEnemy } from './damage.ts';

export const BURST_FREEZE = 90;
export const BURST_RADIUS = 200;
export const BURST_POWER = 3;
const SWEEP_GAP = 10;
const TAIL = 14;

/** Each hero's flourish, drawn at the active hero. Sizes stay small: the ring carries the 200 px sweep. */
const SIGNATURE: Record<Hero['id'], { kind: FxKind; w: number; h: number }> = {
  mike: { kind: 'slash', w: 46, h: 70 },
  dustin: { kind: 'flame', w: 64, h: 56 },
  lucas: { kind: 'beam', w: 140, h: 8 },
  eleven: { kind: 'nova', w: 60, h: 60 },
  will: { kind: 'blast', w: 60, h: 60 },
};

/** Starts the burst if the meter is full and the button was pressed. Returns true on the tick it starts. */
export function tryBurst(s: S): boolean {
  if (s.seq || s.over || s.burst < 1 || s.buf.burst <= 0) return false;
  s.buf.burst = 0;
  s.burst = 0;
  s.seq = { t: 0, fired: 0 };
  s.events.push({ t: 'burst' });
  sfx(s, 'burst');
  flashScreen(s, 1);
  shake(s, 4);
  return true;
}

function sweep(s: S, hero: Hero): void {
  const a = activeHero(s);
  const sig = SIGNATURE[hero.id];
  addFx(s, sig.kind, a.x, a.y - 7, a.dir, Math.atan2(Math.sin(a.aim), Math.cos(a.aim)), 20, sig.w, sig.h);
  addFx(s, 'ring', a.x, a.y, a.dir, 0, 26, BURST_RADIUS * 2, BURST_RADIUS);
  shake(s, 3);
  for (const e of s.enemies) {
    if (e.dead || e.dormant || e.hp <= 0 || dist(a.x, a.y, e.x, e.y) > BURST_RADIUS) continue;
    hitEnemy(s, hero, e, {
      power: BURST_POWER, kb: 3, angle: Math.atan2(e.y - a.y, e.x - a.x), stagger: 24, hitstop: 0, shake: 0.6, pierce: true,
    });
  }
}

export function stepBurst(s: S): void {
  const q = s.seq;
  if (!q) return;
  q.t++;
  const living = s.heroes.filter((h) => !h.ko);
  if (q.t >= BURST_FREEZE && (q.t - BURST_FREEZE) % SWEEP_GAP === 0) {
    const i = (q.t - BURST_FREEZE) / SWEEP_GAP;
    if (i < living.length) { sweep(s, living[i] as Hero); q.fired++; }
  }
  if (q.t >= BURST_FREEZE + living.length * SWEEP_GAP + TAIL) s.seq = null;
}
