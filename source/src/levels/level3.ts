import type { LevelDef } from './types';

// 세 번째 레벨: 지그재그로 오르는 계단. 꼭대기 오른쪽에 몬스터 1마리.
export const level3: LevelDef = {
  name: '등불 계단',
  start: { x: 704, facing: -1 },
  floors: [
    [[0, 24]],
    [[0, 8], [10, 24]],
    [[0, 16], [18, 24]],
    [[0, 5], [7, 24]],
    [[0, 11], [13, 24]],
  ],
  ladders: [
    { floor: 0, x: 720 },
    { floor: 1, x: 77 },
    { floor: 2, x: 688 },
    { floor: 3, x: 256 },
  ],
  items: [
    { kind: 'apple', floor: 0, x: 240 },
    { kind: 'apple', floor: 0, x: 496 },
    { kind: 'gem', floor: 1, x: 160 },
    { kind: 'gem', floor: 1, x: 560 },
    { kind: 'coin', floor: 2, x: 240 },
    { kind: 'coin', floor: 2, x: 448 },
    { kind: 'coin', floor: 2, x: 640 },
    { kind: 'apple', floor: 3, x: 80 },
    { kind: 'apple', floor: 3, x: 480 },
    { kind: 'gem', floor: 4, x: 120 },
    { kind: 'gem', floor: 4, x: 560 },
    { kind: 'gem', floor: 4, x: 720 },
  ],
  chests: [
    { floor: 3, x: 32 },
  ],
  letters: [
    { char: 'A', floor: 1, x: 32 },
  ],
  enemies: [
    { floor: 4, x: 640, dir: 1, speed: 70, range: [448, 768] },
  ],
  traps: [
    { floor: 0, x: 368 },
    { floor: 2, x: 336 },
  ],
};
