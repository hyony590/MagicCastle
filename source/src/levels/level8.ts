import type { LevelDef } from './types';

// 여덟 번째 레벨: 빠른 몬스터가 사다리 사이를 지킨다. 돌아가는 길을 찾아야 한다.
export const level8: LevelDef = {
  name: '바람의 층',
  start: { x: 704, facing: -1 },
  floors: [
    [[0, 24]],
    [[0, 6], [8, 14], [16, 24]],
    [[0, 10], [14, 24]],
    [[0, 8], [12, 18], [20, 24]],
    [[0, 11], [13, 18], [20, 24]],
  ],
  ladders: [
    { floor: 0, x: 100 },
    { floor: 1, x: 130 },
    { floor: 2, x: 40 },
    { floor: 2, x: 480 },
    { floor: 3, x: 90 },
    { floor: 3, x: 680 },
  ],
  items: [
    { kind: 'coin', floor: 0, x: 40 },
    { kind: 'gem', floor: 1, x: 700 },
    { kind: 'apple', floor: 2, x: 260 },
    { kind: 'apple', floor: 2, x: 740 },
    { kind: 'gem', floor: 4, x: 160 },
    { kind: 'gem', floor: 4, x: 720 },
  ],
  chests: [
    { floor: 0, x: 180,enemy: {range: [0, 768], crossGaps : true} },
    { floor: 1, x: 300,enemy: {range: [0, 768], crossGaps : true} },
  ],
  letters: [
    
  ],
  enemies: [
    { floor: 2, x: 448, dir: -1, speed: 90, range: [0, 768], crossGaps : true },
    { floor: 3, x: 736, dir: -1, speed: 70, range: [0, 768], crossGaps : true },
  ],
  traps: [
    { floor: 0, x: 630 },
    { floor: 0, x: 550 },
    { floor: 0, x: 470 },
    { floor: 1, x: 380 },
    { floor: 1, x: 600 },
    { floor: 2, x: 540 },
    { floor: 2, x: 640 },
    { floor: 4, x: 300 },
    { floor: 4, x: 500 },
  ],
};
