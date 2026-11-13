import type { LevelDef } from './types';

// 네 번째 레벨: 틈이 많은 다리. 양쪽 끝 막다른 곳에 몬스터 2마리.
export const level4: LevelDef = {
  name: '갈라진 다리',
  start: { x: 704, facing: -1 },
  floors: [
    [[0, 24]],
    [[0, 5], [7, 13], [15, 24]],
    [[0, 7], [9, 18], [20, 24]],
    [[0, 10], [12, 24]],
    [[0, 4], [6, 15], [17, 24]],
  ],
  ladders: [
    { floor: 0, x: 64 },
    { floor: 1, x: 720 },
    { floor: 2, x: 480 },
    { floor: 3, x: 80 },
  ],
  items: [
    { kind: 'coin', floor: 0, x: 200 },
    { kind: 'coin', floor: 0, x: 600 },
    { kind: 'gem', floor: 1, x: 112 },
    { kind: 'gem', floor: 1, x: 352 },
    { kind: 'gem', floor: 1, x: 560 },
    { kind: 'apple', floor: 2, x: 80 },
    { kind: 'apple', floor: 2, x: 400 },
    { kind: 'apple', floor: 2, x: 704 },
    { kind: 'coin', floor: 3, x: 200 },
    { kind: 'coin', floor: 3, x: 640 },
    { kind: 'gem', floor: 4, x: 48 },
    { kind: 'gem', floor: 4, x: 320 },
    { kind: 'gem', floor: 4, x: 680 },
  ],
  chests: [
    { floor: 3, x: 720 },
  ],
  letters: [
    { char: 'R', floor: 4, x: 400 },
  ],
  enemies: [
    { floor: 2, x: 120, dir: -1, speed: 70, range: [0, 184] },
    { floor: 4, x: 680, dir: 1, speed: 80, range: [576, 768] },
  ],
  traps: [
    { floor: 0, x: 480 },
    { floor: 1, x: 264 },
    { floor: 3, x: 560 },
    { floor: 4, x: 240 },
  ],
};
