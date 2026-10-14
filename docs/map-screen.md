# Map screen spec

A Hawkins map in the Mario 3 style, between stages. UI runs the scene (`src/ui/map.ts`), gfx draws the land, nodes and token from a `MapView`, flow wires it. The layout and types are in `src/core/mapdata.ts`. Campaign progress (cleared stages, every hero met) is in `src/core/progress.ts`, and the party for a stage comes from `partyFor` in `src/core/campaign.ts`.

## What it shows

- The whole 256 by 224 screen, no HUD.
- One node per stage at `MAP_NODES` (1.1 to 2.1), plus 2.2 and 2.3 shown locked (`STAGES_AHEAD`), with a dotted path between them. Node states:
  - `cleared`: lit, with a small flag
  - `open`: the next uncleared stage, pulsing
  - `locked`: grey
- The land around each node is painted for its `MAP_PLACE`: woods, the Lab behind its fence, the school, the patch, then the tunnels and the gate, dim because they're locked.
- The token is the party lead's sprite, walking along the path.
- A top bar: the chapter name (`CHAPTERS`) and the selected stage's name.
- A bottom panel: the party for the selected stage (`partyFor`), with face, name and level for each.
- Music: `hawkins`.

## Controls

- Left and right, or up and down, step the token to the previous or next node that isn't locked. It walks at 2 px a frame along the path, and input is ignored while it walks.
- Attack, Enter or Space (A on a gamepad) enters the selected stage. Esc or Backspace (B) goes back to the title.
- Hints follow the input device the same way the rest of the game does (`labelOf` and `keyText`), in one line at the bottom.

## Rules

- `createMapScene(opts)` with:
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

`drawMap(ctx, view: MapView)` paints the land, path, nodes and token. Text and panels are UI's, using `drawText`, `drawPanel` and `drawPortrait`. Add the map to the `?sheet=1` review page.

## Tests

- `tests/map.test.ts` covers the pure parts (export them from a DOM-free file such as `ui/map_logic.ts`):
  - which node the token starts on
  - stepping skips locked nodes
  - a replay's party
- Progress and `partyFor` are already tested in `tests/campaign.test.ts`.
