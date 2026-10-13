# Stranger Things 8-bit: The Upside Down Campaign

## Context

You asked for a complete 8-bit Stranger Things game: concept, design, music and characters, with attacking and leveling up. `stranger-ninjas` is empty, so this is a fresh build.

I read `diablo`, `discovery-game` and `horror-game` to match how you build games: Vite and TypeScript, a score generated at runtime, design notes in `docs/`, a `?dev=1` panel, a README with controls and URL flags. I also checked the show details I wasn't sure about (D&D classes, costumes, the season 5 ending) against Netflix's cast guide and recaps.

You handed me the creative calls, so I made them. The ones that change the build are in the next table. Veto any of them when you approve.

You also asked for level one first, the work split across sub-agents, and attention to limits. That changes the build order, not the design. See "This pass" and "Order of work".

## Decisions

| Call | Choice | Why |
|---|---|---|
| Genre | Top-down real-time action RPG. Party of four, swap any time | Attacks and leveling are felt, not menu-driven. Zelda and Crystalis are the model |
| Stack | Vite + TypeScript + Canvas 2D, zero runtime dependencies | Same as `diablo` and `discovery-game` |
| Assets | None. Pixel art and music are generated in code | Same as your runtime score. Nothing to download or license |
| Scope | The full design is five chapters (one per season), 16 stages, 11 heroes, about an hour. This pass builds Level 1 only | You asked for feedback before the rest |
| Frame | Mike runs one last D&D campaign. Dice drive crits, level-ups and the final boss | It's the show's own metaphor. Demogorgon, Mind Flayer and Vecna are all D&D monsters |
| IP | Fan tribute. Original code, art, music and lines. No show audio, lyrics or actor likenesses | The title screen says so |
| Folder name | Reading `stranger-ninjas` as Stranger Things | Tell me if the ninjas were on purpose |

## This pass: Level 1 only

Level 1 is stage 1.1, Mirkwood, plus the title screen and the basement prologue. It runs on the real systems, so the rest of the game is content on top of it, not a rewrite. When it works I stop and wait for your feedback.

**In**
- Title screen, then the basement prologue (Mike, Dustin, Lucas, Will's roll goes wrong), then a chapter card.
- Stage 1.1, about 48×40 tiles, five to eight minutes. It runs from the Byers yard (Joyce's lights are the first save point) through the woods to the Lab road. Beats: a rat skirmish that teaches attack, a Lab agent patrol that teaches the dash, a shot gate only Lucas can open, a scripted scare (lights flicker, a growl, a shape crosses the trail, no fight), Eleven's recruit scene with an Eggo, a push gate only she can open, and a three-wave ambush that ends the level.
- Four heroes: Mike, Dustin, Lucas, Eleven. Basic, special, dash, swap, the Lv 3 talent, KO and retry, and a simple party burst (all four specials at once).
- Leveling: XP, bench XP, the d20 level-up screen. A normal run ends at Lv 3, so everyone shows their first talent.
- Enemies: Lab agent, rat. Pickups: Eggo, Coke, quarters.
- Music: Static (title) and Mirkwood with its combat layer, jingles for level-up, recruit, clear and game over, about 20 effects, and speech blips for the four heroes plus Joyce. The scare plays the motif inverted.
- HUD (bulbs, MP, XP, bench, d20 meter), dialogue with portraits, results screen, scanlines and reduce-flashing toggles, gamepad, `?dev=1` and `?bot=1`.
- One autosave at each of Joyce's lights. The title offers CONTINUE and NEW GAME when a save exists, the pause menu has START OVER, and clearing the level wipes the save. `src/core/save.ts` holds it.

**Out until you've played it:** the other seven heroes, chapters 2 to 5, the map screen and shop, bonds, difficulty levels, the Hawkins, Lab and Upside Down tracks, saves beyond the one autosave, and the full docs set.

## The game

It's November 1983 in Mike's basement, mid-campaign, when the Demogorgon rolls up. Every chapter after that is another module of the same campaign, one per season. You cross each stage in real time with a party of four, swap heroes to solve what the current one can't, and light Joyce's Christmas lights to save. The dice stay on the table: crits are natural 20s, every level-up is a d20 roll, and the last boss falls to a roll the whole party makes together.

Loop: explore, fight, swap, light, boss, recruit.

## Chapters

A prologue comes first: Mike's basement, one screen, Will's spell roll going wrong.

| # | Chapter | Stages | Party grows | Boss | Hook |
|---|---|---|---|---|---|
| 1 | The Vanishing, 1983 | 1.1 Mirkwood (dark woods) · 1.2 Hawkins Lab · 1.3 Middle School | Mike, Dustin, Lucas to start. Eleven in 1.1 | Demogorgon | Flashlight dark. Lights flicker when something's close. Joyce's alphabet wall |
| 2 | The Tunnels, 1984 | 2.1 Pumpkin patch and arcade · 2.2 Tunnels · 2.3 The Gate | Will, Max, Steve, Hopper | Demodog Alpha, then guard Eleven while she shuts the Gate | Burnable vines. Dart. First swap-to-solve puzzles |
| 3 | Starcourt, 1985 | 3.1 Mall concourse · 3.2 Russian base · 3.3 Food court | Robin, Nancy. Erica runs the shop | Grigori and Flayed Billy (mini-bosses), Mind Flayer | Flayed crowds, melting rats. The mall track goes sour near the boss. Hopper leaves the party |
| 4 | Hellfire, 1986 | 4.1 Kamchatka · 4.2 Hellfire Club and Creel House · 4.3 Upside Down Hawkins · 4.4 Vecna's lair | Eddie. 4.1 is Hopper alone | Demogorgon pit (mini-boss), Vecna | Vecna's clock curse. Max's Walkman. Eddie's rooftop solo |
| 5 | The Last Campaign, 1987 | 5.1 Hawkins under lockdown · 5.2 The Abyss · 5.3 Vecna inside the Mind Flayer | Hopper back. Everyone available | Vecna inside the Mind Flayer | Eleven and Will channel together, then the Final Roll. Epilogue in the basement |

Between stages there's a Hawkins map screen (Mario 3 style) for party picks, the shop, and replaying a stage for XP.

## Heroes

| Hero | Class | Basic | Special (MP) | Talents at Lv 3 / 6 / 9 | Opens |
|---|---|---|---|---|---|
| Eleven | Sorcerer | Push: short shove, free | Mind Blast (8): piercing beam, nosebleed under 25% MP | Flip (Push hurls props) / Sensory tank (hold Special to spot hidden things) / Overload (beam widens, stuns) | push, sense |
| Mike | Paladin | Bat: three-hit wide arc | DM screen (6): blocks shots, allies behind take half damage for 5 s | DM fiat (first hit of a fight always crits) / Rally (+20% ATK party, 10 s) / Oath (revive one ally per stage) | none |
| Dustin | Bard | Candy lure: lobbed bar, enemies chase it, small blast | Farrah spray (8): hairspray and a lighter, burning cone | Compass (shows secrets) / Dart (summons Dart, 12 s) / Cerebro (call Suzie, refill party MP 30%, once per stage) | burn, compass |
| Lucas | Ranger | Wrist rocket: 8-way, long range | Triple shot (5): three-way spread | Sharp eye (+15% crit) / Camo (dash drops aggro 3 s) / Volley (five-way) | shoot |
| Will | Wizard, then Cleric | Sketch bolt: slow arcane bolt | Fireball (10): a d20 sizes the blast, a 1 fizzles, a 20 doubles the radius | Cold spot (see hidden enemies) / Cleric (hold Special to heal 30%) / Hive link (reveal hidden paths 8 s) | sense |
| Max | Monk | Board: quick two-hit | Skate dash (4): invulnerable, damages the path, clears one-tile gaps | High score (+10% quarters, +5% crit) / Walkman (8 s, party ignores Curse) / Kickflip (dash leaves a shockwave) | dash |
| Steve | Fighter | Nail bat: three-hit, big knockback on the third | Babysit (6): taunt pulse, takes 40% less, party +15% DEF for 5 s | Hair of steel (first hit each fight does nothing) / Ahoy (tag-in leap) / King Steve (under 30% HP, +30% ATK) | smash |
| Nancy | Gunslinger | Pistol: steady single shots | Shotgun (7): wide cone, heavy knockback | Trap kit (dash drops a bear trap) / Molotov (hold Special for a fire pool) / Final girl (+40% ATK once two allies are down) | shoot, burn |
| Hopper | Barbarian | Haymaker: slow, huge hitbox | Ground slam (8): 360° shockwave, stuns | Coffee (food heals him 25% more) / Wind-up (hold Attack for a guard-breaking haymaker) / Berserk (under 35% HP, +50% ATK, can't be stunned) | smash |
| Robin | Rogue | Scoop toss: arcing, slowing splash | Word vomit (5): babble cone, enemies confuse and swing at each other for 3 s | Linguist (reads cipher doors, adds hints) / Triple scoop / Dry wit (confused enemies take +25%) | read |
| Eddie | Warlock | Flying V swing: wide arc, sound ring | Hellfire solo (9): six-second riff that stuns flyers and damages a ring. Press on the beat for crits | Metalhead (+10% ATK) / Hellfire DM (marks boss weak points) / Encore (solo repeats once) | riff |

**Voice and look.** Every line is original. The only borrowed phrases are nods, like a bond named after Mike's promise to Eleven and Steve's "Ahoy."

| Hero | How they talk | Sprite signature | Speech blip |
|---|---|---|---|
| Eleven | One or two words at Lv 1, full sentences by Lv 9, the way her speech grows across the seasons. "Bad." (kill) "Mine." (Eggo) | Pink dress with white collar, short hair, nose drip when strained | Soft triangle, slow |
| Mike | Bossy, earnest, checks on Eleven first. "Nobody gets left behind." | Striped polo, dark mop, walkie on the belt | Square |
| Dustin | Chatty, explains the science before the plan. "Hear me out." | Yellow-green trucker cap, curls, gap-toothed grin | Fast pulse |
| Lucas | Skeptical and practical, watches the exits. "Bad idea. Doing it anyway." | Camo bandana, wrist rocket | Low square |
| Will | Quiet, notices first. "It's close. I can feel it." | Bowl cut, plaid shirt, sketchbook | Soft triangle |
| Max | Quick and dry, hates being told what to do. "Try and keep up." | Red hair, board, headphones | 25% pulse |
| Steve | Self-deprecating dad energy. "Okay, kids, behind me." Hair flip on every level-up | Big hair, sailor top and tie, nail bat | Mid square |
| Nancy | Flat and decisive. "Cover me. I'm going in." | Brown bob, denim, shotgun | Triangle |
| Hopper | Gruff deadpan, soft underneath. "Coffee first. Monsters second." | Wider body, aloha shirt, mustache | Low saw |
| Robin | Rambling wit that gets worse under stress. "I speak four languages and none cover this." | Short blonde hair, sailor top, scoop | Fast high pulse |
| Eddie | Theatrical, nervous underneath. "Welcome to the Hellfire Club, freaks." | Long dark curls, denim vest, Flying V | Pulse with vibrato |

Checked against Netflix's season 5 cast guide (Mike paladin, Will cleric, Lucas ranger, Eleven sorcerer; Dustin's class isn't settled, so Bard is my call) and costume write-ups (Eleven's pink dress, the Scoops Ahoy sailor top, Hopper's aloha shirt, Dustin's yellow-green trucker cap). Lucas's bandana is camo in some sources and colorful in others. I'm going camo.

**Bonds** give small bonuses when both heroes are in the party: Friends don't lie (Mike + Eleven, +10% ATK, the DM screen covers her too), Party of four (Mike, Dustin, Lucas, Will, +8% DEF), Chief and kid (Hopper + Eleven, +10% DEF), Mad Max (Lucas + Max, +10% SPD), Babysitter's club (Steve + Dustin, Babysit also heals Dustin), Scoops troop (Steve + Robin, +10% crit), Hellfire (Eddie + Dustin, solo lasts 2 s longer).

**NPCs.** Joyce keeps the Christmas lights (checkpoints). Erica runs the ice cream cart and sells Eggos at triple price. Jonathan, Murray and Bob hand out hints. Dr. Brenner, Dr. Kay and Lt. Akers appear in cutscenes. Easter eggs: Barb's glasses and a MADMAX high score, both in 2.1.

## Combat and leveling

| Input | Keys | Action |
|---|---|---|
| Move | WASD / arrows | Eight-way |
| Attack | J / Z | Hero's basic. Melee chains three hits |
| Special | K / X | Costs MP. Hold for the Lv 6 variant where a hero has one |
| Dash | L / C | 12 frames of invulnerability, 0.7 s cooldown |
| Swap | Q / E or 1–4 | 1.5 s cooldown. The incoming hero lands a small shockwave |
| Party burst | U / V | When the d20 meter is full |
| Talk, light | Space / Enter | Interact |
| Pause | Esc / P | Party, items, settings |

Gamepad uses the standard mapping. The controls get taught in character in 1.1, so Dustin explains attacking and Lucas explains the dash.

**Attack rules**
- Fixed 60 Hz. Melee heroes chain three hits if you tap within 18 frames. Ranged heroes aim eight ways on a cooldown.
- Damage is `max(1, round(power × ATK × spread − DEF × 0.5))`, spread 0.9 to 1.1. Crit chance is 5% plus the hero's bonus, double damage, bigger hit-stop, and a yellow "NAT 20" over the target.
- Feel: 2 to 5 frames of hit-stop, screen shake, a white flash, knockback, floating numbers, pixel dust.
- Every real enemy attack has a red "!" and a 0.4 s wind-up, and each attack has its own telegraph shape, so color is never the only cue.
- Specials spend MP. MP regenerates 4% per second. Benched heroes regenerate 6% MP and 2% HP per second.
- Party burst: the d20 meter fills from hits dealt, hits taken and kills. At full, press U for a 1.5 s freeze, portraits slam in, "ROLL FOR INITIATIVE," then each of the four heroes' signature attack sweeps the screen. Damage scales with the party's average level.
- Status: burn, stun, slow, confuse, curse (Vecna's clock).
- A KO'd hero drops out and the next swaps in. All four down returns you to the last light with XP kept.
- Difficulty: Kid, Chief, Upside Down (enemy HP and damage ×0.7, ×1, ×1.4).

**Leveling rules**
- Cap is 12. XP to next level is `round(18 × L^1.7)`, about 4,900 XP from 1 to 12.
- The active hero earns full XP and the bench earns half. A recruit joins at the party's average level minus one, so nobody arrives useless.
- On level-up the hero heals 50% and rolls a d20. Bonus points are `floor(roll / 5)`, spread by the hero's growth weights on top of fixed per-level gains. A 20 gives five points, a full heal and 20 s of Inspiration for the party. A 1 gives none and the next roll has advantage. Nothing here can make a hero worse.
- The level-up screen shows the tumbling die, stat deltas, the hero's own line and any new talent.
- Talents arrive at levels 3, 6 and 9. Will's change from Wizard to Cleric at 6 follows the show, where his class changes between campaigns.
- Pace target: Lv 4 after chapter 1, 6 after 2, 8 after 3, 10 after 4, and 12 only if you clear most of chapter 5. A balance test enforces it.

**Puzzle gates** make the swap matter. Each hero's "Opens" tag in the table above is checked against the gate.

| Gate | Needs | Example |
|---|---|---|
| Vine wall | burn | Dustin's spray, Nancy's Molotov |
| Cracked wall | smash | Hopper's slam, Steve's bat |
| Heavy crate, stuck door | push | Eleven |
| Far switch | shoot | Lucas, Nancy |
| Hidden door | sense, compass | Will, Eleven, Dustin |
| One-tile gap | dash | Max |
| Cipher door | read | Robin, in Russian on the 3.2 doors |
| Crystal glass | riff | Eddie |

## Enemies and bosses

| Enemy | Where | Behavior | Counter |
|---|---|---|---|
| Lab agent | 1.2, 5.1 | Hazmat suit, tranq darts from range, backs off | Close the gap, DM screen |
| Rat | 1.x, 3.x | Swarms. In chapter 3 they melt and burst into goo | Area attacks |
| Demodog | 2.x, 4.x | Fast lunge after a telegraph, packs of three | Dodge, then hit |
| Vine, spore pod | 2.x, 4.x, 5.x | Stationary. Slows, or releases a cloud | Burn |
| Flayed | 3.x | Slow grabbers in crowds, rise from goo piles | Knockback, area damage |
| Russian soldier | 3.2 | Ushanka, rifle, burst fire | Tables as cover, DM screen |
| Creel ghoul | 4.2 | Steps out of mirrors in the dark | Flashlight, Christmas lights |
| Demobat | 4.3, 5.x | Flies in groups, ignores walls | Eddie's solo, Lucas |
| Trooper | 5.1 | Rifle and shield, flanks | Hit the back |

| Boss | Fight |
|---|---|
| Demogorgon (1.3) | Charges across the arena and stuns itself on walls. At 60% the petals open and it spits acid arcs. At 30% it leaps onto shadow marks. Three stuns and Eleven's blast finishes it |
| Demodog Alpha (2.3) | Howls to call three Demodogs, vines wall off the arena. Then a 45 s defense: guard Eleven while the floor tears open |
| Grigori, Flayed Billy (3.2, 3.3) | Grigori walks straight at you and resists frontal hits, so flank him or lure him onto the power box and have Lucas shoot the far switch. Billy is fast and hits hard |
| Mind Flayer (3.3) | A flesh spider. Legs strike down telegraphed lines, goo pools spread, Flayed crowds spawn. Hit the legs |
| Demogorgon pit (4.1) | Hopper alone against a smaller Demogorgon, haymaker and ground slam only |
| Vecna (4.4) | A clock chimes four times and a random hero is cursed. The curse detonates on the fourth chime unless Max plays her Walkman or you break the marked memory orb. Vines grab, memory orbs heal |
| Vecna inside the Mind Flayer (5.3) | Phase one is Vecna, fast. Phase two is the spider with Vecna inside. Phase three needs Eleven and Will channeling together while the others hold the line. Then the Final Roll: each surviving hero adds a die with advantage, so a whole party is close to a lock. Joyce's axe finishes the combo |

## Music and sound

| Track | Where | Key, tempo | What it does |
|---|---|---|---|
| Static | Title | D minor, 92 | Slow pulse arpeggio, lead enters at bar 9, the Hawkins motif in the open |
| Hawkins | Map screen, 2.1, 4.2 | F major, 112 | Warm and a little wistful. The motif in major |
| Mirkwood | 1.1, 4.1 | A minor, 76 | Drone, ticking, sparse bells. Snow slows it down in 4.1 |
| The Lab | 1.2, 5.1 | E minor, 104 | Industrial pulse, a klaxon figure, one 7/8 bar in every four |
| Upside Down | 2.2, 4.3, 5.2 | D Phrygian, 66 | The motif inverted, two detuned pulses, noise wind |
| Starcourt | 3.1, 3.2 | C Lydian, 118 | Bright mall pop. Pitch bends sour near the boss |
| The Clock | Every boss | G minor, 150 | Low bell on the first beat of every fourth bar, relentless sixteenths, motif inverted |
| The Abyss | 5.3 | D minor, 160, +4 bpm per phase | All the motifs at once |
| One last campaign | Ending | F major, 72 | Triangle and soft pulse. The motif resolves. Ends on a dice roll |

Jingles and stingers: level-up, victory, game over, recruit, item, dice roll, curse chime, boss sting, and an 11-hero set of tag-in stingers of two to four notes each.

- **One motif ties it together.** A six-note Hawkins motif opens the title and the Upside Down plays it inverted: every interval flipped around the tonic, then snapped to Phrygian. It's one function, `invert(motif, axis, scale)`, so the Upside Down melody is literally the title tune upside down.
- **Channels** follow the NES: two pulse (12.5, 25 and 50% duty through `PeriodicWave`), triangle, noise (15-bit and 7-bit LFSR), plus an effects bus. Master gain feeds a limiter.
- **Adaptive layers.** Each area track has a base layer and a combat layer (drums, driving bass). The combat layer fades in when enemies aggro and out when they don't.
- **The sequencer schedules one bar at a time**, so the same code runs live (lookahead timer) and offline (`OfflineAudioContext`) for tests and WAV export.
- **Speech blips** per hero (wave and pitch from the table above). Sound starts on the first keypress, with mute and separate music and effects volume.
- **Originality.** The show's main theme is a Cmaj7 arpeggio near 84 bpm, so I'm staying off that shape and tempo. Max's Walkman and Eddie's solo are story beats played by original tracks, not by the songs. No lyrics anywhere.
- **What I can and can't check.** I can't hear it. I can prove the notes are in key, loops close, polyphony stays at five, nothing clips (peak under 0.9, limiter under 3 dB) and levels match. Each track renders to `music/*.wav` so you can listen without opening the game. Whether it's good is your call, and a revision is a one-file change.

## Look

- 256×224 canvas, 16×16 tiles, integer-scaled and letterboxed, `image-rendering: pixelated`.
- One fixed palette of about 40 NES-style colors. Sprites use at most five. No gradients and no alpha. Pools of light at night are dithered, not blended.
- Paper-doll sprite generator: three body templates (kid, teen, big), hair masks, accessories and a palette per hero, drawn to offscreen canvases at boot. Bosses are hand-authored grids or drawn limbs (the Mind Flayer's legs are pixel-snapped lines). 24×24 portraits come from a head template with five expressions.
- Upside Down: palette swap to blue-black and vein red, palette cycling on the veins, drifting spores. Hawkins stays warm: sodium streetlights over teal night.
- Night stages (Level 1 is one) repaint their tiles in a night palette and paint a pool of light around each lamp, lit window and string of bulbs. Daytime stages use the normal art with nothing over it. Christmas lights and streetlights flicker faster as danger closes in.
- HUD: HP is a string of Christmas bulbs (one per 10 HP), MP is a bar, XP a thin line, and the party meter is a d20 that fills and glows when ready. Bench heroes show a face and a pip bar.
- Title: red pixel logo with a flicker, Joyce's alphabet wall lighting R-U-N, "Fan tribute. Not affiliated with Netflix."
- A hand-drawn 5×7 caps font. Dialogue boxes have the portrait on the left, three lines of 32 characters and typewriter text with the hero's blip.
- Settings: music and effects volume, difficulty, scanlines, screen shake, reduce flashing.

## Build

```
src/
  main.ts            boot, URL flags, canvas scaling
  core/              loop, input (keys, gamepad), scenes, camera, save, settings, rng
  gfx/               palette, font, sprite generator, portraits, tiles, lighting, particles, CRT
  world/             stage format, collision, interactables, gates, checkpoints, stages/*.ts
  heroes/            roster, abilities, growth, bonds, barks
  enemies/           bestiary, ai, bosses/*.ts
  combat/            hitboxes, damage, projectiles, status, party burst
  progression/       xp, level-up roll, talents
  audio/             engine, synth, sequencer, tracks/*.ts, sfx, voices, render
  story/             chapters, dialogue, cutscenes
  ui/                hud, dialogue box, menus, level-up, map, dev panel
tests/               xp, damage, heroes, maps, dialogue, tracks, balance
docs/                game-design, character-plan, music-plan, technical-architecture, screenshots/
music/               rendered WAVs
```

- Stages are ASCII grids (about 40×30) with a legend and an entity list. A test flood-fills from the start to prove every exit, chest and boss door is reachable and every gate has a hero who can open it.
- Rules and data modules import nothing from the DOM, so tests import them directly.
- Source uses `.ts` import extensions, `import type`, and no enums or parameter properties (`verbatimModuleSyntax`, `erasableSyntaxOnly`), so the same files run in Vite, `tsc` and Node's test runner (`node --test tests/*.test.ts`, no `tsx`).
- `vite.config.ts` is a plain object with no `vite` import, `cacheDir` set to `.vite`, and a dev-only `/__snap` endpoint for screenshots and WAVs, like `diablo`'s.
- `.claude/launch.json` has an attach config and an `npm run dev` config, like `diablo`'s. Dev flags: `?dev=1` (panel: god mode, give XP, jump to a stage, force a roll, hitboxes), `?stage=2.2&party=eleven,mike,dustin,lucas&level=6`, `?bot=1`, `?sheet=1`, `?mute=1`.
- Design docs in `docs/` get written as the systems land, from this plan.
- **Sandbox:** the npm registry returns 403 here, so I can't `npm install`. I run `diablo`'s installed Vite 8.2.2 and tsc 7.0.2 by absolute path against this folder and don't touch `diablo`. `package.json` pins the same versions, so `npm install && npm run dev` works for you.

## Order of work

### This pass, with sub-agents

Sub-agents start with small contexts, which is cheaper than one long thread doing everything. Contracts come first so they can't collide.

1. **Spine (me, no agents).** Scaffold, `docs/technical-architecture.md` (one page: folder ownership, entity and stage types, the exact API each module exports, commands, conventions), shared types, palette, and compiling stubs for `gfx`, `audio` and `rules`, so every agent can typecheck from minute one. I also `cp` this plan to `docs/game-design.md` and start the dev server. Every brief hangs off this, so I write it myself.
2. **Phase 1, three agents in parallel, disjoint folders.**

| Agent | Owns | Delivers |
|---|---|---|
| Art | `src/gfx/`, the `?sheet=1` page | Font, palette helpers, sprite generator, the four heroes plus Joyce, agent, rat, portraits, woods tiles by day and night, FX, light pools, bulb and d20 HUD art |
| Audio | `src/audio/` | Engine, synth, sequencer, Static and Mirkwood, jingles, effects, blips, offline render and metrics |
| Rules | `src/combat/`, `src/progression/`, `src/heroes/`, `src/enemies/`, their tests | Damage, XP, the d20 level-up, talents, abilities for the four heroes, agent and rat AI, party burst, status effects. Pure TypeScript, no DOM |

3. **Phase 2, two agents in parallel**, briefed with the real APIs from phase 1.

| Agent | Owns | Delivers |
|---|---|---|
| World | `src/world/`, `src/story/` | Stage loader, collision, gates, lights, pickups, the play scene, stage 1.1 map and script, prologue and Eleven scenes, reachability test |
| UI | `src/ui/` | HUD, dialogue box, level-up screen, title, results, pause and settings, dev panel |

4. **Integrate and prove (me).** Typecheck, run the tests, boot the game, run the bot through 1.1, read state and console in the browser pane, take a few screenshots, fix the glue, hand it to you.

**Token and limit rules**
- Each brief is under 600 words and points at line ranges in this plan and the contract doc instead of pasting them. Agents read the contract, not each other's code.
- Reports come back in 150 words or less: files, API changes, what was verified, what's open. No code in reports. I don't re-read what they wrote. I trust `tsc`, the tests and the bot, and grep `^export` when I need a signature.
- No file over about 500 lines and no single write over about 400, so nothing trips an output limit.
- Sonnet for everything that ships, Haiku only for docs polish. Never more than three agents at once.
- Screenshots are the expensive part. Half scale, at most six in total (the sprite sheet plus a few game states). Everything else comes from `javascript_tool` state and the console.
- The browser pane is shared, so each agent opens its own tab and passes its `tabId` on every call.
- I wait for completion notices instead of polling.
- There's no git repo here, so after the spine and after each phase I copy the project to the scratchpad as a checkpoint. A bad pass rolls back without touching git.
- Every phase ends on a green typecheck, and `TODO.md` lists what's done and next. If a limit stops me mid-pass, resuming costs one agent restart, not a redo.

When Level 1 runs, I stop and tell you how to play it (the pane is already running it, or `npm install && npm run dev` on your machine) and what I'd like feedback on.

### Full-game roadmap

This pass covers steps 0 to 6 for Level 1 only, plus the first stage of step 7. The rest waits for your feedback.

| # | Step | Done when |
|---|---|---|
| 0 | Scaffold: package.json, tsconfig, vite config, index.html, launch.json, dev server up | Blank canvas scales correctly in the browser pane and typecheck passes |
| 1 | Core: loop, input, scenes, camera, save, settings, palette, font, dev panel, URL flags | A test scene draws text and moves a box at 60 fps |
| 2 | Art: sprite generator, portraits, tiles, enemy and boss sprites, `?sheet=1` review page | Every hero, enemy and portrait reads correctly in a screenshot of the sheet |
| 3 | World and dialogue: stage format, collision, interactables, darkness, lights, dialogue box | 1.1 is walkable, doors and lights work, text types out with blips |
| 4 | Combat: hitboxes, attacks, enemy AI, damage, juice, items, KO and retry | Three heroes fight agents and rats with no console errors |
| 5 | Progression: XP, d20 level-up screen, talents, bench XP, catch-up, bonds, swap, all 11 specials, party burst | The bot takes a hero from Lv 1 to 4 in 1.1 and the tests pass |
| 6 | Audio: engine, sequencer, SFX, blips, first four tracks, offline render and metrics | Title, Hawkins, Mirkwood and Lab render clean WAVs |
| 7 | Chapter 1 end to end: prologue, three stages, Demogorgon, map screen, saves | Playable from title to the chapter 1 results screen. This is the vertical slice |
| 8 | Chapters 2 to 5: stages, enemies, bosses, cutscenes, remaining tracks, ending | The bot clears every stage and every boss is beatable |
| 9 | Polish and proof: balance pass, accessibility, performance, docs, README, screenshots, final build | The verification list below passes |

## Verification

**Level 1 gate (this pass).** Typecheck and build run clean. Tests pass for XP, damage, the four heroes, stage 1.1 reachability and gates, dialogue fit, track data, and the em dash rule. The bot clears 1.1 and finishes at Lv 3. Zero console errors, frame time under 4 ms, both tracks inside the audio metrics. No more than six screenshots.

**Full game, after feedback**
- `tsc --noEmit` and `vite build` run clean.
- `node --test tests/*.test.ts` covers: XP curve and cap; level-up roll rules; damage bounds; every hero has a basic, a special, three talents and barks; stage reachability and gates; dialogue fits the box; music is in key with closed loops; time-to-kill bands and level pacing per chapter; and no em dashes anywhere in `src/`, `docs/` or the README.
- Browser pane: screenshots of the title, map, every stage, dialogue, level-up and every boss; zero console errors; frame time under 4 ms.
- Bot (`?bot=1&stage=2.2`): walks an A* path, fights, collects, and logs kills, XP and level-ups. Run on every stage.
- Audio: every track rendered offline and checked for peak, limiter reduction and RMS. WAVs written to `music/`.
- Manual checklist at the end: keyboard and gamepad, swap, every special, dash, party burst, KO and retry, save and load, pause, settings.

## Risks and cut line

- **Limits.** Three agents at most, short reports, checkpoints after every phase, and a green build plus `TODO.md` at each stop. A limit mid-pass costs a resume, not a redo.
- **Scope is the risk:** 16 stages, five bosses and three mini-bosses. Chapter 1 ships first as the vertical slice. If it runs long I cut stretch before systems, in this order: Eddie's beat bonus, the Kamchatka stage (Hopper just returns in chapter 5), Dart, alternate Lv 6 Special variants.
- **I can't hear the music.** See the audio note above.
- **Flashing lights.** The show leans on them, so there's a reduce-flashing setting and the flicker is rate-limited.
- **Dustin's hairspray flamethrower isn't a scene I could confirm.** It's a gag built on Steve's Farrah spray from season 2, not a claim about an episode.
- **Out of scope:** touch controls, alternate costumes, a Dig Dug-style arcade minigame, relics, a GitHub Pages workflow. I won't publish or deploy anything without your say.

## Sources

- [Stranger Things 5 cast guide with D&D classes (Netflix Tudum)](https://www.netflix.com/tudum/articles/stranger-things-season-5-cast-character-guide)
- [Representation of D&D in Stranger Things (Horror Obsessive)](https://horrorobsessive.com/2022/07/31/representation-of-dungeons-and-dragons-in-stranger-things)
- [Season 5 ending explained (Beebom)](https://beebom.com/stranger-things-season-5-ending-explained/amp/) and [finale recap (Rolling Stone AU)](https://au.rollingstone.com/tv/tv-features/stranger-things-finale-explained-recap-89407)
- [Season 5 cast and new characters (TheWrap)](https://www.thewrap.com/stranger-things-season-5-characters-cast-guide/)
- [Scoops Troop look (Syfy)](https://www.syfy.com/syfy-wire/look-of-the-week-the-stylish-scoop-troop-on-stranger-things) and [Hopper's aloha shirt (BAMF Style)](https://bamfstyle.com/2020/03/06/stranger-things-hop-s3-aloha/)
- [Recreating the main theme (Splice)](https://splice.com/blog/recreating-stranger-things-theme)
