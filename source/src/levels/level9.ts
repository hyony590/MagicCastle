import type { LevelDef } from './types';

// 아홉 번째 레벨: 4조각으로 나뉜 층이 이어진다. 빠른 몬스터 4마리와 불꽃을 함께 넘어야 한다.
export const level9: LevelDef = {
  name: '끊어진 층계',
  start: { x: 704, facing: -1 },
  floors: [
    [[0, 24]],
    [[0, 12], [16, 24]],
    [[0, 10], [14, 24]],
    [[0, 10], [14, 24]],
    [[0, 12], [14, 18], [20, 24]],
  ],
  ladders: [
    { floor: 0, x: 100 },
    { floor: 0, x: 670 },
    { floor: 1, x: 140 },
    { floor: 2, x: 40 },
    { floor: 2, x: 520 },
    { floor: 3, x: 120 },
    { floor: 3, x: 660 },
  ],
  items: [
    { kind: 'apple', floor: 1, x: 350 },
    { kind: 'apple', floor: 1, x: 600 },
    { kind: 'coin', floor: 2, x: 280 },
    { kind: 'coin', floor: 2, x: 480 },
    { kind: 'coin', floor: 2, x: 710 },
    { kind: 'apple', floor: 4, x: 200 },
    { kind: 'apple', floor: 4, x: 700 },
  ],
  chests: [
    { floor: 0, x: 260,enemy: {range: [0, 768], crossGaps : true} },
    { floor: 3, x: 200,enemy: {range: [0, 768], crossGaps : true} },
  ],
  letters: [
  ],
  enemies: [
    { floor: 2, x: 560, dir: -1, speed: 100, range: [0, 768], crossGaps : true },
    { floor: 4, x: 640, dir: 1, speed: 120, range: [0, 768],crossGaps : true },
  ],
  traps: [
    { floor: 0, x: 630 },
    { floor: 0, x: 550 },
    { floor: 0, x: 470 },
    { floor: 1, x: 180 },
    { floor: 1, x: 260 },
    { floor: 2, x: 650 },
    { floor: 2, x: 570 },
    { floor: 4, x: 272 },
    { floor: 4, x: 510 },
  ],
};
