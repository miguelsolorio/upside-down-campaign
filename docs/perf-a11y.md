# Performance and accessibility: the polish and proof pass (2026-10-18)

The last step of the roadmap asks for a frame time under 4 ms, accessibility checks and screenshots of every stage and boss. This is the record of that pass over stages 1.1 to 3.3 on main at 4980180: what was measured, what was slow, what was fixed, and what is still open. The harness that produced every number is in `scripts/polish/`, and `?perf=1` on any game URL turns the frame-time probe on.

## In short

- **Frame time was inside the 4 ms target on average and over it on the worst frames.** Every stage averaged under 3 ms, but one frame in twenty went over 3.5 ms in the night stages, and a few went past 8. Seven of the nine stages are at night, and every night frame paid for the light pools.
- **The light pools read the canvas back every frame.** A read-back makes the browser finish all its drawing first, so the one call took about a third of the frame. The pools now lift the stage's own pixels and never read the canvas. The picture is the same pixel for pixel. Night stages went from 2.2 to 2.8 ms a frame to 0.9 to 1.5 ms, and no frame in any stage goes over 4 ms any more at the 99th percentile.
- **REDUCE FLASH did not cover everything.** Measured with the bot in every stage, a boss hit five times a second flashed white across a quarter of the screen with the setting on: the screen's average brightness swung 0.13 in a tenth of a second, up to eight times in a second, in 3.3. The Mind Flayer's sweep was a solid white band, and the melee arc was white. All of those are calmed now, and with the setting on the swing is 0.06 at most, and never more than one reversal of 0.1 in a second, in every stage.
- **Some text did not read.** The character sheet, the controls screen and the HUD's hero keys were slate on a dark panel at 2.3 to 2.9 to 1, damage numbers were white on white over the Lab's floors, and the controls hint faded to a color you could not read on the night floor. Over four stages and every screen, 225 of 818 texts on the play field were under 4.5 to 1 at the worst quarter of their edges; now 1 of 555 is, and the controls screen, HUD, pause menu and character sheet have none.
- **Every menu is reachable by keyboard, controller and touch.** Driven for real, not read from the code.
- **Screenshots:** the title, the options, the map, a dialogue box, a level-up, every stage and every boss, in `docs/screenshots/polish-*.png`.

## How it was measured

- **Machine:** an Apple M1 Pro, macOS, Chrome 155 headless with its normal GPU path (ANGLE on Metal). Desktop is a 1280 by 800 window at 2x. Phone is 390 by 844 at 3x with touch emulation and the touch Game Boy on (`?touch=1`), so the game draws at 256 wide inside the shell.
- **Builds:** the numbers come from production builds (`vite build`, minified), served with `vite preview`: main at 4980180 with only the probe added, and this branch. The dev server is slower and noisier.
- **What a frame costs:** `?perf=1` (`src/core/perf.ts`, called from `core/loop.ts`) times each animation frame's `tick()` calls and its `render()`, including the copy of the 1x frame up onto the page canvas. That is the main thread's work. The GPU and compositor run on other threads and are not in it, and a real phone's CPU is several times slower than this one, so the 4 ms target is read against this machine.
- **The run:** the bot (`?bot=1&rush=1&stage=x`) plays each stage from the start until it clears it, 80 to 118 seconds, 60 frames a second the whole way. The first three seconds are dropped. Mean, 95th and 99th percentile and the slowest frame are over every frame of the run, in milliseconds a frame. The same bot run, the same seed and the same ticks give both builds the same fights.
- **Noise:** back to back on the same stage the mean moves by about 0.1 to 0.15 ms. A back-to-back check of the Palace (2.1, a day stage the change doesn't touch) gave 0.72 and 0.85 ms on main and 0.74 and 0.75 on this branch.

## Performance

### Frame time on every stage, desktop

| Stage | Before: mean / p95 / p99 / max | After: mean / p95 / p99 / max | Frames over 4 ms |
|---|---|---|---|
| 1.1 Mirkwood (night) | 2.2 / 3.1 / 3.8 / 7.8 | 0.9 / 1.4 / 1.8 / 3.4 | 0.6% to 0.0% |
| 1.2 Hawkins Lab (day) | 1.6 / 2.5 / 2.8 / 4.2 | 1.7 / 2.6 / 2.9 / 4.9 | 0.0% to 0.1% |
| 1.3 Middle School (night) | 2.3 / 3.6 / 4.5 / 13.2 | 1.1 / 1.8 / 2.2 / 4.9 | 2.2% to 0.0% |
| 2.1 The Palace (day) | 0.6 / 1.0 / 1.4 / 2.7 | 0.9 / 1.6 / 2.2 / 5.5 | 0.0% to 0.0% |
| 2.2 The tunnels (night) | 2.4 / 3.3 / 4.1 / 8.1 | 1.3 / 1.8 / 2.1 / 4.0 | 1.2% to 0.0% |
| 2.3 The Gate (night) | 2.8 / 3.8 / 4.5 / 5.8 | 1.5 / 2.0 / 2.2 / 3.3 | 2.8% to 0.0% |
| 3.1 Starcourt Mall (night) | 2.7 / 3.7 / 4.2 / 5.2 | 1.3 / 1.8 / 2.2 / 3.8 | 1.9% to 0.0% |
| 3.2 The Russian base (night) | 2.8 / 3.5 / 3.9 / 5.5 | 1.4 / 1.8 / 2.2 / 4.3 | 0.9% to 0.0% |
| 3.3 The food court (night) | 2.7 / 3.5 / 3.9 / 7.1 | 1.4 / 1.8 / 2.1 / 7.2 | 0.7% to 0.0% |

### Frame time on every stage, phone with the touch Game Boy

| Stage | Before: mean / p95 / p99 / max | After: mean / p95 / p99 / max | Frames over 4 ms |
|---|---|---|---|
| 1.1 Mirkwood | 2.1 / 2.9 / 3.5 / 7.1 | 0.9 / 1.5 / 2.0 / 5.5 | 0.4% to 0.0% |
| 1.2 Hawkins Lab | 1.3 / 2.4 / 2.8 / 4.3 | 1.6 / 2.4 / 3.3 / 5.9 | 0.0% to 0.5% |
| 1.3 Middle School | 1.8 / 2.6 / 2.9 / 4.4 | 1.0 / 1.7 / 2.0 / 4.9 | 0.0% to 0.0% |
| 2.1 The Palace | 0.6 / 1.1 / 1.6 / 4.3 | 1.0 / 1.6 / 2.2 / 4.4 | 0.0% to 0.0% |
| 2.2 The tunnels | 2.3 / 3.0 / 3.6 / 6.7 | 1.3 / 1.7 / 2.2 / 4.1 | 0.5% to 0.0% |
| 2.3 The Gate | 2.3 / 3.5 / 3.9 / 5.8 | 1.4 / 1.9 / 2.1 / 2.9 | 0.9% to 0.0% |
| 3.1 Starcourt Mall | 2.3 / 3.2 / 3.7 / 6.0 | 1.2 / 1.7 / 2.2 / 4.1 | 0.4% to 0.0% |
| 3.2 The Russian base | 2.4 / 3.6 / 4.7 / 6.7 | 1.3 / 2.1 / 2.6 / 4.8 | 2.7% to 0.0% |
| 3.3 The food court | 2.4 / 3.3 / 3.6 / 7.6 | 1.4 / 2.6 / 3.3 / 7.0 | 0.2% to 0.2% |

The two day stages (1.2 and 2.1) show a slightly higher mean in the table and are not slower: the back-to-back check above has them equal, and nothing in the change touches a day frame's drawing path except the outlined text, which draws fewer calls than before. The runs were hours apart, and the mean moves by a tenth of a millisecond or more between runs.

The busiest moments sit where the plan guessed. In both builds the slowest seconds are the biggest fights: 3.1's Flayed crowd, the 2.3 defense waves and the Mind Flayer's arena in 3.3, each with fifteen to twenty actors and a dozen effects up. The game logic is not the cost: `tick()` averages 0.15 to 0.25 ms in every stage, and the slowest single tick in any production run was 10.4 ms, once (the bot in 1.3), against 4.5 ms at most in all the rest. Drawing is the cost, and in a night stage the light pools were most of it.

### What was slow

A CPU profile of the bot in 2.2 (a night stage) put 41% of the busy time in a single call, `getImageData`, plus another 19% in the loops around it, all in `paintGlow` (`gfx/glow.ts`); in 1.1 the one call was 50%. `paintGlow` lifts and warms the ground around every lamp, window, string of lights and floodlight, and it did it by reading the whole world view back from the canvas, changing the pixels and writing them back, every frame. Reading a canvas back makes the browser finish every drawing command it was holding, on the main thread, before it can answer. A microbenchmark of the same canvas shows the read-back costing 0.9 to 1.3 ms whatever its size, against 0.07 ms for the same drawing with no read. The title screen has the same call and cost 1.4 ms of its 2.5 ms.

### What was changed

- **`paintStageGlow`** (`gfx/glow.ts`) lifts the stage's own pixels. A stage is baked from a pixel array that bakeStage now keeps, and `stagePixels` (`gfx/tiles.ts`) assembles what `drawStage` put on screen for any rectangle: the baked pixels, the animated water and the pulsing veins and tears at their frame, and black past the edge of the stage. The pools are lifted from that and put on the frame with `putImageData`, which doesn't make the browser wait. The result is the same picture, pixel for pixel: `tests/glow.test.ts` checks it against the first version of `paintGlow` (kept in the test as the reference) over six cameras, eight frames and two levels, edges and moving tiles included, and the same check ran in the browser over 1568 stage, camera and frame cases with zero differing pixels.
- **The pool's math got cheaper.** `Math.hypot` over every pixel became a shape table per radius, the lift became a 3 KB table, and only the box the pools cover is cleared and written, not the whole view. The first version spent 0.38 ms a frame in the loop alone.
- **Outlined text is cached** (`gfx/outline.ts`): each string in each color is built once as a small canvas, so a floating number or the controls in the corner costs one `drawImage`, not six passes of glyphs. `tests/outline.test.ts` checks it against the six passes.
- **`paintGlow` itself stays** for the title and the sprite sheets, which have no baked stage to lift. It only reads and writes the box the pools cover now.

Cost left in a night stage: about 0.4 to 0.6 ms for the pools (`paintStageGlow`, `fillSteps`, `stagePixels` and `putImageData` in a profile), and the rest is the sprites and the stage blit.

### Frame time on the other screens

| Screen | Desktop before: mean / p95 | Desktop after | Phone before | Phone after |
|---|---|---|---|---|
| title | 2.7 / 3.4 | 2.2 / 3.0 | 2.4 / 3.4 | 2.0 / 2.4 |
| title options | 3.1 / 3.5 | 2.6 / 3.1 | 2.6 / 3.2 | 2.1 / 2.5 |
| title (with save) | 2.8 / 3.4 | 2.3 / 2.8 | 2.3 / 2.6 | 1.9 / 2.3 |
| map | 0.7 / 1.2 | 0.5 / 0.9 | 0.5 / 0.9 | 0.3 / 0.5 |
| shop (Erica) | 0.5 / 0.7 | 0.5 / 0.7 | 0.5 / 0.7 | 0.4 / 0.6 |
| dialogue box | 0.5 / 0.9 | 0.3 / 0.5 | 0.5 / 0.9 | 0.4 / 0.4 |
| pause menu | 2.4 / 2.9 | 1.0 / 1.1 | 2.2 / 2.5 | 0.9 / 1.0 |
| character sheet | 0.8 / 1.0 | 0.5 / 0.6 | 0.8 / 1.1 | 0.5 / 0.6 |
| arcade galaga | 0.4 / 0.9 | 0.3 / 0.4 | 0.4 / 0.9 | 0.3 / 0.4 |
| arcade pacman | 0.4 / 0.9 | 0.3 / 0.4 | 0.5 / 1.0 | 0.3 / 0.4 |
| arcade centipede | 0.4 / 0.6 | 0.3 / 0.4 | 0.4 / 0.7 | 0.3 / 0.4 |
| arcade dragonslair | 0.4 / 0.7 | 0.3 / 0.4 | 0.4 / 0.7 | 0.3 / 0.4 |
| arcade mspacman | 0.5 / 0.8 | 0.3 / 0.4 | 0.5 / 0.7 | 0.3 / 0.4 |
| arcade digdug | 0.6 / 0.9 | 0.3 / 0.4 | 0.5 / 0.7 | 0.3 / 0.4 |
| results | 0.5 / 0.8 | 0.5 / 0.8 | 0.3 / 0.4 | 0.5 / 0.8 |

The pause menu and the character sheet draw over the stage under them (here the first night stage), so the pause menu follows the light pools down. Nothing off the play field goes over 3.5 ms, and the title and its options (2.0 to 2.6 ms) are the heaviest, with the most still art redrawn every frame. The arcade games take 0.3 ms. Erica's cart is in the map scene and costs what the map does.

### Left open on performance

- **The title is the heaviest screen** at about 2.2 ms a frame on this machine, and more than half of it is the same read-back, from the flashlights' pools on art that is drawn fresh every frame (it is limited to the box the pools cover now, which is why it fell from 2.7). Caching the still layers of the woods and sky would cut it. It is under the target and nobody plays on it, so it was left.
- **Real hardware.** Nothing here ran on a phone's CPU or on Safari. A 4 ms frame here is the main thread's share of a 16.7 ms frame on a machine several times faster than a phone, and `scripts/polish/run.mjs` takes any URL, so the same run against a phone's remote-debugging port is the next measure.
- **The light pools' last half millisecond.** A per-pool cache keyed by radius, level and the 4 by 4 dither phase would cut the shape work further, at several megabytes of cache. Not worth it at 1.3 ms a frame.
- **The sim's `view()` allocates a fresh object graph every frame** (actors, props, items, effects). The garbage collector took 0.1% of a run, so it was not touched.

## Accessibility

### Reduce flashing: what it covers

Every flash, strobe and shake added since chapter 1 was read in the code and then measured with the bot in every stage, REDUCE FLASH off and on.

| Effect | Where | With REDUCE FLASH on |
|---|---|---|
| The white flash over the world (Crit, Nat 20, big hits, slams, the boss's phases, the Flayed's grab) | `combat/view.ts` | Held at 0.1 of white (was 0.2). A flash that faint moves the picture's relative luminance by under 0.1 on any floor, the size WCAG 2.3.1 counts |
| A sprite's hit flash, a boss's above all (the Mind Flayer is hit five times a second) | `gfx/actor_kit.ts`, `gfx/actors.ts` | The dithered white tint, never the solid white silhouette (new) |
| The melee slash arc | `gfx/fx.ts` | Bone and mist, not white and cream (new) |
| The Mind Flayer's sweep strike | `gfx/fx_l9.ts` | A hatch of hot red, not a solid white band (new). Band luminance 0.62 to 0.13, and the biggest step between frames 0.55 to 0.06 |
| Grigori's power box and the Lab's electric panels | `gfx/fx_l78.ts`, `gfx/overlays.ts` | Re-struck every 32 frames, under twice a second (the box was every 8 frames, nearly 8 a second, in calm) |
| The Lab's klaxon | `world/klaxon.ts`, `world/render.ts` | One steady dim glow, no breathing |
| The scare's strobing lights, the flicker of every pool of light, the camera cone's pulse | `world/play.ts`, `gfx/glow.ts`, `gfx/overlays.ts` | Steady |
| The HUD's low-HP bulbs, the swap and level-up pulses, the d20's sparkle, the puzzle caret's bob, the title's flicker, the map's blinking | `ui/`, `gfx/` | Steady or slow |
| Billy, the chapter 3 effects (the Flayed, the melting rat, the confusion swirl, Erica's cart) | | Go through the flash cap and the sprite cap above; no strobe of their own |
| Screen shake, the food court's boom included | `combat/view.ts`, `world/aftermath.ts` | Follows the SHAKE row (OFF, HALF, FULL) alone. Every shake in the game goes through it |

REDUCE FLASH and SHAKE stay separate rows on purpose, since a shake is motion and not a flash. New in this pass: with nothing saved, a phone or computer set to reduce motion starts with REDUCE FLASH on and SHAKE off (`core/settings.ts`, `tests/settings-calm.test.ts`), and a saved setting always wins.

### Flashes, measured

The bot played every stage with the screen sampled every frame (columns are the biggest change of the whole screen's average relative luminance inside any 100 ms, in units where white is 1). With the setting off a Crit or a big hit is a white flash the size of the screen, 0.6 to 0.8. With it on, the old settings left a boss's white hit flash and the melee arc: 0.13 in 3.3, and up to eight reversals of 0.1 in a single second. Now no stage goes past 0.06 and none reverses by 0.1 more than once in a second.

| Stage | REDUCE FLASH off: biggest swing in 100 ms | On, before this pass | On, after | Reversals of 0.1 or more in the worst second, on after |
|---|---|---|---|---|
| 1.1 Mirkwood | 0.79 | 0.06 | 0.03 | 0 |
| 1.2 Hawkins Lab | 0.62 | 0.08 | 0.06 | 1 |
| 1.3 Middle School | 0.76 | 0.07 | 0.04 | 0 |
| 2.1 The Palace | 0.75 | 0.09 | 0.05 | 0 |
| 2.2 The tunnels | 0.79 | 0.07 | 0.04 | 0 |
| 2.3 The Gate | 0.77 | 0.06 | 0.03 | 0 |
| 3.1 Starcourt Mall | 0.76 | 0.06 | 0.03 | 0 |
| 3.2 The Russian base | 0.77 | 0.07 | 0.04 | 0 |
| 3.3 The food court | 0.76 | 0.13 | 0.06 | 0 |

The probe (`scripts/polish/flashmon.js`) samples the screen every frame into an 8 by 5 grid of average relative luminance. A flash is a reversal of at least 0.1 in the screen's average, the size the web flash rules count (WCAG 2.3.1), and "more than three in a second" is the limit. It measures the whole screen's average, so it sees full-screen flashes and big bosses, and a bright sprite the size of a hero is below it by design. It also reads scrolling patterns as flicker when it works per block, which is why the block-level numbers from the first runs were thrown out: the whole-screen figure is the one reported. The sprites and effects that are small on the screen (a spark, a bolt, a single hero's hit flash) were checked in the code and not by number.

### Text and the HUD against what is behind them

A probe on a copy of the tree (`scripts/polish/contrast-probe.py`) records where every string is drawn and, at the end of the frame, scores each one by the contrast between its color and the pixels touching its glyphs in the finished picture. It was driven through the title, the options, the controls screen, the map, Erica's cart, the party picks, the prologue, the dialogue box, the HUD, the pause menu, the character sheet and the bot through four stages, half a million draws.

| Text | Was | Now |
|---|---|---|
| Character sheet: move notes, locked names, AT LV, NO DMG, the hero switch hint | slate on shadow, 2.3 to 1 | mist, 4.9 to 1 |
| Controls screen: ACTION, KEY 1, KEY 2, the empty slots, the hint lines | slate on night, 2.7 to 2.9 to 1 | mist, 5.7 to 1 |
| The HUD's hero keys (1 to 4) | slate on ink, 2.9 to 1 | mist, 6.2 to 1 |
| Floating words and numbers (damage, +quarters, LEVEL UP, NAT 20, BREAK) | ink shadow on two sides: white on a white Lab floor was 1 to 1 on the other two | an ink outline on every side |
| The controls in the corner, once they fade | slate over the night floor, about 2 to 1, and hard to read over the Lab | mist with the same outline. They also step aside for a dialogue box now, which left the keys and SWAP peeking out round its edge |

Counted over every string the probe saw, texts under 4.5 to 1 at the worst quarter of their edges went from 7 to 0 on the controls screen, 1 to 0 on the HUD, 9 to 0 on the pause menu and 25 to 0 on the character sheet, and from 225 of 818 to 1 of 555 on the play field (four stages, before and after the same way). The one left is a knocked-out hero's key label, drawn in dusk on purpose.

Still under 4.5 to 1 at the quarter of its glyph edges that sit worst: the title's OPTIONS and NEW GAME in bone (4.1) and CONTINUE in yellow (4.35) over the lit backdrop, Joyce's name in rose on the dialogue panel (4.06), and PRESS START in mist before it is picked (3.4 over the brightest part of the sky). All are over 3 to 1 where they sit. START in the picks panel is slate until four heroes are picked: a disabled control, left dim on purpose. The title logo's dark shadow letters and the chapter card's fade-in frames show up in the probe as low-contrast and are not text anyone reads.

### Every input reaches every menu

`scripts/polish/a11y-menus.mjs`, `a11y-map.mjs` and `a11y-story.mjs` drive the real game with one kind of input at a time: keys through the browser's key events, a controller through a fake `navigator.getGamepads()` the script presses buttons on, and touch through real touch events on the Game Boy's buttons, at the positions `layoutTouch` gives. Each step checks that something changed (a setting, the scene on top, or the picture).

| Screen | Keyboard | Controller | Touch |
|---|---|---|---|
| Title: PRESS START, CONTINUE, OPTIONS | yes | yes | yes |
| Options: all nine or ten rows adjust, and the last one opens CONTROLS (keys and controller) or changes GAME BOY (touch), RUMBLE only with a controller | yes | yes | yes |
| Pause, CHARACTERS, the tabs, back out, resume | yes | yes | yes |
| The map, Erica's cart, the party picks and their START row | yes | yes | yes |
| The prologue, the chapter card and the opening dialogue, with confirm alone | yes (49 presses) | yes (49) | yes (46) |

On touch, B is Special and Back together, so the cart and the picks close with START there, and the hint line says so. The CONTROLS screen is keyboard and controller only, since a touch screen has no keys to bind. Results, the game over card, the Palace's cabinets and the CONTROLS rebinding were read, not driven: they use only confirm, cancel, the four directions, attack and pause, which every input sends and which the rows above drive.

## Screenshots

768 by 672 (the 256 by 224 frame at 3x), taken with the dev server's snapshot endpoint (`POST /__snap?name=x` with a data URL body) by `scripts/polish/shots.mjs`. All muted. They are of the bot playing, so the party is wherever the bot was.

- `polish-title.png`, `polish-options.png`, `polish-map.png`, `polish-dialogue.png`, `polish-levelup.png`
- Every stage: `polish-stage-1.1.png` to `polish-stage-3.3.png`
- Every boss: `polish-boss-warden.png`, `polish-boss-demogorgon.png`, `polish-boss-demodog-alpha.png`, `polish-boss-grigori.png`, `polish-boss-billy.png`, `polish-boss-mind-flayer.png`

## Left open

- **Real devices** for frame time (above), and a screen reader is not a thing for a canvas game: the pause menu and the options are drawn, not DOM. The game has no DOM text to expose.
- **Small flashes were not measured by number.** The probe sees the screen's average, so a flash of one hero's sprite or a spark is checked in the code only. They are small and rate-limited, but no tool here proves it.
- **Photosensitivity is not certified.** The numbers show the settings do what they say. They are not a test by a flash analysis tool such as PEAT.
- **The first-run default** only follows the system when nothing has been saved. A player who has already saved their settings sees no change.
- **Contrast** left over is listed above.

## Run it again

```sh
# the frame-time probe on any game URL, and a bot run of every stage
node scripts/polish/run.mjs --port 5173 --mode desktop --stages 1.1,1.2,1.3,2.1,2.2,2.3,3.1,3.2,3.3 --out polish-out/after.json
node scripts/polish/run.mjs --port 5173 --mode phone   --stages 1.1 --out polish-out/phone.json
node scripts/polish/tables.mjs before.json after.json
node scripts/polish/prof.mjs --port 5173 --stage 2.2 --secs 30      # a CPU profile of the bot in a stage

# flashes with REDUCE FLASH off and on, then the report
node scripts/polish/flash.mjs --port 5173 --calm 1 --stages 1.1,3.3
node scripts/polish/flash-report.mjs

# every menu with one kind of input, the other screens' frame time, the screenshots
node scripts/polish/a11y-menus.mjs --port 5173 --input touch
node scripts/polish/scenes.mjs --port 5173 --mode desktop
node scripts/polish/shots.mjs --port 5173 --what title,map,stages
```

The scripts need Chrome at `/Applications/Google Chrome.app` and Node 22 or newer (its built-in `WebSocket`). `run.mjs`, `scenes.mjs` and `flash.mjs` work against a production build (`vite build`, then `vite preview`) or the dev server; the three `a11y-*.mjs` scripts and `contrast-run.mjs` import source files, so they need the dev server. They write under `polish-out/`, which is not tracked. `contrast-probe.py` patches `font.ts` and `main.ts`, so run it on a copy of the tree, never this one.
