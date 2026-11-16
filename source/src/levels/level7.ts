import type { LevelDef } from './types';

// 일곱 번째 레벨: 층마다 사다리가 두 개. 몬스터가 한쪽 길을 막으면 다른 길로 돌아간다.
export const level7: LevelDef = {
  name: '쌍둥이 사다리',
  start: { x: 704, facing: -1 },
  floors: [
    [[0, 24]],
    [[0, 9], [11, 14], [16, 24]],
    [[0, 11], [17, 24]],
    [[0, 5],[10, 16], [19, 24]],
    [[0, 6], [8, 17], [19, 24]],
  ],
  ladders: [
    { floor: 0, x: 80 },
    { floor: 1, x: 150 },
    { floor: 1, x: 650 },
    { floor: 2, x: 40 },
    { floor: 2, x: 688 },
    { floor: 3, x: 90 },
    { floor: 3, x: 400 },
    { floor: 3, x: 640 },
  ],
  items: [
    { kind: 'gem', floor: 1, x: 400 },
    { kind: 'coin', floor: 2, x: 320 },
    { kind: 'coin', floor: 2, x: 560 },
    { kind: 'apple', floor: 3, x: 340 },
    { kind: 'gem', floor: 4, x: 720 },
  ],
  chests: [
    { floor: 2, x: 80,enemy: {range: [0, 768], crossGaps : true} },
  ],
  letters: [
    { char: 'G', floor: 4, x: 40 },
  ],
  enemies: [
    { floor: 1, x: 160, dir: 1, speed: 100, range: [0, 768], crossGaps : true },
    { floor: 4, x: 736, dir: -1, speed: 70, range: [0, 768], crossGaps : true },
  ],
  traps: [
    { floor: 0, x: 630 },
    { floor: 0, x: 550 },
    { floor: 0, x: 470 },
    { floor: 0, x: 390 },
    { floor: 1, x: 210 },
    { floor: 1, x: 600 },
    { floor: 2, x: 620 },
    { floor: 4, x: 330 },
    { floor: 4, x: 470 },
  ],
};
