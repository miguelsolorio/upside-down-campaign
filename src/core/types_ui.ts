// The dialogue and story types and the gfx vocabulary. Split out of types.ts to keep that file under 500 lines; types.ts
// re-exports all of it, so import from there. The same contract rule applies: report changes, don't make them.
import type { CharId } from './types.ts';

// ---------------------------------------------------------------- dialogue and story
export type Expr = 'neutral' | 'happy' | 'worried' | 'determined' | 'hurt' | 'shocked';
export type Speaker = CharId | 'dm' | 'narrator';
/** text: up to 3 lines of 32 characters. Use "\n" for a hard break. */
export interface DialogueLine { who: Speaker; text: string; expr?: Expr }
export interface DialogueScript { id: string; lines: DialogueLine[] }

export type BarkEvent = 'swapIn' | 'levelUp' | 'ko' | 'lowHp' | 'special' | 'kill' | 'eggo' | 'crit' | 'idle';

// ---------------------------------------------------------------- gfx vocabulary
export type IconId =
  | 'bulbRed' | 'bulbYellow' | 'bulbGreen' | 'bulbBlue' | 'bulbOff'
  | 'd20' | 'd20Glow' | 'eggo' | 'coke' | 'quarter' | 'arrow' | 'cursor' | 'cursorDown' | 'cursorUp' | 'heart';
export type PanelStyle = 'dialog' | 'hud' | 'menu';
export interface TextOpts { align?: 'left' | 'center' | 'right'; shadow?: boolean }

