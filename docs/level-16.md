# Level 16 spec: stage 5.3, Vecna inside the Mind Flayer

The last stage (`docs/chapter-5.md`). A short climb through the flesh to the heart of the Abyss, then the final fight in three phases, the channel, the Final Roll, Joyce's axe, and the ending. Every call here is the lead's, made under the owner's standing instruction. It is built after chapter 4 lands, because it reuses 4.4's Vecna, and after 5.1 and 5.2.

## Shape

- Map: about 36 by 44 tiles in `src/world/stages/stage53.ts`, with spawns in `stage53_data.ts`.
- Route:
  - the climb (start, south): `heartfloor` between `heartwall`s, short and narrow, with Flayed and demobats
  - a vine wall (`burn1`, Dustin or Nancy, with the `alt` fallback)
  - the antechamber, with `lights_heart`, the one save point for the whole fight
  - the arena (north), round, about 22 across, with `heartrim` at its edge and the two channel marks (`drawChannelMark`) left and right of its centre
- Light: `drawHeartGlow` pulsing, with the lights prop and the boss as the light sources.
- Music: `abyss` from the arena's door. `phase(n)` steps it with each boss phase (160, 164, 168). The epilogue plays `ending`.
- Party: picked on the map, with Eleven and Will locked in (`REQUIRED`).
- Tile characters, taken at spine time with 5.1's and 5.2's (`src/core/tiles.ts`): `õ` `heartfloor`, walkable, `ô` `heartwall` and `ó` `heartrim`, solid. All three pulse with the heartbeat. The painters are registered (`src/gfx/tile_ch5.ts`) and nothing uses them yet.

## The fight

One boss bar that names each phase in turn: VECNA, THE MIND FLAYER, THE CHANNEL.

1. **Vecna, fast** (`vecna`, chapter 4's own kind, with his four memory orbs): 4.4's Vecna kit at a speed factor of 1.3, with the clock chiming every 12 s (the curse as chapter 4 built it, and Max's Walkman works). The stage's spawn sets `x: { speedMul: 1.3, chimeEvery: 720, sinkT: 64 }` over his def's, which is the seam chapter 4 left for it (`SimSpawn.x`, `xOf`). At 0 HP he sinks into the floor for 64 frames, his orbs and every curse they marked going with him, and phase two starts with `phase(1)`.
2. **The spider** (`flayer5`, with legs): 3.3's Mind Flayer kit (leg strikes on telegraphed lines, goo pools, Flayed crowds), drawn by `drawFinaleSpider`.
   - Hitting legs, as in 3.3, opens the chest for 5 s (the `open` flag). Only hits on the open chest move the bar.
   - The clock still chimes every 16 s.
   - At 0 HP the spider kneels, and phase three starts with `phase(2)`.
3. **The channel:**
   - Eleven and Will walk to the two marks and become channelers, held in place like 2.3's ward (`combat/defense.ts`), each with an HP bar on the HUD. The party plays its other two heroes, and swaps skip the channelers.
   - Waves of demobats, demodogs and Flayed go for the channelers for 40 s, with a countdown on the HUD.
   - If either channeler falls, the countdown and both channelers reset, with full HP, so it can't soft-lock.
   - At 0 s: the Final Roll.

## The Final Roll

Play stops. Every hero still standing, channelers included, rolls a d20 with advantage (two dice tumble, the higher stays, on `src/ui/die.ts`), one after another, with the `roll` and `rollLand` sfx. The total and any NAT 20 show.
- The total only sets the size of the finish: under 30 the plain one, 30 or more a bigger one, any 20 the gold flourish with `natTwenty`.
- It can't fail.
- Then Joyce runs in (`drawJoyce`) and brings the axe down: the `boom` step, a white flash (none with Reduce flashing), and `level_clear`.

## The ending

- `flow.ts` plays the epilogue the first time 5.3 is cleared (unless the story is off), as chapter 3's does: `story/epilogue.ts` with `EPILOGUES[5]` = `l16_basement`, drawn with `drawEndingRoom` over `ending`.
- Mike closes the campaign book. The last beat is one die rolled on the table, landing as `ending` ends (`musicEnded()`).
- Then a THE END card (`drawTheEnd`) that waits for a press.
- Then the results, which say CAMPAIGN COMPLETE with the feedback note.
- Then the map, with every node cleared and the token on the heart. Replays stay open.
- `closesChapter('5.3')` holds, and 5.3 is the last stage in `STAGE_ORDER`.

## Spawns and the XP budget

| Group | Enemies |
|---|---|
| `climb` | 2 Flayed, 3 demobats |
| `boss` | Vecna and his four orbs, dormant |
| `flayer` | the spider and its legs, dormant until phase two |
| `channel` | run-time waves during phase three: demodogs, Flayed and, twice, three demobats |

Count the XP before `xpMult` between 300 and 360, with a test. `xpMult` takes the lead to Lv 12, the cap, by the clear.

Items: three Eggos, three Cokes before the fight. Lights: `lights_heart`.

## Targets

On HARD (`chief`) over 20 seeds: 14 to 19 clears (the last boss may sit a clear lower than the rest), the careless bot at least 10, under 45% lowest HP. A 100-seed run shows nothing stuck in any phase. The bot plays the channel by staying between the waves and the channelers.

## What UI builds

- The phase names on the boss bar.
- The channelers' two bars and the countdown.
- The Final Roll scene: the dice one hero at a time, the total and the flourish.
- THE END, and CAMPAIGN COMPLETE on the results.

## Result

Built in two passes. The spine and the boss sim are in; the art, the HUD and the ending chain are the next builder's (what they need is last).

**The spine.** 5.3 is last in `STAGE_ORDER` and `closesChapter('5.3')` holds (`CHAPTER_LENGTH` says three), `endsCampaign('5.3')` reads a stage that exists. `REQUIRED` is Eleven and Will, `CATCH_UP` brings both in at the party's average less one, and `ARRIVAL` has the lead at Lv 11 with 300 XP into it (a placeholder, until 5.1 and 5.2 pay). The map has a HEART node and plate below the horizon beside the Abyss's (`gfx/map_geo.ts`, `map_land.ts`: no landmark yet). `stage53.ts` and `stage53_data.ts` are the stage: 36 by 44, the climb (a start chamber, a passage, a hall of three Flayed and three demodogs, a corridor shut by `burn1`), the antechamber with `lights_heart`, a two-tile neck with `door1`, and the round arena, a disc 22 across with `heartrim` all round it, Vecna in its middle, the spider's body at its north tip with its legs along its front, and the marks at (12, 14) and (23, 14). The scripts `l16_start`, `l16_burn_hint`, `l16_burn_done`, `l16_antechamber`, `l16_vecna`, `l16_spider`, `l16_channel` and `l16_clear` are stand-ins.

**The beats.** `vecna` (the arena's south: `close door1`, `music abyss`, the script, then `defend`) starts the fight. `Sim.defend()` starts the finale at the first boss still standing, and the play scene carries kills across a retry, so a wipe in the spider's phase retries at the spider and one in the channel at the channel, from `lights_heart` with the party at full. `phase_spider` and `phase_channel` fire on the sim's `bossPhase` event and step the music with the new `phase` step (`audio.phase`, 1 then 2). `level_clear` fires on `finalRoll` and plays `boom`, `l16_clear`, opens the door and `finish`: the Final Roll scene, Joyce and the flash go between the event and that beat, which the ending builder wires.

**The sim** (`combat/finale.ts`, `channel.ts`, `wake.ts`; Vecna is `enemies/vecna.ts`, `vecna_phase.ts` and `orb.ts`; the contract is in `combat/index.ts`):

- **Vecna** is chapter 4's kit (the stand-in in `enemies/vecna5.ts`, a blast and two homing orbs, is gone): the whip in Clock and Burn, the thrown rock and the height in Float, the orbs that heal him and that a broken one pulls him down by, and the clock's curse. The stage's `x` runs it at 1.3 times his pace (his walk, whip, throw and rise) with the clock every 720 frames, so a curse counts its four chimes 240 frames apart, and the Walkman and the marked orb lift it as in 4.4. He keeps his 1000 HP and 150 XP. At 0 HP he sinks for 64 frames in anim `ko` (`combat/kills.ts`, `sinks`: a Vecna whose spawn sets `sinkT`), the orbs and the curses they marked go with him, and 44 frames in the party gets 30% of its HP and MP back and the spider rises. The bar names VECNA and carries his four orbs as `parts`, as 4.4's does.
- **The Mind Flayer** is the 3.3 brains on `flayer5` and `leg5`. The chest is shut and the body takes no hit until a hit on a leg opens it for 300 frames (`ActorView.open`, `k` the share left); with every leg cut the head comes down for 300 frames at x2 and the chest is open too. At 0 HP it dies as 3.3's does and its body stays, kneeling (pose `down`). 60 frames later, the same breather.
- **The channel** holds Eleven and Will on their marks like a ward, 380 HP each, for 40 s against eight demodogs and three Flayed that go for the nearest channeler, and two flocks of three demobats (at 16 s and 35 s) that dive at the heroes who fight. Demobats never go for a channeler, so the bot's guard (`bot_ward.ts`) does not count them as a threat to one. A fall starts it again (both full, the clock and waves from the start, the run-time foes gone, the party gets 20% back). At 0 the sim sends `{ t: 'finalRoll', heroes, roll }` and drops what is left of the waves.

**The bot** plays Vecna as 4.4 does (`bot_vecna.ts`: the whip's line, the marked orb under a curse, an orb to pull him down), hits the nearest leg and then the open chest (`bot_flayer.ts`), and in the channel guards the channeler with a foe on them with a long leash, waiting between the two otherwise (`bot_ward.ts`).

**Tuning**, on HARD (`chief`), `enemyMult` 1.45, channelers at 380 HP, `xpMult` 3.2, with the party a `?stage=5.3` jump brings (Mike Lv 11, Dustin 10, Eleven and Will 8). Re-measured after chapter 4's Vecna and the demobats went in:

| Measure (chief) | Careful bot | Careless bot | Target |
|---|---|---|---|
| Cleared, of 20 | 19 | 11 | 14 to 19; careless at least 10 |
| Cleared, of 100 | 99 | 55 | |
| Stuck, of 100 | 0 | 0 | none |
| Average damage taken (of 20) | 528 | 573 | |
| Average KOs (of 20) | 2.7 | 3.0 | |
| Average lowest party HP (of 20) | 38% | 42% | under 45% |
| Average time (of 100) | 132 s | 114 s | |
| Phase one, two and three | 37, 26 and 47 s | 32, 19 and 45 s | |

Kid clears 20 of 20, NORMAL 20 (careless 19), upside 7: the last boss on a mode no menu offers. The Lv 12 lead run was not repeated.

- **`enemyMult` came down from 1.8 to 1.45.** Chapter 4's Vecna has 1000 HP and heals 4% of that every 2 s with his orbs up, where the stand-in had 800 and no heal, and the bats of the channel dive at the only two heroes who are free to fight. With the stand-in's factor of 1.8 the careful bot cleared 18 of 20 but the careless bot 2 to 3, whatever the waves held (without the bat flocks it cleared 12 and the careful bot 16, so Vecna alone fit). The careless bot cannot hit a bat out of reach and does not leave a dive's line, so a flock of three is 45 damage a hit on a hero with 120 HP. At 1.45 the lowest HP is back under its band (38%), where the stand-in left it at 54%.
- **The numbers move a lot between seeds 1 to 20 and 21 to 40**: at 1.5 the careless bot cleared 3 of the first 20 and 17 of 40, and at 1.6 9 of 20, so the 20 seed bands were read at 1.3, 1.35, 1.4 and 1.45 (careless 19, 15, 13 and 11) and the 100 seed run decides the rest.
- **The bot's guard of the channelers ignores bats** (`bot_ward.ts`): they orbit and dive at the active hero and never go for a channeler, and a bat circling the channelers had the bot standing guard over a channeler nothing was attacking.
- **Where the waves come up decides the channel.** From the rim beside the marks (the first order of the burrows) the careful bot cleared 10 of 20: both channelers were under attack at once. From the arena's north and south tips, in line between them, 14 of 20 at the same HP, and 20 of 20 at 300.
- **The breathers matter to the careless bot, not the careful one.** They are 30% at each phase change and 20% on a channel reset.
- **XP is 350 before `xpMult`** (two Flayed 22, three demobats 18, Vecna 150, the Mind Flayer 160; the orbs and legs pay nothing). A third Flayed came out of the climb to hold the sum under 360 with Vecna's 150 and the bats in. `xpMult` 3.2 pays 1120 (a run earns about 1133 with its run-time spawns): with 300 XP into Lv 11, every careful clear ends the lead at the cap (1061 takes Lv 11 to 12). The lead's 300 is a placeholder until 5.1 and 5.2 pay their XP.

**What the art, HUD and flow builder needs:**

- Art: `ActorView.open` (and `k`) on `flayer5` for `drawFinaleSpider`'s chest (it reads `petals` by default, pass `open`); phase one's Vecna is `vecna`, drawn by chapter 4's `actor_vecna.ts` with all its poses (whip, throw, float, burn, chime) and its orbs by `actor_orb.ts`; `ko` with `t` counting the sink is 64 frames, no blink, so `drawFinaleVecna` in `gfx/ch5/` is unused until Art decides whether the finale wants a look of its own; a dead `flayer5` stays with pose `down`, anim `idle` (kneeling, no chest); the channelers are hero actors in anim `cast` on the marks with the channel's bar (`drawChannelMark` at `StageData.finale.channelers` tiles, lit while `hud.channel.on`); `drawHeartGlow` over the arena; Joyce after the roll. `gfx/actors.ts` has stand-ins for `vecna5` (the Warden), `flayer5` and `leg5`.
- HUD: `hud.boss.phase` and the three names (the channel's bar is its countdown: `hp` is frames left); `hud.channel` ({ on, left, total, channelers[{ id, name, hp, hpMax }] }); `PartyHud.channeling` on the two held rows, which no swap reaches.
- Flow: the sim event `finalRoll` carries the standing heroes and the roll (`rollFinal`'s result): play the Final Roll scene on it, then Joyce, then fire the `level_clear` beat (or hold the director's events until the scenes are done), then the epilogue chain as `docs/level-16.md` above says. `Sim.defend()` and the `phase` and `bossPhase` plumbing are in `world/triggers.ts` and `play.ts` already.
- The clock curse's chimes in phase one (12 s) are wired. Phase two's (16 s, `ENEMY_DEFS.flayer5.x.clock16`) are not: the spider's phase is unchanged, and nothing chimes once Vecna has sunk.

## Result: the art, the HUD and the ending

The second pass. 5.3 plays from the climb to the map, and every contract above is wired.

- **The bar.** `ui/hudchannel.ts` draws the channel the way 2.3's ward bar is drawn. The boss bar names the phase (`FINALE_PHASES` in `ui/format.ts`, held to the sim's own names by a test). In phase three it is an amber countdown with the seconds left at its right end, and the two channelers' bars sit side by side under it (`channelBars`): Eleven's rose, Will's teal, to match their marks. The party band frames a held hero in their color with a 3 by 5 ring where the key would be (lit while the channel runs), and `slotAt` skips them. The burst hint under the bars drops a row.
- **The art.** `flayer5` is `drawFinaleSpider`, shut or open by `ActorView.open`; `leg5` is 3.3's leg. The marks (`drawChannelMark`, lit while `hud.channel.on`) and the heart's glow (`drawHeartGlow`, centered on the view) go in `world/heart.ts`, after the tiles and before the actors. Reduce flashing holds the glow and the marks' runes still inside the art. The sim's `orb` fx is gone with the stand-in Vecna, so there is no dark red orb to draw; phase one's Vecna and his memory orbs are chapter 4's. A dead Mind Flayer and a sinking Vecna are drawn without the killing blow's hit flash, which nothing decays once they are dead.
- **The finish** (`world/ending.ts`). The play scene holds `finalRoll` back from the director. Play stops, and the Final Roll scene plays over the frozen fight with the event's own roll (`FinalRollOpts.roll`). Then the camera goes to the kneeling body and Joyce runs in from the south (`drawAxeJoyce`, 62 frames), raises the axe and brings it down, 88 frames in all. As the axe comes down the event goes to the director: `level_clear`, whose `boom` shakes the screen and flashes it white (none with Reduce flashing), then the closing words, the door and the clear. The sim's own screen flash and shake and every actor's hit flash are taken out of the picture while it holds (`calm`).
- **The chain** (`flow_end.ts`). The first clear of 5.3 plays `l16_basement`, THE END, then the results (CAMPAIGN COMPLETE), then the map. With the story off (the setting or `?rush=1`) the epilogue is skipped and THE END stays, playing `ending` itself. A replay goes straight to the results. Chapter 3's epilogue is as it was.
- **Phase two's clock** (`combat/finale_clock.ts`). Every `clock16` frames (16 s) from the spider's rise it curses a random standing hero as Vecna's does, and marks a standing leg where his marks an orb: cutting that leg lifts the curse (`curseEnd` `orb`), as does the Walkman, and the fourth chime takes the hero out. The marked leg wears a clock (`ActorView.marked`). Nothing chimes with every leg cut or with the Walkman on, and the spider's death lifts what its legs held. The bot cuts the marked leg first under a curse.
- **The sheet.** `?sheet=1` has four pages for 5.3 (`gfx/sheet_l16.ts`): the Mind Flayer, its legs, the heart with its marks, and Joyce. The HEART plate was already on the map.
- **Tests.** `tests/flow-end.test.ts`, `finale-hud.test.ts`, `ending.test.ts`, `finale-clock.test.ts`, `finale-dev.test.ts` and the scene test in `finale-play.test.ts`.

Left open: Vecna's sink is chapter 4's thinning KO and not the finale's own `drawFinaleVecna`, and the heart has no landmark of its own on the map yet, only its node and the HEART plate.
