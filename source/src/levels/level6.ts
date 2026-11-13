import type { LevelDef } from './types';

// 여섯 번째 레벨: 잘게 부서진 발판. 틈을 여러 번 연달아 건너야 한다. 몬스터 4마리.
export const level6: LevelDef = {
  name: '부서진 탑',
  start: { x: 704, facing: -1 },
  floors: [
    [[0, 24]],
    [[0, 4], [6, 12], [14, 19], [21, 24]],
    [[0, 8], [10, 16], [18, 24]],
    [[0, 3], [5, 11], [13, 24]],
    [[0, 7], [9, 15], [17, 24]],
  ],
  ladders: [
    { floor: 0, x: 720 },
    { floor: 1, x: 208 },
    { floor: 2, x: 480 },
    { floor: 3, x: 192 },
  ],
  items: [
    { kind: 'gem', floor: 0, x: 240 },
    { kind: 'gem', floor: 0, x: 480 },
    { kind: 'coin', floor: 1, x: 64 },
    { kind: 'coin', floor: 1, x: 280 },
    { kind: 'coin', floor: 1, x: 520 },
    { kind: 'coin', floor: 1, x: 720 },
    { kind: 'apple', floor: 2, x: 80 },
    { kind: 'apple', floor: 2, x: 416 },
    { kind: 'apple', floor: 2, x: 680 },
    { kind: 'gem', floor: 3, x: 48 },
    { kind: 'gem', floor: 3, x: 240 },
    { kind: 'gem', floor: 3, x: 640 },
    { kind: 'coin', floor: 4, x: 80 },
    { kind: 'coin', floor: 4, x: 384 },
    { kind: 'coin', floor: 4, x: 720 },
  ],
  chests: [
    { floor: 2, x: 32 },
  ],
  letters: [
    { char: 'T', floor: 3, x: 304 },
  ],
  enemies: [
    { floor: 1, x: 48, dir: 1, speed: 60, range: [0, 96] },
    { floor: 2, x: 680, dir: 1, speed: 90, range: [608, 768] },
    { floor: 3, x: 680, dir: -1, speed: 80, range: [544, 768] },
    { floor: 4, x: 680, dir: 1, speed: 100, range: [584, 768] },
  ],
  traps: [
    { floor: 0, x: 360 },
    { floor: 1, x: 304 },
    { floor: 2, x: 360 },
    { floor: 3, x: 576 },
    { floor: 4, x: 352 },
  ],
};
