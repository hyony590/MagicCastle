import type { LevelDef } from './types';

// 다섯 번째 레벨: 불꽃이 늘어난 회랑. 막다른 곳마다 몬스터 3마리, 상자 2개.
export const level5: LevelDef = {
  name: '횃불 회랑',
  start: { x: 704, facing: -1 },
  floors: [
    [[0, 24]],
    [[0, 9], [11, 24]],
    [[0, 9], [13, 17], [19, 24]],
    [[0, 6], [10, 24]],
    [[0, 5], [9, 17], [19, 24]],
  ],
  ladders: [
    { floor: 0, x: 400 },
    { floor: 1, x: 230 },
    { floor: 1, x: 660 },
    { floor: 2, x: 140 },
    { floor: 2, x: 430 },
    { floor: 3, x: 120 },
    { floor: 3, x: 370 },
  ],
  items: [
    { kind: 'coin', floor: 0, x: 240 },
    { kind: 'apple', floor: 1, x: 80 },
    { kind: 'apple', floor: 1, x: 600 },
    { kind: 'gem', floor: 2, x: 720 },
    { kind: 'coin', floor: 3, x: 600 },
    { kind: 'apple', floor: 4, x: 80 },
    { kind: 'apple', floor: 4, x: 720 },
  ],
  chests: [
    { floor: 2, x: 500, enemy: {range: [0, 768], crossGaps : true} },
  ],
  letters: [
    { char: 'I', floor: 0, x: 40 },
  ],
  enemies: [
    { floor: 4, x: 96, dir: 1, speed: 90, range: [0, 768], crossGaps : true },
  ],
  traps: [
    { floor: 0, x: 300 },
    { floor: 0, x: 600 },
    { floor: 1, x: 150 },
    { floor: 1, x: 500 },
    { floor: 2, x: 190 },
    { floor: 3, x: 450 },
    { floor: 4, x: 480 },
  ],
};
