# Map screen spec

A Hawkins map between stages, the design "Two Hawkins" (chosen from `map-variations.html`). UI runs the scene (`src/ui/map.ts`), gfx draws the whole screen, bars and party band included, from one `MapView` (`src/gfx/map.ts`), flow wires it. The view type and the node states are in `src/core/mapdata.ts`; where each stage sits, the horizon and the route are in `src/gfx/map_geo.ts`. Campaign progress (cleared stages, every hero met) is in `src/core/progress.ts`, and the party for a stage comes from `partyFor` in `src/core/campaign.ts`.

## What it shows

- The whole 256 by 224 screen. A slim strip on top (10 px: the chapter name on the left, the selected stage's name on the right) and a party band at the bottom (28 px: a face and a level for each hero, and the hints as a short legend on the right). The map fills the 186 px between.
- A wavy horizon splits the map. Above it is Hawkins in daylight: the woods, the Lab, the school, the pumpkin patch and arcade, and a town around them (roads, houses, Main Street shops, the water tower, fields, trees). Below it the same land hangs upside down in the Upside Down palette: dark red veins, drifting grey spores, a black sun. The tunnels and the gate are down there.
- One node per stage (1.1 to 5.3), joined by a stitched route. `STAGES_AHEAD` lists stages past the end of the build, shown locked. It is empty now: 5.3, the heart of the Abyss, is the last stage built. The route drops through the hole in the patch, which sits on the horizon. Node states:
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
- Erica's cart opens from the map once chapter 3 is reached (see "Erica's cart").

## Party picks

From 2.2 on, more heroes can play a stage than fit in the party: Mike, Dustin, Lucas, Will, Max and Steve in chapter 2, those six plus Eleven, Robin and Nancy in chapter 3, and the nine plus Eddie in 4.2. The map asks who goes. 4.1 is Hopper alone, so it has no picks.

- **When.** Confirming a stage where `needsPicks(stage)` is true (`core/campaign.ts`: the stage's pool, `rosterFor`, is bigger than `PARTY_SIZE`) opens the picks panel over the map instead of entering. Chapter 1 stages and 2.1 have a fixed four and enter as before.
- **What it shows.** Every hero in the pool: face, name, level, and the gate they open as a short word (DASH, SMASH, BURN, SHOOT, SENSE, PUSH for Eleven, READ for Robin, RIFF for Eddie, SMASH for Hopper; Mike has none). Six heroes are three cards by two; nine are three by three; ten (4.2, 4.3 and chapter 5, where Hopper is back and Eddie is gone) are four across and three down, on narrow cards: the face with the level and the mark beside it, the name and the gate word under it, and the bond tag on the gate word's row (shortened to BOND, or left off, when a long gate word leaves no room). The panel lays out twelve at most. Four are picked, in order; the first is the lead and is marked as such.
- **Locked.** Heroes in `requiredFor(stage)` (Max for 2.2, Steve for 2.3, Robin for 3.2, Eleven for 3.3, Eddie for 4.2) are picked and locked, with a padlock. They can't be taken out. They can be the lead.
- **Opens with** `pickParty(stage, progress.picks)`: the last party picked, fixed up for this stage (required heroes put in, heroes outside the pool dropped, empty slots filled).
- **Controls.** Direction keys move the cursor over the heroes. Attack (A) puts the hero in or takes them out. Special (X) makes a picked hero the lead. A START row confirms; it is live only with four picked. A pick the rules refuse (a fifth hero, or taking out a locked one) buzzes and flashes the cards in the way: the four party cards and the counter for a fifth, the locked hero's own card for a locked one. The flash is steady, not blinking, with REDUCE FLASH on. Esc or Backspace (B) goes back to the map with nothing changed. The mouse can click a face and START. Hints follow the device, as on the map.
- **Bonds.** A picked hero in an active bond (`docs/bonds.md`) has a green tag in the corner of the card: the bond's short name, or N BONDS for two or more. In START's row, under the legend, a tiny line names the bond the cursor is on (the hero's bonds and what they give), previews one with ADDS in yellow when the cursor is on an unpicked hero who would complete it with a slot free, and otherwise lists the party's bonds. It is silent when there are none.
- **On START.** `onPlay(stage, picks)`. Flow remembers them (`withPicks` in `core/progress.ts`) and builds the party with `partyFor(stage, progress.heroes, picks)`. A hero nobody has played yet joins at the average level of the met heroes in the pool minus one.
- **The party band** under the map shows the party the selected stage would get: the last picks, fixed up.
- **Who builds it.** UI owns the panel: `ui/picks_logic.ts` (pure: the cursor, toggling, the lock, the lead, whether START is live), `ui/picks_layout.ts` (pure: where the panel, the cards and the parts of a card sit, for six to twelve heroes) and `ui/picks.ts` (input and drawing). It draws inside `inFrame` with the gfx primitives (`drawPortrait`, `drawText`, `drawPanel`, `drawIcon`), the way the HUD does. `ui/map.ts` opens it and hands the result to `onPlay`.
- **Variation sheet first.** `picks-variations.html` at the project root: five layouts for the panel over the map. The owner picked **Grid**: a PARTY panel over the map with the heroes as three cards by two (face, name, level, gate word), the lead framed in amber, party numbers on the picked, a padlock on the locked, START and a one-line legend under them.
- **Data.** `poolFor(stage, progress.heroes)` gives every hero in the pool at the level they'd play at; `requiredFor`, `pickParty` and `needsPicks` do the rest. `MapOpts.onPlay` takes the picks as an optional second argument.
- **Tests.** `tests/picks.test.ts` covers `picks_logic.ts`: the lock, toggling, the lead, START only at four, and the cursor over three and four columns. `tests/ui-ch4.test.ts` covers the layouts (nothing overlaps, everything inside the frame, for six to twelve) and draws the panel. `pickParty` and `withPicks` are tested in `tests/campaign.test.ts`.

## Erica's cart

Erica runs an ice cream cart and sells the party what it carries into a stage. It is the shop the design promised for the map.

- **When.** Once 2.3 is cleared (chapter 3 reached), Special (X on a gamepad) on the map opens ERICA'S CART over the map, the way picks open. The legend in the party band gains a SHOP line then, and not before.
- **What it sells.** Eggos and Cokes at triple price: an Eggo is 15 quarters and a Coke is 9 (`PRICES` in `core/shop.ts`). The party carries at most three of each (`STASH_MAX`).
- **What it shows.** Erica's portrait and one dry line, a row per item (icon, name, price, how many are carried out of three), the purse, and a one-line legend. A row the purse can't pay for, or that is full, is grey.
- **Controls.** Up and down move between the rows. Attack (A) buys one. Esc or Backspace (B) closes it. The mouse can click a row. A buy plays `buy`.
- **The purse.** Quarters carry between stages: `Progress.purse`, added to on every clear (`recordClear` takes the run's quarters). A save from before the purse existed starts with 10 quarters per cleared stage.
- **The stash.** `Progress.stash` is `{ eggo, coke }`. The sim spends it on its own during a stage (see `docs/level-7.md`, "Erica and the stash"), and each item spent is written back at once.
- **Data.** `core/shop.ts` is pure: `PRICES`, `STASH_MAX`, `canBuy(progress, item)` and `buy(progress, item)`, which returns a new record (or the same one when it can't). `shopOpen(progress)` says whether the cart is open yet.
- **Who builds it.** UI owns the panel: `ui/shop_logic.ts` (pure: the cursor, which rows are live) and `ui/shop.ts` (input and drawing, inside `inFrame` with the gfx primitives, like the picks panel). `ui/map.ts` opens it. Flow saves the progress it returns.
- **Tests.** `tests/shop.test.ts` covers `core/shop.ts` and `ui/shop_logic.ts`: prices, the cap, a short purse, the old-save purse.

## Chapter three on the map

- Starcourt Mall stands in Hawkins, above the horizon, as a new landmark: the long low mall, its sign, the parking lot. Stage 3.1 sits on it.
- Stage 3.2, the base under the mall, sits just below the mall on the horizon line. It is underground but not in the Upside Down, so it gets no vein palette.
- Stage 3.3, the food court, sits inside the mall and opens once 3.2 is cleared. It is the last stage of the build, and it closes chapter 3 (`docs/level-9.md`, "The chapter end"). Its name plate says FOOD COURT, like STARCOURT's.
- The route climbs back up from the Gate (2.3) to the mall. Art picks where it crosses the horizon. The token turns over as it does, as at the hole in the patch.
- `MAP_PLACE` in `core/mapdata.ts` gains `mall` (3.1), `base` (3.2) and `foodcourt` (3.3). The positions and the art are Art's, in `gfx/map_geo.ts`, `gfx/map_art.ts` and `gfx/map_land.ts`.
- The chapter strip says Chapter three on those nodes. Entering 3.1 for the first time shows the chapter three card: CHAPTER THREE, STARCOURT.

## Chapter four on the map

- **Kamchatka (4.1)** is half a world away, so it is not in Hawkins. It sits in an inset in a corner of the map, a small framed scene of the camp at night (snow, the wire, the floodlight's amber, the block), with a KAMCHATKA plate. The route from the food court runs to the inset's edge and the token crosses to it along a dashed line, a long way in one hop. Art picks the corner and the frame, and keeps the Hawkins half readable round it.
- **The Creel House (4.2)** stands on its hill at the edge of Hawkins, above the horizon: the dark Victorian house behind its fence, a dead tree, one window lit. Its plate says CREEL HOUSE. The route comes back from the inset to it.
- The token on 4.1 is Hopper (the lead of a party of one) in the Telogreika. On 4.2 it is the 4.2 party's lead.
- `MAP_PLACE` in `core/mapdata.ts` gains `kamchatka` (4.1) and `creel` (4.2). The positions and the art are Art's, in `gfx/map_geo.ts`, `gfx/map_art.ts` and `gfx/map_land.ts`.
- The chapter strip says Chapter four on those nodes. Entering 4.1 for the first time shows the chapter four card: CHAPTER FOUR, HELLFIRE.
- **Upside Down Hawkins (4.3)** is a window onto the town's street on the far side, below the horizon (`map_udtown.ts`), with a stacked UPSIDE DOWN over HAWKINS plate; the route drops to it from the Creel House through a hole in the horizon, and the token turns over on the way. **Vecna's lair (4.4)** is the Creel House's twin hanging upside down from the earth at the right (`map_lair.ts`), with a stacked VECNA over LAIR plate. `MAP_PLACE` has `udtown` and `lair`.
- 4.4 closes chapter four: its results say CHAPTER FOUR CLEAR (`closesChapter` reads the chapter's length, `CHAPTER_LENGTH` in `core/campaign.ts`), and the route goes on to 5.1.

## Chapter five on the map

- **Hawkins under lockdown (5.1)** and **the Abyss (5.2)** both sit in the Upside Down half, below the horizon, since the army's town and the Abyss under it are seen from the dark side. 5.1 is in the bottom left, with a LOCKDOWN plate; 5.2 is left of the Gate, a little above it, with an ABYSS plate over the GATE's. Chapter four's two places hold the right-hand side of the dark half, so the route runs from Vecna's lair (4.4) across the bottom to 5.1 and then on to 5.2.
- `MAP_PLACE` in `core/mapdata.ts` gains `lockdown` (5.1) and `abyss` (5.2). The nodes (`POS`, `PLACE_OF` and `BEND` in `gfx/map_geo.ts`) sit over their landmarks, which `gfx/map_ch5.ts` paints: the lockdown is a floodlight on its mast over a wall of sandbags with its cone dithered across them, and the Abyss is a floating island with a lit house, rock tapering under it and vines off its rim, hung over the dark sun. Each has its plate (`map_land.ts`) under it, pointing up like the tunnels', clear of the token and of the GATE plate. A locked one is greys, like the rest.
- The chapter strip says Chapter five on those nodes. Entering 5.1 for the first time shows the chapter five card: CHAPTER FIVE, THE LAST CAMPAIGN.
- **The heart (5.3)** is the last stop, below the horizon between the Abyss and Upside Down Hawkins, with a HEART plate under it. It has no landmark yet (Art draws it): `MAP_PLACE` has `heart`, and the node, its plate and the route's last leg (`POS`, `PLACE_OF`, `BEND`, `map_land.ts`) are stand-ins.
- 5.3 is the last stage of the campaign: it closes chapter five (`closesChapter`) and its results say CAMPAIGN COMPLETE with the feedback note (`endsCampaign`).

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
