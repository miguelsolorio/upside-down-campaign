# Level 7 spec: stage 3.1, the mall concourse

One stage, five to eight minutes, and the start of chapter 3 (Starcourt, July 1985). Eleven is back, and Robin and Nancy join. Sim builds Robin, Nancy, the melting rat, the Flayed, the Russian soldier and the stash. Art draws the mall, the new heroes, Erica and the new foes. World builds the map, the beats and the words. Audio writes `starcourt`. Ids below are fixed. Every agent reads this file, `docs/level-8.md` (the soldier, Grigori and the base), `docs/map-screen.md` (picks and Erica's cart) and `docs/technical-architecture.md`. Types are in `src/core/types.ts` and `src/world/types.ts`, tile chars in `src/core/tiles.ts`.

## Shape

- Map: about 48 by 40 tiles in `src/world/stages/stage31.ts`, spawns in `stage31_data.ts`. The outer ring is solid. Mall walls are a `mallcap` row over a `mallwall` row facing the floor below, like the Lab. Shop fronts and shutters sit in the wall row.
- Route, one main path with side pockets for items:
  - the west entrance (start, south-west), glass doors from the parking lot
  - the west concourse, going east, shops on both sides
  - Scoops Ahoy, a side room off the concourse
  - the fountain court, the big atrium in the middle
  - the east concourse, going north
  - the service corridor behind the shops
  - the loading dock (end, north-east), the ambush, and the freight lift down to the base (3.2)
- Concourses are three or four tiles wide. The court and the dock are bigger.
- Light: `time: 'night'`, the mall after closing (the owner picked Confetti): pools at `lights` entries on the neon shop signs, the fountain and the exit signs, and at the lights props.
- Music: `starcourt`.
- Party: picked on the map from Mike, Dustin, Lucas, Will, Eleven, Max, Steve, Robin and Nancy (see "Party picks" in `docs/map-screen.md`). Nobody is locked. `?stage=3.1` starts Mike (lead) at Lv 6, Eleven 5, Robin 4 and Nancy 4 (`ARRIVAL` in `core/campaign.ts`), a little ahead of a real run, as 2.2's was.
- `enemyMult`: start at 1 on the chapter 3 enemy numbers and set it by measuring (see "Targets").
- Dialogue is off by default. Gate hints work as in every level (see `docs/level-1.md`, "Puzzle hints").

## Rooms

| Room | Floor | Dressing | What happens |
|---|---|---|---|
| West entrance | `mallfloor` | glass doors (`mallglass`), `planter`s, a directory board | Start and `lights_entry`. Nothing hostile |
| West concourse | `mallfloor`, `mallband` | `shopfront`s and `shutter`s on both sides, benches, a vent | Melting rats pour out of the vent. `shutter1` closes the far end, with `panel1` on the wall beside it |
| Scoops Ahoy | `checker` | the `scoops` counter, `table`s, a back room | Erica (npc `erica`) behind the counter. Story. `crack1` (Steve) closes off the back room, the first cache |
| Fountain court | `mallfloor`, `mallband` | the `fountain` in the middle, `planter`s, the upper balcony's `railing`, `goo` spreading from a corner | `lights_court`. Melting rats, and Flayed rising out of the goo |
| East concourse | `mallfloor` | shops, a toppled kiosk (`crate1`) across a side shop's door | A Flayed crowd. `crate1` (Eleven) opens the second cache |
| Service corridor | `servicefloor` | `pipe`s, stacked boxes | `lights_service`. Two Russian soldiers guard it |
| Loading dock | `servicefloor`, `goo` | dock doors, the freight lift (`lift`) in the far corner | The ambush, then the lift down |

The goo thickens as you go: none at the entrance, a corner of the court, most of the dock.

## Beats

World triggers them and writes the scripts.

| Beat | Where | Script id | What happens |
|---|---|---|---|
| `start` | the entrance | `l7_start` | Safe start. `lights_entry` is the first save point |
| `scoops` | the Scoops Ahoy doorway | `l7_scoops` | Steve and Robin's shop. Erica is there, and won't be left out. Story only |
| `shutter_hint` | in front of `shutter1` | `l7_shutter_hint` | Arrival beat of the panel puzzle |
| `shutter_open` | event `targetHit` on `panel1` | `l7_shutter_done` | `open` `shutter1`, then the script |
| `crack_hint` | in front of `crack1` | `l7_crack_hint` | Arrival beat of the SMASH puzzle |
| `crack_open` | event `propCleared` on `crack1` | `l7_crack_done` | Script only |
| `court` | the court's doorway | `l7_court` | Script, then `wake` `court` (the goo rises). `lights_court` is the second save point |
| `crate_hint` | in front of `crate1` | `l7_crate_hint` | Arrival beat of the PUSH puzzle |
| `crate_cleared` | event `propCleared` on `crate1` | `l7_crate_done` | Script only |
| `service` | the service corridor door | `l7_service` | Nancy spots the soldiers. `lights_service` is the third save point |
| `ambush` | rect in the dock | `l7_ambush` | Script, then `waves` |
| `level_clear` | cleared `amb3` | `l7_clear` | `finish`. The lift goes down to the base (3.2) |

Scripts: `l7_start`, `l7_scoops`, `l7_shutter_hint`, `l7_shutter_done`, `l7_crack_hint`, `l7_crack_done`, `l7_court`, `l7_crate_hint`, `l7_crate_done`, `l7_service`, `l7_ambush`, `l7_clear`.

- Robin rambles and gets worse under stress ("I speak four languages and none cover this.").
- Nancy is flat and decisive ("Cover me. I'm going in.").
- Erica (speaker `erica`) is bossy and dry, and talks business.
- Eleven speaks in short full sentences now.
- A script can name a benched hero. The story assumes the whole crew is at the mall.

## Puzzles

Listed in `puzzles` in `stage31.ts`, in this order.

| Id | Beat | Prop | Hero | Hint |
|---|---|---|---|---|
| `shutter` | `shutter_hint` | `panel1` (blocks `shutter1`) | lucas, then `alt` | MAYBE LUCAS SHOULD TRY HIS SLINGSHOT |
| `crack` | `crack_hint` | `crack1` | steve | MAYBE STEVE SHOULD TRY HIS NAIL BAT |
| `crate` | `crate_hint` | `crate1` | eleven | MAYBE ELEVEN SHOULD TRY HER SHOVE |

- **The route never waits on a hero who might be benched.** Nobody is locked in 3.1, so `panel1` is a `firebox` with `hitBy: 'shoot'` and `smash: true`. A shot lights it, and so does anyone's basic attack from up close. Its `alt` list (`PuzzleDef.alt` in `world/types.ts`) names Nancy (MAYBE NANCY SHOULD TRY HER PISTOL), then every other hero (MAYBE MIKE SHOULD HIT THE PANEL, and so on), so the hint always names someone in the party.
- `shutter1`: prop `shutter`, 48 by 16 across the concourse, a rolling security grille. Opened by the `open` step. Solid and shut until then.
- `crack1`: prop `crack`, as in `docs/level-5.md`, across the back room's door.
- `crate1`: prop `crate`, `pushBy: 'push'`, 32 by 16, the toppled kiosk. Same rule as the 1.2 crate.
- The caches follow the rule from Level 5: a puzzle whose hero isn't in the party never shows its hint, and a gate never waits on a hero who is out.

## Robin

Robin is a Rogue, in `heroes/robin.ts`, and `HERO_DEFS.robin` replaces the stand-in. Numbers are starting points and stay inside the bands in `tests/balance.test.ts`.

- **Scoop toss** (basic): a lobbed scoop of ice cream that lands on the target, auto-aimed like Dustin's candy (`assist`, `cone`).
  - It flies for 22 frames to a spot up to 72 px out and splashes 16 px around it.
  - Power 0.9 to every enemy in the splash, plus `slow` for 60 frames.
  - `scoop` sfx and fx (the scoop in flight, then the splat).
- **Word vomit** (5 MP): a babble cone in front of her, reach 56, half angle 40 degrees, `babble` sfx and fx.
  - Every enemy inside gets `confuse` for 180 frames (`ActorView.confused` is true while it lasts).
  - A confused enemy forgets the party. It walks to the nearest other enemy, and in reach makes a bump attack (a 20 frame wind-up, then its own ATK times 0.8 against the other's DEF). One shared brain does this (`combat/confuse.ts`), not each enemy's own AI.
  - A boss (Grigori, any spawn in group `boss`) isn't confused. It staggers for 30 frames instead.
  - Hurting a confused enemy doesn't wake it up.
- **Linguist** (Lv 3 talent): confusion lasts 240 frames. Reading cipher doors is her `read` utility, not the talent.
- **Utility:** `read`. **Crit signature:** a wide `babble`.
- **Bot style:** a mid-range hero (hold about 64, reach about 90). It casts Word vomit when three or more enemies are within 56 px.

## Nancy

Nancy is a Gunslinger, in `heroes/nancy.ts`, and `HERO_DEFS.nancy` replaces the stand-in.

- **Pistol** (basic): a steady single shot in eight directions, power 1.1, 4.4 px a frame, reach 160, `pistol` sfx, `bullet` fx.
- **Shotgun** (7 MP): five pellets across a 50 degree cone, reach 72, 5 px a frame, power 0.6 each, knockback 4. Up close all five hit. `shotgun` sfx and a `spark` at the muzzle.
- **Trap kit** (Lv 3 talent): the design's version drops a trap on a dash, and the game has no dash. Instead, each Shotgun also drops a bear trap at her feet.
  - It lasts 600 frames, at most two at once, drawn as a `trap` fx.
  - The first non-boss enemy to step on it is held for 120 frames (it can't move or attack) and takes power 0.8.
- **Utility:** `shoot`. The design also gives her `burn`, from the Lv 6 Molotov. No hero has Lv 6 talents yet, so it waits for them.
- **Crit signature:** a long `bullet` streak.
- **Bot style:** a ranged hero (hold about 90, reach about 150). It casts Shotgun when an enemy is within 40 px.

## New enemies

HP, ATK and DEF are sized for the party that really arrives at chapter 3, so the chapter's stages keep `enemyMult` near 1, as chapter 2 did. A chained bot run through 1.1 to 2.3 ends with Mike at Lv 6, Dustin and Lucas at 5, Eleven, Max and Steve at 4 and Will at 3, so the recruit rule brings Robin and Nancy in at Lv 3. A Lv 6 Mike has about 83 HP and 16 ATK. Numbers are starting points. Tune them inside "Targets", not the targets themselves.

| Enemy | HP | ATK | DEF | Speed | XP | Behavior |
|---|---|---|---|---|---|---|
| Melting rat (`melter`) | 30 | 26 | 2 | 1.3 | 4 | Swarms like the rat: a 24 frame wind-up, then a short lunge bite (power 0.75). When it dies, by any means, it bursts: a 22 px `goo` splash (power 0.5, `slow` for 60 frames) and `melt`. Kill it from range, or with area attacks |
| Flayed (`flayed`) | 90 | 32 | 4 | 0.55 | 11 | Shambles at the hero. In reach (22 px), a 30 frame wind-up under the "!", then a 10 frame reach forward. On contact it grabs the active hero (`grab` sfx, pose `grab`), who is held for 40 frames: no moving, no attacking. The grab deals power 0.8, then a shove (knockback 3) at the end. A swap frees the held hero, and the incoming hero gets the swap's usual invulnerability. A hit on the Flayed with knockback 3 or more frees the hero too (Nancy's Shotgun, Eleven's Push, Steve's third swing). Then it recovers for 40 frames |
| Russian soldier (`soldier`) | 70 | 30 | 5 | 0.8 | 12 | See `docs/level-8.md`, "The soldier" |

- **Rising from goo.** A dormant Flayed rises when its group wakes: pose `rise` for 40 frames, where it can't be hit and doesn't attack, then it hunts. A Flayed that starts awake just walks. gfx draws a dormant Flayed as a goo puddle.
- Elites follow the usual rule (more HP and damage, faster, double XP). An elite Flayed's hold lasts 50 frames.

## Spawns and the XP budget

| Group | Enemies | Notes |
|---|---|---|
| `vent` | 5 melting rats | the west concourse, out of the vent |
| `court` | 6 melting rats, 2 Flayed | dormant in the court. The Flayed rise from the goo |
| `crowd` | 4 Flayed, an elite Flayed | the east concourse |
| `door` | 2 soldiers | the service corridor |
| `amb1`, `amb2`, `amb3` | 3 Flayed and 3 melting rats, 2 Flayed and 4 melting rats, 3 Flayed (one elite) and 2 melting rats | dormant in the dock's goo, waves |

Count the XP from `ENEMY_DEFS` and keep the total between 170 and 210. A test enforces it.

Items:
- three Eggos (one in each cache, one before the dock)
- two Cokes
- 14 quarters, some in the caches

Props:
- lights: `lights_entry`, `lights_court`, `lights_service`
- gates: `shutter1`, `panel1`, `crack1`, `crate1`
- npc: `erica` (her npc id is `erica`)

Spawn ids are unique across enemies, items and props.

## Erica and the stash

- Erica is an npc here (`CharId` `erica`, a kid body) and runs the cart on the map (see "Erica's cart" in `docs/map-screen.md`).
- **The stash.** What the party bought rides along: `SimOptions.stash` holds `{ eggo, coke }`, at most three of each. The sim spends it by itself (`combat/pickups.ts`):
  - **An Eggo** is eaten when the active hero is standing and drops under 25 percent HP, at most once every 120 frames. It heals like a picked-up Eggo (`EGGO_HEAL`), with an EGGO floater and `stash`.
  - **A Coke** is drunk when Special is pressed and the active hero has less MP than the special costs. It gives MP like a picked-up Coke (`COKE_MP`), and the special fires on that same press if there is enough MP now.
  - Each use emits `{ t: 'stashUsed', item }`. The play scene writes it to progress at once, so a retry never gives an item back.
  - `HudView.stash` holds what's left.
- **The purse.** Quarters carry between stages now. `SimOptions.purse` is what the party walked in with. The HUD's COINS shows the purse plus what this run has picked up. A clear adds the run's quarters to `Progress.purse`.

## Targets

The same bands as `docs/level-3.md`, "Targets", measured with `node scripts/measure-stage.ts 3.1 chief 20`. The average time is 90 to 150 s, and "boss" in the script's output is the ambush.

## Bot

- `waypoints` walk the route.
- The bot opens `shutter1` by flag where it reaches it, as 1.3's bot opened the fire door. The route skips both caches.
- The ambush is real.
- Robin and Nancy follow their bot styles above.

## What Art draws for this level

Art builds only after the owner picks from the variation sheets (see "Variation sheets"). The owner picked **Sailor** for Robin, **Overalls** for Nancy, **Boss** for Erica and **Confetti** for the mall, after closing (`src/gfx/var/mall_confetti.ts`). The base under it takes the **Brass** look instead of Confetti's own (see `docs/level-8.md`). Thin the confetti on the floor a little, so the heroes and foes still read on it.

- The mall tiles in `core/tiles.ts` (`mallfloor` to `lift`), with variants so the concourses don't look stamped. They must survive the night remap (`tests/night.test.ts` runs every tile name through it). The stand-ins in `gfx/tile_objects.ts` (`PLACEHOLDER`) go once each tile is painted.
- Props:
  - `shutter`: a rolling grille, shut, then rolled up out of sight when `open`
  - `firebox`, `crack`, `crate`: the existing art, recolored to sit in a mall if needed
- Robin and Nancy as heroes: walk, attack and cast in four directions, KO. Robin's scoop and Nancy's pistol and shotgun read in the attack and cast frames. Both get portraits with the five expressions.
- Erica: an npc sprite on the kid body and a portrait with the five expressions.
- The melting rat (walk, wind-up, melting as it dies), the Flayed (shamble, wind-up, `grab`, `rise` out of a goo puddle, and the puddle it waits as), and the soldier (see `docs/level-8.md`).
- FX: `scoop`, `babble`, `bullet`, `goo`, `trap`.
- A `?sheet=1` page for the mall, Robin, Nancy, Erica and the new foes.
- The map (see `docs/map-screen.md`, "Chapter three on the map").

## What Audio makes for this level

- `starcourt`: C Lydian, 118 bpm, bright mall pop. The Hawkins motif comes back in Lydian, its raised fourth up front. Base and combat layers, like every area track. The design's "sours near the boss" is for 3.3 and waits.
- Robin's and Nancy's tag-in stingers (the stand-ins in `audio/tracks/jingles.ts` go).
- Speech blips: Robin a fast high pulse, Nancy a triangle, Erica a quick bright square (the stand-ins in `audio/cues.ts` go).
- Effects: `pistol`, `shotgun`, `scoop`, `babble`, `melt`, `grab`, `stash`, `buy` (the stand-ins in `audio/sfx_levels78.ts` go). `rifle` and `decode` are in `docs/level-8.md`.

## Variation sheets

The owner picks the look before Art builds. Art makes three standalone pages at the project root, drawn with the game's own renderer and palette (the way `heroes2-variations.html` imports from `/src`). Each option is shown at 1x and zoomed, with a short name to pick it by.

- `heroes3-variations.html`: four designs each for Robin, Nancy and Erica, each the sprite in four directions with a walk frame, plus the portrait.
- `mall-variations.html`: five looks for Starcourt. Each is one sample mall room (floor, cap and wall, shop fronts and a shutter, the fountain, a planter, the Scoops counter, goo, by day or after closing as the look says) beside a matching sample base room for 3.2 (see `docs/level-8.md`).
- `grigori-variations.html`: see `docs/level-8.md`.
