// What the recorder (scripts/demo) hands the page for one shot, and what the page keeps of it. Plain data, so it crosses CDP as JSON.
// The shot list itself is scripts/demo/shots.mjs; docs/demo.md says what each field does.
import type { Game } from '../core/scene.ts';
import type { Capture } from '../core/capture.ts';
import type { Camera } from '../core/camera.ts';
import type { Sim } from '../core/types.ts';

/** What the camera follows. Positions are in the game's 384 by 224 frame. */
export type Follow =
  | 'hero'
  | 'center'
  | { hero: string; dy?: number }
  | { actor: string; dy?: number }
  /** The point halfway between two actors, each a hero or any actor's id: a beam and who it hits. */
  | { between: [string, string] }
  | { x: number; y: number }
  /** The hero and every foe within this many px of them, averaged: the fight, wherever it has moved to. */
  | { fight: number };

/**
 * A camera key. The latest key whose `at` (frames from the shot's start) has passed is the one in force. `zoom` is a whole
 * number, so every game pixel stays a whole number of video pixels: 1 is the full frame at 5x, 2 is 10x, 3 is 15x. A new
 * zoom or a new target is a cut; the same one keeps following. `push` eases the zoom on to another value over some frames
 * (for flat art, since a fractional scale shimmers on fine detail), at a steady pace or, with `smooth`, easing in and out. `lerp` is how quickly the view catches the target, 0 to 1.
 */
export interface CamKey {
  at: number;
  zoom?: number;
  follow?: Follow;
  lerp?: number;
  push?: { to: number; over: number; smooth?: boolean };
  /** For the full-frame view only: the rows of the frame's 8 spare ones to cut off the top (the rest go off the bottom). Default 3, which keeps the HUD whole. */
  top?: number;
}

export interface Caption {
  text: string;
  at: number;
  /** The frame it goes at. Omitted: it stays to the end. */
  until?: number;
  where?: 'bl' | 'bc' | 'tl' | 'tc';
  color?: string;
  /** Whole-number scale of the game font on the 1920 by 1080 video. Default 5, so a glyph is as big as a 5x game pixel grid. */
  scale?: number;
}

export interface Flash { at: number; len?: number; alpha?: number }

/** A flash for every effect in `sfx`, on the frame it plays, so a retuned fight still flashes on its hits. */
export interface FlashOn { sfx: string[]; len?: number; alpha?: number; gap?: number }

export interface KeyPress { at: number; code: string; hold?: number }

export interface CardLine {
  text: string; y: number; scale?: number; color?: string; at?: number;
  /** Slams in: one scale too big for its first four frames, then its own size. */
  pop?: boolean;
  /** An effect played on the frame it appears. */
  sfx?: string;
}

/** A title card the page draws itself, in game pixels, as a scene (see cards.ts). */
export interface CardSpec {
  /** sky: the title screen's sky, skyline, woods and spores. ink: flat dark. */
  bg: 'sky' | 'ink';
  /** The track that plays under it: null for none. Left out, whatever was playing goes on. */
  music?: string | null;
  /** The flickering logo, with its top at this y. With `drop` it falls in from above over that many frames and plays `sfx` as it lands. */
  logo?: { y: number; at?: number; drop?: number; sfx?: string };
  /** The party from the title screen walks in from below over `len` frames, starting at `from`, and turns to face the screen. */
  party?: { from?: number; len: number };
  lines: CardLine[];
}

export interface ShotSpec {
  id: string;
  /** Frames recorded. */
  len: number;
  cam: CamKey[];
  captions?: Caption[];
  flashes?: Flash[];
  flashOn?: FlashOn;
  /** Frames of black to come in from, and to go out to. */
  fadeIn?: number;
  fadeOut?: number;
  keys?: KeyPress[];
  /** A card to show instead of the game. */
  card?: CardSpec;
}

/** Presses during the run-up to a trigger, which the video never shows. */
export interface AutoPress { code: string; from: number; every: number; hold?: number }

export interface FadeSpec { fadeIn: number; fadeOut: number }

/** What the page reaches into. window.__ud holds these. */
export interface Ud {
  g: Game;
  cap: Capture;
  frame: HTMLCanvasElement;
  play?: { sim: Sim; camera: Camera };
  demo: unknown;
}
