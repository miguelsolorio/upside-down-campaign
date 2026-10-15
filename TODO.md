# TODO

Scope for this pass: Level 5 (stage 2.2, the tunnels, Max and Steve join), Level 6 (stage 2.3, the Gate, the Demodog Alpha and the defense of Eleven), and party picks on the map. The pass before it built Levels 3 and 4 and the Hawkins map.

## This pass (levels 5 and 6)

- [x] Owner's calls: Max and Steve join in 2.2, Hopper is an npc at the Gate. Party picks lock the heroes a stage's gates need (Max for 2.2, Steve for 2.3) and remember the last party. Eleven can fall in the defense, and a retry starts the defense again. Variation sheets first for the Alpha, the picks panel, the tunnels and the new heroes
- [x] Spine: `docs/level-5.md`, `docs/level-6.md`, "Party picks" in `docs/map-screen.md`, the contracts in `core/types.ts` and `world/types.ts`, ten tiles, `pickParty` and remembered picks, stand-ins, stub stages
- [x] Sim A: Max, Steve, `gap`, `crack`, the bot's dash crossing (805 tests pass)
- [x] Art: `heroes2-variations.html` (Max, Steve, Hopper), `alpha-variations.html`, `tunnel-variations.html`, sent to the owner one image per option
- [x] Sim B: the Alpha, the seals, run-time spawns, the defense (850 tests pass). The Alpha's ATK is 26, not the spec's 34: at 34 the bot never won the den
- [ ] UI: `picks-variations.html`
- [ ] Owner picks from the four sheets. Picked: Max Walkman, Steve Letterman, Hopper Uniform, Alpha Stalker, tunnels Roots. The picks panel sheet is still to come
- [x] World 2.2: the tunnels at `enemyMult` 1.25, 166 XP. Chief 18 of 20 (252 damage, 1.6 KOs, 34% low, 101 s), 100 seeds 90 cleared and none stuck, careless 19, kid 20, upside 8
- [x] A knocked-out hero stands back up when the party tries a gate only they can open (it soft-locked 2.2 at a gap)
- [x] Paused at 84% of the 5-hour window (19:52 PT), resumed after the 20:40 reset with the UI picks sheet and World 2.3
- [ ] World 2.3, Audio, Art build, UI build (picks panel, ward bar), flow glue
- [ ] Measured with the bot on chief inside the targets, map chains 2.1 to 2.2 to 2.3, typecheck and tests clean

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
- In 2.1 the careless bot clears more often than the careful one (20 of 20 to 17). Dogs that die in a few hits reward trading blows over dodging.
- The street rats in 2.1 keep their chapter 1 numbers and die in one hit. If a later stage needs a chapter 1 enemy at full strength, give it its own kind with chapter 2 numbers rather than a factor.
- The bot dodges the Demogorgon better than a person will (it reacts a frame late to the charge). The careless bot is the better guide. Nobody has fought it by hand.
- No level-ups happened in the bot runs of 1.3 and 2.1: the lead stays Lv 5. The plan's "Lv 6 after chapter 2" now depends on 2.2 and 2.3.
- A `?stage=` jump seeds levels but no XP, so it arrives a little behind a real run.
- The map, CONTINUE into the map and replays are covered by unit tests and one bot run through the map. Nobody has played title to 2.1 by hand with saves.
- 1.3: the side door is a one-tile tunnel, so the van sits in a vertical wall. The scare fires when the cafeteria rats are cleared, not by position. The gym's court lines don't follow the arena.
- The `l3_*` and `l4_*` scripts have only had the mechanical copy checks.
- No shop yet (Erica, chapter 3) and no party picks (they wait until there are more than four heroes).

From Levels 1 and 2:

- Nobody has heard the music. The Lab track is checked by metrics only (base peak 0.49, combat peak 0.79, no limiter reduction, no clipping). The 7/8 bars are checked by tests and by comparing the live scheduler to the compiled notes, not by ear.
- The bot opens gates and the crate by flag. The Dustin burn, the Lucas relay shot and the Eleven push are covered by unit tests and one by-hand browser run, not by a full human run of the stage. Nobody has played 1.2 start to finish by hand.
- The bot is a good dodger and flatters the difficulty: hazards were about 75 percent of its damage on the first draft, and it sidesteps almost every guard bash. `createBot({ careless: true })` is a floor for a player who is not dodging. Nobody has played the harder Lab by hand, so how it feels to a person is unknown. If it is still too easy, raise `enemyMult` in `stage12.ts`; if it is too hard, lower it. The difficulty setting stacks on top.
- The Lab's XP (360) takes the lead to Lv 5 (the plan said Lv 4 after chapter 1), so stage 1.3 should be tuned for a party that arrives at Lv 5.
- Two bot stalls (a pickup at its reach edge, an idle enemy at its engage radius) were fixed in `combat/bot.ts`. There may be others.
- The cage tile (`c`) is also used for lockers and shelves in corridor A and the storage hall, so some of them read as rat cages. A separate locker tile would fix it.
- The klaxon has a sound but no visual. The red border pulse was cut. The `alarm` step calls an optional `env.alarm`, so a visual can hang off it later.
- The dev panel's group and prop suggestions are still the 1.1 ones. Use `?stage=1.2` to jump and `?dev=1` to open the panel.
- Stage 1.2's dialogue is off by default like the rest. The `l2_*` scripts only show with SKIP STORY off, and have only had the mechanical copy checks.
- The controller is checked with unit tests and a simulated Xbox pad in the browser, not with real hardware yet. Its buttons can't be rebound, there's no rumble, and a lost controller doesn't pause the game. Only the standard mapping is read.
- The autosave at Joyce's lights keeps levels, kills and story beats but not health, and the results screen only times the stretch since the last Continue.
- Keyboard rebinding is saved per browser. Arrow keys, Enter, Escape and Backspace are fixed so menus can't get stuck.
- Losing focus silences the game but doesn't pause it, so enemies keep moving while you're away.
- Skip story is on by default, so the level's tutorial lines never show unless the player turns it off. The combat controls sit in the bottom left corner of the level instead, and fade to grey once the party leaves the starting yard. A puzzle gets a hint the moment someone tries it with the wrong hero (swings or fires at it, or pushes against its gate or door), with a bobbing yellow caret over the prop and a subtitle that names the hero (MAYBE ELEVEN SHOULD TRY HER SHOVE), so the Lab's three gates teach nothing else in words when the story is skipped. A party that tries nothing still gets the hint after five seconds near the puzzle.
- Only four tag-in stingers exist (one per playable hero).
- Level 1 takes the bot 86 seconds and Level 2 takes it 58. A person should need five to eight minutes for each.

## How to resume

1. Read `docs/technical-architecture.md`, `docs/level-1.md` and `docs/level-2.md`.
2. Typecheck and run the tests (commands are in the architecture doc). To see how hard a stage is, run `node scripts/measure-stage.ts 1.2 chief 20` (see "Measuring" in `docs/level-2.md`).
3. `src/core/campaign.ts` holds the stage order and who plays each stage. To add stage 2.2: add its data under `src/world/stages/`, register it in `src/world/stage.ts`, add it to `STAGE_ORDER`, give it a `ROSTER` and an `ARRIVAL` entry, and move it out of `STAGES_AHEAD`. The map node is already in `core/mapdata.ts`.

## Later (after feedback)

Stages 2.2 (the tunnels, `upside` track) and 2.3 (the Gate and the Demodog Alpha), with Max joining in 2.2. Then chapters 3 to 5, the other heroes, the shop and party picks, bonds, the remaining tracks, docs polish.
