// Adult body template: smaller head and a longer torso than the kid. Legs and arm targets are shared with the kid.
import type { BodyDef } from './types.ts';
import { KID } from './kid.ts';

export const ADULT: BodyDef = {
  ...KID,
  head: {
    down: { y: 2, rows: [
      '.....ssssss.....',
      '....ssssssss....',
      '....ssssssss....',
      '....ssssssss....',
      '....ssssssss....',
      '.....ssssss.....',
    ] },
    up: { y: 2, rows: [
      '.....ssssss.....',
      '....ssssssss....',
      '....ssssssss....',
      '....ssssssss....',
      '....ssssssss....',
      '.....ssssss.....',
    ] },
    side: { y: 2, rows: [
      '.....ssssss.....',
      '....ssssssss....',
      '....ssssssss....',
      '....sssdsssss...',
      '....ssssssss....',
      '.....ssssss.....',
    ] },
  },
  face: {
    open: {
      down: { y: 4, rows: ['......e..e......', '......e..e......'] },
      up: { y: 4, rows: [] },
      side: { y: 4, rows: ['..........e.....', '..........e.....'] },
    },
    closed: {
      down: { y: 5, rows: ['......e..e......'] },
      up: { y: 5, rows: [] },
      side: { y: 5, rows: ['..........e.....'] },
    },
    ko: {
      down: { y: 4, rows: ['.....e.ee.e.....', '......e..e......', '.....e.ee.e.....'] },
      up: { y: 4, rows: [] },
      side: { y: 4, rows: ['.........e.e....', '..........e.....', '.........e.e....'] },
    },
    hurt: {
      down: { y: 4, rows: ['.....ee..ee.....', '......e..e......', '.......ee.......'] },
      up: { y: 4, rows: [] },
      side: { y: 4, rows: ['.........ee.....', '..........e.....', '..........ee....'] },
    },
  },
  torso: {
    down: { y: 8, rows: ['.....aaaaaa.....', '.....aaaaaa.....', '.....aaaaaa.....', '.....aaaaaa.....'] },
    up: { y: 8, rows: ['.....aaaaaa.....', '.....aaaaaa.....', '.....aaaaaa.....', '.....aaaaaa.....'] },
    side: { y: 8, rows: ['......aaaa......', '......aaaa......', '......aaaa......', '......aaaa......'] },
  },
  shoulder: {
    down: [[5, 8], [10, 8]],
    up: [[5, 8], [10, 8]],
    side: [[7, 8], [8, 8]],
  },
};
