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
| `Space` or `Enter` | Light Joyce's Christmas lights or play an arcade cabinet when one is in reach, otherwise Crit when the d20 in the top bar, labeled CRIT, is full. Also advances dialogue |
| `U` or `B` | Crit, even next to the lights |
| `Esc` or `P` | Pause, settings and the character sheet |
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

If the controller you're playing with is unplugged or drops its connection mid-stage, the level pauses and the hints go back to keys (see Pausing by itself). Hints switch to button names once you touch the controller, and back to keys when you press one. A controller has no direct hero pick, so the tutorial lines leave that out. A button press doesn't always count as a click, so the browser may keep the sound off until you click the game once. The title says so when that happens. The game reads the standard gamepad layout, which is what an Xbox controller reports. A pad that reports something else isn't supported.

## Touch

On a phone or tablet the screen is dressed as the original grey Game Boy, with the game in its bezel. When the phone is in dark mode it's the black Game Boy instead, and it changes over as soon as the phone does. In portrait it's the Game Boy as it is. In landscape the same parts are laid out wide, like a Game Boy Advance: the D-pad, SELECT and START on the left, the face buttons on the right. The controls never cover the game.

| Control | Action |
| --- | --- |
| D-pad | Move and step through menus. Each arm is a button. Slide your thumb and it steers like a stick, and a thumb anywhere left of the buttons grabs it |
| `A` | Attack, talk, light Joyce's lights, confirm |
| `B` | Special. Back in menus |
| `SWAP`, the grey key over B | Next hero |
| A bench face in the HUD | Pick that hero |
| The hero's name and level in the HUD | Character sheet |
| `CRIT`, the d20 key over A | Crit. It lights up gold when the meter is full |
| `SELECT` | Skip dialogue. Flips SKIP STORY on the title |
| `START` | Pause. Begins the game on the title |

Hints name the Game Boy's buttons while you play by touch. A key or controller press hides the shell and puts the keyboard or controller hints back, and the next touch brings it back. Sound starts on your first tap. Phones that can buzz give a short one on each press. CONTROLS isn't in the options on a touch screen, since there are no keys to change. GAME BOY is there instead: AUTO follows the phone, and LIGHT or DARK keeps that shell whatever the phone says. Add `?touch=1` to the URL to try the touch controls with a mouse.

## Mouse

Every menu works with a mouse. The row under the pointer takes the selection, and a click picks it. A click on the active hero's name and level in the HUD opens the character sheet, and they underline under the pointer. Click a volume bar to set it, and click its top lit segment to turn it down one. A click anywhere moves through dialogue, the chapter card and the results screen, the same as Enter. A click on SKIP above the dialogue box skips like `T`, and a click on the title's SKIP STORY line flips it. In CONTROLS, click a key slot to rebind it, scroll with the wheel or the arrows, and click anywhere to cancel. The pointer turns into a hand over anything you can click. Hover is mouse only: a tap on a touch screen still clicks, but nothing lights up under a finger.

## Character sheet

Click or tap the active hero's name and level in the HUD, or pick CHARACTERS in the pause menu. Each hero gets a page with their class, level, XP, HP, MP, ATK, DEF, SPD and crit chance, and a line for every move: the basic, the special and its MP cost, their hit in a Crit, and the Lv 3 talent. A stat the d20 has raised shows the bonus in green. Damage is one hit against a foe with no armor, before crits and Inspiration, and `x3` means the move lands up to three hits. The heroes are tabs across the top. The arrows, `C` and `V`, a controller's LB and RB, or a click on a face switch between them, and `1` to `4` pick a hero by party slot, the same as in the HUD. `Esc`, a controller's B or BACK closes it, back to the level from the HUD and back to the menu from the pause menu. The level stays frozen while it's open. A hero who isn't in the party shows in grey, at Lv 1.

## Story

Dialogue is off by default. The title reads `SKIP STORY: ON`, so start goes straight into the level and no dialogue box, prologue or chapter card shows. Press `T` on the title screen to turn it off and play the story. The same switch is in the options (`P` on the title) and the pause menu, and it's saved. The attack, special and swap controls sit in the bottom left corner of the level, and fade to a muted grey once the party walks away from the starting yard, so you aren't guessing. Crit isn't listed there: once the d20 is full, PRESS SPACE FOR CRIT shows just under the HUD, with no box behind it, until it's used, except next to the lights or a cabinet, where Space uses them instead. Every script still does what it does, so Eleven still joins and the gate still opens.

## The arcade

Every cabinet in the Palace (stage 2.1) plays. Walk up to one and its key and title show over it, such as `SPACE: GALAGA`. Space, Enter or a controller's A opens it, and the level waits underneath. Play is free.

| Input | In a cabinet |
| --- | --- |
| Stick, arrows or `W` `A` `S` `D` | Move. Dragon's Lair has no free movement: tap the arrow that flashes, inside the time bar |
| `Space`, `Enter`, `Z` or `J`; A on a controller | Start, fire, pump the harpoon in Dig Dug, swing the sword in Dragon's Lair |
| `Esc`, `P`, `X` or `K`; B on a controller | Pause the run. Press it again to leave. A run you leave isn't posted |

A finished run goes on that game's high-score board under the name of the hero at the cabinet. The boards are saved in the browser. Beat MADMAX's Dig Dug score and your name takes the top of her board, the cabinet in the Palace scrolls it from then on, Max has a word for you, and the party gets 25 XP and five quarters, once a visit.

## Saving

The game saves by itself each time you light Joyce's Christmas lights, and `SAVED` shows over them. Reload or quit and the title offers CONTINUE, which puts the party back at the last lit lights with its levels, XP, d20 bonuses, kills, opened gates and story beats. Health comes back full, the same as a retry. NEW GAME on the title wipes the save and the progress on the Hawkins map, and plays the prologue unless skip story is on. START OVER in the pause menu restarts the level straight away with the party it started that level with (the last picks and each hero's best level, when the save is from mid-stage). On the first stage it clears the save, and on any later stage it writes a fresh save at the stage's first moment. Both ask you to press twice. Clearing any stage records it on the map and clears the stage save, so CONTINUE opens the map until you light the lights in the next stage. It's one save per browser, and `?bot`, `?god`, `?level` and `?party` runs never touch it. A `?stage=` jump isn't one of those: it reads and writes the real save and map progress.

## Pausing by itself

The level pauses on its own when you're pulled away from it, so nothing hits a party nobody is steering. The pause menu opens when the window loses focus (another window, the browser's address bar, the chat next to the pane), when the tab is hidden, and when the controller you were playing with disconnects. The same goes for a cabinet run in the Palace, which holds as it does with `Esc`. Resume the usual way: `Esc`, `P`, `Start` or `B`, or pick RESUME. It happens only while something is moving. On the title, the map, the menus, the results and over dialogue and the character sheet nothing moves, so nothing opens. A controller that drops while the keyboard or the touch screen is in your hands, or one of two controllers, only shows `CONTROLLER LOST` and doesn't pause. A `?bot=1` run is never paused, so a background tab still plays itself out.

## Sound

The game goes silent whenever the page isn't focused: another window, another tab, or the chat next to the pane. It comes back when you click the game. The `M` mute sits on top of that and survives it.

## Puzzles and the Lab

Eleven joins at the shed. Lucas can shoot the lantern across the creek to open the gate, and only Eleven can push the log off the trail. In the Lab each of three gates needs a different hero: Dustin burns a sensor, Lucas shoots a relay through the glass, and Eleven pushes a crate. Anyone who crosses the sparking floor to stand right at the sensor can smash it with a basic attack instead.

Try a gate, door, log or crate with the wrong hero, by swinging at it or walking into it, and the game says so at once: a yellow caret bobs over the puzzle and a subtitle names who to try (MAYBE ELEVEN SHOULD TRY HER SHOVE), and the right hero's portrait lights up. A party that just stands there gets the same after five seconds.

The Lab is the hard level. Riot guards stop hits from the front, so go around them, burn them or shove them. Elite agents hit harder. Security cameras sweep the corridors, and one that sees you lets reinforcements in, unless Lucas shoots it first or someone gets right under it and smashes it. Electric panels and steam vents fire on a cycle, with a warning before each. When a camera spots the party or the lockdown starts, the klaxon sounds and a red glow comes up along the edge of the screen: it fades in, breathes once every two and a half seconds for about five seconds, and fades out. With REDUCE FLASH on it doesn't breathe, it holds one steady dim glow. The Warden waits at the end. Every enemy in the Lab is 30 percent tougher than the difficulty setting makes it, and the party levels up faster to match.

## Level-ups

Every level-up rolls a d20. The roll sets the bonus stat points, a 20 is a full heal and a team buff, and a 1 gives the next roll advantage. Nothing can make a hero worse. The active hero earns full XP and the bench earns half, so rotating gets everyone to Lv 3.

| Hero | Basic | Special | Level 3 talent |
| --- | --- | --- | --- |
| Mike | Bat, three-hit arc | DM screen: blocks shots, halves damage behind it | DM fiat: the first hit of a fight crits |
| Dustin | Candy lure: enemies chase it, then it pops | Farrah spray: a burning cone | Compass: more quarters drop |
| Lucas | Wrist rocket, eight ways | Triple shot | Sharp eye: more crits |
| Eleven | Push: a shove that clears logs | Mind Blast: a piercing beam | Flip: Push hits harder |
