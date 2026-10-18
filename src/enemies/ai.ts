// Enemy AI driver: shared per-tick upkeep (cooldowns, knockback, stagger, stun, the candy lure), then the
// kind-specific brain (the bosses skip the stun and the lure: the Demogorgon and the Alpha the stagger too), then a soft push so enemies do not stack on one pixel.
// A soldier's brain runs the Kamchatka guard too, the riot guard's the camp guard, the Demogorgon's the pit one, each on its own def.
// A pinned Billy is the exception to the order: his reach runs before everything that could skip his turn (a stagger, a hero down).
// Holds (hold.ts) are checked first every tick, because a confused, stunned or staggered holder never reaches its own brain.
import { ENEMY_DEFS } from './defs.ts';
import type { Enemy, Hero, S } from '../combat/state.ts';
import { activeHero } from '../combat/state.ts';
import { dist, moveBody } from '../combat/space.ts';
import { speedMul } from '../combat/status.ts';
import { confusedUpdate } from '../combat/confuse.ts';
import { ratUpdate } from './rat.ts';
import { agentUpdate } from './agent.ts';
import { guardUpdate } from './guard.ts';
import { demogorgonUpdate, updateGlobs } from './demogorgon.ts';
import { demodogUpdate } from './demodog.ts';
import { alphaUpdate } from './alpha.ts';
import { flayedUpdate } from './flayed.ts';
import { soldierUpdate } from './soldier.ts';
import { grigoriUpdate } from './grigori.ts';
import { billyUpdate } from './billy.ts';
import { billyReach, isBillyPinned } from './billy_hit.ts';
import { flayerUpdate } from './flayer.ts';
import { legUpdate, legWait } from './flayer_legs.ts';
import { flayerRooted } from './flayer_hit.ts';
import { updateHolds } from './hold.ts';
import { vineUpdate } from './vine.ts';
import { podUpdate } from './pod.ts';
import { ghoulUpdate, glassUpdate } from './ghoul.ts';
import { isShielded } from './shield.ts';
import { setEnemyAnim, stepToward } from './steer.ts';
import { lostHim } from '../heroes/camo.ts';

const FRICTION = 0.78;
const SEPARATION = 9;

function updateOne(s: S, e: Enemy, hero: Hero): void {
  e.animT++;
  if (e.flash > 0) e.flash = Math.max(0, e.flash - 0.1);
  if (e.cd > 0) e.cd--;
  if (e.broken > 0) e.broken--;
  if (e.grace > 0) e.grace--;
  if (e.noLure > 0) e.noLure--;
  if (e.vx !== 0 || e.vy !== 0) {
    moveBody(s, e, e.vx, e.vy);
    e.vx *= FRICTION; e.vy *= FRICTION;
    if (Math.hypot(e.vx, e.vy) < 0.1) { e.vx = 0; e.vy = 0; }
  }
  // The reach of a pinned Billy climbs and falls whatever else is going on (a hero down, say): it is Eleven's to hold.
  if (isBillyPinned(e)) { billyReach(s, e, hero); return; }
  if (e.stagger > 0) { e.stagger--; legWait(e); setEnemyAnim(e, 'hurt'); return; }
  if (e.stat.stun > 0) { setEnemyAnim(e, 'hurt'); return; }
  // A foe that has lost Lucas to his Camo stands and looks round (heroes/camo.ts).
  if (s.over || hero.ko || lostHim(s, e, hero)) { setEnemyAnim(e, 'idle'); return; }

  // A confused enemy (Robin's Word vomit) runs the shared brain in combat/confuse.ts, whatever its kind.
  if (e.stat.confuse > 0) { confusedUpdate(s, e); return; }
  // The bosses ignore the candy bar, and no hit staggers them. They run their own moves.
  if (e.demo) { demogorgonUpdate(s, e, hero); return; }
  if (e.alpha) { alphaUpdate(s, e, hero); return; }
  if (e.grigori) { grigoriUpdate(s, e, hero); return; }
  if (e.billy) { billyUpdate(s, e, hero); return; }
  if (e.flayer) { flayerUpdate(s, e, hero); return; }
  if (e.leg) { legUpdate(s, e, hero); return; }
  // A Creel ghoul floats at the hero and ignores the candy bar too.
  if (e.ghoul) { ghoulUpdate(s, e, hero); return; }
  // The vine and the pod are rooted: no lure moves them.
  if (e.kind === 'vine') { vineUpdate(s, e, hero); unhide(e); return; }
  if (e.kind === 'pod') { podUpdate(s, e, hero); unhide(e); return; }

  const def = ENEMY_DEFS[e.kind];
  // A Flayed coming up out of the goo or holding the hero is not drawn off by the candy.
  const lure = e.flayed !== null && (e.flayed.move === 'rise' || e.flayed.move === 'hold') ? null : s.lure;
  if (e.mode === 'lured') {
    if (!lure || e.noLure > 0) e.mode = e.aware ? 'chase' : e.patrol.length > 0 ? 'patrol' : 'idle';
  } else if (lure && e.noLure <= 0 && e.mode !== 'windup' && e.mode !== 'lunge' && dist(e.x, e.y, lure.x, lure.y) <= lure.pull) {
    e.mode = 'lured';
  }
  if (e.mode === 'lured' && lure) {
    const moved = dist(e.x, e.y, lure.x, lure.y) > 6 ? stepToward(s, e, lure.x, lure.y, def.speed * 0.9 * e.spd * speedMul(e.stat)) : 0;
    setEnemyAnim(e, moved > 0 ? 'walk' : 'idle');
    return;
  }
  // The melting rat swarms like the rat (docs/level-7.md). Grigori is above, with the other bosses.
  if (e.kind === 'rat' || e.kind === 'melter') ratUpdate(s, e, hero);
  else if (e.flayed) flayedUpdate(s, e, hero);
  else if (e.soldier) soldierUpdate(s, e, hero);
  else if (isShielded(e)) guardUpdate(s, e, hero);
  else if (e.kind === 'demodog' || e.kind === 'demofoe' || e.kind === 'twin') { demodogUpdate(s, e, hero); unhide(e); }
  else agentUpdate(s, e, hero);
}

/** A hidden enemy that has started an attack shows itself for good. */
function unhide(e: Enemy): void {
  if (e.hidden && (e.mode === 'windup' || e.mode === 'lunge')) e.hidden = false;
}

const rooted = (e: Enemy): boolean => e.kind === 'vine' || e.kind === 'pod' || isBillyPinned(e) || flayerRooted(e);

function separate(s: S): void {
  const list = s.enemies.filter((e) => !e.dead && !e.dormant);
  for (let i = 0; i < list.length; i++) {
    const a = list[i] as Enemy;
    for (let j = i + 1; j < list.length; j++) {
      const b = list[j] as Enemy;
      const dx = b.x - a.x, dy = b.y - a.y;
      const d = Math.hypot(dx, dy);
      if (d >= SEPARATION) continue;
      const nx = d > 0.01 ? dx / d : ((a.uid & 1) === 0 ? 1 : -1);
      const ny = d > 0.01 ? dy / d : 0;
      const push = (SEPARATION - d) * 0.25;
      // Rooted things stay put and the other one is shoved the whole way.
      const ra = rooted(a), rb = rooted(b);
      if (ra && rb) continue;
      if (!ra) moveBody(s, a, -nx * push * (rb ? 2 : 1), -ny * push * (rb ? 2 : 1));
      if (!rb) moveBody(s, b, nx * push * (ra ? 2 : 1), ny * push * (ra ? 2 : 1));
    }
  }
}

export function updateEnemies(s: S): void {
  const hero = activeHero(s);
  updateGlobs(s);
  updateHolds(s);
  for (const e of s.enemies) {
    if (e.dead) continue;
    // A ghoul in its mirror is dormant, and still keeps an eye out for a hero who comes near.
    if (e.dormant) { if (e.ghoul) glassUpdate(s, e, hero); continue; }
    updateOne(s, e, hero);
  }
  separate(s);
}

/** True while any awake enemy is chasing or attacking the hero. Drives the music's combat layer. */
export function anyAggro(s: S): boolean {
  for (const e of s.enemies) {
    if (e.dead || e.dormant || !e.aware) continue;
    if (e.mode === 'chase' || e.mode === 'windup' || e.mode === 'lunge' || e.mode === 'recover') return true;
  }
  return false;
}
