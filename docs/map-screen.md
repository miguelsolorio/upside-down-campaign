# Map screen spec

A Hawkins map between stages, the design "Two Hawkins" (chosen from `map-variations.html`). UI runs the scene (`src/ui/map.ts`), gfx draws the whole screen, bars and party band included, from one `MapView` (`src/gfx/map.ts`), flow wires it. The view type and the node states are in `src/core/mapdata.ts`; where each stage sits, the horizon and the route are in `src/gfx/map_geo.ts`. Campaign progress (cleared stages, every hero met) is in `src/core/progress.ts`, and the party for a stage comes from `partyFor` in `src/core/campaign.ts`.

## What it shows

- The whole 256 by 224 screen. A slim strip on top (10 px: the chapter name on the left, the selected stage's name on the right) and a party band at the bottom (28 px: a face and a level for each hero, and the hints as a short legend on the right). The map fills the 186 px between.
- A wavy horizon splits the map. Above it is Hawkins in daylight: the woods, the Lab, the school, the pumpkin patch and arcade, and a town around them (roads, houses, Main Street shops, the water tower, fields, trees). Below it the same land hangs upside down in the Upside Down palette: dark red veins, drifting grey spores, a black sun. The tunnels and the gate are down there.
- One node per stage (1.1 to 2.1), plus 2.2 and 2.3 shown locked (`STAGES_AHEAD`), joined by a stitched route. The route drops through the hole in the patch, which sits on the horizon. Node states:
  - `cleared`: gold, with a check
  - `open`: the next uncleared stage, white and pulsing
  - `locked`: grey, with a padlock; its landmark is greyed too (in Hawkins)
- A small sign plate in the 3 by 5 font names each place. The selected node has white corner brackets.
- The token is the party lead's sprite. It stands above a node, and hangs upside down below the horizon, turning over as it passes through the hole.
- Music: `hawkins`.

## Controls

- Left and right, or up and down, step the token to the previous or next node that isn't locked. It walks at 1.75 px a frame along the route (`WALK_SPEED` in `map_logic.ts`, hop lengths from `hopLength` in `gfx/map_geo.ts`), and input is ignored while it walks.
- Attack, Enter or Space (A on a gamepad) enters the selected stage. Esc or Backspace (B) goes back to the title.
- Hints follow the input device the same way the rest of the game does (`labelOf` and `keyText`), as a short legend, one key to a line, in the party band.

## Rules

- `createMapScene(opts)` builds a `MapView` every frame and calls `drawMapScreen`, with:
  - `progress: Progress | null`
  - `party(stageId): PartySeed[]`, for the panel
  - `name(stageId): string`
  - `onPlay(stageId): void`
  - `onQuit(): void`
- The scene opens with the token on the next uncleared stage, or on the last one when everything is cleared.
- A cleared stage can be replayed. The party is `partyFor(stage, progress.heroes)`, so a chapter 1 replay brings Eleven back and a chapter 2 one brings Will. A clear merges the party back in with `recordClear`, so a replay never makes a hero worse.
- Flow (Lead):
  - Results → map.
  - Map → `onPlay` → chapter card if the stage opens a chapter and has never been cleared, else the level card (skipped when the story is off) → play.
  - Title CONTINUE resumes a mid-stage save if there is one, else opens the map when progress exists.
  - NEW GAME wipes both.
- No shop and no party picks yet: the shop arrives with Erica in chapter 3, and party picks once there are more than four heroes.

## gfx

`drawMapScreen(ctx, view: MapView)` paints everything. The view holds the nodes (id, state, place, name), the selected node, the walk (`{ from, to, k }` with k from 0 to 1 along the route, or null), the lead, the party with levels, the chapter, the stage name, the hint line, the frame counter and `calm` (Reduce flashing: no blinking, slow pulses only). The still layers are painted once per set of node states (`map_land.ts`) and cached; the landmarks are in `map_art.ts` and the town in `map_town.ts`. `hopLength(from, to)` is the length in px of the walk between two stages, for the scene to time its walk. Add the map to the `?sheet=1` review page.

## Tests

- `tests/map.test.ts` covers the pure parts (`ui/map_logic.ts` and `gfx/map_geo.ts`, both DOM-free):
  - which node the token starts on
  - stepping skips locked nodes
  - a replay's party
  - the walk: hop lengths, speed, arrival
- `tests/patch-art.test.ts` paints the land as one pixel buffer and checks the horizon split and the greyed locked places.
- Progress and `partyFor` are already tested in `tests/campaign.test.ts`.
