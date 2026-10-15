# QA pass: title to 2.3 with saves (2026-10-15)

A browser pass over main at 352622f, on a dev server on port 5191, every URL with `?mute=1`. Nobody had played the whole run with saves before. Two bugs turned up that a unit test would not have caught, both in `flow.ts` and both fixed here. The rest is open or a note.

Status: **fixed** means the fix is in this branch and was checked in the browser. **open** means it is logged for whoever owns the file. QA-4, QA-6, QA-7 and QA-8 were fixed in a second pass, each reproduced first. QA-5 is with the session adding the difficulty row.

## Bugs

### QA-1 (fixed): START OVER after a mid-stage CONTINUE throws away the party picks

- Steps: finish 2.2, on the map open 2.3 and pick Dustin as lead with Max, Steve (locked) and Will. Light the Christmas lights at the mouth, reload, CONTINUE. Open the pause menu and pick START OVER twice.
- Expected: the level restarts with the party that walked in: Dustin leading, Max, Steve, Will.
- Happened: the level restarts with the stage's default party, Mike leading with Dustin, Max and Steve. Will is out, the picks are gone, and the save written at the stage start holds that default party. The levels came from the arrival table, not from the heroes' best levels.
- Cause: `flow.ts` set `entry = defaultParty(id)` when the save was from mid-stage.
- Fix: `entry` is now `partyFor(id, known(), progress?.picks)`, the party the map would give. A save from the stage's first moment still holds its own party. Checked: the same steps now give Dustin, Max, Steve and Will at their levels.
- URL: `http://127.0.0.1:5191/?mute=1&dev=1` (CONTINUE from the title).

### QA-2 (fixed): START OVER writes a save the loader rejects, so CONTINUE disappears

- Steps: open 2.1 or 2.2 through the map or `?stage=2.1`, pause, START OVER twice, quit to the title.
- Expected: the title offers CONTINUE and puts the party back at the start of the stage.
- Happened: the title shows PRESS START as if there were no save. `localStorage` holds the save, but `parseSave` returns null for it, so `hasSave()` is false. The new hero (Will in 2.1, Max and Steve in 2.2) is stored as `{"id":"will","level":2}` with no `xp`, and `parseHero` refuses a hero without a numeric `xp`. One bad hero voids the whole save.
- Cause: `entrySave` in `flow.ts` wrote the seeds as they are, and a hero nobody has met has no `xp` in the seed. The sim reads a missing level as 1 and a missing XP as 0.
- Fix: `entrySave` fills in `level ?? 1` and `xp ?? 0`, and is exported. `tests/flow-save.test.ts` checks that the entry save reads back for every stage, built from `defaultParty` and from `partyFor`. Checked in the browser: Will saves with `xp: 0` and `hasSave()` is true.
- Not fixed, for `core/save.ts` to decide: `parseHero` could treat a missing `xp` as 0 instead of dropping the whole save. A single bad hero losing a save is harsh.
- URL: `http://127.0.0.1:5191/?mute=1&dev=1&rush=1&stage=2.1`.

### QA-3 (fixed, docs): the Saving paragraph in `docs/controls.md` described the old flow

- It said clearing Level 1 saves a fresh start at the Lab door and clearing Level 2 clears the save. The game now records every clear on the map and clears the stage save, and CONTINUE opens the map. START OVER also did not "wipe the save" on every stage. The paragraph is rewritten.

### QA-4 (fixed): a `?stage=` jump in a normal run writes the real progress

- Steps: with empty storage, open `?mute=1&rush=1&stage=2.2`, clear the stage (or let `?bot` start it as a hybrid, see Method), press Continue on the results.
- Expected: per the comment in `flow.ts`, a jump counts the stages before it as cleared, so the map looks like a real run's, or it stays a debug run and writes nothing.
- Happened: only the real-storage path runs, since `savingAllowed()` (in `core/save.ts`) knows `?bot`, `?god`, `?level` and `?party` but not `?stage`. `progress.cleared` is just `["2.2"]` and the heroes are Mike, Dustin, Max and Steve. The map shows 2.2 cleared and 1.2 and 1.3 still locked, with 1.1 selected. With an existing real game the jump marks a stage cleared and moves the heroes' levels, in the player's own save.
- Reproduced again on a seeded save (1.1 cleared, Mike at Lv 3, 5 quarters): after clearing the jumped 2.2 the stored progress was `cleared: ["2.2"]` with a different party and no purse.
- Fix: `savingAllowed()` is false for a jump past the first stage (`isStageJump()` in `core/save.ts`; an unknown id is the first stage, as `flow.ts` reads it), so a jump never writes the save or the progress. `flow.ts` keeps the jump's progress in memory, built by `debugProgress(jump)` with the stages before it cleared, and NEW GAME starts from that again instead of from nothing. `tests/save.test.ts` and `tests/flow-save.test.ts` cover the rule and that storage is untouched.
- Checked in the browser: the same seeded save is byte for byte the same after the jumped stage is cleared and Continue is pressed, and the map shows 1.1 to 2.2 cleared with 2.3 next.
- A jump's title still offers CONTINUE for a real save in the browser, and it reads it. It can't write it back.
- URL: `http://127.0.0.1:5196/?mute=1&rush=1&stage=2.2`.

### QA-5 (open, minor): the options have no difficulty row

- `docs/game-design.md` lists difficulty among the settings, and `settings.difficulty` exists and is saved (`chief`), but neither the title options, the pause menu nor the touch menu has a row for it. The same file lists "difficulty levels" under things that are out until played, so this may be intended. Worth a one-line decision.

### QA-6 (fixed): in CONTROLS, Backspace leaves the screen when browsing

- Steps: title, OPTIONS, CONTROLS, move to ATTACK, press Backspace.
- Expected: the slot is cleared (`docs/controls.md` says Backspace clears a slot).
- Happened: Backspace is bound to `cancel`, so on a row it goes back to the options. It only clears a slot after Enter has started listening for a key. The screen's own hint line says ENTER REBINDS, so nothing points at the Enter-then-Backspace order.
- Fix: `createInput` gained `keyPressed(code)`, true for the tick after that physical key went down, since Backspace and Esc are both `cancel` and an action can't tell them apart. On a row of keys on the keyboard page, Backspace or Delete now clears the picked slot while browsing, as they do while listening, and Esc still goes back. On RESET ALL, GAMEPAD, BACK and the controller page Backspace still goes back. A line under the hint reads BKSP CLEARS THIS SLOT. `tests/controls-keys.test.ts` drives the real screen with key events, and `tests/input.test.ts` covers `keyPressed`.
- Checked in the browser: Backspace on ATTACK key 1 gave `Z CLEARED FROM ATTACK`, the screen stayed, `localStorage` held `[null, "KeyJ"]`, and Esc then went back to the options.
- URL: `http://127.0.0.1:5196/?mute=1`.

### QA-7 (fixed): the pause menu cannot be opened over a dialogue box

- Steps: start 1.1 with skip story off, and press Esc while Joyce's opening lines are up.
- Happened: nothing opened. Esc, Start and the pause key only worked once the box was closed, which put QUIT and START OVER out of reach for a few seconds at the start of every stage.
- Decision: the pause key opens the menu over a box. Losing focus still doesn't, since nothing moves under a box, so a blur is not held or queued.
- Fix: in `world/play.ts` the pause check now runs before the dialogue branch, and the focus and controller-loss signal is ignored while a box is up. The box is not updated while the menu is open, so its text waits and it is still there on resume. `tests/pause-focus.test.ts` covers Esc over a box, the box surviving, the skip key still closing it, and a blur doing nothing.
- Checked in the browser: Esc over Joyce's first line opened PAUSED with the box under it, Esc resumed with the box still up, and T skipped it.
- URL: `http://127.0.0.1:5196/?mute=1&skip=1&dev=1`, with skip story off.

### QA-8 (fixed, ui/picks): a fifth pick gives no sign

- Steps: on the 2.2 picks panel with 4 OF 4, move to Lucas and press Z.
- Expected: some answer. Happened: nothing on screen changes. The refusal sound was the same `cancel` fall that Esc makes.
- Fix: a pick the rules refuse now makes the low `noMp` buzz and flashes the cards in the way, in the `hot` red the counter already uses for a short party. A fifth hero flashes the four party cards and the `4 OF 4` counter, and taking out a locked hero flashes that hero's card alone. Three blinks over 24 frames, or one steady stretch with REDUCE FLASH on. `blockedBy()` in `ui/picks_logic.ts` names the cards, and `tests/picks.test.ts` checks that it names some exactly when `toggle` refuses.
- Checked in the browser, with the game clock slowed (see Method): Z on Will at 4 OF 4 turned Mike, Dustin, Max and Steve and the counter red while Will's card stayed as it was, Z on Max flashed his card alone, and both settled back in a moment. Nothing changed in the party.
- URL: `http://127.0.0.1:5196/?mute=1&dev=1` with a save that has 1.1 to 2.1 cleared, CONTINUE, then open 2.2.

### QA-9 (note): the page opens paused when the window isn't focused

- Opening `?rush=1` or `?skip=1` in the browser pane while the pane doesn't have focus starts the stage with the pause menu already up, at frame 0. That is the pause-when-pulled-away rule working. It only matters for anyone who scripts the game.

## Covered and working

Everything here was played or driven in the browser. I read the console after most steps, not every one, and it never showed an error or a warning.

- **Title, prologue, 1.1.** PRESS START, SKIP STORY flip with T, the prologue (Enter through all of it, and T to skip), the chapter one card, 1.1 with Joyce's opening lines.
- **Saves.** Lighting the lights writes the save (`SAVED` shows, party and open props in `localStorage`). A lit light can't be lit twice. CONTINUE mid-stage puts the party at the lights. CONTINUE with progress and no stage save opens the map. START OVER on 1.1 clears the save, and the confirm needs two presses (a move resets it). NEW GAME needs two presses, wipes save and progress, and a move in between resets it. QUIT needs two presses.
- **Results and map.** The results screen for every stage, `END OF LEVEL 6 / THIS IS A FEEDBACK BUILD` for the last one, the map with each stage's check, the chapter two header, the replay of a cleared stage (1.1 with Mike at his best level), the unlock order.
- **Chapter cards.** `CHAPTER ONE / THE VANISHING`, `CHAPTER TWO / THE TUNNELS` on the first visit to 2.1, `LEVEL FIVE / THE TUNNELS` and `LEVEL SIX / THE GATE` on the others.
- **Stages through 2.3.** Every stage was cleared by the bot with saves on, and 1.1 (start), 2.1 (cabinets), 2.2 and 2.3 (picks, lights, START OVER) were also played by key presses.
- **Party picks on 2.2 and 2.3.** Lead (X), toggle (Z), the 4-of-4 cap, Max locked on 2.2 and Steve locked on 2.3, the order kept in `progress.picks` and in the save, the pick carried into the stage. Esc backs out. See QA-8.
- **Palace cabinets.** Galaga, Pac-Man, Centipede, Dragon's Lair, Ms. Pac-Man and Dig Dug all open from the prompt and run. Esc pauses and a second Esc leaves, and the level waits and resumes.
- **New pauses.** A `blur` and a hidden tab pause the level and a cabinet run, and a second `blur` while paused does not stack a menu. The title, the results and the map open nothing, and neither does a dialogue for a blur, and a pause is not queued behind a dialogue. The pause key itself does open over a dialogue since QA-7. Both worked with the simulated events described in Method.
- **Controller.** A fake standard pad: CONTROLLER CONNECTED and LOST toasts, the hints switching to `A ATTACK / X SPECIAL / LB RB SWAP` and back to keys, stick walking, RB swapping, Start pausing and resuming, B resuming, View skipping the prologue and the card, the title and pause menus from the D-pad and A. Dropping the pad in a level or a cabinet pauses. Dropping it while the keyboard was last used, or one of two pads, only shows CONTROLLER LOST.
- **Options.** MUSIC, SFX, SCANLINES, SHAKE (all four steps), REDUCE FLASH and SKIP STORY all change and save. CONTROLS opens: rebinding, the swap of a key that is in use and RESET ALL work, and Esc cancels a listen. A mouse click picks OPTIONS on the title.
- **Phone size.** 375 by 812 and 812 by 375, light and dark, with synthetic touch pointers. The grey and black Game Boy shells, AUTO following the phone mode (also mid-game), the GAME BOY row cycling AUTO, LIGHT and DARK and saving, the same row in the pause menu, D-pad walking, A, B, SELECT skipping dialogue, START pausing and opening the options row, the hints naming SELECT, a key press hiding the shell and bringing the keys back, a touch bringing it back, and the landscape layout.
- **Lab klaxon.** The red edge glow shows when the first camera spots the party in 1.2.

## Not reached

- The Dig Dug prize (beat MADMAX for 25 XP, five quarters and Max's line) needs a high score that a script can't make. The six cabinets themselves ran.
- Stages 2.2 and 2.3 were cleared by the bot, not by hand. No one has felt the 2.3 defense or the Warden in this pass.
- A real hidden tab, a real controller, a real phone and the sound. The pauses and the controller were driven with the page's own events and a fake `navigator.getGamepads`, the touch controls with pointer events typed `touch`, and everything ran muted.
- The mouse on the map, the picks panel and the results (the title and its options were clicked).

## Method

Notes for the next pass.

- `.claude/launch.json` has a `qa-pass` entry for port 5191. It is not part of the commit, since other branches add their own entries.
- A helper pasted into the page drives the game: it dispatches `KeyboardEvent`s on `window` (`code: 'Enter'`, a 60 ms hold) and reads the dev panel (`?dev=1`) for the tile, the beats, `busy` and the frame. A touch press needs a hold of 100 ms or more, or the tick misses it.
- Speed: wrap `requestAnimationFrame` to scale the timestamp. The loop catches up 5 ticks a frame at most, so about 4x works.
- The bot with saves on: `?bot` never saves. Start with a normal URL (`?rush=1&stage=N`), set `__ud.g.flags.bot = true`, do START OVER from the pause menu, then set it back to false. The new play scene makes the bot at enter and keeps it, and the saves and progress stay on. START OVER writes no entry save while the flag is true, so do not use this trick when that is the thing under test.
- `await import('/src/core/save.ts')` in the page gives the same module the game uses, which is how `hasSave()` showed QA-2.
- The browser pane only runs `requestAnimationFrame` while it is visible. With it hidden the loop stalls at frame 0 and key presses queue and fire together later, which looked like dropped Enters and wrong menu rows. `tabs_select` or a screenshot wakes it. Check that `__ud.g.frame` is moving before a sequence.
- To catch something that lasts a few frames, slow the game clock: `const o = requestAnimationFrame.bind(window), b = performance.now(); requestAnimationFrame = (cb) => o((t) => cb(b + (t - b) / 10))`. Ticks then run at a tenth of the speed, so a 24 frame flash lasts four seconds.
- `javascript_tool` gives up after 45 s, so long waits go in chunks. A script that times out keeps running in the page.
