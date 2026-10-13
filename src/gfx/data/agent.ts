// Lab agent body: hazmat hood with a mask, baggy suit, boots. Role letters here:
//   a suit  b suit seam  g mask  G filter  e lens glint  p boots  s gloves
import type { BodyDef, Part } from './types.ts';

const none: Part = { y: 0, rows: [] };
const noFace = { down: none, up: none, side: none };

export const AGENT_BODY: BodyDef = {
  head: {
    down: { y: 2, rows: [
      '.....aaaaaa.....',
      '....aaaaaaaa....',
      '....agggggga....',
      '....ageggega....',
      '....agggggga....',
      '....aagGGgaa....',
      '.....bbbbbb.....',
    ] },
    up: { y: 2, rows: [
      '.....aaaaaa.....',
      '....aaaaaaaa....',
      '....aaabbaaa....',
      '....aaabbaaa....',
      '....aaabbaaa....',
      '....aaaaaaaa....',
      '.....bbbbbb.....',
    ] },
    side: { y: 2, rows: [
      '.....aaaaaa.....',
      '....aaaaaaaa....',
      '....aaaaaaggg...',
      '....aaaaaaegg...',
      '....aaaaaaggG...',
      '....aaaaaaaaGG..',
      '.....bbbbbb.....',
    ] },
  },
  face: { open: noFace, closed: noFace, ko: noFace, hurt: noFace },
  torso: {
    down: { y: 9, rows: ['....aaaaaaaa....', '....aaabbaaa....', '....aaabbaaa....', '....bbbbbbbb....'] },
    up: { y: 9, rows: ['....aaggggaa....', '....aaGGGGaa....', '....aaggggaa....', '....bbbbbbbb....'] },
    side: { y: 9, rows: ['...ggaaaaaa.....', '...GGaaaaaa.....', '...ggaaaaaa.....', '.....bbbbbb.....'] },
  },
  legs: {
    down: {
      stand: { y: 12, rows: ['....aaa..aaa....', '....aaa..aaa....', '....ppp..ppp....'] },
      stepA: { y: 12, rows: ['....aaa..aaa....', '....aaa..ppp....', '....ppp.........'] },
      stepB: { y: 12, rows: ['....aaa..aaa....', '....ppp..aaa....', '.........ppp....'] },
      wide: { y: 12, rows: ['...aaa....aaa...', '...aaa....aaa...', '...ppp....ppp...'] },
    },
    up: {
      stand: { y: 12, rows: ['....aaa..aaa....', '....aaa..aaa....', '....ppp..ppp....'] },
      stepA: { y: 12, rows: ['....aaa..aaa....', '....aaa..ppp....', '....ppp.........'] },
      stepB: { y: 12, rows: ['....aaa..aaa....', '....ppp..aaa....', '.........ppp....'] },
      wide: { y: 12, rows: ['...aaa....aaa...', '...aaa....aaa...', '...ppp....ppp...'] },
    },
    side: {
      stand: { y: 12, rows: ['.....aaaaa......', '.....aaaaa......', '.....pppppp.....'] },
      stepA: { y: 12, rows: ['.....aaaaa......', '....aa...aa.....', '...pp.....ppp...'] },
      stepB: { y: 12, rows: ['.....aaaaa......', '....aa...aa.....', '...pp.....ppp...'] },
      wide: { y: 12, rows: ['....aaaaaaa.....', '...aa.....aa....', '..pp.......ppp..'] },
    },
  },
  shoulder: {
    down: [[4, 9], [11, 9]],
    up: [[4, 9], [11, 9]],
    side: [[7, 9], [8, 9]],
  },
  arms: {
    down: {
      rest: [[4, 12], [11, 12]],
      swingA: [[4, 11], [11, 13]],
      swingB: [[4, 13], [11, 11]],
      windup: [[4, 12], [12, 6]],
      strike: [[4, 12], [10, 11]],
      raise: [[2, 7], [13, 7]],
      thrust: [[7, 11], [8, 11]],
      back: [[3, 11], [12, 11]],
      flail: [[2, 10], [13, 10]],
    },
    up: {
      rest: [[4, 12], [11, 12]],
      swingA: [[4, 11], [11, 13]],
      swingB: [[4, 13], [11, 11]],
      windup: [[4, 12], [12, 6]],
      strike: [[4, 12], [10, 8]],
      raise: [[2, 7], [13, 7]],
      thrust: [[4, 9], [11, 9]],
      back: [[3, 11], [12, 11]],
      flail: [[2, 10], [13, 10]],
    },
    side: {
      rest: [[7, 12], [8, 12]],
      swingA: [[5, 12], [10, 11]],
      swingB: [[9, 11], [6, 12]],
      windup: [[5, 11], [7, 7]],
      strike: [[7, 11], [12, 10]],
      raise: [[9, 7], [11, 8]],
      thrust: [[10, 10], [13, 10]],
      back: [[4, 11], [5, 12]],
      flail: [[5, 8], [4, 11]],
    },
  },
};
