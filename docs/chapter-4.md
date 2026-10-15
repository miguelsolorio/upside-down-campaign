# Chapter 4: Hellfire, 1986 (DRAFT)

**Draft.** This is pre-production: the stages, who plays them, the bosses, the hooks and the looks the owner picked. Nothing here is built. Every number is a placeholder until chapter 3 lands, because its results set them: the party's levels coming out of 3.3, Erica's shop and its prices, and how the purse and stash carry. Each stage gets its own spec (`docs/level-10.md` to `docs/level-13.md`) when the build starts.

Chapter 4 is spring 1986. Hopper is alive in a Soviet prison in Kamchatka. In Hawkins, Eddie Munson runs the Hellfire Club, a curse is killing kids one chime at a time, and the way to stop it runs through the Creel House and the Upside Down. The chapter opens with Hopper alone, gives the party Eddie for two stages, takes him away on a rooftop, and ends in Vecna's lair.

## Stages

| # | Stage | Who plays | What happens | Ends with | Music |
|---|---|---|---|---|---|
| 4.1 | Kamchatka | Hopper alone. No swaps, one hero on the HUD | The snow yard inside the wire, then the prison block: guards, cells, the cold. Joyce's lights are a care package from home. Look: Blizzard | The Demogorgon pit (mini-boss) | `mirkwood`, with snow slowing it; `clock` in the pit |
| 4.2 | The Hellfire Club and the Creel House | A party of four picked on the map. Eddie joins at the start | Eddie's recruit scene in the Hellfire Club (look: Storm). Max gets her Walkman back in a story beat. Across town to the Creel House: haunted mirrors, Creel ghouls, and the scripted beat that teaches the clock curse. Look: Abandoned, with Blood red for the memories | Getting out of the Creel House | `hawkins` |
| 4.3 | Upside Down Hawkins | Picked on the map, Eddie locked in (mirrors on the route) | Hawkins upside down: streets, the trailer park, demobats. Grandfather clocks chime and curse a hero as a stage hazard. Look: Blue storm | The rooftop solo: a whole song on the note highway while the demobats come. Eddie falls, for good | `upside`, then the solo's own track |
| 4.4 | Vecna's lair | Picked on the map. No Eddie | The Creel House in the Upside Down, then the attic. Look: the Creel House's Upside Down skin, the attic in Vine nest | Vecna, three phases | `clock` |

- **4.1 is a solo opener.** Hopper has no one to swap to, so the stage is built round his kit: haymaker, ground slam, the Wind-up and Berserk talents if his level has them. Gates on the route are ones he can open himself (smash). He comes back at the party's average level minus one, the recruit rule, unless chapter 3 changes how Hopper is carried.
- **Eddie is playable in 4.2 and 4.3 only.** He falls on the 4.3 rooftop as he does in the show, and he is not in chapter 5. A replay of 4.2 or 4.3 brings him back for that run (`partyFor`), the way a chapter 1 replay brings Eleven. His mirrors appear only in 4.2 and 4.3, and chapter 5 must not need a riff.
- **The party.** 4.2 to 4.4 pick four from everyone the save has, as chapter 3 does. Who is locked in where is set by the gates on each route: Eddie in 4.3 (mirrors), Max nowhere (the Walkman helps but is never required).

## Hopper in Kamchatka

**Look: Telogreika** (`hopper4-variations.html`, `HOPPER4_OPTS[0]`). Round 2's picks were made by the pre-production session under the owner's standing instruction to go with its own recommendations; the owner can swap any of them before the build. His head is shaved to a buzzed scalp, the mustache stays, and he wears the camp's quilted black-grey jacket with a pale number patch on the chest and trousers to match, on the big body with thick arms. Five fill colors: skin, a darker skin for the stubble, two greys, bone. The portrait has the same buzz and mustache over the quilted collar.

- **Why.** It's the prison look people remember, the mustache keeps him Hopper at 1x, and the pale patch gives the dark jacket something to read by on the night snow.
- **On the build.** The spec is a `CharSpec` on the big body and a `PortraitSpec`, ready for `src/gfx/data`. The quilting reads as a checker at 4x; a stitch line every other row would be calmer. The Greatcoat look (5, a guard's coat over the prison clothes) is drawn and could be his look for the escape at the end of 4.1.

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
- **The Hellfire Club (4.2): Storm** (`hellfire-variations.html`, round 2's pick under the standing instruction). A Hawkins High classroom after hours: the chalkboard, posters and the club's banner (the red demon face) on the north wall, windows, a door and a bookcase, desks in rows, an AV cart, and in the middle the D&D table, desks pushed together under a cloth with the dungeon map, minis and dice, the DM screen at its head and Eddie behind it. Storm is the room at night: cold blue through the windows with lightning and rain on the glass, and candles on the table for the only warm light. Why: 4.2 runs from the recruit scene into the Creel House at night, so a night room leads into it; the candles put the eye on Eddie and the table while the rest of the room stays readable, where Red lamp leaves it near black; and the storm is a first taste of 4.3's. Room letters: `#` wall top, `W` wall, `C` chalkboard, `P` poster, `w` window, `D` door, `S` bookcase, `.` floor, `d` desk.
- **The Creel House: one tile set, three skins, one per time.** The owner's call: Abandoned is the house now, Upside Down is the house in the Upside Down, and Blood red is the house in memory. They share the room letters, the mirrors, the clock and the props, and differ only in paint, the way a night stage repaints its tiles, so the build paints the house once.
  - **Abandoned (1986)** is 4.2: peeling blue-grey paper over lath, boarded windows with moonlight through the gaps, dusty boards and rubble, a moth-eaten rug. The mirrors here are Eddie's gate.
  - **Upside Down** is 4.4, Vecna's lair: the same rooms rotted and overgrown, red veins across the floor, a window flashing red, spores.
  - **Blood red** is the house in 1959, in Vecna's memory: deep red damask, near-black wood, candlelight. It's used for memory scenes, not a stage of its own. The 4.2 beat that teaches the curse turns the room Blood red while the four chimes count, and back to Abandoned when the curse is broken, so the curse shows as a place; Victor Creel's story (the flashback to the family's last night) plays in it; and Vecna's speeches between his phases in 4.4 cut to it. **Only that beat turns the room** (the owner's call): later curses in 4.3 and 4.4 show on the cursed hero alone, so Blue storm and the lair stay readable.
- **Upside Down Hawkins (4.3): Blue storm**, the owner's mix of Blue night and Red storm (`src/gfx/var/hawkinsud_mix.ts`, image `docs/screenshots/ch4-hawkinsud-mix.png`). Blue night between bolts: blue black roofs, lawns and road, red veins, pale spores, and rain, so the asphalt holds dim red reflections. Every 6 to 10 s a bolt floods the lit edges (roof lips, curb tops, slab bevels, door frames) red and the wet road streaks bright, then it fades back to blue over a step. The night pass leaves reds alone, so the flash reads on the dark. To fix on the build: the house fronts read as flat bands, and the car is small at 1x.
- **Vecna's attic (4.4): Vine nest** (`attic-variations.html`, round 2's pick under the standing instruction). The room where he fights, painted in the Creel House's Upside Down skin with its own painters (`creel_b.ts`): the underside of the roof with rafters and a round window flashing red, rotted boards with red veins, a rug, low eaves at the sides, trunks, furniture under sheets and a dress form for cover, the grandfather clock, and the four memory orbs, red bulbs on vine stalks round the floor. In Vine nest the vines hang from the rafters into a knot over the middle where Vecna floats, with roots running from the four orbs to his feet, and the floor stays open round him. Why: it is the show's picture of him bound in the attic, the knot puts the fight's center where the eye goes, and the roots tie the orbs to him, so breaking them reads as cutting him off. Room letters: `#` roof, `W` knee wall, `.` floor, `r` rug, `<` and `>` the eaves. To fix on the build: the north wall reads more like a wall with rafters than a slope, and the round window is a prop, not a tile.

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

**Max's talents.** With the Walkman a story item, Kickflip (the dash ends in a shockwave), her old Lv 9, is her Lv 6 talent now (built 2026-10-15). Her new Lv 9 is **Extra life** (the owner's call): once per stage, a KO, a curse's included, leaves her at 1 HP with 2 s of invulnerability instead. The arcade's 1UP, and a nod to her outlasting Vecna once.

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

The new foes' looks, all picked in round 2 under the standing instruction:

- **Guard: Greatcoat** (`guard-variations.html`, `KGUARD_OPTS[0]`). The 3.2 soldier in winter: a long grey greatcoat, snow caught on the ushanka and the shoulders, a scarf over the mouth, and the same rifle that aims and fires. Five fills: skin, grey, white, brown for the stock, yellow for the star and the flash. A `CharSpec` built like `SOLDIER`, so it drops into `src/gfx/data`. Why: it's the soldier the player already knows, made cold, and grey reads on the blue snow where the winter whites don't. The Camp guard (4, a baton) is drawn if 4.1 wants a melee guard.
- **Creel ghoul: Glass wraith** (`ghoul-variations.html`). A tall pale woman whose skin is cracked like a broken mirror, cyan on the cracks, hollow black eyes, a gown that ends in shards; she floats, and dies by breaking into glass. Five fills: bone, mist, black, cyan, white. A 22 by 26 frame, about 21 px tall, a head over the kids, with eight poses: in the glass, stepping out, stand, two drift frames, lunge, hurt and shatter. Why: she is made of the mirror she comes out of, so the riff that shatters a mirror and her death read as the same thing, and she is the brightest of the four on the dark Abandoned rooms.
- **Demobat: Pale** (`demobat-variations.html`, `demobatFrame('pale', frame)`). Bone-pale skin with red veins, the Demogorgon's colors, wings out from above, a long whip tail, and a red petal head that opens in the dive. A 17 by 14 frame with eight frames: four of the flap, glide, dive, stunned (three yellow stars, which count among its five fills) and hit (a white flash). Why: a flock has to read at a glance in Blue storm and over the rooftop, and the pale ones do where the grey Show bat sinks into the road. It has replaced the stand-in on the solo sheet (`solo_kit.ts`).

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
| Hopper in Kamchatka | `hopper4-variations.html` | **1 Telogreika** (round 2) |
| The Kamchatka guard | `guard-variations.html` | **1 Greatcoat** (round 2) |
| The Creel ghoul | `ghoul-variations.html` | **1 Glass wraith** (round 2) |
| The demobat | `demobat-variations.html` | **2 Pale** (round 2) |
| The Hellfire Club room | `hellfire-variations.html` | **4 Storm** (round 2) |
| Vecna's attic | `attic-variations.html` | **1 Vine nest** (round 2) |

Each sheet is drawn by the game's own code, and its image is in `docs/screenshots/ch4-*.png`. Round 1's picks are the owner's. Round 2's were made by the pre-production session under the owner's standing instruction to go with its recommendations, and can be swapped before the build.

## Still open

- **Numbers.** Party levels into 4.1 to 4.4, `enemyMult` and `xpMult` per stage, Eddie's stats, Vecna's and the pit Demogorgon's HP. All wait on chapter 3's measured run (`docs/pace.md`). The pace target is Lv 10 for the lead after chapter 4.
- **The shop.** What Erica sells in chapter 4, and whether she is reachable while the party is split between Kamchatka and Hawkins.
- **Hopper in 4.1.** His level and gear when he comes back, and whether 4.1 is replayable for XP like any stage.
- **The solo.** Notes per solo and the bot's play.
- **Chapter 5.** No Eddie there, so no mirrors and no riff gates.
