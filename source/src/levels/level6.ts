import type { LevelDef } from './types';

// 여섯 번째 레벨: 잘게 부서진 발판. 틈을 여러 번 연달아 건너야 한다. 몬스터 4마리.
export const level6: LevelDef = {
  name: '부서진 탑',
  start: { x: 704, facing: -1 },
  floors: [
    [[0, 24]],
    [[0, 9], [14, 24]],
    [[0, 4], [6, 11], [16, 24]],
    [[0, 6], [10, 18], [20, 24]],
    [[0, 6], [8, 15], [17, 20], [22, 24]],
  ],
  ladders: [
    { floor: 0, x: 80 },
    { floor: 1, x: 220 },
    { floor: 1, x: 650 },
    { floor: 2, x: 40 },
    { floor: 2, x: 550 },
    { floor: 3, x: 100 },
    { floor: 3, x: 370 },
  ],
  items: [
    { kind: 'gem', floor: 0, x: 240 },
    { kind: 'coin', floor: 1, x: 600 },
    { kind: 'apple', floor: 2, x: 320 },
    { kind: 'apple', floor: 2, x: 740 },
    { kind: 'gem', floor: 3, x: 740 },
    { kind: 'coin', floor: 4, x: 40 },
    { kind: 'coin', floor: 4, x: 720 },
  ],
  chests: [
    { floor: 2, x: 260 ,enemy: {range: [0, 768], crossGaps : true}},
    { floor: 4, x: 300 ,enemy: {range: [0, 768], crossGaps : true}},
  ],
  letters: [
    { char: 'T', floor: 4, x: 600 },
  ],
  enemies: [
    { floor: 1, x: 48, dir: 1, speed: 60, range: [0, 768] , crossGaps : true},
    { floor: 3, x: 680, dir: -1, speed: 80, range: [0, 768] , crossGaps : true},
  ],
  traps: [
    { floor: 0, x: 630 },
    { floor: 0, x: 550 },
    { floor: 0, x: 470 },
    { floor: 1, x: 140 },
    { floor: 1, x: 500 },
    { floor: 2, x: 600 },
    { floor: 3, x: 450 },
    { floor: 4, x: 420 },
  ],
};
