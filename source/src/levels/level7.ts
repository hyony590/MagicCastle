import type { LevelDef } from './types';

// 일곱 번째 레벨: 층마다 사다리가 두 개. 몬스터가 한쪽 길을 막으면 다른 길로 돌아간다.
export const level7: LevelDef = {
  name: '쌍둥이 사다리',
  start: { x: 704, facing: -1 },
  floors: [
    [[0, 24]],
    [[0, 11], [13, 24]],
    [[0, 5], [7, 18], [20, 24]],
    [[0, 10], [12, 24]],
    [[0, 3], [5, 19], [21, 24]],
  ],
  ladders: [
    { floor: 0, x: 80 },
    { floor: 0, x: 688 },
    { floor: 1, x: 240 },
    { floor: 1, x: 512 },
    { floor: 2, x: 128 },
    { floor: 2, x: 688 },
    { floor: 3, x: 256 },
    { floor: 3, x: 560 },
  ],
  items: [
    { kind: 'apple', floor: 0, x: 240 },
    { kind: 'apple', floor: 0, x: 544 },
    { kind: 'gem', floor: 1, x: 160 },
    { kind: 'gem', floor: 1, x: 608 },
    { kind: 'coin', floor: 2, x: 48 },
    { kind: 'coin', floor: 2, x: 400 },
    { kind: 'coin', floor: 2, x: 736 },
    { kind: 'apple', floor: 3, x: 80 },
    { kind: 'apple', floor: 3, x: 440 },
    { kind: 'apple', floor: 3, x: 736 },
    { kind: 'gem', floor: 4, x: 48 },
    { kind: 'gem', floor: 4, x: 360 },
    { kind: 'gem', floor: 4, x: 720 },
  ],
  chests: [
    { floor: 4, x: 400 },
  ],
  letters: [
    { char: 'A', floor: 3, x: 176 },
  ],
  enemies: [
    { floor: 1, x: 160, dir: 1, speed: 100, range: [112, 208] },
    { floor: 3, x: 448, dir: -1, speed: 90, range: [376, 512] },
    { floor: 4, x: 736, dir: -1, speed: 70, range: [704, 768] },
  ],
  traps: [
    { floor: 0, x: 160 },
    { floor: 0, x: 624 },
    { floor: 2, x: 320 },
    { floor: 4, x: 448 },
  ],
};
