# Level 6 spec: stage 2.3, the Gate

One stage, five to eight minutes, and the end of chapter 2. The tunnels come up under Hawkins Lab, where the Gate is. The Demodog Alpha waits in the loading bay. Then the party guards Eleven for 45 seconds while she shuts the Gate, and she is back. Sim builds the Alpha, the seals, the run-time spawns and the defense. Art draws the overrun Lab, the Gate, the Alpha and Hopper. World builds the map, the beats and the words. Audio scores it. Ids below are fixed. Every agent reads this file, `docs/level-5.md` (Max, Steve, `gap`, `crack`) and `docs/technical-architecture.md`.

## Shape

- Map: about 48 by 40 tiles in `src/world/stages/stage23.ts`, spawns in `stage23_data.ts`. The outer ring is solid. Lab walls are a `labcap` row (`V`) over a `labwall` row (`W`) as in 1.2; where the Upside Down has eaten them they are `fleshwall` (`9`).
- Route, one main path with side pockets for items:
  - the tunnel mouth (start, south-west), where a tunnel broke through the Lab's wall
  - the sublevel corridor, going east, with Steve's `crack1` across it
  - storage, with Max's `gap1` into a side room (the cache)
  - the loading bay (the Alpha's den), an arena about 18 by 12 tiles
  - the stairwell up, with `lights_gate`
  - the Gate chamber (end, north-east), the rift on its north wall
- Light: `time: 'night'`. The lights props, a `lights` entry on the rift (it glows), and a few at the `tear`s.
- Music: `lab` until the Alpha wakes, then the `music` step switches to `clock` to the end.
- Party: picked on the map from Mike, Dustin, Lucas, Will, Max and Steve. Steve is locked in. `?stage=2.3` starts Mike (lead) at Lv 6, Dustin 5, Max 4, Steve 4.
- `enemyMult`: start at 1 on the chapter 2 numbers and set it by measuring.

## Rooms

| Room | Floor | Dressing | What happens |
|---|---|---|---|
| Tunnel mouth | `tunnelfloor` into `labfloor` | the broken wall, `roots` coming through | Start and `lights_mouth` |
| Sublevel corridor | `labfloor`, `fleshfloor` | `vines`, `mass`, `stain`, `cable` | Two young demodogs, two vines. `crack1` blocks the way on |
| Storage | `labfloor` | `shelf`, `cabinet`, `mass` | Pods, a vine, two demodogs. `gap1` into the side room |
| Side room | `labfloor` | `shelf`s | The cache. Nothing hostile |
| Loading bay | `fleshfloor`, `labfloor` | `mass`, crates as dressing | `lights_den` outside the doors. Then the arena: `seal1` and `seal2` across its two doorways |
| Stairwell | `labfloor` | | `lights_gate`, the save point for the defense |
| Gate chamber | `fleshfloor`, `tear` | the `rift` prop on the north wall, `mass` | Eleven and Hopper (npcs) at the rift. The defense |

The flesh grows thicker toward the Gate: lab tiles at the mouth, flesh in patches in storage, flesh over most of the den, all flesh and tears in the Gate chamber.

## Beats

| Beat | Where | Script id | What happens |
|---|---|---|---|
| `start` | the mouth | `l6_start` | Safe start. `lights_mouth` is the first save point |
| `crack_hint` | in front of `crack1` | `l6_crack_hint` | Arrival beat of the SMASH puzzle |
| `crack_open` | event `propCleared` on `crack1` | `l6_crack_done` | Script only |
| `storage` | the storage doorway | `l6_storage` | Script only |
| `gap_hint` | in front of `gap1` | `l6_gap_hint` | Arrival beat of the DASH puzzle |
| `gap_crossed` | event `propCleared` on `gap1` | `l6_gap_done` | Script only |
| `den` | outside the loading bay | `l6_den` | `lights_den` is the second save point |
| `alpha` | arena rect, needs `den` | `l6_alpha` | `close` `seal1`, `close` `seal2`, `music` `clock`, the script, `wake` `boss` |
| `alpha_down` | cleared `boss` | `l6_alpha_down` | `open` `seal1`, `open` `seal2`, the script |
| `gate` | the Gate chamber doorway, needs `alpha_down` | `l6_gate` | Eleven and Hopper are there. The script tells the party to light the lights |
| `defend` | rect in front of the rift, needs `gate` | `l6_defend` | The script, then `defend` |
| `level_clear` | event `defended` | `l6_clear` | `finish`. Eleven shuts the Gate and comes home with them |

Scripts: `l6_start`, `l6_crack_hint`, `l6_crack_done`, `l6_storage`, `l6_gap_hint`, `l6_gap_done`, `l6_den`, `l6_alpha`, `l6_alpha_down`, `l6_gate`, `l6_defend`, `l6_clear`. Eleven speaks in short sentences now (she has grown since 1.1). Hopper is gruff and soft underneath ("Coffee first. Monsters second."). The boys see Eleven again for the first time in `l6_gate`; Mike gets the line. In `l6_clear` she shuts the Gate and is back with the party for chapter 3.

## Puzzles

| Id | Beat | Prop | Hero | Hint |
|---|---|---|---|---|
| `crack` | `crack_hint` | `crack1` | steve | MAYBE STEVE SHOULD TRY HIS NAIL BAT |
| `gap` | `gap_hint` | `gap1` | max | MAYBE MAX SHOULD TRY HER SKATE DASH |

`crack1` and `gap1` follow `docs/level-5.md`, "Puzzles". `gap1` guards only the cache, so a party without Max never sees its hint.

## Demodog Alpha

`EnemyKind` `alpha`, in `src/enemies/alpha.ts`. One spawn, id `alpha`, group `boss`, dormant until the `alpha` beat. Numbers are starting points, set against the chapter 2 enemy numbers (a young demodog is 60 HP, 30 ATK, 4 DEF); tune them inside "Targets", not the targets themselves.

| HP | ATK | DEF | Walk | XP |
|---|---|---|---|---|
| 1100 | 34 | 6 | 1.1 | 70 |

- **Bite.** It walks at the hero and bites at close range: a 24 frame wind-up under the red "!", an arc in front of it (reach 28, power 1.0, knockback 4), `chomp`.
- **Lunge.** About every 120 frames, when the hero is 50 to 120 px away: a 30 frame wind-up, then 18 frames along a fixed line at 4.6 px a frame (power 1.1, `lunge`). It stops at a wall and isn't stunned.
- **Pounce.** About every 240 frames, more often below half HP: it crouches for 30 frames (pose `crouch`), then leaps (pose `leap`, `z` rises and falls) onto the hero's spot. A `mark` fx grows there for the 40 frames it's in the air. Landing is a 36 px shockwave (power 1.2, knockback 5), then it's dazed for 40 frames (pose `stun`) and takes 50 percent more damage.
- **Howl.** At 75, 50 and 25 percent HP, once each: it stops where it is for 50 frames (pose `howl`), with a `howl` fx ring, the `howl` sfx and a `howl` event. It takes double damage while it howls. Three young demodogs climb out of the three burrows nearest it (run-time spawns, see "Run-time spawns").
- Hits don't stun it.
- **Boss bar.** While it's awake, `hud.boss` is `{ name: 'DEMODOG ALPHA', hp, hpMax }`.
- **Bot.** It sidesteps the lunge line during the wind-up, steps off a `mark`, and hits the Alpha while it howls.

## The arena and the seals

- `seal1` and `seal2`: prop `vines`, spawned `state: 'open'` and `solid: false` across the den's two doorways, with no `hitBy`. Open vines draw as nothing, or as roots on the floor.
- The `alpha` beat closes them (`close` step, `Sim.closeProp`): closed, solid, drawn as a vine wall. A hero standing in one is moved to the nearest open tile inside the arena. The trigger rect sits deep enough that nobody is.
- The `alpha_down` beat opens them (`open` step).
- Nothing burns them. Without `hitBy` a flame on them is a `poked`, and no puzzle names them, so there's no hint.
- The play scene already blocks lighting while `hud.boss` is set. World blocks it while `hud.ward` is set too.

## Run-time spawns

- The stage lists `burrows` (tiles): three or four at the den's edges, for the howl, and three or four on the `tear`s in the Gate chamber, for the defense.
- The sim creates these enemies itself, at the burrows, with ids it makes up. They are never in `skipSpawns`, so a retry brings them all back.
- A howl uses the three burrows nearest the Alpha. A defense wave uses the burrows nearest the ward, in turn.
- Each comes up with a short `dust` burst and is awake at once.
- A run-time enemy is worth 1 XP, so the XP lives in the Alpha and the halls and a failed defense can't be farmed.

## The defense

`StageData.defense` (a `DefenseDef`, see `core/types.ts`):

| Field | Starting value |
|---|---|
| `npc` | `eleven` |
| `hp` | 400 |
| `frames` | 2700 (45 s) |
| `prop` | `rift` |
| `waves` | 3 demodogs at 0 s, 3 at 7 s, 4 at 14 s, 3 and an elite at 22 s, 4 at 30 s, 3 at 37 s |

- **Before it starts**, Eleven (npc `eleven`) and Hopper (npc `hopper`) stand at the rift, no bars. Hopper is scenery the whole time: enemies ignore him.
- **`Sim.defend()`** starts the clock. Eleven channels: her `ActorView` has `anim: 'cast'`, `strained: true` (the nosebleed) and a `bar`. She doesn't move or attack.
- **Enemies favor her.** A defense enemy goes for Eleven unless the active hero is within 40 px of it or hit it in the last 90 frames, or Steve's Babysit holds it. It picks again after each attack. A bite or lunge at her uses its usual numbers against her DEF of 4, scaled by difficulty and `enemyMult` like hero damage. Heroes' attacks never hurt her.
- **The clock always runs.** `hud.ward` is `{ name: 'ELEVEN', hp, hpMax, left, total }`. The rift's `PropView.k` is `1 - left / total`. About every 10 s the sim plays `rumble`.
- **Shut.** When `left` reaches 0: the `defended` event, `gateShut`, a shake and a flash, every defense enemy still up dies with no XP (a dust puff each), and the rift shows `k = 1`.
- **Eleven falls.** If her HP reaches 0 first: the `wardDown` event once, the clock stops, she shows `anim: 'ko'`. The play scene treats it like the whole party going down: the game over overlay, then a retry from the last lit light. `lights_gate` is lit after the Alpha, so the retry comes back to the defense, not the boss, and the defense runs again from the start with every wave.
- **UI.** The HUD draws the ward where the boss bar goes: ELEVEN, her HP bar and the seconds left. After `wardDown` the game over overlay says ELEVEN IS DOWN (an optional `reason` for `createGameOverScene`).

## Spawns and the XP budget

| Group | Enemies | Notes |
|---|---|---|
| `corridor` | 2 demodogs, 2 vines | the sublevel corridor |
| `storage` | 3 pods, a vine, 2 demodogs | storage |
| `boss` | Demodog Alpha `alpha` | dormant in the den |
| run-time | 9 howl demodogs, 23 in the defense | 1 XP each |

Count the XP from `ENEMY_DEFS` and keep the total between 150 and 200; a test enforces it. Items: four Eggos (one in the cache, one in the stairwell), three Cokes, 12 quarters. Props:
- lights: `lights_mouth`, `lights_den`, `lights_gate`
- gates: `crack1`, `gap1`, `seal1`, `seal2`
- the Gate: `rift`, prop `rift`, about 64 by 48 on the north wall of the Gate chamber, solid
- npcs: `eleven` and `hopper`

## Targets

The same bands as `docs/level-3.md`, "Targets", measured with `node scripts/measure-stage.ts 2.3 chief 20`, plus:

| Measure | Target |
|---|---|
| Boss time | from the `alpha` beat to the finish, the Alpha and the defense together about half the run |
| Eleven falls, careful bot | at most 3 of 20 |

The measure script counts `wardDown` as a loss.

## Bot

- `waypoints` walk the route. The bot breaks `crack1` by flag (`open`), like the other gates. The route skips the cache.
- The Alpha is real.
- In the defense the bot stays within 48 px of Eleven and fights whatever is nearest her. With Steve in the party it casts Babysit when two or more enemies are on her.
- The last waypoint is inside the `defend` trigger.

## What Art draws for this level

Art builds only after the owner picks from the variation sheets.

- The three flesh tiles in `core/tiles.ts` (`fleshfloor`, `fleshwall`, `tear`), night art, with variants. The lab tiles exist.
- Props:
  - `rift`: the Gate, about 64 by 48, a glowing tear in the wall and floor that pulses. `k` 0 is wide open, 1 is shut to a seam
  - `vines` seals: the existing vines prop, drawn as nothing or floor roots when `open`
- The Demodog Alpha, from the chosen design: bigger than a 16 by 16 cell (about 32 by 24), walk in four directions, bite, lunge, `crouch`, `leap`, `howl`, `stun`.
- Hopper: an npc sprite on the big body and a portrait with the five expressions, from the chosen design.
- Eleven channeling: her `cast` anim with the nosebleed already works. Arms raised is better if it reads.
- FX: `howl`, a ring that grows.
- A `?sheet=1` page for the Lab overrun, the Gate, the Alpha and Hopper.

## What Audio makes for this level

- Hopper's speech blip, a low saw (the stand-in in `audio/cues.ts` goes).
- Effects: `howl`, `rumble`, `gateShut` (the stand-ins in `audio/sfx_levels56.ts` go).
- `lab` and `clock` already exist.

## Variation sheet

`alpha-variations.html` at the project root, made like the sheets in `docs/level-5.md`: five designs for the Demodog Alpha, each with the walk, the howl and the leap, at 1x and zoomed, next to a young demodog for scale.
