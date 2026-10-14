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
import type { Sim, SimOptions } from '../core/types.ts';
import { buildSim } from './sim.ts';

export { setShakeScale, setReduceFlashing } from './view.ts';

export function createSim(opts: SimOptions): Sim {
  return buildSim(opts).sim;
}
