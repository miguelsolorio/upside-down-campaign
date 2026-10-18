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

## Puzzles

- `sense1`: Will's hidden path, the 2.1 `sense` gate. It is on the route, which is why Will is locked.
- `burn1` (Dustin, Nancy) and `crack1` (Steve, Hopper) are on the route with two heroes each, so the hint always names someone the party can field. If neither of a gate's heroes is picked, the gate's `alt` opens to any hero's attack after a delay, as 3.1's panel does.
- `gap1`: Max only, and only to the cache.

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

To be filled by the build.
