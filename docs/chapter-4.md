# Chapter 4: Hellfire, 1986 (DRAFT)

**Draft.** This is pre-production: the stages, who plays them, the bosses, the hooks and the looks the owner picked. Nothing here is built. Every number is a placeholder until chapter 3 lands, because its results set them: the party's levels coming out of 3.3, Erica's shop and its prices, and how the purse and stash carry. Each stage gets its own spec (`docs/level-10.md` to `docs/level-13.md`) when the build starts.

Chapter 4 is spring 1986. Hopper is alive in a Soviet prison in Kamchatka. In Hawkins, Eddie Munson runs the Hellfire Club, a curse is killing kids one chime at a time, and the way to stop it runs through the Creel House and the Upside Down. The chapter opens with Hopper alone, gives the party Eddie for two stages, takes him away on a rooftop, and ends in Vecna's lair.

## Stages

| # | Stage | Who plays | What happens | Ends with | Music |
|---|---|---|---|---|---|
| 4.1 | Kamchatka | Hopper alone. No swaps, one hero on the HUD | The snow yard inside the wire, then the prison block: guards, cells, the cold. Joyce's lights are a care package from home. Look: Blizzard | The Demogorgon pit (mini-boss) | `mirkwood`, with snow slowing it; `clock` in the pit |
| 4.2 | The Hellfire Club and the Creel House | A party of four picked on the map. Eddie joins at the start | Eddie's recruit scene in the Hellfire Club. Max gets her Walkman back in a story beat. Across town to the Creel House: haunted mirrors, Creel ghouls, and the scripted beat that teaches the clock curse. Look: Abandoned, with Blood red for the memories | Getting out of the Creel House | `hawkins` |
| 4.3 | Upside Down Hawkins | Picked on the map, Eddie locked in (mirrors on the route) | Hawkins upside down: streets, the trailer park, demobats. Grandfather clocks chime and curse a hero as a stage hazard. Look: Blue storm | The rooftop solo: a whole song on the note highway while the demobats come. Eddie falls, for good | `upside`, then the solo's own track |
| 4.4 | Vecna's lair | Picked on the map. No Eddie | The Creel House in the Upside Down, then the attic. Look: the Creel House's Upside Down skin | Vecna, three phases | `clock` |

- **4.1 is a solo opener.** Hopper has no one to swap to, so the stage is built round his kit: haymaker, ground slam, the Wind-up and Berserk talents if his level has them. Gates on the route are ones he can open himself (smash). He comes back at the party's average level minus one, the recruit rule, unless chapter 3 changes how Hopper is carried.
- **Eddie is playable in 4.2 and 4.3 only.** He falls on the 4.3 rooftop as he does in the show, and he is not in chapter 5. A replay of 4.2 or 4.3 brings him back for that run (`partyFor`), the way a chapter 1 replay brings Eleven. His mirrors appear only in 4.2 and 4.3, and chapter 5 must not need a riff.
- **The party.** 4.2 to 4.4 pick four from everyone the save has, as chapter 3 does. Who is locked in where is set by the gates on each route: Eddie in 4.3 (mirrors), Max nowhere (the Walkman helps but is never required).

## Eddie

| | |
|---|---|
| Class | Warlock |
| Basic | Flying V swing: a wide arc with the guitar swung like an axe, and a small sound ring where it lands |
| Special | Hellfire solo (9 MP): he plants his feet and plays for 6 s on the note highway (below). Each note he hits crits and widens the ring, which damages everything in it and stuns flyers |
| Talents | Lv 3 Metalhead (+10% ATK) / Lv 6 Hellfire DM (marks boss weak points) / Lv 9 Encore (the solo repeats once) |
| Opens | `riff`: haunted mirrors |
| Bond | Hellfire (Eddie + Dustin): the solo lasts 2 s longer |
| Voice | Theatrical, nervous underneath. "Welcome to the Hellfire Club, freaks." Pulse blip with vibrato |
| Look | **Hellfire Club** (owner's pick, `eddie-variations.html`): the club's raglan tee, white with black sleeves and the red demon on the chest, black jeans, long dark curls, a red Flying V slung on his back. Five fill colors: skin, brown, white, black, red. Portrait on a dark red ground, with a tongue-out grin for the happy face |

He joins at the party's average level minus one. The recruit scene is in the Hellfire Club, mid-campaign, which is the chapter's nod to the basement in the prologue.

### The Hellfire solo as a note highway

The owner's call: the solo plays as a retro Guitar Hero. While Eddie plays, a note highway shows and notes come down it to a strum line. A note hit on time crits (the NAT 20 floater over what the ring hits) and widens the ring; a miss shrinks it. A streak counter keeps count beside the highway. The 4.3 rooftop is the same highway for a whole song, with the demobats as the pressure.

- **Layout: The neck** (owner's pick, `solo-variations.html`). The highway is the neck of his Flying V, coming out from under him toward the player in perspective: dark wood, fret wires that scroll, inlay dots, three lanes. Notes start small at the far end and grow as they come, and hit three strum targets on a bone line near the bottom of the screen. The streak counter sits to the left of the neck, HIT over the struck target.
- **Lanes and inputs.** Three lanes on Attack, Special and Crit (keys Z, X, Space; pad A, X, Y; touch A, B and the d20), colored like the HUD: Attack red, Special blue like the MP bar, Crit gold like the d20. Eddie is planted while he plays, so movement does nothing during the solo; a rebinding of the three actions moves the lanes with it.
- **The chart comes from the music.** The sequencer schedules one bar at a time, so the solo's notes can be read off the same bar the audio plays, and the highway is always in time with what you hear. The solo's track is original, like everything else (no borrowed songs).
- **The timing window is forgiving** (the owner's call). A note struck within 6 frames of its beat (100 ms at 60 fps) is a hit, within 2 frames (33 ms) a perfect. Touch and wireless pads add lag, so the window leans wide, and a perfect still takes timing.
- **What a miss costs.** A miss shrinks the ring a step and resets the streak. Three misses in a row cut the solo short with a squeal of feedback, and the 9 MP is spent. On the 4.3 rooftop each miss also lets a demobat through to dive at the party, so the song's misses are its damage.
- **Open:** how many notes a 6 s solo has, and how the bot plays it for the tests.

### Haunted mirrors (the riff gate)

The Creel ghouls (4.2) step out of mirrors in the dark. A mirror is a gate: the riff shatters it, which stops its ghouls and opens the way or the cache behind it. Mirrors are on the 4.2 and 4.3 routes and nowhere after.

## The looks of the places

- **Kamchatka (4.1): Blizzard.** Deep blue night snow, a sodium amber floodlight in the yard, grey panel concrete inside the block. The light leads the eye to the doorway.
- **The Creel House: one tile set, three skins, one per time.** The owner's call: Abandoned is the house now, Upside Down is the house in the Upside Down, and Blood red is the house in memory. They share the room letters, the mirrors, the clock and the props, and differ only in paint, the way a night stage repaints its tiles, so the build paints the house once.
  - **Abandoned (1986)** is 4.2: peeling blue-grey paper over lath, boarded windows with moonlight through the gaps, dusty boards and rubble, a moth-eaten rug. The mirrors here are Eddie's gate.
  - **Upside Down** is 4.4, Vecna's lair: the same rooms rotted and overgrown, red veins across the floor, a window flashing red, spores.
  - **Blood red** is the house in 1959, in Vecna's memory: deep red damask, near-black wood, candlelight. It's used for memory scenes, not a stage of its own. The 4.2 beat that teaches the curse turns the room Blood red while the four chimes count, and back to Abandoned when the curse is broken, so the curse shows as a place; Victor Creel's story (the flashback to the family's last night) plays in it; and Vecna's speeches between his phases in 4.4 cut to it. **Only that beat turns the room** (the owner's call): later curses in 4.3 and 4.4 show on the cursed hero alone, so Blue storm and the lair stay readable.
- **Upside Down Hawkins (4.3): Blue storm**, the owner's mix of Blue night and Red storm (`src/gfx/var/hawkinsud_mix.ts`, image `docs/screenshots/ch4-hawkinsud-mix.png`). Blue night between bolts: blue black roofs, lawns and road, red veins, pale spores, and rain, so the asphalt holds dim red reflections. Every 6 to 10 s a bolt floods the lit edges (roof lips, curb tops, slab bevels, door frames) red and the wet road streaks bright, then it fades back to blue over a step. The night pass leaves reds alone, so the flash reads on the dark. To fix on the build: the house fronts read as flat bands, and the car is small at 1x.

## The clock curse

It builds over the chapter.

1. **Taught in 4.2.** A scripted beat in the Creel House: a grandfather clock chimes, one hero is cursed, and the party learns the two ways out. No random curse in 4.2 after that.
2. **A hazard in 4.3.** Grandfather clocks stand in Upside Down Hawkins. When one chimes, a hero in the party is cursed.
3. **Full speed in 4.4.** In the Vecna fight the clock chimes on its own, and twice as fast in his last phase.

**What a curse does.** A clock appears over the cursed hero with four chime pips under it. The hero rises off the floor as the chimes count down, as in the show. On the fourth chime they are KO'd and drop out like any KO, and the next light brings them back. A benched hero can be cursed too, so swapping away does not save them.

**The ways out.** Max's Walkman (below), anywhere. The marked memory orb, in the Vecna fight. **In 4.3, the clock that chimed** (the owner's call): it becomes a target until the fourth chime. Eddie's riff shatters it at once, and since he is locked in for 4.3 every party has him; any hero can also break it with a few hits. A broken clock lifts its curse and doesn't chime again.

**The look** of the clock mark follows the Vecna pick: Rooted's is a dark red rim, a bone face and red for the sounded chimes.

### Max's Walkman

A story item from 4.2, not her Lv 9 talent, since the pace puts Max near Lv 8 in chapter 4. Max gets her Walkman back in a 4.2 beat. With Max in the party, swapping to her plays it: 8 s in which the party ignores the curse, and any curse already counting is cleared. Then a 30 s cooldown (a placeholder until chapter 3's numbers land); in Vecna's Burn phase the clock chimes faster than that, so the orbs still matter.

**Max's talents, rearranged** (the owner's call). `docs/game-design.md` had High score (Lv 3), Walkman (Lv 6), Kickflip (Lv 9). With the Walkman a story item, Kickflip (the dash leaves a shockwave) moves up to Lv 6, and her new Lv 9 is **Extra life**: once per stage, a KO, a curse's included, leaves her at 1 HP with 2 s of invulnerability instead. The arcade's 1UP, and a nod to her outlasting Vecna once. `docs/game-design.md` still shows the old row until the build.

## Bosses

### The Demogorgon pit (4.1, mini-boss)

Hopper alone against a Demogorgon in a pit under the prison, with only his haymaker and ground slam. It uses the 1.3 Demogorgon's moves, sized for one hero: the charge that stuns it on the wall, the acid arcs from 60%, the leap onto shadow marks from 30%. Three stuns and a slam put it down. **It is the 1.3 sprite as it is** (the owner's call): the design doc's "smaller" means its HP and damage are sized for one hero, not a smaller frame, so all twelve poses carry over. Hopper's big body already narrows the gap between them. Look: **Mine shaft** (owner's pick, `pit-variations.html`): an old shaft under the camp, rough rock walls held up by timber, a plank barricade nailed over the beast's tunnel, a dirt floor with stains, bones, a drain and a chain, and lanterns on hooks for the only light.

### Vecna (4.4)

| Phase | From | What he does | How you answer |
|---|---|---|---|
| 1 Clock | 100% | Walks slowly behind his vines. The clock chimes and curses a hero. Memory orbs heal him | Break the orbs, the marked one first. Burn the vines. The Walkman |
| 2 Float | 60% | Rises out of melee reach and throws debris. The vines spread | Ranged heroes reach him: Lucas, Nancy, Eleven, Will. Breaking the orbs pulls him down |
| 3 Burn | 25% | On fire. The vine whips speed up and the clock chimes twice as fast | Keep a hero clear of the curse, finish him |

Look: **Rooted** (owner's pick, `vecna-variations.html`, `src/gfx/var/vecna_scary.ts`), reached in two rounds: Vined from the first five, then Rooted from three scarier takes on it. He is hunched, his head sunk between raised shoulders, with long arms and long bone claws. His head is a skull: a big cranium over a narrow jaw, a heavy brow, black sockets with red points for eyes, a bare row of teeth, vines over the dome. Ash grey flesh, as if the Upside Down had dried him out, wound with dark red vines that branch down his chest, and roots running from his feet into the floor. Five fill colors: grey, dark grey, bone, red, dark red.

- **The tendrils move all the time** (the owner's call). Four tall dark red tendrils rise behind his shoulders like a crown and writhe in a loop of eight frames: the root stays on the shoulder, the middle sways a pixel, the tip two, each out of step with the others. In the game they are a layer of their own drawn under every body frame, so they loop whatever pose he is in, floating and burning included. The frame is 36 by 62, with ten rows of headroom over him for the tips.
- **Poses**, as drawn on the sheet: stand, walk and the curse (Clock), float and the throw (Float), burning and the vine whip (Burn), and hurt. The fire is an effect drawn over him, so the sprite keeps five colors.
- **His clock** over a cursed hero: a dark red rim, a bone face, red for the sounded chimes.

## Foes

| Foe | Where | Behavior | Counter |
|---|---|---|---|
| Guard | 4.1 | Prison guards, as the Russian soldier of 3.2 in winter coats | Hopper's slam |
| Creel ghoul | 4.2 | Steps out of mirrors in the dark | Flashlight, Christmas lights, the riff shatters its mirror |
| Demobat | 4.3, 5.x | Flies in groups, ignores walls | Eddie's solo, Lucas |
| Demodog, vine, spore pod | 4.3, 4.4 | As in chapter 2 | As in chapter 2 |

## The looks

| Sheet | Page | Pick |
|---|---|---|
| Eddie | `eddie-variations.html` | **1 Hellfire Club** |
| The solo's note highway | `solo-variations.html` | **2 The neck** |
| Vecna | `vecna-variations.html` | **1 Vined**, then **3 Rooted** of the scarier takes, with the tendrils writhing |
| The Demogorgon pit | `pit-variations.html` | **4 Mine shaft** |
| Kamchatka | `kamchatka-variations.html` | **1 Blizzard** |
| The Creel House | `creel-variations.html` | **2 Abandoned** now (4.2), **4 Upside Down** for the lair (4.4), **3 Blood red** for memories |
| Upside Down Hawkins | `hawkinsud-variations.html` | **Blue storm**: 1 Blue night and 2 Red storm mixed |

Each sheet is drawn by the game's own code, and its image is in `docs/screenshots/ch4-*.png`.

## Still open

- **Numbers.** Party levels into 4.1 to 4.4, `enemyMult` and `xpMult` per stage, Eddie's stats, Vecna's and the pit Demogorgon's HP. All wait on chapter 3's measured run (`docs/pace.md`). The pace target is Lv 10 for the lead after chapter 4.
- **The shop.** What Erica sells in chapter 4, and whether she is reachable while the party is split between Kamchatka and Hawkins.
- **Hopper in 4.1.** His level and gear when he comes back, and whether 4.1 is replayable for XP like any stage.
- **The solo.** Notes per solo and the bot's play.
- **The Hellfire Club room** has no look sheet yet. Vecna's lair is the Creel House's Upside Down skin; its attic, where he fights, still needs a room.
- **Chapter 5.** No Eddie there, so no mirrors and no riff gates.
