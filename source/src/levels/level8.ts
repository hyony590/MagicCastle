import type { LevelDef } from './types';

// 여덟 번째 레벨: 빠른 몬스터가 사다리 사이를 지킨다. 돌아가는 길을 찾아야 한다.
export const level8: LevelDef = {
  name: '바람의 층',
  start: { x: 704, facing: -1 },
  floors: [
    [[0, 24]],
    [[0, 6], [8, 16], [18, 24]],
    [[0, 12], [14, 24]],
    [[0, 4], [6, 10], [12, 18], [20, 24]],
    [[0, 9], [11, 24]],
  ],
  ladders: [
    { floor: 0, x: 384 },
    { floor: 1, x: 80 },
    { floor: 1, x: 704 },
    { floor: 2, x: 304 },
    { floor: 2, x: 480 },
    { floor: 3, x: 80 },
    { floor: 3, x: 704 },
  ],
  items: [
    { kind: 'coin', floor: 0, x: 160 },
    { kind: 'coin', floor: 0, x: 560 },
    { kind: 'gem', floor: 1, x: 144 },
    { kind: 'gem', floor: 1, x: 448 },
    { kind: 'gem', floor: 1, x: 640 },
    { kind: 'apple', floor: 2, x: 200 },
    { kind: 'apple', floor: 2, x: 624 },
    { kind: 'coin', floor: 3, x: 48 },
    { kind: 'coin', floor: 3, x: 240 },
    { kind: 'coin', floor: 3, x: 520 },
    { kind: 'coin', floor: 3, x: 720 },
    { kind: 'gem', floor: 4, x: 160 },
    { kind: 'gem', floor: 4, x: 520 },
    { kind: 'gem', floor: 4, x: 752 },
  ],
  chests: [
    { floor: 0, x: 32 },
  ],
  letters: [
    { char: 'R', floor: 1, x: 288 },
  ],
  enemies: [
    { floor: 2, x: 200, dir: 1, speed: 100, range: [120, 264] },
    { floor: 4, x: 200, dir: 1, speed: 100, range: [128, 282] },
    { floor: 4, x: 544, dir: 1, speed: 110, range: [448, 640] },
  ],
  traps: [
    { floor: 0, x: 264 },
    { floor: 0, x: 480 },
    { floor: 2, x: 136 },
    { floor: 2, x: 560 },
    { floor: 4, x: 400 },
  ],
};
