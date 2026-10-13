// Dispatch for the heroes' moves. The sim calls these when the player presses attack or special.
import type { Hero, S } from '../combat/state.ts';
import { mikeBasic, mikeSpecial } from './mike.ts';
import { dustinBasic, dustinSpecial } from './dustin.ts';
import { lucasBasic, lucasSpecial } from './lucas.ts';
import { elevenBasic, elevenSpecial } from './eleven.ts';

export function useBasic(s: S, h: Hero): void {
  switch (h.id) {
    case 'mike': mikeBasic(s, h); break;
    case 'dustin': dustinBasic(s, h); break;
    case 'lucas': lucasBasic(s, h); break;
    case 'eleven': elevenBasic(s, h); break;
  }
}

export function useSpecial(s: S, h: Hero): void {
  switch (h.id) {
    case 'mike': mikeSpecial(s, h); break;
    case 'dustin': dustinSpecial(s, h); break;
    case 'lucas': lucasSpecial(s, h); break;
    case 'eleven': elevenSpecial(s, h); break;
  }
}
