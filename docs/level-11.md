# Level 11 spec: stage 4.2, the Hellfire Club and the Creel House

One stage, five to eight minutes. Spring 1986, back in Hawkins. Eddie Munson joins the party in the Hellfire Club, Max gets her Walkman back, and the party crosses town at night to the Creel House, where Creel ghouls step out of haunted mirrors and a grandfather clock teaches the curse that runs through the rest of the chapter. The stage ends when the party gets out of the house. Sim builds Eddie, the ghoul, the mirrors, the clock, the curse and the Walkman. Art draws Eddie, the ghoul, the Hellfire Club in Storm, the Creel House in Abandoned with its Blood red memory skin, the mirrors and the clock. World builds the map, the beats and the words. Audio writes the new effects and Eddie's voice. UI builds the curse and the Walkman on the HUD, and picks with ten heroes. Ids below are fixed. Every agent reads this file, `docs/chapter-4.md`, `docs/level-10.md` (Hopper, and what chapter 4 changed in the campaign), `docs/level-7.md` (the picks and the stash) and `docs/technical-architecture.md`. Types are in `src/core/types.ts` and `src/world/types.ts`, tile chars in `src/core/tiles.ts`.

## Owner's calls (docs/chapter-4.md)

- **Party:** four picked on the map from everyone the save has. Eddie joins at the start, in the Hellfire Club.
- **Eddie:** the Hellfire Club look, the Flying V swing, the Hellfire solo, `riff` opens the haunted mirrors. He plays 4.2 and 4.3 only.
- **The Creel House:** one tile set in three skins. Abandoned is the house now (this stage). Blood red is the house in memory, and only the 4.2 curse beat turns a room to it.
- **The clock curse is taught here,** in one scripted beat, and there is no random curse in 4.2 after it.
- **Max's Walkman** is a story item she gets back in 4.2. With Max in the party, swapping to her plays it: 8 s in which the party ignores the curse, and any curse already counting is cleared, then a 30 s cooldown.
- **Looks:** Eddie in the Hellfire Club, the room in Storm, the house in Abandoned with Blood red for memory, the ghoul as the Glass wraith.
- **Music:** `hawkins`.

## Lead's calls (2026-10-18)

- **Eddie is locked in** (`REQUIRED`): the route's first mirror needs his riff, and he joins here. He walks in at the level of the party he joins, averaged, less one, the recruit rule as the chapter doc words it (`CATCH_UP`), not the average of the whole pool, which the heroes left behind in chapter 2 drag down.
- **Hopper is not in the pool.** He is in Kamchatka. The pool is the nine of chapter 3 and Eddie.
- **The solo is a stand-in.** The note highway is a module of its own, built by the session that runs the build (`src/solo/`), and plugged in later. 4.2's solo is a six second stand that pulses a ring of damage, with the seam ready for the module (see "The Hellfire solo").
- **The Hellfire bond** (Eddie with Dustin: the solo lasts 2 s longer) is built. It is the first bond in the game; the others are still unbuilt.
- **Hellfire DM** (Lv 6) marks a boss or an elite Eddie hits, and the party's hits on it deal more. Eddie can reach Lv 6 in 4.2; there is an elite ghoul in the finale.
- **The two ways out** taught in 4.2 are Max's Walkman and breaking the clock that chimed (the riff at once, or three hits from anyone), as 4.3 will use it. The memory orb waits for 4.4.
- **Who the curse takes:** the active hero, unless that is Eddie or Max, then the next standing hero who is neither, so the lesson always has someone to save.
- **The Walkman is the save's** as soon as the beat plays, whoever is in the party (`Progress.walkman`).
- **Stage name:** The Creel House. The map plate says CREEL HOUSE.

## Shape

- Map: about 48 by 40 tiles in `src/world/stages/stage42.ts`, spawns in `stage42_data.ts`. The outer ring is solid.
- Route, one main path with side pockets:
  - the Hellfire Club (start, south-west), a classroom at Hawkins High after hours
  - the school hall, east, with lockers and the trophy case (1.3's school tiles)
  - out the doors, a stretch of Hawkins street at night (1.1's and 2.1's town tiles): the sidewalk, the road, lamps, houses, trees
  - the Creel House's yard (north-east), overgrown, with a dead tree and the porch
  - inside: the foyer, with `mirror1` across the doorway to the hall
  - the hall, with mirrors on its walls, and the dining room off it, where `mirror4` closes a pantry (the cache)
  - the parlor, the memory room: the grandfather clock `clock1` and two mirrors
  - the back hall (end), three mirrors and `door_back`, the way out
- Walls: the club's are a `clubcap` row over a `clubwall` row; the house's a `creelcap` row over a `creelwall` row.
- Light: `time: 'night'`. Candles on the D&D table (the room's only warm light), the windows' storm light, the street lamps, the moonlight through the house's boarded windows, the lights props.
- Music: `hawkins` throughout.
- Party: picked on the map from the ten, Eddie locked. `?stage=4.2` starts the party a real run brings (`ARRIVAL`, from the run).
- `memory`: the parlor's tile rect. The play scene draws it in the Blood red skin while a curse counts (see "The curse").
- `enemyMult` and `xpMult`: see "Result".

## Rooms

| Room | Floor | Dressing | What happens |
|---|---|---|---|
| Hellfire Club | `clubfloor` | `clubboard`, `clubposter`s, the banner, `clubwindow`s in the storm, `clubshelf`, `clubdesk`s in rows, the `dndtable` with candles | Start, the recruit scene, `lights_club`. Nothing hostile |
| School hall | `schoolfloor` | `lockerwall`, `trophy` | The Walkman beat. Nothing hostile |
| The street | `road`, `roadline`, `sidewalk`, `grass` | `lamp`s, houses, `pine`s, a `fence` | Nothing hostile. An Eggo in a yard |
| The yard | `grass`, `planks` (the porch) | `deadtree`s, `bush`es, the house front | `lights_yard` by the porch |
| Foyer | `creelfloor`, `creelrug` | `creelwin`s, `creelstairs` | `mirror1` across the doorway on, two ghouls in it |
| Hall | `creelfloor`, `creelhole` | mirrors on the walls, `creelfurn` | `mirror2`, `mirror3`, two ghouls each. `lights_hall` at its end, the save point for the curse and the finale |
| Dining room | `creelfloor`, `creelrug` | `creelfurn` under sheets | `mirror4` closes the pantry, the cache, one ghoul in it |
| Parlor | `creelfloor`, `creelrug` | `clock1` on the north wall, `creelfurn` | `mirror5`, `mirror6`, a ghoul each, dormant in `parlor`. The curse beat |
| Back hall | `creelfloor`, `creelhole` | `door_back` in the east wall | `mirror7`, `mirror8`, `mirror9`, dormant in `finale`, and an elite ghoul |

## Beats

World triggers them and writes the scripts.

| Beat | Where | Script id | What happens |
|---|---|---|---|
| `start` | the club | `l11_start` | Safe start. Eddie's recruit scene at the table: "Welcome to the Hellfire Club, freaks." in his own new words. `lights_club` is the first save point |
| `walkman` | at the lockers | `l11_walkman` | The `walkman` step, then the script: Max has her Walkman back, and what it's for comes later |
| `street` | out the school doors | `l11_street` | Script only: across town to the Creel House |
| `yard` | the yard's gate | `l11_yard` | Script only. `lights_yard` is the second save point |
| `mirror_hint` | in front of `mirror1` | `l11_mirror_hint` | Arrival beat of the riff gate: ghouls come out of mirrors, and Eddie can break them |
| `mirror_done` | event `propCleared` on `mirror1` | `l11_mirror_done` | Script only |
| `cache_hint` | in front of `mirror4` | `l11_cache_hint` | Arrival beat of the cache |
| `curse` | the parlor, needs `mirror_done` | `l11_curse` | `curse` `clock1`, `wake` `parlor`, the script: the clock, the chimes, the two ways out |
| `curse_end` | event `curseEnd` | `l11_curse_end` | Script only: the room comes back. `lights_hall` is the third save point |
| `finale` | the back hall, needs `curse_end` | `l11_finale` | Script, then `wake` `finale` |
| `level_clear` | cleared `finale` | `l11_clear` | `open` `door_back`, the script, `finish` |

Scripts: those thirteen.

- Eddie is theatrical and nervous underneath, quick with a D&D line, and the first to joke and the first to flinch. "Welcome to the Hellfire Club, freaks." is a nod: write his own greeting, don't quote it.
- `l11_curse` names the two ways out in character, without keys: break the clock (Eddie's guitar does it at once, anyone else's hits take a few), or Max's music, if Max has her Walkman and is with them.
- `l11_curse_end` is short: the red goes out of the room, the clock is quiet.
- The story assumes everyone, as in 3.3: any hero may speak, whoever was picked.
- Every line is original, fits three rows of 32 characters and has no em dashes. No line, phrase or paraphrase of the show.

## Puzzles

Listed in `puzzles` in `stage42.ts`, in this order.

| Id | Beat | Prop | Hero | Hint |
|---|---|---|---|---|
| `mirror` | `mirror_hint` | `mirror1` | eddie | MAYBE EDDIE SHOULD PLAY IT A RIFF |
| `cache` | `cache_hint` | `mirror4` | eddie | MAYBE EDDIE SHOULD PLAY IT A RIFF |
| `clock` | `curse` | `clock1` | eddie | MAYBE EDDIE CAN SHATTER THE CLOCK |

- `mirror1`: a `mirror`, 32 by 16, across the foyer's two-tile doorway. `mirror4` closes the pantry the same way. The other mirrors stand on walls and close nothing (`solid` as their wall is).
- `clock`: the hint can come before the fourth chime only if the hint clock is short enough. World checks `HINT_AFTER` against the 15 s a curse takes, and may give this puzzle its own.

## Eddie

`HeroId` `eddie`, in `src/heroes/eddie.ts`. The Warlock. He joins in 4.2 and plays 4.2 and 4.3 only (`docs/chapter-4.md`).

| | |
|---|---|
| Stats | base HP 42, MP 18, ATK 9, DEF 3, SPD 9; growth 6, 2.2, 1.5, 0.9, 0.5; d20 weights 2, 2, 3, 1, 2; speed 1; crit +2% |
| Basic | **Flying V swing:** the guitar swung like an axe, a wide arc. Cooldown 22, 18 frames long, lands on frame 8, power 1.2, reach 30, an arc of 75 degrees either side, knockback 2.6, sfx `vswing`. No chain. Where the arc ends, a small sound ring (fx `riff`, 28 px): power 0.5 to any foe in it the arc missed |
| Special | **Hellfire solo** (9 MP): see below |
| Lv 3 | **Metalhead:** +10% ATK |
| Lv 6 | **Hellfire DM:** his hits mark a boss or an elite for 300 frames (`ActorView.marked`), and the party's hits on a marked foe deal +20% |
| Lv 9 | Encore. Not built |
| Opens | `riff`: the swing's arc and ring, and every pulse of the solo, shatter a haunted mirror or the clock they reach |
| Bond | **Hellfire** (with Dustin in the party): the solo lasts 480 frames, not 360 |
| Voice | Theatrical, nervous underneath. A pulse blip with vibrato |

### The Hellfire solo

The real solo, the note highway with its charts, its timing and the bot's play, is being built by the session that runs the build as a module of its own (`src/solo/`, `createSolo`), and plugs in later. 4.2 ships a plain stand-in with the seam ready for it (`src/heroes/eddie_solo.ts`: start the stand, one pulse with an optional crit, end the stand).

- **The stand.** For 360 frames (480 with Dustin) he plants his feet and plays: anim `cast` the whole time, movement does nothing, and Special does nothing. A swap away ends it. The MP is spent at the start.
- **The pulses.** Every 30 frames the ring round him pulses (fx `riff`, sfx `riff`): power 0.4 and knockback 1.5 to every foe within 40 px, and a 40 frame stun to flyers (4.2 has none; the demobats of 4.3 are flyers). Each pulse is a riff: it opens a mirror or the clock it reaches.
- **No timing yet.** Hits on the beat, perfects, misses, the streak, the ring widening and shrinking, and the feedback that cuts a solo short all come with the module.
- **The view.** `HudView.solo` while he plays: `t`, `life`, `ring` (the radius in px), `beat` (frames to the next pulse), and `streak` 0. The HUD draws nothing for it yet: the module draws its own highway.
- **The bot** casts it with two or more foes within 56 px.

## The ghoul

`EnemyKind` `ghoul`, in `src/enemies/ghoul.ts`. The Creel ghoul, the Glass wraith: a pale woman made of broken mirror, who comes out of the glass. Numbers are starting points against the party a real run brings (Mike Lv 8, ATK about 19, DEF about 13).

| HP | ATK | DEF | Walk | XP |
|---|---|---|---|---|
| 175 | 60 | 4 | 0.8 | 14 |

- **In the glass.** Every ghoul spawn names its mirror (`mirror` on the spawn). It waits in the glass, unseen and untouchable, until its group is awake and a hero is within 80 px of the mirror with a clear line. Then it steps out (pose `rise` for 40 frames, sfx `ghoul`, it can be hit) at the mirror's foot. One ghoul at a time per mirror: the next waits 90 frames after the last stepped out. A dormant spawn's group is woken by a beat; an awake one's group is awake from the start.
- **The mirror breaks first.** A mirror shattered while ghouls wait in it kills them with it: a `kill` with no XP and no drop, so its group can clear and a retry leaves them dead.
- **It drifts.** It floats a little off the floor (it bobs, `z` 1 to 3), straight at the active hero, round walls by the nav grid like any foe.
- **The lunge.** Inside 40 px: a 24 frame wind-up under the "!", then a lunge of 10 frames at 3.2 px a frame. Contact deals power 0.8 with knockback 3. Recover 30.
- **The light hurts it.** Inside 48 px of a lit lights prop it takes x1.5 (Christmas lights, the design's counter).
- **It shatters.** Its death is a burst of glass (fx `glass`, small; sfx `shatter`).
- **The elite** of the finale is the same ghoul, elite (`ELITE` in `enemies/defs.ts`).
- **The bot** steps out of a lunge's line during the wind-up, and fights it like any melee foe.

## Mirrors and the clock

- **`mirror`**, a new `PropKind`: a haunted mirror, hit by `riff` (the default). Solid by default. Eddie's swing, its ring or a solo pulse reaching it shatters it (`propCleared`, sfx `shatter`, fx `glass`), and it is open and walkable after, an empty frame with shards. Nothing else breaks it. `PropView.k` is how many ghouls still wait in it, as a share of those it started with, so gfx can show faces in the glass.
- **`clock`**, a new `PropKind`: the grandfather clock, 16 by 32, solid always. Hit by `riff`: Eddie breaks it at once. Any other hero breaks it with three hits of a basic attack up close (`hits: 3` on the spawn). Broken, it is `open`, drawn smashed, and still solid. Its chime is fx `chime` over it and sfx `chime`.

## The curse

- **The beat.** The `curse` step (`Sim.curse(prop)`) has the clock chime and curses one hero: the active hero, or, if that is Eddie or Max, the next standing hero in party order who is neither. It does nothing if no hero but the one would be left standing, or while the Walkman is on. The sim emits `{ t: 'cursed', hero }`.
- **The chimes.** The first sounds at once, then one every 300 frames. Each one: sfx `chime`, fx `chime` at the clock, and the cursed hero rises a little higher off the floor (`z` 4 per chime). On the fourth the hero is knocked out like any KO (`heroKO`) and the curse ends.
- **The cursed hero** hangs where the curse found them, drawn there with the clock mark and its four pips (`ActorView.curse`, the chimes sounded), benched or not. They can't move, attack or be hurt, and they can't be swapped to. If they were the active hero, the party swaps away at once, as after a KO. The HUD shows the pips on their slot (`PartyHud.curse`).
- **The ways out.** Breaking the clock that chimed lifts its curse at once: the hero floats down and is back on the bench as they were. The Walkman clears it (below). Either way, and on the KO, the sim emits `{ t: 'curseEnd', hero, how }` with `how` `clock`, `walkman` or `ko`, and that clock never chimes again.
- **The room.** While a curse counts on a stage with a `memory` rect, the play scene draws that rect in the Blood red skin (`bakeStage(rows, night, 'memory')`), with a short fade in and out. Only 4.2 has one.
- **A wipe** during the curse retries from the last lights with the curse gone. The `curse` beat fires again if the checkpoint was lit before it.
- **The bot,** while a curse counts and its clock stands: if Max is in the party with the Walkman ready and not cursed, it swaps to her. Otherwise it swaps to Eddie (or keeps whoever is up, if he is down) and goes for the clock. The careless bot does the same: it is the lesson, not a dodge.

## Max's Walkman

- **The beat.** The `walkman` step gives the party the Walkman (`Sim.giveWalkman()`) and the save gets it at once (`PlayOptions.onWalkman`, `Progress.walkman`). Later stages start with it (`SimOptions.walkman`).
- **Playing it.** With the Walkman and Max in the party, a swap to Max while it is ready plays it, forced swaps excepted: sfx `walkman`, fx `walkman` on her, every curse counting ends (`curseEnd`, `walkman`), and for 480 frames no hero can be cursed. It is ready again 1800 frames after it played. The sim emits `{ t: 'walkman' }`.
- **The HUD.** `HudView.walkman` is `{ ready, on }` when the party has it and Max is in the party: `ready` 0 to 1 as it recharges, `on` the frames of protection left. Null otherwise. UI draws it as a small tape icon on Max's slot.

## Spawns and the XP budget

| Group | Enemies | Notes |
|---|---|---|
| `foyer` | 2 ghouls in `mirror1` | awake: they come out as the party nears |
| `hall` | 2 ghouls each in `mirror2` and `mirror3`, 1 in `mirror4` | awake |
| `parlor` | 1 ghoul each in `mirror5` and `mirror6` | dormant until `curse` |
| `finale` | 2 ghouls each in `mirror7`, `mirror8` and `mirror9`, one of them elite | dormant until `finale` |

Count the XP from `ENEMY_DEFS` before `xpMult` and keep it between 230 and 290. A test enforces it. `xpMult` then sets what the stage pays: the lead should end 4.2 about a third of the way from where chapter 3 leaves them to Lv 10 (`docs/pace.md`).

Items:
- four Eggos (one in a yard on the street, one in the pantry)
- three Cokes
- 12 quarters

Props:
- lights: `lights_club`, `lights_yard`, `lights_hall`
- gates: `mirror1`, `mirror4`, `door_back`
- mirrors on walls: `mirror2`, `mirror3`, `mirror5` to `mirror9`
- the clock: `clock1`

`door_back` is a `door` prop, closed and solid, opened at the clear.

## Targets

The same bands as `docs/level-3.md`, "Targets", measured on HARD with `node scripts/measure-stage.ts 4.2 chief 20`. "Boss" in the script's output runs from the `finale` beat to the finish.

## Bot

- `waypoints` walk the route. The bot opens `mirror1` by flag (`open`). The route skips the cache.
- The ghouls, the curse and the finale are real.
- The last waypoint is inside the `finale` trigger.

## What Art draws for this level

- **Eddie, Hellfire Club** (`src/gfx/var/eddie_opts.ts`, `HELLFIRE`): walk in four directions, the swing's wind-up and hit, the two solo frames looping while he plays (anim `cast`), hurt, KO, in the 28 by 22 frame so the Flying V reaches past the cell. His portrait with the five expressions on its dark red ground, the tongue-out grin for happy.
- **The ghoul, Glass wraith** (`src/gfx/var/ghoul_a.ts`): stepping out (`rise`), stand, the drift, the lunge, hurt, and the shatter for its death.
- **The Hellfire Club, Storm** (`src/gfx/var/hellfire_b.ts`): `clubcap`, `clubwall`, `clubboard`, `clubposter`, `clubwindow` (animated: rain and lightning on the glass), `clubdoor`, `clubshelf`, `clubfloor`, `clubdesk`, `dndtable` (the desks pushed together under the cloth, the map, the minis and the dice, the DM screen). The banner over the board is Art's call: a `clubposter` variant or the board's.
- **The Creel House, Abandoned** (`src/gfx/var/creel_a.ts`): `creelcap`, `creelwall`, `creelwin`, `creelfloor`, `creelrug`, `creelhole`, `creelstairs`, `creelfurn`. And the same tiles in **Blood red** (`creel_b.ts`), baked by `bakeStage(rows, night, 'memory')`. Every other tile bakes as it always does in the memory skin.
- **Props:** the `mirror` (whole, with faces in the glass by `k`, and shattered) and the `clock` (whole and smashed), from the Creel sheet's own.
- **FX:** `riff` (a sound ring of w px across, for the swing and the solo's pulses), `chime` (a ring off the clock's face), `walkman` (notes round Max).
- **The curse:** the clock mark over a cursed hero, the Rooted pick's (a dark red rim, a bone face, red for the sounded chimes), with its four pips. The marked foe of Hellfire DM: a small d20 over it.
- CREEL HOUSE on the map (see `docs/map-screen.md`, "Chapter four on the map").
- A `?sheet=1` page for Eddie, the ghoul, the club and the house in both skins.

## What Audio makes for this level

- Effects: `vswing` (a heavy swing with a guitar chord ringing in it), `riff` (one pulse of the solo, a power chord stab), `feedback` (the squeal that cuts the solo short), `chime` (a grandfather clock's low bell, a little wrong), `curse` (a low whoosh as a hero is lifted), `walkman` (a cassette clunk and a bright few notes), `ghoul` (a glassy shriek as one steps out). `shatter` already exists for a mirror breaking.
- Eddie's speech blip: a pulse with vibrato. His stinger for a swap in.

## What UI builds for this level

- **Picks with ten heroes.** The pool is ten: the Grid panel needs a layout for ten (and eleven, for chapter 5). Eddie's gate word is RIFF, Hopper's SMASH.
- **The curse** on the HUD: the pips on a cursed hero's slot.
- **The Walkman** on Max's slot.

## Result

Measured with `node scripts/measure-stage.ts 4.2` on HARD (`chief`) at `enemyMult` 1.5, with the party a real run brings (Mike 8, Dustin 7, Robin 5, Eddie 5). "Boss" runs from the `finale` beat to the finish.

| | Chief, 20 seeds | Chief, 100 seeds | Careless, chief | Careless, 100 | Kid | Upside | NORMAL | NORMAL, careless |
|---|---|---|---|---|---|---|---|---|
| Cleared | 18 | 86, none stuck | 17 | 89 | 20 | 19 | 20 | 20 |
| Damage taken | 278 | 257 | 251 | 237 | 67 | 289 | 207 | 205 |
| KOs | 1.85 | 1.55 | 1.65 | 1.42 | 0.05 | 1.70 | 0.35 | 0.65 |
| Lowest party HP | 34% | 44% | 41% | 47% | 80% | 38% | 55% | 51% |
| Time | 83 s | 81 s | 84 s | 83 s | 75 s | 105 s | 77 s | 78 s |
| Boss time | 26 s (31%) | 24 s (30%) | 28 s | 27 s | 28 s | 42 s | 25 s | 26 s |

Stage XP is 238 before `xpMult` 2.1, so it pays about 500. The lead comes out of 4.2 with about 2050 XP, Lv 8 a hundred short of Lv 9, a third of the way to the chapter's Lv 10.

- **The ghoul was too soft.** At its first numbers (110 HP, 38 ATK) and a factor of 1, the bot cleared every run for 50 damage. It is 175 HP and 60 ATK now, and the stage sits at 1.5.
- **The careful bot's dodge hurt it.** Stepping off every ghoul's lunge gave the next ghoul a free swing: at a high factor the careful bot cleared 5 of 20 and the careless 20. It steps off a lunge now only below half HP (`combat/bot.ts`), and the two bots land within a few runs of each other.
- **The curse ends at the clock in every run.** The bot swaps to Eddie and breaks it. The Walkman never plays in the measured runs, since Max isn't in the default party.
- **The run is short** (about 80 s against 90 to 150): the walk from the club to the house has no fights, by design. The finale is about a third of it.
- **The upside bot clears more than the chief one**: tougher ghouls step out of their mirrors more slowly, so fewer of them stand at once. The bands hold.
- **The finale has seven ghouls, not six,** so the stage's XP clears the 230 floor (World's call). The `curse` beat waits on `mirror_hint` and the `finale` on `curse`, not on the events after them, so a retry with the mirror or the clock already broken can't lock the chain.
