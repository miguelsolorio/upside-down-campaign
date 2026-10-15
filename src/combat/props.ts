// Props the sim reacts to: logs and vans (cleared by a push), gates (opened by the world), targets, consoles and fire-door
// boxes (lit by a shot or a flame), vines (burned away by a flame) and hidden paths (shown by a hero who can sense them).
// A gap (a drop across a tunnel) is crossed by Max's Skate dash and a crack in a wall is broken by Steve's nail bat.
// Cameras (cameras.ts) are targets too: a shot lights one, and it never spots again. A prop marked `smash` also lights
// for any hero who swings at it from up close. A cipher door (docs/level-8.md) decodes while a hero with `read` stands near. A breaker
// lit by a shot fires the power boxes (powerbox.ts).
import type { PropKind, PropState, Utility } from '../core/types.ts';
import { TILE } from '../core/config.ts';
import type { Hero, Prop, S } from './state.ts';
import { activeHero } from './state.ts';
import { addFx, dust, sfx } from './fx.ts';
import { FOOT_H, FOOT_W, angleDiff, dist, footBlocked, nearestOnRect, rectsOverlap } from './space.ts';
import { utilitiesAt } from '../heroes/defs.ts';
import { senseRange } from '../heroes/sensory.ts';
import { fireBoxes } from './powerbox.ts';

/** Frames the vines burn (state 'lit', still solid) before they are gone. */
export const VINE_BURN = 30;
/** The state a prop returns to when it is shut again, where it is not 'closed'. */
const DEFAULT_SHUT: Partial<Record<PropKind, PropState>> = { lights: 'off', floodlight: 'off' };
/** How close a hero who can sense it must stand to show a hidden path, in px from the nearest point of the prop. */
export const SENSE_RANGE = 40;
/** Frames a hero with `read` takes to decode a cipher door standing at it, and to lose it again once she steps away. */
export const DECODE_FRAMES = 45;
export const DECODE_FADE = 90;
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
  // A breaker fires every power box in the stage (combat/powerbox.ts).
  if (p.kind === 'breaker') fireBoxes(s);
}

/** Fire reaches a prop that asked to be burned: vines catch, anything else lights like a target. */
export function hitProp(s: S, p: Prop): void {
  if (p.kind === 'vines') igniteVines(s, p); else lightTarget(s, p);
}

/** The vines catch: a sizzle and flames along them now, and they are gone VINE_BURN frames later. */
function igniteVines(s: S, p: Prop): void {
  if (p.state !== 'closed') return;
  p.state = 'lit';
  p.t = 0;
  p.burnT = VINE_BURN + 1;
  sfx(s, 'sizzle');
  for (let x = p.x + 8; x < p.x + p.w; x += 16) addFx(s, 'flame', x, p.y + p.h - 2, 'up', -Math.PI / 2, VINE_BURN, 16, 14);
}

/** The vines are gone: open, not solid, and the stage hears it. */
function clearVines(s: S, p: Prop): void {
  if (p.state === 'open') return;
  p.state = 'open';
  p.solid = false;
  p.t = 0;
  p.burnT = 0;
  s.events.push({ t: 'propCleared', propId: p.id });
  dust(s, p.x + p.w / 2, p.y + p.h, 5);
}

/** The hidden path shows itself: a reveal, and it is open and walkable. */
function revealHidden(s: S, p: Prop): void {
  if (p.state === 'open') return;
  p.state = 'open';
  p.solid = false;
  p.t = 0;
  s.events.push({ t: 'propCleared', propId: p.id });
  sfx(s, 'reveal');
  addFx(s, 'reveal', p.x + p.w / 2, p.y + p.h / 2, 'down', 0, 40, p.w, p.h);
}

/** A hero who has the utility the prop asks for (Will's `sense`, Robin's `read`), alive and active, and within 40 px of it. */
function sensed(s: S, p: Prop, fallback: Utility = 'sense'): boolean {
  const h = activeHero(s);
  if (h.ko || !utilitiesAt(h.id, h.level).includes(p.hitBy ?? fallback)) return false;
  const q = nearestOnRect(p, h.x, h.y - 2);
  // Eleven's Sensory tank reaches a hidden path from much farther off.
  return Math.hypot(q.x - h.x, q.y - (h.y - 2)) <= ((p.hitBy ?? fallback) === 'sense' ? senseRange(s, SENSE_RANGE) : SENSE_RANGE);
}

/** The cipher door is decoded: `decode` and a `reveal`, propCleared, open and walkable, its letters all English (k 1). */
function decodeCipher(s: S, p: Prop): void {
  if (p.state === 'open') return;
  p.state = 'open';
  p.solid = false;
  p.t = 0;
  p.k = 1;
  s.events.push({ t: 'propCleared', propId: p.id });
  sfx(s, 'decode');
  addFx(s, 'reveal', p.x + p.w / 2, p.y + p.h / 2, 'down', 0, 40, p.w, p.h);
}

/** A shut cipher door follows its reader: k climbs by 1/45 a frame while she is near and falls by 1/90 when she is not. */
function updateCipher(s: S, p: Prop): void {
  if (p.state !== 'closed') return;
  if (sensed(s, p, 'read')) p.k = Math.min(1, p.k + 1 / DECODE_FRAMES);
  else p.k = Math.max(0, p.k - 1 / DECODE_FADE);
  if (p.k >= 1 - 1e-9) decodeCipher(s, p);
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

/**
 * Max has crossed a gap: it reads 'open', which solves the puzzle, and the stage hears it once. It stays solid, so walking
 * across is still no way over, and it looks the same.
 */
export function crossGap(s: S, p: Prop): void {
  if (p.state === 'open') return;
  p.state = 'open';
  p.t = 0;
  s.events.push({ t: 'propCleared', propId: p.id });
}

/** The crack gives way: a crack and dust, the stage hears it, and it is open and walkable. */
export function breakCrack(s: S, p: Prop): void {
  if (p.state === 'open') return;
  p.state = 'open';
  p.solid = false;
  p.t = 0;
  s.events.push({ t: 'propCleared', propId: p.id });
  sfx(s, 'crack');
  dust(s, p.x + p.w / 2, p.y + p.h, 8);
}

/**
 * One of Steve's nail bat swings lands from `h` along `aim`. Every shut crack inside the swing's reach breaks, the way a
 * swing that reaches an enemy hits it: the nearest point of the crack to his feet within `reach` and inside the cone.
 */
export function smashCracks(s: S, h: Hero, aim: number, reach: number, half: number): void {
  const hy = h.y - 2;
  for (const p of s.props) {
    if (p.kind !== 'crack' || p.state === 'open') continue;
    const q = nearestOnRect(p, h.x, hy);
    const d = dist(h.x, hy, q.x, q.y);
    if (d > reach + 4) continue;
    if (d > 2 && angleDiff(Math.atan2(q.y - hy, q.x - h.x), aim) > half) continue;
    breakCrack(s, p);
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
  if (p.kind === 'vines') { clearVines(s, p); return; }
  if (p.kind === 'hidden') { revealHidden(s, p); return; }
  if (p.kind === 'gap') { crossGap(s, p); return; }
  if (p.kind === 'crack') { breakCrack(s, p); return; }
  if (p.kind === 'cipher') { decodeCipher(s, p); return; }
  if (p.kind === 'target' || p.kind === 'console' || p.kind === 'camera' || p.kind === 'firebox' || p.kind === 'breaker') { lightTarget(s, p); return; }
  p.state = 'open';
  p.solid = false;
  p.t = 0;
  if (p.kind === 'gate' || p.kind === 'door' || p.kind === 'shutter') sfx(s, 'gateOpen');
}

/** How far from a hero's feet closeProp looks for open floor, in tiles. */
const EJECT_RADIUS = 8;

/** The open floor nearest (x, y): a tile whose foot box is clear of solid tiles and props. Ties go to the side of the Alpha. */
function nearestOpenFeet(s: S, x: number, y: number): { x: number; y: number } | null {
  const alpha = s.enemies.find((e) => e.alpha !== null && !e.dead);
  const tx0 = Math.floor(x / TILE), ty0 = Math.floor(y / TILE);
  let best: { x: number; y: number } | null = null;
  let bestScore = Infinity;
  for (let ty = ty0 - EJECT_RADIUS; ty <= ty0 + EJECT_RADIUS; ty++) {
    for (let tx = tx0 - EJECT_RADIUS; tx <= tx0 + EJECT_RADIUS; tx++) {
      const fx = tx * TILE + TILE / 2, fy = ty * TILE + 12;
      if (footBlocked(s, fx, fy)) continue;
      const score = dist(x, y, fx, fy) + (alpha ? dist(alpha.x, alpha.y, fx, fy) * 0.001 : 0);
      if (score < bestScore) { bestScore = score; best = { x: fx, y: fy }; }
    }
  }
  return best;
}

/**
 * Shuts an open prop again (Sim.closeProp): solid once more, like a seal of vines across the Alpha's den. A hero whose feet are
 * inside it is moved to the nearest open floor, so nobody is ever stuck in one. Nothing else is told: no event.
 */
export function closePropById(s: S, id: string): void {
  const p = s.props.find((q) => q.id === id);
  if (!p || p.state !== 'open') return;
  p.state = DEFAULT_SHUT[p.kind] ?? 'closed';
  p.solid = p.shutSolid;
  p.t = 0;
  p.k = 0;
  p.burnT = 0;
  sfx(s, 'thud');
  dust(s, p.x + p.w / 2, p.y + p.h, 5);
  if (!p.solid) return;
  s.heroes.forEach((h, i) => {
    if (!rectsOverlap(h.x - FOOT_W / 2, h.y - FOOT_H, FOOT_W, FOOT_H, p.x, p.y, p.w, p.h)) return;
    const to = nearestOpenFeet(s, h.x, h.y);
    if (!to) return;
    h.x = to.x; h.y = to.y; h.vx = 0; h.vy = 0;
    if (i === s.active) { s.trailX.fill(to.x); s.trailY.fill(to.y); }
  });
}

export function updateProps(s: S): void {
  for (const p of s.props) {
    p.t++;
    if (p.pokeCd > 0) p.pokeCd--;
    if (p.kind === 'vines' && p.state === 'lit' && --p.burnT <= 0) clearVines(s, p);
    if (p.kind === 'hidden' && p.state === 'closed' && sensed(s, p)) revealHidden(s, p);
    if (p.kind === 'cipher') updateCipher(s, p);
  }
}
