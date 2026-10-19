# Level 12 spec: stage 4.3, Upside Down Hawkins

One stage, five to eight minutes. Spring 1986, the night the gates open. The party crosses Hawkins in the Upside Down: the streets, the houses, the trailer park, under a blue storm that flashes red. Demobats fly in flocks over the roofs, demodogs and vines are back, and grandfather clocks stand in the street and curse whoever they catch. It ends on the roof of Eddie's trailer: a whole song on the note highway while the demobats come. Every miss lets one through. When the song ends, Eddie falls, for good. Sim builds the demobat, the rooftop's sim side and the clocks' hazard. Art draws Blue storm and its lightning, the trailer park and the roof, and the demobat. World builds the map, the beats and the words. Audio writes the demobat's sounds. UI runs the highway over the stage. Ids below are fixed. Every agent reads this file, `docs/chapter-4.md`, `docs/level-11.md` (Eddie, the ghoul, mirrors, the clock and the curse) and `docs/technical-architecture.md`. Types are in `src/core/types.ts` and `src/world/types.ts`, tile chars in `src/core/tiles.ts`.

## Owner's calls (docs/chapter-4.md)

- **Party:** picked on the map, Eddie locked in (mirrors on the route). Max is never required; the Walkman helps.
- **The clocks** stand in Upside Down Hawkins. When one chimes, a hero in the party is cursed. The clock that chimed becomes a target until the fourth chime: Eddie's riff shatters it at once, any hero breaks it with a few hits, and a broken clock lifts its curse and never chimes again.
- **The rooftop solo** is the note highway for a whole song, with the demobats as the pressure. Each miss lets a demobat through to dive at the party. Eddie falls on the roof, for good: he is in no pool after 4.3, and a replay of 4.2 or 4.3 brings him back for that run.
- **Look:** Blue storm (`src/gfx/var/hawkinsud_mix.ts`): blue black roofs, lawns and road, red veins, pale spores, rain; every 6 to 10 s a bolt floods the lit edges red and the wet road streaks bright, then it fades back to blue. Only 4.2's beat turns a room Blood red, so the curses here show on the cursed hero alone.
- **The demobat:** Pale (`demobatFrame('pale', frame)`), 17 by 14, eight frames.
- **Music:** `upside`, then the solo's own track on the roof (`src/solo`, the `rooftop` chart).

## Lead's calls (2026-10-18)

- **The song is played by the player.** `createSolo` from `src/solo` with the `rooftop` chart and `maxMisses: Infinity` (a miss is only a miss on a long song). The play scene runs it over the stage while the sim keeps going.
- **Eddie stands on the roof and is the one the bats dive at.** While the song plays he is the active hero, planted, and nobody can swap. A miss sends one bat of the circling flock down at him (power 0.6). A hit pulses his ring, which kills or stuns the bats inside it. If he falls before the song ends, the party has lost the roof: a wipe, and the retry is from `lights_roof`.
- **After the song, the fall.** The `fall` step plays: the flock takes him, the party is pulled back, and the stage finishes. He leaves the party at once (`Sim.dismissHero`), and progress keeps his level for replays.
- **The clocks are beats.** Each clock curses when the party reaches it (a rect beat with the `curse` step), so the hazard is placed and readable, not random. The curse picks as in 4.2: the active hero, or the next who is neither Eddie nor Max. Three clocks on the route.
- **The storm's flash is a second bake.** `bakeStage(rows, night, 'flash')` paints the lit edges red; the play scene fades it in for a bolt every 6 to 10 s (`stormFlash(frame)` in `world/storm.ts`, pure, seeded by the frame) on a stage with `storm: true`.
- **4.3's Upside Down tiles are chapter 5's too:** 5.2's islands use them for their tops.

## Shape

- Map: about 48 by 40 tiles in `src/world/stages/stage43.ts`, spawns in `stage43_data.ts`. The outer ring is solid.
- Route:
  - the gate tear (start, south-west), where the party comes through into the Upside Down
  - a residential street going east: houses on both sides, lawns, the road, an abandoned car, `clock1` in a yard
  - a side street north with `mirror1` across an alley (Eddie's riff), `clock2` on the corner
  - Forest Hills trailer park (north-east): trailers in rows, a fence, `clock3`
  - Eddie's trailer and its roof (end, north), an arena about 16 by 10 on the roof deck, with a ladder up (`door_roof` shuts behind the party)
- Light: `time: 'night'`, `storm: true`. The dead streetlights, the tear's red glow, the lights props.
- Music: `upside`; the `roof` beat switches to `clock` while the party climbs, and the solo plays its own track.
- `enemyMult` and `xpMult`: see "Result".

## Beats

| Beat | Where | Script id | What happens |
|---|---|---|---|
| `start` | the tear | `l12_start` | Safe start. `lights_tear` is the first save point |
| `street` | the street's west end | `l12_street` | Script, then `wake` `bats1` |
| `clock1` | in front of `clock1` | `l12_clock1` | `curse` `clock1`, the script |
| `mirror_hint` | in front of `mirror1` | `l12_mirror_hint` | Arrival beat of the riff gate |
| `clock2` | in front of `clock2` | `l12_clock2` | `curse` `clock2` |
| `park` | the trailer park's gate | `l12_park` | Script, then `wake` `bats2`. `lights_park` is the second save point |
| `clock3` | in front of `clock3` | `l12_clock3` | `curse` `clock3` |
| `roof` | the roof's ladder, needs `park` | `l12_roof` | `close` `door_roof`, the script. `lights_roof` is the third save point |
| `solo` | after `roof` | `l12_solo` | The script, then `solo` `rooftop`: the song. It waits for the song to end |
| `level_clear` | after `solo` | `l12_fall` | `fall` `eddie`, the script, `finish` |

- Eddie carries `l12_roof` and `l12_solo`: he sends the others down and plays to draw the bats off them. Keep it short and brave, nervous underneath. `l12_fall` is the party's, a few lines, no speech from Eddie after the song.
- Every line is original, fits three rows of 32 characters and has no em dashes.

## Puzzles

| Id | Beat | Prop | Hero | Hint |
|---|---|---|---|---|
| `mirror` | `mirror_hint` | `mirror1` | eddie | MAYBE EDDIE SHOULD PLAY IT A RIFF |
| `clock1` to `clock3` | the clock beats | the clocks | eddie | MAYBE EDDIE CAN SHATTER THE CLOCK |

## The demobat

`EnemyKind` `demobat`, in `src/enemies/demobat.ts`. A flyer. Numbers are starting points against the 4.3 party.

| HP | ATK | DEF | Walk | XP |
|---|---|---|---|---|
| 40 | 30 | 2 | 1.4 | 6 |

- **It flies.** It ignores solid tiles, gaps and props: it moves straight through the air, `z` 10 to 14 over its shadow, and the nav grid never applies. It never lands.
- **It circles, then dives.** It circles the active hero at about 56 px, in its flock, out of melee reach. About every 150 frames one bat of a flock (never two at once in a flock of up to five) winds up for 20 frames under the "!" (pose `crouch`), then dives along the line to where the hero stood: 12 frames at 4 px a frame, `z` falling to 2. Contact deals power 0.8. It climbs back over 30 frames, open to hits while it is low (`z` under 6).
- **Hits while it circles** need reach: ranged shots and beams hit it at any `z`; melee and area attacks only reach it while it is low. Eddie's solo pulses stun it for 40 frames (it falls to `z` 2, pose `stun`, and can be hit by anyone).
- **It dies** in a flash (pose `hurt`, fx `spark`).
- **Run-time bats** come from `burrows` for the roof (the flock that circles Eddie) and pay 1 XP like every run-time spawn.
- **The bot:** a ranged hero leads against a flock, and anyone steps off a dive's line during its wind-up.

## The roof

- **The `solo` step** waits on the play scene: it starts `createSolo({ chart: rooftop, maxMisses: Infinity })`, tells the sim (`Sim.rooftop(true)`), and on each note calls `Sim.soloNote(hit, perfect)`. The solo's end calls `Sim.rooftop(false)` and lets the director go on.
- **The sim while the roof is on:** Eddie is the active hero, planted (anim `cast`), and swaps do nothing. A flock of five bats circles him (run-time, spawned at the start of the song from the roof's burrows, topped back up to five as they die, with no XP). `soloNote(true, perfect)` pulses his ring (Eddie's `pulse`, a crit on a perfect). `soloNote(false)` sends the nearest circling bat into a dive at him. His HP at 0 ends the song and is a wipe.
- **The headless runs** (measure-stage, campaign-run, tests) play the song with `src/solo/bot.ts`: the careful bot at accuracy 0.9, the careless one at 0.7.

## The fall

- **`fall` `eddie`** (a new step): the flock dives on Eddie together (fx), Eddie is dismissed from the party (`Sim.dismissHero('eddie')`, gone from the view and the HUD, his snapshot kept for progress), and the script plays. It does not wait.
- **Progress** keeps Eddie at his best level. `ROSTER` has him for 4.2 and 4.3 only, so a replay of either brings him back and nothing after does.

## Spawns and the XP budget

| Group | Enemies | Notes |
|---|---|---|
| `street` | 3 demodogs, 2 vines, a pod | awake |
| `bats1` | a flock of 4 demobats | dormant until `street` |
| `alley` | 2 ghouls in `mirror1` | awake (Creel's ghouls follow the mirrors) |
| `park` | 2 demodogs, 2 vines, 2 pods | awake |
| `bats2` | a flock of 5 demobats, one elite | dormant until `park` |

Count the XP from `ENEMY_DEFS` before `xpMult` and keep it between 240 and 300. A test enforces it.

Items: four Eggos, three Cokes, 12 quarters. Props: `lights_tear`, `lights_park`, `lights_roof`; `mirror1`; `clock1` to `clock3` (16 by 32, `hits: 3`); `door_roof` (open, shut by the `roof` beat).

## Targets

The same bands as `docs/level-3.md`, "Targets", measured on HARD with `node scripts/measure-stage.ts 4.3 chief 20`. "Boss" runs from the `solo` beat to the finish: the song.

## What Art draws for this level

- **Blue storm** tiles from `hawkinsud_a.ts`, `hawkinsud_b.ts` and `hawkinsud_mix.ts`: `udroad`, `udline`, `udwalk`, `udlawn`, `udveins`, `udhouse`, `udwindow`, `uddoor`, `udroof`, `udtrailer`, `udfence`, `udtree`, `roofdeck`, `roofedge`, by day and night, and their `'flash'` bake (the lit edges red, the road's wet streaks bright). Fix what the chapter doc lists: the house fronts read as flat bands.
- **The demobat**, Pale, from `demobat_kit.ts`: the flap loop, glide, the dive, stunned, hit, with a ground shadow under its `z`.
- **Props:** the clock in an Upside Down yard is the 4.2 clock (no new look needed); an abandoned car and a dead streetlight are tiles or props, Art's call.
- UPSIDE DOWN on the map: a node in the Upside Down half under Hawkins, the route from the Creel House dropping through the horizon to it.
- A `?sheet=1` page.

## What Audio makes for this level

- Effects: `screech` (a demobat's dive), `flap` (a flock passing, soft), `bolt` (the storm's thunder for the flash, low and short).

## What UI builds for this level

- The rooftop's highway is drawn by `src/solo` over the stage; the HUD stays, the controls corner hides during the song.

## Result

To be measured.
