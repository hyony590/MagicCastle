import type { LevelDef } from './types';

// 두 번째 레벨: 갈래 길, 상자 2개, 길목 옆에서 아이템을 지키는 몬스터 2마리.
// 몬스터는 뛰어넘을 수 없으므로 순찰 범위가 지나가야 하는 길을 막지 않게 배치했다.
export const level2: LevelDef = {
  name: '갈림길 회랑',
  start: { x: 704, facing: -1 },
  floors: [
    [[0, 24]],
    [[0, 8], [12, 24]],
    [[0, 6], [8, 24]],
    [[0, 13], [15, 24]],
    [[0, 6], [8, 16], [18, 24]],
  ],
  ladders: [
    { floor: 0, x: 141 },
    { floor: 0, x: 480 },
    { floor: 1, x: 600 },
    { floor: 2, x: 330 },
    { floor: 3, x: 100 },
  ],
  items: [
    { kind: 'coin', floor: 0, x: 240 },
    { kind: 'coin', floor: 1, x: 50 },
    { kind: 'gem', floor: 1, x: 700 },
    { kind: 'coin', floor: 2, x: 150 },
    { kind: 'coin', floor: 3, x: 220 },
    { kind: 'gem', floor: 3, x: 700 },
    { kind: 'gem', floor: 4, x: 680 },
  ],
  chests: [
    { floor: 2, x: 720, enemy: {range: [0, 768], crossGaps : true} },
    { floor: 3, x: 380, enemy: {range: [0, 768], crossGaps : true} },
  ],
  letters: [
    { char: 'T', floor: 4, x: 400 },
  ],
  enemies: [
    
  ],
  traps: [
    { floor: 0, x: 630 },
    { floor: 0, x: 550 },
    { floor: 2, x: 500 },
    { floor: 3, x: 550 },
    { floor: 4, x: 450 },
    { floor: 4, x: 340 },
  ],
};
