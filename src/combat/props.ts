// Props the sim reacts to: logs (cleared by a push), gates (opened by the world) and targets (lit by a shot).
// Cameras (cameras.ts) are targets too: a shot lights one, and it never spots again. A prop marked `smash` also lights
// for any hero who swings at it from up close.
import type { Utility } from '../core/types.ts';
import type { Hero, Prop, S } from './state.ts';
import { dust, sfx } from './fx.ts';
import { angleDiff, dist } from './space.ts';

/** How close a basic attack has to start to smash a prop, in px from the hero's feet to the nearest edge of it. */
const SMASH_REACH = 18;
/** How wide a cone a close swing covers, either side of the aim. The same as a swing that tries a door (pokes.ts). */
const SMASH_HALF = 0.96;

export function isPushable(p: Prop): boolean {
  return p.state !== 'open' && (p.pushBy === 'push' || (p.kind === 'log' && p.pushBy === undefined));
}

/** True when a hit carrying `util` lights this prop. Targets and cameras default to being hit by `shoot`. */
export function isTargetFor(p: Prop, util: Utility | null): boolean {
  if (util === null || p.state === 'lit') return false;
  if (p.hitBy !== undefined) return p.hitBy === util;
  return (p.kind === 'target' || p.kind === 'camera') && util === 'shoot';
}

export function lightTarget(s: S, p: Prop): void {
  if (p.state === 'lit') return;
  p.state = 'lit';
  p.t = 0;
  s.events.push({ t: 'targetHit', propId: p.id });
  sfx(s, 'targetHit');
}

/** A hero starts a basic attack. Every unlit `smash` prop within arm's reach in front of him lights, whoever he is. */
export function smashAimed(s: S, h: Hero): void {
  const hy = h.y - 2;
  for (const p of s.props) {
    if (!p.smash || p.state === 'lit') continue;
    // The nearest point of the prop to his feet, as in pokes.ts: a prop in a wall face is a few px above them.
    const nx = Math.max(p.x, Math.min(h.x, p.x + p.w)), ny = Math.max(p.y, Math.min(hy, p.y + p.h));
    const d = dist(h.x, hy, nx, ny);
    if (d > SMASH_REACH) continue;
    if (d > 2 && angleDiff(Math.atan2(ny - hy, nx - h.x), h.aim) > SMASH_HALF) continue;
    lightTarget(s, p);
  }
}

/** A log (or anything pushable) is shoved out of the way. */
export function clearProp(s: S, p: Prop): void {
  if (p.state === 'open') return;
  p.state = 'open';
  p.solid = false;
  p.t = 0;
  s.events.push({ t: 'propCleared', propId: p.id });
  sfx(s, 'logPush');
  dust(s, p.x + p.w / 2, p.y + p.h, 6);
}

/** Opens a gate or clears a log by id. Safe to call between ticks: the events come out of the next step. */
export function openPropById(s: S, id: string): void {
  const p = s.props.find((q) => q.id === id);
  if (!p || p.state === 'open') return;
  if (p.kind === 'log' || isPushable(p)) { clearProp(s, p); return; }
  if (p.kind === 'target' || p.kind === 'console' || p.kind === 'camera') { lightTarget(s, p); return; }
  p.state = 'open';
  p.solid = false;
  p.t = 0;
  if (p.kind === 'gate' || p.kind === 'door') sfx(s, 'gateOpen');
}

export function updateProps(s: S): void {
  for (const p of s.props) { p.t++; if (p.pokeCd > 0) p.pokeCd--; }
}
