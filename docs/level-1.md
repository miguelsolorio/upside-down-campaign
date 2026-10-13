# Level 1 spec: stage 1.1, Mirkwood

One stage, five to eight minutes. World builds it, Story writes the words, Sim supplies the numbers, Art supplies the pixels.

## Shape

- Map: 48 by 40 tiles (768 by 640 px) as ASCII rows using the legend in `src/core/tiles.ts`. Trees and the creek wall it in.
- Route: Byers yard (start, south-west), trail, creek crossing, dump clearing, shed, forest bend, Lab road (end, north-east). One main path with side nooks for items.
- Darkness: 0.8 in the woods, 0.35 in the yard and under the Lab road floodlights. The active hero carries a flashlight (radius 52 px). Lamps, Christmas lights and floodlights are light sources.
- Music: `mirkwood`. The combat layer fades in while `sim.aggro()` is true.
- Party: Mike (active), Dustin, Lucas. Eleven joins at the shed. Everyone starts at Lv 1.

## Beats

World triggers them, Story writes the scripts. Trigger ids and script ids are fixed.

| Trigger | Where | Script id | What happens |
|---|---|---|---|
| `start` | yard | `l1_start` | Joyce, Mike, Dustin. Will is missing. Move hint. `lights_yard` is the first save point |
| `tut_attack` | first trail bend | `l1_tut_attack` | Dustin explains attack (J). Then group `rats1` wakes |
| `tut_special` | `rats1` cleared | `l1_tut_special` | Mike explains special (K) and MP |
| `tut_swap` | after `tut_special` | `l1_tut_swap` | Lucas explains swap (Q, E, 1 to 4) |
| `agents1` | before the creek | `l1_agents` | Lucas explains dash (L). Group `agents1` patrols |
| `gate_lucas` | at the fence gate | `l1_gate_hint` | Lucas spots the lantern `target1` across the creek. When it's hit, `openProp('gate1')`, then `l1_gate_open` |
| `scare` | bend after the creek | `l1_scare` | Lights flicker, `growl`, stinger `scare`, a dark shape crosses the trail. No fight |
| `rats2` | dump clearing | none | Group `rats2` is awake from the start |
| `eleven_meet` | shed | `l1_eleven_meet` then `l1_eleven_join` | Eleven (npc), an Eggo, `sim.recruit('eleven')`, jingle `recruit`. `lights_shed` is the second save point |
| `push_gate` | after the shed | `l1_push_hint` | `log1` blocks the trail (pushBy `push`). On `propCleared`: `l1_log_cleared` |
| `agents2` | forest bend | none | Group `agents2` patrols |
| `ambush` | Lab road | `l1_ambush_start` | Floodlights and the van. Waves `ambush1`, `ambush2`, `ambush3`, each woken by the previous `groupCleared` |
| `level_clear` | after `ambush3` | `l1_ambush_clear` then `l1_clear` | Fade to results |

Scripts Story writes: `prologue`, `l1_start`, `l1_tut_attack`, `l1_tut_special`, `l1_tut_swap`, `l1_agents`, `l1_gate_hint`, `l1_gate_open`, `l1_scare`, `l1_eleven_meet`, `l1_eleven_join`, `l1_push_hint`, `l1_log_cleared`, `l1_ambush_start`, `l1_ambush_clear`, `l1_clear`.

## Puzzle hints

Both puzzles (the lantern behind `gate_lucas`, the log behind `push_gate`) are listed in `puzzles` in `stage11.ts`. Each names its arrival beat, the prop to watch, the hero who solves it, a one-word label and a short tip.

- **Arrival.** The beat's script says which hero to swap to, with the slot key, and which key to press. Lucas is slot 3 (`{pick3}`) and Eleven is slot 4 (`{pick4}`).
- **Skip story.** Dialogue is off, so the tip shows on a strip at the bottom of the screen for about eight seconds instead.
- **After 30 seconds.** Once the arrival beat has finished, time spent near the prop without solving it counts up. At 30 seconds (1800 ticks) the prop gets pulsing yellow corner brackets and a label (SHOOT or PUSH), and if the right hero is on the bench, their slot in the HUD pulses too. It clears when the prop is `open` or `lit`. Pause, dialogue and walking away stop the clock, and a retry starts it over. Reduce flashing makes the brackets hold still.
- **Code.** `world/puzzles.ts` holds the clock (pure, tested in `tests/puzzles.test.ts`). `play.ts` ticks it and `render.ts` draws it.

## Spawns and the XP budget

| Group | Count | Type | Notes |
|---|---|---|---|
| `rats1` | 4 | rat | dormant until `tut_attack` |
| `agents1` | 2 | agent | patrol |
| `rats2` | 4 | rat | awake |
| `agents2` | 3 | agent | patrol |
| `ambush1`, `ambush2`, `ambush3` | 3 each | agent | dormant |

That's 8 rats and 14 agents. XP per kill is rat 4, agent 8, so the stage is worth 144 XP. A test keeps the total between 130 and 175. With the XP curve `round(18 × L^1.7)` the lead hero reaches Lv 3 at 76 XP and stays under Lv 4 (193 XP). Benched heroes earn half.

Items: 4 Eggos, 2 Cokes, 12 quarters. Props: `lights_yard` and `lights_shed` (lights), `target1` (target, hitBy `shoot`), `gate1` (gate, solid, closed), `log1` (log, solid, pushBy `push`), `bike`, `sign1`, `van`, `flood1`, `flood2`. NPCs: `joyce` in the yard, `eleven` at the shed.

## What Art draws for this level

- Every `TileName` in `src/core/tiles.ts`, with variants so the woods don't look stamped.
- Actors: mike, dustin, lucas, eleven, will, joyce, agent, rat. Anims: idle, walk, attack, cast, dash, hurt, ko.
- Props, items, icons, portraits (six characters, six expressions), every `FxKind`, the night tile art and light pools, panels, the logo, the alphabet wall.
- Character signatures are in `docs/game-design.md`, "Voice and look".
