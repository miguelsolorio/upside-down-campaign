# TODO

Scope for this pass: Level 2, stage 1.2 Hawkins Lab, and the plumbing that leads Level 1 into it. Everything else waits for feedback.

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
- [ ] Feedback on Levels 1 and 2, then the rest

## Known rough edges

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
3. `src/core/campaign.ts` holds the stage order. To add stage 1.3: add its data under `src/world/stages/`, register it in `src/world/stage.ts`, add it to `STAGE_ORDER` and give it an arrival party in `campaign.ts`.

## Later (after feedback)

Stage 1.3 (the middle school) and the Demogorgon. Its XP budget should stay under about 110 so the party is Lv 4 after chapter 1 and not Lv 5. After that: chapters 2 to 5, the other seven heroes, the map screen and shop, bonds, difficulty, the remaining tracks, docs polish.
