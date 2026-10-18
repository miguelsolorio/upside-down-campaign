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

To be filled by the build.
