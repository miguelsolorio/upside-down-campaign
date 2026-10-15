# Level 2 spec: stage 1.2, Hawkins Lab

One stage, five to eight minutes. World builds it, Story writes the words, Art draws the lab, Audio scores it. Ids below are fixed. Every agent reads this file and `docs/technical-architecture.md`, and nothing else is shared. The sections down to "Second pass" describe the stage as built. "Second pass: the hard Lab" is the contract it was built to.

## Shape

- Map: 48 by 44 tiles as ASCII rows using the legend in `src/core/tiles.ts`, in `src/world/stages/stage12.ts`. Spawns, hazards and camera sweeps are in `stage12_data.ts`. The outer ring is solid.
- Route: a snake in three bands. South band, going east: the loading dock (start, outdoors, south-west), corridor A, the power room. Middle band, going west: the animal lab, the observation corridor, with the server room off its south side. North band, going east: the storage hall, the crate corridor and vestibule, the records wing (end, north-east). One main path. Side corners hold the items.
- Light: `time: 'day'`. There is no darkness and no glow pool. The lab gets its look from its own tiles, drawn in cold greys, teal and bone. The loading dock uses outdoor tiles (gravel, road, lab fence, lamps, pines), so the level begins outside and goes in.
- Music: `lab`. The combat layer fades in while `sim.aggro()` is true.
- Party: Mike (active), Dustin, Lucas, Eleven. They arrive from stage 1.1 with levels, XP and d20 bonus carried. There is no recruit and no `eleven` npc. A jump straight to the stage (`?stage=1.2`) starts them as a run out of 1.1 brings them: Mike at Lv 3, the others at Lv 2, with their XP (`defaultParty` in `core/campaign.ts`).
- Dialogue is off by default. A player who tries a door or a puzzle with the wrong hero gets the hint at once, and nothing else. The scripts below are for players who turn story on.

## Rooms

| Room | Tiles (x, y) | Floor | Dressing | What happens |
|---|---|---|---|---|
| Loading dock | 1 to 12, 32 to 41 | gravel, road | lab fence, lamps, the van, two crates, oil stains | The start and `lights_dock`. Nothing hostile |
| Corridor A | 14 to 27, 31 to 36 | `labfloor`, lane stripes | lockers on both walls, a locker island, a floor vent, `cam1` and `cam2` on the north wall | One agent paces the lane |
| Power room | 29 to 45, 31 to 41 | `cable`, `plate` under the panels | three generators, pipes, electrical cabinets, `sensor1` in the north wall, `door1` | Two arcing panels. The elite agent in the vent answers `cam2` |
| Animal lab | 31 to 46, 17 to 27 | `tilegreen`, `drain` | a wall of cages with a gap, six tanks, growth and vines in the far corner, stains | Two rats wake when the party comes in. Steam from the drains |
| Observation corridor | 4 to 29, 17 to 21 | `labfloor2` | the glass wall, viewing benches, a wall sign, `cam3` on the south wall | `relay1` behind the glass, the scare, two steam grates, the elite agent from the server room |
| Server room | 6 to 28, 24 to 27 | `labfloor2`, `cable` | seven racks, benches, a vent | Side room, door at its west end. A Coke and a quarter |
| Storage hall | 3 to 26, 3 to 11 | `labfloor`, `stain` | shelf islands in the north, crates, vines in the corners | Two riot guards, a steam line, `lights_hall` just past `door2` |
| Vestibule | 29 to 31, 3 to 9 | `labfloor` | a wall sign | `lights_records`, the last light before the wing |
| Records wing | 33 to 46, 3 to 11 | `carpet` | cabinets as cover, wall signs, growth splitting the walls, thick vines | The lockdown, five cracked floor panels, the Warden |

The Upside Down leaks in on the way: nothing near the dock, vines and growth in the animal lab's far corner, more in the observation corridor's west end and the storage hall's corners, and the most in the records wing.

## Tiles

Nine lab tiles from the first pass and thirteen dressing tiles. Floors, cable, drains, stains, vines, carpet, tilegreen, plate and the vent are walkable. Everything else is solid. Glass is solid but see-through: hero shots fly over terrain, so a relay or a camera can be hit over a wall.

| Char | Tile | Solid | Use |
|---|---|---|---|
| `o` | labfloor | no | Corridor A, the storage hall, the vestibule |
| `O` | labfloor2 | no | The observation corridor, the server room, the glass chamber |
| `z` | hazard | no | Yellow and black stripe. Doorways and corridor A's lane |
| `W` | labwall | yes | Wall face: the side you see from the floor |
| `V` | labcap | yes | Wall top: the roof edge above a wall face |
| `v` | vent | no | Floor grate. Reinforcements climb out of these |
| `i` | pipe | yes | Pipe runs in the power room |
| `G` | glass | yes | The observation window. See-through |
| `c` | cage | yes | Animal cages |
| `L` `B` `C` `N` | locker, bench, cabinet, shelf | yes | Furniture and cover |
| `q` `D` `x` `U` | cable, drain, stain, vines | no | Floor dressing |
| `M` | mass | yes | Growth swelling out of a wall |
| `a` `e` | tilegreen, carpet | no | Animal lab and records wing floors |
| `Y` | wallsign | yes | A wall face with a sign |
| `E` | plate | no | Under every hazard, and only there |

Outdoor tiles in the dock: `g` gravel, `=` road, `_` road line, `X` lab fence, `l` lamp, `T` pine.

## Beats

World triggers them. Story writes the scripts. Ids are fixed.

| Beat | Where | Script id | What happens |
|---|---|---|---|
| `start` | dock | `l2_start` | Safe start. `lights_dock` is the first save point |
| `agents1` | corridor A entrance | `l2_agents` | The agent, the lockers and the two cameras |
| `cam1_spotted`, `cam2_spotted`, `cam3_spotted` | event `spotted` on `cam1`, `cam2`, `cam3` | `l2_spotted` | `alarm`, `wake` `reinf1`, `reinf2` or `reinf3`, then the script (it plays once) |
| `burn_hint` | power room, in front of `sensor1` | `l2_burn_hint` | Arrival beat of the BURN puzzle |
| `door1_open` | event `targetHit` on `sensor1` | `l2_burn_done` | `open` `door1`, then the script |
| `cages` | animal lab, just inside `door1` | `l2_cages` | Script, then `wake` `rats1` |
| `scare` | observation corridor, east end | `l2_scare` | `scare` step, then the script. A dark shape crosses behind the glass. No fight |
| `relay_hint` | after `scare` | `l2_shoot_hint` | Arrival beat of the SHOOT puzzle |
| `door2_open` | event `targetHit` on `relay1` | `l2_relay_done` | `open` `door2`, then the script. `lights_hall` is the second save point, just past `door2` |
| `guards` | storage hall, past `door2` | `l2_guards` | Needs `door2_open`. The shield lesson |
| `crate_hint` | storage hall east end, after `door2_open` | `l2_push_hint` | Arrival beat of the PUSH puzzle |
| `crate_cleared` | event `propCleared` on `crate1` | `l2_crate_cleared` | Script only. `lights_records` is the third save point, just past it |
| `lockdown` | records wing | `l2_lockdown_start` | `alarm` step, then the script, then `waves` |
| `warden` | cleared `lock2` | `l2_warden` | Script. The waves wake `lock3`, the Warden |
| `level_clear` | cleared `lock3` | `l2_lockdown_clear`, then `l2_clear` | `finish` |

Scripts Story writes: `l2_start`, `l2_agents`, `l2_spotted`, `l2_burn_hint`, `l2_burn_done`, `l2_cages`, `l2_scare`, `l2_shoot_hint`, `l2_relay_done`, `l2_guards`, `l2_push_hint`, `l2_crate_cleared`, `l2_lockdown_start`, `l2_warden`, `l2_lockdown_clear`, `l2_clear`. The last one points at the school (stage 1.3).

## Puzzles

Listed in `puzzles` in `stage12.ts`, in this order. Gate order on the route is fixed: `door1`, then `door2`, then `crate1`. Cameras are a choice, not a puzzle: no hint points at one.

| Id | Beat | Prop | Hero |
|---|---|---|---|
| `burn` | `burn_hint` | `sensor1` | dustin |
| `relay` | `relay_hint` | `relay1` | lucas |
| `crate` | `crate_hint` | `crate1` | eleven |

- `sensor1`: prop `console`, `hitBy: 'burn'`, in the power room's north wall face beside `door1`. Dustin lights it from one to three tiles below. Only Dustin lights it.
- `relay1`: prop `console`, `hitBy: 'shoot'`, in the back wall of the sealed chamber behind the `G` glass, straight north of corridor tiles within Lucas's range, and on clean diagonals too. The chamber has no walkable way in.
- `crate1`: prop `crate`, `pushBy: 'push'`, 16 by 48, filling the crate corridor. Only Eleven clears it, from the tile west of it.
- `door1`, `door2`: prop `door`, 32 by 16, filling two-tile doorways. Start closed and solid. Opened by the `open` step.
- Hints: a `PuzzleDef` carries an id, its arrival beat, its prop, the hero who solves it and the door it opens (`blocks`: `door1` for the burn puzzle, `door2` for the relay). With the story skipped there is no dialogue. The moment someone swings at or pushes against one of those doors, the sensor, the relay or the crate with the wrong hero, the yellow caret bobs over the puzzle's prop (over the door they tried, if the prop is out of view), a subtitle names the hero (MAYBE DUSTIN SHOULD TRY HIS HAIRSPRAY, MAYBE LUCAS SHOULD TRY HIS SLINGSHOT, MAYBE ELEVEN SHOULD TRY HER SHOVE) and the right hero's HUD slot pulses. A party that tries nothing gets the same after 5 seconds near the puzzle (see `docs/level-1.md`, "Puzzle hints", which is the rule for every level). With the story on, the `l2_*` hint scripts name the hero and the key.

## Hazards and cameras

Eleven hazards, each on `plate` tiles (see "Second pass" for the rules):

| Id | Kind | Where | Cycle (on of period) | Damage |
|---|---|---|---|---|
| `arc1` | electric | power room, across the way in | 36 of 180 | 14 |
| `arc2` | electric | power room, in front of `door1` and the sensor | 36 of 180, half a cycle after `arc1` | 14 |
| `drain1` | steam | animal lab hall, between `door1` and the cage gap | 36 of 200 | 9 |
| `steam1`, `steam2` | steam | observation corridor, two grates wall to wall | 50 of 200, half a cycle apart | 9 |
| `steam3` | steam | storage hall, the south cross aisle | 36 of 180 | 9 |
| `arc3`, `arc4`, `arc7` | electric | records wing: both ends of the middle aisle and the doorway | 45 of 150, out of step | 24 |
| `arc5`, `arc6` | electric | records wing: by the far wall and in the Warden's corner | 45 of 150, out of step | 20 |

The wing's panels hit hardest: the growth has cracked the main feed. They are the lockdown's teeth. The two in the Warden's end are a little softer, so the long fight there is hard but not a coin toss.

Three cameras, each `hitBy: 'shoot'` and tied to a reinforcement group that waits in a vent:

| Camera | Wall | Sweep (degrees) | Period, range, half | Calls |
|---|---|---|---|---|
| `cam1` | corridor A north wall, west | 40 to 140 | 300 frames, 96 px, 28 | `reinf1`, an elite rat from the corridor's floor vent |
| `cam2` | corridor A north wall, east | 140 to 40 | 300 frames, 96 px, 28 | `reinf2`, an elite agent from the power room vent |
| `cam3` | observation corridor south wall | 215 to 325 | 260 frames, 96 px, 30 | `reinf3`, an elite agent from the server room vent |

Five steps out along a diagonal is past every camera's reach and inside Lucas's, so each can be shot from a tile it never sees.

## Spawns and the XP budget

| Group | Enemies | Notes |
|---|---|---|
| `agents1` | 2 agents | patrol corridor A under the cameras |
| `reinf1` | elite rat | dormant in corridor A's vent, woken by `cam1` |
| `power` | agent | patrols the power room between the generators |
| `reinf2` | elite agent | dormant in the power room vent, woken by `cam2` |
| `rats1` | 6 rats | dormant by the cages, woken at `cages` |
| `labguard` | guard | patrols the animal lab's lower hall, in sight of the way in from `door1` |
| `obs` | agent | patrols the observation corridor's west end |
| `reinf3` | elite agent | dormant in the server room vent, woken by `cam3` |
| `guards1` | 2 guards | awake in the storage hall's open east end, facing west at the way in |
| `stor` | agent | patrols the storage hall behind the guards |
| `lock1` | 3 rats, agent | dormant, the wing's vents |
| `lock2` | guard, elite guard, elite agent | dormant: a guard at the party's back in the vestibule, the elite guard and the agent at the far end |
| `lock3` | Warden, elite agent | dormant, the Warden at the far end, the agent behind the party |

That is 36 enemies: five guards (one elite), five elite agents, one Warden, eight agents, ten rats and one elite rat. XP: guard 24, elite guard 48, elite agent 16, Warden 60, agent 8, rat 4, elite rat 8, so the roster is worth 360 XP. The stage's `xpMult` of 0.4 makes that 146, for the campaign's pace (`docs/pace.md`), and a test keeps it between 130 and 160. `waves` is `['lock1', 'lock2', 'lock3']`, each woken by the previous `groupCleared`. Waves enter from both ends of the wing.

`enemyMult: 1.3`: every enemy in the Lab has 30 percent more HP and hits 30 percent harder than the difficulty setting alone gives. It stacks on kid, chief and upside, and it does not touch hazards. Stage 1.1 leaves it out.

The party arrives with Mike at Lv 3 and the rest at Lv 2. The stage takes Mike to Lv 4 and the others to Lv 3, and nobody reaches Lv 5. At 360 XP it took the lead to Lv 5, a level over the plan's "Lv 4 after chapter 1", until the pace pass (`docs/pace.md`).

Items: four Eggos (corridor A's south-west corner, the tank room, two far corners of the records wing), two Cokes, 12 quarters. Nothing worth a detour lies within the bot's pickup reach of the route on the far side of a shut gate, because the bot walks straight at an Eggo it wants. Props: `lights_dock`, `lights_hall`, `lights_records` (lights), `sensor1`, `relay1` (console), `door1`, `door2` (door), `crate1` (crate), `cam1` to `cam3` (camera), three generators, six tanks, seven racks, the van and five plain crates. Spawn ids are unique across enemies, items, props and npcs. There are no npcs.

## Bot

`waypoints` walk the route in order. The bot opens by flag, so `door1`, `door2` and `crate1` are flagged where it reaches them, `rats1` is woken just inside `door1` and `lock1` at the lockdown trigger. It ignores hazards and cameras, so the cameras always call their groups on it and it takes the hazards it walks or fights over. No waypoint stands on a hazard. The Dustin burn, the Lucas shot, the Eleven push and the camera shots are covered by tests in the real sim, not by the bot.

Measured with `baseline.ts` (see "Measuring"), 20 seeds, defaults for the party (all four at Lv 3):

| Measure | kid | chief | upside |
|---|---|---|---|
| Cleared | 20 of 20 | 16 of 20 | 5 of 20 |
| Average damage taken | 57 | 212 | 361 |
| Average KOs | 0 | 1.3 | 3.3 |
| Average lowest party HP | 86% | 42% | 7% |
| Average time | 86 s | 105 s | 97 s |

Over 60 seeds the bot clears 90% on chief and 25% on upside. The XP it earns is 208 to 224, because a camera it slips past keeps its group asleep.

The bot dodges telegraphed melee almost perfectly and walks straight through hazards, so most of its damage comes from the floor. A human player will take less from the floor and more from the guards and the Warden.

## What Art draws for this level

- The lab and dressing tiles, with variants so the lab doesn't look stamped. They must also survive the night remap, because `tests/night.test.ts` runs every tile name through it.
- Props: `door` (closed, open), `console` (dark, lit), `camera` (turning head, alert, shot), `tank`, `rack`, `generator`. `crate` and `van` art already exist.
- Overlays: `drawHazard` for the panels and grates, `drawCamCone` for the cones. `world/render.ts` draws them after the tiles and before anything that stands on the floor.
- Optional: a dithered red border pulse for the klaxon, off under reduce-flashing.

## What Audio makes for this level

- Track `lab`: E minor, 104 bpm, 32 bars, base and combat layers. Every fourth bar is 7/8 (14 sixteenth steps), via an optional `Track.barSteps`. Industrial pulse and a klaxon figure.
- Effects `klaxon` (the `alarm` step), `zap`, `steam`, `spotted`, `block`, `bash` and `slam`.

# Second pass: the hard Lab

The first pass played too easy and looked plain. Measured with the bot on chief over 20 seeds (script: `node scripts/measure-stage.ts 1.2 chief 20`, see "Measuring"), the Lab was cleared 20 of 20 times with 13 damage taken in total out of about 204 party HP, no KO, and the party never dropped below 91% health. An agent dart does about 3 damage and nothing else threatens anyone. This pass makes the fights dangerous and the rooms worth looking at.

## Targets

| Measure (bot, chief, 20 seeds) | Before | Target |
|---|---|---|
| Cleared | 20 of 20 | 15 to 19 of 20 |
| Average damage taken | 13 | 110 to 260 |
| Average KOs | 0 | 0.5 to 2.5 |
| Average lowest party HP | 95% | under 45% |
| Average time | 53 s | 90 to 150 s |
| Stage XP | 124 | 190 to 225 (the lead must stay under Lv 5, which needs 239 XP more than the 144 he arrives with) |

On kid the bot should clear at least 18 of 20. On upside it may lose often, but it must still clear some (at least 4 of 20).

## New enemies

Numbers are starting points. Tune inside the bands in "Targets", not by editing the targets.

| Enemy | HP | ATK | DEF | Speed | XP | Notes |
|---|---|---|---|---|---|---|
| Riot guard (`guard`) | 70 | 17 | 8 | 0.7 | 24 | Shield and baton. Melee only |
| Warden (`warden`) | 260 | 20 | 9 | 0.65 | 60 | Mini-boss. Bigger shield, a ground slam, a boss bar |
| Elite (any kind, `tier: 'elite'`) | HP x1.9 | ATK x1.6 | same | x1.1 | x2 | Tougher and meaner, shorter cooldowns (x0.75), double quarter drop chance |

**Shield rule (guard and warden).** An enemy is `guarding` unless it is in `recover`, staggered by a break, or stunned. A hit that lands from inside its front arc (guard 75 degrees either side of its facing, warden 90) does 20 percent damage (25 percent for the warden), never below 1, plays `block`, and shows BLOCK over the target. A hit from the flank or back does full damage. Burn ticks ignore the shield. A hit with knockback of 3.2 or more (Eleven's Push, Mind Blast) breaks the guard for 45 frames. So the counters are: walk around it, burn it, shove it, or hit it while it recovers. A guard always turns to face the active hero while chasing, but turns slowly (a facing change takes 12 frames), so circling works.

**Guard attack.** It walks at the hero holding the shield forward. Inside 26 px it winds up for 30 frames under a red "!", then bashes the arc in front of it for power 1.0, knockback 4.2, plays `bash`, and recovers for 36 frames with the shield down. Cooldown 110 frames from the start of the wind-up. It does not fire darts.

**Warden attack.** The same bash (wind-up 34), plus a slam: every third attack, or every second below half HP, it winds up for 45 frames with a growing `ring` fx as the telegraph, then a 46 px shockwave all around it for power 1.3, knockback 5, plays `slam`, and recovers for 60 frames with the shield down. While any warden is awake and alive, `hud.boss` is `{ name: 'WARDEN', hp, hpMax }`.

**Elite look.** `ActorView.elite` is true. gfx draws red trim and a wider HP bar. `ActorView.guarding` shows the shield up or dropped.

**Existing enemies stay as they are.** The rat and the Lab agent keep every number they have, so stage 1.1, the course tests and the balance tests don't move.

## Hazards

`StageData.hazards` is a list of `HazardDef` (see `src/core/types.ts`). The sim owns the cycle: a hazard is on for `on` frames out of every `period`, offset by `phase`, and shows a warning for the 24 frames before it goes on. A hero standing in the rectangle while it is on takes `dmg` straight (not reduced by DEF, scaled by difficulty), is thrown away from the center, and gets the usual 45 frames of invulnerability. Enemies and the bot ignore hazards. `view().hazards` reports each one's state. Sounds: `zap` when an electric panel goes on, `steam` when a vent goes on.

- **electric:** arcing panels, `dmg` about 14, on 36 of every 150 frames.
- **steam:** a venting grate, `dmg` about 9, on 60 of every 200 frames.

## Cameras

A prop of kind `camera` with a `cam` (`CamDef`) sweeps between two headings. Its heading follows a smooth there-and-back curve over `period` frames. If the active hero is inside the cone (within `range`, within `half` degrees of the heading) with a clear line (no solid tile or solid prop between), the camera goes `alert` for 120 frames, emits `{ t: 'spotted', propId }` once, plays `spotted`, then returns to `closed`. Shooting it (`hitBy: 'shoot'`) lights it and it never spots again. The camera is not solid. Its `PropView.cam` gives the live cone so gfx can draw it.

A beat uses it: `{ id: 'cam1_spotted', when: { event: 'spotted', prop: 'cam1' }, steps: [{ t: 'alarm' }, { t: 'wake', group: 'reinf1' }] }`. So a camera is a stealth check: shoot it, dodge its sweep, or pay with reinforcements.

## Look

Each room has its own floor and furniture. New tiles are in `src/core/tiles.ts` (13: locker `L`, bench `B`, cabinet `C`, shelf `N`, cable `q`, drain `D`, stain `x`, vines `U`, mass `M`, tilegreen `a`, carpet `e`, wallsign `Y`, plate `E`). New animated props: `tank` (green fluid, rising bubbles), `rack` (blinking LEDs), `generator` (hum and sparks), `camera` (turning head). All three furniture props are solid. The Upside Down is leaking into the Lab: vines and mass tiles creep in through the cracks, thicker toward the records wing, as a foreshadow of the school.

| Room | Floor | Dressing |
|---|---|---|
| Loading dock | gravel, road | lamps, the van, crates, stains |
| Corridor A (checkpoint) | `labfloor`, hazard lane stripes | lockers along both walls, two cameras |
| Power room | `plate` and `cable` | generators, pipes, electric panels, sensor1 |
| Animal lab | `tilegreen`, `drain` | cages, tanks, vines and mass on the far wall, stains |
| Observation corridor | `labfloor2` | the long glass window, steam vents, a camera |
| Storage hall | `labfloor` with `stain` | shelves forming lanes, crates, two guards |
| Server room (side room, items) | `labfloor2`, `cable` | racks, benches |
| Records wing | `carpet` | cabinets as cover, wall signs, vines and mass cracking the walls, the Warden |

## Encounters

Compositions are the World pass's call, inside these rules:

- At least 3 guards, 4 elite agents and 1 warden. The warden is the last wave of the lockdown, with company.
- A guard patrol is never the first thing the party meets. Corridor A is agents, elites later.
- Every room that has enemies also has cover or a flank route.
- At least one camera is on the main route, and shooting it is possible from a safe spot.
- At least two hazard rectangles cross the main route, timed so a careful player crosses without damage.
- Reinforcement groups woken by cameras (`reinf1`, ...) are dormant and enter from a door or a vent.
- Stage XP lands between 130 and 160 once the stage's `xpMult` is applied (see "Spawns and the XP budget" above and `docs/pace.md`). The second pass had 330 to 390, the first draft 190 to 225.

## Measuring

`scripts/measure-stage.ts` plays a stage with the bot for N seeds and prints a table like the one above: `node scripts/measure-stage.ts 1.2 chief 20`. Add `--careless` for the bot that never dodges, and `--no-hazards` to see the enemies on their own. A tuning loop is: change numbers, rerun, compare. The headless tests assert the results loosely (a clear rate, a damage floor), never exactly.

## Result

Measured with `scripts/measure-stage.ts` over 20 seeds on chief (100 seeds for the stuck check). Before this pass the careful bot took 13 damage. "Careless" is the bot with `careless: true`: it never sidesteps a dart, a slam or a bash and never circles a shielded guard, so it is a floor for a player who is not watching the telegraphs.

| | Careful bot | Careless bot |
|---|---|---|
| Chief: cleared | 20 of 20 | 20 of 20 |
| Chief: average damage taken | 237 | 292 |
| Chief: average KOs | 0.5 | 0.65 |
| Chief: average lowest party HP | 47% | 35% |
| Chief: average time | 125 s | 100 s |
| Kid: cleared, damage | 20 of 20, 135 | |
| Upside: cleared, damage, KOs | 11 of 20, 400, 2.35 | |
| Chief, 100 seeds: stuck or wiped | 0 | |

Three findings shaped the numbers:

- **The bot hides the difficulty.** Hazards were about 75 percent of its damage on the first draft, because it walks straight through them, and it dodges telegraphed melee almost perfectly (a guard landed about one bash a run). So the careful bot is the best case. The careless bot is the better guide to how it feels.
- **More enemies did not make it harder by themselves.** Adding fourteen mostly weak enemies made the careful bot's run easier (72 damage with no hazards, down from 93), because the extra XP levelled the party. The stage factor `enemyMult` is what made the enemies themselves dangerous, and the elite guard in the finale makes the climax the sharpest fight.
- **The bot had two stalls**, both loops and not level traps: it flipped between "get the Coke" and "follow the route" at a pickup's reach edge, and between "fight the idle agent behind the wall" and "follow the route" at the engage radius. `combat/bot.ts` now commits to a pickup (and skips one behind a wall or one it gets pinned on) and ignores an idle enemy it cannot see.

## After the pace pass

The Lab pays 146 XP now, not 360, and a `?stage=1.2` jump starts Mike at Lv 3 and the rest at Lv 2, as a run out of 1.1 does (`docs/pace.md`). The factor is still 1.3. Measured again with `node scripts/measure-stage.ts 1.2`:

| | Chief, 20 seeds | Chief, 100 seeds | Careless, chief | Kid | Upside |
|---|---|---|---|---|---|
| Cleared | 19 | 97, none stuck | 16 of 20 (78 of 100) | 20 | 6 (46 of 100) |
| Damage taken | 237 | 234 | 318 | 145 | 398 |
| KOs | 0.55 | 0.57 | 1.90 | 0.10 | 3.25 |
| Lowest party HP | 44% | 45% | 17% | 62% | 7% |
| Time | 125 s | 125 s | 101 s | 106 s | 135 s |

The careful bot is where it was. The careless one clears less (78 of 100, it was 20 of 20): the bench walks in a level lower, and the stage no longer takes the party to Lv 5 on the way.

