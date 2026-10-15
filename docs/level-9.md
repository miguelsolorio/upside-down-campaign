# Level 9 spec: stage 3.3, the food court

One stage, five to eight minutes, and the end of chapter 3 and of this build. The night of July 4th, 1985, back up in Starcourt. The freight lift from the base comes up behind the food court, where Hopper splits off to go down to the Key with Joyce. The party fights through the kitchens, the lower concourse and the balcony to the food court, where Flayed Billy waits. When he falls, Eleven reaches him, and the Mind Flayer comes in through the skylight. When it dies, the machine below blows up with Hopper beside it, and the chapter ends on his letter. Sim builds Billy, the reach, the Mind Flayer and its legs, the pools and the `leave` step. Art draws the food court, Billy, the Mind Flayer and the epilogue. World builds the map, the beats and the words. Audio writes `sour` and the new effects. UI builds the epilogue, the leg pips and the chapter title. Ids below are fixed. Every agent reads this file, `docs/level-7.md` (the melting rat, the Flayed, the mall), `docs/level-3.md` (the pinned boss and its finisher) and `docs/technical-architecture.md`. Types are in `src/core/types.ts` and `src/world/types.ts`, tile chars in `src/core/tiles.ts`.

## Owner's calls (2026-10-15)

- **Party:** picked on the map from the nine. Eleven is locked in: she pushes the route's crate, and only she can reach Billy.
- **Hopper:** an npc at the start. He leaves to go down to the Key (the `leave` step). He is gone when the machine blows (the `boom` step), and he doesn't come back. He isn't playable yet: chapter 4 builds his kit for 4.1.
- **The Mind Flayer:** hit the legs (see "The Mind Flayer").
- **Billy:** phase one of the boss, in the same arena. One save point, two bars in a row.
- **The chapter end:** a short epilogue (Hopper's letter, read by Eleven), then CHAPTER THREE CLEAR with the feedback note, then the map. Nothing is shown ahead on the map.

## Shape

- Map: about 48 by 40 tiles in `src/world/stages/stage33.ts`, spawns in `stage33_data.ts`. The outer ring is solid. Food court walls are a `stallcap` row over a `stall` row facing the floor below. Mall walls are the 3.1 ones.
- Route, one main path with side pockets for items:
  - the service hall (start, south-west), where the freight lift (`lift`) comes up from the base
  - the kitchens, going east behind the stalls, with the walk-in freezer behind `crack1` (the cache)
  - the lower concourse, going north up the east side
  - the escalators up, with `crate1` across their top
  - the balcony ring round the food court, from the east round to the north
  - the food court (end, north-west), an arena about 22 by 14 tiles under the skylight, with `door1` and `door2` across its two doorways off the balcony
- Light: `time: 'night'`, the owner's pick from `foodcourt-variations.html`, under the Confetti mall: pools at the `lights` entries on the stalls' menu boards, the exit signs and the moonlight through the skylight, and at the lights props.
- Music: `starcourt` from the start. The `sour` beat switches to `sour`, and the `billy` beat to `clock` for both phases. A retry carries the last switch on (`musicAfter` in `world/triggers.ts`).
- Party: picked on the map from the nine, Eleven locked (`REQUIRED` in `core/campaign.ts`). `?stage=3.3` starts the party a real run brings: Mike (lead) at Lv 7, Dustin 6, Robin 4 and Eleven 3 (`ARRIVAL`, from `node scripts/measure-campaign.ts chief 40`). Eleven walks in at the level chapter 1 left her, since the run plays 3.1 and 3.2 without her.
- `enemyMult` and `xpMult`: see "Result".
- Dialogue is off by default. Gate hints work as in every level (see `docs/level-1.md`, "Puzzle hints").

## Rooms

| Room | Floor | Dressing | What happens |
|---|---|---|---|
| Service hall | `servicefloor` | the `lift`, `pipe`s, stacked boxes | Start, `lights_hall`, Hopper (npc `hopper`). Nothing hostile |
| Kitchens | `kitchenfloor` | `fryer` lines, `counter`s | Melting rats. `crack1` (Steve) closes off the walk-in freezer, the cache |
| Lower concourse | `mallfloor`, `mallband` | `shopfront`s and `shopshut`s, `planter`s, `goo` | A Flayed crowd. `lights_concourse` at its north end |
| Escalators | `escalator` | `railing`s either side | `crate1` (Eleven), a toppled kiosk across the top. Past it the music sours |
| Balcony | `mallfloor`, `goo` | the `railing` over the court, `planter`s | Melting rats, and Flayed rising from the goo. `lights_balcony`, the save point for the fight |
| Food court | `foodfloor`, `foodband`, `skyfloor`, `goo` | stalls on the north wall (`stallcap` over `stall`), `table`s pushed to the walls | `door1`, `door2`. Billy, then the Mind Flayer |

The goo thickens as you go: a corner of the concourse, most of the balcony, and it creeps across the court's floor while the Mind Flayer is up (Art's call how).

## Beats

World triggers them and writes the scripts.

| Beat | Where | Script id | What happens |
|---|---|---|---|
| `start` | the lift | `l9_start` | Safe start. Hopper says where he's going. Then `leave` `hopper`. `lights_hall` is the first save point |
| `kitchen` | the kitchens' doorway | `l9_kitchen` | Script only |
| `crack_hint` | in front of `crack1` | `l9_crack_hint` | Arrival beat of the freezer cache |
| `crack_done` | event `propCleared` on `crack1` | `l9_crack_done` | Script only |
| `concourse` | the concourse's south end | `l9_concourse` | Script, then `wake` `crowd` |
| `crate_hint` | in front of `crate1` | `l9_crate_hint` | Arrival beat of the PUSH puzzle |
| `crate_done` | event `propCleared` on `crate1` | `l9_crate_done` | Script only |
| `sour` | the top of the escalators, needs `crate_done` | `l9_sour` | `music` `sour`, the script |
| `balcony` | the balcony, needs `sour` | `l9_balcony` | Script, then `wake` `balcony`. `lights_balcony` is the third save point |
| `billy` | arena rect, needs `balcony` | `l9_billy` | `close` `door1`, `close` `door2`, `music` `clock`, the script, `wake` `boss` |
| `billy_down` | event `pinned` on spawn `billy` | `l9_billy_down` | Arrival beat of the reach puzzle |
| `billy_freed` | cleared `boss` | `l9_billy_freed` | The script (the beach), then `wake` `flayer` |
| `level_clear` | cleared `flayer` | `l9_clear` | `boom`, the script, `open` `door1`, `open` `door2`, `finish` |

Scripts: `l9_start`, `l9_kitchen`, `l9_crack_hint`, `l9_crack_done`, `l9_concourse`, `l9_crate_hint`, `l9_crate_done`, `l9_sour`, `l9_balcony`, `l9_billy`, `l9_billy_down`, `l9_billy_freed`, `l9_clear`, and the epilogue, `l9_letter`.

- Hopper is gruff and soft underneath, and in a hurry. He doesn't say goodbye in so many words.
- Billy (speaker `billy`) never speaks while he fights. He gets one short line in `l9_billy_freed`, once he's free.
- Eleven carries `l9_billy_freed`: she reached him with a memory of a summer day at the beach that wasn't hers. Keep it short.
- In `l9_clear` the floor shakes, the lights die, and somebody asks where Hopper is. Nobody answers.
- `l9_letter` is Hopper's letter to Eleven, read in his voice (speaker `hopper`), with one line of Eleven's at the end. Six to eight lines. Write it new: no line, phrase or paraphrase of the show's letter.
- Every line is original, fits three rows of 32 characters and has no em dashes.

## Puzzles

Listed in `puzzles` in `stage33.ts`, in this order.

| Id | Beat | Prop | Hero | Hint |
|---|---|---|---|---|
| `crack` | `crack_hint` | `crack1` | steve | MAYBE STEVE SHOULD TRY HIS NAIL BAT |
| `crate` | `crate_hint` | `crate1` | eleven | MAYBE ELEVEN SHOULD TRY HER SHOVE |
| `reach` | `billy_down` | `billy`, `enemy: true` | eleven | MAYBE ELEVEN CAN REACH HIM |

- `crack1`: prop `crack`, across the freezer's door. The cache rule from Level 5: a puzzle whose hero isn't in the party never shows its hint.
- `crate1`: prop `crate`, `pushBy: 'push'`, 32 by 16, the toppled kiosk. Eleven is locked in, so the route can wait on her.
- `reach`: the caret follows the pinned Billy, and his death solves it. A hit on him while he kneels is a `poked` with `propId: 'billy'`, as with the pinned Demogorgon.

## Billy

`EnemyKind` `billy`, in `src/enemies/billy.ts`. One spawn, id `billy`, group `boss`, dormant until the `billy` beat. A teen body, a size up like Grigori (a 24 px cell), so he looms. Numbers are starting points against the chapter 3 numbers. Tune them inside "Targets", not the targets themselves.

| HP | ATK | DEF | Walk | XP |
|---|---|---|---|---|
| 700 | 30 | 6 | 1.1 | 60 |

- **He hunts the active hero,** faster than anything else in chapter 3.
- **Charge.** About every 200 frames, when the hero is 60 to 160 px away with a clear line: a 24 frame wind-up under the "!" (pose `charge`, `lunge` sfx), aimed where the hero stands when it ends. Then a straight run at 3.6 px a frame for up to 160 px. Contact deals power 1.0 with knockback 5. If he hits a solid tile or prop, he's stunned for 60 frames (pose `stun`, `thud` sfx) and takes ×1.5 meanwhile. That's the window to punish him.
- **Grab.** Inside 26 px, about every 240 frames: a 16 frame wind-up, then he holds the hero for 50 frames (pose `grab`, `grab` sfx), power 1.0, then a throw (knockback 6). A swap frees the held hero, as with the Flayed.
- **Jabs.** Otherwise, inside 24 px, two quick jabs: a 12 frame wind-up, then two hits of power 0.6, eight frames apart. Recover 30 frames.
- **Rage at 50 percent HP.** He charges every 140 frames at 4.2 px a frame and calls two Flayed in round him (run-time spawns like the Alpha's pack: awake at once, 1 XP each, back on every retry).
- **The boss rules.** Word vomit staggers him for 30 frames instead of confusing him, Nancy's traps don't hold him, and knockback moves him a quarter as far.
- **Pinned at 0 HP.** He doesn't die. He kneels (pose `pinned`), stops attacking, and the sim emits `{ t: 'pinned', spawnId: 'billy' }` once. Hits do nothing and report a `poked`. The Flayed he called keep fighting.
  - **The reach.** While Eleven is the active hero, is standing and stands within 32 px of him, `ActorView.k` climbs by 1/60 a frame. Otherwise it falls by 1/120 a frame toward 0. At 1 he is freed: `reach` sfx, a `reveal` fx, and he dies (the kill, his XP, `groupCleared` `boss`).
  - A KO'd Eleven stands back up when the party tries the reach, as for a gate only she can open.
  - Freed, the veins fade from his skin and he slumps where he knelt. He stays on the floor as scenery for the rest of the stage (gfx draws him from the kill's position).
- **Boss bar.** While he's awake and above 0 HP, `hud.boss` is `{ name: 'BILLY', hp, hpMax }`.
- **Bot.** It sidesteps the charge line during the wind-up (as against the Demogorgon), punishes the stun, backs off a grab wind-up, and when he's pinned, swaps to Eleven and walks up to him. No flag shortcut.

## The Mind Flayer

`EnemyKind` `flayer` (the body) and `flayerleg` (a leg), in `src/enemies/flayer.ts` and `flayer_legs.ts`. One body, id `flayer`, and four legs, `leg1` to `leg4`, all in group `flayer`, dormant until `billy_freed` wakes them. The body sits on the arena's north wall over the stalls, and the legs' roots are spread along its front.

| | HP | ATK | DEF | XP |
|---|---|---|---|---|
| Body | 1600 | 30 | 6 | 120 |
| Leg | 180 | 30 | 4 | 0 |

- **It comes in through the skylight.** On waking the body is in pose `rise` for 40 frames: a `glass` fx, `shatter` sfx, and nothing can hit it or its legs. Then it fights.
- **It never moves.** The body and the legs are rooted. Knockback, Push and the candy bar do nothing to them.
- **Legs slam down lines.** One leg at a time, about every 70 frames, picks the active hero:
  - **Warn** for 40 frames: pose `warn`, `ActorView.aim` is the tip of its line, from the leg's root through where the hero stood, 150 px long. gfx draws the line on the floor.
  - **Slam:** pose `slam` for 12 frames, `legslam` sfx, a `slam` fx at the tip. Any hero inside 12 px of the line takes power 1.2 with knockback 5.
  - **Pool:** a goo pool where the tip landed (`SimView.pools`): radius 20 px, 480 frames, at most four (a fifth replaces the oldest). The active hero standing in one gets `slow` and power 0.15 every 30 frames.
  - Then the leg rests 30 frames, with its tip on the floor and open to hits.
- **Cut the legs.** A leg at 0 HP is `severed` (pose `severed`, `sever` sfx): it can't be hit and doesn't slam, but it isn't dead.
- **The head comes down.** With all four legs severed, the body is in pose `down` for 300 frames: its head is on the floor in front of it and takes ×1.5. Then it rises, and every leg grows back at full HP.
- **The body is shielded while it is up.** A hit on the body with any leg standing does nothing: a `block` spark and the `block` sfx.
- **Flayed waves.** While the head is up, two Flayed come in from the arena's sides every 540 frames (run-time spawns from `burrows`, 1 XP each), at most three alive.
- **Under 50 percent.** The warn drops to 28 frames and two legs slam at once. About every 480 frames a leg sweeps: a band 24 px tall right across the arena is warned for 40 frames, then any hero in it takes power 1.0 and knockback 4.
- **It dies all at once.** At 0 HP the body and all four legs die together, so `groupCleared` `flayer` fires once and a retry's kill list never holds a leg by itself.
- **The boss rules.** Word vomit staggers a leg for 30 frames (its slam waits), and nothing confuses the body. Traps don't hold either.
- **Boss bar.** While it's awake, `hud.boss` is `{ name: 'MIND FLAYER', hp, hpMax, parts }`. `parts` holds the four legs' HP shares, 0 when severed. The HUD draws them as four pips under the bar.
- **A wipe** retries from `lights_balcony` with Billy still freed: the doors close, and the Mind Flayer comes in again at full health.
- **Bot.** It steps off a warned line and out of a sweep's band, stays out of pools, hits the nearest leg that isn't warning, and hits the head while it's down. No flag shortcut.

## Spawns and the XP budget

| Group | Enemies | Notes |
|---|---|---|
| `kitchen` | 5 melting rats | among the fryers |
| `crowd` | 4 Flayed, an elite Flayed | the lower concourse, dormant until `concourse` |
| `balcony` | 3 melting rats, a Flayed | dormant in the balcony's goo. The Flayed rises |
| `boss` | Billy `billy` | dormant in the court |
| `flayer` | the Mind Flayer `flayer`, `leg1` to `leg4` | dormant on the north wall |
| `billys` | 2 Flayed | run-time, called when Billy rages |
| `waves` | 2 Flayed at a time | run-time, while the Mind Flayer's head is up |

Count the XP from `ENEMY_DEFS` before `xpMult` and keep it between 270 and 320. A test enforces it. `xpMult` then sets what the stage pays, so the lead ends chapter 3 at Lv 8 (`docs/pace.md`).

Items:
- four Eggos (one in the freezer, one on the balcony)
- three Cokes
- 12 quarters

Props:
- lights: `lights_hall`, `lights_concourse`, `lights_balcony`
- gates: `crack1`, `crate1`, `door1`, `door2`
- npc: `hopper`

`door1` and `door2` are `door` props spawned `state: 'open'` and `solid: false`, closed by the `close` step and opened again at the clear.

## The chapter end

- **The `boom` step** (in `level_clear`): the `boom` sfx, a long screen shake (about 90 frames), and every lit lights prop goes dark. Only the look changes.
- **The epilogue.** `flow.ts` plays it after the clear, before the results, the first time a chapter's last stage is cleared, unless the story is off (like the prologue and the chapter cards). It's `story/epilogue.ts`, playing `EPILOGUES[3]`, which is `l9_letter`. UI dresses it (see "What UI builds").
- **The results.** Every chapter's last stage says CHAPTER ONE CLEAR, CHAPTER TWO CLEAR, CHAPTER THREE CLEAR (`closesChapter` in `core/campaign.ts`). The last stage of the build keeps the feedback note under it.
- **The map.** 3.3 is in `STAGE_ORDER` and `STAGES_AHEAD` is empty. With 3.3 cleared every node is cleared, and the token waits on the food court.

## Targets

The same bands as `docs/level-3.md`, "Targets", measured with `node scripts/measure-stage.ts 3.3 chief 20`. "Boss" in the script's output runs from the `billy` beat to the finish, both phases and the reach. The fight is about half the run.

## Bot

- `waypoints` walk the route. The bot opens `crate1` by flag (`open`), like the other gates. The route skips the freezer.
- Billy, the reach and the Mind Flayer are real.
- The last waypoint is inside the `billy` trigger.

## What Art draws for this level

Art builds only after the owner picks from the variation sheets.

- The food court tiles in `core/tiles.ts` (`foodfloor` to `escalator`), with variants. They must survive the night remap. The flat stand-ins in `gfx/tile_food.ts` go.
- Props: `crack`, `crate`, `door` and `lights`, recolored for the food court if needed.
- Billy, from the picked design, a size up (a 24 px cell): walk in four directions, the charge wind-up and run, `grab`, `stun`, `pinned` (kneeling, the veins fading as `k` climbs), and slumped. A portrait with the five expressions, for `l9_billy_freed`.
- The Mind Flayer, from the picked design: the body (idle, `rise` through the skylight, `down` with its head on the floor), four legs drawn as pixel-snapped lines from root to tip (idle, `warn`, `slam`, `severed`), and the warned line and sweep band on the floor. It is the biggest thing in the game, so it fills the arena's north wall.
- Goo pools (`SimView.pools`), creeping and fading.
- FX: `slam` (a leg striking) and `glass` (the skylight breaking).
- The epilogue's still (see "What UI builds").
- A FOOD COURT plate on the map, like STARCOURT's.
- A `?sheet=1` page for the food court, Billy and the Mind Flayer.

## What Audio makes for this level

- `sour`: Starcourt going sour, for the climb to the court. The same notes, so it's still C Lydian in the score, on detuned and wobbling instruments, a little slower, with the lead sagging flat at the ends of phrases. Base and combat layers like every area track.
- Effects: `legslam`, `sever`, `shatter`, `boom`, `reach` (the stand-ins in `audio/sfx_level9.ts` go). `lunge`, `thud`, `grab`, `block` and `melt` already exist.
- Billy's speech blip: a low, rough square that drops at the end (the stand-in in `audio/cues.ts` goes).

## What UI builds for this level

- The epilogue scene (`story/epilogue.ts`): a still behind the dialogue box (Eleven's room in boxes, the letter in her hands, Art draws it), a slow fade in and out, the letter played through the shared dialogue box. Skip skips it.
- The leg pips under the boss bar, from `hud.boss.parts`.
- The chapter title on the results is in the spine. Check that it fits and reads.

## Variation sheets

The owner picks the look before Art builds. Art makes three standalone pages at the project root, drawn with the game's own renderer and palette (the way `grigori-variations.html` imports from `/src`). Each option is shown at 1x and zoomed, with a short name to pick it by, and each option's canvas carries `data-snap` so it exports as its own image.

- `billy-variations.html`: five designs for Flayed Billy, each with the walk, the charge, the grab and the kneel, on the teen body a size up, next to Steve and Max for scale, plus the portrait.
- `flayer-variations.html`: five designs for the Mind Flayer, each as it fills a sample arena's north wall with two heroes for scale: idle with its legs out, a leg warning and slamming, and its head down with the legs severed.
- `foodcourt-variations.html`: four looks for the food court at night, each a sample arena corner (the floor, its band, the patch under the skylight, a stall front with its cap, tables, goo) beside a sample kitchen and a run of escalator, next to a Confetti mall tile for continuity.

## Result

Filled in after tuning.
