# Map screen spec

A Hawkins map between stages, the design "Two Hawkins" (chosen from `map-variations.html`). UI runs the scene (`src/ui/map.ts`), gfx draws the whole screen, bars and party band included, from one `MapView` (`src/gfx/map.ts`), flow wires it. The view type and the node states are in `src/core/mapdata.ts`; where each stage sits, the horizon and the route are in `src/gfx/map_geo.ts`. Campaign progress (cleared stages, every hero met) is in `src/core/progress.ts`, and the party for a stage comes from `partyFor` in `src/core/campaign.ts`.

## What it shows

- The whole 256 by 224 screen. A slim strip on top (10 px: the chapter name on the left, the selected stage's name on the right) and a party band at the bottom (28 px: a face and a level for each hero, and the hints as a short legend on the right). The map fills the 186 px between.
- A wavy horizon splits the map. Above it is Hawkins in daylight: the woods, the Lab, the school, the pumpkin patch and arcade, and a town around them (roads, houses, Main Street shops, the water tower, fields, trees). Below it the same land hangs upside down in the Upside Down palette: dark red veins, drifting grey spores, a black sun. The tunnels and the gate are down there.
- One node per stage (1.1 to 2.3), joined by a stitched route. `STAGES_AHEAD` can list stages past the end of the build, shown locked; it is empty now. The route drops through the hole in the patch, which sits on the horizon. Node states:
  - `cleared`: gold, with a check
  - `open`: the next uncleared stage, white and pulsing
  - `locked`: grey, with a padlock; its landmark is greyed too (in Hawkins)
- A small sign plate in the 3 by 5 font names each place. The selected node has white corner brackets.
- The token is the party lead's sprite. It stands above a node, and hangs upside down below the horizon, turning over as it passes through the hole.
- Music: `hawkins`.

## Controls

- Left and right, or up and down, step the token to the previous or next node that isn't locked. It walks at 1.75 px a frame along the route (`WALK_SPEED` in `map_logic.ts`, hop lengths from `hopLength` in `gfx/map_geo.ts`), and input is ignored while it walks.
- Attack, Enter or Space (A on a gamepad) enters the selected stage, or opens party picks first on a stage that needs them. Esc or Backspace (B) goes back to the title.
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
- No shop yet: it arrives with Erica in chapter 3.

## Party picks

From 2.2 on, more heroes can play a stage than fit in the party: Mike, Dustin, Lucas, Will, Max and Steve. The map asks who goes.

- **When.** Confirming a stage where `needsPicks(stage)` is true (`core/campaign.ts`: the stage's pool, `rosterFor`, is bigger than `PARTY_SIZE`) opens the picks panel over the map instead of entering. Chapter 1 stages and 2.1 have a fixed four and enter as before.
- **What it shows.** Every hero in the pool: face, name, level, and the gate they open as a short word (DASH, SMASH, BURN, SHOOT, SENSE; Mike has none). Four are picked, in order; the first is the lead and is marked as such.
- **Locked.** Heroes in `requiredFor(stage)` (Max for 2.2, Steve for 2.3) are picked and locked, with a padlock. They can't be taken out. They can be the lead.
- **Opens with** `pickParty(stage, progress.picks)`: the last party picked, fixed up for this stage (required heroes put in, heroes outside the pool dropped, empty slots filled).
- **Controls.** Direction keys move the cursor over the heroes. Attack (A) puts the hero in or takes them out. Special (X) makes a picked hero the lead. A START row confirms; it is live only with four picked. Esc or Backspace (B) goes back to the map with nothing changed. The mouse can click a face and START. Hints follow the device, as on the map.
- **On START.** `onPlay(stage, picks)`. Flow remembers them (`withPicks` in `core/progress.ts`) and builds the party with `partyFor(stage, progress.heroes, picks)`. A hero nobody has played yet joins at the average level of the met heroes in the pool minus one.
- **The party band** under the map shows the party the selected stage would get: the last picks, fixed up.
- **Who builds it.** UI owns the panel: `ui/picks_logic.ts` (pure: the cursor, toggling, the lock, the lead, whether START is live) and `ui/picks.ts` (input and drawing). It draws inside `inFrame` with the gfx primitives (`drawPortrait`, `drawText`, `drawPanel`, `drawIcon`), the way the HUD does. `ui/map.ts` opens it and hands the result to `onPlay`.
- **Variation sheet first.** `picks-variations.html` at the project root: five layouts for the panel over the map, drawn with the game's renderer, each named so the owner can pick one. UI builds the chosen one.
- **Tests.** `tests/picks.test.ts` covers `picks_logic.ts`: the lock, toggling, the lead, START only at four. `pickParty` and `withPicks` are tested in `tests/campaign.test.ts`.

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
