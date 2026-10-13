// Cosmetic helpers: sound requests, effects, floaters, shake and flash. Nothing here touches gameplay state.
import type { ColorName, Dir, FxKind, FxView, SfxId } from '../core/types.ts';
import type { S } from './state.ts';

/** One request per sound per tick, so a burst that hits ten enemies is one 'hit', not ten. */
export function sfx(s: S, id: SfxId): void {
  if (s.sfxSeen.has(id)) return;
  s.sfxSeen.add(id);
  s.events.push({ t: 'sfx', id });
}

export function addFx(s: S, kind: FxKind, x: number, y: number, dir: Dir, angle: number, life: number, w = 0, h = 0): FxView {
  const f: FxView = { kind, x, y, dir, angle, t: 0, life, w, h };
  s.fx.push(f);
  if (s.fx.length > 80) s.fx.shift();
  return f;
}

export function floater(s: S, text: string, x: number, y: number, color: ColorName, big = false, life = 42): void {
  s.floaters.push({ text, x, y, t: 0, life, color, big });
  if (s.floaters.length > 40) s.floaters.shift();
}

/** A small puff of pixel dust. Uses cosmetic randomness only. */
export function dust(s: S, x: number, y: number, n = 3): void {
  for (let i = 0; i < n; i++) {
    const a = s.frng() * Math.PI * 2;
    addFx(s, 'dust', x + Math.cos(a) * 4, y - 1 + Math.sin(a) * 2, 'down', a, 14 + Math.floor(s.frng() * 6));
  }
}

export function sparks(s: S, x: number, y: number, n = 3): void {
  for (let i = 0; i < n; i++) {
    const a = s.frng() * Math.PI * 2;
    addFx(s, 'spark', x + Math.cos(a) * 3, y + Math.sin(a) * 3, 'down', a, 10 + Math.floor(s.frng() * 5));
  }
}

export function shake(s: S, amp: number): void { s.shake = Math.max(s.shake, amp); }
export function flashScreen(s: S, v: number): void { s.flash = Math.max(s.flash, v); }
export function hitstop(s: S, frames: number): void { s.hitstop = Math.max(s.hitstop, frames); }

/** Runs `fn` after `frames` ticks of normal play. Does not run during hit-stop or the burst freeze. */
export function schedule(s: S, frames: number, fn: () => void): void {
  s.timers.push({ n: frames, fn });
}
