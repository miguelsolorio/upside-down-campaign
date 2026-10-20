# The demo video

`npm run demo` (or `node scripts/demo/record.mjs`) records a 45 second video ad of the game into `demo/out/demo.mp4`: 1920 by 1080, 16:9, 60 fps, H.264 with AAC, carrying the game's own music and effects. The video comes out of the game's own code, so a re-run on the same code is the same video: its frames are byte for byte the same (`demo/out/manifest.json` has a hash of each shot's frames to check it with), and its sound agrees to the last bit of a sample here and there, since Chrome's audio math is not bit exact from one run to the next. Record it again whenever the game changes. `demo/out/` is ignored by git: the video is made, not committed.

It needs Google Chrome (`/Applications/Google Chrome.app`) and ffmpeg (`/opt/homebrew/bin/ffmpeg`), and it runs headless, so nothing opens and nothing plays out loud. The recorder starts its own dev server on a free port (never 5173, never a port in `.claude/launch.json`) and stops it at the end.

## Running it

```bash
npm run demo                              # the whole video, in demo/out
npm run demo -- --draft                   # half size, in demo/out/draft, for a quick look
npm run demo -- --sheet                   # also a contact sheet, demo/out/sheet.png
npm run demo -- --shot m33,h-picks        # re-record these shots, reuse the cached frames of the rest
npm run demo -- --jobs 4                  # shots recorded at once (default 3)
npm run demo -- --encode                  # record nothing, join the cached frames and sound again
```

A full run takes about two minutes. `--shot` needs the other shots recorded once before, in the same mode (full or draft). Each shot's frames are `demo/out/frames/<id>/00001.png`, and its sound is `demo/out/audio/<id>.pcm`. `demo/out/manifest.json` has one hash per shot: two runs on the same code give the same hashes. A shot whose trigger never fires stops the run and names the shot.

## How it records

1. **Capture mode, `?capture=1`.** `core/loop.ts` does not start `requestAnimationFrame` in this mode. The recorder calls `window.__ud.cap.step(n)`, which runs n fixed ticks and one render (`core/capture.ts`), so every frame is exact. The frame is pinned at 384 px wide, so the video is an exact 5x of it. The focus-loss mute is off, and the controls hint in the corner of the play scene is not drawn. Without the flag, none of this runs.
2. **Shots defined by game state** (`scripts/demo/shots.mjs`). Each shot is a page load, with a URL built from the game's own flags, optional saved progress, a trigger and a length. The recorder opens a fresh Chrome profile, steps the game with no pictures until the trigger is true, and then makes one frame per tick. The trigger is a function of `window.__ud` run once a tick, such as "the boss bar says DEMOGORGON" or "the game has played `howl`", so a retuned stage moves its shot with it.
3. **The camera and the compositor** (`src/demo/compositor.ts`). Each frame, the game's 1x canvas is drawn onto a 1920 by 1080 one with `imageSmoothingEnabled = false`, through the shot's camera. The full-frame view shows 384 by 216 of the 384 by 224 frame at an exact 5x, cutting 3 rows off the top (the HUD's padding) and 5 off the bottom. A punch-in is 2x or 3x of that, so a game pixel is still a whole number of video pixels. A push eases the zoom through fractions, drawn from a 5x copy, and is used only on flat art (the title and the end card). Captions use the game's font at a whole-number scale. Cuts are hard, with a white flash on a big hit and a fade at the end.
4. **Sound, rendered offline** (`src/demo/audio.ts`). In capture mode the audio API (`audio/index.ts`) logs every `music`, `phase`, `intensity`, `sfx`, `jingle`, `stinger` and `blip` call, and Eddie's solo song (`audio/section.ts`), with its tick, before the muted and unfocused checks. After the frames, the page plays the log again on an `OfflineAudioContext` through the game's own mix graph (`renderWith` in `audio/render.ts`): the same limiter and the same levels as the live game. A track starts where the game had it in its loop, effects land on their ticks, jingles duck the music, and the effects get a repeat gap like the live ones. The random pitch of an effect comes from a seed of its own, so the sound is the same each run. The shot's piece is cut to exactly its frames (735 samples to a frame) and faded a few hundredths of a second at each end. A call made while tick k ran is heard with the frame that first shows it, at (k + 1) / 60 s.
5. **Encoding** (`scripts/demo/record.mjs`). The frames are linked into one numbered run, the shots' sound is joined into `demo.wav`, and ffmpeg makes the MP4 (x264 at CRF 14, `yuv420p`, BT.709, AAC 192k at 48 kHz).

## Changing a shot

A shot in `scripts/demo/shots.mjs` is an object:

| Field | What it does |
| --- | --- |
| `id` | The name: `--shot id`, the folder under `demo/out/frames`, the label on the sheet. |
| `url` | Flags added to `?capture=1`: `stage`, `party`, `level`, `seed`, `bot`, `rush`, `god`, `finale`, `solo`, anything `core/flags.ts` reads. A test checks each one is read. `play(stage)` gives a stage the bot plays alone with nobody falling and no dialogue. |
| `storage` / `settings` | Saved progress and settings for the page: `{ 'upside-down:progress:v1': {...} }`. The settings start from the defaults with the story on. |
| `auto` | Key presses during the run-up the video never shows: `{ code, from, every, hold }`. They get through the title and the talk before a prologue roll, or the map before the party picks. |
| `trigger` | A function of `window.__ud` that is true when the shot starts. Keep it to that one argument: its source text is sent to the page. `nearFoes`, `bossIs` and `sfxSeen` in the file build the common ones. |
| `timeout` | The ticks it may take to become true. If it never does, the run fails and names the shot. |
| `lead` | Start this many frames before the trigger (the game is run again and stopped short of it). |
| `len` | Frames recorded, `sec(1.5)` for 90. The lengths add up to 45 s, give or take half a second. A test checks it. |
| `cam` | Camera keys, `{ at, zoom, follow, lerp, push }`. `zoom` is 1, 2 or 3 (whole numbers). `follow` is `'hero'`, `{ hero: 'max' }`, `{ actor: 'twin' }`, `{ between: ['eleven', 'vecna'] }`, `{ fight: 90 }` (the hero and the foes within 90 px) or `{ x, y }` in frame pixels. A new zoom or target is a cut. |
| `captions` | `{ text, at, until, where }`. The game's font has capitals, digits and a little punctuation, and no dash but the plain one. |
| `flashes` / `flashOn` | White flashes at frames, or on every play of an effect: `{ sfx: ['beam'], len, alpha }`. |
| `keys` | Presses inside the shot, at frames: `{ at, code, hold }`. |
| `card` | A title card the page draws as a scene instead of the game (`src/demo/cards.ts`): the title's sky, a logo, lines of text. |
| `fadeOut` / `fadeIn` | Frames of black to go out to or come in from. |
| `audio` | `{ fadeIn, fadeOut }` in seconds, and optionally `bed`. A bed plays one track under the shot instead of the game's own music: shots that share a `group` run it straight through, each starting as far in as the shots before it. The montage uses `clock` with its combat layer, so the eight stages share one beat. |

To add a shot, write the object, record it alone with `--draft --shot id`, and look at its frames in `demo/out/draft/frames/<id>/` or on the sheet. To find the tick a state happens on, step the game in a page opened with `?capture=1&bot=1&rush=1&god=1&stage=...` and read `__ud.cap.events` (the log of sounds) and `__ud.play.sim.view()` (the boss bar, the party, the solo's streak).

## The storyboard as built

The video as recorded now. The times add up to 45.0 s; the lengths are in `shots.mjs`.

| Time | Shot | What's on screen | How it starts |
| --- | --- | --- | --- |
| 0:00 to 0:06 | `intro` | The title scene breathing under a slow push: sky, spores, the flickering logo, the party at Mirkwood. PRESS START at 5.3 s and the 40 frame walk-off. The `static` track. | Page load |
| 0:06 to 0:07.8 | `prologue` | The basement table, a punch-in on the d20 as it lands, with a white flash on the landing. | The die lands (`rollLand`), 62 frames of lead |
| 0:07.8 to 0:10 | `card` | "5 CHAPTERS. 11 HEROES." on the title sky. The `clock` bed starts here. | Page load |
| 0:10 to 0:22 | `m11` `m13` `m21` `m23` `m31` `m33` `m41` `m52` | Eight 1.5 s cuts, wide then a punch-in on the fight, each with its stage name: Mirkwood, the school and the Demogorgon, the Palace arcade, the Gate and the Alpha, Starcourt, the food court and the Mind Flayer, Kamchatka with Hopper alone, the Abyss and the twins. The `clock` bed runs under all of them. | A fight in reach, or the boss bar, or the Alpha's howl |
| 0:22 to 0:28 | `h-eleven` `h-max` `h-steve` `h-dustin` | Four heroes' specials at 2x: Eleven's Mind Blast on Vecna after a swap, Max's skate dash over a gap, Steve's Babysit at the Gate, Dustin's Farrah spray. | The effect's first play (`beam`, `swap`, `taunt`, `flame`) |
| 0:28 to 0:30 | `h-picks` | The party picks panel on the Hawkins map, from a finished save: Dustin comes off, Lucas goes on. | Title, CONTINUE, the map, then Enter |
| 0:30 to 0:33 | `k-solo` | Eddie's rooftop solo (4.3) with the note highway, a punch-in on the lanes. | The solo's third section, ten seconds in |
| 0:33 to 0:35.5 | `k-vecna` | Vecna's lair (4.4) at 2x on the fight. | The first orb |
| 0:35.5 to 0:37.5 | `k-channel` | The Channel in 5.3: Eleven and Will on their marks under the Mind Flayer. | The channel's clock starts |
| 0:37.5 to 0:40 | `k-roll` | The Final Roll on `?finale=gold`: the fourth die lands and NAT 20 flashes. The die and its sound are on the same frame. | The third die has landed |
| 0:40 to 0:45 | `end` | The logo over the title sky, "PLAY FREE IN YOUR BROWSER", miguelsolorio.github.io/upside-down-campaign, a fade out over the last 1.5 s. | Page load |

The Final Roll's landing sound and its settled die share a frame by construction: the scene plays a sound on the tick its clock reaches the landing, and draws the settled die on the frame after that tick, which is when the sound is heard (`tests/capture.test.ts` checks it, and the recorded frames and sound agree).

## When the game changes

Record again. A shot that stops with "the trigger never fired" names the shot: the thing it waited for is gone or later than its `timeout`, so change the trigger or the stage flags. The chapter 4 epilogue (`story/epilogue.ts`) and anything else added after this video can go in a later shot list.
