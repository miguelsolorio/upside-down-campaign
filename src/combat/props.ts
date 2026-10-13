// Props the sim reacts to: logs (cleared by a push), gates (opened by the world) and targets (lit by a shot).
import type { Utility } from '../core/types.ts';
import type { Prop, S } from './state.ts';
import { dust, sfx } from './fx.ts';

export function isPushable(p: Prop): boolean {
  return p.state !== 'open' && (p.pushBy === 'push' || (p.kind === 'log' && p.pushBy === undefined));
}

/** True when a hit carrying `util` lights this prop. Targets default to being hit by `shoot`. */
export function isTargetFor(p: Prop, util: Utility | null): boolean {
  if (util === null || p.state === 'lit') return false;
  if (p.hitBy !== undefined) return p.hitBy === util;
  return p.kind === 'target' && util === 'shoot';
}

export function lightTarget(s: S, p: Prop): void {
  if (p.state === 'lit') return;
  p.state = 'lit';
  p.t = 0;
  s.events.push({ t: 'targetHit', propId: p.id });
  sfx(s, 'targetHit');
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
  if (p.kind === 'target') { lightTarget(s, p); return; }
  p.state = 'open';
  p.solid = false;
  p.t = 0;
  if (p.kind === 'gate') sfx(s, 'gateOpen');
}

export function updateProps(s: S): void {
  for (const p of s.props) p.t++;
}
