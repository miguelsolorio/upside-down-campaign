# Bonds

Small bonuses for heroes who are in the party together (`docs/game-design.md`, "Bonds"). The names are nods to the show, and the wording round them is the game's own.

## The seven

| Bond | Who | What it gives | Status |
|---|---|---|---|
| Friends don't lie | Mike and Eleven | Both +10% ATK. Mike's DM screen covers Eleven too: while it stands, a hit on her anywhere within 32 px of the dome is halved, from any side, not only along the line of fire | On |
| Party of four | Mike, Dustin, Lucas and Will, all four | All four +8% DEF | On |
| Mad Max | Lucas and Max | Both +10% SPD: walk pace and the basic's cooldown | On |
| Babysitter's club | Steve and Dustin | Every Babysit also heals Dustin a fifth of his max HP, benched or leading. A KO'd Dustin stays down | On |
| Scoops troop | Steve and Robin | Both +10 points of crit chance | On |
| Chief and kid | Hopper and Eleven | Both +10% DEF | On (chapter 5 only: Hopper is in no other pool with Eleven) |
| Hellfire | Eddie and Dustin | Eddie's solo lasts 2 s longer (120 frames, 360 to 480) | On (4.2 and 4.3: Eddie falls on the 4.3 roof) |

A bond counts while every member is **in the party**: led or on the bench, up or down. It follows the roster and never the active slot. Swapping, a KO and a long fight change nothing, and a hero who joins mid-stage (Eleven in 1.1) completes a bond on the next tick. Bonuses from two bonds add. "+10% ATK" multiplies like Mike's Rally does (ATK x 1.1, then Inspiration and Rally on top), "+8% DEF" multiplies like Babysit's party DEF, "+10% SPD" multiplies the speed factor (the 1.5% a point of SPD, times 1.1), and crit is points added to the 5% base, as Sharp eye's 15% is.

## Where it lives

- `src/heroes/bonds.ts`: the rules and the data, pure. `BONDS` (each with its `name`, corner `tag`, short `perk`, a sentence `text`, `heroes`, `on` and what each member `gives`), `activeBonds(party)`, `bondsOf(id)`, `missingFrom`, `gainedBonds(before, after)`, `modsFor(party, id)` (the sum for one hero, a `BondMods`) and `bondRows` (the sheet's lines). `BondHero` is just `HeroId` now that Hopper and Eddie are on the roster.
- `src/combat/bonds.ts`: the one hook into combat. `applyBonds(s)` runs first in every tick (`combat/sim.ts`) and writes `modsFor` onto each hero as `hero.bond` whenever the roster changed (a string compare otherwise). Nothing else in combat knows who is paired with whom. It reads `hero.bond` through the places that already read a stat: `heroAtk` and the crit roll (`combat/damage.ts`), `heroDef` (`heroes/steve_guard.ts`), `speedFactor` (`heroes/common.ts`), plus the three that are not a stat: `babysitHeal` (called from `heroes/steve.ts` when Babysit lands), `screenCovers` (`hurtHero`, so the DM screen halves a hit on a covered Eleven) and `standLife` (`heroes/eddie_solo.ts`: the Hellfire solo's length is the Special's 360 frames plus `hero.bond.solo`).
- `Hero.bond` (`combat/state.ts`) starts as the shared frozen `NO_MODS`, so a hero built on its own has none until the sim ticks.

## Showing them

- **Picks panel** (`ui/picks_logic.ts`, `ui/picks.ts`). A picked hero in an active bond has a green tag in the corner of the card (the bond's `tag`, or N BONDS for several). Under the legend, in START's row, a tiny line says what the cursor is on: on a bonded hero, that hero's bonds with their perks; on an unpicked hero who would complete one, `ADDS` and the bond in yellow (only while a slot is free); anywhere else the party's bonds, names only when there are two. The line never runs wider than the space beside START (`BOND_LINE_W`, 169 px), and falls back from name and perk to the name, then a count. The tiny 3 by 5 font gained `'`, `+`, `%`, `,`, `:`, `.` and `-` for it.
- **Character sheet** (`ui/charsheet.ts`, `ui/charsheetlayout.ts`). A BONDS label under the portrait and a line for each of the hero's bonds beside it: green with the perk when the party has it, slate with who it still needs when not. Up to three lines (`BOND_MAX`). The stats and moves moved down to make room, and `MOVE_PITCH` went from 20 to 18.
- **Stage callout** (`world/bondbanner.ts`, drawn by `world/play.ts`). A strip under the HUD for 4 s of free play (the talk before the first step doesn't count): BOND and the name in yellow, the perk under it. A bond is announced once a visit, so a retry doesn't repeat it, and a hero who joins mid-stage and completes one brings it up then. At most three at once.

## Chapter 4: Chief and kid and Hellfire are on

Both bonds went on once Hopper and Eddie were playable (2026-10-19). What that took:

1. `'hopper'` and `'eddie'` are in `HeroId` (`core/types.ts`), so `BondHero` is an alias of it.
2. `on: true` on `chief-and-kid` and `hellfire` in `src/heroes/bonds.ts`. Hopper's and Eleven's DEF is live through `heroDef`, and the picks panel, the sheet and the callout list them the way they list the other five, with no change to any of the three (`tests/bonds.test.ts` checks the tags, the lines and the widths over every four of Eddie's pool and of Hopper's).
3. **One source for the Hellfire solo.** `standLife` (`heroes/eddie_solo.ts`) was a stand-in that gave 480 frames whenever a `dustin` sat in `s.heroes`, which counted the bond a second way. It is now `HERO_DEFS.eddie.special.dur + h.bond.solo` (360 + `SOLO_EXTRA`, 120), and `x.bond: 480` is gone from the Special's table. The numbers did not move: a party with Dustin still plays 480 frames, one without 360, a benched or KO'd Dustin still counts (a bond follows the roster), and with Hellfire switched off Dustin buys nothing (`tests/bonds-combat.test.ts` flips `on` for a moment to prove it). The highway still sets its own length, so a driven stand holds until the riff ends.
4. The "off" assertions in `tests/bonds.test.ts` are now "all seven are on", plus a test that a bond with `on: false` never counts (it flips the two off for a moment and restores them in `finally`).
5. The character sheet fits three bond lines. Dustin has Party of four, Babysitter's club and Hellfire, which is exactly three, and no hero has more. Eleven has two (Friends don't lie and Chief and kid).
6. Re-measured, below.

Which party can hold which pair. Hopper plays 4.1 alone and is in no pool until chapter 5, so Chief and kid is a chapter 5 bond, and only when the player picks Eleven for 5.1, 5.2 or 5.3 (the default parties, which the bot and `?stage=` use, never have both: 5.1's has Hopper without Eleven, 5.2's and 5.3's have no Hopper). Eddie is locked into 4.2 and 4.3 and in no pool after them, so Hellfire is a 4.2 and 4.3 bond, and the default party there already holds Eddie and Dustin.

## Balance

The bonuses are small on paper, and the measured stages agree: a party's ATK, speed or crit up by a tenth moves a clear rate by a few points and the KOs by a tenth. Measured on HARD (`chief`) with `scripts/measure-stage.ts` over 100 seeds (200 where noted), the bot keeping the lead. "Before" is the same code with `applyBonds` off. Each cell is cleared, damage, KOs, lowest party HP and time.

| Stage | Before | With bonds | Shipped |
|---|---|---|---|
| 1.1, 3.1, 3.2 | | 1.1 takes 43 damage, not 41. 3.1 and 3.2 have no bond in their parties: the same to the digit | unchanged |
| 1.2 | 97, 234, 0.57, 45%, 125 s. Careless 78 | 97, 223, 0.34, 47%, 120 s. Careless 80. KOs under their band, lowest HP over it | `enemyMult` 1.3 to 1.36: 98, 230, 0.64, 45%, 125 s. Careless 79, upside 36 |
| 1.3 | 98, 234, 0.96, 38%, 97 s. Careless 67 | 96, 229, 1.13, 40%, 94 s. Careless 83 (the careful bot is where it was, the careless one wins more) | unchanged: every band holds |
| 2.1 | 92, 216, 1.33, 40%, 98 s. Careless 92 | 92, 211, 1.24, 41%, 98 s. Careless 93. Party of four is live | unchanged |
| 2.2 | 93, 264, 1.50, 35%, 105 s. Careless 92 | 91, 273, 1.75, 33%, 107 s. Careless 90. Babysitter's club is live | unchanged |
| 2.3 | 87, 361, 0.55, 40%, 109 s. Careless 93 | 179 of 200, 354, 0.40, 46%, 109 s. Careless 189 of 200. KOs under their band, lowest HP over it | `enemyMult` 1 to 1.04: 88, 369, 0.61, 43%, 109 s. Careless 94, upside 29 |
| 3.3 | 99, 314, 0.44, 50%, 124 s. Careless 64 | 200 of 200, 280, 0.34, 51%, 110 s. Careless 129 of 200 | `enemyMult` 1.6 to 1.65: 98, 283, 0.38, 50%, 115 s. Careless 72, upside 33 |

Every pull-back was found by running the stage at several `--mult=` values and taking the one that put the careful bot's numbers where they were without sending the careless bot or upside under their floors (at least 12 of 20 and 4 of 20). 3.3 at 1.7 has KOs 0.49 but upside clears 38 of 200, under its floor, so 1.65 it is. 3.3's KOs and lowest HP were outside their bands before (`docs/level-9.md`) and still are, a little less so on HP. Over 100 seeds on every stage, kid clears 100, upside clears 29 to 75, careless clears 72 to 100, and NORMAL clears at least 99.

**The pace holds, with two numbers moved to keep the test's sample honest.** Over 40 seeds the carried run's lead ends chapter 3 with 1642 XP on average without bonds and 1641 with them, and 5 of 40 under Lv 8's line in both. The bonds don't move the pace. What they move is which seeds land short, and `tests/pace.test.ts` reads ten of them and allows one under the line and none more than 30 XP short. With bonds the bottom seed read 1482, 50 short. 3.3 pays more (`xpMult` 2 to 2.25: 556 to 626 XP for the stage), which lifts the whole spread (40 seeds: minimum 1521, a tenth of them under 1578, mean 1708, still short of Lv 9's 2149) and the test goes green on its own seeds. `ARRIVAL` took four Dustin entries: Lv 5 with 22 XP into 2.2 (it was Lv 4 with 172, 365 XP, 18 under the Lv 5 line, and a run's median is now 387 over 40 seeds and 440 over the test's ten), and 2.3, 3.2 and 3.3 with 30 to 40 XP more, from the same runs. Nobody else's entry moved.

Some tests pinned a fight bonds changed, and were moved, never loosened: the burst's first sweep (3 x 9.9 ATK for Mike and Eleven), the Demogorgon's stun, the Flayer's open head and the Grigori bot's window all read `heroAtk` or the bonded range now. The Grigori bot fight stops at 1500 frames, not 1800, because Grigori's second phase (and the damage the bot takes in it) now starts around frame 1690. The 3.3 scene test's seed went from 15 to 21, the seed on which Eleven falls in the new numbers.

Two things the numbers say about the design. DEF is subtracted at half weight from a hit, so +8% DEF is about 3% less damage taken: Party of four is the quietest bond, as the spec wrote it. And Friends don't lie is the strongest in practice because Mike leads: it is the one that needed pulling back twice.

### Chapter 4 and 5: Chief and kid and Hellfire

Measured on HARD (`chief`) with `scripts/measure-stage.ts <stage> chief 20` and `--careless`, and `scripts/measure-campaign.ts chief 5`, against the same code with both bonds off (`git archive` of the commit before). **Hellfire changes nothing a measurement can see**: it replaces a Dustin check that gave the same 480 frames, so 4.2 and 4.3 are the same to the digit in every party, the careful bot and the careless one. **Chief and kid does not form in any default party**, so 4.1 to 5.3 and the carried run (`measure-campaign.ts chief 5`, every line of the table, the arrival medians and the pace summary: the lead is Lv 9.8 after 4.4 and Lv 12 after 5.3) also came back to the digit, and no `enemyMult` moved:

| Stage | Chief, 20 seeds: cleared, damage, KOs, lowest HP, time | Careless, 20 seeds |
|---|---|---|
| 4.1 (no pair possible) | 16, 146, 0.20, 21%, 123 s | 19, 148, 0.05, 33%, 106 s |
| 4.2 (Eddie and Dustin: Hellfire on) | 17, 256, 1.85, 39%, 67 s | 13, 342, 2.65, 23%, 69 s |
| 4.3 (Eddie and Dustin: Hellfire on) | 20, 301, 1.50, 41%, 129 s | 18, 360, 1.35, 46%, 125 s |
| 4.4 (no pair possible) | 20, 266, 0.30, 66%, 118 s | 20, 522, 1.30, 27%, 110 s |
| 5.1 (Hopper, no Eleven) | 19, 668, 0.80, 37%, 143 s | 19, 867, 1.85, 20%, 127 s |
| 5.2 (no Hopper) | 18, 467, 1.15, 27%, 140 s | 19, 620, 1.10, 36%, 136 s |
| 5.3 (no Hopper) | 18, 523, 2.85, 38%, 131 s | 11, 617, 2.80, 42%, 116 s |

Those are the same with the bonds off and on, so every band is where it was (chapter 5's damage is over 150 to 320 for the reason `docs/level-14.md` gives, as before).

To see Chief and kid at work the stages were also run with a party that holds the pair, the same party with the bond off as the control, over 20 and 100 seeds (`--party=`, Mike leading; 5.1 Mike 10, Dustin 9, Hopper 8, Eleven 7, which swaps Robin for her; 5.2 Mike 10, Hopper 8, Eleven 7, Will 8; 5.3 Mike 11, Hopper 8, Eleven 8, Will 8). These are weaker parties than the default ones, so their absolute clear rates are lower in 5.3 and not what the bands were set on. 100 seeds, cleared, damage, KOs, lowest HP, time:

| Stage | Bond off | Bond on |
|---|---|---|
| 5.1 | 97, 618, 1.18, 41%, 143 s. Careless 52 | 99, 602, 1.14, 42%, 142 s. Careless 52 |
| 5.2 | 80, 511, 1.83, 26%, 153 s. Careless 94 | 86, 501, 1.63, 28%, 158 s. Careless 95 |
| 5.3 | 65, 589, 3.38, 26%, 126 s. Careless 71 | 70, 587, 3.27, 27%, 130 s. Careless 66 |

+10% DEF on two of four heroes is worth 2 to 6 clears in 100 and a tenth of a KO, about what the other bonds measured, and it stays inside the bands each stage was tuned to (5.1 at 99 of 100 is the top of the band but 97 without the bond, and its lowest HP is still under 45%). A retune of `enemyMult` for a pair the player has to pick would have moved the default party, which the bot and `?stage=` use, and which is unchanged. So no stage was retuned, and `tests/pace.test.ts` is green as it was.

## Tests

`tests/bonds.test.ts` (rules, data, words, the picks panel's tags and line for every four of nine heroes and every cursor place, and for every four of Eddie's pool and of Hopper's, the sheet's lines and layout, the callout) and `tests/bonds-combat.test.ts` (the sim: bonds land on a tick, follow the roster, a joiner completes one; ATK with Inspiration, DEF with Babysit, speed and cooldown, crit over 2000 hits, Babysit's heal for a benched, KO'd and full Dustin, the DM screen's cover near, far and gone, Chief and kid's DEF, and the Hellfire solo's 480 and 360 frames with the bond as the only source).
