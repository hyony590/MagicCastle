import type { LevelDef } from './types';

// 첫 레벨: 틈 점프, 사다리, 불꽃 함정, 적 1마리를 차례로 익힌다.
export const level1: LevelDef = {
  name: '탑의 입구',
  start: { x: 704, facing: -1 },
  floors: [
    [[0, 24]],
    [[0, 10], [12, 24]],
    [[0, 6], [8, 24]],
    [[0, 4], [6, 16], [18, 24]],
    [[0, 8], [10, 24]],
  ],
  ladders: [
    { floor: 0, x: 230 },
    { floor: 1, x: 580 },
    { floor: 2, x: 300 },
    { floor: 3, x: 680 },
  ],
  items: [
    { kind: 'apple', floor: 0, x: 450 },
    { kind: 'apple', floor: 1, x: 50 },
    { kind: 'apple', floor: 1, x: 440 },
    { kind: 'gem', floor: 2, x: 740 },
    { kind: 'apple', floor: 3, x: 40 },
    { kind: 'gem', floor: 4, x: 100 },
    { kind: 'gem', floor: 4, x: 500 },
  ],
  chests: [
    // 몬스터가 나오면 1층 왼쪽 끝부터 오른쪽 끝까지(틈 위도 지나서) 왔다 갔다 한다.
    { floor: 1, x: 680, enemy: { range: [0, 768], crossGaps: true } },
  ],
  letters: [
    
  ],
  enemies: [
    
  ],
  /*불꽃*/
  traps: [
    { floor: 0, x: 540 },
    { floor: 1, x: 130 },
    { floor: 2, x: 480 },
    { floor: 3, x: 420 },
    { floor: 4, x: 390 },
    { floor: 4, x: 600 },
  ],
};
