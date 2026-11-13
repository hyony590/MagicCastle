import type { LevelDef } from './types';

// 다섯 번째 레벨: 불꽃이 늘어난 회랑. 막다른 곳마다 몬스터 3마리, 상자 2개.
export const level5: LevelDef = {
  name: '횃불 회랑',
  start: { x: 704, facing: -1 },
  floors: [
    [[0, 24]],
    [[0, 10], [12, 24]],
    [[0, 3], [5, 19], [21, 24]],
    [[0, 14], [16, 24]],
    [[0, 6], [8, 24]],
  ],
  ladders: [
    { floor: 0, x: 160 },
    { floor: 1, x: 512 },
    { floor: 2, x: 192 },
    { floor: 3, x: 688 },
  ],
  items: [
    { kind: 'coin', floor: 0, x: 320 },
    { kind: 'coin', floor: 0, x: 520 },
    { kind: 'apple', floor: 1, x: 64 },
    { kind: 'apple', floor: 1, x: 280 },
    { kind: 'apple', floor: 1, x: 640 },
    { kind: 'gem', floor: 2, x: 48 },
    { kind: 'gem', floor: 2, x: 360 },
    { kind: 'gem', floor: 2, x: 720 },
    { kind: 'coin', floor: 3, x: 80 },
    { kind: 'coin', floor: 3, x: 320 },
    { kind: 'coin', floor: 3, x: 600 },
    { kind: 'apple', floor: 4, x: 80 },
    { kind: 'apple', floor: 4, x: 400 },
    { kind: 'apple', floor: 4, x: 560 },
  ],
  chests: [
    { floor: 0, x: 32 },
    { floor: 3, x: 32 },
  ],
  letters: [
    { char: 'S', floor: 2, x: 448 },
  ],
  enemies: [
    { floor: 1, x: 48, dir: 1, speed: 70, range: [0, 120] },
    { floor: 2, x: 736, dir: -1, speed: 60, range: [696, 768] },
    { floor: 4, x: 96, dir: 1, speed: 90, range: [0, 160] },
  ],
  traps: [
    { floor: 0, x: 240 },
    { floor: 0, x: 416 },
    { floor: 2, x: 280 },
    { floor: 3, x: 560 },
    { floor: 4, x: 480 },
  ],
};
