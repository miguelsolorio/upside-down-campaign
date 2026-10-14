# Level 4 spec: stage 2.1, the Palace and the patch

One stage, five to eight minutes, and the start of chapter 2 (Halloween 1984). Eleven is gone and Will is back. Sim builds Will, the young demodogs, vines and pods. Art draws the arcade, Main Street and the pumpkin patch. World builds the map and beats, Story writes the words, Audio scores it. Ids below are fixed. Every agent reads this file and `docs/technical-architecture.md`.

## Shape

- Map: about 48 by 40 tiles in `src/world/stages/stage21.ts`, spawns in `stage21_data.ts`. The outer ring is solid.
- Route, one main path with side corners for items:
  - the Palace Arcade (start, north-west)
  - out the door onto Main Street, going east
  - south through a fence gap into Merrill's pumpkin patch
  - the rotten field, with its vine walls and corn rows
  - the hole in the ground (end, south-east)
- Light: `time: 'day'`. No pools.
- Music: `hawkins`.
- Party: Mike (active), Dustin, Lucas, Will. The carry rule (`partyFor` in `core/campaign.ts`) drops Eleven and brings Will in at the others' average level minus one. `?stage=2.1` starts them at Lv 5, 5, 4, 3. There's no recruit beat.
- `enemyMult: 1.15`.

## Rooms

| Room | Floor | Dressing | What happens |
|---|---|---|---|
| The Palace | `arcadecarpet` | `arcadewall`, rows of `arcade` cabinets (props), the Dig Dug cabinet with MADMAX on its high-score screen, a prize counter | Start, `lights_palace`. Max (npc `max`) stands at Dig Dug. Nothing hostile |
| Main Street | `sidewalk`, `road`, `roadline` | `storefront`s, `brick`, lamps, parked bikes | A few rats out of a drain. The `dart` beat at a trash can |
| The patch gate | `dirt`, `grass` | `fence`, `haybale`s, a farm stand of pumpkins | `vines1` across the gate |
| Pumpkin rows | `furrow` | `pumpkin` and `rotpumpkin` rows, `rot` patches spreading | Vines (enemy) and pods in the rot. The barn |
| Barn yard | `dirt` | `barnwall`, `barnroof`, `haybale`s | `target1` on the barn loft. `gate1` to the far field |
| The far field | `rot`, `furrow` | `corn` walls, more `rotpumpkin`s | `hidden1`: a hidden path through the corn that only Will finds |
| The hole | `rot` | the `hole` tiles, growth, dead corn | The ambush, three waves of young demodogs, then `finish` |

## Beats

| Beat | Where | Script id | What happens |
|---|---|---|---|
| `start` | arcade | `l4_start` | Safe start. `lights_palace` is the first save point |
| `max` | next to the Dig Dug cabinet | `l4_max` | Max won't give up the high score. She joins in 2.2 |
| `street` | arcade door | `l4_street` | Out onto Main Street |
| `dart` | the trash can on Main Street | `l4_dart` | Dustin finds a small creature. Story only |
| `vines_hint` | in front of `vines1` | `l4_vines_hint` | Arrival beat of the BURN puzzle |
| `vines_cleared` | event `propCleared` on `vines1` | `l4_vines_done` | Script, then `lights_patch` (the second save point) just inside |
| `patch` | the first pumpkin rows | `l4_patch` | The rot |
| `target_hint` | barn yard | `l4_shoot_hint` | Arrival beat of the SHOOT puzzle |
| `gate1_open` | event `targetHit` on `target1` | `l4_shoot_done` | `open` `gate1`, then the script |
| `sense_hint` | far field, by the corn | `l4_sense_hint` | Will feels something. Arrival beat of the SENSE puzzle |
| `hidden_open` | event `propCleared` on `hidden1` | `l4_sense_done` | Script. `lights_field` is the third save point just past it |
| `ambush` | rect at the hole | `l4_ambush` | Script, then `waves` |
| `level_clear` | cleared `amb3` | `l4_clear` | `finish`. Points at the tunnels (2.2) |

Scripts: `l4_start`, `l4_max`, `l4_street`, `l4_dart`, `l4_vines_hint`, `l4_vines_done`, `l4_patch`, `l4_shoot_hint`, `l4_shoot_done`, `l4_sense_hint`, `l4_sense_done`, `l4_ambush`, `l4_clear`. Max speaks in `l4_max` (speaker `max`, quick and dry). Nobody says where Eleven is. The boys miss her, and Mike says so once.

## Puzzles

| Id | Beat | Prop | Hero | Hint |
|---|---|---|---|---|
| `vines` | `vines_hint` | `vines1` | dustin | MAYBE DUSTIN SHOULD TRY HIS HAIRSPRAY |
| `target` | `target_hint` | `target1` (blocks `gate1`) | lucas | MAYBE LUCAS SHOULD TRY HIS SLINGSHOT |
| `hidden` | `sense_hint` | `hidden1` | will | MAYBE WILL CAN FEEL THE WAY |

- `vines1`: prop `vines`, `hitBy: 'burn'`, as in 1.3.
- `target1`: prop `target`, `hitBy: 'shoot'`, the loft door of the barn, above a solid wall. Same as 1.1's shot gate. `gate1` is a prop `gate`, opened by the `open` step.
- `hidden1`: prop `hidden`, `hitBy: 'sense'`, 16 by 32, in a corn wall. It's solid and drawn as corn. When the active hero has the `sense` utility (Will) and stands within 40 px of it, it plays `reveal` and a `reveal` fx, emits `propCleared`, and turns open and walkable. A wrong hero pushing against it or hitting it is a `poked`.

## Will

Will is Wizard, in `heroes/will.ts`, and `HERO_DEFS.will` replaces the stand-in. Numbers are starting points.

- **Sketch bolt** (basic): a slow arcane bolt in eight directions, power 1.3, speed 2.2, `bolt` fx. It stays inside the time-to-kill bands in `tests/balance.test.ts`.
- **Fireball** (10 MP): a lobbed ball that bursts where it lands or on the first enemy, with a `blast` fx. A d20 sizes it: radius = 16 + the roll in px.
  - A 1 fizzles: no damage, a FIZZLE floater.
  - A 20 doubles the radius and shows NAT 20.
  - The roll uses the sim's rng, so a seed replays it.
- **Cold spot** (Lv 3 talent): while Will is the active hero, enemies spawned `hidden: true` within 72 px show (`ActorView.hidden` false), and they take 15 percent more damage from the party.
- **Utility:** `sense`. **Party burst signature:** `blast`.
- **Bot style:** a ranged hero (hold about 80, reach about 120).

## New enemies

| Enemy | HP | ATK | DEF | Speed | XP | Behavior |
|---|---|---|---|---|---|---|
| Young demodog (`demodog`) | 34 | 12 | 2 | 1.2 | 9 | Circles at about 48 px, then winds up for 28 frames under the "!" and lunges 14 frames at 4 px a frame (power 0.9, `lunge`, `chomp` on a hit), then recovers for 30 frames. In a pack, only one lunges at a time, with at least 20 frames between lunges |
| Vine (`vine`) | 30 | 9 | 2 | 0 | 5 | Rooted. Lashes in a 34 px reach after a 30 frame wind-up (power 0.8, applies `slow` for 90 frames). Burn deals double damage to it. Often spawned `hidden: true` in the corn |
| Pod (`pod`) | 16 | 6 | 0 | 0 | 3 | Rooted. A hero within 48 px starts a 40 frame swell, then it bursts into a 28 px `spore` cloud: power 0.6 and `slow`. It dies in the burst and gives no XP that way. Killed first, it's worth 3 |

## Spawns and the XP budget

| Group | Enemies | Notes |
|---|---|---|
| `street` | 4 rats | from the storm drain |
| `rows` | 2 vines, 3 pods | in the rot between the pumpkin rows |
| `barn` | 2 rats, a vine, a demodog | the barn yard |
| `corn` | 2 hidden vines, a pod | the far field |
| `amb1`, `amb2`, `amb3` | 3, 3 and 4 demodogs | dormant at the hole. Waves, each woken by the last `groupCleared` |

That's 11 demodogs (99), five vines (25), four pods (12) and six rats (24): 160 XP at most. Pods that burst give less. A test keeps the total between 130 and 170. Items: three Eggos, two Cokes, 12 quarters. Props:
- lights: `lights_palace`, `lights_patch`, `lights_field`
- gates: `vines1`, `target1`, `gate1`, `hidden1`
- dressing: about eight `arcade` cabinets, including `digdug`
- npc: `max` (her npc id is `max`)

## Targets

The same bands as `docs/level-3.md`, "Targets", measured with `node scripts/measure-stage.ts 2.1 chief 20`. The average time is 90 to 150 s.

## Bot

The bot opens `vines1`, `gate1` and `hidden1` by flag. The ambush is real.

## What Art draws for this level

- The 13 tiles in `core/tiles.ts` (`arcadecarpet` to `hole`), day art, with variants.
- Props:
  - `arcade`: a cabinet with a live attract screen; `digdug` shows a high-score table with MADMAX on top
  - `hidden`: corn, then a dark gap
  - `vines` and `target`: from 1.3 and 1.1
- Actors:
  - the young demodog: walk, wind-up, lunge, recover
  - vine: rooted, coiled, lashing; faint when `hidden`
  - pod: swelling, bursting
- Max: a sprite (red hair, skateboard) for the npc, and a portrait.
- FX: `bolt` and `reveal`.
- Map art for `docs/map-screen.md`.

## What Audio makes for this level

- `hawkins`: F major, 112 bpm, the motif in major, warm and a little wistful. Base and combat layers. It's also the map screen's track.
- Will's tag-in stinger (the stand-in in `audio/tracks/jingles.ts` goes) and the `reveal` effect.
