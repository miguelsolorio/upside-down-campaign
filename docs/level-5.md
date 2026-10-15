# Level 5 spec: stage 2.2, the tunnels

One stage, five to eight minutes, under Hawkins in November 1984. Max and Steve join. Sim builds Max, Steve, the `gap` and the `crack`. Art draws the tunnels and the new heroes. World builds the map, the beats and the words. Audio scores the new moves. Ids below are fixed. Every agent reads this file and `docs/technical-architecture.md`. Types are in `src/core/types.ts` and `src/world/types.ts`, tile chars in `src/core/tiles.ts`.

## Shape

- Map: about 48 by 40 tiles in `src/world/stages/stage22.ts`, spawns in `stage22_data.ts`. The outer ring is solid. Root walls are a `tunnelcap` row (`2`) over a `tunnelwall` row (`3`) facing the floor below, like the Lab.
- Route, one main path with side pockets for items:
  - the drop (start, north-west), where the hole from 2.1 comes down, with a shaft of daylight
  - the root halls, going east
  - the first gap
  - the nest, a chamber of pods
  - the junction: a dead end north behind Steve's crack (the cache), the way on east
  - the long hall south, with two more gaps
  - the hub (end, south-east): a big cavern, the ambush, and the ladder up
- Halls are two or three tiles wide. Chambers are bigger.
- Light: `time: 'night'`. Pools at `lights` entries: the shaft at the drop, each cluster of glowing `veins`, and the lights props.
- Music: `upside`.
- Party: picked on the map from Mike, Dustin, Lucas, Will, Max and Steve (see "Party picks" in `docs/map-screen.md`). Max is locked in. `?stage=2.2` starts Mike (lead) at Lv 5, Dustin 4, Max 3, Steve 3, with the XP a run brings (`defaultParty` in `core/campaign.ts`).
- `enemyMult`: start at 1 on the chapter 2 enemy numbers and set it by measuring (see "Targets").
- Dialogue is off by default; gate hints work as in every level (see `docs/level-1.md`, "Puzzle hints").

## Rooms

| Room | Floor | Dressing | What happens |
|---|---|---|---|
| The drop | `tunnelfloor`, `roots` | the shaft of light, dirt and dead corn fallen from the hole | Start and `lights_drop`. Max and Steve are with the boys |
| Root halls | `tunnelfloor`, `veins` | `roots`, a `nest` or two | Two young demodogs, two vines |
| The first gap | `tunnelfloor` | `gap1` across a two-wide hall | The DASH puzzle. Nothing hostile on the far side |
| The nest | `veins`, `roots` | `nest` tiles all round | Pods and vines. `lights_nest` |
| The junction | `tunnelfloor` | three ways | North: a dead end, `crack1` across its mouth, the cache behind it. East: the way on |
| Long hall | `tunnelfloor` | `gap2` and `gap3` | A pack beyond `gap2`, another before the hub |
| The hub | `veins`, `tunnelfloor` | a big cavern, `nest`s, the `ladder` in the far corner | `lights_hub` at the doorway, then the ambush |

The Upside Down thickens as you go: plain roots at the drop, veins by the nest, veins everywhere in the hub.

## Beats

World triggers them and writes the scripts.

| Beat | Where | Script id | What happens |
|---|---|---|---|
| `start` | the drop | `l5_start` | Safe start. `lights_drop` is the first save point |
| `crew` | the drop's exit | `l5_crew` | Steve takes charge, Max won't be told. Story only |
| `gap_hint` | in front of `gap1` | `l5_gap_hint` | Arrival beat of the DASH puzzle |
| `gap_crossed` | event `propCleared` on `gap1` | `l5_gap_done` | Script only |
| `nest` | the nest doorway | `l5_nest` | Script only |
| `crack_hint` | in front of `crack1` | `l5_crack_hint` | Arrival beat of the SMASH puzzle |
| `crack_open` | event `propCleared` on `crack1` | `l5_crack_done` | Script only |
| `dart` | the long hall | `l5_dart` | Dustin's Dart, grown, slips past and doesn't attack. Story only |
| `hub` | the hub doorway | `l5_hub` | `lights_hub` is the third save point |
| `ambush` | rect in the hub | `l5_ambush` | Script, then `waves` |
| `level_clear` | cleared `amb3` | `l5_clear` | `finish`. Points at the Lab and the Gate (2.3) |

Scripts: `l5_start`, `l5_crew`, `l5_gap_hint`, `l5_gap_done`, `l5_nest`, `l5_crack_hint`, `l5_crack_done`, `l5_dart`, `l5_hub`, `l5_ambush`, `l5_clear`. Max (quick and dry) and Steve (self-deprecating, "Okay, kids, behind me") speak. A script can name a benched hero; that's fine, the story assumes the whole crew is down there. Nobody says where Eleven is.

## Puzzles

Listed in `puzzles` in `stage22.ts`, in this order.

| Id | Beat | Prop | Hero | Hint |
|---|---|---|---|---|
| `gap` | `gap_hint` | `gap1` | max | MAYBE MAX SHOULD TRY HER SKATE DASH |
| `crack` | `crack_hint` | `crack1` | steve | MAYBE STEVE SHOULD TRY HIS NAIL BAT |

- **A gate never waits on a hero who is out.** A try at a prop that only knocked-out party heroes can open (Max for a gap, Steve for a crack, Dustin for vines) stands the first of them back up with 30 percent HP and the MP for one special, like Eleven at the pinned Demogorgon (`standFor` in `combat/pokes.ts`). Without it a knocked-out Max left the party stuck at a gap.
- **A puzzle whose hero isn't in the party never shows its hint.** Max is always in 2.2's party. Steve may be benched, and then the cache stays shut and nothing nags. World adds this rule to the hint code (`world/puzzles.ts` or the play scene) for every stage.
- `gap1`, `gap2`, `gap3`: prop `gap`, one tile deep across the hall: 32 by 16 across a hall that runs north and south, 16 by 32 across one that runs east and west. Only `gap1` has a puzzle; the first one teaches it.
  - Always solid to walking and to enemies.
  - Max's Skate dash passes over it. Her first crossing sets it `open` and emits `propCleared`. It stays solid and looks the same.
  - A hero without `dash` who walks into it for 20 frames, or swings or fires at it, is a `poked`.
  - Followers trail the leader as always, so the whole party is across once she is.
- `crack1`: prop `crack`, `hitBy: 'smash'`, 32 by 16 across the dead end's mouth. Any of Steve's nail bat swings that reaches it breaks it: `crack`, dust, `propCleared`, open and walkable. Other hits are `poked`.

## Max

Max is a Monk, in `heroes/max.ts`, and `HERO_DEFS.max` replaces the stand-in. Numbers are starting points. They stay inside the bands in `tests/balance.test.ts`.

- **Board** (basic): a quick two-hit melee arc in front of her, reach 24. The first hit is power 0.9; a second press within 14 frames swings again at 0.9 times 1.2. Knockback 1.8, `swing`.
- **Skate dash** (4 MP): she rolls straight along her aim at 4.5 px a frame for 16 frames, 72 px.
  - Invulnerable for the roll and 6 frames after.
  - Every enemy her body passes through takes one hit (power 0.9, knockback 3, pushed to the side).
  - `skate` at the start and a `trail` fx behind her (w is its length, angle its heading).
  - It stops early at a solid tile or a solid prop, except a `gap`, which it passes over.
  - If the roll would end over a gap it carries on until her collision box is clear of it, at most 16 px more. If the far side is blocked she stops on the near side, never inside the gap.
- **High score** (Lv 3 talent): +10 percent quarter drops and +5 percent crit.
- **Kickflip** (Lv 6 talent, moved up from Lv 9 since the Walkman became a 4.2 story item): wherever the roll ends, cut short or not, a shockwave hits every foe within 24 px of her for power 0.7 with knockback 2.5, as a `nova` fx 48 px across. Her Lv 9 is open.
- **Utility:** `dash`. **Crit signature:** `trail`.
- **Bot style:** melee, hold about 18, reach about 30.

## Steve

Steve is a Fighter, in `heroes/steve.ts`, and `HERO_DEFS.steve` replaces the stand-in.

- **Nail bat** (basic): a three-hit chain like Mike's bat, a little slower and heavier: power 1.1, 1.1, then 1.5 with a big knockback on the third. Any swing that reaches a `crack` breaks it.
- **Babysit** (6 MP): a taunt pulse, a `taunt` fx and sfx 72 px across.
  - Every enemy inside it turns on Steve for 3 s. In a defense that pulls them off the ward too (`docs/level-6.md`).
  - For 5 s he takes 40 percent less damage and the whole party's DEF is up 15 percent.
- **Hair of steel** (Lv 3 talent): the first hit after 5 s without taking damage does nothing, with a SAVED floater.
- **Ahoy** (Lv 6 talent, `heroes/ahoy.ts`): a charged swap to him (the one with the shockwave, a forced one after a KO too) leaps him at the nearest foe he can see within 80 px. He flies 14 frames along an arc 16 px high, lands 8 px short of it, and the landing hits everything within 16 px for power 1.2 and stuns it 30 frames (a boss takes the hit, not the stun), with a `nova`, dust and an AHOY floater. No foe in reach, no leap. A quick swap never leaps.
- **Utility:** `smash`. **Crit signature:** a wide `slash`.
- **Bot style:** melee, hold about 20, reach about 34. It casts Babysit when two or more enemies are close.

## Spawns and the XP budget

| Group | Enemies | Notes |
|---|---|---|
| `halls` | 2 demodogs, 2 vines | the root halls |
| `nest` | 4 pods, 2 vines | rooted in the nest |
| `hall2` | 3 demodogs | beyond `gap2` |
| `hall3` | 2 demodogs, an elite demodog | before the hub |
| `amb1`, `amb2`, `amb3` | 3, 4 and 4 demodogs, one of the last an elite | dormant in the hub, waves |

That's about 18 demodogs, four vines and four pods. Count the XP from `ENEMY_DEFS` (the chapter 2 numbers may change it). The roster is worth 166, and the stage's `xpMult` of 1.5 makes it 258 (`docs/pace.md`); a test keeps it between 230 and 270. Pods that burst give less. Items: three Eggos (one in the cache), two Cokes (one in the cache), 12 quarters (some in the cache). Props:
- lights: `lights_drop`, `lights_nest`, `lights_hub`
- gates: `gap1`, `gap2`, `gap3`, `crack1`

Spawn ids are unique across enemies, items and props.

## Targets

The same bands as `docs/level-3.md`, "Targets", measured with `node scripts/measure-stage.ts 2.2 chief 20`. The average time is 90 to 150 s, and "boss" in the script's output is the ambush.

## Bot

`waypoints` walk the route.
- A waypoint with `dash: true` (Sim adds it to `BotWaypoint` in `combat/bot.ts`) sits on the near side of a gap. There the bot swaps to the hero with `dash`, faces the next waypoint, casts Skate dash, and carries on. That is the real crossing; there is no flag for a gap.
- The route skips the cache, so `crack1` stays shut in a bot run.
- The ambush is real.

## What Art draws for this level

Art builds only after the owner picks from the variation sheets (see "Variation sheets"). The owner picked **Walkman** for Max, **Letterman** for Steve and **Roots** for the tunnels (`src/gfx/var/`).

- The seven tunnel tiles in `core/tiles.ts` (`tunnelfloor` to `ladder`), night art, with variants so the halls don't look stamped. They must survive the night remap (`tests/night.test.ts` runs every tile name through it). The placeholders in `gfx/tile_objects.ts` (`PLACEHOLDER`) go once each tile is painted.
- Props:
  - `gap`: a black drop with root lips on both edges, the same in both states
  - `crack`: a cracked root wall, then rubble when `open`
- Max and Steve as heroes: walk, attack and cast in four directions, KO. Max needs the skateboard in her Skate dash (the `dash` anim) and her basic. Steve has the nail bat. Both get portraits with the five expressions. Max's 2.1 npc art (`gfx/data/max.ts`) is replaced by the chosen design.
- FX: `trail` (the dash streak) and `taunt` (Steve's pulse, a ring).
- A `?sheet=1` page for the tunnels, Max and Steve.

## What Audio makes for this level

- Max's and Steve's tag-in stingers (the stand-ins in `audio/tracks/jingles.ts` go). Steve's speech blip, a mid square (the stand-in in `audio/cues.ts` goes).
- Effects: `skate`, `crack`, `taunt` (the stand-ins in `audio/sfx_levels56.ts` go).
- `upside` already exists.

## Variation sheets

The owner picks the look before Art builds. Art makes two standalone pages at the project root, drawn with the game's own renderer and palette (the way `map-variations.html` imports from `/src`), each option at 1x and zoomed, each with a short name to pick it by:
- `heroes2-variations.html`: four designs each for Max, Steve and Hopper (Hopper is an npc in 2.3): the sprite in four directions with a walk frame, and the portrait.
- `tunnel-variations.html`: four or five looks for the tunnels, each as one sample room at night: floor, cap and wall, roots, veins, a nest, a `gap` and a `crack`.

The third sheet, the Alpha, is in `docs/level-6.md`. The picks panel sheet is in `docs/map-screen.md`.

## Result

Measured with `node scripts/measure-stage.ts 2.2` at `enemyMult` 1.25, on the chapter 2 enemy numbers. "Boss" in the script's output is the ambush.

| | Chief, 20 seeds | Chief, 100 seeds | Careless, chief | Kid | Upside |
|---|---|---|---|---|---|
| Cleared | 18 | 90, none stuck | 19 of 20 | 20 | 8 |
| Damage taken | 252 | 270 | 260 | 136 | 446 |
| KOs | 1.6 | 1.66 | | | |
| Lowest party HP | 34% | 32% | | | |
| Time | 101 s | 102 s | | | |

Stage XP was 166.

- **The roster is smaller than the spec's.** Its 18 demodogs came to about 220 XP, so the stage has 14 (two of them elite), two vines and four pods.
- **A knocked-out Max soft-locked the stage at a gap.** Nobody else can cross and Eggos don't revive. Now a try at a gate that only knocked-out heroes can open stands the first of them back up (see "Puzzles"). The three gaps also come before the packs the bot fights as Max.
- **The crack's hint beat fires when the bot walks through the junction.** The crack itself stays shut in a bot run, and the cache with it.
- **Retries keep a crossed gap and a broken crack open**, the way they keep every other gate.

## After the pace pass

A real run walks in with Mike at Lv 5, Dustin 4, and Max and Steve at 3 (the old seeds had 6, 5, 4 and 4), and the stage pays 258 XP (`docs/pace.md`). The factor stays at 1.25:

| | Chief, 20 seeds | Chief, 100 seeds | Careless, chief | Kid | Upside |
|---|---|---|---|---|---|
| Cleared | 19 | 93, none stuck | 19 of 20 (92 of 100) | 20 | 5 (27 of 100) |
| Damage taken | 240 | 264 | 242 | 156 | 352 |
| KOs | 1.05 | 1.50 | 1.35 | 0.20 | 3.50 |
| Lowest party HP | 42% | 35% | 40% | 60% | 6% |
| Time | 105 s | 105 s | 108 s | 95 s | 106 s |

The weaker party showed two bot stalls on upside, both fixed:

- **A knocked-out Max at the first gap.** The bot's crossing ended at once with no dasher up, so it walked into the gap for good. Now it leans on the gap, which stands her back up, and waits for her (`combat/bot_dash.ts`).
- **A pod over the nest wall.** Within 36 px the bot took any foe as reachable, so Steve swung at a pod through the wall all run. Now five seconds of swinging at a foe with no clear line to it, without landing a hit, makes the bot leave it for ten (`combat/bot.ts`).

## After the balance pass

Measured again at 20 and 100 seeds, and 300 for chief. Nothing moved: the bot change (it doesn't back off a lash or a swell while a demodog is within 240 px) never fires in the tunnels' fights. Cleared out of 20 and out of 100:

| | Chief | Careless, chief | Kid | Upside |
|---|---|---|---|---|
| Before and after | 19 and 93 (276 of 300, none stuck) | 19 and 92 (282 of 300) | 20 and 100 | 5 and 27 (84 of 300) |

Chief's damage is 264, KOs 1.50, lowest party HP 35% and time 105 s. Max and Steve join at Lv 3. At Lv 4 (the recruit rule without its minus one, `TODO.md`) chief clears 267 of 300, careless 258 and upside 119, 40 percent against 28.
