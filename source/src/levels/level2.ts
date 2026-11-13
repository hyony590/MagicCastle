import type { LevelDef } from './types';

// 두 번째 레벨: 갈래 길, 상자 2개, 길목 옆에서 아이템을 지키는 몬스터 2마리.
// 몬스터는 뛰어넘을 수 없으므로 순찰 범위가 지나가야 하는 길을 막지 않게 배치했다.
export const level2: LevelDef = {
  name: '갈림길 회랑',
  start: { x: 704, facing: -1 },
  floors: [
    [[0, 24]],
    [[0, 6], [8, 18], [20, 24]],
    [[0, 11], [13, 24]],
    [[0, 8], [10, 24]],
    [[0, 10], [12, 18], [20, 24]],
  ],
  ladders: [
    { floor: 0, x: 141 },
    { floor: 0, x: 653 },
    { floor: 1, x: 346 },
    { floor: 2, x: 448 },
    { floor: 3, x: 218 },
  ],
  items: [
    { kind: 'coin', floor: 0, x: 384 },
    { kind: 'coin', floor: 1, x: 320 },
    { kind: 'gem', floor: 1, x: 720 },
    { kind: 'coin', floor: 2, x: 64 },
    { kind: 'gem', floor: 2, x: 624 },
    { kind: 'coin', floor: 3, x: 160 },
    { kind: 'gem', floor: 3, x: 384 },
    { kind: 'coin', floor: 4, x: 48 },
    { kind: 'coin', floor: 4, x: 480 },
    { kind: 'gem', floor: 4, x: 720 },
  ],
  chests: [
    { floor: 1, x: 16 },
    { floor: 3, x: 608 },
  ],
  letters: [
    { char: 'T', floor: 3, x: 48 },
  ],
  enemies: [
    { floor: 2, x: 640, dir: 1, speed: 80, range: [488, 768] },
    { floor: 4, x: 120, dir: -1, speed: 60, range: [0, 180] },
  ],
  traps: [
    { floor: 0, x: 512 },
  ],
};
