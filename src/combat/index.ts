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
// - The Demodog Alpha (enemies/alpha.ts, enemies/alpha_hit.ts): hud.boss reads DEMODOG ALPHA while it is awake. It bites (24 frame
//   wind-up under the "!"), lunges along a line locked when its wind-up starts, and pounces (pose 'crouch', then 'leap' with z rising,
//   a 'mark' fx where it lands, a 36 px shockwave, then pose 'stun' for 40 frames at 50 percent more damage). At 75, 50 and 25
//   percent HP it howls once each: pose 'howl' for 50 frames at double damage, a 'howl' fx (w the ring's diameter), the 'howl' sfx
//   and { t: 'howl', spawnId } with three young demodogs climbing out of the three burrows nearest it. Hits never stun or stagger it.
// - Run-time spawns (combat/spawns.ts) come up at SimOptions.burrows: awake, with a dust burst, worth 1 XP, dropping nothing, with
//   ids made up (rt1, rt2, ...) that are never looked up in skipSpawns. Their groups are howl1 to howl3 and defense. A defense wave
//   uses the burrows nearest the ward (the nearest and any within 128 px of it) in turn; with no burrows listed they come up on
//   open floor round the Alpha or the ward.
// - Robin (heroes/robin.ts): Scoop toss is a lob like Dustin's candy that lands on the nearest enemy in a 40 degree cone (never farther
//   than 72 px), flies 22 frames and splashes 16 px for power 0.9 and a 60 frame slow (an enemy under slow is tinted purple). In flight
//   it is a 'scoop' fx 6 wide, h its height; the splat is a 'scoop' fx, w its diameter. Word vomit (5 MP) is a 'babble' fx (w the reach,
//   56) and confuses every enemy in the cone for 180 frames (240 with Linguist, Lv 3): ActorView.confused, and the shared brain in
//   combat/confuse.ts walks it to the nearest other enemy and bumps it (20 frame wind-up under the "!", then 0.8 of its ATK against
//   the other's DEF). A boss (group 'boss', the Demogorgon, the Alpha, Grigori) staggers 30 frames instead and is never a bump target.
// - Nancy (heroes/nancy.ts): the Pistol is a 'bullet' fx in eight directions (4.4 px a frame, reach 160, power 1.1). The Shotgun (7 MP)
//   is five 'bullet' pellets across 50 degrees (5 px a frame, reach 72, power 0.6 each, knockback 4 capped so a volley shoves one
//   enemy once) and 'spark' fx at the muzzle. Both carry `shoot`. Trap kit (Lv 3): each Shotgun drops a 'trap' fx at her feet (600
//   frames, at most two, the oldest goes). The first non-boss enemy within 9 px of one is held 120 frames (a stun, so it tints yellow)
//   and takes power 0.8; the trap is spent.
// - A 'cipher' prop (hitBy 'read', solid) decodes while the active hero with `read` stands within 40 px: PropView.k climbs 1/45 a frame
//   and falls 1/90 when she steps away. At 1: 'decode' sfx, a 'reveal' fx, propCleared, open and walkable. openProp opens it at once.
//   Anyone without `read` who pushes it or swings or fires at it is 'poked'; Robin never is.
// - The stash (combat/pickups.ts): SimOptions.stash is spent by the sim. An Eggo when the active hero stands under 25 percent HP (at
//   most once every 120 frames), a Coke when Special is pressed short of MP (the special then fires on that press). Each is
//   { t: 'stashUsed', item }, an EGGO or COKE floater, the 'stash' sfx and one less in view().hud.stash.
// - closeProp(id) shuts an open prop: solid again if it is solid when shut, no event, a thud sfx. A vines prop spawned `state: 'open'`
//   has no default hitBy, so nothing burns a seal. A hero standing in the prop is moved to the nearest open tile (the tie goes to the
//   Alpha's side).
// - The defense (combat/defense.ts): defend() starts the clock. view().hud.ward is { name: 'ELEVEN', hp, hpMax, left, total } from then
//   on. Her npc ActorView is anim 'cast', strained true, with a bar (anim 'ko' after wardDown, 'idle' after defended). The rift prop's
//   PropView.k is 1 - left / total. Wave enemies go for her unless the hero is within 40 px of them, hit them in the last 90 frames, or
//   Babysit holds them (Enemy.taunt). Her HP is fixed; damage to her scales with difficulty and enemyMult. God mode makes her immune.
//   The clock runs through hit-stop and stops only for a burst and a game over. About every 600 frames the sim plays 'rumble'. At 0:
//   { t: 'defended' }, the 'gateShut' sfx, a shake and a flash, and every run-time enemy still up dies for no XP and no kill event.
//   If her HP hits 0 first: { t: 'wardDown', id } once, the clock stops and the waves stop.
// - The melting rat (enemies/rat.ts, combat/kills.ts): it swarms like the rat (24 frame wind-up, power 0.75) and, when it dies by any cause,
//   bursts: a 'goo' fx (w 44, h 22), the 'melt' sfx, and for the active hero within 22 px power 0.5 and the 'slow' status for 60 frames.
// - The Flayed (enemies/flayed.ts, enemies/hold.ts): a 30 frame "!", a 10 frame reach, and on contact a grab of power 0.8 that holds the
//   active hero for 40 frames (50 for an elite): pose 'grab' on it, the 'grab' sfx, ActorView anim 'hurt' on the hero, and no move or attack
//   until it lets go. The hold ends in a shove of 3 (no damage). A swap frees the hero, so does a hit on it with knockback 3 or more, and it
//   lets go if it is stunned, confused, staggered or killed. A dormant Flayed is an actor with `puddle` set; when its group wakes it has
//   pose 'rise' for 40 frames and cannot be hit, confused or shot.
// - The soldier (enemies/soldier.ts): holds 80 to 120 px from the hero, steps back inside 60, and after a 30 frame "!" fires three (an elite
//   five) 'bullet' rounds six frames apart along the aim locked at the end of the wind-up, with 'rifle' on each. A round hits for power 0.45
//   and leaves the hero invulnerable for five frames, so each round of a burst can land. Inside 22 px it clubs (20 frame wind-up, power
//   0.8, knockback 3). Bullets stop at solid tiles and props, and a hit on it breaks the wind-up and the burst.
// - Grigori (enemies/grigori.ts, grigori_hit.ts): hud.boss reads GRIGORI while he is awake. He always faces the hero (ActorView.dir) except
//   while he recovers, and a hit from inside 70 degrees of that facing deals a quarter, with the 'block' sfx. Haymaker at 28 px (30 frame
//   "!", reach 32, power 1.2, then 50 frames of recovery), grab (pose 'grab' from the "!" through the lunge and the 45 frame hold, then a
//   throw of power 1.0 and knockback 6), rage at half HP, pose 'stun' on the power box. Word vomit staggers him 30 frames and drops a hero he
//   holds. Hits never stagger him, and Nancy's traps do not hold him.
// - Flayed Billy (enemies/billy.ts, billy_hit.ts): hud.boss reads BILLY while he is awake and above 0 HP. He hunts at 1.1 px a frame and
//   faces the hero. Charge (pose 'charge', 24 frames under the "!", then a run at 3.6 px a frame for at most 160 px, along the line locked
//   when the "!" ends, with the hero 60 to 160 px away); a wall stops it and stuns him for 60 frames (pose 'stun', `thud`, x1.5 damage taken).
//   Grab inside 26 px (pose 'grab' from the "!" through the 50 frame hold, then a throw of power 1.0 and knockback 6; a swap frees the hero).
//   Two jabs inside 24 px (12 frame "!", power 0.6 twice, eight frames apart). At half HP he charges more often and faster and calls two
//   Flayed (group `billys`, run-time spawns). Word vomit staggers him 30 frames, traps do not hold him, knockback moves him a quarter as far.
//   The hit that would take him to 0 HP pins him instead: pose 'pinned', { t: 'pinned', spawnId: 'billy' } once, no more attacks, no boss bar.
//   Every hit on him is then { t: 'poked', propId: 'billy', hero } and does nothing, and a knocked-out Eleven stands back up for it. While
//   Eleven is the active hero, standing, within 32 px of him, ActorView.k climbs 1/60 a frame (else falls 1/120). At 1: the `reach` sfx, a
//   'reveal' fx, and he dies (the kill, XP, groupCleared `boss`). A dead Billy is not drawn dying: an npc `billy` stands where he knelt.
// - The Mind Flayer (enemies/flayer.ts, flayer_hit.ts, flayer_legs.ts, combat/pools.ts): the body (`flayer`) and four legs (`flayerleg`, ids leg1 to
//   leg4) in one group, rooted. hud.boss reads MIND FLAYER while it is awake, with `parts`, the four legs' HP shares (0 when cut). Waking the
//   group is 40 frames of pose 'rise' (a 'glass' fx, `shatter`) when nothing can be hit. Then one leg at a time (two in phase two, under half
//   HP) is sent down a line: ActorView pose 'warn' for 40 frames (28 in phase two), x, y the leg's root and aim the tip of a line 150 px long
//   through where the hero stood, ActorView.t counting the warning; then pose 'slam' for 12 (the `legslam` sfx, a 'slam' fx at the tip, w the
//   line's length, h 0): a hero within 12 px of the line takes power 1.2 and knockback 5, once. A goo pool lies where the tip landed (view().pools,
//   radius 20, 480 frames, at most four): the active hero in one is slowed and takes power 0.15 every 30 frames. The leg is hit at its tip
//   (the enemy's x, y), rests 30 frames, and at 0 HP is cut: pose 'severed', the `sever` sfx, hp 0, not dead, not hittable. A hit on the body
//   while any leg stands does nothing (a spark and `block`). With all legs cut the body is in pose 'down' for 300 frames and takes x1.5, then
//   the legs grow back whole. Every 540 frames while the head is up two Flayed (group `waves`, 1 XP, run-time) come up at the burrows farthest
//   west and east, at most three alive. In phase two about every 480 frames a leg sweeps: one 'sweep' fx (x, y its top-left, w wall to wall,
//   h 24, life 52, t < 40 the warning) across the row the hero stood on, power 1.0 and knockback 4 for a hero in it. Word vomit staggers a leg
//   30 frames (its slam waits) and does nothing to the body; knockback, the candy bar and traps do nothing to either. At 0 HP the body and its
//   four legs die in one tick (one groupCleared `flayer`), the pools dry up, the Flayed it sent drop with no kill, and the legs' 0 XP stays 0.
// - Hopper (heroes/hopper.ts): the Haymaker is a slow punch (cooldown 30, power 1.6, an 80 degree arc either side, no chain, the `haymaker`
//   sfx) and the Ground slam (8 MP) a 360 degree shockwave of 44 px (a `nova` fx, the `slam` sfx) that stuns every foe 60 frames. Both break
//   a `crack` prop. The slam's knockback (3.5) and the wind-up's (5) break a guard's block, the haymaker's (2.8) does not. Coffee (Lv 3):
//   Eggos, Cokes and the stash heal him 25 percent more. Wind-up (Lv 6): his Attack fires when the key comes up. Held 24 frames
//   (ActorView.charge fills) it is the wind-up haymaker, power x1.8 and knockback 5, and a tap is the plain haymaker. A hit lets go of the hold.
// - Eddie (heroes/eddie.ts, eddie_solo.ts, hellfire.ts): the Flying V swings a 75 degree arc (the `vswing` sfx) with a `riff` fx ring of 28 px where
//   the arc ends, which hits a foe the arc missed for 0.5. The arc, the ring and every solo pulse shatter a `mirror` or `clock` prop they reach:
//   propCleared, the `shatter` sfx and a `glass` fx. The mirror is walkable after, the clock stays solid. The Hellfire solo is a stand-in
//   (docs/level-11.md): 360 frames planted (480 with Dustin in the party), anim `cast`, a `riff` pulse every 30 frames (power 0.4, knockback 1.5,
//   40 px) and HudView.solo { t, life, streak 0, ring 40, beat }. A swap or a KO ends it, a hit does not. The seam for the real one is
//   startStand, pulse(crit) and endStand. Metalhead (Lv 3): +10 percent ATK. Hellfire DM (Lv 6): his hits mark a boss or an elite for 300
//   frames (ActorView.marked) and every party hit on it deals 20 percent more.
// - A party of one (Hopper in 4.1) is a swap that does nothing and makes no sound; his KO is allDown.
// - The Kamchatka guard (`kguard`) runs the soldier's brain, the camp guard (`kbaton`) the riot guard's, shield and all (enemies/shield.ts,
//   isShieldedKind), and the pit Demogorgon (`pitdemo`) the Demogorgon's, each on its own def. hud.boss reads DEMOGORGON for the pit one too. It
//   pins after three wall stuns as the 1.3 one does ({ t: 'pinned', spawnId } once), and only Hopper's ground slam reaching it kills it (HitOpts
//   `slam`); Eleven's beam and every other hit is a 'poked'. If Hopper is down when it pins he stands back up with the MP for one slam.
// - The Creel ghoul (enemies/ghoul.ts, ghoul_hit.ts): a spawn with `mirror` names the prop it waits in. In the glass it is not in the view, can't
//   be hit and doesn't count as aware. Once its group is awake and the active hero is within 80 px of the mirror with a clear line, and no ghoul of
//   that mirror stepped out in the last 90 frames, it steps out at its spawn spot (pose 'rise' for 40 frames, the `ghoul` sfx, hittable), then
//   drifts at the hero bobbing 1 to 3 px (z). Inside 40 px: a 24 frame "!" with the line locked on the hero's spot, a 10 frame lunge at 3.2 px a
//   frame (power 0.8, knockback 3), 30 frames of recovery. It takes x1.5 within 48 px of a lit lights prop and dies as glass (a 'glass' fx and
//   `shatter`). A mirror that shatters kills the ghouls still in it, dormant ones too: `kill` events with 0 XP and no quarter, so groupCleared
//   fires and a retry's kill list holds them. PropView.k of a mirror is the share of its ghouls still in the glass.
// - A clock spawned with `hits` breaks under that many basic attacks that start within 18 px of it, aimed its way, from a hero without the riff.
// - The curse (combat/curse.ts, house.ts): Sim.curse(prop) has a standing clock chime for the first time and curses the active hero, or if that
//   is Eddie or Max the next standing hero in party order who is neither; nothing if nobody else would be left standing, while the Walkman is on, or
//   for a broken or spent clock. { t: 'cursed', hero }. The chimes: at once, then every 300 frames (a curse keeps its own gap), each the `chime` sfx
//   and fx over the clock and 4 px more z for the hero (ActorView.curse and PartyHud.curse count them, 1 to 3). The fourth is a KO like any other
//   (heroKO) and { t: 'curseEnd', hero, how: 'ko' }. The cursed hero hangs in place, benched or not: no moving, attacking, regen, burst sweep or swap
//   to them, and the party swaps away from them at once if they were up. If everyone who can fight falls, allDown. Breaking the clock that chimed
//   (Eddie's riff, `hits` basic attacks, openProp) lifts its curse: the hero floats back down, { t: 'curseEnd', how: 'clock' }.
// - Max's Walkman (SimOptions.walkman, Sim.giveWalkman): a swap to Max that is not forced, while it is ready, plays it: the `walkman` sfx, a
//   'walkman' fx, { t: 'walkman' }, every curse ends ('walkman'), 480 frames in which Sim.curse does nothing, and 1800 frames until it is ready
//   again. HudView.walkman is { ready, on } while the party has it and Max is in it.
// - Chapter 5's five foes are stand-ins until Sim builds them (docs/level-14.md, docs/level-15.md), each on an existing brain and its own def: the
//   trooper (`trooper`) and the Commander (`commander`) run the riot guard's, shield and all (isShieldedKind, no slam), the Lab agent in hazmat
//   (`agent5`) the agent's, and the Demogorgon foe (`demofoe`) and the twins (`twin`) the demodog's. hud.boss reads THE COMMANDER and THE TWINS.
//   The view has the fields they will need and the sim does not set them yet: ActorView.broken (a trooper's shield broken for good), cracked
//   (the Commander below half HP), second (the second twin), poses plant, flank, fall and climb (a twin dropping into the void, k its depth),
//   the `fall` fx, and Grid.drop (the void's tiles, solid, from the legend) for the fall.
// - The power box (combat/powerbox.ts): a shot on a 'breaker' prop emits targetHit and fires every 'powerbox' prop for 30 frames (state
//   'lit', the 'zap' sfx, an 'arcs' fx w by h its size). Whatever has its feet on a plate then: Grigori is stunned for 180 frames and loses
//   8 percent of his max HP, and takes full damage times 1.5 from every side meanwhile; any other awake enemy loses 30 percent of its max HP;
//   the active hero takes 15 and is thrown clear. The breaker is 'closed' again 300 frames after it was lit. openProps never leaves it lit.
import type { Sim, SimOptions } from '../core/types.ts';
import { buildSim } from './sim.ts';

export { setShakeScale, setReduceFlashing } from './view.ts';

export function createSim(opts: SimOptions): Sim {
  return buildSim(opts).sim;
}
