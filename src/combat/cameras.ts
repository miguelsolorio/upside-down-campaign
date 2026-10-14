// Security cameras. A camera sweeps its head between two headings and spots the active hero inside its cone when
// nothing solid is in the way. It goes alert for a while, sounds the alarm event once, then goes back to watching.
// Shooting it (hitBy 'shoot') lights it for good. A camera is not solid.
import type { CamDef, PropView } from '../core/types.ts';
import type { Prop, S } from './state.ts';
import { activeHero } from './state.ts';
import { angleDiff, dist, pointSolid } from './space.ts';
import { sfx } from './fx.ts';

/** Frames a camera stays alert after it spots the party. */
export const CAM_ALERT = 120;
const RAD = Math.PI / 180;

/** The head's heading in radians after `t` frames: a smooth there-and-back curve between `from` and `to`. */
export function camHeading(c: CamDef, t: number): number {
  const k = 0.5 - 0.5 * Math.cos((t / Math.max(1, c.period)) * Math.PI * 2);
  return (c.from + (c.to - c.from) * k) * RAD;
}

/** The live cone for the view. half is in radians. */
export function camView(p: Prop): NonNullable<PropView['cam']> {
  const c = p.cam as CamDef;
  return { angle: camHeading(c, p.camT), range: c.range, half: c.half * RAD, live: p.state !== 'lit' };
}

/** Clear line from the camera's middle to a point: no solid tile or solid prop between, ignoring the camera's own tile. */
function clearView(s: S, p: Prop, cx: number, cy: number, tx: number, ty: number): boolean {
  const n = Math.ceil(dist(cx, cy, tx, ty) / 4);
  for (let i = 1; i < n; i++) {
    const f = i / n;
    const x = cx + (tx - cx) * f, y = cy + (ty - cy) * f;
    if (x >= p.x && x < p.x + p.w && y >= p.y && y < p.y + p.h) continue;
    if (pointSolid(s, x, y)) return false;
  }
  return true;
}

/** True when the hero stands inside the camera's cone with a clear line to it. */
export function camSees(s: S, p: Prop): boolean {
  const c = p.cam;
  const hero = activeHero(s);
  if (!c || hero.ko) return false;
  const cx = p.x + p.w / 2, cy = p.y + p.h / 2;
  // The middle of the hero's foot box.
  const hx = hero.x, hy = hero.y - 4;
  if (dist(cx, cy, hx, hy) > c.range) return false;
  if (angleDiff(Math.atan2(hy - cy, hx - cx), camHeading(c, p.camT)) > c.half * RAD) return false;
  return clearView(s, p, cx, cy, hx, hy);
}

/** Turns every live camera's head, ends its alert, and lets it spot the hero. Runs right after the props' clocks. */
export function updateCameras(s: S): void {
  for (const p of s.props) {
    if (!p.cam || p.state === 'lit') continue;
    p.camT++;
    if (p.state === 'alert') {
      if (p.t >= CAM_ALERT) { p.state = 'closed'; p.t = 0; }
      continue;
    }
    if (camSees(s, p)) {
      p.state = 'alert';
      p.t = 0;
      s.events.push({ t: 'spotted', propId: p.id });
      sfx(s, 'spotted');
    }
  }
}
