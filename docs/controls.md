# Controls

Every input the game reads, and the rules behind saving, story and sound. The README has the short version.

## Keyboard

| Input | Action |
| --- | --- |
| `W` `A` `S` `D` or arrows | Move |
| `Z` or `J` | Attack. Melee heroes chain three hits |
| `X` or `K` | Special. Costs MP |
| `C` and `V` | Back one hero and next hero. Swapping is near instant, so tap to cycle. The shockwave and invulnerability need 1.5 s since the last one |
| `1` to `4`, or click a portrait | Pick a hero |
| `Space` or `Enter` | Light Joyce's Christmas lights when they're in reach, otherwise Crit when the d20 in the top bar, labeled CRIT, is full. Also advances dialogue |
| `U` or `B` | Crit, even next to the lights |
| `Esc` or `P` | Pause and settings |
| `T` | Skip dialogue: the rest of the current script, the prologue, the chapter card |
| `M` | Mute |

## Changing keys

The table above is the defaults. Open CONTROLS from the options (the OPTIONS row on the title, or `P`) or the pause menu and every action shows its two key slots. Pick a slot with the arrow keys, press Enter, then press the new key. Backspace clears a slot, Escape cancels, and RESET ALL restores the defaults. A key that's already in use swaps places with the one you're replacing. ATTACK and SPECIAL always keep at least one key. The arrow keys, Enter and Esc always work and can't be rebound, so a menu can never get stuck. Your keys are saved, and every hint on screen follows them: the HUD's hero numbers, the controls in the corner of the level, the skip prompt and the tutorial lines. The title shows no key hints at all. The gamepad layout is listed there too but can't be changed yet.

## Controller

An Xbox controller plays the whole game, menus included. Plug it in or pair it, then press any button once. Browsers hide a controller until it's touched, and `CONTROLLER CONNECTED` shows across the top when the game sees it.

| Button | Action |
| --- | --- |
| Left stick or D-pad | Move. A light tilt walks slower |
| `A` | Attack, talk, light Joyce's lights, confirm |
| `X` | Special. Opens the options on the title |
| `B` | Back |
| `Y` | Crit |
| `LB` `RB` | Swap hero |
| `RT` | Attack, same as `A` |
| `Start` | Pause. Begins the game on the title |
| `View` | Skip dialogue |

Hints switch to button names once you touch the controller, and back to keys when you press one. A controller has no direct hero pick, so the tutorial lines leave that out. A button press doesn't always count as a click, so the browser may keep the sound off until you click the game once. The title says so when that happens. The game reads the standard gamepad layout, which is what an Xbox controller reports. A pad that reports something else isn't supported.

## Touch

On a phone or tablet the controls are on screen. In portrait the game sits at the top with the controls under it. In landscape the game sits in the middle with the stick on the left and the buttons on the right. The controls never cover the game.

| Control | Action |
| --- | --- |
| Stick (left thumb, anywhere in the lower left) | Move and step through menus. The ring stays put and the knob follows your thumb. A short push is full speed |
| `A` | Attack, talk, light Joyce's lights, confirm |
| `B` | Special. Back in menus |
| Arrows | Back one hero and next hero |
| A bench face in the HUD | Pick that hero |
| d20 | Crit. It lights up gold when the meter is full |
| Pause | Pause. Begins the game on the title |
| Skip | Skip dialogue. It lights up only while there's something to skip |

Hints name the on-screen buttons while you play by touch. A key or controller press hides the touch controls and puts the keyboard or controller hints back, and the next touch brings them back. Sound starts on your first tap. CONTROLS isn't in the options on a touch screen, since there are no keys to change. Add `?touch=1` to the URL to try the touch controls with a mouse.

## Mouse

Every menu works with a mouse. The row under the pointer takes the selection, and a click picks it. Click a volume bar to set it, and click its top lit segment to turn it down one. A click anywhere moves through dialogue, the chapter card and the results screen, the same as Enter. A click on SKIP above the dialogue box skips like `T`, and a click on the title's SKIP STORY line flips it. In CONTROLS, click a key slot to rebind it, scroll with the wheel or the arrows, and click anywhere to cancel. The pointer turns into a hand over anything you can click. Hover is mouse only: a tap on a touch screen still clicks, but nothing lights up under a finger.

## Story

Dialogue is off by default. The title reads `SKIP STORY: ON`, so start goes straight into the level and no dialogue box, prologue or chapter card shows. Press `T` on the title screen to turn it off and play the story. The same switch is in the options (`P` on the title) and the pause menu, and it's saved. The attack, special and swap controls sit in the bottom left corner of the level, and fade to a muted grey once the party walks away from the starting yard, so you aren't guessing. Crit isn't listed there: once the d20 is full, PRESS SPACE FOR CRIT shows just under the HUD, with no box behind it, until it's used, except next to the lights, where Space lights them instead. Every script still does what it does, so Eleven still joins and the gate still opens.

## Saving

The game saves by itself each time you light Joyce's Christmas lights, and `SAVED` shows over them. Reload or quit and the title offers CONTINUE, which puts the party back at the last lit lights with its levels, XP, d20 bonuses, kills, opened gates and story beats. Health comes back full, the same as a retry. NEW GAME on the title and START OVER in the pause menu both wipe the save (press twice to confirm). START OVER restarts the level straight away with the party it started that level with, and NEW GAME plays the prologue unless skip story is on. Clearing Level 1 saves a fresh start at the Lab door with your levels, XP and d20 bonuses, so CONTINUE picks up there. Clearing Level 2 clears the save. It's one save per browser, and `?bot`, `?god`, `?level` and `?party` runs never touch it.

## Sound

The game goes silent whenever the page isn't focused: another window, another tab, or the chat next to the pane. It comes back when you click the game. The `M` mute sits on top of that and survives it.

## Puzzles and the Lab

Eleven joins at the shed. Lucas can shoot the lantern across the creek to open the gate, and only Eleven can push the log off the trail. In the Lab each of three gates needs a different hero: Dustin burns a sensor, Lucas shoots a relay through the glass, and Eleven pushes a crate. Anyone who crosses the sparking floor to stand right at the sensor can smash it with a basic attack instead.

Try a gate, door, log or crate with the wrong hero, by swinging at it or walking into it, and the game says so at once: a yellow caret bobs over the puzzle and a subtitle names who to try (MAYBE ELEVEN SHOULD TRY HER SHOVE), and the right hero's portrait lights up. A party that just stands there gets the same after five seconds.

The Lab is the hard level. Riot guards stop hits from the front, so go around them, burn them or shove them. Elite agents hit harder. Security cameras sweep the corridors, and one that sees you lets reinforcements in, unless Lucas shoots it first or someone gets right under it and smashes it. Electric panels and steam vents fire on a cycle, with a warning before each. The Warden waits at the end. Every enemy in the Lab is 30 percent tougher than the difficulty setting makes it, and the party levels up faster to match.

## Level-ups

Every level-up rolls a d20. The roll sets the bonus stat points, a 20 is a full heal and a team buff, and a 1 gives the next roll advantage. Nothing can make a hero worse. The active hero earns full XP and the bench earns half, so rotating gets everyone to Lv 3.

| Hero | Basic | Special | Level 3 talent |
| --- | --- | --- | --- |
| Mike | Bat, three-hit arc | DM screen: blocks shots, halves damage behind it | DM fiat: the first hit of a fight crits |
| Dustin | Candy lure: enemies chase it, then it pops | Farrah spray: a burning cone | Compass: more quarters drop |
| Lucas | Wrist rocket, eight ways | Triple shot | Sharp eye: more crits |
| Eleven | Push: a shove that clears logs | Mind Blast: a piercing beam | Flip: Push hits harder |
