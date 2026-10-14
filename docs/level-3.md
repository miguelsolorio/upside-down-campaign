# Level 3 spec: stage 1.3, Hawkins Middle School

One stage, five to eight minutes, and the end of chapter 1. Sim builds the Demogorgon, Art draws the school, World builds the map and its beats, Story writes the words, Audio scores it. Ids below are fixed. Every agent reads this file and `docs/technical-architecture.md`. Types are in `src/core/types.ts` and `src/world/types.ts`, tile chars in `src/core/tiles.ts`.

## Shape

- Map: about 48 by 40 tiles in `src/world/stages/stage13.ts`, spawns in `stage13_data.ts`. The outer ring is solid. Walls are a `schoolcap` row (`K`) over a `schoolwall` row (`J`) facing the room below, like the Lab.
- Route, one main path with side corners for items: the parking lot (start, outdoors, south-west), the main hall going east, the science room, the cafeteria, then the gym (end, north-east), where the Demogorgon comes through the wall.
- Light: `time: 'night'`. The lot's lamps and the school's lit windows get pools. Inside, the halls are dark tiles with pools at the lights props and a few `lights` entries (a vending glow, an exit sign).
- Music: `upside` until the boss wakes, then the `music` step switches to `clock`.
- Party: Mike (active), Dustin, Lucas, Eleven, carried from 1.2. `?stage=1.3` starts them at Lv 5, 4, 4, 4 (`defaultParty` in `core/campaign.ts`).
- `enemyMult: 1.2`. Dialogue is off by default; gate hints work as in every level (see `docs/level-1.md`, "Puzzle hints").

## Rooms

| Room | Floor | Dressing | What happens |
|---|---|---|---|
| Parking lot | `road`, `roadline`, `gravel` | lamps, the agents' vans, a bike rack (`bike` props), pines, `brick` facade with lit windows | Start and `lights_lot`. Two agents by the vans. `van1` blocks the side door |
| Main hall | `schoolfloor` | `lockerwall` both sides, the `trophy` case, classroom doors, a vending glow | `lights_hall`. Two agents and an elite agent hunting Eleven |
| Science room | `schoolfloor` | `desk` rows, a `chalkboard`, lab `bench`es, `vines` and `mass` growing out of the sink corner | One agent. `vines1` blocks the back door |
| Cafeteria | `checker` | `table` rows, the serving `counter`, `firebox1` on the wall behind it | Six rats wake. The scare: a shape crosses behind the counter. `door1` (fire door) to the gym corridor |
| Gym | `gymfloor` | `bleachers` along the north wall, `mass` where the wall splits | `lights_gym` at the doors, then the arena: an open court about 18 by 12 tiles, walls all round |

The Upside Down thickens toward the gym: none in the lot, a little in the science room, more in the cafeteria, the most in the gym.

## Beats

World triggers them. Story writes the scripts.

| Beat | Where | Script id | What happens |
|---|---|---|---|
| `start` | lot | `l3_start` | Safe start. `lights_lot` is the first save point |
| `van_hint` | in front of `van1` | `l3_van_hint` | Arrival beat of the PUSH puzzle |
| `van_cleared` | event `propCleared` on `van1` | `l3_van_done` | Eleven flips the van off the side door |
| `agents` | hall entrance | `l3_agents` | The hall patrol |
| `vines_hint` | science room, before `vines1` | `l3_vines_hint` | Arrival beat of the BURN puzzle |
| `vines_cleared` | event `propCleared` on `vines1` | `l3_vines_done` | Script only |
| `cafeteria` | cafeteria doorway | `l3_cafeteria` | Script, then `wake` `rats1` |
| `scare` | cafeteria, mid-room | `l3_scare` | `scare` step, then the script. No fight |
| `firebox_hint` | after `scare` | `l3_firebox_hint` | Arrival beat of the SHOOT puzzle |
| `door1_open` | event `targetHit` on `firebox1` | `l3_firebox_done` | `open` `door1`, then the script |
| `gym` | gym doors | `l3_gym` | `lights_gym` is the third save point |
| `demogorgon` | arena rect, needs `gym` | `l3_demogorgon` | `music` `clock`, the script, `wake` `boss` |
| `pinned` | event `pinned` on spawn `demo` | `l3_pinned` | Arrival beat of the finisher |
| `level_clear` | cleared `boss` | `l3_clear` | `finish`. Eleven is gone with it |

Scripts: `l3_start`, `l3_van_hint`, `l3_van_done`, `l3_agents`, `l3_vines_hint`, `l3_vines_done`, `l3_cafeteria`, `l3_scare`, `l3_firebox_hint`, `l3_firebox_done`, `l3_gym`, `l3_demogorgon`, `l3_pinned`, `l3_clear`. In `l3_clear` Eleven destroys the Demogorgon and both are gone, as the season ends. Chapter 2 starts without her.

## Puzzles

Listed in `puzzles` in `stage13.ts`, in this order.

| Id | Beat | Prop | Hero | Hint |
|---|---|---|---|---|
| `van` | `van_hint` | `van1` | eleven | MAYBE ELEVEN SHOULD TRY HER SHOVE |
| `vines` | `vines_hint` | `vines1` | dustin | MAYBE DUSTIN SHOULD TRY HIS HAIRSPRAY |
| `firebox` | `firebox_hint` | `firebox1` (blocks `door1`) | lucas | MAYBE LUCAS SHOULD TRY HIS SLINGSHOT |
| `finish` | `pinned` | `demo`, `enemy: true` | eleven | MAYBE ELEVEN SHOULD TRY HER MIND BLAST |

- `van1`: prop `van`, `pushBy: 'push'`, 32 by 16, across the side door. Eleven's Push clears it (`propCleared`), and gfx draws it tipped on its side. Same rule as the 1.2 crate.
- `vines1`: prop `vines`, `hitBy: 'burn'`, 32 by 16, across the science room's back door. Dustin's Farrah spray burns it away: `sizzle`, a burn fx, then `propCleared`, open and not solid. Other hits are `poked`.
- `firebox1`: prop `firebox`, `hitBy: 'shoot'`, on the wall face behind the counter, which is solid, so only a shot over it reaches. Lit means solved (`targetHit`), like the 1.2 relay.
- `door1`: prop `door`, 32 by 16, the fire door. Opened by the `open` step.
- `finish`: the hint targets an enemy. The caret follows spawn `demo` while it is pinned, and its death solves the puzzle. A hit on the pinned boss by anything but Eleven's Mind Blast is a `poked` with `propId: 'demo'`.

## Demogorgon

`EnemyKind` `demogorgon`, in `src/enemies/demogorgon.ts`. One spawn, id `demo`, group `boss`, dormant until the `demogorgon` beat. Numbers are starting points. Tune them inside "Targets", not the targets themselves.

| HP | ATK | DEF | Walk | XP |
|---|---|---|---|---|
| 520 | 22 | 6 | 0.8 | 60 |

- **Stalk.** It walks at the hero and swipes at close range: a 30 frame wind-up under the red "!", an arc in front of it (reach 30, power 1.0, knockback 4), `chomp`.
- **Charge.** Every 150 frames or so it plants and winds up for 36 frames (pose `charge`, `lunge` at the end), aiming at where the hero stands when the wind-up ends. Then it runs straight at 4.2 px a frame until it hits a solid tile. A hero in the way takes power 1.2 and knockback 5, but the charge doesn't stop. Hitting the wall plays `thud`, shakes the screen, and stuns it for 150 frames (pose `stun`), during which it takes 50 percent more damage. The arena is small enough that every charge ends in a wall.
- **Petals, at 60 percent HP.** One time only: `roar` and `petals`, and `ActorView.petals` turns true. From then on it spits as well (pose `spit`): three globs in a fan at the hero. Each one shows a `mark` where it will land, lands 40 frames later, and splashes 14 px around (power 0.8, `acid`).
- **Leap, at 30 percent HP.** It crouches for 30 frames, then leaps (pose `leap`, `z` rises and falls) onto the hero's spot. A `mark` fx grows there for the 45 frames it's in the air. Landing is a 40 px shockwave (power 1.3, knockback 5), followed by 50 frames of recovery.
- **Three stuns.** Its HP can't drop below 1 until it has been stunned three times. Once it has been, and its HP reaches 0, it's pinned:
  - pose `pinned`
  - no more attacks
  - no damage from anything except Eleven's Mind Blast beam
  - the sim emits `{ t: 'pinned', spawnId: 'demo' }` once
  - the Mind Blast kills it, with a normal `kill` event and `groupCleared`
- **Boss bar.** While it's awake, `hud.boss` is `{ name: 'DEMOGORGON', hp, hpMax }`.
- **Bot.** It sidesteps the charge line during the wind-up, steps off a `mark`, and when the boss is pinned it swaps to Eleven and casts Mind Blast at it. No flag shortcut for the finisher.

## Spawns and the XP budget

| Group | Enemies | Notes |
|---|---|---|
| `lot` | 2 agents | by the vans, patrol |
| `agents1` | 2 agents, elite agent | the main hall |
| `sci` | agent | the science room |
| `rats1` | 6 rats | dormant behind the counter, woken at `cafeteria` |
| `boss` | Demogorgon `demo` | dormant in the gym |

That's 5 agents (40), an elite agent (16), six rats (24) and the boss (60): 140 XP. A test keeps it between 120 and 150. The lead arrives at Lv 5 with about 504 XP and must stay under Lv 6 (660). Items: three Eggos (one in a gym corner before the arena), two Cokes, 10 quarters. Props:
- lights: `lights_lot`, `lights_hall`, `lights_gym`
- gates: `van1`, `vines1`, `firebox1`, `door1`
- dressing: a second van, two bikes

Spawn ids are unique across enemies, items and props.

## Targets

These are measured with `node scripts/measure-stage.ts 1.3 chief 20`.

| Measure | Target |
|---|---|
| Cleared, chief | 15 to 19 of 20 (careless bot at least 12) |
| Average damage taken, chief | 150 to 300 |
| Average KOs, chief | 0.5 to 2.5 |
| Average lowest party HP, chief | under 45% |
| Average time | 90 to 150 s, the boss about half of it |
| Kid / upside | at least 18 of 20 / at least 4 of 20 |
| 100 seeds, chief | none stuck |

## Bot

`waypoints` walk the route. The bot opens `van1`, `vines1` and `door1` by flag where it reaches them, and wakes `rats1` at the cafeteria. The last waypoint is inside the `demogorgon` trigger. From there the fight is real, finisher included.

## What Art draws for this level

- The 13 school tiles in `core/tiles.ts` (`schoolfloor` to `brick`), with variants so the halls don't look stamped. They must survive the night remap (`tests/night.test.ts` runs every tile name through it). The placeholders in `gfx/tile_objects.ts` (`PLACEHOLDER`) go once each tile is painted.
- Props:
  - `firebox`: dark and lit
  - `vines`: thick, burning, then gone
  - `van`: tipped on its side when `open`
- The Demogorgon is bigger than a 16 by 16 cell (about 24 by 32): walk in four directions, `charge`, `stun` (dazed, head lolling), `spit` and `leap` (crouched, airborne), `pinned`, each with the petals shut and open. Elite trim doesn't apply. The boss bar already exists in the HUD.
- FX:
  - `acid`: a green glob in flight and a splash
  - `mark`: a dark ring on the floor that grows over its life
- A `?sheet=1` page for the school and the Demogorgon.

## What Audio makes for this level

- `upside`: D Phrygian, 66 bpm, the title motif inverted (`invert(motif, axis, scale)`), two detuned pulses, noise wind. Base and combat layers. 2.2 reuses it later.
- `clock`: G minor, 150 bpm, a low bell on the first beat of every fourth bar, sixteenths, the motif inverted. Base and combat layers. It's the boss track for every boss.
- Effects: `roar`, `acid`, `lunge`, `petals`, `chomp`, `thud`, `sizzle` (the stand-ins in `audio/sfx.ts` go).
