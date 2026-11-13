import type { LevelDef } from './types';

// 아홉 번째 레벨: 4조각으로 나뉜 층이 이어진다. 빠른 몬스터 4마리와 불꽃을 함께 넘어야 한다.
export const level9: LevelDef = {
  name: '끊어진 층계',
  start: { x: 704, facing: -1 },
  floors: [
    [[0, 24]],
    [[0, 3], [5, 10], [12, 16], [18, 24]],
    [[0, 7], [9, 14], [16, 24]],
    [[0, 5], [7, 11], [13, 18], [20, 24]],
    [[0, 10], [12, 24]],
  ],
  ladders: [
    { floor: 0, x: 232 },
    { floor: 0, x: 448 },
    { floor: 1, x: 48 },
    { floor: 1, x: 640 },
    { floor: 2, x: 320 },
    { floor: 2, x: 720 },
    { floor: 3, x: 80 },
    { floor: 3, x: 480 },
  ],
  items: [
    { kind: 'gem', floor: 0, x: 80 },
    { kind: 'gem', floor: 0, x: 680 },
    { kind: 'apple', floor: 1, x: 80 },
    { kind: 'apple', floor: 1, x: 264 },
    { kind: 'apple', floor: 1, x: 416 },
    { kind: 'apple', floor: 1, x: 720 },
    { kind: 'coin', floor: 2, x: 176 },
    { kind: 'coin', floor: 2, x: 360 },
    { kind: 'coin', floor: 2, x: 560 },
    { kind: 'gem', floor: 3, x: 32 },
    { kind: 'gem', floor: 3, x: 280 },
    { kind: 'gem', floor: 3, x: 520 },
    { kind: 'gem', floor: 3, x: 680 },
    { kind: 'apple', floor: 4, x: 200 },
    { kind: 'apple', floor: 4, x: 560 },
    { kind: 'apple', floor: 4, x: 720 },
  ],
  chests: [
    { floor: 0, x: 24 },
  ],
  letters: [
    { char: 'S', floor: 2, x: 400 },
  ],
  enemies: [
    { floor: 0, x: 340, dir: 1, speed: 110, range: [260, 420] },
    { floor: 2, x: 560, dir: -1, speed: 100, range: [486, 608] },
    { floor: 3, x: 240, dir: -1, speed: 90, range: [205, 264] },
    { floor: 4, x: 640, dir: 1, speed: 120, range: [528, 768] },
  ],
  traps: [
    { floor: 0, x: 336 },
    { floor: 0, x: 576 },
    { floor: 1, x: 688 },
    { floor: 2, x: 112 },
    { floor: 4, x: 272 },
    { floor: 4, x: 640 },
  ],
};
