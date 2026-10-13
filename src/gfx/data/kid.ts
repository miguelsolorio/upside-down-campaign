// Kid body template for the paper-doll actors. Every row is 16 columns wide so the art lines up with the
// 16x16 cell. Parts carry no outline: the engine adds a 1 px dark outline around the finished silhouette.
//
// Role letters (each character maps them to palette colors):
//   s skin   d skin shade   e eye/dark detail   w white   h hair   i hair light
//   a shirt  b shirt accent c shirt accent 2    p pants   q pants shade   f shoes
//   g gear   G gear 2       H gear 3            x misc    y misc 2        r blood
import type { BodyDef } from './types.ts';

export const KID: BodyDef = {
  // The head is 8 wide and 7 tall. Eyes come from the face overlays below.
  head: {
    down: { y: 2, rows: [
      '.....ssssss.....',
      '....ssssssss....',
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
      '....ssssssss....',
      '.....ssssss.....',
    ] },
    side: { y: 2, rows: [
      '.....ssssss.....',
      '....ssssssss....',
      '....ssssssss....',
      '....ssssssss....',
      '....sssdsssss...',
      '....ssssssss....',
      '.....ssssss.....',
    ] },
  },
  face: {
    open: {
      down: { y: 5, rows: ['......e..e......', '......e..e......'] },
      up: { y: 5, rows: [] },
      side: { y: 5, rows: ['..........e.....', '..........e.....'] },
    },
    closed: {
      down: { y: 6, rows: ['......e..e......'] },
      up: { y: 6, rows: [] },
      side: { y: 6, rows: ['..........e.....'] },
    },
    ko: {
      down: { y: 5, rows: ['.....e.ee.e.....', '......e..e......', '.....e.ee.e.....'] },
      up: { y: 5, rows: [] },
      side: { y: 5, rows: ['.........e.e....', '..........e.....', '.........e.e....'] },
    },
    hurt: {
      down: { y: 5, rows: ['.....ee..ee.....', '......e..e......', '.......ee.......'] },
      up: { y: 5, rows: [] },
      side: { y: 5, rows: ['.........ee.....', '..........e.....', '..........ee....'] },
    },
  },
  torso: {
    down: { y: 9, rows: ['.....aaaaaa.....', '.....aaaaaa.....', '.....aaaaaa.....'] },
    up: { y: 9, rows: ['.....aaaaaa.....', '.....aaaaaa.....', '.....aaaaaa.....'] },
    side: { y: 9, rows: ['......aaaa......', '......aaaa......', '......aaaa......'] },
  },
  // Legs start at y=11 so a body bob never opens a gap at the hips.
  legs: {
    down: {
      stand: { y: 11, rows: ['.....pp..pp.....', '.....pp..pp.....', '.....pp..pp.....', '.....ff..ff.....'] },
      stepA: { y: 11, rows: ['.....pp..pp.....', '.....pp..pp.....', '.....pp..ff.....', '.....ff.........'] },
      stepB: { y: 11, rows: ['.....pp..pp.....', '.....pp..pp.....', '.....ff..pp.....', '..........ff....'] },
      wide: { y: 11, rows: ['....pp....pp....', '....pp....pp....', '....pp....pp....', '....ff....ff....'] },
    },
    up: {
      stand: { y: 11, rows: ['.....pp..pp.....', '.....pp..pp.....', '.....pp..pp.....', '.....ff..ff.....'] },
      stepA: { y: 11, rows: ['.....pp..pp.....', '.....pp..pp.....', '.....pp..ff.....', '.....ff.........'] },
      stepB: { y: 11, rows: ['.....pp..pp.....', '.....pp..pp.....', '.....ff..pp.....', '..........ff....'] },
      wide: { y: 11, rows: ['....pp....pp....', '....pp....pp....', '....pp....pp....', '....ff....ff....'] },
    },
    side: {
      stand: { y: 11, rows: ['......pppp......', '......pppp......', '......pppp......', '......fffff.....'] },
      stepA: { y: 11, rows: ['......pppp......', '......pppp......', '.....qq..pp.....', '....ff....fff...'] },
      stepB: { y: 11, rows: ['......pppp......', '......pppp......', '.....pp..qq.....', '....ff....fff...'] },
      wide: { y: 11, rows: ['.....pppppp.....', '....qq....pp....', '...qq......pp...', '..ff.......fff..'] },
    },
  },
  // Shoulder anchors in cell coordinates: [back or left, front or right].
  shoulder: {
    down: [[5, 9], [10, 9]],
    up: [[5, 9], [10, 9]],
    side: [[7, 9], [8, 9]],
  },
  // Hand targets per arm pose, in cell coordinates.
  arms: {
    down: {
      rest: [[5, 11], [10, 11]],
      swingA: [[5, 10], [10, 12]],
      swingB: [[5, 12], [10, 10]],
      windup: [[5, 11], [12, 5]],
      strike: [[5, 11], [8, 12]],
      raise: [[3, 6], [12, 6]],
      thrust: [[7, 10], [8, 10]],
      back: [[4, 10], [11, 10]],
      flail: [[3, 9], [12, 9]],
    },
    up: {
      rest: [[5, 11], [10, 11]],
      swingA: [[5, 10], [10, 12]],
      swingB: [[5, 12], [10, 10]],
      windup: [[5, 11], [12, 5]],
      strike: [[5, 11], [7, 4]],
      raise: [[3, 6], [12, 6]],
      thrust: [[5, 8], [10, 8]],
      back: [[4, 10], [11, 10]],
      flail: [[3, 9], [12, 9]],
    },
    side: {
      rest: [[7, 11], [8, 11]],
      swingA: [[5, 11], [10, 10]],
      swingB: [[9, 10], [6, 11]],
      windup: [[5, 10], [6, 7]],
      strike: [[7, 10], [12, 9]],
      raise: [[9, 6], [11, 7]],
      thrust: [[10, 9], [13, 9]],
      back: [[4, 10], [5, 11]],
      flail: [[5, 7], [4, 10]],
    },
  },
};
