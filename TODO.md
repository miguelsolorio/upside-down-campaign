# TODO

Scope for this pass: Level 5 (stage 2.2, the tunnels, Max and Steve join), Level 6 (stage 2.3, the Gate, the Demodog Alpha and the defense of Eleven), and party picks on the map. The pass before it built Levels 3 and 4 and the Hawkins map.

## This pass (levels 5 and 6)

- [x] Owner's calls: Max and Steve join in 2.2, Hopper is an npc at the Gate. Party picks lock the heroes a stage's gates need (Max for 2.2, Steve for 2.3) and remember the last party. Eleven can fall in the defense, and a retry starts the defense again. Variation sheets first for the Alpha, the picks panel, the tunnels and the new heroes
- [x] Spine: `docs/level-5.md`, `docs/level-6.md`, "Party picks" in `docs/map-screen.md`, the contracts in `core/types.ts` and `world/types.ts`, ten tiles, `pickParty` and remembered picks, stand-ins, stub stages
- [x] Sim A: Max, Steve, `gap`, `crack`, the bot's dash crossing (805 tests pass)
- [x] Art: `heroes2-variations.html` (Max, Steve, Hopper), `alpha-variations.html`, `tunnel-variations.html`, sent to the owner one image per option
- [x] Sim B: the Alpha, the seals, run-time spawns, the defense (850 tests pass). The Alpha's ATK is 26, not the spec's 34: at 34 the bot never won the den
- [x] UI: `picks-variations.html`. The owner picked Grid
- [x] Owner picks from the four sheets: Max Walkman, Steve Letterman, Hopper Uniform, Alpha Stalker, tunnels Roots, picks panel Grid
- [x] World 2.2: the tunnels at `enemyMult` 1.25, 166 XP. Chief 18 of 20 (252 damage, 1.6 KOs, 34% low, 101 s), 100 seeds 90 cleared and none stuck, careless 19, kid 20, upside 8
- [x] A knocked-out hero stands back up when the party tries a gate only they can open (it soft-locked 2.2 at a gap)
- [x] Paused at 84% of the 5-hour window (19:52 PT), resumed after the 20:40 reset with the UI picks sheet and World 2.3
- [x] World 2.3, then tuned by the lead: the spec's Alpha and 23-dog defense were a cliff (stage factor 0.7, no chief KOs). Alpha 700 HP and 16 ATK, 17 defense dogs, Eleven 160 HP, and the gate beat lights `lights_gate` (a new `light` step). Chief 19 of 20 (Eleven fell once), 426 damage, 0.8 KOs, 38% low, 116 s; 100 seeds 97, none stuck; careless 20, kid 20, upside 6. Damage and the boss share (70%) are over their bands because of the 45 s defense
- [x] Art build (Max, Steve, Hopper, the Alpha, the tunnels and flesh tiles, gap, crack, rift, the new fx, sheet pages 18 to 24), UI build (the Grid picks panel, the ward bar), Audio (six effects, two stingers, two blips, a saw voice), flow glue (picks remembered in progress)
- [x] Art fix for 2.3: dark flesh with thin veins toward the rift, thin dark tears, dim Lab tiles at night. The other stages' tiles are unchanged (tile hashes match)
- [x] Verified: typecheck clean, 972 tests pass, the production build passes. In the browser the map opens on The Tunnels, the Grid panel locks Max, a changed pick (Will lead, Steve out) starts 2.2 with that party and is remembered, LEVEL 5 CLEAR leads to the map, and 2.3's panel swaps Steve in for Max. The defense shows ELEVEN and the seconds left. No console errors on a clean load of the title, 2.2, 2.3 and the sheet
- [x] Merged into main with main's playable arcade cabinets brought in first: typecheck clean, 1046 tests pass, 2.1 to 2.3 run with no console errors
- [ ] Feedback on Levels 5 and 6

## Pace pass (levelling over the whole run)

- [x] `scripts/measure-campaign.ts` plays 1.1 to 2.3 with the bot, carrying the party through `partyFor`, the picks panel and `recordClear`, lighting the lights and retrying from them, and prints each hero's level after every stage. `tests/pace.test.ts` holds the run to the pace. See `docs/pace.md`
- [x] Measured over 20 seeds before: the lead ended chapter 1 at Lv 5 (the Lab's 360 XP), a level over, and chapter 2 at Lv 6 only when one hero kept the lead
- [x] A stage XP factor, `xpMult`: 1.2 at 0.4, 1.3 at 0.7, 2.1 and 2.2 at 1.5, 2.3 at 1.6. The lead ends chapter 1 at Lv 4 and chapter 2 at Lv 6 in every seed; sharing the lead, chapter 1 at Lv 4 and chapter 2 at Lv 6 in 19 runs of 20
- [x] `?stage=` seeds are the levels and XP a real run walks in with (`ARRIVAL`). Every stage measured again: 1.3's `enemyMult` went from 1.7 to 1.5, the rest kept theirs
- [x] Two bot stalls the weaker party showed on 2.2 upside: a knocked-out Max at a gap, and a pod over a wall. Both fixed
- [x] 1.3: the van is parked in the lot across a two-tile side door, the scare fires mid-room (the level holds still while it plays), and the gym's lines frame the court
- [x] Verified: typecheck clean, 1053 tests pass, the production build passes. Merged into main

## Dark Game Boy (touch screen)

- [x] Five dark shells on `shell-variations.html`. The owner picked 1, Play It Loud: the 1995 black Game Boy
- [x] The shell's colours are a `ShellTheme` (`ui/touchtheme.ts`), with the keys in `ui/touchkeys.ts`, so every touch file is under 500 lines. The grey shell draws as before
- [x] The shell follows the phone's light or dark mode, even mid-game. A GAME BOY row in the options (touch only, where CONTROLS sits off touch) forces AUTO, LIGHT or DARK, and it's saved with the settings. `touch-controls.html` has a Light and Dark switch

## Rough edges pass (the code fixes from the list below)

- [x] Losing focus pauses. `input.interrupted()` is true for one tick after the window blurs or the tab is hidden, and the play scene opens the pause menu on it (not for `?bot=1`, and not over dialogue, the wipe or the clear, where nothing is moving to protect). A cabinet run holds the same way. The title, the map and the menus ignore it
- [x] A lost controller pauses. Only the pad being played with counts: one that drops while the keyboard or the touch screen has the hands, or one of two, shows CONTROLLER LOST and nothing else
- [x] The Lab's lockers and shelves were already fixed. The second pass gave corridor A its lockers as `L` and the storage hall its shelves as `N`, and `c` is left only on the animal lab's cage wall, so this list item was stale. Swapping in 1.3's `lockerwall` would have put school lockers in the Lab. `tests/lab-furniture.test.ts` now holds the split
- [x] The klaxon's glow: `world/klaxon.ts` and `drawKlaxon`, rung from `env.alarm`. A red edge glow that fades in over 0.6 s, breathes once every 2.5 s for 5 s and fades out over 1.5 s, under the HUD. With Reduce flashing on it holds one steady dim level and nothing breathes or blinks
- [x] The dev panel follows the stage: its group and prop suggestions (and the two boxes' starting values) come from the stage's own spawns (`world/devhooks.ts`). `KEPT_PROPS` moved to `world/options.ts`, and `play.ts` is back under 500 lines
- [x] Verified: typecheck clean, 1091 tests pass (38 new), the production build passes. In the browser with `?mute=1`: blur, a hidden tab and a pad pulled out each open the pause menu and hold the level, the title ignores all three, a Galaga run holds on blur, the klaxon glow breathes in 1.2 and holds steady with Reduce flashing on, and the panel's boxes list 1.2's, 2.1's and 2.3's own groups and props. No console errors on the title, 1.2, 2.1 and 2.3. A real controller and a real window switch were simulated with events, not tried by hand

## Controller pass (rebinding and rumble)

- [x] Controller buttons rebind. The CONTROLS screen has a GAMEPAD page (it opens first while a controller is in use): ATTACK, SPECIAL, SWAP BACK, SWAP NEXT and CRIT, each with two of the eight face, bumper and trigger buttons. A taken button swaps, every action keeps one, and A (confirm and use) and B (back) are fixed the way Enter and Esc are. Saved beside the keys in `core/padmap.ts`, and every hint that names a button follows
- [x] Rumble: short weak pulses on the active hero's hit, a KO, a level-up and a boss slam or landing, through `vibrationActuator`, skipped quietly where it's missing. A RUMBLE ON / OFF row shows in the options only while a controller is in use, saved with the settings
- [x] The one hook into world code: a call to `rumble(ev)` at the top of `forward()` in `world/play.ts`. Nothing in combat, enemies or the HUD changed
- [x] The options rebuild their rows when the input changes (picking up a pad with the menu open), keeping the cursor on its row
- [x] Verified: typecheck clean, 1149 tests pass (58 new), the production build passes. In the browser with `?mute=1` and a simulated pad: RUMBLE shows and saves, the GAMEPAD page rebinds by pad and by mouse, B binds without backing out, Start cancels, View clears, the level's hints and the pause menu follow the new buttons, and a bot run buzzes the fake pad's motor on hits and level-ups
- [ ] The picks screen's controller legend still prints `X LEAD` whatever SPECIAL is bound to (`legend()` in `ui/picks_logic.ts`, left alone while chapter 3 works in it). Its `A PICK` and `B BACK` are right, since A and B are fixed

## Status

- [x] Level 1 (stage 1.1 Mirkwood, the title, the basement prologue). See `docs/level-1.md`
- [x] Level 2 (stage 1.2 Hawkins Lab). See `docs/level-2.md`
  - Spine: nine lab tiles, `door` and `console` props, the `alarm` beat step, `{pick2}` and `{swapTo2}` key tokens, `src/core/campaign.ts`
  - Art: `gfx/tile_lab.ts`, `gfx/props_lab.ts`, lab pages on the `?sheet=1` review page
  - Audio: `Track.barSteps` (variable bar lengths), the `lab` track (E minor, 104 bpm, every fourth bar in 7/8), the `klaxon` effect
  - World and story: `world/stages/stage12.ts`, 13 `l2_*` scripts, three new puzzles (BURN, SHOOT, PUSH), the lockdown waves
  - Flow: clearing 1.1 shows LEVEL 1 CLEAR and CONTINUE, writes an entry save for 1.2, and carries levels, XP and d20 bonus. START OVER restarts the stage with the party it was entered with
- [x] Second pass on the Lab (it played too easy and looked plain). Harder: riot guards with a frontal shield, elites, the Warden mini-boss with a boss bar, electric and steam hazards, sweeping cameras that wake reinforcements, 36 enemies in place of 14, and a stage factor `enemyMult: 1.3` on top of the difficulty setting. Richer: 13 new dressing tiles, tanks, server racks, generators, cameras, a different floor and furniture in every room, Upside Down growth creeping in toward the records wing. See the end of `docs/level-2.md`
- [x] Measured with the bot on chief over 20 seeds: the Lab went from 13 damage taken to 237 (careful bot) and 292 (a bot that never dodges), with the party falling to 47% and 35% health. Kid clears 20 of 20, upside only 11 of 20. 100 seeds on chief: none stuck, none wiped
- [x] Verified, and again after merging the latest `main` (new controls, no dash, highlight-only hints): typecheck clean, 309 tests pass (the earlier count; 426 after the second pass). The bot clears 1.2 in the browser (21 kills, 124 XP, 0 KOs, lead Lv 4, bench Lv 3). The gates work with real key events (Dustin burns the sensor, Lucas shoots the relay through the glass, Eleven pushes the crate and Mike's bat does not). Before the merge, 1.1 chained into 1.2 with the party carried, and CONTINUE and START OVER on 1.2 worked. After it, the burn gate and the 30 second hint highlight were re-checked by hand. No console errors
- [x] Level 3 (stage 1.3 Hawkins Middle School). See `docs/level-3.md`
  - Night school: lot, hall, science room, cafeteria, gym. Eleven flips the van, Dustin burns the vines, Lucas shoots the fire box
  - The Demogorgon: charges into walls and stuns itself, petals and acid at 60 percent, shadow-mark leaps at 30 percent, pinned after three stuns until Eleven's Mind Blast finishes it. Boss bar, `clock` track
  - Bot on chief at `enemyMult` 1.7: careful clears 19 of 20 (238 damage, 39% low), careless 12 of 20, kid 20, upside 9. 100 seeds: none stuck. Stage XP 140
- [x] Level 4 (stage 2.1, the Palace and the patch). See `docs/level-4.md`
  - Chapter 2 starts here: Eleven is gone and Will joins at the others' average level minus one (`partyFor` in `core/campaign.ts`)
  - Will: Sketch bolt, a d20-sized Fireball (1 fizzles, 20 doubles), Cold spot shows hidden enemies. New foes: young demodogs, vines, spore pods. Max is an npc at Dig Dug with MADMAX on the board. Will opens the hidden corn path (`sense`)
  - Bot on chief at `enemyMult` 1.15: careful 17 of 20 (237 damage, 35% low), careless 20 of 20, kid 20, upside 11. 300 seeds: none stuck. Stage XP 166
- [x] The Hawkins map (`docs/map-screen.md`): results lead to the map, the map enters the next stage or replays a cleared one, chapter cards on a chapter's first visit, CONTINUE opens the map when no stage is in progress. Campaign progress is `core/progress.ts`
- [x] Music: `upside` (1.3), `clock` (every boss), `hawkins` (map and 2.1), each with base and combat layers. Eight new effects and Will's stinger
- [x] Verified: typecheck clean, 704 tests pass. In the browser the bot clears 1.3 (1:40, 140 XP), the map shows chapter two with Will in the party, and the bot clears 2.1 (1:45, 157 XP). No console errors on the title, 1.3 or 2.1
- [x] Chapter 2 enemy numbers: the demodog, vine and pod are sized for a Lv 5 party in `enemies/defs.ts`, and 2.1's `enemyMult` is back to 1.15 from 3.15. Chapter 1 enemies and stages are unchanged. Typecheck clean, 777 tests pass, and the bot clears 2.1 in the browser (1:55, 157 XP). See `docs/level-4.md`, "New enemies" and "Result"
- [ ] Feedback on Levels 1 to 4, then the rest

## Known rough edges

New with Levels 3 and 4:

- Nobody has heard `upside`, `clock` or `hawkins`. Metrics only (peaks 0.52 to 0.77, no limiting, no clipping). Upside is dissonant on purpose in places, and the clock's bell bars sit about 4 dB under the rest.
- In 2.1 only the demodogs ever hit the bot. The vine and pod numbers are sized by sums against the Lv 5 party, not by measurement. Nobody has fought them, or the dogs, by hand.
- In 2.1 the careless bot clears more often than the careful one (88 of 100 to 83 since the pace pass, 20 of 20 to 17 before). Dogs that die in a few hits reward trading blows over dodging.
- The street rats in 2.1 keep their chapter 1 numbers and die in one hit. If a later stage needs a chapter 1 enemy at full strength, give it its own kind with chapter 2 numbers rather than a factor.
- The bot dodges the Demogorgon better than a person will (it reacts a frame late to the charge). The careless bot is the better guide. Nobody has fought it by hand.
- The pace holds (`docs/pace.md`), with these gaps: 2.1 on upside clears 18 of 100, under its floor of 4 of 20, because the party arrives a level lower; 2.3 on chief clears 98 of 100, at the top of its band (97 before); a careless bot clears the Lab 78 of 100, down from 20 of 20.
- Recruits join low: Will at Lv 2 in 2.1, Max and Steve at Lv 3 in 2.2 (the average minus one of a party now a level lower). With the default picks Lucas and Will sit out 2.2 and 2.3.
- Nobody has played a carried run by hand, and the bot never swaps for a puzzle, so a person's lead takes less of the XP than the bot's.
- The map, CONTINUE into the map and replays are covered by unit tests and one bot run through the map. Nobody has played title to 2.1 by hand with saves.
- The `l3_*` and `l4_*` scripts have only had the mechanical copy checks.
- No shop yet (Erica, chapter 3) and no party picks (they wait until there are more than four heroes).

From Levels 1 and 2:

- Nobody has heard the music. The Lab track is checked by metrics only (base peak 0.49, combat peak 0.79, no limiter reduction, no clipping). The 7/8 bars are checked by tests and by comparing the live scheduler to the compiled notes, not by ear.
- The bot opens gates and the crate by flag. The Dustin burn, the Lucas relay shot and the Eleven push are covered by unit tests and one by-hand browser run, not by a full human run of the stage. Nobody has played 1.2 start to finish by hand.
- The bot is a good dodger and flatters the difficulty: hazards were about 75 percent of its damage on the first draft, and it sidesteps almost every guard bash. `createBot({ careless: true })` is a floor for a player who is not dodging. Nobody has played the harder Lab by hand, so how it feels to a person is unknown. If it is still too easy, raise `enemyMult` in `stage12.ts`; if it is too hard, lower it. The difficulty setting stacks on top.
- Two bot stalls (a pickup at its reach edge, an idle enemy at its engage radius) were fixed in `combat/bot.ts`. There may be others.
- Stage 1.2's dialogue is off by default like the rest. The `l2_*` scripts only show with SKIP STORY off, and have only had the mechanical copy checks.
- The controller is checked with unit tests and a simulated Xbox pad in the browser, not with real hardware yet. Nobody has felt the rumble: the pulses are weak numbers from `core/rumble.ts` (`PULSES`), sent through the Gamepad `vibrationActuator`, and a simulated pad only proves they're asked for. Only the standard mapping is read.
- The autosave at Joyce's lights keeps levels, kills and story beats but not health, and the results screen only times the stretch since the last Continue.
- Keyboard rebinding is saved per browser. Arrow keys, Enter, Escape and Backspace are fixed so menus can't get stuck.
- Skip story is on by default, so the level's tutorial lines never show unless the player turns it off. The combat controls sit in the bottom left corner of the level instead, and fade to grey once the party leaves the starting yard. A puzzle gets a hint the moment someone tries it with the wrong hero (swings or fires at it, or pushes against its gate or door), with a bobbing yellow caret over the prop and a subtitle that names the hero (MAYBE ELEVEN SHOULD TRY HER SHOVE), so the Lab's three gates teach nothing else in words when the story is skipped. A party that tries nothing still gets the hint after five seconds near the puzzle.
- Only four tag-in stingers exist (one per playable hero).
- Level 1 takes the bot 86 seconds and Level 2 takes it 58. A person should need five to eight minutes for each.

## How to resume

1. Read `docs/technical-architecture.md`, `docs/level-1.md` and `docs/level-2.md`.
2. Typecheck and run the tests (commands are in the architecture doc). To see how hard a stage is, run `node scripts/measure-stage.ts 1.2 chief 20` (see "Measuring" in `docs/level-2.md`). To see how fast the party levels over the run, run `node scripts/measure-campaign.ts chief 20` (`docs/pace.md`); a new stage needs an `xpMult` that keeps the pace and its line in `ARRIVAL`.
3. `src/core/campaign.ts` holds the stage order and who plays each stage. To add stage 2.2: add its data under `src/world/stages/`, register it in `src/world/stage.ts`, add it to `STAGE_ORDER`, give it a `ROSTER` and an `ARRIVAL` entry, and move it out of `STAGES_AHEAD`. The map node is already in `core/mapdata.ts`.

## Later (after feedback)

Chapter 3, Starcourt (1985): 3.1 the mall concourse, 3.2 the Russian base, 3.3 the food court and the Mind Flayer, with Robin and Nancy joining, Erica's shop, and Hopper leaving the party. Then chapters 4 and 5, the other heroes, bonds, the remaining tracks, docs polish.
