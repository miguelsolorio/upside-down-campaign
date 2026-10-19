// The arcade visit (docs/level-4.md, "The arcade"): a cabinet's game over the frozen level, the callout that names it, and what beating MADMAX
// at Dig Dug pays: XP and quarters for the party once a visit, and a line from Max when the prize floaters have cleared. The play scene owns the
// overlay stack and the sim, so it hands over how to put a scene on top of the level and take it off again.
import type { Scene } from '../core/scene.ts';
import type { Camera } from '../core/camera.ts';
import type { PropView, Sim, SimView } from '../core/types.ts';
import { labelOf } from '../core/bindings.ts';
import type { Ctx } from '../gfx/canvas.ts';
import { TITLES, arcadeBoard, createArcadeScene, gameFor, postScore } from '../arcade/index.ts';
import type { ArcadeVisit } from '../arcade/index.ts';
import { drawCallout } from './render.ts';

/** The prize for beating MADMAX at Dig Dug. Max's line waits for the prize floaters to clear, then shows a while. */
const MADMAX_XP = 25;
const MADMAX_QUARTERS = 5;
const MAX_LINE = "Beginner's luck. Rematch tomorrow.";
const MAX_LINE_FROM = 80;
const MAX_LINE_TO = 290;

export interface ArcadeHost {
  sim(): Sim;
  view(): SimView;
  /** Puts a scene over the frozen level, and takes it off again: leaving the cabinet comes straight back to play. */
  show(sc: Scene): void;
  close(sc: Scene): void;
}

export interface Arcade {
  /** Opens the cabinet's game over the frozen level. */
  open(cabinet: PropView): void;
  /** Dev only: finishes a run at a cabinet with this score, as if it had been played, to check the board and the prize. */
  finish(cabinet: string, score: number): void;
  /** One tick: Max's line runs down. */
  tick(): void;
  /** The prize floaters and Max's line sit over the cabinets, so the cabinet's callout waits until they're done. */
  readonly talking: boolean;
  /** The callout over a usable prop: the key alone at the lights, the key and the game at a cabinet. */
  promptText(prop: PropView): string;
  /** Max's line, once the prize floaters have cleared. */
  draw(ctx: Ctx, cam: Camera): void;
}

export function createArcade(host: ArcadeHost): Arcade {
  /** The MADMAX prize is paid once a visit. */
  let paid = false;
  /** Frames since it was paid, for Max's line, or -1. */
  let line = -1;

  /** The name a high score goes under: the hero at the cabinet. */
  const player = (): string => (host.view().hud.party.find((m) => m.active)?.id ?? 'mike').toUpperCase();

  /** Beating MADMAX pays the party once a visit, and Max has something to say about it. */
  function done(visit: ArcadeVisit): void {
    if (!visit.beatMadmax || paid) return;
    paid = true;
    host.sim().bonus(MADMAX_XP, MADMAX_QUARTERS);
    line = 0;
  }

  return {
    open(cabinet) {
      const sc = createArcadeScene({
        game: gameFor(cabinet.id), player: player(), board: arcadeBoard(),
        onExit: (visit) => { host.close(sc); done(visit); },
      });
      host.show(sc);
    },
    finish(cabinet, score) {
      const r = postScore(arcadeBoard(), gameFor(cabinet), player(), score);
      done({ game: r.game, runs: [r], beatMadmax: r.beatMadmax });
    },
    tick() { if (line >= 0 && ++line > MAX_LINE_TO) line = -1; },
    get talking() { return line >= 0; },
    promptText: (prop) => (prop.kind === 'arcade' ? `${labelOf('interact')}: ${TITLES[gameFor(prop.id)]}` : labelOf('interact')),
    draw(ctx, cam) {
      const max = line >= MAX_LINE_FROM ? host.view().actors.find((m) => m.kind === 'npc' && m.id === 'max') : undefined;
      if (max) drawCallout(ctx, MAX_LINE, max.x, max.y - 38, cam, 'pink', 18);
    },
  };
}
