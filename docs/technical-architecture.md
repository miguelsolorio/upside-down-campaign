# Technical architecture

Read this first. It's short on purpose. Types live in `src/core/types.ts`. Each folder's `index.ts` is the public API of that module (stubs until the owner replaces them). The design lives in `docs/game-design.md`. Level 1 lives in `docs/level-1.md`.

## Rules

- TypeScript with erasable syntax only: no `enum`, no `namespace`, no constructor parameter properties. Use `import type` for types. Every relative import ends in `.ts`.
- Pure modules never touch `document`, `window`, `localStorage`, canvas or `Audio*` at import time, so Node can run them: `src/combat`, `src/heroes`, `src/enemies`, `src/progression`, story data, stage data, and the pure files in `src/core` (`types`, `tiles`, `text`, `rng`, `config`).
- Files stay under about 500 lines. Write in chunks of about 400 lines or less.
- Don't edit files you don't own. Shared files (`src/core/*`, `src/main.ts`, `src/flow.ts`, `docs/*`, `package.json`, `tsconfig.json`, `vite.config.ts`, `index.html`) are read-only for sub-agents. If one needs to change, say so in your report.
- Copy rules for every string, comment and doc: no em dashes, ever. Contractions are fine. Dry, flat and short. Concrete nouns. Spell out numbers under ten in prose. Sentence case in headings. Avoid "seamless", "robust", "leverage", "unlock", "delve".
- Dialogue boxes hold at most 3 lines of 32 characters. Use "\n" for a hard break.

## Commands (run from the project root)

- Typecheck: `node /Users/miguelsolorio/Developer/diablo/node_modules/typescript/bin/tsc --noEmit -p .`
- Tests: `node --test tests/<file>.test.ts`, or `node --test tests/*.test.ts` for all. Node strips the types itself.
- The dev server is already running at http://127.0.0.1:5173 (Vite, hot reload). Don't start another. `npm install` doesn't work in this sandbox.
- Browser pane: open your own tab with `tabs_create` and pass its `tabId` on every call. Close it when done. Screenshots at scale 0.5, no more than three. Prefer `javascript_tool` and console reads. `window.__ud` exposes `{ g, audio }`.
- URL flags: `?sheet=1` sprite sheet, `?audio=1` audio lab, `?skip=1` skip title and prologue, `?dev=1` dev panel, `?bot=1` bot, `?stage=1.1`, `?time=day` or `?time=night`, `?mute=1`, `?god=1`, `?level=3`.

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

- Screen is 256 by 224 px, tiles are 16 by 16. The HUD covers the top 20 px (`VIEW_TOP`). The world is drawn after `ctx.translate(-camX, VIEW_TOP - camY)`.
- World coordinates are pixels. An actor's position is its feet: bottom-center of the sprite. Sprites live in 16 by 16 cells. The collision box is 10 wide by 8 tall, centered on x and ending at y. The hurt box is 12 wide by 14 tall, ending at y.
- 60 Hz fixed step. Durations are frames. Speeds are px per frame.
- Facing is `'down' | 'up' | 'left' | 'right'`. Art draws left by flipping right.
- The sim draws nothing and plays nothing. It returns events and a `view()`. World forwards `sfx` events to `audio.sfx`.
- Only the active hero is on the field with collision. The other party members trail behind it as cosmetic followers (no collision, no AI).
- Input: `core/input.ts` merges the keys (`core/bindings.ts`) with an Xbox pad (`core/gamepad.ts`, pure). The sim scales speed by stick magnitude, and its own deadzone is 0.15, so the pad deadzone (0.2) sits above it and passes the raw vector. The main loop copies `input.device()` into `bindings.setPromptDevice` each tick, and every hint, label and `{token}` in story lines then names keys or buttons for that device. Add new prompts through `labelOf` or `keyText`, not literals.

## Time of day

- A stage is `day` or `night` (`StageData.time`, overridable with `?time=` in the URL). There is no darkness layer in either.
- Day draws the normal art. Night draws the night art: `bakeStage(rows, true)` repaints each tile through `gfx/night.ts` (a night palette, a darker tree palette, rim light on the treeline, dew, fireflies, glowing mushrooms and flowers, moon glints on the water) and `drawProp(..., true)` repaints props the same way. Lights (lamp glass, lit windows, bulbs) are not in the night palette, so they stay bright.
- Light at night is a pool painted around each lamp, lit window, string of bulbs, floodlight and the lantern (`gfx/glow.ts`, `paintGlow`). `drawWorld` paints the pools after the tiles and before the sprites, so heroes and enemies are never tinted. The scare stutters them by scaling their level.
- `HERO_POOL_R` in `world/render.ts` gives the active hero a pool of their own. It is 0 now.

## Module APIs

Source of truth: the stubs. Quick map.

- `gfx/index.ts`: `initGfx`, `drawText`, `textWidth`, `bakeStage`, `drawStage`, `drawActor`, `drawFx`, `drawItem`, `drawProp`, `paintGlow`, `drawPortrait`, `drawIcon`, `drawPanel`, `drawBar`, `drawLogo`, `drawAlphabetWall`. `gfx/sheet.ts`: `createSheetScene`.
- `audio/index.ts`: `audio` (shape is `AudioApi` in `types.ts`). `audio/lab.ts`: `createAudioLabScene`.
- `combat/index.ts`: `createSim`. `combat/bot.ts`: `createBot`.
- `ui/index.ts`: `drawHud` (the optional fourth argument is a `HudOpts`: the benched hero whose slot pulses for a puzzle hint, the heroes whose level-up effect is lit, the frames since the last swap, the hovered portrait and the input device), `createDialogueBox`, `createTitleScene`, `createChapterCard`, `createResultsScene`, `createPauseScene`, `createGameOverScene`, `mountDevPanel`.
- `story/index.ts`: `SCRIPTS`, `bark`, `createPrologueScene`.
- `world/index.ts`: `createPlayScene`. `world/puzzles.ts`: `createPuzzleTracker`, the pure clock behind the puzzle hints, and `HINT_NUDGE`. `world/levelfx.ts`: `createLevelFx`, the pure timing behind the in-world level-up effect. `ui/hudlayout.ts`: `slotRects` and `slotAt`, the portrait rectangles shared by the HUD and click-to-swap. `world/triggers.ts`: `createDirector`, whose `hasFired(beat)` it reads.
- `flow.ts` glues them: title, prologue, chapter card, play, results.

## Reports

Reply in 150 words or less: files written, any change to an exported signature, what you ran to verify and the result, what's open. No code in the report.
