# Chapter 5: The Last Campaign, 1987

The last chapter. Hawkins is under the army's lockdown after the gates opened in chapter 4, and the way to end it runs through the Lab, into the Abyss, and to Vecna hiding inside the Mind Flayer. Hopper is back, and everyone the party has met can play. Every call here was made under the owner's standing instruction ("go with your recommendation for all steps"), on 2026-10-18. Each stage gets its own spec (`docs/level-14.md` to `docs/level-16.md`) when its build starts.

## Stages

| # | Stage | Who plays | What happens | Ends with | Music |
|---|---|---|---|---|---|
| 5.1 | Hawkins under lockdown | Picked on the map. Hopper rejoins at the start and is locked in | The town square under army floodlights, checkpoints and curfew, then the Lab, which the army holds. Troopers, Lab agents back in hazmat, demobats out of rifts in the street, vines on the houses | The Commander (mini-boss) | `lab`; `clock` for the Commander |
| 5.2 | The Abyss | Picked on the map. Will is locked in (the paths only he senses) | Through the Lab's gate into the Abyss: broken pieces of Hawkins floating over a red void under a black sun, joined by vine bridges. Gaps, cracks, burn walls and hidden paths on one route. Demogorgons as foes, demodogs, demobats | Twin Demogorgons (mini-boss) | `upside`; `clock` for the twins |
| 5.3 | Vecna inside the Mind Flayer | Picked on the map. Eleven and Will are locked in | A short climb through the flesh to the heart of the Abyss, then the arena | Vecna inside the Mind Flayer, the channel, the Final Roll, then the epilogue | `abyss`, then `ending` |

- **The pool.** Everyone met: Mike, Dustin, Lucas, Eleven, Will, Max, Steve, Robin, Nancy and Hopper. Eddie fell in 4.3 and is gone. Four are picked, as in chapters 3 and 4.
- **Hopper's return.** He comes back with the level and XP he had at the end of 4.1, raised to the join level (the met heroes' average minus one) if that is higher, so he is never dead weight. He is locked into 5.1 because the stage is his: the army, the Lab, his old job.
- **Erica's cart** stays open on the map.

## The pace

The lead walks into 5.1 at Lv 10 (chapter 4's target). Lv 11 after 5.2, and the cap, Lv 12, after 5.3, as `docs/game-design.md` says ("12 only if you clear most of chapter 5"). Each stage's `xpMult` is set by `scripts/measure-campaign.ts`, and `tests/pace.test.ts` grows to cover chapter 5.

## Lv 9 talents

The heroes reach Lv 9 to 12 in this chapter, so the Lv 9 talents are built with it, from the Heroes table in `docs/game-design.md` (Overload, Oath, Cerebro, Volley, Hive link, Extra life for Max, King Steve, Final girl, Robin's and Hopper's third). They follow the Lv 3 and Lv 6 pattern in `src/progression/talents.ts`. The nine heroes' are built (`docs/game-design.md`, "The Lv 9 talents as built"); Hopper's and Eddie's come with their kits.

## Foes

| Foe | Where | Behavior | Counter |
|---|---|---|---|
| Trooper | 5.1 | Rifle and riot shield. Blocks shots from the front, fires a three-round burst, and walks round to flank | Hit the back: Max's dash, Robin's confusion, Steve's smash breaks the shield |
| Lab agent | 5.1 | The 1.2 agent, back in hazmat, at chapter 5 numbers (its own kind, not a factor) | Close the gap |
| Demobat | 5.1, 5.2, 5.3 | 4.3's, flies in groups over walls | Lucas, Nancy, area attacks |
| Demogorgon (foe) | 5.2 | The 1.3 Demogorgon's charge and swipe at a foe's size and numbers, one or two at a time, no petals or leap | Dodge the charge into a wall |
| Demodog, vine, pod | 5.2, 5.3 | As in chapter 2, at chapter 5 numbers | As before |
| Flayed | 5.3 | 3.x's, in the climb and the boss's crowds | Knockback |

## Bosses

### The Commander (5.1, mini-boss)

A trooper captain in the Lab's loading bay, behind a full riot shield. He walks at the active hero, blocks everything from the front, and every 8 s plants the shield and whistles up a squad of three troopers. At half HP the shield cracks and he charges in straight lines that stun him on a wall, like the Demogorgon. Counter: hit his back or his side, and break the shield with a smash.

### Twin Demogorgons (5.2, mini-boss)

Two Demogorgons on a ring of floating rock, at mini-boss numbers. They take turns: while one charges, the other circles. When one falls, the other enrages (faster, acid arcs as in 1.3's petals phase). The ring has gaps at its edge: a Demogorgon that charges into a gap falls and comes back from below 3 s later, hurt.

### Vecna inside the Mind Flayer (5.3)

Three phases in one arena, one save point at the door, three bars in a row.

1. **Vecna, fast.** 4.4's Vecna, faster, with the clock chiming every 12 s. Max's Walkman works as in chapter 4. Ends at 0 HP: he sinks into the floor and the spider rises.
2. **The spider with Vecna inside.** 3.3's Mind Flayer (legs that strike down telegraphed lines, goo pools, Flayed crowds), with Vecna glowing in its chest. Hitting the legs opens the chest; hits on the chest while it's open do the damage. The clock still chimes, every 16 s.
3. **The channel.** Eleven and Will step onto two marks and channel together, held in place like 2.3's ward, each with an HP bar. The party plays the other two heroes and holds the line for 40 s against demobats, demodogs and Flayed. If Eleven or Will falls, the channel and its clock start again, with full HP, so it can't soft-lock.

**The Final Roll.** When the channel completes, play stops and every hero still standing rolls a d20 with advantage (two dice, keep the higher), on the tumbling d20 the HUD already has. The total sets how big the finish is: a NAT 20 anywhere gives the gold flourish, and a low total still wins. Nothing here can fail. Then Joyce steps in with her axe and finishes it, the show's own ending of the fight.

## The ending

After the Final Roll, the boss's clear plays `boom`, then the epilogue (`story/epilogue.ts`, `EPILOGUES[5]`): the basement in 1987, the party round the table, Mike closing his campaign book. It plays over `ending`, and its last beat is one die rolled on the table. Then a THE END card, then the results, which say CAMPAIGN COMPLETE with the feedback note, then the map with every node cleared. Replays stay open. The epilogue is skipped when the story is off, as the others are.

## The looks

- **5.1, Hawkins under lockdown.** Dusk going to night on the town tiles the map and 2.1 use, with the army laid over it: olive trucks and tents, sandbag walls, barricades, floodlight towers that throw hard white cones, and red rifts glowing in the asphalt. Inside, the Lab's chapter 1 tiles with army crates and cables.
- **5.2, the Abyss.** The Upside Down palette. Islands of Hawkins (lawn, road, a porch, a classroom floor) with rock undersides, floating over a dark red void with drifting spores and a black sun. Vine bridges between them. 4.3's Upside Down tiles cover the island tops.
- **5.3, the heart.** Red-black flesh underfoot, ribs and veins in the walls, a pulsing red glow. The arena is round.

## Music

- **`abyss`** (5.3): D minor, 160, up 4 bpm with each phase. All the motifs at once, as `docs/game-design.md` says.
- **`ending`**: F major, 72. Triangle and a soft pulse, the motif resolves, and it ends on the dice roll's sound.
- 5.1 plays `lab` and 5.2 plays `upside`, as the design table says. `clock` plays for the two mini-bosses. `abyss` replaces it for the final boss.

## How it gets built

Two passes, after chapter 4 lands, because chapter 5 uses its Hopper, demobats and Vecna:

1. **Levels 14 and 15** (5.1 and 5.2): the troopers, the Commander, the foe Demogorgon, the twins, the Lv 9 talents, the looks, `ending` and `abyss` written early.
2. **Level 16** (5.3): the final boss, the channel, the Final Roll, the epilogue, THE END and CAMPAIGN COMPLETE.

Sonnet agents build, split by folder as before, at most two at a time. The lead writes the specs and contracts and merges.
