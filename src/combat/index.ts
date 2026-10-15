// PUBLIC API of the simulation. Owner: Sim agent.
// Pure TypeScript: no DOM, no gfx, no audio. Sound is requested with { t: 'sfx' } events.
//
// Conventions the other modules can rely on:
// - 60 Hz. step() returns the events of that tick. Calls made between ticks (recruit, spawnGroup, openProp,
//   healParty, dev.*) queue their events and sounds, and the next step() returns them.
// - Tile spawns put an actor's feet at x = tx * 16 + 8, y = ty * 16 + 12. A prop's tx, ty is its top-left tile,
//   w and h are in px (default 16 by 16, van 48 by 32). Solid by default: log, gate, van, crate, floodlight, door, console.
//   Props start 'closed', lights and floodlights start 'off'. A log defaults to pushBy 'push', a target to hitBy 'shoot'.
//   A console has no default: its spawn names hitBy ('burn' for Dustin's spray, 'shoot' for Lucas). A crate needs pushBy 'push'.
// - skipSpawns drops enemies, items and npcs by id. openProps opens gates, doors and logs and lights targets and consoles.
//   openProp(id) clears a log or crate, opens a gate or door, lights a target or console, and switches lights and
//   floodlights on (state 'open').
// - xp (PartySeed, HeroSnapshot, PartyHud) is the XP carried toward the next level, not a running total.
//   party() snapshots also carry the d20 bonus as an extra `bonus` field. Pass them back as PartySeeds to keep stats.
// - Hero shots fly over terrain (the creek is solid) but stop at solid props. Enemy darts stop at trees and walls.
// - Dormant enemies are not in view().actors but do count in enemiesAlive(). spawnGroup() wakes them already hunting.
// - view().fx positions are effect centers in world px. Projectiles and slashes sit at chest height, rings and dust at
//   the feet. For cone effects (slash, push, flame) w is the reach and h the chord width at the far edge. A beam has
//   w as length and h as width. 'shield' is the DM screen: w across, h thick, angle is the way Mike faces.
//   'candy' is the lobbed bar in flight (h is its height off the ground) and then the bait on the ground (h is 0).
// - view().floaters start at x, y and the renderer rises them as t grows. Enemies show 'ko' for about 22 frames
//   after death. A KO'd hero lies where it fell ('ko' anim) for about 100 frames.
// - Shake and flash settings come in through setShakeScale() and setReduceFlashing().
// - Enemy spawns take tier: 'elite' (HP x1.9, ATK x1.6, speed x1.1, cooldown x0.75, XP and quarter drops x2; view().actors[].elite).
//   'guard' and 'warden' carry a shield (view().actors[].guarding): see enemies/guard.ts and enemies/shield.ts. A guard faces
//   one of four ways (the actor's dir), starting 'down', and turns to the hero only after 12 frames with the hero behind its
//   shield. view().hud.boss is the first awake, living Warden.
// - SimOptions.hazards cycle on their own clock (hazards.ts): the first burst is at `phase`, then every `period`, and the 24
//   frames before each show 'warn'. The clock stops whenever play does. A hazard's sound plays only when it is within about
//   a screen of the active hero. view().hazards reports each one every tick.
// - { t: 'poked', propId, hero } reports a try at a shut gate, door, log, crate, lantern or console: an attack aimed at it
//   in reach, or pushing against it for 20 ticks (pokes.ts). It says nothing about whether the hero was the right one.
// - A 'camera' prop with a `cam` sweeps (cameras.ts), spots the active hero in its cone with a clear line, and emits
//   { t: 'spotted', propId } once per spotting. PropView.cam is the live cone: angle and half in radians, range in px.
//   A shot lights it (hitBy defaults to 'shoot') and a lit camera is off for good, which openProps restores. Cameras are
//   not solid. tank, rack and generator are solid by default and do nothing else.
// - The Demogorgon (enemies/demogorgon.ts, enemies/demo_hit.ts) sets view().actors[].pose and .petals, fills view().hud.boss
//   with the name DEMOGORGON while it is awake, and adds 'mark' and 'acid' effects (the header of demogorgon.ts says how they
//   are sized). Its HP holds at 1 until three wall stuns. Then the hit that would finish it pins it: { t: 'pinned', spawnId }
//   once, no more attacks, and only Eleven's Mind Blast beam hurts it. Any other hit on it is { t: 'poked', propId: <its spawn
//   id>, hero } and does nothing. The beam kills it with a normal kill and groupCleared.
// - vines (hitBy 'burn', solid by default) burn under Dustin's spray: a sizzle and flames, then propCleared 30 frames later, open
//   and not solid. firebox (hitBy 'shoot') lights like a console. A van with pushBy 'push' clears like a crate. All three, when
//   they ask for something, report a try as 'poked' like a gate does.
// - Will (heroes/will.ts, heroes/cold.ts): his bolt is a 'bolt' fx, his Fireball a small 'flame' in flight and a 'blast' (w and h
//   the diameter) where it bursts. A d20 from the sim's rng sizes the burst: radius 16 plus the roll, a 1 is a FIZZLE and no
//   damage, a 20 doubles it and floats NAT 20. From Lv 3, while he is the active hero, enemies spawned `hidden: true` within 72 px
//   have ActorView.hidden false (it is true for them otherwise, until they strike) and take 15 percent more damage. A prop
//   `hidden` (hitBy 'sense', solid by default) is shown when the active hero has that utility within 40 px of it: a 'reveal' sfx and
//   fx, propCleared, open and walkable. Any other hero pushing or hitting it is a try ('poked').
// - Level 4's enemies (enemies/demodog.ts, vine.ts, pod.ts): a demodog circles, winds up for 28 frames and lunges; only one in a pack
//   does either at a time. Vines and pods are rooted. A vine's lash and a pod's spore cloud slow the hero (his tint is purple, his
//   speed 0.55 for 90 frames). A pod that bursts dies for no XP; a vine takes double from fire. 'spore' fx: w the cloud's diameter.
// - A prop spawned with smash: true (a camera, a console) also lights for any hero's basic attack that starts within
//   18 px of it, aimed its way (props.ts), whatever its hitBy asks for.
// - Max (heroes/max.ts, heroes/skate.ts): the Board is a two-hit chain. The Skate dash is a straight 72 px roll along her aim, 16 frames,
//   invulnerable for the roll and 6 frames after, one hit to every enemy it passes through, a 'skate' sfx, a 'trail' fx (x, y where
//   it started at chest height, angle the heading, w the length rolled) and the 'dash' anim. It stops at a wall. A gap (a drop, solid
//   to walking and to enemies, not to sight or shots) does not stop it: a roll that would end over one carries on up to 16 px to
//   clear it, or stops on the near side if the far side is blocked. The gaps she crossed open when she lands: state 'open', one
//   propCleared each, still solid. A swap waits out the roll. A hero without 'dash' who pushes at a gap for 20 ticks, swings or fires
//   at it is a 'poked'; Max is not. High score (Lv 3) adds 10 percent quarter drops and 5 percent crit.
// - Steve (heroes/steve.ts, heroes/steve_guard.ts): the nail bat is a three-hit chain, and a swing that reaches a 'crack' prop (hitBy
//   'smash', solid) breaks it: 'crack' sfx, dust, propCleared, open and not solid. Other heroes at a crack are 'poked'; Steve never is.
//   Babysit pulses a 'taunt' fx (w the diameter, 144) and sfx, sets Enemy.taunt to 180 frames on every enemy within 72 px, and for
//   300 frames he takes 40 percent less damage and the party's DEF is up 15 percent. Hair of steel (Lv 3): after 300 frames without
//   a hit, the next one does nothing and floats SAVED.
// - The bot (bot.ts) crosses a gap at a waypoint flagged `dash: true`: it swaps to the party hero with the 'dash' utility, faces the
//   next waypoint, casts the special and carries on. It treats gaps and cracks as walls, so there is no way across without it.
import type { Sim, SimOptions } from '../core/types.ts';
import { buildSim } from './sim.ts';

export { setShakeScale, setReduceFlashing } from './view.ts';

export function createSim(opts: SimOptions): Sim {
  return buildSim(opts).sim;
}
