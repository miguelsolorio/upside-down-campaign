# Level 14 spec: stage 5.1, Hawkins under lockdown

One stage, five to eight minutes, the start of chapter 5 (`docs/chapter-5.md`). Hawkins is under the army's lockdown. Hopper rejoins the party and leads it from the town square into the Lab, which the army holds, and through the loading bay where the Commander waits. Every call here is the lead's, made under the owner's standing instruction. Ids are fixed once the spine lands. Tile characters are picked at spine time, after chapter 4's tiles are in `src/core/tiles.ts`, so the two passes never take the same letter.

## Shape

- Map: about 50 by 40 tiles in `src/world/stages/stage51.ts`, with spawns in `stage51_data.ts`. The outer ring is solid.
- Route, one main path with side pockets for items:
  - Main Street at curfew (start, south-west): sandbag walls, a parked truck, a curfew sign
  - the checkpoint, going east: a booth, a boom gate (`boom1`, Steve smashes it), floodlight towers
  - the town square, going north, with red rifts in the asphalt where demobats come out (once chapter 4's demobat is in; troopers until then)
  - the Lab's front gate, then its army-held halls (the 1.2 Lab tiles, army-dressed)
  - the loading bay (end, north-east), an arena about 20 by 14, with `door1` across its doorway
- Light: `time: 'night'` (dusk going to night): pools under the floodlight cones (`floodlightConeArt`) and the lights props, and the rifts' red glow.
- Music: `lab` from the start, then `clock` at the `commander` beat.
- Party: picked on the map from everyone met (no Eddie), with Hopper locked in (`REQUIRED`). Hopper rejoins with his end-of-4.1 seed, raised to the join level if that's higher.
- Tile characters, taken at spine time from the Latin-1 signs chapter 4 left free (`src/core/tiles.ts`). The walkable ones: `¡` `lockroad`, `¥` `lockline`, `©` `lockstop`, `¬` `lockwalk`, `®` `locklawn`, `¹` `»` `¼` `rift0` `rift1` `rift2` (three tiles that join, laid side by side), `½` `armyfloor`, `¾` `armycable`, `¿` `armycable2`. The solid ones, `LOCKDOWN_SOLID`: `²` `lockroof`, `³` `lockhouse`, `µ` `lockvine`, `¶` `lockdoor`, `ª` `armycrate`, `«` `armycrate2`, `´` `armywall`. A Lab wall is the plain `labcap` row `V` over `armywall`; the rifts, the road and the house fronts read their neighbors as the town's own names (`CORE` in `src/gfx/ch5/lockdown_tiles.ts`), so a rift sits in a lane of `¡`. The stub in `stage51.ts` uses every one of them.
- `enemyMult` and `xpMult`: set in "Result" by measurement, on HARD (`chief`).

## Rooms

| Room | What happens |
|---|---|
| Main Street | Start, `lights_street`, a short Hopper line. Two troopers on patrol |
| Checkpoint | `boom1` (smash). A trooper squad behind the sandbags, and the floodlight on a timer that lights the party up and calls them |
| Town square | Rifts. Troopers and Lab agents, plus demobats once chapter 4 has them. `lights_square` |
| Lab halls | Lab agents in hazmat at chapter 5 numbers. `crate1` (Eleven pushes) blocks a cache. `lights_lab`, the save point for the fight |
| Loading bay | `door1` closes behind the party. The Commander |

## Puzzles

- `boom1`: a `crack`-style smash gate, Steve (and Hopper's slam opens it too, so the locked lead can always pass).
- `crate1`: an Eleven push on the cache, never on the route.
- A puzzle never waits on a hero who might be benched: the route's only gate opens to Hopper, who is locked in.

## Foes (Sim)

- **Trooper** (`trooper`): rifle and riot shield. Shots and melee from the front within 60 degrees bounce off the shield (a clang, no damage). A three-round burst from range, then walks round to flank. Hits from behind or the side land in full, and a smash breaks the shield for good.
- **Lab agent** (`agent5`): the 1.2 agent's kit as its own kind, with chapter 5 numbers.
- **The Commander** (`commander`), mini-boss, with a boss bar:
  - He walks at the active hero with the shield up, front-blocking like the trooper.
  - Every 8 s he plants the shield, whistles (the `whistle` sfx), and calls a squad of three troopers (run-time spawns, `squad`, at most three alive).
  - At 50% HP the shield cracks (the `cracked` art). He then charges in straight lines and stuns himself on walls for 2 s, like the Demogorgon.
  - Counter: hit his back or side, and smash the shield.
  - At 0 HP: `finish`.
- The bot learns to flank troopers: step to their side before attacking, and dash or swap behind.

## Spawns and the XP budget

| Group | Enemies |
|---|---|
| `street` | 2 troopers |
| `checkpoint` | 3 troopers, dormant until `checkpoint` |
| `square` | 2 troopers, 2 Lab agents (and 3 demobats when they exist) |
| `lab` | 4 Lab agents |
| `boss` | the Commander, dormant |
| `squad` | run-time troopers, called by the Commander |

Count the XP before `xpMult` between 300 and 360, enforced by a test. `xpMult` then makes the lead's Lv 10 into chapter 5 head for Lv 11 by the end of 5.2 (`docs/pace.md`).

Items: three Eggos, three Cokes, 12 quarters. Lights: `lights_street`, `lights_square`, `lights_lab`.

## Beats

- `start`: the CHAPTER FIVE card on the first visit (`opensChapter`), then a short Hopper line.
- `checkpoint`: entering the checkpoint wakes its squad.
- `commander`: crossing into the loading bay closes `door1`, wakes the Commander and switches to `clock`.
- `level_clear`: on the Commander's death.
- Dialogue scripts `l14_*` in `src/story/scripts_l14.ts`, off by default like the rest.

## Targets

Measured on HARD (`chief`) over 20 seeds with the party a real run brings: 15 to 19 clears, the careless bot at least 12, 150 to 320 damage, and under 45% lowest HP. A 100-seed run shows nothing stuck.

## What Art does

Register the painters already drawn in `src/gfx/ch5/`: `lockdownGround` and `lockdownObject` for the tiles (with `LOCKDOWN_TILES` and `LOCKDOWN_SOLID`), the props in `lockdown_props.ts`, and `trooperPx` and `commanderPx` for the foes. Map the sim's poses to their pose names. Add a 5.1 sheet page and the LOCKDOWN plate on the map.

## What Audio makes

Add `whistle` (the Commander's call), `clang` (a blocked hit on a shield) and `shieldBreak`. The tracks are the existing `lab` and `clock`.

## What UI builds

Nothing new beyond the CHAPTER FIVE card's text and the boss bar's name, THE COMMANDER.

## Result

Built in `src/world/stages/stage51.ts` (the map, beats, puzzles, bot route) and `stage51_data.ts` (spawns, items, props, lights), with the words in `src/story/scripts_l14.ts`. The tests are `tests/stage51.test.ts` (map, budget, gates, reachability, route), `stage51-story.test.ts` (beats, director, scripts) and `stage51-play.test.ts` (whole bot runs, a retry from each string, the play scene).

**The map** is 50 by 40. Main Street runs along the south-west (house fronts with taped doors and vines, a truck, sandbags, a curfew sign, a floodlight tower) to the checkpoint, where roofs shut the sidewalks and the lawn either side of `boom1` (the bot's map knows tiles and cracks, not the army's props, so the gate is the only gap in the tiles). The town square is a field of asphalt with three rifts and an army camp in its south-east corner, with a row of buildings across its middle and a gap five tiles wide at the east end. The gap leads to the forecourt (a fourth rift, two towers, trucks, tents and sandbags) and west along it to the Lab's gate, three wide in a wall two deep. The halls are an S (the south corridor west, the west connector north, the north corridor east), with a store off the north corridor and the cache behind `crate1`. `door1` is the bay's doorway, and the bay is an arena 20 by 14.

**Beats:** `start`, `checkpoint` (wakes its squad, and is boom1's puzzle beat), `square`, `cache_hint` (crate1's puzzle beat), `commander` (shuts `door1`, switches to `clock`, wakes the Commander) and `level_clear` (the Commander's death, opens `door1`). Scripts `l14_start`, `l14_checkpoint`, `l14_square`, `l14_cache_hint`, `l14_commander` and `l14_clear`, Hopper and the narrator only.

**Puzzles:** `boom1` is Steve's (`MAYBE STEVE SHOULD TRY HIS NAIL BAT`), with Hopper's fist as the other way (`MAYBE HOPPER SHOULD THROW A PUNCH`), so the gate is always live; `crate1` is Eleven's (`MAYBE ELEVEN SHOULD TRY HER SHOVE`) and is only ever the cache.

**Roster:** 308 XP before `xpMult` (eight troopers, six Lab agents and the Commander; the squad he calls is run-time, worth 1 XP each). Chapter 4 has not built demobats, so none are in `square` yet: a third trooper stands in for them (with three demobats in the count the budget still has room under 360). When they land, add them to `square` and drop that trooper (`sq_d`) if the sum passes 360. The floodlight on a timer that calls the party at the checkpoint is not built: the towers and their cones are dressing, and the squad wakes on the `checkpoint` beat.

**Tuning**, on HARD (`chief`), with the party a real run brings (Mike 10, Dustin 9, Robin 7, Hopper 7), `enemyMult` 1.6 and `xpMult` 1 (the lead sets it once chapter 4 lands):

| | Careful bot, 20 seeds | Careful, 100 seeds | Careless bot, 20 seeds | Careless, 100 seeds |
|---|---|---|---|---|
| Cleared | 18 | 94 | 12 | 61 |
| Wiped / stuck | 2 / 0 | 6 / 0 | 8 / 0 | 39 / 0 |
| Average damage taken | 583 | 621 | 880 | 879 |
| Average KOs | 1.2 | 1.1 | 2.7 | 3.0 |
| Average lowest party HP | 39% | 39% | 12% | 11% |
| Average time | 150 s | 149 s | 127 s | 127 s |
| The Commander's fight | 38 s (26%) | 37 s (25%) | 29 s | 28 s |

Clears, the careless floor, the lowest HP and "nothing stuck" are in the bands. **Damage is not**: 583 against 150 to 320. The two cannot both hold with this party. The bench heals 2% of its max HP a second (`regen` in `combat/hero.ts`), about 5.5 HP a second for these four over a 150 s run, so a run that dips under 45% has taken 500 damage and more. At `enemyMult` 1.0 the damage is 296 but the careful bot clears every run with a lowest HP of 66% on average; at 1.4 it is 466 with every run cleared and 55%. About a third of the damage is the Commander's fight (a run without him takes 200 less) and the rest the troopers on the street, at the checkpoint and in the square; the Lab agents add almost none. The factor is a cliff: 1.5 clears 100 of 100 (the careless bot 78), 1.55 clears 97 (68), 1.6 clears 94 (61) and 1.65 clears 86 (47).

