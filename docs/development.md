# Development

How to run, build and change the game. Start with `docs/technical-architecture.md` for the rules and the contract between the pieces.

## Running it

```bash
npm install
npm run dev
```

Then open http://127.0.0.1:5173. Press any key once so the browser lets the sound start. Add `?mute=1` to keep it silent.

| Script | What it does |
| --- | --- |
| `npm run dev` | Vite dev server on port 5173 |
| `npm run build` | Typecheck, then build to `dist/` |
| `npm run preview` | Serve the production build |
| `npm run typecheck` | `tsc --noEmit` |
| `npm test` | `node --test tests/*.test.ts` (Node runs the TypeScript directly) |
| `npm run demo` | Records the 45 second video ad into `demo/out/demo.mp4` (`docs/demo.md`) |

## Deploying

Every push to `main` builds the game and publishes it through `.github/workflows/deploy.yml`:

- GitHub Pages, at https://miguelsolorio.github.io/upside-down-campaign/.
- miguelsolorio.com, at https://miguelsolorio.com/projects/upside-down-campaign/, through the shared workflow in `miguelsolorio/miguelsolorio.com`.

The build uses a relative base path (`BASE_PATH=./`) so one build works at both. `VITE_SITE_URL` gives the share images an absolute URL, since some sites only read a full URL for `og:image`.

## URL flags

| Flag | What it does |
| --- | --- |
| `?rush=1` | Skip the title, the prologue and every dialogue box, for this page load only |
| `?skip=1` | Skip the title and prologue, but keep the in-level dialogue |
| `?bot=1` | A bot plays the level by itself |
| `?dev=1` | Dev panel: god mode, hitboxes, give XP, set level, kill all, spawn a group, open a prop, teleport. The group and prop boxes suggest the current stage's own enemy groups and props (`world/devhooks.ts`), and any id works if you type it |
| `?sheet=1` | Sprite sheet review pages (`&page=N&sub=M` opens one) |
| `?time=day` or `?time=night` | Draw the stage in that light, whatever the stage says. Level 1 is a night stage and the Lab is a day stage |
| `?audio=1` | Audio lab: play every track, jingle and effect, render a WAV into `music/` |
| `?stage=1.2` | Jump to a stage (`1.1` to `3.2`) with the party a normal run brings, levels and XP (`ARRIVAL` in `core/campaign.ts`, see `docs/pace.md`): three kids for Mirkwood, all four for the Lab and the school, Will in place of Eleven for 2.1, Mike, Dustin, Max and Steve for 2.2 and 2.3, and Mike, Dustin, Robin and Nancy for 3.1 and 3.2. A jump is a debug run: it keeps its map progress in memory, with the stages before it cleared, and never writes the real save or progress |
| `?touch=1` | Show the touch controls with a mouse |
| `?finale=1` | The ending on its own: the Final Roll for a sample party of four (Eleven, Will, Mike, Dustin), then the basement epilogue (the story is on for this hook, and `&rush=1` skips it), then THE END, then again. `?seed=N` changes the dice, and `?finale=plain`, `big` or `gold` finds the first seed from there that ends that way (`ui/finale_dev.ts`) |
| `?capture=1` | The demo recorder's mode: no animation frame loop, `__ud.cap.step(n)` runs n ticks and a render, and the audio API logs every call (`core/capture.ts`, `docs/demo.md`) |
| `?mute=1`, `?god=1`, `?level=3`, `?seed=N` | Self-explanatory |

`?bot`, `?god`, `?level` and `?party` runs never touch the save.

## Social cards and app icon

The link preview and most of the images in the README come from the game's own sprites, portraits, logo, tiles, effects and HUD, so redraw them whenever the HUD, the corner controls or the art change. The app icon is the game's d20, in crimson on a blue glow.

To redraw them all, run the dev server from the checkout you're committing in, open http://127.0.0.1:5173/social.html and press Save all. The save endpoint writes relative to the directory the server started in, so another checkout's server writes into that checkout. The cards land in `public/social`, the icon in `public/icons` and `public/favicon.ico`, and the build copies them as they are. Cards that haven't changed come out byte for byte the same.

| File | Size | Used for |
| --- | --- | --- |
| `og.png` | 1200 × 630 | `og:image` and `twitter:image` in `index.html`, and the README |
| `fight.png` | 1200 × 630 | The README |
| `party.png` | 1200 × 630 | The README |
| `starcourt.png` | 1200 × 672 | The README. A real frame of the game, not drawn by `social.html` |
| `picks.png` | 768 × 672 | The README. A real frame of the game, not drawn by `social.html` |
| `github.png` | 1280 × 640 | The repo's social preview. GitHub doesn't read it from the repo, so upload it in the repo settings |

Save all leaves `starcourt.png` and `picks.png` alone. They are frames of the running game (`__ud.frame`, the 1x canvas) scaled up by three and posted to `/__snap?dir=social&name=starcourt`, so retake them when the HUD, the map or the Starcourt art changes, with `?mute=1` on the URL. `starcourt.png` is the bot's run through the mall's fountain court (`?mute=1&rush=1&bot=1&stage=3.1&seed=7`, in a 1200 × 672 window so the screen is 400 px wide). `picks.png` is the party panel on the map for stage 3.2 with all nine heroes met, cropped to the map's 256 px.

| Icon file | Size | Used for |
| --- | --- | --- |
| `favicon.ico` | 16 and 32 | The browser tab |
| `icons/apple-touch-icon.png` | 180 × 180 | The iPhone and iPad home screen |
| `icons/icon-192.png`, `icons/icon-512.png` | 192 and 512 | Android's home screen, through `manifest.webmanifest` |
| `icons/icon-maskable-512.png` | 512 × 512 | Android's adaptive icon, through `manifest.webmanifest`. The same die, smaller, so a circle or squircle mask doesn't cut it |

Each size is drawn on its own grid instead of scaled down, so the 16 px tab icon stays sharp. The page also keeps five other takes on the die, for comparison. Under the icons it shows the maskable one cut to a circle, a squircle and a rounded square, with the 80% safe circle drawn on top. The die and the sparkles stay inside it.

`index.html` points at all of these through `%BASE_URL%` and `%VITE_SITE_URL%`.

## Installing as an app

The page installs as an app on iOS and Android, with no store. `public/manifest.webmanifest` names it, sets `start_url` and `scope` to `./` so one build works at a site's root and under a project folder, asks for `display: fullscreen` and lists the icons. iOS takes its home screen icon and name from the `apple-touch-icon` link and the `apple-mobile-web-app-*` tags in `index.html`. Chrome on Android installs from the menu, and offers a prompt when the page has a service worker with a fetch handler.

`public/sw.js` is that worker, and it keeps the game for offline play:

- The page goes to the network first, waits four seconds, then opens the kept copy. A new deploy shows up on the next launch.
- Files under `/assets/` carry a hash of their contents, so a kept one is used as it is.
- Everything else (the icons, the manifest) comes from the cache at once and is fetched again for next time.
- Right after the worker starts, the page hands it the URLs it has already loaded, so the first visit works offline too.

`src/core/pwa.ts` registers it in a production build only. In dev a worker would keep showing old modules. To drop everything it kept, change `CACHE` in `sw.js`. The old cache goes when the new worker activates.

To check one, build with `BASE_PATH=./`, serve `dist/` from a folder and open it in Chrome. DevTools, Application, Manifest lists the icons and any installability errors, and Service workers shows the worker. Stop the server and reload to see it play offline. `tests/pwa.test.ts` pins the manifest fields, every icon file and its size, the service worker's fetch handler and the share card's size.

## Layout

```
src/core        loop, input, scenes, camera, settings, save, shared types
src/gfx         font, sprites, day and night tiles, portraits, effects, light pools
src/audio       chiptune engine, sequencer, tracks, effects, voices
src/combat      the simulation, enemy AI, the bot
src/heroes      hero stats, abilities, growth
src/enemies     enemy stats and behavior
src/progression XP curve, the d20 level-up
src/world       stages 1.1 to 3.2 and the play scene
src/ui          HUD, dialogue, title, menus
src/story       scripts, barks, the prologue
tests           Node tests for the rules, the stage, the music data and the copy
docs            game design, architecture, specs for Levels 1 to 8 and the map, screenshots
music           rendered WAVs of the tracks
public/social   the link preview and README images, drawn by social.html
public/icons    the app icon, with public/favicon.ico, drawn by social.html
public/         also the web app manifest and sw.js, the service worker
.github         the deploy
```

Besides `index.html`, the HTML pages at the root are dev-only review pages that the build leaves out:

- `social.html` draws the cards and the icon.
- `character-variations.html` holds the face options for each hero.
- `darkness-variations.html` holds the night tileset options.
- `hud-variations.html` holds the HUD options.
- `header-variations.html` holds eight layouts for the active hero's name, XP, MP, coins and Crit meter.
- `map-variations.html` holds the five Hawkins map designs; design 4, Two Hawkins, is the one in the game.
- `touch-controls.html` shows the touch controls on phone frames.
- The rest are the sheets each build pass was picked from, such as `heroes2-variations.html` and `picks-variations.html` (chapter 2), `shell-variations.html` (the dark Game Boy), and `heroes3-variations.html`, `grigori-variations.html` and `mall-variations.html` (chapter 3). The chapter 4 sheets are listed in `docs/chapter-4.md`.

The simulation is plain TypeScript with no DOM, so the rules, the stage and the bot all run in Node tests, and two scripts play it headlessly: `node scripts/measure-stage.ts 1.3 chief 20` measures one stage (see "Measuring" in `docs/level-2.md`), and `node scripts/measure-campaign.ts chief 20` plays the whole run with the party carried and prints the levels after each stage (`docs/pace.md`). The design lives in `docs/game-design.md`, the contract between the pieces in `docs/technical-architecture.md`, and the level specs in `docs/level-1.md` and `docs/level-2.md`.
