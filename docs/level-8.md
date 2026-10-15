# Level 8 spec: stage 3.2, the Russian base

One stage, five to eight minutes, under Starcourt in July 1985. The freight lift from 3.1 comes down into a Soviet base dug under the mall. Robin reads the Russian on its doors, and Grigori waits in the chamber where the Key is. This is the last stage of the build: 3.3 (the food court and the Mind Flayer) shows locked on the map. Sim builds the soldier, Grigori, the cipher door, the power box and the breaker. Art draws the base, Grigori and the soldier. World builds the map, the beats and the words. Ids below are fixed. Every agent reads this file, `docs/level-7.md` (Robin, Nancy, the new foes, the stash) and `docs/technical-architecture.md`.

## Shape

- Map: about 48 by 40 tiles in `src/world/stages/stage32.ts`, spawns in `stage32_data.ts`. The outer ring is solid. Base walls are a `basecap` row over a `basewall` row facing the floor below.
- Route, one main path with side pockets for items:
  - the lift drop (start, north-west), where the freight lift from 3.1 lands
  - the loading bay, stacked with crates
  - the corridor south, with `cipher1` across it
  - the barracks, a side room behind `cipher2` (the cache)
  - the lab, cells and rat cages
  - the control room, a window over the chamber
  - the Key chamber (end, south-east), an arena about 18 by 12 tiles, the machine on its north wall
- Light: the owner's base look pick decides. The draft is `time: 'night'`: dim steel, pools at the `lights` entries on the ceiling lamps, the machine's glow and the consoles, and at the lights props.
- Music: `starcourt` until Grigori wakes, then the `music` step switches to `clock` to the end.
- Party: picked on the map from the nine. Robin is locked in, because `cipher1` is on the route. `?stage=3.2` starts Mike (lead), Eleven, Robin and Nancy at the levels in `ARRIVAL`, set from a chained bot run through 3.1 once it exists.
- `enemyMult`: start at 1 on the chapter 3 numbers and set it by measuring.

## Rooms

| Room | Floor | Dressing | What happens |
|---|---|---|---|
| Lift drop | `basefloor` | the `lift`, `ammo` crates | Start and `lights_lift`. Nothing hostile |
| Loading bay | `basefloor`, `basegrate` | rows of `ammo` crates, the cover the soldiers shoot from | Three soldiers |
| Corridor | `basefloor` | `pipe`s | `cipher1` across it. Beyond it, two soldiers and an elite |
| Barracks | `basefloor` | `bunk`s, lockers | The cache behind `cipher2`. Nothing hostile |
| The lab | `basegrate` | `cell`s, rat `cage`s, consoles | `lights_lab`. Melting rats. Two Flayed wait in the cells and rise when the lab beat wakes them |
| Control room | `basefloor` | consoles, the window | `lights_control`, the save point for Grigori. Two soldiers on the way in |
| Key chamber | `keyfloor`, `basegrate` | the `machine` along the north wall, the `powerbox` plate, the `breaker` on the far wall behind the machine | `door1` and `door2` across its two doorways. Grigori |

## Beats

| Beat | Where | Script id | What happens |
|---|---|---|---|
| `start` | the lift | `l8_start` | Safe start. `lights_lift` is the first save point |
| `bay` | the bay's doorway | `l8_bay` | Script only |
| `cipher_hint` | in front of `cipher1` | `l8_cipher_hint` | Arrival beat of the READ puzzle. Robin gets the line |
| `cipher_open` | event `propCleared` on `cipher1` | `l8_cipher_done` | Script only |
| `cache_hint` | in front of `cipher2` | `l8_cache_hint` | Arrival beat of the second READ door |
| `cache_open` | event `propCleared` on `cipher2` | `l8_cache_done` | Script only |
| `lab` | the lab doorway | `l8_lab` | Script, then `wake` `lab` (the cells open). `lights_lab` is the second save point |
| `control` | the control room | `l8_control` | `lights_control` is the third save point. They see Grigori through the window |
| `grigori` | arena rect, needs `control` | `l8_grigori` | `close` `door1`, `close` `door2`, `music` `clock`, the script, `wake` `boss` |
| `level_clear` | cleared `boss` | `l8_clear` | `open` `door1`, `open` `door2`, the script, `finish`. The way to the food court (3.3) |

Scripts: `l8_start`, `l8_bay`, `l8_cipher_hint`, `l8_cipher_done`, `l8_cache_hint`, `l8_cache_done`, `l8_lab`, `l8_control`, `l8_grigori`, `l8_clear`.

- Robin carries this one. She reads the doors out loud and translates badly when scared.
- Dustin explains the machine before anyone asks.
- Grigori never speaks.
- Nobody names the Key's purpose for sure. They know it's opening something.

## Puzzles

| Id | Beat | Prop | Hero | Hint |
|---|---|---|---|---|
| `cipher` | `cipher_hint` | `cipher1` | robin | MAYBE ROBIN CAN READ IT |
| `cache` | `cache_hint` | `cipher2` | robin | MAYBE ROBIN CAN READ IT |
| `breaker` | `grigori` | `breaker1` | lucas, `alt` nancy | MAYBE LUCAS SHOULD TRY HIS SLINGSHOT |

- The breaker's `alt` is Nancy, with MAYBE NANCY SHOULD TRY HER PISTOL. A party with neither never sees the hint and wins by flanking.
- The breaker puzzle is solved the first time it's lit. Its re-arming doesn't bring the hint back.

## The cipher door

`PropKind` `cipher`, spawned `hitBy: 'read'`, solid, 32 by 16 across a corridor (16 by 32 across one that runs north and south). A steel door with a keypad and a line of Cyrillic over it.

- While the active hero has `read`, is standing and stands within 40 px of it (the nearest point, as for `hidden`), its `k` climbs by 1/45 a frame. Otherwise `k` falls by 1/90 a frame toward 0.
- At `k` 1 it opens: `decode` sfx, a `reveal` fx, `propCleared`, open and walkable.
- `PropView.k` is the decode progress, so gfx can flip the letters from Cyrillic to English as it climbs.
- A hero without `read` who pushes against it for 20 frames, or swings or fires at it, is a `poked`.
- Built next to the sense code in `combat/props.ts`, whose `sensed` already reads the prop's `hitBy`.

## The soldier

`EnemyKind` `soldier`, in `src/enemies/soldier.ts`. Ushanka, greatcoat, rifle.

| HP | ATK | DEF | Speed | XP |
|---|---|---|---|---|
| 70 | 30 | 5 | 0.8 | 12 |

- **Keeps its distance.** It holds 80 to 120 px from the hero with a clear line, and backs off at 0.7 px a frame when the hero is closer than 60.
- **Burst.** With a clear line, a 30 frame wind-up under the "!", aimed at where the hero stands when it ends. Then three `bullet`s six frames apart, 3.2 px a frame, reach 180, power 0.45 each, `rifle` on each. The burst doesn't track. Recover 50 frames, cooldown 120.
- **Cover.** Its bullets stop at solid tiles and solid props, as darts already do (`combat/proj.ts`). Crates and tables are cover for both sides.
- **Butt stroke.** A hero inside 22 px gets a rifle butt instead (a 20 frame wind-up, power 0.8, knockback 3).
- An elite fires five rounds.
- **Bot.** It already sidesteps darts. Bullets are the same kind of projectile.

## Grigori

`EnemyKind` `grigori`, in `src/enemies/grigori.ts`. One spawn, id `grigori`, group `boss`, dormant until the `grigori` beat. Numbers are starting points against the chapter 3 numbers. Tune them inside "Targets", not the targets themselves.

| HP | ATK | DEF | Walk | XP |
|---|---|---|---|---|
| 800 | 26 | 8 | 0.7 | 80 |

- **He walks straight at you.** He always turns to face the active hero at once, except while he recovers.
- **Frontal hits do a quarter.** A hit from inside 70 degrees of his facing deals 25 percent, with a `block` spark and `block` sfx. From the side or behind it deals full damage. Shields (`enemies/shield.ts`) have the arc math.
- **Haymaker.** At 28 px: a 30 frame wind-up under the "!", then an arc in front of him (reach 32, half angle 70 degrees, power 1.2, knockback 5, `slam`). Then 50 frames of recovery, in which he doesn't turn. That's the window to get behind him.
- **Grab.** About every 220 frames, when the hero is 30 to 80 px away: a 24 frame wind-up, then a 12 frame lunge at 3.5 px a frame. On contact he holds the hero for 45 frames (pose `grab`, `grab` sfx), then throws them (power 1.0, knockback 6). A swap frees the held hero, as with the Flayed.
- **Rage at 50 percent HP.** He walks at 0.9, recovers in 36 frames and grabs about every 160.
- **The power box.** The chamber has a `powerbox` (a floor plate, 32 by 32, not solid) and a `breaker` (a switch on the far wall, `hitBy: 'shoot'`, behind solid tiles so only a shot reaches it).
  - A shot lights the breaker (`targetHit`), and every `powerbox` fires for 30 frames: state `lit`, `zap`, an `arcs` fx.
  - Grigori standing on it (his feet inside its rect) is stunned for 180 frames (pose `stun`) and takes 8 percent of his max HP at once. While stunned, he takes full damage from every side, times 1.5.
  - Any other enemy on it takes 30 percent of its max HP. A hero on it takes 15 (before difficulty) and is thrown clear.
  - The breaker goes back to `closed` 300 frames after it was lit, and can be shot again.
- **What he ignores.** Word vomit staggers him for 30 frames instead of confusing him, and Nancy's traps don't hold him.
- **Boss bar.** While he's awake, `hud.boss` is `{ name: 'GRIGORI', hp, hpMax }`.
- **He's beatable without a shooter.** Flanking alone has to win the fight, at a slower pace.
- **Bot.** It steps around him during the recovery and hits his back, sidesteps the grab lunge, and when Lucas or Nancy is in the party and his feet are on the powerbox, swaps to them and shoots the breaker. No flag shortcut.

## Spawns and the XP budget

| Group | Enemies | Notes |
|---|---|---|
| `bay` | 3 soldiers | behind the bay's crates |
| `hall` | 2 soldiers, an elite soldier | beyond `cipher1` |
| `lab` | 6 melting rats, 2 Flayed | the rats in the lab, the Flayed dormant in the cells |
| `post` | 2 soldiers | outside the control room |
| `boss` | Grigori `grigori` | dormant in the chamber |

Count the XP from `ENEMY_DEFS` and keep the total between 190 and 240. A test enforces it.

Items:
- four Eggos (one in the cache, one in the control room)
- three Cokes
- 12 quarters

Props:
- lights: `lights_lift`, `lights_lab`, `lights_control`
- gates: `cipher1`, `cipher2`, `door1`, `door2`
- the chamber: `powerbox1` (prop `powerbox`), `breaker1` (prop `breaker`)

`door1` and `door2` are `door` props spawned `state: 'open'` and `solid: false`, closed by the `close` step and opened again at the clear.

## Targets

The same bands as `docs/level-3.md`, "Targets", measured with `node scripts/measure-stage.ts 3.2 chief 20`. "Boss" in the script's output runs from the `grigori` beat to the finish. The fight is about half the run.

## Bot

- `waypoints` walk the route. The bot opens `cipher1` by flag (`open`), like the other gates. The route skips the cache.
- Grigori is real, the power box included.
- The last waypoint is inside the `grigori` trigger.

## What Art draws for this level

Art builds only after the owner picks from the variation sheets. The base look comes with the mall look on `mall-variations.html`.

- The base tiles in `core/tiles.ts` (`basefloor` to `keyfloor`), with variants. They must survive the night remap.
- Props:
  - `cipher`: a steel door with a keypad and Cyrillic. As `k` climbs the letters turn to English, then it slides open
  - `powerbox`: a floor plate with warning stripes, live and arcing when `lit`
  - `breaker`: a wall switch box, down when `closed`, thrown and sparking when `lit`
  - `door`: the existing door, recolored for the base if needed
- Grigori, from the chosen design: the big body, walk in four directions, the haymaker wind-up and swing, `grab`, `stun`.
- The soldier: walk, aim, fire, recover, in four directions, with an elite trim.
- FX: `arcs` (the power box firing). `bullet` is in `docs/level-7.md`.
- A `?sheet=1` page for the base, Grigori and the soldier.

## What Audio makes for this level

- Effects: `rifle` and `decode` (the stand-ins in `audio/sfx_levels78.ts` go). `zap`, `block`, `slam` and `clock` already exist.

## Variation sheet

`grigori-variations.html` at the project root, made like the sheets in `docs/level-7.md`. Five designs for Grigori, each with the walk, the haymaker and the grab, at 1x and zoomed, next to Hopper (the big body) and a hero for scale.
