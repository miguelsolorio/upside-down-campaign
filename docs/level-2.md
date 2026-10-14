# Level 2 spec: stage 1.2, Hawkins Lab

One stage, five to eight minutes. World builds it, Story writes the words, Art draws the lab, Audio scores it. Ids below are fixed. Every agent reads this file and `docs/technical-architecture.md`, and nothing else is shared.

## Shape

- Map: 48 by 40 tiles as ASCII rows using the legend in `src/core/tiles.ts`. The outer ring is solid.
- Route: a snake like stage 1.1. Loading dock (start, south-west), corridor A, the power room, the animal lab, the observation corridor, the storage hall, the records wing (end, north-east). One main path with side rooms for items.
- Light: `time: 'day'`. There is no darkness and no glow pool. The lab gets its look from its own tiles, drawn in cold greys, teal and bone. The loading dock may use outdoor tiles (gravel, road, lab fence, lamp) so the level begins outside and goes in.
- Music: `lab`. The combat layer fades in while `sim.aggro()` is true.
- Party: Mike (active), Dustin, Lucas, Eleven. They arrive from stage 1.1 with levels, XP and d20 bonus carried. There is no recruit and no `eleven` npc. A jump straight to the stage (`?stage=1.2`) starts all four at Lv 3.
- Dialogue is off by default. A stuck player gets the 30 second highlight and nothing else. The scripts below are for players who turn story on.

## Tiles

Nine new tiles. Floors and the vent are walkable. Everything else is solid. Glass is solid but see-through: hero shots fly over terrain, so a relay behind glass can be hit.

| Char | Tile | Solid | Use |
|---|---|---|---|
| `o` | labfloor | no | Main floor. Pale, with a faint tile grid |
| `O` | labfloor2 | no | Floor variant, so rooms don't look stamped |
| `z` | hazard | no | Yellow and black stripe. Marks doorways and the lockdown wing |
| `W` | labwall | yes | Wall face: the side you see from the floor |
| `V` | labcap | yes | Wall top: the roof edge above a wall face |
| `v` | vent | no | Floor grate |
| `i` | pipe | yes | Pipe run along a wall |
| `G` | glass | yes | Observation window. See-through |
| `c` | cage | yes | Animal cage. Rats burst from these |

Outdoor tiles in the dock: `g` gravel, `=` road, `_` road line, `X` lab fence, `l` lamp, `T` pine at the edge.

## Beats

World triggers them. Story writes the scripts. Ids are fixed.

| Beat | Where | Script id | What happens |
|---|---|---|---|
| `start` | dock | `l2_start` | Safe start. `lights_dock` is the first save point |
| `agents1` | corridor A | `l2_agents` | Group `agents1` patrols. Pillars and lockers give cover from darts |
| `burn_hint` | power room | `l2_burn_hint` | Arrival beat of the BURN puzzle |
| `door1_open` | event `targetHit` on `sensor1` | `l2_burn_done` | `open` `door1`, then the script |
| `cages` | animal lab doorway | `l2_cages` | Script, then `wake` `rats1`. Group `agents2` is already patrolling the hall beside it |
| `agents2` | animal lab hall | none | Silent. Group `agents2` patrols |
| `scare` | observation corridor | `l2_scare` | `scare` step, then the script. A dark shape crosses behind the glass. No fight |
| `relay_hint` | observation corridor, after `scare` | `l2_shoot_hint` | Arrival beat of the SHOOT puzzle |
| `door2_open` | event `targetHit` on `relay1` | `l2_relay_done` | `open` `door2`, then the script. `lights_hall` is the second save point, just past `door2` |
| `crate_hint` | storage hall, after `door2_open` | `l2_push_hint` | Arrival beat of the PUSH puzzle |
| `crate_cleared` | event `propCleared` on `crate1` | `l2_crate_cleared` | Script only |
| `rats2` | storage hall | none | Silent. Group `rats2` is awake from the start |
| `lockdown` | records wing | `l2_lockdown_start` | `alarm` step, then the script, then `waves` |
| `level_clear` | cleared `lock3` | `l2_lockdown_clear`, then `l2_clear` | `finish` |

Scripts Story writes: `l2_start`, `l2_agents`, `l2_burn_hint`, `l2_burn_done`, `l2_cages`, `l2_scare`, `l2_shoot_hint`, `l2_relay_done`, `l2_push_hint`, `l2_crate_cleared`, `l2_lockdown_start`, `l2_lockdown_clear`, `l2_clear`. The last one points at the school (stage 1.3).

## Puzzles

Listed in `puzzles` in `stage12.ts`, in this order. Gate order on the route is fixed: `door1`, then `door2`, then `crate1`.

| Id | Beat | Prop | Hero |
|---|---|---|---|
| `burn` | `burn_hint` | `sensor1` | dustin |
| `relay` | `relay_hint` | `relay1` | lucas |
| `crate` | `crate_hint` | `crate1` | eleven |

- `sensor1`: prop `console`, `hitBy: 'burn'`. Sits in a wall face. A standable tile must be within Dustin's spray reach (54 px, 32 degree half cone) in a straight line. Only Dustin lights it.
- `relay1`: prop `console`, `hitBy: 'shoot'`. Sits in a sealed control room behind `G` glass, in a straight 8-way line and within Lucas's range (152 px) of some walkable tile. The room has no walkable way in. A solid prop between shooter and relay would block the shot, so keep the line clear.
- `crate1`: prop `crate`, `pushBy: 'push'`, `w` and `h` sized to fill the corridor. Only Eleven clears it.
- `door1`, `door2`: prop `door`, sized to fill the doorway (`w` or `h` of 32 for a two-tile doorway). Start closed and solid. Opened by the `open` step.
- Hints: a `PuzzleDef` carries only an id, its arrival beat, its prop and the hero who solves it. With the story skipped there is no text. After 30 seconds near an unsolved prop it gets yellow corner brackets, the hero's HUD slot pulses, and a callout reads TRY CHANGING CHARACTERS (see `docs/level-1.md`, "Puzzle hints"). With the story on, the `l2_*` hint scripts name the hero and the key.

## Spawns and the XP budget

| Group | Count | Type | Notes |
|---|---|---|---|
| `agents1` | 2 | agent | patrol, corridor A |
| `rats1` | 6 | rat | dormant, in the animal lab, wake at `cages` |
| `agents2` | 2 | agent | patrol, animal lab hall |
| `rats2` | 2 | rat | awake, storage hall |
| `lock1` | 2 | agent | dormant, records wing |
| `lock2` | 3 rats, 1 agent | rat, agent | dormant, records wing |
| `lock3` | 3 | agent | dormant, records wing |

That is 10 agents and 11 rats. XP per kill is rat 4, agent 8, so the stage is worth 124 XP. A test keeps it between 110 and 130. `waves` is `['lock1', 'lock2', 'lock3']`, each woken by the previous `groupCleared`. Waves enter from both ends of the wing.

The lead arrives at Lv 3 with 68 XP toward Lv 4 (193 total) and leaves at Lv 4. The bench arrives at Lv 2 and leaves at Lv 3. Nobody reaches Lv 5 (383 total), which leaves about 110 XP for stage 1.3.

Items: 3 Eggos, 2 Cokes, 12 quarters. Props: `lights_dock`, `lights_hall` (lights), `sensor1`, `relay1` (console), `door1`, `door2` (door), `crate1` (crate). Spawn ids are unique across enemies, items, props and npcs. There are no npcs.

## Bot

`waypoints` walk the route in order. The bot opens by flag, so flag `door1`, `door2` and `crate1` where it reaches them, and `wake` `rats1` at the animal lab and `lock1` at the lockdown trigger. The Dustin burn, the Lucas shot and the Eleven push are covered by unit tests in the real sim, not by the bot.

## What Art draws for this level

- The nine tiles, with variants so the lab doesn't look stamped. They must also survive the night remap, because `tests/night.test.ts` runs every tile name through it.
- Props: `door` (closed, open) and `console` (dark, lit). `crate` art already exists.
- Both kinds appear on the `?sheet=1` pages.
- Optional: a dithered red border pulse for the klaxon, off under reduce-flashing.

## What Audio makes for this level

- Track `lab`: E minor, 104 bpm, 32 bars, base and combat layers. Every fourth bar is 7/8 (14 sixteenth steps), via an optional `Track.barSteps`. Industrial pulse and a klaxon figure.
- Effect `klaxon`, used by the `alarm` step.
