# Stranger Things 8-bit: The Upside Down Campaign

![Dustin, Mike, Eleven and Lucas on a path into the woods, under the red Stranger Things logo](public/social/og.png)

An 8-bit action RPG fan tribute. Mike runs one last D&D campaign in the basement, and you play it: a party of four, real-time fights, a d20 behind every level-up. This build is Level 1 only (the basement prologue and the Mirkwood stage). It's here for feedback before the rest gets built.

Not affiliated with Netflix. The code, art, music and lines are original. Every sprite and every note is generated in code, so the game loads no asset files. The images here are drawn by that code too.

![The party fighting Hawkins Lab agents on the Lab road at night: Dustin's Farrah spray, Lucas's triple shot, Eleven's Mind Blast and a crit from Mike's bat](public/social/fight.png)

## Running it

```bash
npm install
npm run dev
```

Then open http://127.0.0.1:5173. Press any key once so the browser lets the sound start.

| Script | What it does |
| --- | --- |
| `npm run dev` | Vite dev server on port 5173 |
| `npm run build` | Typecheck, then build to `dist/` |
| `npm run preview` | Serve the production build |
| `npm run typecheck` | `tsc --noEmit` |
| `npm test` | `node --test tests/*.test.ts` (Node runs the TypeScript directly) |

## Controls

| Input | Action |
| --- | --- |
| `W` `A` `S` `D` or arrows | Move |
| `Z` or `J` | Attack. Melee heroes chain three hits |
| `X` or `K` | Special. Costs MP |
| `C` or `L` | Dash, with a few frames of invulnerability |
| `Shift` or `Tab` | Cycle to the next hero |
| `Q`, `1` to `4`, or click a portrait | Back one hero, or pick one. Swapping is near instant, so tap to cycle. The shockwave and invulnerability need 1.5 s since the last one |
| `U` or `V` | Party burst, when the d20 at the top right is full |
| `Space` or `Enter` | Talk, light Joyce's Christmas lights, advance dialogue |
| `Esc` or `P` | Pause and settings |
| `T` | Skip dialogue: the rest of the current script, the prologue, the chapter card |
| `M` | Mute |

**Controller.** An Xbox controller plays the whole game, menus included. Plug it in or pair it, then press any button once. Browsers hide a controller until it's touched, and `CONTROLLER CONNECTED` shows across the top when the game sees it.

| Button | Action |
| --- | --- |
| Left stick or D-pad | Move. A light tilt walks slower |
| `A` | Attack, talk, light Joyce's lights, confirm |
| `X` | Special. Opens the options on the title |
| `B` | Dash, back |
| `Y` | Party burst |
| `LB` `RB` | Swap hero |
| `RT` `LT` | Attack and dash, same as `A` and `B` |
| `Start` | Pause. Begins the game on the title |
| `View` | Skip dialogue |

Hints switch to button names once you touch the controller, and back to keys when you press one. A controller has no direct hero pick, so the tutorial lines leave that out. A button press doesn't always count as a click, so the browser may keep the sound off until you click the game once. The title says so when that happens. The game reads the standard gamepad layout, which is what an Xbox controller reports. A pad that reports something else isn't supported.

**Changing keys.** The table above is the defaults. Open CONTROLS from the options (the OPTIONS row on the title, or `P`) or the pause menu and every action shows its two key slots. Pick a slot with the arrow keys, press Enter, then press the new key. Backspace clears a slot, Escape cancels, and RESET ALL restores the defaults. A key that's already in use swaps places with the one you're replacing. ATTACK, SPECIAL and DASH always keep at least one key. The arrow keys, Enter and Esc always work and can't be rebound, so a menu can never get stuck. Your keys are saved, and every hint on screen follows them: the HUD's hero numbers, the controls in the corner of the level, the skip prompt and the tutorial lines. The title shows no key hints at all. The gamepad layout is listed there too but can't be changed yet.

**Story.** Dialogue is off by default. The title reads `SKIP STORY: ON`, so start goes straight into the level and no dialogue box, prologue or chapter card shows. Press `T` on the title screen to turn it off and play the story. The same switch is in the options (`P` on the title) and the pause menu, and it's saved. The attack, special, dash, swap and burst controls sit in the bottom left corner of the level, and fade to a muted grey once the party walks away from the starting yard, so you aren't guessing. Every script still does what it does, so Eleven still joins and the gate still opens.

**Saving.** The game saves by itself each time you light Joyce's Christmas lights, and `SAVED` shows over them. Reload or quit and the title offers CONTINUE, which puts the party back at the last lit lights with its levels, XP, d20 bonuses, kills, opened gates and story beats. Health comes back full, the same as a retry. NEW GAME on the title and START OVER in the pause menu both wipe the save (press twice to confirm). START OVER restarts the level straight away, and NEW GAME plays the prologue unless skip story is on. Clearing the level also clears the save. It's one save per browser, and `?bot`, `?god`, `?level` and `?party` runs never touch it.

**Sound.** The game goes silent whenever the page isn't focused: another window, another tab, or the chat next to the pane. It comes back when you click the game. The `M` mute sits on top of that and survives it.

## The party

![Mike the Paladin, Dustin the Bard, Lucas the Ranger and Eleven the Sorcerer, each with a portrait, a sprite and their two moves](public/social/party.png)

| Hero | Basic | Special | Level 3 talent |
| --- | --- | --- | --- |
| Mike | Bat, three-hit arc | DM screen: blocks shots, halves damage behind it | DM fiat: the first hit of a fight crits |
| Dustin | Candy lure: enemies chase it, then it pops | Farrah spray: a burning cone | Compass: more quarters drop |
| Lucas | Wrist rocket, eight ways | Triple shot | Sharp eye: more crits |
| Eleven | Push: a shove that clears logs | Mind Blast: a piercing beam | Flip: Push hits harder |

Eleven joins at the shed. Lucas can shoot the lantern across the creek to open the gate, and only Eleven can push the log off the trail.

Every level-up rolls a d20. The roll sets the bonus stat points, a 20 is a full heal and a team buff, and a 1 gives the next roll advantage. Nothing can make a hero worse. The active hero earns full XP and the bench earns half, so rotating gets everyone to Lv 3.

## URL flags

| Flag | What it does |
| --- | --- |
| `?rush=1` | Skip the title, the prologue and every dialogue box, for this page load only |
| `?skip=1` | Skip the title and prologue, but keep the in-level dialogue |
| `?bot=1` | A bot plays the level by itself |
| `?dev=1` | Dev panel: god mode, hitboxes, give XP, set level, kill all, spawn a group, open a prop, teleport |
| `?sheet=1` | Sprite sheet review pages (`&page=N&sub=M` opens one) |
| `?time=day` or `?time=night` | Draw the stage in that light, whatever the stage says. Level 1 is a night stage |
| `?audio=1` | Audio lab: play every track, jingle and effect, render a WAV into `music/` |
| `?mute=1`, `?god=1`, `?level=3`, `?stage=1.1`, `?seed=N` | Self-explanatory |

## Social cards

The link preview and the images in this README come from the game's own sprites, portraits, logo, tiles, effects and HUD. To redraw them, run the dev server, open http://127.0.0.1:5173/social.html and press Save all. The PNGs land in `public/social`, and the build copies them as they are.

| File | Size | Used for |
| --- | --- | --- |
| `og.png` | 1200 × 630 | `og:image` and `twitter:image` in `index.html` |
| `fight.png` | 1200 × 630 | This README |
| `party.png` | 1200 × 630 | This README |
| `github.png` | 1280 × 640 | The repo's social preview. GitHub doesn't read it from the repo, so upload it in the repo settings |

`index.html` points at `/social/og.png` and the build adds the base path. Some sites only read a full URL there, so add the host once the game is hosted.

## Layout

```
src/core        loop, input, scenes, camera, settings, save, shared types
src/gfx         font, sprites, day and night tiles, portraits, effects, light pools
src/audio       chiptune engine, sequencer, tracks, effects, voices
src/combat      the simulation, enemy AI, the bot
src/heroes      hero stats, abilities, growth
src/enemies     enemy stats and behavior
src/progression XP curve, the d20 level-up
src/world       stage 1.1 and the play scene
src/ui          HUD, dialogue, title, menus
src/story       scripts, barks, the prologue
tests           Node tests for the rules, the stage, the music data and the copy
docs            game design, architecture, Level 1 spec, screenshots
music           rendered WAVs of the tracks
public/social   the link preview and README images, drawn by social.html
```

The simulation is plain TypeScript with no DOM, so the rules, the stage and the bot all run in Node tests. The design lives in `docs/game-design.md`, the contract between the pieces in `docs/technical-architecture.md`, and the Level 1 spec in `docs/level-1.md`.
