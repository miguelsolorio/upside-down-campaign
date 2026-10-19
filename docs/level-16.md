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

1. **Vecna, fast** (`vecna5`): 4.4's Vecna kit at a speed factor of 1.3, with the clock chiming every 12 s (the curse as chapter 4 built it, and Max's Walkman works). At 0 HP he sinks into the floor (`drawFinaleVecna`'s sink pose), and phase two starts with `phase(1)`.
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
| `climb` | 3 Flayed, 3 demobats (3 demodogs stand in until chapter 4 builds them) |
| `boss` | Vecna, dormant |
| `flayer` | the spider and its legs, dormant until phase two |
| `channel` | run-time waves during phase three |

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

**The sim** (`combat/finale.ts`, `channel.ts`, `wake.ts`, `enemies/vecna5.ts`; the contract is in `combat/index.ts`):

- **Vecna** is a stand-in kit behind `enemies/vecna5.ts` (`vecnaUpdate` and `clearVecna` are the whole seam; `VECNA_SPEED` is 1.3 and `VECNA_CHIME` 720): a blast with a warning ring and two slow homing orbs. No curse, so the clock's chime waits for 4.4's kit. At 0 HP he sinks for 64 frames in anim `ko`, and 44 frames in the party gets 30% of its HP and MP back and the spider rises.
- **The Mind Flayer** is the 3.3 brains on `flayer5` and `leg5`. The chest is shut and the body takes no hit until a hit on a leg opens it for 300 frames (`ActorView.open`, `k` the share left); with every leg cut the head comes down for 300 frames at x2 and the chest is open too. At 0 HP it dies as 3.3's does and its body stays, kneeling (pose `down`). 60 frames later, the same breather.
- **The channel** holds Eleven and Will on their marks like a ward, 380 HP each, for 40 s against ten demodogs and three Flayed that go for the nearest channeler. A fall starts it again (both full, the clock and waves from the start, the run-time foes gone, the party gets 20% back). At 0 the sim sends `{ t: 'finalRoll', heroes, roll }` and drops what is left of the waves.

**The bot** fights Vecna like any foe and steps out of his blast ring and orbs (`bot_finale.ts`, `bot_threat.ts`), hits the nearest leg and then the open chest (`bot_flayer.ts`), and in the channel guards the channeler with a foe on them with a long leash, waiting between the two otherwise (`bot_ward.ts`).

**Tuning**, on HARD (`chief`), `enemyMult` 1.8, channelers at 380 HP, `xpMult` 3.2, with the party a `?stage=5.3` jump brings (Mike Lv 11, Dustin 10, Eleven and Will 8):

| Measure (chief) | Careful bot | Careless bot | Target |
|---|---|---|---|
| Cleared, of 20 | 14 | 14 | 14 to 19; careless at least 10 |
| Cleared, of 100 | 85 | 62 | |
| Stuck, of 100 | 0 | 0 | none |
| Average damage taken | 411 | 769 | |
| Average KOs | 1.4 | 2.9 | |
| Average lowest party HP | 54% | 17% | under 45% |
| Average time | 152 s | 127 s | |
| Phase one, two and three | 34, 40 and 63 s | 26, 29 and 56 s | |

With a Lv 12 lead (Mike 12, Dustin 11, Eleven and Will 9) the careful bot clears 18 of 20 and the careless bot 18. Kid clears 20 of 20, NORMAL 20 (careless 18), upside none: the last boss on a mode no menu offers.

- **The lowest HP is outside its band** (54% against under 45%). Two of the four heroes hold their marks for the whole last phase with their HP where the breather left it, so the party's total cannot fall far however hard the two who fight are hit. Every change that took it toward 45% cost the careful bot its clears: a factor of 1.85 gives 50% and 68 clears of 100, bigger waves lose most of the fights.
- **The factor is a cliff.** At 1.75 the careful bot clears 91 of 100 and the careless bot 80, at 1.8 85 and 62, at 1.85 68 and 51. The careless bot's losses are Vecna's blast (it takes 360 of its 770 damage in phase one): his blast is power 0.7 and each orb 0.5, down from a first 1.0 and 0.7, to keep that floor.
- **Where the waves come up decides the channel.** From the rim beside the marks (the first order of the burrows) the careful bot cleared 10 of 20: both channelers were under attack at once. From the arena's north and south tips, in line between them, 14 of 20 at the same HP, and 20 of 20 at 300.
- **The breathers matter to the careless bot, not the careful one.** At 1.75 and 400 HP over 40 seeds, breathers of 15% leave the careless bot 38% of its clears and breathers of 45% give it 65%, where the careful bot clears 88% and 92%. They are 30% at each phase change and 20% on a channel reset.
- **XP is 340 before `xpMult`** (three Flayed 33, three demodogs 27, Vecna 120, the Mind Flayer 160). The demodogs stand in for the three demobats. `xpMult` 3.2 pays 1088: with 300 XP into Lv 11, every careful clear ends the lead at the cap (1061 takes Lv 11 to 12). The lead's 300 is a placeholder until 5.1 and 5.2 pay their XP.

**What the art, HUD and flow builder needs:**

- Art: `ActorView.open` (and `k`) on `flayer5` for `drawFinaleSpider`'s chest (it reads `petals` by default, pass `open`); `drawFinaleVecna` for `vecna5` (anim `walk`, `cast` while the "!" is up, `ko` with `t` counting the sink: 64 frames, no blink); a dead `flayer5` stays with pose `down`, anim `idle` (kneeling, no chest); the `orb` fx (a stand-in, Will's bolt, is drawn now: `fx.ts`); the channelers are hero actors in anim `cast` on the marks with the channel's bar (`drawChannelMark` at `StageData.finale.channelers` tiles, lit while `hud.channel.on`); `drawHeartGlow` over the arena; Joyce after the roll. `gfx/actors.ts` has stand-ins for `vecna5` (the Warden), `flayer5` and `leg5`.
- HUD: `hud.boss.phase` and the three names (the channel's bar is its countdown: `hp` is frames left); `hud.channel` ({ on, left, total, channelers[{ id, name, hp, hpMax }] }); `PartyHud.channeling` on the two held rows, which no swap reaches.
- Flow: the sim event `finalRoll` carries the standing heroes and the roll (`rollFinal`'s result): play the Final Roll scene on it, then Joyce, then fire the `level_clear` beat (or hold the director's events until the scenes are done), then the epilogue chain as `docs/level-16.md` above says. `Sim.defend()` and the `phase` and `bossPhase` plumbing are in `world/triggers.ts` and `play.ts` already.
- The clock curse's chimes (12 s in phase one, 16 s in phase two, `VECNA_CHIME` and `ENEMY_DEFS.flayer5.x.clock16`) are not wired: they wait for 4.4's kit.
