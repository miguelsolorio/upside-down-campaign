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
- Party: Mike (active), Dustin, Lucas, Will. The carry rule (`partyFor` in `core/campaign.ts`) drops Eleven and brings Will in at the others' average level minus one. `?stage=2.1` starts them at Lv 4, 4, 3, 2 with the XP a run brings. There's no recruit beat.
- `enemyMult: 1.15`. The chapter 2 enemies carry their own numbers (see "New enemies" and "Result").

## Rooms

| Room | Floor | Dressing | What happens |
|---|---|---|---|
| The Palace | `arcadecarpet` | `arcadewall`, rows of `arcade` cabinets (props), the Dig Dug cabinet with MADMAX on its high-score screen, a prize counter | Start, `lights_palace`. Max (npc `max`) stands at Dig Dug. Nothing hostile. Every cabinet plays (see "The arcade") |
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

## The arcade

Every cabinet in the Palace is playable. Space at a cabinet opens its game over the frozen level (`arcade/scene.ts`), and leaving comes straight back. Play is free. The games are small takes on the ones the show puts in the Palace, drawn fresh in the house palette, each on a 168 px square field.

| Cabinet | Game | What it is |
|---|---|---|
| `digdug` | DIG DUG | Tunnel through four strata, pump Pookas and Fygars until they pop, drop rocks on them. Fygars breathe fire through the dirt. The last one runs for the surface |
| `cab3`, `cab6` | CENTIPEDE | A shooter in the bottom rows, a mushroom field, a centipede that splits where it's shot, a spider |
| `cab4` | DRAGON'S LAIR | Quick-time scenes: answer each flashing arrow or sword in time (a second at first), or Dirk dies. The first scene opens on a how-to. The dragon's fire is the last one |
| `cab1`, `cab8` | GALAGA | A formation that flies in, sways and dives |
| `cab2` | PAC-MAN | Dots, power pellets, four ghosts |
| `cab5`, `cab7` | MS. PAC-MAN | The same game in its own maze |

- **Boards:** five rows a game, saved in the browser (`upside-down:arcade:v1`). They start with names from the show: MADMAX over Dustin at Dig Dug, Dustin still first at Centipede, Keith at Dragon's Lair. A finished run goes on the board under the active hero's name. A run left halfway isn't posted.
- **The easter egg:** a Dig Dug run over MADMAX's 6,150 takes the top of her board, and the Dig Dug cabinet in the world scrolls the new name instead of hers. Back in the level, Max has a line, and the party gets 25 XP (shared as for a kill) and five quarters. It pays once a visit.
- **Screens in the world:** each cabinet's 10 by 8 attract loop is its own game (`gfx/props_town.ts`).
- The bot never opens a cabinet, and no cabinet answers while a beat's dialogue runs.

## Will

Will is Wizard, in `heroes/will.ts`, and `HERO_DEFS.will` replaces the stand-in. Numbers are starting points.

- **Sketch bolt** (basic): a slow arcane bolt in eight directions, power 1.3, speed 2.2, `bolt` fx. It stays inside the time-to-kill bands in `tests/balance.test.ts`.
- **Fireball** (10 MP): a lobbed ball that bursts where it lands or on the first enemy, with a `blast` fx. A d20 sizes it: radius = 16 + the roll in px.
  - A 1 fizzles: no damage, a FIZZLE floater.
  - A 20 doubles the radius and shows NAT 20.
  - The roll uses the sim's rng, so a seed replays it.
- **Cold spot** (Lv 3 talent): while Will is the active hero, enemies spawned `hidden: true` within 72 px show (`ActorView.hidden` false), and they take 15 percent more damage from the party.
- **Utility:** `sense`. **Crit signature:** `blast`.
- **Bot style:** a ranged hero (hold about 80, reach about 120).

## New enemies

| Enemy | HP | ATK | DEF | Speed | XP | Behavior |
|---|---|---|---|---|---|---|
| Young demodog (`demodog`) | 60 | 30 | 4 | 1.2 | 9 | Circles at about 48 px, then winds up for 28 frames under the "!" and lunges 14 frames at 4 px a frame (power 0.9, `lunge`, `chomp` on a hit), then recovers for 30 frames. In a pack, only one lunges at a time, with at least 20 frames between lunges |
| Vine (`vine`) | 50 | 18 | 4 | 0 | 5 | Rooted. Lashes in a 34 px reach after a 30 frame wind-up (power 0.8, applies `slow` for 90 frames). Burn deals double damage to it. Often spawned `hidden: true` in the corn |
| Pod (`pod`) | 28 | 16 | 2 | 0 | 3 | Rooted. A hero within 48 px starts a 40 frame swell, then it bursts into a 28 px `spore` cloud: power 0.6 and `slow`. It dies in the burst and gives no XP that way. Killed first, it's worth 3 |

HP, ATK and DEF are sized for a Lv 5 party, so chapter 2 stages keep `enemyMult` near 1 instead of scaling chapter 1 numbers. At 2.1's 1.15, against a party at Mike 5, Dustin 5, Lucas 4 and Will 3 (the arrival party before the pace pass; a run now gets Mike to Lv 5 inside the stage):

- A demodog has 69 HP: five of a Lv 5 Mike's swings at an average roll, or three or four when his talent crits the first hit of the fight. A bite takes 26 of his 76 HP and 29 of Will's 46.
- A vine has 57 HP, about four of Mike's swings. A lash takes 11 of his HP, 15 of Will's, and slows.
- A pod has 32 HP, two swings. The spores take six of Mike's HP and nine of Will's, and slow.
- The rats in 2.1 keep their chapter 1 numbers and die in one hit.

The first numbers in this spec were 34, 12 and 2 for the demodog, 30, 9 and 2 for the vine, and 16, 6 and 0 for the pod.

## Spawns and the XP budget

| Group | Enemies | Notes |
|---|---|---|
| `street` | 4 rats | from the storm drain |
| `rows` | 2 vines, 3 pods | in the rot between the pumpkin rows |
| `barn` | 2 rats, a vine, a demodog | the barn yard |
| `corn` | 2 hidden vines, a pod | the far field |
| `amb1`, `amb2`, `amb3` | 3, 3 and 4 demodogs | dormant at the hole. Waves, each woken by the last `groupCleared` |

That's 11 demodogs (99), five vines (25), four pods (12) and six rats (24): 160 XP at most. Pods that burst give less. The stage now has 13 demodogs and three rats, 166 XP, and its `xpMult` of 1.5 makes that 260 (`docs/pace.md`). A test keeps it between 230 and 270. Items: three Eggos, two Cokes, 12 quarters. Props:
- lights: `lights_palace`, `lights_patch`, `lights_field`
- gates: `vines1`, `target1`, `gate1`, `hidden1`
- dressing: nine `arcade` cabinets, `cab1` to `cab8` and `digdug`, all playable
- npc: `max` (her npc id is `max`)

## Targets

The same bands as `docs/level-3.md`, "Targets", measured with `node scripts/measure-stage.ts 2.1 chief 20`. The average time is 90 to 150 s.

## Bot

The bot opens `vines1`, `gate1` and `hidden1` by flag. The ambush is real.

## What Art draws for this level

- The 13 tiles in `core/tiles.ts` (`arcadecarpet` to `hole`), day art, with variants.
- Props:
  - `arcade`: a cabinet with a live attract screen of the game it plays; `digdug` shows a high-score table with the board's top name, MADMAX until someone beats her
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

## Result

Measured with `node scripts/measure-stage.ts 2.1` at `enemyMult` 1.15. Here "boss" in the script's output is the ambush.

| | Chief, 20 seeds | Chief, 100 seeds | Careless, chief | Kid | Upside |
|---|---|---|---|---|---|
| Cleared | 17 | 90, none stuck (279 of 300, none stuck) | 20 of 20 (91 of 100) | 20 | 11 |
| Damage taken | 237 | 217 | 170 | 94 | 331 |
| KOs | 1.50 | 1.22 | 0.70 | 0 | 2.55 |
| Lowest party HP | 35% | 40% | 50% | 70% | 13% |
| Time | 105 s | 102 s | 92 s | 88 s | 108 s |

Stage XP is 166. In the browser the bot clears 2.1 in 1:55 for 157 XP.

- **The factor is back at 1.15.** It was 3.15, because the demodog, vine and pod had numbers for a chapter 1 party. At 3.15 a demodog had 107 HP, seven of a Lv 5 Mike's swings. Now it has 69, five swings, and its bite is a little harder (26 to Mike, was 20).
- **All the damage is bites.** In 20 careful runs the bot takes about nine bites of 27 and nothing else. The vines, pods and rats never land a hit on it, so their numbers come from the sums above, not from the measurements.
- **The careless bot clears more than the careful one.** Dogs that go down in a few hits reward trading blows over dodging. The careless bot keeps swinging, takes about six bites a run to the careful bot's nine, and ends the ambush sooner. At 3.15 it was the other way round, 14 to 17.
- **Upside clears 11 of 20,** up from 5. The floor is 4.
- **Demodogs replaced rats.** The barn and street rats were traded for demodogs, so the stage has 13 demodogs and three rats: a pack of three at the barn, then waves of 3, 3 and 4.
- **The route is longer.** The pumpkin rows zigzag.
- **Eleven is named once,** by Mike, and never explained.

## After the pace pass

A real run now walks in at Lv 4, 4, 3 and Will at 2, and the stage pays 260 XP (`docs/pace.md`). Mike reaches Lv 5 before the ambush in every seed (Mike 5, Dustin 4, Lucas 4, Will 2 there). The factor stays at 1.15:

| | Chief, 20 seeds | Chief, 100 seeds | Careless, chief | Kid | Upside |
|---|---|---|---|---|---|
| Cleared | 18 | 83, none stuck | 17 of 20 (88 of 100) | 20 | 2 (18 of 100) |
| Damage taken | 211 | 234 | 217 | 112 | 347 |
| KOs | 1.40 | 1.74 | 1.75 | 0 | 3.85 |
| Lowest party HP | 39% | 33% | 32% | 66% | 1% |
| Time | 99 s | 103 s | 92 s | 88 s | 110 s |

- **Upside is under its floor**: 18 of 100 against 4 of 20. A lower factor brings it back but makes chief a walk: at 1.05 chief clears 40 of 40 and the party never drops under 56 percent. Chief is in every band, so the factor stays. The arena ambush test (`tests/level4-bot.test.ts`) asks upside for 3 of 12, not 4.
- A higher `xpMult` doesn't help upside (18 of 100 at 1.8).
