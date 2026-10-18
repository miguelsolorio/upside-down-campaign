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
| `climb` | 3 Flayed, 3 demobats |
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

To be filled by the build.
