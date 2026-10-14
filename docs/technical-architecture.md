# Technical architecture

Read this first. It's short on purpose. Types live in `src/core/types.ts`. Each folder's `index.ts` is the public API of that module (stubs until the owner replaces them). The design lives in `docs/game-design.md`. Level 1 lives in `docs/level-1.md` and Level 2 (stage 1.2, Hawkins Lab) in `docs/level-2.md`. The stage order and what carries between stages is `src/core/campaign.ts`.

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
| `src/ui/` | UI |
| `src/story/` | Story |
| `src/core/`, `src/main.ts`, `src/flow.ts`, `docs/`, root configs | Lead (read-only for agents) |

## Units and conventions

- Screen is `SCREEN_W` by 224 px, tiles are 16 by 16. `SCREEN_W` follows the window (`core/viewport.ts` picks it, `setScreenWidth` sets it) and is 256 in Node and on the dev scenes. It is a live binding: read it when you draw and never copy it into a module-level const. The HUD covers the top `VIEW_TOP` px: 20 at 256 wide and 26 on a wider screen, live like `SCREEN_W`. The world is drawn after `ctx.translate(-camX, VIEW_TOP - camY)`.
- The world shows in the clear band, `VIEW_W` wide starting at `VIEW_X` (at most `CLEAR_MAX`, 448). The camera frames the band, so `camX` is still the world x at screen x 0. Anything placed against the world view (callouts, the puzzle caret, the corner controls) stays inside the band.
- Screens laid out for 256 (menus, cards, dialogue, the prologue set) draw inside `inFrame` from `ui/kit.ts`, which moves the origin to `FRAME_X`. Inside it, center on `BASE_W` or 128, never `SCREEN_W`. Full-width backgrounds go outside it. The mouse is in screen px: hit-test something drawn in the frame with `toFrame(input.hover())`. `drawMenu` records its row boxes in screen px already. `paintGlow` writes pixels directly and ignores the transform, so its lights take screen x.
- While the touch controls show, the screen is 256 wide and `core/touchlayout.ts` places it between the controls.
- The game draws into an offscreen canvas at 1x (`__ud.frame` in the browser). `main.ts` copies it up onto the page's canvas each frame.
- World coordinates are pixels. An actor's position is its feet: bottom-center of the sprite. Sprites live in 16 by 16 cells. The collision box is 10 wide by 8 tall, centered on x and ending at y. The hurt box is 12 wide by 14 tall, ending at y.
- 60 Hz fixed step. Durations are frames. Speeds are px per frame.
- Facing is `'down' | 'up' | 'left' | 'right'`. Art draws left by flipping right.
- The sim draws nothing and plays nothing. It returns events and a `view()`. World forwards `sfx` events to `audio.sfx`.
- Only the active hero is on the field with collision. The other party members trail behind it as cosmetic followers (no collision, no AI). Each follower walks toward the point on the leader's path a short while back (at no more than 2 px a frame), but never gets closer to him than its gap: 14, 19 and 24 px for the first, second and third. The gap is the same walking or standing, so when he stops the nearest follower just stops, the ones further back finish closing up, and nobody ever steps away from him. They end up stacked close behind him on the path he came along, never on top of him. A follower that really is on top of him once he has stood still for six frames (after a swap, or at the start of a level) steps out at walking pace (1 px a frame) to a spot behind him, opposite to the way he last walked (his input, not his aim, and not a knockback), or beside it if that spot is in a wall (`updateFollowers` in `combat/hero.ts`).
- Input: `core/input.ts` merges the keys (`core/bindings.ts`) with an Xbox pad (`core/gamepad.ts`, pure). The sim scales speed by stick magnitude, and its own deadzone is 0.15, so the pad deadzone (0.2) sits above it and passes the raw vector. The main loop copies `input.device()` into `bindings.setPromptDevice` each tick, and every hint, label and `{token}` in story lines then names keys or buttons for that device. Add new prompts through `labelOf` or `keyText`, not literals.
- Touch: `core/touchlayout.ts` (pure) places the game and the on-screen controls for a viewport and its safe area, and `core/touchpad.ts` (pure) turns fingers into a virtual standard pad, which `input.ts` reads with the same `readPad` as a real one. `ui/touchui.ts` mounts the overlay canvas and the pointer listeners, and `ui/touchdraw.ts` draws the controls in game pixels. A phone starts on the `'touch'` device. A scene calls `input.offer(action)` when that action would do something this tick (skip during dialogue and the prologue, burst when the meter is full), and the touch controls light that button. `touch-controls.html` shows the controls on phone frames.

## Time of day

- A stage is `day` or `night` (`StageData.time`, overridable with `?time=` in the URL). There is no darkness layer in either.
- Day draws the normal art. Night draws the night art: `bakeStage(rows, true)` repaints each tile through `gfx/night.ts` (a night palette, a darker tree palette, rim light on the treeline, dew, fireflies, glowing mushrooms and flowers, moon glints on the water) and `drawProp(..., true)` repaints props the same way. Lights (lamp glass, lit windows, bulbs) are not in the night palette, so they stay bright.
- Light at night is a pool painted around each lamp, lit window, string of bulbs, floodlight and the lantern (`gfx/glow.ts`, `paintGlow`). `drawWorld` paints the pools after the tiles and before the sprites, so heroes and enemies are never tinted. The scare stutters them by scaling their level.
- `HERO_POOL_R` in `world/render.ts` gives the active hero a pool of their own. It is 0 now.

## Module APIs

Source of truth: the stubs. Quick map.

- `gfx/index.ts`: `initGfx`, `drawText`, `textWidth`, `bakeStage`, `drawStage`, `drawActor`, `drawFx`, `drawItem`, `drawProp`, `drawHazard` (a floor hazard from `view.hazards`: sparks, arcs, steam), `drawCamCone` (a camera's cone from a prop's `cam`, cast against solid tiles), `paintGlow`, `drawPortrait`, `drawIcon`, `drawPanel`, `drawBar`, `drawLogo`, `drawAlphabetWall`. `gfx/sheet.ts`: `createSheetScene`.
- `audio/index.ts`: `audio` (shape is `AudioApi` in `types.ts`). `audio/lab.ts`: `createAudioLabScene`.
- `combat/index.ts`: `createSim` (its header comment lists the behaviors: elites, shielded guards and the Warden, floor hazards, sweeping cameras). `combat/bot.ts`: `createBot`.
- `ui/index.ts`: `drawHud` (the optional fourth argument is a `HudOpts`: the benched hero whose slot pulses for a puzzle hint, the heroes whose level-up effect is lit, the frames since the last swap, the hovered portrait and the input device), `createDialogueBox`, `createTitleScene`, `createChapterCard`, `createResultsScene`, `createPauseScene`, `createGameOverScene`, `mountDevPanel`.
- `story/index.ts`: `SCRIPTS`, `bark`, `createPrologueScene`.
- `world/index.ts`: `createPlayScene`. `world/puzzles.ts`: `createPuzzleTracker`, the pure tracker behind the puzzle hints (a try with the wrong hero shows the hint at once, a 5 second clock near the puzzle is the backstop), and `isNear`, which gates the hint caret and subtitle. `combat/pokes.ts` detects the tries and the sim reports them as `poked` events. `world/levelfx.ts`: `createLevelFx`, the pure timing behind the in-world level-up effect. `ui/hudlayout.ts`: `slotRects` and `slotAt`, the portrait rectangles shared by the HUD and click-to-swap. `world/triggers.ts`: `createDirector`, whose `hasFired(beat)` it reads.
- `flow.ts` glues them: title, prologue, chapter card, play, results.

## Reports

Reply in 150 words or less: files written, any change to an exported signature, what you ran to verify and the result, what's open. No code in the report.
