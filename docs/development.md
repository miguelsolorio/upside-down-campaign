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
| `?dev=1` | Dev panel: god mode, hitboxes, give XP, set level, kill all, spawn a group, open a prop, teleport |
| `?sheet=1` | Sprite sheet review pages (`&page=N&sub=M` opens one) |
| `?time=day` or `?time=night` | Draw the stage in that light, whatever the stage says. Level 1 is a night stage and the Lab is a day stage |
| `?audio=1` | Audio lab: play every track, jingle and effect, render a WAV into `music/` |
| `?stage=1.2` | Jump to a stage (`1.1` to `2.3`) with the party a normal run brings, levels and XP (`ARRIVAL` in `core/campaign.ts`, see `docs/pace.md`): three kids for Mirkwood, all four for the Lab and the school, Will in place of Eleven for 2.1, and Mike, Dustin, Max and Steve for 2.2 and 2.3 |
| `?touch=1` | Show the touch controls with a mouse |
| `?mute=1`, `?god=1`, `?level=3`, `?seed=N` | Self-explanatory |

`?bot`, `?god`, `?level` and `?party` runs never touch the save.

## Social cards and app icon

The link preview and the images in the README come from the game's own sprites, portraits, logo, tiles, effects and HUD, so redraw them whenever the HUD, the corner controls or the art change. The app icon is the game's d20, in crimson on a blue glow.

To redraw them all, run the dev server from the checkout you're committing in, open http://127.0.0.1:5173/social.html and press Save all. The save endpoint writes relative to the directory the server started in, so another checkout's server writes into that checkout. The cards land in `public/social`, the icon in `public/icons` and `public/favicon.ico`, and the build copies them as they are. Cards that haven't changed come out byte for byte the same.

| File | Size | Used for |
| --- | --- | --- |
| `og.png` | 1200 × 630 | `og:image` and `twitter:image` in `index.html`, and the README |
| `fight.png` | 1200 × 630 | The README |
| `party.png` | 1200 × 630 | The README |
| `github.png` | 1280 × 640 | The repo's social preview. GitHub doesn't read it from the repo, so upload it in the repo settings |

| Icon file | Size | Used for |
| --- | --- | --- |
| `favicon.ico` | 16 and 32 | The browser tab |
| `icons/apple-touch-icon.png` | 180 × 180 | The iPhone and iPad home screen |
| `icons/icon-192.png`, `icons/icon-512.png` | 192 and 512 | Android's home screen, through `manifest.webmanifest` |

Each size is drawn on its own grid instead of scaled down, so the 16 px tab icon stays sharp. The page also keeps five other takes on the die, for comparison.

`index.html` points at all of these through `%BASE_URL%` and `%VITE_SITE_URL%`.

## Layout

```
src/core        loop, input, scenes, camera, settings, save, shared types
src/gfx         font, sprites, day and night tiles, portraits, effects, light pools
src/audio       chiptune engine, sequencer, tracks, effects, voices
src/combat      the simulation, enemy AI, the bot
src/heroes      hero stats, abilities, growth
src/enemies     enemy stats and behavior
src/progression XP curve, the d20 level-up
src/world       stages 1.1 to 2.3 and the play scene
src/ui          HUD, dialogue, title, menus
src/story       scripts, barks, the prologue
tests           Node tests for the rules, the stage, the music data and the copy
docs            game design, architecture, specs for Levels 1 to 4 and the map, screenshots
music           rendered WAVs of the tracks
public/social   the link preview and README images, drawn by social.html
public/icons    the app icon, with public/favicon.ico, drawn by social.html
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

The simulation is plain TypeScript with no DOM, so the rules, the stage and the bot all run in Node tests, and two scripts play it headlessly: `node scripts/measure-stage.ts 1.3 chief 20` measures one stage (see "Measuring" in `docs/level-2.md`), and `node scripts/measure-campaign.ts chief 20` plays the whole run with the party carried and prints the levels after each stage (`docs/pace.md`). The design lives in `docs/game-design.md`, the contract between the pieces in `docs/technical-architecture.md`, and the level specs in `docs/level-1.md` and `docs/level-2.md`.
