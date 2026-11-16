import type { LevelDef } from './types';

// 세 번째 레벨: 지그재그로 오르는 계단. 꼭대기 오른쪽에 몬스터 1마리.
export const level3: LevelDef = {
  name: '등불 계단',
  start: { x: 704, facing: -1 },
  floors: [
    [[0, 24]],
    [[0, 8], [10, 16], [18, 24]],
    [[0, 10], [14, 24]],
    [[0, 13], [15, 24]],
    [[0, 7], [9, 15], [17, 24]],
  ],
  ladders: [
    { floor: 0, x: 180 },
    { floor: 1, x: 70 },
    { floor: 1, x: 620 },
    { floor: 2, x: 240 },
    { floor: 3, x: 680 },
  ],
  items: [
    { kind: 'apple', floor: 0, x: 100 },
    { kind: 'gem', floor: 1, x: 130 },
    { kind: 'gem', floor: 1, x: 700 },
    { kind: 'coin', floor: 2, x: 530 },
    { kind: 'apple', floor: 3, x: 40 },
    { kind: 'apple', floor: 3, x: 120 },
    { kind: 'gem', floor: 4, x: 120 },
  ],
  chests: [
    { floor: 1, x: 420, enemy: {range: [0, 768], crossGaps : true} },
    { floor: 3, x: 340, enemy: {range: [0, 768], crossGaps : true} },
  ],
  letters: [
    { char: 'A', floor: 0, x: 300 },
  ],
  enemies: [
    { floor: 2, x: 384, dir: 1, speed: 70, range: [0, 768], crossGaps : true },
  ],
  traps: [
    { floor: 0, x: 630 },
    { floor: 0, x: 550 },
    { floor: 0, x: 470 },
    { floor: 2, x: 700 },
    { floor: 3, x: 540 },
    { floor: 4, x: 390 },
  ],
};
