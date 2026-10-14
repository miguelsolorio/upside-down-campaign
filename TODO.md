# TODO

Scope for this pass: Level 1 only (stage 1.1, the title, the basement prologue). Everything else waits for feedback.

## Status

- [x] Spine: scaffold, contract (`src/core/types.ts`), docs, compiling stubs
- [x] Phase 1: art, audio, sim. 117 tests, typecheck clean, WAVs in `music/`
- [x] Phase 2: world, UI, story
- [x] Integrate: 161 tests pass, typecheck clean, production build clean, bot clears the level (22 kills, 144 XP, 0 KOs), real keyboard path checked (move, attack, special, dash, swap, pause), dev panel mounts, no console errors
- [ ] Feedback on Level 1, then the rest

## Known rough edges

- The music has only been checked by metrics. Nobody has heard it yet.
- The bot opens gates and clears the log by flag. The Lucas shot and the Eleven push are covered by unit tests, not by a full run.
- The controller is checked with unit tests and a simulated Xbox pad in the browser, not with real hardware yet. Its buttons can't be rebound, there's no rumble, and a lost controller doesn't pause the game. Only the standard mapping is read.
- The autosave at Joyce's lights keeps levels, kills and story beats but not health, and the results screen only times the stretch since the last Continue.
- Keyboard rebinding is saved per browser. Arrow keys, Enter, Escape and Backspace are fixed so menus can't get stuck.
- Losing focus silences the game but doesn't pause it, so enemies keep moving while you're away.
- Skip story is on by default, so the level's tutorial lines never show unless the player turns it off. A controls strip covers the first nine seconds instead.
- Only four tag-in stingers exist (one per playable hero).
- Level 1 takes the bot 86 seconds. A person should need five to eight minutes.

## How to resume

1. Read `docs/technical-architecture.md` and `docs/level-1.md`.
2. Typecheck and run the tests (commands are in the architecture doc).
3. Checkpoints live in the session scratchpad: `checkpoint-spine`, `checkpoint-phase1`, `checkpoint-phase2`.

## Later (after feedback)

Chapter 1 stages 1.2 and 1.3, the Demogorgon, chapters 2 to 5, the other seven heroes, the map screen and shop, bonds, difficulty, the remaining tracks, docs polish.
