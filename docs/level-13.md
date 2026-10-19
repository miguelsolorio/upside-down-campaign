# Level 13 spec: stage 4.4, Vecna's lair

One stage, five to eight minutes, and the end of chapter 4. The party goes into the Creel House in the Upside Down, the same rooms as 4.2 rotted and overgrown, up the stairs and into the attic, where Vecna floats bound in his vines. He fights in three phases: the clock, the float, the burn. Sim builds Vecna, his memory orbs, his vines, his debris and his curse. Art draws the house's Upside Down skin, the attic in Vine nest and Vecna. World builds the map, the beats and the words. Audio writes Vecna's sounds. UI shows his bar and the orbs. Ids below are fixed. Every agent reads this file, `docs/chapter-4.md` ("Vecna", "The clock curse"), `docs/level-11.md` (the curse, the Walkman) and `docs/technical-architecture.md`.

## Owner's calls (docs/chapter-4.md)

- **Party:** picked on the map from the nine. No Eddie (he fell in 4.3), no Hopper (still in Kamchatka).
- **Look:** the Creel House's Upside Down skin (`creel_b.ts`), then the attic in Vine nest (`attic_a.ts`, `attic_b.ts`, `attic_paint.ts`, `attic_props.ts`, `attic_fx.ts`).
- **Vecna: Rooted** (`src/gfx/var/vecna_scary.ts`, `vecna_kit.ts`), with the four tendrils writhing in an eight frame loop as their own layer under every body frame, a 36 by 62 frame.
- **The fight**, three phases: Clock (100%: walks slowly behind his vines, the clock chimes and curses a hero, memory orbs heal him; break the orbs, the marked one first, burn the vines, the Walkman), Float (60%: rises out of melee reach and throws debris, the vines spread; ranged heroes reach him, breaking the orbs pulls him down), Burn (25%: on fire, the vine whips speed up, the clock chimes twice as fast; keep a hero clear of the curse and finish him).
- **The ways out of a curse:** the Walkman, and the marked memory orb.
- **Music:** `clock`.

## Lead's calls (2026-10-18)

- **Nobody is locked in.** Every way through works with any four: the orbs pull him down for the melee heroes, and the vines burn or break.
- **Vecna's kit takes a speed factor and a chime interval** from his spawn (`x` on an enemy spawn overrides his def's numbers for that spawn), because 5.3's first phase is "4.4's Vecna, faster, chiming every 12 s".
- **The curse in the fight** takes a random standing hero who isn't cursed, never the last one standing. The orb that lights up red when it chimes is the marked one: breaking it lifts that curse.
- **The orbs grow back.** A broken orb regrows after 20 s, so a party with no ranged hero can always pull him down again in Float.
- **The chapter's end:** CHAPTER FOUR CLEAR. No epilogue in this pass (a follow-up, with its own still).

## Shape

- Map: about 48 by 40 tiles in `src/world/stages/stage44.ts`, spawns in `stage44_data.ts`. `skin: 'upside'`: the Creel House's letters bake in their Upside Down paint.
- Route: the porch and the foyer (start), the hall, the parlor with its broken mirrors and the clock (no curse here), the dining room, the stairs up, the upstairs landing, the attic (end, north), an arena about 18 by 12.
- Light: `time: 'night'`. The red window, spores, the lights props.
- Music: `upside` on the route, `clock` from the `vecna` beat.

## Beats

| Beat | Where | Script id | What happens |
|---|---|---|---|
| `start` | the porch | `l13_start` | Safe start. `lights_porch` is the first save point |
| `house` | the foyer | `l13_house` | Script, then `wake` `foyer` |
| `stairs` | the foot of the stairs | `l13_stairs` | Script, then `wake` `landing`. `lights_landing` is the second save point |
| `vecna` | the attic, needs `stairs` | `l13_vecna` | `close` `door_attic`, `music` `clock`, the script, `wake` `boss` |
| `float` | event `phase` 2 on spawn `vecna` | `l13_float` | Script only |
| `burn` | event `phase` 3 on spawn `vecna` | `l13_burn` | Script only |
| `level_clear` | cleared `boss` | `l13_clear` | The script, `open` `door_attic`, `finish` |

- Vecna speaks in `l13_vecna`, `l13_float` and `l13_burn`: slow, certain, a few words each. Every line original, three rows of 32 characters, no em dashes.

## Vecna

`EnemyKind` `vecna` (the body) and `orb` (a memory orb), in `src/enemies/vecna.ts`, `vecna_phase.ts` and `orb.ts`. One body, `vecna`, and four orbs, `orb1` to `orb4`, all in group `boss`, dormant until the `vecna` beat. Numbers are starting points.

| | HP | ATK | DEF | Walk | XP |
|---|---|---|---|---|---|
| Vecna | 1000 | 32 | 7 | 0.4 | 150 |
| Orb | 80 | 0 | 2 | 0 | 0 |

- **Clock (100% to 60%).** He walks slowly at the active hero. Every 120 frames, in reach, a vine whip: a 24 frame wind-up, a lash along a 60 px line, power 0.7. Every `chimeEvery` frames (900, 15 s) the attic's clock chimes and curses a hero (`curse` rules, `docs/level-11.md`, with this fight's pick) and one standing orb is marked (`ActorView.marked`). Each standing orb heals him 1% of his max HP every 120 frames.
- **Float (60%).** He rises (`z` 24, pose `leap`): melee and area attacks can't reach him, ranged shots and beams can. Every 150 frames he throws debris at the active hero (a lobbed rock, power 0.8, a 20 px splash, warned by a shadow mark). Breaking an orb pulls him down for 300 frames (pose `stun`, takes x1.5).
- **Burn (25%).** On fire (an fx over him): the whip comes every 80 frames, and the clock chimes every `chimeEvery / 2`.
- **The phases** emit `{ t: 'phase', spawnId: 'vecna', phase }` once each (2 at 60%, 3 at 25%), and the boss bar is `{ name: 'VECNA', hp, hpMax, parts }`, parts the four orbs' HP shares.
- **The orbs** are rooted, can be hit by anyone, break at 0 HP (no kill: they stay as a stalk, can't be hit) and regrow after 1200 frames at full HP. Breaking the marked orb lifts its curse (`curseEnd` with how `orb`).
- **His kit's tuning:** `speedMul` (1) scales his walk, whip and throw timings; `chimeEvery` (900) sets the chime. A spawn's `x` overrides either.
- **The boss rules:** no knockback, no confusion, traps don't hold him. He dies only by HP.
- **The bot:** it breaks the marked orb first when someone is cursed and the Walkman isn't ready, steps out of a whip's line and a debris mark, uses its ranged heroes in Float or breaks an orb to pull him down, and otherwise hits him.

## Spawns and the XP budget

| Group | Enemies | Notes |
|---|---|---|
| `foyer` | 3 demodogs, 2 vines | dormant until `house` |
| `landing` | 2 demodogs, 2 pods, a demobat flock of 3 | dormant until `stairs` |
| `boss` | Vecna, four orbs | dormant in the attic |

Keep the XP from `ENEMY_DEFS` before `xpMult` between 260 and 320. Items: four Eggos, three Cokes, 12 quarters. Props: `lights_porch`, `lights_landing`, `door_attic` (open, shut by the `vecna` beat), `clock_attic` (the attic's clock, solid, never broken).

## Targets

The same bands as `docs/level-3.md`, "Targets", measured on HARD. "Boss" runs from the `vecna` beat to the finish, about half the run. The pace: the lead ends chapter 4 at Lv 10.

## What Art draws for this level

- The Creel House's Upside Down skin (`bakeStage(rows, night, 'upside')` paints the creel letters from `creel_b.ts`'s Upside Down kit), and the attic in Vine nest: `atticroof`, `atticwall`, `atticfloor`, `atticrug`, `atticeave`, with the vines hanging into the knot over the middle and the roots from the orbs.
- Vecna, Rooted, every pose (stand, walk, the curse, float, the throw, burning, the whip, hurt) with the tendril layer looping under each, and a portrait.
- The orb (standing, marked red, broken stalk), the debris and its shadow, the whip's line, the fire over him.
- VECNA'S LAIR on the map: the Creel House's Upside Down twin in the lower half, under 4.2's node.

## What Audio makes for this level

- Effects: `whip` (a vine lash), `orb` (an orb breaking, glassy and wet), `debris` (a throw and its landing), `vecna` (his low call as he changes phase). His speech blip: very low, slow, with a crackle.

## What UI builds for this level

- The boss bar with four orb pips (`parts`), the marked one red.

## Result

Measured with `node scripts/measure-stage.ts 4.4` on HARD (`chief`) at `enemyMult` 1.7, with the party a real run brings (Mike 9, Dustin 8, Robin 7, Eleven 5). "Boss" runs from the `vecna` beat to the finish.

| | Chief, 20 seeds | Chief, 100 seeds | Careless, chief | Careless, 100 | Kid | Upside | NORMAL |
|---|---|---|---|---|---|---|---|
| Cleared | 20 | 100, none stuck | 15 | 86 | 20 | 15 | 20 |
| Damage taken | 259 | 247 | 564 | 546 | 177 | 534 | 218 |
| KOs | 0.05 | 0.15 | 2.75 | 2.59 | 0.05 | 2.30 | 0 |
| Lowest party HP | 65% | 68% | 19% | 19% | 75% | 28% | 72% |
| Time | 119 s | 113 s | 115 s | 114 s | 100 s | 112 s | 107 s |
| Boss time | 52 s (43%) | 47 s (41%) | 52 s | 52 s | 35 s | 54 s | 42 s |

Stage XP is 280 before `xpMult` 2.9, so it pays about 810: the lead ends chapter 4 at Lv 10 (`docs/pace.md`).

- **The first Vecna was long and safe for the careful bot**: 1400 HP and soft telegraphed hits, a 100 s fight it won every time at 74% HP. He is 1000 HP and 32 ATK now, the lash winds up in 14 frames for half his ATK and reaches 72 px across a 28 px band, and the rocks splash 28 px for 0.6.
- **Chief sits above the band, to keep the careless floor.** Every attack of his is telegraphed, and the careful bot steps out of nearly all of them: it clears 100 of 100 at 68% lowest HP at any factor where the careless bot still clears 12 of 20. At 1.8 the careless bot fell to 50 of 100; at 2.0 the careful one first lost (18 of 20) and the careless one cleared 3.
- **A killing blow plays the phases it crossed**: a big hit from above 25% to 0 used to skip Burn and its script. Vecna now moves through every phase line he passed, in order, before he falls (`combat/kills.ts`).
- **The orbs regrow** after 20 s, so a party without a ranged hero can always pull him down in Float; no hero is locked in.
