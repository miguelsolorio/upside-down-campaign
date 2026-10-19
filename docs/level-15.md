# Level 15 spec: stage 5.2, the Abyss

One stage, five to eight minutes, under Hawkins (`docs/chapter-5.md`). Through the Lab's gate into the Abyss: broken pieces of Hawkins floating over a red void under a black sun, joined by vine bridges, and a ring of rock where two Demogorgons wait. Every call here is the lead's, made under the owner's standing instruction. Tile characters are picked at spine time, after chapter 4's tiles land.

## Shape

- Map: about 52 by 44 tiles in `src/world/stages/stage52.ts`, with spawns in `stage52_data.ts`.
- The void is the `abyssgap` tile, solid to walking and clear to the eye, so `drawAbyssBg` shows through. Islands use the `ABYSS_TILES` tops with `abysscliff` and `abyssunder` at their south edges. `vine` bridge tiles join them.
- Route, island to island:
  - the gate's landing (start, south)
  - the lawn island, then a vine bridge east
  - the road island, where a gap (`gap1`) only Max's dash crosses leads to a cache, not the route
  - a burn wall of vines (`burn1`) across the bridge north: Dustin or Nancy
  - Will's hidden path (`sense1`), a bridge only he can see, to the classroom island
  - a crack (`crack1`) in a fallen wall: Steve or Hopper
  - the ring (end, north), a round island about 18 tiles across with `door1`, a rock fall that seals the way back
- Light: a day-style stage (the tops are painted at final values; bake it with no night pass), with `drawAbyssBg` behind everything and a slow red pulse.
- Music: `upside`, then `clock` at the `twins` beat.
- Party: picked on the map, with Will locked in (`sense1` is on the route).
- Tile characters, taken at spine time from the Latin-1 signs chapter 4 left free (`src/core/tiles.ts`). The island tops, walkable: `¸` `abysslawn`, `ÿ` `abyssroad`, `þ` `abyssline`, `ý` `abyssporch`, `ü` `abyssclass`. The vine bridges, walkable: `ø` `abyssbridgeh` (runs east to west), `ö` `abyssbridgev` (north to south). The drop, solid and marked `drop` (`Grid.drop`, so a twin that charges into one falls): `û` `abysscliff`, the rock face under an island's south edge, `ú` `abyssunder`, the rock that tapers below it, and `ù` `abyssgap`, the void itself, clear to the eye. An island's south edge is a cliff row over an under row, and every other side opens on gap. The backdrop is `backdrop: 'abyss'` on the stage data, which `drawWorld` draws behind the tiles (`drawAbyssBg`). The tops and the rock carry veins that pulse with the phase, so they are pulse tiles like the tunnels' veins. The stub in `stage52.ts` uses every one but `ö`.

### The map as built

`stage52.ts` is 52 by 44 tiles. The route winds up it like an S, island by island (tile coordinates, x then y):

| Island | Floor | Where | What is on it |
|---|---|---|---|
| The lawn, the gate's landing | `abysslawn`, with an `abyssporch` landing at its west end | x 3 to 16, y 32 to 38 | The start (4, 35), `lights_landing`, the `landing` pack of three demodogs at its east end |
| The road | `abyssroad` with an `abyssline` lane down its middle | x 22 to 37, y 32 to 38 | The `road` group (a Demogorgon, two pods), the foot of the bridge north (`burn_hint`) |
| The cache | `abysslawn` pad behind a two-tile neck | x 39 to 44, y 33 to 37 | An Eggo, a Coke and three quarters, behind `gap1` (Max only) |
| The deck | `abyssporch` | x 8 to 26, y 21 to 27 | The `bridge` group (two vines at the bridge's mouth, three demodogs), `lights_bridge` |
| The classroom | `abyssclass` | x 4 to 19, y 5 to 16, with a neck east at x 20 to 23, y 9 to 10 | Two Demogorgons, 15 tiles apart, and `lights_ring` before the neck |
| The ring | `abyssroad`, round, 18 across | centre (40, 11.5), radius 8.6 | `door1`, the `twins` rect (x 34 to 36, y 8 to 13), the twins, asleep, in the east |

- **Bridges** are one lane wide and run: east from the lawn to the road (5 tiles), north from the road to the deck at x 24 (4 tiles, `burn1` across the middle), north from the deck to the classroom at x 14 (4 tiles, all of it `sense1`), and east from the classroom's neck to the ring along y 10 (7 tiles).
- `crack1` fills the classroom's neck (x 22, y 9 to 10). `door1` is 16 by 48 px across the ring's west tip (x 31, y 10 to 12), spawned open and shut by the `twins` beat.
- Everything but the twins is awake. The party starts ten tiles from the nearest foe.
- Demobats are left out of `bridge`: chapter 4 has not built them, and when it does they join that group and the XP budget with them.

## Puzzles

- `sense1`: Will's hidden path, the 2.1 `sense` gate. It is on the route, which is why Will is locked.
- `burn1` (Dustin, Nancy) and `crack1` (Steve, Hopper) are on the route with two heroes each, so the hint always names someone the party can field. If neither of a gate's heroes is picked, the gate's `alt` opens to any hero's attack after a delay, as 3.1's panel does.
- `gap1`: Max only, and only to the cache.

### As built

| Puzzle | Beat | Prop | Hero, then `alt` | Hint |
|---|---|---|---|---|
| `burn` | `burn_hint` | `burn1` (`vines`, `hitBy` burn) | dustin, nancy, then everyone else | MAYBE DUSTIN SHOULD TRY HIS HAIRSPRAY |
| `gap` | `gap_hint` | `gap1` | max | MAYBE MAX SHOULD TRY HER SKATE DASH |
| `sense` | `sense_hint` | `sense1` (`hidden`, `hitBy` sense) | will | MAYBE WILL CAN FEEL THE WAY |
| `crack` | `crack_hint` | `crack1` (`crack`, `hitBy` smash) | steve, hopper, then everyone else | MAYBE STEVE SHOULD TRY HIS NAIL BAT |

- Nancy's alt hint is MAYBE NANCY SHOULD TRY HER MOLOTOV (she burns from Lv 6), Hopper's MAYBE HOPPER SHOULD THROW A PUNCH, and everyone else's MAYBE MIKE SHOULD HACK AT THE VINES at `burn1` and MAYBE MIKE SHOULD BREAK THE WALL at `crack1`.
- **The fallback.** `burn1` and `crack1` carry `smash: true` and `hits: 12` (`CHIP_HITS` in `stage52_data.ts`). The sim counts every basic attack from up close at a shut `crack` or `vines` prop that has both (`smashAimed` in `combat/props.ts`, the way a clock counts its `hits`), and the twelfth breaks it, so a party with neither of the gate's heroes still gets through, a few seconds late. The gate's own heroes open it in one go.
- `sense1` covers all four tiles of Will's bridge, and the Abyss draws it as nothing until he stands close; `door1` is drawn as a rock fall (`gfx/props_abyss.ts`).

## Foes (Sim)

- **Demogorgon as a foe** (`demofoe`): the 1.3 Demogorgon's charge, wall stun and swipe, at a foe's size in HP and damage. No petals, no leap. One or two at a time.
- Demodogs, vines and pods at chapter 5 numbers (their own kinds where chapter 2's numbers would be wrong, as the TODO advises).
- Demobats once chapter 4 has them.
- **Twin Demogorgons** (`twin`, two of them), the mini-boss, with one boss bar for both:
  - They take turns: while one charges, the other circles at range.
  - When one falls, the other enrages: 30% faster, and acid arcs every 5 s, as in 1.3's petals phase.
  - A twin that charges off the ring's edge into the void falls (an fx), loses 15% HP and climbs back up 3 s later.
  - At both 0: `finish`.

## Spawns and the XP budget

| Group | Enemies |
|---|---|
| `landing` | 3 demodogs |
| `road` | a Demogorgon foe, 2 pods |
| `bridge` | vines on the burn wall, 3 demodogs (and demobats when they exist) |
| `classroom` | 2 Demogorgon foes |
| `boss` | the twins, dormant |

Count the XP before `xpMult` between 320 and 380, enforced by a test. The lead ends 5.2 at Lv 11 (`docs/pace.md`).

Items: four Eggos, three Cokes, 14 quarters. Lights: `lights_landing`, `lights_bridge`, `lights_ring` (Joyce's lights hung from vines).

## Beats

- `start`: a short line, the gate closing behind.
- `twins`: crossing onto the ring drops the rock fall (`door1`), wakes both and switches to `clock`.
- `level_clear` on both twins' deaths.
- Scripts `l15_*` in `src/story/scripts_l15.ts`.

## Targets

On HARD (`chief`) over 20 seeds: 15 to 19 clears, the careless bot at least 12, 150 to 320 damage, under 45% lowest HP. A 100-seed run shows nothing stuck. The bot needs a rule for the void: never path through `abyssgap`, and keep away from the ring's edge while a twin winds up.

## What Art does

Register `abyssTile` (with `ABYSS_TILES`) and `drawAbyssBg` from `src/gfx/ch5/`. Draw the twins from the 1.3 Demogorgon (a red or pale tint for the second so they read apart), the fall-and-climb fx, and the ABYSS plate on the map.

## What Audio makes

A `fall` sfx (a twin dropping into the void). The tracks are the existing `upside` and `clock`.

## Result

Measured with `node scripts/measure-stage.ts 5.2 chief 20` (and `--careless`; 100 seeds for the stuck check), with the party a `?stage=5.2` jump brings: Mike Lv 10, Dustin Lv 9, Robin Lv 7 and Will Lv 7, 328 HP between them. `enemyMult` is 2.72, `xpMult` is left at 1, and the stage pays 330 XP before it (six demodogs 54, two vines 10, two pods 6, three Demogorgons 120, the twins 140).

| Measure (chief) | Careful bot | Careless bot | Target |
|---|---|---|---|
| Cleared, of 20 | 16 | 13 | 15 to 19; careless at least 12 |
| Cleared, of 100 | 89 | 55 | |
| Stuck, of 100 | 0 | 0 | none |
| Average damage taken | 497 | 728 | 150 to 320 |
| Average KOs | 1.6 | 2.4 | |
| Average lowest party HP | 28% | 20% | under 45% |
| Average time | 133 s | 124 s | |
| The twins' fight | 49 s | 35 s | |

Kid clears 20 of 20 (277 damage), upside 4 of 20.

- **The damage target is not met.** Every other target is. Over a run of 130 s the benched heroes heal 2% of their max HP a second and the bot picks up an Eggo or two, so the party takes about half as much again as its HP before it is beaten: at 1.25 the bot cleared 20 of 20 for 331 damage, and the first factor that cost it a clear was 1.75, at 586 damage. No factor puts 15 to 19 clears under 320.
- **The factor is a cliff, and big.** Careful clears 99 of 100 at 2.6 and 65 at 3.0, the careless bot 77 and 23. The party's 66 to 111 HP each is what makes the factor big: a demodog bites for about 70 at 2.72.
- **The Demogorgons' hits were cut to make the careless target reachable** (the one change outside this stage's files that decides the numbers). At the 1.3 boss's swipe and charge (power 0.6 and 1) the bot that never dodges cleared 11 of 20 at 1.5, 1 at 1.75 and none at 2, where the careful one cleared 20, 19 and 16: the twins alone dealt it 200 damage at a factor of 1. `demofoe` and `twin` are at 0.3 and 0.4 now, as the 1.3 boss's were tuned, and the careless bot is 3 behind. Their HP and the damage of everything else carry the stage's difficulty.
- **The bot got stuck on a one-tile bridge** (one seed of 20 at 2.7): the stuck check had learned the tile at the bridge's mouth as a wall and the one route to the deck was gone. On a stage with a void it now forgets what it learned when A* finds no route and plans again (`combat/bot.ts`); other stages behave as before.
- The twins go over the rim about eight times in a careful run, each a 15% HP loss for the twin that falls, and the bot is never on the void.
- `sense1` opens by flag in the bot's route, as 2.1's hidden path does, with Will in the party; `tests/stage52-gates.test.ts` has Will reveal it by walking up to its foot.
