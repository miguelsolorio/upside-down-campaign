# Difficulty

NORMAL and HARD, how they scale the game, and every stage measured on both. The DIFFICULTY row is in `docs/controls.md`, "Difficulty".

## The two settings

| Option | Id | Enemy HP and damage | |
|---|---|---|---|
| NORMAL | `normal` | x0.85 | The default |
| HARD | `chief` | x1 | The balance every stage was tuned at |

- The factor scales every enemy's HP and every hit on the party, floor hazards and hits on a ward included (`DIFFICULTY_MULT` in `enemies/defs.ts`). A stage's own `enemyMult` stacks on top. XP doesn't change.
- **Every band in the level docs is measured on HARD** (`chief`), and so are the tests that pin them. A new stage is tuned on HARD the same way, then checked on NORMAL.
- `kid` (x0.7) and `upside` (x1.4) stay for `scripts/measure-stage.ts`, `scripts/measure-campaign.ts` and the tests. No menu shows them, and a saved one loads as NORMAL.

## Every stage on both

Measured with `node scripts/measure-stage.ts <stage> <normal|chief> 20 [--careless]`, after the difficulty pass (3.1 at `enemyMult` 1.15, 3.2 at 1.1). Each cell is clears of 20, the average damage taken, and the average lowest party HP.

| Stage | HARD | HARD, careless | NORMAL | NORMAL, careless |
|---|---|---|---|---|
| 1.1 | 20, 42, 90% | 20, 35, 92% | 20, 36, 90% | 20, 28, 92% |
| 1.2 | 19, 237, 44% | 16, 318, 17% | 20, 182, 59% | 18, 267, 28% |
| 1.3 | 20, 253, 36% | 14, 342, 15% | 20, 175, 55% | 20, 248, 31% |
| 2.1 | 19, 209, 43% | 17, 198, 39% | 20, 140, 60% | 20, 119, 62% |
| 2.2 | 19, 240, 42% | 19, 242, 40% | 20, 208, 52% | 20, 206, 54% |
| 2.3 | 19, 402, 43% | 18, 399, 41% | 20, 300, 57% | 20, 303, 54% |
| 3.1 | 19, 259, 40% | 18, 218, 42% | 20, 77, 81% | 20, 154, 61% |
| 3.2 | 18, 279, 49% | 16, 489, 31% | 20, 220, 58% | 19, 406, 51% |

Before the pass (3.1 at 1.4, 3.2 at 1.25):

| Stage | HARD | HARD, careless | NORMAL | NORMAL, careless |
|---|---|---|---|---|
| 3.1 | 16, 239, 40% | 18, 223, 40% | 19, 241, 44% | 18, 226, 41% |
| 3.2 | 19, 291, 47% | 12, 542, 16% | 20, 233, 56% | 16, 455, 37% |

The 100-seed numbers and the reasons for both factors are in `docs/level-7.md` and `docs/level-8.md`, "The difficulty pass".

A carried run on NORMAL (`node scripts/measure-campaign.ts normal 10`) clears every stage with no wipes in all 10 seeds, and the lead levels as on HARD: Lv 4 after chapter 1, 6 after 2 and 7 after 3.2, since XP doesn't depend on the difficulty.

## How NORMAL was set

The goal: the careful bot clears every stage at least 19 times in 20 on NORMAL, and the careless bot takes clearly less damage than on HARD.

- **0.85 meets both.** The careful bot clears every stage 20 of 20, and the careless bot takes less on every stage: 15% less on 2.2, the closest, and 16 to 40% less on the rest.
- **0.9 misses.** Over 40 seeds the careful bot clears 2.2 38 times, and the careless bot takes 235 there against HARD's 242.
- **0.8 goes further than it needs to.** The careful bot's lowest party HP is 52% or more on every stage, and 0.85 already clears them all.
- **The mall is a walk on NORMAL.** 3.1's damage comes almost all from the Flayed's grab, which only lands over an effective factor of about 1.05. NORMAL puts the mall under it (`docs/level-7.md`, "The difficulty pass").

## Switching mid-stage

A change in the pause menu takes hold as play resumes (`Sim.setDifficulty`). Hits read the factor on every hit, so they change at once. Enemy HP is built at spawn, so each living enemy gets the full HP a stage started on the new setting would give it, and keeps its share: a half-dead agent stays about half dead. A retry, START OVER and the next stage build from the setting as usual.

## The saved setting

Saved with the other settings (`core/settings.ts`). Before the row, every save held `chief`, which nobody chose, so a save without a `rev` reads `chief` as NORMAL once and is written back with `rev: 2`. A HARD picked after that loads as HARD. A value the options don't offer (`kid`, `upside`, or anything else) loads as NORMAL, the way a bad GAME BOY value loads as AUTO.
