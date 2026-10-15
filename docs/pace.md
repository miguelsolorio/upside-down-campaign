# Pace

How fast the party levels over a real run, measured over the stages built so far (1.1 to 3.2). The target is in `docs/game-design.md`, "Leveling rules": Lv 4 after chapter 1, 6 after 2, 8 after 3, 10 after 4. `tests/pace.test.ts` holds the run to it.

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

