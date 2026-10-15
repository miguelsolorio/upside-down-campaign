# Technical architecture

Read this first. It's short on purpose. Types live in `src/core/types.ts`. Each folder's `index.ts` is the public API of that module (stubs until the owner replaces them). The design lives in `docs/game-design.md`. Level 1 lives in `docs/level-1.md`, Level 2 (stage 1.2, Hawkins Lab) in `docs/level-2.md`, Level 3 (stage 1.3, the middle school and the Demogorgon) in `docs/level-3.md`, Level 4 (stage 2.1, the arcade and the pumpkin patch) in `docs/level-4.md`, Level 5 (stage 2.2, the tunnels, with Max and Steve) in `docs/level-5.md`, Level 6 (stage 2.3, the Gate, the Demodog Alpha and the defense) in `docs/level-6.md`, and the map screen and party picks in `docs/map-screen.md`. The stage order, who plays each stage and what carries between stages is `src/core/campaign.ts`, and how fast the party levels over the run, measured, is `docs/pace.md`. Campaign progress for the map is `src/core/progress.ts`, and the map's view type is `src/core/mapdata.ts` (its layout is in `src/gfx/map_geo.ts`).

## Rules

- TypeScript with erasable syntax only: no `enum`, no `namespace`, no constructor parameter properties. Use `import type` for types. Every relative import ends in `.ts`.
- Pure modules never touch `document`, `window`, `localStorage`, canvas or `Audio*` at import time, so Node can run them: `src/combat`, `src/heroes`, `src/enemies`, `src/progression`, story data, stage data, and the pure files in `src/core` (`types`, `tiles`, `text`, `rng`, `config`, `viewport`).
- Files stay under about 500 lines. Write in chunks of about 400 lines or less.
- Don't edit files you don't own. Shared files (`src/core/*`, `src/main.ts`, `src/flow.ts`, `docs/*`, `package.json`, `tsconfig.json`, `vite.config.ts`, `index.html`) are read-only for sub-agents. If one needs to change, say so in your report.
- Copy rules for every string, comment and doc: no em dashes, ever. Contractions are fine. Dry, flat and short. Concrete nouns. Spell out numbers under ten in prose. Sentence case in headings. Avoid "seamless", "robust", "leverage", "unlock", "delve".
- Dialogue boxes hold at most 3 lines of 32 characters. Use "\n" for a hard break.

## Commands (run from the project root)

- Typecheck: `node /Users/miguelsolorio/Developer/diablo/node_modules/typescript/bin/tsc --noEmit -p .`
- Tests: `node --test tests/<file>.test.ts`, or `node --test tests/*.test.ts` for all. Node strips the types itself.
- The dev server is already running at http://127.0.0.1:5173 (Vite, hot reload). Don't start another. `npm install` doesn't work in this sandbox.
- Browser pane: open your own tab with `tabs_create` and pass its `tabId` on every call. Close it when done. Screenshots at scale 0.5, no more than three. Prefer `javascript_tool` and console reads. `window.__ud` exposes `{ g, audio, bindings, frame }`. Read 1x pixels from `frame`, not the page canvas, which is scaled up.
- URL flags: `?sheet=1` sprite sheet, `?audio=1` audio lab, `?skip=1` skip title and prologue, `?dev=1` dev panel, `?bot=1` bot, `?stage=1.1` or `?stage=1.2`, `?time=day` or `?time=night`, `?mute=1`, `?god=1`, `?level=3`, `?touch=1` touch controls with a mouse.

## Ownership

| Folder | Owner |
|---|---|
| `src/gfx/` (including `sheet.ts`) | Art |
| `src/audio/` (including `lab.ts`) | Audio |
| `src/combat/`, `src/heroes/`, `src/enemies/`, `src/progression/`, and their tests | Sim |
| `src/world/` | World |
| `src/arcade/` | World |
| `src/ui/` | UI |
| `src/story/` | Story |
| `src/core/`, `src/main.ts`, `src/flow.ts`, `docs/`, root configs | Lead (read-only for agents) |
| A `*-variations.html` page at the root | The agent whose brief names it |

## Units and conventions

- Screen is `SCREEN_W` by 224 px, tiles are 16 by 16. `SCREEN_W` follows the window (`core/viewport.ts` picks it, `setScreenWidth` sets it) and is 256 in Node and on the dev scenes. It is a live binding: read it when you draw and never copy it into a module-level const. The HUD covers the top `VIEW_TOP` px: 20 at 256 wide and 26 on a wider screen, live like `SCREEN_W`. The world is drawn after `ctx.translate(-camX, VIEW_TOP - camY)`.
- The world shows in the clear band, `VIEW_W` wide starting at `VIEW_X` (at most `CLEAR_MAX`, 448). The camera frames the band, so `camX` is still the world x at screen x 0. Anything placed against the world view (callouts, the puzzle caret, the corner controls) stays inside the band.
- Screens laid out for 256 (menus, cards, dialogue, the prologue set) draw inside `inFrame` from `ui/kit.ts`, which moves the origin to `FRAME_X`. Inside it, center on `BASE_W` or 128, never `SCREEN_W`. Full-width backgrounds go outside it. The mouse is in screen px: hit-test something drawn in the frame with `toFrame(input.hover())`. `drawMenu` records its row boxes in screen px already. `paintGlow` writes pixels directly and ignores the transform, so its lights take screen x.
- While the touch controls show, the screen is 256 wide and `core/touchlayout.ts` places it in the Game Boy's bezel.
- The game draws into an offscreen canvas at 1x (`__ud.frame` in the browser). `main.ts` copies it up onto the page's canvas each frame.
- World coordinates are pixels. An actor's position is its feet: bottom-center of the sprite. Sprites live in 16 by 16 cells. The collision box is 10 wide by 8 tall, centered on x and ending at y. The hurt box is 12 wide by 14 tall, ending at y.
- 60 Hz fixed step. Durations are frames. Speeds are px per frame.
- Facing is `'down' | 'up' | 'left' | 'right'`. Art draws left by flipping right.
- The sim draws nothing and plays nothing. It returns events and a `view()`. World forwards `sfx` events to `audio.sfx`.
- Only the active hero is on the field with collision. The other party members trail behind it as cosmetic followers (no collision, no AI). Each follower walks toward the point on the leader's path a short while back (at no more than 2 px a frame), but never gets closer to him than its gap: 14, 19 and 24 px for the first, second and third. The gap is the same walking or standing, so when he stops the nearest follower just stops, the ones further back finish closing up, and nobody ever steps away from him. They end up stacked close behind him on the path he came along, never on top of him. A follower that really is on top of him once he has stood still for six frames (after a swap, or at the start of a level) steps out at walking pace (1 px a frame) to a spot behind him, opposite to the way he last walked (his input, not his aim, and not a knockback), or beside it if that spot is in a wall (`updateFollowers` in `combat/hero.ts`).
- Input: `core/input.ts` merges the keys (`core/bindings.ts`) with an Xbox pad (`core/gamepad.ts`, pure). The sim scales speed by stick magnitude, and its own deadzone is 0.15, so the pad deadzone (0.2) sits above it and passes the raw vector. The main loop copies `input.device()` into `bindings.setPromptDevice` each tick, and every hint, label and `{token}` in story lines then names keys or buttons for that device. Add new prompts through `labelOf` or `keyText`, not literals. `input.interrupted()` is true for one tick after the window lost focus, the tab was hidden, or the controller in use disconnected (one that was not being played with, or one of two, doesn't count). The play scene opens the pause menu on it, and a cabinet run holds on it; scenes where nothing moves ignore it.
- Touch: the phone is dressed as a Game Boy. `core/touchlayout.ts` (pure) places the game in the bezel and lays out the body, the D-pad and the buttons for a viewport and its safe area, upright in portrait and wide like a Game Boy Advance in landscape. `core/touchpad.ts` (pure) turns fingers into a virtual standard pad, which `input.ts` reads with the same `readPad` as a real one. Its `dpadVector` makes each arm of the D-pad a clean press and lets a sliding thumb steer between them like a stick. `ui/touchui.ts` mounts the overlay canvas behind the game and the pointer listeners, and `ui/touchdraw.ts` draws the shell with smooth paths at device pixels, keeping the parts that never move in a cached canvas per layout and theme. The keys are in `ui/touchkeys.ts`. The colours are a `ShellTheme` in `ui/touchtheme.ts`: `LIGHT` (grey) or `DARK` (black), picked each frame by `shellTheme(settings.shell, prefers-color-scheme)`, so the shell redraws when the phone switches. `shell-variations.html` keeps the five dark designs that were on review (`ui/var/shells.ts`). A phone starts on the `'touch'` device. A scene calls `input.offer(action)` when that action would do something this tick, and the d20 key lights gold when the burst is offered. `touch-controls.html` shows the shell on phone frames.

## Time of day

- A stage is `day` or `night` (`StageData.time`, overridable with `?time=` in the URL). There is no darkness layer in either.
- Day draws the normal art. Night draws the night art: `bakeStage(rows, true)` repaints each tile through `gfx/night.ts` (a night palette, a darker tree palette, rim light on the treeline, dew, fireflies, glowing mushrooms and flowers, moon glints on the water) and `drawProp(..., true)` repaints props the same way. Lights (lamp glass, lit windows, bulbs) are not in the night palette, so they stay bright.
- The Lab's tiles have their own night colors (`LAB_NIGHT` in `gfx/night.ts`): dim blue-greys about as bright as the school's hall floor, so stage 2.3's pools do the lighting and not the floor. The lab dressing the school also uses (mass, vines, a bench) only goes dim where it sits against a lab or flesh tile. The overrun Lab's flesh is dark on purpose (`gfx/tile_flesh.ts`), so the party, the demodogs and the rift are the brightest things in the chamber.
- Light at night is a pool painted around each lamp, lit window, string of bulbs, floodlight and the lantern (`gfx/glow.ts`, `paintGlow`). `drawWorld` paints the pools after the tiles and before the sprites, so heroes and enemies are never tinted. The scare stutters them by scaling their level.
- `HERO_POOL_R` in `world/render.ts` gives the active hero a pool of their own. It is 0 now.

## Module APIs

Source of truth: the stubs. Quick map.

- `gfx/index.ts`: `initGfx`, `drawText`, `textWidth`, `bakeStage`, `drawStage`, `drawActor`, `drawFx`, `drawItem`, `drawProp`, `drawHazard` (a floor hazard from `view.hazards`: sparks, arcs, steam), `drawCamCone` (a camera's cone from a prop's `cam`, cast against solid tiles), `paintGlow`, `drawPortrait`, `drawIcon`, `drawPanel`, `drawBar`, `drawLogo`, `drawAlphabetWall`. `gfx/sheet.ts`: `createSheetScene`.
- `audio/index.ts`: `audio` (shape is `AudioApi` in `types.ts`). `audio/lab.ts`: `createAudioLabScene`.
- `combat/index.ts`: `createSim` (its header comment lists the behaviors: elites, shielded guards and the Warden, floor hazards, sweeping cameras, gaps and cracks, the Alpha, run-time spawns and the defense). `combat/bot.ts`: `createBot` (a `dash` waypoint crosses a gap as Max). `combat/defense.ts` runs a defense, `combat/spawns.ts` the enemies the sim brings up at burrows. `combat/pokes.ts` also stands a knocked-out hero back up when the party tries a gate only they can open.
- `ui/map.ts`: `createMapScene`, which opens party picks (`ui/picks.ts`, rules in the pure `ui/picks_logic.ts`) on a stage where `needsPicks` is true and passes the picks to `onPlay`. The pool, the locked heroes and the levels come from `core/campaign.ts` (`rosterFor`, `requiredFor`, `pickParty`, `poolFor`, `partyFor`); the last picks live in `core/progress.ts`.
- `ui/index.ts`: `drawHud` (the optional fourth argument is a `HudOpts`: the benched hero whose slot pulses for a puzzle hint, the heroes whose level-up effect is lit, the frames since the last swap, the hovered portrait, whether the name and level are hovered, and the input device), `createDialogueBox`, `createTitleScene`, `createChapterCard`, `createResultsScene`, `createPauseScene` (it takes a `party()` for the character sheet), `createCharSheetScene` (the character sheet, opened by the play scene and by CHARACTERS in the pause menu), `createGameOverScene`, `mountDevPanel`. `ui/charsheetlayout.ts`: the sheet's tab and button boxes, pure. `heroes/charsheet.ts`: `heroSheet`, the pure stats and per-move damage the sheet shows, read from `HERO_DEFS` and `damageRange` so it says what the sim does.
- `story/index.ts`: `SCRIPTS`, `bark`, `createPrologueScene`.
- `world/index.ts`: `createPlayScene`. `world/puzzles.ts`: `createPuzzleTracker`, the pure tracker behind the puzzle hints (a try with the wrong hero shows the hint at once, a 5 second clock near the puzzle is the backstop), and `isNear`, which gates the hint caret and subtitle. `combat/pokes.ts` detects the tries and the sim reports them as `poked` events. `world/levelfx.ts`: `createLevelFx`, the pure timing behind the in-world level-up effect. `world/klaxon.ts`: `createKlaxon`, the pure timing behind the Lab's red edge glow (`drawKlaxon` in `world/render.ts` draws it), rung from `DirectorEnv.alarm`. `world/devhooks.ts`: the hooks the dev panel gets and `devSuggestions`, the stage's own enemy groups and props for its suggestion boxes. `ui/hudlayout.ts`: `slotRects` and `slotAt`, the portrait rectangles shared by the HUD and click-to-swap, and `levelRect` and `onLevel`, the active hero's name and level, which open the character sheet. `world/triggers.ts`: `createDirector`, whose `hasFired(beat)` it reads. Beat steps include `close` (shut a prop again), `defend` (start the stage's defense) and `light` (light a lights prop for the party, as the Gate does).
- `arcade/index.ts`: `createArcadeScene` (the cabinet overlay the play scene pushes when Space is pressed at an `arcade` prop), `gameFor` and `CABINET_GAMES` (which game a cabinet plays), `TITLES`, `arcadeBoard` and `createBoard` (the saved high-score boards), `postScore`, `MADMAX_SCORE`. Each game is a `Cart` (`arcade/types.ts`): `step(pad)` is pure and returns sfx ids, `draw` paints a 168 px square at 1x. `world/interact.ts`: `nearUsable`, what Space reaches (unlit lights or a cabinet). `Sim.bonus(xp, quarters)` pays the MADMAX prize.
- `flow.ts` glues them: title, prologue, chapter card, play, results.

## Reports

Reply in 150 words or less: files written, any change to an exported signature, what you ran to verify and the result, what's open. No code in the report.
