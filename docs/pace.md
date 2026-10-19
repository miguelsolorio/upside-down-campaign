# Pace

How fast the party levels over a real run, measured over the stages built so far (1.1 to 4.4). The target is in `docs/game-design.md`, "Leveling rules": Lv 4 after chapter 1, 6 after 2, 8 after 3, 10 after 4. `tests/pace.test.ts` holds the run to it.

## What the target means

"Lv 4 after chapter 1" is the lead: the hero with the most XP when the chapter's last stage is cleared. The active hero earns full XP and the bench earns half, so the rest of the party can sit a level under the lead. A hero who joins late in a chapter starts behind by design and catches up on replays.

The test checks two players:

- **Keeps the lead.** The bot as it is: Mike leads unless he is hurt or a gate needs someone else, so he takes most of the XP. The lead is at the target in every seed, the rest of the party at most a level under it.
- **Shares the lead.** The same bot handing the lead to the next hero every 20 s. The XP spreads, so the best hero lands at the target or just short of it.

## Measuring

```bash
node scripts/measure-campaign.ts chief 20
```

`scripts/measure-campaign.ts` plays 1.1 to 3.2 with the bot and carries the party between stages the way the game does: `partyFor` builds each party, the map's picks panel is confirmed as it opens, and `recordClear` keeps every hero at their best. Inside a stage it does what a person does: it lights each string of lights it passes (half heal, new save point) and, after a wipe, retries from the last lights with levels, XP and kills kept. It prints each hero's level and XP after every stage, what a real run walks into each stage with next to the `?stage=` seeds, and new seeds for `ARRIVAL` in `core/campaign.ts`. `--rotate=20` shares the lead, `--careless` uses the bot that never dodges, `--picks=mike,dustin,max,steve` sets the party for 2.2 and 2.3.

The run itself is `scripts/campaign-run.ts`, which the test imports.

## Result

Each stage's `xpMult` scales what its enemies are worth (rounded per enemy, at least 1; the run-time pups of 2.3 stay at 1). It moves a stage's XP without changing who is in it.

| Stage | `xpMult` | Pays | Was |
|---|---|---|---|
| 1.1 | 1 | 144 | 144 |
| 1.2 | 0.4 | 146 | 360 |
| 1.3 | 0.7 | 101 | 140 |
| 2.1 | 1.5 | 260 | 166 |
| 2.2 | 1.5 | 258 | 166 |
| 2.3 | 1.6 | 233, with 26 in pups | 156 |

A run earns a little less than a stage pays: pods that burst, a camera group that stays asleep and the 2.2 cache the bot walks past.

Level after each stage, 20 seeds on chief, the bot keeping the lead. The mean, with the range when it varies. A blank is a hero who sat the stage out: they keep their level.

| Stage | XP earned | Mike | Dustin | Lucas | Eleven | Will | Max | Steve |
|---|---|---|---|---|---|---|---|---|
| 1.1 | 144 | 3 | 2 | 2 | 2 | | | |
| 1.2 | 144 | 4 | 3 (3 to 4) | 3 | 3 | | | |
| 1.3 | 101 | 4 | 3.7 (3 to 4) | 3.5 (3 to 4) | 3.2 (3 to 4) | | | |
| 2.1 | 244 | 5 | 4.3 (4 to 5) | 4.3 (4 to 5) | | 3.4 (3 to 4) | | |
| 2.2 | 238 | 5.6 (5 to 6) | 5 | | | | 4 | 4 |
| 2.3 | 221 | 6 | 5.3 (5 to 6) | | | | 4 (4 to 5) | 4 (4 to 5) |

Mike ends chapter 1 with 302 to 370 XP (Lv 4 is 193 to 382) and chapter 2 with 742 to 922 (Lv 6 is 661 to 1039).

Sharing the lead, everyone ends chapter 1 at Lv 4 (Eleven, who joins in 1.1, at 3 or 4), the best hero with 235 to 266 XP. Chapter 2 ends with Mike at 5.5 and Dustin at 5.8 on average: the best hero has 659 to 812 XP, Lv 6 in 19 runs of 20 and 2 XP short of it in the last. The test asks for Lv 6 in seven of its ten and no more than 25 XP short in any.

Before this pass, the same run:

| Stage | XP earned | Mike | Dustin | Lucas | Eleven | Will | Max | Steve |
|---|---|---|---|---|---|---|---|---|
| 1.1 | 144 | 3 | 2 | 2 | 2 | | | |
| 1.2 | 358 | 4.9 (4 to 5) | 4 | 4 | 4 | | | |
| 1.3 | 140 | 5 | 4.2 (4 to 5) | 4.2 (4 to 5) | 4 | | | |
| 2.1 | 155 | 5.4 (5 to 6) | 5 | 5 | | 3 | | |
| 2.2 | 154 | 5.9 (5 to 6) | 5 | | | | 3 | 3 |
| 2.3 | 148 | 6 | 5.3 (5 to 6) | | | | 4 | 4 |

The Lab took the lead to Lv 5 a stage early, so chapter 1 ended a level over. Chapter 2 hit Lv 6 only for a player who kept one lead: shared, the best hero ended it at Lv 5.

## Arrival

A `?stage=` jump now starts with the party a real run brings, levels and XP, the medians of a 40-seed run (`ARRIVAL` in `core/campaign.ts`). Rerun the script and paste its `ARRIVAL` lines when stage XP changes.

| Stage | Was | Now |
|---|---|---|
| 1.2 | all four Lv 3 | Mike 3, Dustin 2, Lucas 2, Eleven 2 |
| 1.3 | 5, 4, 4, 4 | 4, 3, 3, 3 |
| 2.1 | 5, 5, 4, Will 3 | 4, 4, 3, Will 2 |
| 2.2 | Mike 6, Dustin 5, Max 4, Steve 4 | 5, 4, 3, 3 |
| 2.3 | 6, 5, 4, 4 | 6, 5, 4, 4 |

Every stage was measured again at these seeds (each stage doc's "After the pace pass"). Only 1.3 moved out of its bands: its careless bot cleared 3 of 20. Its `enemyMult` went from 1.7 to 1.5, which puts it back where it was: 98 of 100 on chief, the careless bot 67 of 100, upside 51 of 100.

## Gaps

- **Closed in the balance pass** (`TODO.md`, "Balance pass"). 2.1 on upside clears 35 of 100 (it was 18, under the floor of 4 of 20), and 2.3 on chief clears 89 of 100 (it was 98, at the top of the band). The Lab's careless bot at 78 of 100 is not a stall: the losses are the Warden, and the party arrives a level lower. None of it moves the carried run: the medians are still within 25 XP of `ARRIVAL`, where the test allows 40.
- **A bot that dodges demodogs would move the run.** The careful bot never dodges a lunge (it only backs off vines and pods), so in 2.1 and 2.2 it clears about as often as the careless one. A bot that does keeps Mike healthier, he swaps out less, and the XP split between Mike and Dustin moves 48 to 100 XP against `ARRIVAL` at every stage factor tried. It needs `ARRIVAL` regenerated, so it waits for a decision (`TODO.md`).
- **Recruits start low.** Will joins 2.1 at Lv 2, and Max and Steve join 2.2 at Lv 3: the recruit rule, the average minus one, of a party that is now a level lower. With the default picks Lucas and Will sit out 2.2 and 2.3, so they end chapter 2 at Lv 4 and 3. Dropping the minus one puts them at 3 and 4 and ends the chapter with the party average at 5.3, not 4.85, the lead unmoved (`TODO.md`, for the owner to decide, since it moves `ARRIVAL` and chapter 3).
- **The bot opens gates by flag,** so it never swaps for a puzzle. A person has to, so even one who keeps the lead spreads more XP than the bot does. The bot's lead is the most XP a hero can have at each point.
- **MADMAX's prize** (25 XP for beating her at Dig Dug in 2.1) is not in the run, since the bot doesn't play the cabinets. It is a tenth of a level at that point.
- Nobody has played a carried run by hand.

## Chapter 3 (Levels 7 and 8)

The run now carries on through 3.1 and 3.2 (`docs/level-7.md`, `docs/level-8.md`). Their stage XP is the spec's, 207 and 236, with no `xpMult`.

- **Newcomers walk in.** Nobody is locked in 3.1, so the picks panel used to open on chapter 2's party and the run played 3.1 with Mike, Dustin, Max and Steve. Now a hero who joins at a stage and hasn't been met yet takes one of the last picks that aren't the lead (`JOINS` in `core/campaign.ts`): the run plays 3.1 and 3.2 with Mike, Dustin, Robin and Nancy.
- **Arrival:** 3.1 is Mike 6, Dustin 5, Robin 3, Nancy 3. 3.2 is Mike 7, Dustin 6, Robin 3, Nancy 3.
- **Pace:** the lead ends 3.2 at Lv 7, the party at 5.3 on average. The target is Lv 8 after chapter 3, so 3.3 has a level to give.

## Chapter 3's end (Level 9)

3.3 closes the chapter (`docs/level-9.md`). It pays 278 XP before its `xpMult` of 2, so 556, the most of any stage: the lead comes out of 3.2 at Lv 7 with about 1220 XP and needs 1532 for Lv 8.

- **Eleven catches up.** The run plays 3.1 and 3.2 without her, so she would come back to 3.3 at the Lv 3 chapter 1 left her, locked in next to a Lv 7 Mike. She walks in at the level of the party she joins, averaged and less one (`CATCH_UP` in `core/campaign.ts`): Lv 4.
- **Arrival:** 3.3 is Mike 7, Dustin 6, Robin 4, Eleven 4.
- **Pace, keeping the lead** (10 seeds, the test's): the lead ends chapter 3 at Lv 8 in nine runs of ten, with 1505 to 1825 XP. The tenth is 27 XP short, a kill or two: the boss fight spreads the XP by who it leaves standing, and when Mike is down a while Dustin and Eleven take his share. `tests/pace.test.ts` asks for Lv 8 in nine of ten and never more than 30 XP short. Over 40 seeds the lead averages 7.9 and the party 6.25.
- **Why one stage pays so much:** 3.1 and 3.2 are measured and merged at their own XP, and changing them moves both their `ARRIVAL` lines and their bands. The level chapter 3 owes is paid where it ends, the way the boss stages of chapters 1 and 2 paid the most of theirs.


## Lv 6 talents

The heroes' Lv 6 talents (`docs/game-design.md`) and the bot's use of them change what a Lv 6 hero does inside a stage, so every stage and the carried run were measured again. Only a stage with a hero at Lv 6 or more can move: 2.2 (Mike gets there late), 2.3, 3.1 and 3.2. Robin, Nancy, Eleven, Will, Max and Steve are under Lv 6 in every stage built so far, and 1.1 to 2.1 came back to the digit.

Over 100 seeds, the bot keeping the lead (`node scripts/measure-stage.ts <stage> chief 100 [--careless]`):

| Stage | Chief before, after | Careless before, after | What was done |
|---|---|---|---|
| 2.2 | 93, 93 | 92, 91 | Nothing moved |
| 2.3 | 89, 76 | 87, 89 | Eleven's HP 95 to 110: chief 87 (`docs/level-6.md`) |
| 3.1 | 96, 97 | 94, 79 | Nothing: every band holds, NORMAL took more damage (`docs/level-7.md`) |
| 3.2 | 97, 98 | 80, 95 | `enemyMult` 1.1 to 1.15: chief 97, careless 81 (`docs/level-8.md`) |

The carried run (`node scripts/measure-campaign.ts chief 20`, the bot keeping the lead), level after each stage as a mean, with the lead's level after each chapter:

| Stage | XP earned | Wipes | Mike | Dustin | Party average |
|---|---|---|---|---|---|
| 1.1 | 144 | 0.0 | 3 | 2 | 2.25 |
| 1.2 | 144 | 0.0 | 4 | 3 | 3.26 |
| 1.3 | 101 | 0.0 | 4 | 3.7 | 3.59 |
| 2.1 | 248 | 0.0 | 5 | 4.4 | 4.24 |
| 2.2 | 238 | 0.0 | 5.6 | 5 | 4.65 |
| 2.3 | 212 | 0.1 | 6 | 5.3 | 4.85 |
| 3.1 | 207 | 0.0 | 6.5 | 6 | 4.74 |
| 3.2 | 238 | 0.0 | 7 | 6 | 5.25 |

- **Keeping the lead,** the lead is Lv 4 after chapter 1, 6 after chapter 2 and 7 after chapter 3.
- **Sharing it** (`--rotate=20`), the best hero is Lv 4, 6 and 6.5 (6 to 7), with the party at 3.98, 4.96 and 5.14 on average. Chapter 2 is Lv 6 in all 20 runs, where it was 19 of 20.
- **`ARRIVAL` stays.** Every median is within 26 XP of `ARRIVAL` (the most is Mike into 3.1: 224 against 198), under the test's 40, so nothing is pasted. `tests/pace.test.ts` is green.
- **A carried run on NORMAL** (`measure-campaign.ts normal 10`) clears every stage with no wipes, with the same lead: 4, 6 and 7.
- **Chapter 3 still ends a level short of 8:** the lead is Lv 7 after 3.2.

## After the bonds

Bonds (`docs/bonds.md`) change what a party does inside a stage, so every stage and the carried run were measured again. The pace itself did not move: over 40 seeds the lead ends chapter 3 with 1642 XP on average without bonds and 1641 with them, and 5 of 40 land under Lv 8's line either way. What bonds shuffle is which seeds land short. `tests/pace.test.ts` reads ten of them, allows one under the line and none more than 30 XP short, and with bonds the bottom seed read 1482.

- **3.3 pays more.** `xpMult` 2 to 2.25, so the stage pays 626 XP, not 556. Over 40 seeds the lead now ends chapter 3 with 1708 XP on average (minimum 1521, a tenth of the runs under 1578), where Lv 9 is 2149. The same ten seeds clear the test on their own.
- **`ARRIVAL`: four Dustin entries.** Into 2.2 he is Lv 5 with 22 XP (365 XP before, 405 now: a run's median is 387 over 40 seeds and 440 over the test's ten); into 2.3, 3.2 and 3.3 he has 159, 112 and 258 XP in his level, from 123, 82 and 220. Every other entry stays, and the test's median check is within 40 for all of them.
- **The carried run** (`node scripts/measure-campaign.ts chief 20`): the lead is Lv 4, 6 and 8 (7 to 8) after the chapters, the party 3.66, 4.86 and 6.29 on average.

| Stage | XP earned | Wipes | Mike | Dustin | Party average |
|---|---|---|---|---|---|
| 1.1 | 144 | 0.0 | 3 | 2 | 2.25 |
| 1.2 | 126 | 0.1 | 4 | 3.1 | 3.29 |
| 1.3 | 101 | 0.0 | 4 | 3.9 | 3.66 |
| 2.1 | 248 | 0.0 | 5 | 4.6 | 4.25 |
| 2.2 | 238 | 0.0 | 5.4 | 5 | 4.60 |
| 2.3 | 222 | 0.0 | 6 | 5.5 | 4.86 |
| 3.1 | 207 | 0.0 | 6.4 | 6 | 4.69 |
| 3.2 | 238 | 0.0 | 7 | 6 | 5.26 |
| 3.3 | 630 | 0.0 | 8 | 7 | 6.29 |

## Lv 9 talents

The Lv 9 talents (`docs/game-design.md`, "The Lv 9 talents as built") only matter to a hero at Lv 9 or more, and none gets there in the nine stages built: the carried run's lead ends 3.3 at Lv 8 (8.0, 7 to 8 over 20 seeds). So `node scripts/measure-campaign.ts chief 20` and `measure-stage.ts` 3.1, 3.2 and 3.3 on chief came back to the digit, every band as it was and no `enemyMult` touched. Chapters 4 and 5 are where Lv 9 to 12 heroes play, and their stages are measured with the talents on. Forcing a party to Lv 9 (`--party=mike:9,...`) makes 3.1 to 3.3 a little easier and clears all 20 runs (`TODO.md`, "Lv 9 talents").


## Chapter 4 (Levels 10 to 13)

The run carries on through 4.1 to 4.4 (`docs/level-10.md` to `docs/level-13.md`).

- **Hopper plays 4.1 alone.** Nobody in its pool has played, so he joins at the average of the four best heroes the save has, less one (`joinLevel`): Lv 5 with no XP. 4.1 pays 2.2, so he reaches Lv 6 and the Wind-up before the pit and ends it with about 820 XP. The lead doesn't move in 4.1.
- **Eddie** joins 4.2 at the level of the party he joins, averaged, less one (`CATCH_UP`): Lv 5. He falls in 4.3 and is in no pool after it.
- **Pay:** 4.2 at 2.1 (about 500), 4.3 at 2.8 (about 690), 4.4 at 2.9 (about 810). The lead needs about 1300 XP across the chapter (from Lv 8's 1531 and up to Lv 10's 2902), all of it from 4.2 to 4.4.
- **Arrival:** 4.2 is Mike 8, Dustin 7, Robin 5, Eddie 5; 4.3 is Mike 8, Dustin 7, Robin 6, Eddie 5; 4.4 is Mike 9, Dustin 8, Robin 7, Eleven 5. Mike's XP into 4.2 to 4.4 is set between the 40-seed and the test's 10-seed medians, which sit 50 to 80 XP apart (the roof and the attic spread the XP by who stands).

The lead's total XP after each stage, the mean of 40 runs on chief, the bot keeping the lead:

| Stage | Mike | Dustin | Robin | Eleven | Hopper | Eddie |
|---|---|---|---|---|---|---|
| 4.1 | 1708 | 1260 | 623 | 597 | 820 | |
| 4.2 | 2056 | 1511 | 858 | 597 | 820 | 670 |
| 4.3 | 2433 | 1964 | 1189 | 597 | 820 | 979 |
| 4.4 | 3086 | 2449 | 1597 | 1048 | 820 | 979 |

- **The lead ends chapter 4 at Lv 10 in about eight runs of ten** (9.8 on average over 40), never under Lv 9; the party averages 8.2. `tests/pace.test.ts` asks for Lv 10 in seven of its ten and never under Lv 9.
