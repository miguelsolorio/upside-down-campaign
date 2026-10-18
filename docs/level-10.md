# Level 10 spec: stage 4.1, Kamchatka

One stage, five to seven minutes, and the start of chapter 4. Spring 1986. Hopper is alive, in a Soviet prison camp on the Kamchatka peninsula, and he plays alone for the first time: no swaps, one hero on the HUD. He fights from the snow yard inside the wire, through the prison block, down a shaft into the Demogorgon pit, and puts the beast down with his fists and the floor. Sim builds Hopper's kit and talents, the two guards and the pit Demogorgon. Art draws Hopper in the Telogreika, the guards, the Blizzard camp and the Mine shaft pit. World builds the map, the beats and the words. Audio writes `kamchatka` and the new effects. UI makes the HUD read with one hero. Ids below are fixed. Every agent reads this file, `docs/chapter-4.md`, `docs/level-3.md` (the Demogorgon, the pin and its finisher), `docs/level-8.md` (the soldier) and `docs/technical-architecture.md`. Types are in `src/core/types.ts` and `src/world/types.ts`, tile chars in `src/core/tiles.ts`.

## Owner's calls (docs/chapter-4.md)

- **Hopper alone.** No swaps, one hero on the HUD. The stage is built round his kit: haymaker, ground slam, and his talents for his level.
- **Gates he can open himself.** The route's gates are cracked walls (`smash`).
- **Joyce's lights** are a care package from home.
- **The Demogorgon pit** ends the stage: the 1.3 Demogorgon's moves, sized for one hero, the 1.3 sprite as it is (all twelve poses).
- **Looks:** Hopper in the Telogreika (`HOPPER4_OPTS[0]`), the Kamchatka guard in the Greatcoat (`KGUARD_OPTS[0]`), the camp in Blizzard, the pit in Mine shaft.
- **Music:** `mirkwood` with the snow slowing it, then `clock` in the pit.

## Lead's calls (2026-10-18)

The owner's standing instruction is to go with the lead's recommendations. Each is noted here and in `docs/chapter-4.md`.

- **Hopper's level.** He joins at the party's average level less one, the recruit rule. Nobody in 4.1's pool has played yet, so "the party" is the four best heroes the save has (`joinLevel` in `core/campaign.ts`). A real run brings him in at Lv 5 with no XP, so he has Coffee, and 4.1 pays enough for Lv 6 and Wind-up before the pit (see "Spawns and the XP budget").
- **4.1 is replayable** for XP like any stage. Hopper keeps his best level, as every hero does.
- **The split.** Hopper stays in Kamchatka for 4.2 to 4.4: he is in no pool after 4.1, and comes back in chapter 5. Erica's cart stays open on the map through the split, and the stash rides along to Kamchatka in Joyce's care package (no code: the stash goes into every stage).
- **Music.** `kamchatka` is a new track: `mirkwood`'s notes, slower and colder, the way `sour` is `starcourt` gone wrong. `clock` for the pit.
- **A melee guard.** The camp guard with a baton (`KGUARD_OPTS[3]`) is in as `kbaton`. He blocks hits from the front like the Lab's riot guard, so Hopper's slam and his Wind-up have a job.
- **The pit's finisher.** Three wall stuns, then 0 HP pins it, and only Hopper's ground slam finishes it, the way Eleven's beam finished the 1.3 one.
- **Hopper's look follows the chapter.** From chapter 4 gfx draws him in the Telogreika, his sprite and his portrait, wherever he shows. Before it, the Uniform. The play scene and the map tell gfx which stage is up (`setLookStage` in `gfx/index.ts`).

## Shape

- Map: about 44 by 40 tiles in `src/world/stages/stage41.ts`, spawns in `stage41_data.ts`. The outer ring is solid. Block walls are a `campcap` row over a `campwall` row facing the floor below; the pit's are `pitcap` over `pitwall`.
- Route, one main path with side pockets:
  - the work yard (start, south-west), inside the wire, where the care package waits
  - the snow yard, north, under the floodlight: crates, burning barrels, rifle guards
  - `crack1`, an iced-over side door into the block (Hopper's smash)
  - the prison block: a corridor with the cell row along it, the guard room off it, and a cell with `crack2` across it (the cache)
  - the shaft: a grate and a ladder down under the block
  - the pit (end, north-east), an arena about 18 by 12 tiles, with `door1` behind Hopper
- Light: `time: 'night'`. The floodlight's sodium pool in the yard, the burning barrels, the lights props, the bulbs in the block, lanterns in the pit (Art's call how).
- Music: `kamchatka` from the start, `clock` from the `pit` beat. A retry carries the switch on (`musicAfter`).
- Party: Hopper alone (`ROSTER['4.1']` is `['hopper']`, so no picks). `?stage=4.1` starts him at Lv 5 (`ARRIVAL`, from the run).
- `enemyMult` and `xpMult`: see "Result".
- Dialogue is off by default. Gate hints work as in every level.

## Rooms

| Room | Floor | Dressing | What happens |
|---|---|---|---|
| Work yard | `snow`, `snowpath` | the `wire` fence, `drift`s, a `barrel`, `campcrate`s | Start, the care package and `lights_yard`. Nothing hostile |
| Snow yard | `snow`, `snowpath`, `drift` | the floodlight, crates and barrels as cover | Rifle guards (`yard`). `crack1` in the block's south wall |
| Prison block | `campfloor`, `grate` | `celldoor`s along the corridor's north wall, a `barrel` | Baton guards and a rifle guard (`block`). `crack2` closes a cell, the cache. `lights_block` in the guard room |
| Guard room | `campfloor` | crates, a table of crates | Two baton guards asleep until the `block` beat |
| Shaft | `grate`, `campfloor` | the ladder down | `lights_shaft`, the save point for the fight |
| Pit | `pitfloor` | `pitwall` of rock and timber, the `pitbar` barricade over the beast's tunnel, bones, a drain, a chain | `door1`. The pit Demogorgon |

## Beats

World triggers them and writes the scripts.

| Beat | Where | Script id | What happens |
|---|---|---|---|
| `start` | the work yard | `l10_start` | Safe start. Hopper alone and cold. The care package: Joyce's lights. `lights_yard` is the first save point |
| `yard` | the snow yard's south edge | `l10_yard` | Script only: the guards and the floodlight |
| `crack_hint` | in front of `crack1` | `l10_crack_hint` | Arrival beat of the smash gate |
| `crack_done` | event `propCleared` on `crack1` | `l10_crack_done` | Script only |
| `block` | inside the block, past `crack1` | `l10_block` | Script, then `wake` `guardroom` |
| `cell_hint` | in front of `crack2` | `l10_cell_hint` | Arrival beat of the cache |
| `shaft` | the shaft's top | `l10_shaft` | Script. `lights_shaft` is the third save point |
| `pit` | arena rect, needs `shaft` | `l10_pit` | `close` `door1`, `music` `clock`, the script, `wake` `boss` |
| `pit_down` | event `pinned` on spawn `pitdemo` | `l10_pit_down` | Arrival beat of the finisher |
| `level_clear` | cleared `boss` | `l10_clear` | The script, `open` `door1`, `finish` |

- Hopper is gruff and deadpan, soft underneath, and alone: he talks to himself, to Joyce in his head, and once to the beast. No other speaker but `narrator`.
- The care package is Joyce's lights in a crate from home, with a note. Keep it short and warm.
- Every line is original, fits three rows of 32 characters and has no em dashes.

## Puzzles

Listed in `puzzles` in `stage41.ts`, in this order.

| Id | Beat | Prop | Hero | Hint |
|---|---|---|---|---|
| `crack` | `crack_hint` | `crack1` | hopper | MAYBE HOPPER SHOULD THROW A PUNCH |
| `cell` | `cell_hint` | `crack2` | hopper | MAYBE HOPPER SHOULD THROW A PUNCH |
| `finish` | `pit_down` | `pitdemo`, `enemy: true` | hopper | MAYBE HOPPER SHOULD SLAM THE GROUND |

- `crack1` and `crack2`: prop `crack`, 32 by 16. His haymaker and his slam both break them.
- `finish`: the caret follows the pinned Demogorgon, and its death solves it.

## Hopper

`HeroId` `hopper`, in `src/heroes/hopper.ts`. He was an npc in 2.3 and 3.3; from 4.1 he plays. The Barbarian.

| | |
|---|---|
| Stats | base HP 60, MP 14, ATK 11, DEF 6, SPD 7; growth 8, 1.6, 1.7, 1.3, 0.3; d20 weights 3, 1, 3, 2, 0; speed 0.85; crit +0 |
| Basic | **Haymaker:** a slow, heavy punch with a huge hitbox. Cooldown 30, 22 frames long, lands on frame 10, power 1.6, reach 34, an arc of 80 degrees either side, knockback 2.8, sfx `haymaker`. No chain |
| Special | **Ground slam** (8 MP): he drops a fist into the floor. A 360 degree shockwave of 44 px (fx `nova`), power 1.0, knockback 3.5, stuns 60 frames, sfx `slam`. Cooldown 50 |
| Lv 3 | **Coffee:** food heals him 25% more (Eggos and Cokes picked up, and the stash's) |
| Lv 6 | **Wind-up:** from Lv 6 the haymaker fires when Attack comes up. Held 0.4 s (24 frames, the ring `ActorView.charge` fills), it is the wind-up haymaker: power x1.8, knockback 5, and it breaks a block. A tap is the plain haymaker on release |
| Lv 9 | Berserk. Not built: no hero has a Lv 9 talent yet |
| Opens | `smash`: the haymaker and the slam break cracked walls |
| Voice | Gruff deadpan, soft underneath. The low saw blip he already has |

- **Guards and blocks.** A plain haymaker (knockback 2.8) is blocked by a baton guard's front like any hit. The slam (3.5) and the wind-up (5) are over the riot guard's `breakKb` of 3.2, so they break the block.
- **The pit.** The slam is the only thing that finishes the pinned pit Demogorgon: any slam whose shockwave reaches it.
- **The bot** plays him like any melee hero (`STYLE` hold 22, reach 34). It slams with two or more foes within 40 px or a baton guard blocking it, holds for the wind-up against a guarding baton guard from Lv 6, and slams the pinned Demogorgon.

### One hero in the party

Nothing in the sim assumes four. With one:

- A swap does nothing, and makes no sound.
- His KO is the party going down: the wipe, and the retry from the last lights.
- The Crit (burst) sweeps with his signature alone, a slam across the screen.
- The HUD shows his portrait, bars and level, and no bench (UI checks it reads).

## The guards

Both are new kinds that reuse an existing brain, with their own numbers and looks. Numbers are starting points against a Lv 5 Hopper (HP 92, ATK 17, DEF 11), from the 3.2 soldier's, which faced a Lv 7 Mike of about the same DEF. Tune them inside "Targets", not the targets.

| Kind | Brain | HP | ATK | DEF | Walk | XP |
|---|---|---|---|---|---|---|
| `kguard`, the Kamchatka guard | the 3.2 soldier (`enemies/soldier.ts`): keeps his distance, aims, a burst of rifle rounds, a rifle butt up close | 80 | 36 | 5 | 0.7 | 12 |
| `kbaton`, the camp guard | the Lab's riot guard (`enemies/guard.ts`): blocks from the front, a baton swing | 110 | 34 | 7 | 0.7 | 16 |

- The baton guard's block is the riot guard's: a hit in the 75 degree front arc deals 20%, knockback of 3.2 or more breaks the block for 45 frames. He circles to face the hero.
- Rifle rounds are dodged like the 3.2 soldier's, and crates and barrels are cover.

## The pit Demogorgon

`EnemyKind` `pitdemo`. The 1.3 Demogorgon's brain (`enemies/demogorgon.ts`, `demo_hit.ts`) and its sprite, with numbers sized for one hero. One spawn, id `pitdemo`, group `boss`, dormant until the `pit` beat.

| HP | ATK | DEF | Walk | XP |
|---|---|---|---|---|
| 600 | 34 | 6 | 0.8 | 60 |

- **The moves are the 1.3 ones.** The swipe; the charge that stuns it on a wall (stun 150 frames, x1.5 taken); the acid arcs from 60%; the leap onto shadow marks from 30%; the roar.
- **Three stuns and a slam.** Below 0 HP after three wall stuns it is pinned: no attacks, every hit is a `poked`, and the sim emits `{ t: 'pinned', spawnId: 'pitdemo' }` once. Hopper's ground slam reaching it kills it. Before the third stun its HP stops at 1, as the 1.3 one's does.
- **Boss bar:** `{ name: 'DEMOGORGON', hp, hpMax }` while it is awake.
- **The bot** leaves the charge line and the marks, as against the 1.3 one (`bot_boss.ts`), and slams it once it is pinned.

## Spawns and the XP budget

| Group | Enemies | Notes |
|---|---|---|
| `yard` | 4 rifle guards, a baton guard | awake, two of the rifles on patrol round the floodlight |
| `block` | 2 baton guards, a rifle guard | awake in the corridor |
| `guardroom` | 2 baton guards | dormant until `block` |
| `boss` | the pit Demogorgon `pitdemo` | dormant in the pit |

Count the XP from `ENEMY_DEFS` before `xpMult` and keep it between 200 and 250. A test enforces it. `xpMult` then sets what the stage pays, so Hopper, in at Lv 5 with no XP, reaches Lv 6 before the pit in most runs.

Items:
- three Eggos (one in the cache)
- two Cokes
- 8 quarters

Props:
- lights: `lights_yard`, `lights_block`, `lights_shaft`
- gates: `crack1`, `crack2`, `door1`
- the yard's `floodlight`, lit, which makes its own pool of light

`door1` is a `door` prop spawned `state: 'open'` and `solid: false`, closed by the `close` step and opened at the clear.

## Targets

The same bands as `docs/level-3.md`, "Targets", measured on HARD with `node scripts/measure-stage.ts 4.1 chief 20`. One hero means a KO is a wipe, so "KOs" counts the retries a run needs. "Boss" runs from the `pit` beat to the finish, about half the run.

## Bot

- `waypoints` walk the route. The bot opens `crack1` by flag (`open`). The route skips the cache.
- The guards and the pit Demogorgon are real.
- The last waypoint is inside the `pit` trigger.

## What Art draws for this level

- **Hopper in the Telogreika** (`src/gfx/var/hopper4_opts.ts`, the first option): his sprite on the big body (walk in four directions, the haymaker's wind-up and hit, the wind-up's hold, the slam, hurt, KO) and his portrait with the five expressions. From chapter 4 he is drawn in it everywhere (`setLookStage`); before, the Uniform as now.
- **The guards:** the Greatcoat rifle guard (`KGUARD_OPTS[0]`) and the camp guard with the baton (`KGUARD_OPTS[3]`), built like `SOLDIER` in `gfx/data`. The baton guard shows his block (baton raised) while `guarding`.
- **The camp, Blizzard** (`src/gfx/var/kamchatka_a.ts`): `snow`, `drift`, `snowpath`, `wire`, `campcap`, `campwall`, `celldoor`, `campfloor`, `grate`, `campcrate`, `barrel` (animated, a fire in it). They survive the night remap, and the floodlight's sodium amber leads the eye.
- **The pit, Mine shaft** (`src/gfx/var/pit_b.ts`): `pitcap`, `pitwall`, `pitfloor`, `pitbar`, with the bones, stains, the drain and the chain as floor variants, and lanterns.
- The pit Demogorgon is the 1.3 sprite as it is.
- KAMCHATKA on the map (see `docs/map-screen.md`, "Chapter four on the map").
- A `?sheet=1` page for Hopper, the guards and the camp.

## What Audio makes for this level

- `kamchatka`: `mirkwood` in the snow. The same notes, slower, thinner and colder, with wind. Base and combat layers like every area track.
- Effects: `haymaker` (a heavy whoosh and a meaty thud). `slam` already exists for the ground slam.
- Hopper's stinger, for his first swap in (he never swaps in 4.1, so it plays on the level card or never; write it anyway for chapter 5).

## What UI builds for this level

- The HUD with one hero: his portrait, bars and level, no bench, nothing broken or empty-looking where the bench goes.
- The chapter four card: CHAPTER FOUR, HELLFIRE, in the spine. Check that it fits and reads.

## Result

To be measured (see "Targets").
