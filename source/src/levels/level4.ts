import type { LevelDef } from './types';

// 네 번째 레벨: 틈이 많은 다리. 양쪽 끝 막다른 곳에 몬스터 2마리.
export const level4: LevelDef = {
  name: '갈라진 다리',
  start: { x: 704, facing: -1 },
  floors: [
    [[0, 24]],
    [[0, 5], [7, 14], [19, 24]],
    [[0, 16], [18, 24]],
    [[0, 8], [10, 15], [17, 24]],
    [[0, 8], [10, 24]],
  ],
  ladders: [
    { floor: 0, x: 380 },
    { floor: 1, x: 260 },
    { floor: 1, x: 660 },
    { floor: 2, x: 150 },
    { floor: 3, x: 400 },
  ],
  items: [
    { kind: 'coin', floor: 0, x: 100 },
    { kind: 'gem', floor: 1, x: 112 },
    { kind: 'gem', floor: 1, x: 720 },
    { kind: 'apple', floor: 2, x: 700 },
    { kind: 'coin', floor: 3, x: 80 },
    { kind: 'coin', floor: 3, x: 580 },
    { kind: 'gem', floor: 4, x: 120 },
    { kind: 'gem', floor: 4, x: 700 },
  ],
  chests: [
    { floor: 2, x: 80 ,enemy: {range: [0, 768], crossGaps : true}},
    { floor: 4, x: 500 ,enemy: {range: [0, 768], crossGaps : true}},
  ],
  letters: [
    { char: 'K', floor: 3, x: 740 },
  ],
  enemies: [
    { floor: 1, x: 300, dir: -1, speed: 70, range: [0, 768], crossGaps : true},
  ],
  traps: [
    { floor: 0, x: 600 },
    { floor: 0, x: 500 },
    { floor: 2, x: 330 },
    { floor: 2, x: 430 },
    { floor: 3, x: 210 },
    { floor: 4, x: 180 },
    { floor: 4, x: 600 },
  ],
};
