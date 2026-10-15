// The play scene: one stage, one sim. Each tick it reads input, runs the dialogue box or the sim, forwards the
// sim's events to audio, ui and story, fires the stage's beats, and moves the camera. draw() layers the world,
// the pools of light at night, the HUD and the dialogue. Retry rebuilds the sim from the last lit checkpoint.
import type { Game, Scene } from '../core/scene.ts';
import type { BarkEvent, DevHooks, HeroId, PartySeed, PropView, Sim, SimEvent, SimInput, SimView, Vec2 } from '../core/types.ts';
import { SCREEN_H, SCREEN_W, TILE, VIEW_TOP, VIEW_W, VIEW_X } from '../core/config.ts';
import { burstHint, labelOf } from '../core/bindings.ts';
import { skipsDialogue } from '../core/settings.ts';
import { savingAllowed, writeSave } from '../core/save.ts';
import { cameraFollow, cameraSnap, createCamera } from '../core/camera.ts';
import { toSimInput } from '../core/input.ts';
import { createSim, setReduceFlashing, setShakeScale } from '../combat/index.ts';
import { createBot } from '../combat/bot.ts';
import type { Bot } from '../combat/bot.ts';
import { HERO_IDS } from '../heroes/index.ts';
import { emptyStats, xpToNext } from '../progression/index.ts';
import { audio } from '../audio/index.ts';
import { SCRIPTS, bark } from '../story/index.ts';
import { createCharSheetScene, createDialogueBox, createGameOverScene, createPauseScene, drawHud, mountDevPanel } from '../ui/index.ts';
import type { CharSheetHero } from '../ui/index.ts';
import { onLevel, slotAt } from '../ui/hudlayout.ts';
import { getStage } from './stage.ts';
import { createDirector } from './triggers.ts';
import type { Director, DirectorEnv, DirectorState } from './triggers.ts';
import { createPuzzleTracker, foeKinds, isNear, puzzleProps } from './puzzles.ts';
import { createLevelFx, hudPulse } from './levelfx.ts';
import { drawCallout, drawControlsCorner, drawFade, drawFlash, drawLevelFx, drawPuzzleCaret, drawSubtitle, drawTopLine, drawWorld } from './render.ts';
import type { PlayOptions } from './types.ts';

const IDLE: SimInput = {
  mx: 0, my: 0, attackHeld: false, attackPressed: false, specialPressed: false, specialHeld: false,
  swapDelta: 0, swapTo: -1, burstPressed: false,
};
/** Interact reaches this far (px) from the hero's feet to a lights prop. */
const LIGHT_REACH = 20;
const SPEECH_FRAMES = 90;
/** How far (px) from the start the party goes before the controls in the corner start to fade, and how long the fade takes. */
const HOME_RADIUS = 120;
const HINT_FADE_FRAMES = 90;
const WIPE_FRAMES = 100;
const CLEAR_FRAMES = 70;
/** How long the SAVED callout stays over the lights. */
const SAVED_FRAMES = 120;
/** Props that stay open across a retry or a load. */
/** The prop is inside the camera's clear band, so a caret over it can be seen. */
const inView = (p: PropView, cam: { x: number; y: number }): boolean =>
  p.x + p.w > cam.x + VIEW_X && p.x < cam.x + VIEW_X + VIEW_W && p.y + p.h > cam.y && p.y < cam.y + SCREEN_H - VIEW_TOP;

const KEPT_PROPS = new Set(['gate', 'log', 'target', 'lights', 'door', 'console', 'crate', 'camera', 'van', 'vines', 'firebox', 'hidden']);

interface Checkpoint { x: number; y: number; state: DirectorState }
/** What a rebuilt sim carries over: the party, the spawns to leave dead and the props to leave open. */
interface Progress { party: PartySeed[]; skip: string[]; open: string[] }

export function createPlayScene(opts: PlayOptions): Scene {
  const stage = getStage(opts.stageId, opts.time);
  const cam = createCamera();
  const dialog = createDialogueBox();
  const seen = new Set<string>();
  const killed = new Set<string>();
  const swallow = new Set<string>();
  /** Dialogue-finished callbacks, run on the next tick so a beat can start its next script outside the box's own update. */
  const deferred: (() => void)[] = [];
  /** Level-up effects playing around the heroes. They never stop the game. */
  const levelFx = createLevelFx();
  /** Counts the time spent near each unsolved puzzle, to know when to point at it. */
  const puzzles = createPuzzleTracker(stage.puzzles);
  /** The enemy kind behind each puzzle that watches a spawn (the pinned boss). Empty on 1.1 and 1.2. */
  const foes = foeKinds(stage.puzzles, stage.spawns);
  let game!: Game;
  let sim!: Sim;
  let view!: SimView;
  let director!: Director;
  let bot: Bot | null = null;
  let unmountDev: (() => void) | null = null;
  let overlay: Scene | null = null;
  let checkpoint: Checkpoint = { x: stage.start.x, y: stage.start.y, state: { fired: [], cleared: [] } };
  let prompt: PropView | null = null;
  /** The crit is ready and the party is free to use it, so its key shows over the active hero. Not next to
   * lights, where Space lights them instead. */
  let burstCall = false;
  let speech: { who: HeroId; text: string; t: number } | null = null;
  /** Set once the party has walked away from the yard it starts in. The corner controls fade after that. */
  let leftHome = false;
  let hintFade = 0;
  let speechCd = 0;
  let scare: { t: number; done: () => void } | null = null;
  let wipeT = -1;
  let clearT = -1;
  /** How strong the pools of light are at night. 1 is normal; the scare stutters it. */
  let glowLevel = 1;
  /** Where the SAVED callout floats and how many frames it has shown. Null = hidden. */
  let saved: { x: number; y: number; t: number } | null = null;
  /** Frames since the last hero swap, to flash the new active portrait. Null before the first one. */
  let swapAge: number | null = null;
  /** The screen width the camera last framed. A resize snaps the camera instead of letting it drift over. */
  let camW = SCREEN_W;

  // ---------------------------------------------------------------- setup
  function seeds(g: Game): PartySeed[] {
    let out = opts.party;
    const ids = (g.flags.party ?? []).filter((id): id is HeroId => (HERO_IDS as string[]).includes(id));
    if (ids.length > 0) out = ids.map((id) => ({ id }));
    return g.flags.level > 1 ? out.map((s) => ({ ...s, level: g.flags.level })) : out;
  }

  function build(party: PartySeed[], at: Vec2, skip: string[], openProps: string[]): void {
    sim = createSim(stage.sim({
      party, start: at, difficulty: game.settings.difficulty, seed: game.flags.seed, god: game.flags.god, skipSpawns: skip, openProps,
    }));
    view = sim.view();
    cameraSnap(cam, view.focus.x, view.focus.y, stage.wPx, stage.hPx);
    camW = SCREEN_W;
  }

  const env: DirectorEnv = {
    sim: () => sim,
    say(id, done) {
      const script = SCRIPTS[id];
      if (!script || bot || seen.has(id)) { done(); return; }
      seen.add(id);
      dialog.start(script, () => deferred.push(done));
    },
    scare(done) { scare = { t: 0, done }; },
    open(prop) {
      // The sim queues its own gate sound for the next step. The dialogue holds the sim, so play it now and drop the copy.
      if (view.props.some((p) => p.id === prop && (p.kind === 'gate' || p.kind === 'door'))) { audio.sfx('gateOpen'); swallow.add('gateOpen'); }
      sim.openProp(prop);
    },
    alarm() { audio.sfx('klaxon'); },
    music: (track) => audio.music(track),
    jingle: (id) => audio.jingle(id),
    finish() { audio.jingle('clear'); clearT = 0; },
  };

  function devHooks(): DevHooks {
    return {
      get god() { return sim.dev.god; },
      set god(v: boolean) { sim.dev.god = v; },
      get hitboxes() { return sim.dev.hitboxes; },
      set hitboxes(v: boolean) { sim.dev.hitboxes = v; },
      giveXp: (n) => sim.dev.giveXp(n),
      setLevel: (n) => sim.dev.setLevel(n),
      killAll: () => sim.dev.killAll(),
      teleport: (x, y) => sim.dev.teleport(x, y),
      spawnGroup: (g) => sim.spawnGroup(g),
      openProp: (id) => sim.openProp(id),
      recruit: (id) => sim.recruit(id),
      state: () => {
        const p = sim.heroPos();
        return {
          tile: `${(p.x / TILE) | 0},${((p.y - 4) / TILE) | 0}`, aggro: sim.aggro(), alive: sim.enemiesAlive(),
          beats: director.snapshot().fired.join(' '), busy: director.busy(), time: stage.time,
          checkpoint: `${(checkpoint.x / TILE) | 0},${(checkpoint.y / TILE) | 0}`, frame: sim.stats().frames,
        };
      },
    };
  }

  /** window.__ud is created after the first scene starts, so this runs again on every tick until it sticks. */
  const play = { get sim() { return sim; }, get stage() { return stage; }, get director() { return director; } };
  function expose(): void {
    const ud = (globalThis as unknown as { __ud?: Record<string, unknown> }).__ud;
    if (ud && ud.play !== play) ud.play = play;
  }

  // ---------------------------------------------------------------- barks, overlays, retry
  function speak(who: HeroId, ev: BarkEvent, force = false, level?: number): void {
    if (skipsDialogue()) return;
    if (!force && (speechCd > 0 || dialog.active)) return;
    const text = bark(who, ev, level ?? sim.party().find((p) => p.id === who)?.level ?? 1);
    if (!text) return;
    speech = { who, text, t: 0 };
    speechCd = 240;
  }

  function closeOverlay(sc: Scene): void {
    if (game.scenes.top() === sc) game.scenes.pop();
    if (overlay === sc) overlay = null;
  }

  /** Eleven's npc spawn goes once she has joined, so she is never at the shed twice. */
  function skipFor(party: PartySeed[]): string[] {
    return party.some((p) => p.id === 'eleven') ? [...killed, 'eleven'] : [...killed];
  }

  /** The live party, kills and open props: what a retry or a save carries forward. */
  function progress(): Progress {
    const party: PartySeed[] = sim.party().map((p) => ({ id: p.id, level: p.level, xp: p.xp, bonus: p.bonus }));
    const open = view.props.filter((p) => KEPT_PROPS.has(p.kind) && (p.state === 'open' || p.state === 'lit')).map((p) => p.id);
    return { party, skip: skipFor(party), open };
  }

  /** Rebuilds the sim at the checkpoint with this progress and puts the director and the screen back to match. */
  function restart(p: Progress): void {
    build(p.party, checkpoint, p.skip, p.open);
    director.restore(checkpoint.state);
    levelFx.clear();
    swapAge = null;
    deferred.length = 0;
    swallow.clear();
    scare = null; speech = null; wipeT = -1;
    puzzles.reset();
    glowLevel = 1;
    audio.music(stage.music);
  }

  /** Same party, levels and kills; the lead, full health, standing at the last lit checkpoint. */
  function retry(): void {
    restart(progress());
  }

  /** Autosave at the lights. Debug runs skip it, and so does the SAVED callout. */
  function autosave(lit: PropView): void {
    if (!savingAllowed()) return;
    const p = progress();
    // The lights were lit this tick, after the view was built, so they are not in view.props yet.
    writeSave({
      v: 1, stage: stage.id, party: p.party, checkpoint, killed: [...killed],
      openProps: p.open.includes(lit.id) ? p.open : [...p.open, lit.id],
    });
    saved = { x: lit.x + lit.w / 2, y: lit.y - 2, t: 0 };
  }

  function pushGameOver(): void {
    if (bot) { retry(); return; }
    const sc = createGameOverScene({ onRetry: () => { closeOverlay(sc); retry(); }, onQuit: () => opts.onQuit() });
    overlay = sc;
    game.scenes.push(sc);
  }

  function pause(): void {
    const sc = createPauseScene({
      onResume: () => closeOverlay(sc), onQuit: () => opts.onQuit(), onStartOver: () => opts.onStartOver(), party: sheetParty,
    });
    overlay = sc;
    game.scenes.push(sc);
  }

  /** Every hero for the character sheet. Those in the party come with their level, XP and d20 bonus. A hero who
   * isn't in the party comes in at Lv 1. */
  function sheetParty(): CharSheetHero[] {
    const live = sim.party();
    return HERO_IDS.map((id): CharSheetHero => {
      const slot = live.findIndex((m) => m.id === id);
      const p = live[slot];
      const hud = view.hud.party.find((m) => m.id === id);
      if (!p) return { id, level: 1, xp: 0, xpNext: xpToNext(1), bonus: emptyStats(), joined: false, active: false, slot: -1 };
      return {
        id, level: p.level, xp: p.xp, xpNext: hud?.xpNext ?? xpToNext(p.level), bonus: { ...emptyStats(), ...p.bonus },
        joined: true, active: hud?.active ?? false, slot,
      };
    });
  }

  /** The character sheet over the frozen level, open on this hero. Closing it goes straight back to play. */
  function openSheet(id: HeroId): void {
    const sc = createCharSheetScene({ heroes: sheetParty, start: id, onBack: () => closeOverlay(sc) });
    overlay = sc;
    game.scenes.push(sc);
    audio.sfx('pause');
  }

  /** The keys and pad, plus a click on a HUD portrait, which is a swap to that hero. */
  function playerInput(g: Game): SimInput {
    // Space lights the lights in reach, and with none in reach it's the burst key. `prompt` is last tick's, the one on screen.
    const keys = toSimInput(g.input, !prompt);
    const click = g.input.clicked();
    const slot = click ? slotAt(view.hud.party, click.x, click.y) : -1;
    return slot >= 0 ? { ...keys, swapTo: slot } : keys;
  }

  // ---------------------------------------------------------------- events, lights
  function forward(ev: SimEvent[]): void {
    for (const e of ev) {
      switch (e.t) {
        case 'sfx': if (!swallow.delete(e.id)) audio.sfx(e.id); break;
        case 'kill': killed.add(e.spawnId); break;
        case 'levelUp': levelFx.push(e.info); break;
        case 'natTwenty': if (e.source === 'crit') speak(e.hero, 'crit'); break;
        case 'heroKO': speak(e.hero, 'ko', true); break;
        case 'pickup': if (e.item === 'eggo') speak(e.hero, 'eggo'); break;
        case 'swap': speak(e.to, 'swapIn'); swapAge = 0; break;
        case 'allDown': if (wipeT < 0) wipeT = 0; break;
        case 'poked': puzzles.poke(e.propId, e.hero); break;
        default: break;
      }
    }
    director.events(ev);
  }

  function nearLights(): PropView | null {
    const p = sim.heroPos();
    for (const pr of view.props) {
      if (pr.kind !== 'lights' || pr.state === 'open' || pr.state === 'lit') continue;
      const qx = Math.max(pr.x, Math.min(p.x, pr.x + pr.w)), qy = Math.max(pr.y, Math.min(p.y, pr.y + pr.h));
      if (Math.hypot(p.x - qx, p.y - qy) <= LIGHT_REACH) return pr;
    }
    return null;
  }

  function lightUp(pr: PropView): void {
    sim.openProp(pr.id);
    sim.healParty(0.5);
    audio.sfx('lights');
    const cp = stage.checkpoints.find((c) => c.prop === pr.id);
    if (cp) {
      checkpoint = { x: cp.x, y: cp.y, state: director.snapshot() };
      autosave(pr);
    }
  }

  /** The scare: the lights stutter for 90 frames, something growls, and a shape walks across the trail. */
  function stepScare(s: { t: number; done: () => void }): void {
    if (s.t === 0) { audio.sfx('flicker'); audio.sfx('growl'); audio.stinger('scare'); }
    s.t++;
    const strobe = !game.settings.reduceFlashing && ((((s.t >> 2) * 2654435761) >>> 0) % 5) < 2;
    glowLevel = strobe ? 0.1 : 0.65;
    if (s.t >= stage.scare.frames) { scare = null; s.done(); }
  }

  function figure(): Vec2 | null {
    if (!scare) return null;
    const u = Math.min(1, scare.t / stage.scare.frames), a = stage.scare.from, b = stage.scare.to;
    return { x: a.x + (b.x - a.x) * u, y: a.y + (b.y - a.y) * u };
  }

  // ---------------------------------------------------------------- the scene
  return {
    opaque: true,

    enter(g) {
      game = g;
      director = createDirector(stage.beats, stage.waves, env);
      const load = opts.resume;
      if (load) {
        // A load is a retry that starts from disk: stand at the saved lights with the saved party and kills.
        checkpoint = { x: load.checkpoint.x, y: load.checkpoint.y, state: load.checkpoint.state };
        for (const id of load.killed) killed.add(id);
        restart({ party: load.party, skip: skipFor(load.party), open: load.openProps });
      } else {
        build(seeds(g), stage.start, [], []);
      }
      bot = g.flags.bot ? createBot({ grid: stage.grid, waypoints: stage.waypoints }) : null;
      audio.music(stage.music);
      audio.intensity(0);
      if (g.flags.dev) unmountDev = mountDevPanel(devHooks());
      expose();
    },

    exit() {
      unmountDev?.();
      unmountDev = null;
      audio.intensity(0);
    },

    update(g) {
      game = g;
      setShakeScale(g.settings.shake);
      setReduceFlashing(g.settings.reduceFlashing);
      expose();
      if (deferred.length > 0) for (const fn of deferred.splice(0)) fn();
      if (dialog.active) { prompt = null; burstCall = false; dialog.update(g); return; }
      if (!bot && wipeT < 0 && clearT < 0 && g.input.pressed('pause')) { pause(); return; }

      const frozen = scare !== null || wipeT >= 0 || clearT >= 0;
      // A click on the active hero's name and level opens their character sheet. The view is last tick's, the one on screen.
      const click = g.input.clicked();
      const lead = view.hud.party.find((m) => m.active);
      if (!bot && !frozen && lead && click && onLevel(view.hud.party, click.x, click.y)) { openSheet(lead.id); return; }
      const input = frozen ? IDLE : bot ? bot.next(sim) : playerInput(g);
      forward(sim.step(input));
      view = sim.view();
      // Lights the burst button on a touch screen.
      if (view.hud.burstReady && !frozen) g.input.offer('burst');
      // A benched hero's face under the mouse is a button, and so is the active hero's name and level.
      const ptr = g.input.hover();
      if (ptr && !bot && (slotAt(view.hud.party, ptr.x, ptr.y) >= 0 || onLevel(view.hud.party, ptr.x, ptr.y))) g.input.point();

      if (!frozen) {
        const p = sim.heroPos();
        director.tick((p.x / TILE) | 0, ((p.y - 4) / TILE) | 0);
        if (!leftHome && Math.hypot(p.x - stage.start.x, p.y - stage.start.y) > HOME_RADIUS) leftHome = true;
        puzzles.tick({ hasFired: director.hasFired, busy: director.busy(), props: puzzleProps(stage.puzzles, view.props, view.actors, foes), hero: p });
      }
      if (scare) stepScare(scare);
      // No lighting mid-boss: the save would hold a fired beat for a fight the retry puts back to sleep.
      prompt = frozen || director.busy() || view.hud.boss ? null : nearLights();
      burstCall = !frozen && !director.busy() && !prompt && view.hud.burstReady;
      if (prompt && !bot && g.input.pressed('interact')) lightUp(prompt);
      if (wipeT >= 0 && ++wipeT === WIPE_FRAMES) pushGameOver();
      if (clearT >= 0 && ++clearT === CLEAR_FRAMES) opts.onClear({ stats: sim.stats(), party: sim.party() });

      audio.intensity(sim.aggro() ? 1 : 0);
      cameraFollow(cam, view.focus.x, view.focus.y, stage.wPx, stage.hPx);
      if (!scare) glowLevel = 1;
      if (leftHome) hintFade = Math.min(1, hintFade + 1 / HINT_FADE_FRAMES);
      if (speech && ++speech.t > SPEECH_FRAMES) speech = null;
      if (speechCd > 0) speechCd--;
      levelFx.tick();
      if (swapAge !== null) swapAge++;
      if (saved && ++saved.t > SAVED_FRAMES) saved = null;
      const me = view.hud.party.find((m) => m.active);
      if (me && !me.ko && me.hp / me.hpMax < 0.25 && g.frame % 60 === 0) speak(me.id, 'lowHp');
    },

    draw(ctx, g) {
      // Here rather than in update, which doesn't run under the pause menu or a dialogue.
      if (camW !== SCREEN_W) {
        cameraSnap(cam, view.focus.x, view.focus.y, stage.wPx, stage.hPx);
        camW = SCREEN_W;
      }
      const fig = figure();
      drawWorld(ctx, stage, view, cam, g.frame, { hitboxes: sim.dev.hitboxes, figure: fig, light: { level: glowLevel, flicker: scare ? 2.2 : 0 } });
      drawFlash(ctx, view);
      drawLevelFx(ctx, levelFx.list(), view, cam);
      // While the party is at a puzzle it's stuck on, the caret points at the prop and a subtitle says who to try.
      const stuck = puzzles.highlight();
      const watched = stuck ? puzzleProps(stage.puzzles, view.props, view.actors, foes) : view.props;
      const stuckProp = stuck && watched.find((p) => p.id === stuck.prop);
      // A hint from trying a gate or door is shown where the party stands, which can be far from the puzzle's own prop
      // (the sensor, the lantern): the subtitle shows near either one, and the caret goes on the puzzle's prop when it
      // is in view, else on the gate or door that was tried.
      const triedId = stuck ? puzzles.triedProp(stuck) : null;
      const triedProp = triedId ? watched.find((p) => p.id === triedId) : undefined;
      const hero = sim.heroPos();
      const atHint = stuckProp && (isNear(stuckProp, hero) || (triedProp && isNear(triedProp, hero)));
      const caretOn = stuckProp && (triedProp && !inView(stuckProp, cam) ? triedProp : stuckProp);
      const hint = stuck && caretOn && atHint ? { prop: caretOn, text: stuck.hint } : null;
      if (hint) drawPuzzleCaret(ctx, hint.prop, cam, g.frame);
      const lit = new Set<HeroId>();
      for (const f of levelFx.list()) if (hudPulse(levelFx.since(f.hero), g.settings.reduceFlashing)) lit.add(f.hero);
      const ptr = g.input.hover();
      const at = ptr && !overlay && !dialog.active && !bot ? ptr : null;
      const hover = at ? slotAt(view.hud.party, at.x, at.y) : -1;
      const levelHot = !!at && onLevel(view.hud.party, at.x, at.y);
      drawHud(ctx, view.hud, g.frame, { focus: stuck?.hero, levelUp: lit, swapAge, hover, levelHot, device: g.input.device() });
      if (prompt) drawCallout(ctx, labelOf('interact'), prompt.x + prompt.w / 2, prompt.y - 2, cam, 'yellow');
      if (saved) drawCallout(ctx, 'SAVED', saved.x, saved.y, cam, 'leaf');
      if (speech) {
        const a = view.actors.find((m) => m.kind === 'hero' && m.id === speech?.who) ?? { x: view.focus.x, y: view.focus.y };
        drawCallout(ctx, speech.text, a.x, a.y - 24, cam);
      }
      // The burst line sits under the HUD, near the d20 it's about, so it never covers the fight around the hero.
      if (burstCall) drawTopLine(ctx, burstHint(), 'yellow', !!view.hud.boss);
      // The subtitle sits where the corner controls do, so it replaces them while it shows.
      if (hint) drawSubtitle(ctx, hint.text);
      else drawControlsCorner(ctx, hintFade);
      dialog.draw(ctx);
      drawFade(ctx, clearT >= 0 ? (clearT - 10) / (CLEAR_FRAMES - 20) : 0);
    },
  };
}
